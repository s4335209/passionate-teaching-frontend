import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  CheckCircle2, ClipboardList, FileText, Loader2, MessageSquareQuote, Save,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface AssignmentRow {
  id: string;
  title: string;
  course_title: string;
  course_id: string;
  due_at: string | null;
  max_score: number;
  total_submissions: number;
  ungraded: number;
}

function useTutorAssignments(tutorId: string | undefined) {
  return useQuery({
    queryKey: ["tutor-assignments", tutorId],
    enabled: !!tutorId,
    queryFn: async (): Promise<AssignmentRow[]> => {
      const { data: courses } = await supabase
        .from("courses").select("id, title").eq("tutor_id", tutorId!);
      const courseIds = (courses ?? []).map((c: any) => c.id);
      if (courseIds.length === 0) return [];

      const { data: assignments } = await supabase
        .from("assignments")
        .select("id, title, due_at, max_score, course_id, courses(title)")
        .in("course_id", courseIds)
        .order("due_at", { ascending: false });

      const out: AssignmentRow[] = [];
      for (const a of assignments ?? []) {
        const { count: total } = await supabase
          .from("submissions").select("id", { count: "exact", head: true }).eq("assignment_id", a.id);
        const { count: ungraded } = await supabase
          .from("submissions").select("id", { count: "exact", head: true }).eq("assignment_id", a.id).is("grade", null);
        out.push({
          id: a.id,
          title: a.title,
          course_id: a.course_id,
          course_title: (a as any).courses?.title ?? "",
          due_at: a.due_at,
          max_score: a.max_score,
          total_submissions: total ?? 0,
          ungraded: ungraded ?? 0,
        });
      }
      return out;
    },
  });
}

interface SubmissionRow {
  id: string;
  student_id: string;
  student_name: string;
  submitted_at: string;
  text_response: string | null;
  file_url: string | null;
  grade: number | null;
  feedback: string | null;
  graded_at: string | null;
}

function useSubmissions(assignmentId: string | null) {
  return useQuery({
    queryKey: ["assignment-submissions", assignmentId],
    enabled: !!assignmentId,
    queryFn: async (): Promise<SubmissionRow[]> => {
      const { data, error } = await supabase
        .from("submissions")
        .select("id, student_id, submitted_at, text_response, file_url, grade, feedback, graded_at, profiles!submissions_student_id_fkey(full_name)")
        .eq("assignment_id", assignmentId!);
      if (error) throw error;
      return (data ?? []).map((s: any) => ({
        id: s.id,
        student_id: s.student_id,
        student_name: s.profiles?.full_name ?? "Unknown",
        submitted_at: s.submitted_at,
        text_response: s.text_response,
        file_url: s.file_url,
        grade: s.grade,
        feedback: s.feedback,
        graded_at: s.graded_at,
      }));
    },
  });
}

export default function TutorGradingPage() {
  const { profile } = useAuth();
  const assignments = useTutorAssignments(profile?.id);
  const [selected, setSelected] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!selected && assignments.data && assignments.data.length > 0) {
      setSelected(assignments.data[0].id);
    }
  }, [assignments.data, selected]);

  const current = (assignments.data ?? []).find((a) => a.id === selected) ?? null;
  const subs = useSubmissions(selected);

  return (
    <div className="container max-w-7xl space-y-6 py-8">
      <header>
        <h1 className="font-serif text-3xl font-bold text-foreground">Assignments &amp; grading</h1>
        <p className="text-muted-foreground">Mark student work and leave feedback.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Left: assignments list */}
        <Card className="h-fit">
          <CardHeader className="py-4"><CardTitle className="text-base">Your assignments</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {assignments.isLoading ? <Skeleton className="h-24 w-full" /> :
              (assignments.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No assignments yet.</p>
              ) : (
                (assignments.data ?? []).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelected(a.id)}
                    className={`w-full rounded-md border p-3 text-left transition-colors ${
                      selected === a.id ? "border-primary bg-primary/5" : "border-border hover:bg-secondary"
                    }`}
                  >
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{a.course_title}</p>
                    <p className="line-clamp-1 font-medium text-foreground">{a.title}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="secondary">{a.total_submissions} submitted</Badge>
                      {a.ungraded > 0 ? <Badge variant="warning">{a.ungraded} to grade</Badge> : <Badge variant="success">All graded</Badge>}
                    </div>
                  </button>
                ))
              )}
          </CardContent>
        </Card>

        {/* Right: submissions */}
        <div className="space-y-4">
          {!current ? (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
              Pick an assignment to grade submissions.
            </CardContent></Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{current.course_title}</p>
                  <CardTitle>{current.title}</CardTitle>
                  <CardDescription>
                    Due {current.due_at ? format(new Date(current.due_at), "d MMM yyyy") : "—"} · max {current.max_score} marks
                  </CardDescription>
                </CardHeader>
              </Card>

              {subs.isLoading ? <Skeleton className="h-48 w-full" /> :
                (subs.data ?? []).length === 0 ? (
                  <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
                    No submissions yet for this assignment.
                  </CardContent></Card>
                ) : (
                  (subs.data ?? []).map((s) => (
                    <SubmissionRowCard key={s.id} sub={s} max={current.max_score} graderId={profile!.id} />
                  ))
                )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SubmissionRowCard({
  sub, max, graderId,
}: {
  sub: SubmissionRow;
  max: number;
  graderId: string;
}) {
  const qc = useQueryClient();
  const [grade, setGrade] = React.useState<string>(sub.grade?.toString() ?? "");
  const [feedback, setFeedback] = React.useState<string>(sub.feedback ?? "");

  const save = useMutation({
    mutationFn: async () => {
      const num = grade.trim() === "" ? null : Number(grade);
      if (num !== null && (Number.isNaN(num) || num < 0 || num > max)) {
        throw new Error(`Grade must be between 0 and ${max}.`);
      }
      const { error } = await supabase
        .from("submissions")
        .update({
          grade: num,
          feedback: feedback.trim() || null,
          graded_at: num === null ? null : new Date().toISOString(),
          graded_by: num === null ? null : graderId,
        })
        .eq("id", sub.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Grade saved");
      qc.invalidateQueries({ queryKey: ["assignment-submissions"] });
      qc.invalidateQueries({ queryKey: ["tutor-assignments"] });
    },
    onError: (e: any) => toast.error("Couldn't save grade", { description: e.message }),
  });

  const initials = sub.student_name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  const isGraded = sub.grade !== null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-3">
          <Avatar><AvatarFallback>{initials}</AvatarFallback></Avatar>
          <div>
            <CardTitle className="text-base">{sub.student_name}</CardTitle>
            <CardDescription>
              Submitted {formatDistanceToNow(new Date(sub.submitted_at), { addSuffix: true })}
            </CardDescription>
          </div>
        </div>
        {isGraded ? (
          <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Graded · {sub.grade}/{max}</Badge>
        ) : (
          <Badge variant="warning" className="gap-1"><ClipboardList className="h-3 w-3" /> Awaiting grade</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {sub.text_response ? (
          <div className="rounded-md border border-border bg-secondary/30 p-3 text-sm italic">
            “{sub.text_response}”
          </div>
        ) : null}
        {sub.file_url ? (
          <p className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-primary" />
            <span className="font-mono text-xs">{sub.file_url.split("/").pop()}</span>
            <Badge variant="outline" className="ml-auto">Attached</Badge>
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
          <div className="space-y-2">
            <Label htmlFor={`grade-${sub.id}`}>Grade (out of {max})</Label>
            <Input
              id={`grade-${sub.id}`}
              type="number"
              min={0}
              max={max}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`feedback-${sub.id}`}>
              <MessageSquareQuote className="inline h-3.5 w-3.5" /> Feedback to student
            </Label>
            <Textarea
              id={`feedback-${sub.id}`}
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Strong work — solid technique throughout..."
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="animate-spin" /> : <><Save className="h-4 w-4" /> Save grade</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
