# Rep Range Compass

Rep Range Compass is a private, offline-first set logger for strength trainees who use double progression. It keeps the between-set decision narrow: record weight, reps, and RIR, then see whether to repeat the load or increase it next time.

Live: <https://rep-range-compass.sociobot.in>

## Who it is for

Use it when your plan looks like “3 × 8–12, add 2.5 kg after every set reaches 12” and a full workout tracker or spreadsheet gets in the way. It intentionally has one active exercise card—no exercise catalogue, social feed, coaching, nutrition, or medical metrics.

## What it does

- Logs weight, reps, and reps-in-reserve (RIR), with an explicit current-set position.
- Supports either “every set reaches the range top” or a configurable total-rep target, plus an optional minimum-RIR condition.
- Persists the progression rule, unfinished session, and completed sessions in IndexedDB.
- Gives a plain-language “repeat” or “increase” result and calculates the next weight.
- Imports and exports a documented, local CSV format. Import is validated before any rows are written.
- Installs as a PWA, precaches its shell, and reloads successfully offline after the first visit.
- Includes a genuinely useful free tier. A one-time $12 Compass Plus license unlocks full on-screen history; logging, rules, accessibility, offline use, safety copy, and CSV export are never gated.

Suggestions are configurable arithmetic, not coaching or medical advice. The app cannot evaluate technique, pain, fatigue, or readiness.

## Run locally

Requirements: Node.js 20.19+ (or 22.12+) and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. No backend or environment variables are required for the free experience.

## Test and build

```sh
npm test       # unit + Chromium end-to-end, accessibility, mobile, and offline checks
npm run build  # exact production build command; output is dist/
npm run preview
npm run verify:live-billing # production checkout + verification rate-limit contract
```

Playwright is pinned to `1.58.2`. The factory image includes its Chromium browser; elsewhere, run `npx playwright install chromium` once if needed.

`verify:live-billing` makes requests to the production Sociobot API and is intentionally separate from the deterministic local test gate. It expects checkout to redirect to the hosted payment page and an 80-request verification burst to produce HTTP 429 responses with `Retry-After`.

The static deployment root is `dist/`, with `dist/index.html` at its root. Vite copies `/privacy`, `/terms`, the manifest, icons, offline fallback, and service worker into the build. A build hook injects hashed JS/CSS names into the service-worker precache list.

## Data and billing

Training data never leaves the browser. CSV parsing is local. There are no analytics, tracking scripts, remote fonts, or runtime CDNs.

Compass Plus checkout and license verification use only the Sociobot billing API. The factory registers the product separately; this repository contains no payment-provider integration or secret. A returned `?license=` token is stored under `sb_license:rep-range-compass`, removed from the visible URL, and verified at most once per day. See [/privacy](/privacy/) and [/terms](/terms/).

## Project map

- `src/progression.ts` — progression decision arithmetic
- `src/db.ts` — IndexedDB persistence
- `src/csv.ts` — validated local import/export
- `src/license.ts` — Sociobot one-time license lifecycle
- `public/sw.js` — versioned offline shell and update behavior
- `.factory/design.md` — product-specific visual system and asset provenance
- `.factory/handoff.md` — verification record and release notes

## License

[MIT](LICENSE) © 2026 Sociobot (Param Factory).
