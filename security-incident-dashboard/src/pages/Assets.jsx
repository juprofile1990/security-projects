import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { CriticalityBadge } from "../components/Badge";
import { Loading } from "../components/Loading";
import { canMutate } from "../lib/roles";

const CRITICALITIES = ["critical", "high", "medium", "low"];

export function Assets() {
  const { apiRequest, user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [hostname, setHostname] = useState("");
  const [ip, setIp] = useState("");
  const [type, setType] = useState("");
  const [owner, setOwner] = useState("");
  const [criticality, setCriticality] = useState("medium");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const showForm = canMutate(user?.role);

  const load = async () => {
    const res = await apiRequest("/assets");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        typeof data.error === "string"
          ? data.error
          : `Failed to load (${res.status})`
      );
    }
    setAssets(data.assets ?? []);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        await load();
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

  async function handleCreate(e) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const res = await apiRequest("/assets", {
        method: "POST",
        body: {
          hostname: hostname.trim(),
          ip_address: ip.trim(),
          type: type.trim(),
          owner: owner.trim(),
          criticality,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : `Create failed (${res.status})`
        );
      }
      setHostname("");
      setIp("");
      setType("");
      setOwner("");
      setCriticality("medium");
      await load();
    } catch (err) {
      if (err.message !== "Unauthorized") {
        setFormError(err.message || "Request failed");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Assets</h1>
      <p className="mt-1 text-sm text-slate-400">
        Infrastructure and endpoint inventory
      </p>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-5"
        >
          <h2 className="text-sm font-semibold text-white">New asset</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input
              placeholder="Hostname"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              required
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
            <input
              placeholder="IP address"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              required
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
            <input
              placeholder="Type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              required
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
            <input
              placeholder="Owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              required
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
            <select
              value={criticality}
              onChange={(e) => setCriticality(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              {CRITICALITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {formError && (
            <p className="mt-3 text-sm text-red-400">{formError}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create asset"}
          </button>
        </form>
      )}

      {loading && <Loading />}
      {error && !loading && (
        <p className="mt-6 rounded-lg bg-red-950/40 px-4 py-3 text-sm text-red-300 ring-1 ring-red-900">
          {error}
        </p>
      )}

      {!loading && !error && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Hostname</th>
                <th className="px-4 py-3 font-medium">IP</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Criticality</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {assets.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    No assets yet.
                  </td>
                </tr>
              ) : (
                assets.map((a) => (
                  <tr
                    key={a.id}
                    className="bg-slate-900/30 hover:bg-slate-900/60"
                  >
                    <td className="px-4 py-3 font-medium text-white">
                      {a.hostname}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400">
                      {a.ip_address}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{a.type}</td>
                    <td className="px-4 py-3 text-slate-400">{a.owner}</td>
                    <td className="px-4 py-3">
                      <CriticalityBadge value={a.criticality} />
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
