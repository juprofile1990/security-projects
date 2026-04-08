const severityStyles = {
  critical: "bg-red-950 text-red-200 ring-red-800",
  high: "bg-orange-950 text-orange-200 ring-orange-800",
  medium: "bg-amber-950 text-amber-200 ring-amber-800",
  low: "bg-emerald-950 text-emerald-200 ring-emerald-800",
};

const statusStyles = {
  open: "bg-amber-950 text-amber-200 ring-amber-800",
  investigating: "bg-sky-950 text-sky-200 ring-sky-800",
  contained: "bg-violet-950 text-violet-200 ring-violet-800",
  resolved: "bg-emerald-950 text-emerald-200 ring-emerald-800",
  closed: "bg-slate-800 text-slate-300 ring-slate-600",
};

const criticalityStyles = {
  critical: "bg-red-950 text-red-200 ring-red-800",
  high: "bg-orange-950 text-orange-200 ring-orange-800",
  medium: "bg-amber-950 text-amber-200 ring-amber-800",
  low: "bg-emerald-950 text-emerald-200 ring-emerald-800",
};

export function SeverityBadge({ value }) {
  const cls = severityStyles[value] || "bg-slate-800 text-slate-300 ring-slate-600";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}
    >
      {value}
    </span>
  );
}

export function StatusBadge({ value }) {
  const cls = statusStyles[value] || "bg-slate-800 text-slate-300 ring-slate-600";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}
    >
      {value}
    </span>
  );
}

export function CriticalityBadge({ value }) {
  const cls =
    criticalityStyles[value] || "bg-slate-800 text-slate-300 ring-slate-600";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}
    >
      {value}
    </span>
  );
}
