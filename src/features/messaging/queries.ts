import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types/database";

export interface ThreadSummary {
  id: string;
  course_id: string | null;
  course_title: string | null;
  counterparty_id: string;
  counterparty_name: string;
  last_message_at: string;
  preview: string;
  unread: number;
}

export function useThreads(userId: string | undefined, role: UserRole | undefined) {
  return useQuery({
    queryKey: ["threads", userId],
    enabled: !!userId && !!role,
    queryFn: async (): Promise<ThreadSummary[]> => {
      const filterCol = role === "tutor" ? "tutor_id" : "student_id";
      const { data: threads, error } = await supabase
        .from("threads")
        .select("id, student_id, tutor_id, course_id, last_message_at, courses(title)")
        .eq(filterCol, userId!)
        .order("last_message_at", { ascending: false });
      if (error) throw error;

      const out: ThreadSummary[] = [];
      for (const t of threads ?? []) {
        const counterId: string = role === "tutor" ? (t as any).student_id : (t as any).tutor_id;
        const { data: counter } = await supabase
          .from("profiles").select("full_name").eq("id", counterId).maybeSingle();

        const { data: last } = await supabase
          .from("messages")
          .select("body")
          .eq("thread_id", t.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const { count: unread } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("thread_id", t.id)
          .neq("sender_id", userId!)
          .is("read_at", null);

        out.push({
          id: t.id,
          course_id: (t as any).course_id,
          course_title: (t as any).courses?.title ?? null,
          counterparty_id: counterId,
          counterparty_name: counter?.full_name ?? "Unknown",
          last_message_at: t.last_message_at,
          preview: last?.body ?? "(no messages yet)",
          unread: unread ?? 0,
        });
      }
      return out;
    },
  });
}

export interface MessageRow {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export function useMessages(threadId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["messages", threadId],
    enabled: !!threadId,
    queryFn: async (): Promise<MessageRow[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, thread_id, sender_id, body, created_at, read_at")
        .eq("thread_id", threadId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MessageRow[];
    },
  });

  // Realtime subscription — append new messages when they arrive.
  React.useEffect(() => {
    if (!threadId) return;
    const channel = supabase
      .channel(`thread-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const row = payload.new as MessageRow;
          qc.setQueryData<MessageRow[]>(["messages", threadId], (prev = []) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, qc]);

  return query;
}

export function useSendMessage(threadId: string | null, senderId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      if (!threadId || !senderId) throw new Error("missing thread / sender");
      const trimmed = body.trim();
      if (!trimmed) return;

      // Optimistic insert (will be replaced by Realtime payload).
      const tempId = `temp-${Date.now()}`;
      qc.setQueryData<MessageRow[]>(["messages", threadId], (prev = []) => [
        ...prev,
        {
          id: tempId,
          thread_id: threadId,
          sender_id: senderId,
          body: trimmed,
          created_at: new Date().toISOString(),
          read_at: null,
        },
      ]);

      const { data, error } = await supabase
        .from("messages")
        .insert({ thread_id: threadId, sender_id: senderId, body: trimmed })
        .select("id")
        .single();
      if (error) {
        // Roll back optimistic insert on error.
        qc.setQueryData<MessageRow[]>(["messages", threadId], (prev = []) =>
          prev.filter((m) => m.id !== tempId)
        );
        throw error;
      }

      // Bump the thread's last_message_at so it surfaces in the list.
      await supabase
        .from("threads")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", threadId);

      // Replace temp id with real id (optimistic → confirmed).
      qc.setQueryData<MessageRow[]>(["messages", threadId], (prev = []) =>
        prev.map((m) => (m.id === tempId ? { ...m, id: data.id } : m))
      );

      qc.invalidateQueries({ queryKey: ["threads"] });
    },
  });
}

export function useMarkThreadRead(threadId: string | null, userId: string | undefined) {
  const qc = useQueryClient();
  React.useEffect(() => {
    if (!threadId || !userId) return;
    (async () => {
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("thread_id", threadId)
        .neq("sender_id", userId)
        .is("read_at", null);
      qc.invalidateQueries({ queryKey: ["threads"] });
    })();
  }, [threadId, userId, qc]);
}
