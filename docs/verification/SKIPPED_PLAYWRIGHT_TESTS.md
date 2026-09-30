# Skipped Playwright tests: inventory

> **Superseded (2026-09-29):** the current inventory, covering Playwright and Vitest, is [../testing/SKIPPED_TESTS.md](../testing/SKIPPED_TESTS.md). This page is kept as the `7fdea68` record.

**Evidence (CI):** Milestone quality run [36487121799](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36487121799), `web` job, on `main` = `7fdea686517cee322a37896b3e7a56931ce0ed6a`. It reported **17 skipped, 451 passed (20.4 m)**. The job's JSON artifact (`web-browser-7fdea68…`) could not be downloaded from this environment. The per-test list below comes from the skip calls in the source at that commit. It adds up to exactly 17, and the CI log lists the same `[mobile]` visual entries in its run order.

| # | Test (file:line) | Project | Why skipped | Expected? |
|---|---|---|---|---|
| 1 | `primary actions catch one sweep of light on hover, give on press and keep their focus ring` (motion-polish.spec.ts:89) | mobile | `test.skip(project==='mobile')`: the hover sweep only exists for hover-capable pointers | Yes. Desktop runs it. |
| 2–5 | `visual product audit 1440 / 1024 / 390 / 320` (run9-1-visual.spec.ts:13) | desktop | File-level `test.skip(RUN91_CAPTURE!=='1')`: opt-in evidence capture with isolated fixtures | Yes. Manual evidence tool, not a gate. |
| 6–9 | same four | mobile | same | Yes |
| 10–13 | `final Showcase visuals 1440 / 1024 / 390 / 320` (run9-2-visual.spec.ts:9) | desktop | File-level `test.skip(RUN92_CAPTURE!=='1')`: opt-in capture that writes to `docs/verification/run9-2` and uses real public provider responses | Yes. It must not run in CI, because it calls live providers and writes into the repo. |
| 14–17 | same four | mobile | same, and inside the test `project!=='desktop'` also skips (one capture per viewport) | Yes |

**Summary:** 1 intended platform skip, plus 16 opt-in evidence captures (8 tests × 2 projects). No test is skipped because it is broken or flaky, and no `test.fixme` exists.

**Not Playwright, for completeness:** the Vitest packaged-runtime suite also skips `all supported Goal controls work in the source preview before package generation` in the same run (1 skipped).

**Possible tidy-up (owner decision, not done):** the 16 capture entries could move to a separate Playwright project, or the default run could `--grep-invert` them. Skip counts would then show only real skips. This changes no coverage.
