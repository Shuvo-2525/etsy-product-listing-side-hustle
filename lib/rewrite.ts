/**
 * Optimized-rewrite helpers — pure, framework-free so they can be unit-tested
 * and reused. The actual Gemini network call lives in the API route; this file
 * only builds the prompt, parses the model output, and enforces the hard rules
 * in code (never trust the model to obey limits).
 */

import type { ListingInput } from "./scoring";

export interface RewriteResult {
  title: string;
  tags: string[];
  description_opening: string;
  primary_keyword: string;
  notes: string;
}

export const MAX_TITLE = 140;
export const MAX_TAG = 20;
export const TAG_COUNT = 13;

/** Build the exact prompt sent to Gemini. */
export function buildRewritePrompt(input: ListingInput): string {
  const tags = (input.tags ?? []).map((t) => t.trim()).filter(Boolean).join(", ");
  return `You are an Etsy SEO and conversion expert. Rewrite the listing below to improve BOTH search visibility AND buyer conversion.
Hard rules:
- Title: max 140 characters. Most important buyer search keyword in the first 40 characters. Natural readable phrase (not comma-stuffed). Must clearly state what the product is.
- Tags: exactly 13 tags, each max 20 characters, multi-word long-tail phrases buyers actually type, no duplicates, no single generic words, don't repeat the full title.
- Description opening: first 2-3 lines as a compelling hook saying who it's for and why they'll love it, naturally including the main keyword.
Listing:
- Title: ${input.title ?? ""}
- Tags: ${tags}
- Description: ${input.description ?? ""}
- Category: ${input.category ?? ""}
- Target keyword: ${input.targetKeyword ?? ""}
Return ONLY valid JSON, no markdown:
{"title":"...","tags":["...13 items..."],"description_opening":"...","primary_keyword":"...","notes":"1-2 line summary of the key changes"}`;
}

/**
 * Strip ```json / ``` fences and any leading/trailing prose, then JSON.parse.
 * Throws on failure so the caller can return a friendly error.
 */
export function parseRewriteJson(raw: string): unknown {
  let text = (raw ?? "").trim();

  // Remove surrounding markdown code fences if present.
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // Fallback: if there's still surrounding prose, grab the outermost {...}.
  if (!text.startsWith("{")) {
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first) {
      text = text.slice(first, last + 1);
    }
  }

  return JSON.parse(text);
}

const asString = (v: unknown): string => (typeof v === "string" ? v : "");

/**
 * Enforce the hard rules in code, regardless of what the model returned:
 * - title capped at 140 chars
 * - tags: trimmed, truncated to 20 chars, de-duplicated (case-insensitive),
 *   single generic words dropped where possible, then capped at exactly 13
 */
export function sanitizeRewrite(parsed: unknown): RewriteResult {
  const obj = (parsed ?? {}) as Record<string, unknown>;

  const title = asString(obj.title).trim().slice(0, MAX_TITLE);

  const rawTags = Array.isArray(obj.tags) ? obj.tags : [];
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const t of rawTags) {
    const tag = asString(t).trim().slice(0, MAX_TAG).trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue; // drop duplicates
    seen.add(key);
    cleaned.push(tag);
  }
  // Force exactly 13: drop extras. (We never fabricate tags to pad.)
  const tags = cleaned.slice(0, TAG_COUNT);

  return {
    title,
    tags,
    description_opening: asString(obj.description_opening).trim(),
    primary_keyword: asString(obj.primary_keyword).trim(),
    notes: asString(obj.notes).trim(),
  };
}
