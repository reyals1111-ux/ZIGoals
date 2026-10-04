# Landing V5 — verification (Session N, 2026-10-02/03)

What changed from V4, how it was checked, and the numbers before and after. Inventory and V4 baseline:
[INVENTORY.md](INVENTORY.md). Images and frames: [ASSET_MANIFEST.md](ASSET_MANIFEST.md). Every claim the page makes,
with its source: [CLAIMS.md](CLAIMS.md).

## What V5 is
- **The equation story:** "Goals, Habits & Health = Wealth", one word per viewport of scrolling, on desktop and phone. Each word appears directly in its final look, with its figure.
- **Fold stages between the chapters:** the brand film's own fold (Z → swan → lotus → butterfly → heart → bull → Z), scrubbed by scroll on a pinned stage. Phones use 12-frame sets.
- **New sections:**
  - a primary "Request an invite to the friends Alpha" (an email to contact@zigoals.app);
  - privacy and encrypted sync, saying what is available today and what is not active yet;
  - installing it as an app;
  - what's coming ("Planned · not available", with the legal line);
  - a corrected FAQ.
- **Refreshed images:** the 19 product captures, from main's Showcase.
- **Unchanged:**
  - `_headers` (CSP and security headers) and `.assetsignore`, byte for byte;
  - no third-party request, font or tracker;
  - the header's "Launch Alpha ↗".

## Motion rules, and the static final state
- Scroll-driven motion changes only `transform` and `opacity`, except the fold frames, which are drawn on a canvas.
- Scrolling is only observed, never steered:
  - three passive scroll listeners (V4's header and section tracking in `motion.js`, the equation in `equation.js`, the fold stages in `fold-stage.mjs`), each doing its work in one animation frame;
  - nothing calls `scrollTo`, and nothing listens to wheel or touch;
  - the only `preventDefault` calls are V4's keyboard handlers: the phone menu's focus loop and the arrow keys in the Positions, Markets and Ecosystem tabs.
- No animation loops forever, and nothing requests frames while the page is idle (tested).
- **These states show every word, figure and slogan in place, with nothing pinned and nothing drawn:**
  - reduced motion;
  - `?motion=off` and Save-Data;
  - no JavaScript;
  - a short screen (under 561 px tall);
  - forced colours.

## Numbers, before and after
Measured on 2026-10-03 with `apps/web/tests/landing-v5-perf.spec.ts` against V4 (`main` `57275a6`) and V5 (`2d0df63`),
served locally, in Chromium 141. Bytes are file bytes as stored (1 KB = 1,000 B); Cloudflare compresses text on the way,
so real transfers are smaller. The raw lines are in the review evidence (`perf-runs.txt`).

| Measure | V4 | V5 | V5 budget |
|---|---|---|---|
| First view: the page, its styles and scripts, and the images on the first screen | 222,830 B, 14 files | 251,126 B, 16 files | ≤ 260,000 B |
| Before any scroll: adds the lazy images the browser fetches early | 294,168 B, 15 files | 351,738 B, 18 files | ≤ 360,000 B |
| Full scroll-through, desktop 1440 × 900 (the film counted at its file size) | 5,240,234 B, 142 files | 5,710,120 B, 155 files | ≤ 6,000,000 B |
| Full scroll-through, phone 390 × 844 | 773,064 B, 57 files | 1,582,666 B, 106 files | ≤ 1,800,000 B (N16) |
| Layout shift over the scroll-through, desktop / phone | 0.00013 / 0 | 0.00013 / 0 | < 0.01 |
| LCP, desktop (3 runs) | 232, 244 and 252 ms | 224 ms in all 3 | ≤ 1,200 ms |
| LCP, phone with Lighthouse's mobile throttling (8 runs) | median 2,274 ms (2,260–2,604) | median 2,362 ms (2,316–2,572) | ≤ 2,500 ms |
| Long tasks over 50 ms while scrolling | none | none | none |
| Endless animations; frames requested while idle | none; 0 | none; 0 | none; 0 |

Both versions were measured back to back on 2026-10-03, so the LCP rows compare like with like. INVENTORY §8's single V4
runs from 2026-10-02 (336 ms desktop, 2,456 ms phone) were taken under different load on the same machine.

**Where the phone weight comes from** (one phone scroll-through, files grouped by folder):
- the fold stages' 12-frame phone sets: 72 files, 640,886 B (V4's phones loaded 36 wide frames, 258,896 B);
- the four equation figures: 238,144 B (phones get the 640 px files);
- the six settled fold stills: 200,488 B;
- the planet rim: 30,246 B.

The refreshed captures are 69,562 B lighter on phones (150,438 B against 220,000 B).

**First view:** +28,296 B, all text:
- `final-v5.css` (11,347 B);
- a longer page (+8,379 B);
- the equation and fold scripts in place of V4's origami scripts (+8,570 B).

**LCP:**
- **Desktop:** V5 is slightly faster.
- **Phone:** V5's median is 88 ms later. Its first paint waits for one more stylesheet. In one traced run of each, V5's last blocking stylesheet finished 48 ms after V4's, and its first paint came 64 ms later. That was a local HTTP/1.1 server; Cloudflare served `zigoals.app` over HTTP/2 when checked on 2026-10-03.
- **The hero mark as LCP:** in 2 of 8 V5 runs and 1 of 8 V4 runs, the LCP element was the hero mark (`img.hero-mark`) instead of the header logo, at 2,564–2,604 ms. The opt-in budget check failed in those runs. The hero is unchanged from V4.

## Checks
Local unless stated: Node 24.19.0, pnpm 11.19.0, Playwright 1.63 with at most 2 workers, and Chromium 141 standing in for
`chrome`. Each spec was run on its own; the counts cover both projects.

| Check | Result |
|---|---|
| `landing.spec.ts`: V4's contract, with the equation tests now in both projects | 10 passed |
| `landing-v5-equation.spec.ts` | 12 passed, 4 skipped (N1) |
| `landing-v5-fold.spec.ts` | 18 passed, 4 skipped (N2) |
| `landing-v5-layout.spec.ts` | 16 passed, 14 skipped (N3, N4) |
| `landing-v5-a11y.spec.ts` | 9 passed, 1 skipped (N5) |
| `landing-v5-security.spec.ts` | 6 passed, 2 skipped (N6) |
| `landing-v5-perf.spec.ts` | 4 passed, 2 skipped (N7: LCP is opt-in, numbers above) |
| `landing-v5-captures.spec.ts` | opt-in (N8); run once for Part 1.5 |
| `node --check` on the five landing scripts | pass |
| `pnpm check:deploy-configs` | pass |
| `WRANGLER_SEND_METRICS=false pnpm check:landing` | pass; 274 entries (251 files and 23 directories) |
| `wrangler dev`: the Workers Assets runtime, with `_headers` | <ul><li>Sends the six security headers.</li><li>`_headers`, `.assetsignore` and `wrangler.jsonc` answer 404; the other 247 files answer 200.</li><li>A full scroll at 1440 and 390 px raised no CSP violation and asked no other origin for anything.</li></ul> |
| `pnpm lint`, `pnpm typecheck`, `pnpm test` | pass; unit 2,172 passed, 4 expected failures and 22 skipped, as on `main` |
| Full Playwright on a production build of this branch, 2 workers | 958 passed and 74 skipped (desktop 31, mobile 43, as `docs/testing/SKIPPED_TESTS.md` expects). 4 failed: the intro-video specs (`logo-quickadd-goals-header.spec.ts:53` and `:79`, both projects), which this Chromium cannot play; they pass in CI |

`_headers` and `.assetsignore` hash the same as on `main` `57275a6` (`landing-v5-security`).

## Review evidence
Branch `review/session-n-screenshots`, folder [`landing/`](https://github.com/reyals1111-ux/ZIGoals/tree/review/session-n-screenshots/landing), never merged. Taken from `2d0df63`:
- full-page captures in the static final state at 1440 and 390 px;
- 13 motion-on captures at each width: the hero, the four equation steps, one fold stage at its start, middle and settled, and the new sections;
- wheel scroll-through videos at 1440 and 390 px;
- the raw LCP and weight lines (`perf-runs.txt`);
- the Workers Assets check (`workers-assets-check.json`).

## Owner device checks (not possible here)
Local Chromium stands in for Chrome. **UNVERIFIED** until checked on the owner's devices:
- iPhone Safari (scroll pinning, address-bar resizing, `background-clip: text`);
- Android Chrome;
- the film's H.264 playback.

Check on each:
- the equation's four steps;
- one fold stage pinning and settling;
- the invite button opening an email;
- the page with Reduce Motion turned on.

## Addendum 2026-10-03 (Session P, PR 1, part 1.7): the hero mark on phones

The opt-in phone LCP check (Lighthouse's mobile throttling, `LANDING_PERF=1`, one worker, 8 runs per set, this
sandbox's Chromium 141 standing in for Chrome) failed in 1 of 8 runs before this part, as it had in 2 of 8 V5 runs
above: the hero mark (`img.hero-mark`, 65,538 B) arrived after the first paint and became the LCP element at
2,584 ms. Two changes, both to the hero image only:

- the preload carries `fetchpriority="high"` (the `<img>` already did), so the browser fetches the mark at high
  priority from the moment it reads the head instead of after the stylesheets;
- the file is re-encoded at WebP quality 85 with libwebp (sharp 0.35.4, the workspace's own copy, no new
  dependency): 65,538 → 54,908 B (−16%), PSNR 39.2 dB against the previous file, same 422 × 480 px.

No width variants: the master is 422 px wide, and every real phone (2× and 3× screens) needs more than that for the
280 CSS px the mark is drawn at, so a smaller candidate would serve 1× screens only and cost them a second download
next to the header logo, which shares the file. Measured in one sitting, back to back:

| Set | Phone LCP, 8 runs (ms) | Element | Desktop LCP, 8 runs (ms) |
|---|---|---|---|
| Before (`main` `d439dc9`) | 2,376 2,376 2,388 2,400 2,408 2,428 2,460 **2,584** | the header logo; the hero mark in the 2,584 run | 240–308 |
| Preload priority only | 2,384 2,384 2,388 2,400 2,416 2,444 2,472 2,496 | the hero mark in the two slowest runs | 220–292 |
| Preload priority and the re-encoded file (shipped) | 2,348 2,348 2,356 2,364 2,364 2,368 2,372 2,432 | the header logo in all 8: the mark is painted with the first frame | 236–304 |

All 8 phone runs are under the 2,500 ms budget with at least 68 ms to spare; the first view falls by 10,630 B (the weight
spec now measures 240,517 B in 16 files).
`_headers` and `.assetsignore` are untouched (`landing-v5-security` checks their hashes); the weight budget spec,
`check:landing` and `check:deploy-configs` pass. The re-encoded file and a 3× crop of the previous and new encodings
side by side are on `review/session-p-screenshots/pr1/` for the owner's eyes: the owner's visual judgement decides,
and the previous file is one `git revert` away. The landing deploys only by hand (`docs/landing/LANDING.md`).
