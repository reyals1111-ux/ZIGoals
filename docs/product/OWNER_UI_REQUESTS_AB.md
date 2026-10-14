# Owner UI requests — Session AB-Design ("The giant UI upgrade: one premium 4-in-1 app")

The owner's request list for Session AB-Design (branch `feature/session-ab-design`, ADR-024), recorded verbatim at plan
approval on 2026-10-13 so the session, the PR and the second merger can be checked against it. Live when the session
opened: Alpha #39 = `main` `6c1052b`. The owner's screenshots (Today, Goals, Habits, Health, Wealth on desktop; Today,
Goals ×2, Habits, Health, Portfolio, Wealth on iPhone; the CoinGecko portfolio and the hub.zigchain.com theme buttons as
references; the Today hero corner; the Alpha/Showcase notices) are the visual brief; they are not committed.

## Honesty and keep-everything rules
Never remove a feature — move it or tuck it behind an expander/menu. Showcase data must never look real (a tiny
"Showcase" chip stays while it is on). Estimates stay labelled. Unknown is not zero. No fake links (X/social links only
if they already exist in the repo or landing; otherwise a config entry switched off for the owner). Placeholder features
say "Soon" and do nothing else. Existing users' saved layouts are never rewritten: new default orders apply to new
devices and the Showcase; a "Reset this page's layout" action may offer the new order. New device-only state lives in one
new loose, versioned key `zigoals:ui-prefs:v1` (listed in `lib/ab-design-keys.ts`), never in a strict synced record.

## PART 1 — Global shell and the "finished product" look (highest priority)
1. Main background (all pages): today it is a stretched, faded, pixelated version of the sidebar's starfield. Make it a crisp, high-resolution nebula/star background in the same dark purple: mostly the solid deep purple/navy at the top and bottom, more fine, sharp stars and faint nebula towards the middle. Same look as the sidebar's quality. Static (no twinkle; one-time motion rule). Use responsive AVIF/WebP at 1x/2x or a procedural CSS/SVG starfield; keep page weight healthy. The UI on top stays the same.
2. The bottom of every page becomes ONE stunning full-width footer banner (left to right, not a card): the existing planet/horizon artwork shown exactly once (today the planet and orbits repeat twice on wide desktops — fix that), the ZIGoals logo, the slogan "Goals, Habits & Health = Wealth", the website link (zigoals.app), X links with their logos (only real handles), Help, Send feedback, the private security contact, and the full Alpha disclaimer line in readable text. Merge Today's "Choose your orbit · Take a small step · Keep it yours" 3-step card INTO this banner as a futuristic animated nebula 3-step progress line built on the slogan: 01 Goals → 02 Habits & Health → 03 = Wealth, each step with its short text and fold-mark icon (lotus/butterfly+heart/bull), the line drawing itself once (still under reduced motion / Motion Off). Remove the old card. It must look like a premium app/website footer, very creative, not like the old card. This is the owner's top request — make it stunning.
3. Background, footer and page bottoms must blend as one: the "My links" card sits directly above the footer by default; the bottom of every page looks clean and finished on 390/1024/1440 and ultra-wide.
4. The sidebar motto "Shape & Fold / Your Own Future" (and the equivalent texts under the Goals/Habits/Health/Wealth fold marks) moves up so it sits centred on the planet, not over the horizon/orbit or the animated star.
5. Theme switch like hub.zigchain.com's bottom-left: three segmented buttons — Light (sun, "Soon"), Customize (monitor/palette, "Soon", future premium), Dark (moon, selected = the current nebula UI) — in our nebula style, placed at the sidebar bottom ABOVE the planet artwork, never overlapping the planet or the motto; on phones inside More/Settings. Only Dark is selectable now (stored in ui-prefs).
6. Music player button: moves above ZIGi's floating button with clear spacing, and gets a small nebula fold arrow pointing RIGHT that tucks it into the right edge (like ZIGi's fold); shown only when the music feature is enabled or in the Showcase.
7. Today hero collapse: a very small nebula up/down arrow in the very top-right corner of Today's hero (like ZIGi's arrow) hides/shows the welcome header and planet; when hidden, Today starts with the person's widgets. Remembered in ui-prefs. The hero itself stays exactly as it is.
8. Remove the warning clutter: the "PRACTICE MONEY · PUBLIC ALPHA" box, the "SHOWCASE DATA" bar, "Showcase · fictional records", "LOCAL SIMULATION · …", "Testnet Alpha · simulated …" lines and similar small green/grey notices on every page. Pages start with their header. Replace them with: (a) one compact first-visit notice with × (all key facts, one line + "More"), dismissal remembered; (b) a tiny "Showcase" chip in the top bar while the Showcase is on (tap → what it is + Exit/Load again, with AB-Cloud's agreed wording for persona #5); (c) the full disclaimer line in the footer; (d) Help keeps the full explanations. Update the pinned public-safety/label tests deliberately and as strictly (the facts must still be shown), and list every changed assertion. Check the Alpha gate and verify-hosted-alpha expectations; tell AB-Cloud via the handoff if the verifier needs updating.
9. Gamify button: a small rocket button next to every page's lock/unlock button; on hover/focus it expands with an animation to show "Gamify". It opens a small menu: "Gamify: on/off" and "Open your Journey →" (the achievements/XP page). Only when Gamify is on: the game cards appear, always at the very bottom of pages (above My links), never in the middle and never in headers; XP widgets can be added to Today. The Settings toggle stays. Streaks stay a normal, motivating habit feature when Gamify is off (no XP). *Owner edit at approval:* when Gamify is on, XP/level widgets can be added to Today through the normal widget picker; off = none shown.
10. Phone tab bar: Today, Goals, Habits, Health, Wealth (Wealth must be a tab — it is a 4-in-1 app); More moves to the top bar (Markets, Staking, Portfolio, Ecosystem, Chess, Activity, Journey, Settings, Help). Keep the + / search / wallet / settings top-bar logic clear. *Decided at approval (D2):* the top bar shows + / Search / More; Settings is the last row of More; the wallet shortcut keeps its icon when that button is enabled.

## PART 2 — Today
11. Default order (new devices + Showcase): hero → focus/widgets → … → "Your week, all in one orbit" → Gamify cards (when on) → My links → footer. "My links" always at the bottom by default; its title in the nebula gradient; the link chips more stunning (nebula-gradient icons, liquid-glass). Every card stays movable with the unlock button.
12. Merge Today's focus tiles with the habits widget (no duplicated due-habits); fix the iPhone habits widget: the timer chip ("25: 00 / 30 min" wrapping), "Complete" overlapping, crowded rows.
13. "See how it works" opens a real short how-to (persona #21), not the brand film (the film stays available).

## PART 3 — Goals (high priority)
14. The summary figures (Active / Finished / With a plan / Life areas) become their own movable block; default order: goal cards first, the summary below.
15. Cards / Vision board / Tree switch moves to the right end of the filter row (where "7 destinations" is now; remove that text). Remove the greyed "Goals | Positions" tabs from that row and move Active/Completed/Closed/All to the left; Positions stays reachable from the Goals ⋯ menu (never removed).
16. Vision board and Tree: major redesign — each must be a stunning page on its own. Vision board = a real mood board: big images, masonry/collage, overlay titles, progress, why-statements, gentle parallax-free hover, a full-screen view, an empty state that explains the purpose ("See the life you're building"). Showcase: a beautiful example board. You cannot download photos: create high-quality illustrated artwork in our nebula style for the Showcase (e.g. an electric sports car without logos, a grand piano, a dream home, a mountain summit, a beach/travel scene, a marathon finish, a home library, a sunrise run) under fixed file names apps/web/public/showcase/vision/vision-01…08.(webp|svg) so the owner can later swap in licensed photos as a pure file replacement; document this. Tree = a clear, beautiful goal tree (sub-goals, progress rings, life-area colours, zoom/fit on phones).
17. Goal card art: the ⋯ menu gets "Change artwork": a picker of the existing drawn scenes plus ~10 new ones in the same style (keep card size/proportions identical); saved through AB-Cloud's setGoalCardArt; the Showcase uses more than three different artworks.
18. Goal cards: everything below the divider (wealth sources, contribution plan, next contribution, existing wealth · active, "includes manual valuation") goes behind a small nebula expand arrow; the card shows title, status, amount, ring and remaining. Fix the iPhone rings (the % text breaks out of the circle) and spacing.

## PART 4 — Habits (the reference page — keep its look; other pages take inspiration from it)
19. Header: remove the greyed "Habit ideas" link if it does nothing; if it opens ideas, move it into "+ New habit" as "Start from an idea". "Vacation" becomes a small button next to the lock button. The header stays clean.
20. Habit cards (high priority): the first view shows name, tags, the main counter, −/+ and Done/Complete and today's progress. Everything else (Set or add a value, Skip today, Edit note & mood, the duration timer and its options, the bell option, explanations, Consistency & trends, Challenge with its grid, History & reflection, Private habit notes, pause/archive/Health links, the "changes begin…" note) moves below behind one tidy expander, in a logical order, with the challenge grid shown under the counter only when expanded. The timer controls are far too big: make Resume / Finish / Discard compact, proportional chips; the bell option a proper switch (today a stray square checkbox); great on phones.

## PART 5 — Health
21. Health gets a header banner like Goals and Habits, built from the "A little care, every day." card (remove that card): the small slogan, then the page actions in the same style as on the other pages — Ask ZIGi, "Back up private data", "Log food or water", "Privacy & backups". Make the Ask-ZIGi/back-up buttons identical across Goals, Habits, Health and Wealth headers.
22. Quick counters: one thin row per exercise on every width (icon, name, −, value, +); remove the per-row ⋯ — manage counters (add/remove/rename/reorder) from one ⋯ in the card's top corner; fixes the two-line rows on phones.
23. The game strip ("Lv 8 · Log your weight") is gone from the page body; game cards only at the bottom when Gamify is on, with a quest that fits the page (never "Log your weight" everywhere).

## PART 6 — Wealth and Portfolio
24. One currency line: totals show only the person's base currency (USD by default; EUR if chosen). Other-currency amounts never convert; when they are non-zero, show a small chip "+ €8,000 held in EUR" (tap for details); when zero, show nothing. Applies to "Allocated to Goals", "Available for Goals" and similar rows. *Owner edit at approval:* the default comes from AB-Cloud's `defaultCurrency()` (euro-area → EUR, else USD) once available; until then USD.
25. The hero headline "Wealth, with every source in view." fits one line on desktop (move the "Known tracked wealth" box slightly down); clean on phones with the box fully inside its card.
26. Reorder Wealth by relevance (new devices + Showcase; nothing removed): totals and holdings first, then accounts/what you have, allocation, wealth over time, and the Compound Interest Calculator at the bottom (right above My links/footer). "Your wealth over time" becomes a detailed, interactive chart (tooltip, ranges, multi-series by asset class in our palette/nebula gradients, not one flat line). Fix the iPhone allocation list (values wrapping onto a second line).
27. Portfolio: a major polish in the spirit of CoinGecko's portfolio: a big total, 24h change and P&L (honest "Unknown" when there is no cost basis), Coins / Analysis / Insights tabs, a clean coin table (icon, price/24h, holdings value + amount), every coin clickable → an expandable detail card/sheet with its data (price chart, holdings, cost basis, transfers, goal links). No fake numbers; testnet/watch-only rules unchanged. Fix the iPhone cards (text wrapping into narrow columns).

## PART 7 — The 4-in-1 identity, the game layer and AA's features made premium
*Owner edit at approval:* 32, 33 and 35 are part of Part 7, not stretch; the order inside Part 7 is 28, 29, 30, 31, 33, 32, 34, 36, 35, 38, 39.
28. One accent colour + fold mark per pillar (Goals lotus, Habits butterfly, Health heart, Wealth bull) used consistently in headers, chips, search results, charts and insights; each pillar page has the same header pattern (eyebrow, title with the white→nebula heading, one-line slogan, actions); Today gets a "Life overview" with four pillar rings.
29. One card system (header with icon/title/one action/⋯, spacing, liquid glass), one empty-state pattern (ZIGi + one action), skeletons actually shown while loading.
30. One chart language across weight trend, pace forecast, calculator, sleep score, measurements, balance wheel, year view, wealth over time and markets (axes, tooltip, gradients, legend).
31. Journey page as a full experience: level orb, XP bar to the next level, a nebula path with a planet per level, illustrated badges, the weekly challenge, today's 3 quests with pillar icons; a compact Journey card for the bottom of pages when Gamify is on; a compact version back in the Goals header area only if it fits the new header.
32. Habits: time-of-day section headers with sky gradients (dawn/day/dusk/night); a full-screen routine player with ZIGi guiding; a nicer year view.
33. Health: rich highlight tiles (weight trend, coach, energy), the meal planner as a day swiper on phones, a polished grocery list, coach card, fasting timeline, sleep score ring, water ring; the vitamins view when AB-Cloud's data lands (handoff).
34. Calculator hero: the result counts up once, scenario chips, premium layout.
35. Life review: a magazine-style "Your week" story per pillar with a share card.
36. Search palette with pillar icons and previews; Settings tidy groups with icons (not the Sync/Your data files); the onboarding welcome with illustrated pillars.
37. Typography: one type scale; propose shipping Inter (OFL, self-hosted font file) in the plan with its weight cost, or keep the system stack — owner decides at plan approval. *Decided (D1):* keep the system stack this run; Inter stays an owner item.
38. Copy pass: one voice, plural fixes ("1 readings", "2 Gold troy ounces"), persona items #19 (prices "update on request" wording), #27, #28 (footer link sizes, Quick add's ×, the Hide-ZIGi toast, the music button over cards, duplicate "Stretch", the knock offer in every new chat).
39. Desktop/tablet: use wide screens better where cards are narrow; this run changes desktop on purpose — the freeze check lists every difference with its reason.

## PART 8 — Phone sweep and final polish (must happen; never skipped, even under a lean-finish note)
40. Go through every page at 390 and 320 (and 1024/1440) and fix every overlap, wrap and broken element: rings with text outside the circle, numbers wrapping, two-line rows, ZIGi's floating button covering "Open Goal"/values (add bottom padding/safe areas so content never sits under it), the stray checkbox, tables squeezed into narrow columns. Then one full visual check of the Showcase on all pages with captures.

## Gates
A after Part 3 (unit, the touched specs Chrome, weights, CI fully finished — no pushes until it ends), B after Part 6
(WCAG audit on every changed page, frozen readers for ui-prefs, weights within budget — never raise a budget, load new
visuals on use), C at the end (full unit, full browser suite once, revert gate, freeze check with every desktop
difference listed, one test-audit agent on changed test files, key scan, handoff read, CI fully finished on the final
head). After every part: production build → captures of the touched pages in the Showcase (1440/1024/390 + 320) →
self-review against the owner's checklist and fixes before the next part. At Gate B and Gate C one independent
read-only design-critique agent over the before/after gallery; every weakness fixed and recorded in ADR-024.

## Swapping the vision-board artwork (request 16)
The Showcase board's eight illustrations are `apps/web/public/showcase/vision/vision-01.svg` … `vision-08.svg`, mapped to
the Showcase goals in `apps/web/lib/showcase/vision-art.ts`. To replace one with a licensed photo: drop the photo in the
same folder under the same number (`vision-03.webp`) and change that entry's extension in the map; nothing else reads the
files. Real people's boards never use these files — their boards show their own chosen gradient, emoji or photo.

## Phase 2 proof
Phase 2 (owner follow-up, 2026-10-14) checks every request above, sub-point by sub-point, against captures of the build.
"Before" = Phase 1's final build (`09b2d307`), captured in the Showcase into `review/session-ab-design-screens`
`phase-2/before/<width>/<state>.(png|jpg)`; "after" = the same states in `phase-2/after/` at Gate C. A row reads
**done** only with an after-capture looked at; **partly** and **not done** name the Phase 2 part that finishes them.
Statuses below are the Part 0 reading (before); the Gate C column is filled at the end.

| # | Sub-point (the owner's words, shortened) | Part 0 | Phase 2 part | Gate C | Capture |
|---|---|---|---|---|---|
| 1 | crisp nebula/star background, solid at top/bottom, stars towards the middle | done | — | | `1440/today-top.png` |
| 1 | same quality as the sidebar; static; page weight healthy | done | — | | `1440/today-top.png` |
| 2 | one full-width footer banner, the planet exactly once | done | — | done | `phase-2/after/1440/footer.png` |
| 2 | the ZIGoals logo — *owner correction:* the origami Z/G logo as the "Z" of "[logo]IGoals", the slogan and its small line under it | done (Phase 2) | P6 | done | `phase-2/after/1440/footer.png`, `390/footer.png` |
| 2 | *owner polish (final):* the logo 1.1× the cap height of "IGoals" (measured 1.099 at 1440/1024/390/320), on the baseline and centred on the letters' optical middle (equal 1.5–3 px overshoot above the cap and below the baseline), a 0.14 em clear gap, crisp dedicated lossless 1x/2x/3x files from the transparent master with no filter/opacity/blend on the raster (glow on a layer behind), "IGoals" in the logo's cyan-blue → violet → magenta flow with the same glow; compared with the sidebar logo at DPR 2 | done (Phase 2) | P6 | done | `phase-2/after/wordmark/wm-zoom-1440.png`, `wm-zoom-1024.png`, `wm-zoom-390.png`, `wm-zoom-320.png`, `sidebar-logo-1440.png` |
| 2 | slogan, zigoals.app (globe), Help, Send feedback, security contact; grouped link columns (Product, Help & feedback, Your data) | done (Phase 2) | P6 | done | `phase-2/after/1440/footer.png` |
| 2 | X links with logos — *owner correction:* @ZIGoals and @ZIGFluencer confirmed and shown | done (Phase 2) | P6 | done | `phase-2/after/1440/footer.png` |
| 2 | full Alpha disclaimer, readable (14–15 px, shorter lines, a scrim behind it) | done (Phase 2) | P6 | done | `phase-2/after/1440/footer.png`, `320/footer.png` |
| 2 | the steps — *owner correction:* 01 Goals → 02 Habits → 03 Health, lotus/butterfly/heart, pillar accents; the path flows from Health up into "= Wealth" | done (Phase 2) | P6 | done | `phase-2/after/1440/footer.png`, `phase-2/after/frames/1440/` |
| 2 | the opening animation once per session (path draws, nodes ignite, lights travel, Wealth lights, rim sweep), resting state under reduced motion | done (Phase 2) | P6 | done | `phase-2/after/frames/1440/footer-f1…f7.png`, `frames/390/` |
| 2 | phones: logo + slogan, steps stacked with the path running down, social icons, links in two columns, disclaimer; 44 px links | done (Phase 2) | P6 | done | `phase-2/after/390/footer.png`, `320/footer.png`, WebKit `phase-2/after-webkit/390/footer.png` |
| 2 | the arcs never cross text; Back to top; old card removed | done (Phase 2) | P6 | done | `phase-2/after/1440/footer.png` |
| 3 | My links directly above the footer by default | done | 8 | | `1440/today-full.jpg` |
| 3 | page bottoms clean on 390/1024/1440/ultra-wide | partly — phone links ragged, "Make a backup" at the edge, the dock over the disclaimer | 1, 11 | | `390/page-bottom-today.png` |
| 4 | the motto centred on the planet | done | — | | `1440/sidebar.png` |
| 5 | theme switch Light (Soon) / Customize (Soon) / Dark, nebula style, sidebar bottom | done | — | | `1440/sidebar.png` |
| 5 | on phones inside More/Settings | partly — in More below the rows; More's order to tidy | 10 | | `390/more-sheet.png` |
| 6 | music button above ZIGi with clear spacing, fold arrow to the right, edge tab | done (desktop); on phones it lives in More (Session Z-Cloud) | 1 | | `1440/today-top.png` |
| 6 | *owner correction:* the buttons float on top (overlap accepted, both fold away); cards keep their full width; extra scroll room at the page end; the arrow 20 px above ZIGi on one axis | done (Phase 2) | P1, P2 | done | `phase-2/after/1440/today-rail.png`, `1024/goals-top.png`, `390/dock-goals.png` |
| 7 | hero collapse arrow top-right, remembered; hero unchanged | done | 8 | | `1440/hero-folded.png` |
| 7 | folded strip tidy on phones | partly — eyebrow wraps to two lines | 8 | | `390/hero-folded.png` |
| 8 | warning clutter removed; pages start with their header | partly — "SHOWCASE DATA · …" lines remain inside some cards | 11 | | `1440/today-top.png` |
| 8 | (a) one compact first-visit notice with × and More | done | — | | `1440/today-top.png` |
| 8 | (b) tiny Showcase chip → what it is + Exit / Load again | done (to re-prove: the capture missed the popover) | 1 | | `1440/chip-popover.png` |
| 8 | (c) full disclaimer in the footer; (d) Help keeps it | done | — | | `1440/footer.png`, `1440/help.png` |
| 8 | pinned tests updated as strictly; verifier told | done (ADR-024, handoff) | 12 | | — |
| 9 | rocket beside the lock, expands to "Gamify", menu on/off + Open your Journey | done | 8 | | `1440/gamify-menu.png` |
| 9 | game cards only at page bottoms, never in the middle | done | 8 | | `1440/today-full.jpg` |
| 9 | XP/level widgets addable to Today through the widget picker (owner edit) | not done | 8 | | — |
| 9 | Settings toggle stays; streaks without XP when off | done | — | | `1440/settings.jpg` |
| 10 | phone tabs Today/Goals/Habits/Health/Wealth; + / Search / More in the top bar | done | — | | `390/today-top.png` |
| 10 | More lists Markets…Journey, Settings and Help last | partly — "Your soundtrack" and Journey follow Help | 10 | | `390/more-sheet.png` |
| 11 | default order hero → focus → … → week → game → My links → footer | done | — | | `1440/today-full.jpg` |
| 11 | My links title in the nebula flow; chips with nebula glyph discs + liquid glass | done (polish in 8) | 8 | | `1440/today-full.jpg` |
| 12 | focus tiles merged with the habits widget; iPhone widget: timer chip, Complete, rows | done (re-prove on phones) | 8, 14 | | `390/today-habits-widget.png` |
| 13 | "See how it works" opens a real how-to; the film stays available | done | — | | `1440/how-to.png` |
| 14 | the summary figures a movable block after the cards | done | 7 | | `1440/goals-full.jpg` |
| 15 | switch at the right end, no "N destinations", no Goals|Positions tabs, filters left, Positions in ⋯ | done | 7 | | `1440/goals-menu.png` |
| 16 | vision board: big images, collage, overlay titles, progress, why, hover, full-screen, empty state | done | 7 | | `1440/board.jpg`, `1440/board-open.png` |
| 16 | eight rich illustrations in one style (car without logos, piano, home, summit, beach, marathon, library, sunrise run) | partly — library, car, runner and sleep are flat | 7 | | `1440/board.jpg` |
| 16 | the swap documented | done | — | | this file |
| 16 | tree: sub-goals, rings, area colours, zoom/fit on phones | partly — rows read as a list; connectors and fit to finish | 7 | | `1440/tree.jpg`, `390/tree.jpg` |
| 17 | "Change artwork" in ⋯ with ~10 new scenes, same size | done | 7 | | `1440/art-picker.png` |
| 17 | saved through setGoalCardArt | not done — AB-Cloud's mutator is not in main ("Soon") | 12 | | — |
| 17 | the Showcase uses more than three artworks | done | 7 | | `1440/goals-full.jpg` |
| 17 | scenes look like one premium set (critique 9) | partly — the same glow on every scene, flat skylines | 2d, 7 | | `1440/goals-menu.png` |
| 18 | details behind a small nebula arrow; first view title, status, amount, ring, remaining | partly — phones hide the amount | 7 | | `390/goal-card-open.png` |
| 18 | iPhone rings with the % inside; spacing | done (re-prove at 320) | 7 | | `390/goal-card.png`, `320/goal-card.png` |
| 19 | "Start from an idea" inside + New habit; Vacation beside the lock; header clean | done | 2a | | `1440/gamify-menu.png` |
| 20 | first view name/tags/counter/−+/Done/progress; everything else behind one expander in order | done | 6 | | `390/habit-card.png`, `1440/habit-card-open.png` |
| 20 | compact timer chips; the bell a proper switch; great on phones | done (re-prove) | 6 | | `1440/habit-card-open.png` |
| 21 | Health header banner with the slogan and the four actions; identical Ask ZIGi / Back up | done | 2a | | `1440/health-top.png` |
| 22 | thin counter rows on every width; one ⋯ to manage | done | — | | `390/health-top.png`, `390/counters-manage.png` |
| 23 | the game strip only at the bottom, with a quest that fits the page | partly — position done; page-fitting quests not proven | 8 | | `1440/health-bottom.png` |
| 24 | base currency only; a chip for other currencies; nothing when zero; Allocated/Available rows | done | — | | `1440/wealth-chip.png` |
| 24 | default from defaultCurrency() (owner edit) | not done — AB-Cloud's helper is not in main | 12 | | — |
| 25 | hero headline on one line on desktop; box inside its card on phones | done | — | | `1440/wealth-top.png`, `390/wealth-top.png` |
| 26 | reorder by relevance, calculator last | done | — | | `1440/wealth-full.jpg` |
| 26 | wealth over time: tooltip, ranges, multi-series by class | done (to the shared chart language in 4) | 4 | | `1440/wealth-chart.png` |
| 26 | the iPhone allocation list on one line | done (re-prove) | 14 | | `390/wealth-allocation.png` |
| 27 | big total, 24h, P&L with honest Unknown, Coins/Analysis/Insights tabs, clean coin table | done | 4 | | `1440/portfolio-full.jpg` |
| 27 | every coin opens a detail card (chart, holdings, cost basis, transfers, goal links); iPhone cards fixed | done (re-prove) | 14 | | `390/portfolio-coin.png` |
| 28 | one accent + fold mark per pillar in headers, chips, search, charts, insights | partly — marks yes; accents not carried into titles, buttons, chips, charts | 2b | | `1440/goals-menu.png`, `1440/search.png` |
| 28 | the same header pattern on every pillar page | partly — four different layouts (critique 8) | 2a | | `1440/*-top.png` |
| 28 | Today's "Life overview" with four pillar rings | not done | 2c | | — |
| 29 | one card header pattern, spacing, liquid glass | partly | 3 | | — |
| 29 | one empty state (ZIGi + one action) | partly — the component exists, used once | 3 | | `1440/today-empty.jpg` |
| 29 | skeletons shown while loading | not done | 3 | | — |
| 30 | one chart language across weight, pace, calculator, sleep, measurements, balance wheel, year view, wealth, markets | not done | 4 | | — |
| 31 | Journey: level orb, XP bar, nebula path with planets, badges, weekly challenge, 3 quests with pillar icons | done (re-prove on phones) | 8 | | `1440/journey.jpg`, `390/journey.jpg` |
| 31 | a compact Journey card at page bottoms when Gamify is on | partly — the slim progress strip | 8 | | `1440/health-bottom.png` |
| 32 | Habits sky-gradient time-of-day headers | not done | 6 | | — |
| 32 | full-screen routine player with ZIGi guiding | not done | 6 | | — |
| 32 | a nicer year view | not done | 6 | | — |
| 33 | Health highlight tiles (weight trend, coach, energy) | not done | 5 | | — |
| 33 | meal planner as a day swiper on phones | not done | 5 | | — |
| 33 | polished grocery list; coach card; fasting timeline; sleep score ring; water ring | not done | 5 | | — |
| 33 | the vitamins view when AB-Cloud's data lands | not done — presentational component in 5, wiring in 12 | 5, 12 | | — |
| 34 | the calculator result counts up once; scenario chips; premium layout | partly — count-up done; layout and chips to finish | 4 | | `1440/calculator.jpg` |
| 35 | Life review as a magazine "Your week" story per pillar with a share card | not done | 9 | | `1440/review.jpg` |
| 36 | search palette with pillar icons and previews | partly — marks yes, previews and phone sheet to finish | 10 | | `1440/search.png` |
| 36 | Settings groups with icons | done | 10 | | `1440/settings.jpg` |
| 36 | onboarding welcome with illustrated pillars | not done | 10 | | `1440/welcome.jpg` |
| 37 | one type scale (system stack, D1) | done | — | | — |
| 38 | one voice; "1 readings"; troy ounces; #19 wording | done | 11 | | — |
| 38 | #27/#28: footer link sizes, Quick add ×, Hide-ZIGi toast, music over cards, duplicate "Stretch", knock once | partly — the music over cards (1), the rest to re-prove | 1, 11 | | — |
| 39 | wide screens used better; freeze list | done | 14 | | ADR-024 "Freeze check" |
| 40 | every page at 390/320 (and 1024/1440): rings, wraps, rows, the dock over Open Goal/values, the stray checkbox, tables | partly — the dock and the phone amount remain | 1, 14 | | `390/goal-card-open.png` |
| 40 | one full visual check of the Showcase on all pages | done once (gate-c); again at Gate C | 14 | | gate-c gallery |
