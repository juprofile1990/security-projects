import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Loading } from "../components/Loading";

export function AuditLogs() {
  const { apiRequest } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await apiRequest("/audit-logs");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : `Failed to load (${res.status})`
          );
        }
        if (!cancelled) setLogs(data.logs ?? []);
      } catch (e) {
        if (
          !cancelled &&
          e.message !== "Unauthorized" &&
          !e.message?.includes?.("Session expired")
        ) {
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

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Audit logs</h1>
      <p className="mt-1 text-sm text-slate-400">
        Administrative record of API mutations
      </p>

      {loading && <Loading />}
      {error && !loading && (
        <p className="mt-6 rounded-lg bg-red-950/40 px-4 py-3 text-sm text-red-300 ring-1 ring-red-900">
          {error}
        </p>
      )}

      {!loading && !error && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    No audit entries.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="bg-slate-900/30 hover:bg-slate-900/60"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {log.created_at
                        ? new Date(log.created_at).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">
                      {log.action}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      <span className="text-slate-500">{log.target_type}</span>
                      {log.target_id != null && log.target_id !== "" && (
                        <span className="ml-2 font-mono text-xs text-slate-500">
                          {log.target_id}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {log.user
                        ? `${log.user.name} (${log.user.email})`
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
