# Run #8.1 — unified Goals polish

Recovered the existing Run #8 worktree at `97d5a8cd01f970fcd7a4a5a8de25e034a9dd8618`: 21 modified files and five new files, no unpushed commits. Preserved it before continuing; no reset/reimplementation. Functional checkpoint `898a463ec84cddfc68fd2397d6d65299b2a68bc0` was pushed before finishing evidence. Its hosted web, contract and reproducibility checks passed. Final-head hosted checks are reported in the task handoff / PR checks.

One Goals collection and four-step creator preserve separate legacy ledger/contract and private accounting stores. Completion follows counted integer progress; closed state remains explicit. Invalid old completion flags are reconciled on read without writing, and persisted on the next explicit private edit. Allocations and observation history remain intact. Position ownership, current/elsewhere/unallocated quantities, inline errors and management links are visible. Contributions include optional end dates; Habits never fund progress.

Validation: [67 targeted unit tests](unit.txt), [66 production browser checks](browser.txt), [lint](lint.txt), [typecheck](typecheck.txt), [build](build.txt), [diff check](diff-check.txt). Browser coverage includes all creator types, legacy simulation/recovery, explicit/no-allocation paths, partial/completed filters, multiple allocation owners, inline failures, Habit failure/retry, malformed independent stores, exact multi-validator conservation, navigation and unchanged Health storage. 1440/768/390/320 widths passed with no horizontal overflow, including all creator steps. Seven additional screenshot-only test executions passed after capture timing adjustments. Build's existing Next middleware deprecation warning remains; no deployment occurred.

Fictional fixtures in isolated browser contexts, never owner data: [Goals desktop](screenshots/goals-desktop.png) · [Create Goal](screenshots/create-goal.png) · [Position selection](screenshots/position-selection.png) · [Allocation ownership](screenshots/allocation-ownership.png) · [87.85% under Active](screenshots/active-87-85.png) · [Completed excludes partial Goals](screenshots/completed-filter.png) · [390px Goals](screenshots/goals-390.png) · [390px Create Goal](screenshots/create-goal-390.png).

Changed source groups: `app/app/goals/{page,new/page,tracked/page}.tsx`; `components/{unified-goal-wizard,goal-card,private-backups}.tsx`; `components/platform/{allocation-form,common,platform-today,positions-view,tracked-detail,tracked-goals}.tsx`, `use-platform.ts`, `platform.css`; `lib/{positions,owner-preview,contribution-habit}.ts`; Goal/status/owner-preview browser and unit tests; `docs/RUN_8_REPORT.md`, `docs/RUN_8_BETA_BACKLOG.md`, this evidence directory. All code paths are under `apps/web`. Contract, staking reader and Health files unchanged.

Local verification preview is on `http://127.0.0.1:3102/app/goals`. The older owner preview on port 3100 was left running. To restart the owner preview from this branch on its original origin (retaining that origin's browser data):

```sh
cd /Users/AIUSER/.codex/.chatgpt-projects/g-p-6a9ef321fe54819194d286235dcda765/ZIGoals/.superpowers/run8 &&
export PATH=/Users/AIUSER/.local/share/fnm/node-versions/v24.19.0/installation/bin:$PATH &&
NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build &&
{ preview_pid="$(lsof -tiTCP:3100 -sTCP:LISTEN)"; if [ -n "$preview_pid" ]; then kill "$preview_pid"; fi; } &&
sleep 1 &&
pnpm --filter @zigoals/web exec next start --hostname 127.0.0.1 --port 3100
```
