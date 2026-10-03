# Landing V5 review evidence ([PR #61](https://github.com/reyals1111-ux/ZIGoals/pull/61))

Taken on 2026-10-03 from the PR's `landing/` folder at `2d0df63`, served locally as static files, in Chromium 141
standing in for Chrome. These are not device screenshots. The film is H.264, which this Chromium cannot play, so it
shows its poster.

| File | Shows |
|---|---|
| `full-static-1440.png` (1440 × 23,403 px), `full-static-390.png` (390 × 25,043 px) | The whole page in its static final state (reduced motion): every word, figure and slogan in place, nothing pinned. Taken at 1× so the capture stays within Chromium's limits |
| `motion-1440-*.png`, `motion-390-*.png` (13 each; the 390 px ones at 2×) | Motion on, at: the hero (01); each equation step (02–05); one fold stage, swan → lotus with "Shape", at its start, middle and settled (06–08); privacy (09); install (10); what's coming (11); FAQ (12); the final call (13) |
| `scroll-1440.webm` (29.6 s), `scroll-390.webm` (35.6 s) | One scroll-through with the mouse wheel, motion on, top to bottom, recorded at the viewport size. A headless recording: it shows the order and the steps, not the smoothness a device shows |
| `perf-runs.txt` | The raw LCP, long-task, weight and layout-shift lines for V5 and for V4 (`main` `57275a6`), from `landing-v5-perf.spec.ts` |
| `workers-assets-check.json` | V5 served by `wrangler dev` (the Workers Assets runtime, with `_headers`): the six security headers, every file's status, and a full scroll at 1440 and 390 px with no CSP violation and no request to another origin |
