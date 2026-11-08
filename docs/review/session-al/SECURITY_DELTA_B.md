# Security delta B: stored formats, parsers, shell and CSP (Session AL)

Range: `17069c7d..a81b18dd` (HEAD moved from d86a85bd during the review; the three new commits were read too). Scope per owner rule 12: stored formats, backup, restore, export, erase, import and parsers; shell, CSP, headers, service worker, back handling and API routes. I reviewed the diff, not whole files, and made no code or git changes. Two findings (SB-3, SB-4) were confirmed with a scratch Vitest run outside the repo. The others come from reading the code.

## Findings

**SB-1 · Medium · "Erase one area" keeps a full copy of what it erased, indefinitely**
`lib/restore/erase-area.ts:60` → `lib/restore/apply.ts:173` (`importPrivateStore`) → `lib/private-storage.ts:94` (`replaceWithRecoveryCopy`).
- **What goes wrong:** Erasing Goals and Wealth, Habits or Health replaces the module with an empty record through the restore path. That path saves the previous bytes as `<key>:recovery:<uuid>`. The copy has no expiry: it is only pruned when a later replace of the same key succeeds. So after "Erase Health" the full Health record stays in this browser, beyond the 7-day Undo. The page says "you can undo it for 7 days" (`components/restore/restore-backup.tsx:159`). It does not say a copy stays, and the Data health page lists the copy but cannot delete it.
- **Fix:** For an erase, do not keep a recovery copy, since the 7-day Undo record already holds the "before". Or remove `<key>:recovery:*` when the Undo expires or is dismissed, and say so in the UI.
- **Test:** Unit test: seed Health, run `eraseInventory` then `eraseArea` for Health, then "Keep" or let the Undo expire. Assert that no `…:recovery:` key for the Health module remains.

**SB-2 · Medium (confirm intended scope) · Account erase leaves recovery copies behind, and Session AL adds many more of them**
`lib/aa-device-forget.ts:36` (removes exact keys only); new copy writers in `lib/vault/backup-lists.ts` `write()`, `lib/vault/backup-records.ts:138` and `lib/restore/erase-area.ts`.
- **What goes wrong:** `forgetAaDeviceRecords` removes the listed keys. It never removes the `<key>:recovery:<uuid>` copies kept beside them. Since Session AL, restoring a protected copy (formats 3 and 4) creates such copies for Tasks, the Checklist and every device record in the new sections (journal, money log, notes, accounts and more). After the account erase, those old contents stay on the device.
- **Why it matters:** PRIVACY.md says these records are "removed by the account's erase". The new Data health text says "Erase removes them", which is true for Erase everything only. `lib/erase-coverage.test.ts` does not cover recovery copies.
- **Fix:** In `forgetAaDeviceRecords`, also remove `recoveryCopyKeys(target, key)` for every key it erases.
- **Test:** Add a case to the account-erase tests: set `zigoals:journal:v1` and `zigoals:journal:v1:recovery:<uuid>`, run the erase, and assert both are gone.

**SB-3 · Low · A Tasks import can make a task its own parent (confirmed)**
`lib/tasks/import.ts:177-178`; `lib/tasks/schema.ts:85`; `components/tasks/tasks-page.tsx:249`.
- **What goes wrong:** `ids.set(item.ref, id)` runs before `ids.get(item.parentRef)`. A VTODO with `UID:x` and `RELATED-TO:x`, or a TickTick row whose `parentId` equals its `taskId`, is stored with `parentId === id`. The scratch test confirmed this: `[{"id":"task_1","parentId":"task_1"}]`.
- **Effect:** The task drops out of every list view, because those views list top-level tasks only. A typed search still shows it, and its "Subtasks (1)" toggle renders `row(k, depth + 1)` for itself with no depth limit. That recursion overflows the stack and the Tasks page fails. The schema also accepts self-parents and A↔B parent cycles from a restore or another tab.
- **Fix:**
  - In `applyImport`, look up the parent before setting the id, and ignore a `parentRef` equal to the task's own `ref`.
  - On read, drop a `parentId` equal to `id` or one that closes a cycle (with the same walk guard as `isBelow`, `lib/tasks/device.ts:114`).
  - Cap the depth of rendered children.
- **Test:** A unit test for the ICS above (expect no `parentId`), a schema test for a cyclic record, and a page test where search plus expand does not throw.

**SB-4 · Low · A Tasks import can exceed the project and section caps, and the extra projects are dropped silently (confirmed)**
`lib/tasks/import.ts:163,169` (no limit) and `lib/tasks/schema.ts:105` (`tolerantArray` slices to 100 projects and 300 sections).
- **What goes wrong:** A TickTick backup with 120 lists produced 100 projects, and 20 tasks were left pointing at projects that no longer exist. Those tasks are in no project view and not in the Inbox (`!t.projectId`). The preview still promises "into" all 120 lists. The same happens when an import adds projects to a record that is already near the cap.
- **Fix:** In `applyImport`, stop making projects or sections at `MAX_PROJECTS` / `MAX_SECTIONS`. Put the overflow tasks in the Inbox (or refuse them) and report it the way `overCap` is reported.
- **Test:** Import 120 lists and assert every task's `projectId` resolves, or is absent and counted.

**SB-5 · Low · PRIVACY.md was not updated for Session AL's stored data**
`docs/PRIVACY.md` has no diff in the range.
- **What's missing:** None of the 10 new keys in `lib/al-device-keys.ts` is named. Four of them are personal: wallet names, the first name for the greeting, meal names and drink types (Health-describing), and the extra Markets favourites. It also does not say that the protected copy now carries Tasks, the Checklist and the format-4 device records.
- **Also missing:** Since a81b18dd, a deleted note's photo is kept for up to 30 days (`lib/notes/photos.ts:58`). It is not exported and not shown anywhere, so the person cannot see it.
- **Already covered:** The data catalog, export, erase and the coverage tests do include all 10 keys.
- **Fix:** Add a "Session AL" block to PRIVACY.md in the style of the AH/AI/AJ block.
- **Test:** Doc review. An optional test could check that every `AL_PERSONAL_KEYS` literal appears in PRIVACY.md.

**SB-6 · Low (account-switch behaviour not run) · Tab drafts with personal text outlive the account erase**
`components/onboarding/onboarding-flow.tsx:85` (welcome draft: first name and goal name) and `components/habits/habit-editor.tsx:25` (habit title).
- **What goes wrong:** Both drafts live in sessionStorage and are not scoped to an account. The account erase only removes localStorage keys, so in the same tab a draft survives the erase and can prefill the next account's form. Erase everything does clear them. The goal-wizard draft already behaved this way before Session AL.
- **Fix:** Clear `zigoals:*draft*` sessionStorage keys in the account erase and on `ACCOUNT_CHANGE`.
- **Test:** Write a habit draft, run the account erase, and assert the sessionStorage key is gone.

**SB-7 · Info · The calculator CSV skips `csvSafeCell`**
`components/calculator/calculator-extras.ts:28` has its own `csvCell` without the formula guard. Today every cell is generated by the app (numbers, a currency code, a fixed sentence), so nothing can be injected. **Fix:** Use `csvSafeCell` so a future free-text cell is safe too.

**SB-8 · Info · Restoring the new vault sections is not fenced against an account change**
`components/private-vault-tools.tsx:58-61`: after `await sectionsLib()`, the restore calls `getAppStorage()` with no generation check and no storage lock. `ACCOUNT_CHANGE` does clear the preview (line 34), so the window is short. **Fix:** Capture the storage and generation before the await, re-check them before writing, and write under `withStorageLock`.

**SB-9 · Info · A dialog can ignore a real Back press**
`components/use-back-closes.ts:18-27`: if the dialog's own `history.back()` fires no popstate (for example, it leaves the document), a person's Back within 1 s is marked as the dialog's own and ignored. The dialog stays open while history moves. Nothing navigates anywhere unexpected.

## Checked, no issue found
- **CSP, headers and Permissions-Policy:**
  - `next.config.ts` adds only static 307 redirects (`/welcome`, `/onboarding`, `/start`, `/setup` → `/app/welcome`), and the catch-all route redirects to fixed paths only. No open redirect.
  - Permissions-Policy only drops the `bluetooth` token (TK-191, on purpose). Chromium does not recognise it, so nothing changes in practice.
  - `_headers` matches `egress-policy.json`, and CSP, frame-ancestors, script-src and connect-src are unchanged.
- **Outside hosts:** No new ones in client or server code. The `ollama.com` mentions are text and commands shown to the person, not requests.
- **API routes:** `/api/private-account` (status read) and `/api/push` (GET) turn the not-configured 503 into a 200 with `configured:false` and `signedIn:false`, keep `no-store`, and still fail closed. No new routes were added.
- **Service worker (`keepDocument`, `trimPages`):** It keeps only same-origin `/app` documents, strips the query, respects `NEVER_STORED` and `forgotten`, skips prefetches and redirected answers, and stays within `MAX_PAGES`.
- **Encrypted backup formats 3 and 4:** They are versioned and the version must match the sections. Older builds refuse the file before writing anything. Each part's section is bound by the authenticated inventory, and the Health records are included only with the Health choice. Restoring checks each record against its own schema, skips unknown ids, skips records saved by a newer version, and rolls back if a write fails.
- **New stored fields:** Optional and loose (Tasks fields, NOVA `by`/`via`, note photo `orphanSince`, Checklist `filled`). The 500-task cap stays.
- **Bounds and prototype pollution:** Every new device record is versioned and bounded, and zod drops `__proto__` keys.
- **CSV exports and parsers:**
  - Every new export (tasks, checklist, checklist-days, wealth-holdings, staking rewards) goes through `csvSafeCell`, and the date-range export only filters those safe cells.
  - Size caps: the Tasks import 2 MB (`PARSE_MAX` 500 per line), sleep CSV 2 MB / 20,000 rows / 64 columns, weight file 1 MB, ICS 2 MB.
  - Imported names reach no HTML sink.

| ID | Severity | Area | Status |
|---|---|---|---|
| SB-1 | Medium | Erase one area keeps an indefinite recovery copy | Code-verified |
| SB-2 | Medium | Account erase leaves recovery copies (more since AL) | Code-verified; owner to confirm intended scope |
| SB-3 | Low | Tasks import self-parent → hidden task, render recursion | Reproduced |
| SB-4 | Low | Tasks import exceeds project/section caps → orphan tasks | Reproduced |
| SB-5 | Low | PRIVACY.md missing AL records, backup sections, 30-day photo grace | Doc gap |
| SB-6 | Low | Tab drafts with personal text survive the account erase | Code-verified; not run |
| SB-7 | Info | Calculator CSV without `csvSafeCell` | Not exploitable today |
| SB-8 | Info | Vault section restore not fenced after await | Narrow window |
| SB-9 | Info | Back marker can swallow a real Back within 1 s | Usability, not security |

## Fixes (8 Nov)

All fixes are labelled **TIER 3 (stored format)**. No stored shape changed except one additive, optional field (SB-1, below).

- **SB-1 · Fixed.** An erase's Undo record now carries `erase: true` (optional field on `zigoals:restore-undo:v1`; an older build does not read such a record, so it offers no Undo there and removes the record). When that Undo ends, every `<key>:recovery:*` copy of each record the erase wrote is removed, in browser storage and in the private database. "Ends" means Undo, "Keep the erase", the 7 days being over (seen the next time the restore page opens), a later restore or erase, or nothing being left as erased. A part whose Undo fails keeps its copy. An erase no longer makes a copy of an unreadable device record, because the Undo record holds those bytes. An erase whose Undo cannot outlive the tab keeps no copy at all. The page now says what is kept and for how long. A restore's copies are unchanged.
  - Files: `lib/restore/apply.ts`, `lib/restore/erase-area.ts`, `components/restore/restore-backup.tsx`.
  - Tests: `lib/restore/erase-area.test.ts` (6 new); the existing `undo-reload.test.ts` "Keep the restore keeps copies" still passes.
- **SB-2 · Fixed.** `forgetAaDeviceRecords` (the account erase) now also removes the recovery copies of every key it erases. Erase everything already removed them (they start with `zigoals`).
  - Files: `lib/aa-device-forget.ts`.
  - Tests: `lib/aa-device-forget-recovery.test.ts` (Tasks, the Checklist and its days, the journal, the money log and notes; every restore device part; a storage view that cannot list its keys).
- **SB-3 · Fixed.** `applyImport` looks up the parent before it records the task's own id, and ignores a parent that names the task itself. `tasksSchema` now breaks loops on read (`breakParentLoops`): a self-parent, a loop of parents (one link per loop) or a missing parent reads as top-level. The Tasks page stops drawing subtasks at `MAX_SUBTASK_DEPTH` (8).
  - Files: `lib/tasks/import.ts`, `lib/tasks/schema.ts`, `components/tasks/tasks-page.tsx`.
  - Tests: `lib/tasks/import-safety.test.ts` (ICS UID == RELATED-TO, TickTick self-parent, ICS 2-cycle, schema self/2-/3-cycle and missing parent, depth guard).
- **SB-4 · Fixed.** `applyImport` stops making lists at `MAX_PROJECTS` and sections at `MAX_SECTIONS`. Tasks of a list past the cap go to the Inbox; tasks of a section past the cap stay in their list. The result counts these in `merged`. The preview names the lists over the cap (`listsOverCap`), and the status line says how many lists and sections were merged.
  - Files: `lib/tasks/import.ts`, `components/tasks/tasks-io.tsx`.
  - Tests: `lib/tasks/import-safety.test.ts` (120 lists, a record near the cap, 310 sections).
- **SB-5 · Fixed.** PRIVACY.md has a Session AL block covering:
  - the 10 keys;
  - the protected copy's new contents;
  - recovery copies and their erase;
  - what Erase one area keeps;
  - the 30-day photo grace for a deleted note;
  - tab drafts.
  - Files: `docs/PRIVACY.md`.
  - Tests: `lib/security-delta-b.test.ts` (every `AL_ERASE_KEYS` literal is named in PRIVACY.md).
- **SB-6 · Fixed.** A new `forgetTabDrafts()` clears the welcome, habit and Goal-wizard drafts from sessionStorage. The account erase (`forgetAaDeviceRecords`) and Sign out (`components/account-access.tsx`, TIER 3 auth: one added call) both run it. A switch of account without a Sign out is not covered (see SB-6 left open).
  - Files: `lib/tab-drafts.ts` (new), `lib/aa-device-forget.ts`, `components/account-access.tsx`.
  - Tests: `lib/aa-device-forget-recovery.test.ts`.
- **SB-7 · Fixed (one line, fail-closed).** The calculator's `csvCell` applies the shared `CSV_FORMULA_START` guard to text cells. A plain number, a negative one included, stays a number, so the format is unchanged.
  - Files: `components/calculator/calculator-extras.ts`.
  - Tests: `lib/security-delta-b.test.ts`; the existing C-TK-31 test still passes.
- **SB-8 · Recorded.** Info, and the window is narrow: `ACCOUNT_CHANGE` already clears the preview. The fix (capture storage and generation before the await, re-check them, and write under `withStorageLock`) is not one line. It also belongs to `components/private-vault-tools.tsx`, which is sync/vault code.
- **SB-9 · Recorded.** Info, usability only: no navigation goes anywhere unexpected.
- **Left open:**
  - SB-6 on a plain `ACCOUNT_CHANGE` with no Sign out: the drafts are not tied to an account. Fixing that would mean touching `lib/account-session.ts` or scoping the drafts.
  - An erase whose 7 days end while the restore page never opens keeps its copy until that page next opens, or until the account erase or Erase everything. The page and PRIVACY.md say so.
