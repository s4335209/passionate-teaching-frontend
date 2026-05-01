import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

export function Brand({ className, to = "/" }: { className?: string; to?: string }) {
  return (
    <Link
      to={to}
      className={cn("flex items-center gap-2 font-serif text-lg font-bold text-primary", className)}
    >
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
        <GraduationCap className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="leading-tight">
        Passionate <span className="text-accent-foreground/80">Teaching</span>
      </span>
    </Link>
  );
}
