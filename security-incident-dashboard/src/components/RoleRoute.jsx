import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { canMutate, canViewAuditLogs } from "../lib/roles";

export function ResponderRoute() {
  const { user } = useAuth();
  if (!canMutate(user?.role)) {
    return <Navigate to="/incidents" replace />;
  }
  return <Outlet />;
}

export function AdminRoute() {
  const { user } = useAuth();
  if (!canViewAuditLogs(user?.role)) {
    return <Navigate to="/incidents" replace />;
  }
  return <Outlet />;
}
