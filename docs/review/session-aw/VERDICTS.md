# Session AW: the E2 verdict table

Read-only. Branch `feature/session-aw-finish-line` at `718d5186` (195 commits over `8fa8aa1d`). Sources: `scratchpad/inventory.md`, the builders' `scratchpad/registry-*.md`, `scratchpad/already-have.md`, `docs/review/session-av/{LEDGER,UNFINISHED,QUALITY,FRIEND_READINESS}.md`, `docs/review/session-aw/QUALITY-b{1,2}.md`, ADR-045 and ADR-046 (the plan, the owner's amendments 5 and 11), and the code at HEAD.

**The rule (ADR-046 line 22, E2).** A verdict is one of three: **built** (commit), **already have** (file, opened), or **Carried** with one of these causes:
- needs an outside service
- needs a model
- native-only
- against a named rule
- a new dependency the owner declined
- a protected area outside FR-TJ-7
- 2 failed attempts

**How the SHAs were checked.** Every SHA cited for Session AW work appears in `git log --oneline 8fa8aa1d..HEAD`, and each one passed `git cat-file -t`. This checkout's history starts at `8fa8aa1d`, so Session AV's own SHAs, which the ledger quotes, cannot be resolved here. AV-era work is therefore cited by **file**, under "already have".

**Named rules cited below, with where each is written:**
- **1a**: ADR-046:32, no estimated calorie burn.
- **1b**: ADR-046:33, passkey: "not now. Carried as 'owner: Beta'".
- **1c**: ADR-046:34, the declined dependencies (Mermaid, KaTeX/MathJax, pdf.js, Tesseract).
- **1d**: ADR-046:35–39:
  - "YES to written content in the repository, NO to recorded audio or video".
  - "Habitica classes and skills stay Carried (game content, game layer off by default)".
- **Protected list**: ADR-046:64, "Protected areas stay untouched (Today hero and slogan, Checklist orbit path, footer finale, swan intro, Light's dark islands, shell navigation, Governance hidden by default, the locked ZIGi look, AR's NOVA composition), except FR-TJ-7".
- **Stored data only additive**: ADR-046:109, "Stored data only additive: TIER 3 (stored formats) commits, frozen readers #37–#59".
- **English UI**: ADR-046:116, "English UI, USD/EUR; ZIGi and NOVA in EN and NL."
- **No medical / money advice**:
  - `docs/product/features/M3-insights.md:7`: "no health or money advice".
  - `docs/architecture/ADR-011-coach.md:81-82`: "Never money advice", "Never medical advice".
  - ADR-046:37: "general guidance, not medical advice".
- **Nothing shared between people**: the ledger's rule (LEDGER #95, #111, #252). It has no file of its own. It rests on "private by design" (ADR-046:113, ADR-038:16) and "no outside services" (ADR-046:108).
- **Owner rule 7**: `docs/review/session-al/CI_INTERMITTENTS.md:6`, "Engine crashes are recorded with their diagnosis and not chased."
- **Owner decisions of 21 Nov (follow-up 3)**: the "Owner decisions" table at the top of `docs/review/session-av/UNFINISHED.md`.
- **Owner decision T-069 (13 Nov)**: `apps/web/tests/grok53/shell/l10a-second-pass.spec.ts:153-155` and `tests/ao/owner-calls.spec.ts:35`.

---

## 1a. LEDGER round 7 (#432–#464): 33 rows

| # | title | verdict | where in the app |
|---|---|---|---|
| 432 | Marvin: how much a task is dreaded | built `efcd3692` (TIER 3), `b34452b7`, `003d8842` | Task editor → "I'm dreading this"; row "Dreading · a lot"; Plan my day → Fit my day → "Hardest first"; filters `is:dreaded`, `dread:1…3` |
| 433 | Marvin: how often a task was put off | built `efcd3692`, `003d8842` | Row "Moved 4 times"; Tasks → More views → Review → "Moved most"; filter `is:moved` |
| 434 | Marvin: tasks that sat a long time | built `b34452b7`, `003d8842` | Tasks → Review → "Open a long time" (60/90 days; Keep / Give it a day / Remove); weekly review link line |
| 435 | Marvin: pick one for me | built `b34452b7`, `003d8842`, `e2c5205d` | Tasks → Today → Plan my day → "Pick one for me" (shares a row with Fit my day) |
| 436 | Marvin: today's progress and where the day is | built `b34452b7`, `003d8842`, `d2144478` | Tasks → Today, the line under today's list ("1 of 3 … · the day is 50 % through"); not on the protected Today hero |
| 437 | Marvin: time targets for an area/label | built `efcd3692` (TIER 3), `b34452b7`, `003d8842` | Tasks → More views → This week → "Time targets" |
| 438 | Due: remind again until done | built `c752ece8` (TIER 3), `a7c74fee`, `3cba9d5d` (TIER 3 PWA), `48339218`, `35e6abda` | Tasks → More views → This week → Reminders; task editor → "Remind again"; in the app while push is off |
| 439 | Due: your own snooze times | built `c752ece8`, `a7c74fee`, `3cba9d5d` | Same Reminders section, "Snooze choices" (up to 6); the first choice is the notification's snooze button |
| 440 | Due: named timers, several at once | built `50f0aabc` (TIER 3), `d4db9548`, `3cba9d5d`, wired `c4c62210` | Tasks → More views → Timers; ⌘/Ctrl K → Timers; a strip on every page while a timer runs |
| 441 | Evernote: a search kept by name | built `a91ee3ef` (TIER 3), `c2e7446f`, `8c837ba1` | Notes → Notes → Search: saved searches above "Narrow the search" |
| 442 | Evernote: voice notes played faster | built `4bbc7197` (TIER 3), `f3c6f54c`, `872adb73`. **Part Carried: needs a model** (a transcript) | The journal's voice player (1–2×, ±15 s) on the entry and in Journal → Entries → Photos and voice notes |
| 443 | Evernote: words found in photos and PDFs | **Carried: a new dependency the owner declined** (OCR engine, Tesseract; owner decision 1c, ADR-046:34) | — (the fallback stays: the browser's own PDF viewer) |
| 444 | Five Minute Journal: morning page and evening page | built `80603a68` (TIER 3), `70ab1698`, `a3ea152c` | Journal → Write → "Morning and evening" (`/app/journal#day-pages`); two reminders |
| 445 | Five Minute Journal: a photo of the day | built `a86fea23` (TIER 3), `f3c6f54c` | "☆ Photo of the day" on an entry's photo; Journal → Entries → Photos and voice notes → "A photo a day" |
| 446 | Strides: one report for a year / all time | built `57ed9b6d`, `d5cb67cd`, `4309e6fc` | Life review (`/app/review`) → Review period → This year / All time |
| 447 | Strides: a goal that starts again each period | built `a5cc5d88` (TIER 3), `aa677ed9`, wired `94496fba`, sync `7f4fc512` (TIER 3). The PROT check came back clear: the goal store is `privateGoalSchema` in `zigoals:platform:v1` (`lib/positions.ts:61-70`), not chain records. | A goal's page `/app/goals/tracked/<id>` → "Starts again" fold (count goals of an own unit, and projects) |
| 448 | Marvin: help getting started on a stuck task | built (written content, 1d) `b34452b7`, `003d8842` | Task editor → "Stuck? Help me start" (four questions, a strategy each, EN/NL) |
| 449 | Paprika: timers from the method | built `3f44d362` (on #440's timers) | Health → Foods & recipes → a recipe → Cook → "Start 15 min timer" |
| 450 | Paprika: recipe scaled while cooking | built `3f44d362` | Cooking view → "Cook for" (2 / 4 / 6 / Half / Double) |
| 451 | Paprika: ingredients crossed off | built `3f44d362` | Cooking view: ingredient ticks, "The method" with the current step marked |
| 452 | Paprika: pantry with use-by days | built `5d3b04a6` (TIER 3), `9d7b52ac` | Health → Planner → Grocery list → "Use soon"; Already at home → Use by |
| 453 | Paprika: recipe files from other apps | built `ae0dfe80`, `d9bb3b23` (review b2 M1, unpack budget) | Health → Import → "A recipe file" (.paprikarecipes, .md, .txt), with Undo |
| 454 | Paprika: a week of meals kept as a menu | built `35c5e780` (TIER 3), `9d7b52ac` | Health → Planner → "Menus" fold |
| 455 | Paprika: when you last made it | built `35c5e780`, `3f44d362` | Recipe row "Last made … · N times", Your stars, Sort recipes; cooking view → "Made it today" |
| 456 | Happy Scale: what I'll weigh on a named day | built `46685569` (TIER 3), `de4b3157`, `9a9d4ae1` | Health → Weight → "A day you name" fold (an estimate, not medical advice) |
| 457 | Happy Scale: note on a weigh-in, new lows | built `30e9a44b` (TIER 3), `de4b3157`, `9a9d4ae1` | Health → Weight → "Notes and new lows in your weigh-ins" |
| 458 | Happy Scale: this week vs the week before | built `de4b3157`, `9a9d4ae1` | Health → Weight → Weight trend card, the line under "Latest reading" |
| 459 | Sleep as Android: rename/remove a tag on every night | built `28bcf5df`, `9a9d4ae1` | Health → Sleep → "Rename or remove a sleep tag" |
| 460 | Sleep as Android: sleep goal over 14/30 days | built `c7396e0d` (TIER 3), `28bcf5df`, `9a9d4ae1` | Health → Sleep → "Your sleep goal" → 14 days / 30 days |
| 461 | Cashew: removed entries kept a while | built `686e60dd` (TIER 3), `47823974`, wired `f773772c` | Wealth → Spending → "Removed recently" fold (phone: inside "More about your money") |
| 462 | Cashew: a bill that ends | built `7002d91e` (TIER 3), `4df819e7` | Wealth → Upcoming bills → Add / Edit → "Ends"; row "3 of 24 left" |
| 463 | Cashew: copy an entry | built `47823974` | Wealth → Spending → This week → "Copy"; Edit → "Copy this entry" |
| 464 | Money Manager: card's next payment | built `027f13cc`, `d9bb3b23` (review b2 M2) | Wealth → Accounts → What you owe → the card's row ("Next payment on …") |

Shared work for the round, besides the row commits above:
- Answers: `d7e03863`, `137b6bc5`, `fabcaf72`, `d5cb67cd`, `9057fbe0`, `b8599904`, `5025c8c7` (TIER 3 AI tools).
- Specs: `789747c9`, `9eb57e9d`, `7a798af6`, `6d279b89`.
- Help: `fb27b873`, `19e2f79d`, `00a113cb`.
- Merges: `0d728306` X1, `acaf0f01` X2, `de957513` X3, `ef9e5ffb` X4, `2313bfa1` X5, `1e2f6921` X6, `df868ad3` X7.

**Round 7 totals:** 33 rows.
- **Built: 32.** One of them, #442, has a part Carried: needs a model.
- **Already have: 0.**
- **Carried: 1.** #443, a new dependency the owner declined.
- **Change since AV:** #448 moved from Carried ("needs content", no longer a cause) to built.

---

## 1b. LEDGER whole-row Carried (rounds 1–6) and "built in part" (#124), plus #41

| # | title | verdict | where / why |
|---|---|---|---|
| 47 | Habitica: class system and skills | **Carried: against a named rule**, owner decision 1d (ADR-046:39, "Habitica classes and skills stay Carried (game content, game layer off by default)") | game layer, off by default |
| 54 | Finch: Goal Challenges (14-day themed) | built `17aedb2c`, `78faec2b` (merge `dcc035c4`) | Habits → Start from an idea → "Programme: A 14-day habit starter" → `/app/guided?programme=habit-start` |
| 72 | Headspace: meditation courses and singles | built, written part `17aedb2c`, `bae8629d` (Read aloud, local voices only; `4509a812` TIER 3 AI tools), `78faec2b`. **Part Carried: against a named rule, 1d** (recorded sessions) | Health → Meditation → "Programme: A 10-day meditation starter" |
| 73 | Headspace: Sleepcasts | **Carried: against a named rule, 1d** (narrated audio) | — |
| 74 | Headspace: Move Mode | **Carried: against a named rule, 1d** (video) | — |
| 75 | Headspace: The Wake Up | **Carried: against a named rule, 1d** (video) | — |
| 76 | Calm: Sleep Stories | **Carried: against a named rule, 1d** (narrated audio), as the approved plan says (ADR-046:278) | — |
| 78 | Calm: multi-day programs | built `17aedb2c`, `78faec2b` | Guided journeys: "A sleep reset (7 days)", "A 10-day meditation starter" (from Health → Sleep and Health → Meditation) |
| 82 | Calm: Calm Lifestyle hub | Partner parts (AllTrails, Adidas): **Carried: needs an outside service**. **The written-collections part has no builder verdict: see "Rows without an allowed cause"** | — |
| 84 | MyFitnessPal: food search and diary | **Carried: needs an outside service** (branded/restaurant foods need the food lookup provider; the owner turns it on, OWNER_STEPS.md step 5, UNFINISHED CR-2) | the generic food tables are built |
| 113 | Strava + Runna training plans | built `17aedb2c`, `78faec2b` | Health → Workouts → "Programme: 0 to 5 km in 8 weeks" |
| 120 | Hevy Trainer (Pro) | built `17aedb2c`, `78faec2b`: "Beginner strength in 4 weeks" (a fixed written plan). See the judgement calls: there is no per-person programme builder | Health → Workouts → "Programme: Beginner strength in 4 weeks" |
| 122 | Sleep Cycle: Sleep Aid audio | **Carried: against a named rule, 1d** (spoken audio). Written part built: the sleep reset `17aedb2c` and Read aloud on the written guides `bae8629d` | Health → Sleep; Health → Meditation |
| 125 | Sleep Cycle: sleep goal and sleep programs | built `17aedb2c`, `78faec2b` | Health → Sleep → (under "Your sleep goal") the 7-day sleep reset |
| 195 | Fabulous: Journeys | built `17aedb2c`, `78faec2b` | `/app/guided` → Written programmes |
| 196 | Fabulous: daily coaching series | built, written part `17aedb2c`, `bae8629d`, `78faec2b` (five topic series, Read aloud). **Part Carried: against a named rule, 1d** (recorded audio/video) | `/app/guided` |
| 211 | Nike Run Club: Audio-Guided Runs | **Carried: against a named rule, 1d** (recorded audio). Playing during a GPS run: **native-only** | — |
| 234 | Moodnotes: self-awareness articles | **Carried: against a named rule** for the "articles by mental-health experts": no medical advice (M3-insights.md:7; ADR-011-coach.md:82), and no simulated content shown as real (ADR-038:16; ZIGoals cannot write as an expert). Written self-help: **already have** `apps/web/lib/journal/thinking-traps.ts` + `components/journal/thought-check.tsx` (twelve written thinking traps, EN/NL, #233). See the judgement calls. | Journal → Write → "Check a thought" |
| 274 | Obsidian: diagrams from text (Mermaid) | **Carried: a new dependency the owner declined** (1c) | fallback: the code block stays readable |
| 285 | Carb Manager: glycemic load per food | **Carried: needs an outside service** (a licensed third-party GI table) | — |
| 290 | Nike Training Club: trainer-led classes, yoga, Pilates | **Carried: against a named rule, 1d** (video classes). Written stretch/recovery part: **already have** `apps/web/components/health/meditation/daily-move.tsx` ("Move gently", now with Read aloud `bae8629d`) and `apps/web/lib/workouts/routine-library.ts:72` (stretch, rolling and yoga recovery routine) | Health → Meditation → Move gently; Workouts → Routines |
| 322 | Bear: math formulas | **Carried: a new dependency the owner declined** (1c: KaTeX/MathJax) | the formula text stays |
| 368 | Logseq: notes on a PDF | **Carried: a new dependency the owner declined** (1c: pdf.js) | the browser's own PDF viewer |
| 124 | Sleep Cycle: weekly reports and global benchmarks | "Your usual" part: **already have** (AV `d380d0ea`, not in this checkout's history). The rest (population benchmarks): **Carried: needs an outside service (published reference data)**. See the amendment 11 note below this table. | Health → Sleep → Your usual |
| 41 | Day One: E2E encryption and passcode | Sync side: **already have** `apps/web/lib/vault/extras-keys.ts` (journal choice section). Passkey part: **Carried: against a named rule**, owner decision 1b (ADR-046:33, "not now. Carried as 'owner: Beta'") | Settings → Account & devices |

**Amendment 11 (#124), applied literally.** I searched the repo for a "no comparing with others" rule. There is no general rule. Two texts come close, and each is scoped to one engine:
- `docs/architecture/ADR-011-coach.md:78`, a tone rule of the Guide's copy: "every figure is a value an engine computed from the records; never an estimate, a projection or a comparison with other people".
- `apps/web/lib/life-score.ts:13`, about the Life Score: "Its words are kind and never compare the person with anyone." `COMPETITORS.md:2160` generalises this as "calm design".

Neither covers the sleep week report, so #124 takes "needs an outside service (published reference data)". If the owner reads ADR-011:78 as general, the verdict becomes "against a named rule" with that quote.

**Section 1b totals (25 rows, plus #41):**
- **Built: 8** (#54, #72, #78, #113, #120, #125, #195, #196). Two of these, #72 and #196, have their recorded part Carried under 1d.
- **Carried: 16.**
  - Against a named rule, 1d (no recorded audio/video): 7 (#73, #74, #75, #76, #122, #211, #290).
  - Against a named rule, 1d (game layer): 1 (#47).
  - Against a named rule, no medical advice: 1 (#234).
  - A new dependency the owner declined: 3 (#274, #322, #368).
  - Needs an outside service: 3 (#82, #84, #285).
- **Built in part: 1** (#124). The rest is Carried: needs an outside service.

---

## 1c. Parts Carried inside built rows (41 rows; amendment 5)

Each part listed here is the one that stays out. The rest of each row is built (AV). A part whose old cause was not an E2 cause has been re-judged (rows marked *).

| # | row: part Carried | verdict |
|---|---|---|
| 5 | Todoist Task Capture: extraction from a photo/document | Carried: needs a model |
| 11 | TickTick reminders: email reminders | Carried: needs an outside service |
| 13 | TickTick calendar: live URL/Google subscription | Carried: needs an outside service |
| 24 | Sunsama timeboxing: write to an outside calendar | Carried: needs an outside service |
| 31 | Notion reminders: email reminders | Carried: needs an outside service |
| 36 | Day One metadata: weather and place names | Carried: needs an outside service (the weather Worker is in the repo; the owner deploys it: A38-1, OWNER_STEPS.md) |
| 42 | Day One audio: Apple Watch | Carried: native-only |
| 44 | Day One imports: Strava, Zapier, IFTTT | Carried: needs an outside service |
| 62 | Bearable symptoms: a second mood a day in strict `moods` | Carried: against a named rule, stored data only additive / frozen readers #37–#59 (ADR-046:109) |
| 63 | Bearable factors: weather | Carried: needs an outside service |
| 69 | Bearable hide data: figures inside NOVA widgets/cards | Carried: a protected area outside FR-TJ-7 (AR's NOVA composition, ADR-046:64) |
| 77* | Calm guided meditation: the recorded library | Carried: against a named rule, 1d (no recorded audio). Written meditations and Read aloud are built (`17aedb2c`, `bae8629d`) |
| 83 | Calm sleep companion: wearable sync | Carried: native-only |
| 89 | MFP meal planner: grocery delivery | Carried: needs an outside service |
| 93 | Cronometer 95 nutrients: CIQUAL's extra nutrients | Carried: needs an outside service. The INRAE file host was unreachable: HTTP 503 in AV, and on 25 Nov a connection reset twice through the egress proxy (registry-p5-fixes). "2 failed attempts" also holds |
| 95 | Cronometer recipes: sharing with users | Carried: against a named rule, nothing shared between people |
| 103 | MacroFactor: name/brand read from a package photo | Carried: needs a model |
| 104 | MacroFactor: a cookbook photo | Carried: needs a model |
| 109 | MacroFactor Workouts: Live Activity | Carried: native-only |
| 111 | Strava goals: challenges with friends | Carried: against a named rule, nothing shared between people |
| 141 | Monarch receipts: the amount read off the photo | Carried: needs a model |
| 178 | Daylio custom moods: NOVA's mood heat card | Carried: a protected area outside FR-TJ-7 (AR's NOVA composition) |
| 183 | Fabulous PiP routine: Lock Screen Live Activity, Dynamic Island | Carried: native-only |
| 197 | Lose It! meal names: a Today pin for an extra meal | Carried: against a named rule, stored data only additive (ADR-046:109) |
| 210 | Yazio calculators: ideal weight; calories burned | Carried: against a named rule. Calories burned: owner decision 1a (ADR-046:32; held by `69d08c79` and the scan test from `14e27442`). Ideal weight: no medical advice (M3-insights.md:7) |
| 214 | Kubera currency: fetched exchange rates | Carried: needs an outside service |
| 228 | Any.do automations: rules that assign people | Carried: against a named rule, nothing shared between people |
| 235 | Rise energy schedule: on an outside calendar | Carried: needs an outside service |
| 252 | Emma split and settle: a group shared across devices | Carried: against a named rule, nothing shared between people |
| 254 | BudgetBakers loyalty cards: Apple/Google Wallet | Carried: native-only |
| 262 | Structured cycle seasons: phase advice | Carried: against a named rule, no medical advice (M3-insights.md:7; ADR-011-coach.md:82) |
| 278* | Stoic dream journal: Stoic's insomnia lessons | Old cause "needs content", which is not an E2 cause. **No builder verdict: see the judgement calls** (the 7-day sleep reset `17aedb2c` may cover it) |
| 287 | Carb Manager goals: a ketone target (BMI goal left out) | Carried: against a named rule, no medical advice |
| 295 | PocketGuard needs/wants: 50/30/20 as a goal | Carried: against a named rule, no money advice (M3-insights.md:7; ADR-011-coach.md:81) |
| 325* | How We Feel strategies: strategy videos | Carried: against a named rule, 1d (no recorded video) |
| 330* | Runna plan/move: realigning Runna's own programmes | built `17aedb2c`, `78faec2b`: programme days open on calendar offsets with rest days, and a missed day stays open (`/app/guided`) |
| 335 | Pillow nap timer: ring with the screen locked / app closed | Carried: native-only |
| 353 | Akiflow travel time: minutes from a route | Carried: needs an outside service (maps) |
| 377 | Gentler Streak workout photos: on a map | Carried: needs an outside service (map tiles) |
| 409 | Diarium sun and moon: weather for the day | Carried: needs an outside service |
| 442 | Evernote voice notes (R7): a transcript | Carried: needs a model |

**Section 1c totals (41 parts):**
- Needs an outside service: 14 (#11, #13, #24, #31, #36, #44, #63, #89, #93, #214, #235, #353, #377, #409).
- Needs a model: 5 (#5, #103, #104, #141, #442).
- Native-only: 6 (#42, #83, #109, #183, #254, #335).
- Against a named rule: 12.
  - Additive / frozen readers: #62, #197.
  - Nothing shared between people: #95, #111, #228, #252.
  - 1a and no medical advice: #210.
  - No medical advice: #262, #287.
  - No money advice: #295.
  - 1d: #77, #325.
- A protected area: 2 (#69, #178).
- Built in AW: 1 (#330).
- Undecided: 1 (#278).
- Check: 14 + 5 + 6 + 12 + 2 + 1 + 1 = 41. Add #41's passkey part (1b, in §1b) for 13 against a named rule.

---

## 2. UNFINISHED.md

### 2a. Open rows: none (0)

### 2b. Carried (19)

| id | title | verdict | where / why |
|---|---|---|---|
| BL-10 | Chess: built-in opponent / playable board | **already have** `apps/web/lib/chess/computer-record.ts` (+ `av2-computer-record.test.ts`) | `/app/chess` (ZIGoals' own engine, AV lane 2) |
| CR-22 | 12–13 px notice and chip text | built `720dc303`: the Showcase chip, its panel heading, the computer notice's label, and eleven badges/pills/tags, all at 14 px. **Parts Carried:**<br>• the phone notice's label and its "On this device" fact: against a named rule, owner decision T-069 (13 Nov), pinned in `tests/grok53/shell/l10a-second-pass.spec.ts:153-155` and `tests/ao/owner-calls.spec.ts:35`<br>• `site-footer-tagline`: a protected area (footer finale)<br>• `path-next-tag` / `habit-section-mark`: a protected area (Checklist orbit path) | `components/shell/shell-ab.css`; unit `lib/aw-p5-fixes/cr22-labels.test.ts` |
| CI-1 | WebKit class A: a navigation after cancelled loads | **no allowed cause yet**: see the last section | the owner option (a "hydrated and quiet for 1 s" pre-navigation helper) is buildable |
| CI-2 | WebKit `ThreadedCompositor` segfault | **Carried: against a named rule**, owner rule 7 (CI_INTERMITTENTS.md:6, "Engine crashes are recorded with their diagnosis and not chased"; ADR-046:288) | engine crash; one re-run |
| CI-3 | Chromium renderer stall without a GPU | **Carried: against a named rule**, owner rule 7, as the approved plan assigns it (ADR-046:288; CI_INTERMITTENTS.md:132 and :141 list it under "Recorded, not chased"). Caveat: it is a stall, not a crash | headless Chromium |
| CI-4 | `hosted-verifier-order:18` core chunk aborted (local only) | **no allowed cause**: see the last section | never seen in CI |
| CI-6 | Sandbox-only reds (ui-design-pass:105, ui-evidence:115/50, …) | **no allowed cause**: see the last section | they pass in CI |
| CI-7 | WebKit install step: cache miss / slow apt | Carried: needs an outside service (the GitHub runner's apt mirror and Actions cache); the job limit is 60 min (AT D9). See the judgement calls | `.github/workflows/ci.yml` |
| CI-8 | `landing-v5-perf:79` CLS 0.0154 > 0.01 | **no allowed cause**: see the last section | — |
| CI-9 | `zigi-states:75` "listening" vs "sleepy" | **no allowed cause**: see the last section | — |
| CI-10 | `hud-perf:23` median frame 33 ms at 4× CPU | **no allowed cause**: see the last section | — |
| CI-11 | First sightings that passed on re-run | `earn-guide-zigi:54`: built `3115574d` (fixed at its cause, D-EARN54). `j04-offline:23`: fixed in AV under follow-up 8 (green in run 2024). **The rest (`for-you:8`, `progress-glass:60`, `zigi-voice-z:316`, `j06-data-safety:140`, `j05-notifications:159`): no allowed cause** | — |
| CI-12 | zigi-face-z:313, zigi-memory-af:15, o3-apps-extras:80 | **no allowed cause**: see the last section | — |
| CI-14 | `install-chrome.test.mjs:94` latent race | **no allowed cause**: see the last section. The stated cause, that the obvious fix moves a `seconds < 7` check, applies CLAUDE.md's "never weaken an assertion" to one fix only | `scripts/ci/install-chrome.test.mjs` |
| CI-18 | D-SYNC: account-browser stall | **Carried: 2 failed attempts**: AV attempt 1 (ADR-045:211, 6 of 6 passed, no reproduction) and attempt 2 (ADR-045:976, 3 of 4, with no stall diagnostics). AW Part 2 has not used attempts of its own | TIER 3 sync |
| S-8 | Today 409 px wide for < 1 s after reload | **Carried: a protected area outside FR-TJ-7** (shell navigation, ADR-046:64; `components/phone/phone-chrome.tsx`), per registry-p5-fixes. See the judgement calls | — |
| S-10 | Dutch answers carry English dates; all-English Life review card | built `8942a9b9`, `f83d1fdd` (TIER 3 AI tools), merge `c11559e4` | Dutch answers write Dutch dates and the 24-hour clock; the Life review card is Dutch under a Dutch question |
| A45-1 | Sync engine (~80 kB) out of every page's first scripts | **already have** `apps/web/components/vault-sync-lazy.tsx:11` (the engine as its own chunk, mounted by `app/app/layout.tsx`) and `components/vault-context.ts:8`. It shipped in AV lane 2 (STATUS "Tier 3 in plain words: the A45-1 engine split"). AW kept sign-in and the device lock in Settings' first scripts (`525e89bf`). The UNFINISHED row is stale | every page |
| KL-8 | "English only for now" (interface) | **Carried: against a named rule**, ADR-046:116 "English UI, USD/EUR; ZIGi and NOVA in EN and NL." | answers follow Dutch (S-10) |

Also changed in AW, though not open or Carried: **BL-13** "Calorie-burn estimate" (hidden honestly) is now **built `69d08c79`**, held by `14e27442` (`lib/aw-kcal/no-estimate.test.ts`). There is no estimator left anywhere, which makes "No calorie expenditure is estimated" true.

### 2c. Needs the owner (38): each decided on 21 Nov (follow-up 3)

| id | title | verdict |
|---|---|---|
| BL-2 | Daily snapshot notification | Carried: against a named rule, owner decision 21 Nov ("not before push is switched on"; in the app, Today's wealth line) |
| BL-7 | ZIGi as a companion over weeks | Carried: against a named rule, owner decision 21 Nov (keep; decide after the friends' first month) |
| BL-9 | Multichain / hardware wallet / multisig | Carried: against a named rule, owner decision 21 Nov (Beta) and "no wallet, contract-signing or key changes" (ADR-046:108) |
| BL-16 | "Start your fast" while closed | Carried: against a named rule, owner decision 21 Nov (after push; PK-22) |
| CR-2 | Food lookup provider inactive | Carried: needs an outside service (the provider; the owner sets it: OWNER_STEPS.md step 5) |
| CR-6 | Bulk tick with one confirm | Carried: against a named rule, owner decision 21 Nov (one at a time; pinned AT D4) |
| CR-18 | Showcase section lines; "Sleep debt" | Carried: against a named rule, owner decision 21 Nov (keep) |
| CR-19 | Erase names each area | **already have** `apps/web/lib/erase-areas.ts`, `components/settings/erase-everything.tsx:18-25` |
| M-9 | Goal creator Continue + counter from 60 | **already have** `apps/web/components/ui/length-counter.tsx:14` |
| M-10 | Visible close on the Checklist celebration | Carried: against a named rule, owner decision 21 Nov (keep) |
| L-9 | ZIGi "AI Companion" + Premium badge | **already have** `apps/web/components/ai/ai-launcher.tsx:236` ("ZIGi, your companion"); the Premium badge appears only in Plans |
| A38-1 | Weather proxy Worker deploy | Carried: against a named rule, "Never … deploy, or log in to Cloudflare" (ADR-046:107) + owner decision 21 Nov; OWNER_STEPS.md (weather, l.16/65) |
| A38-2 | Redeploy private-sync (NOVA section) | Carried: against a named rule (ADR-046:107); OWNER_STEPS.md step 2 |
| D20-5 | Health counters before any food/water | Carried: a protected area (Checklist orbit path, R2-15) + owner decision 21 Nov |
| D20-8 | NOVA "no AI used" lines + phone hint | Carried: a protected area (AR's NOVA composition) + owner decision 21 Nov |
| PK-4 | 5.1 MB market catalogue | Carried: against a named rule, owner decision 21 Nov ("later") |
| PK-5 | Re-encode ZIGi idle clips | Carried: against a named rule, owner decision 21 Nov ("after you compare"; the locked ZIGi look, ADR-046:64) |
| PK-6 | ZIGi "hello in place" moment | **already have** `apps/web/lib/zigi-hello-day.ts` |
| PK-7 | Smoother R013 hide move | Carried: against a named rule, owner decision 21 Nov (owner art; the locked ZIGi look) |
| PK-8 | HEVC-alpha MOVs | Carried: native-only (made on the owner's Mac) + owner decision 21 Nov; OWNER_STEPS.md l.120 |
| PK-9 | Sharp 2× brand mark | Carried: against a named rule, owner decision 21 Nov (owner file) |
| PK-10 | Chain Help topics hidden when no chain | **already have** `apps/web/lib/help/chain-help.ts` |
| PK-11 | Prefix-free practice-badge memo | Carried: against a named rule, "no wallet, contract-signing or key changes" (ADR-046:108) + owner decision 21 Nov ("No") |
| PK-13 | Fineli food table | Carried: against a named rule, owner decision 21 Nov ("send the raw files, then import") |
| PK-14 | OroSwap LP / USDC vault shares on Earn | Carried: needs an outside service (a real address on the deployed chain) + owner decision 21 Nov |
| PK-15 | Hosted verifier's late /api/push abort | Carried: needs an outside service (the hosted verifier run); OWNER_STEPS.md step 3 |
| PK-16 | Dependabot dev bumps (glob, minimatch) | **already have** `pnpm-lock.yaml` (glob@14.0.5, minimatch@11.0.8 / 3.1.5, outside the advisory ranges) |
| PK-18 | ZIGi cloud send with no privacy mode | **already have** `apps/web/lib/ai/privacy-mode.ts:18-24` (Guarded) |
| PK-20 | WalletConnect / Keplr Mobile on a real phone | Carried: needs an outside service (Reown allowed domains); OWNER_STEPS.md step 6 |
| PK-21 | Pre-filled Ramp / Banxa hand-offs | Carried: needs an outside service (the providers' public IDs) |
| PK-22 | Switch push on | Carried: against a named rule, owner decision 21 Nov ("after the Alpha's first week"); OWNER_STEPS.md step 7 |
| PK-23 | Landing numbering; guide finales as orb | Carried: against a named rule, owner decision 21 Nov (keep) |
| CS-3 | Placeholder prices | Carried: against a named rule, owner decision 21 Nov (keep, labelled, nothing charged) |
| CS-4 | Hosted ZIGoals AI | Carried: needs a model (a hosted model) + owner decision 21 Nov ("not in the Alpha") |
| KL-3 | Open accounts on alpha.zigoals.app | Carried: against a named rule, owner decision 21 Nov ("after the Alpha's first week"); OWNER_STEPS.md step 10 |
| KL-4 | Redeploy sync so the Checklist travels | Carried: against a named rule (ADR-046:107); OWNER_STEPS.md step 2 |
| KL-5 | Register with Oura/Withings/Polar/Strava | Carried: needs an outside service (the vendors' developer programmes) |
| KL-6 | Spotify app approval | Carried: needs an outside service (Spotify's approval) |

**Gaps for Part 7.** Six of these owner rows have no step in OWNER_STEPS.md: PK-21, PK-14, PK-13, KL-5, PK-5/PK-7/PK-9 (owner files) and KL-6. Each one should either get a step or an "optional / later" line.

### 2d. Already at an allowed cause (status = cause), unchanged
- **Needs an outside service:**
  - BL-5: DeFi / any-address P&L.
  - BL-18: live wearable sync.
  - PK-12: Bearable importer, ZIGChain EVM, AFL1/AFL3.
  - PK-17: Face ID / passkey. This is also owner decision 1b (Beta).
  - KL-7: Garmin.
- **Needs a model:**
  - BL-6: chart copilot.
  - BL-17: meal estimate from a photo.
  - CR-3: NOVA's goal workflow.
  - CR-4: ZIGi's monthly cap.
  - CR-5: prompt size on a real model.

### 2e. The counts line (amendment 5)

The current line, which is stale:
```
Counts: total 150 — open 14 · hidden honestly 10 · carried 19 · needs an outside service 5 · needs a model 5 · needs the owner 40 · finished 57 (eight rows finished in Part 4b: CS-5, CS-6, CS-7, CS-8, CS-11, D20-3, D20-4, KL-2).
```

**Corrected to the statuses now in the file.** I counted the status column myself: 150 rows.
```
Counts: total 150 — open 0 · hidden honestly 10 · carried 19 · needs an outside service 5 · needs a model 5 · needs the owner 38 · finished 73 (eight rows finished in Part 4b: CS-5, CS-6, CS-7, CS-8, CS-11, D20-3, D20-4, KL-2; the 14 open rows finished in AV lane 2, ADR-045 F1-2; CR-17 and CR-20 decided with the rules' default).
```

**If the integrator also writes this table's AW verdicts into the status column:**
- These move to finished: BL-13, BL-10, S-10, A45-1, CR-19, M-9, L-9, PK-6, PK-10, PK-16 and PK-18.
- CR-22 stays carried, for its T-069 and protected parts.

The line then reads:
```
Counts: total 150 — open 0 · hidden honestly 9 · carried 16 · needs an outside service 5 · needs a model 5 · needs the owner 31 · finished 84.
```

---

## 3. QUALITY.md (session-av)

### 3a. Batch-1 Minors left (lane2-b1)

| id | finding | verdict | where |
|---|---|---|---|
| b1 #9 | Journal search-by-date calendar: day buttons 34 × 44 px at 320 | built `83a0a82f` | Journal → Search by date: buttons are 44 × 44 below 390 px (`journal.css`; unit `lib/aw-p5-fixes/journal-calendar.test.ts`) |
| b1 #13 | The Showcase lacks "your usual", week objectives, areas, timers, chess, packs, habit options, journal photos | Timers: **already have** `apps/web/lib/timers/showcase.ts`. Goal areas: **already have** `apps/web/lib/showcase-data.ts:312`. **The rest is "Carried: the pinned Showcase counts". That is not an allowed cause: see the last section** | — |
| b1 #17 | "How many photos are on my tasks" can never be counted | **already have** `apps/web/components/ai/use-ai-context.ts:102` (`useTaskAttachmentCounts`) → `lib/ai/local-answers/engine.ts:311`; test `loose-ends-attachments.test.ts` | ZIGi and NOVA, EN and NL |

### 3b. "Not fixed" table (the Minors with a cause, from AV's first check)

| finding | verdict |
|---|---|
| Showcase examples that would change the Showcase's history or Today's cards (habit open yesterday, near-limit budget, more finished tasks, task reminder, Days until card) | **Cause: pinned counts / Today tab stops ≤ 90. That is not an allowed cause: see the last section** (the same class as b1 #13) |
| "Save this meal"; grouped repeat plans; symptom chart; Skip and amount per week-grid cell; daily task goal, load per day, matrix rules by label; save entry as template; paused-until note | **already have** (AV lane 2):<br>• `lib/food-plus/extra-meals.ts` + `components/health/health-app.tsx` (Save this meal)<br>• `components/health/daily-tools.tsx:173` (repeat groups)<br>• `components/report/report-document.tsx:52` (symptom lines)<br>• `components/habits/habit-week-grid.tsx:28` (Skip and amount)<br>• `components/tasks/task-plan-settings.tsx` (`dailyGoal`)<br>• `lib/tasks/minutes.ts` (day load)<br>• `components/tasks/matrix-rules.tsx`<br>• `components/journal/entry-more.tsx` (as a template)<br>• `components/tasks/task-editor.tsx` (paused until) |
| XP for the focus habit; hide figures offered in Settings and Export | **already have**: `components/habits/habit-options.tsx:48` (focus habit XP), `app/app/settings/page.tsx:201` ("Calories and weight on screen"), `components/export-everything.tsx:23` (`useHideFigures`) |
| Snooze lengths on the notification itself | built `3cba9d5d` (#439, TIER 3 PWA): the notification's snooze button carries the person's first own snooze choice and its real length (`public/sw.js:103`) |

**About the AW reviews.** QUALITY-b1 and QUALITY-b2 are E3 material (every Blocker and Major fixed: b1 in `7f4fc512`, b2 in `d9bb3b23`), not E2 rows.
- Fixed b1 Minors:
  - m4, m5, m6: `680385b0`.
  - m1: the Read aloud privacy line, `a0091c82`.
- Still open (Minors, no E2 obligation): b1 m2, m3, m7, m8 (+1.2 kB, speed attempt 2), m9 and m10.

---

## 4. FRIEND_READINESS.md

### 4a. Carried Minors (15)

| id | title | verdict | where |
|---|---|---|---|
| FR-S-13 | Dutch goal answers mix languages and figures | built `5c36bf57` (merge `c11559e4`) | NOVA/ZIGi goals list and one average goal; nl-NL figures |
| FR-S-14 | Non-fitness people see counters, coach, NOVA tiles, "Unlock layout" | built `2685eb3c` (Health counters wait unless "Move more"; Today's coach waits for a weigh-in or goal weight) and `8594a39d` (counters at 0 behind one teaching line). **Parts Carried:** NOVA's tiles ("Weight this month", "Tracked wealth"): a protected area outside FR-TJ-7 (AR's NOVA composition). **"Game layer" / "Unlock layout" on Today and the phone pill: no verdict: see the last section** | Health → Activity → Show quick counters; Today |
| FR-S-15 | Health header "Log food" only scrolls | built `4ec34c72` | Health hero → Log food opens the Log a meal sheet on a phone |
| FR-S-19 | /app/help ~3.1 s to usable | **no allowed cause yet** (Part 2 speed: attempt 1 `1df5ca90` / `3e2153c1` targeted Settings/NOVA; Help is not in the probe's route list) | — |
| FR-TJ-12 | = FR-S-15 | built `4ec34c72` | as FR-S-15 |
| FR-TJ-16 | Dutch answers name screens that don't exist | built `62862c7c` | ~40 Dutch answer lines name Wealth → Spending, Markets, Settings → ZIGi · your companion |
| FR-TJ-19 | Top-left logo almost invisible on Light | Carried: a protected area outside FR-TJ-7 (shell navigation, ADR-046:64) | — |
| FR-TJ-20 | Health Diary "Portions today" mostly empty | built `65410f06` | Health → Diary: one teaching line with "Choose what to count" |
| FR-TJ-22 | Showcase Wealth 3.6–4.0 s, Today 2.7–3.9 s | **no allowed cause yet** (Part 2 speed targets; attempt 2 pending; if the target is missed after attempt 2: "2 failed attempts") | — |
| FR-TJ-23 | No way to put €100 toward a goal from its page | built `15774a44` | Goal page ⋯ → "Add money to this goal" (Quick add's Contribution route) |
| FR-TJ-24 | "Your first five" below the fold under the Today hero | Carried: a protected area outside FR-TJ-7 (Today hero and slogan). First-run part built `a50f58b9`: quick starts in the welcome card; the first five ordered by focus | Today |
| FR-L-14 | Imported phone bill lands as Other | built `496bd1b5` | Wealth → Import from your bank (and every `expenseCategory` caller) |
| FR-L-16 | = FR-TJ-23 | built `15774a44` | as FR-TJ-23 |
| FR-L-17 | FRIENDS_GUIDE §8 and the phone have no Erase row | built `e674cbcf` (phone Settings → Data & privacy → Erase everything) + Help `aw-phone-erase` (`b292c360`). **Still to do (Part 8):** `docs/friends-alpha/FRIENDS_GUIDE.md:139` names only the computer path | Settings (phone) |
| FR-MAX-11 | NOVA "Habits by day" widget: a large empty panel | Carried: a protected area outside FR-TJ-7 (AR's NOVA composition) | — |

### 4b. Partly Minors (3)

| id | title | verdict | where |
|---|---|---|---|
| FR-MAX-6 | Dutch "sla … over" reaches the open-habits intent | built `c602953f` | `exact/lexicon.ts`: the split verb counts as skipped |
| FR-S-16 | ZIGi's Health-closed reply names long Privacy paths | built `72ad907e` (TIER 3 AI tools), Help `e4f617c6` | ZIGi: "Tap Allow Health in NOVA → Permissions" with a card to `/app/nova#nova-permissions` |
| FR-TJ-17 | "Gym streak" answered as workout weeks despite a habit named Gym | built `caa79c40` | `av2-body.ts` trainingStreak: a habit of that name answers first |

### 4c. Majors with a Carried part, and the other Partly Majors

| id | title | verdict | where |
|---|---|---|---|
| FR-TJ-7 | Habits: Complete far below empty groups and zero-state cards | built `5e6b92e3`, `99a7ad48`, `c06f20d4`, `67f51a8c`, `8d5f6414`, `6f0a2fbd` (merge `5ec74fbc`); owner decision 1e. `lib/aw-habits-tj7.test.ts` is 11/11 at HEAD (I ran it). The builder's risk: phone-Showcase Complete is estimated at y 950–1,050; the spec asserts it | `/app/habits`, phone and desktop |
| FR-L-5 | Tasks "Add task" below the fold; the Showcase at 390 Carried | Showcase part built `0ceeca0c` (New task first in the list card; This evening / Someday / Matrix / Completed under More views on a phone), spec `82c64bea` / `63499097` | Tasks |
| FR-TJ-4 | Mixed number formats in one locale (Partly) | **already have** `apps/web/lib/ai/local-answers/words.ts:67-101` (AV lane 2 second pass) | NOVA/ZIGi answers |
| FR-TJ-5 | A watched BTC address not named (Partly) | **already have** `apps/web/lib/ai/local-answers/ai-session.ts:135` | NOVA/ZIGi answers |
| FR-L-4 | "Log spending" far below the fold (Partly) | **already have** `apps/web/components/platform/wealth-view.tsx` (Log spending in the total's own block, `.wealth-hero-total`) | Wealth |
| (D-CI2026) | Health water card's drinks row arrives late (`ui-design-pass:385`), not in FR's list | built `a4b0ff35` | Health → Water: the drinks row is drawn with the card |

---

## 5. ADR-045 closing-table items (pointers; inventory §5)

| item | verdict |
|---|---|
| WebKit slow-load class (`zigi-voice-z:199`, `zigi-alive:54/137`) | AV: 2 failed attempts (ADR-045:971-974). AW Part 2 attempt 1: `1df5ca90` (Settings' lower groups lazy). **Open** until AW's CI result. Then fixed at its cause, or Carried: 2 failed attempts |
| `nova-dashboard:210` (D36, ND-1) | AW attempt 1 `3e2153c1`; open until a CI run shows the result |
| `earn-guide-zigi:54` | built `3115574d` (D-EARN54); marked fixed in CI_INTERMITTENTS (`6b786efe`) |
| `zigi-mini-window:81` (D-MINI81) | built `9c731395` |
| `zigi-browser-agents:126`, D34, `sign-in-codes-browser` after A45-1 | **not attempted in AW yet**: no verdict |
| WebKit shard over 45 min; worker-minutes | built `48eb8149` (TIER 3 CI: 6 WebKit shards, lists repacked) |
| "Older food-Worker timing (carried)" | no UNFINISHED row; `food-search.test.mjs:90` fixed in AV (`CI_INTERMITTENTS.md`, "Session AV follow-up 2"). Check that it is green in AW's runs |
| D-SYNC, A45-1, D20 minors, stale "14 ranked" / "open 14" lines | see §2 (CI-18, A45-1, the counts line) |

---

## Totals

### Round 7 (#432–#464)
| verdict | rows |
|---|---|
| built | 32 (one, #442, has a part Carried: needs a model) |
| already have | 0 |
| Carried: a new dependency the owner declined | 1 (#443) |
| **all** | **33** |

### AV + AW ledger (#1–#464), whole rows

| verdict | rows | which |
|---|---|---|
| built | **447** | 407 at AV's end (#1–#222: 180 + 24; rounds 2–6: 203), + 32 round 7, + 8 Carried rows built in AW (#54, #72, #78, #113, #120, #125, #195, #196) |
| built in part (rest Carried: needs an outside service) | **1** | #124 |
| already have | 0 | — |
| Carried | **16** | by cause, below |
| **all** | **464** | |

Carried by cause (whole rows):
- against a named rule: **9**
  - 1d, no recorded audio/video: 7 (#73, #74, #75, #76, #122, #211, which is also native-only, and #290).
  - 1d, game layer: 1 (#47).
  - No medical advice: 1 (#234).
- a new dependency the owner declined: **4** (#274, #322, #368, #443).
- needs an outside service: **3** (#82 partners, #84, #285), plus #124's rest.
- needs a model, native-only, a protected area, 2 failed attempts: 0 as whole rows.

Parts Carried inside built rows (41 + #41 passkey):
- needs an outside service: 14
- needs a model: 5
- native-only: 6
- against a named rule: 12, plus #41 (1b), which makes 13
- a protected area: 2
- built in AW: 1 (#330)
- undecided: 1 (#278)

Also in the built rows: the recorded parts of #72 and #196 are Carried: against a named rule (1d).

### UNFINISHED.md (150)
Each row has its AW verdict above, except the CI rows in the last section.

---

## Rows without an allowed cause (these must be built or decided)

1. **#82 Calm Lifestyle hub, the written-collections part.** No builder took it. Either the integrator decides that Guided journeys' written programmes (`17aedb2c`) are its collection hub, or a written collection gets built (1d YES).
2. **#278 Stoic, the insomnia lessons part.** The old cause, "needs content", is gone. Either the integrator decides that the 7-day sleep reset (`17aedb2c`, "If sleep stays hard, talk to a doctor") covers it, or written lessons get built, checked against no-medical-advice.
3. **QUALITY b1 #13 (the rest) and the QUALITY "Not fixed" row on Showcase examples.** "Pinned Showcase counts / Today tab stops ≤ 90" is not an E2 cause. Pinned answers can be re-recorded deliberately, as AW did (`4b4a38bc`, `95539712`). The rest covers:
   - week objectives, Tasks areas, packs, journal media, chess results, "your usual" mood/energy, habit options;
   - a habit open yesterday, a near-limit budget, more finished tasks, a task reminder, the Days until card.
4. **FR-S-14, "Game layer" and "Unlock layout" on Today and the phone's "Unlock layout" pill.** p5-fixes left these out ("not in this row's task"). This could be a protected area (the lock sits in the protected Today hero, and the pill may be shell navigation), but nobody has checked, so it has no verdict.
5. **FR-S-19 (Help ~3.1 s) and FR-TJ-22 (Showcase Wealth / Today > 3 s).** These wait on Part 2 speed attempt 2. Help is not in the speed probe's routes. If either target is missed after 2 attempts: "2 failed attempts".
6. **UNFINISHED CI rows CI-1, CI-4, CI-6, CI-8, CI-9, CI-10, CI-11 (the rest), CI-12, CI-14.** "Recorded / first sighting / investigate on a second failure / local only / sandbox only" are not E2 causes.
   - For each: fix it at its cause (at most 2 attempts), or Carried with "2 failed attempts".
   - CI-4 and CI-6 are never red in CI. Closing them as "already have: green in CI run N" needs the integrator's decision.
   - CI-1 has a named, buildable fix: the pre-navigation helper.
7. **`zigi-browser-agents:126`, D34, `sign-in-codes-browser` after A45-1** (AW Part 2, from ADR-045's closing table): not attempted yet.

### Judgement calls to confirm (an allowed cause is given, but it rests on a reading)
- **#124.** The verdict is "needs an outside service (published reference data)", because no general "no comparing with others" rule exists. ADR-011-coach.md:78 and lib/life-score.ts:13 hold scoped texts (quoted in §1b).
- **#120.** A fixed written plan is built. The per-person "programme builder" that the old row named is not. I treated the builder as the content mechanism, so the row counts as built.
- **#234.** Its written part was judged "already have" via #233's thinking traps. The approved plan says "the written self-help part is built", but no AW builder built articles.
- **CI-3.** Rule 7's text says "engine crashes"; this is a renderer stall. The plan assigns it to rule 7.
- **CI-7.** Given as "needs an outside service" (the runner's mirror/cache). The row also says "bounded attempts if it recurs", which would be buildable.
- **S-8.** The protected-area cause rests on the builder's hypothesis that the widening is in the phone top bar. Without a trace, the element is not identified.
- **"Nothing shared between people"** (#95, #111, #228, #252). It is named in the ledger but has no rule file of its own. An alternative allowed cause is "needs an outside service" (a shared server).
- **CR-22's T-069 part.** It stands against ADR-046:114's "labels ≥ 14 px". These are two owner rules in tension, and the owner should know.

## Resolved after the draft (the integrator, 26 Nov)
Each row the draft listed under "Rows without an allowed cause" now has one:

| Row | Verdict |
|---|---|
| #82 Calm's Lifestyle hub, written collections | **built** `b875f35b`, `ffffd450` (Guided journeys → Collections: Sleep better, Calm down, Move gently, Start a habit; wired `544ac62b`) |
| #278 Stoic, insomnia lessons | **built** `4394e93a`, `ffffd450` (seven written sleep lessons in Sleep better, with Read aloud on the device's own voice; the care line on each) |
| QUALITY b1 #13 (the rest) and QUALITY's "Not fixed" Showcase row | being built in aw/showcase (labelled Showcase examples; pinned answers re-recorded deliberately) — final verdict in the STATUS entry |
| FR-S-14, "Game layer" and "Unlock layout" on Today and the phone pill | **Carried: a protected area outside FR-TJ-7** — both live in the shell's status row (ADR-024 D8: the lock portals there from every page, the Gamify button beside it); shell navigation is protected (ADR-046, Rules) |
| FR-S-19 (Help) and FR-TJ-22 (Showcase Wealth / Today) speed | **Carried: 2 failed attempts** (D-SPEED attempts 1 and 2: Today −19 % blocking, Help and Wealth at parity) |
| Amendment 2's speed targets (hydrated ≤ 3000 ms everywhere, blocking −30 %, NOVA ≤ 1500 ms, no route's JS grows) | **Carried: 2 failed attempts** for the three time targets and for Tasks (+1.1 kB) and Agenda (+0.6 kB); every other route's first load is lighter than #59's (ADR-046 D-SPEED) |
| A45-1 (the sync engine's weight) | **already have** `components/vault-sync-lazy.tsx:11` (lazy since AV) |
| UNFINISHED CI rows (CI-1, CI-4, CI-6, CI-8–CI-12, CI-14), `zigi-browser-agents:126`, D34, `sign-in-codes-browser` | each in the STATUS entry's CI table with its run evidence: fixed at the cause in this session, green in the AW runs ("already have: green in CI run N"), or Carried: 2 failed attempts |

### The CI rows, with run evidence (the integrator, 26 Nov)
The evidence is CI runs 2031–2038, eight full runs of Session AW, each read failure by failure from its job logs.
"Green" means the test passed on its first attempt in every run where its job finished.

| Row | Verdict |
|---|---|
| CI-1 WebKit class A (a navigation after cancelled loads) | **already have: green in runs 2031–2038**. No WebKit test failed this way; WebKit ran in six shards from `48eb8149` on. The helper is not built: there is no failure for it to fix. |
| CI-4 `hosted-verifier-order:18` | **already have: green in runs 2031–2038**. It was only ever red in the sandbox. |
| CI-6 sandbox-only reds | **already have: green in runs 2031–2038** (they pass in CI, as recorded). |
| CI-8 `landing-v5-perf:79` | **already have: green in runs 2031–2038** |
| CI-9 `zigi-states:75` | **already have: green in runs 2031–2038** |
| CI-10 `hud-perf:23` | **already have: green in runs 2031–2038** |
| CI-11 the rest (`for-you:8`, `progress-glass:60`, `zigi-voice-z:316`, `j06-data-safety:140`, `j05-notifications:159`) | **already have: green in runs 2031–2038**. `j06`'s Notifications wait was fixed at its cause (Settings' late targets, `whenOnPage`). |
| CI-12 `zigi-face-z:313`, `zigi-memory-af:15`, `o3-apps-extras:80` | **already have: green in runs 2031–2038**. `zigi-face-z:197` timed out once on WebKit in 2037, a different test; it is watched. |
| CI-14 `install-chrome.test.mjs:94` | **already have: green in every unit run of 2031–2038** (latent, never seen) |
| `zigi-states:200` (WebKit, red in 2033 and 2035) | attempt 1 `3998d8a9` (ADR-046 D-ZIGI200); the verdict comes from the next runs |
| `nova-dashboard:210` (D36) | the registered intermittent (docs/STATUS.md, Known CI intermittents): red on both attempts once, in 2037; green in the other seven runs. It stays registered. |

Found while building, outside the ledger (each fixed at its cause):
- The policy had no `media-src`, so a journal voice note never played in a production build (TIER 3 CSP `305431f5`).
- ZIGi and NOVA could read a reply in an online voice outside Strict (TIER 3 AI tools `4509a812`).
- The restore's "never restored" line left out seven exported records (`73fa700c`); the round trip
  (`lib/aw-round-trip.test.ts`, every record kind) pins it.
- Offline, a page's later parts were kept one level deep only, and two lazy parts had no load boundary (TIER 3 PWA
  `b5a5d6eb`, `58c906d2`).
- Noted for the owner, not changed: the account erase (`lib/aa-device-forget.ts`) removes the records of Sessions AA
  onwards; older sessions' personal records go with Erase everything, not with the account erase (by its own design).
