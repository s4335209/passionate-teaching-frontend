import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface Row {
  course_id: string;
  course_title: string;
  student_id: string;
  student_name: string;
  enrolled_at: string;
  total: number;
  done: number;
  pct: number;
}

function useTutorStudents(tutorId: string | undefined) {
  return useQuery({
    queryKey: ["tutor-students", tutorId],
    enabled: !!tutorId,
    queryFn: async (): Promise<Row[]> => {
      const { data: courses } = await supabase
        .from("courses").select("id, title").eq("tutor_id", tutorId!);
      const out: Row[] = [];

      for (const c of (courses ?? []) as any[]) {
        // Total lessons in this course
        const { data: lessons } = await supabase
          .from("lessons")
          .select("id, modules!inner(course_id)")
          .eq("modules.course_id", c.id);
        const total = lessons?.length ?? 0;

        const { data: enrollments } = await supabase
          .from("enrollments")
          .select("id, student_id, enrolled_at, profiles(full_name)")
          .eq("course_id", c.id);

        for (const e of (enrollments ?? []) as any[]) {
          const { count: done } = await supabase
            .from("lesson_progress")
            .select("id", { count: "exact", head: true })
            .eq("enrollment_id", e.id);

          out.push({
            course_id: c.id,
            course_title: c.title,
            student_id: e.student_id,
            student_name: e.profiles?.full_name ?? "Unknown",
            enrolled_at: e.enrolled_at,
            total,
            done: done ?? 0,
            pct: total === 0 ? 0 : Math.round(((done ?? 0) * 100) / total),
          });
        }
      }
      return out.sort((a, b) => b.pct - a.pct);
    },
  });
}

export default function TutorStudentsPage() {
  const { profile } = useAuth();
  const q = useTutorStudents(profile?.id);

  return (
    <div className="container max-w-6xl space-y-6 py-8">
      <header>
        <h1 className="font-serif text-3xl font-bold text-foreground">Students</h1>
        <p className="text-muted-foreground">Everyone enrolled in your courses, with up-to-date progress.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{q.data ? `${q.data.length} enrolment${q.data.length === 1 ? "" : "s"}` : "Loading…"}</CardTitle>
          <CardDescription>Sorted by progress, highest first.</CardDescription>
        </CardHeader>
        <CardContent>
          {q.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : (q.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No students enrolled yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {(q.data ?? []).map((r, i) => (
                <li key={`${r.course_id}-${r.student_id}-${i}`} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
                  <div className="flex flex-1 items-center gap-3 min-w-0">
                    <Avatar>
                      <AvatarFallback>{initials(r.student_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{r.student_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.course_title}</p>
                    </div>
                  </div>
                  <div className="flex flex-1 items-center gap-3 sm:max-w-xs">
                    <Progress value={r.pct} className="flex-1" />
                    <span className="w-16 shrink-0 text-right text-sm font-semibold text-foreground">{r.pct}%</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <Badge variant={r.pct === 100 ? "success" : r.pct >= 60 ? "accent" : "secondary"}>
                      {r.done}/{r.total} lessons
                    </Badge>
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/tutor/messages?student=${r.student_id}`}>
                        <MessageCircle className="h-4 w-4" /> Message
                      </Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
