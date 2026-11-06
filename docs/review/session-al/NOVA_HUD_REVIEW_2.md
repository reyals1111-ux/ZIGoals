# NOVA holographic HUD: second review (first-time viewer and design critic)

Reviewer: a fresh agent that built none of it and had not seen the app before (Session AL, owner amendment A12). I took my first look before reading the earlier review or lanes L8d/L8e.
Build: production `60309361` on `127.0.0.1:3103/app/nova`.
Brief: AL_SCOPE §B, O5, §F.

**Method.**
- Playwright with Chrome, at deviceScaleFactor 1, under the shared browser lock.
- **Fresh empty profile:** the real first visit with nothing seeded.
- **Showcase:** loaded through Settings → Load Showcase Demo.
- **Widths:** 1440×900, 1920×1080, 1280×720, 820×1180, 390×844 and 375×812.
- **Themes:** Nebula, Light and Dark.
- **Motion:** Full, Calm, Off, `reducedMotion: 'reduce'` and a hidden tab.
- **Interactions:** the four presets; the quick actions for water, habit and task, each with Undo; HUD → Health in a second tab, with no reload; the widget → page morph; 45 Tab presses.
- **Measurements:** a DOM audit at each condition (overflow outside a panel, clipping, overlaps).

Screenshots are in `/tmp/claude-0/hud-review-2/out/` (25, not committed). They are cited below by number.

---

## Verdict: stunning yet? **Not yet, though it is close on a big screen.**

**First impression.** At 1440 and 1920 with the Showcase (screens 05, 07), I said "wow" within seconds:
- a pink kcal ring;
- a cyan habit reactor with a 7-day segmented bar;
- violet goal arcs;
- a gold valuation wave in a framed box;
- a glowing four-ring core around the orb, with a stacked readout;
- glass, brackets, a grid floor and motes.

It looks like a command HUD and not like a dashboard with a skin. Motion behaves exactly as O5 asks, the quick actions write real records with Undo, and the HUD follows the pages live.

**Why it misses the owner's bar.** The bar says nothing may be cut off, overlap or look broken. It still fails in places a first-time viewer meets quickly:
- The **quick-actions sheet looks broken.** A habit row loses its name, and its buttons stack one letter per line (B1).
- On **every desktop width**, a label is cut ("Estima") and the dial centre figures run over their rings (M1, M2).
- At **1280×720** the Health targets are cut, and only two panels show (M3).
- On **tablet and phone**, the first screen shows no data at all (M4, M8).
- The **lower band** cuts its own buttons in half (M5).
- One **figure disagrees** with its page: 41 % on NOVA, 42 % on Goals (M6).

Fix these and it stuns at desktop widths.

**Counts: 1 Blocker · 8 Major · 10 Minor · 8 Polish.**

---

## Findings

| id | severity | width / theme / motion / profile | what you see | why it matters | suggested fix |
|---|---|---|---|---|---|
| B1 | **Blocker** | 1440 (every width), all themes, Showcase; Health HUD and Habits HUD quick actions | In the sheet's "Tick a habit" block, the **Walk** row has no name. Its "+1,000 steps" button is stacked one character per line ("+1 / ,0 / 00 / st / ep / s"), and its "✓ Done" stacks vertically ("D o n e"). "Exercise" is cut to "Exer…" (screens 18, 19). | This is the HUD's main interaction, and it looks broken on first use. It is a regression of the earlier m11: L8d says "habit rows one line". | Lay each habit out as `grid-template-columns: minmax(6ch,1fr) auto auto auto` with `white-space: nowrap` on every button. Move the "Done automatically · from your activity log…" note to its own row under the name (`grid-column: 1 / -1`). Shorten the step button to "+1k" with `aria-label="Add 1,000 steps to Walk"`. Add a spec that every `.holo-action button` has `scrollWidth <= clientWidth` and a height ≤ 48 px. |
| M1 | Major | 1280, 1440, 1920 (and the Wealth preset), all themes, Showcase; Goals HUD pace chart | The chart's end tag reads **"Estima"**: the tag runs 9–11 px past the panel edge (DOM: right edge 671 vs panel 660 at 1440; 849 vs 840 at 1920). A second "Estimate" chip sits right under it. Screens 05, 07, 16. | It is cut off in the default first view on every desktop width. | Anchor the tag inside the chart (`text-anchor: end` at `x = width − 4`), or drop the in-chart tag and keep only the "Estimate" chip. Make the chart's SVG `overflow: hidden` and give the box a 12 px right inset. |
| M2 | Major | all widths, all themes, Showcase | The centre figures collide with their dials. "**1,970**" touches the kcal ring on both sides, and "of 2,200 kcal" runs across the ring stroke. "**30** / of 30 days" crosses the Habits consistency ring ("days" sits on the stroke). Screens 05, 07, 08, 23. | Text on top of a neon stroke reads as broken. It is also the same kind of collision M3 fixed for the core. | Size the figure to the ring's inner diameter (`font-size: min(22px, 0.28 × ring)`), and move "of 2,200 kcal" and "of 30 days" **under** the ring as a caption. Or make the ring 20 % larger at M. Add a geometry spec: the text bounding box sits inside the inner radius. |
| M3 | Major | 1280×720, all themes, Showcase | The Health targets are cut: "131 g / 120", "7 h 17 min" with "/ 8 h" gone, and "8,800 / 8,0" (they overflow by 5–24 px). The "Read paused at 25 min" chip wraps onto its own row, so only **2 panels** are in view; Goals, Wealth and the core readout sit below the fold (screen 08). | 1280×720 is a common laptop. The earlier review's M1 ("targets never cut") is open again here. | At container width < 330 px, put the target into the note line ("of 120 g"), as M1 originally proposed. Fold "Read paused…" into the chips row (it is a chip). At heights ≤ 760 px, fold the setup banner into a chip ("Build NOVA's brain →"). |
| M4 | Major | 820×1180 tablet, all themes, Showcase | **First view: zero panels.** The view shows the orb, four stacked chip rows and the guide banner; the panels start at y = 1088, under the command bar (screens 09, 25). Scrolled into view, they form two 245 px columns beside the open 275 px NOVA sidebar. "HEALTH HUD" is clipped (104 → 64 px), the Health values run up to **91 px past the panel's right edge** ("/ 8 h" at x 632 vs edge 541), and goal names shrink to 64 px. | A12 asks for the tablet explicitly. Its first look is an orb with no HUD, and the HUD itself is cut. | Below 1024 px, fold NOVA's left panel to its icon rail by default, as 1280 already does (`data-left="rail"`), and use one Holo column of up to 560 px. Lay the chips out as one horizontal scroller, and drop the orb to 160 px so the first two panels sit above the fold. |
| M5 | Major | 1440 and 1920, fresh and Showcase; lower band | The panels cut their own content at the bottom: **Tasks'** time field and "Add" button are half hidden (10 px beyond), **Focus'** "Start a 25-minute Pomodoro" sits 40 px below the panel's edge, and **NOVA briefs'** "Set up daily briefs →" sits 34 px below (screen 22). At 1920 Showcase, the Pomodoro button is sliced in half (screen 07, bottom right). | These are visible cuts on a fresh profile, the first thing a new person scrolls to. | Give the S panels in the band a `min-height: max-content` (or 2 units when they hold an action). Or move the action into the header as an icon button. Extend the hud-fit `scrollHeight <= clientHeight` spec to the band's S panels. |
| M6 | Major | every width, Showcase; Goals HUD and core | **Japan adventure: 41 % on NOVA and 42 % on the Goals page** ($2,500 / $6,000 = 41.7 %). NOVA's `wholePercent` (`lib/nova/widgets/words.ts:14–19`) drops the decimals; the Goals page rounds. | §B: "every figure comes from the same stores and functions the pages use (one source of truth; **the same rounding**)". | Use the Goals page's own formatter (or `lib/numbers/round.ts` `wholePercent`) on NOVA's arcs, the core and the tables. Add a parity spec that compares each arc with its goal card. |
| M7 | Major | 1440, Minimal preset, Showcase | The **core readout is hidden behind the panels**. Its Water and Habits icons poke out above the top edges of Today's orbit and Agenda clock, with a stray "• • •" between them (screen 17). | Overlap: the four-ring summary is the HUD's heart, and here it is visibly buried. | In the Focus layout, reserve the readout's height in the stage grid (`grid-template-rows: auto auto 1fr`), or hide the readout when the band would cover it. Add a no-overlap spec (elementFromPoint) for `.holo-core-readout` on every preset. |
| M8 | Major | 390×844 and 375×812, all themes, fresh and Showcase | **The first phone screen shows no data**: clock, "Read paused" chip, a three-line guide banner, the orb, the command field and the tab bar (screens 10, 24). The Holo column scrolls inside a **465 px window** (55 % of the screen) under a pinned header of about 230 px. The panels themselves look good once scrolled (screen 23). | On a phone the HUD is invisible until someone guesses to scroll the middle. A12 asks for the phone explicitly. | On phones, put the core readout (four bars) directly under the orb in the first view. Let the guide banner scroll away with the content, or turn it into a chip. Shrink the orb to 200 px. Unpin the chips, or reduce them to one line. |
| m1 | Minor | 1440 and 1920, Full, Nebula/Dark | Motes are drawn **over text**: specks sit on "Good morning", "for simple", "4 of 7", "Lead goal" and "Habits" (screens 02, 05, 07). The motes canvas (690,230, 336×549) covers the readout and the greeting. | Particles on letters read as rendering dirt, not depth. | Keep the canvas out of the text area (a mask on the readout's and greeting's rectangles, or a z-index below `.nova-stage-below`). |
| m2 | Minor | various | **Truncation where there is room or meaning:** "TODAY'S ORB…" (1440 fresh), "TODAY'S OR…" / "AGENDA CLO…" (Minimal), "NEXT BILL AND CO…" (Wealth preset), core "Emerge…", "Set a….", "No water logged yet t…", goal arcs "Emergency f…" / "First home d…" at 1440. The agenda row is cut **without** an ellipsis: "Example · Book", "Example · Bool" (screens 15, 16, 17). | Ellipses on titles and labels make the HUD feel cramped, and a cut with no ellipsis looks broken. | Allow two lines for goal names (`-webkit-line-clamp: 2`). At M, use the arrow-only "Open" link in the header so the title fits. Give the agenda title `text-overflow: ellipsis`. Give the core labels `min-width: max-content` with a 2×2 grid at 1fr/1fr. |
| m3 | Minor | all widths | On the Agenda clock, the hand line runs **through the "06" numeral** ("•—06") (screens 15, 17, 22). | It looks like a strike-through. | Stop the hand at r − 14 px, or put the numerals outside the tick ring. |
| m4 | Minor | 1440 | The **View controls** menu overlaps the command field: "What's on your mind?" is cut in half under the menu's lower edge (screen 14). The preset toast also shows the field's text through it (screens 15–17). | Overlap. | Open the menu above the foot with `bottom: calc(var(--foot-h) + 8px)`. Give the toast an opaque surface, or place it above the field. |
| m5 | Minor | 1440 Showcase, Tasks panel | The panel contradicts itself: the "TODAY **1**" counter sits beside "**2** to do today, 1 carried over", and the Tasks page's Today tab says **2**. | One source of truth, even inside one panel. | Make the counter use the page's Today count (overdue included), or label it "Due today 1". |
| m6 | Minor | Today page vs NOVA | Today's Water tile shows "**0 mL** · No water logged yet today"; NOVA shows "—" with the same reason. | Unknown is not zero (§F): one fact, two figures. Already raised by L8d (request 1) and still open. | The owner decides, or Today shows "—". |
| m7 | Minor | 1440 Showcase, Full | The morph is barely perceptible. 150 ms after clicking a Goals HUD link, the Goals page is an empty shell, with no panel in flight (screen 21). `startViewTransition` was called once. Health links are full page loads by design. | The "widget → page morph" is part of the owner's interconnection; it does not register. | Give the panel and the page hero the same `view-transition-name`, and render the page's hero before the transition resolves (or wait for its data). |
| m8 | Minor | 1440, keyboard | **43 Tab stops** come before the first HUD control (19 in the sidebar, 18 in the top bar, 5 chips/banner, then the orb), and `/app/nova` has no skip link. The focus ring itself is good: 2 px white, a night gap and the neon. | WCAG 2.4.1: a keyboard user crosses the whole chrome to reach the HUD. | Add "Skip to the HUD" as the first focusable element, targeting the stage. |
| m9 | Minor | 1440 Showcase, Wealth HUD | The frame prints **$537,406.10 twice** (as "MAX" and as the line-end label), and the line-end dot collides with the frame's top-right corner. The hollow "now, known so far" point carries no value, so a quick reader takes $537k as "now" (screens 05, 07). | This is the earlier M6, changed: the labels are honest now, but it still reads as two different "nows". | When the last point equals the max, print it once ("MAX · Nov 5 $537,406.10"). Label the hollow point "now $501,800" in 11 px. |
| m10 | Minor | 1440, quick actions | The Undo toast covers the sheet's lower rows ("ontribute", screen 19). | Overlap during the very interaction that offers Undo. | While a sheet is open, dock the toast inside the sheet's bottom, or shift it left of the sheet. |
| p1 | Polish | after a preset | The stage keeps its scroll offset, so the new hero can open half-scrolled under the banner (screen 15). | The preset's payoff is lost. | On preset apply, `stage.scrollTo({top: 0})` (instantly under Off). |
| p2 | Polish | hidden tab, Full | `nova-orb-breathe-whole` keeps `playState: running` while `data-hud-motion="paused"`. The sky and motes draw 0 frames, which is good. | O5 says everything pauses. | `.nova-frame[data-hud-motion=paused] .nova-orb { animation-play-state: paused }`. |
| p3 | Polish | quick actions | The eyebrow "EACH ONE SAVES TO YOUR RECORDS, WITH / UNDO" wraps a single word. | Ragged. | Shorten it to "Saves to your records · Undo". |
| p4 | Polish | Health HUD quick actions | The Health sheet repeats every habit (six steppers) under "Tick a habit", which buries water and weight. | Focus. | Show only health-linked habits (Walk, Drink water), with a "More in Habits →" link. |
| p5 | Polish | 1280–1440 | The top bar collapses to 14 unlabelled icon buttons in two rows. | Visual noise competing with the HUD's figures. | Keep one row; move the rest under "More". |
| p6 | Polish | fresh, Health HUD | "No meals logged today" sits top-right above Protein, away from the kcal ring it explains (screen 02). | The reason is detached from its figure. | Put it under the ring. |
| p7 | Polish | all | Percent spacing is mixed side by side: "45%" (arcs, core), "12.7 %" (core) and "90 %" (hearts). | Inconsistent figures. | Follow one house style everywhere (the pages use "45 %"). |
| p8 | Polish | Goals HUD | "Estimate" appears twice (the chart tag and the chip). | Redundant, and part of the M1 cut. | Keep the chip only. |

---

## The earlier review (NOVA_HUD_REVIEW.md), finding by finding

| Earlier | Now | Evidence |
|---|---|---|
| B1 (instruments cut by height caps) | **Fixed for the instruments.** Health, Goals (pace line + band), Habits and Wealth are whole at 1440 and 1920. **Changed:** the S panels in the lower band now cut their actions (M5). | Screens 05, 07, 22 |
| B2 (no panel above the fold at 1440) | **Fixed at 1440** (4 panels + the core readout in view). **Still open** at 1280×720 (2 panels), on tablet (0) and on phone (0). | Screens 05, 08, 09, 10 → M3, M4, M8 |
| M1 (truncated numbers and names) | **Partly fixed.** The targets are whole at 1440 and 1920. Still cut at 1280 and 820; goal names now end in an ellipsis; agenda rows are cut without one. | M3, M4, m2 |
| M2 (L not large) | **Fixed.** The Health HUD preset gives a wide hero with the histogram. | Screen 15 |
| M3 (core labels on rings) | **Fixed.** N·O·V·A sits above the rings and STANDBY below. **New, same family:** the dial centre figures sit on their rings (M2). | Screens 05, 07 |
| M4 (core unexplained; unknown looks like an ornament) | **Fixed.** 2×2 readout with 10-segment bars and reasons; an unknown is a hairline. | Screens 02, 05 |
| M5 (water 0 vs —) | **Fixed on NOVA.** Still open on Today's tile (m6). | Fresh and Showcase show "—"; Today shows "0 mL" |
| M6 (wave contradicts headline) | **Changed.** "Recorded valuations", MAX/MIN and "now, known so far" are present, but the max is printed twice and the "now" point has no value (m9). | Screens 05, 07 |
| M7 (colour collisions) | **Fixed.** Ice day panels; overdue in coral "!1". | Screens 16, 22 |
| M8 (fresh profile never meets the HUD) | **Fixed.** A brand-new NOVA opens on the Command preset, with unlit instruments and reasons. | Screens 02, 22 |
| M9 (focus clipped, low distinction) | **Fixed.** 2 px white, a 5 px night gap, a 7 px neon ring. | DOM: `outline: 2px solid #fff; box-shadow: 0 0 0 5px rgb(5,8,24), 0 0 0 7px rgb(46,242,255)` |
| M10 (chrome over data) | **Partly.** The greeting is smaller, but the clock is still the largest type on the page, and the chips plus the guide take three rows. | Screens 05, 08 |
| M11 (S header over body) | **Fixed.** S panels use an arrow link. M titles still end in an ellipsis (m2). | Screen 22 |
| m1 (sheen off-screen) | Not re-tested | — |
| m2 (sky in a hidden tab) | **Fixed.** 0 frames in 2.5 s while hidden; the orb breathe is still running (p2). | Run log |
| m3 (particles absent) | **Fixed.** Motes are visible in the star column. **New:** they land on text (m1). | Screens 05, 07 |
| m4 (grid floor invisible) | **Fixed.** A perspective floor is visible under the star. | Screens 01, 02 |
| m5 (8 px numerals) | **Fixed.** 12 px HTML numerals. **New:** the hand crosses "06" (m3). | Screen 22 |
| m6 (90 % heart looks full) | **Fixed.** "90 %" is printed under each heart. | Screen 07 |
| m7 (habit week hidden scale) | **Fixed.** The table reads "check-ins of 7 habits due". | Run log |
| m8 (histogram headroom) | **Fixed.** A "2,200" target label and headroom. | Screen 15 |
| m9 (arrange arrows) | Not re-tested (hud-fit covers it) | — |
| m10 (Classic calm) | Not re-tested | — |
| m11 (quick actions sheet, ragged habit row) | **Regressed → B1.** | Screens 18, 19 |
| m12 (uniform ornament density) | **Fixed.** S, M and L carry different kits. | Screens 07, 15 |
| m13 (tilt softens text) | No soft text seen at 1× | Screen 15 |
| m14 (empty Health repeats) | **Fixed.** Said once, but placed oddly (p6). | Screen 02 |
| m15 (Showcase not a preset) | **Fixed.** Command preset, 10 panels, no duplicates. | Run log |
| m16 (P1 chip contrast) | Not measured | — |
| p1–p8 | **Fixed:** preset thumbnails (screen 14); bolt beside link; lens on the core only; the wave flows (p4); a 140 px orbit ring; 6 px readout bars; crisp tips; MAX/MIN labels. | Screens 05, 07, 14, 17 |

---

## What already works well (keep-list)

- **The 1920 Showcase is the money shot** (screen 07). Each pillar has its own neon, a bright dial with a centre figure, segmented meters, cyan week bars, a gold wave over a fine grid, a four-ring core with a stacked readout, glass with a backdrop blur, corner brackets and a perspective floor. Keep the composition.
- **Motion follows O5 to the letter:**

  | Mode | What runs |
  |---|---|
  | Full | rings at 90 s, a 14 s shimmer, orb breathe, motes, tickers about 1 s |
  | Calm | rings only at 270 s; no shimmer, motes or breathe |
  | Off | 0 animations, 0 frames, no tickers, pixel-identical over 2.4 s |
  | `reduce` | 0 animations, 0 frames, pixel-identical |
  | Hidden tab | 0 frames |
  | Phone | no shimmer, no motes |

  There is no pointer tracking.
- **The quick actions are real.** Each was used once, then undone:
  - Water: "Water logged: 250 mL. Undo" → the HUD, the core and "Meditate next" updated at once; Undo → "Water entry removed." → back to "—".
  - Habit: Exercise → "5/7 today" → Undo → "back to 15 of 30".
  - Task: added and shown on the Tasks panel.
  - Live in a second tab: the HUD's water log appeared on `/app/health` in that tab ("250 mL recorded") with no reload.
  - Escape closes the sheet and returns focus to its trigger.
- **Honest unknowns.** "—" with a reason everywhere on a fresh profile ("No night logged for last night"). "No target set" after the first water log. "Price not in yet" on Market watch. "Showcase · fictional example data" is always visible.
- **The figures match the pages:** kcal 1,970/2,200, protein 131/120 g, steps 8,800, sleep 7 h 17 min, habits 4 of 7, checklist 2/5, tracked wealth $501,800.00, 12.7 % set aside. The one exception is M6.
- **The presets** apply in one step, with Undo in the toast and thumbnails in the menu. The Health HUD hero is wide, with a histogram and percent hearts; the Wealth hero has an allocation dial and purpose ribbons.
- **Light** keeps NOVA a dark island; **Dark** matches Nebula's neon.
- **No brand words.** Neither "Jarvis" nor anything like it appears anywhere, and no "NaN", "undefined" or "null" was found in any condition.

## What still feels flat

1. **Small screens get no HUD on first sight.** Tablet and phone open on an orb in an empty sky (M4, M8), and at 1280×720 two panels carry the whole impression (M3). The "hero in a command suit" moment exists only at 1440 and above.
2. **Chrome still outranks data.** The 48 px clock, three rows of chips and banner, and 14 icon buttons sit above the instruments. In a real HUD the biggest numbers are your numbers (kcal, net worth, streaks).
3. **The empty profile is honest but quiet.** Unlit rings and "—" are correct, but the Habits, Goals and Wealth panels on a fresh profile are 60 % empty glass. A faint target grid inside each instrument would let it read as waiting for data rather than as unused space, for example a ghost 7-day bar row or ghost goal arcs at 0.15 opacity, clearly unlit and never a zero.
4. **The interactions break the illusion.** The HUD itself is cinematic. The quick-actions sheet is a long form with a broken row (B1), and the morph to a page lands on a blank shell (m7). The moment of command, where a tap turns into a record, still lacks a satisfying HUD response, such as a pulse travelling from the action to the figure that changed.
5. **The bloom is still modest at 1440.** The neon reads well at 1920, but at 1440 the M panels' strokes are thin and the glass is dark. The reference's luminous rim and magenta outer glow appear mainly on the L hero.
