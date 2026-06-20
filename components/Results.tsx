import type { ScoringResult } from "@/lib/scoring";
import ScoreCircle from "./ScoreCircle";
import IssueCard from "./IssueCard";

function verdictTone(result: ScoringResult): {
  banner: string;
  heading: string;
} {
  if (result.visibilityScore < 60) {
    return {
      banner: "border-red-300 bg-red-50",
      heading: "text-red-700",
    };
  }
  if (result.conversionScore < 60) {
    return {
      banner: "border-amber-300 bg-amber-50",
      heading: "text-amber-700",
    };
  }
  return {
    banner: "border-green-300 bg-green-50",
    heading: "text-green-700",
  };
}

export default function Results({ result }: { result: ScoringResult }) {
  const tone = verdictTone(result);
  const visibilityIssues = result.issues.filter(
    (i) => i.category === "Visibility"
  );
  const conversionIssues = result.issues.filter(
    (i) => i.category === "Conversion"
  );

  return (
    <div className="space-y-8">
      {/* Score circles */}
      <div className="flex flex-wrap items-center justify-center gap-10 rounded-2xl border border-etsy-sand bg-white p-6 shadow-sm sm:gap-16">
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

      {/* Top-line verdict */}
      <div className={`rounded-2xl border-2 p-5 ${tone.banner}`}>
        <h2
          className={`mb-1 text-sm font-bold uppercase tracking-wide ${tone.heading}`}
        >
          Top-line verdict
        </h2>
        <p className="text-lg font-semibold leading-snug text-etsy-dark">
          {result.verdict}
        </p>
      </div>

      {/* Issues grouped by category */}
      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-etsy-dark">
            🔍 Visibility issues
            <span className="rounded-full bg-etsy-sand px-2 py-0.5 text-xs font-bold text-etsy-dark/70">
              {visibilityIssues.length}
            </span>
          </h3>
          <div className="space-y-3">
            {visibilityIssues.length === 0 ? (
              <p className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
                No visibility issues found. Nice work.
              </p>
            ) : (
              visibilityIssues.map((issue, i) => (
                <IssueCard key={`v-${i}`} issue={issue} />
              ))
            )}
          </div>
        </section>

        <section>
          <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-etsy-dark">
            🛒 Conversion issues
            <span className="rounded-full bg-etsy-sand px-2 py-0.5 text-xs font-bold text-etsy-dark/70">
              {conversionIssues.length}
            </span>
          </h3>
          <div className="space-y-3">
            {conversionIssues.length === 0 ? (
              <p className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
                No conversion issues found. Nice work.
              </p>
            ) : (
              conversionIssues.map((issue, i) => (
                <IssueCard key={`c-${i}`} issue={issue} />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
