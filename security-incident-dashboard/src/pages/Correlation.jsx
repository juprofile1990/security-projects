import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loading } from "../components/Loading";
import { SeverityBadge, StatusBadge } from "../components/Badge";
import { clusterIntoCampaigns, buildCoOccurrenceMatrix } from "../lib/mitre";

const SEVERITY_COLOR = {
  critical: "border-red-700 bg-red-950/40",
  high:     "border-orange-700 bg-orange-950/30",
  medium:   "border-yellow-700 bg-yellow-950/20",
  low:      "border-slate-700 bg-slate-900/40",
};

const SEVERITY_BADGE_COLOR = {
  critical: "bg-red-900/60 text-red-300 border border-red-700",
  high:     "bg-orange-900/60 text-orange-300 border border-orange-700",
  medium:   "bg-yellow-900/50 text-yellow-300 border border-yellow-700",
  low:      "bg-slate-800 text-slate-300 border border-slate-600",
};

const CAMPAIGN_ACCENT = [
  "text-violet-400 border-violet-700 bg-violet-950/40",
  "text-cyan-400 border-cyan-700 bg-cyan-950/40",
  "text-emerald-400 border-emerald-700 bg-emerald-950/40",
  "text-amber-400 border-amber-700 bg-amber-950/40",
  "text-rose-400 border-rose-700 bg-rose-950/40",
  "text-sky-400 border-sky-700 bg-sky-950/40",
];

function coOccurrenceColor(val, max) {
  if (val === 0) return "bg-slate-900 text-slate-700";
  const intensity = val / max;
  if (intensity < 0.25) return "bg-indigo-950 text-indigo-400";
  if (intensity < 0.5)  return "bg-indigo-800 text-indigo-200";
  if (intensity < 0.75) return "bg-indigo-600 text-white";
  return "bg-indigo-400 text-white font-bold";
}

export function Correlation() {
  const { apiRequest } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedCampaign, setExpandedCampaign] = useState(null);
  const [showMatrix, setShowMatrix] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await apiRequest("/incidents?take=100");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
        const details = await Promise.all(
          (data.incidents ?? []).map(async (inc) => {
            const r = await apiRequest(`/incidents/${inc.id}`);
            const d = await r.json().catch(() => ({}));
            return r.ok ? d.incident : inc;
          })
        );
        if (!cancelled) setIncidents(details);
      } catch (e) {
        if (!cancelled && e.message !== "Unauthorized") setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [apiRequest]);

  const campaigns = useMemo(() => clusterIntoCampaigns(incidents, 2), [incidents]);
  const { techniques: matrixTechs, matrix } = useMemo(
    () => buildCoOccurrenceMatrix(incidents),
    [incidents]
  );
  const matrixMax = useMemo(
    () => Math.max(...matrix.flat().filter((v, i) => {
      const row = Math.floor(i / matrixTechs.length);
      const col = i % matrixTechs.length;
      return row !== col;
    }), 1),
    [matrix, matrixTechs]
  );

  const unclustered = useMemo(() => {
    const clusteredIds = new Set(campaigns.flatMap((c) => c.incidents.map((i) => i.id)));
    return incidents.filter((i) => !clusteredIds.has(i.id));
  }, [incidents, campaigns]);

  if (loading) return <Loading />;
  if (error) return (
    <p className="mt-6 rounded-lg bg-red-950/40 px-4 py-3 text-sm text-red-300 ring-1 ring-red-900">{error}</p>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">ATT&CK Correlation</h1>
        <p className="mt-1 text-sm text-slate-400">
          {incidents.length} incidents auto-clustered into {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""} by shared MITRE techniques
        </p>
      </div>

      {/* Summary strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Campaigns detected</p>
          <p className="mt-1 text-3xl font-bold text-violet-400">{campaigns.length}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Clustered incidents</p>
          <p className="mt-1 text-3xl font-bold text-white">{incidents.length - unclustered.length}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Unique techniques</p>
          <p className="mt-1 text-3xl font-bold text-indigo-400">{matrixTechs.length}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Standalone incidents</p>
          <p className="mt-1 text-3xl font-bold text-slate-400">{unclustered.length}</p>
        </div>
      </div>

      {/* Campaign cards */}
      {campaigns.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-10 text-center text-slate-500 text-sm">
          No campaigns detected yet. Add more incidents with overlapping alerts to see clustering.
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign, idx) => {
            const accent = CAMPAIGN_ACCENT[idx % CAMPAIGN_ACCENT.length];
            const isExpanded = expandedCampaign === campaign.id;
            const activeCount = campaign.incidents.filter(
              (i) => ["open", "investigating", "contained"].includes(i.status)
            ).length;

            return (
              <div
                key={campaign.id}
                className={`rounded-xl border ${SEVERITY_COLOR[campaign.severity]} overflow-hidden`}
              >
                {/* Campaign header */}
                <button
                  onClick={() => setExpandedCampaign(isExpanded ? null : campaign.id)}
                  className="w-full text-left px-5 py-4 flex flex-wrap items-center justify-between gap-3 hover:brightness-110 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className={`rounded-lg border px-2.5 py-1 text-sm font-bold ${accent}`}>
                      {campaign.label}
                    </span>
                    <div>
                      <p className="font-semibold text-white">
                        {campaign.incidents.length} incident{campaign.incidents.length !== 1 ? "s" : ""}
                        {activeCount > 0 && (
                          <span className="ml-2 text-xs font-normal text-orange-400">
                            {activeCount} active
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400">
                        Last activity: {campaign.latestActivity.toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${SEVERITY_BADGE_COLOR[campaign.severity]}`}>
                      {campaign.severity}
                    </span>
                    <span className="text-xs text-slate-400">
                      {campaign.techniques.length} technique{campaign.techniques.length !== 1 ? "s" : ""}
                    </span>
                    {campaign.sharedTechniques.length > 0 && (
                      <span className="text-xs text-amber-400">
                        {campaign.sharedTechniques.length} shared across all
                      </span>
                    )}
                    <span className="text-slate-500 text-xs ml-1">
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </div>
                </button>

                {/* Technique chips - always visible */}
                <div className="px-5 pb-3 flex flex-wrap gap-1.5">
                  {campaign.techniques.map((t) => {
                    const isShared = campaign.sharedTechniques.some((s) => s.id === t.id);
                    return (
                      <span
                        key={t.id}
                        className={`rounded-md px-2 py-0.5 text-xs border ${
                          isShared
                            ? "bg-amber-900/40 border-amber-700 text-amber-300"
                            : "bg-slate-800/60 border-slate-700 text-slate-400"
                        }`}
                        title={`${t.tactic} — ${isShared ? "shared across all incidents" : "partial overlap"}`}
                      >
                        <span className="font-mono">{t.id}</span>
                        <span className="ml-1 hidden sm:inline">{t.name}</span>
                      </span>
                    );
                  })}
                </div>

                {/* Expanded: incident list */}
                {isExpanded && (
                  <div className="border-t border-slate-800 px-5 py-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                      Incidents in this campaign
                    </p>
                    {campaign.incidents.map((inc) => (
                      <Link
                        key={inc.id}
                        to={`/incidents/${inc.id}`}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3 transition hover:bg-slate-800"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-indigo-400 text-sm truncate">
                            {inc.title}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Updated: {inc.updated_at ? new Date(inc.updated_at).toLocaleDateString() : "—"}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <SeverityBadge value={inc.severity} />
                          <StatusBadge value={inc.status} />
                        </div>
                      </Link>
                    ))}

                    {/* Shared technique breakdown */}
                    {campaign.sharedTechniques.length > 0 && (
                      <div className="mt-4 rounded-lg border border-amber-800/50 bg-amber-950/20 p-3">
                        <p className="text-xs font-semibold text-amber-400 mb-2">
                          ⚠ Techniques shared across every incident in this campaign (strongest correlation signal)
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {campaign.sharedTechniques.map((t) => (
                            <span key={t.id} className="rounded-lg border border-amber-700 bg-amber-900/30 px-2.5 py-1.5 text-xs">
                              <span className="font-mono text-amber-300">{t.id}</span>
                              <span className="ml-1.5 text-slate-300">{t.name}</span>
                              <span className="ml-1.5 text-slate-500">· {t.tactic}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Standalone incidents */}
      {unclustered.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Standalone incidents (no campaign match)
          </h2>
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 divide-y divide-slate-800">
            {unclustered.map((inc) => (
              <Link
                key={inc.id}
                to={`/incidents/${inc.id}`}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-800"
              >
                <span className="text-sm font-medium text-indigo-400">{inc.title}</span>
                <div className="flex shrink-0 gap-2">
                  <SeverityBadge value={inc.severity} />
                  <StatusBadge value={inc.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Technique co-occurrence matrix */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Technique Co-occurrence Matrix</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              How often pairs of techniques appear together across incidents. Brighter = more co-occurrences.
            </p>
          </div>
          <button
            onClick={() => setShowMatrix((v) => !v)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 transition"
          >
            {showMatrix ? "Hide matrix" : "Show matrix"}
          </button>
        </div>

        {showMatrix && (
          matrixTechs.length === 0 ? (
            <p className="text-sm text-slate-500">No technique data available yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
              <table className="text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-slate-900 px-2 py-1 text-left text-slate-500 min-w-[120px]" />
                    {matrixTechs.map((t) => (
                      <th
                        key={t.id}
                        className="px-1 py-2 font-mono text-slate-400 font-normal"
                        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", minWidth: 28 }}
                        title={t.name}
                      >
                        {t.id}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixTechs.map((rowTech, rowIdx) => (
                    <tr key={rowTech.id}>
                      <td className="sticky left-0 z-10 bg-slate-900 px-2 py-1 font-mono text-slate-400 whitespace-nowrap border-r border-slate-800">
                        <span className="text-indigo-400">{rowTech.id}</span>
                        <span className="ml-1.5 text-slate-500 text-xs">{rowTech.name}</span>
                      </td>
                      {matrixTechs.map((colTech, colIdx) => {
                        const val = matrix[rowIdx][colIdx];
                        const isSelf = rowIdx === colIdx;
                        return (
                          <td
                            key={colTech.id}
                            className={`text-center border border-slate-800/50 ${
                              isSelf
                                ? "bg-slate-700/40 text-slate-600"
                                : coOccurrenceColor(val, matrixMax)
                            }`}
                            style={{ width: 28, height: 28 }}
                            title={isSelf ? rowTech.name : `${rowTech.id} + ${colTech.id}: ${val} incident${val !== 1 ? "s" : ""}`}
                          >
                            {isSelf ? "·" : val > 0 ? val : ""}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
