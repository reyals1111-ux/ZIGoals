# Session AG Polish 3 — resume file

Branch `feature/session-ag-polish-3` from `main` `261f32a` (Alpha #48). One PR, kept in Draft until the end. Decisions: `docs/architecture/ADR-032-session-ag-polish-3.md`.

**Hard deadline:** everything pushed, CI green, out of Draft and reported before **Sun 25 Oct 11:00 Brussels (10:00 UTC)**.

**References:** `review/session-ag-polish-3-refs` (`owner-refs/`). Load them into the scratchpad with `git show`; never check them out, commit them or ship them. 05 is the target look; 01 is scrapped.

## Rules in force (short)
- One commit per part, pushed. Tier 3 commits are labelled "TIER 3 (<area>)" with their risk and rollback.
- No new dependencies. No wallet, signing, contract, key, auth, sync, CSP or deploy-workflow changes.
- Phone changes apply at ≤ 640 px only; computers and tablets keep their layout.
- Reduced motion and Motion Off are respected. Theme parity in Nebula, Light and Dark.
- Route weight within budget (`/app/checklist` ≤ 492 kB).
- At most 2 helpers. Builds and Playwright run one at a time (Chromium, ≤ 2 workers).
- At most 10 scratchpad captures and 1 fix round, never committed. CI polled at most every 10 min.
- Known CI intermittents (one re-run each): `execute.test.ts:116`, `domain-review-race.test.mjs:41`, `run9-2-product.spec.ts:30`, and the WebKit "ZIGi box empty" class.

## Owner amendments (after approval; ADR-032)
1. **Legend:** Some orbits = at least one item done but not all; All orbits = every item done; Nothing = none. The label, the title and the screen-reader words say the same thing.
2. **No jump on first open:** the phone path is hidden until measured, or shows already settled. The scroll to the current node runs after that. The spec checks that positions are unchanged between the first paint and 1 s later.
3. **Computers and tablets unchanged:** `--lane-gap`, `--orbit-gap` and the new spacing apply on phones only. Run the layout audit and the theme parity check on a computer.
4. **ZIGi on phones:** its box never overlaps the line, a node, a tab or the NEXT badge. Checked in the new phone spec over three sample paths.
5. **Deadline unchanged.**
6. **(MAJOR, after Part 1's first commit) The phone river, redone (river v2).** Reference 06, the session's own preview, is wrong: nodes stacked down one side and a near-vertical line.
   - Every stretch is an S-swing through a waypoint (two C1 cubics), swinging ≥ 30 % of the column and bowing beside its chord, the swings alternating.
   - The stations alternate across the width: every 3 in a row reach both outer thirds, never 3 in one half.
   - The first screen at 390 × 844 spans ≥ 65 % with ≥ 2 turns and stations on both sides.
   - The tests must make 06 fail. A visual gate comes before Part 2. Report the numbers here.
8. **(24 Oct, FINAL METHOD) Phone = computer × scale** (replaces 6 and 7): the computer's own layout and line in a virtual 976 px column, × s into the phone's column; readable pieces on top; tests and a 4-capture gate. See ADR-032 L20.
9. **(25 Oct) Line first, nodes on the line** — reverted by amendment 10 (`d96cf81d`, `3575bd5c`).
10. **(25 Oct, FINAL phone path fix; replaces 9)** Amendment 8's path again, with sy in [2 × sx, 1] (the least value at which every overlap check passes), compact pill banners, one short word per node (phone and computer; `pathLabel`, TIER 3 stored format) and the owner's overlap checks at 320/360/390/430. Checkpoint: 2 captures at 390 × 844 in Nebula, then STOP for the owner.
10b. **Stretch the nodes sideways:** x = phone centre + (computer x − computer centre) × kx, one kx per path, outermost rings 8–14 px from the edges; the line = the computer's `flowSegments` on the phone's stations (swing × kx, 8 px gutter); span checks (≥ 60 % per orbit of ≥ 4 nodes; a node in an outer 25 % and one in the middle 40 %).
7. **(MAJOR, after Part 2) River v3.** Every path had become the same zig-zag, so amendment 6's alternation rules go. The phone tries the computer's own line first; variety becomes a hard rule (seeded drifts, sweeps ≥ 45 %, bows and swings; node x across the width; spaces ≈ 90–200 px). Variety tests replace amendment 6's; a strict zig-zag and 06 fail them. A visual gate (at most 2 fix rounds) comes before the next part.

## Plan summary
- **Part 0:** records.
- **Part 1:** the phone river (`lib/path/phone-river.ts`). The line flows through each node's centre, trimmed at the rings. Planets stay top-in, bottom-out. Each tab hangs on the side the line comes from. Gaps are seeded, then widened only where needed. Property tests; the computer's `flowSegments` digest is pinned.
- **Part 2:** the cause of the planet square, then the fix, an asset alpha test and a halo spec.
- **Part 3:** remove `ProgressSegments`.
- **Part 4:** the List: ticked rows stay in place; banners and rows share one column.
- **Part 5:** three-state legend.
- **Part 6:** the footer arc as C1 cubics, its colour along the path.
- **Part 7:** Earn dock off by default (TIER 3).
- **Part 8:** Governance hidden by default, via `governanceShown` in the Earn preferences (TIER 3, ADR-032 L2).
- **Finish:** the STATUS entry, CI green, out of Draft.

## Parts
| Part | What | State | Commits |
|---|---|---|---|
| 0 | Records (Alpha #48, AG Polish 2 merged and deployed, run 50 failed before building), ADR-032, this file, Draft PR ([#94](https://github.com/reyals1111-ux/ZIGoals/pull/94)) | done | `a5e7a7b2` |
| 1 | The phone river (ADR-032 L4–L9), first try | superseded by 1 v2 | `0aaebc83`, scratch spec removed `9761a2a8` |
| 1 v2 | River v2, owner amendment 6 (ADR-032 L10–L11) | superseded by 1 v3 | `cb271c8c` |
| 1 v3 | River v3, owner amendment 7 (ADR-032 L13): the computer's `flowSegments` on the phone, a seeded walk for the nodes | done | `ca4012bd` |
| 2 | No square behind planets (ADR-032 L12): the banner's rounded sideways clip cut the glow and the mist; the shell cuts at the screen's edge now; every planet file's edge is clear | done | `c4811e6c` |
| 3 | Progress bar removed; top-bar controls 44 px or more (ADR-032 L14) | done | `6c831d5c` |
| 4 | List view: ticked rows stay in place; banners and rows in one column (ADR-032 L15) | done | `528fb58a`, typecheck fix `f08bec4c` |
| 5 | Legend: Nothing, Some orbits, All orbits on one row; the same words everywhere (ADR-032 L16) | done | `675f127a` |
| 6 | Footer line: one smooth river (C1 quarter turns and runs, radius ≥ 40 × w/390), magenta and pink to just before the crest, then gold (ADR-032 L17) | done | `f1deb358` |
| 7 | Earn dock off by default (TIER 3, ADR-032 L18): `dockShown === true`; a stored choice kept; rollback = revert, nothing stored changes | done | this commit |
| 8 | Governance hidden by default (TIER 3, ADR-032 L2, L19): `governanceShown` in the device-only Earn preferences; the switch after Chess; frozen readers #37–#48 pass | done | `dd9569c5` |
| 1 (×s) | Owner amendment 8: phone = computer × scale (ADR-032 L20); the river deleted | done; density checks reported to the owner | WIP `5ea2a1d9`, `93247d09`, tests moved + STATUS: the final commit |
| Finish | STATUS entry written; CI and out of Draft wait on the owner's density decision and "bump zod" | partly | the final commit |

## River v3 (owner amendment 7): what the literal port needed to change, and why (ADR-032 L13)
- **Kept as is:** the line. A phone draws the computer's `flowSegments` itself, unchanged (side points, straight down; same side → a bow past both rims, across → a swing through the middle; seeded per stretch), with the phone's swing min(150, 0.4 × the column) = 146 px at 390. A unit test checks the model's line equals it.
- **Changed — node placement.** The computer's 8-step wave moves each node half a swing: five fixed places in a phone's column, and no neighbour more than 73 px across, so no sweep could ever happen (the variety rules fail by construction). The phone walks instead: seeded places across the column on both name sides, each stretch drawn by `flowSegments` and judged by its own shape, the plan's kind first (every run of five holds each kind; the first run a drift, a sweep and a bow).
- **Changed — the finale** takes the line in at its top on a phone (it stands mid-column under the river).
- **Dropped on a phone — the lead-in and the tail:** the first planet's top is 7 px down, and the tail in the 70 px under the finale would bend tighter than 40 px for every seeded amplitude.
- **Added — the phone's needs:** heights grown 8 px at a time where a stretch breaks a rule (radius, column, clearances); room on a node's way out for its next stretch's seeded bow (long names hang toward the middle, so the line leaves toward the near edge); one step of backtracking; seeding by the path id and its node ids (the path id itself is the constant `checklist-today`); the first screen's three nodes from their least height, a compact retry and the six first-run orders tried until the first two screens show a drift, a sweep and a bow; the spaces spread 62 px in every orbit of four or more.
- **Measured** (240 seeded paths): drift 44 %, sweep 21 %, bow 20 %, swing 15 % of stretches; the fullest 20 % band 39 % of nodes; spacing p10/median/p90 126/169/256 px; no hard-rule break; first screen 3–4 at 390 on every qualifying path, 3 at 360 on 19 of 20.
- **Visual gate:** 390 × 844 and 360 × 780, the three sample paths, beside reference 05. Fix round 1 (of 2): bows looked like gentle S's because their two nodes stood far apart; bows now take the nearest place below and count only from 16 px past the rims. After it each sample is a different river with a short drift, a long sweep and a visible loop in its first two screens.
- **Found on the way:** ZIGi's line check took about a second per tick on a phone and cut the tick's travelling light short (now reads only the line points beside each place); `checklist-overlay-af` 421 moved to Gate C's "past the name" rule where the node's own tab stands between it and ZIGi; `path-engine` test 1 on a phone now runs the computer's stricter check.

## Captures used (self-check, scratchpad only): Part 1 v1: 5; the river v2 gate (amendment 6 lifts the cap for Part 1 only): 15; the river v3 gate (amendment 7): 36 (three samples × two sizes × two screens, three times) · fix rounds: v3 gate 1 of 2

## Open items found on the way
- **CI audit (not this branch's):** since about 2026-10-23, `pnpm audit --prod --audit-level high` fails on every branch, `main` included, on GHSA-mrhx-c7xc-m3w5: zod < 4.6.6, the app's own pin 4.6.5 and walletconnect → ox → abitype. The fix is the patch release, zod 4.6.5 → 4.6.6. It is a dependency change, so it waits for the owner (asked in the session chat).
- `checklist-overlay-af` 52 (X and Escape back to Today) fails on the dev server only; it passes on a production build (and passed in CI).
- `scripts/frozen-readers.mjs` run without `--out` drops its first SHA argument (`i !== outAt + 1` with `outAt = -1`); pre-existing, not changed here. Pass `--out` (or list the SHAs after it).

## Amendments 10/10b: state (25 Oct)
- Commits: `42826d50` (geometry WIP), `40b86d96` (TIER 3 stored format: `pathLabel`; frozen readers #37–#48: 12 × 33 read), `5cf8ebfd` (short words on the tabs, the "Name on the path" field, Showcase words, specs moved).
- Measured over 200 seeded paths: sy chosen 0.93 at 390 and 1.00 at 430 with no overlap fault; at 320 px 131 paths (247 faults) and at 360 px 58 paths (70 faults) still have a tab over the line even at sy = 1. Spread: 102 orbits per width span < 60 % (one kx per path keeps the computer's half-wave orbits narrow); 5 tiny paths have no node in an outer 25 % or in the middle 40 %. Reported at the checkpoint, not loosened.
- Checkpoint captures (scratchpad only): `a10-a-first-open.png`, `a10-b-afternoon-evening.png` (390 × 844, Nebula, the 13-item path; sy 0.9291, kx 0.6567).

## Amendment 10c (the owner's checkpoint reply): state
- Commit `83f3e75f`: per-orbit 20–80 % mapping; the phone's own line (`lib/path/phone-line.ts`, never clamped, ≤ 2 cubics a stretch, the owner's line checks); tabs touching their ring (an under-node tab may lean); local room where even sy = 1 leaves a tab no clear spot. ADR-032 L21–L24.
- Unit (200 seeded paths × 320/360/390/430): every overlap, line and spread check passes; 10b's line fails them (clamp + kink, planet-stretch wiggles). Phone spec: 12 passed (dev server).
- Next: the browser specs on a production build (:3102), then exactly 3 captures in Nebula (390 × 844 first open; 390 × 844 at Afternoon/Evening; 360 × 780 first open) with the check numbers, then STOP for the owner.

## Owner correction 10d (25 Oct): state
- Commit `2939d1db`: node → node = the computer's own stretches (loops, swings) at 10b's strength on 10c's places, never clamped (shrink or mirror to fit, still a loop); planet stretches one sweep; no bump under 14 px; the name's side moves inward at edge nodes (the line comes in on it); tabs only on the node's lower side (the START badge is clear).
- Unit (200 × 320/360/390/430): every overlap, line and spread check passes; 2564 loops compared with 10b, none weaker (778 drawn smaller or mirrored to fit); 3146 of 10b's loops are swings now (edge nodes' names inward); loops 4873 vs 10b's 6488 of 12084 node stretches.
- Browser (dev): phone spec 12/12; of the 10 earlier failures 9 pass; `checklist-overlay-af` 532 fails (ZIGi 60 px from the next node after a tick, bound 36: the restored loop leaving that node takes ZIGi's place).
- 13-item path: 390 sy 1.00, room 8 px (1 node), 8 of 10 node stretches loops; 360 sy 1.00, room 80 + 8 px, 7 loops. Captures `a10d-*.png` (scratchpad).

## Owner OK on 10d, the footer, and the finish (25 Oct): state
- `8eeaa503`: fix 1 (planet stretches nearly above or below their planet sweep to the inner side; L26) and fix 2 (ZIGi on phones up to 72 px from the next node, owner decision).
- `a873b9f3`, `4dac076a`: the footer — on the computer a river out of "= Wealth" down to Health, three growing bends, one C2 spline, gold only in its first stretch (L27, L28); on the phone the frame kept and the steps line joining it at Health in the same colour and width.
- `18473e53`: the line under a tab, read finely (L29): found by `checklist-phone-ag-polish-2` 1d; the layout's checks read the line ~1 px apart and keep 0.7 px out of a tab; the approved 13-item path unchanged and pinned; also `Math.sign(` (staking guard) and the footer colour check moved to `stepsPaint`.
- Local, production build of `18473e53`: the Checklist and phone specs 155 passed, the footer 38, theme parity 2; the computer layout audit unchanged in Nebula and Dark, Light with one new finding (an owner item in STATUS).
- The last commit is the STATUS entry; then CI on the final head (one re-run per known intermittent) and the PR out of Draft.

## Next step
Wait for the owner. Never merge, enable auto-merge or deploy. On corrections: apply only those, record them in ADR-032 and STATUS.

## Earlier next step (superseded)
Owner decisions: (1) phone density — accept overlaps on phones (move the listed assertions), a larger scale, or smaller phone pieces (STATUS, "Known CI intermittents and open items"); (2) "bump zod" for the audit. Then CI green, out of Draft, report.
