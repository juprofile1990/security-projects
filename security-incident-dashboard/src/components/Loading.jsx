export function Loading({ label = "Loading…" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
      <div
        className="h-9 w-9 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-400"
        aria-hidden
      />
      <p className="text-sm">{label}</p>
    </div>
  );
}
