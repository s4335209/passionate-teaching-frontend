/**
 * Hand-written DB type stub. Will be regenerated from the deployed Supabase
 * project later via `supabase gen types typescript --project-id wlqkrtdquksaomuuwswy`.
 *
 * For now this is loose enough to compile; real types come once migrations are applied.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: Record<string, { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: "student" | "tutor" | "admin";
      lesson_type: "video" | "text" | "pdf";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type UserRole = Database["public"]["Enums"]["user_role"];
export type LessonType = Database["public"]["Enums"]["lesson_type"];
