import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";

export function StubPage({ title, description }: { title: string; description?: string }) {
  return (
    <div className="container max-w-3xl py-10">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Construction className="h-6 w-6 text-accent" />
            <CardTitle>{title}</CardTitle>
          </div>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This page is on the build queue. Coming up next phase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
