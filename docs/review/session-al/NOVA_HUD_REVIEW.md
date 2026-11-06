# NOVA holographic HUD ("Holo"): design critic review

Reviewer: a fresh design-critic agent that built none of it. Build: production `cfbdc591` on `127.0.0.1:3103/app/nova`.
Brief: AL_SCOPE §B (owner's words and reference image), O5 (motion), §F (standing decisions).

**Method.** Playwright with Chrome, under the shared browser lock. The Showcase was loaded through Settings → Load Showcase Demo. Conditions covered:
- widths 1440×900 and 1920×1080;
- themes Nebula, Light and Dark;
- motion Full, Calm, Off and `reducedMotion: 'reduce'`, plus a background tab;
- a fresh empty profile at 1440 and at 1920 with the Command preset;
- Classic through Make it yours, the presets, keyboard arrangement, focus and the quick actions.

16 screenshots (not committed). Contrast was measured, not estimated: each text box's colour was compared with the brightest 10 % of the pixels behind it, sampled with all text hidden. `/api/**` was answered offline (503), so the market quotes were unavailable; that affects M6. Hardware concurrency was set to 8 except in the first run, where the sandbox's 4 cores gave a still sky (see m3).

---

## 1. Verdict

**Not yet. It does not stun in the state a person first sees, and it is not yet worthy of the brief, although the parts to get there are mostly built.**

- **At 1920, it has the right ingredients.** Each pillar has its own neon: pink Health, cyan Habits, violet Goals, gold Wealth. The panels have glass, rims, corner brackets, a grid texture, a ruler, a slow shimmer, a ring stack around the orb, a framed amber wave, a pink/violet histogram with cyan tips, dials and a lens ring. Motion is disciplined and does exactly what O5 says in every mode. Light keeps NOVA as a dark island. There is no pointer tracking.
- **The best evidence is accidental.** In *Arrange* mode the panels lose their height caps, and the Health and Wealth instruments render in full: the histogram with its day letters, the purpose-flow ribbons, the whole allocation legend. Shown like that, they look like a real command HUD (screenshot 13).
- **In the default views it looks unfinished.** The instruments are drawn larger than AK's card height caps (S 112 / M 236 / L 360 px), so the soft fade-out cuts:
  - the Goals pace line and its projection band (never visible at M);
  - half of the Wealth panel;
  - the bottom of the histogram, which makes the bars look shorter than they are;
  - the Habits dial's label.
- **Text is truncated mid-word.** Examples: "131 g /", "Emergency func", "rst home depos".
- **The centrepiece has collisions.** "N·O·V·A" and "STANDBY · TAP TO TALK" sit on the neon arcs, at 1.25–1.4:1.
- **At 1440×900 with the Showcase, there is no HUD panel in the window at all.** This holds even after choosing the Command preset. The core's readout is hidden under the command field.
- **A first-time profile never sees an instrument.** Its default widgets are AK's text cards in neon frames.

**Does it feel like a command HUD?** At 1920, in parts, yes. At 1440 and on a fresh profile, no: it reads as a dashboard with a neon skin, led by a greeting and a clock rather than by data.

**Counts: 2 Blocker · 11 Major · 16 Minor · 8 Polish.**

---

## 2. Findings

Ranked by severity. Each finding gives the element, the condition, what is wrong, why it matters and a concrete fix.

### Blocker

**B1. The instruments are cut off by the card height caps, and the cut misrepresents data.**
- **Condition:** every width, theme and motion mode; both the Showcase and the presets.
- **Measured** (body content height / visible body height, in px):

  | Panel | Content | Visible |
  |---|---|---|
  | Health HUD L | 384 | 300 |
  | Wealth HUD L | 496–598 | 300 |
  | Goals HUD M | 354–357 | 176 |
  | Habits HUD M | 206 | 176 |
  | Agenda clock M | 204 | 176 |
  | Tasks M | 546–596 | 176 |
  | Water S | 82 | 52 |
  | Notes S | 74 | 52 |

- **What is wrong:**
  - The `data-cut` mask (`nova.css:272`) fades the bottom 28 px.
  - At M, the Goals pace line, its labelled projection band and its "Estimate" tag are **never visible**, although the brief requires them.
  - At L, Wealth's purpose flow and most of its mix legend are hidden, and the mix dial is cut in half.
  - Health's histogram loses its lower part and its day letters, so the bars look 15–25 % tall when they are ~85–100 % of the target. **A chart that is cropped this way states false proportions.**
  - Text under the fade fails contrast: day letters 2.4–3.5:1, "Japan adventure" 2.2:1, "No water logged yet today" 1.9:1.
- **Why it matters:** this fails "truth" and "no decorative element may look like data". It also hides the very instruments the brief names. Screenshot 13 (Arrange, uncapped) shows the instruments do work when they are given their height.
- **Fix:**
  1. Give Holo instruments their own height table instead of AK's. For example: `.nova-widget[data-holo][data-widget$="-hud"][data-size=M] { --cap: 320px } … [data-size=L] { --cap: 560px }`, Agenda clock M 260 px, Tasks M 300 px.
  2. Never apply the `data-cut` mask to a panel that contains an SVG chart: `.nova-widget[data-holo]:has(svg:not(.nova-icon))[data-cut] .nova-widget-body { mask-image: none }`.
  3. Make each instrument fit its size by **dropping whole rows** (a container query on `.nova-widget-inner`, e.g. `@container (max-height: 230px) { .holo-pace-box { display: none } }`, with a "Pace →" link in its place) rather than fading through a chart.
  4. Add a spec: at each size, `scrollHeight <= clientHeight` for every HUD widget.

**B2. At 1440×900 (Showcase), no HUD panel is above the fold, even after the Command preset, and the core's readout is under the command field.**
- **Condition:** 1440×900, every theme. Screenshots 01, 15.
- **What is wrong:**
  - The Showcase record opens the right "Behind the intelligence" panel (`panelsOf` hides it by default; the Showcase sets `right: 'open'`). That leaves the centre about 800 px wide, so the orbit columns cannot fit beside the star and every panel drops to the band at y ≥ 883.
  - Above the star, the status chips, the 86 px setup banner and the "Read paused at 25 min" chip take about 300 px.
  - The core readout (`.holo-core-readout`) renders behind the command field.
- **Why it matters:** 1440 is a primary width in the brief. The owner's first look is a lone orb and an empty sky.
- **Fix:**
  1. In Holo below 1680 px wide, auto-hide the right panel (or have the Showcase not seed `panels.right`).
  2. In Holo, fold the setup banner into a status chip ("Build NOVA's brain →").
  3. Merge "Read paused…" into the chips row.
  4. At ≤ 1500 px, scale the stage: orb 220 → 160 px, `.holo-core` inset from −26 % to −20 %.
  5. Give `.nova-stage-below` `padding-bottom: calc(var(--foot-h) + 12px)` so the readout clears the command field.
  6. Add a spec: at 1440×900, Showcase plus Command, at least four `.nova-widget` are fully inside the window and `.holo-core-readout` does not overlap `.nova-foot`.

### Major

**M1. Numbers and names are truncated inside panels.**
- **Condition:** 1920 orbit columns (365 px); 1440 band.
- **What is wrong:**
  - Health meters lose their targets: "131 g /", "65 g / 7", "7 h 17 ı", "8,800 /".
  - Goals arc names are clipped on **both** edges ("Emergency func", "rst home depos", "Iapan adventure"), because `.holo-arc-name` centres with flex and then clips.
  - On the Agenda clock, "10:30 AM" wraps in its 64 px time column, "4 OF 10 DONE TODAY · 3 ANY TIME" wraps onto 3 lines, and "Example · Book the de" is cut.
- **Fix:**
  - `.holo-meter`: when the panel is narrow (`@container (max-width: 400px)`), move `targetText` into the note line ("of 120 g") and use `grid-template-columns: minmax(52px,auto) minmax(40px,1fr) max-content`.
  - `.holo-arc-name { display:block; text-align:center; justify-content:normal; overflow:hidden; text-overflow:ellipsis; }`, or two lines with `-webkit-line-clamp:2; white-space:normal`.
  - `.holo-next li { grid-template-columns: 76px minmax(0,1fr) } .holo-next-time { white-space:nowrap }`.
  - Shorten the Agenda label to "4/10 done · 3 any time" in sentence case at 13 px.

**M2. "Large" is not large.**
- **Condition:** orbit layout, both widths. Screenshot 14.
- **What is wrong:** an L panel in an orbit column has the same width as an M panel (365 px) and is only taller. The reference's one large, tilted hero glass panel never happens, and the Health HUD preset puts its hero into the narrowest slot.
- **Fix:** let L widen its column. For example, `.nova-orbit-side:has(> [data-size=L]) { width: clamp(380px, 27vw, 540px) }` with the star shrinking to fit, or put the first L widget in a full-width hero band under the star. Keep the 5° tilt only on that hero.

**M3. The core's labels collide with its rings.**
- **Condition:** every theme, both widths, Holo only (Classic is clean). Screenshot 05.
- **What is wrong:** "N·O·V·A" sits on the cyan and violet arcs (contrast 1.41:1). "STANDBY" and "TAP TO TALK" lie across the arc ends (1.25 and 1.27:1).
- **Fix:** with `data-holo-core`, move `.nova-stage-above` up by the core's extra radius: `.nova-stage[data-holo-core] .nova-stage-above { transform: translateY(-34px) }` and the same downward for `.nova-orb-state`. Alternatively, start the arcs at 12 o'clock with a 40° gap under the name (`arcPath(…, 20, 20 + s*320)`). Either way, back the labels with `text-shadow: 0 0 6px #050818, 0 0 2px #050818`.

**M4. The core does not explain itself, and an unknown ring looks like an ornament.**
- **Condition:** every condition; worst on an empty profile. Screenshots 05, 16.
- **What is wrong:**
  - The four rings carry no labels. Their legend is a 2×2 grid far below the orb, hidden at 1440, and its reading order does not match the rings' outer-to-inner order.
  - The **known** tracks are segmented (dash 72/28) and the **unknown** tracks are dashed (2/5), so data and "unknown" share one visual language.
  - With four unknowns, the core becomes a rainbow of dashes, louder than the orb.
- **Fix:**
  - Unknown: one hairline, `stroke-width:.6; stroke-dasharray:none; opacity:.35`, with a small "—" at the ring's 12 o'clock.
  - Known tracks: solid and dim.
  - Put a 10 px pillar glyph at each arc's start (outside the ring).
  - Make the readout the reference's "stacked neon bar meters": a vertical stack ordered outer → inner, beside the orb or directly under the state line, with 6 px segmented bars (not 3 px).

**M5. "Nothing logged" shows as 0 for water but as "—" for everything else.**
- **Condition:** Showcase (Water S, the Health HUD water row) and the empty profile.
- **What is wrong:** with no water entry today, Water shows a hero "**0 mL**". In the same panel, kcal, protein, sleep and steps show "—" with "No … logged today" for the same state, and the core says "Water —".
- **Why it matters:** "Unknown is not zero" (§F) is applied inconsistently inside one panel.
- **Fix:** water with no entry today → `—` plus "No water logged yet today". Show "0 mL" only after an entry (including one undone back to zero). If the Health page's own Water card shows 0 mL, change both together (one source of truth).

**M6. The Wealth wave contradicts the headline.**
- **Condition:** Showcase, every width. Screenshots 02, 13.
- **What is wrong:** the frame reads "Latest · Nov 5" with "$537,406.10" beside it, while the headline says "$501,800.00 · known so far". The line comes from recorded valuation snapshots; the headline is the live total, which here lacks quotes (offline).
- **Why it matters:** the two "latest" figures sit side by side without a word, which fails the one-source-of-truth rule for anyone reading quickly.
- **Fix:**
  - Rename the frame "Recorded valuations".
  - Label the top-right figure "highest" (it is the maximum, not the latest).
  - Put the last point's value at the line's end.
  - When the headline is incomplete or differs from the last point, add a hollow dashed point labelled "Now (known so far) $501,800" at today's x.

**M7. The colour language collides.**
- **Condition:** every condition. Screenshot 06.
- **What is wrong:**
  - "Day" panels (orbit, next, agenda clock, notes, briefs, now playing) use `--nova-b` #63e7ff, which is indistinguishable from Habits #2ef2ff. Focus panels are also Habits cyan.
  - The Tasks "Overdue" attention state is amber, which is Wealth's colour.
  - The accent choices recolour the day panels into pillar hues (Solar gold reads as Wealth, Aurora magenta as Health).
- **Why it matters:** colour is the HUD's primary way of showing which pillar a panel belongs to.
- **Fix:** give the day panels a fixed accent-independent "ice": `.nova-widget[data-pillar=orbit] { --neon:#a9b8ff; --neon-2:#d6deff; --neon-ink:#e8edff }`. Attention uses `#ff6b5a` plus a "!" glyph.

**M8. A fresh profile never meets the HUD.**
- **Condition:** empty profile, 1440. Screenshot 07.
- **What is wrong:** `DEFAULT_WIDGETS` is still AK's set (orbit, glance, next, water, sleep, goal-pace, money, now-playing). None of the five HUD instruments appears until a preset is chosen, so a new person sees neon-framed sentences. The empty instruments (screenshot 16) are a planet plus a sentence, with no instrument shape.
- **Fix:**
  - New NOVA records start from `HUD_PRESET_PLAN.command` (existing records untouched).
  - Empty states draw the instrument skeleton (a dim track ring with "—", dashed segment rows, an empty frame) with the reason and the action. They must stay clearly unlit, never a zero.

**M9. Focus rings are clipped, and they blend into cyan panels.**
- **Condition:** keyboard, every width. Screenshot 11.
- **What is wrong:** `.nova-widget-body { overflow:hidden }` cuts the 3 px, 3 px-offset ring on links at the panel's edges (the Goals name's ring loses its left and bottom). The cyan `--nova-focus` (#63e7ff) on a cyan Habits or day panel is barely distinct from the rim.
- **Fix:** `.nova-widget[data-holo] .nova-widget-body { overflow: clip; overflow-clip-margin: 6px; padding-inline: 4px; margin-inline: -4px }`. Use a two-tone focus ring in Holo: `outline: 2px solid #fff; box-shadow: 0 0 0 5px #050818, 0 0 0 7px var(--neon)`.

**M10. Hierarchy puts chrome and greeting over data.**
- **Condition:** both widths, every theme.
- **What is wrong:** the largest elements are the clock (≈48 px) and the greeting (28 px, wrapping to two lines at 1920). The HUD's hero figures are 19–30 px, and the orb stage sits under three rows of chrome. A command HUD leads with its numbers.
- **Fix:**
  - Greeting: `clamp(17px, 1.3vw, 22px)`, one line, ellipsis.
  - L-panel hero figures (kcal, tracked wealth): 36–40 px, weight 700, `font-feature-settings:"tnum"`.
  - Ring numerals: 22 px.
  - Move the status chips into the top bar.

**M11. On narrow S panels, the header link overlaps the body.**
- **Condition:** empty profile at 1440, right column (320 px); Sleep balance. Screenshot 07.
- **What is wrong:** "Open Sleep →" wraps and draws over "No nights logged yet…".
- **Fix:** `.nova-widget[data-holo][data-size=S] .nova-widget-head { flex-wrap: nowrap } h3 { min-width:0; overflow:hidden; text-overflow:ellipsis }`. At S, make the link an arrow-only 44 px target with `aria-label="Open Sleep"`. Add a no-overlap spec (elementFromPoint) for S panels at 1440.

### Minor

- **m1. The shimmer never pauses off-screen.**
  - **Condition:** Full; 17 of 17 sheens kept running while about 9 panels were off-screen.
  - **What is wrong:** `.nova-frame[data-hud-motion=full]:not([data-phone]) .holo-sheen::before` (specificity 0,4,1) re-sets `animation-play-state: running` over `.nova-widget[data-off] .holo-sheen::before` (0,3,1). The rings do pause (4 of 6).
  - **Fix:** `.nova-frame[data-hud-motion] .nova-widget[data-off] .holo-sheen::before { animation-play-state: paused }`.
- **m2. The sky loop restarts in a hidden tab.**
  - **Condition:** Full, tab hidden. The sky drew 23 frames in 1.5 s after `visibilitychange`.
  - **What is wrong:** hiding the tab flips `motes`, the Starfield effect re-runs and calls `requestAnimationFrame(loop)` without checking visibility.
  - **Fix:** `if (mode === 'running' && document.visibilityState !== 'hidden') frame = requestAnimationFrame(loop)`. Real browsers throttle rAF in hidden tabs, so the cost is small, but the logic should match O5.
- **m3. The particles are mostly absent.**
  - **What is wrong:** the motes ride the sky canvas, which is still on devices with ≤ 4 cores or ≤ 4 GB (many ordinary laptops). Even when they run, motes of 0.6–2 px at ≤ .55 alpha were not visible in any screenshot.
  - **Fix:** decouple the motes from `lowEnd` (allow them at 4 cores unless memory ≤ 4 GB). Draw a pre-rendered 6 px soft sprite at r 1–2.4 px with alpha up to .8. Use 24 motes rather than 36.
- **m4. The far grid plane is invisible.**
  - **What is wrong:** `.holo-plane` (opacity .4, bottom 46 %) sits behind the band panels and the command field and was not perceptible in any screenshot.
  - **Fix:** `opacity:.6; height:34%; bottom:7%`, and scope it to `.nova-orbit-centre` so it reads as a floor under the star.
- **m5. The Agenda clock's hour numerals are 8 px, at 1.9–3.2:1.**
  - **Fix:** render them as HTML at 11 px, colour #dfe7f8, outside the tick ring, or drop them in favour of tick lengths with a "00/06/12/18" legend.
- **m6. A 90 % heart looks full.**
  - **What is wrong:** at 26 px, the clipped top 10 % falls in the heart's lobes. Calories at 90 % and Steps at 110 % look the same.
  - **Fix:** show the percentage under each heart ("90 %"), or use a 4-segment heart. Keep the shell at `stroke-width:1.6; stroke:#ff8fd6` with the unfilled part `fill:#ff4fb81f`.
- **m7. The Habits week columns have a hidden scale.** Each column is scaled to the busiest day (6 check-ins), so a full column reads as "all habits done". **Fix:** scale to the habits due that day, and say so in the table caption.
- **m8. The histogram has no headroom or target label.** The tallest bar and the target line touch the top edge. **Fix:** `top = max * 1.12`, and a "2,200" label at the line's right end.
- **m9. Arrange's arrow keys are spatially surprising.**
  - **Condition:** orbit layout.
  - **What is wrong:** ArrowDown and ArrowRight both mean "later", which moved the Health HUD from top-left to top-right. Its status line reads only "Health HUD moved later."
  - **Fix:** announce the position ("now 2 of 17, right column"). Up/Down = earlier/later; Left/Right = swap column.
- **m10. Classic is not calm for the HUD widgets.** The five instruments keep full neon and glows inside Classic's calm glass cards. Their motion is correctly off. **Fix:** in Classic, `--neon: color-mix(in oklab, var(--neon) 55%, #cfd8ef)` and drop the drop-shadows.
- **m11. The quick actions sheet is not a HUD.** It is a generic sheet with neon borders, and the habit rows are ragged (the Walk row breaks into 3 lines). **Fix:** `grid-template-columns: 1fr auto auto` per habit row, and the panel kit (brackets, grid) on `.holo-action`.
- **m12. Ornament density is uniform.** S, M and L panels all carry the same rim, brackets, grid, scanline and glow, so nothing marks the hero. **Fix:** S keeps the rim and brackets only; M adds the grid; L gets the full kit plus the magenta outer glow.
- **m13. The tilt softens text.** `rotateY(±5deg)` re-rasterises the L panels' text, which is visibly softer at 1× DPR. **Fix:** 3.5°, `backface-visibility:hidden`, or tilt a decorative back-plate (`::before`) and keep the text layer flat.
- **m14. The empty Health HUD repeats itself.** "No meals logged today" appears under kcal and again under Protein (and implicitly for carbs and fat). **Fix:** one note under the ring; the rows show "—" only.
- **m15. The Showcase arrangement is not a preset.** It has 17 widgets with three duplicates (Goals HUD + Goal pace, Agenda clock + Next three, Day at a glance). **Fix:** seed the Showcase with the Command preset.
- **m16. Possible contrast failure on the P1 chip.** Tasks "P1" measured 1.5:1 (red on its chip). Verify, and if confirmed use `#ffb4b0` on `#5a1418`.

### Polish

- **p1.** Preset buttons have no layout thumbnail. Add a 64×40 SVG sketch of each arrangement.
- **p2.** The quick-actions bolt floats mid-header. Seat it beside the "Open …" link with an 8 px gap and lower the link's weight to 500, so the title leads.
- **p3.** The lens ring appears on the L dials, the clock and the core, which dilutes it. Keep it on the core only, as the one "lens".
- **p4.** The Showcase wave is almost a straight two-segment line. Seed monthly valuations so the "flowing amber line" flows (data, not drawing).
- **p5.** Today's orbit M is a 96 px ring in a mostly empty panel. Use a 140 px ring with "Next: Water" beside it.
- **p6.** The core readout bars are 3 px. Use 6 px segmented bars to match the panels' meters.
- **p7.** The histogram's cyan tips are 3 px. Use 2 px with `filter: drop-shadow(0 0 4px #5ff2ff)` for crisper bloom.
- **p8.** Make the Wealth frame's corner labels 12 px tabular figures. Prefix the top-right with "max" and the bottom-right with "min".

### Verified working (no finding)

- **Motion (O5).**
  - Full: rings turn at 90 s, shimmer, tickers, sky with motes.
  - Calm: rings only, at 270 s; still sky; no shimmer.
  - Off and `reducedMotion: 'reduce'`: **zero** running animations and zero sky frames.
  - A hidden tab sets `data-hud-motion="paused"`.
  - No pointer tracking. Classic runs no HUD motion.
- **Light theme.** NOVA stays a dark island (frame `rgb(5,8,24)` on a light body). Nebula, Dark and Light render NOVA identically, as the rule intends.
- **Contrast.** Wherever text is not cut or lying on an arc, every HUD figure measured ≥ 4.5:1 on the glass.
- **Keyboard.** Look and preset groups move with the arrow keys and show a pressed state. The arrange grip keeps focus after a move, and the move is announced. The quick-actions button opens the sheet and focus lands on its Close button.
- **Presets.** Each preset applies in one step, with Undo in the app's toast.
- **Accessibility.** Each panel is an `article` with a name and has a screen-reader table (`HoloTable`).

---

## 3. What still feels flat

1. **The panels are stickers on a sky, not one instrument.** There is no single large glass body; seventeen equal cards tile the page. Depth reads only through the 5° tilt on two L panels.
2. **The far grid floor and the particles, the two things that give a HUD its space, are effectively invisible** (m3, m4).
3. **The core is rings around an orb, not a reactor.** Unlabelled arcs, a legend far away and text crossing the arcs make it decorative rather than commanding (M3, M4).
4. **The type is all one weight class.** Letter-spaced uppercase titles, 14 px values and 19 px ring numerals carry no dominant figure per panel; the greeting outranks the data (M10).
5. **The bloom is timid.** Drop-shadows of 3–4 px on 2 px strokes over a dark glass that is 90 % opaque. The reference's luminous glow comes from a brighter core stroke (#fff at 60 % in the centre of the neon) plus a wide, soft halo. Add an inner `#ffffffaa` 0.8 px stroke over each data arc and line.
6. **The empty states are text.** A fresh HUD is sentences with planet icons, not dim instruments waiting for data (M8).
7. **Classic and Holo differ less than they should.** The HUD widgets are neon in both looks (m10).
8. **The quick actions leave the HUD** for a generic form sheet (m11).

---

## 4. AL_SCOPE §B checklist

| §B element | State | Note |
|---|---|---|
| Holo is the default on NOVA; Classic selectable in Make it yours | **Present** | Holo is the default; switching works with arrow keys and a pressed state (m10 on Classic) |
| One large, slightly tilted glass panel (reference) | **Partial** | Many equal panels; 5° tilt on L only; L is not wider than M (M2) |
| Deep indigo-to-violet glass, magenta outer glow, thin bright rim | **Present** | Rim with a white highlight; magenta outer glow on L |
| Stacked neon bar meters (violet, pink, cyan, amber) | **Partial** | Core readout bars are 3 px and hidden at 1440 (B2, M4, p6); segmented meters in Health |
| Thin glowing line chart in a framed box | **Present** | Wealth wave frame (M6 labels); heart-rate spark only with real data (none in the Showcase) |
| Pink/violet histogram, cyan tips, line through it | **Partial** | Built correctly, but cut by the cap at L (B1); no headroom (m8) |
| Wireframe region map | **Missing** | No geographic data; omitting it is right for data honesty, so record it as deliberate in ADR-037 |
| Amber wave over fine grid lines with a row of tick bars | **Present** | In the Wealth frame |
| Concentric segmented rings | **Present** | Core and Habits; unknown vs ornament ambiguity (M4) |
| Radial gauges with a bright arc and a centre number | **Present** | kcal ring, consistency dial, goal arcs |
| Lens ring with a cyan/magenta gradient | **Present** | Overused (p3) |
| Tick rulers and dot sliders down the left edge | **Partial** | A ruler on each panel; dot sliders only on a Goals L with more than three goals (none shown in any condition) |
| HUD corner marks | **Present** | |
| Bloom, crisp thin lines | **Partial** | Bloom is weak (§3.5) |
| Dark glass with backdrop-filter refraction | **Present** | `blur(16px) saturate(1.5)` |
| Floating particles | **Partial** | Off on ≤ 4-core devices; imperceptible when on (m3) |
| Depth layers: far grid plane, mid panels, near glow | **Partial** | Grid plane not perceptible (m4); near glow present |
| Occasional shimmer sweep (O5) | **Present** | Does not pause off-screen (m1) |
| Static perspective on large panels, never pointer-driven | **Present** | Text softening (m13) |
| Health neon pink: kcal ring with ticks | **Present** | |
| Health: segmented bars for kcal, macros, water, sleep, steps vs targets | **Partial** | Targets truncated in narrow panels (M1) |
| Health: hearts that fill by the share of a target | **Partial** | 90 % vs 100 % indistinguishable (m6) |
| Health: heart-rate line only with real data | **Present** | Correctly absent in the Showcase |
| Habits cyan: orbit streak rings, 7-day segmented bars, consistency dial | **Partial** | Dial label cut (B1); hidden column scale (m7) |
| Goals violet: progress arcs with milestone ticks | **Partial** | Names clipped (M1) |
| Goals: pace line with a labelled projection band | **Partial** | Built, but never visible at M; visible only at L (B1) |
| Wealth gold: net-worth line | **Partial** | Contradicts the headline (M6) |
| Wealth: segmented allocation dial | **Partial** | Cut in half at L (B1) |
| Wealth: mini purpose flow | **Partial** | Ribbons at L are hidden by the cap; M shows a flat bar |
| Checklist: today's orbit ring | **Present** | Undersized (p5) |
| Tasks: due/overdue counters and today's queue | **Present** | Queue cut by the cap (B1); amber attention clashes with Wealth (M7) |
| Agenda: 24-hour radial clock with the day's items | **Present** | 8 px numerals (m5); times wrap (M1) |
| Notes: recent captures | **Partial** | The capture row is faded out at S (B1) |
| Central core: four concentric pillar rings summarising today | **Partial** | Collisions and legibility (M3, M4); readout hidden at 1440 (B2) |
| Truth: same stores and rounding as the pages | **Partial** | Water 0 vs "—" (M5); wave vs headline (M6); figures otherwise agree (core, panels, Day at a glance) |
| Unknown shows "—" with a reason | **Partial** | Core and Health rows yes; water no (M5) |
| No decorative element looks like data | **Partial** | Dashed unknown ring vs segmented ornament (M4); a cropped histogram looks like data (B1) |
| Projections labelled | **Present** | "Estimate · projection, not a promise" (when visible) |
| Quick actions writing real records with Undo | **Present** (sheet opens; writes not re-tested here) | |
| HUD ↔ pages live and cross-tab | **Not judged** | Out of a visual review's reach |
| Widget → page morph (View Transitions; Off = plain navigation) | **Present** (code) | Not exercised visually |
| Add, remove, resize, reorder (keyboard accessible) | **Present** | m9 |
| Presets: Command, Health HUD, Wealth HUD, Minimal | **Present** | No thumbnails (p1); Command at 1440 still below the fold (B2) |
| Nebula and Dark in full neon; Light keeps a dark island | **Present** | |
| Text/table equivalent and a name for every widget | **Present** | |
| Numbers ≥ 4.5:1 | **Partial** | Passes except where text is cut (B1), on the core arcs (M3) or in the dial numerals (m5) |
| No meaning by colour alone | **Partial** | Mix keys have shapes (good); core rings rely on colour (M4) |
| Focus visible | **Partial** | Clipped and low distinction (M9) |
| Phones: one column, lighter effects | **Not judged** | Out of this review's widths |
| Performance: SVG + CSS + one canvas; still when off or hidden | **Partial** | Off and reduced motion are perfectly still; m1, m2 |
| Copy: no "Jarvis", no brands | **Present** | None seen |
