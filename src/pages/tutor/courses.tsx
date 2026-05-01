import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, Edit3, BookOpenCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function TutorCoursesPage() {
  const { profile } = useAuth();
  const q = useQuery({
    queryKey: ["tutor-courses-full", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, description, cover_url, published, is_premium, price_gbp")
        .eq("tutor_id", profile!.id);
      if (error) throw error;
      const out = [];
      for (const c of data ?? []) {
        const { data: modules } = await supabase
          .from("modules").select("id").eq("course_id", c.id);
        const moduleIds = (modules ?? []).map((m: any) => m.id);
        const { count: lessons } = moduleIds.length === 0
          ? { count: 0 }
          : await supabase.from("lessons").select("id", { count: "exact", head: true }).in("module_id", moduleIds);
        const { count: enrolled } = await supabase
          .from("enrollments").select("id", { count: "exact", head: true }).eq("course_id", c.id);
        out.push({ ...c, lesson_count: lessons ?? 0, enrolled: enrolled ?? 0 });
      }
      return out;
    },
  });

  return (
    <div className="container max-w-6xl space-y-6 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Your courses</h1>
          <p className="text-muted-foreground">Edit content, publish to students, or pause as needed.</p>
        </div>
      </header>

      {q.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-44 w-full" />)}
        </div>
      ) : (q.data ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No courses yet. Create your first course to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(q.data ?? []).map((c: any) => (
            <Card key={c.id} className="overflow-hidden">
              <div
                className="h-32 w-full bg-cover bg-center"
                style={{
                  backgroundImage: c.cover_url ? `url(${c.cover_url})` : undefined,
                  backgroundColor: "hsl(var(--secondary))",
                }}
              />
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{c.title}</CardTitle>
                  <Badge variant={c.published ? "success" : "outline"}>
                    {c.published ? "Published" : "Draft"}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2">{c.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center text-xs text-muted-foreground">
                  <Stat label="Lessons" value={c.lesson_count} />
                  <Stat label="Students" value={c.enrolled} />
                  <Stat label="Price" value={c.is_premium ? `£${c.price_gbp}` : "Free"} />
                </div>
                <Button asChild className="w-full">
                  <Link to={`/tutor/courses/${c.id}`}>
                    <Edit3 className="h-4 w-4" /> Manage course content
                    <ArrowRight className="ml-auto h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md bg-secondary/50 p-2">
      <p className="font-serif text-base font-semibold text-foreground">{value}</p>
      <p className="text-[10px] uppercase tracking-wide">{label}</p>
    </div>
  );
}
