import { GraduationCap } from "lucide-react";

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <GraduationCap className="h-10 w-10 animate-pulse text-primary" aria-hidden="true" />
        <p className="text-sm">Loading…</p>
      </div>
    </div>
  );
}
