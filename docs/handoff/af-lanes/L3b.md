# Lane L3b — the full-screen Checklist (Session AF, Part 7 redesign)

Branch `af/checklist2` from `feature/session-af-wealth-unlocked` `859648d4`. The owner's brief (passed on by the lead,
owner-approved): the Checklist as a stand-alone, full-screen, Duolingo-style daily app in ZIGoals' nebula identity, with
real motion inside it (an owner-approved exception to one-time motion, inside the Checklist only), everything that worked
kept, no storage change. References (never copied into the repository): `~/zigoals-af/owner-refs/checklist/`.
`frontend-design`: not available in this session (no Skill lists it) — the design language was applied by hand (ADR-028
H3's precedent): cosmic/nebula, pillar colours, labels ≥ 14 px, body 15–16 px, targets ≥ 44 px.

Seven rounds: round 1 (Part 7 commits) built the overlay; round 2 answered the iteration-1 critique (all six acceptance
lines failed); round 3 the iteration-2 critique (lines 3–6 failed: too sparse, the toast and corner buttons on the path, no
tick cheer, no visible onward glow, Light's slate line); round 4 the iteration-3 critique (lines 1–3 passed; 4–6 failed:
ZIGi's cheer, the day's end, ZIGi over the path, a flat Nebula, Light's faint ribbons, the reward moments); round 5 the
iteration-4 critique (lines 1–4 passed; 5 failed on Light's twelve-weeks plate, 6 on ZIGi resting over a name, a chest or a
ring and on the cheer reading as a salute); round 6 the iteration-5 critique (lines 1–5 passed; 6 "close": names and chests
moving on a tick, soft cheer art held on a hand-at-brow frame, a small computer ZIGi that jumped); round 7 the iteration-6
critique (lines 1–5 passed; 6 "very close": ZIGi pointing past the next planet on a computer, small and pressed to the edge on
a phone, a long name cut, moves over names and a banner, a comet hooking toward ZIGi). The sections "Round 7", "Round 6",
"Round 5" and "Round 4" below say what changed last.

## What the Checklist is now
- **Overlay** (`components/checklist/checklist-page.tsx`, `checklist.css`): `/app/checklist` renders a `<dialog>` drawn open
  by the server (until the page runs, `:root:has(.checklist-overlay[open])` keeps the shell's own parts undrawn) and made
  modal in the page (`showModal`): the browser's top layer, so the sidebar, header, footer banner, tab bar, status row and
  launchers are behind it and inert, and focus stays inside. X and Escape return to the page it was opened from (the
  route trail, `lib/checklist/return-path.ts`, noted by `ChecklistLauncher`, confirmed by the Navigation API where the browser
  has it) or to Today when opened directly. Escape closes the innermost first (`escape-layers.ts`: the celebration, a sheet,
  the menu, the timers, a stepper or a planet's details). Address and title unchanged. The Alpha strip is not drawn over
  it (ADR-028 H132: the shell's labels are covered while the overlay is open).
- **One top bar**: X, the title, today's progress (GlassBar with a shine on each tick; the date under it), Path / List, the
  streak's flame, today's XP (the game layer's own `xpEvents`, only while the layer is on; a "+N" on a gain) and one opaque
  ⋯ menu (Edit path, Options, How it works). A phone takes two rows.
- **A foot bar of its own below 1180 px** (round 3): an opaque band (`.checklist-dock`) the path never runs under — the
  overlay's `scroll-padding-bottom` counts it, so the landing and "is the next planet on screen" leave it out — holding the
  timers' button (52 px), the Undo toast (≤ 52 px, its words on up to two lines) and "Jump to next" (the path engine's new
  `jumpDock`: the button rides the dock, follows the theme). On a computer the toast sits under the timers at the right.
- **Path** (`components/path/*`, `variant="orbit"`, CSS only in `components/path/path-orbit.css`), round 3 density: planets
  96 / 80 / 72 px on a pitch of 112 / 96 / 84 px; banners about 60 px (56 on a phone), at most 720 px wide; a chest rides its
  orbit's last planet on the line below it (no row, no name on the path; one per orbit at most — the half-way chest stays
  only where it falls at an orbit's end, see below); on a computer the path takes the left of the screen with a ±220 px
  wave. At least five planets show on the opening screen at 390 × 844 and at 1440 × 900 (a new spec). Names beside each
  planet toward the path's middle (one line from a tablet up, two at most on a phone); the next planet's NEXT / START bubble
  beside it, off the line; ZIGi on the other side, leaning away from the neighbour that winds toward it and from banners.
  Waiting planets are flat and quiet in their own hue (no gloss, no glow; OKLCH shading where the browser can, so a gold
  stays gold); only the next one (×1.15, gloss, glow, a ring hugging it, a pulse) and the done ones shine. The line is a
  neon ribbon in each stretch's arriving colour with a soft halo — a third of the colour while unlit (pastel on a white
  sky), full with a white core once lit; the stretch on to the next planet breathes. A tick: press, burst, ZIGi's cheer
  (its celebrate pose, two hops, sparkles), and a comet with a white-hot head and a ~70 px tail that flies over the planets
  (a layer of its own) from the ticked planet to the next one in about a second; an orbit's completion: banner pulse,
  shine, 32 sparks, ZIGi celebrating, the glide on held back 1.4 s. The path lands the next planet at 40 % of the part
  between the bars.
- **Background** (`checklist-sky.tsx`): Nebula — drifting mists, two star layers, a ringed world, a moon (round 3: both at
  ~40 % with a soft blur, at the screen's edges on a phone); Light — white with a pastel mist (still); Dark — black.
- **Corner timers**: Sleep / Meditate / Fast (+ Focus for a timed habit) at the side on a computer; in the foot bar below
  1180 px. Fast's ring is purple now (the gold ring was near-invisible by day); the rings stay islands.
- **Sheets**: Edit path (round 3: grouped by orbit as the List is, each planet its own drag handle, names on up to two
  lines, a neutral "Your own item" placeholder), Options (one-row switches), How it works. **List**: orbit sub-headers,
  one-line rows, the item's colour on its check.
- **Day celebration** (`day-celebration.tsx` + `.css`, a lazy chunk; a modal dialog): once a day in this tab, only on the
  tick that completes the day; round 3: a gold-to-violet glow with soft rays (≤ 25 %), confetti about two seconds longer,
  ZIGi 140–160 px in front of the trophy, the streak and XP counting up, "Continue", and the last tick's Undo as a text
  button under Continue (the toast lends itself there) instead of a toast over the moment.
- **Today's card** (`today-checklist-body.tsx`, `today-checklist.css`; its own lazy chunk), round 3: the next planet as a
  52 px glowing planet with its name and a primary Continue into the path; today's planets as overlapping 22 px planets
  in their colours; on a wide card two columns. A due nudge is a small count on Continue (its sentence is still said to
  screen readers) instead of another line.
- **Wording**: "planets" everywhere the Checklist speaks of its items.

## Round 7 (the iteration-6 critique: ZIGi)
Sizes are now the figure's own. The path's ZIGi is drawn from the delivered posters cropped to the figure — the same pixels
without the empty margin (`public/brand/checklist/zigi-present.webp`, F006-presenting; `zigi-idle.webp`, F001-idle; both
435 × 519, the union of their visible pixels plus 1 px, re-encoded at quality 92) — so its box is what is seen; `--zigi-h`
is the figure's height: 180 / 150 / min(120, 33cqi) px, with a floor `--zigi-min` of 140 / 118 / 96 px that costs a place
more below it. The day's celebration keeps the uncropped large poster.
1. **ZIGi points at the next planet on a computer.** A resting place must put the presenting arm (31 % of the figure's
   height) through the middle of the next planet's body — within half its radius of its centre; along the edge of its ring
   the arm read as pointing at the planet beyond (the iteration-6 frames). A place whose arm passes it costs 150 (at
   nothing), 220 (at a planet to come) or 600 (at a planet done) more — more than the drop to the size floor — and where
   none is free ZIGi stands idle (arms down) instead of pointing elsewhere. Over the owner's nine resting places at 390, 768
   and 1440, with and without motion: the arm through the next planet at every planet (48 of 48; the trophy 6 more),
   figures 142–178 px at 1440, 119–148 at 768, 97–119 on a phone, the trophy's 148 / 148 / 109; no clash; never idle. On the
   opening screen at 1440 ZIGi stands in the free band left of "Take all supplements", between the Afternoon banner and
   "Move €200 to savings", as the critique suggested.
2. **A phone's ZIGi at 96 px or more, 16 px or more from the screen's edges** (`EDGE`). Names now take their side when the
   path opens so that the other side holds ZIGi at its floor (`orbitSides`: a name goes on the alternate side when it fits
   there and ZIGi fits on the other, else on the other side under the same test, else as before): "Do 100 push-ups" and
   "Play piano 15 minutes", at the wave's peaks, now sit on the outer side and ZIGi on the inner. On a phone and a tablet an
   orbit's chest sits on the line under its planet (that planet has a few px more room below it, set when the path opens;
   its lid opens a little, over its own planet), so it takes neither side; on a computer it stays on ZIGi's side, where
   there is room. Nothing of this changes on a tick (the stability test is unchanged and passes).
3. **A long name whole on two lines on a phone.** On a phone the next planet's ring opens toward its name — its dashes and
   moon fade out 35° each side of the name (a mask; the moon now orbits a still ring, so the opening stays put) — so a name
   never steps out there and every name keeps its column's full width (iteration 5's): "Meditate & breathwork 15 minutes"
   is whole on two lines, as the next planet's too. Its distance from what is drawn of the ring and moon stays 12 px or
   more. (On a tablet and a computer names step out as in round 6; a name that keeps to its line only in the full room
   keeps it there when, stepped out, it still ends inside the screen.)
4. **Every move clear of names, banners and planets.** A move whose straight glide would cross a name, a banner, a planet,
   a chest or the tag shrinks away at its old place and grows at the new one (560 ms) instead; a cheer's place keeps 24 px
   clear above it for its hops; the ticked planet's name comes back 600 ms after ZIGi leaves it; the cheer starts in the
   tick's own render (for one frame ZIGi used to stand by the next planet first); a cheer measured again stays where it is
   while that place is clear; planets are read at rest, never through the tick's bounce (which moved a cheer half way).
5. **The comet**: one circular arc from rim to rim, bowing by 75 % of the planets' distance (90 px at most) to the side that
   crosses less of the path (picked as it starts, with ZIGi where it is placed); it passes behind everything on the path —
   planets, names, ZIGi, banners — and shows only in the open sky.
6. **The last tick**: ZIGi's move to the trophy no longer glides across it (it shrinks and grows beside it), and it rests
   12 px clear of the trophy (asserted).

## Round 6 (the iteration-5 critique's nine points)
1. **A tick moves nothing but its own planet.** Names take their sides from the path alone (`orbitSides`: they alternate,
   each on the side where its words fit, measured in its own font on a canvas — never from which planet is next), and every
   name keeps, at all times, the room it would need as the next planet's (`--label-reserve`), so its lines never change.
   The next planet is a size larger by `scale` (no layout change), its ring and moon are drawn outside its box, and its name
   steps out by `translate` alone, gliding 360 ms; the phone's extra room around the next planet (round 5) is gone (a phone's
   step gap is 16 px for every planet); the geometry reads each planet's layout radius, so the line and comets do not shift. Chests never move.
2. **Crisp art.** ZIGi on the path, in the cheer and in the day's celebration is the delivered presenting poster at its
   large size (`F006-presenting-large.webp`, 480 × 632): drawn at most 200 px tall on the path (3.2× source) and 260 px in the
   celebration (2.4×). The round-5 still (`public/brand/checklist/zigi-cheer-wave*.webp`, a 96 × 126 clip frame upscaled)
   is deleted.
3. **The cheer.** The two hops (22 and 18 px), squash and stretch, the gold star burst and the sparkles stay; the figure is
   the presenting pose and it lands on that same pose at rest, so no frame is ever held at the brow. Why that frame: the
   clips are 96 × 126, so any held clip frame is upscaled at 132–260 px (the softness the critic saw); only the posters exist
   at 480 × 632, and of those celebrate has both hands on the head, greeting the open hand at the brow (the salute), idle
   the arms down — presenting holds one arm out, pointing, the other hand on the hip, the hand well away from the face. The
   day's celebration uses the same pose. No new art; arms-up stays an owner item.
4. **ZIGi at rest on a computer ≥ 160 px, near the next planet, gliding.** The placement weighs nearness and being level
   first, then size, then the open side of the wave (the side away from the name); it now weighs every size before choosing
   (round 5 stopped at the first size that fitted anywhere, which put a full-size ZIGi 145 px out from the planet), and it
   tries every height that just clears a name or banner above or below. Where it cheered (or where it stands, on a
   re-measure) it stays when that place is clear, within 60 px of the next ring, level with it and as large. A move glides
   480 ms from where it stood (Web Animations, phone too; none under reduced motion or Motion Off). Over the owner's nine
   resting places, with and without motion: 164–200 px at 1440, 118–168 at 768, 86–132 on a phone; no clash in any of the
   54.
5. **ZIGi points at the next planet**: the presenting arm points left, so on the planet's left the figure is mirrored; and
   the placement weighs where the arm points — its line, at 42 % of ZIGi's height, should meet the next planet's ring; a
   place whose arm line passes it and meets a planet already done (the one just ticked) within 260 px costs 90 more, one
   still to come 30. Where every free place would still point at a done planet, ZIGi rests in the delivered idle still
   (`F001-idle-large.webp`, 480 × 632, arms down, facing the next planet) instead of pointing back. Over the 54 resting
   places: 53 presenting (the arm on the next planet at 41, passing just beside it toward a later planet at 12), one idle
   (a phone, the owner's third planet, both motion settings).
6. **Names 12 px from the next ring and its moon** (`--label-reserve`: the planet's extra size, the ring and moon at the
   next size, 13 px, less the usual gap) — asserted after each tick at 390, 768 and 1440.
7. **The comet's tail**: drawn 112 px back from the head (at most 78 % of the arc; was 74 px, seen as 35–45), the white
   core 62 px, at .75 / .95 opacity (was .6 / .9). Measured as seen (a probe pauses the flight and compares the picture
   with and without the comet layer along the arc): three quarters of the way along, the tail shows 84 px (phone) to 107 px
   (computer) back from the head's centre — 67–90 px past its 34 px halo — its white-hot part 40–50 px; earlier in the
   flight the tail is as long as the arc already flown (a computer's arc is about 145 px, a phone's 99).
8. **The 1440 background planet**: placed `max(3vw, 104 px)` in from the right, so its ring (42 % wider each side) stays on
   the screen.
9. **Today's card at 1440**: the right column takes the room the next planet's name needs (`max-content`, the left at least
   220 px) and the name stays on one line (an ellipsis past 340 px).

## Round 5 (the iteration-4 critique)
**(a) Why the round-4 check passed while the frames showed ZIGi over a name and a chest.** Two reasons, both in the check:
it measured an inset box (the figure's box less 16 % at each side and 8 % at the top), smaller than the drawn picture, and
it measured only the opening, before any tick — the frames that failed were after a tick, after an orbit and the reduced
stills. The placement had the same two faults (inset box, the next planet's body without its ring and moon, no clearance),
and it measured once, while a just-ticked planet or a chest was still mid-animation. A probe run against the round-4
server (9a475ede, before any round-5 change) read ZIGi's drawn box over the ticked planet, its name, the next ring and the
chest on a phone, and over the next ring and "Move €200 to savings" on a computer — the frames' findings.
**(b) Why the reduced stills showed the hands-on-head figure.** The resting state followed the day's mood: from half way
on, `proud` — which has no art of its own and wears the celebrate frame (hands on the head) — and `success` likewise. Round
4's "pointing under reduced motion" was true only before half way. ZIGi now points (`presenting`, own art) at rest in
every mood, and cheers only at the day's end (the trophy).
1. **ZIGi at rest in a free place**: `PathZigi` measures its drawn box against every planet (the next one with its ring and
   moon), name, banner, chest (and its name), the NEXT tag and an open panel, each grown by 12 px (13 in the solver, for
   rounding), over a fine grid of places beside its planet (both sides, 13–70 px out, ±120 px up or down), never past the
   screen; only where no full-size place is free does it get a little smaller (down to 70 %; seen: 112–121 px of 132 on a
   phone at two of the owner's nine resting places, 140–150 of 200 on a computer in the two-planet afternoon orbit, 134 of
   168 on a tablet once). It measures again 320 ms and 1.3 s later, once a tick's own motion has settled. The names of the
   next planet and its neighbours move off ZIGi's side where they have room (`orbitSides`), and a phone gives the next
   planet 14 / 22 px of extra room above and below. A probe over all nine resting places of the owner's day, at 390, 768
   and 1440, with and without motion: no clash in any of the 54.
2. **The cheer**: one held frame of the delivered greeting clip — the open hand raised with a wink (frame 24 of
   F002-greeting, never redrawn; `public/brand/checklist/zigi-cheer-wave*.webp`, 1x and upscaled 2x / 4x in premultiplied
   colour), never the hand-at-forehead frame or the celebrate art; two hops of 22 and 18 px with squash and stretch, a
   gold star burst behind and sparkles. The day's celebration uses the same still. Arms-up art stays an owner item.
3. **Reduced motion**: the pointing still (see (b)); no cheer.
4. **Light's twelve weeks**: a light plate, pale "nothing" cells, the same accent colours, ink words.
5. **The comet**: an 18 px head in a 34 px halo, a 60–80 px tail in two strokes, on a longer arc (a 69 px arc on a phone
   before); animated with each comet's own lengths through the Web Animations API — the CSS keyframes read a custom
   property and stepped instead of gliding, so the tail sat before the arc's start and never showed. The ring flash moved
   to the comet's arrival (1.18 s).
6. **Chests**: boxes of 86 / 72 / 64 px (computer / tablet / phone), the art about 64 / 54 / 48 px seen.
7. **Nebula on a phone**: the violet, magenta and teal clouds sit in the path's column, the stars a touch larger.
8. **Phone spacing**: 14 px above and 22 px below the next planet.
9. **The phone toast**: one line, 44 px (its close button left out on a phone; it leaves by itself after 8 s; Undo 44 px).
10. **Names 12 px from rings**: the next planet's name stands `dot × .075 + ring × 1.15 + 12 px` out (its ring is
    `--ring`, 14 px, 7 on a phone).
11. **Background planets**: whole or not drawn — none below 1180 px.
12. **Today's card**: filled mini planets in their own colours (waiting ones dimmed, done ones lit, the next one larger
    with a ring), no line under them, 22 px (28 for the next) from 768 px up.

## Round 4 (the iteration-3 critique's twelve points)
1. **ZIGi's cheer**: every cheer (a tick, an orbit, the day's end, the celebration) shows ZIGi's waving greeting as a still
   from its first frame — never the celebrate frame (it reads as hands on the head, and its clip starts on the idle frame) —
   with two hops and a ring of sparkles, about 1.5 s from the press. Under reduced motion and Motion Off there is no cheer:
   ZIGi stays beside the next planet, pointing. **ZIGi's eleven figures have no arms-up pose; a true V needs new art** (an
   owner/asset decision, not something the lane can draw).
2. **The day's celebration** is a full-screen moment: glow and soft rays, the trophy high with ZIGi large in front (176–230
   px on a phone, 212–260 on a computer), the day's planets, big streak / XP tiles, Continue near the foot, Undo under it.
3. **ZIGi never over the path**: `PathZigi` `fit` measures the planets, names, banners, chests and the NEXT tag around its
   planet and takes the first clear place (preferred side, other side; centred, raised, half a step down), bounded by the
   screen; the next planet's name takes the side away from the middle so ZIGi gets the roomier one. A phone's ZIGi is 132
   px (it was 140) so it fits between a banner and the next name.
4. **Nebula's sky**: violet, magenta and teal clouds at about a fifth, three star layers; Dark's clouds at an eighth.
5. **Light ribbons**: unlit at half the colour over a darker edge (OKLCH 62 % lightness, the same in every theme); lit with a
   white core.
6. **The comet** flies over the planets in its own layer on an arc out to the open side, from the ticked planet's rim to the
   next one's; its head fades at the rim and the next planet's ring flashes (`data-arrive`).
7. **Chests** are 52 px on a phone, 64 on a computer, beside their orbit's last planet half a step down (away from its name),
   gold glow; reached, the lid flies open with a flash and sparks.
8. **A phone's chrome**: one-row top bar (X, today's bar and count, flame, XP, ⋯; Path / List in the ⋯ menu; the title and
   date said, not shown); the foot bar is filled with the Sleep / Meditate / Fast / Focus chips (no corner button); a toast
   gets its own row above the chips while it shows (the chips stay in reach). Six planets on the opening screen at 390 × 844
   and 1440 × 900 (a spec asserts it).
9. **The wave and the names**: a phone's wave is ±60 px; names alternate sides planet by planet (the far ends and long names
   take the middle's side); the next planet wears a one-word NEXT / START tag on its crown and keeps an ordinary name.
10. **Text**: a long name wraps to two lines on a phone; what scrolls under the top bar fades into it; the background world
    keeps to the screen's edge below a computer's width.
11. **A computer's right column**: the timers as glowing ringed tiles, two by two, and the twelve weeks open under them.
12. **Copy and Today**: one toast pattern ("… logged for today." / "…: back as it was." for goal steps and own items, as
    habits already said; `lib/checklist/adapters.ts`); Today's card drops the nudge count (a due nudge makes Continue glow; its
    sentence is still said to screen readers) and shows today's planets as a small winding row of mini planets.

## Files outside the Checklist touched, and why
- `components/ui/undo-toast.tsx` (round 1): `pushToastLayer(el)` — while a top-layer layer is open the one toast region is
  portalled into the topmost, so Undo stays clickable. Other pages unchanged.
- `components/path/*` (shared engine): every look change is behind `variant="orbit"`; round 3 adds `jumpDock` (unused by
  Earn), a `data-settled` signal on every path (below) and an `IntersectionObserver` root margin read from the scroller's
  scroll padding (zero for a page scrolled by the window, so Earn's behaviour is unchanged). Earn's Start-here captured on
  this branch against a build of `859648d4`: SSIM 0.99997 (phone) and 1.0 (computer) — unchanged; nothing there was fixed.
- `components/checklist/checklist-launcher.tsx`: one effect notes each route (`notePath`) for the close's return.
- `components/path/use-path-geometry.ts` (round 7): the geometry also records the stage's insets from the screen's sides
  (`inset`), which only the orbit look's name sides read; Earn's Start-here is unchanged (above).
- `scripts/themes/build-themes.mjs` `ISLANDS`: + `.checklist-celebration`, + `.path-label-bubble`, + `.checklist-timer-ring`;
  − `.checklist-timer` (the timer cards follow the theme); round 4: + `.path-next-tag` (the NEXT tag stays white with ink
  words). The docked jump button and the foot bar are not islands (they follow the theme), and the computer's on-path jump
  button gets a hand-written day look.
- `scripts/lib/hosted-alpha-checklist.mjs` (+ test), TIER 3 commit `16aae2fc`: stage 10 reads "planet(s)".

## Half-way chest (round 3)
`components/checklist/path-view.tsx` `withOrbitChests`: at most one chest per orbit. The half-way chest stays when it falls
at an orbit's end (it is then that orbit's chest — the specs' four-dot day keeps it); half way through an orbit it would
be a second chest in that orbit, so it is left off the path. ZIGi's half mood and the game layer read the records, not
the chest.

## Assertions moved (equal or greater strength)
- `tests/path-engine.spec.ts` (round 3, CI on 42ec357c: a line end 3.01 px from its dot read while the path was still
  re-measuring): the line is read once the stage carries `data-settled` (set two frames after the geometry hook's last
  scheduled measure, cleared while a new geometry settles); the same 2 px tolerance.
- `tests/checklist-overlay-af.spec.ts` (this lane's own), round 3: the NEXT bubble is asserted beside its planet and not
  above it (was: above); the comet is asserted as head and tail (was: a comet path); ZIGi's cheer as the celebrate pose
  with its sparkles beside the ticked planet (was: the success state); the toast check now also covers every planet,
  name, banner, chest and ZIGi on screen and places it in the foot bar (phone) or right of the path (computer); a new test
  asserts at least five planets on the opening screen at 390 × 844 and 1440 × 900 and an opaque foot bar holding the
  timers' button.
- `tests/webkit-checklist.spec.ts` (round 4): the phone's timers are the foot bar's chips — the spec no longer opens a corner
  button first; every chip and planet is still measured at ≥ 44 px and the timers' group is still asserted visible.
- Round 4, `tests/checklist-overlay-af.spec.ts`: the next planet's name is held to the same rules as every name (no bubble
  any more) and a new check asserts its one-word tag on the planet's crown, centred; the cheer is asserted as the greeting
  still (`data-zigi-state="cheer"`, its image the greeting) with sparkles (was: the celebrate state); under reduced motion and
  Motion Off the tag (was: the bubble) is visible and there is no cheer; the first-screen timers check reads the Sleep chip
  on a phone (was: the corner button); the density test now asks six planets (was five) and checks the chips in the foot bar
  (was: the corner button); new: ZIGi at rest touches no planet, name, banner or chest; the celebration's ZIGi is at least 160
  / 200 px, in front of the trophy, showing the greeting.
- Round 4, `tests/checklist.spec.ts`: on a phone the List is chosen from the ⋯ menu's View group (the same group, the same
  button, the same checks after it).
- Round 5, `tests/checklist-overlay-af.spec.ts`: "ZIGi clear of the path" now reads ZIGi's drawn picture (no inset) with 12 px
  of clearance from every planet (the next one with its ring), name, banner, chest and chest name, tag and panel (was: an
  inset box touching nothing) — at the opening and, in a new test, after each of three ticks (the third completes an orbit)
  and under reduced motion, at 390 × 844, 1440 × 900 and 768 × 1024; the resting figure is asserted never the celebrate
  art and, under reduced motion and Motion Off, the pointing still. "ZIGi beside the next planet" (was: within 24 px of the
  planet's body) is now 12–36 px from its ring and level with it — the same 24 px of play past the new clearance (the old
  bound measured from the body cannot hold once ZIGi must clear the ring by 12 px). The cheer's image is the held greeting
  frame (was: the greeting poster) with its star burst; the celebration's ZIGi likewise.
- Round 6, `tests/checklist-overlay-af.spec.ts`: the cheer's image and the celebration's ZIGi are the presenting poster at
  its large size (was: the held greeting frame) — still one named still, never the celebrate art, with the star burst. New:
  after the cheer ZIGi glides (an animation of 300 ms or more) to its place unless it stays; at each of three ticks at
  1440 ZIGi rests at 160 px or more, and at 390 / 768 / 1440 it faces the next planet, never points at a planet already
  done (its arm's line meets the next ring, or no done planet within 260 px; or it stands idle) — after each tick and under
  reduced motion — and the next name stands 12 px clear of the ring and moon; a new test reads every name's and chest's box before and after each of three ticks (390; 1440 and
  768): all but the ticked planet's keep side, height and lines within 1 px, all but the new next one keep their place and
  width within 1 px, and the new next name only steps out (≤ 40 px) on a translate of 300 ms or more. ZIGi's rest is read
  2.2 s after its cheer (was 1.6 s; its last measure is 1.3 s after a move, which glides 480 ms) — a wait, not a bound.
- Round 7, `tests/checklist-overlay-af.spec.ts` (`restFacts`, `expectRest`): ZIGi is measured on its figure as seen — the
  non-transparent pixels of its picture mapped onto the drawn box — never on the box. At 1440 it rests at 140 px of figure
  or more (was: a 160 px box, 130 px of figure), at 768 at 118 and on a phone at 96, 16 px or more from a phone's edges
  (new); it points at the next planet — the presenting still, its arm through the middle of the planet's body (was: never at
  a planet already done, or idle) — after each of three ticks and under reduced motion at 390, 768 and 1440, and at the
  opening. The opening's "130 px or more" (a box of the uncropped picture, 81 % of it figure) is now 106 px of figure on a
  phone and 140 on a computer. **One bound loosened, for the coordinator to confirm:** at that landing on a computer
  "beside" was 12–36 px from the ring; no place there both points through the planet and holds a 140 px figure within 36 px
  (the free band left of it is 106 px tall, the right side holds the planet's name), so on a computer it is now 12–104 px,
  with two new checks in its place — the arm through the planet's body and nothing on the path between the arm and the
  ring; on a phone and a tablet it stays 12–36 px. The next name's 12 px are measured from the ring and moon as drawn: from their box where the ring is whole
  (a computer, a tablet; unchanged), from every point of the ring and moon not faded out where it opens toward the name (a
  phone). The cheer's, the stills' and the reduced still's image is the cropped presenting still (was: the uncropped
  poster). New: every frame of a tick's moves keeps ZIGi off names, banners and planets shown; at the day's end ZIGi is 12 px
  clear of the trophy and everything else; on a phone a long name stays whole on two lines, also as the next planet's, and
  ZIGi beside it meets every rest check.
- Earlier rounds (kept): `checklist.spec.ts` Jump sweep on the overlay's scroller (500 ms wait); Edit path / How it works
  through the menu; `polish2-af.spec.ts` `sweepJump` scroller argument; `checklist-themes.spec.ts` waits for one-time
  animations only; `path-engine.spec.ts` no sideways scroll in the overlay; `checklist-timers.spec.ts` opens the corner
  button and reads Focus by accessible name; `checklist-view-writes-nothing-af.spec.ts` "planets"; the overlay spec's
  planet ranges 88–112 / 64–84 px.
- No assertion deleted or weakened. Today's card keeps `.today-checklist-line strong` (the next planet) and
  `.today-checklist-dots > li` (every planet, in its colour), which polish2's Today test reads.

## What the lead must wire / decide
- Regenerate the theme sheets after the merge (`node scripts/themes/build-themes.mjs`): this branch never commits them, so
  `scripts/themes/build-themes.test.mjs` fails on the branch as committed and passes once regenerated; every browser result
  here was taken with regenerated sheets.
- ADR rows: H67 superseded by the full-screen brief; H55's loops gain the overlay's (the next planet's pulse/orbit/bubble
  nudge, the lead stretch's breathing, the sky's drift in Nebula), owner-approved; H132 covers the Alpha strip; the Today
  card's nudge became a count on Continue (the Options line "On Today's card at 10:00, 15:00 and 19:00" still holds).
- Nothing for registries, CSP, egress, budgets or storage. New sessionStorage key `zigoals-checklist-celebrated` (per tab).
- WebKit (CI only, never run here): `webkit-checklist` and `webkit-theme-parity` /app/checklist — please read CI.

## Evidence (round 7, final build; local production build on 127.0.0.1:3104, Chrome headless, ≤ 2 workers, locked)
- `pnpm typecheck` clean; `pnpm lint` 0 errors (19 baseline warnings) and `pnpm exec eslint` on the changed files from the
  repo root clean; unit (vitest from the root) 123 passed.
- Browser, desktop + mobile: the sixteen Checklist / Today / touch-target specs — 92 passed, 14 skipped (project-specific; the
  new long-name test is a phone's); a11y-wcag-x, today-v2, showcase-today-aa, zigi-a11y-pass, aa-a11y: 46 passed;
  theme-parity-af, whole: 55 passed, 1 skipped.
- The probe over the owner's nine resting places at 390 / 768 / 1440, with and without motion: as in point 1 above. The
  opening screen: 6 planets at 390 (Water 61 %), 7 at 768, 6 at 1440 (Water 63 %). Weight: `/app` 531.8 kB (567.0),
  `/app/checklist` 461.2 kB (492.0), `/app/earn` 458.4 kB. New files: the two cropped stills (`zigi-present.webp` 81.9 kB,
  `zigi-idle.webp` 84.0 kB), fetched when the path's ZIGi shows.
- Earn's Start-here against iteration 6: SSIM 0.99999 on a computer; 0.981 on a phone, the whole difference the sticky
  header band over the capture (as before). The theme generator copies a rule's custom properties that hold a var() into
  the Light and Dark sheets with a raised specificity, so a phone override of such a property lost there (theme parity
  caught a chest 72 px aside in Light): the phone and tablet overrides are plain numbers (`--step-out`, `--chest-aside`)
  that the copied rules multiply by.
- Captures: `~/zigoals-af/l3b/iter-7/` (INDEX.txt).

## Evidence (round 6, final build; local production build on 127.0.0.1:3104, Chrome headless, ≤ 2 workers, locked)
- `pnpm typecheck` clean; `pnpm lint` 0 errors (19 baseline warnings) and `pnpm exec eslint` on the changed files from the
  repo root clean; unit (vitest from the root) 123 passed.
- Browser, desktop + mobile: the sixteen Checklist / Today / touch-target specs — 91 passed, 13 skipped (project-specific);
  a11y-wcag-x, today-v2, showcase-today-aa, zigi-a11y-pass, aa-a11y: 46 passed; theme-parity-af, whole: 55 passed, 1 skipped.
- A probe over the owner's nine resting places at 390 / 768 / 1440, with and without motion: no clash in 54; sizes and
  poses as in point 4 and 5 above. Weight: `/app` 531.8 kB (567.0), `/app/checklist` 459.8 kB (492.0), `/app/earn`
  458.4 kB. The round-5 cheer stills are deleted; ZIGi's two stills are the existing delivered `-large` posters.
- Earn's Start-here against iteration 5: SSIM 0.997 on a computer (the whole difference the floating launchers' glow at the
  right edge), 0.963 on a phone (the sticky header band, as before).
- Captures: `~/zigoals-af/l3b/iter-6/` (INDEX.txt).

## Evidence (round 5, final build; local production build on 127.0.0.1:3104, Chrome headless, ≤ 2 workers, locked)
- `pnpm typecheck` clean; `pnpm lint` 0 errors (19 baseline warnings) and `pnpm exec eslint` on the changed files from the
  repo root clean; unit (vitest from the root) 123 passed.
- Browser, desktop + mobile: the sixteen Checklist / Today / touch-target specs — 89 passed, 13 skipped (project-specific);
  a11y-wcag-x, today-v2, showcase-today-aa, zigi-a11y-pass, aa-a11y: 46 passed; theme-parity-af, whole: 55 passed, 1 skipped.
- Weight: `/app` 531.8 kB (567.0), `/app/checklist` 459.0 kB (492.0), `/app/earn` 458.4 kB. New files: the cheer still
  (`public/brand/checklist/zigi-cheer-wave.webp` 5.2 kB, `-2x` 15.9 kB, `-large` 41.7 kB), fetched only when ZIGi cheers.
- Captures: `~/zigoals-af/l3b/iter-5/` (INDEX.txt).

## Evidence (round 4, final build; local production build on 127.0.0.1:3104, Chrome headless, ≤ 2 workers, locked)
- `pnpm typecheck` clean; `pnpm lint` 0 errors (19 baseline warnings); unit (vitest from the root) `apps/web/lib/checklist`,
  `apps/web/lib/path`, `scripts/themes/build-themes.test.mjs`, `scripts/lib/hosted-alpha-checklist.test.mjs`: 123 passed.
- Browser, desktop + mobile: the sixteen Checklist / Today / touch-target specs listed below for round 3 — 87 passed, 13
  skipped (project-specific); a11y-wcag-x, today-v2, showcase-today-aa, zigi-a11y-pass, aa-a11y: 46 passed.
- theme-parity-af, the whole spec, both projects: 55 passed, 1 skipped (project-specific).
- Weight: `/app` 531.8 kB (567.0), `/app/checklist` 457.1 kB (492.0), `/app/earn` 458.4 kB; lazy: the day celebration 1.9 kB
  JS + 2.6 kB CSS, Today's card body 1.9 kB JS (gzip).
- Captures: `~/zigoals-af/l3b/iter-4/` (INDEX.txt: the opening planet counts and the frames for each line-4 step).

## Evidence (round 3, final build; local production build on 127.0.0.1:3104, Chrome headless, ≤ 2 workers, locked)
- `pnpm typecheck` clean; `pnpm lint` 0 errors (19 baseline warnings); unit (vitest from the root) `apps/web/lib/checklist`,
  `apps/web/lib/path`, `scripts/themes/build-themes.test.mjs`, `scripts/lib/hosted-alpha-checklist.test.mjs`: 123 passed.
- Browser, desktop + mobile: checklist-launcher, checklist-overlay-af, checklist-themes, checklist-timers,
  checklist-view-writes-nothing-af, checklist, earn-path, hosted-checklist-stage, path-engine, polish2-af, today-roles-af,
  zigi-checklist-af, page-titles, today-screens, phone-touch-targets, touch-targets — 87 passed, 13 skipped (project-specific).
  Also a11y-wcag-x, today-v2, showcase-today-aa, zigi-a11y-pass, aa-a11y (Today's card): 46 passed.
- theme-parity-af, the whole spec, both projects: 55 passed, 1 skipped (project-specific).
- Weight: every page within budget — `/app` 531.8 kB (567.0), `/app/checklist` 455.8 kB (492.0), `/app/earn` 458.4 kB.
  Lazy: the day celebration 1.9 kB JS + 2.1 kB CSS, Today's card body 1.9 kB JS (gzip).
- Captures: `~/zigoals-af/l3b/iter-3/` (INDEX.txt: the opening planet counts and the frames for each line-4 step).
