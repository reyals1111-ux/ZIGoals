# Session M review screenshots (never merged)

Screenshots for Session M's two pull requests, taken on 2026-10-02 from local production builds (`PUBLIC_ALPHA_UNDEPLOYED`) of each PR's head. Chromium 141 stood in for Chrome, at desktop size (1440×900) and at 390 px (iPhone 13 size), with Motion Off. Nothing here is a device screenshot or a hosted claim.

- **`pr-a/`** — [PR #60](https://github.com/reyals1111-ux/ZIGoals/pull/60), polish and reliability. Showcase data; `/api` answered by a 503 fixture.
- **`pr-b/`** — [PR #63](https://github.com/reyals1111-ux/ZIGoals/pull/63), "never a chore" accounts. Accounts are visible only once activated (Stages 7–8), so these use the Stage 8 rehearsal harness: the real private-sync Worker in Miniflare and fixture sign-in (any code; no email is sent). Fictional accounts and data only.

Each folder's table says what every image shows.

## `pr-a/` — PR #60, polish and reliability (head `19152a4`)

| Image | What it shows |
|---|---|
| `a1-health-storage-full-390.png` | **A1 (QA2-02).** A Health quick counter tap refused because browser storage is full. The refusal was injected the same way `tests/storage-errors-health.spec.ts` does it. The message names what happened, what to do and the code `(STORAGE_FULL)`, instead of a generic line. |
| `a2-loss-app-portfolio-desktop.png`, `a2-loss-app-portfolio-390.png` | **A2 (QA2-03, M3).** Portfolio results: Ethereum's loss "−$205.00 · −7.87%". The sign and layout are unchanged. Showcase's loss is a whole amount, so it reads as before. The rounding change shows only on amounts with more digits than the currency has, and `lib/money-loss.test.ts` covers those. |
| `a3-staking-desktop.png`, `a3-staking-390.png` | **A3 (QA2-06).** Staking without the "Goals · Positions" Goal workspace tabs. The content starts right under the title. |
| `a4-goals-targets-outlined-390.png`, `a4-activity-targets-outlined-390.png` | **A4 (QA2-07).** Phone tap targets on Goals (the workspace tabs, now 44 px tall) and Activity (event links, 45 px hit area that takes no room). **The dashed outlines are drawn by the screenshot script to show the hit areas; the app draws none.** |
| `a6-help-desktop.png`, `a6-help-390.png` | **A6.** Help, "Once accounts open": "Turn on encrypted sync on your first device before you start using a second one." |

## `pr-b/` — PR #63, "never a chore" accounts (head `c9d5ad2`)

These come from the Stage 8 rehearsal harness: the real private-sync Worker in Miniflare, fixture sign-in (any code; no email is sent), fictional accounts and one fictional Habit. **The recovery secret on the vault-creation step is masked by the screenshot script.** It belonged to a throwaway local vault, but a review image should never show one.

| Image | What it shows |
|---|---|
| `b2-create-choice-desktop.png`, `b2-create-choice-390.png` | **B2.** Creating the vault in a browser tab: "Remember on this device — don’t use on shared computers" is unticked, with its warning under it. |
| `b2-unlock-choice-desktop.png`, `b2-unlock-choice-390.png` | **B2.** Unlocking after a lock: the same choice, unticked, below the recovery secret field. |
| `b2-remembered-after-reload-desktop.png`, `b2-remembered-after-reload-390.png` | **B2.** After a reload on a remembered device, the vault is open without the secret. The notice says so, with **Forget this device**. |
| `b2-installed-app-default-390.png` | **B2 (owner decision M1 b).** In the installed app (display-mode standalone, emulated), the choice is ticked by default and keeps its warning. |
| `b3-copy-in-place-desktop.png`, `b3-copy-in-place-390.png` | **B3 (M2).** Copying earlier records: the review of what will be copied and one explicit approval. There is no file to save and no backup secret. |
| `b3-deletion-no-download-desktop.png`, `b3-deletion-no-download-390.png` | **B3 (M2).** Cloud deletion: the typed confirmation alone enables "Confirm cloud deletion"; "Download a copy first (optional)" stays available above it. |
