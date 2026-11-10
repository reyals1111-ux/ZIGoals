# Grok #53 replay — lane L2 (Health), pass 1

- **Commit served:** `c521574f` (production build, `PUBLIC_ALPHA_UNDEPLOYED`, built from the session branch) on http://127.0.0.1:3101.
- **Date:** 5 Nov 2026, about 02:50–04:40 Brussels (wall clock). The app's clock was set to the bots' night of 4 Nov 2026 with `page.clock`.
- **Replayed by:** a fresh replay agent. I made no fixes and changed no app code. Bots: Moscow (`moscow.md`, all ids, since L2 owns its ledger), plus every Denver, Denver re-check, Lisbon, Nairobi, Professor and Berlin id that GROK53_LEDGER puts in an L2 row (96 AL rows). `lanes/L2.md` was read only to see which rows claim Fixed.
- **Browser:** channel `chrome` (here `/usr/bin/google-chrome` = Chrome for Testing 153, the sandbox's preinstalled build), headless, Playwright 1.63, `locale: en-GB`, `timezoneId: Europe/Brussels`, the theme set through the app's theme record. Every run went through `flock /tmp/claude-0/zig-browser.lock`, one browser and one worker. The scripts are in `/tmp/claude-0/replay-L2/` and are not committed. One screenshot was taken; no verdict depends on it.
- **Conditions used** (the codes are used in the table):
  - **D** = desktop 1280×800, Dark, a fresh empty context with the Welcome marked seen. The clock is set to 4 Nov 2026 between 03:12 and 04:47 Brussels, which is before 07:00 and inside the bots' window.
  - **D 04:00**, **D 03:10** = the same at that time (sleep defaults).
  - **Dlb** = D with Journal settings → weight unit lb (Moscow's G window, 04:47), with seven daily readings typed in (182.4 … 178.2 lb, 29 Oct–4 Nov).
  - **D+partial** = D with a quick-added food that has no protein, or a library food that has no calories (to make partial days).
  - **Sc** = Showcase (Settings → Load Showcase Demo), 1280 Dark, at 01:26 (Professor), 03:15 or 04:20.
  - **375 / 388 / 512 / 768** = the viewport width (375×844, 388×800, 512×900, 768×1024). **Light** = the Light theme.
  - **S** = a lane spec, run against :3101. I checked that the spec performs the bot's steps before relying on it.
  - **env** = blocked by this sandbox, not by the app. In this build the food-lookup provider is not configured.
- **Lane specs as evidence.** `tests/grok53/health/*.spec.ts` (desktop project, 1 worker, :3101): **31 passed, 0 failed**. `tests/grok53/settings/mo-039-switch-undo-line.spec.ts`: **1 passed**. The verdicts below come from my own replays. Specs are cited only where they repeat the bot's steps: MO-049/050/051/138 (the bot's CSV fixtures), NB-254, MO-039 and the GAP rows.
- **Counting:** one line per index entry of GROK53_LEDGER (d). BUG-023 appears twice (Moscow and Denver). Moscow ids whose primary row belongs to another lane are listed as "other lane" and were not replayed. The same applies to keep-list ZIGi/NOVA prompts (L7).

## Totals (per index entry)

| verdict | ids |
|---|---|
| FIXED | 145 |
| HOLDS | 34 |
| STILL OPEN | 29 |
| CHANGED | 32 |
| OWNER DECISION | 5 |
| NOT POSSIBLE | 7 |
| NOT BUILT (reason cited) | 13 |
| NOT REPLAYED | 11 |
| OUT OF SCOPE | 17 |
| other lane (not replayed here) | 181 |
| **total ids** | **474** |

## Moscow — new findings (MO-001…MO-166)

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| MO-001 | FIELD-ERROR-003 | STILL OPEN | D | Targets → Calorie −5 / "abc": "Check the highlighted fields: Calorie target (kcal) needs a number…, not below zero." (no range, no kcal), at the form end ~400 px below the field; field aria-invalid. 99999 → "Could not save this change. Check your entries and available browser storage" (storage text for a limit). "Targets saved." still renders under the view strip (y 1263) while the form sits at y ≈1540–1750. |
| MO-002 | LAYOUT-375-002 | FIXED | D+partial 1280/512/375 | Two quick-added foods, one without protein: the tile headline is the number only, "Protein 10+ g", with a small "Partial · 1 of 2 entries" line under it, the same at 1280, 512 and 375 (no long sentence). (Today's Health widget still writes "10 g known · 1/2 entries supplied protein": see PR-088.) |
| MO-003 | LAUNCHER-OVERLAP-001 | L10a (other lane) | — | Primary row AL-LAUNCHER-OVERLAP-001 is lane L10a; not replayed here. |
| MO-004 | keep | HOLDS | Sc | With a target set the card reads "Edit personal targets" and "230 kcal remaining to your target". |
| MO-005 | PERSISTENCE-011 | L10a (other lane) | — | Primary row AL-PERSISTENCE-011 is lane L10a; not replayed here. |
| MO-006 | COPY-021 | FIXED | D | Name search "banana": one "Sources: Ciqual 2025 (ANSES, France)…" line; the review form's select is "Meal" (not "Barcode meal"); "Also kept from this source, per 100 g: Fiber 2.7…" is listed. (Result order: MO-106.) |
| MO-007 | FIELD-ERROR-004 | NOT REPLAYED | D (env) | This build has no food-lookup provider configured: every code (0000000000000, 3017620422003) ends with "Barcode lookup is being switched on. Your private food library still works." So each lookup now ends with a line, but "found / not found / rate-limited" and a working provider cannot be seen here. |
| MO-008 | FIELD-ERROR-003 | FIXED | D | Weight 1000 kg → "Enter a weight from 20 to 400 kg." at the form (no storage text); 999999, 5000, 1 the same. |
| MO-009 | COPY-016 | FIXED | Sc | Familiar foods rows read "♡ Pin" (favourite is a heart); the Checklist star stays only on meal headers ("Star Log breakfast for your Checklist path"); pinned chip reads "+ Showcase imported oats ×0.5". |
| MO-010 | DATES-001 | FIXED | D, Sc | Copy date 1 max = today; 6 Nov → "Choose today or an earlier day: food is logged once it is eaten. Plan a later day in the Planner." under the date (spec mo-010 passes). Planner: Thu 5 / Fri 6 plans read "Log it as eaten from Thu 5."; only Wed 4 has a Log button. |
| MO-011 | COPY-017 | FIXED | D | Copy source options: "Whole day of 4 Nov 2026 (keep meals) · 0 entries", "Breakfast of 4 Nov 2026 · 0 entries", … Copy date 1 defaults to today, max 2026-11-04. |
| MO-012 | COPY-020 | FIXED | D | Diary → "Estimate a meal from a photo" (named fold): "No AI is connected… connect your own AI in Settings → ZIGi", a disabled "Estimate from a photo" and "Connect your AI in Settings". |
| MO-013 | COUNTS-003 | FIXED | D+partial | A day with one food without calories: budget row "Wed 4 · today 2,000 kcal 200+ logged · some entries have no calories" (not blank). |
| MO-014 | COPY-022 | STILL OPEN | Sc | Targets → Micronutrients: minerals now read neutral "from 0 of 4 entries", but every vitamin tile still reads "4 of 4 entries have no value" (the warning form the bot asked to drop). DB-supplied Mg/Zn/B tiles: not built ("Later", ADR-022, not an F/O decision). |
| MO-015 | keep | HOLDS | Sc | Targets card 850 px of 954 at 1280. |
| MO-016 | IMPORT-EXPORT-006 | INT (other lane) | — | Primary row AL-IMPORT-EXPORT-006 is lane INT; not replayed here. |
| MO-017 | LIMITS-002 | CHANGED | Dlb | 7 daily readings, then 300 lb on 4 Nov → asks once: "That is +121 lb from your reading a day away. If it is right, press Save weight again" (nothing stored until the second Save). New: 300 − 178.2 = 121.8 is shown as "+121" and the reading is the same day, not "a day away". |
| MO-018 | NAV-002 | FIXED | D | ?view=weight → Weight pressed; Save weight 81.2 → still Weight; reload → Weight, URL ?view=weight. Spec mo-018 (1280 + 375) also passes. |
| MO-019 | ROUNDING-002 | FIXED | Dlb | lb journal: the add form and "Edit weight" prefill "178.2" (the shown value), not 3 decimals. |
| MO-020 | FIELD-ERROR-003 | CHANGED | D | 0, −5, abc, 8e1, ８０, 1000, 1000.1, 999999, 5000 all → "Enter a weight from 20 to 400 kg." (unit-aware, real cap). aria-invalid is set only for −5/abc/8e1/８０, not for 0/1000/5000; no aria-describedby to a message at the field (describedby = the page error). |
| MO-021 | TIMEZONE-001 | FIXED | D 04:00/04:47 | Sleep at 04:00: defaults 23:00 (3 Nov) → 04:01 (4 Nov); untouched Save → "Night saved.", 1 night stored, no error. Spec nb-139 (03:10, 06:59) passes. |
| MO-022 | COPY-023 | CHANGED | D, Sc | Charts: "Short dash: no night logged" marks gap days; naps "count toward the day they end on"; debt note says a long night makes up for a short one. Still: "Your energy today: an estimate from your sleep" is a header-only fold with no summary on its face. |
| MO-023 | TIMEZONE-001 | FIXED | D | A nap → "Nap started (date/time)", "Nap ended (date/time)"; the earlier field error is cleared on switching (0 errors). Spec nb-139 BUG-023 test passes. |
| MO-024 | keep | HOLDS | Dlb | Meditation 0 → "Enter whole minutes from 1 to 1440." (no stale success line). |
| MO-025 | LIMITS-003 | FIXED | D, Dlb | Start 16:8 → Stop after 30 s → "Stopped after less than ten minutes, so nothing was saved." with Undo; no "0.0 h" row. "Started earlier?" and "Log a past fast" exist (spec mo-025 passes). Custom target label: "Target hours (1–18; every fast stops itself at 24 h)". |
| MO-026 | PERF-002 | CHANGED | D | Workouts loads with a skeleton (2 skeleton nodes at first paint), history/PB/freshness exist. Still: the very first workout ends with "No new personal best this time; consistency is what counts." (bot: odd for the first workout). |
| MO-027 | FIELD-ERROR-006 | FIXED | D | Push-ups count edit: hint "A whole number from 0 to 9,999." (no character counter, no maxlength); 99999 → "Enter a whole number from 0 to 9,999." The hint and the error then show the same sentence twice. |
| MO-028 | LAYOUT-DESKTOP-006 | CHANGED | D | On Weight the nourishment card is one line ("No entries yet · No calorie target set · Set your own targets →"). The hero primary is still "Log food" (class primary) whatever is missing. |
| MO-029 | IMPORT-EXPORT-004 | FIXED | D | Weight → "Import weights from a file": pasted date,weight lines (with `;` and a decimal comma) preview "2 readings to add · 1 line not read… Line 4: Enter a number". Spec mo-029 (import + Undo) passes. Device cards unchanged (owner F). |
| MO-030 | FIELD-ERROR-003 | STILL OPEN | Dlb | Waist 91.5 cm saved, then −5 / abc / 5000 / 0: the field errors are right ("Enter a measurement from 10 to 250 cm.") but "Measurement saved with its original units and history." stays in the status line beside every error; the field is not aria-invalid. |
| MO-031 | IMPORT-EXPORT-006 | INT (other lane) | — | Primary row AL-IMPORT-EXPORT-006 is lane INT; not replayed here. |
| MO-032 | LAUNCHER-OVERLAP-001 | L10a (other lane) | — | Primary row AL-LAUNCHER-OVERLAP-001 is lane L10a; not replayed here. |
| MO-033 | LAYOUT-375-002 | FIXED | 512 | Same partial day at 512: "Protein 10+ g · Partial · 1 of 2 entries"; no 3–4-line headline. |
| MO-034 | UNITS-002 | FIXED | Dlb | Targets field reads "Weight goal (lb)"; goal 172 → Weight journal "Your weight goal 172 lb · 6.2 lb to go", legend "Your readings · Your goal", scale 171–183.4 lb. |
| MO-035 | THEME-007 | L10a (other lane) | — | Primary row AL-THEME-007 is lane L10a; not replayed here. |
| MO-036 | FIELD-ERROR-003 | CHANGED | D | Water −100 / abc / 1e6 / blank → "Check the highlighted fields: Water amount needs a number (digits…), not below zero." at the form end (~250 px under the field), aria-invalid set. 0 / 99999 → "Enter 0.001 to 5,000 mL." but the field is not aria-invalid. "1e6" is told "not below zero" and given no range. |
| MO-037 | keep | HOLDS | D | Fresh, 500 mL water, no habits: Today "Habits completed today 0", "0 of 0 habits complete". |
| MO-038 | SETTINGS-004 | L6 (other lane) | — | Primary row AL-SETTINGS-004 is lane L6; not replayed here. |
| MO-039 | TOAST-005 | FIXED | S | Spec settings/mo-039 (Apple Health export → import → Undo the import) on :3101 passes: the "Imported from Apple Health…" line is replaced by "…was undone." and the 2 MB limit is explained. |
| MO-040 | COPY-024 | CHANGED | D | Activity starts blank (Steps "", Minutes ""); a new entry reads "Added by you". New: a walk saved with Minutes left blank shows "4,000 steps · 0 minutes" (an unknown shown as zero). |
| MO-041 | PERF-002 | FIXED | D | Workouts / Import / Insights show skeleton nodes at first paint (not text only); Save no longer greys the form (aria-busy fieldset). |
| MO-042 | COMPETITOR-GAP-043 | FIXED | D, Sc | Insights opens with "This week": weight, sleep vs goal, steps vs target, fasts; each empty part says so (fresh) or gives figures (Showcase). |
| MO-043 | PRICING-001 | L10a (other lane) | — | Primary row AL-PRICING-001 is lane L10a; not replayed here. |
| MO-044 | PRICING-001 | L10a (other lane) | — | Primary row AL-PRICING-001 is lane L10a; not replayed here. |
| MO-045 | PRICING-001 | L10a (other lane) | — | Primary row AL-PRICING-001 is lane L10a; not replayed here. |
| MO-046 | PRIVACY-007 | INT (other lane) | — | Primary row AL-PRIVACY-007 is lane INT; not replayed here. |
| MO-047 | SETTINGS-007 | L6 (other lane) | — | Primary row AL-SETTINGS-007 is lane L6; not replayed here. |
| MO-048 | keep | OUT OF SCOPE | — | Settings sharing switches (L6/L7 area); not replayed. |
| MO-049 | IMPORT-EXPORT-003 | FIXED | S | Spec mo-049 runs the bot's MFP file: "Row 4: Calories “-100” is negative; amounts start at 0.", "Breakfast (meal total)", "sodium 200 mg" in the preview — passes on :3101. Also imported by hand at 388 (D). |
| MO-050 | IMPORT-EXPORT-003 | FIXED | S | Spec mo-049 (Cronometer file): "1 serving of 50 g", the =HYPERLINK name flagged and kept as text — passes. |
| MO-051 | IMPORT-EXPORT-003 | FIXED | S | Spec: after the import the CSV file input is still attached; Done keeps the fold open — passes. |
| MO-052 | PRIVACY-006 | L7 (other lane) | — | Primary row AL-PRIVACY-006 is lane L7; not replayed here. |
| MO-053 | AI-SAFETY-002 | L7 (other lane) | — | Primary row AL-AI-SAFETY-002 is lane L7; not replayed here. |
| MO-054 | AI-STABILITY-005 | L7 (other lane) | — | Primary row AL-AI-STABILITY-005 is lane L7; not replayed here. |
| MO-055 | AI-SAFETY-004 | L7 (other lane) | — | Primary row AL-AI-SAFETY-004 is lane L7; not replayed here. |
| MO-056 | AI-FACTS-005 | L7 (other lane) | — | Primary row AL-AI-FACTS-005 is lane L7; not replayed here. |
| MO-057 | AI-ACTIONS-006 | L7 (other lane) | — | Primary row AL-AI-ACTIONS-006 is lane L7; not replayed here. |
| MO-058 | PRIVACY-003 | L7 (other lane) | — | Primary row AL-PRIVACY-003 is lane L7; not replayed here. |
| MO-059 | PRIVACY-004 | L7 (other lane) | — | Primary row AL-PRIVACY-004 is lane L7; not replayed here. |
| MO-060 | AI-SAFETY-004 | L7 (other lane) | — | Primary row AL-AI-SAFETY-004 is lane L7; not replayed here. |
| MO-061 | AI-CONNECTION-005 | L7 (other lane) | — | Primary row AL-AI-CONNECTION-005 is lane L7; not replayed here. |
| MO-062 | AI-STABILITY-005 | L7 (other lane) | — | Primary row AL-AI-STABILITY-005 is lane L7; not replayed here. |
| MO-063 | CROSS-PAGE-SYNC-001 | FIXED | D, Sc | NOVA water card: fresh with a 2,000 mL target "Water 250 mL of 2,000 mL"; Showcase without target "250 mL · No target set", the same as Health. |
| MO-064 | FIELD-ERROR-017 | L7 (other lane) | — | Primary row AL-FIELD-ERROR-017 is lane L7; not replayed here. |
| MO-065 | AI-ACTIONS-011 | L7 (other lane) | — | Primary row AL-AI-ACTIONS-011 is lane L7; not replayed here. |
| MO-066 | PRIVACY-004 | L7 (other lane) | — | Primary row AL-PRIVACY-004 is lane L7; not replayed here. |
| MO-067 | ENV-ONLY-001 | L7 (other lane) | — | Primary row AL-ENV-ONLY-001 is lane L7; not replayed here. |
| MO-068 | LAYOUT-375-012 | L10a (other lane) | — | Primary row AL-LAYOUT-375-012 is lane L10a; not replayed here. |
| MO-069 | LAUNCHER-OVERLAP-001 | L10a (other lane) | — | Primary row AL-LAUNCHER-OVERLAP-001 is lane L10a; not replayed here. |
| MO-070 | LAUNCHER-OVERLAP-001 | L10a (other lane) | — | Primary row AL-LAUNCHER-OVERLAP-001 is lane L10a; not replayed here. |
| MO-071 | keep | HOLDS | D | Food "<img src=x onerror=alert(1)> 🍌 …" saved and shown as text (option label shows it literally; no script ran, no page error). |
| MO-072 | keep | HOLDS | D | New food form: every box named (Food name, Brand, Serving weight (g), Calories, Protein…, vitamins). |
| MO-073 | LAUNCHER-OVERLAP-001 | L10a (other lane) | — | Primary row AL-LAUNCHER-OVERLAP-001 is lane L10a; not replayed here. |
| MO-074 | A11Y-006 | FIXED | 768, 375 | "Read the label from a photo", "Start from a template", "Suggest foods I log often" are bordered buttons (1 px solid, tinted background, 44 px) with a CSS-mask icon (::before). |
| MO-075 | LAYOUT-375-004 | FIXED | 375 | After a nutrition CSV import the strip shows "Undo import" (secondary) and "Dismiss" (quiet) as 213×46 bordered buttons. (Undo is not a primary button as the row suggested.) |
| MO-076 | keep | HOLDS | D | Planner buttons "Plan Breakfast on Mon 2" …; week arrows 61×48. |
| MO-077 | LAUNCHER-OVERLAP-001 | L10a (other lane) | — | Primary row AL-LAUNCHER-OVERLAP-001 is lane L10a; not replayed here. |
| MO-078 | LAUNCHER-OVERLAP-001 | L10a (other lane) | — | Primary row AL-LAUNCHER-OVERLAP-001 is lane L10a; not replayed here. |
| MO-079 | LAYOUT-375-002 | FIXED | 375 | Same partial day at 375: number-only headline with the "Partial · 1 of 2 entries" line; no page overflow (375 = 375). |
| MO-080 | LAYOUT-375-014 | L10b (other lane) | — | Primary row AL-LAYOUT-375-014 is lane L10b; not replayed here. |
| MO-081 | keep | NOT REPLAYED | — | 30-day chart alt text not inspected; "View nutrition history table" present (fresh and Showcase). |
| MO-082 | LAUNCHER-OVERLAP-001 | L10a (other lane) | — | Primary row AL-LAUNCHER-OVERLAP-001 is lane L10a; not replayed here. |
| MO-083 | NAV-002 | FIXED | D | /app/health?view=weight opens Weight. (/app?view=weight is Today's address and opens Today; not a Health link.) |
| MO-084 | A11Y-003 | FIXED | 375, 768 | Hero buttons read Log weight · Log water · Log food · Ask ZIGi at both widths, and Tab from the title goes in that order. "Skip to Health views" link present. |
| MO-085 | LAYOUT-375-003 | FIXED | 375 Dark + Light | Meal headings Breakfast/Lunch/Dinner/Snacks are one line (23 px, word-break keep-all) at 375 in Dark and Light; no page overflow. |
| MO-086 | LAUNCHER-OVERLAP-001 | L10a (other lane) | — | Primary row AL-LAUNCHER-OVERLAP-001 is lane L10a; not replayed here. |
| MO-087 | LAUNCHER-OVERLAP-001 | L10a (other lane) | — | Primary row AL-LAUNCHER-OVERLAP-001 is lane L10a; not replayed here. |
| MO-088 | keep | HOLDS | 768 | Health at 768: no horizontal overflow; strip and forms fit. |
| MO-089 | LAYOUT-375-004 | FIXED | 768 | At 768 "Undo import" (123×46) and "Dismiss" do not wrap. No pager was present on the Import view at 768 or 1280, so its alignment could not be compared. |
| MO-090 | THEME-007 | L10a (other lane) | — | Primary row AL-THEME-007 is lane L10a; not replayed here. |
| MO-091 | LAUNCHER-OVERLAP-001 | L10a (other lane) | — | Primary row AL-LAUNCHER-OVERLAP-001 is lane L10a; not replayed here. |
| MO-092 | A11Y-005 | FIXED | 768, 1280 | Grocery "Milk": the whole label is the tick target (215×48 at 768, 529×48 at 1280; the box itself 24×24); aisle select and "I have"/"Remove" sit together at the row end. |
| MO-093 | keep | HOLDS | 768, D | Sleep controls all named (incl. "Sleep file (CSV)"); chips 44 px. |
| MO-094 | keep | HOLDS | D | Devices page honest: "Needs setup by ZIGoals", "This browser has no Web Bluetooth…". |
| MO-095 | LAYOUT-375-005 | FIXED | 375 | Workouts → Add an exercise at 375: picker and list overflow visible, no max-height, no inner scroll box; no page overflow. |
| MO-096 | NAV-002 | FIXED | D | ?view= weight, targets, planner, measurements, activity, insights, import, diary, foods, planning, settings each open their view; ?tab=targets too. |
| MO-097 | A11Y-004 | CHANGED | 768 Light, Sc | Named now: "Date of the reading", "Unit of the new measurement", "Photo file", "Pose in the photo", "Date taken", "Observation JSON file". Still: the custom-measurement value box is just "Value" while no kind is chosen; "Log the hours to a habit" shows on every view (Showcase has a duration habit; it lives on the page-wide fasting card). |
| MO-098 | PERF-002 | OUT OF SCOPE | — | Bot's own re-check (05:28) NOT REPRODUCIBLE (once in ~40 under load). The skeleton/10 s watchdog exists (code, slow-reload.tsx); a stuck load was not reproduced here. |
| MO-099 | keep | HOLDS | D | "Log weight" in the hero scrolls to and focuses "Weight (kg)". |
| MO-100 | keep | HOLDS | 375, 768 | Checked targets were ≥ 44 px (grocery label 48 px, chips 44, arrows 48); no full audit. |
| MO-101 | LAYOUT-375-013 | L10a (other lane) | — | Primary row AL-LAYOUT-375-013 is lane L10a; not replayed here. |
| MO-102 | keep | HOLDS | S | Spec p-mo-34 (Light chart/ring contrast ≥ 3:1) passes; dark captions not re-measured. |
| MO-103 | SETTINGS-004 | L6 (other lane) | — | Primary row AL-SETTINGS-004 is lane L6; not replayed here. |
| MO-104 | FIELD-ERROR-003 | FIXED | D | New food "   " (serving 50 g, 100 kcal) → "Enter a name with at least one visible character." at the field, aria-invalid, no storage text. Spec mo-104 passes. |
| MO-105 | LIMITS-005 | L10b (other lane) | — | Primary row AL-LIMITS-005 is lane L10b; not replayed here. |
| MO-106 | SEARCH-002 | STILL OPEN | D | "a" → "Type at least 2 letters to search" beside the greyed Search (fixed part). "banana" (offline Ciqual/CoFID) still lists Banana nectar, Bananas flesh only, Banana bread, Banana split, then "Banana, flesh without skin, raw" 5th; no "raw" tag. |
| MO-107 | FIELD-ERROR-004 | NOT REPLAYED | D (env) | Fixed part: "12" → "A barcode has 8, 12, 13 or 14 digits; this one has 2." and Look up disabled. The valid-unknown-code path needs the provider (not configured here: "Barcode lookup is being switched on…"). |
| MO-108 | FIELD-ERROR-005 | FIXED | D | New recipe: Save off with "Save turns on when ingredient 1 has a food chosen." / "…when “Recipe makes (servings)” is a number from 0.001 to 1,000." beside it. |
| MO-109 | LIMITS-002 | CHANGED | D | 1000 servings → asks once: "1,000 servings in one entry is a lot. If it is right, press Log meal again to keep it." (nothing logged). New: the button is called "Log to diary", not "Log meal". |
| MO-110 | CRASH-001 | FIXED | D, Sc | Journal date min 1990-01-01, max today; typing 1900-01-01 snaps back to today, Diary and Weight draw (no crash). Spec mo-110 passes. |
| MO-111 | LIMITS-002 | CHANGED | D | Double-click "Add 250 mL" adds one entry. "0,5" asks once ("0.5 mL is less than a sip…") but the old "Enter 0.001 to 5,000 mL." stays beside it; a second press saves 0.5 mL. −100/1e6/blank → "needs a number…, not below zero" (no range). |
| MO-112 | keep | HOLDS | D | "Save weight" corrects (1 reading), "Keep both" adds a second ("4 Nov 2026, 03:31 · 80.9 kg" and "80.5 kg"); "80,5" accepted. |
| MO-113 | TIMEZONE-001 | FIXED | D | Wake before bed → "Woke up must be after went to bed." under Woke up (aria-invalid, describedby); empty → "Enter the time you woke up."; awake 999 → "Enter a whole number from 0 to 100…"; "Times you woke up (a count, optional)"; a 1900 night → "Choose a day from 1990 on." |
| MO-114 | UNDO-001 | FIXED | D | Delete a night → "The night is deleted." toast with Undo; Undo restores it (1 night back). |
| MO-115 | LIMITS-003 | FIXED | Dlb | Custom 25 → "Choose a target from 1 to 18 hours." (24 h+ targets: owner decision P5, HE6-fasting.md); stop at once saves nothing (Undo); "Started 04:48 · target at 20:48" (same day). |
| MO-116 | keep | HOLDS | Sc | Epley: 62.5 kg × 8 → 79.17 kg (62.5 × (1 + 8/30)); volume 1,437.5 kg correct. (Precision: N-MO-15.) |
| MO-117 | DATES-003 | OUT OF SCOPE | — | ENV-ONLY: the tab crash was "box memory likely"; not reproduced by the bot 04:12–04:25. Stale "Workout started." line: gone after Finish (Dlb). |
| MO-118 | PRICING-001 | L10a (other lane) | — | Primary row AL-PRICING-001 is lane L10a; not replayed here. |
| MO-119 | PRIVACY-007 | INT (other lane) | — | Primary row AL-PRIVACY-007 is lane INT; not replayed here. |
| MO-120 | COPY-034 | L4 (other lane) | — | Primary row AL-COPY-034 is lane L4; not replayed here. |
| MO-121 | FIELD-ERROR-019 | L10b (other lane) | — | Primary row AL-FIELD-ERROR-019 is lane L10b; not replayed here. |
| MO-122 | COPY-034 | L4 (other lane) | — | Primary row AL-COPY-034 is lane L4; not replayed here. |
| MO-123 | CROSS-PAGE-SYNC-002 | STILL OPEN | D | Fresh, 500 mL logged on Health, then Habits → one-tap "+ Drink water 2 liters a day": the new card reads "0 / 2 liters per day … +0.25 L" — the water already logged is not read (no automatic water rule applied). |
| MO-124 | CONFIRM-DELETE-004 | L3 (other lane) | — | Primary row AL-CONFIRM-DELETE-004 is lane L3; not replayed here. |
| MO-125 | STREAKS-002 | L3 (other lane) | — | Primary row AL-STREAKS-002 is lane L3; not replayed here. |
| MO-126 | FEATURE-GAP-002 | L4 (other lane) | — | Primary row AL-FEATURE-GAP-002 is lane L4; not replayed here. |
| MO-127 | COPY-034 | L4 (other lane) | — | Primary row AL-COPY-034 is lane L4; not replayed here. |
| MO-128 | NUMBERS-SOURCE-004 | L1 (other lane) | — | Primary row AL-NUMBERS-SOURCE-004 is lane L1; not replayed here. |
| MO-129 | CONFIRM-DELETE-005 | L4 (other lane) | — | Primary row AL-CONFIRM-DELETE-005 is lane L4; not replayed here. |
| MO-130 | COPY-035 | L4 (other lane) | — | Primary row AL-COPY-035 is lane L4; not replayed here. |
| MO-131 | LIMITS-005 | L10b (other lane) | — | Primary row AL-LIMITS-005 is lane L10b; not replayed here. |
| MO-132 | LIMITS-003 | FIXED | Dlb | As MO-025: a fast stopped within seconds writes no history row; Undo resumes it. |
| MO-133 | ROUNDING-002 | FIXED | Sc, D | Diary rows and macros show whole or one-decimal grams (Showcase "P 22 g · C 59 g"); no 3-decimal macro seen in the recipe preview. |
| MO-134 | PERSISTENCE-011 | L10a (other lane) | — | Primary row AL-PERSISTENCE-011 is lane L10a; not replayed here. |
| MO-135 | COPY-015 | FIXED | D | Targets intro: "The micronutrient lines below start from general reference intakes, which you can change." and the panel repeats that calories and macros have no defaults. |
| MO-136 | UNDO-001 | FIXED | D | As MO-114: the delete is announced in a toast with Undo. |
| MO-137 | DATES-003 | FIXED | Dlb | A workout finished within a minute: "Workout, done under 1 min · 1 set · 1,080 lb lifted"; the "Workout started." line is gone after Finish. |
| MO-138 | IMPORT-EXPORT-003 | FIXED | S | Spec mo-049: refused rows listed with reasons; after Undo the line reads "Import undone…" — passes. |
| MO-139 | THEME-008 | L10b (other lane) | — | Primary row AL-THEME-008 is lane L10b; not replayed here. |
| MO-140 | UNITS-002 | FIXED | Dlb | Waist 91.5 cm (30 Oct) + 35.4 in (4 Nov) in a lb journal: chart heading "Waist / 35.4 in · −0.6 in since 30 Oct 2026" (one unit, heading split from its value). Spec mo-140 (kg journal: "89.9 cm") passes. |
| MO-141 | FIELD-ERROR-003 | CHANGED | Dlb | Waist −5 → "Enter a number that is not negative.", 5000 → "Enter a measurement from 10 to 250 cm." (per-kind range). The field is not aria-invalid and the old "saved" status stays (see MO-030). |
| MO-142 | CONFIRM-DELETE-003 | FIXED | D | Custom kind Neck → "Remove the chosen one" asks "Remove Neck and its 0 readings? You can undo it right after." with Remove Neck / Keep it. (Esc on the toast: N-MO-26, L10b.) |
| MO-143 | keep | HOLDS | D | Two photos (front 20 Oct, side 3 Nov) listed with "Compare"; the "different poses" caveat was not captured in my headless run. |
| MO-144 | FIELD-ERROR-006 | FIXED | D | Manage counters → + Add counter with an empty name → "A counter name can’t be empty."; Add counter returns to Manage counters (not closing it). The ⋯ items are plain buttons (shared card-options, L10a; valid). |
| MO-145 | CURRENCY-004 | L4 (other lane) | — | Primary row AL-CURRENCY-004 is lane L4; not replayed here. |
| MO-146 | COPY-035 | L4 (other lane) | — | Primary row AL-COPY-035 is lane L4; not replayed here. |
| MO-148 | DATES-003 | FIXED | Dlb | An active workout offers "Took (minutes, optional: for a workout you log afterwards)". (Logging it on a past ?date= not exercised.) |
| MO-149 | DATES-002 | FIXED | Dlb | 7 daily lb readings 29 Oct–4 Nov: coach "7 days with a weight since 29 Oct. A weekly rate needs readings at least seven days apart. A reading on 5 Nov or later gives the rate."; one count "7 of 10 weigh-ins" on coach and Maintenance card. Spec mo-149 passes. |
| MO-150 | COPY-018 | FIXED | Sc | "Seven days of care" now has Steps, Active minutes, Sleep · hours and Weight rows beside calories, water and counters; "Late-evening eating" keeps its "meals carry no time" caveat. |
| MO-151 | COUNTS-003 | FIXED | Dlb | Target 1,000 → budget header "8,400 kcal this week (your target 1,000 a day is below 1,200, so each day counts 1,200)"; each day 1,200 — header and days agree. |
| MO-152 | COPY-024 | FIXED | Dlb | Journal date 1 Nov → Save activity "Walk 4,000 steps" → "Added by you"; view stays Activity and the date stays 1 Nov. |
| MO-153 | A11Y-007 | FIXED | D | On 28 Oct the meal menu is "Options for Breakfast on 28 Oct 2026" (today: "Options for Breakfast today"). |
| MO-154 | A11Y-008 | STILL OPEN | D | Weight: first Save weight of the day → focus falls to BODY (the form re-renders into "Correct a reading"). Water Log and "Keep both" keep focus on the button; Esc cancels the inline weight Edit; skip link present. |
| MO-155 | keep | NOT REPLAYED | — | Fasting @768 Light/Dark not re-rendered (see N-MO-18 for the 768 timeline). |
| MO-156 | COPY-020 | FIXED | D | The photo panel moved to the Diary with a named header and a disabled state with "Connect your AI in Settings" (see MO-012). |
| MO-157 | NAV-012 | L10a (other lane) | — | Primary row AL-NAV-012 is lane L10a; not replayed here. |
| MO-158 | COUNTS-002 | L1 (other lane) | — | Primary row AL-COUNTS-002 is lane L1; not replayed here. |
| MO-159 | PLURALS-003 | L10b (other lane) | — | Primary row AL-PLURALS-003 is lane L10b; not replayed here. |
| MO-160 | CURRENCY-004 | L4 (other lane) | — | Primary row AL-CURRENCY-004 is lane L4; not replayed here. |
| MO-161 | FIELD-ERROR-007 | L3 (other lane) | — | Primary row AL-FIELD-ERROR-007 is lane L3; not replayed here. |
| MO-162 | keep | HOLDS | Sc | Showcase: 6 h 44 min average over 6 nights, debt 7 h 36 min, score 77 (42 + 24 + 11) — consistent with the formula shown. |
| MO-163 | keep | HOLDS | Sc | Past day (2 Nov) Remove → "Diary entry removed. Undo" → Undo puts the row back (5 → 4 → 5). |
| MO-164 | HEALTH-SAFETY-001 | FIXED | D, Dlb | Calorie target 1,000 (and 500) saves with "…below 1,200, the lowest the coach and the weekly budget ever suggest. Information, not advice: talk to a doctor or dietitian…". |
| MO-165 | ROUNDING-002 | FIXED | Dlb | Bench 135 lb × 8: "Heaviest 135 lb", "Estimated one-rep max 171 lb"; "use last time" fills 135. |
| MO-166 | A11Y-005 | FIXED | 768 | Blank Add → "Type an item to add, like coffee or soap."; 130 characters → "An item can be at most 120 characters (this one has 130)." (no maxlength, no counter over the select). |

## Moscow — old ids re-checked

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| BUG-020 | FIELD-ERROR-003 | STILL OPEN | D | As MO-001/MO-036: no range or unit for −5 kcal / −100 mL ("needs a number…, not below zero"); calorie 99999 → storage text; "Targets saved." far above Save. |
| BUG-084 | FIELD-ERROR-003 | CHANGED | D | The "highlighted fields" message now names the field ("Water amount needs a number…") and the field is aria-invalid; the range is still missing for −100 / abc. |
| BUG-083 | keep | HOLDS | D | 1000 US fl oz → "Enter 0.001 to 169 fl oz." |
| BUG-022 | FIELD-ERROR-003 | FIXED | D | 1,000 kg (and 999,999) → "Enter a weight from 20 to 400 kg." — never accepted, never the storage text. |
| BUG-066 | keep | HOLDS | D | Quick add "Oats" → "Oats logged and saved to your library." (one step). |
| M-130 | LAYOUT-375-002 | FIXED | D+partial | Partial totals read "10+ g" with a separate partial line (presentation of MO-002 fixed). |
| BUG-080 | NAV-002 | FIXED | D | ?tab=targets and ?view=weight both honoured (see MO-096). |
| BUG-068 | FIRST-RUN-001 | FIXED | D | Fresh Health: "Three example counters to start with: rename, change or delete them under ⋯ → Manage counters." — the row's second option ("label them as examples"). Whether to drop the presets stays with the owner. |
| BUG-046 | THEME-007 | L10a (other lane) | — | Primary row AL-THEME-007 is lane L10a; not replayed here. |
| BUG-050 | keep | HOLDS | D | Water amount, Weight (kg), counter "Increase Push-ups" etc. are named. |
| M-054 | keep | HOLDS | Sc | "Adjust (needs the estimate)" disabled with its reason until enough data. |
| BUG-009 | FIELD-ERROR-003 | CHANGED | D | Water error now renders at the end of the water form (y 3216, field y 2962) instead of ~1,400 px above; still not at the field itself. |
| BUG-021 | keep | HOLDS | D | Nap over a logged night refused: "This overlaps the night that ended on 4 Nov 2026. Edit that one instead." |
| L-009 | keep | HOLDS | D | As BUG-021 (create). |
| BUG-053 | keep | HOLDS | D | Nap create → "Nap saved." |
| BUG-079 | TIMEZONE-001 | FIXED | D 04:00 | Untouched sleep form at 04:00 saves (see MO-021). |
| BUG-043 | CROSS-PAGE-SYNC-001 | OUT OF SCOPE | — | Bot: NOT RETESTED (no habits). Cross-check: Showcase "Drink water" habit stays 4/8 after +250 mL (see PR-019). |
| M-009 | keep | HOLDS | D | Today "Add 250 mL" → "Water logged: 250 mL. Undo ×". |
| M-099 | keep | HOLDS | D | As M-009. |
| M-039 | keep | HOLDS | Sc lb | lb: Health trend 163.6 lb, latest 162 lb, Today "162 lb · 3 Nov 2026" agree. |
| M-129 | LIMITS-002 | FIXED | D | Weight cap 400 kg ("Enter a weight from 20 to 400 kg."), plus a soft check for > 3 %/day (MO-017). |
| M-062 | SETTINGS-004 | L6 (other lane) | — | Primary row AL-SETTINGS-004 is lane L6; not replayed here. |
| M-134 | NR | OUT OF SCOPE | — | Index: NR (no 11-04 evidence: not retested). |
| M-018 | PRICING-001 | L10a (other lane) | — | Primary row AL-PRICING-001 is lane L10a; not replayed here. |
| M-021 | keep | L7/L6 (not replayed) | — | Sign-in / Exit Showcase (env); not Health. |
| MO-recheck: Key precondition (Include Health hidden) | PRIVACY-006 | L7 (other lane) | — | Primary row AL-PRIVACY-006 is lane L7; not replayed here. |
| Z-001 | AI-FACTS-005 | L7 (other lane) | — | Primary row AL-AI-FACTS-005 is lane L7; not replayed here. |
| Z-005…Z-008 | keep | L7 (keep-list prompt, not replayed) | — | ZIGi/NOVA prompt on the keep-list: L7. |
| Z-009 | NR | OUT OF SCOPE | — | Index: NR (no 11-04 evidence: not retested). |
| Z-010 | AI-FACTS-005 | L7 (other lane) | — | Primary row AL-AI-FACTS-005 is lane L7; not replayed here. |
| Z-022 | AI-FACTS-005 | L7 (other lane) | — | Primary row AL-AI-FACTS-005 is lane L7; not replayed here. |
| Z-023 | AI-SAFETY-002 | L7 (other lane) | — | Primary row AL-AI-SAFETY-002 is lane L7; not replayed here. |
| Z-030 | AI-FACTS-002 | L7 (other lane) | — | Primary row AL-AI-FACTS-002 is lane L7; not replayed here. |
| Z-043 | AI-STABILITY-005 | L7 (other lane) | — | Primary row AL-AI-STABILITY-005 is lane L7; not replayed here. |
| MO-recheck: Suggestions (Health chips) | NR | OUT OF SCOPE | — | Index: NR (no 11-04 evidence: not retested). |
| MO-recheck: Oct-26 gap: public food DB | keep | HOLDS | D | Ciqual / CoFID offline results for "banana" with a Sources line. |
| MO-recheck: Oct-26 gap: barcode provider inactive | FIELD-ERROR-004 | NOT REPLAYED | D (env) | As C-MO-01: the provider is inactive in this build ("being switched on"); not an app verdict. |
| MO-recheck: Oct-26 gap: photo food logging | COPY-020 | FIXED | D | BYO-AI photo panel in the Diary (see MO-012). |
| MO-recheck: Oct-26 gap: macro modes view-only | FEATURE-GAP-001 | CHANGED | D | Fresh, 2,000 kcal target, no gram targets: Keto view sets the tiles ("125 g target (keto split)", "25 g", "156 g"). Net carbs mode left the tile as "Carbs — No entry · Target not set" (no "net" label on an empty day); Custom split not tried. |
| MO-recheck: Oct-26 gap: supplements | keep | HOLDS | D | "Supplements and medication (optional)" fold in the Diary. |
| MO-recheck: Oct-26 gap: per-weekday targets | COMPETITOR-GAP-078 | FIXED | Sc | Weekly budget with Move/From/To/Shift and roll-over (Targets → Weekly calorie budget). |
| MO-recheck: Oct-26 gap: workouts/strength | keep | HOLDS | Sc | Workouts page (routines, history, PB, freshness). |
| MO-recheck: Oct-26 gap: Apple Health sleep/steps import | keep | HOLDS | S | Spec settings/mo-039 runs the Apple Health import with preview, consent tick and Undo — passes. |
| MO-recheck: Oct-26 gap: Fitbit import | keep | HOLDS | D | Devices lists no Fitbit connection (removed on purpose). |
| MO-recheck: Oct-26 gap: weight/MFP/Cronometer CSV | IMPORT-EXPORT-004 | FIXED | D, S | Weight CSV importer (MO-029) and the nutrition CSV wizard (MO-049/050). |
| MO-recheck: Oct-26 gap: live device sync | COMPETITOR-GAP-077 | OWNER DECISION | D | Devices: every linked account "Needs setup by ZIGoals" (honest). F: "anything needing a ZIGoals server for people's data: not now". |
| MO-recheck: Oct-26 gap: fasting history/backdating | LIMITS-003 | FIXED | D, S | "Started earlier? (optional)" and "Log a past fast" (spec mo-025 passes). |
| MO-recheck: Oct-26 gap: measurements + photos | keep | HOLDS | D | Waist/Hips/Chest/Arm/Thigh + custom kinds, body fat, progress photos (≤ 60). |

## Moscow — ZIGi / NOVA prompts (all L7 or keep)

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| MO:ZP-01 | AI-FACTS-005 | L7 (other lane) | — | Primary row AL-AI-FACTS-005 is lane L7; not replayed here. |
| MO:ZP-02 | AI-FACTS-005 | L7 (other lane) | — | Primary row AL-AI-FACTS-005 is lane L7; not replayed here. |
| MO:ZP-03 | AI-FACTS-005 | L7 (other lane) | — | Primary row AL-AI-FACTS-005 is lane L7; not replayed here. |
| MO:ZP-04 | keep | L7 (keep-list prompt, not replayed) | — | ZIGi/NOVA prompt on the keep-list: L7. |
| MO:ZP-05 | AI-FACTS-017 | L7 (other lane) | — | Primary row AL-AI-FACTS-017 is lane L7; not replayed here. |
| MO:ZP-06 | AI-FACTS-017 | L7 (other lane) | — | Primary row AL-AI-FACTS-017 is lane L7; not replayed here. |
| MO:ZP-07 | keep | L7 (keep-list prompt, not replayed) | — | ZIGi/NOVA prompt on the keep-list: L7. |
| MO:ZP-08 | keep | L7 (keep-list prompt, not replayed) | — | ZIGi/NOVA prompt on the keep-list: L7. |
| MO:ZP-09 | keep | L7 (keep-list prompt, not replayed) | — | ZIGi/NOVA prompt on the keep-list: L7. |
| MO:ZP-10 | keep | L7 (keep-list prompt, not replayed) | — | ZIGi/NOVA prompt on the keep-list: L7. |
| MO:ZP-11 | AI-ACTIONS-006 | L7 (other lane) | — | Primary row AL-AI-ACTIONS-006 is lane L7; not replayed here. |
| MO:ZP-12 | AI-ACTIONS-007 | L7 (other lane) | — | Primary row AL-AI-ACTIONS-007 is lane L7; not replayed here. |
| MO:ZP-13 | AI-ACTIONS-007 | L7 (other lane) | — | Primary row AL-AI-ACTIONS-007 is lane L7; not replayed here. |
| MO:ZP-14 | AI-FACTS-005 | L7 (other lane) | — | Primary row AL-AI-FACTS-005 is lane L7; not replayed here. |
| MO:ZP-15 | AI-FACTS-005 | L7 (other lane) | — | Primary row AL-AI-FACTS-005 is lane L7; not replayed here. |
| MO:ZP-16 | keep | L7 (keep-list prompt, not replayed) | — | ZIGi/NOVA prompt on the keep-list: L7. |
| MO:ZP-17 | AI-FACTS-002 | L7 (other lane) | — | Primary row AL-AI-FACTS-002 is lane L7; not replayed here. |
| MO:ZP-18 | AI-FACTS-002 | L7 (other lane) | — | Primary row AL-AI-FACTS-002 is lane L7; not replayed here. |
| MO:ZP-19 | AI-SAFETY-004 | L7 (other lane) | — | Primary row AL-AI-SAFETY-004 is lane L7; not replayed here. |
| MO:ZP-20 | keep | L7 (keep-list prompt, not replayed) | — | ZIGi/NOVA prompt on the keep-list: L7. |
| MO:ZP-21 | AI-SAFETY-006 | L7 (other lane) | — | Primary row AL-AI-SAFETY-006 is lane L7; not replayed here. |
| MO:ZP-22 | keep | L7 (keep-list prompt, not replayed) | — | ZIGi/NOVA prompt on the keep-list: L7. |
| MO:ZP-23 | AI-SAFETY-002 | L7 (other lane) | — | Primary row AL-AI-SAFETY-002 is lane L7; not replayed here. |
| MO:ZP-24 | keep | L7 (keep-list prompt, not replayed) | — | ZIGi/NOVA prompt on the keep-list: L7. |
| MO:ZP-25 | keep | L7 (keep-list prompt, not replayed) | — | ZIGi/NOVA prompt on the keep-list: L7. |
| MO:ZP-26 | keep | L7 (keep-list prompt, not replayed) | — | ZIGi/NOVA prompt on the keep-list: L7. |
| MO:ZP-27 | keep | L7 (keep-list prompt, not replayed) | — | ZIGi/NOVA prompt on the keep-list: L7. |
| MO:ZP-28 | AI-FACTS-012 | L7 (other lane) | — | Primary row AL-AI-FACTS-012 is lane L7; not replayed here. |
| MO:ZP-29 | keep | L7 (keep-list prompt, not replayed) | — | ZIGi/NOVA prompt on the keep-list: L7. |
| MO:ZP-30 | keep | L7 (keep-list prompt, not replayed) | — | ZIGi/NOVA prompt on the keep-list: L7. |
| MO:ZP-31 | AI-FACTS-002 | L7 (other lane) | — | Primary row AL-AI-FACTS-002 is lane L7; not replayed here. |
| MO:ZP-32 | AI-FACTS-017 | L7 (other lane) | — | Primary row AL-AI-FACTS-017 is lane L7; not replayed here. |
| MO:ZP-33 | keep | L7 (keep-list prompt, not replayed) | — | ZIGi/NOVA prompt on the keep-list: L7. |
| MO:ZP-34 | keep | L7 (keep-list prompt, not replayed) | — | ZIGi/NOVA prompt on the keep-list: L7. |
| MO:ZP-35 | keep | L7 (keep-list prompt, not replayed) | — | ZIGi/NOVA prompt on the keep-list: L7. |
| MO:ZP-36 | keep | L7 (keep-list prompt, not replayed) | — | ZIGi/NOVA prompt on the keep-list: L7. |
| MO:ZP-37 | keep | L7 (keep-list prompt, not replayed) | — | ZIGi/NOVA prompt on the keep-list: L7. |
| MO:ZP-38 | keep | L7 (keep-list prompt, not replayed) | — | ZIGi/NOVA prompt on the keep-list: L7. |
| MO:ZP-39 | AI-FACTS-002 | L7 (other lane) | — | Primary row AL-AI-FACTS-002 is lane L7; not replayed here. |
| MO:NP-01 | keep | L7 (keep-list prompt, not replayed) | — | ZIGi/NOVA prompt on the keep-list: L7. |
| MO:NP-02 | keep | L7 (keep-list prompt, not replayed) | — | ZIGi/NOVA prompt on the keep-list: L7. |
| MO:NP-03 | keep | L7 (keep-list prompt, not replayed) | — | ZIGi/NOVA prompt on the keep-list: L7. |
| MO:NP-04 | AI-FACTS-017 | L7 (other lane) | — | Primary row AL-AI-FACTS-017 is lane L7; not replayed here. |
| MO:NP-05 | AI-FACTS-017 | L7 (other lane) | — | Primary row AL-AI-FACTS-017 is lane L7; not replayed here. |
| MO:NP-06 | AI-ACTIONS-010 | L7 (other lane) | — | Primary row AL-AI-ACTIONS-010 is lane L7; not replayed here. |
| MO:NP-07 | AI-ACTIONS-010 | L7 (other lane) | — | Primary row AL-AI-ACTIONS-010 is lane L7; not replayed here. |
| MO:NP-08 | AI-ACTIONS-010 | L7 (other lane) | — | Primary row AL-AI-ACTIONS-010 is lane L7; not replayed here. |
| MO:NP-09 | AI-ACTIONS-006 | L7 (other lane) | — | Primary row AL-AI-ACTIONS-006 is lane L7; not replayed here. |
| MO:NP-10 | AI-ACTIONS-007 | L7 (other lane) | — | Primary row AL-AI-ACTIONS-007 is lane L7; not replayed here. |
| MO:NP-11 | AI-ACTIONS-007 | L7 (other lane) | — | Primary row AL-AI-ACTIONS-007 is lane L7; not replayed here. |
| MO:NP-12 | AI-SAFETY-004 | L7 (other lane) | — | Primary row AL-AI-SAFETY-004 is lane L7; not replayed here. |
| MO:NP-13 | keep | L7 (keep-list prompt, not replayed) | — | ZIGi/NOVA prompt on the keep-list: L7. |
| MO:NP-14 | AI-SAFETY-004 | L7 (other lane) | — | Primary row AL-AI-SAFETY-004 is lane L7; not replayed here. |
| MO:NP-15 | keep | L7 (keep-list prompt, not replayed) | — | ZIGi/NOVA prompt on the keep-list: L7. |
| MO:NP-16 | AI-SAFETY-006 | L7 (other lane) | — | Primary row AL-AI-SAFETY-006 is lane L7; not replayed here. |
| MO:NP-17 | AI-SAFETY-002 | L7 (other lane) | — | Primary row AL-AI-SAFETY-002 is lane L7; not replayed here. |
| MO:NP-18 | AI-SAFETY-004 | L7 (other lane) | — | Primary row AL-AI-SAFETY-004 is lane L7; not replayed here. |
| MO:NP-19 | keep | L7 (keep-list prompt, not replayed) | — | ZIGi/NOVA prompt on the keep-list: L7. |
| MO:NP-20 | AI-FACTS-002 | L7 (other lane) | — | Primary row AL-AI-FACTS-002 is lane L7; not replayed here. |
| MO:NP-21 | AI-FACTS-017 | L7 (other lane) | — | Primary row AL-AI-FACTS-017 is lane L7; not replayed here. |
| MO:NP-22 | AI-FACTS-002 | L7 (other lane) | — | Primary row AL-AI-FACTS-002 is lane L7; not replayed here. |
| MO:NP-23 | keep | L7 (keep-list prompt, not replayed) | — | ZIGi/NOVA prompt on the keep-list: L7. |
| MO:NP-24 | AI-FACTS-002 | L7 (other lane) | — | Primary row AL-AI-FACTS-002 is lane L7; not replayed here. |
| MO:NP-25 | keep | L7 (keep-list prompt, not replayed) | — | ZIGi/NOVA prompt on the keep-list: L7. |
| MO:NP-26 | keep | L7 (keep-list prompt, not replayed) | — | ZIGi/NOVA prompt on the keep-list: L7. |
| MO:NP-27 | keep | L7 (keep-list prompt, not replayed) | — | ZIGi/NOVA prompt on the keep-list: L7. |
| MO:NP-28 | AI-FACTS-012 | L7 (other lane) | — | Primary row AL-AI-FACTS-012 is lane L7; not replayed here. |
| MO:NP-29 | keep | L7 (keep-list prompt, not replayed) | — | ZIGi/NOVA prompt on the keep-list: L7. |
| MO:NP-30 | AI-FACTS-002 | L7 (other lane) | — | Primary row AL-AI-FACTS-002 is lane L7; not replayed here. |
| MO:NP-31 | AI-FACTS-002 | L7 (other lane) | — | Primary row AL-AI-FACTS-002 is lane L7; not replayed here. |

## Moscow — competitor rows (C-MO)

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| C-MO-01 | FIELD-ERROR-004 | NOT REPLAYED | D (env) | Provider not configured in this sandbox build; cannot confirm a working lookup (bot found Nutella on alpha.zigoals.app). |
| C-MO-02 | COMPETITOR-GAP-044 | FIXED | D | Diary with yesterday logged: "Repeat yesterday (1 entry in 1 meal)" and "Copy yesterday's breakfast (1 entry) + Oats ×1" on today's empty meals. |
| C-MO-03 | COMPETITOR-GAP-045 | FIXED | D, S | "Name your meals and set their times" in the Diary (spec gap-045: rename "Pre-workout · 06:45", Undo — passes at 1280 and 375). |
| C-MO-04 | COMPETITOR-GAP-082 | NOT BUILT (reason cited) | — | No calorie/TDEE suggestion at onboarding; the lane cites the product rule "no suggested targets" (G3-health-goals.md:7), not an AL_SCOPE F/O decision; Maintenance estimate + coach Adjust exist (Sc: "Adjust (needs the estimate)"). Owner to confirm. |
| C-MO-05 | COMPETITOR-GAP-078 | FIXED | Sc | Weekly budget: Move (kcal) From/To + Shift, roll-over, 1,200 floor. |
| C-MO-06 | COMPETITOR-GAP-046 | FIXED | Sc | Insights "Your nutrition rhythm (30 days)" chart + table; Targets "Open the nutrient report". |
| C-MO-07 | COMPETITOR-GAP-047 | FIXED | Sc | Import → "A web address": "Address (https) · Read the page — The server fetches only that page and reads its recipe data". (A live fetch was not tried: no outside network for the server here.) |
| C-MO-08 | COMPETITOR-GAP-048 | FIXED | Sc, S | Log a meal → Quantity unit: Servings, Grams, Ounces, Millilitres, US cups, Tablespoons, Teaspoons, US fl oz; "weight and volume never convert into each other without density evidence". Spec gap-048 (1 cup milk → 236.6 mL) passes. |
| C-MO-09 | COMPETITOR-GAP-079 | FIXED | D, S | Water entry: Drink (Water, Coffee, Tea, Milk, Juice, Soft drink, Other) + "Caffeine (mg, optional)"; "no hydration factor" said. Spec gap-079 passes. Alcohol as a nutrient: not built (Later). |
| C-MO-10 | COMPETITOR-GAP-049 | NOT BUILT (reason cited) | — | Status: Needs-other-lane (Settings reminders; push off by owner). In Health: a water reminder time and sleep/meditation reminders exist on this device; no fasting/meal reminder tied to the diary. |
| C-MO-11 | COMPETITOR-GAP-050 | OWNER DECISION | — | Cited F: "private by design" / no ZIGoals server for people's data. No sharing; Health CSV export widened. Agreed for sharing; PDF export is not a server matter and is simply not built. |
| C-MO-12 | COMPETITOR-GAP-051 | NOT POSSIBLE | — | No licensed food-image source; the lookup returns no images. Agreed. |
| C-MO-13 | COPY-022 | NOT BUILT (reason cited) | Sc | Extended micronutrients: not built ("Later": the format holds seven, ADR-022 B6). Not an F/O decision. |
| C-MO-14 | LIMITS-002 | FIXED | D, Dlb | Soft check on a > 3 %/day jump (MO-017), on 1,000 servings (MO-109) and on 0.5 mL water (MO-111). |
| C-MO-15 | UNITS-002 | FIXED | Dlb | "Your weight goal 172 lb · 6.2 lb to go". No ETA (deliberately: "no date promised"). |
| C-MO-16 | COMPETITOR-GAP-052 | FIXED | Sc | Weight → "WEEKLY CHECK-IN · Your coach". |
| C-MO-17 | COMPETITOR-GAP-053 | FIXED | D | Measurements → "Body fat (%)", "Date of the body-fat reading", "Add body-fat reading", with its chart line "Body fat — No readings yet". |
| C-MO-18 | IMPORT-EXPORT-004 | FIXED | D, S | Weight CSV import (MO-029). |
| C-MO-19 | UNITS-002 | FIXED | Dlb | Goal drawn as a series on the weight journal chart ("Your readings · Your goal"). |
| C-MO-20 | COMPETITOR-GAP-054 | NOT POSSIBLE | — | Smart alarm: no background audio/alarm on the web. Agreed. |
| C-MO-21 | COMPETITOR-GAP-055 | FIXED | S | Sleep → "Import nights from a file (Sleep Cycle, Oura or any start/end CSV)"; status says imports keep stage minutes (not seen on screen: the Showcase nights carry no stages). |
| C-MO-22 | COMPETITOR-GAP-056 | NOT POSSIBLE | — | Snore recording: no background audio capture on the web. Agreed. |
| C-MO-23 | COMPETITOR-GAP-057 | NOT BUILT (reason cited) | Sc | Sleep shows "Bedtime window 22:30–23:30" from your own goal; a "tonight's bedtime" suggestion is not built (lane: would be advice; owner to confirm — not an F/O decision). |
| C-MO-24 | COPY-023 | FIXED | Sc | "Naps count toward the day they end on" in the sleep summary. |
| C-MO-25 | COMPETITOR-GAP-058 | NOT POSSIBLE | — | Guided audio content: none in the repo; timer, bells and sounds exist. Agreed (not an owner decision). |
| C-MO-26 | COMPETITOR-GAP-059 | FIXED | D | Meditation bell: "Only at the start and the end, Every 1/2/5/10 min". |
| C-MO-27 | COMPETITOR-GAP-060 | FIXED | Sc, Dlb | PB card / "Heaviest 135 lb" after the first set. (First-workout copy: MO-026.) |
| C-MO-28 | COMPETITOR-GAP-061 | FIXED | Sc | "Exercise history" with per-session table and 1RM progress. |
| C-MO-29 | COMPETITOR-GAP-062 | FIXED | Sc | Exercise picker offers "Add “Sled shove”" for an unknown name. |
| C-MO-30 | COMPETITOR-GAP-063 | OWNER DECISION | — | F: "group/friend chats, anything needing a ZIGoals server: not now". Agreed. |
| C-MO-31 | COMPETITOR-GAP-064 | FIXED | Sc | "Freshness (an estimate)" body map. |
| C-MO-32 | COMPETITOR-GAP-065 | FIXED | D | "Warm-up and plates" inside an active workout. |
| C-MO-33 | DATES-003 | FIXED | Dlb | "Took (minutes, optional…)" for a workout logged afterwards (MO-148). |
| C-MO-34 | LIMITS-003 | FIXED | D, S | "Started earlier? (optional)" and "Log a past fast" (spec mo-025). |
| C-MO-35 | COMPETITOR-GAP-066 | NOT BUILT (reason cited) | — | Lane cites "owner decision P5" (HE6-fasting.md:7: "no streaks, no longest fast"). P5 is not in AL_SCOPE F/O1–O7, so I cannot confirm it as an AL owner decision; no fasting streaks are built. |
| C-MO-36 | LIMITS-003 | NOT BUILT (reason cited) | Dlb | Custom target 1–18 h, 25 refused, fasts stop at 24 h. The cited "owner decision P5" is outside AL_SCOPE F/O1–O7 (same note as C-MO-35). |
| C-MO-37 | COMPETITOR-GAP-067 | NOT BUILT (reason cited) | — | Push notifications are off in this build (owner); in-app "Fasting end" only. Not an F/O decision; Settings lane. |
| C-MO-38 | COMPETITOR-GAP-068 | NOT POSSIBLE | — | No step-sensor API on the web. Agreed. |
| C-MO-39 | COMPETITOR-GAP-069 | NOT BUILT (reason cited) | — | Lane: "Later (owner to choose)"; page says "No calorie expenditure is estimated". Not an F/O decision. |
| C-MO-40 | COMPETITOR-GAP-070 | FIXED | Sc | Measurements → "Your numbers: blood pressure and lab values" fold. |
| C-MO-41 | IMPORT-EXPORT-004 | FIXED | D | Weight importer takes date,value lines (MO-029). |
| C-MO-42 | COMPETITOR-GAP-071 | FIXED | S | Spec gap-071 (Sleep Cycle file preview, import, Undo) passes. |
| C-MO-43 | COMPETITOR-GAP-072 | FIXED | S | Spec gap-072 (Oura file) passes. |
| C-MO-44 | COMPETITOR-GAP-077 | OWNER DECISION | D | Live sync needs a per-provider OAuth server: F ("anything needing a ZIGoals server for people's data: not now"). Devices says so honestly. Agreed. |
| C-MO-45 | PRICING-001 | L10a (other lane) | — | Primary row AL-PRICING-001 is lane L10a; not replayed here. |
| C-MO-46 | PRICING-001 | L10a (other lane) | — | Primary row AL-PRICING-001 is lane L10a; not replayed here. |
| C-MO-47 | PRICING-001 | L10a (other lane) | — | Primary row AL-PRICING-001 is lane L10a; not replayed here. |
| C-MO-48 | PRICING-001 | L10a (other lane) | — | Primary row AL-PRICING-001 is lane L10a; not replayed here. |
| C-MO-49 | PRICING-001 | L10a (other lane) | — | Primary row AL-PRICING-001 is lane L10a; not replayed here. |
| C-MO-50 | PRICING-001 | L10a (other lane) | — | Primary row AL-PRICING-001 is lane L10a; not replayed here. |
| C-MO-51 | PRICING-001 | L10a (other lane) | — | Primary row AL-PRICING-001 is lane L10a; not replayed here. |
| C-MO-52 | PRICING-001 | L10a (other lane) | — | Primary row AL-PRICING-001 is lane L10a; not replayed here. |
| C-MO-53 | PRICING-001 | L10a (other lane) | — | Primary row AL-PRICING-001 is lane L10a; not replayed here. |
| C-MO-54 | PRICING-001 | L10a (other lane) | — | Primary row AL-PRICING-001 is lane L10a; not replayed here. |
| C-MO-55 | COMPETITOR-GAP-073 | FIXED | Sc | Insights → "You logged on 7 of the last 7 days: 30 meal entries, 6 water entries…  Counted on this device". |
| C-MO-56 | COMPETITOR-GAP-074 | FIXED | Sc | "Maintenance estimate" (expenditure from intake and trend), coach Adjust. |
| C-MO-57 | COMPETITOR-GAP-075 | FIXED | Sc | Sleep debt, balance, bedtime and wake-time consistency. |
| C-MO-58 | COMPETITOR-GAP-043 | FIXED | D, Sc | Insights "This week" digest (MO-042). |
| C-MO-59 | COMPETITOR-GAP-076 | NOT BUILT (reason cited) | D | BYO-AI photo panel exists (MO-012); estimation needs a connected AI (not testable: no key). ZIGi lane. |

## Moscow — copy / UX notes (N-MO)

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| N-MO-01 | PRICING-001 | L10a (other lane) | — | Primary row AL-PRICING-001 is lane L10a; not replayed here. |
| N-MO-02 | PRICING-001 | L10a (other lane) | — | Primary row AL-PRICING-001 is lane L10a; not replayed here. |
| N-MO-03 | CURRENCY-002 | L1 (other lane) | — | Primary row AL-CURRENCY-002 is lane L1; not replayed here. |
| N-MO-04 | AI-ACTIONS-005 | L7 (other lane) | — | Primary row AL-AI-ACTIONS-005 is lane L7; not replayed here. |
| N-MO-05 | AI-SAFETY-004 | L7 (other lane) | — | Primary row AL-AI-SAFETY-004 is lane L7; not replayed here. |
| N-MO-06 | A11Y-005 | FIXED | 768 | Planner week arrows 61×48 with a 24 px glyph. |
| N-MO-07 | LAYOUT-375-006 | FIXED | 375 | Counter names at 375: "Push-ups", "Pull-ups", "Squats" fit (scrollWidth = clientWidth, no "Push-…"); one bar per row kept. |
| N-MO-08 | THEME-007 | L10a (other lane) | — | Primary row AL-THEME-007 is lane L10a; not replayed here. |
| N-MO-09 | A11Y-009 | FIXED | 768 | Sleep form chips (night/nap, quality, tags) all 44 px tall at 768. |
| N-MO-10 | LAUNCHER-OVERLAP-001 | L10a (other lane) | — | Primary row AL-LAUNCHER-OVERLAP-001 is lane L10a; not replayed here. |
| N-MO-11 | LAYOUT-375-013 | L10a (other lane) | — | Primary row AL-LAYOUT-375-013 is lane L10a; not replayed here. |
| N-MO-12 | LAUNCHER-OVERLAP-001 | L10a (other lane) | — | Primary row AL-LAUNCHER-OVERLAP-001 is lane L10a; not replayed here. |
| N-MO-13 | LAUNCHER-OVERLAP-001 | L10a (other lane) | — | Primary row AL-LAUNCHER-OVERLAP-001 is lane L10a; not replayed here. |
| N-MO-14 | ROUNDING-002 | STILL OPEN | D | 70.55 kg saved, history shows "70.6 kg"; the stored value is visible only through Edit. (AL-ROUNDING-002 asks for entered decimals kept.) |
| N-MO-15 | ROUNDING-002 | STILL OPEN | Sc | Showcase Bench press "Estimated one-rep max 79.17 kg" (two decimals) while the progress line says "79.2 kg". (lb journal: "171 lb", whole.) |
| N-MO-16 | A11Y-004 | FIXED | D | File inputs named: "Observation JSON file", "Photo file", "Sleep file (CSV)", "Weight file (CSV or text)". |
| N-MO-17 | COUNTS-002 | L1 (other lane) | — | Primary row AL-COUNTS-002 is lane L1; not replayed here. |
| N-MO-18 | LIMITS-003 | STILL OPEN | 768 | Fasting timeline at 768: the "24 h" label ends at x 740 in a card whose right edge is 748 with 22 px padding, so it sits inside the padding (8 px from the edge). The lane's "not reproducible from code" does not hold. |
| N-MO-19 | LAUNCHER-OVERLAP-001 | L10a (other lane) | — | Primary row AL-LAUNCHER-OVERLAP-001 is lane L10a; not replayed here. |
| N-MO-20 | LAUNCHER-OVERLAP-001 | L10a (other lane) | — | Primary row AL-LAUNCHER-OVERLAP-001 is lane L10a; not replayed here. |
| N-MO-21 | THEME-007 | L10a (other lane) | — | Primary row AL-THEME-007 is lane L10a; not replayed here. |
| N-MO-22 | NAV-012 | L10a (other lane) | — | Primary row AL-NAV-012 is lane L10a; not replayed here. |
| N-MO-23 | ROUNDING-002 | NOT REPLAYED | — | Goals value goal (6/11 × $1,250) needs a Wealth asset allocation; not replayed here. L4 reports lib/positions.ts divHalfUp. |
| N-MO-24 | COPY-023 | FIXED | Sc | Debt note: "added up over the 6 nights you logged…: a long night makes up for a short one. Naps count toward the day they end on." (No "exclude this night".) |
| N-MO-25 | TOAST-012 | L10b (other lane) | — | Primary row AL-TOAST-012 is lane L10b; not replayed here. |
| N-MO-26 | TOAST-012 | L10b (other lane) | — | Primary row AL-TOAST-012 is lane L10b; not replayed here. |
| N-MO-27 | FIELD-ERROR-009 | L3 (other lane) | — | Primary row AL-FIELD-ERROR-009 is lane L3; not replayed here. |
| N-MO-28 | A11Y-008 | STILL OPEN | D | Meditation page has a role=status region reading "Off" (Focus sounds player) that a reader hears next to the save; the lane's "no Off text exists" is not right. The "Mindful minutes saved." line is not in a live region at all. |
| N-MO-29 | LIMITS-003 | FIXED | Dlb | Custom target −3 → "Choose a target from 1 to 18 hours."; 16,5 → "Enter whole hours, like 16."; 0/25/99999 → the range sentence. |
| N-MO-30 | LAYOUT-375-012 | L10a (other lane) | — | Primary row AL-LAYOUT-375-012 is lane L10a; not replayed here. |
| N-MO-31 | FIELD-ERROR-003 | FIXED | D | "8e1" and "８０" → "Enter a weight from 20 to 400 kg." (no grams/servings text); no stale "Weight saved." |
| N-MO-32 | A11Y-003 | FIXED | 768 | Date bar: one tab stop (Journal date); no extra group announcement. |
| N-MO-33 | FIELD-ERROR-019 | L10b (other lane) | — | Primary row AL-FIELD-ERROR-019 is lane L10b; not replayed here. |
| N-MO-34 | SETTINGS-007 | L6 (other lane) | — | Primary row AL-SETTINGS-007 is lane L6; not replayed here. |
| N-MO-35 | AI-FACTS-012 | L7 (other lane) | — | Primary row AL-AI-FACTS-012 is lane L7; not replayed here. |
| N-MO-36 | PRIVACY-006 | L7 (other lane) | — | Primary row AL-PRIVACY-006 is lane L7; not replayed here. |

## Berlin — ids in L2 rows

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| B-086 | COPY-014 | FIXED | D | Bot OUT OF AREA. With the provider missing the page now says "Barcode lookup is being switched on. Your private food library still works." (no dead end). The provider itself is an integrator/owner step. |
| B-161 | COPY-014 | STILL OPEN | D, Sc | Water card still says "Set a daily goal in Targets." Targets has no water field; the target is "Personal water target (mL, optional)" in Journal settings (the card's own footnote says so). |
| D-172 | FIELD-ERROR-003 | OUT OF SCOPE | — | Berlin NOT RETESTED (Settings → Your areas → Add a link). Settings form, not a Health form; not replayed. |
| D-173 | FIELD-ERROR-003 | OUT OF SCOPE | — | Berlin NOT RETESTED (Settings → time zone / wrap-up empty submit). Not replayed. |
| D-190 | FIELD-ERROR-003 | OUT OF SCOPE | — | Berlin NOT RETESTED (Settings → My links → Edit link). Not replayed. |

## Denver — ids in L2 rows

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| DV-012a | LIMITS-002 | CHANGED | D | Average goal (template sleep-7h): target 25 is refused (stays on the form), day value 30 → "Enter hours of sleep from 0 to 24 hours.". But a 24 h a night target and a 24 h day are accepted with no "are you sure?" ("100 % · Target: at least 24 h a night"). |
| DV-027b | LIMITS-002 | FIXED | D | As DV-059 (1,000,000,000 steps refused). |
| DV-052a | LIMITS-002 | CHANGED | D | As DV-012a: 25/30 h refused; 24 h target and 24 h day saved silently. |
| DV-059 | LIMITS-002 | FIXED | D, S | + Health goal "Walk more": 99,999,999 and 1,000,000,000 → "Enter a whole number from 0 to 100,000 steps." at the field (spec dv-059 passes). 100,000 a day is accepted with no question. |
| DV-135 | FIELD-ERROR-003 | FIXED | D | Weight "1" → "Enter a weight from 20 to 400 kg." (no storage text). |
| DV-136 | FIELD-ERROR-003 | CHANGED | D | Weight range now 20–400 kg. Water still offers "Enter 0.001 to 5,000 mL." (0.001 mL as an allowed amount; 0.5 mL only asks once). |
| DV-137 | FIELD-ERROR-003 | FIXED | D | Water −100 / abc → "Water amount needs a number…" (no grams/kilograms/servings); a later valid save clears it. |
| DV-138 | TIMEZONE-001 | FIXED | D 04:00 | Default wake at 04:00 is 04:01, saves (see MO-021). |
| DV-139 | TIMEZONE-001 | FIXED | D | Wake before bed → "Woke up must be after went to bed." at the field; a later Save → "Night saved." with no error left. |
| DV-143 | COPY-013 | STILL OPEN | D | Edit weight for 4 Nov opens "Correct a reading, or keep both. 4 Nov 2026 · …" with Save weight / Keep both; no "Editing …" banner and no Cancel button (Esc closes it). The lane's status also says Not done. |
| DV-254a | COPY-013 | FIXED | 388 | Fresh card at 388: one "Set your own targets →", no "0 meal groups · 0 entries", three tiles 102 px each, no overflow (388 = 388). |
| DV-269a | COPY-013 | FIXED | 388, 768 | Hero order Log weight · Log water · Log food at 388 and 768. |
| DV-280 | COPY-013 | FIXED | 768 Sc | "Maintenance estimate" (renamed), trend and coach agree (−0.3 kg/week); "7 of 10 weigh-ins" wraps between words (word-break normal, hyphens manual), no mid-word break. |
| B-088 | LIMITS-002 | FIXED | D | Bot NOT RETESTED. The readings that fed it are refused now: 500/1000 kg and 0.5 kg → "Enter a weight from 20 to 400 kg."; a > 3 %/day jump asks first. |
| D-074 | FIELD-ERROR-003 | CHANGED | D | Minutes are no longer required (steps alone save) and a blank name says "Enter a name with at least one visible character.". An empty name gets only the browser bubble "Please fill out this field."; "Activity saved." shows ~250 px above the form. |
| D-140 | FIELD-ERROR-003 | NOT REPLAYED | — | Habits → new habit empty submit: my script did not reach the habit editor (Habits form, not Health). |
| D-142 | FIELD-ERROR-003 | STILL OPEN | D | Weight empty → only the browser bubble "Please fill out this field." (no app message). |
| D-143 | FIELD-ERROR-003 | STILL OPEN | D | Water entry empty → only the browser bubble "Please fill out this field." (no app message, no field marking); same pattern for the food forms (required inputs). |
| D-144 | FIELD-ERROR-003 | FIXED | D | Empty wake time → "Enter the time you woke up." under the field, aria-invalid, described-by. |

## Denver re-check + gaps — ids in L2 rows

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| B-173 | LIMITS-002 | FIXED | D | As DV-059. |
| G-044 | LIMITS-002 | CHANGED | D | As DV-012a. |
| N-004 | COPY-014 | OUT OF SCOPE | — | Denver NOT RETESTED ("Goals (Nairobi): Goals / MINOR", no text). Not replayed. |
| T-137 | LIMITS-002 | CHANGED | D | 5 kg weight goal → "Enter a weight from 20 to 400 kg."; 500 kcal saves with the calm below-1,200 note. A 1,000,000-steps daily target saves with no question (cap is 1,000,000). |
| B-197 | LIMITS-002 | OUT OF SCOPE | — | Denver NOT RETESTED (Habits → new habit limits). Habits form; not replayed. |
| D-024 | FIELD-ERROR-003 | CHANGED | D | Water errors now render at the end of the water form (~250 px under the field), field aria-invalid; −100 still gets "not below zero" without the range (see MO-036). |
| D-050 | COPY-014 | OUT OF SCOPE | — | Denver NOT RETESTED ("copy and formatting defects (exact texts)", none given). Not replayed. |
| D-075 | FIELD-ERROR-003 | CHANGED | D | "Measured at" is prefilled ("Recorded as: 4 Nov 2026, 04:00:11") and the type is said ("Type: weight."). The empty state still reads "Real observations and recorded contributions will build this view. No earlier performance is assumed." (jargon). |
| N-086 | NUMBERS-SOURCE-007 (primary L3; also CROSS-PAGE-SYNC-001) | L3 (other lane) | — | Primary row AL-NUMBERS-SOURCE-007 is lane L3; see its replay. |
| BUG-023 | COPY-014 | FIXED | D | Nap labels "Nap started / Nap ended"; mode switch clears the error (see MO-023). |
| D-011 | COPY-014 | FIXED | D | Quick counters with no entry: "— No entry today". |
| D-049 | FIELD-ERROR-003 | FIXED | D | Weight errors are one specific range sentence ("Enter a weight from 20 to 400 kg."). |
| D-077 | LIMITS-002 | STILL OPEN | D | Calorie target 99,999 → "Could not save this change. Check your entries and available browser storage, then try again.". Protein 5,000 g saves with no question. |
| D-089 | LIMITS-002 | CHANGED | D | Bot NOT RETESTED. P+C+F 80 g in a 50 g serving → "Protein, carbs and fat add up to 80 g, more than the 50 g serving. Check the label." But a 250-character food name is still cut to 120 with only "Food saved." (silent cut; MO-105, L10b). |
| D-199 | FIELD-ERROR-003 | FIXED | D | Empty sleep submit → message under "Woke up (time)", field marked and described. |
| L-035 | FIELD-ERROR-003 | CHANGED | D | Activity and Targets errors now at the end of their form (not above the viewport); an empty activity name gets only the browser bubble; a spaces-only name gets the app's sentence. |
| D-022 | COPY-014 | FIXED | Sc | Sleep form near the top; with last night logged it says "Last night is already logged, 23:20–07:20. Edit it from the list below, or log a nap or another night here." |
| D-041 | FIELD-ERROR-003 | NOT REPLAYED | — | As D-140. |
| D-046 | COPY-014 | OUT OF SCOPE | — | Denver NOT RETESTED; my quick-pick chip locator did not match ("+ Showcase imported oats ×0.5" chip), so not replayed. |
| D-048 | FIELD-ERROR-003 | FIXED | D | Water amount errors name the field (no wrong units); removing a water entry → "Water entry removed. Undo ×". |
| D-052 | FIELD-ERROR-003 | OUT OF SCOPE | — | Denver NOT RETESTED (Markets watchlist limit). Not Health; not replayed. |
| D-090 | FIELD-ERROR-003 | OUT OF SCOPE | D | Denver NOT RETESTED. Seen in passing: sleep errors are specific now; "Sleep debt" wording stays. |
| N-056 | NUMBERS-SOURCE-007 (primary L3; also CROSS-PAGE-SYNC-001) | L3 (other lane) | — | Primary row AL-NUMBERS-SOURCE-007 is lane L3; see its replay. |
| N-085 | COMPETITOR-GAP-042 | CHANGED | D | Health → Activity name offers a list (Walk, Run, Cycling, Swimming, Strength training, Yoga…). The Exercise habit itself still has no activity type (lane status: Needs-other-lane L3). |
| N-116 | FIELD-ERROR-003 | STILL OPEN | D | Bot NOT RETESTED. Replayed the forms it names: Targets 99,999 kcal → storage text; Activity/Water ranges missing for negatives; Measurements keep a stale "saved" line (MO-001, MO-030, MO-036). |
| N-130 | FIELD-ERROR-003 | CHANGED | D | Bot NOT RETESTED. Activity: −100 steps → "Steps needs a number…, not below zero." (aria-invalid); empty name → browser bubble only. |
| C-DVG-35 | FIELD-ERROR-004 | NOT REPLAYED | D (env) | As C-MO-01. |
| C-DVG-36 | COMPETITOR-GAP-076 | NOT BUILT (reason cited) | D | BYO-AI photo panel exists; estimating needs a connected AI (no key here). Voice/label scan: "Read the label from a photo" exists. ZIGi lane. |
| C-DVG-37 | COMPETITOR-GAP-077 | OWNER DECISION | D | As C-MO-44 (F: no ZIGoals server for people's data). |
| C-DVG-38 | COMPETITOR-GAP-078 | CHANGED | Sc | By weekday: the weekly budget's Move/Shift. By meal: no per-meal targets. Partly built. |
| C-DVG-39 | COMPETITOR-GAP-079 | FIXED | D, S | Drink type and caffeine (C-MO-09); hydration factor deliberately none (said). |
| C-DVG-40 | COMPETITOR-GAP-080 | FIXED | Sc, Dlb | Workouts: sets/reps/weights, PB, history, 1RM, rest timer, plates. |
| C-DVG-41 | COMPETITOR-GAP-081 | CHANGED | D | Presets 12:12/14:10/16:8/custom, past fasts, timeline, weekly fasts in the digest. No reminders (push off) and no streaks (owner decision P5). |
| C-DVG-42 | COMPETITOR-GAP-082 | NOT BUILT (reason cited) | — | As C-MO-04: no target proposal (product rule "no suggested targets"; owner to confirm). |

## Lisbon (+Lisbon-AI) — ids in L2 rows

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| LS-016 | CROSS-PAGE-SYNC-001 | STILL OPEN | D | Fresh, Water starred: one entry lights the Water planet with no target set ("Water: 2.5 ml today: done", "All planets lit (reached)"); no target is used or asked. The lane's rule says "with no target, one entry is the day's water"; the AL row asks "done only at the target". |
| LS-034 | LIMITS-003 | NOT REPLAYED | Sc (variation) | Variation only: Checklist Focus (Read), resumed from the Showcase's paused 25:00 → "Read: 25 minutes of focus logged on Habits. Undo ×" (whole minutes, Undo); Habits "55 / 30 minutes". A fresh 12-second session (the bot's exact steps on a clean profile) was not reached: the second tap did not start a new session. |
| LS-056 | CROSS-PAGE-SYNC-001 | STILL OPEN | 375 | Checklist at 375: 2.5 in "Water in ml" → "Water: 2.5 ml today: done" (now shown as 2.5, not "3 ml") and the orbit counts it done. |
| LC-002 | CROSS-PAGE-SYNC-001 | STILL OPEN | D, Sc | As LS-016; Showcase: Checklist "Water: done" after one 250 mL glass, no target. |
| LC-010 | LIMITS-003 | FIXED | Sc | Checklist Focus (Read): ending the session → "Read: 25 minutes of focus logged on Habits. Undo ×" (whole minutes, Undo offered). |
| M-136 | LIMITS-003 | FIXED | D | A fast stopped within ten minutes is not stored (Undo resumes); the rule is stated on the card. |

## Nairobi — ids in L2 rows

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| NB-139 | TIMEZONE-001 | FIXED | D 03:10/04:00 | Untouched sleep form before 07:00 saves "Night saved." (spec nb-139 at 03:10 and 06:59 passes; my run at 04:00). |
| NB-196 | TIMEZONE-001 | FIXED | D | Wake before bed is named at its field; default wake before 07:00 is now (see MO-113, MO-021). |
| NB-202 | FIELD-ERROR-003 | FIXED | D | 0 / 5000 / −5 / abc all → "Enter a weight from 20 to 400 kg." (no long generic text). 70.55 → 70.6: see N-NB-10. Undo toast timing not measured. |
| NB-254 | NAV-002 | FIXED | S | Spec nb-254 (fresh, Health in use, no weight): Today coach "Log a weight →" opens /app/health?view=weight with the Weight field focused — passes on :3101; NB-244 (no coach on an empty profile) passes too. |
| N-NB-10 | ROUNDING-002 | STILL OPEN | D | 70.55 kg accepted; history "4 Nov 2026 · 70.6 kg"; the entered 70.55 shows only in Edit. |

## Professor + §3/§4 — ids in L2 rows

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| PR-002 | CROSS-PAGE-SYNC-001 | STILL OPEN | Sc 01:26 | Showcase: Today "WATER 0 mL", Health 0 mL, NOVA "No water logged yet" while the "Drink water" habit shows "4 / 8 glasses" (its own check-ins, not the water journal). |
| PR-014 | NAV-002 | CHANGED | D | Deep links work (MO-096). The views are still toggle buttons (aria-pressed) in a nav, not ARIA tabs. |
| PR-018 | LIMITS-003 | STILL OPEN | Sc | Checklist Meditate timer 20 s → "Meditation saved on Health: 21 seconds. Undo" while Sleep/Fast under ten minutes save nothing (one rule now stated on the fasting card, but the minimums still differ). Tapping the Sleep tile starts "Sleep: in bed since 03:16. running" at once, with no confirm. |
| PR-019 | CROSS-PAGE-SYNC-001 | STILL OPEN | Sc 01:26 | +250 mL on Health → Today "250 mL", NOVA "250 mL · No target set", Checklist "Water: done" (no target), Drink water habit stays "4 / 8 glasses". Goals shows no water goal row. |
| PR-020 | DATES-002 | FIXED | Sc | Weight view: one count "7 of 10 weigh-ins" on Maintenance and coach (no "28 of 14"); trend 74.2 vs latest 73.5 now explained ("The trend smooths day-to-day swings"). |
| PR-021 | COPY-019 | CHANGED | Sc, S | Measurements no longer says "Add two observations"; the default history card reads "No weight readings here yet: add two to show a change." — on a profile with 8 weight-journal readings and a Waist chart with data, that still reads as a contradiction (it means timed measurements). |
| PR-022 | NUMBERS-SOURCE-005 | STILL OPEN | Sc | Goals "Sleep 7 hours a night" (Average goal) vs Health sleep goal 8 h 00 min (Checklist "Sleep 8h 0m Goal", NOVA "7 h 17 min of 8 h"). Health's score now says "(your goal)". |
| PR-047 | TIMEZONE-001 | FIXED | Sc 03:15 | Showcase at 03:15: Read habit "Duration timer 25:00 of 30 min · paused · Started 4 Nov 2026, 00:00 … 25 minutes so far" (no start in the future). |
| PR-063 | FIELD-ERROR-003 | CHANGED | D | No food wording on water/weight; the water error sits at the end of its form (~250 px under the field); the old "Water recorded." clears. Ranges still missing for −100 / abc. |
| PR-064 | TIMEZONE-001 | FIXED | D 04:00 | Prefilled sleep form saves before 07:00 (MO-021). |
| PR-074 | UNITS-002 | STILL OPEN | Sc lb | lb: trend card "−0.7 lb a week" (and "−0.7 lb/week") while the coach says "This week: −0.6 lb/week" on the same page (kg: −0.3 both). |
| PR-075 | UNITS-002 | FIXED | Sc lb | Today latest weight "162 lb · 3 Nov 2026"; no "161.996 lb". |
| PR-076 | UNITS-002 | FIXED | Sc | fl oz → mL: Today reads "250 mL water" and "WATER 250 mL"; no "8 fl oz" left. |
| PR-088 | NUMBERS-SOURCE-006 | STILL OPEN | D+partial | One food without calories + one with 200 kcal: Health says "200 kcal known · 1/2 entries supplied calories…", but Today's Health card headline still reads "Unknown kcal logged" (then "200 kcal known…" under it); Today's macro line still writes "5 g known · 1/2 entries supplied protein". |
| PR-096 | COPY-019 | FIXED | Sc | Quick-pick search "zzzqqq" → "No foods match “zzzqqq” here. Try All." |
| PR-097 | DATES-002 | FIXED | Sc, Dlb | One count ("7 of 10 weigh-ins") on Maintenance and coach (also lb fresh). |
| X3-12 | CROSS-PAGE-SYNC-001 | FIXED | D, Sc | NOVA water card equals Health: "250 mL of 2,000 mL" with a target; "No target set" without (MO-063). |
| X3-16 | DATES-002 | CHANGED | Dlb | Coach no longer says "Not enough readings"; it says when the rate can show. The trend still lags the readings (181.2 vs latest 178.2 lb), now explained as smoothing; the lane calls it by design (α 0.1), which is not an F/O decision. |
| X3-26 | CROSS-PAGE-SYNC-001 | STILL OPEN | D, Sc | Checklist Water lights at one entry with no target (LS-016). |
| L-021 | CROSS-PAGE-SYNC-001 | OUT OF SCOPE | — | Professor NOT-RETESTED (cross-ref of BUG-043; PR-002/019 replayed above). |
| C-X3-08 | COMPETITOR-GAP-054 | NOT POSSIBLE | — | As C-MO-20. |
| C-X3-09 | COMPETITOR-GAP-055 | FIXED | S | As C-MO-21 (sleep file import). |
| C-X3-10 | COMPETITOR-GAP-056 | NOT POSSIBLE | — | As C-MO-22. |
| C-X3-11 | COMPETITOR-GAP-057 | NOT BUILT (reason cited) | Sc | As C-MO-23. |
| C-X3-12 | COPY-023 | FIXED | Sc | As C-MO-24 (naps counted toward the day they end). |
| C-X3-13 | COMPETITOR-GAP-075 | NOT BUILT (reason cited) | Sc | Debt nets a long night against a short one, said on the card; a shortfall-only debt is not offered (design choice, not F/O). |
| N-PR-04 | NUMBERS-SOURCE-005 | STILL OPEN | Sc | As PR-022: Goals 7 h vs Health/Checklist/NOVA 8 h. |

## STILL OPEN / CHANGED — exact steps for the lane

Common setup: Chrome, 1280×800 Dark, a fresh context (site data cleared, Welcome seen), en-GB, Europe/Brussels, the clock on 4 Nov 2026 about 04:00. Exceptions are stated per item.

1. **Field errors (AL-FIELD-ERROR-003): MO-001, BUG-020, D-077, N-116.**
   - Steps: Health → Targets → Calorie target 99999 → Save targets.
   - Result: "Could not save this change. Check your entries and available browser storage, then try again." This is the storage text for a limit.
   - Calorie −5 or "abc" gives "Check the highlighted fields: Calorie target (kcal) needs a number…, not below zero." It names no range or unit and sits at the end of the form, about 400 px from the field. After a valid save, "Targets saved." shows under the view strip, above the form.
   - Protein 5000 g saves with no question.
2. **MO-020.** Weight 0 / 1000 / 5000 → "Enter a weight from 20 to 400 kg." is right, but the field is not aria-invalid. It is aria-invalid for −5 or abc. Its aria-describedby points at the page error, not at a message under the field.
3. **MO-036, D-024, PR-063, BUG-084, BUG-009, MO-111, DV-136: Water.**
   - Water amount −100 / abc / 1e6 / blank-spaces → "Water amount needs a number…, not below zero." No range is given, and "not below zero" is said for 1e6.
   - 0 / 99999 → "Enter 0.001 to 5,000 mL." The field is not aria-invalid, and 0.001 mL is offered as allowed.
   - "0,5" → the soft question "0.5 mL is less than a sip…" appears while the old "Enter 0.001 to 5,000 mL." stays beside it.
   - All messages sit at the end of the form, about 250 px under the field.
4. **MO-030, MO-141.**
   - Steps: Measurements → history type Waist → save 91.5 cm, then type −5 / abc / 5000 → Save.
   - The errors themselves are right ("Enter a measurement from 10 to 250 cm.").
   - But "Measurement saved with its original units and history." stays in the status line beside each error, and the field is never aria-invalid.
5. **D-142, D-143, D-074, L-035, N-130: empty required fields get only the browser bubble.**
   - Weight empty → Save weight. Water empty → Log water. Activity with an empty name → Save activity.
   - Each shows only "Please fill out this field." (no app message, no field marking).
   - "Activity saved." appears about 250 px above the form.
6. **D-075.** Measurements empty state still reads "Real observations and recorded contributions will build this view. No earlier performance is assumed."
7. **Limits (AL-LIMITS-002): T-137, DV-012a, DV-052a, G-044.**
   - Targets → Daily step target 1000000 → saves with no question.
   - Goals → `/app/goals/average/new?template=sleep-7h` → Target 24 → saves. Then the day value 24 → "100 % · at least 24 h a night", with no "are you sure?". 25 and 30 are refused.
8. **MO-017 (Dlb).** After a 178.2 lb reading today, type 300 → "That is +121 lb from your reading a day away." The difference is 121.8, and the reading is from the same day.
9. **MO-109.** Log a meal → 1000 servings → "…press Log meal again to keep it." The button is "Log to diary".
10. **Water across pages (AL-CROSS-PAGE-SYNC-001): PR-002, PR-019, LS-016, LS-056, LC-002, X3-26.**
    - Showcase at 01:26: Health 0 mL, Today 0 mL, NOVA "No water logged yet", while the "Drink water" habit shows "4 / 8 glasses".
    - Add 250 mL on Health → Today and NOVA show 250 mL and the Checklist shows "Water: done" (no target). The habit stays 4/8.
    - Fresh at 375: star Water → Checklist → "Water in ml" 2.5 → Log → "Water: 2.5 ml today: done", "All planets lit (reached)". No target is used or asked.
11. **MO-123.** Fresh: log 500 mL on Health → Habits → tap "+ Drink water 2 liters a day". The new habit reads "0 / 2 liters per day" and does not read the 500 mL.
12. **PR-022, N-PR-04.** Showcase: Goals "Sleep 7 hours a night", while Health, Checklist and NOVA say 8 h.
13. **PR-074 (Showcase, lb).** Journal settings → lb → Weight: trend "−0.7 lb a week" vs coach "This week: −0.6 lb/week". In kg both are −0.3.
14. **PR-088.**
    - Steps: New food "Mystery soup" with no calories → log it, plus a 200 kcal quick add → Today.
    - Today's Health card headline reads "Unknown kcal logged" (Health says "200 kcal known · 1/2 entries…").
    - Today's macro line still says "5 g known · 1/2 entries supplied protein".
15. **N-MO-14, N-NB-10.** Weight 70.55 → history "70.6 kg". The entered value is visible only in Edit.
16. **N-MO-15.** Showcase Workouts → Bench press: "Estimated one-rep max 79.17 kg", while the progress line says 79.2 kg.
17. **B-161.** The Water card says "Set a daily goal in Targets." Targets has no water field; the target is in Journal settings.
18. **MO-014.** Showcase Targets → Vitamins: every tile still reads "4 of 4 entries have no value". The minerals were changed to "from 0 of 4 entries".
19. **MO-022.** Sleep: "Your energy today: an estimate from your sleep" is still a header-only fold.
20. **MO-026.** The very first workout ends with "No new personal best this time; consistency is what counts."
21. **MO-028.** The hero's primary button is always "Log food", whatever is missing.
22. **MO-040.** Activity: save "Walk", 4000 steps, Minutes blank → the row says "4,000 steps · 0 minutes" (an unknown shown as zero).
23. **PR-021.** Showcase Measurements: the default card says "No weight readings here yet: add two to show a change." This is beside 8 weight-journal readings and a Waist chart with data.
24. **DV-143.** Weight → Edit weight for a day: no "Editing …" banner and no Cancel button. Only Esc closes it.
25. **D-089 (MO-105, L10b).** A 250-character food name is cut to 120 with only "Food saved.".
26. **MO-106.** Diary → Scan or look up a food barcode → Search foods by name "banana": Banana nectar, Bananas flesh only, Banana bread and Banana split come before "Banana, flesh without skin, raw" (5th). There is no "raw" tag.
27. **MO-154.** Weight → first "Save weight" of the day → focus falls to BODY. The form turns into "Correct a reading". Water and "Keep both" keep focus.
28. **N-MO-28.** The Meditation page has a role=status region reading "Off" (Focus sounds). "Mindful minutes saved." is not in a live region. The lane's "no Off text exists" is not correct.
29. **MO-097.** Measurements: the custom-measurement value box is named only "Value" until a kind is chosen.
30. **N-MO-18 (768).** Start a fast → the timeline's "24 h" label ends 8 px from the card edge, inside its 22 px padding.
31. **PR-018 (Showcase Checklist).**
    - Meditate timer 20 s → "Meditation saved on Health: 21 seconds", while Sleep and Fast under ten minutes save nothing.
    - Tapping the Sleep tile starts "in bed since 03:16" at once, with no confirm.
32. **X3-16 (Dlb).** The trend reads 181.2 lb against a latest reading of 178.2 lb. This is explained as smoothing and called by design, which is not an F/O decision.
33. **PR-014.** The Health views are still toggle buttons (aria-pressed), not ARIA tabs. The deep links work.
34. **Oct-26 macro modes.** Net carbs mode leaves the Carbs tile as "Carbs · Target not set" on an empty day. Keto works.
35. **N-085, C-DVG-38, C-DVG-41 (partly built).**
    - The Exercise habit has no activity type (Health has the list).
    - There are no per-meal targets.
    - Fasting has no reminders or streaks: push is off, and the streak exclusion is "P5", outside F/O.

Not replayed here, with reasons in the table: the barcode provider rows (MO-007, MO-107, C-MO-01, C-DVG-35, Oct-26 provider), because no provider is configured in this build. Also LS-034 (a fresh 12 s focus session was not reached), D-140 and D-041 (habit editor not reached), N-MO-23 (Goals value goal), MO-081 and MO-155.
