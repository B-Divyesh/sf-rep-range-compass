# Independent verification 2 — FAIL

**Work order:** `rep-range-compass-verify-2`  
**Candidate:** `0d4ec4b068abe09e5aeba90c7a2509e0245540f7`  
**Live URL:** <https://rep-range-compass.sociobot.in/>  
**Verified:** 2026-08-28 UTC

## Verdict

**FAIL — do not release this candidate unchanged.** The repaired CSV validation and service-worker update flow pass, and the live static files exactly match the candidate build. However, the advertised paid unlock cannot be purchased, a fabricated token unlocks Plus while offline without a valid cached verdict, and the Sociobot verification endpoint does not enforce the required burst rate limit. Two mobile accessibility requirements also fail.

## Release-blocking defects

### P1 — “Buy Compass Plus” leads to a disabled product

The rendered buy link correctly points to the required Sociobot URL, but that live endpoint is not enabled:

```text
GET https://api.sociobot.in/api/v1/products/rep-range-compass/checkout
HTTP/2 404
{"error":"enabled factory product","status":404}
```

The app advertises “Compass Plus · $12 once,” but a user cannot begin checkout. This is a failed end-to-end paid flow, not a stale product deployment: the link in the live app is byte-identical to the candidate.

### P1 — an arbitrary unverified token unlocks Plus while offline

On a fresh live browser profile, I installed the worker, reloaded under service-worker control, went offline, pasted `not-a-real-license`, and selected **Restore**. The app then showed:

```text
Could not verify while offline. Saved for the next connection.
✓ This device is unlocked.
One-time unlock — Compass Plus active
```

`localStorage["sb_license:rep-range-compass"]` contained the fabricated token. There was no prior cached valid verdict. The paid-unlock contract permits optimistic offline use from a cached verdict; it does not permit a never-verified token to unlock paid history. The current behavior makes the paywall trivially bypassable.

### P1 — license verification has no observable rate limit

I sent two rapid concurrent bursts to the product’s real GET verification endpoint using an invalid token and the production Origin header:

- Burst 1: 80 requests in 642 ms — 80 HTTP 200, 0 HTTP 429.
- Burst 2: 220 requests in 1.623 s — 220 HTTP 200, 0 HTTP 429.
- No response included `Retry-After`; no transport errors occurred.

The observed threshold is therefore **not reached through 300 rapid requests**. A separate ordinary request also returned 200 with `{ "valid": false, "reason": "invalid" }` and correct CORS. This fails the explicit requirement that a burst start returning 429 with `Retry-After`.

## Other defects

### P2 — 200% text causes horizontal overflow at 390 px

At the required 390 px mobile viewport, default text fits exactly (`scrollWidth=390`, `clientWidth=390`). After setting the root text size to 200%, the document becomes 413 px wide. The footer grid is the source: the legal navigation and provenance extend to `x=413.14`. This fails the accessibility requirement that text resize to 200% without loss or two-dimensional scrolling.

### P2 — several mobile click targets are below 44 px

Measured visible target boxes at 390 px include:

- Home/brand link: 141×42 px.
- Inline terms/privacy links in the unlock copy: 36×15 px and 44×15 px.
- Footer Privacy/Terms links: 46×19 px and 38×19 px.

Primary controls, form fields, disclosure summaries, CSV actions, and the clear-data action are 44–78 px high. The links above miss the contract’s 44×44 CSS-pixel target minimum.

## Evidence that passed

### Clean checkout, tests, and production build

The supplied workspace was clean at the requested SHA, and `origin/main` resolved to the same SHA.

```sh
npm ci
# 59 packages installed; 60 audited; 0 vulnerabilities

npm test
# 18 unit tests passed
# 7 Chromium end-to-end tests passed

npm run build
# tsc -b && vite build passed; dist/ produced
```

There is no separate lint script. Strict TypeScript checking is part of `npm run build`. This is a static PWA, so library packing, backend concurrency/persistence, health/build identity, and sign-in-provider checks are not applicable.

Production budgets:

- JS: 26,406 bytes raw / 9,575 bytes gzip (budget 200 KB).
- CSS: 12,687 bytes raw / 3,743 bytes gzip (budget 50 KB).
- Mobile AVIF hero: 6,897 bytes (budget 300 KB).
- No webfonts, runtime CDN scripts, analytics, telemetry, or ad requests.

### Core product and recovery paths

- Default all-top rule: 40 kg × 12/12/12 at 2 RIR produced **Increase to 42.5 kg** and survived reload in IndexedDB.
- Repeat boundary: 12/11/12 produced **Repeat 40 kg**.
- Total-rep rule: 10/10/10 against a 30-rep target increased; the same reps with one set below a 2-RIR floor repeated.
- Upper numeric boundary in a fresh profile: one set, 100 reps, 9,999 kg, +999 kg produced **Increase to 10,998 kg**.
- Reps `101` and `-1` were blocked without advancing the set. Equal rep-range endpoints produced the announced “top ... must be greater” error and allowed recovery.
- An unfinished draft survived reload. Both cancel and confirm paths for discarding/clearing worked.
- Empty export produced a useful status. A valid CSV round-trip restored the session. A mixed valid/invalid file made no partial write.
- The prior verifier’s malicious row (`set_number=0`, `reps=-1`, `rir=99`, `rep_min=-8`) was rejected at row 2 and left history unchanged.
- Six imported sessions showed the newest five in the free UI while free CSV export retained all six.
- A returned license query value was stored under the documented key, removed from the URL, sent only to the correct Sociobot verify endpoint, and a mocked valid verdict was reused on reload without a second request. Real invalid tokens reconciled to locked with clear recovery copy.

### PWA and offline behavior

- The worker-update regression changed the served `sw.js` while an app was open, observed the visible “An app update is ready” toast, selected **Refresh now**, and ended with an activated worker and no waiting worker.
- Controlled offline reload passed locally and live at 390 px; the full compass and “Offline · saved locally” state remained usable. The supplied desktop offline regression also passed.
- Live worker state: controller `/sw.js`, active `activated`, waiting `null`, cache `rep-range-compass-v2`.
- Chromium parsed the live and local manifests with no errors. Manifest fields include standalone display, a versioned start URL, matching theme/background colors, 192/512 icons, and a 512 maskable icon. Actual PNG dimensions match declarations.

### Accessibility, layout, and browser quality

- Full axe-core scans found zero violations on desktop, 390 px mobile, `/privacy/`, `/terms/`, and `/offline.html`; therefore zero serious/critical findings.
- Default desktop (1366×900) and mobile (390×844) layouts were visually reviewed; default mobile had no horizontal overflow and intentionally removed the hero artwork.
- Keyboard: first Tab focused the skip link; its focus outline computed to 3 px amber; Enter activated logging; Space opened rule settings; no trap was found.
- Reduced motion computed to `0.01ms` for animation/transition and `scroll-behavior: auto`.
- The factory `verify-url.sh` passed local and live: correct title, `lang=en`, one h1, main landmark, alt text, and no console/page errors. The script’s four “unlabeled” buttons are closed-disclosure descendants whose `innerText` is suppressed; axe and accessible-name queries found their labels.
- No console errors or page errors occurred in custom local/live flows. Clean first load requested only the same-origin document, hashed JS/CSS, and 640 px AVIF.

### Lighthouse and response policy

Lighthouse 12.8.2 mobile profile:

| Target | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Local production preview | 94 | 100 | 100 | 100 | 1.0 s | 1.4 s | 290 ms | 0 |
| Live | 98 | 100 | 100 | 100 | 0.9 s | 1.3 s | 160 ms | 0 |

The live root returns HTTPS 200 with HSTS, restrictive CSP, least-privilege Permissions-Policy, `Referrer-Policy`, nosniff, and frame denial. HTTP redirects to HTTPS. Hashed JS/CSS return `public, max-age=31536000, immutable`; `sw.js` returns `no-cache`; the manifest returns a one-hour cache policy. Chrome accepted the manifest despite the host’s generic `application/octet-stream` MIME type.

### Deployment identity

All 21 served files in `dist/` (excluding the host-only `staticwebapp.config.json`) matched the live response byte-for-byte, including the source map, legal/offline pages, manifest, worker, icons, and responsive artwork. There were zero mismatches.

```text
index.html  27314519fcea8988b832716941aad65ecd477aad3509e056daaef9eae8c05786
sw.js       427d2869c1e8217b145c73f69d28157ca720827fc55d48a4760ff69c68d24475
JS          8f77f1f5fcd639a08795369ebad5c82b9bfbb04b62a4fb76e1db82737d4af50e
CSS         ae077524706fb03d0924068be93378f74f985d8416b211a8ce84ff1358d4313e
```

## Required next steps

1. Enable/register the production `rep-range-compass` billing product and verify checkout, return URL, purchase, restore, refund, and revocation end to end.
2. Keep Plus locked for a newly supplied token until it verifies; offline optimism must require a cached valid verdict.
3. Add a server-side burst limit to the verification API that returns 429 and `Retry-After`, then record its threshold.
4. Reflow the mobile footer at 200% text and enlarge or pad every undersized link target to at least 44×44 px.
5. Rerun independent verification after these issues are deployed. The four-week retention success metric still requires a real pilot.
