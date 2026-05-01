import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Loader2, Sparkles, XCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  prompt: string;
  options: { label: string }[];
  correct_index: number;
  position: number;
}

export default function StudentQuizPage() {
  const { id: quizId } = useParams();
  const { profile } = useAuth();
  const qc = useQueryClient();

  const quizQ = useQuery({
    queryKey: ["quiz", quizId],
    enabled: !!quizId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("id, title, instructions, course_id, courses(title)")
        .eq("id", quizId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const questionsQ = useQuery({
    queryKey: ["quiz-questions", quizId],
    enabled: !!quizId,
    queryFn: async (): Promise<Question[]> => {
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("id, prompt, options, correct_index, position")
        .eq("quiz_id", quizId!)
        .order("position");
      if (error) throw error;
      return (data ?? []).map((q: any) => ({
        ...q,
        options: typeof q.options === "string" ? JSON.parse(q.options) : q.options,
      }));
    },
  });

  // chosen[i] = index of the option the student picked for question i
  const [chosen, setChosen] = React.useState<Record<string, number | undefined>>({});
  const [submittedAttempt, setSubmittedAttempt] = React.useState<{
    score: number; total: number; feedback: string; perQuestion: { id: string; right: boolean }[];
  } | null>(null);

  const submit = useMutation({
    mutationFn: async () => {
      const questions = questionsQ.data ?? [];
      let correct = 0;
      const perQuestion: { id: string; right: boolean; chosen: number }[] = [];
      for (const q of questions) {
        const ci = chosen[q.id];
        const right = ci === q.correct_index;
        if (right) correct += 1;
        perQuestion.push({ id: q.id, right, chosen: ci ?? -1 });
      }

      const total = questions.length;
      const pct = total === 0 ? 0 : Math.round((correct * 100) / total);
      const feedback =
        pct === 100 ? "Perfect score — you nailed every question."
        : pct >= 75 ? "Strong understanding. Review the one(s) you missed and you're on track."
        : pct >= 50 ? "You're getting there. Re-watch the relevant lesson and try again."
        : "This is a tough one — let's revisit the lesson together. Don't worry, that's what practice is for.";

      // 1. Insert attempt
      const { data: attempt, error: aErr } = await supabase
        .from("quiz_attempts")
        .insert({
          quiz_id: quizId,
          student_id: profile!.id,
          score: correct,
          total,
          qualitative_feedback: feedback,
        })
        .select("id")
        .single();
      if (aErr) throw aErr;

      // 2. Insert answers (only the ones the student actually chose)
      const answerRows = perQuestion
        .filter((p) => p.chosen >= 0)
        .map((p) => ({
          attempt_id: attempt.id,
          question_id: p.id,
          chosen_index: p.chosen,
          is_correct: p.right,
        }));
      if (answerRows.length > 0) {
        const { error: bErr } = await supabase.from("quiz_answers").insert(answerRows);
        if (bErr) throw bErr;
      }

      return {
        score: correct,
        total,
        feedback,
        perQuestion: perQuestion.map((p) => ({ id: p.id, right: p.right })),
      };
    },
    onSuccess: (result) => {
      setSubmittedAttempt(result);
      qc.invalidateQueries({ queryKey: ["quiz-attempts"] });
    },
    onError: (e: any) => toast.error("Couldn't submit", { description: e.message }),
  });

  const questions = questionsQ.data ?? [];
  const answered = questions.filter((q) => chosen[q.id] !== undefined).length;
  const allAnswered = answered === questions.length && questions.length > 0;
  const pctAnswered = questions.length === 0 ? 0 : Math.round((answered * 100) / questions.length);

  if (quizQ.isLoading || questionsQ.isLoading) {
    return <div className="container py-8"><Skeleton className="h-64 w-full" /></div>;
  }
  if (!quizQ.data) {
    return <div className="container py-8 text-sm text-muted-foreground">Quiz not found.</div>;
  }

  // ----------- Results screen -----------
  if (submittedAttempt) {
    const { score, total, feedback, perQuestion } = submittedAttempt;
    const pct = total === 0 ? 0 : Math.round((100 * score) / total);
    const rightSet = new Set(perQuestion.filter((p) => p.right).map((p) => p.id));

    return (
      <div className="container max-w-3xl space-y-6 py-8">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-[#082b59] p-8 text-primary-foreground">
            <Badge variant="accent" className="mb-3">
              <Sparkles className="h-3 w-3" /> Quiz complete
            </Badge>
            <h1 className="font-serif text-3xl font-bold">{quizQ.data.title}</h1>
            <p className="mt-1 text-primary-foreground/80">
              You scored <strong>{score}</strong> out of <strong>{total}</strong> ({pct}%).
            </p>
          </div>
          <CardContent className="space-y-4 pt-6">
            <div className="rounded-lg border border-border bg-secondary/30 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Tutor feedback</p>
              <p className="mt-1 text-foreground">{feedback}</p>
            </div>

            <ol className="space-y-3">
              {questions.map((q, i) => {
                const right = rightSet.has(q.id);
                const ci = chosen[q.id];
                return (
                  <li key={q.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-start gap-3">
                      <span className={cn("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full",
                        right ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                      )}>
                        {right ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">Q{i + 1}. {q.prompt}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          You answered: <strong>{ci !== undefined ? q.options[ci]?.label : "(skipped)"}</strong>
                        </p>
                        {!right ? (
                          <p className="mt-1 text-sm text-emerald-700">
                            Correct answer: <strong>{q.options[q.correct_index]?.label}</strong>
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="flex justify-between pt-2">
              <Button variant="outline" asChild>
                <Link to={`/student/courses/${quizQ.data.course_id}`}>
                  <ArrowLeft className="h-4 w-4" /> Back to course
                </Link>
              </Button>
              <Button onClick={() => { setChosen({}); setSubmittedAttempt(null); }}>
                Try again <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ----------- Quiz form -----------
  return (
    <div className="container max-w-3xl space-y-6 py-8">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to={`/student/courses/${quizQ.data.course_id}`}>
          <ArrowLeft className="h-4 w-4" /> Back to course
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {(quizQ.data as any).courses?.title}
          </p>
          <CardTitle>{quizQ.data.title}</CardTitle>
          {quizQ.data.instructions ? (
            <CardDescription>{quizQ.data.instructions}</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={pctAnswered} />
          <p className="text-xs text-muted-foreground">{answered} of {questions.length} answered</p>
        </CardContent>
      </Card>

      <ol className="space-y-4">
        {questions.map((q, i) => (
          <li key={q.id}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Q{i + 1}. {q.prompt}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {q.options.map((opt, oi) => {
                  const selected = chosen[q.id] === oi;
                  return (
                    <button
                      key={oi}
                      type="button"
                      onClick={() => setChosen((prev) => ({ ...prev, [q.id]: oi }))}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-secondary"
                      )}
                    >
                      <span className={cn(
                        "grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-xs font-semibold",
                        selected ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
                      )}>
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <span className="text-foreground">{opt.label}</span>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>

      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={() => submit.mutate()}
          disabled={!allAnswered || submit.isPending}
        >
          {submit.isPending ? <Loader2 className="animate-spin" /> : <>Submit quiz <ArrowRight className="h-4 w-4" /></>}
        </Button>
      </div>
    </div>
  );
}
