# ADR-024: Session AB-Design, "The giant UI upgrade: one premium 4-in-1 app": session decisions

Status: **In progress** on `feature/session-ab-design`, from `main` `6c1052b2` (Merge #84; the owner reports it live as
Alpha #39 — the repository records nothing past Alpha #38 `e3fa408d`, so "#39 = 6c1052b" is owner-reported here), on
the owner's Mac (M1 Max). This record holds the owner's decisions at plan approval and every decision the session took
without asking (the brief: the safest option that keeps every promise and every public-safety fact). The parallel lane
AB-Cloud (`feature/session-ab-cloud`, ADR-023) owns data/sync, workers, workflows, scripts, docs except this lane's own,
Settings → Sync and Your data files, the Restore flow and the "Point & tell" feedback mode; this lane owns all visual
work. The lanes talk through `docs/handoff/AB_DESIGN_TO_CLOUD.md` (mine) and `docs/handoff/AB_CLOUD_TO_DESIGN.md`
(read on `origin/feature/session-ab-cloud` at every gate). Evidence: `docs/verification/ab-design/`; captures on
`review/session-ab-design-screens`. The owner's request list: `docs/product/OWNER_UI_REQUESTS_AB.md`.

## Owner decisions (2026-10-13, plan approval)
- **The brief:** eight parts in priority order (the global shell; Today; Goals; Habits; Health; Wealth and Portfolio;
  the 4-in-1 identity, the game layer and AA's features made premium; the phone sweep), three gates, one giant PR
  (Draft until Gate C), captures before/after at 1440/1024/390 (+320 spot checks) on an orphan branch with an index,
  the decisions here as D1…Dn. Keep everything (move or tuck, never remove), Showcase never looks real, estimates
  labelled, unknown is not zero, no fake links, placeholders say "Soon". New device-only state in one loose versioned key
  `zigoals:ui-prefs:v1`; saved layouts never rewritten. Respect reduced motion and Motion Off; Playwright two workers,
  nothing in parallel; no new dependencies; no wallet/contract/key changes; never merge or deploy.
- **The protected baseline (CLAUDE.md, docs/STATUS.md "Current accepted baseline"):** this redesign changes the accepted
  look on purpose; the owner's plan approval is the owner approval the rule requires. The sidebar motto stays pixels in
  `public/brand/words/*.webp` (the three "not DOM text" tests remain true); only its position moves.
- **D1 Typography (request 37):** keep the system font stack this run; one explicit type scale ships as CSS tokens.
  Inter (OFL, self-hosted; ≈ 95–110 KB Latin subset or ≈ 340 KB full per face, re-measured Today-screens ceilings and
  320 px pixel checks) is recorded as an owner item, not done.
- **D2 Phone top bar (request 10):** `+ / Search / More`; Settings and Help are the last rows of More; the wallet shortcut
  keeps its icon when that button is enabled; the tab bar is Today, Goals, Habits, Health, Wealth. **Kept by the owner's follow-up (2026-10-14):** Settings has no icon of its own in the top bar;
  CI's journey scripts (`scripts/run10/account-browser.test.mjs`, `scripts/run11/*`, AB-Cloud's paths) that open Settings on
  phones as a visible link by name are listed for AB-Cloud to retarget (handoff, Part 1 entry); the specs and helpers here
  open More → Settings instead (listed below).
- **Owner edits at approval (pre-approved, applied):**
  1. Requests 32, 33 and 35 belong to Part 7 (order 28, 29, 30, 31, 33, 32, 34, 36, 35, 38, 39). Part 8 (request 40) is
     never skipped, even under a lean-finish note. Request 9 also: with Gamify on, XP/level widgets can be added to
     Today through the normal widget picker; off = none shown.
  2. A quality loop after every part: production build → captures of the touched pages in the Showcase
     (1440/1024/390 + 320) → self-review against the owner's checklist (one spacing scale; nothing overlapping or
     wrapping badly; contrast ≥ 4.5:1 and no tiny grey copy; one card/header/button language; pillar colours
     consistent; motion one-time and still under reduced motion/Motion Off; every new visual finished on phone and
     desktop) → fixes before the next part. At Gate B and Gate C one independent, read-only design-critique agent over
     the before/after gallery; every weakness fixed and recorded here.
  3. The craft bar: the footer banner must look like a top-tier app/website footer (layered depth over the single
     planet, a glowing constellation-style line linking the three steps with the fold-mark glyphs, the wordmark and
     slogan as the centrepiece, links and the disclaimer clean and readable; phones stack the steps). The eight vision
     illustrations and the ten new card scenes are rich, layered, lit artworks in one nebula style, iterated on the
     captures.
  4. Footer X links: config prefilled with `x.com/ZIGoals` and `x.com/ZIGFluencer`, both `enabled: false` until the
     owner confirms; nothing renders while disabled.
  5. Card art (17) is wired to AB-Cloud's `setGoalCardArt` as soon as that commit is on
     `origin/feature/session-ab-cloud` (re-checked at every gate); otherwise the adapter stays and the one-line switch
     is listed in both handoffs for the second merger. Base currency (24) defaults from AB-Cloud's `defaultCurrency()`
     (euro-area → EUR, else USD) once available; until then USD.
  6. Local-Mac rules: `caffeinate -dimsu` for the session; servers only from Bash (nohup, ports 3102–3104, curl health
     checks), never the preview pane; every long command under a timeout; no further approval requests (owner items go
     to `docs/verification/ab-design/SESSION_STATUS.md` "Resume here", the PR and the handoff); commit and push at every
     part boundary; the Mac's WebKit as well as Chrome for the iPhone captures in Part 8; every server and caffeinate
     stopped at the end.
  7. Budget: finish before Sunday 13:00 Brussels without being paused; a lean-finish note means finish the current part,
     do Part 8 anyway, Gate C lean, STATUS entry, PR ready.

## Session decisions
| # | Part | Decision | Why it is the safest option |
|---|---|---|---|
| D3 | 0 | The "before" gallery is captured from `main`'s own production build (`6c1052b2`, `:3103`) in the Showcase at 1440/1024/390/320 before any edit; "after" columns are added per gate from this branch's build. | A gallery whose before-images come from the same build the owner has live is the only honest baseline for the freeze check and the critique agent. |
| D4 | 1 | `zigoals:ui-prefs:v1` is one loose versioned record (`{version:1, heroCollapsed?, musicFolded?, themeMode?, baseCurrency?, dismissed?}`), read tolerantly (garbage → defaults), written through `getAppStorage()` so the Showcase keeps its own copy; named in `lib/ab-device-keys.ts`; a display key in onboarding's `NON_PERSONAL_KEYS`, Export everything's `DEVICE_KEYS` and the data catalog; erase keeps it. | The owner's rule plus the `aa-device-keys` pattern: nothing enters a strict synced record, builds #32–#39 ignore the key, a bad reader can only fall back to defaults. |
| D5 | 1 | The main background is a vector starfield (`public/art/v24/starfield.svg`, generated by a seeded script kept in `apps/web/art-src/`), attached as a fixed full-viewport layer with solid top and bottom fades; the sidebar keeps its own art. | Vector is crisp at every DPR for ≈ 10 KB gzip, needs no 1x/2x pairs, and a fixed layer never stretches over the scroll height (the cause of today's blur). Static by construction. |
| D6 | 1 | One footer component replaces the shell footer and both horizon layers; the planet art (`destination.webp`, the globe arc with its dark reading area) is drawn exactly once as the band's own background, outside the workspace's 1600 px column; the 3-step constellation line draws once through `useEntrance` and is fully drawn under reduced motion / Motion Off; the disclaimer spans keep the `network-banner` and `mode-strip` class names and the same sentences; the storage/sync status line moved into the footer unchanged. | The doubled horizon was two stacked layers at two widths; removing both and drawing once fixes it. Keeping the class names and sentences keeps `scripts/verify-hosted-alpha.mjs` (AB-Cloud's path) green without editing it; the handoff tells AB-Cloud it may retarget. The sidebar's small planet is the same art; on phones the sidebar is hidden, so the planet shows once there too. |
| D7 | 1 | The top-of-page notices leave: the Alpha box, the Showcase bar, the storage line, the mode strip, Today's "Testnet Alpha · …" line and the per-page "SHOWCASE DATA" copies. In their place: one compact notice (rendered in the page's HTML, so there is no layout jump and no-script readers see it; closable for good on the device through ui-prefs), a tiny "Showcase" chip whose landmark keeps the name "Showcase data" (the shared `loadShowcase` helper and the phone's Status sheet read it) and whose popover holds Exit Showcase / Load again, the footer's full disclaimer line, and Help's two answers (`z-status` rewritten, `z-alpha` new). Phones reach the wallet buttons and every notice in full through More → Status & wallet (the existing Status sheet). | Every public-safety fact stays on every page (the footer line) and in full one tap away; the hosted verifier's selectors still resolve; the facts are asserted at their new places by the same specs, as strictly (the list below). |
| D8 | 1 | The Gamify button lives in the shell's status row beside the layout lock (the lock portals there from every page, so "next to every page's lock" is this one place); it switches the game layer's own device record (the same switch Settings shows) and links to Journey. Game cards render only at the very bottom of pages: each page's `ProgressSlot` moved after its layout region (Today: a `today:game` item between Your week and My links, present only while Gamify is on). | One switch, one record (`zigoals:game:v1`), no new state; the slot registry is unchanged, only its place on the page. |
| D9 | 1 | The theme bar (owner follow-up): the sidebar's last thing, a framed glass bar below the complete planet artwork (the artwork's bleed into the bottom padding ends; the bar keeps the padding and the safe area), three equal icon buttons — the chosen one a solid nebula pill with a white icon, the others dimmer, "Soon" as the tooltip and accessible name of Light and Customize (`aria-disabled` radios that store nothing); Dark writes `themeMode: "dark"`. The same control with its words sits in More and Settings → Appearance. | hub.zigchain.com's pattern, as the owner asked; only one theme exists and a disabled radio that says so is honest; the record never holds a theme that does not exist (the reader maps any other value to dark). |
| D10 | 1 | Five phone tabs (`PHONE_TAB_COUNT`), More in the top bar sharing one open-state store with the tab bar's sheet (which stays inside the Main navigation landmark); the top bar is + / Search / More (D2 kept); the More sheet gains "Status & wallet" and the theme bar. | The sheet's place in the navigation keeps every `navLink` helper and CI journey valid; the shared store gives the top bar's button a truthful `aria-expanded` and focus return. |
| D11 | 1 | The music button moves to ZIGi's side, stacked above ZIGi's launcher, with a nebula fold arrow that tucks it into a 40 px edge tab (`musicFolded` in ui-prefs); visibility rules unchanged (the pages button `music`, on in the Showcase). | The owner's placement; the fold mirrors ZIGi's own hide/edge-tab pattern so the two buttons behave alike. |
| D13 | 2 | Today's focus habits tile stands down whenever the habits widget (the built-in card not hidden, or a habits widget) is on Today, because that widget lists the due habits itself; the phone widget's rows are one grid (title and streak, the count, the timer chip on its own row, then −/+/Done). | Owner request 12 and AA-Local's open item: no duplicated due-habits, nothing wrapping on an iPhone. |
| D14 | 2 | "See how it works" opens a short how-to dialog (the three steps with what to tap first and a link into each pillar); the brand film is the dialog's "Watch the film (16 s)" button, loading nothing until pressed, as before. | Owner request 13 / persona #21: a how-to, not the film; the film stays one tap away and its own tests keep every check through `openFilm`. |
| D15 | 3 | The goal card's artwork is `cardArt` from AB-Cloud's extras (read through a tolerant mirror, never written here), else the Showcase's assignment by goal key (six different scenes), else the card's default scene; the picker previews and its Save says "Soon" until `setGoalCardArt` lands (one-line switch in `lib/card-art/save.ts`). The ten new scenes live beside the five originals in one SVG with the same palette variables. | Owner request 17 and owner edit 5: no field is written that AB-Cloud has not defined, the Showcase shows more than three artworks without touching its extras record, and the card's size never changes. |
| D16 | 3 | The vision board is a dense collage grid (wide/tall tiles), the goal's name, ring and why over the picture, a full-screen dialog per tile, and the empty state "See the life you're building." The Showcase's goals show the eight illustrations mapped by goal key in `lib/showcase/vision-art.ts`; a real person's goals never use those files. The tree draws nebula connectors, life-area colours from the areas list and Fit / − / + on phones. The summary figures are the movable `goals:summary` block after the cards; the view switch and the page ⋯ menu (Positions) sit at the right end of the filter row; the destination count is the active filter's accessible name. | Owner requests 14–16: the board and the tree each read as a page of their own; the Showcase never looks real (illustrations, not photos) and the owner can swap a file in place; nothing is removed (Positions moved to the menu). |
| D17 | 4 | The habit card's first view is the heading (type · category · time, Edit, ⋯), the name and cadence, the counter with −/+ and Done and today's state; one "Details" expander (a `<details>`, chevron and a word, "Less" when open) holds, in order: the challenge line, Set or add a value, the quit panel, Skip today / note & mood, the duration timer, the linked goal, the stack note, Consistency & trends, the challenge controls, the 28-day dots, the goal link, History & reflection, Private habit notes, the "changes begin" note and the area/pause/archive row. The timer's controls are 44 px chips whose visible words are Pause / Resume / Finish / Discard while their accessible names stay the full ones (`aria-label`), so every spec that names them keeps working; the bell is a `role=switch` button. `HabitCompletion` gained a `part` prop so the counter renders first and its form inside the expander. | Owner request 20 (the first view; one tidy expander; compact timer chips; a proper switch); nothing is removed; the names the tests and screen readers use are unchanged. |
| D18 | 4 | "Habit ideas" leaves the Habits header: on a computer it opens from "+ New habit" as the editor's "Start from an idea" button (the same ideas panel); a phone keeps its ideas button in the list. "Vacation" is a small button beside the layout lock, portalled into the shell's page-tools slot (`PageTools`), so the header holds only the title, the lede, "+ New habit" and the shared minor actions. | Owner request 19; the ideas feature stays reachable on every width. |
| D19 | 5 | Health's header is the shared `PageHeader` (eyebrow "Your everyday wellbeing", "A little care, every day.", the lede) with Log food or water, Privacy & backups and the two shared minor actions; the quick counters follow it. The minor actions are one component (`components/page-actions.tsx`: `AskZigiLink`, `BackupLink`, `PageMinorActions`) used identically on Goals, Habits, Health and Wealth. | Owner request 21: the care card becomes the header; the four pillar pages share one action look. |
| D20 | 5 | Quick counters are one thin row per exercise on every width (icon, name, −, value, +); the per-row ⋯ is gone; the card's own ⋯ opens "Manage counters…" (rename or change icon, delete, add; reorder with the layout lock, as before) and "Add counter". | Owner request 22; the two-line phone rows disappear and every action stays. |
| D21 | 6 | Wealth's totals show the base currency (ui-prefs `baseCurrency`, USD until AB-Cloud's `defaultCurrency()` lands): `splitWealthTotals(subtotals, base)` leads with the base currency when anything is held in it (else the largest, as before, plus "Nothing tracked in USD yet"); other non-zero currencies are one chip "+ €8,000 held in EUR" whose popover lists each total, never converted; the chip appears on the headline and on Allocated / Available for Goals. Nothing shows for a zero other-currency total. | Owner request 24 and owner edit 5; no FX, no conversion, the facts one tap away. |
| D22 | 6 | "Your wealth over time" is a new chart (`components/wealth/wealth-history-chart.tsx`): the recorded total as a nebula line, the same total split by asset class as stacked areas (`WealthHistory.points[].classes`, derived in `computeWealthHistory`, never stored), range chips (1M/3M/1Y/All), a readout, hover/touch/keyboard tooltips (every point focusable), a legend and the exact table with a column per class; the line draws once (static under reduced motion / Motion Off). The default section order puts the calculator last, above the footer; the hero headline keeps one line at ≥ 1280 px with the total box a row down. | Owner requests 25–26; values stay the recorded observations, the chart adds no data. |
| D12 | 1 | The hero fold is a 40 px chevron in the hero's top-right; folded, Today keeps a one-row strip with the eyebrow, Quick add (so `.today-hero .quick-add-trigger` stays on every width) and the chevron, plus a visually hidden h1 "Today". | Quick add and the page's h1 must survive the fold; the strip is the smallest honest header. |
| D23 | 7 | Pillar identity (owner request 28): four accent tokens in `app/visual-v21.css` (`--pillar-goals` #9273ff, `--pillar-habits` #23eaff, `--pillar-health` #ff74be, `--pillar-wealth` #ffd27a) and one module `components/pillars.tsx` (`PILLARS`, `PillarMark`, `pillarOf`, `pillarOfHref`) with the footer's fold marks (lotus, butterfly, heart, bull). `PageHeader` gains `pillar` (Goals, Health); the Habits and Wealth heroes carry the mark before their eyebrow; search results lead with their pillar's mark; Journey quests carry the mark of their page. Today's "Life overview" rings are not built: Today's script budget (504 of 515 k) leaves no room for another chunk on load — an owner item. |
| D24 | 7 | One empty state (owner request 29): `components/ui/empty-state.tsx` (ZIGi, a title, one line, one action) on the `.aa-empty` card the AA pages used; Wealth's "Build your wealth picture" uses it. Today's goal empty state keeps its scene art. No skeleton class was added: `LoadBoundary` and the lazy sections already show their status lines. |
| D25 | 7 | Journey (owner request 31): a level orb behind the ring, an XP bar to the next level (`GlassBar`), one planet per milestone on the path (hue from the level), the path as a nebula line, badge discs lit when earned, and the pillar mark on each quest. Nothing in the game record changes. |
| D26 | 7 | Calculator (owner request 34): the estimated final value counts up once on first appearance (`components/calculator/count-up.tsx`: digits only, the locale's grouping and sign stay; static under reduced motion, Motion Off and on every later change; the accessible name is the final text). |
| D27 | 7 | Settings and search (owner request 36): each Settings group's title carries a small line icon (six, inline SVG); search results carry the pillar mark (D23). The onboarding welcome is unchanged this run. |
| D28 | 7 | Type scale (owner request 37, D1): named tokens `--type-eyebrow/h1/h2/h3/fine` in `app/visual-v21.css` with the values the app already used; `globals.css` reads them. Inter stays the owner's item. |
| D29 | 7 | Copy (owner request 38): "1 reading"/"N readings"; a precious metal's quantity reads "2 troy ounces of Gold" and "1 troy ounce of Gold" (`components/platform/asset-quantity.ts`, render only — the stored asset name `Gold troy ounces` and its denom are untouched); the routine template "Stretch" keeps its title (a template reuses an active habit with the same title — `routines.test.ts` pins it — so the rename would have created a second habit instead of removing a duplicate; the Showcase's own "Stretch" habit is that reuse); the price pulse reads "Prices refresh when you ask; a price counts as current for 15 minutes." The knock offer already shows once per device (`knock-offer.tsx` records the day). |
| D30 | 7 | Wide screens (owner request 39): goal cards four per row at ≥ 1600 px; habit cards in two rails at ≥ 1440 px. Both are deliberate desktop differences for the freeze check. Requests 30 (one chart language), 32, 33 and 35 are not built this run (lean finish): recorded as remaining in the STATUS entry. |

## Assertions changed (deliberate, listed)
None weakened: every public-safety fact is still asserted at its new place. Part 1 (owner request 8 and 10; the helper `tests/ab-shell.ts` holds the label, the sentence, the mode and the new places):
- `tests/phone-nav.ts`: `openMore` finds the top bar's More button (the sheet stays in the Main navigation); `walletArea` is the status row's wallet on a computer and the Status & wallet sheet behind More on a phone.
- `honesty-banners.spec.ts` `expectBanners`: the notice's label, the footer's label, sentence and mode (was the top bar's banner and the mode strip); the Habits/Health-only case asserts no notice and no footer spans (was no top bar, no strip).
- `private-read-delay.spec.ts` `expectBanners`: the same facts at the notice and the footer.
- `persona-z.spec.ts` test 2: the compact notice (≥ 44 px, label whole, on the first screen of every page) and More → Status & wallet (was the one status line); adds: closing the notice keeps it closed after a reload while the footer keeps the facts; desktop asserts the wallet buttons in the status row. Test 3: the notice's label and the footer's mode strip (was the top bar's).
- `persona-x.spec.ts`: no `.hero-truth` line and the non-financial pillars (was the hero's "Private daily tracking · Habits and Health" line); the Showcase chip is opened before Exit Showcase.
- `ui-design-pass.spec.ts` Part 18.4: the notice is visible on phones (was the status line); the never-movable list is the notice, the chip, the footer's two spans and the h1 (was the banner, the Showcase bar and the strip); Part 6 asserts the footer banner (slogan, the three steps on the constellation line, the truths, the backup link, the tagline, one art layer and no second horizon layer, 14/15 px minimums) in place of Today's card.
- `dashboard-visual.spec.ts`: the facts through `expectAlphaFacts` and the wallet through `walletArea`; the steps list in the footer (was the "How it works" fold).
- `product-shell.spec.ts`: the sentence read from the footer on a computer (was the network banner).
- `phone-shell.spec.ts`: five tabs with Wealth; More = seven entries from the top bar; the notice's geometry (was the status line's; the one-line count is gone because the label may wrap at 320 px while staying whole); the Showcase chip opens Exit; the Status sheet opens from More and focus returns to More; the no-script case reads the notice and the footer; the stalled-read panel sits under the notice.
- `pages-visibility.spec.ts`: `--tab-count: 2` for a two-page setup (More is no tab); the More button is the top bar's; Settings is reached through More (no top-bar icon, D2).
- `phone-shell.spec.ts`, `hosted-alpha-goal-stage.spec.ts` and every `navLink(page, 'Settings')` caller: Settings opens from More on a phone (D2); the "names CI journeys click" test lists the five tabs and reaches Settings through More.
- `help-page.spec.ts`: `z-status` expects "Status & wallet"; `z-alpha` added.
- `logo-quickadd-goals-header.spec.ts`: the steps list in the footer (was the "How it works" fold).
- `run10-widgets-status.spec.ts`: no notice for a non-financial setup (was no top bar).
- `lib/pages/visibility.test.ts`: five tabs and the seven-entry More.
- `brand-nav-polish.spec.ts`, `page-marks.spec.ts`: five tabs and the eight-entry More (with Chess); the "More current" check navigates to Markets (Wealth is a tab) and reads the top bar's More button.
- `pages-visibility.spec.ts` `expectNav`: `slice(0, 5)`; the preview's words "Phone tab bar: …; More (in the top bar) holds …" (the preview component says the same).
- `music.spec.ts`: the button sits on ZIGi's side above ZIGi's launcher (≥ 8 px clear) instead of on the opposite side (owner request 6).
- `a11y-wcag-x.spec.ts` consistent help: on a phone the repeated way to Settings is the top bar's More button (D2); Help's back link still counts.
- `persona-x.spec.ts` Showcase: the chip's popover wording (Load again resets; Exit returns) replaces the old "stays in the demo" sentence persona #5 flagged.
- `ui-design-pass.spec.ts` Part 8: Today's last bottom item is My links and Your week is right before it (owner request 11).
- `page-order-aa.spec.ts`: three focus tiles, no habits tile, the habits widget present (D13).
- `logo-quickadd-goals-header.spec.ts`, `dashboard-visual.spec.ts`, `a11y-motion-dialogs.spec.ts`: the film through the how-to (`openFilm`); two Escapes / two backdrop clicks close both dialogs; focus returns to "Watch the film" then to the trigger.
- `logo-quickadd-goals-header.spec.ts` toolbar: no "Goal workspace" nav and no count text in the row; the view switch, the ⋯ menu and the count in the Active filter's name are asserted instead; the switch sits at the right end.
- `page-marks.spec.ts`, `staking-tabs.spec.ts`: Positions is the Goals ⋯ menu's link (`goalsPositionsLink`); a Goal's page keeps its tabs.
- `tests/ab-shell.ts` `openStatusSheet` waits for the sheet's slide before anything is measured (the 44 px check read a mid-slide height once).
- `a11y-wcag-x.spec.ts` consistent help: on a phone the More button is the repeated mechanism first (Help's back link second) so every page reports the same place.
- `ui-design-pass.spec.ts` Part 8: Today's bottom reads Your week → the game card (Gamify is on in the Showcase) → My links; Part 18.4 unchanged (the lock keeps the right edge on every width).
- `page-order-aa.spec.ts`: the Goals body order includes `goals:summary` after the collection (owner request 14); Today's habits widget is matched with `.first()` (the built-in card and a widget can both show it).
- `goals-best-aa.spec.ts`: the first vision tile's picture is the Showcase illustration (its alt), not a gradient "picture for …".
- `zigi-phone-rest.spec.ts`: the first-screen-control-under-the-corner mechanic is proven on Goals (its first card's Details summary) now that Activity's game card sits at the page's bottom.
- `page-marks.spec.ts` groups: with Wealth a tab, More opens with the money group; the one group gap is before Ecosystem.
- `pages-visibility.spec.ts`: `expected.slice(0, 5)` while settings open.
- `phone-touch-targets.spec.ts`: Today's timer-chip buttons keep 44 px (a CSS fix, not an assertion change).
- Habits (Part 4, owner request 20): `habits`, `habits-aa`, `run10-habit-actions`, `run11-habit-integration`, `habits-decimal-comma`, `habit-skips`, `small-features-y`, `run10-shared-visuals`, `phone-refinements`, `habits-v2` open the card's Details (`openHabitDetails`) before a control that now waits behind it; every control is clicked by its unchanged accessible name. `habits-v2`: the ideas open from "+ New habit" → "Start from an idea" on a computer.
- Second round (the broad spec run after Parts 4–7): `counters-compact.spec.ts` and `ui-design-pass.spec.ts` Part 18.6 now assert the thin-row contract (icon, name, −/count/+ on one line on every width, both buttons ≥ 44 px, the name on one line, each row spanning the card, the card's one "Options for Quick counters" ⋯ instead of per-row menus); `ui-design-pass.spec.ts` Part 4: the counters sit under the header on every width, and the rename/delete flow goes through ⋯ → "Manage counters…"; Part 5: the other currency is read from the chip's button, its panel keeps "held in EUR · not converted" and the FX note (same in `display-locale.spec.ts` and `phone-refinements.spec.ts`); Part 8: Wealth's last section is `wealth:calculator`; `page-order-aa.spec.ts`: Today's bottom is week → game → links, Wealth ends with the calculator; `persona-x.spec.ts`: the chip's popover says "Fictional records for <date>." then the Exit/Load again sentence; `goals-best-aa.spec.ts`: the first vision tile's picture is the home-library illustration (its real description); `run10-shared-visuals.spec.ts`: the Wealth history line is `.wealth-history-line`, drawn once (dash offset 0 after the entrance); `phone-refinements.spec.ts`: More opens from the top bar (`openMore`); `persona-z.spec.ts`: the Habits hero's Ask ZIGi is the shared `.page-ask-zigi`; `zigi-phone-rest.spec.ts`: Goals carries the Showcase so its first screen has cards; `habits.spec.ts`, `habits-aa.spec.ts`, `habits-v2.spec.ts`, `persona-z.spec.ts` (Delete for good), `run10-habit-actions.spec.ts`, `run11-habit-integration.spec.ts`: `openHabitDetails` before the controls that live in the card's details. Fixes rather than assertion changes: the page header's phone grid (the `auto` actions column had collapsed the title to 0 px — the title now takes its own row below 600 px); the quick-log part of a habit card no longer repeats "Not scheduled" or the auto check-in badge; the details' content entrance animations on habit and goal cards are removed (Playwright's fake clock never lets an animated element read as stable, which stalled every click inside opened details); the Today timer chips are ≥ 44 px wide; the Wealth chip button is ≥ 44 px tall on phones; the Goals/Health header actions end with the primary action (minor actions first).
- Third round: the habit card's details is uncontrolled (a tap on its summary before hydration was undone when React re-applied `open={false}` — every habit spec that opened the details right after navigation then waited forever on a hidden control; the ZIGi delete flow opens it through a ref); the quick counters' old phone container block (name on two lines, controls on a second row) is gone — thin rows on every width; the Portfolio tabs' selected state uses a solid dark fill with a border (the gradient-border trick read as 1.38:1 to the contrast audit); `.status-row` keeps the page tools, the rocket and the lock at the right edge even without the demo balance; the page header's own-row title applies below 768 px (the 200 % zoom reflow at 640 px); the chip's font and the phone composition legend are 14 px (the 320 px small-text rule); `count-up` carries its final text in a visually hidden span (a plain span may not take `aria-label`); `logo-quickadd-goals-header.spec.ts` on phones asserts the Create link below the title; `goals-best-aa.spec.ts` reads the tree ring under `.goal-tree-node`; `zigi-phone-rest.spec.ts` proves the press mechanic on Help (its topic chips sit under the corner on a fresh device; Goals' first screen no longer has a control there).
- Fourth round (the habit details helper, found by instrumenting the runner): the real cause of every habit spec hang was `openHabitDetails` returning early — right after navigation the card list is not rendered yet, so "no details on this card" (a count of zero) fired and the spec then waited forever on a hidden control. The helper now waits for the card, waits for `<html data-app-hydrated>` (a mark the shell sets on mount: a tap on a summary before hydration is replayed by React afterwards and toggles the details shut), requires the same details node across three checks, opens it through the element (`open = true`, which fires toggle) and requires it to stay open; the card also remembers open details per habit id across re-renders. Specs that reload or move to a second card open the details again (`run10-habit-actions`, `run11-habit-integration`, `habits-v2`). `persona-z.spec.ts` 9: a computer opens the Details arrow before expecting the sources (owner request 18 holds on every width); 10b: the hero's three actions take at most two rows (the shared Ask ZIGi action reads "Ask ZIGi" on phones with the full accessible name, so all three fit one row at 430 px). `counters-compact.spec.ts` 320 px: a four-digit count needs a 36 px medallion, a 15 px count and tighter gaps so − / count / + stay inside the row; the name column keeps at least 40 px. The Wealth split rows' chip is a 44 px target on phones. The phone goal card (≤ 480 px) measures 254 px at 390 (a 64 px ring, 14 px caption lines, 8 px padding, a 44 px Details row).
- Gate C test audit (an independent read-only agent over the 41 changed test files): one real defect fixed — a comment appended in `run10-shared-visuals.spec.ts` had swallowed the Wealth history screenshot call; one coverage gap closed — `habits.spec.ts` now opens a card's Details by clicking its summary once (the helper opens it through the element); `ui-design-pass.spec.ts` Part 8 asserts the allocation card's "Valuation coverage is incomplete" line again beside the calculator-last check; `persona-z.spec.ts` test 2 measures the Alpha notice with a 72 px ceiling (the old 52 px was the one-line status strip); the 10b title now says "at most two rows". Everything else was judged deliberate and recorded.
- Gate C, the full suite (2058 passed, 38 failed before this round): `portfolio-v2.spec.ts` — the allocation and the value chart live under the Analysis tab, a coin's page link sits in its expanded row (`.data-coin-toggle` first), and phones have the tabs instead of the Allocation/Transactions folds (owner request 27); `motion-polish.spec.ts` and `run11-motion-recording.spec.ts` — the Wealth chart is `.wealth-history-chart`, its line draws with `wealth-history-draw` (dash offset to 0) instead of the old `evidence-draw`/`motion-mark-in`; `phone-folds.spec.ts` — "How it works" left Today's folds (the footer's line and the hero's how-to, owner request 2) and the split rows' chip is not an amount; `run10-restored-today.spec.ts` — no `#how-it-works` region; `run11-layout-stability.spec.ts` — the Alpha notice stands where the top bar was; `help-settings-link.spec.ts` — the footer's Help link is a navigation entry on every page. Product fixes in the same round: the pillar glyphs' gradient ids are unique per instance (`aa-a11y`/`focus-return` duplicate-id findings on Habits, Health, Journey and Today), the how-to dialog renders its content only while open (Today had two play medallions) and opens after that content exists (focus lands on the first step), the page header's title column keeps at least 14 characters so wide action rows wrap instead of collapsing it (768 px in `product-visual`).
- Gate C, last round: `motion-polish.spec.ts` — a comment appended on the chart line had swallowed its scroll call (the same slip the audit found in `run10-shared-visuals`; every changed spec was then scanned for a comment followed by code on one line: none left), and the chart is kept in view with a poll because sections between the donut and the chart finish mounting as the page scrolls and push it down (its entrance plays on intersection); `quick-add-line.spec.ts` — the helper waits for the line field before the keyboard checks (Today loads more lazily now); the how-to dialog ignores the film dialog's `close` event bubbling through React (it had closed the how-to and unmounted the film button the spec expects focus to return to).
- Local-only: `goals-best-aa.spec.ts` "the Hall's share image is made on the device" waits for a download, but this Mac's Chrome can `navigator.share` files, so the share sheet opens instead; CI's Linux Chrome has no share sheet and downloads. Not a product change.

## Phase 2 (owner follow-up "Finish everything, nothing half done", 2026-10-14, Opus 5.5)
The proof table (`docs/product/OWNER_UI_REQUESTS_AB.md`, "Phase 2 proof") drives the parts; decisions are numbered P1…

| # | Part | Decision |
|---|---|---|
| P1 | 1 | *Owner correction (2026-10-14), replacing the first Part 1 attempt:* the music button and ZIGi float on top of the page while they are shown; the overlap is accepted, because both tuck into the right edge with their fold arrows. No card moves or narrows on any page or width (the first attempt's 100 px right lane, the notice's alignment to it, the icon-only wallet button and the one-per-line hero pillars at 768–1279 px are reverted, and so is the phone "peek"; ZIGi's Phase 1 rest mechanic stays as it was). The one allowance: extra scroll room at the very end of a page (the footer's last padding: 190 px on a computer, 136 px on a phone) so its last lines scroll above the two buttons. |
| P2 | 1 | The dock's spacing: the music button stays stacked above ZIGi on the same vertical axis; its nebula fold arrow (pointing right) sits under it, 20 px above ZIGi's button (`music-launcher.css`, the stack's bottom 118 px). |
| P3 | 1 | — (withdrawn with P1's first version). |
| P4 | 1 | Small fixes found by the Part 1 captures: an open ⋯ menu rises above the next card's ⋯ (`card-options.css`), the Showcase chip's popover is opaque, the phone footer's links stand in two even columns with a lone last link spanning both. |
| P5 | 2 | The 4-in-1 identity (owner request 28; critique 8, 11, 12): one header — `components/pillar-hero.tsx` + `pillar-hero.css` — on Goals, Habits, Health, Wealth and the Journey, cut from Habits' approved header: eyebrow with the fold mark, the title across the row (white→nebula, ending in the pillar's accent), the lede with the actions beside it in fixed places (the buttons, primary at the right end; the shared Ask ZIGi / Back up row under them), and Habits' constellation in an optional art column. Wealth's header is unboxed like the others; its totals follow in a summary card that now also holds "Manage assets" and "Refresh prices" (moved from the header, not removed), with the Goals split figures stacked under their labels. The shell marks `<main data-pillar>` from the route (`lib/pillar-route.ts`, no glyph imports), and the page's accent reaches every title's gradient end, the primary buttons' glow and the active chip or tab. Device-only Today cards (`today.lifeOverview`, `today.gameWidgets`) join the loose ui-prefs record with a frozen-reader test, because Today's widget kinds are a strict enum in the synced dashboard settings (AB-Cloud's lane; older builds would refuse new kinds). |
| P6 | 1 | *Owner correction (2026-10-14): the footer banner rebuilt to the brief.* The origami Z/G logo (the sidebar's asset at 1x/2x/3x) is the "Z" of "ZIGoals" — one component, `components/brand/logo-wordmark.tsx`: the logo 1.1× the letters' cap height (cap measured at 0.705 em in the system stack), on their baseline and centred on their optical middle, a 0.12 em gap that reads as 0.14 em with the image's own edge, drawn from dedicated lossless 64/128/192 px WebP files exported from the transparent master (no filter, opacity, blend or transform on the raster; its glow is a separate layer behind it), and "IGoals" in the logo's own cyan-blue → violet → magenta flow with its glow (the owner's exception to the white-on-the-left rule), with the slogan and "Same you. A brighter tomorrow." under it; the steps are Goals → Habits → Health (lotus, butterfly, heart; pillar accents at their nodes) on a glowing constellation path measured from the page (`components/footer/footer-path.tsx`, lazy, loaded when the footer comes within 700 px): on wider screens it rises from Health into "Wealth", on phones it runs down the stacked steps. The opening moment, once per session when the banner is ≥ 35 % in view (2.2 s draw + 1.1 s sweep): the path draws, three lights travel along it (SVG `animateMotion`), each node ignites as the light reaches it (ignition times from the measured path lengths), the labels rise, "Wealth" lights up, and a soft band of light crosses the planet's rim (an `@property` gradient blended with `overlay`, so dark space stays dark). Reduced motion, Motion Off, or already seen: the resting state at once; the SSR markup is the resting state too. Then the social row (X @ZIGoals and @ZIGFluencer, enabled at the owner's confirmation; zigoals.app with a globe; Back to top), three link groups (Product, Help & feedback, Your data), the Showcase line and the disclaimer (64-character lines, 15 px, the verifier's class names kept). The scrim deepens behind every line of text; the old orbit lines that crossed the links are gone. |
| P7 | 2 | Today's "Life overview" (owner request 28): the Phase 1 whole-life card becomes four pillar rows — Goals, Habits, Health, Wealth — each a ring in its pillar's colour, the fold mark, one line ("Destinations in motion", "Your daily rhythm", "Care for your day", "Wealth with a purpose") and a link to its page. The rings show what the app already knows and nothing more: Goals = the average known progress of active goals (unknown values are left out, never counted as 0), Habits = the share of today's scheduled habits completed, Health = the day's food and water shares against their own targets (each capped at 100 %), Wealth = the share of tracked wealth allocated to goals in the base currency (with nothing tracked in it, the headline currency; never converted). Phones: a 2 × 2 grid of tiles. It is the card's builtin (first in the "life" group), so a saved Today layout keeps its place. |
| P8 | 2 | Scene glows (owner request 17, critique 9): every goal-card scene has its own light — position, size and colour of the ambient glow and the light gradient come from one `GLOW` table in `components/scene-art.tsx` — instead of the one shared glow that made the ten scenes look alike; the duplicated base-scene list is merged. No new files, no new chunk. |
| P9 | 3 | One card header (`components/ui/card-header.css`, owner request 29, critique 10): the eight heading families read alike — eyebrow and title left, one figure or action, the ⋯ menu last at the top right; one title size for a page section (22–27 px) and one for a card in a panel (19–22 px); a figure beside a title is a quiet chip. `SectionHeading` gains `pillar` (the fold mark in the eyebrow). One empty state (`EmptyState` gains `level`/`as` so headings and landmarks stay) on Habits, Goals' filter, Health goals, the activity timeline and the evidence chart. One loading placeholder (`components/ui/skeleton.tsx`): a shimmer shaped like what is coming, its "Opening …" sentence kept for screen readers, still under reduced motion and Motion Off. |
| P10 | 4 | One chart language (owner request 30): `components/charts/chart-kit.tsx` + `charts.css` — the nebula ink (cyan → violet → the pillar's accent) and its area, faint guides with 14 px values, dates under the plot, a glass tooltip, a legend of small swatches. On the kit: weight trend, pace forecast, calculator, measurements, wealth over time (now drawn at its measured width: its 11 px labels had been scaled to about 6 px on phones). Sleep, Meditation, the Portfolio value chart, chess and the evidence chart take the same frame through `charts.css`. |
| P11 | 12 | The second merger (AB-Cloud's PR #85 on `main`): both sides of every shared file kept (shell: the Point & tell mount after the music launcher; STATUS: both entries; the key lists: AB-Cloud's wiring, this lane's `lib/ab-design-keys.ts`, the duplicate catalogue label and export entry dropped). Wired: "Change artwork" saves through `setGoalCardArt` with the extras' Undo (the "Soon" adapter is gone); the Showcase chip, its sheet and the footer line read `lib/showcase-copy.ts` (SHOWCASE_CHIP — its "· fictional" half from 768 px —, SHOWCASE_SHEET, SHOWCASE_FOOTER); Wealth's base currency defaults to `useDefaultCurrency()` and can be chosen ("Totals in USD / EUR" in the summary's tools; nothing converted). Point & tell's launcher stays where AB-Cloud put it (bottom left), clear of the right-hand dock. |
| P12 | 5 | Health premium (owner request 33): three highlight tiles under the counters (`components/health/health-highlights.tsx`, lazy) — the weight trend with its ink line, the energy estimate (or "N of 14 days" with a bar), the coach's sentence — each the figure of a card further down and a link to it; a swipeable row on phones. The meal planner is a day swiper on phones (one day per screen, snapping, day chips, opens on today); the grocery list is one row per item (check, item and amount, aisle at the end); micronutrients and AB-Cloud's vitamins read as rows with today's value as a chip, two columns on wide screens. Nothing new is computed. |
| P13 | 6 | Habits (owner request 32): each time-of-day section sits under its own sky (dawn, day, dusk, night) behind the heading, low-alpha so the heading keeps its contrast; the routine player is full screen with ZIGi's guiding line per moment — fixed plain words, no model call. |
| P14 | 7 | Goals (owner requests 16–18): phone cards show the amount in the first view (18 px under the name; the ring's "Of your goal funded" line kept for screen readers; "Details" and "Open Goal →" share a row while Details is closed), 238 px at 390; the tree grows from one "Your goals" root with curved branches at every level and phone-sized rings; the three flat vision illustrations (car, library, sunrise run, and the shared runner) and the ten extra card scenes redrawn (art-src/vision.mjs, components/scene-art-extra.tsx — the extra scenes stay a lazy chunk). |
| P15 | 8 | Today and the game (owner requests 7, 9, 23, 31): Journey widgets — "Level & XP" and "Today's quests" — switched on in the "Add a widget" dialog while Gamify is on, kept in the device-only display prefs (Tier 3 storage commit), drawn after the device cards, loaded only when chosen; the bottom game card is a compact two-column Journey card on computers and tablets (phones keep the strip) and shows the page's own quest, or says there is none today instead of an unrelated one; the folded hero strip is two tidy rows on phones. |
| P16 | 9 | The Life review as a small magazine (owner request 35): a cover ("Your week, in four chapters."), the highlights as pull quotes and the counts as large figures; Wins, then one chapter per pillar (Goals, Habits, Health, Wealth) with its number set large in the pillar's accent. Headings, texts and the share card are the review's own. |
| P17 | 10 | More, search, welcome (owner requests 10, 36): More lists the pages, then the Journey (while Gamify is on), ZIGi and the soundtrack when tucked away and Status & wallet, with Settings and Help last; search opens with the four pillars as shortcuts and, on wide screens, previews the highlighted result; the welcome shows the four pillars illustrated with their fold marks. |
| P18 | 11 | Copy (owner request 8): inside cards, "SHOWCASE DATA · …" becomes one quiet "Showcase" tag before the card's own plain sentence (staking, asset detail, goal evidence, Wealth history, chess, positions' eyebrow); records' own texts are data and stay. |
| P19 | 13 | What's new and Help: release `2026-10-session-ab-design` with eight links to a new Help topic, "New: one 4-in-1 look" (nine answers), AB-Cloud's links leading "Earlier updates"; the search index lists the topic and its answers. |
| P20 | — | Weights (never a raised budget): the footer banner is a server component passed from the app layout into the shell, with small client islands (the honesty spans from the shell's own values, the Showcase/status line, Back to top, the lazy path animation), so its markup — and the hosted verifier's class names — arrive with the HTML at no script cost, also without JavaScript. (A first try loaded the footer with `React.lazy`: lighter, but its streamed content stays hidden without JavaScript — withdrawn.) |

### Phase 2 — assertions changed
Each is re-pointed at the element that now carries the same fact, as strict as before; none is weakened or removed.
- `phone-pages.spec.ts` (Wealth: the total on the first screen; Health's order), `phone-refinements.spec.ts` 122/161/174,
  `zigi-mini-window.spec.ts` 106: the Wealth "+ Add asset" button now lives in the shared header (P5), so `.wealth-actions` →
  `.wealth-heading .pillar-hero-buttons`; Health's header is `.health-heading` (the shared header no longer carries the old
  `page-heading` class, whose Health padding and title sizes would fight the grid). `landing-v5-captures.spec.ts` (opt-in
  capture) follows the same Health selector.
- `logo-quickadd-goals-header.spec.ts`: "+ Create a goal" was asserted beside the title; in the one header grid (P5) the title
  spans its row and the actions sit at the right end of the lede row. Now asserted: below the title, right edge on the header's
  right edge (± 2 px, unchanged), the actions block bottom-aligned with the lede (± 8 px).
- `ui-design-pass.spec.ts` (footer banner): the steps are exactly Goals, Habits, Health (owner brief b) and "Wealth" is asserted
  in the slogan; the link is "Make a backup in Settings" (the brief's wording); the wordmark is one image named "ZIGoals" (the
  logo as the Z, P6) instead of the text `.brand-wordmark`.
- `logo-quickadd-goals-header.spec.ts` (the controls row): the gap to the toolbar was measured from the lede; the shared
  header ends with its actions (under the lede on phones), so it is measured from the header's end, ≤ 32 px as before (and
  the lede still above the toolbar).
- `persona-x.spec.ts` (Showcase, merged with AB-Cloud's wording): the chip's sheet is asserted to carry SHOWCASE_SHEET's
  sentence on what Load and Reset do, with Load again and Exit Showcase as before.
- `lib/ab-design-keys.test.ts`: the account erase now removes `zigoals:ui-prefs:v1` (AB-Cloud's merged wiring, ADR-023 C8,
  "erased with the account"); the test asserts that instead of "the erase keeps it". The device still counts as new with
  only this key (unchanged).
- `display-locale.spec.ts` (de-DE, nl-BE, en-US, ja-JP): the Wealth headline is the device's default currency since the
  second merger (owner edit 5, AB-Cloud's `defaultCurrency()`), so euro-area locales lead with the euro total and show US
  dollars in the chip. Each case names its base currency; the headline, the chip's exact text and the panel's "not
  converted" line are asserted per locale.
- `finished-feel-aa.spec.ts` (AB-Cloud's, merged): the footer has its own "Your data" link (owner brief d), so the Settings
  door is found inside `main`.
- `point-tell.spec.ts` (AB-Cloud's, merged): Goals' header is the shared pillar header, `.goals-heading`, not `.page-heading`.
- `page-marks.spec.ts` (phone More list): with Gamify on (the Showcase) the Journey row follows the pages, before Settings and
  Help (owner request 10); the exact list is asserted.
- `chess.spec.ts`, `run9-2-product.spec.ts`: the in-card "SHOWCASE DATA · …" text is the quiet "Showcase" tag plus the plain
  sentence (owner request 8); both the tag and the sentence are asserted.
- `help-page.spec.ts` (fourteen topics, the new "abd" section in its place), `zigi-help-settings.spec.ts` and
  `whats-new.spec.ts` (the release id; the card's own link now opens `#help-abd-footer`; AB-Cloud's six links lead "Earlier
  updates", so every pinned position moves by six).
- `brand-nav-polish.spec.ts` 59 and `pages-visibility.spec.ts` (`expectNav`, the two Showcase calls): the same Journey row in
  the phone More list while Gamify is on; the exact list is still asserted, and without Gamify it is still absent.
- `motion-polish.spec.ts` (Today): the vertical calorie gauge (`.nutrition-gauge`, `glass-fill-y`) left Today when the Life
  overview became four pillar rings (owner request 28, P7). The step follows the Health ring that replaced it: it draws once
  when seen (start → mid → end, strictly decreasing offset) and settles exactly on its value; the horizontal pace bar and
  Health's own gauge keep their checks.
- `persona-z.spec.ts` 10b and `send-feedback.spec.ts`: settles only. 10b waits for one Ask ZIGi action, as it already waited
  for one actions row (the server's and the phone's header can overlap for a moment). send-feedback waits for network idle
  before its quiet window, so Help's own guide-link prefetches (Goals, Habits, the welcome) finish first; inside the window
  nothing at all may still be requested.
- `run11-layout-stability.spec.ts`: restored, not changed. A Phase 1 comment had swallowed the sideways-scroll assertion on
  the same line; it is back on its own line.
- `motion-polish.spec.ts` (Habits overview glide): the mid-glide sample is taken in the page two frames after the value
  changes (a slow CI runner, sampling after two round trips, read the 460 ms glide already at its end); the assertions
  are unchanged (start ≤ gliding < end, end on target).
- `run9-2-life.spec.ts` (Life text at 320 px): after the existing wait for exactly one root, the visible root is the one
  checked and measured (`filter({visible: true})`) — the server's hidden streamed copy could still arrive after that
  moment on CI; the size check itself is unchanged.
- `zigi-part-boundary.spec.ts` (WebKit): WebKit's rejected router prefetches are left out by the same shape-and-moment
  rule webkit-smoke uses (ADR-017 S64); every other page error still fails it.
- `webkit-smoke.spec.ts`, `webkit-phone.spec.ts`, `zigi-part-boundary.spec.ts` (WebKit, S64 filter): the prefetch shape
  allows one more path segment, `/app/goals/tracked/<id>` — a phone goal card now shows its "Open Goal →" link, which the
  router prefetches, and WebKit rejects it when the page is left (CI on `2879a361`, phone). The message shape (`_rsc`,
  "due to access control checks"), the same origin and the 1.5 s navigation moment are unchanged; anything deeper or
  any other page error still fails.
- `scripts/worker-types.test.mjs` and `goals-best-aa.spec.ts` "share image": made deterministic (see "CI: the Alpha
  gate in its own job").
- `scripts/run11/zigi-relay-runtime.test.mjs` (size caps): the oversized request now declares 1.1 MB in its
  `content-length` and sends only its first kilobyte (a stream that never ends), so the 413 `REQUEST_TOO_LARGE` with no
  upstream request proves the relay refused on the declared size without reading the body (`workers/zigi-relay/worker.mjs`
  line 34, the same check the old 1.1 MB string body reached). Sending the whole body raced that early refusal: the
  client was still writing when the relay closed the connection (`terminated`, EPIPE) in a loaded unit run. The fixture's
  `call` passes a stream body through with `duplex: 'half'`. The reply-size half of the test is unchanged.
- `zigi-alive.spec.ts` "idle that feels alive": `test.slow()` (≈ 630 one-second clock steps; 30–53 s of 60 s on CI's
  WebKit on AB-Cloud's and this branch's runs); no step or check changed.
- `portfolio.spec.ts` ("Wealth is untouched"): both reads of Wealth's text wait until none of its later sections is still
  loading (`main [aria-busy="true"]` count 0). This branch loads four Wealth sections on their own (weights); the cold
  first visit read the page before they arrived and the warm second one after. The equality itself is unchanged.
- `tests/phone-nav.ts` `openTodayWidgets` (used by run10-source-pinning and others): the widget and fold counts are read
  together until they agree, instead of the fold count against a widget count read once (a widget mounting a moment later
  made 5 folds for 4 counted widgets); still exactly one fold per widget.
- `counters-compact.spec.ts`: unchanged; the layout audit's earlier fix (names wrapping at 320) broke its one-line rule, so
  the fix was reverted and the row gives the name more room instead.
- Integration scripts (AB-Cloud's lane, retargeted as second merger per the handoff): `scripts/run10/account-browser.test.mjs`,
  `scripts/run11/packaged-consumer-journey.mjs` (+ `packaged-runtime.test.mjs`, its `navigate`), `packaged-goal-journey.mjs` and
  the stage-8 rehearsal harness `go()` open
  Settings through the top-bar More sheet on a 390 px phone (owner decision D2), and through the sidebar link on larger
  screens. `scripts/verify-hosted-alpha.mjs` needs no change: its Settings step runs after its layout loop ends at 1280 px.

### Closing pass (owner follow-up, 2026-10-14: "the whole app finished, one premium 4-in-1 app, nothing forgotten")
1. **Rings at the source.** Every progress ring is a size container: band 8.5 % of the ring's real size (4–10 px), the figure
   a third of the inner circle (11–30 px), the % at half size on its baseline; pages no longer size the figure. Captioned rings
   (sleep score, water, a routine step, the Journey level, Today's level) centre figure and caption as one column. A ring
   script checked every page that draws rings at 1440 and 390: every label inside its inner circle (the tree's 44 px rings
   had drawn "95 %" on the band — the owner's screenshot).
2. **The layout audit** — `apps/web/tests/audit/layout-audit.mjs` (dev tooling outside the suite; no new dependency: contrast
   is measured on the pixels behind each text, read with a small PNG reader). It visits every route and openable state
   (Today open and folded, Quick add, Add widget, how-to, search, ZIGi's chat, the More sheet, the Showcase chip; Goals'
   cards, board, tree, details, art picker, goal page, wizard, templates, average goals, positions; Habits, a card's
   Details, the editor, the year view, the routine player; every Health view and the counters dialog; Wealth, Add asset,
   an asset, the calculator, Markets, Staking, Portfolio and a coin, Activity, Ecosystem, Chess, the Journey, the Life review
   week and month, Settings and its sub-pages, Help, ZIGi's page, Share, a missing page; and nine states on a new, empty
   device) at 320, 390, 430, 768, 1024, 1280, 1440 and 1920 px in Chrome and 390 px in WebKit, and flags sideways scroll,
   clipped or spilling text, overlaps, numbers on two lines, ring labels in the band, targets under 44 px and contrast.
   With a dialog open only the dialog is checked; fixed bars and the floating ZIGi/music buttons are left out (owner).
   Findings fixed so far: the game strip's quest cut off, counter names cut off at 320, macro tiles' label and figure on one
   line at 320, Wealth's summary at 320 (label under ⋯, split figures too narrow, the currency note past its box), goal
   amounts on two lines, the goal plan's fields past their card, the Details hint cut off, the phone demo balance cut off,
   ⋯ menus and ZIGi's corner link over eyebrows, four-digit day figures on two lines, captioned rings' overlapping lines,
   small targets (Life review goal links, the measurement pager, Today's arranging buttons, the calculator's fields, the
   tree's size buttons), the vision link and "Back to top" on bright art.
   Second full pass (every width, fixes after it): Habits at 1440 px (the earlier two-rail split of the whole list block
   squeezed each card to 166 px; removed, the habit grid's own three columns stay), Today's widgets beside the rail at
   1024 px (the widget area is a size container and stacks under 620 px), the Life overview legend's "Relationships" under
   its value, the goal cards' Details preview wrapping instead of an ellipsis, the goal pulse's "of <amount>" and target
   date kept whole, a soft scrim under the hero's three pillars, Health's summary at 320 (its stack rule lost on
   specificity), the goal page's and the calculator's big figures sized from their own length (`--chars` with a size
   container: one line for US$1,234,567,890.12), ZIGi's page cards following their column, the composition ring kept
   square. Third pass (a new "covered" check: hit-testing each line of text for a painted box on top): the empty states'
   ZIGi image drawn at its intrinsic size over the title (now fits its box), Markets' "+ Find a market" over "Your
   favourites" at 320 px (own row), the Gamify rocket over the demo balance at 320–374 px (the balance takes its own line,
   "demo balance" kept whole), the goal page's metric tiles at 320 px (dates ran out of a 88 px tile; they stack). The goal
   page's nowrap rule is scoped to its overview figures (in the timeline it ran into the next row and took its clicks on
   CI). (The charts and the footer line were first moved to measure on the next frame for WebKit's ResizeObserver loop
   error; the error was traced to the main navigation, which keeps that, and the charts and the footer line measure in the
   observer again: a page resized under a fake clock kept their old width for that long frame, see "one 30-second clock".)
   Audit corrections, each checked against a screenshot first: a line is the set of boxes that overlap vertically
   (a small unit beside a big figure is one line); contrast is read inside each of the text's own line boxes on a second capture where
   every glyph is transparent (edge pixels had caught the neighbouring line's letters, a wrapped run's box its neighbour's
   figures, a swatch's glow), and only where the text's own scroller shows it; touch contexts (phones, `--touch`) are
   captured in viewport-sized chunks, because Chromium's full-page capture drops touch emulation for the rest of the page's
   life (hover-revealed controls such as the vision board's "Open goal" vanished from the picture); a textarea's raw text node is not
   laid out.
   **Targets (owner, 2026-10-14: "don't decide the 44 px rule by width alone").** 44 × 44 px wherever the primary pointer is
   coarse, at every width: under 768 px through the phone layout's own rules, from 768 px (tablets, landscape phones) through
   `components/ui/touch-targets.css` (`@media (pointer: coarse) and (min-width: 768px)`: controls, summaries, fields and
   standalone links get a 44 px floor; a link inside a sentence grows its hit area with block padding, which moves no
   line). A fine pointer (mouse, trackpad) keeps the compact desktop baseline, held to WCAG 2.5.8: 24 px, or a
   smaller control whose 24 px circle meets no other target (its spacing exception); those passing controls under 44 px are
   listed in the report as advisory. (A first try padded desktop text links and summaries to 24 px; it moved block-level
   links and summaries, overlapping the goal timeline's rows and outgrowing Settings' reserved ZIGi section on CI, so it
   was reverted in favour of the spacing rule WCAG states.)
   The audit decides the minimum the same way (44 px under 768 px or with a coarse pointer, else 24 px) and runs once more
   with touch emulation at 768 and 1024 px (`--touch`).
3. **Stress states** — the audit's `--stress` mode rewrites the Showcase's own records to 40+ character names,
   US$1,234,567,890.12 and its euro twin, a 9,999 counter day, then runs every check.
4. **Consistency** — every page's own header (PageHeader and the hand-written `.page-heading`) reads at the pillar header's
   scale (eyebrow, title, lede); the Goals header keeps the `.page-heading` hook the account and sync scripts use.
5. **Interaction states** — a visible ring on every focusable non-native control, the search field's ring, a pressed state on
   touch screens (brightness only), the routine player in a native modal dialog (focus kept inside, Escape pauses, focus
   returns to its opener).

### Gate C — the final captures, looked at (2026-10-15)
The final build captured into `phase-2/after/` (1440/1024/390/320, Showcase) and every proof-table row read against its
capture. Found and fixed in this reading: the footer's long fact left "transactions" alone on a line (each fact now
wraps as balanced lines); the Vision board's full view wrote "target 20000" (now the goal's money, "$20,000.00", or
"4 milestones"); Wealth's history readout wrote "559,423.2 USD" (now "$559,423.20" like the rest of Wealth); a phone
Portfolio row's details opened inside the table's sideways scroller and their tiles were cut at the screen edge (they
keep the scroller's visible width); Portfolio's header sat 12 px inside its cards' edge; Health's nutrient notes began
their own line with " · "; the What's new card set its whole-sentence items in seven narrow columns at 1440 (two columns
from tablet width; phones unchanged, so Today's asserted screen count is untouched); the "Make Today yours" presets
centred their text in the button grid, leaving a gap that read as a missing icon; Sleep's six figures sat five in a row
and one alone; the phone More sheet's theme bar let the selected Dark cover Customize's "Soon" tag (columns sized to
their words, the tags under the labels on phones); the browser's own checkbox drew a flat grey square on the dark cards
(one drawn checkbox, its geometry pinned like the radio's; switches keep theirs); the pillar headers' ledes balance
their lines. Capture-tool fixes (not product): element shots hide the fixed chrome that a capture taller than the
window stamps into its middle; the routine player adds a routine first; a coin's page is reached by opening its row;
Wealth's chart opens its phone fold; the sidebar's end, the year view and the More sheet's end are captured too.

## Freeze check
This run changes desktop and tablet on purpose (owner request 39 and the whole brief), so `scripts/desktop-freeze-check.mjs`
would list every page; the deliberate differences, each with its reason, are:
- Every page: the fixed starfield background (1), no top banners — one Alpha notice, the Showcase chip and the footer
  disclaimer instead (8), the one footer banner (2, 3), the theme bar under the sidebar artwork (5), the motto moved onto
  the planet (4), the music button above ZIGi (6), the Gamify rocket beside the lock (9), game cards only at page bottoms (9).
- Today: the hero fold (7), week → game → links by default (11), the merged focus tiles (12), the how-to (13).
- Goals: the toolbar (15), the summary figures after the cards (14), the vision board and tree (16), card scenes and
  the details expander (17, 18), four cards per row at ≥ 1600 px (39), the pillar mark (28).
- Habits: "Start from an idea", Vacation beside the lock (19), the card's first view and Details (20), two rails at ≥ 1440 px (39).
- Health: the shared header and actions (21), thin counter rows with one ⋯ (22), the game strip at the bottom (23).
- Wealth and Portfolio: the base-currency chip (24), the one-line hero (25), the new order and chart (26), the Portfolio
  tabs, big total and expandable rows (27).
- Journey, Settings, search, calculator: Part 7 (28–38).
Saved personal layouts are untouched on every width (D11: defaults only).

## Design critique (Gate B, Gate C)
One independent read-only agent over the gate-a gallery (Gate B and C folded into one read at Gate C, lean finish). Its
list and what happened to each item:
1. The floating dock (music button above ZIGi) covers content on every page (the hero lede at 390, a card ⋯ at 1440). Kept:
   owner request 6 puts the music button above ZIGi, and the launcher's resting place is Session X-Local's mechanic (it
   lifts above first-screen controls, never above text); the fold arrow tucks the music button away. Recorded as a trade-off.
2. The goal type printed twice on a card (scene caption + body eyebrow): fixed — the scene caption is hidden.
3. The Wealth pillar disc over "YOUR": fixed (the hero eyebrows lay the mark inline).
4. Habits on phones: the constellation art behind the headline: fixed — faint (opacity .3) behind the words at ≤ 600 px.
5. Hall of achievements: media heights differ: fixed — one 150 px media height.
6. Orphan words in page titles and the notice's "More" dangling at 1440: fixed — balanced titles; the More link sits by
   the close button on wide screens.
7. Vision board: uneven art (bookshelf, car, runner flat): the caption scrim is deeper now; redrawing those three
   illustrations is an owner item (the eight SVGs are swappable per `OWNER_UI_REQUESTS_AB.md`).
8. One header grid on all four pillar pages; 11. per-pillar accent on titles and primary buttons; 9. varied scene glows;
   12–13. Habits action alignment and the 1024 px Wealth wrap; 14. muted copy below the premium bar: not done this run
   (budget) — owner items, listed in the STATUS entry.
10. Footer: the legal block is 15 px in a 78-character column; phones list the links in one column. The curved connector
   stays (drawn on purpose).
Verdict quoted: "After is clearly better than before" — the fold no longer loses ~300 px to notice bars, the Goals header
is cleaner, the footer is a real banner; the dock overlap and the art unevenness are the remaining gaps.

### Closing pass item 6 — design critique over fresh 390/1440 captures
One independent read-only agent read every page at 390 and 1440 px (full-length captures cut into slices; 353 images) and
listed 29 findings (4 High, 15 Medium, 10 Low). Each was checked against its screenshot before acting.
Fixed:
1. Ecosystem logos slid out of their tiles on phones (a forced 44 px image in a padded tile): the logo fills the tile.
2. Card headers centred with a short floating rule on desktop (Ecosystem, ZIGi's page, Reminders, the market watch): the
   landing's old global `header { max-width; margin: auto; padding; border }` no longer applies inside the app.
3. Numbers and dates broken inside themselves: the goal page's metric tiles size from their length; Today's next/latest
   contribution, goal cards' target dates and "Open Goal →", chess dates and Life review trends keep their figures whole.
4. Health at 1440 px: the diary's side column ran ~1,100 px past the meals; its cards join the grid (log form beside the
   meals, Water across both columns).
5. Today at 1440 px: Habits and Health each take the row (a short Health card had left a dead area beside Habits).
6. Figures split by the gradient ("$9,0|00.00"): figures take one smooth pale blend; titles keep the white → nebula flow.
7. Settings → Your data repeated "Area: …" once per record type: one line per area.
8. Clipped at the edge: Portfolio's table fits its card at 1440 px and drops the Result column on phones (each row's
   details show it); Today's market watch wraps into rows on larger screens.
9. "Last verified" with nothing after it: the time it was verified, or "Not verified yet".
10. Duplicates: position tags each fact once, a note equal to the title is not repeated, the price history says its
    limitation once, and an asset no longer offers "Allocate to" the Goal it already funds.
11. Two status-chip styles: Today's pill reads like the goal cards' chips (dot, capitals). (Emergency fund appearing in
    the featured card, the goal list and the agenda is by design: three roles.)
13. "1 CUSTOM": a custom asset's contribution shows its position's name (`lib/asset-unit.ts`, unit-tested).
14. The footer's honesty line: the same facts as short lines; the build environment (read by the hosted verifier) in a
    quiet chip at the end.
16. Activity's Habit and Health events take their pillar accents.
17. Reminders' checkboxes centred above titles: the same legacy header rule (2).
18. Habit cards' schedule line wrapped beside Edit and ⋯: the heading is a grid (eyebrow row with the buttons, title and
    schedule full width). The three-up grid with a lone card in a section is kept (equal card sizes across sections).
19. Two goal-card languages: "Open Goal →" everywhere; an average goal's target reads under its title, not in the eyebrow.
20. Cancel and Save goal touched: action rows keep the standard gap.
21. "Still collecting" read as a bare heading: a chevron row like the other Details.
22. The Journey's broken badge glyph ("⁄ Comet"): "Badge · Comet"; levels not reached share one neutral marker.
23. Two identical X icons on phones: the X links show their handles.
24. A meal's ⋯ on its own row at 390 px: title, kcal chip and ⋯ share the heading row.
25. Ecosystem's three links wrapping their arrows at 390 px: stacked full width.
26. Today's folded widgets mixed half rows without "Show" with full rows: every folded widget is a full row with "Show";
    the snapshot's tiles share the tallest tile's height (the row's height is unchanged).
27. "Steps goal" on templates that are not about steps: "Milestones goal"; template buttons sit at the card foot.
Judged, not changed: 15 (the calculator's result pill is sticky over scrolling content by design; a full-page capture
froze it mid-page), 29 (the empty Today keeps the rail beside a longer main column, as the Showcase does).
Owner items (product decisions beyond a visual fix): 12 — one display format for dates across pages (ISO, locale and long
forms are mixed; changing it moves many asserted strings); 28 — the Showcase's activity times are all midnight because its
records carry dates only (AB-Cloud's data lane).

### CI: the Alpha gate in its own job ([TIER 3] (CI), owner, 2026-10-14)
Milestone quality's `web-integration` had grown to 12.7 min on an ordinary runner and reached its 15-minute limit on a slow
one (run 38619597472), cancelling the Public Alpha Workers security gate after every other step had passed. The Alpha
artifact build and checks, the two packaged contracts, the Run11 package topology and the security gate now run in a new
job, `web-alpha-gate`, with the same steps, commands, specs and trace upload; nothing was dropped or loosened. The `web`
aggregate check needs it as well, so "web" passes only when all four web jobs pass. `web-integration` keeps the unit
time-zone sweep, the browser account and market integration and the page weights (about 9 min). No new action, no new
dependency. Risk: a step that relied on state from web-integration (none found: the Alpha build is its own OpenNext build,
the packaged tests read their own dry-run bundles, the gate serves its own preview). Rollback: revert the commit.
Two tests made deterministic in the same pass (not loosened): `scripts/worker-types.test.mjs` gets a 65 s test budget to
match its own 60 s spawn limit (vitest's default 5 s had ended a wrangler run under load); `goals-best-aa` "share image"
tells the browser it cannot share files, so the device-side save path it tests runs everywhere (a Chrome that can share
files opened a share sheet a headless run never settles).

### CI: WebKit time on this branch, and one 30-second clock (closing pass, 2026-10-15)
CI's WebKit shards ran about 40 % longer on this branch than on AB-Cloud's pre-merge runs (median ≈ 28 min against
≈ 19.5 min, from the job logs), and `zigi-simulated-day` (phone) timed out at its 180 s on nine of nine branch runs (once
in six on AB-Cloud). Measured locally in WebKit: Playwright's fake clock yields to the real event loop after every timer
it fires (≈ 7 ms each, whatever the timer does), and the phone Habits page ran six separate 30-second intervals — four
`useHabits` day refreshes, the automatic check-ins and the vault idle check — so 60 fake minutes cost 6.7 s of real time,
and the test's simulated day ≈ 100 s before anything else. Not a test change: `components/half-minute.ts` is one shared
30-second clock (re-armed when the page's timer functions change, as a fake clock installed after load does), and the
"today" and "what is due" refreshes ride it (`useHabits`, `useLocalToday`, `useHealthToday`, the reminder cards, the
For-you clock); the automatic check-ins call their check through a ref instead of re-rendering the whole page every
30 s to run it. Every listener still runs at most 30 s after the last time, plus on focus as before; ZIGi's knock keeps
its own tick (its cadence is what its specs assert). Result: 60 fake minutes on phone Habits 6.7 s → 1.8 s; the
simulated day 2.7 min → 1.2 min locally; fewer wake-ups for a real phone too. `lib/half-minute.test.ts` covers one
timer for many listeners, the last listener stopping it, a listener leaving while it fires, and re-arming.
`zigi-alive` "idle that feels alive" (desktop, 60 s) steps the clock one second at a time ≈ 630 times; from the job
logs' timestamps it took 30–48 s on AB-Cloud's runs and ≈ 53 s on this branch's passing ones, so CI's general WebKit
slowdown on these heavier pages tips it over; locally it takes 11 s of its 60 s and no timer or animation runs during
its steps (measured: 120 steps, 1.2 s, no animation frame loop, no endless CSS animation on any page). With the shared
clock in, CI on `1c91509b` passed it in ≈ 52 s and both WebKit shards were back in AB-Cloud's range (20.1 and 26.4 min
against 17.5–26.8); since it sits near its 60 s on `main`'s code too, it takes `test.slow()` as `zigi-simulated-day`
does — a time budget, not an assertion: every step and check is unchanged.
**The rotating WebKit set (owner's rule: evidence, not a loop).** `zigi-accept-correct` (the 40-odd "accepted means the
record is exactly right, and Undo puts it back" cases, mostly on the phone profile) fails one to three different cases
per WebKit run: the chat's last card is gone right after Add or Undo (`.ai-card` not found), and once WebKit itself
failed a `page.goto` ("WebKit encountered an internal error"). The same shape failed on AB-Cloud's own pre-merge runs
before this branch existed on `main`: run 38509848456 (`732a2055`: create-habit weekdays, log-sleep nap, log-mood),
38505226605 (`e57ab538`: create-habit weekdays), 38510173374 (`870c3929`: create-habit daily, Asia/Tokyo, desktop);
here 7162a9d2 (stop-fast), 05bd23e1 (create-habit daily), 1c91509b (log-food, edit-habit, import-recipe). A real local
attempt under the same load: the full WebKit set, two workers, production build — 431 passed, 0 failed (c13, all
accept-correct cases included); never reproduced. WebKit stays the advisory job it is (AB-Cloud C29); recorded here and
in the report, not looped on.
Also from CI on `7162a9d2`: Today's 320 px life card spilled 1 px because the empty Wealth sentence ("Your first asset
starts here") had taken the figure's one-line rule (it wraps now; `run10-widgets`); the phone footer's chips were
squeezed below 44 px under 390 px and its Back to top kept a desktop padding through a more specific selector (they
wrap as one row of chips there, never shrink); the footer line and the charts kept their measured width for a frame after
a resize, which a fake clock makes long (`meditation` phone at 320 read 357 px): they measure inside the observer again,
as on `main`, and the footer line is also held to its stage's width. The stress audit's Wealth
figures: an asset card's value and the composition ring's phone figure size themselves from their own length too.
From CI on `05bd23e1`: `motion-arrival` compares the first screen's boxes while Habits arrives with the settled page,
and on this branch's shorter Habits header the Habit consistency section starts inside that first screen; it is its
own chunk (ADR-022 B49, the Habits budget) and through `React.lazy` it showed ≈ 0.3 s after everything else, so a slow
run took the mid-arrival boxes without it. Its chunk is now fetched as soon as the Habits code runs and the section
renders in the page's own pass once it is there (measured: with the habits at 642 ms, against 345 ms after them
before); still its own chunk, Habits 456.9 of 458 kB. A chunk that fails to load shows nothing, as the quiet boundary
did. No assertion changed.

## Weights (Gate C)
`scripts/check-weight-budget.mjs` against the Gate C build: Today 515.3 of 515 kB, Goals 438.0 of 434 kB and Wealth 469.1 of
465 kB were over (no budget is ever raised). Made lighter: the ten extra card scenes are a lazy chunk fetched the first
time a card shows one (`components/scene-art.tsx`), the Wealth history chart is a lazy chunk (`wealth-view.tsx`), and the
how-to dialog is a lazy chunk (`today-dashboard.tsx`), and — Goals still 1.6 kB over after those — the card's scene art and the Vision board are lazy chunks too. Final build: every page under budget (the STATUS entry has the table).

## Rejected options
- Raster AVIF/WebP starfield at 1x/2x: crisp only at two DPRs, ≈ 150–300 KB for a 2x frame against ≈ 10 KB for the vector; the owner allowed either, the vector keeps page weight healthy.
- Editing `scripts/verify-hosted-alpha.mjs` for the notice change: AB-Cloud's path; asked through the handoff instead.

## Consequences
Filled at Gate C.
