import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft, BookOpenCheck, FileText, Film, Loader2, Plus, Trash2, Type, UploadCloud,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type LessonType = "video" | "text" | "pdf";

const LESSON_ICON: Record<LessonType, React.ComponentType<{ className?: string }>> = {
  video: Film,
  pdf: FileText,
  text: Type,
};

const LESSON_BG: Record<LessonType, string> = {
  video: "bg-rose-100 text-rose-700",
  pdf: "bg-sky-100 text-sky-700",
  text: "bg-emerald-100 text-emerald-700",
};

export default function TutorCourseEditPage() {
  const { id: courseId } = useParams();
  const { profile } = useAuth();
  const qc = useQueryClient();

  const courseQ = useQuery({
    queryKey: ["course", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses").select("*").eq("id", courseId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const modulesQ = useQuery({
    queryKey: ["course-modules", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data: modules, error } = await supabase
        .from("modules")
        .select("id, title, position")
        .eq("course_id", courseId!)
        .order("position");
      if (error) throw error;
      const result = [];
      for (const m of modules ?? []) {
        const { data: lessons } = await supabase
          .from("lessons")
          .select("id, title, type, duration_sec, position, content_url")
          .eq("module_id", m.id)
          .order("position");
        result.push({ ...m, lessons: lessons ?? [] });
      }
      return result;
    },
  });

  const [publishing, setPublishing] = React.useState(false);
  async function togglePublish() {
    if (!courseQ.data) return;
    setPublishing(true);
    const { error } = await supabase
      .from("courses")
      .update({ published: !courseQ.data.published })
      .eq("id", courseQ.data.id);
    setPublishing(false);
    if (error) {
      toast.error("Couldn't update course", { description: error.message });
      return;
    }
    toast.success(courseQ.data.published ? "Course unpublished" : "Course published");
    qc.invalidateQueries({ queryKey: ["course", courseId] });
  }

  const deleteLesson = useMutation({
    mutationFn: async (lessonId: string) => {
      const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lesson deleted");
      qc.invalidateQueries({ queryKey: ["course-modules", courseId] });
    },
    onError: (e: any) => toast.error("Couldn't delete", { description: e.message }),
  });

  if (courseQ.isLoading) return <div className="container py-8"><Skeleton className="h-32 w-full" /></div>;
  if (!courseQ.data) return <div className="container py-8 text-sm text-muted-foreground">Course not found.</div>;
  const course = courseQ.data;

  return (
    <div className="container max-w-6xl space-y-6 py-8">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/tutor/courses"><ArrowLeft className="h-4 w-4" /> All courses</Link>
      </Button>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Badge variant={course.published ? "success" : "outline"}>
            {course.published ? "Published" : "Draft"}
          </Badge>
          <h1 className="font-serif text-3xl font-bold text-foreground">{course.title}</h1>
          <p className="max-w-2xl text-muted-foreground">{course.description}</p>
        </div>
        <Button onClick={togglePublish} disabled={publishing}>
          {publishing ? <Loader2 className="animate-spin" /> : course.published ? "Unpublish" : "Publish"}
        </Button>
      </header>

      {(modulesQ.data ?? []).map((m: any) => (
        <Card key={m.id}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <BookOpenCheck className="h-5 w-5 text-accent" />
                {m.title}
              </CardTitle>
              <CardDescription>{m.lessons.length} lesson{m.lessons.length === 1 ? "" : "s"}</CardDescription>
            </div>
            <UploadLessonDialog
              moduleId={m.id}
              courseId={course.id}
              tutorId={profile?.id ?? ""}
              onUploaded={() => qc.invalidateQueries({ queryKey: ["course-modules", courseId] })}
            />
          </CardHeader>
          <CardContent>
            {m.lessons.length === 0 ? (
              <p className="text-sm text-muted-foreground">No lessons in this module yet — add one above.</p>
            ) : (
              <ul className="space-y-2">
                {m.lessons.map((l: any) => {
                  const Icon = LESSON_ICON[l.type as LessonType] ?? Type;
                  return (
                    <li key={l.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <span className={cn("grid h-9 w-9 place-items-center rounded-md", LESSON_BG[l.type as LessonType])}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{l.title}</p>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {l.type}
                          {l.duration_sec ? ` · ${Math.round(l.duration_sec / 60)} min` : ""}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteLesson.mutate(l.id)}
                        aria-label="Delete lesson"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function UploadLessonDialog({
  moduleId,
  courseId,
  tutorId,
  onUploaded,
}: {
  moduleId: string;
  courseId: string;
  tutorId: string;
  onUploaded: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<LessonType>("video");
  const [body, setBody] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    let content_url: string | null = null;
    let duration_sec: number | null = null;

    if (type !== "text" && file) {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${courseId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("course-content")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) {
        toast.error("Upload failed", { description: upErr.message });
        setSubmitting(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("course-content").getPublicUrl(path);
      content_url = urlData.publicUrl;
    }

    if (type === "video" && file) {
      duration_sec = await readVideoDuration(file).catch(() => null);
    }

    // Find next position
    const { data: existing } = await supabase
      .from("lessons").select("position").eq("module_id", moduleId);
    const nextPos = (existing ?? []).reduce((m: number, r: any) => Math.max(m, r.position), -1) + 1;

    const { error } = await supabase.from("lessons").insert({
      module_id: moduleId,
      title,
      type,
      content_url,
      body: type === "text" ? body : null,
      duration_sec,
      position: nextPos,
    });

    setSubmitting(false);
    if (error) {
      toast.error("Couldn't create lesson", { description: error.message });
      return;
    }

    toast.success("Lesson added");
    setOpen(false);
    setTitle("");
    setBody("");
    setFile(null);
    setType("video");
    onUploaded();
  }

  // touch tutorId so unused-var warnings don't bite us in CI builds
  void tutorId;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4" /> Add lesson</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a lesson</DialogTitle>
          <DialogDescription>
            Upload a video, attach a PDF worksheet, or write a text guide.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Lesson type</Label>
            <div className="grid grid-cols-3 gap-2">
              <TypeButton current={type} value="video" onClick={() => setType("video")} icon={Film} label="Video" />
              <TypeButton current={type} value="pdf"   onClick={() => setType("pdf")}   icon={FileText} label="PDF" />
              <TypeButton current={type} value="text"  onClick={() => setType("text")}  icon={Type} label="Text" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lesson-title">Title</Label>
            <Input
              id="lesson-title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                type === "video" ? "Solving One-Step Equations"
                : type === "pdf" ? "Algebra worksheet — week 1"
                : "Recognising Quadratics"
              }
            />
          </div>

          {type === "text" ? (
            <div className="space-y-2">
              <Label htmlFor="lesson-body">Lesson content (Markdown supported)</Label>
              <Textarea
                id="lesson-body"
                required
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write the lesson here..."
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="lesson-file">{type === "video" ? "Video file" : "PDF file"}</Label>
              <label
                htmlFor="lesson-file"
                className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-secondary/30 p-6 text-center text-sm text-muted-foreground hover:border-primary/40"
              >
                <UploadCloud className="h-6 w-6 text-primary" />
                <span>{file ? file.name : `Click to choose a ${type === "video" ? "video" : "PDF"} file`}</span>
                <input
                  id="lesson-file"
                  type="file"
                  className="hidden"
                  required
                  accept={type === "video" ? "video/*" : "application/pdf"}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {file ? (
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(1)} MB · {file.type || "unknown type"}
                </p>
              ) : null}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : "Add lesson"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TypeButton({
  current,
  value,
  onClick,
  icon: Icon,
  label,
}: {
  current: LessonType;
  value: LessonType;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-medium transition-colors",
        active ? "border-primary bg-primary/5 text-primary" : "border-border bg-background hover:bg-secondary"
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Math.round(v.duration));
    };
    v.onerror = () => reject(new Error("metadata read failed"));
    v.src = url;
  });
}
