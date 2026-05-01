import * as React from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth, dashboardPathFor } from "@/hooks/useAuth";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingScreen } from "@/components/loading-screen";

export default function SignInPage() {
  const { signIn, user, profile, loading } = useAuth();
  const location = useLocation();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [signedIn, setSignedIn] = React.useState(false);

  // Already authenticated — bounce to the right dashboard.
  if (!loading && user && profile) {
    const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
    return <Navigate to={from ?? dashboardPathFor(profile.role)} replace />;
  }

  // Just signed in but profile is still loading — show a clean loading state
  // instead of the form, so we don't briefly show the form again before the
  // <Navigate> above kicks in.
  if (signedIn) return <LoadingScreen />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    if (error) {
      setSubmitting(false);
      toast.error("Sign-in failed", { description: error });
      return;
    }
    toast.success("Welcome back");
    setSignedIn(true);
    // No manual navigate — the <Navigate> at the top of this component will
    // fire automatically as soon as the auth state + profile populate.
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <Brand className="text-primary-foreground" to="/" />
        <div className="space-y-4">
          <p className="font-serif text-3xl leading-tight text-balance">
            “One calm home for the whole tutoring relationship — uploads,
            assignments, and conversations in one place.”
          </p>
          <p className="text-sm text-primary-foreground/70">
            Mr. Dhiraj · Founder, Passionate Teaching
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">
          UK GDPR aligned · WCAG 2.1 AA · Built on Supabase, hosted on Vercel
        </p>
      </aside>

      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>
          <Card className="shadow-none border-none">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-3xl">Sign in</CardTitle>
              <CardDescription>Welcome back. Pick up where you left off.</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <form onSubmit={onSubmit} className="space-y-4">
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
                    autoComplete="current-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin" /> : "Sign in"}
                </Button>
              </form>

              <p className="mt-6 text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link to="/sign-up" className="text-primary hover:underline underline-offset-4">
                  Create one
                </Link>
              </p>

              <div className="mt-8 rounded-lg border border-dashed border-border bg-secondary/40 p-4 text-xs leading-relaxed text-muted-foreground">
                <p className="font-medium text-foreground">Demo accounts (password: <code>Demo1234!</code>)</p>
                <ul className="mt-2 space-y-1 font-mono">
                  <li>sarah@passionate.test · student</li>
                  <li>dhiraj@passionate.test · tutor</li>
                  <li>admin@passionate.test · admin</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
