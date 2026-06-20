"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import type { ListingInput } from "@/lib/scoring";
import type { RewriteResult } from "@/lib/rewrite";

/** Imperative handle so a floating button can trigger the same rewrite action. */
export interface OptimizedRewriteHandle {
  generate: () => void;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked (e.g. insecure context); fail quietly.
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1 text-xs font-semibold transition-all duration-200 ${
        copied
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-black/[0.08] bg-white text-etsy-muted hover:border-etsy-orange hover:text-etsy-orange"
      }`}
    >
      {copied ? "✓ Copied" : label}
    </button>
  );
}

const OptimizedRewrite = forwardRef<OptimizedRewriteHandle, { input: ListingInput }>(
  function OptimizedRewrite({ input }, ref) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RewriteResult | null>(null);

  // The rewrite must stay grounded in a real product — never run it on a blank
  // form (which makes the model invent an unrelated item).
  const hasContent = (input.title ?? "").trim().length > 0;

  const generate = async () => {
    if (!hasContent) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Couldn't generate, try again.");
        setData(null);
      } else {
        setData(json as RewriteResult);
      }
    } catch {
      setError("Couldn't generate, try again.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({ generate }), [generate]);

  return (
    <div id="ai-rewrite" className="mt-5 scroll-mt-6">
      <div className="relative overflow-hidden rounded-3xl border border-etsy-orange/20 bg-gradient-to-br from-etsy-cream via-white to-white p-6 shadow-soft">
        {/* soft accent glow */}
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-etsy-orange/10 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold tracking-tight text-etsy-dark">
              ✨ AI Optimized Rewrite
            </h3>
            <p className="text-sm text-etsy-muted">
              Let AI rewrite your title, tags, and hook for visibility + conversion.
            </p>
          </div>
          <button
            type="button"
            onClick={generate}
            disabled={loading || !hasContent}
            title={!hasContent ? "Add a product title first" : undefined}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-etsy-orange to-etsy-orangeDark px-4 py-2.5 text-sm font-semibold text-white shadow-accent transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift focus:outline-none focus:ring-4 focus:ring-etsy-orange/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:shadow-none"
          >
            {loading && (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                aria-hidden
              />
            )}
            {!hasContent
              ? "Add your listing details first"
              : loading
              ? "Generating…"
              : data
              ? "Regenerate"
              : "Generate optimized version"}
          </button>
        </div>

        {error && (
          <div className="animate-fade-in relative mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {loading && !data && (
          <div className="relative mt-5 space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="shimmer h-20 rounded-2xl border border-black/[0.05] bg-black/[0.03]"
              />
            ))}
          </div>
        )}

        {data && !loading && (
          <div className="animate-fade-up relative mt-5 space-y-3">
            {/* Title */}
            <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-soft">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-etsy-faint">
                  Optimized title ({data.title.length}/140)
                </span>
                <CopyButton text={data.title} label="Copy" />
              </div>
              <p className="text-sm font-semibold text-etsy-dark">{data.title}</p>
            </div>

            {/* Tags */}
            <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-soft">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-etsy-faint">
                  {data.tags.length} tags
                </span>
                <CopyButton text={data.tags.join(", ")} label="Copy all" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-black/[0.05] bg-etsy-cream px-3 py-1 text-xs font-medium text-etsy-dark"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Description opening */}
            <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-soft">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-etsy-faint">
                  Description opening (hook)
                </span>
                <CopyButton text={data.description_opening} label="Copy" />
              </div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-etsy-dark">
                {data.description_opening}
              </p>
            </div>

            {/* Notes */}
            {data.notes && (
              <div className="rounded-2xl border border-etsy-orange/20 bg-etsy-orange/[0.06] p-4">
                <span className="text-[11px] font-bold uppercase tracking-wide text-etsy-orange">
                  What changed
                </span>
                <p className="mt-1 text-sm text-etsy-dark/80">{data.notes}</p>
                {data.primary_keyword && (
                  <p className="mt-2 text-xs text-etsy-muted">
                    Primary keyword:{" "}
                    <span className="font-semibold">{data.primary_keyword}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
  }
);

export default OptimizedRewrite;
