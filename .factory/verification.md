# Independent verification — FAIL

**Work order:** `rep-range-compass-verify-1`  
**Candidate:** `11c9603b446aa76300b10075a54ac887c8fbcd8f` (`docs: record verification and release handoff`)  
**Live URL:** <https://rep-range-compass.sociobot.in/>  
**Verified:** 2026-08-28

## Verdict

**FAIL — do not release this candidate unchanged.** The core progression flow works, and the live site is the exact candidate build, but a service-worker update reaches the waiting state without showing the required in-app update notice. CSV import also accepts data that the UI itself forbids, corrupting a local history with impossible training values.

## Release-blocking defects

### P1 — service-worker update is invisible in the open app

The PWA contract requires an in-app “update available” toast with `skipWaiting` and `clientsClaim`. I served the same built app, installed its worker, then changed only the worker response body and called `registration.update()`.

- The browser fetched the worker twice.
- Before update: `active: "activated"`.
- After update: `active: "activated"`, `waiting: "installed"`, `installing: null`.
- `#update-toast` remained hidden; “An app update is ready.” never became visible after 10 seconds.

The same byte-identical `sw.js` is live, so this behavior applies to production. The likely cause is the `updatefound` handler checking `registration.installing?.state` during the `statechange` callback, after `registration.installing` has been cleared. A user only sees the toast after a later reload, not when the update becomes available.

### P1 — CSV import accepts impossible rep-range data

The import claims to validate the entire file, but it validates only CSV shape, enums, finite numbers, and duplicate set numbers. Through the normal file picker, this one-row CSV was accepted with “Imported 1 sessions” and persisted to IndexedDB:

```csv
session_id,exercise,started_at,completed_at,weight,unit,set_number,reps,rir,rep_min,rep_max,rule,decision,next_weight
bad-session,Primary lift,2026-08-28T00:00:00.000Z,2026-08-28T00:01:00.000Z,40,kg,0,-1,99,-8,12,all-top,increase,42.5
```

The invalid `set_number` 0 was accepted (the importer then collapses it into its stored sole set), and IndexedDB persisted `reps` -1, `rir` 99, and `rep_min` -8. The normal logger rejects reps above 100 and does not permit negative reps or RIR above 10. This violates the product promise that an imported log is validated before writing and can leave users with an impossible local history.

## Other defects / release follow-up

### P2 — deployment does not use immutable caching for fingerprinted assets

The live hashed JS and CSS both return `cache-control: public, must-revalidate, max-age=30`, not a long-lived immutable policy. This misses the stated static/PWA caching policy and needlessly revalidates first-party bundles. This is deployment configuration, not a source mismatch.

### P2 — production is missing CSP and Permissions-Policy

Live responses include HSTS, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, and DNS-prefetch disabled, but no `Content-Security-Policy` or `Permissions-Policy`. The obsolete `X-XSS-Protection` header is present. Add an appropriate static-site CSP and least-privilege permissions policy at the hosting layer.

### P3 — one moderate axe landmark finding

Full axe scans found no serious or critical issues. They did report `landmark-complementary-is-top-level` (moderate) on the app because the `aside` landmark is nested in the workbench section. Legal pages had no axe findings.

## Evidence that passed

### Clean candidate build

Performed in a fresh detached clone of the requested SHA:

```sh
npm ci
npm test
npm run build
```

- `npm ci`: 60 packages audited; 0 vulnerabilities.
- `npm test`: 5 unit assertions and 4 Chromium E2E tests passed.
- `npm run build`: passed (`tsc -b && vite build`) and produced `dist/`.
- No separate lint script exists; TypeScript checking is part of the required build.
- Built initial JS: 24,499 bytes raw / 8.98 KB gzip; CSS: 12,687 bytes raw / 3.74 KB gzip; both meet the 200 KB / 50 KB budgets. There are no webfonts. The 640px AVIF hero is 6,897 bytes.

### Product behavior

- Default all-sets-top flow: three sets at 40 kg × 12, RIR 2 produced **Increase to 42.5 kg**; the next weight survived reload in IndexedDB.
- Boundary/repeat flow: one 11-rep set among 12/11/12 produced **Repeat 40 kg**.
- Total-rep rule: a saved 3-set, 30-total rule with 10/10/10 produced **Increase to 42.5 kg**.
- Invalid rep range (`min=8`, `max=8`) produced the announced recovery message “The top of the rep range must be greater than the bottom.”
- `Reps=101` was blocked by native validation before any set was logged.
- A malformed multi-row CSV (`reps=nope` in row 3) was rejected before writes; a subsequent valid import succeeded, demonstrating recovery.
- Unfinished-session persistence, legal routes, explicit offline reload after service-worker control, and clear-data confirmation are covered by the supplied E2E tests; offline reload was independently repeated at 390px.

### Browser, accessibility, privacy, and layout

- Desktop 1366×900 and mobile 390×844: no horizontal overflow. The mobile layout intentionally removes the hero art and keeps the primary controls usable.
- Keyboard: the first Tab focuses the skip link; its designed focus outline is 3px. Enter activated “Log set”; Space opened the native rule disclosure. The Log button has the same visible 3px focus outline.
- Reduced-motion context was active and the reduced-motion stylesheet applies; no looping media was observed.
- axe-core full scans: no serious/critical findings at desktop or 390px; see P3 for the one moderate finding.
- No console errors or page errors on local or live load.
- First-load browser requests on both live desktop and mobile stayed first-party only: document, local JS/CSS, and responsive local AVIF. Static inspection found no analytics, tracking, CDN fonts, or remote scripts. The only runtime external request path is the documented Sociobot license verification after a user supplies a license token.
- Training entries persist in IndexedDB; CSV processing is local. Privacy and terms pages describe this accurately.

### Live deployment identity and response policy

`https://rep-range-compass.sociobot.in/` returned HTTP 200 and was compared with the candidate `dist/`. SHA-256 matched for `index.html`, `sw.js`, privacy, terms, manifest, hashed JS/CSS, all icons, and all hero derivatives. The deployment therefore matches `11c9603b446aa76300b10075a54ac887c8fbcd8f`; the PWA defect is not a stale-deployment issue.

Root, legal, and service-worker responses were HTTP/2 200 with HSTS, referrer policy, nosniff, and `max-age=30`; the asset-cache and missing-policy findings are recorded above.

## Required next steps

1. Fix the update listener so an installed waiting worker immediately displays the update toast, then rerun the worker-update scenario.
2. Validate every numeric and cross-field import invariant before any import transaction: positive/allowed set numbers, UI-consistent rep/RIR bounds, valid non-negative weights, valid rep ranges, and internally consistent sessions.
3. Set immutable, long-lived caching for content-hashed assets and add CSP/Permissions-Policy at the deployment layer.
4. Rerun this verification and update the report only after all P1 defects pass.
