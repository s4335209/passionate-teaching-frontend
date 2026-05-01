import { LayoutDashboard, BookOpenCheck, Users, FileText, MessageCircle, Settings } from "lucide-react";
import { AppShell, type NavItem } from "@/components/app-shell";

const NAV: NavItem[] = [
  { to: "/tutor",             label: "Dashboard",   icon: LayoutDashboard, end: true },
  { to: "/tutor/courses",     label: "Courses",     icon: BookOpenCheck },
  { to: "/tutor/students",    label: "Students",    icon: Users },
  { to: "/tutor/assignments", label: "Assignments", icon: FileText },
  { to: "/tutor/messages",    label: "Messages",    icon: MessageCircle },
  { to: "/tutor/settings",    label: "Settings",    icon: Settings },
];

export default function TutorLayout() {
  return <AppShell nav={NAV} roleLabel="Tutor" />;
}
