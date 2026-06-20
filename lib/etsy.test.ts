import { describe, it, expect } from "vitest";
import {
  extractListingId,
  mapEtsyListing,
  buildEtsyAuthHeader,
  hasSharedSecret,
  MAX_PHOTOS,
} from "./etsy";

describe("buildEtsyAuthHeader", () => {
  it("combines keystring + separate shared secret", () => {
    expect(buildEtsyAuthHeader("keystring", "secret")).toBe("keystring:secret");
  });

  it("passes through a value that already contains the secret", () => {
    expect(buildEtsyAuthHeader("keystring:secret", "ignored")).toBe(
      "keystring:secret"
    );
  });

  it("trims surrounding whitespace", () => {
    expect(buildEtsyAuthHeader("  key  ", "  sec  ")).toBe("key:sec");
  });

  it("returns the keystring alone when no secret is available", () => {
    expect(buildEtsyAuthHeader("keystring")).toBe("keystring");
  });

  it("returns null when there's no keystring", () => {
    expect(buildEtsyAuthHeader("")).toBeNull();
    expect(buildEtsyAuthHeader(undefined)).toBeNull();
  });
});

describe("hasSharedSecret", () => {
  it("detects a present secret", () => {
    expect(hasSharedSecret("key:secret")).toBe(true);
  });

  it("is false for keystring-only or empty", () => {
    expect(hasSharedSecret("key")).toBe(false);
    expect(hasSharedSecret("key:")).toBe(false);
    expect(hasSharedSecret(null)).toBe(false);
  });
});

describe("extractListingId", () => {
  it("pulls the id from a full Etsy URL", () => {
    expect(
      extractListingId("https://www.etsy.com/listing/123456789/cute-mug")
    ).toBe("123456789");
  });

  it("works with query strings and trailing params", () => {
    expect(
      extractListingId("https://etsy.com/listing/987654321?ref=hp_recs")
    ).toBe("987654321");
  });

  it("works without protocol or www", () => {
    expect(extractListingId("etsy.com/listing/555")).toBe("555");
  });

  it("returns null when there's no listing id", () => {
    expect(extractListingId("https://www.etsy.com/shop/SomeShop")).toBeNull();
    expect(extractListingId("not a url")).toBeNull();
    expect(extractListingId("")).toBeNull();
  });
});

describe("mapEtsyListing", () => {
  it("maps a typical Etsy v3 listing response", () => {
    const data = {
      title: "  Cottagecore Mug  ",
      description: "A lovely mug.",
      tags: ["cottagecore mug", " wildflower tee ", ""],
      taxonomy_id: 1234,
      images: [{ listing_image_id: 1 }, { listing_image_id: 2 }],
    };
    const r = mapEtsyListing(data);
    expect(r.title).toBe("Cottagecore Mug");
    expect(r.description).toBe("A lovely mug.");
    expect(r.tags).toEqual(["cottagecore mug", "wildflower tee"]);
    expect(r.photoCount).toBe(2);
    expect(r.category).toBe("");
  });

  it("caps photoCount at the form maximum (20)", () => {
    const images = Array.from({ length: 25 }, (_, i) => ({ id: i }));
    const r = mapEtsyListing({ images });
    expect(r.photoCount).toBe(MAX_PHOTOS);
    expect(MAX_PHOTOS).toBe(20);
  });

  it("is defensive about missing / malformed fields", () => {
    const r = mapEtsyListing({});
    expect(r.title).toBe("");
    expect(r.description).toBe("");
    expect(r.tags).toEqual([]);
    expect(r.photoCount).toBe(0);

    const r2 = mapEtsyListing({ tags: "nope", images: "nope" });
    expect(r2.tags).toEqual([]);
    expect(r2.photoCount).toBe(0);
  });
});
