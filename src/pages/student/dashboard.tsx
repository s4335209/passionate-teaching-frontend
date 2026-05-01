import { Link } from "react-router-dom";
import { format, formatDistanceToNow, isPast } from "date-fns";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Megaphone,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useAnnouncementsForStudent,
  useEnrolledCourses,
  useUpcomingAssignments,
} from "@/features/courses/queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadialProgress } from "@/components/radial-progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5)  return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good evening";
}

export default function StudentDashboard() {
  const { profile } = useAuth();
  const enrolled = useEnrolledCourses(profile?.id);
  const assignments = useUpcomingAssignments(profile?.id);
  const announcements = useAnnouncementsForStudent(profile?.id);

  const courses = enrolled.data ?? [];
  const totalLessons = courses.reduce((acc, c) => acc + c.total_lessons, 0);
  const doneLessons = courses.reduce((acc, c) => acc + c.done_lessons, 0);
  const overallPct = totalLessons === 0 ? 0 : Math.round((100 * doneLessons) / totalLessons);

  const firstName = (profile?.full_name ?? "").split(" ")[0] || "there";

  return (
    <div className="container max-w-7xl space-y-8 py-8">
      {/* "Good Morning" banner */}
      <header className="rounded-2xl border border-border bg-gradient-to-r from-primary to-[#082b59] p-8 text-primary-foreground shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium uppercase tracking-wider">
              <Sparkles className="h-3 w-3" />
              {format(new Date(), "EEEE, d MMMM")}
            </p>
            <h1 className="text-balance font-serif text-3xl md:text-4xl">
              {greeting()}, {firstName}.
            </h1>
            <p className="max-w-xl text-primary-foreground/80">
              {courses.length === 0
                ? "Welcome to Passionate Teaching. Browse the catalogue to enrol in your first course."
                : `You have ${courses.length} active course${courses.length === 1 ? "" : "s"} and ${doneLessons} of ${totalLessons} lessons complete.`}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <RadialProgress
              value={overallPct}
              size={120}
              stroke={10}
              label={
                <span className="font-serif text-3xl font-bold text-primary-foreground">
                  {overallPct}%
                </span>
              }
              sublabel={<span className="text-xs text-primary-foreground/70">overall</span>}
            />
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Courses + Timeline */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Continue learning</CardTitle>
                <CardDescription>Your enrolled courses and where you left off.</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/student/courses">
                  Browse all <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-5">
              {enrolled.isLoading
                ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)
                : courses.length === 0
                ? <p className="text-sm text-muted-foreground">You aren&apos;t enrolled in anything yet.</p>
                : courses.map((c) => (
                    <article key={c.enrollment_id} className="rounded-xl border border-border p-5 transition hover:border-primary/40">
                      <div className="flex flex-col gap-4 md:flex-row">
                        <div
                          className="h-24 w-full shrink-0 rounded-lg bg-cover bg-center md:w-40"
                          style={{
                            backgroundImage: c.cover_url ? `url(${c.cover_url})` : undefined,
                            backgroundColor: "hsl(var(--secondary))",
                          }}
                          aria-hidden="true"
                        />
                        <div className="flex-1 space-y-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <h3 className="font-serif text-lg font-semibold text-foreground">{c.course_title}</h3>
                            <Badge variant="accent">{c.pct}% complete</Badge>
                          </div>
                          <div>
                            <Progress value={c.pct} />
                            <p className="mt-1.5 text-xs text-muted-foreground">
                              {c.done_lessons} of {c.total_lessons} lessons complete
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            {c.next_lesson ? (
                              <Button size="sm" asChild>
                                <Link to={`/student/courses/${c.course_id}`}>
                                  <PlayCircle className="h-4 w-4" />
                                  Resume: {c.next_lesson.title}
                                </Link>
                              </Button>
                            ) : (
                              <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Course complete</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
            </CardContent>
          </Card>

          {/* Timeline view */}
          {courses[0] ? (
            <Card>
              <CardHeader>
                <CardTitle>Learning timeline · {courses[0].course_title}</CardTitle>
                <CardDescription>Where you are in your most-active course.</CardDescription>
              </CardHeader>
              <CardContent>
                <Timeline
                  total={courses[0].total_lessons}
                  done={courses[0].done_lessons}
                />
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Right: Assignments + Announcements */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarClock className="h-4 w-4 text-accent" /> Upcoming work
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {assignments.isLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : (assignments.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No assignments right now — nice.</p>
              ) : (
                (assignments.data ?? []).slice(0, 4).map((a) => (
                  <div key={a.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-foreground">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{a.course_title}</p>
                    </div>
                    <div className="text-right text-xs">
                      {a.submitted ? (
                        <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Submitted</Badge>
                      ) : a.due_at ? (
                        <span className={isPast(new Date(a.due_at)) ? "text-destructive" : "text-muted-foreground"}>
                          due {formatDistanceToNow(new Date(a.due_at), { addSuffix: true })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">no due date</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Megaphone className="h-4 w-4 text-accent" /> Announcements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {announcements.isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (announcements.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No announcements yet.</p>
              ) : (
                (announcements.data ?? []).slice(0, 3).map((a) => (
                  <article key={a.id} className="space-y-1 rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">{a.course_title}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground">{a.title}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{a.body}</p>
                  </article>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Timeline({ total, done }: { total: number; done: number }) {
  const steps = Array.from({ length: total });
  return (
    <ol className="relative ml-2 border-l border-border pl-6">
      {steps.map((_, i) => {
        const isDone = i < done;
        const isCurrent = i === done;
        return (
          <li key={i} className="relative pb-6 last:pb-0">
            <span
              className={
                "absolute -left-[31px] grid h-5 w-5 place-items-center rounded-full ring-4 ring-background " +
                (isDone
                  ? "bg-primary text-primary-foreground"
                  : isCurrent
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary text-muted-foreground")
              }
            >
              {isDone ? <CheckCircle2 className="h-3 w-3" /> : <span className="text-[10px] font-bold">{i + 1}</span>}
            </span>
            <div className="space-y-1">
              <p className={"text-sm font-medium " + (isCurrent ? "text-foreground" : "text-foreground/80")}>
                Lesson {i + 1}
                {isCurrent ? <Badge variant="accent" className="ml-2">In progress</Badge> : null}
                {isDone ? <Badge variant="success" className="ml-2">Done</Badge> : null}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
