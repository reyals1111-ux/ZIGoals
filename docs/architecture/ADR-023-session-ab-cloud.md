# ADR-023: Session AB-Cloud, "Everything left over + private sync for every feature": session decisions

Status: **In progress** on `feature/session-ab-cloud`, from `main` `6c1052b2` (Merge #84, Session AA-Local; live as Alpha
#39), in a cloud sandbox. This record holds the owner's decisions at plan approval and every decision the session took
without asking (the brief: the safest option that keeps every promise). The parallel lane AB-Design
(`feature/session-ab-design`, ADR-024, on the owner's Mac) owns every visual; the lanes talk through
`docs/handoff/AB_CLOUD_TO_DESIGN.md` (mine) and `docs/handoff/AB_DESIGN_TO_CLOUD.md` (read from its branch at every gate).
Evidence: `docs/verification/ab-cloud/`; "Resume here": `docs/verification/ab-cloud/SESSION_STATUS.md`.

## Owner decisions (2026-10-13, plan approval)
- **The brief:** Parts 0–10 in order (records; the finance-homes switch and the `cardArt` contract; the device-only
  features of AA-Cloud and AA-Local into encrypted sync; the FIX_PLAN B3–B7 hardening; vitamins; Restore from Export
  everything; the "Point & tell" feedback mode; CI/WebKit; four owner logic items; ZIGi without models; readiness docs),
  gates A (after Part 2), B (after Part 6) and C (at the end), one PR (Draft until Gate C), merge commits only, Tier 3 in
  its own commits labelled `[TIER 3] (<area>)` with risk and rollback in the message; never merge, deploy, log in to
  Cloudflare, or change wallet/contract/key code; no new dependency (none is needed).
- **Data safety:** no field ever enters goals (`.strict()`), habits v3, health v4 or settings v3. Everything new syncs in
  new sections older builds ignore, end-to-end encrypted, versioned and loose, with frozen-reader proofs against
  `32cb9c5` (#37), `e3fa408` (#38) and `6c1052b` (#39) and Miniflare where Workers are involved. Health-describing extras
  follow Health's own consent. Photos (vision board, progress photos) stay on the device.
- **Plan edits (2026-10-13, approved with the plan):**
  1. Extras sync is **on by default** for accounts that already sync (the `health` section only with Health's own
     consent), with a one-time explanation in Settings → Sync, the turn-off and "Remove from the cloud". The rollback
     floor rising to #32 is accepted. The CI concurrency change is accepted. The PRIVACY.md E2 sentence with the extras
     clause is drafted in the PR's owner items for approval, not marked final.
  2. AB-Design runs on the owner's Mac; its branch is read from origin at every gate. It replaces the Showcase/Alpha
     banners with a first-visit notice, a "Showcase" chip and a footer disclaimer: `lib/showcase-copy.ts` exports a short
     chip text and a longer sheet text for that design. Every new component and one-line insertion of this lane is
     listed in the handoff so the second merger keeps both sides.
  3. Added: What's new `2026-10-session-ab-cloud` and Help answers (what syncs now including the extras, photos on the
     device, Restore, Point & tell, vitamins, grouped amounts, the default currency), mirrored in the search index.
  4. Push only to `feature/session-ab-cloud`; the PR comes from it.
  5. This lane will probably merge first; if AB-Design merges first, `main` is merged in with a merge commit and this
     lane carries the shared items.
  6. A giant run: after Gate C the time left goes to the stretch items; a lean-finish note ends the current part, then
     Gate C lean, STATUS, PR ready.

## Session decisions
| # | Part | Decision | Why it is the safest option |
|---|---|---|---|
| C1 | 2 | **Extras sections in their own keyspace, not a new journal domain.** The journal's row schema (`rowSchema.domain`) and catalog are strict over `finance, habits, health, settings` in every build since #29, so a fifth domain would make #32–#39 refuse the whole pull. The Portfolio's keyspace pattern (ADR-013) is generalised: each extras section is one sealed snapshot under `extras:<name>` in the account's vault object (head, parts, receipts), its own Worker module (`workers/private-sync/extras.mjs`, route `/v1/extras`, allowlisted names), its own relay action, its own record-context label (`extras`, HKDF per section). | Older builds never call `/v1/extras`, and the vault's compaction, domain deletion and rotation touch only `record:` and `rotation-row:` keys, so an older client never sees, refuses or removes these copies (proven for Portfolio by `portfolio-keyspace.test.mjs`; the same proof is repeated for extras). |
| C2 | 2 | **The device keys stay the local source of truth.** Sync reads each device key, seals the section, and merges the cloud copy back into the same keys; no key is renamed, bumped to `v2` or deleted. | A rollback to #39 reads exactly what this build wrote; ADR-021's security info 6 (a `v2` goal-extras key would read as empty after a rollback and the photo tidy-up would delete photos) cannot happen. |
| C3 | 2 | **Merge: three-way against the last-synced base, then by item.** One side changed → take it. Both changed → merge item by item: a stamped value (`updatedAt`, `at`, `setAt`, `savedAt`) settles by the later stamp, equal stamps by a fixed order of the two texts (Session W S4); unstamped maps and lists union by key; a removal is carried as a small tombstone (key + time) inside the section so the other device does not bring it back. The replaced local value is kept as a recovery copy. | Sync never stops over a conflict and never drops a person's entry silently; the rule is the one Sessions W and Y already use. |
| C4 | 2 | **Four sections**: `goals` (goal extras incl. custom areas, habit areas and `cardArt`; average goals), `life` (calculator scenarios, the Life review focus, Today's cards, the reminders plan), `habits` (habit extras, routine runs, the game record; XP stays derived), `health` (coach answers, micro targets, macro mode, aisles, custom measurements, vitamins), the last only under Health's own consent. Device-only for good: recent searches, onboarding setup, vision photos, progress photos and their index, AB-Design's `zigoals:ui-prefs:v1`. | Health-describing data syncs only under the Health consent (SYNC_HOMES rule); photos stay on the device (owner decision). |
| C5 | 2 | **First sync = migration.** When the cloud holds no section, this device's records are uploaded as they are; when both hold one, they merge by C3. A photo vision syncs as its reference only: a device without the photo shows the goal's gradient fallback. | No data loss and no extra step for the person. |
| C6 | 1 | **Finance v5 is written; the device keys stay the pages' records (revised from the plan's P2 pattern).** Accounts and milestone dates are read and written by Wealth, a Goal's milestones and ZIGi straight from `zigoals:accounts:v1` and `zigoals:milestone-dates:v1`, so those keys stay their records and finance v5 (`accounts`, a milestone's `targetDate`) holds the synced copy. Account sync keeps both in step, before each capture and after each apply (`lib/finance-homes-store.ts`), by a three-way reconcile against the state both last held (`zigoals:finance-homes:v1`, this device): one side changed → it wins; both → an account's later `updatedAt` (equal: fixed text order), a date's later date; an edit beats a removal. A device key edited during a reconcile is never overwritten (compare-before-write; the next run reconciles). Finance is raised lazily (the first account or date), never lowered, the v4 record kept as a recovery copy. The floor becomes #32; #32–#39 read v5 and keep it (frozen readers 3/3). Only account sync runs it, so the Showcase and the Local Demo keep their finance bytes. | The plan's P2 pattern (homes read, device keys never rewritten) would have left a rolled-back #39 showing stale accounts and would have meant rewriting Wealth's pages, which are AB-Design's; keeping the keys current both ways keeps every page and a rollback exactly as they are. |
| C9 | 1 | **Finance changed on two devices: its v5 homes settle on their own.** `mergePrivateData` refuses any both-sides finance change ("Conflicting financial changes"). With accounts in finance, two phones editing accounts would have paused sync where today they never meet. So `mergeFinanceTexts` sets the two homes aside: when the rest of finance changed on one side only, the homes merge by item with C6's rules and the version is the higher one; any other both-sides change is refused exactly as before. | Session W S4's rule for stamped groups (Health v4, settings v3) applied to finance v5's groups; no financial evidence is ever merged. |
| C10 | 1 | **Three sentences that said "until account sync carries them" now say what is true** (Wealth's accounts section, a Goal's milestone note, Help's "Where do my accounts and debts live?"). Single-string edits in AB-Design's files, listed in the handoff. | The copy must not promise less, or more, than the code does. |
| C7 | 1 | **`cardArt`** is an optional art id on a goal-extras entry (`/^[a-z0-9][a-z0-9-]{0,59}$/`; readers ignore an id they do not know; a new art version is a new id), set by the pure `setGoalCardArt(extras, goalKey, artId \| null, at)`; Undo restores the entry through the existing `change()`. It syncs in the `goals` section. | AB-Design's contract (handoff) without a strict record; the goal-extras record is loose, so #37–#39 keep reading it. |
| C8 | 1 | **AB-Design's device keys** (`lib/ab-design-keys.ts`, `zigoals:ui-prefs:v1`) are wired into Export everything, the account erase, the welcome's key lists and the Your data catalog as a display preference, never synced. A stub with exactly that export stands in until AB-Design's file reaches `main`; the second merger keeps AB-Design's version. | The early contract of the brief, with no import of a file that does not exist on this branch. |

## Assertions changed (deliberate, listed)
- **Part 1, `tests/wealth-v2.spec.ts:33`:** the accounts section's sentence is now "Accounts are kept on this device; with an
  account they also travel in your encrypted sync." (C10); the same exact-text check on the new sentence (as strict).
- **Part 1, `lib/vault/w-formats.test.ts`:** the finance test's title and the file's header comment no longer say nothing
  writes finance v5; the assertions are unchanged.
