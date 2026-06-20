"use client";

import { useRef, useState } from "react";
import { scoreListing, type ListingInput, type ScoringResult } from "@/lib/scoring";
import Results from "@/components/Results";
import OptimizedRewrite, {
  type OptimizedRewriteHandle,
} from "@/components/OptimizedRewrite";

const EMPTY_TAGS = Array.from({ length: 13 }, () => "");

const inputClass =
  "w-full rounded-xl border border-black/[0.08] bg-white/80 px-3.5 py-2.5 text-sm text-etsy-dark placeholder:text-etsy-faint shadow-sm outline-none transition-all duration-200 focus:border-etsy-orange/60 focus:bg-white focus:ring-4 focus:ring-etsy-orange/10";

const labelClass = "block text-[13px] font-semibold text-etsy-dark";

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

  // Floating "AI Rewrite" button → drives the OptimizedRewrite component.
  const rewriteRef = useRef<OptimizedRewriteHandle>(null);
  const rewriteHasContent = (scoredInput?.title ?? "").trim().length > 0;
  const handleRewriteFab = () => {
    rewriteRef.current?.generate();
    requestAnimationFrame(() => {
      document
        .getElementById("ai-rewrite")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

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
        Math.max(0, Math.min(20, Number(json.photoCount) || 0))
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

  const tagsUsed = tags.filter((t) => t.trim()).length;

  return (
    <main className="mx-auto w-full max-w-[1180px] px-6 py-12 sm:px-8">
      {/* Header */}
      <header className="mb-10 text-center sm:mb-16">
        <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white/70 px-3.5 py-1.5 text-xs font-medium text-etsy-muted shadow-sm backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-etsy-orange" />
          Two scores. One clear priority.
        </div>
        <h1
          className="animate-fade-up mt-5 text-4xl font-bold leading-[1.05] tracking-tightest text-etsy-dark sm:text-6xl"
          style={{ animationDelay: "60ms" }}
        >
          Etsy Listing{" "}
          <span className="bg-gradient-to-r from-etsy-orange to-[#FF9A3D] bg-clip-text text-transparent">
            Health Check
          </span>
        </h1>
        <p
          className="animate-fade-up mx-auto mt-5 max-w-2xl text-base leading-relaxed text-etsy-muted sm:text-lg"
          style={{ animationDelay: "120ms" }}
        >
          Instantly see <span className="font-semibold text-etsy-dark">Visibility</span>{" "}
          (will buyers find it?) and{" "}
          <span className="font-semibold text-etsy-dark">Conversion</span> (will they
          actually buy?). Most tools only check SEO — we tell you which problem to fix
          first.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {/* ---------------- Form ---------------- */}
        <form
          onSubmit={handleSubmit}
          className="animate-fade-up h-fit space-y-5 rounded-3xl border border-black/[0.06] bg-white p-6 shadow-soft"
          style={{ animationDelay: "160ms" }}
        >
          {/* Auto-fill from Etsy link */}
          <div className="rounded-2xl border border-etsy-orange/25 bg-gradient-to-br from-etsy-cream to-white p-4">
            <label htmlFor="listingUrl" className={labelClass}>
              🔗 Auto-fill from Etsy link
            </label>
            <p className="mt-1 text-xs text-etsy-muted">
              Paste a listing URL to pull in its details — or just fill the form
              manually below.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
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
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-etsy-dark px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift focus:outline-none focus:ring-4 focus:ring-etsy-dark/15 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
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
              <p className="animate-fade-in mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {fetchError}
              </p>
            )}
            {fetchOk && !fetchError && (
              <p className="animate-fade-in mt-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
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
              className={`${inputClass} mt-1.5 resize-y`}
            />
            <p className="mt-1.5 text-xs text-etsy-faint">
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
                  className="text-xs font-semibold text-etsy-orange transition hover:opacity-70"
                >
                  Clear all
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-etsy-faint">
              Tip: paste your whole comma-separated list into any box and we&apos;ll
              split it across the 13 fields.
            </p>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
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
            <div className="mt-2 flex items-center justify-between text-xs text-etsy-faint">
              <span>{tagsUsed} / 13 used · multi-word phrases work best</span>
            </div>
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
              className={`${inputClass} mt-1.5 resize-y`}
            />
            <p className="mt-1.5 text-xs text-etsy-faint">
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
              className={`${inputClass} mt-1.5`}
            />
          </div>

          <div>
            <label htmlFor="keyword" className={labelClass}>
              Target keyword{" "}
              <span className="font-normal text-etsy-faint">(optional)</span>
            </label>
            <input
              id="keyword"
              type="text"
              value={targetKeyword}
              onChange={(e) => setTargetKeyword(e.target.value)}
              placeholder="personalized coffee mug"
              className={`${inputClass} mt-1.5`}
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
              max={20}
              value={photoCount}
              onChange={(e) =>
                setPhotoCount(
                  Math.max(0, Math.min(20, Number(e.target.value) || 0))
                )
              }
              className={`${inputClass} mt-1.5`}
            />
          </div>

          <div className="rounded-2xl border border-black/[0.06] bg-etsy-cream/70 p-4">
            <span className={labelClass}>
              Do you have at least one real/lifestyle photo (not just a plain
              mockup)?
            </span>
            <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl bg-black/[0.04] p-1">
              {[
                { label: "Yes", value: true },
                { label: "No", value: false },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.label}
                  onClick={() => setHasLifestylePhoto(opt.value)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                    hasLifestylePhoto === opt.value
                      ? "bg-white text-etsy-dark shadow-sm"
                      : "text-etsy-muted hover:text-etsy-dark"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-gradient-to-b from-etsy-orange to-etsy-orangeDark px-4 py-3.5 text-[15px] font-semibold text-white shadow-accent transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift focus:outline-none focus:ring-4 focus:ring-etsy-orange/25 active:translate-y-0 active:scale-[0.99]"
          >
            Check my listing
          </button>
        </form>

        {/* ---------------- Results ---------------- */}
        <div id="results" className="scroll-mt-6">
          {result ? (
            <>
              <Results result={result} />
              {scoredInput && (
                <OptimizedRewrite ref={rewriteRef} input={scoredInput} />
              )}
            </>
          ) : (
            <div className="animate-fade-up flex h-full min-h-[340px] flex-col items-center justify-center rounded-3xl border border-dashed border-black/10 bg-white/50 p-10 text-center" style={{ animationDelay: "220ms" }}>
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-etsy-cream to-etsy-sand text-3xl shadow-sm">
                📋
              </div>
              <p className="max-w-xs text-[15px] leading-relaxed text-etsy-muted">
                Fill in your listing details and hit{" "}
                <span className="font-semibold text-etsy-dark">Check my listing</span>{" "}
                to see your Visibility and Conversion scores.
              </p>
            </div>
          )}
        </div>
      </div>

      <footer className="mt-16 text-center text-xs text-etsy-faint">
        Not affiliated with Etsy. Scores are heuristic guidance, not guarantees.
      </footer>

      {/* Floating AI Rewrite action — only after an analysis has run */}
      {result && (
        <button
          type="button"
          onClick={handleRewriteFab}
          disabled={!rewriteHasContent}
          title={
            rewriteHasContent
              ? "Generate an AI-optimized rewrite"
              : "Add your listing details first"
          }
          aria-label="AI Rewrite"
          className="animate-fade-up fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-etsy-orange to-etsy-orangeDark px-5 py-3.5 text-sm font-semibold text-white shadow-accent transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift focus:outline-none focus:ring-4 focus:ring-etsy-orange/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:bottom-6 sm:right-6"
        >
          <span className="text-base" aria-hidden>
            ✨
          </span>
          AI Rewrite
        </button>
      )}
    </main>
  );
}
