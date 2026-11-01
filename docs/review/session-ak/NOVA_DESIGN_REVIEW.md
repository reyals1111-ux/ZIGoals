# NOVA design review (Session AK, owner follow-up 4, P3)

Reviewer: a fresh design-critic agent that built none of NOVA. Head `50b71ba2` (branch `feature/session-ak-number-one`),
production build at `http://127.0.0.1:3101`, Chromium through Playwright, `/api/**` answered 503, local model servers
(Ollama :11434, LM Studio :1234) mocked with `page.route`. Read 1 November 2026.

Compared against: the owner's two "hermes" screenshots (layout reference only: centred orb in rings, clock top centre,
"Your day" + search top left, round quick-access buttons top right, one large command field at the foot, view and routing
menus in the bottom-left corner, chat as one large glass panel), docs/research/session-ak/NOVA.md §1.2 and §1.5 (presence,
"it knows my day", one command bar, live glanceable widgets, visible state), docs/research/session-ak/MOTION_2026.md §2.6,
§2.7, §3, §4 (Full / Calm / Off, glass rules), and the protected baseline in docs/STATUS.md (nothing below touches the
phone bottom bar, the Checklist pattern or Earn's Start-here path outside NOVA's own scope).

Covered: `/app/nova` at 1440 × 900 and 1920 × 1080 (and 390 × 844) in Nebula, Light and Dark; Full, Calm and device reduced
motion; a fresh start and the Showcase; with no brain and with a mocked local brain; the opening sequence (also slowed to
0.2× through the DevTools Animation domain); the orb in Standby, Listening, Thinking and Speaking; left panel open, as a
rail and hidden; the right panel ("Behind the intelligence"); View controls; the four layouts; the conversation;
`/app/nova/setup` and `/app/nova/hermes` with a planet open. Screenshots (35) are in the session scratchpad, folder `p3/shots`.

Note on the sky: the sandbox has 4 logical cores, which `lowEnd()` (lib/nova/orb-starfield.ts) treats as low end, so the
first pass saw only the CSS sky. The second pass overrode `hardwareConcurrency`/`deviceMemory` to 8 to judge the canvas
sky; both are reviewed (ND-17).

---

## Verdict

**Not yet "wow" on a computer, but the parts are there.** The orb, the canvas starfield and nebula band, the glass, the
clock and the planet guides are of real quality, and the phone view (390 px) and the Minimal layout already come close to
the owner's reference: a calm star in the middle of the sky, the clock above it, one command field below it. The default
desktop view is a different picture. In Orbit at 1440 × 900 and 1920 × 1080, the star is pushed to the bottom of a
scrolling stage. Its state and greeting, and in a fresh start the "Build NOVA's brain" card, sit below the fold. At 1440 in
the Showcase the star is entirely off-screen. Six to eight glass cards stretch to 255–678 px with a line or two inside, and
the top bar and the foot wrap and squeeze. The page reads as a dashboard of empty boxes with a star buried at the bottom,
not as a star system that knows your day.

Four structural fixes would carry most of the "wow": a viewport-fit stage with the star at its optical centre (ND-1),
content-sized widgets (ND-2), a greeting built from the person's own day (ND-3), and a one-row top bar with a full-width
command field (ND-4, ND-5). The remaining findings are correctness bugs that show on screen: a stylesheet collision that
breaks View controls, chip status dots that never take colour, and command blocks that cut the command off. The rest is
polish that brings the right panel, the conversation and the guides up to the standard of the orb.

Counts: **9 Major, 11 Minor, 6 Polish** (26 findings).

Implementation rules for the polish lane (from the brief): no pointer tracking; motion plays once; Calm = opacity only
(no movement, no loops); reduced motion and Motion Off = nothing moves; theme parity (NOVA stays a night island in Light);
every target ≥ 44 px; WCAG 2.2 AA; each fix with a spec (layout audit at 1024/1440/1920 + 390, theme parity, motion
levels) where it applies.

---

## Major

### ND-1 · Major · The star is buried: the Orbit stage pushes the orb, its state, the greeting and the setup card below the fold
- **Where:** `/app/nova`, Orbit (the default), 1440 × 900 and 1920 × 1080, every theme and motion level; fresh start and
  Showcase. Worst at 1440 in the Showcase: no part of the orb is on screen, only the letters "N·O·V·A" at the bottom edge.
- **What is wrong:** measured at 1440 × 900 (fresh start), the orb button is at y 574–804, "Standby · Tap to talk" at
  y 810–853, the greeting at y 865 and the setup card at y 965. The stage area ends at ≈ y 795 (the foot starts at 803),
  so the state, the greeting and the "Build NOVA's brain" card are all off-screen, and the bottom of the orb's dial is cut
  by the stage area's own edge (the clipped ring is visible in the orb-state screenshots). In the Showcase the orb starts
  at y 765 (1440) and y 775 (1920). The opening's ignition (the "system online" moment) also happens low and off-centre
  (x 858, y 690 of 900), and the typed greeting plays out of sight.
- **Why it matters:** the owner's reference and NOVA.md takeaway 1 both lead with presence: a centred star with its state
  in words. Here the first screen leads with empty cards. A new person also never sees the "Build NOVA's brain" card, the
  one path to a real assistant.
- **Root cause:** `.nova-orbit-centre` spans every orbit row (`grid-row: 1 / span var(--rows)`). The rows are
  `minmax(80px, auto)` (components/nova/nova.css, "Layouts"), so the stage's own ≈ 660 px of content plus the widget
  columns build a 1278–1633 px grid inside the scrolling `.nova-stage-area`. The star is then centred in that grid, not
  in the window.
- **Fix:**
  1. Make the stage viewport-fit on desktop: `.nova-stage-area { overflow: hidden; display: grid; }` with
     `.nova-orbit { height: 100%; grid-template-rows: repeat(var(--rows), minmax(0, 1fr)); }`, so the orbit grid is
     exactly the available height and the centre column's middle is the window's optical middle (the clock above, the
     command field below).
  2. In `lib/nova/layout.ts`, derive `SIDE_ROWS` from the available height (pass `rowsFit = floor((stageH + gap) /
     (rowH + gap))` from widget-grid.tsx through a `ResizeObserver` on `.nova-stage-area`, not from a constant 8). Widgets
     that do not fit beside the star go to a "More on your orbit" disclosure or the outer band. The band moves under the
     fold, never the star.
  3. Lay the stage out as a fixed stack: name → orb → state line → greeting → day line (ND-3), at most ≈ 420 px tall.
     Move the setup card out of the stage column (see ND-23): a slim one-line banner under the chips, or the first widget
     slot while no brain is connected.
  4. Size the orb by available height as well as width: `.nova-orb-button .nova-orb { width: clamp(160px, min(22cqi,
     30cqb), 260px); }`, with `container-type: size` on the stage area.
  5. Spec: at 1440 × 900 and 1920 × 1080 (Orbit, fresh start and Showcase), the orb's box, the state line and the greeting
     are fully inside the viewport and above `.nova-foot`. The orb's centre is within ±8 % of the stage area's vertical
     middle.

### ND-2 · Major · The widgets stretch into tall, empty glass slabs
- **Where:** `/app/nova`, Orbit and Bento, 1440 and 1920, all themes.
- **What is wrong:** the widgets take the height of the rows the centre column inflates (ND-1): "Day at a glance"
  339 × 389 px with two bullets (fresh) and 375 × 678 px as L (Showcase); "Today's orbit" 255–289 px tall, with a 2/5 ring
  and then 150 px of nothing above "Open the Checklist →". In Bento the M tiles take the hero's 2-row height. Read
  together with the orbit lean (ND-16), the stage looks like a wall of empty boxes.
- **Why it matters:** NOVA.md takeaway 6 asks for glanceable widgets. The empty space reads as broken loading, and it
  steals the space the star needs.
- **Fix:** in components/nova/nova.css set `.nova-orbit > .nova-widget, .nova-bento > .nova-widget { align-self: start; }`
  and give each size a height range instead of a row span: S `min-height: 112px; max-height: 160px`, M `max-height:
  220px`, L `max-height: 320px`, with `overflow: hidden` and a soft bottom fade when the content is cut. Move each widget's
  "Open … →" link into the header row (right-aligned, keeping its ≥ 44 px hit area through padding), so the card ends where
  its content ends. An empty widget becomes one line plus its planet art at S height. For the fresh start, keep
  `DEFAULT_WIDGETS` (lib/nova/store.ts) but show the empty teaching state compact. Spec: no widget's empty interior is
  taller than 96 px at 1440 and 1920.

### ND-3 · Major · The greeting knows the time, not the person's day
- **Where:** `/app/nova`, every width; `greetingFor()` in lib/nova/orb.ts.
- **What is wrong:** the only line under the orb is "Good morning. NOVA is online." (or "Good morning, Rey…"). Nothing on
  the stage says what the day holds; that information sits in four different cards.
- **Why it matters:** NOVA.md §1.2 item 2 and takeaway 1 ("a first line built from the person's own data, never a blank
  prompt") set the bar the most admired setups reach. This is the single cheapest "it knows me" moment.
- **Fix:** add a `dayLine(counts)` in lib/nova/orb.ts, composed on the device from `useNovaCounts()`. It holds at most
  three facts, joined with " · ", in this order: the next item ("Meditate next"), habits left ("3 habits left"), water to
  go ("0.8 L of water to go"), and the next bill only when it is due within 3 days. Known values only, never a guessed
  zero. With nothing at all: "Your day is open. Start with one habit." Render it under the greeting as
  `.nova-dayline` (17 px, `--nova-ink-2`, one line, ellipsis). It is not typed: it fades in at the end of the opening, and
  under Calm/Off it is simply there. It is read once by assistive technology (inside the greeting's `<p>`, or as its own
  `<p>` with no live region). Unit test for the composition (unknown values never become 0; the order; three facts at
  most), and a spec that the line shows Showcase facts.

### ND-4 · Major · The top bar wraps onto two or three rows, and the chips wrap under it
- **Where:** `/app/nova`, 1440 (two rows; three with the right panel open) and 1920 (two rows); with a brain connected
  and the right panel open, the status chips also wrap ("Test my setup" alone on a second row).
- **What is wrong:** `.nova-top-left` has `flex-wrap: wrap`, so Customize and Mini window fall onto a second row under
  "Exit NOVA" (1440, 1920), and with the right panel open "Your day" also drops, giving three rows. The 4 × 3 quick grid
  plus the right-panel toggle beside its first row leave a ragged top-right corner. Together they take 160–230 px of
  height before the stage starts (the reference uses ≈ 90).
- **Why it matters:** this is the cluttered, cheap-looking part of the first screen, and it is the height ND-1 needs.
- **Fix (components/nova/nova-top.tsx, nova.css "Top bar"):**
  1. One row, `flex-wrap: nowrap`, with priority order Exit · Your day · Search · Workflows. Customize and Mini window
     move into the quick-access grid (Customize is already its last tile; drop the duplicate settings button and add Mini
     window as a tile when `pipOk`).
  2. Under 1600 px centre width, Search and Workflows show icon-only (they already have names and tooltips). Over 1800 px
     they keep their labels.
  3. Quick access: make it one tidy block. Either a 6 × 2 grid of 44 px planets with the right-panel toggle as the 12th
     cell, or the reference's single row when the centre is ≥ 1400 px wide. The panel toggle must align to the grid, not
     hang beside it.
  4. Chips: show at most three chips plus "Test my setup" folded into the Brain chip's link target. When the row would
     wrap, collapse Privacy and Memory into one "Privacy · Memory" chip (container query on `.nova-centre`).
  5. Spec: `.nova-top` height ≤ 120 px at 1024, 1440 and 1920, with the right panel open and closed.

### ND-5 · Major · The command field: a box inside a box, squeezed by its own menus
- **Where:** `/app/nova` foot, every width (inner box); with a brain connected (routing menu shown) and the right panel
  open at 1440, the field shrinks to ≈ 370 px of input.
- **What is wrong:**
  1. The input draws its own dark #070c20 field with a border inside the glass bar. The generic field rule
     `.nova-root :is(input:not([type=checkbox])…, select, textarea):not(#\-)` (specificity 1-4-1) beats
     `.nova-root .nova-command input:not(#\-)` (1-2-1), so the "transparent, borderless" rule never applies. The same
     happens to the conversation's textarea (ND-7) and to the phone's field.
  2. The foot row is `auto | minmax(0, 760px) | auto`. With "View · Orbit" and "Automatic · best fit" beside it and the
     right panel open, the placeholder clips ("What's on your mind, Rey‽") and the hint wraps onto three lines.
  3. "⌘K" shows on Linux and Windows (see ND-21).
- **Why it matters:** NOVA.md takeaway 4: the one command bar is the main control. In the reference it is a single, calm
  glass field.
- **Fix:**
  1. Wrap the generic field rule's selector in `:where(…)` (keep the `:not(#\-)` guard outside it only where Light's
     sheet needs beating), or raise the command rule to `.nova-root .nova-command input:not(#\-):not(#\-)`. Then
     `background: transparent; border: 0; min-height: 44px; padding: 0`. Do the same for `.nova-composer textarea`.
  2. Take the two menus out of the field's row, as in the reference: "View controls" pinned bottom-left of `.nova-centre`
     and the routing menu bottom-right, both `position: absolute` within the foot. The field is centred with
     `width: min(760px, 100% - 2 × 220px)` and `min-width: min(520px, 100%)`. Below 1100 px centre width, the two menus
     become 44 px icon buttons on either side of the field.
  3. Shorten the hint to one line, "Enter to ask · nothing is sent before you press it", at 13 px, and hide it below
     560 px field width. Spec: the field's input is ≥ 480 px wide at 1440 with both panels open and a brain connected, and
     its computed background is transparent.

### ND-6 · Major · `setup.css` class names collide with the dashboard's, and break View controls once the right panel has opened
- **Where:** `/app/nova`, any width, after "Behind the intelligence" has been opened once in the session. The panel's
  Technical details render `HermesCard`, which imports components/nova/setup/setup.css.
- **What is wrong:** setup.css defines `.nova-check { display: grid; padding-top: 8px; border-top: 1px solid … }`,
  `.nova-send { display: grid; gap: 8px }` and `.nova-setup-card`, and the dashboard uses the same names for other
  things: View controls' checkbox labels (`.nova-check`), the command field's send button (`.nova-send`, also re-used by
  chat/nova-chat.css) and the stage card. Seen on screen: in View controls each checkbox sits above its label, with a
  stray rule line under it, and the size selects step down in a ragged column. `.nova-tool` is also defined twice (right
  panel rows in nova.css, tool cards in chat/nova-chat.css). Which rule wins depends on chunk load order. M7 already had
  to patch `.nova-setup-card` for this reason.
- **Fix:** namespace the guide sheet. In setup.css (and the step components) rename `.nova-check` → `.nova-guide-check`,
  `.nova-send*` → `.nova-guide-send*`, `.nova-setup-card` → `.nova-guide-card`. In chat, rename `.nova-send`/`.nova-tool`
  → `.nova-chat-send`/`.nova-chat-tool`. Add a unit test that scans components/nova/**/*.css and fails when one class
  selector is defined with conflicting declarations in two NOVA sheets, plus a spec that opens the right panel and then
  View controls and checks each `.nova-check` is `display: flex` with no border.

### ND-7 · Major · The conversation panel: widgets chopped above it, a triple-framed composer, a busy header
- **Where:** `/app/nova` with the conversation open, 1440 (also 1920), all themes.
- **What is wrong:**
  1. The chat takes the foot. The stage above it keeps the top ≈ 80 px of the first two widgets at 55 % opacity, cut by a
     hard horizontal edge ("Today's orbit" and "Next three" sliced in half). It looks like a rendering fault.
  2. Composer: the textarea has its own bordered field (the ND-5 specificity bug) inside `.nova-composer`'s border, which
     gets a cyan focus ring on top: three frames. The mic and Send are stacked vertically on the right, and Send is a
     small gradient pill that does not line up with the textarea.
  3. The header has three text buttons ("New chat", "Conversations", "Save as Markdown") plus ×. "What NOVA can see" is
     a `<summary>` 32 px tall (< 44 px), outdented 20 px from "Ask ZIGi about a page" above it.
  4. An on-device answer says so three times: "On-device answers · no AI used" in the bubble, "Answered on your device ·
     no AI used" under it, and "Answered on this device." in the footer.
- **Why it matters:** the brief calls the chat "the heart". The reference's chat is one large calm glass panel with the
  stage hidden behind it.
- **Fix:**
  1. While `data-chat` is set on desktop, hide the widgets: `.nova-frame[data-chat] .nova-stage-area .nova-widget {
     visibility: hidden; }`, faded out over 150 ms in Full and Calm, instant under Off and reduced motion. Keep only the
     orb, shrunk into the chat header as its avatar (the `NovaFigure`). Let `.nova-talk` take `height: 100%` of the
     centre below the chips.
  2. Composer (chat/nova-chat.css, nova-composer.tsx): one frame. The textarea is transparent and borderless (ND-5 fix),
     `.nova-composer:focus-within` keeps the single 3 px focus ring, and the actions sit in one row at the bottom right
     (mic 44 px, Send 44 px round with the arrow icon, as on the command field), with the hint row on the left of the same
     line.
  3. Header: keep "New chat" and ×. Make "Conversations" an icon + label button and move "Save as Markdown" into a "⋯"
     menu.
  4. Make the "What NOVA can see" summary `min-height: 44px; display: flex; align-items: center`, aligned with the link
     above it.
  5. Say "no AI used" once: keep the small meta line under the bubble, drop the duplicate in the bubble's text and the
     footer status.
  6. Spec: with the chat open, no `.nova-widget` is visible, and the composer contains exactly one element with a
     visible border.

### ND-8 · Major · Guide planets open in a narrow column: commands are cut mid-token, and the choices wrap unevenly
- **Where:** `/app/nova/setup` and `/app/nova/hermes`, 1440 (and 1920), all themes; any planet with commands (Hermes 4
  "Turn on its API server", NOVA 3 "Your brain, local first").
- **What is wrong:** the planet's panel renders beside the path at ≈ 420 px wide, with ≈ 350 px of empty space to its
  left. Each command `<pre>` is 260 px wide with `white-space: pre`, so the reader sees "hermes config set API_SERVER_"
  and must scroll a box that shows no scroll cue to read the command they are about to paste. The "brain" choice buttons
  wrap as 1 + 2 + 1 with different widths, and the recommended one carries a pink→cyan gradient that matches neither
  NOVA's violet→cyan primary nor the planet's colour. "Make a key here" sits under the OS tabs and reads as a fourth tab.
  The `.env` alternative is prose with inline variable names, not code.
- **Why it matters:** NOVA.md §1.3: setup pain is the first complaint about personal agents, and the answer is "one
  copyable block per OS" that a person can actually read and check.
- **Fix:**
  1. On desktop (≥ 1024 px), render the open planet's guide as a wide panel: either below the planet across the full path
     width (`max-width: 760px`), or in NOVA's right sheet (`NovaSheet place="right" wide`) with the path kept visible.
     The phone flow stays as it is.
  2. In setup.css set `.nova-cmd pre { white-space: pre-wrap; overflow-wrap: anywhere; }` so commands wrap and never cut
     (copying stays exact), or keep `pre` with a right-edge fade mask and a visible scrollbar.
  3. Show the choices as an equal-width 2 × 2 grid of option cards (title + one line: "Free, private · needs a computer"),
     with the recommended one marked by a "Recommended" tag and the planet colour, not a separate gradient.
  4. Move "Make a key here" next to step 1's command as a secondary action.
  5. Render the `.env` lines as their own command block (`shell=".env"`).
  6. Spec: on Hermes step 4 at 1440, every `pre` has `scrollWidth <= clientWidth`.

### ND-9 · Major · Focus looks the same as Minimal (its three widgets sit off-screen)
- **Where:** `/app/nova`, View controls → Focus, 1440 and 1920.
- **What is wrong:** Focus renders the star, then the setup card, then `.nova-focus-row` with the first three widgets,
  all below the fold. On the first screen, Focus and Minimal are the same picture, and the menu's promise "Focus shows
  your first three" is not visible.
- **Fix:** with ND-1's fixed stage stack, Focus becomes a two-row viewport-fit grid: the star stack (state, greeting, day
  line) at ≈ 60 % of the height, then the three widgets in one row at S height (max 160 px) directly above the command
  field. Bento: keep the hero tile, but cap the hero's content (the setup card must not overflow the tile, see ND-20).
  Spec: in Focus at 1440 × 900, exactly three `.nova-widget` elements are fully inside the viewport; in Minimal, none.

---

## Minor

### ND-10 · Minor · Calm still moves: the side panels slide in, and the Calm opening has no fade
- **Where:** `/app/nova`, Motion = Calm, any width; seen at 300 ms after load (the left panel is mid-slide, ≈ 9 px left of
  rest, half transparent) and again on every panel show or hide.
- **What is wrong:** `.nova-left`/`.nova-right` always run `nova-panel-left/right` (translateX 18 px). Only Motion Off and
  reduced motion silence them. MOTION_2026 §4 defines Calm as "opacity fades ≤ 150 ms, no movement" and the Calm opening
  as "finished dashboard + 300 ms fade". In Calm the dashboard appears with no fade at all, while the panel moves.
- **Fix (nova.css "Motion"):** add `:root[data-app-motion=calm] .nova-left, :root[data-app-motion=calm] .nova-right {
  animation: nova-fade .15s ease-out both; }` with `@keyframes nova-fade { from { opacity: 0; } }`, and
  `:root[data-app-motion=calm] .nova-frame[data-opening=done] .nova-centre { animation: nova-fade .3s ease-out both; }`
  on first mount only. Extend the motion-levels spec: under Calm, `getAnimations()` on `.nova-left` returns only
  opacity keyframes.

### ND-11 · Minor · The opening sequence: low ignition, a last widget that snaps, and a dashboard re-rendered 30 times a second
- **Where:** `/app/nova` first visit, Full motion, 1440/1920.
- **What is wrong:**
  1. The star ignites low and right of centre (it follows the buried stage, ND-1).
  2. `settleDelay()` (lib/nova/orb.ts) gives the last widget a delay of 1680 ms, and with the 520 ms settle it would end
     at 2200 ms. But `OPENING.end` is 2100 ms, when `data-opening` flips to `done` and removes the animation, so the last
     widget jumps the final 100 ms.
  3. `useOpening` (components/nova/use-opening.ts) sets state every 32 ms for 2.1 s, re-rendering the whole dashboard
     about 65 times during the sequence just to type the greeting (P8 measures this).
- **Fix:** after ND-1, the ignition is centred by construction. Set `OPENING.end = OPENING.widgets + room + 520` or clamp
  `room` so that `lastDelay + 520 ≤ end`. Move the typing into a small `<TypedGreeting>` component that owns its own
  `requestAnimationFrame` loop (or a CSS `steps()` reveal on a `ch`-width mask), so the dashboard renders once at the
  start and once at the end. Unit test for `settleDelay(count−1, count) + 520 ≤ OPENING.end`.

### ND-12 · Minor · The status chips' dots never take their colour, and the chips read as run-on words
- **Where:** `/app/nova` status chips, every width and theme.
- **What is wrong:** StatusChips (components/nova/status-chips.tsx) puts `data-kind` on the chip `<a>`, but nova.css
  colours `.nova-chip-dot[data-kind=…]`, an attribute the dot does not carry. Every chip dot is the neutral grey: a local
  brain, Strict privacy and memory on all look the same. Also, the "Brain" key and its value have the same weight and
  colour, so the chip reads "Brain On-device answers".
- **Fix:** change the selectors to `.nova-chip[data-kind=local] .nova-chip-dot` etc. (or pass `data-kind` to the dot),
  colour the key `--nova-ink-3` at 600 weight, and add a middle dot: "Brain · On-device answers". Spec: with a local brain
  the Brain chip's dot computes to the teal token.

### ND-13 · Minor · "Behind the intelligence" is honest but thin and wordy: no telemetry at a glance
- **Where:** right panel, `/app/nova` 1440/1920, fresh start and with a mocked local brain.
- **What is wrong:** 01 Brains shows one sentence and a button until "Technical details" is opened. Its `<summary>` has
  `display: flex`, which removes the disclosure triangle in Chromium, so it looks like plain bold text rather than a
  control. Opened, each offline server is a two-line sentence repeated per port ("llama.cpp: nothing answered at
  http://127.0.0.1:9931 (not running, or not allowing this site yet)" twice). "Microphone off" is a pill that wraps onto
  two lines inside the sentence. Section 02 has a full-width gradient "Talk to NOVA" that competes with the orb as the
  page's primary action. The reference's panel feels alive because the machine is summarised in tiles.
- **Fix (components/nova/nova-right.tsx, nova.css "Right panel"):**
  1. Under NOVA's brain line, always show a compact fact strip of four 2 × 2 tiles: Cores, Memory, Battery, Connection,
     from `deviceFacts`. Unknown is shown as "unknown", never invented. This keeps R2-3's rule that the server rows wait
     behind the disclosure.
  2. Group offline servers into one line: "Not running: llama.cpp (9931, 8080)", with the reason in a tooltip/detail.
  3. Restore the marker: `.nova-tech > summary { display: list-item; }`, or add an explicit chevron icon that rotates
     (instant under Calm/Off).
  4. Make "Microphone off" a status row (dot + text), not an inline pill.
  5. Make "Talk to NOVA" a secondary `.nova-btn`, since the orb is the primary talk control.

### ND-14 · Minor · Left panel: its foot falls off-screen, the brand wraps, and zero counts add noise
- **Where:** left panel, 1440 × 900 (open and rail); fresh start.
- **What is wrong:**
  1. At 900 px tall the Agents list and the foot (NOVA signature + brain status, the reference's "gateway status" line)
     are below the panel's fold (`.nova-signature` at y 1017).
  2. "NOVA / PRIVATE / INTELLIGENCE" breaks onto three lines.
  3. In a fresh start every row shows a "0" count pill (Goals, Habits, Notes, Tasks, Focus), five grey zeros that say
     nothing.
  4. As a rail, the last agent is cut off.
- **Fix:** split `.nova-left` into a fixed head, a scrolling `.nova-left-nav` (`flex: 1; min-height: 0; overflow-y:
  auto`) and a fixed foot, so the signature and brain status always show. Shorten the brand subtitle to one line
  ("Private intelligence", `letter-spacing: .08em`, 12 px). Hide the count pill when the value is 0 (keep it in the
  accessible name). Spec: at 1440 × 900 `.nova-left-foot` is fully visible.

### ND-15 · Minor · View controls reads as a form dump
- **Where:** View controls menu, every width.
- **What is wrong:** each widget row is checkbox + label + a full-width `<select>`. Labels wrap ("Today's / orbit",
  "Day at a / glance"), the selects start at four different x positions, and the menu needs scrolling to reach "Arrange
  on the orbits". (The checkbox-above-label stacking is ND-6.)
- **Fix:** use a two-column grid per row, `grid-template-columns: minmax(0, 1fr) auto`, with the label column first. Swap
  the select for a compact S/M/L segmented control (three 44 × 44 buttons, `aria-pressed`, the same component as the
  arrange bar's `.nova-sizes`). Keep the layout segment at the top as one row of four, and the "Arrange" button sticky at
  the menu's foot.

### ND-16 · Minor · The orbit's lean makes ragged edges; the rings hide behind cards; moons float in empty space
- **Where:** `/app/nova` Orbit, 1440/1920; phone 390.
- **What is wrong:** the lean (`--lean-x` translate) shifts whole cards, so each column's outer edges step by up to 22 px
  (x 499 / 521 / 515), which reads as sloppy rather than orbital. The rings are mostly hidden behind cards, so the "star
  system" is invisible. A cyan moon sits alone mid-stage (x 699, y 446 at 1440), and on the phone a stray moon dot sits
  next to "Exit NOVA".
- **Fix:** keep each column's outer edge aligned and express the lean on the inner edge only (`margin-inline-start:
  var(--lean)` on left-column cards and `margin-inline-end` on right ones, reducing width rather than translating). Draw
  one ring that passes through the gap between the star and the columns (its radius computed from the grid, after ND-1).
  Place the moons on the ring with `offset-path`-free static coordinates on visible arcs. Hide `.nova-ring-moon` under
  560 px.

### ND-17 · Minor · On low-end devices the sky is five CSS stars
- **Where:** `/app/nova`, devices with ≤ 4 cores or ≤ 4 GB, Save-Data, or a low battery (`skyMode` → `'none'`,
  lib/nova/orb-starfield.ts).
- **What is wrong:** `'none'` leaves only `.nova-sky`'s CSS (a diagonal band and five hand-placed 1 px stars), so the
  backdrop is almost empty compared with the canvas sky, which looks very good (judged with 8 cores emulated). Many
  ordinary laptops report 4 cores.
- **Fix:** treat low end like reduced motion: draw one still canvas frame (`'still'`: one paint, zero ongoing cost)
  instead of nothing. Or ship a static 1600 × 1000 SVG star tile (≈ 150 stars, < 4 KB, inline data URI) as `.nova-sky`'s
  base layer for every mode. Keep `'none'` only for Save-Data if the bytes matter.

### ND-18 · Minor · The orb's four states look nearly alike as still frames
- **Where:** the orb, `/app/nova`, every motion level; most visible in Calm, Off and reduced motion, where MOTION_2026 §4
  says state is "shown by colour/ring only".
- **What is wrong:** as stills, Listening (a faint ripple ring), Thinking (the arc moved) and Speaking (5 % larger) are
  hard to tell apart; only the words under the orb carry the state.
- **Fix (components/nova/orb.css):** give each state a colour identity on top of its motion. Listening: dial and ripples
  in `--orb-b` (cyan), halo +20 %. Thinking: the arc in `--nova-c` (magenta) with a short comet tail (a second, fainter
  dash). Speaking: halo at full strength and three concentric soft rings at fixed scales 1.15 / 1.3 / 1.45 in the still
  frame. Colour the state word under the orb to match (contrast ≥ 4.5:1 on the night island). Standby stays as it is. No
  flashing (2.3.1).

### ND-19 · Minor · The guides leave NOVA's night island for the ordinary app page
- **Where:** `/app/nova/setup`, `/app/nova/hermes`, 1440, Light (and every theme).
- **What is wrong:** "Start the guide" from NOVA's full-window night lands on the standard app page: sidebar, Public
  alpha banner, wallet header, and the large ZIGoals planet footer. In Light it is a light page. The jump breaks the
  feeling of being "inside" NOVA, and "Back to NOVA" is a small secondary button at the far right.
- **Fix:** keep the app shell (these are pages with Help and the sidebar entry under the existing rules), but give both
  routes a NOVA header band: a slim night strip with the small NOVA orb, the planet progress ("3 of 10 lit") and a
  primary "Back to NOVA" on the left. Use `.nova-root` night tokens for that strip only, so Light keeps its page and gains
  a dark island, as the brief allows. Make "Back to NOVA" ≥ 44 px and the first focusable element after the skip link.

### ND-20 · Minor · Bento: the hero tile's setup card overflows the tile
- **Where:** `/app/nova` Bento, 1440, fresh start and Showcase.
- **What is wrong:** the hero tile (`grid-row: span 2`) holds the whole stage, and the setup card spills past its rounded
  bottom edge and the stage area. The M tiles beside it stretch to the hero's height (ND-2).
- **Fix:** after ND-1/ND-23 the card leaves the stage. Also give `.nova-bento-hero` `overflow: hidden;
  align-content: center` with the stage stack capped, and `.nova-bento { grid-auto-rows: minmax(120px, max-content); }`
  so the tiles size to their content.

---

## Polish

### ND-21 · Polish · Platform shortcut labels
`⌘K` (command field, components/nova/nova-command.tsx) and the conversation hints show Mac keys on every platform. Use
the existing platform test (as the ⌘/Ctrl + J bar does) to show "Ctrl K" off Apple platforms, in `.nova-kbd` and in
`aria-keyshortcuts` ("Control+K").

### ND-22 · Polish · Phone (390 px) details
The minimal phone view is the closest to the reference: keep it. Fix the inner input box (ND-5), keep 16 px between the
date and "N·O·V·A" (now ≈ 12 px; the Showcase pill pushes the stack up), remove the stray moon dot by "Exit NOVA"
(ND-16), and trim the setup card to two lines (ND-23).

### ND-23 · Polish · The stage's setup card says too much
"NOVA is your command center for everything; ZIGi is the same assistant inside each page. It answers simple questions on
this device already; a model of your own makes it a full assistant." (four lines). Make it one line plus the action:
title "Give NOVA a brain of its own", line "It already answers simple questions on this device.", buttons "Start the
guide" / "Not now". Move the NOVA-vs-ZIGi explanation into the guide's first planet ("Meet NOVA"), where it already
fits.

### ND-24 · Polish · Icon semantics in the guides and dock
"First conversation" (NOVA guide) and "First run" (Hermes guide) use a music note. Use a speech-bubble icon (the dock's
ZIGi-chat glyph family). Make both finales ("NOVA online", "Hermes linked") a small `NovaOrb` (still, size 56) instead of
the generic star, so the path ends on NOVA itself.

### ND-25 · Polish · Light theme: the guide's section banners end in a hard fade
In Light, the path's section banners ("Private by design", "A brain of your own") are dark pills whose right end fades
into the light card in a visible smear. Scope a Light rule to `.nova-guide-path` only (Earn's Start-here path, a
protected look, stays as it is). Either end the pill with a rounded edge, or give it Light's own surface
(`#ffffffcc` with the dark text token) inside `.nova-guide-path`.

### ND-26 · Polish · Small type and spacing consistency
The conversation hint row is 12 px (`.nova-composer-hint`). Use 13 px, the floor NOVA uses elsewhere. Widget titles
(13 px, .12em caps) and the left panel's section headings (12 px, .14em caps) should share one eyebrow token (13 px,
.12em). The 4 × 3 quick grid's 6 px gap against the toolbar's 8 px gap: use 8 px for both.

---

## What already works (keep it)
- The orb's craft (dial ticks, inner arc, glint, accent-aware gradients), its forced-colours fallback, and the
  orb-only loop in Full.
- The canvas starfield and diagonal nebula band, paused when hidden, still under Calm/Off/reduced motion. It matches the
  reference's mood without copying it.
- The clock's light 46 px tabular figures with the small "Local time" eyebrow: the closest element to the reference.
- Theme parity: NOVA is the same night island in Nebula, Light and Dark (Dark goes a touch deeper), with no contrast
  regressions found.
- Reduced motion and Motion Off: no running animations at all on the page (measured with `document.getAnimations()`).
  Under Calm the only exception is ND-10.
- The phone's minimal NOVA and the Minimal layout: the composition the desktop default should grow out of.
- The planet guides' path itself (shared orbit look, progress, checks) and the Showcase labelling ("Showcase · fictional
  example data").
