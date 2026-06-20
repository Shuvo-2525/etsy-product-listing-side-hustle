import type { Issue, IssueSeverity, ScoringResult } from "@/lib/scoring";
import ScoreCircle from "./ScoreCircle";
import IssueCard from "./IssueCard";
import SectionBreakdown from "./SectionBreakdown";
import TagHealth from "./TagHealth";

// Show the most urgent fixes first within each section.
const SEVERITY_RANK: Record<IssueSeverity, number> = {
  Critical: 0,
  Warning: 1,
  Info: 2,
};

const bySeverity = (a: Issue, b: Issue) =>
  SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];

function verdictTone(result: ScoringResult): {
  banner: string;
  heading: string;
  icon: string;
  kicker: string;
} {
  if (result.visibilityScore < 60) {
    return {
      banner: "border-red-200 bg-gradient-to-br from-red-50 to-white",
      heading: "text-red-600",
      icon: "🔍",
      kicker: "Priority: Visibility",
    };
  }
  if (result.conversionScore < 60) {
    return {
      banner: "border-amber-200 bg-gradient-to-br from-amber-50 to-white",
      heading: "text-amber-600",
      icon: "🛒",
      kicker: "Priority: Conversion",
    };
  }
  return {
    banner: "border-green-200 bg-gradient-to-br from-green-50 to-white",
    heading: "text-green-600",
    icon: "✓",
    kicker: "Looking good",
  };
}

export default function Results({ result }: { result: ScoringResult }) {
  const tone = verdictTone(result);
  const visibilityIssues = result.issues
    .filter((i) => i.category === "Visibility")
    .sort(bySeverity);
  const conversionIssues = result.issues
    .filter((i) => i.category === "Conversion")
    .sort(bySeverity);

  return (
    <div className="space-y-5">
      {/* Headline scores + secondary section breakdown */}
      <div className="animate-scale-in space-y-6 rounded-3xl border border-black/[0.06] bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-center gap-12 sm:gap-20">
          <ScoreCircle
            label="Visibility"
            score={result.visibilityScore}
            grade={result.visibilityGrade}
          />
          <ScoreCircle
            label="Conversion"
            score={result.conversionScore}
            grade={result.conversionGrade}
          />
        </div>

        <div className="border-t border-black/[0.06] pt-6">
          <SectionBreakdown sections={result.sections} />
        </div>
      </div>

      {/* Top-line verdict */}
      <div
        className={`animate-fade-up flex items-start gap-4 rounded-3xl border p-6 shadow-soft ${tone.banner}`}
        style={{ animationDelay: "120ms" }}
      >
        <div className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-white/80 text-xl shadow-sm">
          {tone.icon}
        </div>
        <div>
          <p
            className={`text-xs font-bold uppercase tracking-[0.08em] ${tone.heading}`}
          >
            {tone.kicker}
          </p>
          <p className="mt-1 text-[17px] font-semibold leading-snug text-etsy-dark">
            {result.verdict}
          </p>
        </div>
      </div>

      {/* Tag completeness vs. quality */}
      <div className="animate-fade-up" style={{ animationDelay: "180ms" }}>
        <TagHealth stats={result.tagStats} />
      </div>

      {/* Issues — masonry column-fill so the two groups pack tightly and
          don't leave big uneven blank areas. */}
      <div
        className="animate-fade-up space-y-5"
        style={{ animationDelay: "240ms" }}
      >
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-etsy-dark">
            <span className="text-lg">🔍</span> Visibility issues
            <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-xs font-bold text-etsy-muted">
              {visibilityIssues.length}
            </span>
          </h3>
          {visibilityIssues.length === 0 ? (
            <p className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
              No visibility issues found. Nice work.
            </p>
          ) : (
            <div className="columns-1 gap-3 sm:columns-2">
              {visibilityIssues.map((issue, i) => (
                <div key={`v-${i}`} className="mb-3 break-inside-avoid">
                  <IssueCard issue={issue} index={i} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-etsy-dark">
            <span className="text-lg">🛒</span> Conversion issues
            <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-xs font-bold text-etsy-muted">
              {conversionIssues.length}
            </span>
          </h3>
          {conversionIssues.length === 0 ? (
            <p className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
              No conversion issues found. Nice work.
            </p>
          ) : (
            <div className="columns-1 gap-3 sm:columns-2">
              {conversionIssues.map((issue, i) => (
                <div key={`c-${i}`} className="mb-3 break-inside-avoid">
                  <IssueCard issue={issue} index={i} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
