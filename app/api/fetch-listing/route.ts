import { NextResponse } from "next/server";
import {
  extractListingId,
  mapEtsyListing,
  buildEtsyAuthHeader,
  hasSharedSecret,
} from "@/lib/etsy";

// Run server-side at request time so the Etsy API key never reaches the client.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Etsy requires `x-api-key: <keystring>:<shared_secret>` on every request.
  // Accept the secret either bundled into ETSY_API_KEY (with a ":") or as a
  // separate ETSY_SHARED_SECRET.
  const apiKeyHeader = buildEtsyAuthHeader(
    process.env.ETSY_API_KEY,
    process.env.ETSY_SHARED_SECRET
  );
  if (!apiKeyHeader) {
    return NextResponse.json(
      { error: "Server is missing ETSY_API_KEY. Add it to .env.local and restart." },
      { status: 500 }
    );
  }
  if (!hasSharedSecret(apiKeyHeader)) {
    return NextResponse.json(
      {
        error:
          "Etsy needs your shared secret too. Set ETSY_SHARED_SECRET in .env.local (or store ETSY_API_KEY as \"<keystring>:<shared_secret>\") and restart.",
      },
      { status: 500 }
    );
  }

  let url: string;
  try {
    const body = (await req.json()) as { url?: string };
    url = (body?.url ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const listingId = extractListingId(url);
  if (!listingId) {
    return NextResponse.json(
      {
        error:
          "That doesn't look like an Etsy listing URL. It should contain \"/listing/<number>\".",
      },
      { status: 400 }
    );
  }

  const etsyUrl = `https://openapi.etsy.com/v3/application/listings/${listingId}?includes=Images`;

  let data: unknown;
  try {
    const res = await fetch(etsyUrl, {
      headers: { "x-api-key": apiKeyHeader },
    });

    if (res.status === 404) {
      return NextResponse.json(
        { error: "Listing not found — it may be sold out, expired, or private." },
        { status: 404 }
      );
    }

    if (res.status === 401 || res.status === 403) {
      const detail = await res.text().catch(() => "");
      console.error("Etsy auth error:", res.status, detail);
      return NextResponse.json(
        {
          error:
            "Etsy rejected the API credentials. Check that ETSY_API_KEY (keystring) and ETSY_SHARED_SECRET are correct and the app is active.",
        },
        { status: 502 }
      );
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Etsy API error:", res.status, detail);
      return NextResponse.json(
        { error: "Couldn't fetch this listing from Etsy. Please try again." },
        { status: 502 }
      );
    }

    data = await res.json();
  } catch (err) {
    console.error("Etsy request failed:", err);
    return NextResponse.json(
      { error: "Couldn't reach Etsy. Check your connection and try again." },
      { status: 502 }
    );
  }

  return NextResponse.json(mapEtsyListing(data));
}
