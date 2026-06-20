import type { TagStats } from "@/lib/scoring";

export default function TagHealth({ stats }: { stats: TagStats }) {
  const completePct = Math.round((stats.slotsUsed / stats.totalSlots) * 100);
  const complete = stats.slotsUsed >= stats.totalSlots;
  const hasWeak = stats.weakCount > 0;

  return (
    <div className="rounded-2xl border border-etsy-sand bg-white p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-etsy-dark/60">
        🏷️ Tag health
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Completeness */}
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-etsy-dark/50">
              Completeness
            </span>
            <span
              className={`text-sm font-bold ${
                complete ? "text-green-600" : "text-amber-600"
              }`}
            >
              {stats.slotsUsed}/{stats.totalSlots} slots used
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-etsy-sand">
            <div
              className={`h-full rounded-full ${
                complete ? "bg-green-500" : "bg-amber-500"
              }`}
              style={{ width: `${completePct}%` }}
            />
          </div>
        </div>

        {/* Quality */}
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-etsy-dark/50">
              Quality
            </span>
            <span
              className={`text-sm font-bold ${
                hasWeak ? "text-amber-600" : "text-green-600"
              }`}
            >
              {hasWeak
                ? `${stats.weakCount} weak ${
                    stats.weakCount === 1 ? "tag" : "tags"
                  }`
                : "All strong"}
            </span>
          </div>
          {hasWeak && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {stats.weak.singleWord > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                  {stats.weak.singleWord} single-word
                </span>
              )}
              {stats.weak.tooLong > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                  {stats.weak.tooLong} over 20 chars
                </span>
              )}
              {stats.weak.duplicate > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                  {stats.weak.duplicate} duplicate
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Combined plain-English note */}
      <p
        className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
          hasWeak || !complete
            ? "border-amber-200 bg-amber-50 text-etsy-dark/80"
            : "border-green-200 bg-green-50 text-green-700"
        }`}
      >
        {stats.note}
      </p>
    </div>
  );
}
