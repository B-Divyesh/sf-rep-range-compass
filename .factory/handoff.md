# Rep Range Compass — repair 3 handoff

**Work order:** `rep-range-compass-repair-3`
**Implementation candidate:** `4e77fc8d28eed6d7c95526c04b241be6152de73a`
**Documentation SHA:** recorded in the follow-up handoff commit
**Live URL:** <https://rep-range-compass.sociobot.in/>
**Demo URL:** <https://rep-range-compass.sociobot.in/demo>

## Status: PASS

This repair closes all four findings from review 1 and retains the prior repair behavior.

- A one-click **Try it with sample data** action opens `/demo?fresh=1`, then lands on an already-populated Barbell bench press log. The persistent banner says **Demo — sample data, nothing is saved** and provides **Reset demo** and **Start for real**.
- Demo state uses IndexedDB `demo:rep-range-compass`; real state uses `rep-range-compass`. Demo license keys begin `demo:`. The browser regression creates real data, uses and resets the demo, and proves the real log remains unchanged.
- `.factory/claims.json` lists 11 visitor-facing claims. Every claim has exactly one `@claim:` Playwright test and an exact command that starts from the demo sandbox.
- Unknown live URLs now return the styled `404.html` with HTTP 404. `/demo` remains a valid HTTP 200 route through a targeted Static Web Apps rewrite.
- The first screen now says the job, names strength trainees using double progression, offers the sample first action with its result, and shows private/offline/price facts. `.factory/copy-audit.md` records the copy audit.
- The header, legal pages, sitemap, route titles, metadata, social image, and responsive navigation were completed as part of the routing repair.

## Verification

From a clean install:

```sh
npm ci
npm test
npm run build
npm run verify:live-billing
```

Results:

- `npm test`: **19 unit tests** and **18 Chromium browser tests** passed.
- `npm run build`: passed and produced `dist/`.
- Every command declared in `.factory/claims.json` was run separately and passed: logging, both rules/RIR, persistence, repeat-or-increase, CSV export, invalid-import recovery, PWA shell, offline demo reload, local-only/demo isolation, Plus scope, and returned-license daily verification.
- `npm run verify:live-billing`: passed — checkout `303`, ordinary invalid verification `200`, and `51/80` burst requests returned `429` with `Retry-After`.
- Local and live `verify-url.sh` checks passed with the expected title, `lang=en`, one h1, main landmark, image alt text, and zero console/page errors.
- Live axe checks found **zero violations** on desktop, 390px phone, demo, privacy, terms, and the deliberate 404.
- Fresh live desktop and phone browser contexts both showed the job title, audience sentence, sample first action, all three facts, populated demo outcome **Increase to 42.5 kg**, demo label, reset/start controls, and zero console errors.
- Live HTTP checks: `/` `200`; `/demo` `200`; `/does-not-exist` `404` with title `Page not found — Rep Range Compass`.
- Candidate identity: live `index.html` SHA-256 `40b29717e838bbb6b588db910302f79bb87bf33467bd47cee4caddef80035554` and live `sw.js` SHA-256 `1c2d0403eb6b470dea9ec23744c77424493a0d07a9ee7c4d9d55ecfd1c3b06b4` match `dist/` exactly.
- Live Lighthouse mobile: Performance **100**, Accessibility **100**, Best Practices **100**, SEO **100**; FCP 0.9 s, LCP 1.0 s, TBT 0 ms, CLS 0.

The worker's basic verifier reports four text-empty buttons only because they are descendants of closed native disclosure controls. Axe reports no unlabeled controls or other violations; the controls have visible names when opened.

## Earlier findings disposition

| Earlier finding | Current evidence |
| --- | --- |
| Invisible service-worker update | Browser regression modifies the worker, sees the update notice, applies it, and confirms activation. |
| Invalid CSV wrote impossible values | Invalid-row claim test rejects before writes; CSV unit and browser recovery tests pass. |
| Immutable asset caching and missing security headers | Live immutable JS has `max-age=31536000, immutable`; root/404 have CSP, Permissions-Policy, nosniff, referrer policy, and frame denial. |
| Offline fabricated license unlocked Plus | Browser regression confirms a never-verified offline token remains locked. |
| Verification endpoint had no observed burst limit | Live billing contract observed 51 of 80 requests limited with `Retry-After`. |
| 200% mobile overflow and small links | Browser regression passes at 390px / 200% text and measures visible links at least 44px. |
| Prior axe landmark issue | Current live axe scans are clean on all checked routes. |

## Remaining follow-up

The researched four-week pilot remains the only product-outcome follow-up: measure eight-session retention and whether trainees answer repeat-or-increase without a separate note. No purchaser transaction, refund, or revocation was run because those require a real buyer; the public checkout, invalid-verdict, rate-limit, cached-verdict, and offline-lock boundaries were verified. Compass Plus remains a one-time $12 offer and the free core remains available.
