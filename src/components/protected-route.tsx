import { Navigate, useLocation } from "react-router-dom";
import { useAuth, dashboardPathFor } from "@/hooks/useAuth";
import { LoadingScreen } from "@/components/loading-screen";
import type { UserRole } from "@/types/database";

export function ProtectedRoute({
  children,
  allow,
}: {
  children: React.ReactNode;
  allow?: UserRole[];
}) {
  const { loading, user, profile } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/sign-in" state={{ from: location }} replace />;

  if (allow && profile && !allow.includes(profile.role)) {
    return <Navigate to={dashboardPathFor(profile.role)} replace />;
  }

  return <>{children}</>;
}
