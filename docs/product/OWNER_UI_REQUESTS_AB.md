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
