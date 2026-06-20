import type { Grade, SectionScore } from "@/lib/scoring";

const GRADE_DOT: Record<Grade, string> = {
  A: "bg-green-500",
  B: "bg-lime-500",
  C: "bg-amber-500",
  D: "bg-red-500",
};

const GRADE_TEXT: Record<Grade, string> = {
  A: "text-green-600",
  B: "text-lime-600",
  C: "text-amber-600",
  D: "text-red-600",
};

export default function SectionBreakdown({
  sections,
}: {
  sections: SectionScore[];
}) {
  return (
    <div>
      <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-etsy-dark/50">
        Section breakdown
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {sections.map((s) => (
          <div
            key={s.name}
            className="flex flex-col items-center gap-1 rounded-xl border border-etsy-sand bg-white px-2 py-3 text-center"
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold text-etsy-dark/70">
              <span className={`h-2 w-2 rounded-full ${GRADE_DOT[s.grade]}`} />
              {s.name}
            </span>
            <span className={`text-lg font-extrabold ${GRADE_TEXT[s.grade]}`}>
              {s.score}
            </span>
            <span className={`text-[11px] font-bold ${GRADE_TEXT[s.grade]}`}>
              Grade {s.grade}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
