# ADR-032: Session AG Polish 3, "The Checklist's last polish (phone line first)": session decisions

Status: **In progress** on `feature/session-ag-polish-3`, from `main` `261f32a` (Merge #93, Session AG Polish 2; live as Alpha #48), in a cloud session. This record holds the owner's decisions at plan approval, the owner's amendments, and every decision the session took without asking (by the project rules and the safest option). Resume point: `docs/handoff/AG_POLISH_3_RESUME.md`.

## Owner decisions (2026-10-23, plan approval)
- **The brief:** Session "AG Polish 3", the Checklist's last polish, in priority order:
  - Part 0: records.
  - Part 1: the phone's Path line and layout copy the computer's free river flow (reference 05). This is the reason for the session.
  - Part 2: no square behind planets.
  - Part 3: remove the progress bar.
  - Part 4: the List view (ticked items always shown; banners and rows in one column).
  - Part 5: the orbit consistency legend in three states on one row.
  - Part 6: the footer's Health → "= Wealth" line (colour and shape).
  - Part 7: the Earn dock off by default (TIER 3).
  - Part 8: Governance hidden by default.
  - The finish.
- **References:** the branch `review/session-ag-polish-3-refs` (`owner-refs/`), loaded into the session scratchpad with `git show`, never checked out, committed or shipped.
  - 01 is the OLD reference (in from above along the ring, out below): scrapped, never reproduced.
  - 02 is the iPhone Path view (pointers 1–9). 03 is the computer's List view (1–10). 04 is the footer (1–6).
  - 05 is the computer's Path view, the target look.
- **Usage and time:** everything pushed, CI green, out of Draft and reported before Sun 25 Oct 11:00 Brussels (10:00 UTC). The session's size is about Session AG's and never more than AG Polish 2's. Limits:
  - no research fan-out, at most 2 helpers, focused tests only locally (CI runs the full suite);
  - CI polled at most every 10 minutes;
  - at most 10 scratchpad captures and 1 fix round, never committed, and no owner-review screenshot sets.
- **The approved plan:** `/root/.claude/plans/concurrent-sniffing-acorn.md` (summarised in the resume file).
- **Amendments (2026-10-23, after approval; pre-approved by the owner):**
  1. **Legend semantics.** One meaning only:
     - "Some orbits" = at least one item done but not all;
     - "All orbits" = every item done;
     - "Nothing" = none.
     The label, the cell's title and the screen-reader words all say the same thing. The plan's "i.e. at least one orbit reached" gloss is dropped.
  2. **No visible jump on first open.** Before the first measure, the phone path never renders nodes or the line in the wrong place and then jumps (no layout shift, no flash): it stays hidden until measured, or shows already settled. Reduced motion and Motion Off show it still. The scroll to the current node runs only once the layout has settled. The new phone spec checks that node positions are unchanged between the first paint and 1 s later.
  3. **Computer and tablet layout unchanged, not only `flowSegments`.** `--lane-gap`, `--orbit-gap` and the new spacing rules apply on phones only (at or below the existing 640 px phone breakpoint). The existing layout audit and theme-parity checks for `/app/checklist` run on a computer and confirm no change.
  4. **ZIGi on phones.** Its box never overlaps the line, a node, a name tab or the NEXT badge. The new phone spec checks this over the three sample paths.
  5. **Deadline unchanged:** Sun 25 Oct 11:00 Brussels (10:00 UTC).

## Decisions taken without asking
- **L1 — The branch.** The owner named `feature/session-ag-polish-3`. The session's harness branch (`claude/determined-archimedes-vkndtj`) is left untouched, as K1 did.
- **L2 — Governance's switch does not enter the synced pages format (Part 8).** The settings v3 `pages` record is a strict object whose `items` are `z.partialRecord(z.enum([...PAGE_IDS, ...BUTTON_IDS]))`.
  - Measured with this lockfile's zod: a record with an id the reader does not know fails with `unrecognized_keys`. So a `governance` id written there would make builds #37–#47 refuse the whole settings v3 record, which breaks a rollback.
  - Instead, Governance's choice is `governanceShown?: boolean` in the device-only Earn preferences, `zigoals:earn-prefs:v1`. That record is a loose object since Session AF: older builds keep the field and ignore it.
  - This is labelled TIER 3 (stored preference), proven with the frozen readers.
- **L3 — The phone's Path/List switch stays in ⋯ (Part 3).** At 360 px the top bar's 336 px would need about 400 px for X, the progress words, the streak, "+", "⋯" and a two-button switch, all at 44 px. The switch does not fit, so it stays in the ⋯ menu on phones, as the brief allows. Tablets and computers keep it in the bar.
