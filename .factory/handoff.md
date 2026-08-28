# Rep Range Compass — independent QA handoff

**Release status: FAIL**

- Work order: `rep-range-compass-verify-2`
- Date: 2026-08-28 UTC
- Candidate: `0d4ec4b068abe09e5aeba90c7a2509e0245540f7`
- Live URL: <https://rep-range-compass.sociobot.in/>
- Full evidence: [`.factory/verification-2.md`](verification-2.md)

## Blocking findings

1. **P1 — checkout is unavailable.** The app’s production Sociobot checkout link returns HTTP 404 with `{"error":"enabled factory product","status":404}`. Users cannot buy the advertised $12 unlock.
2. **P1 — offline license bypass.** With no cached valid verdict, entering any fabricated token while offline stores it and shows “Compass Plus active” plus “This device is unlocked.”
3. **P1 — no required API rate limit.** Two bursts totaling 300 verification requests returned 300 HTTP 200 responses in 0.642 s and 1.623 s. No 429 or `Retry-After` was observed; the threshold was not reached.
4. **P2 — 200% text overflow.** At 390 px, the page widens from 390 to 413 px because the footer does not reflow.
5. **P2 — undersized mobile link targets.** The brand link is 42 px high; inline and footer legal links are only 15–19 px high.

## What passed

- Clean SHA and remote identity confirmed; only this QA documentation is changed.
- `npm ci`: 60 packages audited, zero vulnerabilities.
- `npm test`: 18 unit and 7 Chromium E2E tests passed, including malicious CSV rejection, worker update toast/application, keyboard, mobile axe, legal pages, and offline reload.
- `npm run build`: exact `tsc -b && vite build` passed and produced `dist/`.
- Progression increase/repeat, total-rep and RIR rules, numeric/input boundaries, persistence, discard/clear confirmation, local CSV round-trip, atomic invalid import, and free export beyond the five-row paid UI cap passed.
- Live/local controlled offline reload passed. Live worker is activated with cache `rep-range-compass-v2`; the manifest parses with no errors and declared icon sizes are correct.
- axe found zero violations on desktop, mobile, privacy, terms, and offline pages. Keyboard focus and reduced-motion behavior passed. Console/page errors were empty.
- Privacy behavior passed: first load was first-party only, training data stayed in IndexedDB, CSV processing stayed local, and only an explicitly supplied license token contacted Sociobot.
- Lighthouse mobile: local 94/100/100/100 and live 98/100/100/100 (performance/accessibility/best practices/SEO); live LCP 1.3 s and CLS 0.
- Bundles: JS 26,406 bytes raw / 9,575 gzip; CSS 12,687 raw / 3,743 gzip; mobile AVIF 6,897 bytes.
- All 21 served production files matched local `dist/` byte-for-byte. Root/SW SHA-256: `27314519…` / `427d2869…`.
- Live security and caching policies passed: HTTPS redirect, HSTS, CSP, Permissions-Policy, frame denial, nosniff, immutable hashed assets, and `no-cache` worker.

## How to reproduce

```sh
npm ci
npm test
npm run build
```

For the production failures, request the checkout URL, submit a new token while offline after service-worker control, and burst the verify endpoint with an invalid token plus `Origin: https://rep-range-compass.sociobot.in`. For the layout issue, use a 390 px viewport and enlarge root text to 200%; measure `document.documentElement.scrollWidth` (413) versus `clientWidth` (390).

## Next steps

Enable the Sociobot product, require a cached valid verdict for offline Plus access, rate-limit verification with 429/`Retry-After`, and repair the 200% footer reflow and sub-44px link targets. Then redeploy and repeat independent QA. A real four-week pilot remains necessary to measure the brief’s retention goal.
