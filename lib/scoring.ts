/**
 * Etsy Listing Health Check — deterministic scoring engine.
 *
 * This file is intentionally free of any React / Next.js / network code so it can
 * be unit-tested and reused (API route, batch tool, etc.) later. Pure functions only.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ListingInput {
  title: string;
  /** Up to 13 tags. Empty strings are ignored. */
  tags: string[];
  description: string;
  category: string;
  /** Optional. When present, drives the strongest visibility checks. */
  targetKeyword?: string;
  /** 0–20 */
  photoCount: number;
  /** At least one real/lifestyle photo (not just a plain mockup)? */
  hasLifestylePhoto: boolean;
}

export type IssueCategory = "Visibility" | "Conversion";
export type IssueSeverity = "Critical" | "Warning" | "Info";
export type Grade = "A" | "B" | "C" | "D";

export interface Issue {
  field: string;
  category: IssueCategory;
  severity: IssueSeverity;
  problem: string;
  fix: string;
  /** Points this issue deducted (display metadata; does not change the scores). */
  points: number;
}

export type SectionName = "Title" | "Tags" | "Description" | "Photos" | "Category";

export interface SectionScore {
  name: SectionName;
  score: number;
  grade: Grade;
}

export interface TagStats {
  /** Non-empty tags provided. */
  slotsUsed: number;
  totalSlots: number;
  /** Distinct tags flagged as weak (single-word, over-long, or duplicate). */
  weakCount: number;
  weak: { singleWord: number; tooLong: number; duplicate: number };
  /** Plain-English completeness + quality summary. */
  note: string;
}

export interface ScoringResult {
  visibilityScore: number;
  conversionScore: number;
  visibilityGrade: Grade;
  conversionGrade: Grade;
  verdict: string;
  issues: Issue[];
  /** Secondary per-section breakdown (display only). */
  sections: SectionScore[];
  /** Tag completeness vs. quality (display only). */
  tagStats: TagStats;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const clamp = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

export function gradeFor(score: number): Grade {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 50) return "C";
  return "D";
}

const norm = (s: string): string => s.trim().toLowerCase();

/** Cheap near-duplicate signature: lowercase, strip non-alphanumerics, collapse. */
const tagSignature = (s: string): string =>
  norm(s).replace(/[^a-z0-9]+/g, "");

/**
 * A small but useful lexicon of concrete product nouns. Used to detect whether a
 * title actually names *what the thing is* (conversion) vs. being keyword soup.
 */
const PRODUCT_NOUNS = [
  "shirt", "tshirt", "tee", "hoodie", "sweatshirt", "sweater", "dress", "skirt",
  "mug", "cup", "tumbler", "bottle", "glass", "coaster",
  "poster", "print", "painting", "art", "wall", "sticker", "decal", "card",
  "necklace", "bracelet", "earring", "earrings", "ring", "pendant", "jewelry",
  "candle", "soap", "lotion", "balm", "oil",
  "bag", "tote", "backpack", "purse", "wallet", "pouch", "clutch",
  "pillow", "blanket", "throw", "towel", "rug", "mat", "cushion",
  "planner", "journal", "notebook", "calendar", "template", "svg", "png", "pdf",
  "sign", "ornament", "decoration", "garland", "wreath", "banner",
  "hat", "beanie", "cap", "scarf", "gloves", "socks",
  "bowl", "plate", "vase", "pot", "planter", "jar", "tray", "box",
  "keychain", "magnet", "pin", "patch", "bookmark",
  "toy", "puzzle", "game", "doll", "figure",
  "frame", "clock", "lamp", "light", "mirror",
];

/** Benefit / emotional language signals (conversion). */
const BENEFIT_WORDS = [
  "perfect", "gift", "love", "loved", "cozy", "comfy", "comfortable", "soft",
  "unique", "handmade", "custom", "personalized", "personalised", "premium",
  "luxury", "beautiful", "gorgeous", "stunning", "elegant", "stylish",
  "durable", "quality", "favorite", "favourite", "happy", "smile", "warm",
  "special", "treat", "surprise", "celebrate", "memory", "memories",
  "for her", "for him", "for mom", "for dad", "for you", "everyday",
  "compliment", "compliments", "treasure", "cherish", "feel",
];

/** Spec-like opener signals — a first line that leads with dry specs, not a hook. */
const SPEC_PATTERNS = [
  /\b\d+\s?(?:cm|mm|in|inch|inches|"|ft|oz|ml|l|g|kg|lbs?)\b/i,
  /\b\d+\s?x\s?\d+\b/i,
  /\b100%\b/i,
  /\bmaterial\s*:/i,
  /\bsize\s*:/i,
  /\bdimensions?\s*:/i,
  /\bcolor\s*:/i,
  /\bweight\s*:/i,
];

// ---------------------------------------------------------------------------
// Main scoring function
// ---------------------------------------------------------------------------

export function scoreListing(input: ListingInput): ScoringResult {
  const issues: Issue[] = [];

  const title = input.title?.trim() ?? "";
  const titleLower = title.toLowerCase();
  const description = input.description?.trim() ?? "";
  const category = input.category?.trim() ?? "";
  const keyword = input.targetKeyword?.trim() ?? "";
  const keywordLower = keyword.toLowerCase();
  const tags = (input.tags ?? []).map((t) => t.trim()).filter(Boolean);
  const photoCount = Number.isFinite(input.photoCount) ? input.photoCount : 0;

  let visibility = 100;
  let conversion = 100;

  // =========================================================================
  // VISIBILITY
  // =========================================================================

  // --- Target keyword presence in title ---
  // The keyword field is optional, so this — the single strongest visibility
  // signal — must never be silently skipped. When it's blank we derive a
  // candidate from the title and check against that; when BOTH the keyword and
  // the title are blank, the listing literally cannot be found.
  let effectiveKeyword = keyword;
  let assumedFromTitle = false;
  if (!effectiveKeyword && title) {
    // Etsy titles are comma/pipe-segmented; the first segment is the core
    // phrase. Take it, capped at the first 4 words, as the candidate keyword.
    const firstSegment = title.split(/[,|]/)[0].trim();
    effectiveKeyword = firstSegment.split(/\s+/).slice(0, 4).join(" ");
    assumedFromTitle = true;
  }
  const effectiveKeywordLower = effectiveKeyword.toLowerCase();

  if (!effectiveKeyword) {
    // No keyword AND no title → worst case: nothing to rank on at all.
    visibility -= 25;
    issues.push({
      field: "Title",
      category: "Visibility",
      severity: "Critical",
      problem:
        "Your listing has no title and no target keyword — Etsy has nothing to rank it on, so buyers cannot find it at all.",
      fix: 'Add a descriptive title that leads with the exact phrase a buyer would search (e.g. "Personalized Coffee Mug").',
      points: 25,
    });
  } else {
    if (assumedFromTitle) {
      issues.push({
        field: "Target keyword",
        category: "Visibility",
        severity: "Info",
        problem: `No keyword set — we assumed "${effectiveKeyword}" from your title; set it explicitly for accuracy.`,
        fix: "Enter the one phrase a buyer would type to find this, so we can check its placement precisely instead of guessing.",
        points: 0,
      });
    }
    if (!titleLower.includes(effectiveKeywordLower)) {
      visibility -= 25;
      issues.push({
        field: "Title",
        category: "Visibility",
        severity: "Critical",
        problem: `Your target keyword "${effectiveKeyword}" does not appear in the title at all.`,
        fix: `Put "${effectiveKeyword}" in the title — ideally near the front. Etsy weighs the title heavily for search ranking.`,
        points: 25,
      });
    } else if (!titleLower.slice(0, 40).includes(effectiveKeywordLower)) {
      visibility -= 10;
      issues.push({
        field: "Title",
        category: "Visibility",
        severity: "Warning",
        problem: `Your target keyword "${effectiveKeyword}" appears in the title, but not in the first 40 characters.`,
        fix: `Move "${effectiveKeyword}" to the start of the title. Etsy (and shoppers) give the most weight to the opening words.`,
        points: 10,
      });
    }
  }

  // --- Title length (empty counts as under 40) ---
  if (title.length < 40) {
    visibility -= 10;
    issues.push({
      field: "Title",
      category: "Visibility",
      severity: "Warning",
      problem:
        title.length === 0
          ? "Your listing has no title, so there's nothing for Etsy to index."
          : `Your title is only ${title.length} characters — too short to capture many search phrases.`,
      fix: "Aim for roughly 70–140 characters. Use the extra room for additional real keyword phrases buyers search.",
      points: 10,
    });
  } else if (title.length > 140) {
    visibility -= 10;
    issues.push({
      field: "Title",
      category: "Visibility",
      severity: "Warning",
      problem: `Your title is ${title.length} characters, over Etsy's 140-character limit.`,
      fix: "Trim the title to 140 characters or fewer; anything beyond the limit is cut off.",
      points: 10,
    });
  }

  // --- Tag count ---
  if (tags.length < 13) {
    const missing = 13 - tags.length;
    visibility -= 3 * missing;
    issues.push({
      field: "Tags",
      category: "Visibility",
      severity: "Critical",
      problem: `You're using only ${tags.length} of 13 tags — leaving ${missing} unused.`,
      fix: "Fill all 13 tags. Each empty tag is a free search phrase you're throwing away. Use multi-word, long-tail phrases.",
      points: 3 * missing,
    });
  }

  // --- Single-word tags (capped at -12) ---
  const singleWordTags = tags.filter((t) => !/\s/.test(t));
  if (singleWordTags.length > 0) {
    const penalty = Math.min(12, singleWordTags.length * 3);
    visibility -= penalty;
    issues.push({
      field: "Tags",
      category: "Visibility",
      severity: "Warning",
      problem: `${singleWordTags.length} tag(s) are a single word: ${singleWordTags
        .slice(0, 5)
        .map((t) => `"${t}"`)
        .join(", ")}${singleWordTags.length > 5 ? "…" : ""}.`,
      fix: "Replace single words with long-tail phrases (e.g. \"mug\" → \"funny coffee mug for nurses\"). Multi-word tags match more specific, higher-intent searches.",
      points: penalty,
    });
  }

  // --- Over-long tags (>20 chars, invalid on Etsy) ---
  const longTags = tags.filter((t) => t.length > 20);
  if (longTags.length > 0) {
    visibility -= 3 * longTags.length;
    issues.push({
      field: "Tags",
      category: "Visibility",
      severity: "Warning",
      problem: `${longTags.length} tag(s) exceed Etsy's 20-character limit: ${longTags
        .map((t) => `"${t}"`)
        .join(", ")}.`,
      fix: "Shorten each of these to 20 characters or fewer, or Etsy will reject them.",
      points: 3 * longTags.length,
    });
  }

  // --- Duplicate / near-duplicate tags ---
  const seen = new Map<string, string>();
  const dupes: string[] = [];
  for (const t of tags) {
    const sig = tagSignature(t);
    if (!sig) continue;
    if (seen.has(sig)) {
      dupes.push(t);
    } else {
      seen.set(sig, t);
    }
  }
  if (dupes.length > 0) {
    visibility -= 3 * dupes.length;
    issues.push({
      field: "Tags",
      category: "Visibility",
      severity: "Warning",
      problem: `${dupes.length} duplicate or near-duplicate tag(s) detected: ${dupes
        .map((t) => `"${t}"`)
        .join(", ")}.`,
      fix: "Every tag should be distinct. Swap duplicates for new phrases to widen the searches you appear in.",
      points: 3 * dupes.length,
    });
  }

  // --- Category ---
  if (!category || category.length < 3 || !/\s|>|\//.test(category)) {
    // empty, very short, or a single vague word with no sub-category specificity
    visibility -= 10;
    issues.push({
      field: "Category",
      category: "Visibility",
      severity: "Warning",
      problem: category
        ? `Category "${category}" looks too broad or unspecific.`
        : "No category provided.",
      fix: "Choose the most specific category Etsy offers (e.g. \"Home & Living > Kitchen > Drinkware > Mugs\"). Specific categories rank better and surface in browse.",
      points: 10,
    });
  }

  // =========================================================================
  // CONVERSION
  // =========================================================================

  // --- Title actually names the product (not keyword soup) ---
  const titleHasProductNoun = PRODUCT_NOUNS.some((n) =>
    new RegExp(`\\b${n}\\b`, "i").test(titleLower)
  );
  const commaCount = (title.match(/,/g) || []).length;
  const looksLikeSoup = commaCount >= 3 && !titleHasProductNoun;
  if (!titleHasProductNoun || looksLikeSoup) {
    conversion -= 20;
    issues.push({
      field: "Title",
      category: "Conversion",
      severity: "Critical",
      problem:
        title.length === 0
          ? "Your listing has no title, so a shopper can't tell what the product is at all."
          : looksLikeSoup
          ? "Your title reads like keyword soup — lots of comma-separated phrases but no clear statement of what the product actually is."
          : "Your title doesn't clearly name the product. A shopper skimming results can't instantly tell what it is.",
      fix: "Lead with a plain product noun a human understands (e.g. \"Ceramic Coffee Mug\"), then layer keywords after it. Write for the buyer first, the algorithm second.",
      points: 20,
    });
  }

  // --- Description ---
  // An empty or too-thin (<100 char) description can't possibly hook, skim, or
  // sell, so every description-dependent penalty fires. A full-length
  // description runs the nuanced content heuristics instead (unchanged).
  if (description.length < 100) {
    conversion -= 15; // too short
    issues.push({
      field: "Description",
      category: "Conversion",
      severity: "Warning",
      problem:
        description.length === 0
          ? "Your listing has no description — buyers get no answers and no reason to trust or buy."
          : `Your description is only ${description.length} characters — too thin to answer buyer questions or build trust.`,
      fix: "Write at least a few short paragraphs: what it is, who it's for, why they'll love it, and the key details (size, materials, shipping).",
      points: 15,
    });

    conversion -= 10; // no hook
    issues.push({
      field: "Description",
      category: "Conversion",
      severity: "Warning",
      problem:
        "There's no opening hook — with so little text, the first line can't earn the click or set up the sale.",
      fix: "Open with the emotional payoff — e.g. \"The cozy mug that makes every morning feel like a treat.\" Save dimensions and materials for lower down.",
      points: 10,
    });

    conversion -= 8; // not skimmable
    issues.push({
      field: "Description",
      category: "Conversion",
      severity: "Info",
      problem:
        "There's not enough description to skim — no \"who it's for\", key details, or gift angle for a buyer to scan.",
      fix: "Break it into short chunks with line breaks or bullets: a hook, \"Perfect for…\", key details, and a gift/why-buy line.",
      points: 8,
    });

    conversion -= 7; // no emotional / benefit language
    issues.push({
      field: "Description",
      category: "Conversion",
      severity: "Info",
      problem:
        "There's no emotional or benefit language to make a buyer want it — there's barely any copy at all.",
      fix: "Add why it matters: who it's perfect for, how it'll make them feel, why it makes a great gift. Sell the outcome, not just the object.",
      points: 7,
    });
  } else {
    // First line: hook vs. dry specs.
    const firstLine = (description.split(/\r?\n/)[0] ?? "").trim();
    const startsWithSpecs = SPEC_PATTERNS.some((re) => re.test(firstLine));
    const firstLineHasBenefit = BENEFIT_WORDS.some((w) =>
      firstLine.toLowerCase().includes(w)
    );
    if (startsWithSpecs || (!firstLineHasBenefit && firstLine.length < 40)) {
      conversion -= 10;
      issues.push({
        field: "Description",
        category: "Conversion",
        severity: "Warning",
        problem:
          "Your description opens with specs or a flat statement instead of a benefit/hook. The first line is prime selling real estate.",
        fix: "Open with the emotional payoff — e.g. \"The cozy mug that makes every morning feel like a treat.\" Save dimensions and materials for lower down.",
        points: 10,
      });
    }

    // Skimmability (only meaningful for full-length copy).
    const hasLineBreaks = /\r?\n/.test(description);
    if (!hasLineBreaks) {
      conversion -= 8;
      issues.push({
        field: "Description",
        category: "Conversion",
        severity: "Info",
        problem: "Your description is one solid block of text with no line breaks — hard to skim on mobile.",
        fix: "Break it into short chunks with line breaks or bullets: a hook, \"Perfect for…\", key details, and a gift/why-buy line.",
        points: 8,
      });
    }

    // Emotional / benefit language.
    const benefitHits = BENEFIT_WORDS.filter((w) =>
      description.toLowerCase().includes(w)
    ).length;
    if (benefitHits === 0) {
      conversion -= 7;
      issues.push({
        field: "Description",
        category: "Conversion",
        severity: "Info",
        problem: "Your description is purely factual — there's no emotional or benefit language to make a buyer want it.",
        fix: "Add why it matters: who it's perfect for, how it'll make them feel, why it makes a great gift. Sell the outcome, not just the object.",
        points: 7,
      });
    }
  }

  // --- Photo count (Etsy allows up to 20 photos) ---
  if (photoCount < 5) {
    conversion -= 20;
    issues.push({
      field: "Photos",
      category: "Conversion",
      severity: "Critical",
      problem: `Only ${photoCount} photo(s) on the listing. Buyers can't fully judge the product, so they bounce.`,
      fix: "Add photos until you have at least 5 — ideally 10+ of your 20 slots: different angles, scale/in-use, close-up of detail, and packaging. Photos are the #1 conversion lever.",
      points: 20,
    });
  } else if (photoCount < 10) {
    conversion -= 7;
    issues.push({
      field: "Photos",
      category: "Conversion",
      severity: "Warning",
      problem: `You're using only ${photoCount} of 20 photo slots — add more angles/in-use/detail shots.`,
      fix: "Fill more of your 20 slots: extra angles, an in-use/lifestyle shot, a detail close-up, scale, and packaging. More photos consistently lift conversion.",
      points: 7,
    });
  }

  // --- Lifestyle photo ---
  if (!input.hasLifestylePhoto) {
    conversion -= 20;
    issues.push({
      field: "Photos",
      category: "Conversion",
      severity: "Critical",
      problem: "No real/lifestyle photo — plain mockups alone don't help buyers picture the product in their life.",
      fix: "Add at least one real photo showing the item in use or in a real setting (on a desk, worn, styled). It dramatically increases trust and sales.",
      points: 20,
    });
  }

  // =========================================================================
  // Finalize
  // =========================================================================

  const visibilityScore = clamp(visibility);
  const conversionScore = clamp(conversion);

  let verdict: string;
  if (visibilityScore < 60) {
    verdict =
      "Your main problem is VISIBILITY — buyers aren't finding this listing. Fix the SEO issues first; no point optimizing conversion until people can see it.";
  } else if (conversionScore < 60) {
    verdict =
      "Your main problem is CONVERSION — people find you but don't buy. This is NOT fixed by ads or more traffic. Fix the conversion issues below.";
  } else {
    verdict = "This listing is in good shape on both fronts. Keep monitoring.";
  }

  // Order issues by severity within their category for nicer display.
  const severityRank: Record<IssueSeverity, number> = {
    Critical: 0,
    Warning: 1,
    Info: 2,
  };
  issues.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  // --- Secondary per-section breakdown (display only) ---
  // Each section starts at 100 and loses the points its own issues deducted.
  // This is purely for a scannable "which section is dragging things down" row;
  // it does not feed the two headline scores or the verdict.
  const SECTION_OF: Record<string, SectionName> = {
    Title: "Title",
    "Target keyword": "Title",
    Tags: "Tags",
    Description: "Description",
    Photos: "Photos",
    Category: "Category",
  };
  const sectionNames: SectionName[] = [
    "Title",
    "Tags",
    "Description",
    "Photos",
    "Category",
  ];
  const sectionDeductions: Record<SectionName, number> = {
    Title: 0,
    Tags: 0,
    Description: 0,
    Photos: 0,
    Category: 0,
  };
  for (const it of issues) {
    const sec = SECTION_OF[it.field];
    if (sec) sectionDeductions[sec] += it.points;
  }
  const sections: SectionScore[] = sectionNames.map((name) => {
    const score = clamp(100 - sectionDeductions[name]);
    return { name, score, grade: gradeFor(score) };
  });

  // --- Tag completeness vs. quality (display only) ---
  const weakTagSet = new Set<string>([
    ...singleWordTags,
    ...longTags,
    ...dupes,
  ]);
  const weak = {
    singleWord: singleWordTags.length,
    tooLong: longTags.length,
    duplicate: dupes.length,
  };
  const tagStats: TagStats = {
    slotsUsed: tags.length,
    totalSlots: 13,
    weakCount: weakTagSet.size,
    weak,
    note: buildTagNote(tags.length, weak, weakTagSet.size),
  };

  return {
    visibilityScore,
    conversionScore,
    visibilityGrade: gradeFor(visibilityScore),
    conversionGrade: gradeFor(conversionScore),
    verdict,
    issues,
    sections,
    tagStats,
  };
}

/** Plain-English completeness + quality summary for the Tags section. */
function buildTagNote(
  slotsUsed: number,
  weak: { singleWord: number; tooLong: number; duplicate: number },
  weakCount: number
): string {
  const complete = slotsUsed >= 13;
  const completePart = complete
    ? "All 13 slots used"
    : `Only ${slotsUsed}/13 slots used`;

  if (weakCount === 0) {
    return complete
      ? "All 13 slots used with solid multi-word tags. Nice work."
      : `${slotsUsed}/13 slots used — fill the rest with multi-word long-tail phrases buyers actually search.`;
  }

  const parts: string[] = [];
  if (weak.singleWord > 0) {
    parts.push(
      `${weak.singleWord} single generic ${weak.singleWord === 1 ? "word" : "words"}`
    );
  }
  if (weak.tooLong > 0) {
    parts.push(`${weak.tooLong} over 20 characters`);
  }
  if (weak.duplicate > 0) {
    parts.push(
      `${weak.duplicate} ${weak.duplicate === 1 ? "duplicate" : "duplicates"}`
    );
  }
  const weakDesc = parts.join(", ");
  const connector = complete ? ", but" : ", and";

  return `${completePart}${connector} ${weakDesc} — replace them with multi-word long-tail phrases buyers actually search.`;
}
