import { Link, Navigate } from "react-router-dom";
import { ArrowRight, BookOpenCheck, ClipboardList, MessageCircle, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { useAuth, dashboardPathFor } from "@/hooks/useAuth";

const FEATURES = [
  {
    icon: BookOpenCheck,
    title: "Course management",
    body: "Upload video lessons, PDF worksheets and text guides into a structured curriculum students can actually follow.",
  },
  {
    icon: ClipboardList,
    title: "Assignment portal",
    body: "Set tasks, collect submissions, mark with feedback, and let students see their grade — all without juggling email.",
  },
  {
    icon: MessageCircle,
    title: "Built-in messaging",
    body: "One thread per student. No app switching. No “did you get my email?”. Realtime delivery on the platform itself.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy by design",
    body: "Row-level security on every table. Tutor IP and student data each protected with their own access rules.",
  },
];

export default function LandingPage() {
  const { user, profile, loading } = useAuth();
  if (!loading && user && profile) {
    return <Navigate to={dashboardPathFor(profile.role)} replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-secondary/40 to-white">
      <header className="border-b border-border">
        <div className="container flex items-center justify-between py-4">
          <Brand />
          <nav className="flex items-center gap-3 text-sm">
            <Link to="/sign-in" className="hidden text-muted-foreground hover:text-foreground sm:inline">
              Sign in
            </Link>
            <Button asChild size="sm">
              <Link to="/sign-up">
                Get started
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="container py-20">
          <div className="mx-auto max-w-3xl text-center animate-fade-in">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-xs font-medium uppercase tracking-wider text-accent-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              For independent tutors and their students
            </p>
            <h1 className="text-balance font-serif text-5xl font-bold leading-tight text-primary md:text-6xl">
              One calm home for the whole tutoring relationship.
            </h1>
            <p className="mt-6 text-balance text-lg text-muted-foreground md:text-xl">
              Upload video lessons, PDF worksheets, and text guides. Set
              assignments, mark them, and message your students — without
              juggling five different apps.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/sign-up">
                  Create your account
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/sign-in">I already have an account</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="container pb-24">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <article key={f.title} className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-serif text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-secondary/40">
        <div className="container flex flex-col items-center justify-between gap-2 py-6 text-xs text-muted-foreground sm:flex-row">
          <p>Passionate Teaching · LSBU CSI_5_SFE Software Engineering · Team 12</p>
          <p>UK GDPR · DPA 2018 · WCAG 2.1 AA</p>
        </div>
      </footer>
    </div>
  );
}
