import type { Grade, SectionScore } from "@/lib/scoring";

const GRADE_DOT: Record<Grade, string> = {
  A: "bg-[#34C759]",
  B: "bg-[#A2D729]",
  C: "bg-[#FF9500]",
  D: "bg-[#FF3B30]",
};

const GRADE_TEXT: Record<Grade, string> = {
  A: "text-[#1a8a3c]",
  B: "text-[#5a8a0e]",
  C: "text-[#b8730a]",
  D: "text-[#d4341f]",
};

export default function SectionBreakdown({
  sections,
}: {
  sections: SectionScore[];
}) {
  return (
    <div>
      <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-etsy-faint">
        Section breakdown
      </p>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        {sections.map((s, i) => (
          <div
            key={s.name}
            className="animate-fade-up flex flex-col items-center gap-1 rounded-2xl border border-black/[0.06] bg-white px-2 py-3.5 text-center shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift"
            style={{ animationDelay: `${300 + i * 60}ms` }}
          >
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-etsy-muted">
              <span className={`h-1.5 w-1.5 rounded-full ${GRADE_DOT[s.grade]}`} />
              {s.name}
            </span>
            <span className={`text-xl font-bold tabular-nums ${GRADE_TEXT[s.grade]}`}>
              {s.score}
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-wide ${GRADE_TEXT[s.grade]}`}>
              Grade {s.grade}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
