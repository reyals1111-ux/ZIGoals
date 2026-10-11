# Session Z-Cloud: raw run results (orphan branch, never merged)

Evidence behind the STATUS entry "Session Z-Cloud" and ADR-019. Local production builds (`PUBLIC_ALPHA_UNDEPLOYED`,
`next start` on 127.0.0.1), Playwright's Chromium in the `chrome` channel unless named WebKit; AI answers are MOCK.
(This branch's first commit copied the source tree by mistake; the second removed it. Only the files below are evidence.)

- `gate-b/full-suite-quarter1.json`: the full browser suite's first quarter (both projects), before the Gate B fixes.
- `gate-b/ci-failures-repro.log`, `gate-b/ci-failures-after-fix.log`: CI run 38094619622's failures reproduced locally,
  then the same specs green after the fixes (`938ae21`, `15c36a5`).
- `gate-b/habit-shell-35-reader.*`: a #35 device (`12a3ef9`'s own sync, validation, merge, habit readers and
  private-sync Worker in Miniflare) receiving a habit deleted for good by this branch: 3 passed. The test ran from a
  scratch worktree of `12a3ef9` and was never committed to either branch.
- `gate-b/webkit-zigi-emotions.log`: WebKit (Playwright's build of Safari's engine), `zigi-emotions`, both projects.
- `round2/`: panel polish round 2: the focused ZIGi specs in two halves (JSON), `zigi-oneline-z`, and item 10's
  temporary surface scan (every ZIGi surface, 320–1440 px; prose lines and Help's eyebrow are the only two-line text).
- `gate-c/`: Gate C on the final code.
  - `full-suite-run2-half1.*`, `full-suite-run2-half2.*`: the full browser suite's run 2, both projects, in two halves
    (line output and Playwright's JSON, gzipped): 1,952 passed, 552 skipped, 6 failed (see STATUS).
  - `unit-final-88e7a41.txt`: the unit suite under `TZ=UTC`; `unit-earlier.txt`: the earlier Gate C run (02:46).
  - `revert-gate-88e7a41.log`: every commit `12a3ef9..88e7a41` reverted newest first, typecheck after each, the tree
    identical to `12a3ef9`; `revert-gate-earlier-30-commits.log`: the earlier, shorter run.
  - `weights-12a3ef9-vs-248b1f0.txt`, `freeze-summary.txt`: the weights and the freeze check against `12a3ef9`'s build.
  - `webkit-c57-c56.txt`: the WebKit and font measurements behind ADR-019 C56 and C57.
  - `journeys.mjs`, `journeys-results.json`: the stretch item, five human-style journeys at a computer, a tablet and a
    phone size (15 runs, all clean; the screenshots are on `review/session-z-cloud-screens`).

