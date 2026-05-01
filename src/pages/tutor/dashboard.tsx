import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpenCheck, ClipboardList, Megaphone, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface TutorStats {
  courses: number;
  publishedCourses: number;
  enrolledStudents: number;
  pendingSubmissions: number;
}

function useTutorStats(tutorId: string | undefined) {
  return useQuery({
    queryKey: ["tutor-stats", tutorId],
    enabled: !!tutorId,
    queryFn: async (): Promise<TutorStats> => {
      const { data: courses } = await supabase
        .from("courses").select("id, published").eq("tutor_id", tutorId);
      const courseIds = (courses ?? []).map((c: any) => c.id);

      const { count: enrolled } = courseIds.length === 0
        ? { count: 0 }
        : await supabase
            .from("enrollments")
            .select("id", { count: "exact", head: true })
            .in("course_id", courseIds);

      const { count: pending } = courseIds.length === 0
        ? { count: 0 }
        : await supabase
            .from("submissions")
            .select("id, assignments!inner(course_id)", { count: "exact", head: true })
            .in("assignments.course_id", courseIds)
            .is("grade", null);

      return {
        courses: (courses ?? []).length,
        publishedCourses: (courses ?? []).filter((c: any) => c.published).length,
        enrolledStudents: enrolled ?? 0,
        pendingSubmissions: pending ?? 0,
      };
    },
  });
}

function useTutorCourses(tutorId: string | undefined) {
  return useQuery({
    queryKey: ["tutor-courses", tutorId],
    enabled: !!tutorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, description, cover_url, published")
        .eq("tutor_id", tutorId);
      if (error) throw error;
      const out = [];
      for (const c of data ?? []) {
        const { count: enrolled } = await supabase
          .from("enrollments")
          .select("id", { count: "exact", head: true })
          .eq("course_id", c.id);
        out.push({ ...c, enrolled: enrolled ?? 0 });
      }
      return out;
    },
  });
}

export default function TutorDashboard() {
  const { profile } = useAuth();
  const stats = useTutorStats(profile?.id);
  const courses = useTutorCourses(profile?.id);
  const firstName = (profile?.full_name ?? "").split(" ")[0] || "there";

  return (
    <div className="container max-w-7xl space-y-6 py-8">
      <header>
        <h1 className="font-serif text-3xl font-bold text-foreground">Welcome back, {firstName}</h1>
        <p className="text-muted-foreground">Here&apos;s how Passionate Teaching is doing today.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Courses"
          icon={BookOpenCheck}
          value={stats.data?.courses ?? "—"}
          hint={`${stats.data?.publishedCourses ?? 0} published`}
        />
        <StatCard
          title="Enrolled students"
          icon={Users}
          value={stats.data?.enrolledStudents ?? "—"}
        />
        <StatCard
          title="Awaiting marking"
          icon={ClipboardList}
          value={stats.data?.pendingSubmissions ?? "—"}
          hint="Submissions without a grade"
          tone={stats.data?.pendingSubmissions ? "warning" : "default"}
        />
        <StatCard
          title="Announcements"
          icon={Megaphone}
          value="3"
          hint="Posted this month"
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Your courses</CardTitle>
            <CardDescription>Edit, publish, or add new lessons.</CardDescription>
          </div>
          <Button size="sm" asChild>
            <Link to="/tutor/courses">
              Manage all <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {courses.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            (courses.data ?? []).map((c: any) => (
              <article key={c.id} className="flex flex-col gap-4 rounded-xl border border-border p-4 sm:flex-row sm:items-center">
                <div
                  className="h-20 w-full rounded-lg bg-cover bg-center sm:w-32"
                  style={{
                    backgroundImage: c.cover_url ? `url(${c.cover_url})` : undefined,
                    backgroundColor: "hsl(var(--secondary))",
                  }}
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-lg font-semibold text-foreground">{c.title}</h3>
                    <Badge variant={c.published ? "success" : "outline"}>
                      {c.published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold text-foreground">{c.enrolled}</p>
                  <p className="text-xs text-muted-foreground">student{c.enrolled === 1 ? "" : "s"}</p>
                </div>
              </article>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  icon: Icon,
  value,
  hint,
  tone = "default",
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  value: React.ReactNode;
  hint?: string;
  tone?: "default" | "warning";
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
            <p className="mt-2 font-serif text-3xl font-bold text-foreground">{value}</p>
            {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
          </div>
          <span className={"grid h-10 w-10 place-items-center rounded-lg " +
            (tone === "warning" ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary")}>
            <Icon className="h-5 w-5" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
