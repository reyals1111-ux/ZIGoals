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

