import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, CheckCircle2, FileText, Film, ListChecks, Loader2, PlayCircle, Type, Wifi,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkdownLite } from "@/components/markdown-lite";
import { cn } from "@/lib/utils";

type LessonType = "video" | "text" | "pdf";

const ICON: Record<LessonType, React.ComponentType<{ className?: string }>> = {
  video: Film, pdf: FileText, text: Type,
};

interface LessonRow {
  id: string;
  title: string;
  type: LessonType;
  position: number;
  content_url: string | null;
  body: string | null;
  duration_sec: number | null;
}
interface ModuleRow {
  id: string;
  title: string;
  position: number;
  lessons: LessonRow[];
}

export default function StudentCourseViewPage() {
  const { id: courseId } = useParams();
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useSearchParams();

  const courseQ = useQuery({
    queryKey: ["course-public", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, title, description, profiles!courses_tutor_id_fkey(full_name)")
        .eq("id", courseId!)
        .maybeSingle();
      return data;
    },
  });

  const enrolQ = useQuery({
    queryKey: ["enrollment", courseId, profile?.id],
    enabled: !!courseId && !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments").select("id").eq("course_id", courseId!).eq("student_id", profile!.id).maybeSingle();
      return data;
    },
  });

  const modulesQ = useQuery({
    queryKey: ["course-modules-student", courseId],
    enabled: !!courseId,
    queryFn: async (): Promise<ModuleRow[]> => {
      const { data: modules } = await supabase
        .from("modules").select("id, title, position").eq("course_id", courseId!).order("position");
      const out: ModuleRow[] = [];
      for (const m of modules ?? []) {
        const { data: lessons } = await supabase
          .from("lessons")
          .select("id, title, type, position, content_url, body, duration_sec")
          .eq("module_id", m.id)
          .order("position");
        out.push({ ...m, lessons: (lessons ?? []) as LessonRow[] });
      }
      return out;
    },
  });

  const progressQ = useQuery({
    queryKey: ["enrollment-progress", enrolQ.data?.id],
    enabled: !!enrolQ.data?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("lesson_progress")
        .select("lesson_id")
        .eq("enrollment_id", enrolQ.data!.id);
      return new Set((data ?? []).map((p: any) => p.lesson_id as string));
    },
  });

  const quizzesQ = useQuery({
    queryKey: ["course-quizzes", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data } = await supabase
        .from("quizzes")
        .select("id, title, instructions")
        .eq("course_id", courseId!);
      return data ?? [];
    },
  });

  const allLessons = (modulesQ.data ?? []).flatMap((m) => m.lessons);
  const lessonId = search.get("lesson") ?? allLessons[0]?.id;
  const currentLesson = allLessons.find((l) => l.id === lessonId);
  const done = progressQ.data ?? new Set<string>();

  const total = allLessons.length;
  const doneCount = allLessons.filter((l) => done.has(l.id)).length;
  const pct = total === 0 ? 0 : Math.round((100 * doneCount) / total);

  const markComplete = useMutation({
    mutationFn: async () => {
      if (!enrolQ.data?.id || !currentLesson) return;
      if (done.has(currentLesson.id)) return;
      const { error } = await supabase
        .from("lesson_progress")
        .insert({ enrollment_id: enrolQ.data.id, lesson_id: currentLesson.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lesson complete");
      qc.invalidateQueries({ queryKey: ["enrollment-progress"] });
      qc.invalidateQueries({ queryKey: ["enrolled-courses"] });
    },
    onError: (e: any) => toast.error("Couldn't update progress", { description: e.message }),
  });

  const goLesson = (id: string) => setSearch({ lesson: id });

  if (courseQ.isLoading || modulesQ.isLoading) {
    return <div className="container py-8"><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="container max-w-7xl space-y-4 py-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/student/courses"><ArrowLeft className="h-4 w-4" /> All courses</Link>
      </Button>

      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {(courseQ.data as any)?.profiles?.full_name}
          </p>
          <h1 className="font-serif text-2xl font-bold text-foreground">{courseQ.data?.title}</h1>
        </div>
        <div className="w-64">
          <Progress value={pct} />
          <p className="mt-1 text-right text-xs text-muted-foreground">
            {doneCount} of {total} lessons · {pct}%
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Sidebar */}
        <Card className="h-fit">
          <CardHeader className="py-4"><CardTitle className="text-base">Course content</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {(quizzesQ.data ?? []).length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quizzes</p>
                <ul className="space-y-1">
                  {(quizzesQ.data ?? []).map((q: any) => (
                    <li key={q.id}>
                      <Link
                        to={`/student/quizzes/${q.id}`}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary"
                      >
                        <span className="grid h-6 w-6 place-items-center rounded bg-accent/15 text-accent-foreground">
                          <ListChecks className="h-3.5 w-3.5" />
                        </span>
                        <span className="line-clamp-1 flex-1">{q.title}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {(modulesQ.data ?? []).map((m) => (
              <div key={m.id} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{m.title}</p>
                <ul className="space-y-1">
                  {m.lessons.map((l) => {
                    const isDone = done.has(l.id);
                    const isActive = currentLesson?.id === l.id;
                    const Icon = ICON[l.type];
                    return (
                      <li key={l.id}>
                        <button
                          onClick={() => goLesson(l.id)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                            isActive ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                          )}
                        >
                          <span className={cn("grid h-6 w-6 place-items-center rounded",
                            isActive ? "bg-primary-foreground/20" :
                            isDone ? "bg-emerald-100 text-emerald-700" : "bg-secondary text-muted-foreground")}>
                            {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                          </span>
                          <span className="line-clamp-1 flex-1">{l.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Player */}
        <div className="space-y-4">
          {currentLesson ? (
            <LessonPlayer
              lesson={currentLesson}
              isDone={done.has(currentLesson.id)}
              lowBandwidth={profile?.low_bandwidth ?? false}
              onComplete={() => markComplete.mutate()}
              isMarking={markComplete.isPending}
            />
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Pick a lesson to get started.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function LessonPlayer({
  lesson, isDone, lowBandwidth, onComplete, isMarking,
}: {
  lesson: LessonRow;
  isDone: boolean;
  lowBandwidth: boolean;
  onComplete: () => void;
  isMarking: boolean;
}) {
  const Icon = ICON[lesson.type];

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{lesson.type}</p>
              <CardTitle className="text-lg">{lesson.title}</CardTitle>
            </div>
          </div>
          {isDone ? (
            <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Complete</Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {lesson.type === "video" ? (
          <VideoPanel url={lesson.content_url} lowBandwidth={lowBandwidth} />
        ) : lesson.type === "pdf" ? (
          <PdfPanel url={lesson.content_url} />
        ) : (
          <div className="rounded-lg border border-border bg-secondary/30 p-6">
            {lesson.body ? <MarkdownLite source={lesson.body} /> : <p className="text-sm text-muted-foreground">No content yet.</p>}
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Wifi className="h-3.5 w-3.5" />
            {lowBandwidth ? "Low-bandwidth mode is on — videos preload less data." : "Full-quality streaming. Toggle low-bandwidth in Settings."}
          </p>
          <Button onClick={onComplete} disabled={isDone || isMarking}>
            {isMarking ? <Loader2 className="animate-spin" /> :
              isDone ? <><CheckCircle2 className="h-4 w-4" /> Completed</> :
              <><PlayCircle className="h-4 w-4" /> Mark as complete</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function VideoPanel({ url, lowBandwidth }: { url: string | null; lowBandwidth: boolean }) {
  if (!url) {
    return (
      <div className="grid h-64 place-items-center rounded-lg border border-dashed border-border bg-secondary/30">
        <p className="text-sm text-muted-foreground">Video not yet uploaded.</p>
      </div>
    );
  }
  return (
    <video
      src={url}
      controls
      preload={lowBandwidth ? "metadata" : "auto"}
      className="aspect-video w-full rounded-lg bg-black"
    >
      Sorry, your browser doesn&apos;t support inline video.
    </video>
  );
}

function PdfPanel({ url }: { url: string | null }) {
  if (!url) {
    return (
      <div className="grid h-64 place-items-center rounded-lg border border-dashed border-border bg-secondary/30">
        <p className="text-sm text-muted-foreground">PDF not yet uploaded.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <iframe src={url} className="h-[600px] w-full rounded-lg border border-border" title="PDF lesson" />
      <a href={url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
        Open PDF in a new tab
      </a>
    </div>
  );
}
