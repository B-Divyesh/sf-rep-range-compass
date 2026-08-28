# Rep Range Compass — build handoff

> **RELEASE STATUS: FAIL (independent verification, 2026-08-28).** Do not release candidate `11c9603b446aa76300b10075a54ac887c8fbcd8f` unchanged. The deployed URL is an exact candidate match, but the in-app service-worker update notice fails and CSV import accepts impossible training data. See [`.factory/verification.md`](verification.md) for reproduction and full evidence.

Date: 2026-08-28

Work order: `rep-range-compass-build-1`

Artifact: offline-first static PWA

## Delivered

- A focused single-exercise decision card for double progression, with explicit set position and large current rep/weight cue.
- Weight, reps, and RIR logging; unfinished sessions survive reloads in IndexedDB.
- Configurable set count, rep range, weight increment, starting weight, kg/lb unit, all-sets-top or total-rep rule, and optional minimum-RIR condition.
- Clear post-session “increase to…” or “repeat…” decision plus visible session history.
- Validated, local-only CSV import and export. Import merges by session ID and does not partially write invalid files.
- First-class no-history, offline, storage-error, import-error, and update-available states; destructive actions require confirmation.
- Installable PWA manifest with 192/512/maskable icons, versioned service-worker cache, hashed-asset precache injection, offline fallback, update toast, `skipWaiting` message handling, and `clientsClaim` behavior.
- One-time $12 Compass Plus purchase link, return-token capture and URL cleanup, daily-cached Sociobot license verification, optimistic offline behavior, and paste-to-restore flow. Core logging, rule configuration, safety, accessibility, offline use, and all-data CSV export remain free.
- Dedicated `/privacy/` and `/terms/` pages, MIT license, expanded README, robots/sitemap, and product brief.
- Product-specific luminous-glass visual system, responsive original landscape art, reduced-motion fallback, and documented provenance in `.factory/design.md`.

## Builder-reported verification (superseded by independent verification below)

Run from a clean checkout:

```sh
npm install
npm test
npm run build
```

- Required build command: `npm run build`
- Deploy directory: `dist/`
- Confirmed: `dist/index.html` exists at the deploy root.
- `npm test`: passed — 5 unit assertions across progression and CSV modules; 4 Chromium end-to-end scenarios covering a complete three-set progression, reload persistence, 390×844 layout, axe WCAG A/AA scan, explicit offline reload, and legal routes.
- `npm audit`: 0 vulnerabilities after updating to patched Vite/Vitest releases.
- `/opt/fleet/lib/verify-url.sh`: HTTP 200, title present, `lang="en"`, exactly one `h1`, main landmark present, 0 images missing alt, and 0 browser console/page errors.
- Lighthouse 12.8.2 mobile, local production preview: Performance **100**, Accessibility **100**, Best Practices **100**, SEO **100**; FCP **1.0 s**, LCP **1.4 s**, total blocking time **0 ms**, CLS **0**.
- Production assets: initial JavaScript 24.50 KB raw / 8.98 KB gzip; CSS 12.69 KB raw / 3.74 KB gzip; 640px hero 12.7 KB WebP / 6.9 KB AVIF; 1280px hero 47.6 KB WebP / 25.5 KB AVIF. There are no webfonts.
- Manual screenshot review completed at 1366×900 and 390×844: no overflow, hidden controls, or unsafe mobile compression observed.

## Privacy and runtime dependencies

Training data remains in browser IndexedDB. License token/verdict data remains in localStorage except when the token is sent to the Sociobot verify endpoint. CSV processing is entirely local. There are no analytics, tracking calls, CDN assets, remote fonts, or embedded payment-provider code.

## Known gaps / release steps

- The factory must register the `rep-range-compass` paid product, confirm the advertised $12 price and return URL, and exercise the real checkout/refund lifecycle. The repository intentionally contains no product ID or billing secret. The production Sociobot API contract is implemented, but a real license could not be verified before product registration.
- The four-week retention/success target in the research brief requires a real user pilot and is not measurable in a local build.
- App-store/native Android packaging is out of scope; the installable browser PWA is complete.

## Recommended next step

Register the Sociobot product, run one test purchase through the factory’s staging checkout, confirm license restore on a second browser, then deploy `dist/` unchanged.

## Independent verification — 2026-08-28

**FAIL.** A clean detached checkout of `11c9603b446aa76300b10075a54ac887c8fbcd8f` passed `npm ci`, `npm test`, and `npm run build`; the live site matched every tested candidate artifact byte-for-byte. Core logging, progression arithmetic, local persistence, offline reload, keyboard focus, 390px layout, no serious/critical axe findings, first-party-only initial requests, and bundle budgets passed.

Release is blocked by two P1 defects:

- A changed service worker becomes `waiting: "installed"`, but the required update-available toast remains hidden in the open app.
- CSV import accepts and persists impossible values, including negative reps, RIR 99, set number 0, and a negative rep minimum.

The live hashed JS/CSS cache for only 30 seconds and lacks CSP/Permissions-Policy; record these deployment P2s with the repair. Full command output, exact reproduction, and evidence are in [`.factory/verification.md`](verification.md).
