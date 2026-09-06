# Rep Range Compass

Rep Range Compass is a private offline set log for strength trainees using double progression. Log weight, reps, and RIR, then see whether to repeat or increase the weight next session.

Live: <https://rep-range-compass.sociobot.in> · Sample: <https://rep-range-compass.sociobot.in/demo>

## Start with the sample

Select **Try it with sample data** on the landing page or open `/demo`. The demo opens six realistic Barbell bench press sessions and an earned next weight. Its IndexedDB database is `demo:rep-range-compass`; the real app uses `rep-range-compass`. **Reset demo** restores the sample. **Start for real** clears the demo database and opens an empty real log. See [.factory/demo.md](.factory/demo.md) for the isolation details.

## What it does

- Logs weight, reps, and RIR for each set.
- Applies an all-sets-top or total-rep rule with an optional RIR floor.
- Keeps the local log after reload and shows a repeat-or-increase result with the next weight.
- Exports the complete log as CSV and rejects invalid CSV before changing it.
- Provides an installable PWA shell and reloads offline after the first visit.
- Keeps training data in the browser. There are no analytics, tracking scripts, remote fonts, or runtime CDNs.

Suggestions are configurable arithmetic, not coaching or medical advice. The app cannot assess technique, pain, fatigue, or readiness.

## Compass Plus

The free core includes logging, progression rules, offline use, accessibility, safety copy, and CSV export. Compass Plus costs **$12 once** and reveals all past sessions on a verified device. Checkout and license verification use the Sociobot billing API; the app contains no payment-provider secret. A returned license token is stored locally, removed from the URL, and verified at most once per day. See [/privacy](/privacy/) and [/terms](/terms/).

## Run locally

Requirements: Node.js 20.19+ (or 22.12+) and npm. A fresh checkout needs no environment variables.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. The free experience works without a backend.

## Test and build

```sh
npm test
npm run build
npm run preview
npm run verify:live-billing
```

Run every claim command in [.factory/claims.json](.factory/claims.json) from the same clean setup. Each command starts a production preview and exercises only the demo entry point with browser-controlled billing fixtures. `verify:live-billing` is separate because it checks the public Sociobot checkout and verification boundary.

Playwright is pinned to `1.58.2`. The factory image includes Chromium; elsewhere run `npx playwright install chromium` once.

The production output is `dist/`, with `dist/index.html` at its root. The service worker precaches the app shell, legal pages, sample route, and hashed build assets. `public/staticwebapp.config.json` supplies the security headers, cache policy, SPA fallback, and styled HTTP 404 response.

## Project map

- `src/progression.ts` — progression arithmetic
- `src/db.ts` — real and demo IndexedDB stores
- `src/csv.ts` — validated local CSV import/export
- `src/license.ts` — Sociobot one-time license lifecycle
- `public/sw.js` — offline shell and update behavior
- `.factory/claims.json` — public claims and their exact commands
- `.factory/design.md` — product visual system and asset provenance

## License

[MIT](LICENSE) © 2026 Sociobot (Param Factory).
