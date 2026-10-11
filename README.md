# Session Z-Cloud: raw run results (orphan branch, never merged)

Evidence behind the STATUS entry "Session Z-Cloud" and ADR-019. Local production builds (`PUBLIC_ALPHA_UNDEPLOYED`,
`next start` on 127.0.0.1), Playwright's Chromium in the `chrome` channel unless named WebKit; AI answers are MOCK.
(This branch's first commit copied the source tree by mistake; the second removed it. Only the files below are evidence.)

- `gate-b/full-suite-quarter1.json`: the full browser suite's first quarter (both projects), before the Gate B fixes.
- `gate-b/ci-failures-repro.log`, `gate-b/ci-failures-after-fix.log`: CI run 38094619622's failures reproduced locally,
  then the same specs green after the fixes (`938ae21`, `4fe6e8e`).
- `gate-b/habit-shell-35-reader.*`: a #35 device (`12a3ef9`'s own sync, validation, merge, habit readers and
  private-sync Worker in Miniflare) receiving a habit deleted for good by this branch: 3 passed. The test ran from a
  scratch worktree of `12a3ef9` and was never committed to either branch.
- `gate-b/webkit-zigi-emotions.log`: WebKit (Playwright's build of Safari's engine), `zigi-emotions`, both projects.
- `round2/`: panel polish round 2: the focused ZIGi specs in two halves (JSON), `zigi-oneline-z`, and item 10's
  temporary surface scan (every ZIGi surface, 320–1440 px; prose lines and Help's eyebrow are the only two-line text).
