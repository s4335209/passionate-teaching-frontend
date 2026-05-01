import { Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/protected-route";

import LandingPage from "@/pages/landing";
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";
import { StubPage } from "@/pages/stub";

import StudentLayout from "@/layouts/student-layout";
import TutorLayout from "@/layouts/tutor-layout";
import AdminLayout from "@/layouts/admin-layout";

import StudentDashboard from "@/pages/student/dashboard";
import StudentCoursesPage from "@/pages/student/courses";
import StudentCourseViewPage from "@/pages/student/course-view";
import StudentAssignmentsPage from "@/pages/student/assignments";
import StudentQuizPage from "@/pages/student/quiz";
import TutorDashboard from "@/pages/tutor/dashboard";
import TutorCoursesPage from "@/pages/tutor/courses";
import TutorCourseEditPage from "@/pages/tutor/course-edit";
import TutorStudentsPage from "@/pages/tutor/students";
import TutorGradingPage from "@/pages/tutor/grading";
import AdminDashboard from "@/pages/admin/dashboard";
import SettingsPage from "@/pages/settings";
import MessagesPage from "@/pages/messages";

function NotFound() {
  return <StubPage title="404 — page not found" description="That page hasn't been built yet." />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />

        {/* Student */}
        <Route
          path="/student"
          element={
            <ProtectedRoute allow={["student"]}>
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<StudentDashboard />} />
          <Route path="courses" element={<StudentCoursesPage />} />
          <Route path="courses/:id" element={<StudentCourseViewPage />} />
          <Route path="quizzes/:id" element={<StudentQuizPage />} />
          <Route path="assignments" element={<StudentAssignmentsPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Tutor */}
        <Route
          path="/tutor"
          element={
            <ProtectedRoute allow={["tutor"]}>
              <TutorLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<TutorDashboard />} />
          <Route path="courses" element={<TutorCoursesPage />} />
          <Route path="courses/:id" element={<TutorCourseEditPage />} />
          <Route path="students" element={<TutorStudentsPage />} />
          <Route path="assignments" element={<TutorGradingPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allow={["admin"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<StubPage title="Users" description="Manage user accounts." />} />
          <Route path="courses" element={<StubPage title="Course review" description="Review courses for platform standards." />} />
          <Route path="logs" element={<StubPage title="System logs" description="Audit trail and platform health." />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<NotFound />} />
        <Route path="/index.html" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
