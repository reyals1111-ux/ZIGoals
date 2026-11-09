# Grok #53 replay — SHELL (lane L10a: app shell, navigation, O3 "Apps & extras", O4 sidebar Apps group, layout 300–1920, themes, Plans, launchers), final replay

- **Commit served:** `1a7b0163` (`git -C /home/user/zig-branch log --oneline -1`: "Session AL (integration 8c84d0a6): headroom under Today's phone ceiling …"), production build, `PUBLIC_ALPHA_UNDEPLOYED`, on http://127.0.0.1:3101.
- **Date:** 9 Nov 2026, about 02:05–05:00 UTC.
- **Replayed by:** SHELL, a fresh replay agent (owner rule 13, final replay). No fixes, no app or test code changed, no git writes.
- **List:** the 237 rows of `fr-shell.tsv` (236 ids; D-194 is in AL-NAV-010 and AL-NAV-011). "Z18 (+ also closes:" and "DV-263)" are read as Z18 and DV-263; "N-PR-02 (+ also closes:" and "D-194)" as N-PR-02 and D-194.
- **Sources read:** for each id only its block in the bot files (`grok-2026-11-04/*.md`, never FINAL-REPORT.md) and its rows in `docs/review/session-al/ledger/*.md`; the AL rows in GROK53_LEDGER.md; ADR-037 (O1–O7, Q-readings); ADR-036's PROTECTED list and ADR-033 LA5 for owner decisions; `lanes/L10a.md` from "3c" onward only. No earlier L10a replay file exists; method and conditions follow GROK53_REPLAY_L3_1.md's header.

## Method and conditions
- **Browser:** Playwright with its bundled Chromium (headless). Google Chrome (`channel: 'chrome'`) for every run that opens ZIGi's panel (TK-060, PR-011/025/041) and for the persistence replays: the bundled Chromium crashed the page when ZIGi's panel opened at 358 px, as the brief warns.
- **Every context:** `locale: en-GB`, `timezoneId: Europe/Brussels`, the bots' clock with `page.clock.install` at **4 Nov 2026 03:00 Brussels**; every `/api/**` request answered **503**. One browser and at most 2 pages per run, each run through `flock -o /tmp/claude-0/zig-browser.lock timeout 900`.
- **Profiles:** **F** = fresh empty profile (storage cleared, welcome marked seen); **Sc** = Showcase via Settings → Load Showcase Demo (for sweeps S2 and the desktop sweep the Earn dock is also switched on in the Showcase's own prefs, so all four launchers show); **+game** = game layer on (`zigoals:game:v1`).
- **Themes:** Nebula unless noted; **L** = Light, **D** = Dark, set in the device's `zigoals:ui-prefs:v1` record (what the theme switch writes) and loaded fresh.
- **Bot zoom → CSS width:** Denver's Oct-21 recipes zoom a 1920 px screen (its own "250 % (viewport 768 px)"): 250 % = 768, 200 % = 960, 175 % = 1097, 500 % = 384. Where a recipe names "~768 px" as well as 175 %, both 768 and 1097 were replayed and the verdict says which.
- **Sweeps used as evidence (codes in the tables):**
  - **S1** (fresh): widths 335, 375, 388, 430, 500, 640, 690, 730, 767, 768, 782, 880 × 20 pages (Today, Goals, Goals/new, Habits, Health, Wealth, Portfolio, Markets, Staking, Governance, Ecosystem, Chess, Settings, Help, Activity, Journal, Notes, Tasks, Earn, Journey) = 240 loads: **0 floating launchers, 0 fixed/sticky boxes outside the nav chrome over any word or control of the page (6 scroll steps per page), 0 sideways scroll** on all 240.
  - **S2** (Showcase + Earn dock): 335, 375, 500, 640, 768, 880 × the same 20 pages = 120 loads: same result.
  - **S3** (Dark, fresh): 375 and 768 × Staking, Ecosystem, Chess, Settings, Help, Governance: same result.
  - **S4** (fresh + game): 300 and 320 × Today, Habits, Journey: 0 launchers, 0 overlaps; **300 px scrolls 12 px sideways** (below the 320 px floor of the layout audit; incidental, also noted by the L3 replay).
  - **P1/P2** (control-precise, ≥ 901 px): full-page scroll in 0.6-viewport steps, `elementFromPoint` at the centre and right edge of every button, link, input, select, summary of `main`; a hit counts only if the topmost element is inside a launcher. Fresh (ZIGi + Checklist launchers): **960 and 1097: covered controls on 14 of 16 pages** (Health "Increase Pull-ups" and "Star Sleep …" at their centre; Markets "Add USD Coin favourite" centre; Ecosystem, Settings, Goals wizard, Habits, Wealth, Staking, Portfolio, Chess, Help edges); **1280 and 1440: 0 on all 16**. Showcase at 960: same pattern; at 1280 with all four launchers (Earn dock on): 0 covered controls on 12 pages.
- **How verdicts are used:** as in GROK53_REPLAY_L3_1.md. **CHANGED** = the main complaint is gone but a named part of the same finding remains (said in the row). **OWNER DECISION** only where an ADR-037 O-row or a recorded owner decision covers it: O2 (pricing), O3 (launchers ≥ 901 px), O4 (sidebar Apps group), O6 (Tasks/Checklist naming), and the PROTECTED list of ADR-036 ("Today hero and slogan", "Light's dark islands"; ADR-033 LA5/AF9). ADR-037 Q10 (Create goal on step 1) is a session reading, not an owner decision, so D-257 is not closed by it.

## Caveats
- The overlap sweeps measure boxes and topmost elements, not pixels; they were confirmed by screenshots at 375, 768, 1280. Below 901 px no launcher element is visible at all, so overlap there is impossible by construction (O3).
- No real phone: MO-101/N-MO-11 (band above the sticky header) were replayed in Chromium emulation, as the bot itself flagged.
- PR-041 used `page.clock.fastForward` (32 simulated minutes), not real idle time; X3-13 was clean in 40 loads (the bot saw it once in ~40).
- Hover states (D-233), the 11 px sidebar labels (BN-018) and the active rail item contrast (BN-137) were not measured.
- Scripts, outputs and screenshots: `/tmp/claude-0/final-replay-shell/` (not committed).


## Totals (counted per row of the list; D-194 is listed twice, under AL-NAV-010 and AL-NAV-011)

| verdict | ids |
|---|---|
| FIXED | 167 |
| HOLDS | 1 |
| CHANGED | 16 |
| STILL OPEN | 31 |
| OWNER DECISION | 19 |
| NOT POSSIBLE | 0 |
| NOT REPLAYED | 3 |
| **total rows** | **237** |

## Findings by AL row

### AL-COPY-066

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-003 | AL-COPY-066 | UNSEEN | CHANGED | 388 Sc (Light, Nebula) | Top of Today, Wealth, Goals: one alpha notice (dismissible once for every page) and the Showcase chip; no "Demo records" toggle above the page. Section-level Showcase lines remain (Habits "Showcase example history · fictional check-ins", Tasks "Showcase · fictional. These example tasks are not yours."). |
| D-185 | AL-COPY-066 | UNSEEN | OWNER DECISION | 388, 1280 Sc | The tagline "Today's Goals, Habits & Health = Tomorrow's Wealth" is the Today hero and slogan, on the protected list (ADR-036 PROTECTED). The disclaimers are down to one dismissible notice (see D-003). |
| D-191 | AL-COPY-066 | UNSEEN | FIXED | 1280 L Sc | Theme switch tooltips read "Light · by day", "Nebula", "Dark · by night"; no "coming later" anywhere in the switch. |

### AL-LAUNCHER-OVERLAP-001

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| BN-012 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 375 F/Sc | Chess at 375: no floating bar or launcher (S1/S2); the phone top bar is chrome and nothing fixed sits over "Play here" or any card text. |
| BN-031 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 375 F/Sc, 375 D | Governance at 375 (Nebula and Dark, S1/S3): no ZIGi mascot; nothing fixed over the network box. The Checklist pill, + and search are the phone top bar (O3 keeps the pill). |
| BN-071 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 500, 767 F/Sc | Ecosystem, Chess, Staking, Governance, Help at 500 and 767 (S1/S2): 0 launchers, 0 fixed boxes over words or buttons ("Open app ↗", chip, body text). |
| BN-110 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 375 F/Sc | S1/S2 at 375 on 20 pages: no ZIGi button floats; 0 overlaps. |
| BN-125 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 375, 768 D (+ Nebula F/Sc) | Staking in Dark at 375 and 768 (S3): 0 launchers, 0 overlaps; "Net APR assumption" and "SIGNED IN YOUR OWN WALLET" uncovered. Skeleton part belongs to BN-132 (not this row). |
| BN-128 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 375, 768 D | Ecosystem Dark 375/768 (S3): no dock over "Clear filters"; "Clear filters" is greyed only while no filter is set (disabled state). |
| BN-129 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 375, 768 D | Chess Dark 375/768 (S3): nothing over "Open Play" or the card corner. |
| BN-130 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 375, 768 D | Settings Dark 375/768 (S3): nothing over "…remain separate."; 0 sideways scroll. |
| BN-131 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 375, 768 D | Help Dark 375/768 (S3): nothing over list lines. |
| BUG-005 | AL-LAUNCHER-OVERLAP-001 | OTHER | FIXED | 335, 375 F/Sc | Today, Markets, Portfolio and 17 more pages at 335/375 (S1/S2): no floating ZIGi button; 0 overlaps. |
| B-027 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 375, 500, 767 F/Sc | S1/S2: no floating mascot below 901 px on any of 20 pages. |
| L-059 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 375 F | Earn at 375: 0 launchers, 0 overlaps (S1). Calculator (/app/wealth/calculator) at 375: every shown control is fully clear at some scroll position (elementFromPoint); the two that never were ("Raise contributions each year", "Inflation each year") sit in a closed "more" fold, not under the sticky result bar. |
| T-069 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | CHANGED | 375, 394 F | Mascot part fixed (S1: no launcher at 375/388/430). The notice part remains: at 375 and 394 the alpha notice is still one line and its "Saved in this browser only" is cut with an ellipsis (scrollWidth > clientWidth, text-overflow: ellipsis). |
| T-130 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 430 F | At 430 (S1) no mascot over any card ⋯; the menu is the phone tab bar + More (no grid). |
| D-033 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | OWNER DECISION | 960, 1280 F/Sc | O3 (ADR-037): at ≥ 901 px the floating ZIGi, Earn dock, Music and Checklist launchers stay; below 901 px nothing floats (S1/S2). The stack still covers control edges at 901–1279 px: see D-064 (STILL OPEN). |
| D-066 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 768 F/Sc | Today, Goals, Habits (+ New habit), Health at 768 (S1/S2): the ZIGi / Music / Checklist / Earn stack is gone (one "Apps & extras" button in the rail); 0 overlaps. |
| D-070 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | CHANGED | 388 F | Mascot part fixed (S1 at 388). The header icons are still icons without visible words at 388 (wallet "Wealth", lock "Unlock layout to rearrange"); they have accessible names and the lock a title "Rearrange this page". |
| D-250 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 375 F/Sc | Today, Goals, Health, Wealth at 375 first screen and scrolled (S1/S2): no mascot. |
| D-254 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 375 F/Sc | All 20 pages at 375 (S1/S2): no mascot over text or controls. |
| G-020 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 768 F/Sc | Goals list and /app/goals/new at 768 (S1/S2): no music/Checklist/ZIGi buttons; 0 overlaps on ⋯ or "Review". |
| BUG-034 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 768 F/Sc | Health quick counters at 768 (S1/S2): no floating ZIGi/music; "+" uncovered. |
| BUG-081 | AL-LAUNCHER-OVERLAP-001 | OTHER | FIXED | 375 F/Sc | Today at 375 (S1/S2): no FAB over the summary tiles. |
| D-129 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 768 F | Settings #settings-zigi at 768 (Zoom 250 % on the bot's 1920 screen): 0 launchers, 0 overlaps over the model-choice cards. |
| D-064 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | STILL OPEN | 960 F (default launchers), 960 Sc | At 960 (the bot's 200 % zoom of 1920) the ZIGi and Checklist launchers are still topmost over controls while the page scrolls (P1, elementFromPoint): Health "Increase Pull-ups" (centre) and "Star Sleep for your Checklist" (centre), Markets "Add USD Coin favourite" (centre), Settings "Data & privacy", "Your areas", inputs (edge), Ecosystem "Open app ↗", "Read docs ↗" (edge), Goals wizard "Create goal" (edge). Sidebar part: 190 px sidebar at 901–1099 by design (lane 3c), not collapsed. At 1280/1440 fresh: 0 covered controls. |
| D-113 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 768 F/Sc | Habits → New habit at 768: 0 launchers, nothing over fields or Cancel (S1/S2). |
| D-115 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 768 F/Sc | At 768 (Zoom 250 % of 1920): no dock; quick counter "+" and ⋯ uncovered (S1/S2). |
| D-117 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 768 F/Sc | Health → Log food at 768: no dock over selects (S1/S2). Star/Pin target size not re-measured here. |
| D-118 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 768 F | Health → Log water at 768: no dock over the submit (S1). The native-error part belongs to the field-error row (L10b). |
| D-119 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 768 F/Sc | Health diary meal cards at 768: no dock over "⋯" (S1/S2). |
| D-122 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 375, 768 F/Sc | Wealth "What you have" at 375/768: nothing over "Open Portfolio →" or asset ⋯ (S1/S2). |
| D-128 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 768 F/Sc | Settings → Your areas at 768: no dock over the "Remove" links (S1/S2). |
| D-138 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | CHANGED | 768 F; 1097 F | At the ~768 px the bot named: no mascot, "+" uncovered (S1). At 1097 (175 % of the 1920 screen the recipe zooms) the Checklist launcher is still topmost over the centre of Health "Increase Pull-ups" (P1). |
| D-161 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | STILL OPEN | 1097 F (Zoom 175 % of 1920) | Health → Log food at 1097: the ZIGi/Checklist launchers are topmost over the right edge of the form inputs and "Import a nutrition CSV" while scrolling (P1). At 768 nothing floats (S1). The "squeezed beside an empty void" part: form is in the right column at 1280 (diary left, Log a meal right), not re-judged. |
| D-260 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 768 F/Sc | Markets, Today, Wealth, Settings, /app/goals/new at 768 (S1/S2): no floating buttons. |
| D-121 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 768 F | Health → Weight at 768: no dock over the reading input (S1). |
| D-124 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 768 F/Sc | Portfolio and Markets at 768: Rename/Delete/Refresh uncovered (S1/S2). |
| D-137 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | CHANGED | 768 F; 1097 F | At ~768: no dock over the habit card menu (S1). At 1097 the Checklist launcher is still topmost over "Sort habits" and "Add routine" edges (P1). |
| D-157 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | STILL OPEN | 1097 F (Zoom 175 %) | Ecosystem at 1097: "Read docs ↗", "Open app ↗", "Visit website ↗" edges are under the Checklist/ZIGi launchers while scrolling (P1). "Clear filters" is greyed only while no filter is set (disabled, opacity .66); Details/⋯ part not re-judged. |
| D-162 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | CHANGED | 768 F; 1097 F | At ~768: no dock over the weight input (S1); decimals not re-judged. At 1097 the Checklist launcher is still over a Weight-view input edge and the ZIGi launcher over "Star Meditate/Fast" centres (P1). |
| L-017 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 1280×900 F; 1280 Sc | At 1280 the launchers sit in a reserved right gutter: P2 (fresh, ZIGi + Checklist) 0 covered controls on 16 pages; Showcase (3 launchers) 0 covered controls. |
| T-068 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 690 F | S1 at 690: 0 launchers, 0 overlaps on 20 pages. |
| T-145 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 768 F | S1 at 768: nothing floats; the menu is the 88 px rail, not an 18-item grid. |
| D-158 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | STILL OPEN | 1097 Sc; 960 Sc | Chess (Showcase ratings) at 960: launchers topmost over "Show the numbers", "Open on Lichess/chess.com", "Open Play" edges (P1 Showcase); at 1097 fresh over "Lichess TV" edge. The chart end point itself is not a control and was not measured; sparse-axis part not re-judged. |
| T-136 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 730 F | S1 at 730: nothing floats over content. |
| T-144 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 375 F | S1 at 375: no mascot over text. |
| DV-048a | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 640 F/Sc | At 640 (S1/S2) the 88 px rail replaces the sidebar and nothing floats: the "⋯" by Cards/Vision/Tree and the Today tiles are uncovered. |
| DV-084a | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 375 D/F | Goals at 375: "Open Goal →" uncovered; no avatar or Checklist FAB (S1). |
| DV-087b | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 375 F | Activity at 375: no avatar over the first card (S1). |
| DV-221 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 388 F (Nebula/Light) | Habits, Goals, Today at 388 (S1): no avatar over the progress bar, "+ Create a goal / Ask ZIGi" or "Your future". |
| DV-252b | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 388 F | Wealth at 388 (S1): no avatar over the sparkline or "In Goals / Available". |
| DV-254b | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 388 F | Health nourishment card at 388 (S1): no avatar over the macro tiles. |
| DV-257b | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 388 F | Journal at 388 (S1): no avatar over "5" or its caption. |
| DV-258a | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 388 F | Notes at 388 (S1): "on this device" uncovered. |
| DV-264 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 388 F | Notes at 388 (S1): no avatar over the intro. Breadcrumb part: see DV-258c. |
| DV-268b | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 768 F | Wealth at 768 (S1): no Checklist FAB or avatar over the total card. |
| DV-269b | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 768 F | Health quick counters at 768 (S1): the "+" buttons are uncovered. |
| D-136 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 640, 768 F/Sc | Goals list at 640/768 (S1/S2): no dock over the third column or controls; rail instead of the sidebar. |
| N-DV-05 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 375 F | Goals/Activity at 375 (S1): no avatar over the first card. |
| LS-H33 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 430 F | Tasks at 430: no ZIGi bubble (S1), no rail (phone shell), and the page has scroll-padding-top 64 px so anchored headings clear the sticky top bar. |
| LC-017 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 375, 768 F (width not stated) | The bot did not state a width (headless, not retested). S1 at 375/768: no ZIGi pill over any card. |
| MO-003 | AL-LAUNCHER-OVERLAP-001 | OTHER | FIXED | 768 F | Health diary at 768: no ✓/ZIGi bubbles (S1); the tab strip wraps to 2 rows with nothing clipped ("Journal settings" whole). |
| MO-032 | AL-LAUNCHER-OVERLAP-001 | OTHER | FIXED | 640 F | Health → Activity/Targets at 640 (S1): no bubbles over "Activity name"/"Minutes"/Protein target. |
| MO-069 | AL-LAUNCHER-OVERLAP-001 | OTHER | FIXED | 375 F/Sc | Health hero at 375 (S1/S2): date line uncovered. |
| MO-070 | AL-LAUNCHER-OVERLAP-001 | OTHER | FIXED | 375 F/Sc | Health diary rows at 375 (S1/S2): row "⋯" uncovered. |
| MO-073 | AL-LAUNCHER-OVERLAP-001 | OTHER | FIXED | 375 F | Health Foods form at 375 (S1): nothing over "Additional label nutrients" or Serving weight. |
| MO-077 | AL-LAUNCHER-OVERLAP-001 | OTHER | FIXED | 375 F | Health planner grocery "Add" at 375 (S1): nothing floats. |
| MO-078 | AL-LAUNCHER-OVERLAP-001 | OTHER | FIXED | 375 F | Health Targets at 375 (S1): calorie input end uncovered. |
| MO-082 | AL-LAUNCHER-OVERLAP-001 | OTHER | FIXED | 375 F | Health disclosures at 375 (S1): "Show" uncovered. |
| MO-086 | AL-LAUNCHER-OVERLAP-001 | OTHER | FIXED | 375 L/F | Health in Light at 375: nothing floats over the hero date or "Add 500 mL" (S1; theme does not change boxes). Ring-track part: N-MO-08. |
| MO-087 | AL-LAUNCHER-OVERLAP-001 | OTHER | FIXED | 768 F | Health at 768 (S1): no Checklist button over Pull-ups "+", food inputs, Insights or Planner. |
| MO-091 | AL-LAUNCHER-OVERLAP-001 | OTHER | FIXED | 768 D/F | Health water log at 768 (S1): "Remove" uncovered. |
| N-MO-10 | AL-LAUNCHER-OVERLAP-001 | OTHER | FIXED | 375, 768 F | Health Sleep at 375/768 (S1): nothing floats. |
| N-MO-12 | AL-LAUNCHER-OVERLAP-001 | OTHER | FIXED | 768 F | Health Devices at 768 (S1): nothing floats. |
| N-MO-13 | AL-LAUNCHER-OVERLAP-001 | OTHER | FIXED | 375 F | Health Weight journal at 375 (S1): "⋯" uncovered. |
| N-MO-19 | AL-LAUNCHER-OVERLAP-001 | OTHER | FIXED | 768 F | Health Fasting at 768 (S1): no Checklist circle. |
| N-MO-20 | AL-LAUNCHER-OVERLAP-001 | OTHER | FIXED | 768 F | Health Recipes at 768 (S1): caption and "4 saved" uncovered. |
| NB-043 | AL-LAUNCHER-OVERLAP-001 | OTHER | FIXED | 335 F | Habits at 335 (S1): no avatar. |
| NB-087 | AL-LAUNCHER-OVERLAP-001 | OTHER | FIXED | 335 F | Today at 335 (S1): no bubble over Coach card or habit rows. |
| NB-123 | AL-LAUNCHER-OVERLAP-001 | OTHER | FIXED | 335 F | Habits at 335 (S1): no FAB over "Today's rhythm" bar, scrolled or not. |
| NB-169 | AL-LAUNCHER-OVERLAP-001 | OTHER | FIXED | 320 F +game | Habits/Today at 320 with the game layer on (S4): 0 launchers, 0 overlaps. |
| NB-187 | AL-LAUNCHER-OVERLAP-001 | OTHER | FIXED | 320 F +game | At 320 (S4): nothing over the notice ×, "Customize Today", "Show ⌄" or habit ⋯. |
| NB-238 | AL-LAUNCHER-OVERLAP-001 | OTHER | FIXED | 300 F +game | Mascot part (this row) fixed: 0 launchers at 300 (S4). Incidental: at 300 px Today, Habits and Journey scroll 12 px sideways (below the 320 floor). |
| NB-239 | AL-LAUNCHER-OVERLAP-001 | OTHER | FIXED | 300 F +game | Journey at 300 (S4): no mascot over "Nothing is ever taken…". Journey is in More while the game layer is on. |
| N-NB-24 | AL-LAUNCHER-OVERLAP-001 | OTHER | STILL OPEN | 300 F | Quick add at 300, typed "drank 2 glasses of water": "Preview" is still grey text with no border or fill (class quiet, rgb(184,199,224) on transparent), looks disabled although it is the action. |
| PR-086 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 400 (388), 768 Sc | Health at 388/768 (S1/S2): "Edit personal targets" uncovered. |
| TK-060 | AL-LAUNCHER-OVERLAP-001 | NOT REPLAYED | FIXED | 358 F (Chrome) | ZIGi opened from Apps & extras at 358×740 (Google Chrome; bundled Chromium crashed opening the panel, as the brief warns): full-screen panel 358×740, composer at y 686–730 visible, the chat fills the rest. |
| TK-168 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 768 F/Sc | Goals cards at 768 (S1/S2): no tick FAB over ⋯ or titles. |
| TK-169 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 768 F/Sc | Wealth, coin page, Today at 768 (S1/S2): nothing over "Available" values. |
| Z18 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | FIXED | 375, 768, 782 F/Sc | Wealth, Markets, Portfolio at 375/768/782 (S1/S2): no launcher stack. |
| DV-263 | AL-LAUNCHER-OVERLAP-001 | UNSEEN | HOLDS | 388 L F | Positive (Journal Light readable) still holds; the avatar it mentions is gone (S1). |

### AL-LAYOUT-375-011

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-065 | AL-LAYOUT-375-011 | UNSEEN | FIXED | 768 Sc | At 768 the navigation is the 88 px rail (fixed, full height); no icon grid above the page; 0 sideways scroll. |
| D-252 | AL-LAYOUT-375-011 | UNSEEN | FIXED | 375, 388 F (Nebula, Light) | Page title top at 226–267 px on Today, Goals, Habits, Health, Wealth (was ~380); Journal 160, Notes 183. Top bar 0–52, first-visit notice 60–116 (dismissible), lock row 122–178. |
| D-261 | AL-LAYOUT-375-011 | UNSEEN | FIXED | 768 Sc | 768: the rail is fixed at the left (0–88 px, full height); the page starts at the top (no 12-item grid). |
| M-074 | AL-LAYOUT-375-011 | UNSEEN | FIXED | 512 Sc | 512: phone top bar + 5-tab bar; no 15-tile grid; Habits title at y 234. |
| D-109 | AL-LAYOUT-375-011 | UNSEEN | FIXED | 512, 768 Sc | No navigation grid at 512 (phone bars) or 768 (rail). |
| DV-223 | AL-LAYOUT-375-011 | UNSEEN | CHANGED | 388 F (Light, Nebula) | Heading now at ~230 px (was ~370) and the rocket moved off phones (Game layer is a row in Apps & extras), the notice is dismissible once for every page. Still three stacked rows before the title: top bar (0–52), notice (60–116), the lock row (122–178). |
| DV-247 | AL-LAYOUT-375-011 | UNSEEN | CHANGED | 768 Sc; 388 F | Dismissing the notice once hides it on every page (checked on Habits and Wealth after closing on Goals). The rocket and lock are still icon-only at 768 (names "Game layer: on", "Unlock layout to rearrange"; the lock has a tooltip "Rearrange this page", the rocket none). |
| DV-257c | AL-LAYOUT-375-011 | UNSEEN | STILL OPEN | 375, 388 F | The status row with the lock shows on Today, Goals, Habits, Health, Wealth (and Staking, Journey) but not on Journal or Notes (row height 0 there). |
| DV-258c | AL-LAYOUT-375-011 | UNSEEN | STILL OPEN | 375, 388, 500 F/Sc | Notes still shows "Back to Today" top-left; the other 11 pages checked show the logo ("ZIGoals home"). |

### AL-LAYOUT-375-012

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-167 | AL-LAYOUT-375-012 | UNSEEN | FIXED | 410, 375 F | Goal wizard "Test goal", 10, steps 2–4 at 410 and 375: one column (344 / 309 px), no clipped label, all four step labels on screen, 0 launchers, 0 sideways scroll. |
| D-257 | AL-LAYOUT-375-012 | UNSEEN | STILL OPEN | 375, 410 F | Step 1 at 375 still shows Back (disabled), "Continue →" and "Create goal" together, and the idea list is still an inner scroller (goal-choice-tiles 260 px tall, 360 px of content). ADR-037 Q10 records Create goal on step 1 as a session reading (AK FR-1), not an O-row owner decision. |
| BUG-033 | AL-LAYOUT-375-012 | UNSEEN | FIXED | 375×844 D F | Health at 375 Dark: scrollWidth 375; clicked the body and pressed ArrowRight 12×: scrollX stays 0. |
| D-069 | AL-LAYOUT-375-012 | UNSEEN | FIXED | 384 F | Today and Health Insights at 384: 0 sideways scroll (rows scroll inside themselves). |
| B-029 | AL-LAYOUT-375-012 | UNSEEN | FIXED | 375 D F | Bottom tabs all 72 px wide, the active (Health) included. |
| MO-068 | AL-LAYOUT-375-012 | OTHER | FIXED | 375×844 D F | Same steps as BUG-033: no sideways pan, no dark strip (scrollWidth 375, scrollX 0). |
| N-MO-30 | AL-LAYOUT-375-012 | OTHER | FIXED | 375 D F | Health → Diary → "Log a meal" sheet at 375: sheet 0–375, 0 controls past its edge, no inner sideways scroll. |

### AL-LAYOUT-768-004

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-132 | AL-LAYOUT-768-004 | UNSEEN | STILL OPEN | 768 Sc | /app/goals/new at 768: a decorative dark panel (x 108–308, 200 px ≈ 31 % of the 640 px column) still sits left of the step-1 form (346–747). |
| D-263 | AL-LAYOUT-768-004 | UNSEEN | FIXED | 768 Sc | Goals, Today, Wealth at 768: normal scale, scrollWidth 768, heroes inside the column. |
| D-111 | AL-LAYOUT-768-004 | UNSEEN | FIXED | 768 Sc | Goals list at 768: two columns of ~309 px; nothing cramped or clipped. |
| D-139 | AL-LAYOUT-768-004 | UNSEEN | STILL OPEN | 768 Sc | Wizard step 1 at 768: the art column is still ~1/3 (200 of 640 px), and the idea cards' titles are not aligned ("Holiday fund" starts ~40 px right of "Emergency fund"). |
| G-023 | AL-LAYOUT-768-004 | UNSEEN | STILL OPEN | 768 Sc | Same steps as D-132: the empty art strip on the left of step 1 takes ~31 % of the width. |
| D-135 | AL-LAYOUT-768-004 | UNSEEN | FIXED | 768 Sc | Today at 768: 88 px rail + one 640 px column; no sidebar + main + right rail; nothing floats. |
| N-127 | AL-LAYOUT-768-004 | OUT OF SCOPE | NOT REPLAYED | — | The bot's own list retracts it (nairobi.md: "excluded by the list (retracted)"); no steps. |
| BUG-051 | AL-LAYOUT-768-004 | UNSEEN | CHANGED | 768 Sc | Portfolio at 768: the page no longer scrolls sideways (scrollWidth 768), but the holdings table is 1310 px wide inside a 578 px section that scrolls on its own. |
| N-153 | AL-LAYOUT-768-004 | UNSEEN | NOT REPLAYED | — | No steps or detail in the bot files ("Layout @768 — MINOR (re-confirms N-076)"). The 768 sweeps (S1/S2) found no sideways scroll or overlap. |
| T-146 | AL-LAYOUT-768-004 | UNSEEN | FIXED | 768 Sc | Heroes at 768: Today title 600 px wide, Goals/Habits/Health 458 px beside their art; no narrow column beside an empty side. |
| T-148 | AL-LAYOUT-768-004 | UNSEEN | FIXED | 375 → 768 Sc | Opened More at 375, widened to 768: the phone More sheet is gone (not left half-width). |
| D-116 | AL-LAYOUT-768-004 | UNSEEN | FIXED | 768, 512 Sc | Health summary cards at 768 and 512: one per row (590 / 450 px), no clipped coach text. |
| D-120 | AL-LAYOUT-768-004 | UNSEEN | FIXED | 768, 512 Sc | Health Sleep at 768: forms 460–578 px wide; "Remove the goal" button whole (264 px), nothing clipped. |
| D-127 | AL-LAYOUT-768-004 | UNSEEN | FIXED | 768×420 Sc | Settings scrolled at 768×420: the sticky section bar is 57 px of 420 (13.6 %), was ~35 %. |
| D-125 | AL-LAYOUT-768-004 | UNSEEN | FIXED | 768 Sc | Ecosystem filter row at 768: "Clear filters" whole (290 px, not clipped); greyed (opacity .66, disabled) only while no filter is set. |
| D-134 | AL-LAYOUT-768-004 | UNSEEN | CHANGED | 768, 375 F | The hero's 3-up row (Your goals / Your future / Onchain) fits at 768 and stacks at 375. Quick add is still offered twice (top bar "+ Quick add" and the hero's "+ Quick add"; the Today hero is on the protected list, ADR-036). |
| NB-245 | AL-LAYOUT-768-004 | OTHER | FIXED | 610 Sc | 610 px: 88 px rail, 490 px column; Habits lede 490 px wide, 2 lines (was ~60 px, 9 lines); nothing floats. |

### AL-NAV-009

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-162 | AL-NAV-009 | UNSEEN | FIXED | 375, 1280 F | O6 (naming in copy only): Checklist reads "Today's short list: the few things you starred", Tasks "Everything to do, by day, project or goal"; Tasks is in the desktop sidebar's Apps group, the rail, More and Apps & extras. |
| DV-255 | AL-NAV-009 | UNSEEN | FIXED | 375 F, 500 Sc | More/Apps subtitles: Checklist "Today's short list: the few things you starred", Tasks "Everything to do, by day, project or goal", Notes "Quick thoughts to keep and sort later", Status & wallet "The Alpha's status and your wallet"; NOVA labelled "Your whole day on one screen, with your own AI". |

### AL-NAV-010

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| BN-072 | AL-NAV-010 | UNSEEN | FIXED | 500 Sc (game on) | More at 500: one Journey row ("Your level, quests and badges"). |
| BN-133 | AL-NAV-010 | UNSEEN | FIXED | 1280, 768, 375 F/Sc | 1280 sidebar now holds NOVA, Tasks, Notes, Journal, Agenda (Apps group); 768 rail NOVA, Checklist, Tasks, Notes, Journal (+ Agenda in Apps & extras). 375 top bar identical on Chess, Ecosystem, Settings, Help, Staking, Earn, Governance (Checklist button the same everywhere). |
| M-066 | AL-NAV-010 | UNSEEN | FIXED | 1280 F | /app/goals/does-not-exist-123: "Goal unavailable." with "Back to goals"; /app/goals/tracked/abc: "Back to your Goals", "Create a goal". |
| D-249 | AL-NAV-010 | UNSEEN | OWNER DECISION | 1280 Sc | O4 (ADR-037): Journey, Life review, Stories and the ZIGi states stay out of the sidebar. Settings → Your pages names Journey; Help links /app/review. The "logged days differ" part was not replayed. |
| D-004 | AL-NAV-010 | UNSEEN | FIXED | 1024×594 F | Settings (bottom 494) and Help (538) are above the 594 px fold; the Apps group from Journal (782) and the theme radios (1294) need the sidebar's own scroll. |
| D-217 | AL-NAV-010 | UNSEEN | FIXED | 1280 F | Settings preview "Sidebar: Today, Goals, Habits, Health, Wealth, Activity, Checklist, Settings, Help; its Apps group: NOVA, Tasks, Notes, Journal, Agenda" matches the real 1280 sidebar item for item. |
| D-023 | AL-NAV-010 | UNSEEN | FIXED | 1280 F | Health hero now has "Log water": it focuses #health-water-amount (y 323). |
| DV-045c | AL-NAV-010 | UNSEEN | FIXED | 1280 F | Preview lists NOVA and Checklist as the sidebar does (Journey shows only with the game layer on). |
| DV-095 | AL-NAV-010 | UNSEEN | FIXED | 375 Sc | More: one Journey row; NOVA is "Your whole day on one screen, with your own AI". |
| DV-157 | AL-NAV-010 | UNSEEN | FIXED | 768, 1280 F | Tasks, Notes, Journal in the 768 rail and in the 1280 sidebar (Apps group). |
| DV-163a | AL-NAV-010 | UNSEEN | FIXED | 1280 F | Tasks is in the desktop sidebar (Apps group). |
| DV-189 | AL-NAV-010 | UNSEEN | FIXED | 1280 F | Journal, Notes, Agenda, Tasks are in the desktop sidebar's Apps group. |
| DV-245 | AL-NAV-010 | UNSEEN | FIXED | 1280, 768, 375 F | Tasks, Notes, Journal at every width; Agenda in the 1280 Apps group and in Apps & extras at 768 and 375 (not in the rail itself). |
| DV-274 | AL-NAV-010 | UNSEEN | CHANGED | 768, 388 F | Preview now names NOVA, Checklist, Tasks, Notes, Journal in More; it still omits two real More rows ("More pages", "Status & wallet"), and the Governance note still reads "On this device. It shows while Staking shows; Earn links to it either way." |
| N-DV-11 | AL-NAV-010 | UNSEEN | FIXED | 1280, 768, 375 F | Agenda: desktop sidebar Apps group; Apps & extras at 768 and on phones. |
| NB-028 | AL-NAV-010 | OTHER | CHANGED | 1280 F + game layer on | Journey no longer enters the desktop sidebar (O4). But the Checklist entry is still added after load: not in the server HTML at DOMContentLoaded (Settings @406, Help @450), inserted ~1.2 s after navigation start, moving Settings to 450 and Help to 494 (44 px). |
| NB-045 | AL-NAV-010 | OTHER | CHANGED | 375 F, 375 Sc | One Journey row now. "Status & wallet" is still a More row ("The Alpha's status and your wallet"). |
| X3-13 | AL-NAV-010 | UNSEEN | FIXED | 375 F | Health loaded 40 times at 375: the same tab bar every time (Today/Goals/Habits/Health/Wealth), slowest 726 ms, no stuck skeleton. Caveat: the bot saw it once in ~40. |
| X3-17 | AL-NAV-010 | UNSEEN | FIXED | 768 F/Sc | 768: Apps & extras holds the Light/Nebula/Dark radios; 375: More holds them; 1280: sidebar. |
| X3-22 | AL-NAV-010 | UNSEEN | FIXED | 1280 F | Same steps as DV-045c. |
| X3-25 | AL-NAV-010 | UNSEEN | FIXED | 1280, 768, 375 F | Same steps as DV-245. |
| N-PR-02 | AL-NAV-010 | UNSEEN | FIXED | 1280, 375 F | /app/tasks is in the sidebar Apps group, the rail, More and Apps & extras. |
| D-194 | AL-NAV-010 | UNSEEN | STILL OPEN | 1280 F/Sc (Nebula; theme does not change the DOM) | Right-hand cluster at 1280 fresh: Goals "Game layer, Unlock layout"; Habits "Vacation, Game layer, Unlock layout"; Earn, Portfolio, Help, Governance "Game layer" only; Health "Game layer, Unlock layout". The lock is still missing on Earn, "Vacation" still only on Habits. |

### AL-PERSISTENCE-011

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-010b | AL-PERSISTENCE-011 | UNSEEN | FIXED | 1280 Sc (Chrome) + another tab writing | Goal 9201 → Fund Goal → Cash; typed asset name "DV Savings" and amount 200; another tab of the same profile wrote localStorage: the dialog stayed open and kept "DV Savings", "200", "USD". |
| DV-020b | AL-PERSISTENCE-011 | UNSEEN | FIXED | 1280 Sc | Goals 9201, 9202, 9203, 9205: opened Milestones and ticked three boxes in a row — the fold stayed open after every tick (then unticked them). |
| DV-025h | AL-PERSISTENCE-011 | UNSEEN | STILL OPEN | 1280 Sc | Goal 9201 → "Edit goal details", changed the notes, "Save Goal details": toast "Goal details saved." and the fold closes (open = false), so a second edit needs reopening. |
| MO-005 | AL-PERSISTENCE-011 | OTHER | FIXED | 1280 F (isolated profile + another tab writing) | Health → "Quick add a food that is not in your library", typed "Ba", waited 9 s, then another tab of the same profile wrote localStorage: the fold stayed open, "Ba" kept, Diary tab unchanged. |
| MO-134 | AL-PERSISTENCE-011 | OTHER | FIXED | 1280 Sc (Chrome) + another tab writing | Health → Foods & recipes → New recipe, recipe name "Smoothie", waited 20 s, then another tab of the same profile wrote localStorage: the name was kept and the tab stayed "Foods & recipes" (no reset to Diary). |
| PR-011 | AL-PERSISTENCE-011 | UNSEEN | FIXED | 1280 Sc (Chrome), clock +32 min | ZIGi opened from the launcher on Habits, asked "How are my habits this week?" (on-device answer); page.clock fast-forwarded 12 + 20 min: 0 page navigations, panel still open, question and answer kept. |
| PR-013 | AL-PERSISTENCE-011 | UNSEEN | FIXED | 1280 Sc (Chrome) | /app/nova: the guide link ("Start/Continue the guide") opens /app/nova/setup in 348 ms. |
| PR-025 | AL-PERSISTENCE-011 | UNSEEN | FIXED | 1280 Sc (Chrome), clock +32 min | Same steps as PR-011; closing and reopening ZIGi shows the earlier question again (history kept). |
| PR-041 | AL-PERSISTENCE-011 | UNSEEN | FIXED | 1280 Sc (Chrome), clock +32 min | Same steps as PR-011: after a simulated 32 min idle the panel is still open with the chat. Caveat: clock fast-forward, not 10 real minutes. |
| PR-050 | AL-PERSISTENCE-011 | UNSEEN | FIXED | 1280 F/Sc | Wealth "+ Add asset": a scripted click opens the form in ~0.65 s; focus + Enter opens "Choose an asset". |
| PR-062 | AL-PERSISTENCE-011 | UNSEEN | FIXED | 1280 F | Habits → "+ New habit", title "Replay walk", one click on "Create habit": the habit is created (title shown on the page). |

### AL-PRICING-001

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| N-092 | AL-PRICING-001 | UNSEEN | FIXED | 1280 F | /app/plans: "Plans", ZIGoals €20 and ZIGoals Premium €50, one-time placeholders, "Free during the Alpha". /app/upgrade, /app/premium, /app/pricing, /app/billing redirect to it; /app/subscribe and top-level /pricing still 404. |
| D-186 | AL-PRICING-001 | UNSEEN | FIXED | 1280 F | A plan page exists (/app/plans) and is linked from Settings ("Plan — Alpha: everything free →") and the Premium badge. The top-level /pricing, /plans, /premium, /upgrade the bot tried still 404 (only /app/… aliases redirect). |
| MO-043 | AL-PRICING-001 | OTHER | FIXED | 1280 F | Settings' "Premium · free during the Alpha" is now a link to /app/plans; Plans and Help's "What does it cost?" say ZIGoals bills nothing and name the €50 Premium placeholder — no contradiction. |
| MO-044 | AL-PRICING-001 | OTHER | FIXED | 1280 F | Settings has a "Plan — Alpha: everything free →" row; /app/plans shows prices (€, one-time, placeholder), what each plan includes, and that nothing is charged; /app/pricing redirects there. |
| MO-045 | AL-PRICING-001 | OTHER | OWNER DECISION | 1280 F | Landing part: O2 says pricing is not on the landing. In the app the Plan row and Plans page give the "free during the Alpha" statement. |
| MO-118 | AL-PRICING-001 | OTHER | FIXED | 1280 F | Same sweep: a plan surface now exists (Settings row, badge link, /app/plans, Help "What does it cost?"); nothing is gated (O2: everything free). |
| M-018 | AL-PRICING-001 | OTHER | FIXED | 1280 F | The Premium badge links to Plans, which states the placeholder price, that Premium is free during the Alpha and that nothing is charged. |
| C-MO-45 | AL-PRICING-001 | OTHER | FIXED | 1280 F | Plan page: /app/plans. |
| C-MO-46 | AL-PRICING-001 | OTHER | FIXED | 1280 F | One currency and period: €20 / €50 "one-time · placeholder", "Prices are shown in euros only". |
| C-MO-47 | AL-PRICING-001 | OTHER | OWNER DECISION | — | O2 (ADR-037): placeholder one-time prices, "Alpha: everything free"; no payment code, checkout, buy button, server or account; everything is free during the Alpha, so there is no trial. |
| C-MO-48 | AL-PRICING-001 | OTHER | OWNER DECISION | — | O2 (ADR-037): placeholder one-time prices, "Alpha: everything free"; no payment code, checkout, buy button, server or account: nothing to restore. |
| C-MO-49 | AL-PRICING-001 | OTHER | OWNER DECISION | — | O2 (ADR-037): placeholder one-time prices, "Alpha: everything free"; no payment code, checkout, buy button, server or account: nothing is locked during the Alpha. |
| C-MO-50 | AL-PRICING-001 | OTHER | FIXED | 1280 F | Upgrade entry: the Premium badge and Settings' Plan row both open /app/plans. |
| C-MO-51 | AL-PRICING-001 | OTHER | OWNER DECISION | — | O2 (ADR-037): placeholder one-time prices, "Alpha: everything free"; no payment code, checkout, buy button, server or account. |
| C-MO-52 | AL-PRICING-001 | OTHER | FIXED | 1280 F | Plans compares ZIGoals (Today, Goals, Habits, Health, Wealth, Checklist, Tasks, Notes, Journal, Agenda, NOVA, Markets/Portfolio/Earn, Journey, Music, themes, backups) with Premium (everything plus ZIGi and NOVA's premium features). |
| C-MO-53 | AL-PRICING-001 | OTHER | OWNER DECISION | — | O2 (ADR-037): placeholder one-time prices, "Alpha: everything free"; no payment code, checkout, buy button, server or account: no receipts without payments. |
| C-MO-54 | AL-PRICING-001 | OTHER | OWNER DECISION | — | O2 (ADR-037): placeholder one-time prices, "Alpha: everything free"; no payment code, checkout, buy button, server or account; plans are "Pay once, keep it. No subscription." |
| N-MO-01 | AL-PRICING-001 | OTHER | CHANGED | 1280 F | Help's "What does it cost?" now explains ZIGoals Premium (€50 placeholder, ZIGi and NOVA's premium features) and Plans says "Spotify Premium" is Spotify's. Help still has both "It is Premium, free during the Alpha" (ZIGi) and the bare "Spotify needs Premium" (Known limitations). |
| N-MO-02 | AL-PRICING-001 | OTHER | STILL OPEN | 1280 F | Plans and Help say everything is free during the Alpha and "When paid plans begin is not decided yet"; nothing says whether Alpha users keep their features afterwards. |
| C-NB-06 | AL-PRICING-001 | OTHER | FIXED | 1280 F | Premium and pricing are explained on /app/plans and in Help's "What does it cost?", linked from Settings and the badge. |

### AL-THEME-003

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-175 | AL-THEME-003 | UNSEEN | FIXED | 1280 L Sc | Goals cards in Light: the gradient words ("fund", "deposit", "adventure", ".00") are a deeper violet that reads on white (H130 deepening); chips and rings legible. Night-scene art: see DV-029c. |
| D-181 | AL-THEME-003 | UNSEEN | FIXED | 1280 L Sc | Chess and Activity in Light: no low-contrast text on solid surfaces (0 hits), headings readable. |
| D-177 | AL-THEME-003 | UNSEEN | FIXED | 1280 L Sc | Earn, Markets, Portfolio in Light: 0 low-contrast hits; gradient words deepened; selected chip cyan-outlined. |
| DV-031b | AL-THEME-003 | UNSEEN | STILL OPEN | 1280 L F | Created goal "🎯 Replay trip": on its page in Light the 🎯 renders as a solid black disc (it sits in span.nebula-flow with -webkit-text-fill-color transparent and background-clip text). |
| DV-051a | AL-THEME-003 | UNSEEN | FIXED | 1280 L Sc | Same steps as D-175: card titles, ".00" and the "Goals" H1 are readable violet, not near-invisible lilac. |

### AL-THEME-004

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| BN-018 | AL-THEME-004 | UNSEEN | OWNER DECISION | 1280 L Sc | The rail is now light in Light; the dark hero/wallet cards remain as Light's dark islands, on the protected list (ADR-036 PROTECTED "Light's dark islands"; ADR-033 LA5/AF9). (The 11 px sidebar-label part was not measured.) |
| BN-076 | AL-THEME-004 | UNSEEN | OWNER DECISION | 767 L | Earn's dark path panel is a Light island by decision (ADR-036 PROTECTED "Light's dark islands"; ADR-026 F14). |
| BN-137 | AL-THEME-004 | UNSEEN | STILL OPEN | 768 L F | The rocket ("Game layer") button in Light: darkest icon pixel vs its tile 2.06:1, tile vs page 1.0:1 (pixel sampling on Governance) — still faint. Dock part fixed (nothing floats at 768). Active rail item not measured. |
| D-063 | AL-THEME-004 | UNSEEN | STILL OPEN | 1280×800 L Sc | The dark hero block is a protected Light island (ADR-036 PROTECTED "Light's dark islands", owner decision). The other half still shows: the theme radios sit at the sidebar bottom (y 1250 of 1320 in an 800 px window), below the fold. |
| D-182 | AL-THEME-004 | UNSEEN | OWNER DECISION | 1280 L Sc | Staking's "No public wallet yet" card: compact (one block), white text on its dark island; the island itself is protected (ADR-036; ADR-033 LA5). |
| D-233 | AL-THEME-004 | UNSEEN | OWNER DECISION | 1280 L F | The dark dock circles are an AF9 island (ADR-033 LA5: "the hero, Staking's card, the dock"). Selected chip is now cyan-outlined (not pale grey-blue); hover not measured. |
| D-176 | AL-THEME-004 | UNSEEN | NOT REPLAYED | 1280 L Sc | Needs a service: Wealth's and Markets' reference prices come from /api (blocked with 503 here), so the two price formats cannot be compared; Markets shows "Some market data could not refresh". |
| D-174 | AL-THEME-004 | UNSEEN | OWNER DECISION | 1280 L Sc | Today hero and wallet stay dark islands (ADR-036 PROTECTED: Today hero, Light's dark islands). |
| D-183 | AL-THEME-004 | UNSEEN | FIXED | 1280 L Sc | Ecosystem in Light: project logo tiles render (Valdora mark), not blank white squares. |
| DV-029c | AL-THEME-004 | UNSEEN | OWNER DECISION | 1280 L Sc | Goal card art stays night scenes in Light: ".goal-card-art" is one of Light's island classes (public/themes/light.css scope list; ADR-026 F14, ADR-036 PROTECTED). |
| DV-225 | AL-THEME-004 | UNSEEN | OWNER DECISION | 388 L | Today hero dark in Light: protected (ADR-036). |
| N-DV-04 | AL-THEME-004 | UNSEEN | OWNER DECISION | 1280 L Sc | Same as DV-029c. |
| N-TK-14 | AL-THEME-004 | NOT REPLAYED | OWNER DECISION | 1280 L Sc | Goals hero/card art stays a night scene in Light (".goal-card-art" is in light.css's island scope; ADR-036 PROTECTED). The sidebar foot keeps its night swan art (sidebar sky island, ADR-026 F14). |

### AL-THEME-005

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-179 | AL-THEME-005 | UNSEEN | CHANGED | 1280×800 L Sc | Body text and eyebrows on Governance, Health, Habits are 14–18 px with 0 low-contrast hits on solid surfaces. The sidebar theme switch is still below the fold at 800 px height (radios at y 1250). |
| D-180 | AL-THEME-005 | UNSEEN | FIXED | 1280 L Sc | Checklist (redesigned full-screen orbit) in Light: "Morning Orbit 1 of 2" banner whole under the header; no empty page; no XP label to lose. |
| D-189 | AL-THEME-005 | UNSEEN | FIXED | 1280 L Sc | Health → Log food in Light: "Search quick picks" has a 1 px rgb(194,203,219) border; Star/Favourite/Pin buttons 44×44, 52×46, 60×46; helper text rgb(14,25,38). |
| D-198 | AL-THEME-005 | UNSEEN | FIXED | 1280 D Sc | Settings, Chess, Help in Dark: 0 text under 12 px in main; 0 low-contrast hits on solid surfaces. |
| D-178 | AL-THEME-005 | UNSEEN | FIXED | 1280 L Sc | Habits "Your last 30 days" in Light: every cell a filled purple/gradient tile with white numbers and a 4-state legend (None / Under half / Most / All scheduled done). |
| D-192 | AL-THEME-005 | UNSEEN | FIXED | 1280 D Sc | Same heatmap in Dark: purple cells with white numbers, "All done" cells pale lavender with dark numbers; readable. |
| D-197 | AL-THEME-005 | UNSEEN | FIXED | 1280 D Sc | Checklist "Orbit consistency · last 12 weeks" in Dark: "Nothing" is an outlined square, "Some orbits" purple, "All orbits" cyan — clearly different. (The Checklist sky is protected and the same in every theme.) |

### AL-LAYOUT-DESKTOP-017

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-029a | AL-LAYOUT-DESKTOP-017 | UNSEEN | STILL OPEN | 1280×800 F | The theme radios sit at the sidebar bottom (y 1250 of a 1320 px sidebar in an 800 px window), so reaching them scrolls the logo out; after the switch the sidebar stays scrolled (scrollTop 520 before and after) and the Z logo stays cut off (top −504). |
| DV-051c | AL-LAYOUT-DESKTOP-017 | UNSEEN | FIXED | 1280×800 F | Switched Nebula → Light from the sidebar radios: scrollTop 520 before and 520 after; no jump. |

### AL-NAV-011

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| M-075 | AL-NAV-011 | UNSEEN | FIXED | 375 F/Sc | Journey's phone top bar title is "Journey". |
| D-013 | AL-NAV-011 | UNSEEN | STILL OPEN | 1280 F/Sc | Same steps as D-194: Portfolio, Help, Earn, Governance lack the layout lock that Goals, Habits, Health show; sets differ per page. (Phones: the top bar is the same on every page.) |
| D-194 | AL-NAV-011 | UNSEEN | STILL OPEN | 1280 F/Sc (Nebula; theme does not change the DOM) | Right-hand cluster at 1280 fresh: Goals "Game layer, Unlock layout"; Habits "Vacation, Game layer, Unlock layout"; Earn, Portfolio, Help, Governance "Game layer" only; Health "Game layer, Unlock layout". The lock is still missing on Earn, "Vacation" still only on Habits. |

### AL-NAV-012

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-029b | AL-NAV-012 | UNSEEN | STILL OPEN | 1280 F | Sidebar theme radios are still icon-only (no visible text; names "Light theme / Nebula theme / Dark theme", tooltip "Nebula"). Settings → Theme has words and a caption per theme. |
| DV-051b | AL-NAV-012 | UNSEEN | STILL OPEN | 1280 F | Same steps as DV-029b: no visible label or current-state text on the sidebar switch. |
| DV-096 | AL-NAV-012 | UNSEEN | FIXED | 1280 Sc | Settings has a tile titled "Theme" (separate from "Motion"); phones have the radios in More. |
| DV-244 | AL-NAV-012 | UNSEEN | FIXED | 768 F/Sc | 768: Apps & extras (rail) holds the theme radios. |
| LS-H34 | AL-NAV-012 | UNSEEN | STILL OPEN | 1280×800 F | Theme radios at y 1250 in a sidebar 1320 px tall (800 px window): still at the bottom, below the Apps group, reached only by scrolling the sidebar. |
| MO-157 | AL-NAV-012 | OTHER | FIXED | 768 F | Same steps as DV-244. |
| N-MO-22 | AL-NAV-012 | OTHER | FIXED | 768 F, Light saved | The page head loads /theme-boot.js synchronously before <body> (byte 14215 vs 14440); it sets data-theme and adds the Light sheet with blocking="render", so the first paint is Light. Final body background rgb(247,247,251). |

### AL-NAV-013

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| X3-06 | AL-NAV-013 | UNSEEN | FIXED | 1280 F | Fresh Markets: "Markets isn't in your menu yet. Add to menu"; no "is off" banner contradicting the open page. |

### AL-PERF-010

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-247 | AL-PERF-010 | OTHER | FIXED | 610 fresh context, CSS delayed 3 s | First load of /app/welcome in a new context with every .css response held 3 s: at 1.5 s the page already paints the styled shell (rail, top bar, notice, skeleton); no raw blue links or double logo. |

### AL-THEME-006

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-203 | AL-THEME-006 | UNSEEN | STILL OPEN | 1280 D/Nebula Sc | Goals and Activity: Dark = black (body rgb(0,0,0)) starfield, Nebula = navy (rgb(2,9,24)) starfield with a faint haze; cards, sidebar and art identical. Side by side they still look nearly the same. |
| DV-226 | AL-THEME-006 | UNSEEN | STILL OPEN | 388 D/Nebula Sc | Habits at 388 in Dark and Nebula: identical except black vs navy background. |
| LS-H39 | AL-THEME-006 | UNSEEN | STILL OPEN | 1280 D/Nebula Sc | Tasks in Dark and Nebula: same layout, same selected-row colour; only the background tint differs. Positive part (no contrast/overflow issue) holds. |
| NB-031 | AL-THEME-006 | OTHER | STILL OPEN | 1280 L F | Settings → Your pages, "Cycle log" (off) in Light: dark knob on a pale track rgb(238,242,249) with a 35 % light-blue edge on a pale card — the track still barely shows. Sidebar swan art stays night-dark (island, ADR-026 F14). |
| NB-055 | AL-THEME-006 | OTHER | FIXED | 1280 L Sc | The shared length counter in Light is a white pill with rgb(59,70,89) text ("4 / 80" on the goal name, ~10:1). The habit title itself no longer carries a counter (no maxLength). |
| N-NB-03 | AL-THEME-006 | OTHER | STILL OPEN | 1280, 388 D Sc | Same steps as DV-203: Dark keeps the starry background; only the base turns black. |

### AL-THEME-007

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| MO-035 | AL-THEME-007 | OTHER | FIXED | 1280 L Sc | Health → Weight in Light: "Your readings" line deep teal and the goal line solid amber on the pale card, both clearly visible; legend dots match. |
| MO-090 | AL-THEME-007 | OTHER | STILL OPEN | 1280 L Sc | Insights footer in Light: link colour rgb(1,20,14) vs text rgb(9,16,26) (~1.1:1, unchanged); links are underlined (1.4.1 met). The launcher part at 375 is fixed (nothing floats). |
| BUG-046 | AL-THEME-007 | OTHER | STILL OPEN | 1280 L Sc | Same steps as MO-090. |
| N-MO-08 | AL-THEME-007 | OTHER | STILL OPEN | 1280 L Sc | Health water ring in Light: track stroke rgba(28,44,72,0.15) on the pale card ≈ rgb(208,213,222) on rgb(240,243,249), the same ~1.3:1 the bot measured. |
| N-MO-21 | AL-THEME-007 | OTHER | FIXED | 768 D Sc | Health → Foods & recipes → New recipe at 768 Dark: the disabled "Save recipe" is a flat dark button with a dashed edge; label rgb(213,219,234) on rgb(28,32,48) ≈ 11.7:1 (pixel sampling), no gradient under it. |

### AL-COPY-067

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| TK-183 | AL-COPY-067 | NOT REPLAYED | FIXED | 1280 L Sc | With Light selected the caption reads "Light is ZIGoals by day: bright pages, the same nebula colours a shade deeper. Nebula and Dark are its night looks." |

### AL-LAYOUT-375-013

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| MO-101 | AL-LAYOUT-375-013 | OTHER | FIXED | 375×844 L F | Health Targets, Sleep, Planner in Light: scrollIntoView on the last six controls of each; the top bar stays at y 0 every time (no band); visualViewport offset 0. Same caveat as the bot: Chromium emulation, not a phone. |
| N-MO-11 | AL-LAYOUT-375-013 | OTHER | FIXED | 375 L F | Same steps as MO-101 (Sleep): no strip above the sticky top bar. |

### AL-MOTION-002

| finding id | AL row | previous verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-075 | AL-MOTION-002 | OTHER | CHANGED | 1280×800 D/L F | Light ↔ Dark applies in ~0.2 s (data-theme settled in 194 ms; no transition); the 30-day grid uses the same states in both themes (today "Most" in both). Still: the switch sits below the sidebar fold at 800 px (y 1250). |
| NB-086 | AL-MOTION-002 | OTHER | FIXED | 1280 L F | Dark → Light on Today: 150 ms after the click the page is already Light (no half-dark mid-transition; the hero is a protected dark island). |

## STILL OPEN

Exact steps per id (conditions as in the header; every run with /api answered 503, en-GB, Europe/Brussels, clock 4 Nov 2026 03:00).

- **D-064** (AL-LAUNCHER-OVERLAP-001): Window 960 px wide (200 % zoom of 1920), fresh profile, Nebula. Open /app/health and scroll to Quick counters: the Checklist launcher sits on the centre of Pull-ups "+" ("Increase Pull-ups"); the ZIGi launcher on "Star Sleep for your Checklist". Same on /app/markets ("Add USD Coin favourite"), /app/settings ("Data & privacy", inputs), /app/ecosystem ("Open app ↗", "Read docs ↗"). Expected: nothing floating over a control at 901–1279 px (the gutter exists only from 1280).
- **D-161** (AL-LAUNCHER-OVERLAP-001): Window 1097 px (175 % of 1920), fresh. /app/health → Log food, scroll the form: ZIGi/Checklist launchers cover the right edge of the form inputs and "Import a nutrition CSV".
- **D-157** (AL-LAUNCHER-OVERLAP-001): Window 1097 px, fresh. /app/ecosystem, scroll to the first project cards: "Read docs ↗", "Open app ↗", "Visit website ↗" pass under the Checklist/ZIGi launchers (right edge covered).
- **D-158** (AL-LAUNCHER-OVERLAP-001): Window 960–1097 px, Showcase. /app/chess, scroll to the ratings card: launchers cover the right edge of "Show the numbers", "Open on Lichess/chess.com", "Open Play".
- **N-NB-24** (AL-LAUNCHER-OVERLAP-001): Width 300 (or any phone), fresh. Tap "+ Quick add", type "drank 2 glasses of water": "Preview" is grey text (rgb(184,199,224)) with no border or fill, looks disabled though it is the action.
- **DV-257c** (AL-LAYOUT-375-011): 375/388, fresh. Open /app/wealth and /app/health: a lock button ("Unlock layout to rearrange") shows under the notice. Open /app/journal and /app/notes: no lock (the row is empty).
- **DV-258c** (AL-LAYOUT-375-011): 375/388, fresh. Open /app/notes: top-left is "Back to Today"; every other page (Today, Goals, Habits, Health, Wealth, Journal, Chess, Settings, Help, Staking, Earn) shows the logo.
- **D-257** (AL-LAYOUT-375-012): 375, fresh. /app/goals/new step 1: Back (disabled), "Continue →" and "Create goal" all show; the idea list is an inner scroller (260 px box, 360 px content).
- **D-132** (AL-LAYOUT-768-004): 768, Showcase. /app/goals/new: an empty dark art panel 200 px wide (x 108–308, ~31 % of the 640 px column) sits left of the step-1 form.
- **D-139** (AL-LAYOUT-768-004): Same as D-132; also the idea cards' titles do not line up ("Holiday fund" starts ~40 px right of "Emergency fund").
- **G-023** (AL-LAYOUT-768-004): Same as D-132 (steps 1–2).
- **D-194** (AL-NAV-010): 1280, fresh (any theme). Compare the top-right buttons: Goals "Game layer, Unlock layout"; Habits adds "Vacation"; Earn, Portfolio, Help, Governance only "Game layer".
- **DV-025h** (AL-PERSISTENCE-011): Goal 9201 → "Edit goal details", changed the notes, "Save Goal details": toast "Goal details saved." and the fold closes (open = false), so a second edit needs reopening.
- **N-MO-02** (AL-PRICING-001): 1280, fresh. Read /app/plans and Help → "What does it cost?": neither says whether Alpha users keep their features when paid plans begin.
- **DV-031b** (AL-THEME-003): 1280, fresh, Light. /app/goals/new, name "🎯 Replay trip", target 1378, Continue to Create goal. On the goal page the 🎯 in the title is a solid black disc (span.nebula-flow, transparent text fill + background-clip text).
- **BN-137** (AL-THEME-004): 768, fresh, Light. /app/governance (or /app/staking): the round rocket ("Game layer") button top right is a pale icon on a pale tile: darkest icon pixel vs tile 2.06:1, tile vs page 1.0:1.
- **D-063** (AL-THEME-004): 1280×800, Light. The theme radios are at the sidebar bottom (y 1250 in a 1320 px sidebar): not visible without scrolling the sidebar. (The dark hero is a protected island.)
- **DV-029a** (AL-LAYOUT-DESKTOP-017): 1280×800, fresh. Scroll the sidebar to its bottom to reach the theme radios, choose Light: the sidebar stays scrolled (scrollTop 520) and the Z logo stays cut off (top −504).
- **D-013** (AL-NAV-011): Same as D-194 (Portfolio, Help, Earn, Governance lack the lock that Goals, Habits, Health show).
- **D-194** (AL-NAV-011): 1280, fresh (any theme). Compare the top-right buttons: Goals "Game layer, Unlock layout"; Habits adds "Vacation"; Earn, Portfolio, Help, Governance only "Game layer".
- **DV-029b** (AL-NAV-012): 1280, fresh. The sidebar theme switch is three icons with no visible words or current-state text (names only for screen readers; tooltip "Nebula").
- **DV-051b** (AL-NAV-012): Same as DV-029b.
- **LS-H34** (AL-NAV-012): Same as D-063: at 1280×800 the theme radios sit below the Apps group at the sidebar bottom (y 1250).
- **DV-203** (AL-THEME-006): 1280, Showcase. Goals or Activity in Dark, then Nebula: both are a black/near-black starfield (body rgb(0,0,0) vs rgb(2,9,24) with a faint haze); cards, sidebar and art identical.
- **DV-226** (AL-THEME-006): Same as DV-203 at 388 on Habits.
- **LS-H39** (AL-THEME-006): Same as DV-203 on /app/tasks.
- **NB-031** (AL-THEME-006): 1280, fresh, Light. Settings → Your pages & buttons, "Cycle log" (off): dark knob on a pale track rgb(238,242,249) with a faint 35 % light-blue edge on a pale card; the track itself is barely visible.
- **N-NB-03** (AL-THEME-006): Same as DV-203.
- **MO-090** (AL-THEME-007): 1280, Showcase, Light. /app/health?view=insights footer "Private Health backups are in Settings → Backup & restore. … Devices": link colour rgb(1,20,14) vs text rgb(9,16,26), ~1.1:1 (links are underlined).
- **BUG-046** (AL-THEME-007): Same as MO-090.
- **N-MO-08** (AL-THEME-007): 1280, Showcase, Light. /app/health water ring: track stroke rgba(28,44,72,0.15) on the pale card ≈ 1.3:1.

CHANGED ids (main complaint gone, a named part remains): D-003, T-069, D-070, D-138, D-137, D-162, DV-223, DV-247, BUG-051, D-134, DV-274, NB-028, NB-045, N-MO-01, D-179, NB-075. Their remaining part is in the evidence column.
