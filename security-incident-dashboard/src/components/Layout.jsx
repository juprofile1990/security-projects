import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { canMutate, canViewAuditLogs } from "../lib/roles";

const navClass = ({ isActive }) =>
  `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-slate-800 text-white"
      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
  }`;

export function Layout() {
  const { user, logout } = useAuth();
  const role = user?.role;

  return (
    <div className="flex min-h-full">
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 px-4 py-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            SecOps
          </p>
          <h1 className="mt-1 text-lg font-semibold text-white">
            Incident Command
          </h1>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          <NavLink to="/dashboard" className={navClass}>
            Dashboard
          </NavLink>
          <NavLink to="/incidents" className={navClass}>
            Incidents
          </NavLink>
          <NavLink to="/assets" className={navClass}>
            Assets
          </NavLink>
          <NavLink to="/mitre-map" className={navClass}>
            Signatures of Attack
          </NavLink>
          <NavLink to="/correlation" className={navClass}>
            Correlation
          </NavLink>
          {canViewAuditLogs(role) && (
            <NavLink to="/audit-logs" className={navClass}>
              Audit logs
            </NavLink>
          )}
        </nav>
        <div className="border-t border-slate-800 p-4">
          <p className="truncate text-sm font-medium text-white">
            {user?.name ?? "—"}
          </p>
          <p className="mt-0.5 text-xs capitalize text-slate-500">{role}</p>
          <button
            type="button"
            onClick={logout}
            className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-auto bg-slate-950 p-8">
        <Outlet />
      </main>
    </div>
  );
}
