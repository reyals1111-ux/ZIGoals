# ADR-022: Session AA-Local, "Habits, Health and the game layer, best in class + ZIGi everywhere": session decisions

Status: **In progress** on `feature/session-aa-local`, from `main` `32cb9c5a` (Merge #82, Alpha #37), on the owner's
Mac (M1 Max) with the RTX 5090 PC for local models (Ollama over the tailnet through a loopback forwarder). This record
holds the owner's decisions at plan approval and every decision the session took without asking (the brief: the safest
option that keeps every promise). The parallel lane AA-Cloud (`feature/session-aa-cloud`, ADR-021) owns the shell,
Goals, Settings, Today's layout and the progress slot; the lanes talk through `docs/handoff/AA_LOCAL_TO_CLOUD.md` and
`docs/handoff/AA_CLOUD_TO_LOCAL.md`. Evidence: `docs/verification/aa-local/`; raw runs on `review/session-aa-local-runs`;
captures on `review/session-aa-local-screens`.

## Owner decisions (2026-10-11, plan approval)
- **The brief:** seven parts (Habits H1–H6 and H8; the game layer H7 with the Journey page and celebrations S10; Health
  N1–N12 without the photo-plate test; swipes S5, onboarding S4 and the reminders plan S7; ZIGi for every new action in
  English and Dutch, typed and spoken; fine-tuning on real models at most $50; the Showcase), three gates, one PR, raw
  runs and captures on orphan branches, the decisions here as B1…Bn. English only; USD and EUR only; no French.
- **Plan edits (approved with the plan):**
  1. One list of life areas: AA-Cloud's `lib/goal-extras/areas.ts` (device key `zigoals:life-areas:v1`; seven defaults
     `health`, `mind`, `wealth`, `relationships`, `career`, `learning`, `fun`, plus the person's custom areas). Until its
     merge, a local mirror with exactly those ids, switched to AA-Cloud's module in one line after the merge. Habit areas
     store only the area id. If the handoff lacks the store's API when H6 is reached, the rest of Part 1 goes first.
  2. No silent descoping: every item ships working; where something cannot be done as written, the closest safe version
     is built, the reason recorded here and listed in the report.
  3. Beautiful, not just working: every new surface gets its own designed card in the cosmic/nebula language (headings
     white→nebula, shared tokens, ≥ 14 px text, ≥ 44 px targets, no overlap or wrap, designed empty states with a first
     action; new Health view tabs stay one line, a scrollable chip row on phones). Before/after captures at 390, 1024 and
     1440 (Showcase and empty) of every touched page and feature go to `review/session-aa-local-screens` with a one-line
     "what's better" note each, self-reviewed against those rules before moving on.
  4. One celebration system: this lane's component is the only renderer; AA-Cloud only emits events through ZIGi's bus,
     which the renderer listens for too, so a goal reached celebrates exactly once; the handoff names the rendered events.
  5. The handoff asks AA-Cloud, in the first hour, for every place needed in its files (the game setting under "Your pages
     & buttons", a navigation entry for `/app/journey`, a Settings link to `/app/settings/reminders`, Today's slots for the
     habit time-of-day widget, the game card and the coach card, the swipe hook on goal steps, the coach card in the Life
     review registry); re-checked at every gate; whatever is still missing after AA-Cloud merges is wired by this lane as
     the second merger and recorded.
  6. Showcase without conflicts: this lane's Showcase data lives in its own modules (`lib/*/showcase.ts`) with one call per
     module in `buildShowcase`; every feature appears filled (the energy estimate's ≥ 14 logged days and ≥ 6 weights, the
     insights' minimum days, months of history for the year view).
  7. Usage: the planned order, lean turns, the fine-tuning chains in the background while building, stretch items only
     after Gate C is green.
  8. The PR-ready check at the end confirms through the GitHub API that the PR is no longer a draft and that its
     description is the final one.
- **B1–B10, approved with the plan:**
  - **B1** No new field ever enters a strict synced record (`habits` v3, `health` v4, `settings` v3): every new state
    lives in a new device-only, versioned, loose key listed in `lib/aa-device-keys.ts`, added to the welcome's key lists,
    Export everything, account erase and the turn-off paths, each in its own `[TIER 3] (storage)` commit with a
    frozen-reader test; writes to existing records go only through their existing mutators.
  - **B2** The game switch lives in the device key `zigoals:game:v1` and is rendered under "Your pages & buttons" by
    `components/game/game-setting.tsx`, which AA-Cloud mounts (asked in the handoff); until then it is also on the Journey page.
  - **B3** Swipes on goal steps use this lane's hook in AA-Cloud's Goals files after its agreement in the handoff.
  - **B4** A local mirror of the slot API serves the Journey page and the tests until AA-Cloud's merge; then one line
    switches to `components/progress/slot.tsx`. (AA-Cloud pushed `slot.tsx` in its first hour, so the mirror re-exports
    the same shapes and the switch is an import path.)
  - **B5** The Showcase keeps no running fast (Today unchanged); the fasting timeline shows the last fast.
  - **B6** Micronutrients are the seven the format already holds (fiber, sugars, saturated fats, sodium, potassium,
    calcium, iron); vitamins are an owner item (a format change).
  - **B7** Progress photos: compressed on the device, blobs in IndexedDB, an index in a device key, capped, exported
    inside the Export everything zip, removed by account erase.
  - **B8** The recipe URL route ships only if every SSRF test passes; otherwise paste-only with the reason here.
  - **B9** ZIGi's URL import is a deliberate "no" (files and the network are the page's own); pasted text is a card.
  - **B10** Showcase money is EUR or USD; "money saved" uses the person's own cost figure only and is labelled an estimate.

## Session decisions
| # | Part | Decision | Why it is the safest option |
|---|---|---|---|
| B11 | 0 | The life-area mirror (`lib/habits-extras/areas-mirror.ts`) carries exactly AA-Cloud's seven default ids and reads the person's custom areas from `zigoals:life-areas:v1` tolerantly (unknown bytes read as the defaults); it never writes that key. | One list (owner edit 1); a reader that writes nothing cannot drift from AA-Cloud's store. |
| B12 | 1 | **Time-of-day sections are four layout regions.** The Habits grid in the Today, All, Completed and Goal-linked filters is split into Morning, Afternoon, Evening and Anytime (`<details>` sections, H1), each its own `LayoutRegion` (`cards:<section>`) so a person can still arrange the cards inside a section; the flat filters (Morning, Afternoon, Evening, Archived) keep the single `cards` region and the order saved for it. A fold is kept per section in `zigoals:habit-extras:v1`. | One saved order cannot interleave four headings; per-section regions keep arranging possible without a format change. |
| B13 | 1 | **Only the clock's section opens by default** (morning 05–11, afternoon 12–16, evening otherwise); when it has no habit, the first section with a due habit opens, else Anytime. The first version also opened every section with something due, which hid nothing but made the page a wall; the brief says "the current section opens first". | The brief's rule, exactly; a fold the person makes wins over the clock. |
| B14 | 1 | **A skip with a reason is a skipped entry whose note starts with "Skipped · "**, through the existing `setHabitEntryStatus`; a note and mood on today's check-in go through `logHabitValue`'s existing `note`/`mood`; "Streak freeze" (Part 2) is a skipped entry with that note. No new field in the habits record (B1); the history reads the shapes back. | The entry already carries note and mood; the prefix is a convention the reader can recognise, never a schema change. |
| B15 | 1 | **Finish in one tap:** `finishHabitTimer` pauses a running timer at `now` and commits it (the review rules of `commitHabitTimer` unchanged), so "Finish · log it" fills today's check-in from a running timer. The bell rings once per timer when the elapsed time reaches the rule's target, through the meditation bells, never in quiet hours (the knock's 22:00–08:00 until the reminders plan of Part 4 lands). | The timer's existing timestamps and receipts are the record; a second mutator adds no state. |
| B16 | 1 | **Routine templates reuse an active habit with the same title** instead of creating a twin, linking it into the chain only when it has no stack of its own (the editor's own "stack after" field, written directly). A routine run (`zigoals:routine-run:v1`) is stale on another day or when its stack is gone, and reads as none. | The Showcase and real people already have "Meditate" or "Read"; a template must never double them. |
| B17 | 2 | **XP is derived, never stored** (`lib/game/xp.ts`): a rule table over the journals with per-day caps for diary and water; levels at 50·n²; quests picked by a day hash from the pages shown and provable from the records only; challenges against last week only; badges derived, with only the day first SEEN in `zigoals:game:v1`; freezes earned per seven-day streak and spent as a skipped entry. Undo therefore removes XP by removing the record. | The brief: nothing lost, nothing double counted; a stored ledger would drift from the records on every Undo. |
| B18 | 2 | **The celebration renderer listens for AA-Cloud's goal events by type only** (`goal_milestone_reached`, `goal_funded`: ZIGi's bus carries `{type}` and nothing else, the studio's privacy boundary), so a goal reached celebrates once per kind per day on this device; levels, badges, 100-day streaks and fasting milestones carry ids and celebrate once each. The first level the layer ever sees is remembered, not celebrated. | One renderer (owner edit 4) without widening the bus's privacy boundary. |
| B19 | 2 | **Three semantic events join ZIGi's table** (`routine_finished`, `level_up`, `achievement_unlocked`), validated-only, celebrate, mapped to `action-applied`; the semantic test's pinned list grows by exactly those three (listed under "Assertions changed"). | ZIGi joins the celebrations through its own controller and caps, as the brief asks. |
| B20 | 2 | **The first switch-on remembers, it does not celebrate.** When the game layer is turned on, the level and every badge the records already hold are written as seen (`levelSeen`, `badgesSeen`); only what comes after celebrates. The first capture of the Journey with the Showcase queued nine badge celebrations at once. | A celebration is for a moment, not for a history. |
| B21 | 2 | **At most five freezes in hand** (`MAX_FREEZES`): one per seven-day streak any habit ever reached, minus the ones spent; the Showcase's six long streaks would otherwise hold eighteen. | A stockpile makes a miss meaningless; five mend a week. |

## Assertions changed (deliberate, listed)
- **Part 1 (B19), `lib/ai/zigi-semantic.test.ts`:** the pinned `CELEBRATIONS` list gains `routine_finished`, `level_up` and `achievement_unlocked` (ten entries, was seven); the same test now also asserts each of the three is refused unvalidated and plays as `action-applied` when validated (stricter).

## Rejected options
None yet.

## Consequences
Filled at the end of the session.
