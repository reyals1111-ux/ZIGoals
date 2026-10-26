# ADR-033: Session AH, "The Big Polish": session decisions

Status: **In progress** on `feature/session-ah-polish`, from `main` `f13abb0` (Merge #94, Session AG Polish 3; live as Alpha #49), in a cloud session. This record holds the owner's decisions at plan approval, the owner's amendments, every decision the session took without asking (M1…), and the closing table for every ID in the brief's index. Resume point: `docs/handoff/AH_RESUME.md`.

## Owner decisions (2026-10-25, plan approval)
- **The brief:** Session AH, "The Big Polish": every owner-approved finding from the two Grok reports (Alpha #44 picklist 1, Alpha #45 picklist 2), the open roadmap (RM4–RM8), security (scope E) and CI stability (scope F), in Parts 0–16. No UI redesign; every item is a logical fix to a real problem. After plan approval the session runs to the end without owner steps.
- **The scope file:** `origin/review/session-ah-scope:owner-scope/AH_SCOPE.md`, read into the session scratchpad with `git show`, never committed or merged.
- **Lane rule:** `apps/web/lib/ai/**`, ZIGi components and ZIGi evals belong to the later ZIGi session. Shared numbers and limits go into shared modules; ZIGi wires to them later.
- **Non-negotiables:** never merge, deploy, approve environments or log in to Cloudflare; no change to wallet signing, keys, transaction building or contract calls; no new dependency except Part 1's security bumps (pre-approved); reduced motion and Motion Off; theme parity; phones native-feel, computers and tablets keep their layout; route weights within budget; no fake data shown as real; the Checklist path, phone river, labels, footer and everything AG Polish 3 shipped are protected; the NO2 keep-list stays working; the Showcase and the empty start both clean.
- **Not in AH:** AF1, AF2, AF8, AF9, LA12; ZIGi items (ZI1–ZI15, DE7, the G-items, J10, L6, RM1–RM3, AF5, HE17); everything Later or Skipped in the scope file.
- **The approved plan:** `/root/.claude/plans/snug-fluttering-hartmanis.md` (summarised in the resume file).

## Owner amendments (2026-10-25, after approval; pre-approved)
1. **Every finding, not every row.** For each scope row, every finding ID (B-, N-, D-, L-, M-, T-, C-, BUG-) is fixed, or recorded as already fixed (with evidence) or not possible (with the reason). The closing table lists them per row.
2. **The "already fixed" check runs per part.** At the start of each part, for that part's rows only. Part 0 keeps the records, this ADR, the resume file, the Draft PR and RM8.
3. **DS1's revision stamp** is a stored-format change: additive (an optional field or a new device-only key), labelled TIER 3 (stored format), proven with the frozen readers #37–#49.
4. **SE14 device lock:** optional and off by default. It never makes the person's own local data unreachable: a clear recovery path, no encryption of data by the lock itself, no lockout beyond a short delay after failed attempts. If that cannot be done safely without dependencies, it is recorded instead of built.
5. **HA2/TR9 auto-tick from Health never double-counts.** A manual tick or log plus a Health log counts the day once. Unticking a Health-derived tick explains why it is ticked.
6. **TR7:** if the app has no exchange-rate source already, the currency switch hides with an honest "coming later"; no new outside data source or egress.
7. **RM6 PR-review Action:** `pull_request` only (never `pull_request_target`), never on forks, least-privilege permissions, the secret never echoed, a clean skip without it.
8. **CO11 notification actions and any service-worker or manifest change:** TIER 3 (PWA), with rollback.

## Owner amendment "Health journal date" (2026-10-25, during Part 2; pre-approved)
Part 17, the last part before the final STATUS commit and the final CI round: **one chosen day drives the whole Health page.**
1. **Behaviour (a bug today).** Changing the Journal date (← / →, the date itself, "Today") switches the WHOLE page to that day: quick counters (the owner's example: on 22 Oct the counters still showed 25 Oct's values, "Today in your Health journal · 25 Oct 2026"), water, food, meals, sleep, weight, measurements, meditation, fasting, workouts (DE8) and every other day-based widget.
   - Logging while a past day is selected logs to THAT day, clearly labelled ("Logging for Thu 22 Oct"). Future days can't be logged.
   - Trends and summaries over many days stay as they are, but mark the selected day.
   - A widget stored only as "today" gets per-day storage, additively (TIER 3 (stored format), frozen readers #37–#49), keeping today's values.
   - Deep links `?date=YYYY-MM-DD` (with C9's `?tab=`) open that day.
   - Tests: switching days shows that day's counters and values; logging on a past day stays on that day; Today returns.
2. **The date bar:** more interactive and visually stunning, never taller than now.
   - ← / → as nebula-gradient buttons (≥ 44 px, liquid-glass hover without pointer tracking, focus rings).
   - "Today" a real pill button in the nebula style, hidden or disabled when today is selected.
   - The date in ONE English format (VA8; e.g. "Thu 22 Oct" with a small "3 days ago" / "Yesterday" / "Today" hint); tapping it opens a date picker. (The owner's screenshot shows the native field in the device's language, "22 okt 2026", beside English copy.)
   - Phones: swipe left/right on the bar changes the day. Keyboard: ← / → when the bar is focused.
   - A one-time subtle change animation, off under reduced motion and Motion Off; theme parity in Nebula, Light and Dark.

## Owner amendment "Checklist header, phone title, counters" (2026-10-25, during Part 3; pre-approved)
Part 18, after Part 17 and before the final STATUS commit and CI round. **Owner exception to PROTECTED:** the Checklist's TOP BAR may change as below; the path, river, labels, banners and planets stay exactly as approved and their pin tests keep passing.
1. **Checklist top bar (phone and computer).** The "0 of 9 planets today" text goes (kept for screen readers only, visually hidden, with the same live update). In its place, next to X: the Path / List switch exactly as it looks in the ⋯ menu (same icons, labels, size, active one highlighted). "Edit path" and "Options" also go in the bar if they fit at 360 px with ≥ 44 px targets (icon buttons with accessible names are fine); whatever does not fit stays in ⋯, which keeps "How it works". The streak, + and ⋯ stay; nothing is listed twice. Computer: the same switch next to X; "Your orbit" stays; only the count goes (screen-reader-only).
2. **Phone top bar on every page:** the page-name text next to the logo goes (the selected bottom-bar button shows where you are); the name stays for screen readers and in the document title; the freed space keeps the Checklist pill and the other buttons from truncating.
3. **Health quick counters:** (a) −, the number and + in a fixed right-aligned group with a fixed-width tabular number column (4 digits), so every row's − lines up; (b) tapping the number makes it a numeric input (numeric keyboard on phones), prefilled and selected; Enter or blur saves, Escape cancels; validated by the shared plausibility limits (VA2) with an inline error; a labelled Undo after saving; saves to the Health journal's selected day (Part 17); accessible name such as "Push-ups count, edit". Tests at 360 and 390, Nebula/Light/Dark, reduced motion respected.

## Decisions taken without asking
- **M1 — The branch.** The owner named `feature/session-ah-polish`; the harness branch `claude/wizardly-albattani-zc9cco` stays untouched, as L1 and K1 did.
- **M2 — The sandbox runs Node 22.22.0 against the project's 24.19.0.** As in AG Polish 2 and 3, a handful of unit files fail only here (`pre-run11-setup`, `run11/domain-review-race`, `visual-format` ja-JP, `vault/finance-homes`); CI on Node 24 is the judge for them. The Chrome channel points at the preinstalled Playwright Chromium (153) locally only.
- **M3 — The alert list.** The GitHub Security tab is not readable from this session; Part 1 works from `pnpm audit` on the lockfile of `f13abb0` (25 Oct): 16 advisories in five packages — `vite` 8.3.0–8.3.2 (GHSA-698v-4r3x-3vcv, GHSA-r825-w8mm-5pxw, GHSA-587h-7wmj-h5pm high, GHSA-9jrq-w75r-8gcw low, GHSA-rq7h-c2jc-7f22, GHSA-vfpm-58rq-9qcg; through `vitest` → `@vitest/mocker`; AF14), `@vitest/mocker` < 5.0.3 (GHSA-qxg6-89mg-rqv8, GHSA-xp26-3454-mjgp), `glob` 10.3.3 (GHSA-5j98-mcp5-4vw2 high; `@node-minify/core` under OpenNext), `body-parser` < 2.4.0 (GHSA-27r3-jxmh-p828 high; `express` under OpenNext), `undici` < 7.30.1 / < 8.12.2 (GHSA-4qv8-2p9j-2685, GHSA-f72v-6w45-q472, GHSA-xjj6-f33q-929c high; `miniflare` and `jsdom`). STATUS lists exactly which are cleared.

- **M4 — RM8, verify-then-do (Part 0).**
  - *Timezone phase 3 (R1, read support):* done in Session P (`5b91f72`, PR #68). *Phase 4 (R2, writes and UI):* done in Session W Part 17 (`e5a1554`, `44e96e1`). Nothing open.
  - *QA2-04 (a reminder's day by the journal's zone, its time by the device clock):* left as an owner question in QA sweep 2; with phase 4 live it is a plain inconsistency, so fixed here: `zoneClock` in `lib/reminders/due.ts` reads the time in the same zone as the day (the Habit journal's zone for habits, the Health journal's for water; the device clock when a journal follows the device). Test: `lib/reminders/reminders.test.ts` (Tokyo journal, device elsewhere). ZIGi's own reminder rules (`lib/ai/knock/*`) still use the device clock: the ZIGi session's lane.
  - *The `@2x` brand assets:* already renamed to `-2x` in `37ca600` (no file under `apps/web/public` has `@` in its name; `lib/brand-assets.test.ts` guards it).
  - *Portfolio sync:* done in Session U (`c043105`, opt-in, ADR-013). *Full coin search:* both Portfolio searches (`CoinSearch`, `CoinPicker`) search the whole market catalog through `searchMarketAssets`; its ranking is WE1 (Part 9).
  - *Face ID / passkey for remembered devices:* ADR-008 option 2 (a passkey with PRF) still needs a test on a real iPhone (Safari's PRF `get()` support disagrees between Apple's notes and MDN). Not buildable or provable from this sandbox; stays open for the owner's device test. The separate device lock (SE14) is Part 12, under amendment 4.

- **M5 — Part 1, how each dependency commit was checked.** Every commit: lint, typecheck, the full unit suite (its failures compared file by file with `main`'s in this sandbox: identical, M2) and `pnpm audit`. The commits that touch build or Worker tooling (glob, body-parser under OpenNext; undici under miniflare) also ran `build:alpha` (next build + OpenNext), `check:alpha` (wrangler dry-run) and the local preview smoke (`preview:alpha`, wrangler dev, no login, no deploy: 21 app routes 200, `/` 307 to `/app`, robots and manifest 200, no Worker error). vitest, vite and jsdom's undici reach only the unit runner, so a build cannot change with them; after the last commit the production build, the route weights (all 21 pages and the shell within their lines, unchanged) and the frozen readers #37–#49 (13 builds × 33 records) ran once on the final tree. `pnpm audit` (full and `--prod`): no known vulnerabilities.
- **M6 — `scripts/frozen-readers.mjs`.** Its default list now runs #37–#49 (#45 `8778497`, #46 `98a29b4`, #47 `b0fe242`, #48 `261f32a`, #49 `f13abb0` added), and without `--out` it no longer drops its first SHA argument (the open item AG Polish 3 recorded).
- **M7 — Node 22's `createRequire` (the sandbox).** 76 of the unit files that fail here (`scripts/run10/*-runtime`, `scripts/run11/*`) load Miniflare through `createRequire(apps/web/node_modules/wrangler/package.json)`. Node 22 resolves from the symlinked path, where pnpm puts no `miniflare`; CI's Node 24 passes them. The same files fail on `main` here; nothing changed for them.

- **M8 — Part 2, how the intermittents were found.** A helper read every failed job of AG Polish 3's 13 failed Milestone quality runs (24–25 Oct; 58 jobs, logs whole) and catalogued each failure with its error; the reproducibility failures were read from run 39445348581's own artifacts. Each fix names its CI evidence in its commit. Not intermittents: the Checklist geometry failures, `path-engine`, `checklist-quick-add` and the staking guard's `Math.sign(` were AG Polish 3's work in progress, green on its final head. One-offs with no cause found (`hosted-verifier-order:16`, `page-marks:96`, WebKit's "internal error" / "Target crashed" in four ZIGi specs) are WebKit or runner instability; they stay under the one-re-run rule.
- **M9 — Reproducibility and the kernel (AF16).** The two canonical legs failed "environment disagreement" whenever they ran on different runner images, because the kernel (`osRelease`) comes with the image (run 39445348581: 7.0.0-1017-azure on 20261018.339.1 against 6.17.0-1022-azure on 20261012.334.1, identical Wasm). The image version was already per-build provenance; now a kernel difference passes only together with an image difference, and on the same image it still fails. Bytes, source, compiler, toolchain, flags and the other environment fields stay exact. A deliberate assertion change, TIER 3 (CI, release reproducibility), listed in STATUS.
- **M10 — Taps before hydration (TO13 family).** Specs that interact right after a load wait for `html[data-app-hydrated]` only where their subject is something else (J055: going offline); taps before hydration are fixed in the app in Part 11 (TO13) with their own spec.

- **M11 — DS1 needs no stored revision stamp (amendment 3).** The "already fixed" check found every write path applying its change to the latest stored record under a lock (`usePrivateStore` → `updatePrivateStore`, device records, the legacy ledger), the Goal details form letting untouched fields follow the stored Goal (Session X J054), and habit edits carrying the habit's fingerprint (`checkChange`, "This Habit changed while you were editing"). A two-tab spec proves it (`tests/ah-multitab.spec.ts`). So no stamp was added and amendment 3's stored-format change did not arise. The Showcase is per tab by design and says so ("kept in this tab only"); a duplicated tab starts as a copy (M-142).
- **M12 — The old "Export Goal Data".** It holds local simulation Goal plans only; on a device without them it exported `{"goals":{}}` (BUG-036). It now shows only when there are such plans; "Export everything" is the one export otherwise. "Import Goal Data" stays (an older file may still need it). The hosted verifier's stage 4 creates a simulation Goal first, so it still finds the button.
- **M13 — A second weight of the day (DS7).** `weights` allows one reading per date in every build's schema (a second would make older builds refuse the Health record), so "Keep both" stores the second as a timed weight measurement, the record's existing kind for readings with a time (already in the weights CSV). No format change.
- **M14 — Back closes a dialog (DS9).** `useBackCloses` adds one history entry while a sheet, modal or Quick add is open, copying the page's own history state so the router sees the same page; closing it otherwise takes the entry back out, except when a link inside it was followed (that would undo the navigation; found by the hosted verifier's goal stage).
- **M15 — Undo after a Showcase reset (DS4) and Health removals (DS5).** The reset keeps the replaced generation in the tab's sessionStorage until the next load, reset or exit (about 290 KB). Removals are said once, in the app's one toast with "Undo" (the page's own status line no longer repeats them; three specs read the toast now).

- **M16 — One price service, one valuation, one net worth (TR1–TR3, TR5, TR8, TR13).** Every page asks the shared quote service, the Showcase too; the Showcase holds the quotes it loaded when it opened (`setFrozenPrices`: never stale, labelled "Showcase price"), so its values never drift per reload. One valuation rule (lib/wealth.ts, lib/positions.ts): a newer market quote replaces a stored snapshot that is not the person's own; a MANUAL value stays, with the market value beside it. One net worth (`netWorthTotal`) values holdings as Wealth does and names the ones without a value.
- **M17 — Quantities to 8 decimals in lists (TR4).** `formatQuantity` cuts to 8 decimals with "≈" and keeps the exact value in the title; prices round by size (`formatPrice`).
- **M18 — A part-logged habit day completes from Health (TR9/HA2, amendment 5).** H7 said a part-logged day meant "the person already acted"; TR9 reports exactly that as the bug (4 of 8 glasses with 2.2 L logged). The tick now sets the day to its target (never adds), Undo still keeps it off for the day and a full tap still wins (H7 spec updated). A new habit in steps, mL or meditation minutes starts with that link filled in. The Showcase keeps one linked habit: more would make viewing it write records.
- **M19 — No currency switch while nothing converts (TR7, amendment 6).** The headline, Allocated, Available and Today's ring lead with the currency that holds the largest total; others stay in their chip ("coming later"). Today's wallet card shows ZIG only (practice money and testnet ZIG have no market value). Stored choices (`baseCurrency`, the wallet `display`) are kept unread; wallet holdings and Add money still ask real quotes in the person's currency.
- **M20 — One count per thing (TR6/B5).** lib/numbers/counts.ts: a check-in is a scheduled habit day completed (once per habit); habits due today leave out a skipped (rest) day; active and finished Goals come from each Goal's derived status plus average goals (Today, the goals widget, Goals, the Hall, Journey); live-priced assets follow Wealth's rule (Markets' "Manual assets"); Journey and Stories say "assets tracked".
- **M21 — Calculator months (TR14), additive.** `months` (0–11) is an optional field after the whole years in the calculator's device record (`zigoals:calculator:v1`, loose; older builds ignore it). A plan stays at least one year so every saved scenario still reads in #37–#49. A rate from Earn is added once a year and the banner says so.
- **M22 — "Ahead" needs the target by its date (TR11).** Ahead of the plan's schedule is not ahead of the Goal: a shortfall or a later finish reads "Behind". The Showcase's Emergency fund (ahead of schedule, $5,000 short) now has a later date and a plan that reaches it, so the Showcase still shows every status honestly.

- **M23 — Limits on the writes, not the records (VA2–VA4).** lib/limits/plausibility.ts guards the write functions (Health, Habits, the Checklist, Portfolio, manual assets, accounts), so every entry point shares it and a record saved before keeps reading. Stored length limits stay per record (a goal name 80, a habit title 100): raising one would make older builds refuse the record, lowering one would make this build refuse old ones. Instead every limited field shows its count while focused. Day bounds at the write layer are 1990 on only; future days are refused by the page in its journal zone (a clock bound would refuse a backup from a device ahead).
- **M24 — Errors are sentences (VA1, C1, C2, C3).** `plainErrorMessage` turns a schema issue into a short sentence or the form's own fallback; 74 forms outside ZIGi use it. Where a page shows results far from the button (the Goal page), the result also shows in the app's one toast; a confirm takes the focus where it opens.
- **M25 — Time zones as typed (VA10, C8).** A typed zone is matched to the browser's own list whatever its case; a fixed offset is explained with places that have it today (no offset is stored: it has no daylight-saving rules).
- **M26 — Workouts in their own device record (DE8).** A new device-only key `zigoals:workouts:v1` (TIER 3 stored format, frozen readers #37–#49 pass): older builds never read it, so nothing they hold changes. A finished workout adds one exercise-minutes entry to the Health journal (the habit and Today links already read those), so no Health schema field was added. Patterns follow Strong, Hevy and JEFIT (sets of weight × reps with last time beside each, a rest timer, personal bests by estimated one-rep max, routines, repeat last); a new set copies the one before, and finishing asks before leaving unticked sets out.
- **M27 — Food plausibility on the forms, not the stored food (HE5).** The label check (≤ 900 kcal per 100 g, macros within the serving, < 10,000 kcal a serving) runs where a person types a food (the food editor and quick add). saveFood itself stays as it was, so imports, older records and test fixtures keep reading; imports have their own row-level refusals.
- **M28 — Fitbit is off, not deleted (RM7).** The owner's note: no Fitbit build. The import choice is shown as off with the reason, records already brought in stay in the journal and in Export everything, and Help says plainly that the old connection ended. Barcode (HE4/J5/L4): the lookup path is built and tested with a fixture; turning it on is the owner's step (deploy the food Worker with FOOD_USER_AGENT and bind it). A second free source (USDA FoodData Central) needs an API key, which is a secret the owner holds: recorded, not added.
- **M29 — A habit change starts today when today is still empty (HA3, HA10).** `earliestHabitChange(…, {allowToday: true})` (the card, the editor, and the check every rule change passes) gives today when nothing is recorded for today (no check-in, no timer), else tomorrow, so a habit made by mistake is archived and deleted for good at once and an edit applies now. The default without the option stays tomorrow, so ZIGi's plans and the Goal-linked pause keep their wording (ZIGi lane untouched). The ⋯ menu stays a disclosure with Escape and focus return, as Session Z chose ("without ARIA-menu traps"); HA17's repeated unnamed stops are fixed by naming each section with its habit.
- **M30 — Figures and grace (HA1, HA7, HA9, HA15).** A skipped day is neutral everywhere (percentages, the week, trends). Freezes are earned from streaks reached without one. "+" steps by a share of the target (lib/habit-step.ts). The heatmap level is the share of that day's scheduled habits done. A vacation never covers a day the person already wrote on.
- **M31 — Habit → Goal is an offer, not an automatic sum (J3).** The app's rule stays: a habit tick never adds money to a Goal by itself. A habit linked to a private Goal offers "Add to its Goal" after completion, which opens that Goal's own funding form (`?contribute=1`), where the person confirms the amount. C6's bug numbers (BUG-070/071/018/024/025) are not in the repository or the scope file; its row is closed by the habit form and schedule items it overlaps (HA3, HA10, HA12), and recorded as such.
- **M32 — A Goal with financial history is closed, never deleted (GO2, C5).** Contributions and plan revisions are append-only records that sync between devices; deleting their Goal would orphan them on every other device. Delete stays for Goals without them; otherwise the page says so in words and points to Close, which can now pause the Goal's supporting habits too. GO1 did not reproduce on this build (M33's spec keeps every goal kind and the 2-hours template opening without an error).
- **M33 — The Goal wizard keeps its four steps (GO3, C4).** Creating from step 1 already exists ("Create goal" on the first step), which is the two-step path Tokyo suggests; the other steps stay because integration scripts, the packaged journey and owner-run checks walk them. The wizard gains a way out (Cancel and Escape, the draft kept), a control on the Habit step, ideas that say what they filled, a currency read from "€5000", and an honest asset list. C4's bug numbers are not in the repository; its row is closed by these GO3 items. GO14's "what matters" values step is a later feature (Claude's own note: "a nice later idea"), recorded, not built. A weight goal follows the latest reading (GO11); the Sleep page's nightly goal and a "keep an average" sleep goal stay two different things, named apart.

- **M34 — Wealth's asset search trusts a short verified list (WE1).** The market catalog has no market cap per asset, so ranking by cap would need a new outside source. A fixed list of the well-known ids (lib/market-assets.ts `VERIFIED_ASSET_IDS`) ranks first, and every other token in a search says "Unverified". No egress added.
- **M35 — Hide amounts and since-last-visit are device-only display aids (WE19, WE22).** "Hide amounts" blurs the person's own figures and value charts (market prices stay) for screenshots; screen readers still read the figures to their owner. "Since your last visit" keeps one value per portfolio on this device, only when every holding is priced and current, never in the Showcase; it is erased with the account and not exported (it is only a comparison point, not a record). Both keys are registered in lib/ah-device-keys.ts, which also fixes Part 6's gap: workouts are now erased with the account and make a device "not new".
- **M36 — Recorded, not built, in Part 9.** WE16: the catalog route answers `no-store` and is rebuilt on request; its size is the full coin list the search needs offline (a split catalog is a later speed item, Part 13 F3 notes it). WE17/J11 price alerts tied to Goals need push delivery (CO11, Part 14) to be useful; the watchlist exists. WE20: reading a linked wallet into Portfolio is the next step after AF's Wealth tracking; Portfolio's records are hand-entered by design (ADR-013) and a wallet import changes that rule. J15: reward, income and airdrop types need a stored-format version (the transaction kind is a strict enum, so older builds would refuse the records); later, with a frozen-reader plan. WE21's FIFO/LIFO lots: later (the label is fixed now). J14's read-only exchange sync: needs exchange API keys and egress; later.

- **M37 — AF3 reads balances, not an address-bearing smart query.** On zigchain-1 (checked 2026-10-26) OroSwap's LP tokens and the four USDC vaults' shares are bank denoms the pool or vault mints (`pair.liquidity_token`; `denom_metadata.denom`). So `/api/earn/shares` (`TIER 3 (egress routes)`) asks the same two mainnet LCDs as the other Earn routes for one public address's balance of eight pinned denoms, at one block, with the positions relay's limits (60 s answer per address, 10 reads a minute per client, 120 per server), nothing stored or logged, mainnet only. Your part is worked out on the device from the pool's and vault's own public figures. LP tokens staked in a farm are not in the wallet and the section says so.
- **M38 — Earn's path keeps its own look (AF12).** The owner asked Earn's Start-here to match the Checklist's path. The Checklist's orbit look carries motion the owner allowed in the Checklist only (ADR-028 L3b), and the Checklist path is protected. So Earn keeps its path, with the same names as the Checklist ("Start here, complete", "Academy, complete") and an "Ahead" mark on an end chest not yet reached. Earn's index is one row everywhere, with ‹ › buttons (ST6). A full orbit look for Earn waits for the owner's choice on that motion.
- **M39 — Recorded in Part 10.**
  - I5: "integrated" for Ramp/Banxa appears only in ZIGi's copy, which this session must not touch (lane rule); recorded for the ZIGi lane.
  - "Sells nothing" stays: the provider sells and ZIGoals has no partner identifier set up with either.
  - ZIGi's "OUR SUGGESTION" (ST5) is ZIGi copy too, recorded for the same lane.
  - Earn's "as of" times stay in UTC, named, as its "23:59 UTC" deadlines are (Session AF Gate C); the "estimate, variable" label is what ST2 asked for.
  - The landing's staking line goes with Part 15.

- **M40 — Today can still be hidden (TO1).** The plan said "Today can't be switched off". Hiding Today is an owner decision from Session W (W4). The synced pages format and ZIGi's page actions carry it, and pinned specs cover it (bare /app opens the start page). So the switch stays. What TO1 found broken is fixed:
  - the Today link was blank after a start page had moved a bare /app (the hold was never released);
  - /app/today was a 404.
- **M41 — Part 11 items recorded rather than changed.**
  - TO5:
    - the Undo toast already stays 8 s, longer while hovered or focused (`TOAST_MS`);
    - the 12-week history is on phones behind "Show" (it loads when opened);
    - the sticky bars' share of the phone screen is the protected Checklist layout, and the top bar is Part 18's.
  - TO7: on tablets the shell's Quick add and Today's hero Quick add both show; one top bar is Part 13 (LA).
  - H3: the second swan is the first-visit logo intro playing beside the sidebar's page mark (an approved design). Every widget showing twice is the "Widget summary" built-in, by design (today-dashboard).
  - AF13: the Focus habits tile already steps aside when the habits widget shows. The other repeats are the summary by design.
  - TO11: results no longer gain markup words. The rows above them (the pillar list) still leave on the first key; the Ask ZIGi row stays below the results.
- **M42 — CO1 and the week grid (J16/CO4).**
  - Today's one line joins habits, water and tracked wealth from the same numbers as their pages, on computers and tablets. On a phone the focus tiles just below carry them, and Today's pinned phone height holds.
  - "Net worth this week" waits for a weekly wealth reading on Today.
  - The week grid exists (Today's "Your week": Goals, Habits and Health rows, today marked). A P&L row and logging from a cell are later.

- **M43 — Part 12 items kept as they are, with reasons.**
  - SE13: the Permissions-Policy header names `bluetooth=()` on purpose, and public-safety.test pins it. Browsers that do not know the feature warn; the header stays. The web manifest has no `enctype` field, so there is nothing to remove (the warning came from a share-target check outside the app).
  - SE10: the two addresses are deliberate. contact@ is the owner's public contact (L1); hello@ is the security contact in SECURITY.md. The build identity in Help & diagnostics is documented in PRIVACY.md and pinned by the Session AC spec, so it stays.
  - SE1: accounts and sync are not open on the Alpha, so Help's account wording is accurate (send-feedback.spec pins it). The wrong Settings paths, the backup promise and the game-layer line are fixed.
  - SE4 / H5: the release notes stay in Help (18 topics are pinned by specs). Help gains a search box instead.
  - SE5: undo from the Activity log is later; every log already has its own undo where it is made.
  - SE9: the sidebar scrolled after switching to Light (N-039) did not reproduce at 360, 768 or 1440.
- **M44 — SE14 device lock.** A 4–8 digit PIN, off by default, on this device only (amendment 4). The lock hides the screen; it never encrypts data. Three tries are free, then 30 s doubling to 5 min. "Forgot the PIN?" removes the lock after one minute, so local data is never out of reach. The PIN is stored as a PBKDF2-SHA-256 hash (120,000 rounds) in the device-only key `zigoals:device-lock:v1`; erase and export lists include it. Face ID and passkeys are not offered: WebAuthn without a server cannot prove much more than the PIN does, and it is not in the Alpha's scope.

- **M45 — Part 13 measured before changing.** Probes on a production build, 18–20 routes, Showcase, at 375, 768 and 1280 px (and 1024 for clipping), three themes where colour mattered:
  - At the end of every page, no control stays under a floating button or the phone tab bar (LA1, D2, HE10). No text is clipped in a card at 375, 768, 1024 or 1280 (HE10's coach line). Earlier sessions' launcher and padding work had fixed both.
  - No unnamed field or button, no invalid `<dl>`, no nested controls (one focusable scroll area around a table is allowed) (LA7, E2, E3). The repeated "header" elements are card headers, not page landmarks.
  - No text on a solid background under 4.5:1 on Health, Ecosystem, Habits, Today, Settings and Wealth in any theme (E1). Text on art or gradients was checked by eye.
  - ZIGi's idle animation is no longer downloaded on first load (F1). The 533 KB file a first visit loads is the logo intro, an approved design that plays once.
  - The phone top bar is already named and 44 px; the page title sits at 267 px with the Alpha notice, which can be dismissed (LA3).
- **M46 — LA2: a rail on tablets (owner decision, 26 Oct; pre-approved).** The grouped header grid at the top of every page is gone. Computers (901 px and up) keep the sidebar, and phones (540 px and less) keep the bottom bar, both exactly as before. From 541 to 900 px the navigation is the sidebar in a compact form: an 88 px rail on the left with each destination's icon and its short name under it.
  - The rail keeps the sidebar's order, groups and visibility (hidden pages stay hidden; Governance hidden by default) and marks the current page as on a computer. It scrolls when it doesn't fit, and Settings and Help sit at its foot. Each link is at least 44 px and keeps the sidebar's names for keyboard and screen readers.
  - Page content starts at the top, beside the rail.
  - The phone chrome ran up to 767 px in code. From 541 to 767 px the phone's top bar stays (logo, Checklist, Quick add, search, More) and the rail replaces the bottom bar. From 768 to 900 px the logo, Quick add and search form a 64 px top bar beside the rail; sticky bars (Settings' tabs, Earn's chips, the Checklist header) stick below it.
  - A phone turned sideways (coarse pointer, 500 px tall or less) keeps the phone's bars.
  - Checked at 541, 600, 768, 900 and 901 px on 20 routes: nothing scrolls sideways, and at a page's end nothing is under a floating button. Nebula, Light and Dark look the same in kind; motion is unchanged.
  - page-marks.spec's tablet test now pins the rail: one column in the same order, groups apart, links ≥ 44 px, Settings and Help at the foot, content beside the rail and near the top, Quick add after Help in tab order. It replaces Session AF Gate C's "5 · 4 · 6" rows.
  - The "2.5×" render did not reproduce; Next.js already sends `width=device-width, initial-scale=1`.
- **M47 — Part 13 items recorded rather than changed.**
  - LA5: Light's dark islands (the hero, Staking's card, the dock) are AF9 decisions that theme parity pins. The Ecosystem tiles were fixed in Part 9 and the Ecosystem glow in AF10.
  - LA6: no text is smaller than 12 px except the "%" sign inside progress rings. Pages keep their own header icons (LA9).
  - LA9: removing the page name from the phone top bar is Part 18. Each page keeps its approved header.
  - E3: the Goal wizard's first step lists the ideas first; a skip link is later.
  - F3: no change to cold load; the new loading outline covers the wait (LA8).
  - AF15: the Habits time headings now measure well in all three themes. The Checklist name on a phone path is protected. The two stress-only Health import readings and the Academy name under the lesson bubble stay as the audits left them.
  - SE3: the section tabs take 9–13 % of the screen (not 35 %) and now mark the group on screen. One "Backup & restore" card is later: the four cards do different jobs (export, protected copy, restore, import from another app), and their anchors and headings are pinned by specs.

- **M48 — Part 14: what competitors have, built where it fits.**
  - A read-only helper compared Multi, HALO (the "Halo: Habit Tracker" app, medium confidence), personalEverything and Lifemova with ZIGoals. Multi's "$49.99 lifetime" price could not be verified on its own pages.
  - Built now, all derived from saved records (nothing new stored, no new outside host):
    - L2: a habit's **Strength** (0–100). Each scheduled day moves it a tenth of the way toward done or not; skipped and rest days are neutral.
    - L1: a **progression line** of each session's best set in the exercise history.
    - CO6: **why a wealth record changed**, by asset class, under the chart.
    - CO7: Earn's **value locked** on the five Ecosystem cards Earn covers, from Earn's own DefiLlama read.
    - CO12: the **data-freshness policy** in Help.
  - Recorded for later, largest gap first:
    - an expense and income log with a weekly "room to spend" budget (new stored record, export, backup and sync consent);
    - several items in one Quick add line;
    - a shareable habit-history card;
    - sick and break days beside vacation (an optional stored field);
    - a focus session tied to a goal;
    - a daily energy rating (the mood record is strict);
    - notes and a journal;
    - tasks with priority and a due date.
  - Not possible on the web: widgets, Apple Health, a watch app, Screen Time blocks, receipt scanning without an OCR dependency, and walk routes.
  - CO6's split by source (wallets, manual, staking) needs each wealth observation to keep its source (a stored-format change). The chart keeps its approved split by asset class.
  - CO11: complete or snooze from a notification is not possible yet. The push payload is deliberately content-free (`{"v":1}`), so the worker cannot know which item to complete, and push is not switched on for the Alpha (owner track).
  - MO3: push is the owner's acceptance track; ZIGi free-form is ZIGi's lane; the weekly review was renewed in Part 11 (TO8).

- **M49 — Part 15: landing and launch.**
  - MO5/DE1: the landing's staking lines are corrected. Staking and votes sign in your own Keplr wallet: practice network by default, ZIGChain mainnet after a one-time confirm (owner, 18 Oct). The Goal Manager contract is still not deployed. The landing is deployed by the owner, outside this PR.
  - TIER 3 (verifier): the live verifier's stage 7 accepts exactly one of two known sets of landing lines: the earlier set until the owner redeploys the landing, then the new one. Each set requires all three of its lines. Drop the earlier set after the redeploy.
  - MO4: the privacy notice is a draft awaiting a lawyer and, by owner decision L4, is not published, so no privacy, terms or pricing page is added. The landing links to none.
  - RM4: `workers_dev` and `preview_urls` were already off in `landing/wrangler.jsonc`. The landing is an assets-only Worker, so the `www` → apex redirect is a Cloudflare redirect rule the owner adds; it is not repository configuration.
  - F4: the hero film already loads only when played (`preload="none"`, `data-src`).
  - CO13: the landing already leads with one promise and an interactive glimpse (the V5 fold and equation). It is not redesigned here.
  - RM6 (TIER 3 CI, owner amendment 7): `.github/workflows/pr-review.yml`:
    - runs on `pull_request` only, never `pull_request_target`, and never for a fork's PR or a draft;
    - has least privilege (`contents: read`, `pull-requests: write`);
    - pins `actions/checkout` by SHA, as the repo already does;
    - never prints the secret;
    - skips green when the `ANTHROPIC_API_KEY` secret or the `PR_REVIEW_MODEL` variable is missing (the model id lives in a repository variable, not in the code);
    - posts one advisory comment;
    - is pinned by scripts/pr-review/review.test.mjs.

    Rollback: delete the workflow and `scripts/pr-review/`. The secret and the variable wait on the owner.
  - RM5: FRIENDS_GUIDE is refreshed: "Nothing moves unless you sign", Fitbit's removal, and what's new in this release. Help's Known limitations already matched the app (Part 6, Part 12).

- **M50 — Part 16: final sweeps.**
  - NO1: of BUG-001…085, the closing tables name 61, each with its row's outcome; C4 (Part 8) carries BUG-013–017 and 065. The Grok run had already listed BUG-008, 015, 025, 033 and 058 as fixed, and 005, 017, 018, 037, 040, 043, 065 and 081 as not reproduced. Fourteen ids (BUG-002, 012, 019, 023, 038, 051, 052, 054, 055, 056, 057, 060, 067, 072) are not described in the brief or anywhere in the repository, so they are recorded for the owner's next bot run rather than guessed.
  - NO2: the keep-list still holds. Unit suite: food maths, water conversion, DST, P&L, CSP. Browser, on a production build: focus traps, the calculator review, ZIP export and its round trip, restore with preview, sleep, the weekly review, Habits at 375, Earn's plain words and multi-tab persistence (93 tests).
  - NO4: a sweep of 30 routes, both with a fresh empty device and with the Showcase, at 390 and 1440 px, every /api/ call answering 503. No page errors, no console errors, nothing sideways, no "NaN", "undefined" or "[object Object]" text, and every page has its title.
  - WE15: of the registry's 178 links, 124 answered 200. 50 answered 403 and 2 answered 401 from bot or proxy blocks (GitHub included), which says nothing about the links. Two were 404: PermaPod's GitBook (removed; its GitHub links stay) and the FSCA FAIS Notice 93 of 2022 PDF, an evidence source that has moved (kept and recorded; no replacement address guessed).

## The "already fixed" checks (per part, amendment 2)
Filled at the start of each part.
- Part 8: funding a closed Goal was already refused (goal-intelligence `canEdit`, `previewFunding`); GO13's ahead/behind chip already sits on every Goal card (the funding-health badge); F6 for Goals was already built for large collections (search, sort and pages past 24 Goals, Run 11); the wizard already offered "Create goal" on its first step.
- Part 9: a negative price and dates before 1990 were already refused (transaction schema and `dateIssue`); archiving an asset already had a toast; Markets already had Owned and Favourites filters (WE13); market 503s already say "Price refresh is unavailable. Last-good values stay visible with their timestamps." (F5, BUG-069).
- Part 10: practice/real staking was already decided and built (owner, 18 Oct; Staking signs in Keplr after a one-time confirm); Earn already read the unbonding time live and showed "unavailable" without a fallback; Governance was already hidden by default and offered no vote in the Showcase.
- Part 11: Today already had a week grid ("Your week") with today marked; the welcome already had "Explore the demo"; the wrap-up already showed after its time; Showcase weekly-review text is labelled SHOWCASE DATA and lives in the tab's Showcase only (TO4 e).
- Part 15: RM4's workers.dev and preview URLs were already off; F4's film already loads on demand; CO13's promise and glimpse were already on the landing (M49).
- Part 14: CO5 (one-tap water tiles with Undo on Health and Today, and a water reminder, Session AC) and CO8 (the "Solve the daily puzzle" habit template) were already there.
- Part 13: LA1/D2/HE10 (nothing stays covered at a page's end), LA3, LA7's names and `<dl>`, E1, E2 and F1 were already fixed (M45).
- Part 12: Help & diagnostics already had one contact per purpose (SE10, M43); the Permissions-Policy and manifest were already as intended (SE13, M43); Settings already showed the weekly-review day it saves.
- Part 7: HA2 was fixed in Part 4 (TR9, `7abfbfda`); HA12's "2.5 target for a count habit" was already refused (habit-editor, `lib/habits.ts`); HA13's 3–5 s repaint was already fixed (paint-first, Session I); HA17's Escape already closed the ⋯ menu. The rest of Part 7 was open on `main`.
- Part 6: J8 was already fixed (Session W: per-meal "Copy yesterday's …", Recent / Frequent / Favorites quick picks, usual chips in quick-log.tsx). Everything else in Part 6 was still open on `main`.

## Closing table (every ID in the brief's index)
Filled part by part: per row, the finding IDs fixed, already fixed (evidence) or not possible (reason).

### Part 0 and 1
| ID | Outcome | Findings / evidence |
|---|---|---|
| RM8 | Done | Timezone phases 3–4 done before AH; QA2-04 fixed (`dd4dc885`); `@2x` renamed before AH (`37ca600`); Portfolio sync done before AH (`c043105`); full coin search present (ranking is WE1); passkey/Face ID: not possible here (needs the owner's iPhone, ADR-008 option 2) — M4 |
| M2 (picklist) | Done | The per-part "already fixed" checks (amendment 2) |
| Scope E | Done | 16 advisories cleared in 5 commits (M3, M5); `pnpm audit` full and prod clean |
| AF14 | Done | vite 8.3.3 (`a0a1fab4`) |

### Part 2
| ID | Outcome | Findings / evidence |
|---|---|---|
| Scope F: `execute.test.ts:116` | Fixed | `9b1dd80f`; reproduced under CPU stress (60 s timeout), passes in < 2 s under the same stress |
| Scope F: `domain-review-race:41` | Fixed | `ba33c973`; cause "invalid content-length header" in the DO probe; 20 probe files 77 passed |
| Scope F: `run9-2-product:30` | Fixed | Quick add's early tap (this part's last commit); 8 of 8 repeated |
| Scope F: `run10-source-pinning:69` | Fixed | `6966c04d`; the spec waits for the save; the app starts a waiting save on pagehide |
| Scope F: WebKit cancelled-request class | Fixed | `05173f41`; tests/webkit-cancelled.ts; the five fetch sites handle their rejections |
| Scope F: `layout-fixes-ae:24`, `session-x-findings:202`, `run10-motion:5`, `theme-parity-af` | Fixed | `6055f5ab` |
| Scope F: the deploy gate's unit tests | Fixed | The two deploy-blocking unit intermittents above; the deploy workflow unchanged |
| AF16 | Fixed | ZIGi box empty after a fill, zigi-memory's navigation stall, zigi-accept-correct in Tokyo (`ea7aaca9`); canonical reproducibility (`b1cdba48`, M9); WebKit cancelled fetches (`05173f41`) |
| AF7 | Fixed | TIER 3 (verifier): a request cut off by a navigation counts as aborted however late it is reported; the 503 answers were already named items |
| AF6 | Fixed | `75766fec`; #418 reproduced on the old build, gone on ten pages |

### Part 3 — Data safety
| ID | Outcome | Findings / evidence |
|---|---|---|
| DS1 / A1 | Already fixed (evidence) | BUG-075, N-081: two-tab spec 6 of 6 (`bce3ac48`), M11. M-142: the Showcase is per tab by design, stated in its sheet |
| DS2 | Fixed | T-110, T-116, M-134 (`749e2d75`): the ten-minute rule, naps, the greeting by hour; adapter unit tests |
| DS3 / A6 | Fixed | BUG-021, BUG-053, L-009, L-010, B-062, D-022, L-062 (`749e2d75`; nap wording `3bc64a6d`): every overlap refused, new or edited; "last night is already logged" |
| DS4 / A4 | Fixed | BUG-061, D-087, B-081, M-141, D-031 (`9dab86af`): confirm in place, a secondary button, Undo once. D-031's "Undo next to Undo import" is HE9 (Part 6) |
| DS5 | Fixed | N-043, D-047, B-117, T-115, T-138, M-104, B-083, M-131, M-136, M-115, D-104 (`3bc64a6d`): Undo or confirm on every removal; already present on milestones (M-104), history reversal (a review sheet). M-115 (a streak freeze) is HA7 (Part 7). T-138 (a measurement) has no delete yet: HE6 (Part 6) adds it with Undo |
| A5 | Fixed (Remove) | BUG-032 (`3bc64a6d`): a transaction's Remove has Undo. Editing a transaction is WE2 (Part 9) |
| DS6 / A2 | Fixed | BUG-036, M-007, N-042, N-033, M-008 (`749e2d75`): Portfolio in the export, its CSV, README with row counts, the old export only with its plans (M12). M-008 ("Help says every record"): Help's words, SE1 (Part 12) |
| DS7 | Fixed | N-057 (`749e2d75`): "Keep both" (M13) |
| DS8 | Fixed | L-006, M-004, N-049 (`749e2d75`): hints beside the disabled Restore; the Showcase states up front what works on your own records |
| DS9 / A3 | Fixed | BUG-076/077, M-070, D-206, T-077 (`749e2d75`): Back closes dialogs first (M14); the wizard's draft survives a reload |
| A7 | Fixed | BUG-042 (`749e2d75`): `plainErrorMessage`; the rest of the raw messages are VA1 (Part 5) |
| J2 | Fixed (package) | The DS rows above |

### Part 4 — Numbers you can trust
| ID | Outcome | Findings / evidence |
|---|---|---|
| TR1 | Fixed | B-002, BUG-085, M-041, M-077, N-149, N-181, B-049 (`0dc8ae4d`, M16): BTC/ETH valued from live quotes in the one net worth; the unvalued holdings are named. ZIGi reads the same modules later (lane rule) |
| TR2 | Fixed | B-004, B-015, B-050, B-153, D-001, D-095, D-243, L-030, L-047, L-012, N-054, N-122, N-194, N-026, T-024, T-038, T-092, T-117, M-051, D-200, N-055, B-041, D-262 (`0dc8ae4d`): "Current" only within 15 minutes; the Showcase holds its loaded quotes ("Showcase price"), so nothing drifts per reload |
| TR3 / B1 | Fixed | BUG-006, BUG-059, N-008, T-091, B-042, D-155, D-245 (`0dc8ae4d`, `05037e8b`): Portfolio reads the same quotes as every page |
| TR4 / B2 | Fixed | BUG-007, BUG-028, B-013, B-039, M-010, M-086, T-090, D-147, D-053, N-025, N-193, D-215, D-195 (`0dc8ae4d`, M17) |
| TR5 / B7 | Fixed | B-008, B-007, N-196, BUG-074 (`0dc8ae4d`): your value and the market value side by side |
| TR6 / B5 | Fixed | BUG-031, BUG-041, BUG-062, BUG-044, B-009, B-098, B-116, M-085, D-238, D-239, D-246, M-081, M-083, N-091, B-097, M-055, B-012 (`1e8946ad`, M20); tests/ah-numbers.spec.ts checks five pages agree |
| TR7 | Fixed (hidden, amendment 6) | N-030, B-040, D-214, L-085, B-034, B-150, D-057, D-201, L-078, M-121 (`9e865423`, M19) |
| TR8 | Fixed | B-110, B-111, B-154, M-079, B-103, L-029 (`0dc8ae4d`): one valuation rule for the ZIG reserve on every page |
| TR9 / B8 / HA2 | Fixed | N-168, N-202, N-036, N-077, N-169, N-015, N-086, B-163, D-220, N-056, B-147, B-191, T-087, L-021, M-037, D-106, B-079, M-038, BUG-043 (`7abfbfda`, M18): part-logged days complete from Health once; "over target" on the rings |
| TR10 | Fixed | B-011, N-058, N-120, L-070, M-039, D-142, L-081, B-073, B-194 (`1b5d218a`): one weekly rate (least squares, 28 days), one decimal in kg and lb, the latest reading beside the trend |
| TR11 | Fixed | B-006, B-014, B-113, B-137, B-183, B-184, B-200, M-056, D-235, B-114, M-082, L-040, M-080 (`cdb6f967`, M22); status derives from saved allocations (lib/goal-summary.ts), and the counts read it (TR6); a reversal says why progress stays |
| TR12 / B6 | Fixed | B-058, N-037, N-011, N-073, D-084, D-156, D-227, T-086, D-234, B-038, M-049, B-092, BUG-004, BUG-073, BUG-040 (`6dc444a0`): "Target reached" only on a crossing; rows under their own day; "4 milestones", not "4 ZIG"; Showcase labels only on examples |
| TR13 | Fixed | M-078, M-084, M-027 (`0dc8ae4d`, `1e8946ad`): Life review values with live quotes through the one net worth; the counts agree |
| TR14 | Fixed | B-010, B-021, N-029, L-057, B-099, B-123, B-156, B-045, B-056, B-043, B-044, L-058, B-130, B-131, B-129, B-155, B-046 (`521dba16`, M21): every assumption beside the result, months, no figure while a field is wrong, the exact target and plan into a goal, the scenario count shown |
| B3, B9 | Part 5 | Limits and the water cap are VA2/VA3 (one limits module) |
| B4 | Fixed | BUG-063, BUG-085 (`0dc8ae4d`): Today and Wealth read one net worth |
| J1 | Fixed (package) | The TR and B rows above |

### Part 5 — Forms, errors and limits
| ID | Outcome | Findings / evidence |
|---|---|---|
| VA1 / C1 | Fixed | BUG-003, BUG-009, BUG-020, BUG-026, BUG-084, L-023, L-035, L-041, L-044, L-050, L-076, L-079, M-123, T-093, T-121, N-135, N-142, N-151, N-155, D-022, D-024, D-034, D-048, D-071, D-101, D-118, D-199 (`cd216935`, M24): no validation JSON anywhere; the forms with field errors (Habits, assets, accounts, Health's highlighted fields) mark and focus the field |
| VA2 / B3 | Fixed | L-001, L-045, L-082, L-053, L-067, BUG-001, BUG-011, BUG-022, BUG-027, BUG-078, BUG-079, BUG-083, B-018, B-019, B-020, B-036, B-088, B-141, B-159, B-160, B-173, B-182, B-195, B-199, N-053, N-059, N-117, N-133, N-143, N-157, T-060, T-081, T-089, T-119, T-133, T-137, D-077, D-081, D-088, D-089, D-102, M-016, M-053, M-129, B-165 (`cd216935`, `24da254e`, M23). Micronutrients and ZIGi's Quick add parse go through the same Health writes |
| VA3 / B9 | Fixed | L-034, L-082, BUG-083, B-019, B-146, T-112, L-033 (`cd216935`): one water limit after fl oz, per entry and per day, the Checklist's range included |
| VA4 | Fixed (counter) | D-043, D-202, D-207, B-138, N-052, T-062, T-064, T-078, T-123, M-011, D-054, B-157, B-149 (`24da254e`, M23) |
| VA5 | Fixed | D-041, D-140, D-141, D-143, D-172, D-173, D-190, L-014, M-014, M-109, M-101, L-076, L-028, D-074 (`cd216935`): an empty required field says "This can't be empty." in the form's own message |
| VA6 | Fixed | D-034, D-035, D-088, D-105, L-044, N-024, D-052, T-071, D-144 (`cd216935`, M24) |
| VA7 | Fixed | B-170, D-219, M-107, M-111, N-129, N-179, T-072, T-101, B-059, D-046 (`24da254e`); the toast already replaces, never stacks |
| VA8 | Fixed | B-057, B-185, L-068, L-075, M-060, M-098, B-201, L-086, L-054 (`24da254e`). Numbers follow the display locale while dates are English by design (AD's one date format) |
| VA9 / C2 | Fixed | B-064, L-052, M-102, L-038, D-048, T-065, T-080, BUG-020 (`24da254e`) |
| VA10 / C8 | Fixed | B-067, B-069, B-068, B-175, B-176, N-131, BUG-035 (`24da254e`, M25) |
| C3 | Fixed | BUG-084 (`24da254e`): the range and unit in the message; Health shows the reason |

### Part 6 — Health and workouts
| ID | Outcome | Findings / evidence |
|---|---|---|
| DE8 | Fixed | N-083, N-084, N-085 (`0425bd79`, M26): workouts with exercises, sets, reps, weight (kg/lb), distance or time, notes; per-exercise history and bests; routines; rest timer (still under reduced motion); minutes reach Health and its habits; export, restore and the Showcase. `tests/ah-workouts.spec.ts`, `lib/workouts/engine.test.ts` |
| HE1 | Fixed | N-105, B-001, B-016, B-164, M-009, M-099, N-050, N-128 (`8120ec92`): Today's water tap on a new profile saves, and says so only when saved |
| HE2 | Fixed | D-094, L-046, M-054, M-097, B-100, N-035, B-088 (`8120ec92`): the coach asks first, steps at most 15 %, rescales macros, never below 1,200 kcal, has Undo, and says nothing from implausible data |
| HE3 | Fixed | N-006, D-120, D-199, D-144, L-062, B-166 (`2361b562`): the log form under Tonight, full width; saves show the toast; the card shows the running night |
| HE4 / J5 / L4 | Owner step (recorded) | B-086, T-002, T-010: the barcode path is built and tested (`run11-food-unknown.spec.ts`); activation needs the food Worker deployed with FOOD_USER_AGENT (M28). It stays free |
| HE5 | Fixed | D-089, T-133, M-130, L-036, D-046, D-023, D-163, N-072, N-141, Denver S-13 (`2361b562`, M27) |
| HE6 | Fixed | D-075, T-138, L-054, B-120, N-121 (`2361b562`) |
| HE7 | Fixed | L-061, M-136, B-063, B-064 (`2361b562`, and the next commit): the clock counts past the target and names its day; a Checklist stop under 10 min saves no 0.0 h fast (Undo resumes it); each wrong custom target has its own sentence |
| HE8 | Fixed | L-071, B-119 (`2361b562`): meals carry no time, so no late-eating claim; insights count same-day entries only |
| HE9 | Fixed | D-010, L-037, B-121, M-141, Denver S-01 (`2361b562`) |
| HE10 | Moved to Part 13 (LA1) | D-115…D-222 listed there |
| HE11 | Fixed (names); layout in Part 18 | B-169 (`2361b562`); D-011, D-222, T-097, N-084, N-118, B-168 are the counter layout Part 18 rebuilds |
| HE12 | Fixed | N-060, B-117, D-048 (`2361b562`); removal already had the toast's Undo (Part 3) |
| HE13 | Fixed | B-078, M-135 (`2361b562`) |
| HE14 | Fixed | L-038, T-139, B-090 (`2361b562`) |
| C9 | Fixed | BUG-080 (`2361b562`): `?tab=` and `#` for every view; `tests/ah-health.spec.ts` |
| C11 | Fixed | BUG-066 (`2361b562`): quick add; `tests/ah-health.spec.ts`, `lib/health.test.ts` |
| J8 | Already fixed | Session W (quick-log.tsx: per-meal copy yesterday, recent / frequent / favorites) |
| RM7 | Fixed | The owner's note (`fb21c2b8`, M28) |

### Part 7 — Habits
| ID | Outcome | Findings / evidence |
|---|---|---|
| HA1 | Fixed | B-003, B-017, B-189 (`32354145`, M30): 26 done + 4 skipped is 100 % (`lib/habit-skips.test.ts`) |
| HA2 | Already fixed (Part 4) | N-169, N-015, B-163, B-079, M-037, L-021, Tokyo #5 (`7abfbfda`, TR9) |
| HA3 / C6 | Fixed | D-045, D-204, B-031, B-145, M-105, N-061, N-078, N-079, N-088, T-085, T-125, T-131, L-011 (`32354145`, M29): archive confirms, starts today when today is empty, then Delete for good; Archive in the ⋯ menu (`tests/ah-habits.spec.ts`). C6: see M31 |
| HA4 | Fixed | T-141, L-083, L-084, N-134 (`e6e55ec4`) |
| HA5 | Fixed | T-134, B-192, D-244, D-072, T-067 (`32354145`); J10's one input box stays S2 |
| HA6 / C7 | Fixed | B-013, N-162, L-005, B-190, L-074, BUG-082 (`32354145`): every calendar mark; no "0/0 · 0%"; "On track so far" for quit/limit |
| HA7 | Fixed | M-024, M-025, M-115 (`e6e55ec4`, M30) |
| HA8 | Fixed | M-033, M-034, M-035, L-050, T-099, T-095, D-100 (`e6e55ec4`); today's score already left skips out (TR6) |
| HA9 | Fixed | N-005, N-112, N-087 (`32354145`, M30) |
| HA10 | Fixed | L-065, D-044, T-124, N-164 (`32354145`, M29) |
| HA11 | Fixed | M-138, D-232, B-077 (`32354145`): 2 decimals of a minute; the timer still adds on Finish (said in the card) |
| HA12 | Fixed | D-007, B-028, D-040, B-144, N-150, N-090, D-113, Denver S-06 (`32354145`): More options fold, one slim action row, money templates named as your own plan; the 2.5 count target was already refused |
| HA13 | Fixed | D-042, N-069, M-036 (`32354145`): toast with Undo both ways |
| HA14 | Fixed | M-076, M-106, M-132, N-062, D-137 (`e6e55ec4`) |
| HA15 | Fixed | D-178, D-192, N-089 (`e6e55ec4`, M30) |
| HA16 | Fixed | M-061, B-127, B-128, N-096, M-062 (`32354145`) |
| HA17 | Fixed | T-088, M-040, M-092, D-203 (`e6e55ec4`, M29) |
| HA18 / J9 | Fixed | N-038, T-020, N-163 (`e6e55ec4`): start earlier, streak legend; grace = rest days and freezes |
| F6 (Habits) | Fixed | BUG-064 (`e6e55ec4`): sort and 30 at a time; Goals in Part 8 |
| J3 | Fixed (offer) | `e6e55ec4`, M31 |

### Part 8 — Goals
| ID | Outcome | Findings / evidence |
|---|---|---|
| GO1 | Not reproduced (spec kept) | B-171: every goal kind named "Create 2 hours a day" and the digital-detox average template, opened from every view, desktop and phone, no page error (`b492379f`, `tests/ah-goals.spec.ts`) |
| GO2 / C5 | Fixed | BUG-010, B-014, B-143, N-040, N-041, N-125, N-158, D-036, D-209, D-035, M-103, M-124, T-122 (`b492379f`, M32): close pauses supporting habits; Delete's reason in words; a closed Goal was already not fundable |
| GO3 / C4 | Fixed | D-205, D-225, D-026, D-027, D-025, D-226, D-166, D-241, N-109, N-111, N-185, N-205, N-156, N-003, M-046, M-100, N-071, T-014, T-120, D-008, D-038, D-139, D-257, L-026, Denver S-07 (`b492379f`, `63d0c6de` the draft race, M33). "Hiding Goals in setup" goes with Part 11 (first run) |
| GO4 | Fixed | N-166 (`b492379f`) |
| GO5 | Fixed (form closes) | B-196, D-105, T-077, L-066 (`b492379f`); the plan comparison round-trip and the Vision gradient did not reproduce |
| GO6 | Fixed | L-055, L-024, L-025, N-070, N-080, N-160, B-071, B-115, B-187 (`b492379f`): unique milestone names, no negative axis |
| GO7 | Fixed | M-047, M-082 (`b492379f`) |
| GO8 | Fixed | D-037, D-210, B-142 (`b492379f`) |
| GO9 | Part 13 (LA1) | D-111, D-112, D-136, D-211, D-029, D-208, D-097, D-019, Denver S-11: the 768 grid is two columns already (`product-beta.css`); the rest with the layout sweep |
| GO10 | Fixed (dates) | D-039, L-075, M-098, N-144: the review date in the one format (`b492379f`); copy with Part 16's sweep |
| GO11 | Fixed | N-004, B-167 (`e3937889`, M33) |
| GO12 | Fixed | M-066, B-177 (`e3937889`) |
| GO13 | Already fixed | The funding-health badge on every card (goal-card.tsx) |
| GO14 | Later (recorded) | Tokyo's values step; M33 |
| F6 (Goals) | Already fixed | Run 11: search, sort, pages past 24 Goals (`run11-large-goal-collection.spec.ts`) |

### Part 9 — Wealth, Markets, Portfolio
| ID | Outcome | Findings / evidence |
|---|---|---|
| WE1 | Fixed | B-148, L-032, L-013, BUG-029, BUG-030, N-023, N-206, T-074, T-143, M-058, D-051, D-079 (`f927c2d5`, M34) |
| WE2 / A5 | Fixed | N-146, N-147, N-161, N-165, N-044, B-060, B-061, B-158, L-016, T-073, D-081 (`351c51c5`): Edit, price above 0, 1990 floor, future date said in words; realised result per year in WE18. "Record a transaction" stays a disclosure (it opens the form), recorded |
| WE3 | Fixed | N-099, N-100, T-100, B-087, D-078, D-237, L-072, L-073, T-102 (`351c51c5`): exact names auto-map, BTC is Bitcoin, reasons per row, binary refused, formula names refused |
| WE4 | Fixed | D-096, D-200, N-197, M-122 (`8a7e9727`): Refresh says what it did; the currency choice was already kept (settings) |
| WE5 | Fixed | B-104, B-106, D-145, D-221, L-069, M-042, B-032, L-049 (`351c51c5`) |
| WE6 | Fixed | L-015, D-080, T-061, B-074, B-076 (`351c51c5`): currencies from the list only; the cash glyph per currency |
| WE7 | Fixed | L-067, B-152 (`351c51c5`): a payment above 0 and at most what is owed; the calculator too. B-199 (payment in Activity) goes with Part 12's Activity work |
| WE8 | Fixed | M-125, B-140, B-186 (`8a7e9727`): the Showcase says it opens a real provider and asks Ramp for nothing; the amount is chosen on the provider's page; the fee line only where networks are compared |
| WE9 | Fixed | L-063, T-040 (`351c51c5`): "Tokenized reference price", no token logo for metals |
| WE10 | Fixed (net worth, heading) | B-030, B-026, T-096, N-145 (`351c51c5`); the Add-asset sheet padding (B-151) is Part 13 (LA) |
| WE11 | Fixed | B-085 (`351c51c5`): only live-priced ids are sent; PRIVACY.md says so |
| WE12 | Fixed | L-064, N-009, N-024, N-207, D-052, D-108, D-223, N-200 (`351c51c5`) |
| WE13 / J17 | Fixed | T-105, T-117, N-195, D-108, D-215, N-191, N-192, L-031 (`8a7e9727`): layout and ranges remembered, inflows green and signed; filters already existed |
| WE14 | Fixed | D-055, D-148, D-056, M-108 (`351c51c5`) |
| WE15 | Fixed (links, labels, Light) | M-117, B-093, M-118, D-157, B-122 (`8a7e9727`): mainnet explorers first; Light logo tiles. M-119/M-069 (six doc 404s): the docs hosts answer 403 to this sandbox, so they cannot be checked here; the record keeps them and Part 16 rechecks in CI's browser. D-183/D-125 ("ZW"): the initials tile is the named fallback for a project without an official icon (it says so to screen readers), kept |
| WE16 | Recorded | B-094: M36 |
| WE17 / J11 | Later (recorded) | T-006, N-047: M36 |
| WE18 | Fixed | T-041 (`8a7e9727`) |
| WE19 | Fixed | T-023 (`8a7e9727`, M35) |
| WE20 | Later (recorded) | N-103: M36 |
| WE21 | Fixed (label) | T-050, N-102 (`8a7e9727`); lots later (M36) |
| WE22 | Fixed | N-082 (`8a7e9727`, M35) |
| C12 | Fixed | `351c51c5`: a second card for the same market asset is refused with its name; the stock form's words |
| DE5 / J18 | Fixed (light budget) | T-007 (`8a7e9727`): the spend-cap goal template; logging a day's spending is the goal page's day entry |
| J14 | Fixed (duplicates) | `8a7e9727`; exchange sync later (M36) |
| J15 | Later (recorded) | M36 |
| F5 | Already fixed | BUG-069: the "Price refresh is unavailable" notice with last-good values (wealth-view) |

### Part 10 — Staking, Earn, Governance
| ID | Outcome | Findings / evidence |
|---|---|---|
| DE1 | Fixed (wording) | B-005, B-022, B-136, N-198, N-201, T-001, C-001–C-004 (`facc2b0f`): Settings, the More sheet and the labels say practice and real as decided; the landing is Part 15 |
| ST1 / AF4 | Fixed | B-005, B-012, B-022, B-136, D-258, N-028, B-052 (`facc2b0f`); AF4 "What's this?" on the wallet card's Testnet label |
| ST2 / I4 | Fixed | L-056, B-053, B-048, M-059, T-022, D-168 (`facc2b0f`): "estimate, variable" on every chain APR; the unbonding explainer uses the pinned constant the review checks; UTC kept (M39) |
| ST3 | Fixed | N-027, N-198, N-201, B-065, L-042, D-082, T-129 (`facc2b0f`): the scenario works without a wallet and in the Showcase |
| ST4 | Fixed (size) | D-002, D-182, L-018, T-076, N-028, Denver S-04 (`facc2b0f`): the empty card is as tall as its words. D-152/D-193 (dark in Light): the Light theme keeps Staking's hero card dark by design, and theme parity holds it; the Light override was removed (Part 11 batch 2) |
| ST5 / I2 / I3 | Fixed | D-060, D-099, D-150, D-146, B-054, B-084, D-092, D-153 (`e194278a` TIER 3 verifier, `facc2b0f`); ZIGi's "OUR SUGGESTION" recorded (M39) |
| ST6 / AF12 | Fixed (index, chest) | D-149, D-123, N-199, D-098 (`facc2b0f`, M38) |
| ST7 | Fixed | T-075, T-107, M-052, D-154, L-043, B-112, D-014, D-169 (`facc2b0f`) |
| ST8 | Fixed | L-019 (`facc2b0f`) |
| ST9 | Fixed | B-174, D-217 (`facc2b0f`): Earn listed (it follows Wealth); the sidebar summary includes the Checklist |
| ST10 | Fixed | Tokyo (`facc2b0f`): "Verify, don't trust" on Staking and in Help |
| I5 | Recorded | M39 |
| AF3 | Fixed | ADR-028 H134 (`a31fa439`, TIER 3 egress routes; M37) |

### Part 11 — Today, first run, Checklist logic
| ID | Outcome | Findings / evidence |
|---|---|---|
| TO1 | Fixed | N-178, B-124, T-149, M-095 (`0e66fea8`, M40) |
| TO2 | Fixed | M-064, M-063, B-198, B-135, M-093, M-120 (`0e66fea8`): saves as it changes, confirms beside it, "Start the wrap-up now", open in Today's focus once due |
| TO4 / H6 / DE4 | Fixed | N-045, N-106, N-108, N-107, N-094, M-021, M-015, N-002, T-009, M-071 (Part 11 batch 2): a slow read says so; each step opens at its top; iPhone steps only on Apple browsers; targets follow the picked habits; "Start my own" leaves the Showcase |
| TO5 | Fixed (logic) | M-137, N-095, T-111 (`0e66fea8`): a paused Focus resumes; Fast and Focus ask first; one planet per name. M-112, M-110, M-013, D-170 recorded (M41) |
| TO7 | Fixed (part) | D-073 (two decimals spoken), M-045 (arrange handles clear titles); T-098, M-133, D-134, D-016, D-028 recorded (M41) |
| TO8 | Fixed | M-065, M-027, B-097, M-028: skipped days not due, an open today not counted, "(ends today)", no fixed step count |
| TO9 | Fixed (copy only) | D-249, M-030: no frame ids or studio notes on /app/zigi; no sidebar entries (owner note) |
| TO10 | Fixed | L-077: the player opens above its own button |
| TO11 | Fixed (part) | D-093, B-072, B-178, B-179, T-082; N-110, N-139 recorded (M41) |
| TO12 | Fixed | B-066, M-122 |
| TO13 | Fixed | N-001: a tap while the settings open is never overridden by the start page |
| H3 / AF13 | Recorded | M41 |
| CO1 | Fixed (line) | M42 |
| J16 / CO4 | Already present (grid); later (P&L row, logging from cells) | M42 |

### Part 12 — Settings, Help, Activity
| ID | Outcome | Findings / evidence |
|---|---|---|
| SE1 | Fixed (part) | B-089, B-193, D-229, D-216, M-127, M-068 (`799935f3`): Help's Settings paths, the backup line and the game-layer line match the app. B-023, M-022, M-029, B-108: accounts are not open on the Alpha, so that wording stays (M43). M-128 with SE3 |
| SE2 | Fixed | B-126, N-093 (`799935f3`): one review day in Settings drives the review and its reminder; saving says so |
| SE3 | Moves to Part 13 | D-005, D-088, D-127, D-224, D-062, D-251, M-128, Denver S-05 (layout) |
| SE4 | Fixed (part) | D-091, D-015, N-032, T-083, M-031, D-159 (`799935f3`): Help search with a result count. D-133, N-184, M-126, L-020, Denver S-14: release notes stay (M43) |
| SE5 | Fixed (part) | D-171 (`799935f3`): filters show counts, phone rows are compact. T-113 undo from the log: later (M43) |
| B-199 | Fixed | `799935f3`: account payments and balance updates appear in Activity |
| SE7 | Fixed | N-097, M-023 (`799935f3`): "Not available here" and "Not set up" pills, dimmed controls, one push heading |
| SE8 | Fixed | D-218, M-006 (`799935f3`): one name, "Game layer"; the demo's game layer says so |
| SE9 | Fixed (part) | D-191, D-230, N-183 (`799935f3`): no "coming later" tooltip, a theme note, motion saves with a message. N-039 not reproduced (M43) |
| SE10 | Already fixed / kept | M-067: M43 |
| SE12 | Fixed | D-248, M-005, M-032, N-138 (`799935f3`): a branded 404 with a way back |
| SE13 | Kept (by design) | L-007, B-095: M43 |
| SE14 | Fixed | Tokyo (`799935f3`, M44); tests/ah-settings.spec.ts |
| H5 | Fixed | BUG-068 (`799935f3`): a page that starts hidden says "off until you turn it on"; Help search |
| RM5 | Moves to Part 15 | Friends pack goes with the launch documents |

### Part 13 — Layout, accessibility, themes, speed
| ID | Outcome | Findings / evidence |
|---|---|---|
| LA1 / D2 / HE10 | Already fixed | D-110, D-066, D-250, D-254, D-260, D-064, L-017, L-059, L-087, B-027, N-051, N-173, M-012, M-072, T-068, T-069, T-130, T-136, T-145, D-130, D-231, D-033; BUG-005/034/081; D-115…D-222: M45 |
| LA2 | Fixed (owner decision) | D-065, D-261, D-263, T-146, T-148, Denver S-15: a rail from 541 to 900 px (M46). N-153, D-109, M-074: not reproduced (M46) |
| LA3 | Already fixed | D-252, N-048, D-070: M45 |
| LA4 | Fixed | D-068, D-255, T-147, N-062, N-174, D-098: phone chip and tab rows fade at the edge until scrolled to the end |
| LA5 | Recorded / fixed elsewhere | D-174…N-189: M47; AF10 below |
| LA6 | Recorded | D-192 (Part 7 heatmap), D-198, D-196, D-194: M47 |
| LA7 / E3 | Fixed (part) | L-022, N-175, BUG-050, BUG-045/049: names already present (M45). N-115: standalone links and folds are 24 px or more on computers and tablets. L-080, N-119, N-187, N-190, N-124, N-176, M-091, N-186: already fixed or recorded (M45, M47) |
| LA8 | Fixed | D-213, D-006: a quiet page outline while private data opens |
| LA9 | Moves to Part 18 / recorded | D-013, D-016, M-075, N-177, Denver S-09: M47 |
| LA10 | Fixed | D-212, D-223, D-221: text links underline on hover everywhere |
| D3 | Fixed | BUG-039: 24 px on computers and tablets (phones were already 44 px) |
| E1 / E2 | Already fixed | BUG-046, BUG-047/048: M45 |
| F1 / F3 | Already fixed / recorded | M45, M47 |
| AF10 | Fixed | owner: "calm the ecosystem header by day" (Light glows lowered) |
| AF15 | Recorded | M47 |
| TO7 (carried) | Fixed | T-098, M-133: Today's duplicate Quick add in the tablet top bar steps aside |
| WE10 (carried) | Fixed | B-151: the phone Add-asset sheet no longer scrolls sideways; its title has its inset |
| SE3 (carried) | Fixed (part) | D-088: tabs mark the group on screen; D-005, D-127, D-224, D-062, D-251, M-128, Denver S-05: M47 |

### Part 14 — Competitor features and retention
| ID | Outcome | Findings / evidence |
|---|---|---|
| CO5 | Already fixed | Lose It: one-tap water and a water reminder (Session AC; M48) |
| CO6 | Fixed (part) | Monarch: "why it changed" by asset class (`lib/wealth-why`); the split by source is later (M48) |
| CO7 | Fixed | CoinStats; owner note: Earn's value locked on Ecosystem cards, with source and time |
| CO8 | Already fixed | Tokyo: "Solve the daily puzzle" habit template |
| CO11 | Not possible yet | T-021: content-free push, and push not switched on (M48) |
| CO12 | Fixed | T-051, T-018: Help, "How fresh are the numbers?" |
| L1 | Fixed (part) | Multi: workout progression line; the rest recorded (M48) |
| L2 | Fixed (part) | HALO: habit Strength; the rest recorded (M48) |
| MO3 | Recorded | Part 12 §3: M48 |

### Part 15 — Landing and launch prep
| ID | Outcome | Findings / evidence |
|---|---|---|
| MO5 / DE1 (landing) | Fixed | C-001–C-004, T-001, B-136: the landing's staking lines; the verifier accepts the earlier set until the owner redeploys the landing (M49) |
| MO4 | Not possible (owner) | C-035: privacy notice unpublished by owner decision L4 (awaiting a lawyer); terms and pricing wait on the owner |
| RM4 | Fixed in repo / owner step | workers.dev and preview URLs already off; the www redirect is a Cloudflare rule (M49) |
| F4 | Already fixed | the film loads on demand (M49) |
| CO13 | Already fixed | the V5 landing (M49) |
| RM6 | Fixed (waits on the owner's secret) | TIER 3 CI, amendment 7 (M49) |
| RM5 | Fixed | FRIENDS_GUIDE refreshed; Help's Known limitations current (M49) |

### Part 16 — Final sweeps
| ID | Outcome | Findings / evidence |
|---|---|---|
| NO1 | Closed / recorded | M50 (14 undescribed ids recorded) |
| NO2 | Verified | M50 |
| NO4 | Verified (empty and Showcase) | M50 |
| WE15 (carried) | Fixed (part) | M-117, B-093: one dead documentation link removed; the moved FSCA source recorded (M50) |
