# Session N review evidence (never merged)

Evidence for the three Session N pull requests, recorded on 2026-10-02/03 in a cloud sandbox:
- Node 24.19.0 and pnpm 11.19.0;
- local production builds (`PUBLIC_ALPHA_UNDEPLOYED`);
- Playwright 1.63 with at most 2 workers;
- Chromium 141 standing in for Chrome, so the H.264 brand film does not play here.

Nothing here is a device screenshot or a hosted claim.

## `landing/` — [PR #61](https://github.com/reyals1111-ux/ZIGoals/pull/61), Landing V5
Full-page captures in the static final state (reduced motion), viewport captures with motion on, and scroll-through
videos. All are taken at 1440 and 390 px from the PR's `landing/` folder, served locally. The file list is in
`landing/README.md`.

## `earn/` — [PR #64](https://github.com/reyals1111-ux/ZIGoals/pull/64), Earn & staking foundations
| File | Shows |
|---|---|
| `a-ways-to-let-it-work.png`, `b-option-explained.png`, `c-user-signed-step.png` | The three design mockups in `docs/earn/mockups/`, rendered by Chromium. Design only: nothing is built or available |
| `app-native-reader-check.jsonl` | The app's own native reader, unchanged from `main`, run read-only against the official LCDs on 2026-10-02T23:39Z. Mainnet (configured `uzig`/6) is refused: "Public network or denomination evidence does not match." Testnet (`azig`/18) reads |
| `valdora-testnet-reader-live.json` | The new Valdora testnet reader, run once read-only against the official testnet LCD: an ok reading at block 8047366, 12 GETs, all pinned to that height |
| `freeze-compare.json` | 154 captures of `5cb9295` against `main` `57275a6`. 142 are identical; the other 12 are the Help page, whose feedback link carries the build's commit. The Ecosystem captures show the cards closed, so they are identical too |
| `playwright-summary.json` | The full local browser run on `5cb9295`: 891 passed, 47 skipped, 4 failed. All four are the intro-video specs this Chromium cannot play |

## `time/` — [PR #62](https://github.com/reyals1111-ux/ZIGoals/pull/62), Timezone phases 1–2
| File | Shows |
|---|---|
| `freeze-compare.json` | 154 desktop and tablet captures of `de61e33` against `main` `57275a6`. 142 are identical. The other 12 are the Help page, whose feedback link carries the build's commit; their pixels are identical |
| `playwright-summary.json` | The full local browser run on `de61e33`: 889 passed, 47 skipped, 6 failed. Four are the intro-video specs this Chromium cannot play. Two hit timing limits under load and passed when re-run alone |
| `habit-paint-first-repeat.txt` | The test that failed once in this PR's CI (`habit-paint-first.spec.ts:36`, mobile), run 20 times on `main`'s app code, then in both projects of a full run: 22 passes, not reproduced locally |
