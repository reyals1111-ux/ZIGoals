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
- **L4 — The phone's line is a river through each node (owner Part 1.1, 1.3).** *Why the phone failed twice:* AG Polish 2's ribbon (ADR-031 K16) still obeyed reference 01. Each stretch left a ring tangentially at one point and entered the next at another, heading the same way at both, so the line hugged each ring top-in/bottom-out and could not swing out into the free zones.
  - *Now* (`riverLine`/`riverSegments` in the new `lib/path/phone-river.ts`, used by FlowLine on phones): the line flows THROUGH each node's centre, drawn under it. It meets the ring wherever the flow crosses it, and its visible ends are cut exactly at the rings (de Casteljau).
  - Each stretch is one cubic. At each node the river keeps one direction. The first choice is the way its neighbours lie, turned by a seeded meander (20–38°) whose side alternates node to node, so the stretches bow one way and then the other like the computer's line (reference 05).
  - A stretch that breaks a rule tries its two nodes' other directions (gentler meanders, the plain course, ±18°/±34°, straight down) and handle lengths, two rounds at most. Never a loop, never `Math.random`.
  - The hard rules:
    - the control points keep going down, so the line never climbs and never crosses itself;
    - no radius under 40 px × width / 390 (+1 px for sampling);
    - inside the column;
    - 6 px clear of every other ring and planet, every name tab (at its reserved one-line width) and every banner's words plus their 44 px tint;
    - the turn hidden under a node is at most 30° each side, so at most 60° in all.
  - A tab may never have the line leave toward it by more than 12°.
  - Planets keep top-in, bottom-out (vertical at the top and bottom rim, as before). The finale keeps its upright side pass.
  - Soft: the line rather passes beside a NEXT badge than under it; the badge is always drawn above the line.
  - Removed: `ribbonSegments`, `passOf`, `curveFacts`, the `ribbon`/`obstacles`/`minRadius` options of `flowSegments`, and `lib/path/phone-lanes.ts`.
- **L5 — The phone's layout is the river's (owner Part 1.2, 1.4).** `phoneRiver` (same file) places each node, the side its tab hangs and the space above it, seeded from the path's id.
  - *Its constants* are the phone's CSS as measured in Chromium at 320–430 px:
    - the stage is the screen less 24 px;
    - a banner is its planet's diameter + 10, and its steps start 8 px below it;
    - the planet stands 4 px from the right edge;
    - a tab starts 12.4 px below its node's centre and 18.6 px beside it, and is 28.5 px tall.
  - *x:* each orbit flows out of its planet in a leftward sweep: a short one that stays in the right third, or a wide one across. Then come runs of short steps (12–22 % of the width) and wide sweeps (30–46 %).
    - A run turns at an edge (then sweeps wide back across), and now and then sooner, but only once it has reached that side's outer third.
    - A run toward an outer third not reached yet sweeps wide more often. A path of four or more nodes that has missed one goes there before its end.
    - The path's first three nodes take short steps, so the first screen holds three or four.
    - An orbit's last node stands 32–54 % of the width left of the next planet.
  - *Tabs:* each hangs on the side the line comes from, above it: the computer's own rule, in on the name's side and out on the other.
    - A name too long for that side hangs on the other where it fits (not before a planet), and the line leaves downward under it. Otherwise the node moves on along its run until the whole name fits on one line.
    - Only a name too long even at the edge wraps there (K5's rule), every line shown, never "…".
  - *Spaces:* each orbit goes through a palette in a seeded order (42, 58, 74, 98 px from a node's foot to the next one's top, plus 12 % of the sideways travel), so any four in a row hold a close one and a far one.
    - The model's own line is then drawn. Each stretch that breaks a rule widens its space by 16 px plus 6 % of its sideways travel, up to 22 rounds and 360 px per space.
    - Where one still breaks a rule, its lower node is pulled a third of the way back toward the station above, and the layout runs again (twice at most).
    - In an orbit of five or more whose spaces came out within 32 px of each other, one later space opens by 36 (or 52) px, kept only if the line still keeps every rule.
    - On a phone's first screen at most four nodes: the fifth moves down past it by at most 80 px.
  - *The page follows the model:*
    - each step's `--lane-x` and `--lane-gap` (its margin), each section's `--orbit-gap` and the stage's `--finale-gap`, phones only (≤ 640 px, `[data-lanes]`; amendment 3);
    - the line is drawn by the same `riverSegments` from the measured page;
    - the river depends on the path's shape (orbits, ids, names, planets), the width and the first screen's foot only, never on a tick.
  - *Cost:* about 50–100 ms for 13 nodes and up to ~300 ms for 30 in this sandbox, once per layout; stretches are cached by their shape.
- **L6 — The first screen (owner Part 1.4).** At 390 × 844 the first screen shows 3–4 whole nodes below the first banner and above the timer row, and at 360 × 780 at least 3, for paths whose first orbit has three nodes or more.
  - Exception: one of the first three names is longer than about 58 % of the stage (on a 390 px phone, about 26 characters). Such a node must stand at an edge and the river needs more room to swing there and back, so that path may show two. The property test leaves those paths out and says so.
- **L7 — No jump on first open (owner amendment 2).** On a phone, until the river is laid out and measured, the path is not shown at all (`visibility: hidden` under the phone query until `data-ready`). The path is then shown already settled, with no fade, so reduced motion and Motion Off see the same.
  - "Laid out and measured" means: the lanes are applied, the geometry was measured under their key, and the web fonts are ready (the names' widths are final), with a 2 s fallback.
  - The camera's landing on the next node waits for the same.
- **L8 — ZIGi on phones keeps clear of the line too (owner amendment 4).** ZIGi's placer (components/path/path-zigi.tsx) also avoids the drawn line on phones: its points every 8 px, kept 5 px clear. On a computer it may still stand in front of the line, as before (amendment 3).
- **L9 — Tests moved for Part 1:**
  - `checklist-phone-ag-polish-2` 1a: the ribbon's rules become the river's;
  - `path-engine` test 1 for ≤ 640 px: ends on the rim, downward, planets straight down, the finale tangent, on within 60° through a node;
  - `checklist-phone-ag-polish`'s pitch: ≥ 1.6 × 96 px becomes ≥ 96 px, because the owner wants close and far spaces;
  - unit `phone-lanes` is replaced by `phone-river` (240 seeded paths);
  - the ribbon block of `flow-geometry` is replaced by `flow-desktop-digest`, which pins the computer's line over 200 seeded layouts by a digest taken from `main` `261f32a`, plus three literal cases.
