import { LayoutDashboard, Users, BookOpenCheck, ScrollText, Settings } from "lucide-react";
import { AppShell, type NavItem } from "@/components/app-shell";

const NAV: NavItem[] = [
  { to: "/admin",          label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/users",    label: "Users",     icon: Users },
  { to: "/admin/courses",  label: "Courses",   icon: BookOpenCheck },
  { to: "/admin/logs",     label: "Logs",      icon: ScrollText },
  { to: "/admin/settings", label: "Settings",  icon: Settings },
];

export default function AdminLayout() {
  return <AppShell nav={NAV} roleLabel="Administrator" />;
}
