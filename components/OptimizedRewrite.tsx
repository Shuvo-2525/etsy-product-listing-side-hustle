"use client";

import { useState } from "react";
import type { ListingInput } from "@/lib/scoring";
import type { RewriteResult } from "@/lib/rewrite";

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
      className="inline-flex items-center gap-1 rounded-lg border border-etsy-sand bg-white px-3 py-1 text-xs font-semibold text-etsy-dark transition hover:border-etsy-orange hover:text-etsy-orange"
    >
      {copied ? "✓ Copied" : label}
    </button>
  );
}

export default function OptimizedRewrite({ input }: { input: ListingInput }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RewriteResult | null>(null);

  const generate = async () => {
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

  return (
    <div className="mt-8">
      <div className="rounded-2xl border-2 border-etsy-orange/30 bg-gradient-to-br from-etsy-cream to-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-etsy-dark">
              ✨ AI Optimized Rewrite
            </h3>
            <p className="text-sm text-etsy-dark/60">
              Let AI rewrite your title, tags, and hook for visibility + conversion.
            </p>
          </div>
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-etsy-orange px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-etsy-orange/90 focus:outline-none focus:ring-2 focus:ring-etsy-orange/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                aria-hidden
              />
            )}
            {loading
              ? "Generating…"
              : data
              ? "Regenerate"
              : "Generate optimized version"}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {data && !loading && (
          <div className="mt-5 space-y-4">
            {/* Title */}
            <div className="rounded-xl border border-etsy-sand bg-white p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-etsy-dark/50">
                  Optimized title ({data.title.length}/140)
                </span>
                <CopyButton text={data.title} label="Copy" />
              </div>
              <p className="text-sm font-semibold text-etsy-dark">{data.title}</p>
            </div>

            {/* Tags */}
            <div className="rounded-xl border border-etsy-sand bg-white p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-etsy-dark/50">
                  {data.tags.length} tags
                </span>
                <CopyButton text={data.tags.join(", ")} label="Copy all" />
              </div>
              <div className="flex flex-wrap gap-2">
                {data.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-etsy-sand px-3 py-1 text-xs font-medium text-etsy-dark"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Description opening */}
            <div className="rounded-xl border border-etsy-sand bg-white p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-etsy-dark/50">
                  Description opening (hook)
                </span>
                <CopyButton text={data.description_opening} label="Copy" />
              </div>
              <p className="whitespace-pre-line text-sm text-etsy-dark">
                {data.description_opening}
              </p>
            </div>

            {/* Notes */}
            {data.notes && (
              <div className="rounded-xl border border-etsy-orange/20 bg-etsy-orange/5 p-4">
                <span className="text-xs font-bold uppercase tracking-wide text-etsy-orange">
                  What changed
                </span>
                <p className="mt-1 text-sm text-etsy-dark/80">{data.notes}</p>
                {data.primary_keyword && (
                  <p className="mt-2 text-xs text-etsy-dark/60">
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
