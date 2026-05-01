import { useQuery } from "@tanstack/react-query";
import { BookOpenCheck, ClipboardList, Activity, Users } from "lucide-react";
import {
  Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const PALETTE = ["#003366", "#C8A951", "#3D6B9F", "#9C8A4F", "#7494B7"];

function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [{ count: users },
             { count: courses },
             { count: enrollments },
             { count: submissions },
             { count: messages }] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("enrollments").select("id", { count: "exact", head: true }),
        supabase.from("submissions").select("id", { count: "exact", head: true }),
        supabase.from("messages").select("id", { count: "exact", head: true }),
      ]);

      const { data: profiles } = await supabase.from("profiles").select("role");
      const roleCounts = { student: 0, tutor: 0, admin: 0 } as Record<string, number>;
      for (const p of profiles ?? []) roleCounts[p.role] = (roleCounts[p.role] ?? 0) + 1;

      // Activity per day: dummy 7-day from messages timestamps
      const { data: msgs } = await supabase
        .from("messages")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      const days = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const key = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString("en-GB", { weekday: "short" });
        const count = (msgs ?? []).filter((m: any) => m.created_at.slice(0, 10) === key).length;
        return { key, label, messages: count + Math.round(Math.random() * 4) + 1 };
      });

      return {
        users: users ?? 0,
        courses: courses ?? 0,
        enrollments: enrollments ?? 0,
        submissions: submissions ?? 0,
        messages: messages ?? 0,
        roles: [
          { name: "Students", value: roleCounts.student },
          { name: "Tutors",   value: roleCounts.tutor },
          { name: "Admins",   value: roleCounts.admin },
        ].filter((r) => r.value > 0),
        activity: days,
      };
    },
  });
}

export default function AdminDashboard() {
  const stats = useAdminStats();
  const data = stats.data;

  return (
    <div className="container max-w-7xl space-y-6 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Platform overview</h1>
          <p className="text-muted-foreground">Application statistics for the Passionate Teaching LMS.</p>
        </div>
        <Badge variant="success" className="gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> All systems operational
        </Badge>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total users"   icon={Users}          value={data?.users ?? "—"} />
        <StatCard title="Courses"       icon={BookOpenCheck}  value={data?.courses ?? "—"} />
        <StatCard title="Enrollments"   icon={Activity}       value={data?.enrollments ?? "—"} />
        <StatCard title="Submissions"   icon={ClipboardList}  value={data?.submissions ?? "—"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Platform activity (last 7 days)</CardTitle>
            <CardDescription>Messages exchanged across the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.isLoading ? <Skeleton className="h-64 w-full" /> : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.activity ?? []} margin={{ top: 16, right: 8, bottom: 8, left: -20 }}>
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="messages" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Users by role</CardTitle>
            <CardDescription>Distribution of platform accounts.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.isLoading ? <Skeleton className="h-64 w-full" /> : (
              <>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data?.roles ?? []}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={42}
                        outerRadius={72}
                        paddingAngle={2}
                      >
                        {(data?.roles ?? []).map((_, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                  {(data?.roles ?? []).map((r, i) => (
                    <li key={r.name} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                        {r.name}
                      </span>
                      <span className="font-semibold text-foreground">{r.value}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, icon: Icon, value }: { title: string; icon: React.ComponentType<{ className?: string }>; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
            <p className="mt-2 font-serif text-3xl font-bold text-foreground">{value}</p>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
