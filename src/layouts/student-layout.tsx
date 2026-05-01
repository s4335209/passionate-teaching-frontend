import { LayoutDashboard, BookOpenCheck, FileText, MessageCircle, Settings } from "lucide-react";
import { AppShell, type NavItem } from "@/components/app-shell";

const NAV: NavItem[] = [
  { to: "/student",             label: "Dashboard",   icon: LayoutDashboard, end: true },
  { to: "/student/courses",     label: "Courses",     icon: BookOpenCheck },
  { to: "/student/assignments", label: "Assignments", icon: FileText },
  { to: "/student/messages",    label: "Messages",    icon: MessageCircle },
  { to: "/student/settings",    label: "Settings",    icon: Settings },
];

export default function StudentLayout() {
  return <AppShell nav={NAV} roleLabel="Student" />;
}
