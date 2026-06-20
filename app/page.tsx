"use client";

import { useState } from "react";
import { scoreListing, type ListingInput, type ScoringResult } from "@/lib/scoring";
import Results from "@/components/Results";
import OptimizedRewrite from "@/components/OptimizedRewrite";

const EMPTY_TAGS = Array.from({ length: 13 }, () => "");

const inputClass =
  "w-full rounded-lg border border-etsy-sand bg-white px-3 py-2 text-sm text-etsy-dark shadow-sm outline-none transition focus:border-etsy-orange focus:ring-2 focus:ring-etsy-orange/30";

const labelClass = "block text-sm font-semibold text-etsy-dark";

export default function Home() {
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>(EMPTY_TAGS);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [targetKeyword, setTargetKeyword] = useState("");
  const [photoCount, setPhotoCount] = useState(0);
  const [hasLifestylePhoto, setHasLifestylePhoto] = useState(false);

  const [result, setResult] = useState<ScoringResult | null>(null);
  // Snapshot of exactly what was scored, so the AI rewrite matches the results
  // even if the user edits the form afterwards.
  const [scoredInput, setScoredInput] = useState<ListingInput | null>(null);

  // Auto-fill from Etsy link.
  const [listingUrl, setListingUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchOk, setFetchOk] = useState(false);

  // Spread an array of tags across the 13 boxes (padding/truncating to 13).
  const fillTags = (incoming: string[]) => {
    const next = [...EMPTY_TAGS];
    incoming.slice(0, 13).forEach((t, i) => {
      next[i] = t;
    });
    setTags(next);
  };

  const handleFetch = async () => {
    if (!listingUrl.trim()) return;
    setFetching(true);
    setFetchError(null);
    setFetchOk(false);
    try {
      const res = await fetch("/api/fetch-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: listingUrl }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFetchError(json?.error ?? "Couldn't fetch this listing, try again.");
        return;
      }
      // Auto-fill the form. Leave the lifestyle-photo Yes/No to the user.
      setTitle(json.title ?? "");
      setDescription(json.description ?? "");
      setCategory(json.category ?? "");
      setPhotoCount(
        Math.max(0, Math.min(10, Number(json.photoCount) || 0))
      );
      fillTags(Array.isArray(json.tags) ? json.tags : []);
      setFetchOk(true);
    } catch {
      setFetchError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setFetching(false);
    }
  };

  // Spread a comma/newline/semicolon-separated list across the tag boxes,
  // starting at `startIndex`. Returns true if it actually distributed a list.
  const distributeTags = (raw: string, startIndex: number): boolean => {
    const pieces = raw
      .split(/[,\n;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (pieces.length <= 1) return false; // single value — treat as normal typing
    setTags((prev) => {
      const next = [...prev];
      let idx = startIndex;
      for (const piece of pieces) {
        if (idx > 12) break; // only 13 slots
        next[idx] = piece;
        idx += 1;
      }
      return next;
    });
    return true;
  };

  const setTag = (index: number, value: string) => {
    // If someone types/pastes a comma-separated list into one box, split it out.
    if (/[,\n;]/.test(value) && distributeTags(value, index)) return;
    setTags((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleTagPaste = (
    index: number,
    e: React.ClipboardEvent<HTMLInputElement>
  ) => {
    const text = e.clipboardData.getData("text");
    if (/[,\n;]/.test(text) && distributeTags(text, index)) {
      e.preventDefault();
    }
  };

  const clearTags = () => setTags(EMPTY_TAGS);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input: ListingInput = {
      title,
      tags,
      description,
      category,
      targetKeyword: targetKeyword || undefined,
      photoCount,
      hasLifestylePhoto,
    };
    setResult(scoreListing(input));
    setScoredInput(input);
    // Scroll results into view on mobile.
    requestAnimationFrame(() => {
      document
        .getElementById("results")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      {/* Header */}
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-etsy-dark sm:text-4xl">
          Etsy Listing{" "}
          <span className="text-etsy-orange">Health Check</span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-etsy-dark/70 sm:text-base">
          Paste a listing and get two scores instantly:{" "}
          <strong>Visibility</strong> (will buyers find it?) and{" "}
          <strong>Conversion</strong> (will visitors actually buy?). Most tools
          only check SEO — we tell you which problem to fix first.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {/* ---------------- Form ---------------- */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-etsy-sand bg-white p-6 shadow-sm"
        >
          {/* Auto-fill from Etsy link */}
          <div className="rounded-xl border border-etsy-orange/30 bg-etsy-cream p-4">
            <label htmlFor="listingUrl" className={labelClass}>
              🔗 Auto-fill from Etsy link
            </label>
            <p className="mt-1 text-xs text-etsy-dark/60">
              Paste a listing URL to pull in its details — or just fill the form
              manually below.
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                id="listingUrl"
                type="url"
                value={listingUrl}
                onChange={(e) => {
                  setListingUrl(e.target.value);
                  setFetchOk(false);
                  setFetchError(null);
                }}
                placeholder="https://www.etsy.com/listing/123456789/…"
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={handleFetch}
                disabled={fetching || !listingUrl.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-etsy-dark px-4 py-2 text-sm font-bold text-white transition hover:bg-etsy-dark/90 focus:outline-none focus:ring-2 focus:ring-etsy-dark/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {fetching && (
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                    aria-hidden
                  />
                )}
                {fetching ? "Fetching…" : "Fetch listing"}
              </button>
            </div>
            {fetchError && (
              <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {fetchError}
              </p>
            )}
            {fetchOk && !fetchError && (
              <p className="mt-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
                ✓ Listing loaded. Review the fields below, set the lifestyle-photo
                answer, then check your listing.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="title" className={labelClass}>
              Title
            </label>
            <textarea
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              rows={2}
              placeholder="Personalized Ceramic Coffee Mug, Custom Name Gift for Mom…"
              className={`${inputClass} mt-1 resize-y`}
            />
            <p className="mt-1 text-xs text-etsy-dark/50">
              {title.length} / 140 characters
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className={labelClass}>Tags (up to 13)</span>
              {tags.some((t) => t.trim()) && (
                <button
                  type="button"
                  onClick={clearTags}
                  className="text-xs font-semibold text-etsy-orange hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-etsy-dark/50">
              Tip: paste your whole comma-separated list into any box and we&apos;ll
              split it across the 13 fields.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-2">
              {tags.map((tag, i) => (
                <input
                  key={i}
                  type="text"
                  value={tag}
                  onChange={(e) => setTag(i, e.target.value)}
                  onPaste={(e) => handleTagPaste(i, e)}
                  placeholder={`Tag ${i + 1}`}
                  maxLength={40}
                  className={inputClass}
                />
              ))}
            </div>
            <p className="mt-1 text-xs text-etsy-dark/50">
              {tags.filter((t) => t.trim()).length} / 13 used · multi-word
              phrases work best
            </p>
          </div>

          <div>
            <label htmlFor="description" className={labelClass}>
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              placeholder="Start with a hook: who it's perfect for and why they'll love it…"
              className={`${inputClass} mt-1 resize-y`}
            />
            <p className="mt-1 text-xs text-etsy-dark/50">
              {description.length} characters
            </p>
          </div>

          <div>
            <label htmlFor="category" className={labelClass}>
              Category
            </label>
            <input
              id="category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Home & Living > Kitchen > Drinkware > Mugs"
              className={`${inputClass} mt-1`}
            />
          </div>

          <div>
            <label htmlFor="keyword" className={labelClass}>
              Target keyword{" "}
              <span className="font-normal text-etsy-dark/50">(optional)</span>
            </label>
            <input
              id="keyword"
              type="text"
              value={targetKeyword}
              onChange={(e) => setTargetKeyword(e.target.value)}
              placeholder="personalized coffee mug"
              className={`${inputClass} mt-1`}
            />
          </div>

          <div>
            <label htmlFor="photos" className={labelClass}>
              Number of photos on the listing
            </label>
            <input
              id="photos"
              type="number"
              min={0}
              max={10}
              value={photoCount}
              onChange={(e) =>
                setPhotoCount(
                  Math.max(0, Math.min(10, Number(e.target.value) || 0))
                )
              }
              className={`${inputClass} mt-1`}
            />
          </div>

          <div className="rounded-lg border border-etsy-sand bg-etsy-cream p-3">
            <span className={labelClass}>
              Do you have at least one real/lifestyle photo (not just a plain
              mockup)?
            </span>
            <div className="mt-2 flex gap-3">
              {[
                { label: "Yes", value: true },
                { label: "No", value: false },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.label}
                  onClick={() => setHasLifestylePhoto(opt.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    hasLifestylePhoto === opt.value
                      ? "border-etsy-orange bg-etsy-orange text-white"
                      : "border-etsy-sand bg-white text-etsy-dark hover:border-etsy-orange/50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-etsy-orange px-4 py-3 text-base font-bold text-white shadow-sm transition hover:bg-etsy-orange/90 focus:outline-none focus:ring-2 focus:ring-etsy-orange/40 active:scale-[0.99]"
          >
            Check my listing
          </button>
        </form>

        {/* ---------------- Results ---------------- */}
        <div id="results">
          {result ? (
            <>
              <Results result={result} />
              {scoredInput && <OptimizedRewrite input={scoredInput} />}
            </>
          ) : (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-etsy-sand bg-white/50 p-8 text-center">
              <div className="mb-3 text-4xl">📋</div>
              <p className="max-w-xs text-sm text-etsy-dark/60">
                Fill in your listing details and hit{" "}
                <strong>Check my listing</strong> to see your Visibility and
                Conversion scores.
              </p>
            </div>
          )}
        </div>
      </div>

      <footer className="mt-12 text-center text-xs text-etsy-dark/40">
        Not affiliated with Etsy. Scores are heuristic guidance, not guarantees.
      </footer>
    </main>
  );
}
