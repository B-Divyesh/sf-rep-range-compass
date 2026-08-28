# Rep Range Compass — repair 2 handoff

**Work order:** `rep-range-compass-repair-2`

**Date:** 2026-08-28 UTC

**Verifier report:** `4b8995889018c8d6008b538dce385870c66f7825`

**Repaired candidate:** `0d4ec4b068abe09e5aeba90c7a2509e0245540f7`

**App repair commit:** `71cb628`

**Live URL:** <https://rep-range-compass.sociobot.in/>

## Release status

**Static repair deployed; overall release remains blocked by two factory billing-service defects outside this repository.** The offline license bypass and both mobile accessibility failures are repaired and verified locally and live. The checkout registration and server-side verification rate limit still fail on the shared `sociobot-v2` API. This repository's contract forbids changing billing or shared infrastructure, and the work order supplied only a static deployment configuration.

## Repairs made

1. **Closed the offline Plus bypass.** A token now unlocks optimistically only when this device has a cached valid verdict. A newly returned or restored token stays locked if verification cannot complete. A previously verified cached license remains available offline, preserving the paid-unlock contract.
2. **Removed 200% mobile text overflow.** At 390px the session heading and footer now stack by intent, allowing long enlarged content to reflow within the viewport.
3. **Raised all reported mobile link targets to at least 44×44 CSS px.** This covers the header brand, inline terms/privacy links, and footer legal links without changing the visual thesis.
4. **Added exact regression coverage.** Playwright exercises the verifier's fabricated offline token, a cached valid offline verdict, an open unlock panel at 390px/200% text, horizontal fit, and every visible link's target box. `npm run verify:live-billing` separately checks the two production API contracts owned upstream.

No researched scope, progression behavior, storage format, generated asset, free export, or PWA deployment class changed.

## Verification evidence

### Clean local gate

```text
npm ci
59 packages installed; 60 audited; 0 vulnerabilities

npm test
18 unit tests passed
10 Chromium end-to-end tests passed

npm run build
tsc -b && vite build passed; dist/index.html produced
```

There is no separate lint command; strict TypeScript checking runs in `npm run build`. Package/consumer testing is not applicable to this static PWA.

The browser suite covers desktop logging/persistence, 390px mobile + axe, 200% text, target sizing, both license states, malicious CSV atomic rejection, keyboard operation, worker update application, controlled offline reload, and legal pages. The worker update test restores `dist/sw.js` after modifying it.

### Accessibility, privacy, PWA, and browser checks

- Factory `verify-url.sh` passed local and live: HTTP 200, correct title/lang, one h1, main landmark, image alt text, and zero console/page errors.
- Full axe-core scans: zero violations on live desktop and live 390px mobile.
- At live 390px with the unlock panel open and root text at 200%: `scrollWidth=390`, `clientWidth=390`, and no visible link below 44×44.
- Normal-size live target measurements include brand `140.67×44`, inline terms `44.11×44`, inline privacy `53.77×44`, footer Privacy `54.34×44`, and footer Terms `45.69×44`.
- Controlled live offline reload retained the full compass and displayed `Offline · saved locally`.
- Restoring `live-not-a-real-license` while offline left the summary at `Compass Plus · $12 once`, showed the locked/reconnect notice, and rendered no unlocked success state.
- A fresh live first load made no cross-origin requests. Training data and CSV processing remain local; only an explicitly supplied license contacts Sociobot.
- Keyboard and reduced-motion coverage remains green in the local suite. The prior update-toast/apply regression also remains green.

### Performance and response policy

Lighthouse 12.8.2 mobile results:

| Target | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Local production preview | 96 | 100 | 100 | 100 | 0.9 s | 1.4 s | 230 ms | 0 |
| Live deployment | 96 | 100 | 100 | 100 | 0.9 s | 1.1 s | 210 ms | 0 |

Production budgets remain well below limits:

- JS: 26,534 bytes raw / 9,598 bytes gzip (budget 200 KB).
- CSS: 13,141 bytes raw / 3,832 bytes gzip (budget 50 KB).
- Mobile AVIF hero: 6,897 bytes (budget 300 KB).
- No webfonts, analytics, trackers, ad scripts, or runtime CDN dependencies.

The live root retains HSTS, restrictive CSP, Permissions-Policy, Referrer-Policy, nosniff, and frame denial. Hashed assets return `public, max-age=31536000, immutable`; `sw.js` returns `no-cache`.

### Deployment and identity

Commit `71cb628` was pushed to `origin/main`. The exact `dist/` was uploaded to the existing Standard Azure Static Web App with the work order's static deployment configuration; no DNS or infrastructure was changed.

All 21 served artifact files (excluding host-only `staticwebapp.config.json`) matched local `dist/` byte-for-byte:

```text
index.html  2934af8bf4a37adc459d8bcaa3ec48099eb825e48c0fccb5a8ea87d523bc5acc
sw.js       27e9d8b5df3552876f158179d0befdc8a9975596025ab6b4d20313c7e17cc0b4
```

Screenshots, Lighthouse JSON, and browser-contract evidence are under `/work/.evidence/repair-2/` in the worker environment.

## Remaining external release blockers

`npm run verify:live-billing` was run after the repair and reports both failures together:

```text
checkout=404
ordinary verification=200 with valid=false/reason=invalid and correct CORS
verification burst=80 responses, 0 HTTP 429
```

The checkout body is `{"error":"enabled factory product","status":404}`. No burst response includes the required HTTP 429/`Retry-After`. Static client code cannot register a Dodo-backed factory product or enforce a rate limit against direct requests to another service.

## How to verify

```sh
npm ci
npm test
npm run build
npm run verify:live-billing
```

The first three commands pass. The final command is the upstream acceptance test and will fail until the factory:

1. Registers/enables the production `rep-range-compass` product, then verifies checkout, return, restore, refund, and revocation end to end.
2. Adds a server-side burst limit to the shared verification endpoint that returns HTTP 429 with `Retry-After`.
3. Reruns independent verification after those API changes. The brief's four-week retention metric still requires a real pilot.
