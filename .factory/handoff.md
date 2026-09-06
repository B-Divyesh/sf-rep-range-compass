# Rep Range Compass — verification 4 handoff

**Work order:** `rep-range-compass-verify-4`
**Implementation candidate:** `1a6a360162aa2031ae87ad9a18ecc65321d98d8e`
**Documentation baseline:** `04d67f6e5ac058a1e6284b69592a8fa291dd550d`
**Live URL:** <https://rep-range-compass.sociobot.in/>
**Demo URL:** <https://rep-range-compass.sociobot.in/demo>

## Status: FAIL

The implementation is deployed and technically healthy, but this strict independent verification has one P3 documentation/claim finding and one untested public claim group. Do not record a product PASS until it is closed.

**Finding:** README and `.factory/demo.md` promise that **Start for real** opens an “empty real log.” A fresh live browser test created one real session, entered the six-session sample, then chose **Start for real**. The sample database was cleared and the real session remained visible. That safe behavior is correct, but the documentation claim is false for returning users. The registered demo-isolation test does not cover this exit path.

**Repair:** change the wording to say it opens the real log (empty only for a new user), and extend the relevant registered claim test to prove that Start for real clears demo data while preserving real data. No product-code repair is needed.

## Verification completed

From a clean clone at `04d67f6`:

```sh
npm ci
npm test
npm run build
npm run verify:live-billing
```

All passed: 19 unit tests, 18 Chromium tests, production build, checkout 303, invalid verify 200, and 51/80 rate-limited billing requests. All 11 commands declared in `.factory/claims.json` were also run separately and passed.

Fresh live desktop and phone checks confirmed the job/audience/sample first action, populated demo label and reset controls, real/demo storage isolation, invalid numeric recovery, offline reload, keyboard/focus/reduced-motion behavior, 200% mobile reflow, route titles, legal pages, styled HTTP 404, zero axe violations, zero console errors, and same-origin-only initial/demo requests. Live Lighthouse mobile retry: 100 Performance, 100 Accessibility, 100 Best Practices, 100 SEO (FCP 0.9 s, LCP 1.2 s, TBT 20 ms, CLS 0).

`index.html` and `sw.js` matched the local build of implementation `1a6a360` byte-for-byte. The detailed evidence and disposition of all earlier findings are in [.factory/verification-4.md](verification-4.md).

## Remaining follow-up

1. Close the single documentation/claim finding above and rerun verification.
2. Run the researched four-week retention pilot.
3. A real buyer transaction is still required to exercise purchase, refund, and revocation end to end; public billing boundaries are verified.
