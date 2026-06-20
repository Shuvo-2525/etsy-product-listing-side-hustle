/**
 * Etsy listing fetch helpers — pure, framework-free so they can be unit-tested
 * and reused. The network call to the Etsy Open API lives in the API route;
 * this file only parses the URL and maps the API response to our form shape.
 */

export interface EtsyListingData {
  title: string;
  description: string;
  tags: string[];
  category: string;
  photoCount: number;
}

/** Max photos the form (and Etsy) supports. */
export const MAX_PHOTOS = 10;

/**
 * Pull the numeric listing id out of an Etsy URL.
 * Matches the `/listing/<digits>` segment in any Etsy URL form.
 * Returns null when there's no listing id.
 */
export function extractListingId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/listing\/(\d+)/);
  return match ? match[1] : null;
}

const asString = (v: unknown): string => (typeof v === "string" ? v : "");

/**
 * Map the Etsy Open API v3 listing object (with `?includes=Images`) to our
 * form fields. Defensive about shape — never throws on missing fields.
 *
 * Note: the v3 single-listing endpoint exposes only `taxonomy_id` (a number),
 * not a human-readable category path, so `category` is left blank for the user
 * to fill. Everything else maps cleanly.
 */
export function mapEtsyListing(data: unknown): EtsyListingData {
  const obj = (data ?? {}) as Record<string, unknown>;

  const tags = Array.isArray(obj.tags)
    ? obj.tags.map(asString).map((t) => t.trim()).filter(Boolean)
    : [];

  const images = Array.isArray(obj.images) ? obj.images : [];
  const photoCount = Math.min(MAX_PHOTOS, images.length);

  return {
    title: asString(obj.title).trim(),
    description: asString(obj.description).trim(),
    tags,
    category: "", // no readable category path available from this endpoint
    photoCount,
  };
}
