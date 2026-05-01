import * as React from "react";
import { Link, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, GraduationCap, BookOpen } from "lucide-react";
import { useAuth, dashboardPathFor } from "@/hooks/useAuth";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingScreen } from "@/components/loading-screen";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";

export default function SignUpPage() {
  const { signUp, user, profile, loading } = useAuth();
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<UserRole>("student");
  const [submitting, setSubmitting] = React.useState(false);
  const [signedUp, setSignedUp] = React.useState(false);

  if (!loading && user && profile) {
    return <Navigate to={dashboardPathFor(profile.role)} replace />;
  }

  if (signedUp) return <LoadingScreen />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signUp({ email: email.trim(), password, fullName: fullName.trim(), role });
    if (error) {
      setSubmitting(false);
      toast.error("Sign-up failed", { description: error });
      return;
    }
    toast.success("Account created", { description: "Signing you in…" });
    setSignedUp(true);
    // <Navigate> above will fire once the auth state + profile populate.
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <Brand className="text-primary-foreground" to="/" />
        <div className="space-y-4">
          <p className="font-serif text-3xl leading-tight text-balance">
            Designed for independent tutors and the students who learn from them.
          </p>
          <p className="text-sm text-primary-foreground/70">
            Upload lessons. Set assignments. Stay in touch. Without the noise.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">
          By creating an account you agree to our terms and privacy policy.
        </p>
      </aside>

      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>
          <Card className="border-none shadow-none">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-3xl">Create your account</CardTitle>
              <CardDescription>Get set up in under a minute.</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <form onSubmit={onSubmit} className="space-y-5">
                <div>
                  <Label className="mb-2 inline-block">I am a…</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <RoleCard
                      icon={<BookOpen className="h-5 w-5" />}
                      title="Student"
                      description="Learning from a tutor"
                      selected={role === "student"}
                      onClick={() => setRole("student")}
                    />
                    <RoleCard
                      icon={<GraduationCap className="h-5 w-5" />}
                      title="Tutor"
                      description="Teaching students"
                      selected={role === "tutor"}
                      onClick={() => setRole("tutor")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    autoComplete="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={role === "tutor" ? "Mr. Dhiraj" : "Sarah Kapoor"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">At least 6 characters.</p>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin" /> : "Create account"}
                </Button>
              </form>

              <p className="mt-6 text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/sign-in" className="text-primary hover:underline underline-offset-4">
                  Sign in
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function RoleCard({
  icon,
  title,
  description,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border p-4 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-border bg-background hover:bg-secondary"
      )}
    >
      <div className="flex items-center gap-2 text-foreground">
        <span className={cn("grid h-8 w-8 place-items-center rounded-md", selected ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground")}>
          {icon}
        </span>
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{description}</p>
    </button>
  );
}
