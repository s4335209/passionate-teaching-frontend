import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, BookOpenCheck, CheckCircle2, Lock, PlayCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useEnrolledCourses } from "@/features/courses/queries";

export default function StudentCoursesPage() {
  const { profile } = useAuth();
  const enrolled = useEnrolledCourses(profile?.id);
  const qc = useQueryClient();

  const catalogue = useQuery({
    queryKey: ["catalogue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, description, cover_url, is_premium, price_gbp, profiles!courses_tutor_id_fkey(full_name)")
        .eq("published", true);
      if (error) throw error;
      return data ?? [];
    },
  });

  const enrolledIds = new Set((enrolled.data ?? []).map((e) => e.course_id));

  const enroll = useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase
        .from("enrollments")
        .insert({ course_id: courseId, student_id: profile!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Enrolled");
      qc.invalidateQueries({ queryKey: ["enrolled-courses"] });
    },
    onError: (e: any) => toast.error("Couldn't enrol", { description: e.message }),
  });

  return (
    <div className="container max-w-6xl space-y-6 py-8">
      <header>
        <h1 className="font-serif text-3xl font-bold text-foreground">Courses</h1>
        <p className="text-muted-foreground">Continue what you&apos;ve started, or enrol in something new.</p>
      </header>

      <Tabs defaultValue="my">
        <TabsList>
          <TabsTrigger value="my">My courses ({enrolled.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="catalogue">Browse catalogue</TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="space-y-4">
          {enrolled.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (enrolled.data ?? []).length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
              You aren&apos;t enrolled yet. Browse the catalogue.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {(enrolled.data ?? []).map((c) => (
                <Card key={c.course_id} className="overflow-hidden">
                  <div
                    className="h-32 w-full bg-cover bg-center"
                    style={{
                      backgroundImage: c.cover_url ? `url(${c.cover_url})` : undefined,
                      backgroundColor: "hsl(var(--secondary))",
                    }}
                  />
                  <CardHeader>
                    <CardTitle className="text-lg">{c.course_title}</CardTitle>
                    <CardDescription className="line-clamp-2">{c.course_description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Progress value={c.pct} />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{c.done_lessons} / {c.total_lessons} lessons</span>
                      <Badge variant="accent">{c.pct}%</Badge>
                    </div>
                    <Button asChild className="w-full">
                      <Link to={`/student/courses/${c.course_id}`}>
                        {c.next_lesson ? <><PlayCircle className="h-4 w-4" /> Continue</> : <><CheckCircle2 className="h-4 w-4" /> Review</>}
                        <ArrowRight className="ml-auto h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="catalogue" className="space-y-4">
          {catalogue.isLoading ? <Skeleton className="h-32 w-full" /> : (
            <div className="grid gap-4 md:grid-cols-2">
              {(catalogue.data ?? []).map((c: any) => {
                const enrolledHere = enrolledIds.has(c.id);
                return (
                  <Card key={c.id} className="overflow-hidden">
                    <div
                      className="h-32 w-full bg-cover bg-center"
                      style={{
                        backgroundImage: c.cover_url ? `url(${c.cover_url})` : undefined,
                        backgroundColor: "hsl(var(--secondary))",
                      }}
                    />
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{c.title}</CardTitle>
                        {c.is_premium ? (
                          <Badge variant="accent" className="gap-1">
                            <Lock className="h-3 w-3" /> £{c.price_gbp}/mo
                          </Badge>
                        ) : (
                          <Badge variant="success">Free</Badge>
                        )}
                      </div>
                      <CardDescription className="line-clamp-2">{c.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Taught by <span className="font-medium text-foreground">{c.profiles?.full_name}</span>
                      </p>
                      {enrolledHere ? (
                        <Button variant="outline" className="w-full" asChild>
                          <Link to={`/student/courses/${c.id}`}>
                            <BookOpenCheck className="h-4 w-4" /> Open course
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          onClick={() => enroll.mutate(c.id)}
                          disabled={enroll.isPending}
                        >
                          Enrol now <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
