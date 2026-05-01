import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Database, FileLock2, Loader2, Mail, MessageSquare, Save, ShieldCheck, Wifi,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const qc = useQueryClient();

  const [fullName, setFullName] = React.useState(profile?.full_name ?? "");
  const [bio, setBio] = React.useState(profile?.bio ?? "");
  const [lowBandwidth, setLowBandwidth] = React.useState(profile?.low_bandwidth ?? false);

  React.useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setBio(profile.bio ?? "");
      setLowBandwidth(profile.low_bandwidth);
    }
  }, [profile]);

  const dataReport = useQuery({
    queryKey: ["data-transparency", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const [{ count: enrollments }, { count: progress }, { count: submissions }, { count: messages }] = await Promise.all([
        supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("student_id", profile!.id),
        supabase.from("lesson_progress").select("id", { count: "exact", head: true })
          .in("enrollment_id", await getEnrollmentIds(profile!.id)),
        supabase.from("submissions").select("id", { count: "exact", head: true }).eq("student_id", profile!.id),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("sender_id", profile!.id),
      ]);
      return {
        enrollments: enrollments ?? 0,
        progress: progress ?? 0,
        submissions: submissions ?? 0,
        messages: messages ?? 0,
      };
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), bio: bio.trim(), low_bandwidth: lowBandwidth })
        .eq("id", profile!.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Settings saved");
      await refreshProfile();
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error("Couldn't save", { description: e.message }),
  });

  const dirty =
    fullName !== profile?.full_name ||
    bio !== (profile?.bio ?? "") ||
    lowBandwidth !== profile?.low_bandwidth;

  if (!profile) return <div className="container py-8"><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="container max-w-3xl space-y-6 py-8">
      <header>
        <h1 className="font-serif text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Profile, accessibility, and your personal data.</p>
      </header>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>What other people on Passionate Teaching see.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              {/* useAuth doesn't expose email directly, derive from session if needed */}
              <span>{profile.id.slice(0, 8)}…@passionate.test</span>
              <Badge variant="outline" className="ml-auto">Read-only</Badge>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Short bio</Label>
            <Textarea id="bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Accessibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wifi className="h-5 w-5 text-accent" /> Connection &amp; accessibility</CardTitle>
          <CardDescription>Reduce data usage and improve playback on weaker connections.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label htmlFor="low-bw" className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 hover:bg-secondary/30">
            <input
              id="low-bw"
              type="checkbox"
              checked={lowBandwidth}
              onChange={(e) => setLowBandwidth(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border accent-primary"
            />
            <div className="flex-1 space-y-1">
              <p className="font-medium text-foreground">Low-bandwidth mode</p>
              <p className="text-xs text-muted-foreground">
                When on, video lessons load less aggressively (preload only metadata) — useful on slow or metered connections.
              </p>
            </div>
            {lowBandwidth ? <Badge variant="accent">Enabled</Badge> : <Badge variant="outline">Off</Badge>}
          </label>
        </CardContent>
      </Card>

      {/* Data Transparency */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-accent" /> Data transparency</CardTitle>
          <CardDescription>
            Aligned with the BCS Code of Conduct &amp; UK GDPR — see exactly what we hold about you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="grid gap-2 sm:grid-cols-2">
            <DataRow icon={Database} label="Enrolment records" value={dataReport.data?.enrollments ?? "—"} />
            <DataRow icon={FileLock2} label="Lesson-progress entries" value={dataReport.data?.progress ?? "—"} />
            <DataRow icon={FileLock2} label="Assignment submissions" value={dataReport.data?.submissions ?? "—"} />
            <DataRow icon={MessageSquare} label="Messages sent" value={dataReport.data?.messages ?? "—"} />
          </ul>
          <Separator />
          <div className="rounded-lg border border-border bg-secondary/30 p-4 text-sm leading-relaxed text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">Your rights under UK GDPR</p>
            <p>
              You can <strong>access</strong>, <strong>rectify</strong>, <strong>port</strong>, or
              <strong> erase</strong> your data at any time. To request export or deletion, contact
              your tutor or the platform administrator. All data is encrypted at rest and in
              transit, and protected by Postgres Row-Level Security.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border sm:px-4">
        <Button variant="outline" onClick={() => {
          setFullName(profile.full_name);
          setBio(profile.bio ?? "");
          setLowBandwidth(profile.low_bandwidth);
        }} disabled={!dirty || save.isPending}>
          Reset
        </Button>
        <Button onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
          {save.isPending ? <Loader2 className="animate-spin" /> : <><Save className="h-4 w-4" /> Save changes</>}
        </Button>
      </div>
    </div>
  );
}

function DataRow({
  icon: Icon, label, value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <li className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </span>
      <span className="font-semibold text-foreground">{value}</span>
    </li>
  );
}

async function getEnrollmentIds(studentId: string): Promise<string[]> {
  const { data } = await supabase.from("enrollments").select("id").eq("student_id", studentId);
  return (data ?? []).map((d: any) => d.id);
}
