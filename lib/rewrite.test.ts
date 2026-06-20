import { describe, it, expect } from "vitest";
import {
  buildRewritePrompt,
  parseRewriteJson,
  sanitizeRewrite,
  MAX_TITLE,
  MAX_TAG,
  TAG_COUNT,
} from "./rewrite";
import type { ListingInput } from "./scoring";

const sample: ListingInput = {
  title: "Mug",
  tags: ["cottagecore mug", "gift"],
  description: "A mug.",
  category: "Home & Living > Mugs",
  targetKeyword: "cottagecore mug",
  photoCount: 3,
  hasLifestylePhoto: false,
};

describe("buildRewritePrompt", () => {
  it("injects all listing fields and asks for JSON only", () => {
    const p = buildRewritePrompt(sample);
    expect(p).toContain("Title: Mug");
    expect(p).toContain("cottagecore mug, gift");
    expect(p).toContain("Target keyword: cottagecore mug");
    expect(p).toContain("Return ONLY valid JSON");
  });

  it("handles a missing target keyword without crashing", () => {
    const p = buildRewritePrompt({ ...sample, targetKeyword: undefined });
    expect(p).toContain("Target keyword: ");
  });
});

describe("parseRewriteJson", () => {
  it("parses plain JSON", () => {
    expect(parseRewriteJson('{"title":"X"}')).toEqual({ title: "X" });
  });

  it("strips ```json fences", () => {
    const raw = '```json\n{"title":"X"}\n```';
    expect(parseRewriteJson(raw)).toEqual({ title: "X" });
  });

  it("strips bare ``` fences", () => {
    expect(parseRewriteJson('```\n{"title":"X"}\n```')).toEqual({ title: "X" });
  });

  it("recovers JSON embedded in surrounding prose", () => {
    const raw = 'Here you go:\n{"title":"X"}\nHope that helps!';
    expect(parseRewriteJson(raw)).toEqual({ title: "X" });
  });

  it("throws on unparseable text", () => {
    expect(() => parseRewriteJson("not json at all")).toThrow();
  });
});

describe("sanitizeRewrite enforces the hard rules", () => {
  it("caps the title at 140 chars", () => {
    const long = "a".repeat(200);
    const r = sanitizeRewrite({ title: long });
    expect(r.title.length).toBe(MAX_TITLE);
  });

  it("truncates tags longer than 20 chars", () => {
    const r = sanitizeRewrite({
      tags: ["this tag is definitely far too long for etsy"],
    });
    expect(r.tags[0].length).toBeLessThanOrEqual(MAX_TAG);
  });

  it("removes duplicate tags (case-insensitive)", () => {
    const r = sanitizeRewrite({
      tags: ["Cottagecore Mug", "cottagecore mug", "wildflower tee"],
    });
    expect(r.tags).toEqual(["Cottagecore Mug", "wildflower tee"]);
  });

  it("never returns more than 13 tags", () => {
    const many = Array.from({ length: 20 }, (_, i) => `tag number ${i}`);
    const r = sanitizeRewrite({ tags: many });
    expect(r.tags.length).toBe(TAG_COUNT);
  });

  it("drops empty / whitespace tags", () => {
    const r = sanitizeRewrite({ tags: ["  ", "", "real tag"] });
    expect(r.tags).toEqual(["real tag"]);
  });

  it("coerces missing/non-string fields to safe defaults", () => {
    const r = sanitizeRewrite({ tags: "not an array", title: 42 });
    expect(r.title).toBe("");
    expect(r.tags).toEqual([]);
    expect(r.description_opening).toBe("");
    expect(r.notes).toBe("");
    expect(r.primary_keyword).toBe("");
  });
});
