import type { Issue, IssueSeverity } from "@/lib/scoring";

const SEVERITY_STYLES: Record<
  IssueSeverity,
  { badge: string; border: string; dot: string }
> = {
  Critical: {
    badge: "bg-red-100 text-red-700",
    border: "border-red-200",
    dot: "bg-red-500",
  },
  Warning: {
    badge: "bg-amber-100 text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  Info: {
    badge: "bg-sky-100 text-sky-700",
    border: "border-sky-200",
    dot: "bg-sky-500",
  },
};

export default function IssueCard({ issue }: { issue: Issue }) {
  const s = SEVERITY_STYLES[issue.severity];
  return (
    <div className={`rounded-xl border ${s.border} bg-white p-4 shadow-sm`}>
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${s.badge}`}
        >
          {issue.severity}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-etsy-dark/50">
          {issue.field}
        </span>
      </div>
      <p className="text-sm font-medium text-etsy-dark">{issue.problem}</p>
      <p className="mt-2 flex gap-2 text-sm text-etsy-dark/80">
        <span className="font-bold text-etsy-orange">Fix:</span>
        <span>{issue.fix}</span>
      </p>
    </div>
  );
}
