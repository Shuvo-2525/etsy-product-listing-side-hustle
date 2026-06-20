"use client";

import { useEffect, useState } from "react";
import type { Grade } from "@/lib/scoring";

const GRADE_STYLES: Record<
  Grade,
  { from: string; to: string; text: string; label: string }
> = {
  A: { from: "#34C759", to: "#30B0C7", text: "text-[#1a8a3c]", label: "Great" },
  B: { from: "#A2D729", to: "#34C759", text: "text-[#5a8a0e]", label: "Good" },
  C: { from: "#FFCC00", to: "#FF9500", text: "text-[#b8730a]", label: "Needs work" },
  D: { from: "#FF6A3D", to: "#FF3B30", text: "text-[#d4341f]", label: "Critical" },
};

/** Animate a number from 0 → target with an ease-out curve. */
function useCountUp(target: number, duration = 1000): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

interface ScoreCircleProps {
  label: string;
  score: number;
  grade: Grade;
}

export default function ScoreCircle({ label, score, grade }: ScoreCircleProps) {
  const style = GRADE_STYLES[grade];
  const radius = 54;
  const circumference = 2 * Math.PI * radius;

  const display = useCountUp(score);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    // Trigger the ring sweep after mount so it animates from empty → score.
    const id = requestAnimationFrame(() => setProgress(score));
    return () => cancelAnimationFrame(id);
  }, [score]);

  const offset = circumference - (progress / 100) * circumference;
  const gradId = `grad-${label.replace(/\s+/g, "")}-${grade}`;

  return (
    <div className="flex flex-col items-center gap-2.5">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-etsy-faint">
        {label}
      </span>
      <div className="relative h-36 w-36">
        <svg className="h-36 w-36 -rotate-90" viewBox="0 0 128 128">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={style.from} />
              <stop offset="100%" stopColor={style.to} />
            </linearGradient>
          </defs>
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            strokeWidth="11"
            className="stroke-black/[0.06]"
          />
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            strokeWidth="11"
            strokeLinecap="round"
            stroke={`url(#${gradId})`}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition:
                "stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1)",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold tracking-tight text-etsy-dark tabular-nums">
            {display}
          </span>
          <span className={`text-sm font-bold ${style.text}`}>Grade {grade}</span>
        </div>
      </div>
      <span className={`text-sm font-medium ${style.text}`}>{style.label}</span>
    </div>
  );
}
