# Session AF — the Checklist redesign, critique rounds (ADR-028 H132)

The owner's verdict of 19 Oct: the Checklist worked but read as a page in the app shell with small dots and little motion.
Lane L3b (`af/checklist2`) rebuilds it as a full-screen, Duolingo-style overlay. After each iteration a fresh, read-only
critic scores the owner's six acceptance lines with his references beside every capture (two Duolingo path screenshots and
Todoist's Wear OS accent themes, kept on the Mac outside the repository, never committed). Captures: production builds,
Chromium headless, the owner's own favourites on a fictional device, a fixed clock, every `/api` answer 503.

Evidence label: design review of screenshots and recorded frames (not a usability test, not a device).

## The acceptance lines
1. The overlay covers everything (no sidebar, header, footer, tab bar or other launcher) at 390, 768, 1440; close X and Escape.
2. Nodes ≥ 72 px on a computer / ≥ 64 px on a phone, each with at most one short label; no paragraph text on the path view.
3. Side by side with the Duolingo references: "the same kind of experience, in a cosmic nebula style" — not a list, not a dot stepper.
4. The tick and day-complete animations visible in the recorded frames (press, burst, line glow, ZIGi reaction, bar fill, celebration).
5. Nebula, Light and Dark intentional and premium; colours identical across themes.
6. A premium stand-alone app people would want to open daily.

## Scores

| Iteration | Head | 1 | 2 | 3 | 4 | 5 | 6 | Verdict |
|---|---|---|---|---|---|---|---|---|
| 1 | `48277dc2` | FAIL (the Alpha strip inside the overlay, painted through the Undo toast) | FAIL (sizes pass: ≈ 72 px phone, 84 px computer; labels boxed, 2–3 lines) | FAIL (≈ 166 px node pitch vs Duolingo's ≈ 84; opens on the finished orbit; ZIGi small, one pose; upcoming planets dark discs; grey dotted track) | FAIL (press, burst, incoming glow, bar fill, XP count and the day's confetti visible; ZIGi's reaction, the onward glow, the streak's count-up and a real orbit celebration missing) | FAIL (Light: dark upcoming planets, a near-invisible line, dark timer cards, ZIGi's grey shadow; a completed orbit's bar reads black in every theme) | FAIL | no — the Duolingo vocabulary without its density, character presence or reward clarity; the Undo toast hides the next node and ZIGi on every tick |
| 2 | `2d023640` | PASS (no shell, launcher or Alpha strip at 390/768/1440; the X top-left) | PASS (phone 72 px, next 82; tablet 88; computer 96, next 110; one unboxed name each) | FAIL (2–3 planets on the opening screen vs Duolingo's 7–8: pitch 110 px phone / 150 computer, four labelled chests, tall banners) | FAIL (press, burst, incoming glow, bars, XP count, chests, orbit and day celebrations visible; no ZIGi cheer on a tick; no onward glow seen reaching the next planet) | FAIL (Light: slate path line, navy jump buttons, a clipped shadow, a near-invisible Fast ring) | FAIL | no — still too sparse, and the Undo toast and corner buttons sit on the path on every tick |
| 3 | `7c163836` | PASS (no shell, launcher or Alpha strip at 390/768/1440; the celebration covers the screen too) | PASS (phone 72 px, next ≈ 82; tablet 80; computer 96, next ≈ 110; one unboxed name each; "Meditate & breathwork 15…" cut by an ellipsis on a phone) | PASS, marginal (5 planets on the opening screen at 390, 7 at 768, 6 at 1440; the phone wave ≈ ±35 px vs Duolingo's ≈ ±70; 30 px chests; a two-line NEXT box) | FAIL (press, burst, shock ring, line glow, the onward comet reaching the next planet, bars, shine, XP, chest, orbit and day celebrations visible; ZIGi keeps its idle pose on a tick, its celebrate pose reads as dismay, and it stands idle beside the trophy on the day celebration) | FAIL (Light's iteration-2 defects fixed; Nebula and Dark stills differ only in base hue — no visible nebula; Light's unlit ribbons nearly vanish on a phone) | FAIL | no — the path now feels like Duolingo; ZIGi never cheers, the rewards are small or generic, Nebula reads as Dark |
| 4 | `9a475ede` | PASS (no shell, launcher or strip at 390/768/1440; the celebration full-screen) | PASS (phone 72 px, next ≈ 82; tablet ≈ 80; computer 96, next ≈ 110; one unboxed name each; the long name wraps to two lines) | PASS (six whole planets and part of a seventh at 390, a ±60 px wave, NEXT on the planet's crown, unit-like banners, chests beside the path) | PASS (press, burst and shock ring, line glow, ZIGi's greeting with a hop and sparkles from f02, bars, XP, chest, orbit and day celebrations; the held pose reads as a salute, counted under 6) | FAIL (Nebula told from Dark at a glance, Light's ribbons visible; Light's twelve-weeks map a near-black panel in a white card on a computer) | FAIL (ZIGi comes to rest over a name or a chest after a tick and an orbit, also under reduced motion; the cheer reads as a salute) | no — close: path, density, chrome and the day celebration near premium; ZIGi's resting place and cheer are not |
| 5 | `eee27568` | PASS | PASS (phone 72 px, next 82; tablet ≈ 80; computer 96; one unboxed name, at most two lines on a phone) | PASS (6 / 7 / 6 planets on the opening screens at 390 / 768 / 1440) | PASS (press, burst and shock ring, line glow, the comet, ZIGi's hops and star burst, bars and XP, chest, orbit and day celebrations) | PASS (Light's twelve weeks a light plate with the same accents; Nebula told from Dark at a glance on a phone; planet hues identical) | FAIL, close (every tick shuffles name sides and chests; the celebration's ZIGi soft and stair-stepped, its held frame a hand at the brow; on a computer ZIGi rests small and jumps across the path) | no, very close — screens and motion premium; the tick reflow and the day's peak are not |
| 6 | `e7f71752` | PASS | PASS | PASS (6 / 7 / 6 planets) | PASS (press, burst, line glow, bars and XP, ZIGi's cheer with hops and a star burst, the comet, chest, orbit and day celebrations) | PASS (all three deliberate; hues identical; Light's twelve weeks a light plate) | FAIL, very close (on a computer ZIGi points past NEXT on the opening screen and after an orbit; on a phone ZIGi rests at ≈ 67–82 px against the edge; a long name cut; glide frames cross names and a banner title) | no, very close — screens, motion, rewards and celebration premium; ZIGi's pointing and phone size not |
| 7 | `3816e73c` | PASS | PASS (phone 72 px, NEXT ≈ 78; computer 96, NEXT ≈ 110) | PASS (6 / 7 / 6 planets; the same vocabulary as the references) | PASS (press, burst and shock ring, line glow, ZIGi's cheer, bars and XP, comet, chest pop, orbit and day celebrations) | PASS (layout, hues, ZIGi and chests identical; Light clean and soft) | PASS, marginal (ZIGi points at NEXT in every resting state at every size, ≈ 98–120 px on a phone, no move crosses content; polish left: a mirrored ZIGi and a dropped name on the computer's last-tick frame, cramped phone chests) | **yes (marginal)** |
| 8 (polish, confirming pass) | `9f2c16c1` | PASS | PASS | PASS (6 / 6 / 6 planets) | PASS | PASS | PASS, marginal | **yes**; two small regressions against iteration 7 (the phone tick's comet a short hook toward ZIGi; the computer cheer's peak touching a name), so one narrow fix round before the merge (owner, 20 Oct) |

## Iteration 1 — the critic's ranked improvements (sent to the lane)
1. Land on the next node (open and after every tick: the next node at ≈ 40 % of the viewport, every width).
2. The Undo toast: one line, ≤ 52 px, docked above the timers, the path padded so it never covers a node, label or ZIGi; its X clear of the ↓ button; the Alpha strip out of the overlay (H132).
3. Density and labels: phone pitch ≈ 100–110 px, side labels alternating left and right without boxes, one line at 768/1440, ≤ 2 lines on a phone; computer nodes 96–104 px with ≈ ±140 px amplitude; nothing drawn through a label.
4. ZIGi 130–150 px tall on a phone (≈ 200 px on a computer), always beside the next node, three distinct poses (pointing, cheering on a tick, celebrating the day).
5. Upcoming planets in their own colours at ≈ 60 % brightness with a glow (not navy or brown); the next one full colour, ≈ 1.15× larger, a pulsing ring and the START bubble; adjacent colours kept apart.
6. Lines: an onward glow in the next planet's colour runs the whole segment after a tick and leaves a lit trail; the unlit path a soft neon ribbon (≥ 3:1 in Light), not grey dots.
7. Orbit banners: a white or gold fill with a shine (a full bar glows); an orbit celebration of ≈ 1.2 s (banner pulse, ≥ 30 particles, ZIGi cheers, "+XP").
8. Light: white-glass timer cards with coloured rings, no grey shadow under ZIGi, a shaded decorative planet, a warm gold chest.
9. Phone header folded into the top bar; tools as Path/List plus one ⋯; the corner timers as a floating corner button on the first screen; the cyan moon never cut at the edge.
10. One vocabulary: "planets", never "dots", inside the overlay.
11. Sheets and List: the Edit sheet missing at 1440 and a possible state change on opening it (to check); swatches and a segmented orbit choice instead of native selects; toggles in Options; the List view with orbit sub-headers, single-line rows, the item's colour and icon on its check (Todoist).
12. The day celebration on a phone with rays, the streak and XP counting up, 32–40 px planet beads, "Continue", a larger card at 1440; Today's card "dots" wording; Earn's Start-here checked against its pre-L3b look.

## Iteration 2 — the critic's ranked improvements (sent to the lane)
Fixed from iteration 1: opening on the next planet, unboxed labels, upcoming planets in their own colours, white/gold orbit
meters, no Alpha strip, "planets" wording, one-line List rows. Partly: density, ZIGi (bigger, four poses, no tick cheer), the
toast, the onward glow, Light's line, Edit path.
1. Density: pitch phone 110 → 84, tablet → 96, computer 150 → 112; at most one chest per orbit, inline at a half step, unnamed;
   banners ≈ 64 px; the computer's empty left column used (a wider wave, or ZIGi and the history there); target ≥ 5 planets on
   the opening screen at 390 and 1440.
2. Undo: an opaque 36–40 px pill in the top bar for 5 s (or an Undo bubble on a done planet), never over the path; a text
   button under Continue on the celebration.
3. ZIGi: a distinct 1.5 s cheer on a tick (arms up, a hop, sparkle); ≥ 140 px and in front on the day celebration.
4. The onward comet: a bright head (white core + the planet's colour, 60–80 px tail) seen crossing to the next planet in ≥ 3
   frames; the NEXT bubble beside the planet, off the line; the ticked→next stretch softly pulsing afterwards.
5. Corner buttons off the path on phone and tablet (a top-bar pill, or a reserved bottom safe area); the ↓ button off ZIGi.
6. The line as a 10–12 px neon ribbon with a 24 px glow; unlit stretches ≈ 35 % of the arriving planet's colour; Light a pastel
   tint with a white core, not slate.
7. Only the next and done planets glow: waiting planets flatter (no gloss or glow, ≈ 70 % opacity, same hue).
8. The ⋯ menu ≥ 95 % opaque or blurred.
9. Text: a wider phone label column (one line); Edit path not truncating at 390, grouped by orbit, a neutral placeholder;
   "Your last twelve weeks" on one line on a computer.
10. The day celebration: a gold→violet radial glow with soft rays instead of sepia stripes; the confetti ≈ 2 s longer; no toast.
11. Today's Checklist card: the next planet as a 48–56 px glowing node with its name, done planets as small planet chips, a
    "Continue" button; no "planets still waiting" line; no mostly empty 824 px card.
12. Background decorations behind or outside the path column, ≈ 40 % opacity with blur, never on a label or ZIGi.
Not in this lane: Earn's Start-here keeps its earlier path look ("Press a dot for its guide", outlined nodes); aligning it with
the new Checklist is an owner option (STATUS owner items).

## Iteration 3 — the critic's ranked improvements (sent to the lane)
Fixed from iteration 2: density (5–7 planets per screen), the toast off the path, the onward comet reaching the next
planet, Light's ribbons, buttons, shadow and Fast ring, the ⋯ menu, Today's card no longer a dot stepper. Earn's Start-here
unchanged (SSIM 0.99997 / 1.0).
1. ZIGi cheer: an arms-up V pose with a hop and sparkles from the press for ≈ 600 ms on every tick; it replaces the
   hands-on-head sprite everywhere, reduced motion included (there: the pointing pose beside the next planet).
2. The day celebration as a full-screen moment, not a card: ZIGi ≥ 160 px (phone) / 200 px (computer), cheering, in front
   of the trophy; the trophy, the planet beads and big streak/XP tiles; Continue near the bottom; no empty lower third.
3. ZIGi at rest never overlaps a planet, label or banner (on a computer it came to rest over the planet just ticked).
4. Nebula sky: 2–3 large soft colour clouds (magenta, violet, teal at 15–25 %), a three-layer star field and a slow drift,
   so a still is told from Dark at a glance.
5. Light: unlit ribbons at ≈ 50 % of the arriving colour with a slightly darker edge, ≥ 2:1 against the sky on a phone.
6. Comet: the head fades at the next planet's rim and flashes its ring (no dot parked on the icon); a visible 60–80 px tail
   arcing outward over 3+ frames on a phone.
7. Chests 48–56 px on a phone, 64 px on a computer, at a half step beside the line with a gold glow; an opening that
   reads at a glance.
8. Phone chrome: a one-row top bar (X, bar, flame, XP, ⋯; Path/List in ⋯ or the foot bar); the foot bar filled with the
   timer chips or reduced to a floating button; target one more planet on the opening screen.
9. Phone wave ±60–70 px at 390; labels alternating per planet; NEXT as a one-word tag on the planet (Duolingo's START),
   the ordinary one-line label kept.
10. Text: "Meditate & breathwork 15 minutes" wraps to two lines on a phone; content fades under the top bar ("Water" was
    cut on a computer); the background planet stays off a label on a tablet.
11. Computer layout: the timers as glowing ringed tiles (2×2) and the space under them used (e.g. the twelve-weeks map),
    or the path centred so the empty band goes.
12. Copy and Today: one toast pattern; the "5" badge on Today's Continue dropped or relabelled; the overlapping ring
    strip replaced by a small winding row of mini planets, or dropped.
Not in this lane: the computer's side launcher overlaps the Orbit 2 banner's right end on Earn's Start-here, and its
outlined-node style differs from the Checklist (both pre-existing; the second is already an owner option).

## Iteration 4 — the critic's ranked improvements (sent to the lane)
Fixed from iteration 3: the full-screen day celebration (ZIGi ≈ 180 / 215 px in front of the trophy), Nebula told from
Dark, Light's ribbons, the one-row phone bar with timer chips, the wave, alternating names and the NEXT tag, the long name
wrapping, the computer's timer tiles and twelve weeks, Today's card (no badge, mini planets). Partly: the cheer, the comet's
tail, chests on a computer, Nebula's clouds on a phone. Regressions: ZIGi at rest over a name (computer) or the chest
(phone) in the reduced-motion stills, which were clean in iteration 3; Light's twelve-weeks map now open and dark.
1. ZIGi at rest in a free place, ≥ 12 px clear of every name, chest, ring and banner, after a tick, an orbit and under
   reduced motion, at 390, 768 and 1440 — asserted in the spec on what is drawn (the frames contradict today's check).
2. A cheer that reads as joy with the existing art: hold the open-hand wave frame (never the hand at the forehead), two
   hops of 16–24 px, squash and stretch, a star burst behind; or the arms-up art as an owner item.
3. Reduced motion: the pointing or greeting still, never the hands-on-head figure.
4. Light's twelve-weeks map: a light panel with pale "nothing" cells and the same accent colours.
5. Comet: a 16–20 px head with a 60–80 px tail, visible on a phone in at least 3 frames.
6. Chests on a computer 64 px.
7. Nebula on a phone: visible magenta and teal clouds and star layers in the path column.
8. Phone spacing: about 8 px more between the NEXT ring and the following planet.
9. Phone toast: one line, ≤ 44 px.
10. Names ≥ 12 px from rings.
11. Background planets never half-cut at the screen edge.
12. Today's card: dimmed filled mini planets instead of hollow rings, larger at 1440.

## Iteration 5 — the critic's ranked improvements (sent to the lane)
Fixed from iteration 4: ZIGi clear in every resting frame at every size and in reduced motion, the pointing still under
reduced motion, Light's twelve weeks, 65 px chests on a computer, Nebula's clouds on a phone, the NEXT spacing, a one-line
42 px toast, Today's card. Partly: the comet's tail (≈ 35–45 px), the background planet's ring at 1440. Not fixed: the
held hand-at-brow frame; names ≈ 7–10 px from the NEXT ring's dashes. Regressions: the tick reflow; a softer, jagged ZIGi
on the celebration; on a computer ZIGi rests ≈ 115 px tall, wedged between names, and jumps across the path.
1. Name sides and chest positions fixed through a tick: ZIGi's place chosen without moving content (or any change eased
   over ≥ 300 ms); f02 and f03 differ only at the ticked planet.
2. Crisp ZIGi art on the celebration and the cheer, from a source at least 2× the drawn size (checked against iteration
   4's celebration-p).
3. Cheer: keep the hops, squash and burst, never hold the hand-at-brow frame; land on the pointing or idle frame; on the
   day celebration a frame with the hand away from the face. The arms-up art stays an owner item.
4. On a computer ZIGi rests at ≥ 160 px on the open side of the wave near NEXT (where it cheers from), with at least one
   glide frame instead of a jump.
5. ZIGi points at NEXT, not at the planet just ticked.
6. Names ≥ 12 px from the NEXT ring's dashes.
7. The comet's tail 60–80 px.
8. The 1440 background planet's ring inside the screen.
9. Today's card at 1440: the NEXT name on one line.

## Iteration 6 — the critic's ranked improvements (sent to the lane)
Fixed from iteration 5: nothing but the ticked planet moves on a tick; crisp ZIGi art (the 480 × 632 posters, never
upscaled); the cheer lands on the presenting pose (hand away from the face: pride, "ta-da"); names ≥ 12 px from rings; the
comet's tail (60–100 px); the background planet inside the screen; Today's card on one line. Partly: ZIGi's size and glide
on a computer (≈ 135 px visible at rest), pointing at NEXT (not on the computer's opening screen or after an orbit).
Regressions: the phone ZIGi at rest ≈ 67–82 px; "Meditate & breathwork 15 minutes" cut on a phone; glide frames over names
and the Evening banner title.
1. On a computer ZIGi points at NEXT on the opening screen and after an orbit — the level spot even at ≈ 140 px: pointing
   at the right planet matters more than the 160 px target.
2. On a phone ZIGi rests at ≥ 96 px, not squeezed at the screen edge; chest sides set when the path opens so every planet
   has a spot for ZIGi; nothing moves on a tick.
3. "Meditate & breathwork 15 minutes" whole on two lines on a phone (iteration 5's label column).
4. Every glide frame clear of names and banner titles: the ticked planet's name returns only after ZIGi has moved ≥ 12 px
   away; the orbit glide routed around the banner (or ZIGi faded or shrunk on long glides).
5. The comet on one smooth arc to the next planet (it hooks out toward ZIGi; its tail crossed the Evening orbit title).
6. The last tick's cheer off the trophy planet.
7. Owner item: arms-up cheer art.

## Iteration 7 — every line passes; the polish round asked for before the merge
Fixed from iteration 6: on a computer ZIGi points through NEXT on the opening screen and after an orbit (≈ 140–145 px);
on a phone it rests at 98–120 px, 18 px from the edge; the long name whole on two lines; moves shrink away and grow at the
new spot, the ticked name returning only after ZIGi leaves; one round comet arc behind the banners; the last tick's cheer
beside the trophy on a phone. Regressions: on the computer's last-tick frame (≈ 333 ms before the celebration) ZIGi stands
mirrored, pointing at nothing, and "Play piano 15 minutes" has no name; phone chests on the line under their planets read
crowded (a lid over a planet's base, a chest ≈ 7 px above a banner).
The lead sends these to the lane as one polish round, then a fresh critic confirms before the merge ("do it right once"):
1. Computer last tick: ZIGi's arm toward the path, beside the trophy (or the planet just ticked), pointing at it.
2. Every planet name visible on the last-tick frame.
3. Phone chests ≥ 8 px from their planet's base and ≥ 12 px from the banner below (or offset along the line).
4. Computer opening: ZIGi 10–20 px toward NEXT so it reads with NEXT, not with the name below.
5. The comet ≥ 12 px clear of names.
Owner item: arms-up cheer art.

## Iteration 8 — the polish round and the owner's confirming pass
The owner (20 Oct): after this polish round and one confirming critic pass, merge — no further iterations unless the
confirming critic finds a regression. The confirming critic: every line passes; polish points 1–3 and 5 (computer) fixed,
4 partly (ZIGi 9 px closer). Regressions against iteration 7, sent as one narrow fix round, checked by the lead on the named
frames before the merge: (1) the phone tick's comet (rec-tick-p f05–f07) a ≈ 45 px stub bowing toward ZIGi and hooking
onto NEXT's ring, where iteration 7 drew one round ≈ 70–90 px arc away from ZIGi; (2) the computer cheer's hop peak
(rec-tick-d f07) touching the descenders of "Take all supplements", and a sparkle on the name (tick-d f06, tick-p f05);
(3) on a phone, "Play piano 15 minutes" cut by the foot bar on the opening screen and "Read 5 pages" clipped at the toast
(whole in iteration 7). Nits left as they are: phone chests smaller (the cost of point 3), the tablet's opening at 6
planets, ZIGi on the computer's opening still close to the name below; the arms-up cheer art (owner item).

