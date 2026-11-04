# Session AL — history map (R2): rows the Grok Alpha #53 run reopened

Every AL row in `GROK53_LEDGER.md` whose P-rows were marked REOPENED (or "Yes"/"Partly"/"possible") by the ledger helpers: an earlier session (AH_SCOPE, AI_SCOPE, ADR-033…036 closing tables, the AK review, Known limitations) closed the same problem as Fixed / Already fixed / Built / Done, and the 4 Nov 2026 run found it open. The "why" is the helpers' one-line note (a guess from the evidence, not a code audit); the category is assigned by keyword and checked by hand on a sample.

150 AL rows are REOPENED (226 P-rows marked by the helpers).

| AL row | lane | earlier row(s) | earlier outcome claimed | why the earlier close was wrong (category: one line) |
|---|---|---|---|---|
| AL-COUNTS-001 | L1 | AH WE5 Fixed, TR2; TR2, WE5 | Fixed | **one entry point only**: counters computed at different times / thresholds / rule right, evaluated only on load/nav |
| AL-CURRENCY-001 | L1 | WE6 (351c51c5) | Fixed | **one entry point only**: list applied to accounts and CSV, not to the asset editor |
| AL-IMPORT-EXPORT-001 | L1 | WE3 (351c51c5), J14 (duplicates) | Fixed | **other**: WE3 "reasons per row" not visible in the Wealth holdings preview; J14 checks existing holdings, not rows within one file (guess) |
| AL-NUMBERS-SOURCE-001 | L1 | AH TR2, TR3/B1 (BUG-006/059); TR2, TR3/B1 (0dc8ae4d, 05037e8b) | Fixed | **Showcase-only test**: price level unified, 24h change still from different snapshots and Showcase drifts per load (Showcase-only test of TR3) / one service, but per-page fetch times and a separate observation series on asset pages |
| AL-NUMBERS-SOURCE-002 | L1 | TR5 | Fixed | **one entry point only**: TK-201 fixed for tab-added assets only |
| AL-NUMBERS-SOURCE-003 | L1 | WE13 (N-195) | Fixed | **one entry point only**: ranges said fixed; asset-page ranges still 24H/7D/30D/Available |
| AL-NUMBERS-SOURCE-004 | L1 | AH TR1/TR13/B4 Fixed | Fixed | **one entry point only**: hero counts holdings only |
| AL-ROUNDING-001 | L1 | TR4/B2 (M17); AH TR4/B2 (BUG-007/028) | Fixed | **one entry point only**: formatPrice applied to lists/cards, not to price-chart's headline / cards fixed, history headline + NOVA/ZIGi text not |
| AL-COPY-001 | L1 | WE9, C12 | Fixed | **one entry point only**: Markets/search rows still show the token-style Gold logo |
| AL-COUNTS-002 | L1 | TR11 (M-080) | Fixed | **one entry point only**: statuses read saved allocations, the asset list and archive path don't |
| AL-TOAST-001 | L1 | WE12 (351c51c5) | Fixed | **one entry point only**: the limit message lives in the hero card only |
| AL-A11Y-002 | L1 | WE1 (BUG-030), WE13 (N-191) | Fixed | **never wired into UI**: closed without header sorting |
| AL-TOAST-002 | L1 | WE4 (8a7e9727), F5 | Fixed | **one entry point only**: Wealth fixed, Markets missed |
| AL-PERF-001 | L1 | LA8, WE4, TR2 | Fixed | **one entry point only**: loading outline covers cold load, not the price settle |
| AL-PERSISTENCE-001 | L1 | WE13 | Fixed | **one entry point only**: layout and ranges remembered, filter not |
| AL-TOAST-003 | L1 | WE14 (M-108) | Fixed | **one entry point only**: REOPENED (partial) |
| AL-COMPETITOR-GAP-009 | L1 | WE17/J11, AJ item 15 / D9 | Fixed | **one entry point only**: entry point on goal pages only |
| AL-COPY-012 | L1 | J15 Built (ADR-034, b0e44cb2) | Built | **never wired into UI**: built but not discoverable |
| AL-CRASH-001 | L2 | AH VA2 (dates) | Fixed | **other**: 1900 is the Journal field's own min yet crashes |
| AL-CROSS-PAGE-SYNC-001 | L2 | AH TR9/B8/HA2 (BUG-043, N-056, N-086, L-021, M-037) | Fixed | **Showcase-only test**: fixed for user habits; Showcase seed keeps a manual 8-glass counter, Checklist rule ignores target (LC-002) |
| AL-DATES-001 | L2 | AH VA2 (dates 1900/2199) | Fixed | **one entry point only**: limits guard values, not these date inputs (max 2199) |
| AL-DATES-002 | L2 | AH TR10/HE2 Fixed | Fixed | **other**: window anchored on today |
| AL-FIELD-ERROR-003 | L2 | AH VA1/C1, VA9/C2, C3, VA6, VA7 Fixed; AH VA1/C1, VA9/C2, C3 Fixed; HE12, HE3, HE6, TR10, VA1, VA5, VA6, VA9, WE12; VA2 Fixed (weight 20–400); AH VA2 (BUG-022), A7 plainErrorMessage | Fixed | **one entry point only**: fixed for range errors; non-numeric/negative still get grams/servings text far from the field / REOPENED |
| AL-LIMITS-002 | L2 | HE2, HE5, VA2; VA2 Fixed; AH VA2/B3 Fixed (M23 hard caps) | Fixed | **never wired into UI**: VA2 Fixed (ADR-033) but the bot re-found 30 h sleep/day and 99,999,999 steps/day accepted (DV-052, DV-059): average goals and Health goals were not wired to the limits table / VA2 guarded Health log entry points, not Health-goal or average-goal targets |
| AL-NAV-002 | L2 | AH C9 Fixed (2361b562) | Fixed | **one entry point only**: tab= and # fixed; ?view= only knows 4 full views and the tab isn't kept / view= path not covered |
| AL-TIMEZONE-001 | L2 | AH DS2 Fixed (greeting by hour), BUG-023 NO1; AH DS3 Fixed (nap wording 3bc64a6d) | Fixed | **one entry point only**: defaults not clamped to now before 07:00 / wording fixed in toasts, not form labels; default night still fails before 07:00 |
| AL-A11Y-004 | L2 | AH LA7/E3 (names present) | Fixed | **one entry point only**: names exist but are ambiguous |
| AL-COPY-018 | L2 | AH HE8 Fixed | Fixed | **one entry point only**: claim removed but the card still shows and can only say "none" |
| AL-CROSS-PAGE-SYNC-002 | L2 | AH HA2/TR9 Fixed | Fixed | **one entry point only**: suggestions created without the rule |
| AL-FIELD-ERROR-005 | L2 | AH HE14 (Save at 0) | Fixed | **one entry point only**: Save now disabled but silent |
| AL-HEALTH-SAFETY-001 | L2 | AH HE2 Fixed (coach floor 1,200) | Fixed | **one entry point only**: floor in coach/budget only; Targets accepts 1,000 silently |
| AL-IMPORT-EXPORT-003 | L2 | AH HE14 Fixed (CSV messages) | Fixed | **one entry point only**: negative still "not a number" |
| AL-LIMITS-003 | L2 | AH DS2 / TO5 Fixed; AH HE7 + DS5 Fixed | Fixed | **one entry point only**: rule applied to Sleep/Fast only / the 10-min rule went into the Checklist stop only |
| AL-NUMBERS-SOURCE-005 | L2 | AH GO11 Fixed? | Fixed | **other**: possible REOPENED |
| AL-UNDO-001 | L2 | AH DS5 Fixed ("Undo or confirm") | Fixed | **one entry point only**: sleep got confirm only |
| AL-ROUNDING-002 | L2 | AH TR4/TR10 | Fixed | **one entry point only**: prefill, PB card and recipe macros bypass the display rounding |
| AL-TOAST-005 | L2 | AH VA7 Fixed | Fixed | **other**: stale status after Undo |
| AL-CONFIRM-DELETE-004 | L3 | HA3/C6 Fixed ("Archive in the ⋯ menu", "starts today when today is em…; HA3; AH HA3 Fixed | Fixed / Done | **one entry point only**: only Archive went into ⋯; with a record today everything starts tomorrow, so Delete is unreachable the same day; N-078 wording unchanged / earlier row closed as Fixed/Done; bot re-found it open on the 11-04 build (fresh profile, desktop) — earlier fix incompl… |
| AL-COPY-025 | L3 | TO4/H6/DE4 (N-108 iPhone steps only on Apple browsers) | Fixed | **one entry point only**: for N-108 — desktop Chrome still shows the iPhone steps |
| AL-NUMBERS-SOURCE-007 | L3 | TR9/B8/HA2 Fixed (7abfbfda); AK 5.6 auto-complete rules Built (ca810a… | Fixed / Built | **Showcase-only test**: AK built the rule editor beside the older field; the field (and template) no longer ticks the habit; likely tested with steps/Showcase only |
| AL-STREAKS-002 | L3 | AH HA2/TR9 Fixed (M18) | Fixed | **never wired into UI**: tick stored on add, never re-derived on delete |
| AL-STREAKS-003 | L3 | AH C6/HA6 | Fixed | **other**: H-008 still open (Nairobi NB-076) |
| AL-UNDO-002 | L3 | HE1 Fixed (N-050/N-105/N-128) | Fixed | **dev build only (incl. mocks / unit-only / headless tests)**: HE1 checked the save and the toast, not that Undo removes the entry |
| AL-COPY-029 | L3 | AK RELEASE_REVIEW_2 Today duplicates (P2 15c1e159) (guess) | Fixed | **one entry point only**: a duplicate line remains in the empty-Wealth state |
| AL-COUNTS-004 | L3 | AH HA2 (M-037) | Fixed | **other**: REOPENED? (M-037 listed as fixed) |
| AL-COUNTS-005 | L3 | HA15 Fixed (legend) | Fixed | **one entry point only**: legend added, mapping and theme parity not |
| AL-FIELD-ERROR-009 | L3 | VA1/C1 (BUG-026), HA10 (N-164), HA12 (N-150), VA4 (N-052); AH VA5 Fixed | Fixed | **one entry point only**: VA1/HA10 fixed other forms/defaults; the habit editor still falls back to its generic summary line / habit title still generic |
| AL-FIRST-RUN-006 | L3 | AK FR-18 (sticky action row < 768 px) | Fixed | **wrong width**: Possibly — FR-18 sticky row is phone-only; bot's "phone width" claim needs re-check |
| AL-PLURALS-001 | L3 | VA9 Fixed | Fixed | **one entry point only**: the habit edit sentence and weekly subtitle were not covered |
| AL-STREAKS-004 | L3 | C4 (Grok "not reproduced") | Not reproduced / Fixed | **never wired into UI**: never fixed, only recorded as not reproduced |
| AL-UNITS-003 | L3 | HA11 (2 decimals of a minute) | Fixed | **other**: HA11 chose 2 decimals; bot still reads "0.03 minutes" as wrong |
| AL-ACTIVITY-001 | L4 | TR12/B6 (BUG-040) Fixed; AH TR12/B6 Fixed | Fixed | **other**: every single Close still writes two rows / REOPENED |
| AL-CONFIRM-DELETE-005 | L4 | GO2/C5 Fixed ("Delete's reason in words"); AH GO2/C5 Fixed (M32); C5, DS5, GO2; DS5 Fixed ("Undo or confirm on every removal") | Fixed | **one entry point only**: the reason was worded, but the rule blocks milestone-only goals and the copy ("plan or recorded contributions") doesn't match / no Delete or reason on a money-free project goal |
| AL-CONFIRM-DELETE-006 | L4 | GO2, VA6; VA6 (AH, Fixed: messages far from button); VA6 + GO2/C5 Fixed (ADR-033) | Fixed | **one entry point only**: VA6/GO2 marked Fixed (cd216935, b492379f) but the confirm now renders ≈1,600 px above the button (DV-041, DV-021): placement moved, not fixed; bot used a long project goal page / delete confirm still ~900 px away |
| AL-COUNTS-007 | L4 | GO7, TR11, TR6; TR6/B5 + TR11 Fixed (ADR-033); AH TR6/B5 Fixed (ah-numbers spec) | Fixed | **Showcase-only test**: TR11/count rows Fixed in AH on Showcase data; on a fresh profile a completed-then-closed goal shows FINISHED 0, Journey "0 goals reached … set aside" (DV-042, DV-045, DV-058) / the one count function reads lifecycle 'closed' before 'reached', so closing erase… |
| AL-FIELD-ERROR-010 | L4 | VA6/VA1 (D-071 placement) Fixed | Fixed (part) | **one entry point only**: the target error was moved; the milestone-line error still shows on a later step |
| AL-NUMBERS-SOURCE-008 | L4 | TR11 Fixed ("'contributed' counts the typed amount"; "a reversal says… | Fixed | **one entry point only**: status derives from allocations, but the panel still shows history-only amounts as contributed |
| AL-NUMBERS-SOURCE-009 | L4 | GO3 | Fixed | **one entry point only**: GO3 Fixed, but the Review still says "Progress source: Existing wealth … 0 USD" when nothing was selected (DV-005) |
| AL-NUMBERS-SOURCE-011 | L4 | AH TR11, VA8 Fixed | Fixed | **other**: possible REOPENED |
| AL-UNITS-004 | L4 | GO3 ("EUR goal becomes ZIG") Fixed; STATUS AC 9e "1 unit of a custom… | Fixed | **never wired into UI**: the custom-unit funding path never matches its own symbol |
| AL-XP-BADGES-009 | L4 | TR12/B6 (BUG-004 "Target reached only on a crossing") Fixed | Fixed | **other**: a target edit counts as a crossing |
| AL-A11Y-016 | L4 | D3, DS4, GO8, GO9, HA17, LA7, SE9, TO7, WE14 | Fixed | **other**: Habit ⋯ menu still repeats the full habit name in each item (DV-186) |
| AL-ACTIVITY-003 | L4 | AH TR12 ("Showcase labels only on examples") | Fixed | **Showcase-only test**: REOPENED (Showcase mode) |
| AL-COPY-034 | L4 | AK FIRST_RUN_REVIEW (goalEyebrow/fundingFact); TR12 (M-049) Fixed; GO3, TR12 | Fixed | **one entry point only**: AK changed the savings eyebrow only; count/project panels, status log and wizard review still use money words / GO6/BUG-015 rows closed but the status log still reads "target 1 USD · counted 4 USD" (unit changed ZIG→USD) and projects show Saving plan / Fundin… |
| AL-COPY-035 | L4 | AK FIRST_RUN_REVIEW goalEyebrow | Fixed | **one entry point only**: the detail eyebrow was renamed; the card chip ("VALUE/QUANTITY GOAL"), the data-dependent wizard set and the post-funding label were not |
| AL-COPY-036 | L4 | GO10 Fixed (dates) "copy with Part 16's sweep"; GO10, GO9, TR11 | Fixed | **one entry point only**: the copy sweep didn't reach these strings / GO10 marked Fixed but "Funding Wealth" jargon (DV-007) and the raw UUID in the reversal dialog (DV-038) are still there |
| AL-COPY-042 | L4 | TR12 (D-156) Fixed | Fixed | **other**: corrections still carry no sign |
| AL-COPY-043 | L4 | GO3 | Fixed | **one entry point only**: GO3 marked Fixed but the type labels still change with profile data (DV-013) and step names stay "Optional sources/Optional Habit" (DV-003) |
| AL-COPY-044 | L4 | SE5, TR12 | Fixed / Done | **one entry point only**: earlier row closed as Fixed/Done; bot re-found it open on the 11-04 build (fresh profile, desktop) — earlier fix incomplete or untested on this path |
| AL-COUNTS-008 | L4 | SE5 (D-171) Fixed | Fixed | **one entry point only**: counts were added but come from a different query than the list |
| AL-DATES-006 | L4 | VA1, VA9 | Fixed | **one entry point only**: Past-date rule added to the wizard only; the Edit panel still saves 2020 (DV-025 vs DV-031) |
| AL-FIELD-ERROR-011 | L4 | GO6; GO6 Fixed ("unique milestone names") | Fixed | **one entry point only**: GO6 marked Fixed but duplicate milestone names are still accepted and indistinguishable for screen readers (DV-109) / duplicates are still accepted in the wizard textarea and the panel |
| AL-NAV-004 | L4 | GO9 ("filters that don't match the view"), sent to the Part 13 layout… | Done | **never wired into UI**: GO9's filter part was deferred and not done |
| AL-NUMBERS-SOURCE-012 | L4 | GO5 (L-066 "artwork change only updates the Cards view") Fixed | Fixed | **other**: default art still differs per view |
| AL-SEARCH-003 | L4 | F6, TO11, WE1 | Fixed / Done | **one entry point only**: earlier row closed as Fixed/Done; bot re-found it open on the 11-04 build (fresh profile, desktop) — earlier fix incomplete or untested on this path |
| AL-TOAST-007 | L4 | VA7 Fixed; LA7 (toasts not keyboard-dismissable) | Fixed | **other**: one generic "Private Goal saved…" string serves every goal action |
| AL-CHECKLIST-004 | L5 | AH TO5 Fixed (Focus) | Fixed | **Showcase-only test**: REOPENED (Showcase) |
| AL-QUICK-ADD-005 | L5 | AH HA5 ("read 20 pages → +20 min; meditated → +1 min") | Fixed | **regression**: HA5 fixed specific count readings, but "meditated" now gets "didn't understand" and a digit in a habit title is still read as a count |
| AL-FIELD-ERROR-013 | L5 | AH VA3 ("Checklist water box takes any text ('Log -250 ml')") | Fixed | **one entry point only**: VA3 fixed the range check at submit, but the button still echoes "Log -5 kg"/"Log abc ml" |
| AL-CHAIN-DATA-001 | L6 | ST1/DE1 (AH, Fixed facc2b0f) | Fixed | **one entry point only**: default is Practice now, but mainnet blocks still sit unlabelled under a Practice selection |
| AL-COPY-054 | L6 | ST5 (AH, Fixed), ST6 (Fixed) | Fixed | **never wired into UI**: funnel and 0-of-6 wording still present |
| AL-HELP-002 | L6 | SE1 (AH, Fixed part 799935f3); SE1, SE3, SE4 | Fixed (part) | **dev build only (incl. mocks / unit-only / headless tests)**: paths matched an account-enabled build, not an installation without sync / Help is still one very long page (DV-174) |
| AL-LAYOUT-DESKTOP-015 | L6 | SE3 (AH, Fixed part) | Fixed (part) | **never wired into UI**: tabs added, length unchanged |
| AL-SETTINGS-001 | L6 | ZI9 (AI, Fixed cef4c63e) | Fixed | **one entry point only**: ZI9 made the Ask-ZIGi doors follow the launcher, not the launcher's own Settings exclusion |
| AL-STALE-DATA-001 | L6 | WE15 (AH, Fixed: links, labels, Light) | Fixed | **never wired into UI**: header date still hard-coded "Sep 23" |
| AL-CHAIN-DATA-005 | L6 | ST7 (AH, Fixed) | Fixed | **never wired into UI**: clutter part unchanged |
| AL-CHAIN-DATA-006 | L6 | ST7 (AH, Fixed) | Fixed | **other**: raw reason and Yes 100 % without turnout remain |
| AL-COPY-055 | L6 | ST7 (AH, Fixed) | Fixed | **never wired into UI**: D-169 wording unchanged |
| AL-COUNTS-011 | L6 | AH TR6/B5 Fixed | Fixed | **Showcase-only test**: REOPENED (Showcase) |
| AL-LAYOUT-500-001 | L6 | ST6 (AH, Fixed index, chest) | Fixed | **wrong width**: strip still hidden under the bottom bar at 500 |
| AL-SETTINGS-004 | L6 | AH HA16 Fixed | Fixed | **one entry point only**: 22:00 still suggested inside quiet hours |
| AL-SETTINGS-007 | L6 | STATUS.md AK: /api/push-device no longer on every Settings load (21d6… | Fixed | **one entry point only**: push-device fixed; /api/push and private-account status still 503 on every load |
| AL-TIMEZONE-003 | L6 | BUG-037 (Oct 21 not reproduced; AH NO1 recorded) | Not reproduced | **one entry point only**: only visible before the seed hour (07:00–10:00); earlier checks ran in daytime |
| AL-AI-SAFETY-002 | L7 | Session V careful mode; AI ZI10/G8 | Fixed | **regression**: Z-023 was GOOD on 26 Oct; "500 kcal/day" slips the "(a or per) day" patterns and cards aren't gated by careful mode |
| AL-AI-ACTIONS-001 | L7 | AK N5 (Built: confirm cards with Undo) | Built | **dev build only (incl. mocks / unit-only / headless tests)**: built and tested against mocks that do not validate JSON schema; real Ollama 0.40.14 rejects it |
| AL-AI-ACTIONS-002 | L7 | N5 (ADR-036 "Built: confirm cards with Undo for every pillar"); WIRIN… | Built | **dev build only (incl. mocks / unit-only / headless tests)**: the spec covers chat-card Undo; the workflow panel closes on Undo before the record is removed (guess) |
| AL-AI-ACTIONS-003 | L7 | AI G4 · BUG-058 ("mark Read done") | Done / Fixed | **one entry point only**: fixed for one-word titles, but names with digits or units ("Read 10 pages", "Stretch 5 min") and partial names still fall back |
| AL-AI-CONNECTION-002 | L7 | AK N3 (Built: 10 planets with live checks) | Built | **dev build only (incl. mocks / unit-only / headless tests)**: the checks accept any server that answers /api/version and /api/tags (a mock passed) |
| AL-AI-FACTS-001 | L7 | ZI2 (AI, Fixed); G3 Fixed ("an exact name wins") | Fixed | **one entry point only**: router keyword scoring still lets one word win / the keyword specialists run before the goal-name match |
| AL-AI-FACTS-002 | L7 | ZI2/DE7 (AI, Fixed for named questions) | Fixed | **never wired into UI**: fixed for the listed natural questions; page facts were never routed |
| AL-AI-FACTS-003 | L7 | G2/ZI2 Fixed; AI ZI2 Fixed; G2, ZI2; ZI2/G2 Fixed; G13 | Fixed | **one entry point only**: fixed in NOVA (chips) only; the Goals-page ZIGi panel still falls back / the intents exist in NOVA's path (AK) but ZIGi's engine lacks them |
| AL-AI-FACTS-004 | L7 | G4 Fixed; AI G4 (follow-ups); G4 (79670c8c); G4 | Fixed / Done | **dev build only (incl. mocks / unit-only / headless tests)**: unit tests pass, but the panel phrasing "how mch… / and the second one?" still falls back / G4's follow-ups cover the streak family only; "and which is done?" and the 2-line ask still fall back |
| AL-AI-FACTS-005 | L7 | G1, ZI1; AI ZI1 · L-004 (cited, 83055397); ZI1 / G1 (83055397); ZI1/G1 Fixed (83055397); ZI1/G1 Fixed; ZI1/G1 (AI, Fixed 83055397); AI ZI1/G1 Fixed (BUG-057, the same water prompt) | Fixed | **one entry point only**: Check-in phrasing (BUG-058) still not understood (Z-038/Z-039 on 11-04) / ZI1 fixed the card path, but the in-turn "Will save" composer still attaches to the question (Health off and on) |
| AL-AI-FACTS-007 | L7 | AI DE7 · L-051 (cited 79670c8c) | Fixed | **other**: DE7 gated the suggested chip; the typed question still returns the schedule list |
| AL-AI-FACTS-008 | L7 | ZI2 Fixed (on-track); G9, G10 | Fixed | **dev build only (incl. mocks / unit-only / headless tests)**: ZI2 pinned other phrasings; page-deictic questions not covered |
| AL-AI-FACTS-009 | L7 | ZI2/G2, G4, G5 Fixed | Fixed | **dev build only (incl. mocks / unit-only / headless tests)**: fixed phrasings pass in unit tests; lowercase/short variants fall through |
| AL-AI-FACTS-010 | L7 | ZI2, ZI12 (83055397) | Fixed | **one entry point only**: ZI2/ZI12 covered other phrasings; money intents fall to net worth or the list |
| AL-AI-SAFETY-003 | L7 | AK N9 (Built: injection tests, loop caps) | Built | **one entry point only**: injection tests cover tool paths; free-text false claims and invented secrets from a local model are unguarded |
| AL-AI-SAFETY-004 | L7 | G8/ZI10 Fixed (ADR-034); Session V careful mode; ZI10/G8 (AI, Fixed: "not medical advice"); AI G8/ZI10 Fixed; AK N1/N9 "Built" | Fixed / Built | **never wired into UI**: careful mode covers self-harm/eating patterns only; "hopeless" and "chest pain" don't match, and the on-device fallback never consults it (guess) / the guardrail covers advice wording only; no emergency path exists in safety.ts |
| AL-COPY-059 | L7 | ST5, TO9, ZI6, ZI7, ZI8 | Fixed | **one entry point only**: ZI8 quiz rows fixed for wording; the result card still appears below the fold with no scroll/focus (DV-068) |
| AL-NUMBERS-SOURCE-014 | L7 | ZI3/G7, TR1 Fixed; ZI3 / G7 (83055397) | Fixed | **Showcase-only test**: ZI3 named both stores for ETH, not for "portfolio worth" / ZIGi rows ran in a Showcase-contaminated profile (re-test clean), but NOVA in the clean profile also prints a 17-digit Portfolio price |
| AL-PRIVACY-003 | L7 | N4 (ADR-036 "What NOVA can see is the exact pack"); Z1A-10 Fixed | Fixed | **other**: the preview reads empty while chat reads 7 goals |
| AL-PRIVACY-004 | L7 | AI ZI13; AK N4; ADR-034 ZI5 Fixed (visibility); B-055 | Fixed | **one entry point only**: copy says "the same switches" but NOVA keeps its own / ZI5 fixed visibility only; the two switch sets still disagree |
| AL-AI-ACTIONS-007 | L7 | ZI11/J10 Fixed; G4 (BUG-058) Fixed; ZI11 Fixed ("Create a habit called Yoga") | Fixed / Built | **never wired into UI**: the simple-command parser doesn't see goal-scoped commands in the panel/NOVA chat / only the simple phrasing; schedule/time/skip/pause not built |
| AL-AI-ACTIONS-010 | L7 | AK N1/N5 "Built"; AI J10/ZI11 (Built); AI G5 | Built | **never wired into UI**: NOVA's on-device path skips the quick-log cards / G5 moved help text in Quick add, but ZIGi's turn still prints the fallback above the preview |
| AL-AI-CONNECTION-003 | L7 | AK N0/N3 (Built, sources read 1 Nov) | Built | **dev build only (incl. mocks / unit-only / headless tests)**: guide never exercised on a minimal Linux or CPU-only box |
| AL-AI-CONNECTION-004 | L7 | ZI8 Fixed ("result scrolled into view"; no test) | Fixed | **dev build only (incl. mocks / unit-only / headless tests)**: still below the fold with no scroll; no test pinned it |
| AL-AI-CONNECTION-007 | L7 | AK EX-11/EX-13 (planet state) | Fixed | **Showcase-only test**: Showcase data satisfies checks (Showcase-only gap) |
| AL-AI-FACTS-015 | L7 | ADR-034 ZI1/ZI2/G1/G2/G4/G5 Fixed | Fixed | **other**: REOPENED |
| AL-PRIVACY-005 | L7 | ZI10, ZI13 (AI, Fixed; defaults unchanged by owner) | Fixed | **one entry point only**: ZI10 covers ZIGi's device path, not NOVA's model replies; B-055 default is an owner decision |
| AL-A11Y-024 | L7 | AH LA7 (Fixed part: "Checklist launcher outside landmarks") | Fixed (part) | **other**: LA7 listed the Checklist launcher region; axe still flags it (Lisbon sweep and LA chunk 7) |
| AL-COPY-064 | L7 | ZI7 Fixed ("one status line") | Fixed | **other**: answers still carry two lines |
| AL-AI-FACTS-016 | L7 | AI DE7/G2 Fixed | Fixed | **one entry point only**: chips are gated by model pass, not by the current scope |
| AL-AI-SAFETY-006 | L7 | AI ZI10/G8; ZI10/G8 Fixed ("device says the same with no AI") | Fixed | **one entry point only**: matcher needs a full sentence / this phrasing isn't detected |
| AL-AI-STABILITY-006 | L7 | ZI15 / G5 (79670c8c) | Fixed | **one entry point only**: fold may apply only to model answers (guess) |
| AL-AI-FACTS-018 | L7 | AI ZI12 Fixed | Fixed | **one entry point only**: the answer exists only with data; a clean app falls to the examples list |
| AL-LAUNCHER-OVERLAP-001 | L10a | LA1 "Already fixed (M45)"; GO9; AH LA1 "Already fixed" (BUG-005/034/081, M45); LA1/D2/HE10 "Already fixed" (M45); LA1/M45 (ADR-033), AK RELEASE_REVIEW R20, FR-19, H125/H137 (ADR-036 d); LA1/D2 (AH, A… | Already fixed / Fixed | **wrong width**: fixed for the 390 test widths; the bot saw overlap at 388 (zoomed), 640 and 768 on most pages / AH judged it already fixed. AK then added the Checklist launcher to the right-edge stack, which covers Health controls at 768 and 375 |
| AL-LAYOUT-375-011 | L10a | LA3 "Already fixed (M45)"; LA9; LA2, LA3 | Already fixed | **wrong width**: the bot still measures ~370 px of chrome at 388 / Still ~370 px of chrome before the page title at 388 px (DV-223) |
| AL-LAYOUT-375-012 | L10a | Alpha #45 NO1 "Fixed"; AK RELEASE_REVIEW "no overflow" | Fixed | **wrong width**: scripted viewports pass; real DevTools 375 emulation pans ~140 px |
| AL-NAV-010 | L10a | AK RELEASE_REVIEW_2 R2-10 / ADR-036 Q31 "Fixed"; GO12, HE5, ST9, TO9 | Fixed | **wrong width**: desktop entries show only in windows ≥ 1380 px tall; the bot's windows were 800–1113 px tall; Agenda was never added / Pages-list preview still omits NOVA/Checklist/Journey that the sidebar shows (DV-045) |
| AL-PERSISTENCE-011 | L10a | AH DS1 Already fixed; DS9 | Already fixed | **one entry point only**: DS1 proved no overwrite; drafts still reset when another tab writes |
| AL-THEME-003 | L10a | LA5 | Fixed | **one entry point only**: Light-theme rows closed in AH but gradient words still wash out on Goals cards (DV-051) |
| AL-THEME-004 | L10a | LA5, ST4, WE15 | Fixed | **wrong width**: Today hero still a dark block in Light at 388 px (DV-225) |
| AL-NAV-013 | L10a | AH H5 Fixed | Fixed | **one entry point only**: REOPENED (banner keyed on nav, not route) |
| AL-FIELD-ERROR-018 | L10b | VA5/VA6 (AH, Fixed cd216935); VA5 Fixed; VA1/C1, VA6 (cd216935, M24) | Fixed | **one entry point only**: fixed for empty required fields in the listed forms; staking, calculator and goal-edit paths not covered / the rule reached the forms listed in AH, not these |
| AL-FIELD-ERROR-019 | L10b | GO6, VA1, VA5, VA6; VA1/C1 Fixed | Fixed | **one entry point only**: AH VA1 'never show raw JSON' was fixed by replacing the dump with reason-less text: Edit target 0 → "Could not save.", history 0 → "History was not saved.", empty Edit name silent, 0 vs -5 messages contradict / VA1 removed the raw JSON but the replacement dro… |
| AL-LAYOUT-375-014 | L10b | LA4 Fixed (D-255); LA4, ST6; AH LA4 Fixed | Fixed | **wrong width**: the fade is not visible to the bot at 375 (DevTools) and 388 (zoom) / Scroll-cue rows closed in AH but Activity chips and intro cards are still clipped with no cue at 375/388 px (DV-087, DV-222) |
| AL-LIMITS-004 | L10b | VA2/B3 (ADR-033 Fixed); TR4 (D-195); VA1, VA2; AH VA2/B3 Fixed | Fixed | **never wired into UI**: amountMax exists but is wired only into assets/portfolio/accounts; the goal wizard, edit, history and plan paths never call it / AH VA1/VA2 marked Fixed but only negative/zero/decimals are refused; no upper bound was ever added (bot: 1e20/1e21/1e28 accepted i… |
| AL-LIMITS-005 | L10b | VA4 Fixed (counter); G5, NO1, VA1, VA4; ADR-033 M23; AH VA4 Fixed (counter); VA4 (counter while focused, M23) | Fixed | **one entry point only**: the counter was added to the wizard's main name field only; Edit, project path, milestone panel, tasks and widgets lack it / Name-limit rows closed in AH (VA/GO rows) but the Edit-details name field still cuts at 80 with no counter (DV-025, DV-106); only the… |
| AL-PERSISTENCE-012 | L10b | A3, DS9, GO3, GO5; DS9/A3 + GO3/C4 Fixed | Fixed (part) | **one entry point only**: Escape now leaves the wizard and drops typed text silently, the guard fires on untouched drafts (DV-004, DV-056, DV-064) and habit Cancel still discards (DV-188) / the draft survives, but the guard fires when nothing changed and Escape drops text |
| AL-ROUNDING-004 | L10b | AH M52/TO7 rounding (lib/rounding-ah.test.ts) | Fixed | **one entry point only**: ring vs caption still floor vs round |
| AL-ROUNDING-005 | L10b | TR12, TR4 | Fixed | **other**: Still "$99,999,999,999,999,999,999.00" and unsigned corrections (DV-054); formatting rows were closed while the limits gap fed it |
| AL-TOAST-011 | L10b | VA7 Fixed (stale live region); VA7 (AH, Fixed 24da254e) | Fixed | **other**: the Habits live region still keeps "Habit created." / the restore status region still accumulates |
| AL-UNDO-005 | L10b | AH A5/WE2 Fixed | Fixed | **never wired into UI**: list views not wired |
| AL-A11Y-026 | L10b | AH LA7/E3 Fixed (part) | Fixed | **other**: REOPENED |
| AL-DATES-008 | L10b | GO10, VA8; VA8 Fixed (ISO dates on goal detail) | Fixed | **one entry point only**: VA8 marked Fixed but the plan form still prints ISO "2026-12-04" next to "Dec 4, 2026" (DV-033) / the plan form's next-contribution date still prints ISO |
| AL-PLURALS-003 | L10b | AH VA9 Fixed ("1 milestones" listed); VA9/C2 + C4 Fixed (named "1 milestones"); GO6; AH C4/VA9 Fixed | Fixed | **one entry point only**: Goals cards still "1 milestones" / fixed in one string; the project hero/card/remaining strings still concatenate |
| AL-BACKUP-RESTORE-003 | INT | AK J6-2 ("answered on screen", c53dbfaf) | Answered on screen | **never wired into UI**: AK answered J6-2 with copy only. The encrypted-restore preview is still silent, and Tasks were never covered |
| AL-IMPORT-EXPORT-006 | INT | DS6/A2 (749e2d75), WE3 ("our own export doesn't re-import") | Fixed | **dev build only (incl. mocks / unit-only / headless tests)**: export ships stored minor units / 18-dec integers; round trip never tested |
| AL-HELP-006 | INT | STATUS Part 14 (Help/What's new/KL) | Fixed | **other**: content stale vs this build |

## Lessons

Counts per category (one category per AL row, from its helpers' notes):

| category | AL rows |
|---|---|
| wrong width | 8 |
| Showcase-only test | 9 |
| one entry point only | 76 |
| dev build only (incl. mocks / unit-only / headless tests) | 11 |
| never wired into UI | 19 |
| regression | 2 |
| other | 25 |
| **total** | 150 |

"other" = the earlier fix exists but its logic is still wrong, or the helper gave no reason (e.g. "a target edit counts as a crossing", "window anchored on today", "possible REOPENED").

Lessons for ADR-037 (plain words):

1. **Fix the shared source, then check every door into it.** Half of the reopened rows (one entry point only) were fixed in one place: the date rule in the wizard but not Edit, the ISO list for accounts but not the asset editor, Refresh feedback on Wealth but not Markets, the answer-only rule on the model path but not the on-device fallback. Before closing a row, list every entry point that reaches the shared source and test each one.
2. **Test the outcome the user sees, not a stand-in.** Rows were closed because the toast appeared (but Undo left the water log), because mocks accepted a tool schema real Ollama rejects, because unit tests passed for the exact phrasings in the spec. A closing test checks the stored record, the real local server and phrasing variants (typos, lowercase, Dutch, follow-ups).
3. **Showcase data is not a fresh profile.** Counts, labels and setup checks passed on Showcase data and fail on an empty or real profile (completed-then-closed goals, NOVA setup planets, "Showcase example" labels). Every closing test also runs on a fresh empty profile.
4. **Test at the widths and window heights people use.** Launcher overlap and phone chrome were closed at 390 px headless or at the page end; the bots saw them at 375 (DevTools), ~388 (zoom), 480–610, 768 and in windows under 1,380 px tall, mid-scroll. Use the fixed width list in a real browser and scroll through the page.
5. **"Built" means reachable from the UI.** Helpers existed but were never called where it mattered (amountMax only on assets, careful mode never consulted by the device fallback or NOVA, a rule editor beside an older field that no longer works). A row is closed only when a search shows every caller uses the helper and a UI test reaches it.
6. **AI fixes need phrasing families and both assistants.** ZIGi/NOVA rows reopened most (33 in L7): fixes covered named questions in one assistant. The eval set holds each intent in several phrasings, in English and Dutch, for the ZIGi panel and NOVA, with and without a model.
7. **Guard what already works.** New work broke earlier fixes (the Checklist launcher re-created the overlap; a parser change made "meditated" unreadable). Keep-list items become specs before the next feature lands near them.
8. **"Not reproduced" is not "fixed".** Rows closed as not reproduced came back under the bot's conditions (before 07:00 local, fresh profile, short windows). Reproduce with the reporter's time, profile and width before closing.
