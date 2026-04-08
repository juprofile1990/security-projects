import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import { Loading } from "../components/Loading";
import { SeverityBadge, StatusBadge } from "../components/Badge";

const STATUS_ORDER = ["open", "investigating", "contained", "resolved", "closed"];
const SEVERITY_ORDER = ["critical", "high", "medium", "low"];

const STATUS_COLORS = {
  open: "#f87171",
  investigating: "#fb923c",
  contained: "#facc15",
  resolved: "#34d399",
  closed: "#94a3b8",
};

const SEVERITY_COLORS = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};

function StatCard({ label, value, sub, color }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color ?? "text-white"}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white shadow-lg">
        <p className="font-medium capitalize">{label}</p>
        <p className="text-slate-300">{payload[0].value} incident{payload[0].value !== 1 ? "s" : ""}</p>
      </div>
    );
  }
  return null;
};

export function Dashboard() {
  const { apiRequest } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await apiRequest("/incidents?take=100");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
        if (!cancelled) setIncidents(data.incidents ?? []);
      } catch (e) {
        if (!cancelled && e.message !== "Unauthorized") setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [apiRequest]);

  if (loading) return <Loading />;
  if (error) return (
    <p className="mt-6 rounded-lg bg-red-950/40 px-4 py-3 text-sm text-red-300 ring-1 ring-red-900">{error}</p>
  );

  // Compute metrics
  const total = incidents.length;
  const open = incidents.filter(i => i.status === "open").length;
  const critical = incidents.filter(i => i.severity === "critical").length;
  const resolved = incidents.filter(i => i.status === "resolved" || i.status === "closed").length;
  const active = incidents.filter(i => ["open", "investigating", "contained"].includes(i.status)).length;

  const byStatus = STATUS_ORDER.map(s => ({
    name: s,
    count: incidents.filter(i => i.status === s).length,
  })).filter(d => d.count > 0);

  const bySeverity = SEVERITY_ORDER.map(s => ({
    name: s,
    value: incidents.filter(i => i.severity === s).length,
  })).filter(d => d.value > 0);

  const recent = [...incidents]
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 5);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">Security operations overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total incidents" value={total} />
        <StatCard label="Active" value={active} color="text-orange-400" sub="open, investigating, contained" />
        <StatCard label="Critical" value={critical} color="text-red-400" sub="severity: critical" />
        <StatCard label="Resolved / Closed" value={resolved} color="text-emerald-400" />
      </div>

      {/* Charts */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* By status bar chart */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Incidents by status
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byStatus} barCategoryGap="30%">
              <XAxis
                dataKey="name"
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {byStatus.map(entry => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#6366f1"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* By severity pie chart */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Incidents by severity
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={bySeverity}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={40}
                paddingAngle={3}
                label={({ name, value }) => `${name} (${value})`}
                labelLine={false}
              >
                {bySeverity.map(entry => (
                  <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] ?? "#6366f1"} />
                ))}
              </Pie>
              <Legend
                formatter={(value) => (
                  <span style={{ color: "#94a3b8", fontSize: 12, textTransform: "capitalize" }}>{value}</span>
                )}
              />
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Open vs Resolved summary bar */}
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Open vs resolved
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex-1 overflow-hidden rounded-full bg-slate-800 h-4">
            <div
              className="h-4 rounded-full bg-gradient-to-r from-red-500 to-emerald-500 transition-all"
              style={{ width: total ? `${(resolved / total) * 100}%` : "0%" }}
            />
          </div>
          <span className="shrink-0 text-sm text-slate-400">
            {resolved} of {total} resolved
          </span>
        </div>
        <div className="mt-2 flex gap-4 text-xs text-slate-500">
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-500" />{open} open</span>
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-orange-400" />{active - open} in progress</span>
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-400" />{resolved} resolved / closed</span>
        </div>
      </div>

      {/* Recent incidents */}
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Recently updated
        </h2>
        <div className="divide-y divide-slate-800">
          {recent.map(inc => (
            <div key={inc.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <Link
                  to={`/incidents/${inc.id}`}
                  className="truncate font-medium text-indigo-400 hover:text-indigo-300 text-sm"
                >
                  {inc.title}
                </Link>
                <p className="mt-0.5 text-xs text-slate-500">
                  {inc.updated_at ? new Date(inc.updated_at).toLocaleString() : "—"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <SeverityBadge value={inc.severity} />
                <StatusBadge value={inc.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
