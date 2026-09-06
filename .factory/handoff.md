# Rep Range Compass — review 1 handoff

**Work order:** `rep-range-compass-review-1`
**Reviewed:** 2026-09-06 UTC
**Implementation candidate:** `71cb62881f0228b17d2c42d9522998fec50de393`
**Documentation SHA:** `9ad9cfc299b2760fd9dec49661de032473bcf2e2`
**Live URL:** <https://rep-range-compass.sociobot.in/>

## Status: FAIL

No product code was changed. The full report is `.factory/review-1.md`.

The local gates passed: `npm ci`, `npm test` (18 unit and 10 E2E tests), `npm run build`, and `npm run verify:live-billing` (checkout 303, invalid verification 200, 51/80 requests rate-limited). Live root and service-worker bytes match the candidate build.

Core phone and desktop behavior works: a full all-top session increases weight, the 12/11/12 boundary repeats, invalid CSV has no write, controlled offline reload works, headers are present, and live axe scans reported zero violations. The earlier service-worker, CSV validation, billing boundary, rate-limit, cache/security-header, and mobile accessibility findings are resolved.

Release is blocked by four review findings: no one-click isolated sample demo; no required claims registry or claim commands (11 public-claim groups untested); no real styled HTTP 404 route; and a first screen that omits the required audience, sample first action, and privacy/offline/price facts. The next worker should repair those items and rerun a strict review. A four-week pilot remains needed to measure the brief’s product outcome.

## How to verify

```sh
npm ci
npm test
npm run build
npm run verify:live-billing
```

After the repair, start verification at the required demo URL in a fresh browser context and run every command declared in `.factory/claims.json`.
