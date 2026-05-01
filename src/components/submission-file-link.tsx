import * as React from "react";
import { toast } from "sonner";
import { Eye, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

/**
 * Renders a submission's attached file with an "Open" button. Generates a
 * short-lived signed URL on click and opens it in a new tab.
 */
export function SubmissionFileLink({
  bucket = "submissions",
  path,
}: {
  bucket?: string;
  path: string;
}) {
  const [loading, setLoading] = React.useState(false);
  const filename = path.split("/").pop() ?? path;

  async function open() {
    setLoading(true);
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 5); // 5 minutes
    setLoading(false);
    if (error || !data?.signedUrl) {
      toast.error("Couldn't open file", { description: error?.message });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/30 p-3">
      <FileText className="h-4 w-4 shrink-0 text-primary" />
      <span className="line-clamp-1 flex-1 font-mono text-xs text-foreground">{filename}</span>
      <Button size="sm" variant="outline" onClick={open} disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : <><Eye className="h-3.5 w-3.5" /> Open</>}
      </Button>
    </div>
  );
}
