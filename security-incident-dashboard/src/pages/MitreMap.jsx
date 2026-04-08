import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loading } from "../components/Loading";
import { SeverityBadge, StatusBadge } from "../components/Badge";
import {
  TACTICS,
  TECHNIQUES,
  buildTechniqueIncidentMap,
  findCorrelatedIncidents,
} from "../lib/mitre";

function heatColor(count) {
  if (count === 0) return "bg-slate-800/60 text-slate-600 border-slate-700/50";
  if (count === 1) return "bg-indigo-950 text-indigo-300 border-indigo-800";
  if (count === 2) return "bg-indigo-800 text-indigo-100 border-indigo-600";
  return "bg-indigo-600 text-white border-indigo-400";
}

export function MitreMap() {
  const { apiRequest } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTechnique, setSelectedTechnique] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await apiRequest("/incidents?take=100");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);

        // Fetch full incident details (with alerts) for each incident
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

  const techniqueIncidentMap = useMemo(
    () => buildTechniqueIncidentMap(incidents),
    [incidents]
  );

  const correlations = useMemo(
    () => findCorrelatedIncidents(incidents, 2),
    [incidents]
  );

  const techniquesByTactic = useMemo(() => {
    const map = {};
    for (const tactic of TACTICS) {
      map[tactic] = TECHNIQUES.filter((t) => t.tactic === tactic);
    }
    return map;
  }, []);

  const selectedIncidents = useMemo(() => {
    if (!selectedTechnique) return [];
    const ids = techniqueIncidentMap[selectedTechnique.id] ?? [];
    return incidents.filter((inc) => ids.includes(inc.id));
  }, [selectedTechnique, techniqueIncidentMap, incidents]);

  const totalHits = Object.values(techniqueIncidentMap).reduce(
    (sum, ids) => sum + ids.length,
    0
  );

  if (loading) return <Loading />;
  if (error)
    return (
      <p className="mt-6 rounded-lg bg-red-950/40 px-4 py-3 text-sm text-red-300 ring-1 ring-red-900">
        {error}
      </p>
    );

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Signatures of Attack</h1>
          <p className="mt-1 text-sm text-slate-400">
            {incidents.length} incidents · {Object.keys(techniqueIncidentMap).length} techniques observed · {totalHits} total hits
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded border border-slate-700 bg-slate-800/60" /> No hits
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded border border-indigo-800 bg-indigo-950" /> 1
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded border border-indigo-600 bg-indigo-800" /> 2
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded border border-indigo-400 bg-indigo-600" /> 3+
          </span>
        </div>
      </div>

      {/* Heatmap */}
      <div className="space-y-3">
        {TACTICS.map((tactic) => {
          const techs = techniquesByTactic[tactic] ?? [];
          const tacticHits = techs.reduce(
            (sum, t) => sum + (techniqueIncidentMap[t.id]?.length ?? 0),
            0
          );
          return (
            <div
              key={tactic}
              className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
            >
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  {tactic}
                </h2>
                {tacticHits > 0 && (
                  <span className="rounded-full bg-indigo-900/60 px-2 py-0.5 text-xs text-indigo-300">
                    {tacticHits} hit{tacticHits !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {techs.map((t) => {
                  const count = techniqueIncidentMap[t.id]?.length ?? 0;
                  const isSelected = selectedTechnique?.id === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() =>
                        setSelectedTechnique(isSelected ? null : t)
                      }
                      className={`rounded-lg border px-2.5 py-1.5 text-left transition-all ${heatColor(count)} ${
                        isSelected
                          ? "ring-2 ring-white ring-offset-1 ring-offset-slate-900"
                          : "hover:brightness-125"
                      }`}
                    >
                      <div className="text-xs font-mono font-semibold">{t.id}</div>
                      <div className="text-xs leading-tight opacity-90">{t.name}</div>
                      {count > 0 && (
                        <div className="mt-0.5 text-xs font-bold">
                          {count} incident{count !== 1 ? "s" : ""}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected technique detail panel */}
      {selectedTechnique && (
        <div className="mt-6 rounded-xl border border-indigo-700 bg-indigo-950/30 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="font-mono text-sm text-indigo-400">
                {selectedTechnique.id}
              </span>
              <h2 className="mt-0.5 text-lg font-semibold text-white">
                {selectedTechnique.name}
              </h2>
              <p className="text-xs text-slate-400">
                Tactic: {selectedTechnique.tactic}
              </p>
            </div>
            <button
              onClick={() => setSelectedTechnique(null)}
              className="text-slate-500 hover:text-slate-300 text-lg leading-none"
            >
              ✕
            </button>
          </div>

          {selectedIncidents.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No incidents linked to this technique.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Incidents using this technique
              </p>
              {selectedIncidents.map((inc) => (
                <Link
                  key={inc.id}
                  to={`/incidents/${inc.id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3 transition hover:bg-slate-800"
                >
                  <span className="font-medium text-indigo-400 hover:text-indigo-300 text-sm">
                    {inc.title}
                  </span>
                  <div className="flex shrink-0 gap-2">
                    <SeverityBadge value={inc.severity} />
                    <StatusBadge value={inc.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Correlation section */}
      <div className="mt-8">
        <h2 className="mb-1 text-lg font-semibold text-white">
          Incident Correlation
        </h2>
        <p className="mb-4 text-sm text-slate-400">
          Incidents sharing 2 or more MITRE techniques — possible same threat actor or campaign.
        </p>

        {correlations.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-8 text-center text-sm text-slate-500">
            No correlated incident pairs found yet. Add more incidents with alerts to see correlations.
          </div>
        ) : (
          <div className="space-y-4">
            {correlations.map((pair, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-700 bg-slate-900/40 p-5"
              >
                <div className="flex flex-wrap items-start gap-4">
                  {/* Incident A */}
                  <Link
                    to={`/incidents/${pair.incidentA.id}`}
                    className="flex-1 min-w-[200px] rounded-lg border border-slate-700 bg-slate-950/60 p-3 transition hover:bg-slate-800"
                  >
                    <p className="text-xs text-slate-500 mb-1">Incident A</p>
                    <p className="font-medium text-indigo-400 text-sm">
                      {pair.incidentA.title}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <SeverityBadge value={pair.incidentA.severity} />
                      <StatusBadge value={pair.incidentA.status} />
                    </div>
                  </Link>

                  {/* Shared techniques */}
                  <div className="flex flex-col items-center justify-center gap-2 px-2">
                    <div className="text-xs font-semibold text-amber-400">
                      {pair.sharedTechniques.length} shared technique{pair.sharedTechniques.length !== 1 ? "s" : ""}
                    </div>
                    <div className="flex flex-wrap justify-center gap-1">
                      {pair.sharedTechniques.map((t) => (
                        <span
                          key={t.id}
                          className="rounded bg-amber-900/40 px-1.5 py-0.5 font-mono text-xs text-amber-300 border border-amber-800/50"
                        >
                          {t.id}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Incident B */}
                  <Link
                    to={`/incidents/${pair.incidentB.id}`}
                    className="flex-1 min-w-[200px] rounded-lg border border-slate-700 bg-slate-950/60 p-3 transition hover:bg-slate-800"
                  >
                    <p className="text-xs text-slate-500 mb-1">Incident B</p>
                    <p className="font-medium text-indigo-400 text-sm">
                      {pair.incidentB.title}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <SeverityBadge value={pair.incidentB.severity} />
                      <StatusBadge value={pair.incidentB.status} />
                    </div>
                  </Link>
                </div>

                {/* Shared technique details */}
                <div className="mt-3 border-t border-slate-800 pt-3">
                  <p className="text-xs text-slate-500 mb-2">Shared techniques:</p>
                  <div className="flex flex-wrap gap-2">
                    {pair.sharedTechniques.map((t) => (
                      <span
                        key={t.id}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
                      >
                        <span className="font-mono text-amber-400">{t.id}</span>
                        <span className="ml-1.5 text-slate-300">{t.name}</span>
                        <span className="ml-1.5 text-slate-500">· {t.tactic}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
