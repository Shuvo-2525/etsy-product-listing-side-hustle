import { NextResponse } from "next/server";
import { extractListingId, mapEtsyListing } from "@/lib/etsy";

// Run server-side at request time so the Etsy API key never reaches the client.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const apiKey = process.env.ETSY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing ETSY_API_KEY. Add it to .env.local and restart." },
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
      headers: { "x-api-key": apiKey },
    });

    if (res.status === 404) {
      return NextResponse.json(
        { error: "Listing not found — it may be sold out, expired, or private." },
        { status: 404 }
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
