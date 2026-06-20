import { describe, it, expect } from "vitest";
import {
  scoreListing,
  gradeFor,
  type ListingInput,
  type Issue,
} from "./scoring";

/** A deliberately strong listing — should score well on both axes. */
const goodListing: ListingInput = {
  title:
    "Personalized Coffee Mug, Custom Name Ceramic Gift for Mom, Cozy Cottagecore Kitchen Drinkware",
  tags: [
    "cottagecore mug",
    "custom coffee mug",
    "custom name mug",
    "gift for mom",
    "cozy kitchen mug",
    "ceramic coffee cup",
    "botanical mug gift",
    "mothers day gift",
    "handmade name mug",
    "aesthetic mug gift",
    "slow living mug",
    "garden lover gift",
    "floral mug her",
  ],
  description:
    "The cozy mug that makes every morning feel like a little treat — perfect for the coffee lover who appreciates handmade, personalized details.\n\nMade from durable ceramic and customized with any name, it's a thoughtful gift she'll reach for every single day.\n\n- Holds 11oz\n- Dishwasher safe\n- Ships in 3-5 days",
  category: "Home & Living > Kitchen & Dining > Drinkware > Mugs",
  targetKeyword: "personalized coffee mug",
  photoCount: 8,
  hasLifestylePhoto: true,
};

const findIssue = (issues: Issue[], field: string, sev?: string) =>
  issues.find((i) => i.field === field && (!sev || i.severity === sev));

describe("gradeFor", () => {
  it("maps boundaries correctly", () => {
    expect(gradeFor(100)).toBe("A");
    expect(gradeFor(85)).toBe("A");
    expect(gradeFor(84)).toBe("B");
    expect(gradeFor(70)).toBe("B");
    expect(gradeFor(69)).toBe("C");
    expect(gradeFor(50)).toBe("C");
    expect(gradeFor(49)).toBe("D");
    expect(gradeFor(0)).toBe("D");
  });
});

describe("scoreListing — healthy listing", () => {
  const result = scoreListing(goodListing);

  it("scores high on both axes", () => {
    expect(result.visibilityScore).toBeGreaterThanOrEqual(85);
    expect(result.conversionScore).toBeGreaterThanOrEqual(85);
  });

  it("gives an A/B and the all-clear verdict", () => {
    expect(["A", "B"]).toContain(result.visibilityGrade);
    expect(["A", "B"]).toContain(result.conversionGrade);
    expect(result.verdict).toMatch(/good shape/i);
  });
});

describe("VISIBILITY rules", () => {
  it("missing keyword in title is Critical (-25)", () => {
    const r = scoreListing({
      ...goodListing,
      title: "Cozy Ceramic Drinkware for Your Kitchen Table Decor and Home",
      targetKeyword: "personalized coffee mug",
    });
    const issue = findIssue(r.issues, "Title", "Critical");
    expect(issue?.category).toBe("Visibility");
    expect(r.visibilityScore).toBeLessThan(scoreListing(goodListing).visibilityScore);
  });

  it("keyword present but not in first 40 chars is a Warning", () => {
    const r = scoreListing({
      ...goodListing,
      title:
        "Cozy Ceramic Drinkware for a Lovely Kitchen Table with a Personalized Coffee Mug",
      targetKeyword: "personalized coffee mug",
    });
    const issue = findIssue(r.issues, "Title", "Warning");
    expect(issue?.problem).toMatch(/first 40/i);
  });

  it("fewer than 13 tags costs -3 per missing tag", () => {
    const eleven = goodListing.tags.slice(0, 11);
    const r = scoreListing({ ...goodListing, tags: eleven });
    const issue = findIssue(r.issues, "Tags", "Critical");
    expect(issue?.problem).toMatch(/11 of 13/);
    // 2 missing => -6 vs the full-marks baseline
    expect(scoreListing(goodListing).visibilityScore - r.visibilityScore).toBe(6);
  });

  it("single-word tags are penalized and capped at -12", () => {
    const r = scoreListing({
      ...goodListing,
      tags: ["mug", "gift", "coffee", "cozy", "name", "cute", "cup"].concat(
        goodListing.tags.slice(7)
      ),
    });
    const issue = findIssue(r.issues, "Tags", "Warning");
    expect(issue?.problem).toMatch(/single word/i);
  });

  it("over-long tags (>20 chars) are flagged", () => {
    const r = scoreListing({
      ...goodListing,
      tags: ["this tag is definitely way too long for etsy"].concat(
        goodListing.tags.slice(1)
      ),
    });
    expect(
      r.issues.some((i) => i.field === "Tags" && /20-character/i.test(i.problem))
    ).toBe(true);
  });

  it("duplicate / near-duplicate tags are flagged", () => {
    const r = scoreListing({
      ...goodListing,
      tags: ["cottagecore mug", "Cottagecore Mug!"].concat(
        goodListing.tags.slice(2)
      ),
    });
    expect(
      r.issues.some((i) => i.field === "Tags" && /duplicate/i.test(i.problem))
    ).toBe(true);
  });

  it("empty/unspecific category is a Warning (-10)", () => {
    const r = scoreListing({ ...goodListing, category: "Mugs" });
    expect(findIssue(r.issues, "Category", "Warning")).toBeDefined();
  });
});

describe("CONVERSION rules", () => {
  it("keyword-soup title with no product noun is Critical (-20)", () => {
    const r = scoreListing({
      ...goodListing,
      title: "cottagecore, wildflower, botanical, aesthetic, cozy, slow living, gift",
      targetKeyword: "cottagecore",
    });
    const issue = r.issues.find(
      (i) => i.field === "Title" && i.category === "Conversion"
    );
    expect(issue?.severity).toBe("Critical");
  });

  it("short description is a Warning (-15)", () => {
    const r = scoreListing({ ...goodListing, description: "A nice mug." });
    expect(findIssue(r.issues, "Description", "Warning")).toBeDefined();
  });

  it("fewer than 5 photos is Critical (-20)", () => {
    const r = scoreListing({ ...goodListing, photoCount: 3 });
    const issue = findIssue(r.issues, "Photos", "Critical");
    expect(issue?.problem).toMatch(/3 photo/);
  });

  it("no lifestyle photo is Critical (-20)", () => {
    const r = scoreListing({ ...goodListing, hasLifestylePhoto: false });
    expect(
      r.issues.some((i) => i.field === "Photos" && /lifestyle/i.test(i.problem))
    ).toBe(true);
  });
});

describe("VERDICT logic", () => {
  it("low visibility wins priority even if conversion is also low", () => {
    const r = scoreListing({
      title: "stuff for you",
      tags: [],
      description: "x",
      category: "",
      targetKeyword: "personalized coffee mug",
      photoCount: 0,
      hasLifestylePhoto: false,
    });
    expect(r.visibilityScore).toBeLessThan(60);
    expect(r.verdict).toMatch(/VISIBILITY/);
  });

  it("good visibility but poor conversion flags CONVERSION", () => {
    const r = scoreListing({
      ...goodListing,
      // keep visibility healthy, wreck conversion
      description: "Material: ceramic. Size: 11oz.",
      photoCount: 1,
      hasLifestylePhoto: false,
    });
    expect(r.visibilityScore).toBeGreaterThanOrEqual(60);
    expect(r.conversionScore).toBeLessThan(60);
    expect(r.verdict).toMatch(/CONVERSION/);
  });
});

describe("scores never leave the 0–100 range", () => {
  it("clamps a worst-case listing to 0", () => {
    const r = scoreListing({
      title: "",
      tags: [],
      description: "",
      category: "",
      targetKeyword: "nope",
      photoCount: 0,
      hasLifestylePhoto: false,
    });
    expect(r.visibilityScore).toBeGreaterThanOrEqual(0);
    expect(r.conversionScore).toBeGreaterThanOrEqual(0);
    expect(r.visibilityScore).toBeLessThanOrEqual(100);
    expect(r.conversionScore).toBeLessThanOrEqual(100);
  });
});

describe("empty / incomplete listings are not let off the hook", () => {
  const emptyListing: ListingInput = {
    title: "",
    tags: [],
    description: "",
    category: "",
    targetKeyword: undefined,
    photoCount: 0,
    hasLifestylePhoto: false,
  };

  it("a completely empty listing scores near 0 on BOTH axes (not ~50)", () => {
    const r = scoreListing(emptyListing);
    expect(r.visibilityScore).toBeLessThan(25);
    expect(r.conversionScore).toBeLessThan(25);
    // Specifically must not sit around the old ~50 leniency bug.
    expect(r.visibilityScore).toBeLessThan(40);
    expect(r.conversionScore).toBeLessThan(40);
  });

  it("no keyword + no title is a Critical visibility failure (full penalty)", () => {
    const r = scoreListing(emptyListing);
    expect(
      r.issues.some(
        (i) =>
          i.category === "Visibility" &&
          i.severity === "Critical" &&
          /no title and no target keyword/i.test(i.problem)
      )
    ).toBe(true);
  });

  it("no keyword but a real title auto-derives a candidate and notes it", () => {
    const r = scoreListing({
      ...goodListing,
      targetKeyword: undefined,
    });
    const info = r.issues.find(
      (i) => i.field === "Target keyword" && i.severity === "Info"
    );
    expect(info?.problem).toMatch(/we assumed "Personalized Coffee Mug"/);
    // Derived keyword is the start of the title, so no keyword penalty fires;
    // a well-formed listing stays an A.
    expect(r.visibilityGrade).toBe("A");
  });

  it("an empty title fires BOTH the title-length and 'names the product' penalties", () => {
    const r = scoreListing({ ...goodListing, title: "", targetKeyword: "x" });
    expect(
      r.issues.some(
        (i) =>
          i.field === "Title" &&
          i.category === "Visibility" &&
          /no title/i.test(i.problem)
      )
    ).toBe(true);
    expect(
      r.issues.some(
        (i) =>
          i.field === "Title" &&
          i.category === "Conversion" &&
          /no title/i.test(i.problem)
      )
    ).toBe(true);
  });

  it("an empty description fires ALL FOUR description penalties (-40 total)", () => {
    const full = scoreListing(goodListing).conversionScore;
    const r = scoreListing({ ...goodListing, description: "" });
    const descIssues = r.issues.filter((i) => i.field === "Description");
    expect(descIssues).toHaveLength(4);
    expect(full - r.conversionScore).toBe(40);
  });

  it("a too-thin (<100 char) description also fires all four", () => {
    const r = scoreListing({ ...goodListing, description: "A nice mug." });
    expect(r.issues.filter((i) => i.field === "Description")).toHaveLength(4);
  });
});
