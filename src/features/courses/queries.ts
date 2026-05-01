import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface EnrolledCourseSummary {
  enrollment_id: string;
  course_id: string;
  course_title: string;
  course_description: string | null;
  cover_url: string | null;
  total_lessons: number;
  done_lessons: number;
  pct: number;
  next_lesson: { id: string; title: string; type: string } | null;
}

export function useEnrolledCourses(studentId: string | undefined) {
  return useQuery({
    queryKey: ["enrolled-courses", studentId],
    enabled: !!studentId,
    queryFn: async (): Promise<EnrolledCourseSummary[]> => {
      const { data: enrollments, error } = await supabase
        .from("enrollments")
        .select("id, course_id, courses(id, title, description, cover_url)")
        .eq("student_id", studentId);
      if (error) throw error;

      const summaries: EnrolledCourseSummary[] = [];
      for (const e of (enrollments ?? []) as any[]) {
        const courseId = e.course_id as string;

        const { data: lessons } = await supabase
          .from("lessons")
          .select("id, title, type, position, modules!inner(course_id, position)")
          .eq("modules.course_id", courseId)
          .order("position", { foreignTable: "modules", ascending: true })
          .order("position", { ascending: true });

        const total = lessons?.length ?? 0;

        const { data: progress } = await supabase
          .from("lesson_progress")
          .select("lesson_id")
          .eq("enrollment_id", e.id);

        const doneIds = new Set((progress ?? []).map((p: any) => p.lesson_id));
        const done = doneIds.size;

        const next = (lessons ?? []).find((l: any) => !doneIds.has(l.id)) ?? null;

        summaries.push({
          enrollment_id: e.id,
          course_id: courseId,
          course_title: e.courses.title,
          course_description: e.courses.description,
          cover_url: e.courses.cover_url,
          total_lessons: total,
          done_lessons: done,
          pct: total === 0 ? 0 : Math.round((done * 100) / total),
          next_lesson: next ? { id: next.id, title: next.title, type: next.type } : null,
        });
      }
      return summaries;
    },
  });
}

export interface UpcomingAssignment {
  id: string;
  title: string;
  course_title: string;
  due_at: string | null;
  submitted: boolean;
}

export function useUpcomingAssignments(studentId: string | undefined) {
  return useQuery({
    queryKey: ["upcoming-assignments", studentId],
    enabled: !!studentId,
    queryFn: async (): Promise<UpcomingAssignment[]> => {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("course_id, courses(id, title)")
        .eq("student_id", studentId);
      const courseIds = (enrollments ?? []).map((e: any) => e.course_id);
      if (courseIds.length === 0) return [];

      const { data: assignments } = await supabase
        .from("assignments")
        .select("id, title, due_at, course_id, courses(title)")
        .in("course_id", courseIds)
        .order("due_at", { ascending: true });

      const { data: submissions } = await supabase
        .from("submissions")
        .select("assignment_id")
        .eq("student_id", studentId);
      const submittedIds = new Set((submissions ?? []).map((s: any) => s.assignment_id));

      return (assignments ?? []).map((a: any) => ({
        id: a.id,
        title: a.title,
        course_title: a.courses.title,
        due_at: a.due_at,
        submitted: submittedIds.has(a.id),
      }));
    },
  });
}

export interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  course_title: string;
  created_at: string;
}

export function useAnnouncementsForStudent(studentId: string | undefined) {
  return useQuery({
    queryKey: ["announcements-student", studentId],
    enabled: !!studentId,
    queryFn: async (): Promise<AnnouncementItem[]> => {
      const { data: enrollments } = await supabase
        .from("enrollments").select("course_id").eq("student_id", studentId);
      const courseIds = (enrollments ?? []).map((e: any) => e.course_id);
      if (courseIds.length === 0) return [];

      const { data, error } = await supabase
        .from("announcements")
        .select("id, title, body, created_at, courses(title)")
        .in("course_id", courseIds)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []).map((a: any) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        course_title: a.courses.title,
        created_at: a.created_at,
      }));
    },
  });
}
