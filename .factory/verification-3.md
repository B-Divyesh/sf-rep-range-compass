# Independent verification 3 — PASS

**Work order:** `rep-range-compass-verify-3`
**Candidate:** `c0f5274e0541817ed9a21994e85912c2214bf204`
**Live URL:** <https://rep-range-compass.sociobot.in/>
**Verified:** 2026-08-28 UTC

## Verdict

**PASS — candidate is release-ready.** Fresh local and live evidence confirms the repaired PWA meets the researched brief: it gives one local-first exercise card a clear repeat-or-increase decision, keeps training history in IndexedDB, provides validated local CSV export/import, works offline after first use, and states that its suggestions are configurable arithmetic rather than coaching or medical advice.

No P0, P1, P2, or P3 defects were found. The only non-release follow-up is the brief's four-week pilot metric, which cannot be proven in a one-time technical verification.

## Clean candidate gate

The workspace began clean at the requested SHA. A clean dependency install and every repository-provided check passed:

```text
npm ci
59 packages added; 60 audited; 0 vulnerabilities

npm test
18 Vitest unit tests passed
10 Chromium end-to-end tests passed

npm run build
tsc -b && vite build passed; dist/ produced
```

There is no separate lint script. TypeScript checking is included in `npm run build`. This is a static PWA, so package-consumer, server concurrency/persistence, health endpoint, and sign-in-provider checks do not apply.

Built assets meet the static-product budgets: JavaScript is 26,534 bytes raw / 9,590 bytes gzip (≤200 KB), CSS is 13,141 bytes raw / 3,820 bytes gzip (≤50 KB), and the mobile AVIF hero is 6,897 bytes (≤300 KB). There are no webfonts.

Fresh Lighthouse 12.8.2 mobile results for the live site were Performance **99**, Accessibility **100**, Best Practices **100**, and SEO **100**; FCP 0.9 s, LCP 0.9 s, TBT 90 ms, CLS 0.

## Product and recovery evidence

Fresh Chromium testing at <https://rep-range-compass.sociobot.in/> passed with zero console errors, page errors, or unsolicited cross-origin requests:

- Default 3 × 8–12 all-top flow at 40 kg, 12/12/12, 2 RIR: **Increase to 42.5 kg**.
- Boundary repeat: 12/12/11: **Repeat 40 kg**.
- Configurable total-reps rule: 10/10/10 against a 30-rep target repeated when one set had 1 RIR below a 2-RIR floor, then increased when all three had 2 RIR.
- Invalid equal/inverted rule endpoints announced the actionable range error and accepted a corrected rule immediately.
- Invalid CSV was rejected before any write; session count remained unchanged. A CSV export then survived confirmed clear-all and a valid local import round trip, and persisted after reload.
- Data persisted through reload in IndexedDB. Empty state, status feedback, confirmed destructive clear, and legal routes were exercised.

## PWA, responsiveness, accessibility, and privacy

- Desktop and 390 × 844 mobile passed with no horizontal overflow. At 200% text, the supplied regression test confirms the page still fits and every visible link is at least 44 × 44 CSS px.
- Keyboard-only smoke test passed: the first Tab focuses the visible skip link, Enter logs a set, and Space opens the native rule disclosure. The focus indicator is visibly styled.
- `prefers-reduced-motion: reduce` reduced cue transitions to 0.01 ms; no looping or flashing motion was observed.
- Axe-core scans of live desktop, live 390px mobile, `/privacy/`, and `/terms/` had zero violations, therefore zero serious/critical findings.
- PWA update application and controlled offline reload are covered by the passing E2E suite. Independently, after worker control a live 390px page reloaded offline with the full compass and `Offline · saved locally` status.
- A fresh first load made only same-origin requests. Training data/CSV processing stay local; static inspection found no analytics, trackers, remote scripts, or CDN fonts. The only optional external path is the documented Sociobot license checkout/verification after the user supplies a license.

## Live deployment, policy, and billing evidence

The live `index.html` and `sw.js` SHA-256 values exactly matched this candidate build:

```text
index.html  2934af8bf4a37adc459d8bcaa3ec48099eb825e48c0fccb5a8ea87d523bc5acc
sw.js       27e9d8b5df3552876f158179d0befdc8a9975596025ab6b4d20313c7e17cc0b4
```

All 21 user-served build artifacts matched byte-for-byte. `staticwebapp.config.json` is a host control file and correctly returns the platform's 404 rather than being publicly served; its intended CSP, headers, and cache rules were verified from live responses.

- Root: HTTPS 200 with HSTS, CSP, restrictive Permissions-Policy, Referrer-Policy, nosniff, and frame denial.
- Hashed assets: `public, max-age=31536000, immutable`; `sw.js`: `no-cache`; manifest: one-hour cache policy.
- Manifest has standalone display, a versioned start URL, matching theme/background colors, 192/512 icons, and a maskable icon. Chromium loaded it without error.
- `npm run verify:live-billing` passed: checkout **303**, invalid-license verification **200** with expected CORS/verdict, and **68/80** concurrent verification calls were limited.
- An independent 64-request concurrent verification probe accepted 30 and returned **429** for 34; every limited response supplied `Retry-After` (1–3 seconds). The observed burst threshold is 30 accepted requests before limiting.

## Remaining follow-up

Run the four-week pilot described in the brief to measure actual eight-session retention and whether trainees can answer repeat-or-increase without a separate note. This is product-outcome validation, not a release blocker for the implemented PWA.
