import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { SeverityBadge, StatusBadge } from "../components/Badge";
import { Loading } from "../components/Loading";
import { canMutate } from "../lib/roles";

const STATUSES = ["open", "investigating", "contained", "resolved", "closed"];
const SEVERITIES = ["critical", "high", "medium", "low"];

export function Incidents() {
  const { apiRequest, user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await apiRequest("/incidents");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : `Failed to load incidents (${res.status})`
          );
        }
        if (!cancelled) setIncidents(data.incidents ?? []);
      } catch (e) {
        if (!cancelled && e.message !== "Unauthorized") {
          setError(e.message || "Request failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiRequest]);

  const filtered = useMemo(() => {
    return incidents.filter((i) => {
      if (statusFilter && i.status !== statusFilter) return false;
      if (severityFilter && i.severity !== severityFilter) return false;
      return true;
    });
  }, [incidents, statusFilter, severityFilter]);

  const showActions = canMutate(user?.role);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Incidents</h1>
          <p className="mt-1 text-sm text-slate-400">
            Track and triage security incidents
          </p>
        </div>
        {showActions && (
          <Link
            to="/incidents/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            New incident
          </Link>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="mt-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          >
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">
            Severity
          </label>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="mt-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          >
            <option value="">All</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <Loading />}
      {error && !loading && (
        <p className="mt-6 rounded-lg bg-red-950/40 px-4 py-3 text-sm text-red-300 ring-1 ring-red-900">
          {error}
        </p>
      )}

      {!loading && !error && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Reporter</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    No incidents match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="bg-slate-900/30 transition hover:bg-slate-900/60"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/incidents/${row.id}`}
                        className="font-medium text-indigo-400 hover:text-indigo-300"
                      >
                        {row.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <SeverityBadge value={row.severity} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge value={row.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {row.reporter?.name ?? row.reported_by?.slice(0, 8) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {row.updated_at
                        ? new Date(row.updated_at).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
