# Review: decide whether to repeat or increase

**Work order:** `rep-range-compass-review-1`
**Reviewed:** 2026-09-06 UTC
**Live URL:** <https://rep-range-compass.sociobot.in/>
**Implementation candidate:** `71cb62881f0228b17d2c42d9522998fec50de393` (`fix: close offline unlock and mobile a11y gaps`)
**Documentation SHA:** `9ad9cfc299b2760fd9dec49661de032473bcf2e2` (`docs: record verification 3 pass`)

## Verdict: FAIL

The product has four findings and eleven untested public-claim groups. It is not a strict PASS.

## Job, audience, and first action

- **Job:** decide whether to repeat the current weight or increase it after a set session.
- **Audience:** strength trainees using double progression.
- **Actual first action before scrolling:** **Open your compass**. It scrolls to an empty logging form. There is no **Try it with sample data** action.

Fresh Chromium desktop (1366 x 900) and phone (390 x 844) visits were made with separate browser profiles. Screenshots are retained outside the repository at `/work/.evidence/live-desktop.png` and `/work/.evidence/live-phone.png`.

## Findings

### P1 — No one-click demo sandbox

The required demo does not exist. Neither fresh landing page has a `Try it with sample data` action, a persistent `Demo — sample data, nothing is saved` label, a **Reset demo** control, or **Start for real**. `/?demo=1` returns the ordinary empty app: its title is `Rep Range Compass — know your next set`, it shows `0 total`, and no demo-keyed browser storage is created. `/demo` also returns the ordinary app.

This prevents a trainee from seeing a populated progression decision in one click and prevents the required proof that a try-out cannot affect real data. The implementation has only the normal IndexedDB store; there is no documented demo namespace or `.factory/demo.md`.

**Required repair:** add a seeded, isolated `?demo=1` or `/demo` flow; show the persistent label, Reset demo, and Start for real controls; keep demo state in its own storage namespace; and add its documentation and browser tests.

### P1 — Public claims have no claims registry or claim commands

`.factory/claims.json` is absent. There are no `@claim:` test tags or declared claim commands. Under the claims contract, generic test coverage cannot substitute for a listed, demo-entry-point claim test.

Eleven public-claim groups are therefore untested by the required contract:

1. logging weight, reps, and RIR;
2. both progression rules and the RIR condition;
3. IndexedDB persistence;
4. repeat-or-increase calculation and next-weight result;
5. CSV export;
6. validated local CSV import with no partial write;
7. PWA installation and shell precache;
8. offline reload after first use;
9. training data staying on the device and absence of tracking/CDN requests;
10. the $12 Plus scope and free-feature availability; and
11. returned-license storage and daily verification behavior.

These claims appear in the landing page and/or README. The repository’s `npm test` exercises several behaviors, but no test is tagged to one claim, starts at the required demo entry point, and is declared in the required registry.

**Required repair:** create `.factory/claims.json`, list each public claim once, add one `@claim:<id>` observable test per entry using the new demo sandbox, and remove or narrow any claim that cannot be tested.

### P2 — Unknown routes are not a real 404 page

`https://rep-range-compass.sociobot.in/does-not-exist` returned HTTP 200 with the normal compass page, normal title, and normal h1. There is no `404.html` in the build and `staticwebapp.config.json` has only a navigation fallback.

A deliberate HTTP 404 would be acceptable. This is a missing required route and gives a wrong success response for a bad address.

**Required repair:** ship a styled `404.html` with a way home and configure the static host’s 404 response override without breaking valid application routes.

### P2 — The first screen does not meet the required plain-words structure

The h1 is direct enough to describe the result, but the supporting sentence does not name strength trainees or their situation. The first screen lacks the required sample action and does not show the three required plain facts: privacy, offline behavior, and price. The only visible fact pill is `Local-first`.

**Required repair:** state the audience plainly, put `Try it with sample data` first with what will appear after the click, and show concise privacy/offline/price facts beside it. Add the required `.factory/copy-audit.md`.

## Checks that passed

### Declared commands from a clean checkout

```text
npm ci                         PASS — 59 packages installed, 0 vulnerabilities
npm test                       PASS — 18 unit tests and 10 Chromium E2E tests
npm run build                  PASS — dist/ created
npm run verify:live-billing    PASS — checkout 303, invalid verify 200, 51/80 burst calls limited
```

There is no lint script. There are no claim commands because the required claims registry is missing.

### Normal, invalid, boundary, and recovery paths

Fresh phone profiles produced the following live results without console or page errors:

- Three 40 kg sets at 12 reps and 2 RIR produced **Increase to 42.5 kg**. The completed session remained after reload.
- 12, 11, and 12 reps produced **Repeat 40 kg**.
- Reps `101` was blocked by native validation: `Value must be less than or equal to 100.`
- The earlier malformed CSV row was rejected with `Row 2: set number must be a whole number from 1 to 10.` No history row was written.
- After service-worker control, a phone profile reloaded offline and showed `OFFLINE · SAVED LOCALLY` with no console errors.

### Earlier findings and their current disposition

| Earlier finding | Current disposition and evidence |
| --- | --- |
| Invisible service-worker update | Resolved. The passing `announces an installed service-worker update and applies it` E2E test modifies the worker, sees the toast, applies it, and confirms an activated worker. |
| CSV accepted impossible values | Resolved. Both `npm test` and the fresh live malformed-row import above rejected the prior bad row before writing. |
| Hashed assets were not immutable | Resolved. Live JS returns `Cache-Control: public, max-age=31536000, immutable`. |
| CSP and Permissions-Policy missing | Resolved. Both are present on the live root response; CSP permits only self plus the documented Sociobot billing connection. |
| Nested complementary landmark | Resolved. Live axe-core scans on fresh desktop and phone contexts reported zero violations. |
| Checkout disabled | Resolved at the available public boundary. `npm run verify:live-billing` received checkout HTTP 303. A paid purchase/refund cannot be performed without a purchaser transaction. |
| New unverified token unlocked while offline | Resolved by the passing E2E regression: a never-verified restored token stays locked while offline and has no cached verdict. |
| Verify endpoint lacked a burst limit | Resolved at the public boundary. The live 80-request contract observed 51 HTTP 429 responses; the command requires `Retry-After` on every limited response. |
| 200% mobile overflow and undersized links | Resolved by the passing 390px / 200% E2E regression, which measures no overflow and no visible link smaller than 44px. |

### Browser quality, privacy, and site pages

- Live desktop and phone pages have `lang=en`, the expected title, one h1, a main landmark, skip link, visible focus treatment, no initial horizontal overflow, and no page or console errors.
- Live axe-core scans found zero violations on the desktop and phone landing pages. The supplied E2E suite also covers the legal pages.
- The fresh landing-page request logs contained only same-origin document, JS, CSS, and responsive artwork requests. No analytics, CDN font, or tracker request occurred.
- `/privacy/`, `/terms/`, and `/offline.html` each returned HTTP 200 with route-specific titles and one h1.
- Reduced-motion, keyboard, mobile 200% text, and PWA update behavior pass repository E2E coverage.
- The live root and service worker exactly match the locally built implementation candidate artifacts:

```text
index.html  2934af8bf4a37adc459d8bcaa3ec48099eb825e48c0fccb5a8ea87d523bc5acc
sw.js       27e9d8b5df3552876f158179d0befdc8a9975596025ab6b4d20313c7e17cc0b4
```

## Evidence limits

No customer data was used. The paid checkout redirect and invalid-license/rate-limit contract were exercised, but a real purchase, refund, and revocation were not performed because they require a purchaser transaction. The required demo and claim tests could not be exercised because they are absent; those absences are findings, not passes.
