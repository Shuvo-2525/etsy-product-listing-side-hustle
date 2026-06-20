import { NextResponse } from "next/server";
import type { ListingInput } from "@/lib/scoring";
import {
  buildRewritePrompt,
  parseRewriteJson,
  sanitizeRewrite,
} from "@/lib/rewrite";

// Always run this on the server at request time — never statically optimized,
// so the API key is read fresh and never reaches the client bundle.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing GEMINI_API_KEY. Add it to .env.local and restart." },
      { status: 500 }
    );
  }

  let input: ListingInput;
  try {
    input = (await req.json()) as ListingInput;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const prompt = buildRewritePrompt(input);

  let geminiText: string;
  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          // Ask Gemini for raw JSON to minimize markdown fences.
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Gemini API error:", res.status, detail);
      return NextResponse.json(
        { error: "The AI service returned an error. Please try again." },
        { status: 502 }
      );
    }

    const data = await res.json();
    geminiText =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p?.text ?? "")
        .join("") ?? "";

    if (!geminiText.trim()) {
      return NextResponse.json(
        { error: "The AI returned an empty response. Please try again." },
        { status: 502 }
      );
    }
  } catch (err) {
    console.error("Gemini request failed:", err);
    return NextResponse.json(
      { error: "Couldn't reach the AI service. Check your connection and try again." },
      { status: 502 }
    );
  }

  // Parse + enforce hard rules in code (never trust the model to obey limits).
  try {
    const parsed = parseRewriteJson(geminiText);
    const rewrite = sanitizeRewrite(parsed);
    return NextResponse.json(rewrite);
  } catch (err) {
    console.error("Failed to parse Gemini JSON:", err, geminiText);
    return NextResponse.json(
      { error: "Couldn't generate a clean rewrite, please try again." },
      { status: 502 }
    );
  }
}
