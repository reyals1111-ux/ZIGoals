# ADR-041 — Session AR: "NOVA, COMPOSED"

- **Status:** in progress (branch `feature/session-ar-nova-composed`, Draft PR; not merged, not deployed)
- **Base:** `main` `7106630107b97cb1c131756263a97384cb719546` (Merge #101), live as Alpha #56
- **Scope sources:** the owner's brief for Session AR (16 Nov 2026); ADR-038 Q11–Q13 (rounds 4–7 of the critique and what
  they left open); `docs/design/NOVA_AM_ART_DIRECTION.md`; `review/session-am-refs` (43 owner mockups; still the bar).

## Why this session exists
Four rounds with two fresh critics each left NOVA at star 7–8, widgets 7, stage 6–7 (ADR-038 Q11). Three rounds running
the critics asked for the same thing: one dominant instrument a widget, panels of differing size and weight as satellites
of the star instead of two equal wings, and a star that the stage is built around at 1440 px. That is a structure, not a
polish pass. The cause, read from the code: `placeOrbit` fills two columns with same-width panels in rows of one, two or
four units; the Showcase's ten widgets are seven medium and three small; and at 1440 × 900 the star is capped by the stack
of words around it (about 400 px). Session AR rebuilds the composition, bounds the critique at three rounds, and closes the
leftovers that need judgement. A later Opus session takes the small polish items.

## Owner decisions (16 Nov 2026)
**Approved: the plan below and its four approval items.**
- **P1 Orbits on Today = one additive, device-only record** `zigoals:today-orbits:v1` (`{version: 1, shown?: boolean}`),
  off by default, added from Today's own controls; TIER 3 stored format; in Export, backup format 4, restore, erase and the
  catalogue; never synced. Reason: a new widget kind or metric in the synced settings record is refused by older builds
  (ADR-040 D16b).
- **P2 Deliberate test changes** carry `Session AR (<id>, deliberate)` with an equally strict replacement. `hud-fit`'s
  counts stay (at least 3 panels whole at 1440, 4 at 1920, the four pillar HUDs beside the star, nothing cut).
- **P3 Display tiers override the drawn size, not the stored one.** A widget stored as M may be drawn as a hero or a
  compact plate; Arrange still sets S / M / L, and L always wins a hero place.
- **P4 New words on the stage:** one honest line for a star whose code did not load. Nothing else in NOVA's copy changes.

**The owner's change to the composition, "the star makes room" (verbatim in substance):**
- **S1** Widgets never cover the star's core or bezel, and the star never sits over a widget's content; only its outer
  light may pass behind a panel's glass.
- **S2** The star's size follows how full the stage is. An empty stage, or one or two widgets: the large star (at least
  45 % of the stage at 1440). As more widgets are made on request it shrinks smoothly to make room (a one-time motion;
  instant with Motion Off or reduced motion), never below its size on `main` today (about 400 px at 1440). At 1440 with
  four or more widgets, each wing shows at least a hero and a supporting panel beside the star.
- **S3** A newly made widget still arrives as its wing's hero with the beam from the star; older ones step down to
  supporting, compact, then the band. `hud-fit`'s counts stay as they are.
- **S4** The critique captures show it: empty, two widgets, the full Showcase.

**Standing rules** (unchanged): consumer first, chain invisible; private by design; non-custodial (money only as a
pre-filled confirm card the person signs); no fake or simulated data shown as real (the Showcase is labelled); no
projection as a guarantee; never a film or comic reference; no pointer tracking; Motion Off and reduced motion still and
complete; everything paused when hidden; idle near zero; readability (labels ≥ 14 px, body 15–16 px, targets ≥ 44 px,
contrast ≥ 4.5:1); the protected list outside NOVA; no new dependency, service, CSP change, wallet, signing or key change;
route weights inside every budget; stored data only additive.

## The plan as approved (the composition, in words)
**Principle: a star with satellites.** Every widget on the stage has a *tier* that is worked out, never stored: **hero**
(one a wing: a large panel, one dominant instrument, a 48–64 px figure), **supporting** (a medium panel: instrument and
figure), **compact** (a one-unit plate: the figure and a micro-instrument). Bodies already draw three sizes, so a tier is
handed to a body as its display size (hero → L, supporting → M, compact → S); the catalogue, the gates, the summon step
and the stage record are untouched. Reading order on a computer: the left hero (top left, the thing asked for), the star
and NOVA's answer, the right hero (bottom right: the right wing is the left one upside down, so the eye crosses the star
on a diagonal), the supporting panels, the satellites.
- **2560 × 1440:** the star's column is the widest; a wing is a hero across its width with two supporting panels side by
  side; compact plates are a satellite strip under the star, inside the first view.
- **1920 × 1080:** the same order with narrower wings (hero + one supporting stacked).
- **1440 × 900:** built around the star; with S2 the star gives way as the stage fills, and from four widgets each wing
  holds a hero and a supporting panel.
- **Empty stage:** calm, unchanged. **Tablet:** layout untouched. **Phone:** the chat agent, in the same language.
- **Bento, Focus, Minimal, arranging, presets, drag and arrow keys:** mechanics unchanged; while arranging, panels show in
  their stored sizes.

## Decisions (made by the session; D-numbers are referenced from code comments)

### The composition (Part 1; `lib/nova/compose.ts`, `components/nova/widget-grid.tsx`, `stage/command-centre.css`)
- **D1 Tiers are worked out, never stored.** Beside the star each widget is a hero, a supporting panel or a compact
  plate; its body is drawn at that tier's size (hero → the Large body from 500 px of height in a wing of at least 480 px,
  else the Medium one, at most 400 px tall; supporting → Medium; compact → Small). `zigoals:nova:v1` keeps the person's own
  S / M / L exactly as stored (the spec reads the record after two requests).
- **D2 A wing's rows share the stage's height 3 : 2 : 1** (a hero the person made Large weighs 4). A unit is at least
  112 px and at most 176 px; a row that would be smaller is not made: three rows from about 700 px of stage (1920 × 1080,
  2560 × 1440), a hero and a supporting panel from 572 px (1440 × 900), a hero and a compact plate from 460 px, one hero
  below that. At 104 px a Medium body was cut beside the conversation's console; 112 is the least at which it is whole.
- **D3 The right wing is the left one upside down.** The heroes stand top left and bottom right, on the galaxy's long
  axis (its disc is tilted 21.8 degrees that way), so the eye crosses the star on a diagonal instead of scanning two
  matching columns. The document order follows the eye in each wing (top to bottom), so Tab does too.
- **D4 Wide wings hold more.** Two supporting panels stand side by side from 720 px of wing; compact plates need 340 px
  each (at 2560 with the left bar open a wing is 625 px: one wide plate, not two cramped ones of 307 px with two-row heads).
- **D5 S3 in practice.** The list's order is the order of importance (made on request first, newest first: ADR-038 D23).
  A new widget takes the wing whose own hero is the older one, so two requests in a row are the two heroes; a widget
  keeps its side while it stays beside the star (AM-D9) and, when its wing is full, steps down to the band, never across
  the star. Among pinned widgets a Large one is lifted to its wing's hero place; a locked one is always a compact plate.
- **D6 Where the composition applies.** The Holo look, the Orbit layout, a computer, a stage wider than 1040 px, not
  while arranging. Arranging, Classic, Bento, Focus, Minimal, the tablet's widths and the phone keep AM's layout code
  untouched (`placeOrbit`), so a place means the same before and after a move.

### "The star makes room" (S1, S2; `starPlan`, `nova-dashboard.tsx`)
- **D7 The star's size is its bezel's box.** That is what the owner's "≈ 400 px at 1440" measures on `main` (377 px with
  the left bar open; the canvas, whose outer light dissolves toward the wings, is 511 px). The bezel's ellipse as drawn
  reaches 0.94 of that box, so a column that holds the box holds the ring (S1); the spec works the ellipse out from the
  drawing, because a browser reports a turned ellipse by its turned box.
- **D8 The steps.** One or two widgets: the large star — a column of 47 % of the stage where each wing keeps 280 px (at
  1440 with the left bar open: a 524 px column, a 514 px bezel = 45.7 % of the 1124 px stage; wings of 280 px). Three,
  four, five widgets: a quarter of the way down each. Six or more: exactly `main`'s column and canvas (385 px and 511 px at
  1440; 938 px and 1079 px at 2560), so the full Showcase is never smaller than before. Beside the conversation's console
  the star is the floor's (the console is not glass).
- **D9 The room for the large star comes from the stack, not from the widgets.** The name's row really takes 88 px of
  the stage; 124 px were kept for it. The calm stage's star uses the same room, so the first widget made beside it does
  not make the star jump.
- **D10 One motion.** When the count of widgets changes the star's size, the canvas takes its new size at once and the
  star's button eases from the old scale to the new in 620 ms (a transform; nothing else is animated). Motion Off, reduced
  motion, a resting or hidden HUD and a window resize are instant (the spec records every animation started on the button).

### The star while it starts (Part 3a; P4; ADR-038 Q12 "carried")
- **D11 The stand-in is the star's own place.** Until the star reports, the stage draws the star's box, its bezel
  (dimmed) and a dim core lying in the disc's plane (CSS, static). The small SVG orb stood there before: a different
  object, and the layout jumped when the star took over.
- **D12 A star whose code did not load says so.** When the star's chunk fails, or its code has not arrived after eight
  seconds, the stage itself shows the galaxy's still picture (`public/nova/star/<accent>.webp`) and the line "Still
  picture: the star's code did not load"; if the code arrives after all, the star takes over and the line goes. If the
  picture cannot load either, the SVG orb is the last resort, as before. The line's text lives in a module of its own
  (`lib/nova/core/no-code.ts`) so the star's governor stays out of the page's first scripts.

### Round 7's real faults (Part 3b)
- **D13 The status strip keeps one row from 700 px of centre** (it was 900): beside the console the centre is about
  850 px and the strip broke into three rows with the Showcase label alone on the second.
- **D14 The console writes stored shapes as the pages do.** In NOVA's read-out "435.59 EUR" reads "€435.59", "2026-11"
  reads "Nov 2026" and a stored day reads as a date. For the eye and the ear only: the turn's own text (kept, copied,
  shared with ZIGi's history) is unchanged, and only dollar and euro amounts with two decimals and stored dates are
  touched (another currency, a token amount, a number stay as written). The engine's answers are ZIGi's too and are pinned
  by its golden tests; they are not changed.

### After round 1 (structure, not polish)
- **D19 A tier is a weight.** Hero: the full hologram with a heavier rim (2.2 px) and a wider bloom. Supporting: a 1 px
  rim, less than half the bloom, no ruler. Compact: a plate (hairline rim, smaller cuts, no bloom, brackets, ruler or
  sheen). The keys of a supporting panel and a plate are at 60 % until the pointer or the focus is in the panel (always
  shown, always 44 px: the owner's rule; a lit pin stays lit).
- **D20 Wide wings step.** From 540 px of wing a supporting panel is nine tenths of the hero's width and a compact plate
  78 %, hung from the wing's outer edge: each wing steps away from the star tier by tier, and the two wings turn about it.
- **D21 The read-outs step aside from three widgets.** The four read-outs under the star repeat what the panels beside it
  say, and the bezel's pillar arcs carry the same four. They stay in the page (hidden, as on a narrower stage) and show
  with one or two widgets and on the calm stage (`nova-compose-ar`, "the read-outs"; `hud-fit` and `hud-elements` changed
  on purpose).
- **D22 The engine after round 1.** A hero the person made Large is always the Large body and keeps its 516 px (so
  `hud-fit` M2 and the Health preset hold); a 1280 × 720 stage keeps a hero and one plate; a row of locked notices is a
  plate's height wherever it stands; from three widgets a wing keeps 328 px, the least at which a panel's head is one row.
- **D23 The star after round 1.** The planet has a wider, brighter limb, light on the hemisphere that faces the core and
  visible bands (a rim-lit planet, owner screenshot 4; the still pictures are redrawn). In a state the standby bezel steps
  back to 22 % and the state's own mark is heavy: a lit ring with long ticks in (listening), a thick ring in segments
  (thinking), a ticked rim with two strong rings (speaking).
- **D24 Two things an answer said wrongly.** The read-out's ring is read from the answer's first line only (it made a
  headline of a list's first row: "2 of 2" for "12 check-ins over 7 habits"); the answer card's "Go to …" names a widget
  of that answer (it named the widget made last, whatever was asked since).
- **D25 What the opening costs without graphics hardware, measured.** On this machine the Showcase's opening ends 7 s
  after the navigation at 1920 × 1080: one task of 6.1 s that is the browser's first WebGL context (the star's unchanged
  probe; compiling the shader takes 66 ms and the first read-back 111 ms). The same task runs with `main`'s shader.
  `p3-nova-polish` ND-1 (1920, Showcase) waits 5 s for the opening and can lose that race under two workers; it is not
  changed here and is on the list for the follow-up.

### After round 2 (the stage did not rise: its structure changes again)
- **D26 The star's base.** Both critics of round 2: "the lower centre is dead at every desktop size; put a strip of mini
  cards there so the star has a base" (the owner's reference 2). The first widgets the wings cannot hold stand under
  NOVA's words as compact plates, in the first view: two plates of 463 px at 2560 × 1440 (the Showcase then shows eight
  of its ten widgets without a scroll), one at 1920 × 1080, none at 1440 × 900 (a two-tier stage has no room under the
  words). `basePlan` gives the strip only what the star's stack leaves unused (its lower margin, and what the words'
  slot does not need), so the star keeps its size and its place; while an answer stands under the star the answer's card
  is the base and the plates rest on the band. Three plates of 305 px were tried first: their heads took two rows.
- **D27 "Reading…" is an instrument, powered down.** While a widget's gate is not known yet, its panel shows the kind's
  fixed drawing (the one the locked state uses; nothing is read) with the word under it. On a computer that is a moment;
  where the processor draws a 1920 px page it was 20 s of empty slabs in two rounds of captures.
- **D28 The planet is lit.** After two rounds of "a hole in the bezel": the hemisphere that faces the core carries the
  core's light across the globe, the limb is bright all the way round, the far half stays in shadow. Constants only (the
  shader's portability rules hold); the five still pictures are redrawn.
- **D29 Smaller things from round 2.** The stage's frame stands 5 px further out, clear of the panels' corners; the
  phone's conversation starts under its head (it hung from the dock with a dead band above it); the left rail's list
  fades at its foot (a half row read as a cut icon); in a panel beside the star the lattice's names get their room
  before the streaks' notes ("Contri…").
- **D30 Not changed, and why.** (i) *The 280 px heroes beside the large star at 1440 with the left bar open* (both
  critics, both rounds: two-row heads, a wrapped privacy chip). The owner's S2 asks for a bezel of at least 45 % of the
  stage there, and 1124 px of stage leave 280 px a wing; with the left bar folded the wings are 420 px. Wings of 328 px
  (one-row heads) would make the bezel 37 % of that stage. Left as the owner decided; named in the report. (ii) *The
  themes*: NOVA is a night island in Light and Dark by the protected baseline, so the stage reads alike in all three.
  (iii) *The shell's chrome* (top bar, status strip, side bars): outside this session's scope. (iv) *The head's keys*:
  the owner's AM-2 rule. (v) *The same figure in two widgets* (Tracked wealth and the Wealth HUD): two widgets the
  person may put side by side; each is right.

### Leftovers
- **D15 The fasting range (TIER 3 AI safety).** The app notes every model reads said "12 to 18 hours"; they say "a target
  of up to 24 hours, stopped automatically at 24", as Health's form and ZIGi's cards do. Behaviour-preserving.
- **D16 The checkbox flash (6a).** One shared hook (`components/use-held-tick.ts`, `lib/held-tick.ts`) holds the person's
  tick until the save settles. The audit read every controlled checkbox: one more site had the real flash (Health's
  grocery "Bought" box, saved through Health's asynchronous store); Session AQ's milestone box moved onto the hook
  unchanged; the Settings switches that save asynchronously already held their own state; everything saved through a
  synchronous device record never flashed; account, sync, wallet and signing checkboxes and the Checklist's orbit path
  were not touched. `tests/ar-tick-at-once.spec.ts` proves the tick at once, the record across a reload and a refused save.
- **D17 "Your orbits" on Today (6b; P1, TIER 3 stored format).** `zigoals:today-orbits:v1`, additive, device-only, off
  by default, in Export everything, restore (backup format 4 unchanged), the account erase, the data catalogue and the
  welcome check. Turned on and off under Customize Today → "Cards kept on this device". Health's own orbit-and-planet
  figure, side by side in pillar colours; "Not known yet" where nothing is recorded; one keyboard stop.
- **D18 The priority matrix by mouse (6c).** A pointer drag (mouse or pen; 8 px before it is a drag, so a click stays a
  click; the card follows by a transform; Escape cancels) replaces the HTML5 drag that could not be confirmed. It makes
  the same move as the card's button (same write, announcement and Undo); touch and keyboard keep the button.

## Critique rounds (at most three; two fresh critics a round, shown only the references and the newest captures)
| Round | Build | Critic | Star | Widgets | Stage | Verdict | Remaining gaps |
|---|---|---|---|---|---|---|---|
| 1 | `98d7f02d` | A | 7 | 6 | 6 | no | tiers "barely visible" (six panels of one weight); cut text (titles at 350 px, the Wealth hero's legend, Tasks' rows); empty lower thirds (Habits this week, Perfect days, Days until, Time, locked panels); the planet "a hole in the bezel"; the states alike; an answer's ring and key that did not match it |
| 1 | `98d7f02d` | B | 7 | 6 | 6 | no | the same list; also heads with the title under the keys at 280 px, the read-outs under the star repeating the panels, a noisy shell |
| 2 | `ca563dd2` | C | 7 | 7 | 6 | nearly | "the lower centre is dead at every desktop size"; a panel on "Reading…" is an empty slab; the 280 px heroes beside the large star (two-row heads, wrapped chips: "fewer widgets should mean wider panels"); long-tail kinds as text in a tall panel; a heavy shell; the planet "a hole punched in the art"; the desktop star weaker than the phone's |
| 2 | `ca563dd2` | D | 7.5 | 7 | 6 | nearly | the same; also the stage's corner brackets on panel corners, a dead band at the top of the phone's chat, the scrolled band under the one-tap keys, "Contri…", "Late-nigh…" |

**Round 1, read honestly.** Both critics scored below Session AM's last round (star 7–8, widgets 7, stage 6–7). Two of
their findings were this session's capture tool, not the product (the theme was not applied in the Showcase, so "light"
equalled "dark"; three panels were caught on "Reading…" because a 2560 px window drawn by the processor needs 24 s). The
rest was real and is answered by structure, not polish (D19–D24): a tier became a weight, the wings step, the read-outs
step aside, and the star's planet and states were redrawn.

## Before and after, per surface
Filled at the end.

## Closing table
Filled at the end (each part: commits and evidence).
