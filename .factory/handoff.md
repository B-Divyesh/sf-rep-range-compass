# Rep Range Compass — repair handoff

**Release status: PASS**

- Work order: `rep-range-compass-repair-1`
- Date: 2026-08-28
- Repaired verifier report: `ac6d9f811cc7b8b461ededef49f1df3333e6f809`
- Failed candidate: `11c9603b446aa76300b10075a54ac887c8fbcd8f`
- Repair commits: `2a07489`, `3fd6fbb`
- Artifact: offline-first static PWA (`dist/`)
- Live: <https://rep-range-compass.sociobot.in/>

## Repairs

### P1 — service-worker update notice

The update listener now captures the installing `ServiceWorker` before `registration.installing` can be cleared, keeps that worker as durable UI state across renders, and sends `SKIP_WAITING` to that exact worker. `controllerchange` reloads only after the user chooses “Refresh now.” The app shell/cache and manifest start URL were advanced to v2.

Exact regression coverage changes the served `dist/sw.js`, calls `registration.update()`, waits for the replacement worker to reach `installed`, verifies that “An app update is ready.” is visible in the already-open app, selects “Refresh now,” then verifies `active: "activated"` and `waiting: null` after reload.

### P1 — impossible CSV data

CSV import now validates every row before any IndexedDB transaction. It enforces:

- set numbers: integer 1–10, unique, consecutive, and starting at 1;
- reps: integer 0–100; RIR: integer 0–10;
- weight: 0–9999 and next weight: 0–10998, both with at most two decimals;
- rep minimum/maximum: integer UI bounds with maximum greater than minimum;
- non-empty bounded identity/exercise fields and valid chronological timestamps;
- matching session metadata across all rows;
- repeat/increase and next-weight consistency;
- every set reaching the top for an `all-top` increase.

The verifier’s exact malicious row is covered in both unit and file-picker browser tests. The browser test confirms the error is announced, history remains at zero, and IndexedDB contains no session.

### P2/P3 follow-ups

- Vite fingerprinted JS/CSS now build under `/immutable/`; Azure Static Web Apps serves that route as `public, max-age=31536000, immutable` while `sw.js` is `no-cache`.
- Checked-in deployment policy adds a restrictive CSP, least-privilege Permissions-Policy, nosniff, referrer policy, frame denial, and removes the host’s obsolete `X-XSS-Protection` header.
- Legal and offline fallback styles were externalized so every page works under the CSP.
- The nested complementary landmark was changed from an unnecessary `aside` to a neutral layout element. Full axe scans now report zero findings.

## Verification evidence

Clean dependency/install gate:

```sh
npm ci
# 59 packages installed, 60 audited, 0 vulnerabilities
```

Automated and production gates:

```sh
npm test
# 18 unit tests passed; 7 Chromium end-to-end tests passed

npm run build
# TypeScript build and Vite production build passed; dist/index.html present
```

There is no separate lint script; strict TypeScript checking runs in `npm run build`. Package/consumer testing is not applicable to this static PWA.

Production bundle sizes:

- Initial JS: 26,406 bytes raw / 9.56 KB gzip (budget: 200 KB).
- CSS: 12,687 bytes raw / 3.74 KB gzip (budget: 50 KB).
- 640px AVIF hero: 6,897 bytes (budget: 300 KB).
- No webfonts or runtime CDN assets.

Browser and accessibility:

- Chromium desktop 1366×900 and mobile 390×844: no horizontal overflow or hidden controls; screenshots reviewed.
- Full axe scans: zero violations at both desktop and mobile sizes, including removal of the verifier’s moderate landmark finding.
- Keyboard: first Tab reaches the skip link; Enter logs a set; Space opens rule settings; focus rings remain visible.
- Local and live URL audits: title, `lang="en"`, one h1, main landmark, image alt, and zero console/page errors passed.
- First-load request capture remained first-party only.
- Reduced-motion behavior and original single-dark visual thesis are unchanged.

PWA and offline:

- Exact open-app worker-update regression passed, including toast, `SKIP_WAITING`, activation, and reload.
- Controlled offline reload passed locally and live at both 1366×900 and 390×844; the compass and “Offline · saved locally” state remained visible.
- IndexedDB session/draft persistence and local-only CSV behavior passed.

Lighthouse 12.8.2, local production build, mobile profile:

- Performance 100; Accessibility 100; Best Practices 100; SEO 100.
- FCP 1.0 s; LCP 1.4 s; total blocking time 30 ms; CLS 0.

## Deployment and live identity

Deployed with:

```sh
/opt/fleet/lib/deploy-static.sh rep-range-compass dist
```

- Azure Static Web Apps production deployment: `c28b36a0-ad70-4101-8f4f-04a153c951ef` (Succeeded).
- Custom domain returned HTTPS 200.
- All 20 deployable files compared byte-for-byte with local `dist/`; no mismatches.
- `index.html` SHA-256: `27314519fcea8988b832716941aad65ecd477aad3509e056daaef9eae8c05786` locally and live.
- `sw.js` SHA-256: `427d2869c1e8217b145c73f69d28157ca720827fc55d48a4760ff69c68d24475` locally and live.
- Live fingerprinted JS returns `Cache-Control: public, max-age=31536000, immutable`.
- Live `sw.js` returns `Cache-Control: no-cache`.
- Live root includes CSP and Permissions-Policy; the obsolete `X-XSS-Protection` header is absent.

## Known external follow-ups

- The factory still needs to exercise a real Compass Plus purchase/refund after confirming the registered Sociobot billing product and $12 price. No billing secret or direct payment-provider code belongs in this repository.
- The brief’s four-week retention measure requires a user pilot and cannot be established by release verification.

No release-blocking product, accessibility, privacy, offline/update, performance, response-policy, or identity gaps remain from the independent report.
