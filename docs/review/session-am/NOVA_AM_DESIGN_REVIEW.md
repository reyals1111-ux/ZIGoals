# NOVA (Session AM) — design review

Reviewer: a first-time viewer, 11 Nov 2026. Looked at `/app/nova` on the shared dev server (Chromium, software GL) at
1440×900, 1280×720, 1024×768, 768×1024 and 390×844; Nebula, Light and Dark; Motion Full, Calm, Off and reduced motion; an
empty profile and the Showcase. Measured against the owner's brief, `docs/design/NOVA_AM_ART_DIRECTION.md` and the
`review/session-am-refs` mockups. Captures stay outside the repository. No app code was changed.

Limits of this review: the star was rendered by software GL, so its frame rate and the governor's quality steps are not
judged; speech was not exercised; only English was read. Timings of the "made" moment come from single captures at about
250 ms, 600 ms, 1.2 s and 4.2 s after Enter, not from a frame recording.

## Verdict

It does not meet the brief yet. The frame is there (a standalone window, a star, two bars, a command bar, widgets that
appear on request), but the two promises the owner led with are not kept: the stage does not start calm and nearly
empty (an empty profile shows 19 top-bar controls, two status chips, a set-up band, four empty read-outs, a greeting, six
chips and a three-control command bar around the star, and at 1024×768 half of that is cut off), and NOVA does not
answer (8 of the 15 test requests return only "On the stage: <name>.", one returns "That isn't something I can answer"
beside a widget that answers it, and the rest are raw record strings cut off after four lines). On a phone the command
bar is 867 px wide in a 390 px window, so the microphone and Send are off-screen. The single strongest thing is the
family of made widgets at size M: one frame, one type scale with no text under 14 px, 44 px targets, a source line on
every one, and text contrast that passes everywhere it was sampled. The single weakest thing is the answer line under
the star: it is the "speaking agent" half of the product and today it says less than the widget title.

## Findings

Severity order. "Where" gives viewport · theme · state · selector. Themes are named only where they differ; Light is
identical to Nebula on this screen and Dark only deepens the sky.

### Blocker

**AM-D1 — Phone: the command bar is wider than the screen; microphone and Send cannot be reached.**
Where: 390×844 · all themes · empty and Showcase · `.nova-foot`, `.ns-onetap`, `.nova-command`.
Saw: `.nova-foot` is a grid with an auto column; the one-tap row is `flex-wrap: nowrap` with `flex: none` chips, so the
column resolves to 867 px. `.ns-strip`, `.nova-foot-row` and `.nova-command` are all x 12 → 879 px. The field's right
border is off-screen, `.ns-mic-btn` sits at x 766 and `.nova-send` at x 822. The chips do scroll, but the bar itself
does not. The only way to send is the keyboard's Enter.
Fix: `components/nova/nova.css` line 301: `.nova-foot { grid-template-columns: minmax(0, 1fr); }` and in
`components/nova/stage/stage.css` `.nova-frame[data-phone] .ns-strip { min-width: 0; max-width: 100%; }`. Tried with an
injected style: the bar becomes 366 px, microphone x 265, Send x 321, chips still scroll. Add a width assertion for
`.nova-send` at 390 px.

**AM-D2 — NOVA does not answer; it names the widget.**
Where: all desktop sizes · Showcase · `.ns-answer-text`; `lib/nova/summon/words.ts` line 27.
Saw: "Show my habits this week", "Show my net worth", "What's the weather?", "When is sunset?", "show the time", "What
can you see?", "Which model are you using?" and "What did I ask before?" all return exactly "On the stage: <title>."
A direct question ("Which model are you using?", "When is sunset?") gets no fact in words. The live region says
"Added: Weather. 3 widgets on the stage." with no figure, where the contract (§8) asks for "Weight this month is on
the stage: 81.4 kg, down 1.2 kg since 12 October."
Fix: each widget's data hook already holds the hero figure; have `stageSentence` in `lib/nova/summon/words.ts` take a
one-line summary per widget ("14 °C, partly cloudy; no rain in the next 3 hours.", "4 of 7 habits done today; longest
streak 27 days.", "Sunset 17:00, 10 h of daylight.", "On-device answers; no AI connected.") and use the same string for
the answer line, the conversation turn and the polite announcement.

**AM-D3 — The answer contradicts the widget it sits next to.**
Where: 1440×900 · Showcase · ask "Did I journal this month?" · `.ns-answer` beside `[data-widget=journal]`.
Saw: answer: "That isn't something I can answer from your records here. Without a brain I answer about your habits,
Checklist, tasks, goals, Health (once you share it…". Widget, 20 px to its left: "4 days in a row · 8 entries this
month · Last entry Today".
Fix: when the summoner makes a widget, the summon path must own the answer; never fall through to the general
"can't answer" reply (`components/nova/stage/use-summoner.ts`, `lib/nova/summon/summon.ts`). Add a test: for every
phrase in the catalog, the answer must not match the refusal string.

### Major

**AM-D4 — The stage does not start calm or nearly empty.**
Where: 1440×900 · empty profile · whole frame.
Saw: around the star: 4 square buttons + 15 round icon tiles in two rows (8 + 7) in the top bar, 2 status chips, a
set-up band with 2 buttons, "N·O·V·A", "STANDBY · TAP TO TALK", four read-outs each with a dash and a "No … yet" line
(8 lines of 12–13 px text that say nothing), a two-line greeting, a day line, 6 chips, a command bar with microphone,
"?", a "Ctrl K" key cap and Send, a "View · Orbit" picker, and a left bar with 16 rows. That is about 50 controls on
the resting screen.
Fix: on `data-stage=calm`: hide `.holo-core-readout` while every value is unknown (`components/nova/holo/holo-core.tsx`);
fold the 15 tiles into one "Tools" button that opens a labelled tray (`components/nova/nova-top.tsx`); move the status
chips into the right bar and keep one privacy dot; show the set-up band once, then as a row in the right bar; drop
`.nova-kbd` and the "?" from the bar (keep them in the tray). Target: star, name, state, greeting, chips, bar.

**AM-D5 — 1440 calm stage: the day line is sliced by the chip row and the greeting is squeezed.**
Where: 1440×900 · empty · `.nova-stage-below`, `.nova-greeting`, `.nova-dayline`.
Saw: the centre column is 338 px wide although both side columns are empty, so "Good morning. NOVA is here for simple
questions." wraps to two lines of 18 px, and "Your day is open. Start with one habit." is cut horizontally at y 730 by
the one-tap row (only the top 6 px of the glyphs show). In the Showcase the same line ends "…1,000 mL of water t…".
The set-up band's bottom edge (y 218) touches the "N·O·V·A" label (y 222).
Fix: `components/nova/nova.css` line 220: when no side column has a widget, use one column
(`.nova-frame[data-stage=calm] .nova-orbit-main { grid-template-columns: minmax(0, 1fr); }`) and cap the centre at
640 px; give `.nova-stage` rows `auto auto auto` with the star shrinking first (`min-height: 0` on the star row) so the
text block is never the part that is clipped; 16 px gap under the band.

**AM-D6 — 1024×768: the read-outs, greeting and day line are cut off.**
Where: 1024×768 · all themes · empty and Showcase · `.nova-stage-below`.
Saw: empty profile: the second read-out row is sliced at y 600 (only the top of two icons), and the greeting and day
line are not on screen at all. Showcase: "1,000 mL of 2,000 mL" wraps to two lines, "Emergen… fund" is truncated, the
read-out bars touch the chip row. The top bar plus chips plus band take 215 px, the chips and bar 170 px, leaving
383 px for a 440 px star and five text rows.
Fix: at stage heights under 520 px (`@container nova-stage (max-height: 520px)`): star at 240 px, read-outs hidden,
greeting one line at 17 px; top-bar tiles in one row behind "Tools" (AM-D4).

**AM-D7 — Both bars open at 1440: the made widget lands under the fold.**
Where: 1440×900 · Showcase · left open + right open (`]`) · `.nova-orbit-main`, `.ns-strip`, `.nova-chips`.
Saw: the stage is 815 px wide, falls to the stacked layout, and the widget just made ("Net worth") shows only its
40 px header strip at y 650–690 before the chip row covers it. The chips wrap to two rows (104 px). The Showcase status
chip is cut at the bar's edge ("Showcase · fictional e"). The "Local time" label disappears and the clock sits 24 px
from the first tile.
Fix: opening the right bar while the left is open should fold the left to its rail (one open bar at a time under
1600 px), in `components/nova/nova-dashboard.tsx`; keep the three-column grid down to 760 px of stage width with
`minmax(220px, 1fr) minmax(240px, .8fr) minmax(220px, 1fr)`; `.ns-onetap { flex-wrap: nowrap; overflow-x: auto; }` at
every width, not only on phones; `.nova-chips { flex-wrap: wrap; }`.

**AM-D8 — Tablet does not keep the layout.**
Where: 768×1024 · Showcase · after two asks · `.nova-orbit-main`.
Saw: widgets are one 560 px column under the star and the answer; the newest starts at y 624 and is cut by the two-row
chip strip at y 815 (three habit rows visible). Twelve widgets stack to 4,100 px. The status row is cut at the right
edge ("Showcase · fic"). Chips + bar take 200 px of 1,024.
Fix: at 641–1100 px keep two widget columns of ≥ 300 px beside a 200 px star when the stage is ≥ 700 px wide, or put
the star in a 160 px header strip and give the widgets a two-column grid; chips on one scrolling row.

**AM-D9 — Widgets change sides when another widget is hidden, pinned or made.**
Where: 1440×900 · Showcase · three asks, then More → Hide on Weather, then More → Pin on Net worth.
Saw: before: Weather + Habits left, Net worth right. After hiding Weather: Net worth left, Habits right. After pinning
Net worth: Habits left, Net worth right. Each new request also pushes the previous widget down a slot.
Fix: `lib/nova/layout.ts`: a widget keeps its side and slot until the person moves it; a new widget takes the first
free slot on the emptier side; Hide and Pin never re-flow others.

**AM-D10 — Figures count up again after every re-flow and show wrong amounts.**
Where: 1440×900 · Motion Full · `[data-widget=net-worth]`, `[data-widget=health-hud]`, `[data-widget=habits-hud]`,
`[data-widget=goal-focus]`.
Saw: after pinning, Net worth read "$488,446.16"; 250 ms after an ask it read "$475,549.02"; the true figure is
$501,800.00. Six seconds after load the Health HUD read "0 g", "0 mL", "0" steps beside hearts that already said 90 %,
100 %, 50 %, and the Habits dial read "0 of 30 days". The goal ring read "15 %" beside "$9,000 of $20,000".
Fix: count up once, on the first make only, keyed by widget id in the stage record; never on re-mount or scroll into
view. For money, do not count: fade the final figure in. Cap the count at 420 ms with a timer independent of frame
rate (`components/nova/holo/use-hud-motion.ts`).

**AM-D11 — Pin, Hide and Close are folded away at the default desktop size, and the head's glyphs are unlabelled and move.**
Where: 1440×900 · left bar open · `.nova-widget-head`, `.ns-actions`, `.ns-more`; `components/nova/stage/stage.css`
(`@container holo-panel (min-width: 400px)`).
Saw: side-column widgets are 374 px wide, 26 px under the threshold, so the head shows a bolt, three dots and an arrow.
The three named actions appear only when the left bar is a rail (panel 440 px). The bolt and dots follow the title, so
they sit at x 487/531 on "Weather", x 526/570 on "Habits this week" and x 403 (dots only) on a locked widget; the
arrow is pinned right. Nothing says what the bolt does.
Fix: lower the container rule to 340 px; right-align all actions in one group in the order Pin · Hide · Close · Open;
move "Quick actions" into the body or drop it from made widgets (`components/nova/widget-grid.tsx` line 189).

**AM-D12 — The answer card cuts text mid-sentence and shows record strings.**
Where: all desktop · Showcase · `.ns-answer-text` (`-webkit-line-clamp: 4`).
Saw: "…with Health page data and Include Health there (Includ…"; "…Pace forecast: Not enough history yet. Target
date: Apr 1…"; "4 bill reminders; next due: • Rent · SHOWCASE DATA: 2026-12-01, 950.00 EUR (monthly) • Energy ·
SHOWCASE DATA: 2026-12-02, 120.00 EUR…"; "Japan adventure: 41.66% (2,500 USD of 6,000 USD)". Scroll height is up to
216 px in a 96 px box.
Fix: write the stage sentence separately from the conversation reply: two sentences at most, rounded figures, the
app's own date and money formats, no bullets (see AM-D2). Cut at a sentence end. Remove the clamp once the text is
short.

**AM-D13 — The same question shows different figures in the answer, the widget and the two sizes.**
Where: 1440×900 · Showcase.
Saw: Spending M hero "€570.79 the last 30 days"; Spending L hero "€348.19 spent this month"; the answer "You spent
348.19 EUR this month". Net worth widget "$501,800.00 tracked wealth"; the conversation says "your net worth is … 531,029.00
USD (accounts 36,780.00 USD, holdings 501,800.00 USD, debts 7,551.00 USD)". Net worth L: hero $501,800.00, while the
chart's end label and "Highest recorded" both read "$537,406.10 · Nov 11" (today). Goal ring "42 %", answer "41.66 %".
Fix: one definition per title. If the title is "Net worth" the hero is assets + accounts − debts; otherwise title it
"Tracked holdings". Spending uses one range in every size (the month, as asked). The line's last point must equal the
hero. Round once, in one helper, for both words and widget.

**AM-D14 — The star moves up and down with the length of the answer.**
Where: 1440×900 · `.nova-stage`, `.nova-stage-above`.
Saw: the "N·O·V·A" label sits at y 227 (calm), y 271 (one-line answer) and y 199 (four-line answer); the core moves
by the same 72 px. The agent jumps each time it speaks.
Fix: fix the star's centre in the stage (grid rows `1fr auto` with the answer in a reserved 150 px slot that overlays
the lower orbit ring, or absolute-position `.ns-answer` under the state line).

**AM-D15 — The star shows no state for a typed request, and no beam was seen.**
Where: 1440×900 · Motion Full · `.nova-orb-state`, the star canvas.
Saw: at about 250 ms, 600 ms, 1.2 s and 4.2 s after Enter the state line reads "STANDBY · TAP TO TALK", the spiral is
unchanged, and the widget is already whole with its figure counting. No frame shows thinking, speaking, a beam to the
slot, corner ticks, or a scan line.
Fix: hold "thinking" for at least 300 ms and "speaking" while the answer line is new (2 s or the read-aloud length),
with the state word changing; draw the beam as a 1 px SVG line from the core to the slot for 400 ms in
`components/nova/stage/stage.css`. Record the make at 60 fps on real hardware and attach four frames to the PR.

**AM-D16 — The star is soft, and the planet is easy to miss.**
Where: 1440×900 at DPR 1 and 2 · `.nova-orb-button canvas`; `lib/nova/core/governor.ts` (`starPixels`).
Saw: the canvas backing store measured 330×330 for a 440 CSS px box at both DPR 1 and DPR 2 (0.75× and 0.375× of the
device pixels). Beside 1 px rims and crisp type the spiral reads as an enlarged image. The planet is an 18–30 px body
that shows as a thin crescent in most frames; the orbit trace is a 1 px ring at about 12 % opacity. In the Showcase
the four data rings (pink, cyan, violet, gold arcs) are drawn over the disc and hide the arms. The hit area is
121×185 px in the middle of a 440 px drawing.
Fix: never go under 1× CSS pixels while the window is visible (rest by frame rate, not by resolution); planet radius
≥ 5 % of the disc with a lit limb in every frame; orbit trace at 30 %; put the data rings outside the disc radius or
drop them when the read-outs are hidden; make the whole disc the button (`components/nova/core/star-system.tsx`).
Check on a real GPU before judging further.

**AM-D17 — Opening the conversation hides the star and every widget.**
Where: 1440×900 · `.nova-chat.nova-chat-panel`; 390×844 · the chat sheet.
Saw: desktop: a 1,018×712 px opaque panel covers the stage; the agent becomes a 28 px disc; the reply reads "On the
stage: Habits this week." while the stage is not visible; 400 px of the panel is empty. Phone: two stacked heads
("YOUR CONVERSATION / NOVA / ✕" then "YOUR PRIVATE INTELLIGENCE / NOVA / On-device answers" and three buttons) use
300 of 844 px; about 270 px is left for the conversation; the star is a dimmed 80 px strip.
Fix: desktop: dock the conversation as a 420 px column on the right (it replaces the right bar), star and widgets stay.
Phone: one head (name, state, ✕; "New chat", "Conversations" and "More" inside one menu), star at 96 px above the log.
`components/nova/chat/nova-chat.tsx`, `nova-chat.css`.

**AM-D18 — Keyboard: the widgets are behind the command bar, not after it.**
Where: 1440×900 · Showcase · three widgets.
Saw: Tab from the field goes microphone → shortcuts → Send → out of the page. Reaching the newest widget takes
Shift+Tab eight times (View picker, six chips). There is no "Skip to the newest widget" link (only "Skip to content"
and "Skip to the HUD"). The widget `article` is not a focus stop, so Delete and P have nothing to act on. The focus
ring itself is correct (3 px, `rgb(99,231,255)`).
Fix: after an answer, render a "Go to <widget>" link inside `.ns-answer` and move the command bar before the stage in
DOM order (or `tabindex="-1"` + focus management to the same effect); give each `article.nova-widget`
`tabIndex={0}` with an accessible name and the Delete / P handlers (`components/nova/widget-grid.tsx`).

**AM-D19 — Weather at L is clipped, collides and does not look like the weather.**
Where: 1440×900 · Showcase · `[data-widget=weather][data-size=L]`; `components/nova/widgets/weather.tsx`,
`cards/world-cards.css`.
Saw: body scroll height 547 px in 499 px: the source line is cut off below "UV index". Two precipitation labels
overlap ("0.6 mm0.6 mm" under 15:00 and 17:00). The 23:00 column and "12 km/h" end 7 px from the rim. The five-day
block shows one number per day above an unlabelled capsule, so the low is never stated. "Partly cloudy" is a 60 px
line icon on the standard blue frame: no sky tint, no cloud drift, no drawn condition, which the contract names as the
example of a themed widget.
Fix: 6 hourly columns at L width 402 px (or 8 at ≥ 460 px); precipitation as bars with one label on the peak;
day rows "Wed 9° ▬▬▬ 16°"; drop Humidity/UV into one line; pin `.nc-foot` with `margin-top: auto`; set
`--neon` and a 12 % sky gradient from the condition code on the article.

**AM-D20 — Four made widgets overflow their box.**
Where: 1440×900 · Showcase · size M and S.
Saw (body scroll/clip height): What NOVA can see 320/217 (the fourth row is cut through its border, "Weather" and the
foot are hidden, "Today, agen…" truncated at 99 px); NOVA's brain (S) 174/75 ("Privacy mode · Strict" is cut by the
bottom rim and corner tick); Your requests 242/217; Sun 252/217 (source line hidden).
Fix: NOVA-sees: M shows the count and the "off" parts only, with "+5 on"; NOVA's brain is M by default; Requests M
shows two rows; Sun M drops the daylight row or the arc shrinks to 64 px. Add a test that
`.nova-widget-body.scrollHeight <= clientHeight` for every catalog widget at S, M and L.

**AM-D21 — Size L is size M with empty space for Sun and Time.**
Where: 1440×900 · `[data-widget=sun][data-size=L]`, `[data-widget=time][data-size=L]` (402×553).
Saw: Sun: a 190 px arc, three rows, a two-line foot, then 130 px of empty glass. Time: 100 px empty above the clock
and 100 px below the last row. Locked Steps and Weight at L are 198 px tall beside 553 px neighbours.
Fix: Sun L: arc at full width (340 px) with hour ticks, dawn and dusk, day length against yesterday. Time L: a 24-hour
dial with the agenda marks. Or do not offer L for these two (`lib/nova/widgets/catalog.ts`).

**AM-D22 — Empty profile: four requests give four hollow frames and a dead-end sentence.**
Where: 1440×900 · empty · asks for weather, habits, net worth, Japan.
Saw: four M frames (374×271) each with 60–100 px of content, in three different empty layouts: icon + text + underlined
link top-left (Goal pace); three dashes + text right (Goals HUD); dashed "+" ring + text + bordered button centred (Net
worth, Habits). One ask made two widgets (Goal pace and Goals HUD). The answer: "I could not find a goal called
"Japan". Ask again with one of these names." with no names. Weather, asked first, is pushed under the fold.
Fix: one teaching layout (the `CardNotice` in `components/nova/cards/kit.tsx`), at size S (129 px), one widget per ask;
when the list of names is empty say "You have no goals yet." and offer "Set a goal".

**AM-D23 — One widget on the stage looks unfinished.**
Where: 1440×900 · Showcase · one ask · `.nova-orbit-main`.
Saw: the widget sits alone in the left column at mid-height; the right column is empty; one dotted vertical ruler with
ticks runs the full stage height at x 683 with no partner on the right and reads as a stray line.
Fix: draw the rulers in pairs or not at all until both columns hold a widget; place the first widget on the right
(the reading direction ends there) and let the answer card align to its top edge.

**AM-D24 — Text under 14 px.**
Where: see the table below. 36 distinct selectors, 11.5–13 px.
Saw: none in the widgets made this session; all in the older HUD widgets that the Showcase pins by default, the four
read-outs under the star, and the chrome (brand tag, clock label, key cap, command hint, state hint, right-bar
eyebrows, conversation labels).
Fix: raise each to 14 px (`components/nova/holo/holo-parts.css` lines 169–172 and the `.holo-*` `small` rules;
`nova.css` for `.nova-clock-label`, `.nova-kbd`, `.nova-command-text small`, `.nova-orb-state-hint`,
`.nova-left-brand small`; `chat/nova-chat.css` for `.nova-turn-who`, `.nova-chat-eyebrow`, `.nova-chat-foot`). Add the
measurement to the browser suite.

**AM-D25 — Requests: future times, wrong order, low density.**
Where: 1440×900 · Showcase · right bar · `.nb-asks`; `components/nova/stage/right-stage.tsx`.
Saw: with the clock at 6:02 AM the list reads 8:12, 8:10, 8:06, 8:02 AM (Showcase examples), then the two requests just
made at 6:02 AM in fifth and sixth place. The "Your requests" widget shows the same future times. Each row is 110 px
(quote, time, a 44 px "Show again" button, a "Forget" link), so five fit.
Fix: stamp Showcase examples relative to now (−2 h, −1 day); sort by time descending; a row is one 56 px line (quote,
time, a replay icon button; "Forget" under a row menu).

**AM-D26 — Phone is not a standalone chat agent.**
Where: 390×844 · Showcase and empty.
Saw: the app's five-tab bar (Today, Goals, Habits, Health, Wealth) stays under NOVA and takes 64 px; the stage is a
3,489 px scroll of the star, four read-outs, the greeting and every pinned widget; the reply to "Show my habits this
week" is a bullet list of habit definitions ("Walk · Every day, 8,000 steps per day") with no week and no inline chart;
the reply to "Show my net worth" starts "observed Wed, Nov 11, 12:00 AM UTC" and runs 12 lines. Keyboard hints
("Shift + Enter for a new line", "↑ edits your last message") show on a touch device.
Fix: hide the app tab bar on `/app/nova` as on desktop; phone stage = star (160 px), state, last answer, chips,
composer; pinned widgets behind "Your widgets" in the sheet; the same short stage sentence plus the inline figure
(`components/nova/chat/nova-figure.tsx`); hide `.nova-composer-hint` under `(pointer: coarse)`.

### Minor

**AM-D27 — The top bar is 15 unlabelled icon tiles in two ragged rows.**
Where: 1440×900 and 1024×768 · `.nova-top`; `components/nova/nova-top.tsx`.
Saw: 8 tiles on the first row and 7 on the second, right-aligned, with no text and no grouping; they are the largest
block of chrome on the screen and outweigh the clock. At 1280×720 they form one row of 15.
Fix: three labelled groups ("Add", "Open", "Window") behind one "Tools" button, or keep five with labels and move the
rest to the left bar, which already lists the same destinations.

**AM-D28 — The right bar is a plain settings drawer.**
Where: 1440×900 · `.nova-right`.
Saw: flat navy cards with 1 px grey borders and round-cornered buttons: none of the stage's cut corners, rims or realm
colours. Three sections are unnumbered (Requests, On the stage, Your choices) and six are numbered 01–06. "Next bill"
wraps into "Next / bill" with the value on two lines beginning "· €950.00". "Live, on this device" and "Read on this
device" are 13 px.
Fix: reuse the widget frame at low intensity for section heads (corner tick + realm dot); number all nine or none;
facts as two-line rows (label above value) at 320 px width.

**AM-D29 — The pinned mark is a 6 px dot.**
Where: `.nova-widget[data-pinned] .nova-widget-head h3::after`.
Saw: a 6 px glowing dot after the title is the only sign a widget is pinned; every Showcase HUD carries it, so it reads
as a status light. The pin button is inside "More" (AM-D11).
Fix: a 16 px pin glyph in the head's action group, filled when pinned (`PinIcon` in
`components/nova/stage/stage-parts.tsx` already draws both states).

**AM-D30 — The dock looks like one more request, and the answer goes stale.**
Where: 1440×900 · after More → Hide · `.ns-dock`.
Saw: "DOCK · Weather" joins the end of the one-tap row; the chip differs from a request chip only by a dashed border,
and the whole row re-centres 92 px to the left. The answer card still says "On the stage: Weather." after Weather was
hidden.
Fix: dock on its own line at the stage's bottom-left with a tray icon and a count; dismiss or rewrite the answer when
its widget leaves the stage.

**AM-D31 — Goal: two statements that cancel each other, and a weak L chart.**
Where: `[data-widget=goal-focus]` M and L.
Saw: M: "▽ Behind plan" directly above "Not enough history yet". L: the pace chart is one dashed line from a dot at the
bottom-left to a ring at the top-right; "Target" sits above the line's start and "Today" 58 px below its own dot, with
a 60 px empty band. The ring has a loose tick that crosses "reached".
Fix: when history is short show the plan line only and say "Plan: $X by <date>"; label "Today" at its dot and "Target"
at the ring; add the date axis (start, today, target).

**AM-D32 — "SHOWCASE DATA" is repeated inside the data.**
Where: `[data-widget=bills]`, the answer card, the right bar.
Saw: "RENT · SHOWCASE DATA", "Energy · SHOWCASE DATA", "Music · SHOWCASE DATA", "Home insurance · SHOWCASE …"
(truncated) in one widget, while the stage already carries the "Showcase · fictional example data" chip. The weather
foot wraps into two lines with the second starting with a separator: "· no service is asked in the Showcase".
Fix: strip the suffix from names on NOVA (`lib/nova/bridge-showcase.ts` or at render); one foot line: "Showcase
example · not a real reading".

**AM-D33 — The read-outs under the star break in a narrow centre column.**
Where: 1440×900 with L widgets; 1024×768 · `.holo-core-readout`.
Saw: "1,000 mL of 2,000 mL" takes the place of the label "Water" and wraps; "Emerg… fund 45 %"; "Set aside" on two
lines; day line "Water next · 3 habits left · 1,000 mL o…".
Fix: label and value on separate lines, value in a fixed format ("50 %"); hide the read-outs when the centre is under
360 px wide; day line may wrap to two lines.

**AM-D34 — The greeting undersells and its reveal leaves gaps.**
Where: 1440×900 · empty · `.nova-greeting`.
Saw: "Good morning. NOVA is here for simple questions." Six seconds after load the line was still mid-reveal with a
caret and broken spacing ("Go od morning", "here for| simple").
Fix: say what it can do now: "Good morning. Ask about your day, your habits, your money." Reveal by word in ≤ 600 ms, or
fade the whole line.

**AM-D35 — Esc leaves NOVA from the stage with one press.**
Where: 1440×900 · focus on the stage body.
Saw: with no menu open, Escape left `/app/nova` for the app. An always-on screen is one stray key from closing; with a
menu open Escape correctly closes the menu.
Fix: Esc first clears the answer card or the field; leaving needs Esc twice within 1.5 s ("Press Esc again to exit")
or the Exit button.

**AM-D36 — The left rail is 30 unlabelled icons that scroll.**
Where: 1440×900 · left bar folded · `.nova-left` (75 px wide, content 1,554 px in 900 px).
Saw: no group labels, no visible names; the last icon is cut at the window's bottom edge; the foot card is gone.
Fix: rail shows the four pillars, the day group and the agents (12 icons) with tooltips on focus and hover, and a
"More" button that opens the full bar.

### Polish

**AM-D37 — The hero money figure's glow softens its digits.**
Where: `[data-widget=net-worth]`, `[data-widget=spending]`, `[data-widget=budgets]`, `[data-widget=bills]` hero.
Saw: 34 px (M) and 48 px (L) gold figures carry a wide halo; the counters of 0, 8 and 5 fill in at DPR 1.
Fix: text-shadow `0 0 6px` at 45 % only; put the 26 px haze on the frame, not the type.

**AM-D38 — Foot lines are not on one baseline.**
Where: M widgets side by side.
Saw: Budgets' source line ends 37 px above the bottom rim; Spending's and Goal's 14–24 px; Weather's is two lines.
Fix: `.nova-widget-inner { display: flex; flex-direction: column; }` and `margin-top: auto` on the foot, 12 px from
the rim, one line with ellipsis.

**AM-D39 — Journal lattice labels and unlit cells.**
Where: `[data-widget=journal]`.
Saw: rows are labelled with week-start dates ("Nov 1", "Nov 2", "Nov 9"…), which reads as a list of days; the unlit
cells' 1 px borders are near the sky colour.
Fix: label rows "W45…W49" or drop the labels and mark today; unlit border at 28 % ink.

**AM-D40 — The first paint is a line of plain text.**
Where: 1440×900 · first load (dev server, cold compile) · `.nova-frame.nova-waiting`.
Saw: "NOVA is starting…" in 15 px default type at the top-left corner on a flat navy field for several seconds.
Fix: centre the line under `.nova-waiting-star` with the frame's own inline styles so it does not depend on the
stylesheet chunk (`components/nova/nova-page-client.tsx` line 29); confirm on a production build.

## Measured violations

### Text under 14 px (computed `font-size`, visible)

| px | Text (first words) | Selector |
|---|---|---|
| 11.5 | "max" | `[data-widget=wealth-hud] .holo-frame-label > .holo-frame-key` |
| 12 | "Private intelligence" | `.nova-left-brand small` |
| 12 | "Local time" | `.nova-top .nova-clock-label` |
| 12 | "Ctrl K" | `.nova-command kbd.nova-kbd` |
| 12 | "No water logged yet today" | `.holo-core-readout small.holo-core-why` |
| 12 | "of 2,200 kcal" | `[data-widget=health-hud] .holo-ring-centre small` |
| 12 | "On your screen only · not in NOVA's chat" | `[data-widget=health-hud] .holo-tag` |
| 12 | "Calories", "90%" | `[data-widget=health-hud] .holo-hearts small` |
| 12 | "Estimate", "Target" | `[data-widget=goals-hud] .holo-tag-estimate`, `.holo-chart-tag` |
| 12 | "today", "Th", "of 30 days" | `[data-widget=habits-hud] .holo-ring-centre small`, `.holo-week-day small` |
| 12 | "Recorded valuations", "now $501,800.00" | `[data-widget=wealth-hud] .holo-frame-label`, `.holo-wave-tag` |
| 12 | "00" (dial hours) | `[data-widget=agenda-clock] .holo-dial-hour` |
| 12 | "Overdue", "High", "Low", "Next for your goals" | `[data-widget=tasks] .holo-counters dt`, `.task-chip`, `.nova-eyebrow` |
| 12 | "planets lit" | `[data-widget=orbit] .holo-ring-centre small` |
| 12 | "Your private intelligence" | `.nova-chat-head .nova-chat-eyebrow` |
| 12 | "You", "NOVA" | `.nova-turn .nova-turn-who` |
| 12 | "Your conversation stays on this device…" | `.nova-chat-foot` |
| 13 | "Everything stays on this device" | `.nova-left-space small` |
| 13 | "Your life, all four pillars" | `.nova-left-life small` |
| 13 | "Tap to talk" | `.nova-orb-state-hint` |
| 13 | "Water", "Habits" (read-out names) | `.holo-core-readout .holo-core-name` |
| 13 | "Enter to ask NOVA · nothing is sent…" | `.nova-command-text small` |
| 13 | "Wed, Nov 11" (≤ 1024 px wide) | `.nova-clock-date` |
| 13 | "More on your orbit" | `.nova-orbit-band-title` |
| 13 | "Protein", "/ 120 g" | `[data-widget=health-hud] .holo-meter-label`, `.holo-meter-value small` |
| 13 | "Ahead of plan", "+4 more", "At this pace: about…" | `[data-widget=goals-hud] .holo-pace-words`, `.holo-more-link`, `.holo-estimate-words` |
| 13 | "done", "next" | `[data-widget=agenda-clock] .holo-agenda-count`, `.holo-next small` |
| 13 | "9:12 AM" | `[data-widget=notes] .holo-captures small` |
| 13 | "this week" | `[data-widget=focus] .nova-big small` |
| 13 | "Live, on this device" | `.nova-right-head .nova-eyebrow` |
| 13 | "01"…"06" | `.nova-right-section .nova-num` |
| 13 | "Cores", "Memory", "Battery", "Network" | `.nova-fact-tiles dt` |
| 13 | "This device" | `.nova-tech-body .nova-right-sub-title` |
| 13 | "Read on this device" | `.nova-right-foot > span` |
| 13 | "Enter to send" | `.nova-composer-hint span` |

Inputs: the command field is 18 px and the conversation composer 16 px on the phone (pass).

### Targets under 44 px

None found. Every visible button, link, input and summary inside `.nova-root` measured ≥ 44×44 px in the calm stage,
with widgets, with the More menu open, in both bars, the rail and the conversation, at 1440, 1024 and 390 px. Two
notes that are not size violations: on the phone `.ns-mic-btn` and `.nova-send` are 44 and 48 px but off-screen
(AM-D1); the star's button is 121×185 px inside a 440 px drawing (AM-D16).

### Text contrast under 4.5:1

None found. Method: the computed text colour (with opacity) against the 85th-percentile background pixel sampled from
a still capture (Motion Off) behind each text run; 11 states, about 600 runs. Lowest values: "Tap to talk"
5.5:1 (`.nova-orb-state-hint`, 13 px, over the nebula on the phone), read-out figure "45 %" 6.6:1 (`.holo-core-readout
b.holo-num`), priority chip "High" 7.1:1 (`[data-widget=tasks] .task-chip-p1`). Not covered: text over the moving star
in Motion Full, and non-text contrast (unlit journal cells, AM-D39; the orbit trace, AM-D16).

### Clipped or overflowing content

| What | Measured | Selector |
|---|---|---|
| Phone command bar | 867 px wide in 390 px | `.nova-foot`, `.nova-command` |
| Answer text | up to 216 px in a 96 px clamp | `.ns-answer-text` |
| Day line | 352 px in 336 px (1440), 352 in 300 (1024); cut by the chip row when calm | `.nova-dayline` |
| What NOVA can see (M) | 320 / 217 px | `[data-widget=nova-sees] .nova-widget-body` |
| NOVA's brain (S) | 174 / 75 px | `[data-widget=nova-brain] .nova-widget-body` |
| Your requests (M) | 242 / 217 px | `[data-widget=requests] .nova-widget-body` |
| Sun (M) | 252 / 217 px | `[data-widget=sun] .nova-widget-body` |
| Weather (L) | 547 / 499 px | `[data-widget=weather] .nova-widget-body` |
| Part names | 168 px in 99 px ("Today, agenda and tasks") | `.nc-sees-name` |
| Status chips | cut at the right edge at 768 px and at 1440 px with both bars | `.nova-chips` |
| Left rail | 1,554 px in 900 px | `.nova-left` (rail) |
