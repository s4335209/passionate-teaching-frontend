import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { format, formatDistanceToNowStrict, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft, MessageCircle, Send, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useMessages,
  useSendMessage,
  useThreads,
  useMarkThreadRead,
} from "@/features/messaging/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function MessagesPage() {
  const { profile } = useAuth();
  const [search, setSearch] = useSearchParams();
  const threads = useThreads(profile?.id, profile?.role);

  // Pre-select a thread from query (?thread=...) or auto-pick the first one on desktop.
  const requestedThread = search.get("thread");
  const requestedStudent = search.get("student"); // tutor jumping from a Students-page link
  const matched =
    requestedThread ??
    (requestedStudent
      ? (threads.data ?? []).find((t) => t.counterparty_id === requestedStudent)?.id
      : undefined);

  const [activeId, setActiveId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (matched) setActiveId(matched);
    else if (!activeId && threads.data && threads.data.length > 0) {
      setActiveId(threads.data[0].id);
    }
  }, [matched, threads.data, activeId]);

  const active = (threads.data ?? []).find((t) => t.id === activeId) ?? null;
  const messages = useMessages(activeId);
  useMarkThreadRead(activeId, profile?.id);
  const sendMessage = useSendMessage(activeId, profile?.id);

  const [draft, setDraft] = React.useState("");

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || sendMessage.isPending) return;
    sendMessage.mutate(draft, {
      onSuccess: () => setDraft(""),
      onError: (err: any) => toast.error("Couldn't send", { description: err.message }),
    });
  }

  return (
    <div className="container max-w-7xl py-6">
      <header className="mb-4">
        <h1 className="font-serif text-3xl font-bold text-foreground">Messages</h1>
        <p className="text-muted-foreground">
          {profile?.role === "tutor" ? "Talk to your students." : "Talk to your tutor."}
        </p>
      </header>

      <div className="grid h-[calc(100vh-220px)] grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        {/* Thread list */}
        <Card className={cn("h-full overflow-hidden", active && "hidden lg:block")}>
          <CardContent className="h-full overflow-y-auto p-2">
            {threads.isLoading ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : (threads.data ?? []).length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No conversations yet.</p>
            ) : (
              <ul className="space-y-1">
                {(threads.data ?? []).map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => {
                        setActiveId(t.id);
                        setSearch({ thread: t.id });
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-md p-3 text-left transition-colors",
                        activeId === t.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                      )}
                    >
                      <Avatar>
                        <AvatarFallback>{initials(t.counterparty_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate font-medium">{t.counterparty_name}</p>
                          <span className={cn("shrink-0 text-[10px]",
                            activeId === t.id ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}>
                            {relTime(t.last_message_at)}
                          </span>
                        </div>
                        {t.course_title ? (
                          <p className={cn("truncate text-[11px] uppercase tracking-wide",
                            activeId === t.id ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}>
                            {t.course_title}
                          </p>
                        ) : null}
                        <p className={cn("mt-0.5 line-clamp-1 text-xs",
                          activeId === t.id ? "text-primary-foreground/85" : "text-muted-foreground"
                        )}>
                          {t.preview}
                        </p>
                      </div>
                      {t.unread > 0 ? (
                        <Badge variant="accent" className="ml-1">{t.unread}</Badge>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Conversation */}
        <Card className={cn("flex h-full flex-col overflow-hidden", !active && "hidden lg:flex")}>
          {!active ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
              <MessageCircle className="h-10 w-10 opacity-40" />
              <p>Pick a conversation to get started.</p>
            </div>
          ) : (
            <>
              <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setActiveId(null)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Avatar><AvatarFallback>{initials(active.counterparty_name)}</AvatarFallback></Avatar>
                  <div>
                    <p className="font-semibold text-foreground">{active.counterparty_name}</p>
                    {active.course_title ? (
                      <p className="text-xs text-muted-foreground">{active.course_title}</p>
                    ) : null}
                  </div>
                </div>
                <Badge variant="success" className="gap-1 text-[10px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> realtime
                </Badge>
              </header>

              <ConversationScroll
                messages={messages.data ?? []}
                isLoading={messages.isLoading}
                myId={profile?.id}
                threadId={active.id}
              />

              <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border px-4 py-3">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a message…"
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button type="submit" disabled={!draft.trim() || sendMessage.isPending}>
                  {sendMessage.isPending ? <Loader2 className="animate-spin" /> : <><Send className="h-4 w-4" /> Send</>}
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

/**
 * Auto-scrolling conversation list. Sticks to the bottom while the user
 * is at/near the bottom (sending or receiving). If they scroll up to read
 * older messages, new arrivals do NOT yank the scroll position.
 */
function ConversationScroll({
  messages, isLoading, myId, threadId,
}: {
  messages: { id: string; sender_id: string; body: string; created_at: string }[];
  isLoading: boolean;
  myId: string | undefined;
  threadId: string;
}) {
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const lastCount = React.useRef(0);
  const stickToBottom = React.useRef(true);

  // When the active thread changes, jump to bottom immediately.
  React.useEffect(() => {
    lastCount.current = 0;
    stickToBottom.current = true;
    queueMicrotask(() => bottomRef.current?.scrollIntoView({ block: "end" }));
  }, [threadId]);

  // When messages grow (sent or received), smooth-scroll if user is "stuck".
  React.useEffect(() => {
    const count = messages.length;
    if (count === lastCount.current) return;
    const grew = count > lastCount.current;
    lastCount.current = count;
    if (grew && stickToBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length]);

  function onScroll() {
    const el = containerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottom.current = distance < 80;
  }

  return (
    <div ref={containerRef} onScroll={onScroll} className="flex-1 overflow-y-auto bg-secondary/20 px-4 py-4">
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : messages.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">Say hi 👋</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {groupByDay(messages).map((group) => (
            <li key={group.day} className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {dayLabel(group.day)}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              {group.items.map((m) => (
                <Bubble key={m.id} mine={m.sender_id === myId} body={m.body} time={m.created_at} />
              ))}
            </li>
          ))}
        </ol>
      )}
      <div ref={bottomRef} aria-hidden />
    </div>
  );
}

function Bubble({ mine, body, time }: { mine: boolean; body: string; time: string }) {
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed shadow-sm",
        mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-card text-foreground border border-border"
      )}>
        <p className="whitespace-pre-wrap break-words">{body}</p>
        <p className={cn("mt-1 text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
          {format(new Date(time), "HH:mm")}
        </p>
      </div>
    </div>
  );
}

function initials(name: string) {
  return name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function relTime(iso: string) {
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: false });
}

function groupByDay(messages: { id: string; created_at: string; sender_id: string; body: string }[]) {
  const groups: Record<string, typeof messages> = {};
  for (const m of messages) {
    const day = m.created_at.slice(0, 10);
    (groups[day] ??= []).push(m);
  }
  return Object.entries(groups).map(([day, items]) => ({ day, items }));
}

function dayLabel(day: string) {
  const d = new Date(day);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEE d MMM");
}
