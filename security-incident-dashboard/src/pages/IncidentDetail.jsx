import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { SeverityBadge, StatusBadge } from "../components/Badge";
import { Loading } from "../components/Loading";
import { canMutate } from "../lib/roles";
import { suggestTechniques, generateSignature, TACTICS } from "../lib/mitre";

const STATUSES = ["open", "investigating", "contained", "resolved", "closed"];

export function IncidentDetail() {
  const { id } = useParams();
  const { apiRequest, user } = useAuth();
  const [incident, setIncident] = useState(null);
  const [assetsCatalog, setAssetsCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusEdit, setStatusEdit] = useState("");
  const [updateError, setUpdateError] = useState("");
  const [updating, setUpdating] = useState(false);

  const [alertSource, setAlertSource] = useState("");
  const [alertType, setAlertType] = useState("");
  const [alertPayload, setAlertPayload] = useState("{}");
  const [alertFp, setAlertFp] = useState(false);
  const [alertError, setAlertError] = useState("");
  const [alertSubmitting, setAlertSubmitting] = useState(false);

  const [linkAssetId, setLinkAssetId] = useState("");
  const [linkError, setLinkError] = useState("");
  const [linkSubmitting, setLinkSubmitting] = useState(false);

  const canEdit = canMutate(user?.role);

  const loadIncident = useCallback(async () => {
    const res = await apiRequest(`/incidents/${id}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        typeof data.error === "string"
          ? data.error
          : `Failed to load (${res.status})`
      );
    }
    setIncident(data.incident);
    setStatusEdit(data.incident?.status ?? "");
  }, [apiRequest, id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        await loadIncident();
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
  }, [loadIncident]);

  useEffect(() => {
    if (!canEdit) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiRequest("/assets");
        const data = await res.json().catch(() => ({}));
        if (res.ok && !cancelled) setAssetsCatalog(data.assets ?? []);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiRequest, canEdit]);

  const linkedAssetIds = useMemo(() => {
    const rows = incident?.incident_assets ?? [];
    return new Set(rows.map((r) => r.asset_id));
  }, [incident]);

  const linkableAssets = useMemo(
    () => assetsCatalog.filter((a) => !linkedAssetIds.has(a.id)),
    [assetsCatalog, linkedAssetIds]
  );

  async function handleStatusSave(e) {
    e.preventDefault();
    setUpdateError("");
    setUpdating(true);
    try {
      const res = await apiRequest(`/incidents/${id}`, {
        method: "PATCH",
        body: { status: statusEdit },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : `Update failed (${res.status})`
        );
      }
      setIncident(data.incident);
    } catch (err) {
      if (err.message !== "Unauthorized") {
        setUpdateError(err.message || "Update failed");
      }
    } finally {
      setUpdating(false);
    }
  }

  async function handleAddAlert(e) {
    e.preventDefault();
    setAlertError("");
    let raw_payload;
    try {
      raw_payload = JSON.parse(alertPayload || "{}");
      if (
        raw_payload === null ||
        typeof raw_payload !== "object" ||
        Array.isArray(raw_payload)
      ) {
        throw new Error("Payload must be a JSON object");
      }
    } catch (parseErr) {
      setAlertError(parseErr.message || "Invalid JSON");
      return;
    }
    setAlertSubmitting(true);
    try {
      const res = await apiRequest(`/incidents/${id}/alerts`, {
        method: "POST",
        body: {
          source: alertSource.trim(),
          type: alertType.trim(),
          raw_payload,
          is_false_positive: alertFp,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : `Failed (${res.status})`
        );
      }
      setAlertSource("");
      setAlertType("");
      setAlertPayload("{}");
      setAlertFp(false);
      await loadIncident();
    } catch (err) {
      if (err.message !== "Unauthorized") {
        setAlertError(err.message || "Request failed");
      }
    } finally {
      setAlertSubmitting(false);
    }
  }

  async function handleLinkAsset(e) {
    e.preventDefault();
    setLinkError("");
    if (!linkAssetId) return;
    setLinkSubmitting(true);
    try {
      const res = await apiRequest(`/incidents/${id}/assets`, {
        method: "POST",
        body: { asset_id: linkAssetId },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : `Link failed (${res.status})`
        );
      }
      setLinkAssetId("");
      await loadIncident();
    } catch (err) {
      if (err.message !== "Unauthorized") {
        setLinkError(err.message || "Request failed");
      }
    } finally {
      setLinkSubmitting(false);
    }
  }

  if (loading) return <Loading label="Loading incident…" />;
  if (error || !incident) {
    return (
      <div>
        <Link
          to="/incidents"
          className="text-sm text-indigo-400 hover:text-indigo-300"
        >
          ← Incidents
        </Link>
        <p className="mt-6 rounded-lg bg-red-950/40 px-4 py-3 text-sm text-red-300 ring-1 ring-red-900">
          {error || "Incident not found"}
        </p>
      </div>
    );
  }

  const alerts = incident.alerts ?? [];
  const linked = incident.incident_assets ?? [];
  const mitreTechniques = useMemo(() => suggestTechniques(alerts), [alerts]);
  const [showSignature, setShowSignature] = useState(false);
  const signature = useMemo(
    () => (showSignature ? generateSignature(incident) : null),
    [showSignature, incident]
  );

  function copySignature() {
    if (signature) navigator.clipboard.writeText(signature);
  }

  return (
    <div>
      <Link
        to="/incidents"
        className="text-sm text-indigo-400 hover:text-indigo-300"
      >
        ← Incidents
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">{incident.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <SeverityBadge value={incident.severity} />
            <StatusBadge value={incident.status} />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Description
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-slate-300">
              {incident.description}
            </p>
            <dl className="mt-4 grid gap-2 text-sm text-slate-400 sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Reporter</dt>
                <dd className="text-slate-300">
                  {incident.reporter?.name ?? incident.reported_by}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Assignee</dt>
                <dd className="text-slate-300">
                  {incident.assignee?.name ??
                    (incident.assigned_to
                      ? incident.assigned_to
                      : "Unassigned")}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Created</dt>
                <dd>
                  {incident.created_at
                    ? new Date(incident.created_at).toLocaleString()
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Updated</dt>
                <dd>
                  {incident.updated_at
                    ? new Date(incident.updated_at).toLocaleString()
                    : "—"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Alerts
            </h2>
            {alerts.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No alerts yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {alerts.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-white">{a.type}</span>
                      <span className="text-xs text-slate-500">
                        {a.source}
                      </span>
                      {a.is_false_positive && (
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-400">
                          false positive
                        </span>
                      )}
                    </div>
                    <pre className="mt-2 max-h-32 overflow-auto rounded bg-slate-950 p-2 text-xs text-slate-400">
                      {JSON.stringify(a.raw_payload, null, 2)}
                    </pre>
                    <p className="mt-1 text-xs text-slate-600">
                      {a.created_at
                        ? new Date(a.created_at).toLocaleString()
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* MITRE ATT&CK Techniques */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                MITRE ATT&CK Techniques
              </h2>
              <Link
                to="/mitre-map"
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                View full map →
              </Link>
            </div>
            {mitreTechniques.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                No techniques mapped — add alerts to auto-detect techniques.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {TACTICS.filter((tactic) =>
                  mitreTechniques.some((t) => t.tactic === tactic)
                ).map((tactic) => (
                  <div key={tactic}>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {tactic}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {mitreTechniques
                        .filter((t) => t.tactic === tactic)
                        .map((t) => (
                          <span
                            key={t.id}
                            className="rounded-lg border border-indigo-800 bg-indigo-950/60 px-2.5 py-1.5"
                          >
                            <div className="font-mono text-xs font-semibold text-indigo-400">
                              {t.id}
                            </div>
                            <div className="text-xs text-slate-300">{t.name}</div>
                          </span>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Signature generator */}
            <div className="mt-4 border-t border-slate-800 pt-4">
              <button
                onClick={() => setShowSignature((v) => !v)}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-600"
              >
                {showSignature ? "Hide Signature" : "Generate Attack Signature"}
              </button>
              {showSignature && signature && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Attack Signature
                    </p>
                    <button
                      onClick={copySignature}
                      className="text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      Copy to clipboard
                    </button>
                  </div>
                  <pre className="max-h-96 overflow-auto rounded-lg border border-slate-700 bg-slate-950 p-4 text-xs leading-relaxed text-slate-300">
                    {signature}
                  </pre>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Linked assets
            </h2>
            {linked.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                No assets linked to this incident.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-800">
                {linked.map((row) => (
                  <li
                    key={`${row.incident_id}-${row.asset_id}`}
                    className="py-3 first:pt-0"
                  >
                    <p className="font-medium text-white">
                      {row.asset?.hostname}
                    </p>
                    <p className="text-sm text-slate-400">
                      {row.asset?.ip_address} · {row.asset?.type} ·{" "}
                      {row.asset?.owner}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {canEdit && (
          <div className="space-y-6">
            <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <h2 className="text-sm font-semibold text-white">Update status</h2>
              <form onSubmit={handleStatusSave} className="mt-3 space-y-3">
                <select
                  value={statusEdit}
                  onChange={(e) => setStatusEdit(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {updateError && (
                  <p className="text-sm text-red-400">{updateError}</p>
                )}
                <button
                  type="submit"
                  disabled={updating}
                  className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {updating ? "Saving…" : "Save status"}
                </button>
              </form>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <h2 className="text-sm font-semibold text-white">Add alert</h2>
              <form onSubmit={handleAddAlert} className="mt-3 space-y-3">
                <input
                  placeholder="Source"
                  value={alertSource}
                  onChange={(e) => setAlertSource(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
                <input
                  placeholder="Type"
                  value={alertType}
                  onChange={(e) => setAlertType(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
                <textarea
                  placeholder='JSON object e.g. {"key":"value"}'
                  value={alertPayload}
                  onChange={(e) => setAlertPayload(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-white"
                />
                <label className="flex items-center gap-2 text-sm text-slate-400">
                  <input
                    type="checkbox"
                    checked={alertFp}
                    onChange={(e) => setAlertFp(e.target.checked)}
                  />
                  False positive
                </label>
                {alertError && (
                  <p className="text-sm text-red-400">{alertError}</p>
                )}
                <button
                  type="submit"
                  disabled={alertSubmitting}
                  className="w-full rounded-lg bg-slate-700 py-2 text-sm font-semibold text-white hover:bg-slate-600 disabled:opacity-50"
                >
                  {alertSubmitting ? "Adding…" : "Add alert"}
                </button>
              </form>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <h2 className="text-sm font-semibold text-white">Link asset</h2>
              <form onSubmit={handleLinkAsset} className="mt-3 space-y-3">
                <select
                  value={linkAssetId}
                  onChange={(e) => setLinkAssetId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                >
                  <option value="">Select asset…</option>
                  {linkableAssets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.hostname} ({a.ip_address})
                    </option>
                  ))}
                </select>
                {linkableAssets.length === 0 && (
                  <p className="text-xs text-slate-500">
                    All known assets are already linked, or the catalog is
                    empty.
                  </p>
                )}
                {linkError && (
                  <p className="text-sm text-red-400">{linkError}</p>
                )}
                <button
                  type="submit"
                  disabled={linkSubmitting || !linkAssetId}
                  className="w-full rounded-lg border border-slate-600 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                >
                  {linkSubmitting ? "Linking…" : "Link asset"}
                </button>
              </form>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
