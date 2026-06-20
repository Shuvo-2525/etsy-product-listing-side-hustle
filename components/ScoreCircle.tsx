import type { Grade } from "@/lib/scoring";

const GRADE_STYLES: Record<Grade, { ring: string; text: string; label: string }> = {
  A: { ring: "stroke-green-500", text: "text-green-600", label: "Great" },
  B: { ring: "stroke-lime-500", text: "text-lime-600", label: "Good" },
  C: { ring: "stroke-amber-500", text: "text-amber-600", label: "Needs work" },
  D: { ring: "stroke-red-500", text: "text-red-600", label: "Critical" },
};

interface ScoreCircleProps {
  label: string;
  score: number;
  grade: Grade;
}

export default function ScoreCircle({ label, score, grade }: ScoreCircleProps) {
  const style = GRADE_STYLES[grade];
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-sm font-semibold uppercase tracking-wide text-etsy-dark/70">
        {label}
      </span>
      <div className="relative h-32 w-32">
        <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            strokeWidth="10"
            className="stroke-black/5"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`${style.ring} transition-[stroke-dashoffset] duration-700 ease-out`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-extrabold ${style.text}`}>{score}</span>
          <span className={`text-sm font-bold ${style.text}`}>Grade {grade}</span>
        </div>
      </div>
      <span className={`text-sm font-medium ${style.text}`}>{style.label}</span>
    </div>
  );
}
