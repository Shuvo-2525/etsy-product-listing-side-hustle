import type { Issue, IssueSeverity } from "@/lib/scoring";

const SEVERITY_STYLES: Record<
  IssueSeverity,
  { badge: string; bar: string }
> = {
  Critical: {
    badge: "bg-red-100 text-red-700",
    bar: "bg-red-500",
  },
  Warning: {
    badge: "bg-amber-100 text-amber-700",
    bar: "bg-amber-500",
  },
  Info: {
    badge: "bg-sky-100 text-sky-700",
    bar: "bg-sky-500",
  },
};

export default function IssueCard({
  issue,
  index = 0,
}: {
  issue: Issue;
  index?: number;
}) {
  const s = SEVERITY_STYLES[issue.severity];
  return (
    <div
      className="animate-fade-up group relative overflow-hidden rounded-2xl border border-black/[0.06] bg-white p-4 pl-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift"
      style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
    >
      <span
        className={`absolute inset-y-0 left-0 w-1 ${s.bar}`}
        aria-hidden
      />
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${s.badge}`}
        >
          {issue.severity}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-etsy-faint">
          {issue.field}
        </span>
      </div>
      <p className="text-sm font-medium leading-snug text-etsy-dark">
        {issue.problem}
      </p>
      <p className="mt-2 flex gap-2 text-sm leading-snug text-etsy-muted">
        <span className="font-bold text-etsy-orange">Fix:</span>
        <span>{issue.fix}</span>
      </p>
    </div>
  );
}
