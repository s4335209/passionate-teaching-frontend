import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { toast } from "sonner";
import {
  CalendarClock, CheckCircle2, ClipboardList, FileText, Loader2, MessageSquareQuote, UploadCloud,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

interface AssignmentRow {
  id: string;
  title: string;
  instructions: string | null;
  due_at: string | null;
  max_score: number;
  course_id: string;
  course_title: string;
  submission: null | {
    id: string;
    submitted_at: string;
    file_url: string | null;
    text_response: string | null;
    grade: number | null;
    feedback: string | null;
    graded_at: string | null;
  };
}

function useStudentAssignments(studentId: string | undefined) {
  return useQuery({
    queryKey: ["student-assignments", studentId],
    enabled: !!studentId,
    queryFn: async (): Promise<AssignmentRow[]> => {
      const { data: enrollments } = await supabase
        .from("enrollments").select("course_id, courses(title)").eq("student_id", studentId!);
      const courseIds = (enrollments ?? []).map((e: any) => e.course_id);
      if (courseIds.length === 0) return [];

      const { data: assignments } = await supabase
        .from("assignments")
        .select("id, title, instructions, due_at, max_score, course_id, courses(title)")
        .in("course_id", courseIds)
        .order("due_at", { ascending: true });

      const ids = (assignments ?? []).map((a: any) => a.id);
      const { data: submissions } = ids.length === 0
        ? { data: [] }
        : await supabase
            .from("submissions")
            .select("id, assignment_id, submitted_at, file_url, text_response, grade, feedback, graded_at")
            .eq("student_id", studentId!)
            .in("assignment_id", ids);

      const subByAssignment = new Map<string, any>();
      for (const s of submissions ?? []) subByAssignment.set(s.assignment_id, s);

      return (assignments ?? []).map((a: any) => ({
        id: a.id,
        title: a.title,
        instructions: a.instructions,
        due_at: a.due_at,
        max_score: a.max_score,
        course_id: a.course_id,
        course_title: a.courses.title,
        submission: subByAssignment.get(a.id) ?? null,
      }));
    },
  });
}

export default function StudentAssignmentsPage() {
  const { profile } = useAuth();
  const q = useStudentAssignments(profile?.id);

  const open = (q.data ?? []).filter((a) => !a.submission);
  const submitted = (q.data ?? []).filter((a) => a.submission && a.submission.grade === null);
  const graded = (q.data ?? []).filter((a) => a.submission && a.submission.grade !== null);

  return (
    <div className="container max-w-5xl space-y-6 py-8">
      <header>
        <h1 className="font-serif text-3xl font-bold text-foreground">Assignments</h1>
        <p className="text-muted-foreground">Submit your work, see your grades, and get feedback from your tutor.</p>
      </header>

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">Open ({open.length})</TabsTrigger>
          <TabsTrigger value="submitted">Submitted ({submitted.length})</TabsTrigger>
          <TabsTrigger value="graded">Graded ({graded.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="space-y-4">
          {q.isLoading ? <Skeleton className="h-32 w-full" /> : open.length === 0 ? <Empty>You&apos;re all caught up.</Empty> :
            open.map((a) => <OpenAssignmentCard key={a.id} a={a} studentId={profile!.id} />)}
        </TabsContent>

        <TabsContent value="submitted" className="space-y-4">
          {q.isLoading ? <Skeleton className="h-32 w-full" /> : submitted.length === 0 ? <Empty>Nothing waiting on the tutor.</Empty> :
            submitted.map((a) => <SubmittedCard key={a.id} a={a} />)}
        </TabsContent>

        <TabsContent value="graded" className="space-y-4">
          {q.isLoading ? <Skeleton className="h-32 w-full" /> : graded.length === 0 ? <Empty>No graded assignments yet.</Empty> :
            graded.map((a) => <GradedCard key={a.id} a={a} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-border bg-secondary/40 p-6 text-center text-sm text-muted-foreground">{children}</p>;
}

function OpenAssignmentCard({ a, studentId }: { a: AssignmentRow; studentId: string }) {
  const qc = useQueryClient();
  const [text, setText] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [open, setOpen] = React.useState(false);

  const submit = useMutation({
    mutationFn: async () => {
      let file_url: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${a.course_id}/${studentId}/${a.id}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("submissions").upload(path, file, { contentType: file.type, upsert: true });
        if (upErr) throw upErr;
        file_url = path;
      }
      const { error } = await supabase.from("submissions").insert({
        assignment_id: a.id,
        student_id: studentId,
        text_response: text || null,
        file_url,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Submitted");
      setOpen(false);
      setText("");
      setFile(null);
      qc.invalidateQueries({ queryKey: ["student-assignments", studentId] });
    },
    onError: (e: any) => toast.error("Couldn't submit", { description: e.message }),
  });

  const overdue = a.due_at && isPast(new Date(a.due_at));

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{a.course_title}</p>
            <CardTitle>{a.title}</CardTitle>
          </div>
          <Badge variant={overdue ? "destructive" : "outline"} className="gap-1">
            <CalendarClock className="h-3 w-3" />
            {a.due_at ? `due ${formatDistanceToNow(new Date(a.due_at), { addSuffix: true })}` : "no due date"}
          </Badge>
        </div>
        {a.instructions ? <CardDescription className="pt-2">{a.instructions}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {!open ? (
          <Button onClick={() => setOpen(true)} size="lg" variant="default">
            <UploadCloud className="h-4 w-4" /> Submit your work
          </Button>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}
            className="space-y-4 rounded-lg border border-border bg-secondary/20 p-4"
          >
            <div className="space-y-2">
              <Label htmlFor={`file-${a.id}`}>File (PDF, image, doc — optional)</Label>
              <label
                htmlFor={`file-${a.id}`}
                className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed border-border bg-background p-5 text-center text-sm text-muted-foreground hover:border-primary/40"
              >
                <UploadCloud className="h-5 w-5 text-primary" />
                <span>{file ? file.name : "Click to attach a file"}</span>
                <Input
                  id={`file-${a.id}`}
                  type="file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {file ? <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`text-${a.id}`}>Notes for your tutor (optional)</Label>
              <Textarea
                id={`text-${a.id}`}
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Anything you want them to see — e.g. which question you struggled with."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submit.isPending}>
                {submit.isPending ? <Loader2 className="animate-spin" /> : "Submit assignment"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function SubmittedCard({ a }: { a: AssignmentRow }) {
  const sub = a.submission!;
  return (
    <Card>
      <CardHeader>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{a.course_title}</p>
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{a.title}</CardTitle>
          <Badge variant="accent" className="gap-1">
            <ClipboardList className="h-3 w-3" /> Awaiting grade
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>Submitted {format(new Date(sub.submitted_at), "d MMM yyyy 'at' HH:mm")}.</p>
        {sub.text_response ? <p className="italic">“{sub.text_response}”</p> : null}
        {sub.file_url ? (
          <p className="flex items-center gap-2 text-foreground">
            <FileText className="h-4 w-4" /> {sub.file_url.split("/").pop()}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function GradedCard({ a }: { a: AssignmentRow }) {
  const sub = a.submission!;
  const pct = Math.round((100 * (sub.grade ?? 0)) / (a.max_score || 1));
  return (
    <Card>
      <CardHeader>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{a.course_title}</p>
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{a.title}</CardTitle>
          <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Graded</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3 rounded-lg bg-primary/5 p-4">
          <div className="font-serif text-4xl font-bold text-primary">{sub.grade}<span className="text-base text-muted-foreground">/{a.max_score}</span></div>
          <Separator orientation="vertical" className="h-12" />
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Score</p>
            <p className="font-medium text-foreground">{pct}%</p>
          </div>
        </div>
        {sub.feedback ? (
          <div className="rounded-lg border border-border bg-secondary/30 p-4">
            <p className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <MessageSquareQuote className="h-3 w-3" /> Tutor feedback
            </p>
            <p className="text-sm leading-relaxed text-foreground">{sub.feedback}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
