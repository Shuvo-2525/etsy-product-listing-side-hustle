# Etsy Listing Health Check

Paste one Etsy listing and instantly get **two** scores plus a plain-English verdict:

- **Visibility (0–100)** — will Etsy show this listing in search?
- **Conversion (0–100)** — will a visitor who lands actually buy?

The two-problem framing is the point: lots of sellers get traffic but no sales (a
conversion problem), and most existing tools only check SEO/visibility.

## Tech stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- No database, no auth, no AI — fully client-side, single page

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Project structure

```
.
├── app/
│   ├── globals.css        # Tailwind + base styles
│   ├── layout.tsx         # Root layout + metadata
│   └── page.tsx           # Single page: input form + results (client component)
├── components/
│   ├── IssueCard.tsx      # One issue (problem + fix), colored by severity
│   ├── Results.tsx        # Score circles, verdict banner, grouped issue lists
│   └── ScoreCircle.tsx    # Animated SVG score ring, colored by grade
├── lib/
│   └── scoring.ts         # Pure, deterministic scoring engine (no React/IO)
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.ts
└── tsconfig.json
```

## Scoring

All logic lives in [`lib/scoring.ts`](lib/scoring.ts) as a single pure function:

```ts
scoreListing(input: ListingInput): ScoringResult
```

It is deliberately free of any framework/IO code so it can be reused later (API
route, batch tool, tests). Grades: 85+ = A, 70–84 = B, 50–69 = C, below 50 = D.
# etsy-product-listing-side-hustle
