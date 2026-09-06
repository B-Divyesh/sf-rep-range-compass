# Independent verification 4 — Start for real preserves existing real data

**Work order:** `rep-range-compass-verify-4`
**Implementation candidate:** `1a6a360162aa2031ae87ad9a18ecc65321d98d8e`
**Documentation baseline:** `04d67f6e5ac058a1e6284b69592a8fa291dd550d`
**Live URL:** <https://rep-range-compass.sociobot.in/>
**Verified:** 2026-09-06 UTC

## Verdict: FAIL

**FAIL — one P3 documentation/claim finding; one untested public claim group.**

The deployed implementation is healthy. All eleven registered claim commands passed from a clean checkout. The live desktop and phone flows, demo isolation, reset, offline reload, accessibility checks, security policy, PWA behavior, billing boundary, route handling, and prior repairs passed.

The strict verdict is not PASS because the public demo documentation says **Start for real** opens an “empty real log.” That is false whenever a returning user already has real data. The safe deployed behavior preserves that real data, which is correct, but the claim is inaccurate and no claim test covers the Start-for-real exit path. The work order requires a finding for a false or untested public claim.

## Finding

### P3 — Start-for-real documentation incorrectly promises an empty real log

README and `.factory/demo.md` state that **Start for real** “opens an empty real log.” In a fresh live browser context I created one real completed session, entered the seeded demo, then selected **Start for real**.

| Check | Observed result |
| --- | --- |
| Real sessions before demo | 1 |
| Seeded demo sessions before exit | 6 |
| Demo sessions after Start for real | 0 |
| Real sessions after Start for real | 1 |
| Visible real history after exit | 1 row |

The sandbox clears its own data and does not change real data, as it should. It opens the existing real log rather than an empty one. The public wording should say that it opens the real log, which is empty only for a first-time user. The corresponding `local-only` claim test checks real/demo separation and reset, but does not exercise **Start for real**. This is one false, unregistered/untested public claim group.

**Required repair:** correct the README and demo documentation, and add the exit-path assertion to the relevant registered claim test. No product-code change is indicated.

## Job, audience, and first action

Fresh 1366 × 900 desktop and 390 × 844 phone contexts showed the same first screen before scrolling:

- **Job:** decide whether to repeat the current weight or increase it.
- **Audience:** strength trainees using double progression.
- **First action:** **Try it with sample data**; it says that it will show a finished 3 × 8–12 bench session and its next weight.
- **Facts:** training data stays in this browser; it works after the first visit; the free core is available and Plus is $12 once.

The action opened `/demo?fresh=1` to an already populated Barbell bench press log, with **Set 1 of 3**, **Increase to 42.5 kg**, the persistent **Demo — sample data, nothing is saved** banner, **Reset demo**, and **Start for real**. Desktop and phone screenshots are retained at `/work/.evidence/verify4-{desktop,phone}-{landing,demo}.png`.

## Clean checkout and registered claims

I cloned the supplied checkout into a new temporary directory at documentation SHA `04d67f6`, installed dependencies with `npm ci`, and ran the declared quality gate. The code compiled from implementation `1a6a360`.

```text
npm ci                         PASS — 59 packages installed; 0 vulnerabilities
npm test                       PASS — 19 unit tests; 18 Chromium browser tests
npm run build                  PASS — dist/ produced
npm run verify:live-billing    PASS — checkout 303; invalid verification 200; 51/80 burst requests limited
```

Every registered claim command was run separately from that clean setup. Each had exactly one matching `@claim:<id>` tag in `tests/e2e/app.spec.ts` and passed.

| Claim ID | Result | Observable evidence |
| --- | --- | --- |
| `log-set` | PASS | Demo logs weight, reps, RIR and advances to set 2. |
| `progression-rules` | PASS | All-top/total-reps rules and RIR floor produce repeat/increase results. |
| `local-persistence` | PASS | Logged demo set remains after reload. |
| `repeat-or-increase` | PASS | Completed all-top and below-top sessions show next-weight decision. |
| `csv-export` | PASS | CSV contains its header and all 18 seeded set rows. |
| `csv-import-validation` | PASS | Invalid input reports the row error and leaves six demo sessions. |
| `pwa-shell` | PASS | Manifest, active worker, and cached `/demo` route are present. |
| `offline-reload` | PASS | A separately created context reloads populated demo offline. |
| `local-only` | PASS | Demo and real IndexedDB stores remain separate; no external demo-flow request. |
| `plus-scope` | PASS | Five free rows, $12 offer, then six rows after mocked verified license. |
| `returned-license` | PASS | Returned token is stored locally, URL is cleaned, and a reload makes one verification request. |

This leaves **one untested claim group**: the separate README/demo promise about the Start-for-real exit path described in the finding.

## Live behavior and recovery checks

- A fresh live desktop context completed a real 3 × 8–12 session; the decision and local history behaved normally.
- The seeded demo gave a realistic populated outcome. Logging a demo set, resetting, and leaving demo preserved real data; reset restored six sample sessions.
- Reps `101` failed browser validation with “Value must be less than or equal to 100.”
- The registered CSV recovery test rejected the malformed row before writes. The registered rule and decision tests cover repeat, increase, total reps, and the RIR boundary.
- Phone and desktop had no console errors, page errors, or horizontal overflow. At live 390 px with 200% text, `scrollWidth` equalled `clientWidth` and every visible link was at least 44 × 44 CSS px.
- Keyboard smoke test: first Tab focused the visible 3 px skip-link outline. Reduced motion computed to a `0.01ms` cue transition and `scroll-behavior: auto`.

## Accessibility, privacy, PWA, routes, and performance

- Fresh live axe-core scans found **zero violations** on landing desktop, landing phone, demo phone, privacy, terms, and the styled 404.
- All checked pages had `lang=en`, one h1, a main landmark, and correct route titles: landing, Demo, Privacy, Terms, and Page not found.
- HTTP checks: `/`, `/demo`, `/privacy/`, and `/terms/` returned 200. `/does-not-exist` returned the expected styled **HTTP 404**, not a defective 200 response. The sitemap lists all four product routes.
- Fresh landing and demo contexts made no external requests and had no console/page errors. Training data remains local unless a visitor explicitly supplies a license; the checkout/verification boundary was separately checked by the billing command.
- In a fresh phone context, `/demo?fresh=1` was loaded under service-worker control, switched offline, and reloaded successfully. It retained the demo banner, **Set 1 of 3**, and **Offline · saved locally** with no errors.
- Live root responses have CSP, Permissions-Policy, nosniff, referrer policy, and frame denial. The hashed JS is immutable; `sw.js` is `no-cache`.
- The final clean Lighthouse mobile retry completed without runtime error: Performance **100**, Accessibility **100**, Best Practices **100**, SEO **100**; FCP 0.9 s, LCP 1.2 s, TBT 20 ms, CLS 0.

The live `index.html` and `sw.js` match the local build byte-for-byte:

```text
index.html  b5bec79ae162af0478b3dd29f1aea2359319188dac00cd8aefaf6e4ecfe957c9
sw.js       53b0b2845ff9720d9829657dec31dd58a5ca59f58467bcc8a4d3199650658651
```

## Earlier findings disposition

| Earlier finding | Current disposition |
| --- | --- |
| No one-click isolated demo | Resolved. `/demo` is seeded, labelled, resettable, and separately stored. |
| No claims registry/tests | Resolved for the 11 registered claims; the new Start-for-real documentation claim remains unregistered and untested. |
| Unknown URL returned normal 200 app | Resolved. Live unknown URL is a styled HTTP 404. |
| Landing did not name job/audience/sample/facts | Resolved on fresh desktop and phone visits. |
| Invisible worker update | Resolved by the passing worker-update regression. |
| Invalid CSV wrote impossible data | Resolved by unit and browser invalid-import recovery coverage. |
| Missing immutable caching/security headers | Resolved by live cache and header checks. |
| Offline fabricated license unlocked Plus | Resolved by the passing offline restored-token regression. |
| No observed verification burst limit | Resolved: 51 of 80 live contract requests were 429-limited with `Retry-After`. |
| 200% overflow and undersized links | Resolved by fresh live phone measurement and regression coverage. |
| Axe landmark issue | Resolved; all current scans are clean. |

## Evidence limits and next steps

No real buyer purchase, refund, or revocation was performed because it requires a buyer transaction. The live checkout redirect, ordinary invalid verification, burst-rate limit, cached verification, and offline-lock boundaries passed. This limitation is unchanged from prior verification and is not the present finding.

Correct the one documented Start-for-real statement and cover its exit path in the claim suite, then rerun this verification. The researched four-week retention pilot remains the product-outcome follow-up after technical acceptance.
