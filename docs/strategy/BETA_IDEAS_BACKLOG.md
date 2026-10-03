# Beta ideas backlog: 100 upgrade ideas, a ranked top 20 and three 90-day options (research, 2026-10-03)

> **Ideas and options, not decisions.**
> - Every idea is checked against the six ZIGoals principles, and gets a legal flag where it touches health claims, financial advice, crypto, earn and staking, AI or children.
> - **Pricing is NOT decided.** COST_MODEL.md once noted 4.99 as an early idea, not a working or chosen price. No idea here assumes a price or a paid tier.
> - Evidence comes from [MARKET_LANDSCAPE.md](MARKET_LANDSCAPE.md) and [FEATURE_GAP_MATRIX.md](FEATURE_GAP_MATRIX.md), read 2026-10-03.

**Part of the [strategy pack](README.md).** The principles and the LC§ flags are explained in the [README](README.md#labels).

## How to read the tables
| Column | Meaning |
|---|---|
| **User value** | What a person gets, in plain words |
| **Effort** | <ul><li>**S:** fits inside one focused session part.</li><li>**M:** a dedicated session, or about two.</li><li>**L:** several sessions, a new platform or provider, a new dependency (which needs owner approval), or a legal review first</li></ul> |
| **Depends on** | Other ideas, owner approvals (new dependencies, Tier 3 areas), activation stages, or Sessions M and N in flight |
| **Principle fit** | <ul><li>✓ fits all six principles.</li><li>⚠ bends one (named, with the reason).</li><li>✗ conflicts: listed for completeness, never proposed or ranked.</li><li>"✓ …; ⚠ if …" means the idea fits only in the design that is named first</li></ul> |
| **Legal flag** | <ul><li>LC§1–LC§5: sections of [LEGAL_CHECKLIST.md](../business/LEGAL_CHECKLIST.md).</li><li>LC§6: Session N's proposed earn section.</li><li>LC-new: a question to add.</li><li>"—" means none found</li></ul> |
| **Score** | **2 × value + evidence + effort + fit + unlock**, out of 13. <ul><li>**Value** (1–3): to paying users.</li><li>**Evidence** (0–2): 2 = leaders charge for it or it is a repeated complaint; 1 = common among leaders; 0 = none.</li><li>**Effort:** S = 3, M = 2, L = 1.</li><li>**Fit:** ✓ = 1, ⚠ = 0.</li><li>**Unlock:** 1 if it enables several other ideas.</li></ul> The value judgements are ours: change them and the ranking changes. The rule is shown so it can be challenged |

**In numbers:**
- **100 ideas:**
  - 98 ranked;
  - 2 listed as ✗ (W10, W11).
- **By effort:** 36 S, 44 M, 20 L.
- **12 bend a principle** (⚠), and 4 more fit only in their named design.
- **50 carry a legal flag.**
- **In flight elsewhere, referenced and not duplicated:**
  - Session M: "remember this device" and polish;
  - Session N: Earn, the timezone work and the landing page.

## Ideas by area

### Goals

| ID | Idea | User value | Effort | Depends on | Principle fit | Legal flag | Score |
|---|---|---|---|---|---|---|---|
| G1 | Weekly goal review: a 2-minute ritual (progress, what got in the way, next step) | Keeps goals alive between big moments; a reason to open the app weekly | S | — | ✓ | — | 9 |
| G2 | Next steps inside a goal: small dated sub-steps to tick off | Turns a target into actions; planner users expect it (Todoist, TickTick) | M | — | ✓ | — | 8 |
| G3 | Health-linked goals: progress from a Health metric (weight trend, average steps, water days) | Unique cross-pillar value: one goal fed by the journal people already keep | M | — | ✓ honest: shows the person's own data, no suggested targets | LC§4 (wording must stay non-medical) | 10 |
| G4 | Goal templates library (health, learning, money, life) with plain examples | Faster first goal; fewer blank screens | S | — | ✓ honest: no implied returns in money templates | LC§4 (money and health wording) | 9 |
| G5 | Calendar file (ICS) export of target dates, milestones and contribution days | Goals show up where life is planned, without a sync server | S | — | ✓ a local file | — | 7 |
| G6 | Shared goal with one partner (couple or household), end-to-end encrypted | Households plan money and health together | L | Accounts live (Stage 7/8); a new sharing-key design | ⚠ private: a new sharing surface must stay end to end | LC§2; LC-new (children, if minors join) | 7 |
| G7 | "Why" card: a photo and one sentence per goal (local or end-to-end encrypted) | Motivation at the moment of doubt | S | Storage limits for images | ✓ | — | 6 |
| G8 | Season planning: themes, then goals, then habits (quarterly or yearly) | A natural yearly re-engagement moment | M | G2 | ✓ | — | 7 |

### Habits

| ID | Idea | User value | Effort | Depends on | Principle fit | Legal flag | Score |
|---|---|---|---|---|---|---|---|
| H1 | Streak protection: rest days, vacation mode and planned skips | Less guilt, fewer drop-offs after one missed day | S | — | ✓ honest: shown as skipped, never as done | — | 10 |
| H2 | Routines: an ordered stack (morning, evening) with one-tap run-through | Habit stacking without friction | M | — | ✓ | — | 8 |
| H3 | Habit insights: best weekday, time of day, consistency trend (descriptive only) | Understanding why a habit sticks | M | — | ✓ honest: no causal claims | — | 8 |
| H4 | Quit-habit counter with money saved (the person enters the amount; it can feed a goal) | Cross-pillar motivation: a habit that funds a goal | S | — | ✓ honest: the person's own figure | LC§4 (no advice) | 8 |
| H5 | Personal 30-day challenges with a finish moment | Novelty and a reason to come back | S | — | ✓ | — | 7 |
| H6 | Focus timer modes (for example 25/5) on the habit timer | Productivity users | S | — | ✓ | — | 7 |
| H7 | Auto-complete habits from Health entries in the same app (water journal fills the water habit, steps fill the walk habit) | One entry, two places updated: the all-in-one promise made visible | S | — | ✓ | — | 12 |

### Health

| ID | Idea | User value | Effort | Depends on | Principle fit | Legal flag | Score |
|---|---|---|---|---|---|---|---|
| HE1 | Activate barcode lookup (Open Food Facts) and keep favourites offline | Table stakes for nutrition; free here where MyFitnessPal and Lose It! charge | M | Provider activation; attribution | ✓ only the barcode leaves the device | LC§1 (ODbL) | 12 |
| HE2 | A second food source for generic foods (for example USDA FoodData Central) | Coverage for unpackaged food | M | Licence and terms check | ✓ | LC-new (data licence) | 9 |
| HE3 | Natural-language quick log on the device ("2 eggs and toast") | Speed: the main friction of food logging | L | A2 (on-device parser) | ✓ on the device; ⚠ private if sent to a cloud model | LC§4 | 10 |
| HE4 | Photo meal logging | The 2025-26 race in nutrition; but accuracy is the top complaint | L | An AI model; accuracy evaluation | ⚠ private if cloud; ⚠ honest: estimates must be labelled as estimates | LC§2, LC§4 | 7 |
| HE5 | More micronutrients from food data (vitamins, minerals), unknown kept separate from zero | Cronometer-style depth | M | HE1/HE2 data | ✓ honest | LC§4 (no deficiency claims) | 9 |
| HE6 | Fasting timer (later a Live Activity) | Popular; paid at MyFitnessPal, Lose It!, Cronometer Gold | S | — | ✓ | LC§4 (no health claims) | 10 |
| HE7 | Workouts and strength log (sets, reps, weight) | Gym users | M | — | ✓ | — | 8 |
| HE8 | Sleep and mood journal (manual, private) | Whole-person view; feeds cross-pillar insights | M | — | ✓ | LC§2 (special-category data) | 8 |
| HE9 | kJ display and per-100 g view | EU and other kJ users; matches EU labels | S | L1 for wording | ✓ | — | 6 |
| HE10 | Weight trend line with the method shown | Less noise from daily swings | S | — | ✓ honest: method visible | — | 9 |
| HE11 | Recipe import from a web address | Speed; paid at Cronometer Gold, built into MacroFactor | M | A fetch path | ⚠ private: the address goes to a server unless fetched on the device | LC§1 (recipe text rights) | 6 |
| HE12 | GLP-1 medication companion (doses, reminders, notes) | A fast-growing need served by MyFitnessPal, Lose It!, Noom | M | — | ✓ | LC§2, LC§4 (medical device question) | 8 |

### Wealth

| ID | Idea | User value | Effort | Depends on | Principle fit | Legal flag | Score |
|---|---|---|---|---|---|---|---|
| W1 | More currencies for net worth (beyond USD and EUR) | Global users; correct totals | M | Quote provider coverage | ✓ honest: manual vs quote labels | — | 9 |
| W2 | Spending snapshot: a few monthly categories entered by hand | Overlaps budgeting apps without bank links | M | — | ⚠ no-chore: manual entry every month | LC§4 (no advice) | 5 |
| W3 | File import of holdings and transactions (exchange or broker CSV), parsed on the device | Switching without API keys | M | I-series parser | ✓ | — | 12 |
| W4 | Read-only address tracking beyond ZIGChain (other Cosmos and EVM chains) | Crypto users hold on several chains | L | Public RPC or indexer providers | ⚠ private: addresses are revealed to providers | LC§3 | 7 |
| W5 | Price alerts | Crypto users expect them | M | R1 or R2 | ⚠ private: the alert list sits on a server unless checked on the device | LC§3 (no promotion) | 7 |
| W6 | Let it work: native staking and stZIG, testnet first, the person signs every step | The ZIGChain differentiator | L | Session N (ADR-009, Earn design); legal review | ✓ non-custodial, testnet first | LC§3, LC§6 | 7 |
| W7 | Contribution reminders tied to a goal ("move 50 to savings on Friday") | Turns plans into actions | S | R1 or R2 | ✓ honest: a reminder, not advice | LC§4 | 8 |
| W8 | Realized-events export (CSV) for the person's own tax work | Crypto users need it yearly | M | Portfolio | ✓ honest: no tax advice | LC-new (tax) | 9 |
| W9 | Keep it steady: a read-only stable-value view | Step 2 of Session N's journey | L | Session N | ✓ | LC§3, LC§6 | 4 |
| W10 | Bank account aggregation through a third party | What budgeting leaders do | L | Aggregator contracts | ✗ private: bank data flows through a third party | LC-new | — |
| W11 | Card or bank on-ramp to crypto inside the app | Session N found no on-ramp that delivers to ZIGChain | L | Session N | ✗ non-custodial and KYC risk; blocked today | LC§3 | — |

### Onboarding

| ID | Idea | User value | Effort | Depends on | Principle fit | Legal flag | Score |
|---|---|---|---|---|---|---|---|
| O1 | "Switch from your four apps": pick the apps you use, import each export file once | The core story made real | M | I1-I9 | ✓ no-chore: once, then sync | LC§1 for food data | 11 |
| O2 | Focus picker (Health, Money, Habits or All) that builds a starter goal, habit and Today layout | Value in the first minute | S | — | ✓ | — | 9 |
| O3 | First check-in inside onboarding | Activation: the first success before any account | S | — | ✓ | — | 9 |
| O4 | A plain privacy card: what is encrypted, what the server sees, what never leaves | Trust at the moment people decide | S | — | ✓ | LC§2 | 9 |
| O5 | Showcase to "make it mine": copy the demo layout, never its data | From demo to real without fake data | S | — | ✓ honest: no demo data copied | — | 6 |

### Daily motivation and retention loops

| ID | Idea | User value | Effort | Depends on | Principle fit | Legal flag | Score |
|---|---|---|---|---|---|---|---|
| M1 | Morning plan and evening review (2 minutes on Today) | A daily loop | M | — | ✓ | — | 8 |
| M2 | Weekly recap, made on the device | Reflection; a weekly reason to open | M | — | ✓ honest | — | 8 |
| M3 | Cross-pillar insight cards ("on days you walked, you also logged water") | Only an all-in-one app can say this | M | H3 | ✓ honest: descriptive, never causal; ⚠ if it drifts into health or money advice | LC§4 | 11 |
| M4 | Milestone celebrations with the brand's fold moments | Delight at the right moment | S | — | ✓ | — | 7 |
| M5 | Gentle comeback after a gap (no guilt, a fresh start) | Win-back | S | — | ✓ | — | 9 |
| M6 | Year (or month) in review, shareable only by choice | A sharing moment | M | S3 | ✓ | — | 6 |

### Reminders and notifications

| ID | Idea | User value | Effort | Depends on | Principle fit | Legal flag | Score |
|---|---|---|---|---|---|---|---|
| R1 | Web Push for the installed web app (iPhone 16.4+, Android, desktop) | Reminders that work when the app is closed: the top habit-app basic | L | Service worker; push service; CSP review (Tier 3) | ⚠ private: a server learns when to send unless the design hides it | LC§2 (health reminders) | 10 |
| R2 | Local notifications inside a native app (no server) | Private reminders | M | N2 | ✓ | — | 11 |
| R3 | Quiet hours and batching | Fewer interruptions | S | R1 or R2 | ✓ | — | 6 |

### Widgets

| ID | Idea | User value | Effort | Depends on | Principle fit | Legal flag | Score |
|---|---|---|---|---|---|---|---|
| WI1 | More in-app Today widgets (water, weight trend, net worth, fasting) | A more personal dashboard | S | — | ✓ | — | 7 |
| WI2 | Home-screen widgets with quick check-in (iOS, Android) | At-a-glance use; leaders' widgets are a common complaint when buggy | L | Native app (N2/N3) | ✓ on the device | — | 10 |
| WI3 | Lock-screen widgets, watch complications, Live Activities | Ambient progress | L | WI2 | ✓ | — | 7 |

### AI coach (non-advice, privacy-safe)

| ID | Idea | User value | Effort | Depends on | Principle fit | Legal flag | Score |
|---|---|---|---|---|---|---|---|
| A1 | Weekly reflection written on the device by a local model | A coach feeling without sending data anywhere | L | On-device model (WebGPU or native) | ✓ private if on the device | LC§4 (AI Act transparency) | 7 |
| A2 | Quick-add parser on the device ("ran 5k, 2 glasses of water, saved 20") | Speed across all four pillars | M | Rules first, a model later | ✓ | — | 11 |
| A3 | Goal breakdown helper: suggests next steps the person edits | Planning help | M | A1 or rules | ✓ on the device; ⚠ private if cloud | LC§4 | 8 |
| A4 | Opt-in cloud AI coach (zero-retention provider, consent per question) | Power users who want a chat coach | L | Provider agreement; legal | ⚠ private: data leaves the device readable | LC§2, LC§4 | 7 |
| A5 | AI guardrails: never moves money, never gives investment or medical advice, always labelled as AI | Trust; required by the principles | S | With any A-idea | ✓ non-custodial | LC§4 | 8 |

### Social and accountability (privacy-safe)

| ID | Idea | User value | Effort | Depends on | Principle fit | Legal flag | Score |
|---|---|---|---|---|---|---|---|
| S1 | Accountability partner: share chosen progress through an end-to-end encrypted link | Follow-through without a social network | M | Accounts; sharing keys | ⚠ private: a new sharing surface | LC§2 if health is shared | 7 |
| S2 | Small private groups and challenges (counts only, invite-only) | Social motivation (Habitica, Productive, Finch) | L | S1 | ⚠ private | LC-new (children) | 7 |
| S3 | Share a milestone card (an image with no data unless chosen) | Word of mouth | S | — | ✓ | LC§3 (no returns or prices on cards) | 8 |
| S4 | Self-commitment with a check-in buddy (no money stakes) | Follow-through; money stakes would mean custody | S | S1 | ✓ (money stakes would be ✗) | — | 7 |

### Import from other apps: the "switch from your four apps" path

| ID | Idea | User value | Effort | Depends on | Principle fit | Legal flag | Score |
|---|---|---|---|---|---|---|---|
| I1 | Import a MyFitnessPal export (diary, weight) | The largest nutrition base can bring its history | M | O1; whether free users can export is UNVERIFIED | ✓ parsed on the device | LC§1? (food data rights) | 10 |
| I2 | Import from Cronometer, Lose It!, Yazio, Lifesum exports | Other nutrition switchers | M | O1 | ✓ | — | 8 |
| I3 | Import habit apps (Loop, Habitify CSV/SQLite, Way of Life, Habitica) | Habit switchers keep their streak history | M | O1 | ✓ | — | 8 |
| I4 | Import planners (Todoist, TickTick exports) | Planners bring their goals and tasks | M | O1, G2 | ✓ | — | 6 |
| I5 | Import money apps (YNAB, Monarch, Copilot CSV) | Budget switchers bring balances and history | M | O1, W1 | ✓ | — | 9 |
| I6 | Import crypto trackers and exchanges (CoinStats, Delta, exchange CSV) | Crypto switchers | M | W3 | ✓ | — | 9 |
| I7 | Import an Apple Health export (on the device) | Years of steps, weight and workouts at once | M | Large files; parse on the device | ✓ | LC§2 | 8 |
| I8 | Import Google Takeout (Fitbit, Fit) | Android and Fitbit history, especially as Fitbit's Web API shuts | M | — | ✓ | LC§2 | 9 |
| I9 | Generic CSV mapper for the long tail | Any app with a CSV export | M | — | ✓ | — | 7 |

### Wearables and health platforms

| ID | Idea | User value | Effort | Depends on | Principle fit | Legal flag | Score |
|---|---|---|---|---|---|---|---|
| WE1 | Apple Health read and write (steps, weight, workouts, nutrition) | Data flows in by itself; a top expectation | L | Native iOS app (N2/N3) | ✓ stays on the device | LC§2; App Review 5.1.3 | 10 |
| WE2 | Android Health Connect | The same for Android | L | Native Android app | ✓ | LC§2; Play Health Connect policy (cross-platform sync clause) | 10 |
| WE3 | Cloud wearables: Google Health API (Fitbit, Pixel), Garmin, Oura, Withings | Device owners | L | OAuth server, webhooks, partner programs | ⚠ private: tokens and readable data pass a server | LC§2 | 6 |

### Native apps vs PWA

| ID | Idea | User value | Effort | Depends on | Principle fit | Legal flag | Score |
|---|---|---|---|---|---|---|---|
| N1 | PWA upgrade: offline app shell, install prompt, Web Push | App-like everywhere without stores | M | Service worker and CSP review (Tier 3) | ✓ (push metadata ⚠ private, see R1) | — | 8 |
| N2 | Native shell around the web app with native bridges (HealthKit, notifications, widgets) | Store presence and platform features | L | New dependency approval; App Review 4.2 risk | ✓ | LC§5 (in-app purchase rules) | 11 |
| N3 | Fully native iOS and Android apps | Best platform fit | L | Team and budget | ✓ | LC§5 | 11 |
| N4 | Android listing through a Trusted Web Activity | Play Store presence for the existing web app | M | Digital Asset Links; Play policies (Health apps declaration) | ✓ | LC§5 | 8 |
| N5 | Store presence plan: pre-orders, store pages in several languages, review prompts | Discovery | S | N2, N3 or N4 | ✓ | LC§5 | 9 |

### Localization

| ID | Idea | User value | Effort | Depends on | Principle fit | Legal flag | Score |
|---|---|---|---|---|---|---|---|
| L1 | Translation groundwork: strings out of the components (in-house dictionary or an approved library) | The prerequisite for any language | M | Dependency approval if a library | ✓ | — | 9 |
| L2 | Dutch and French (Belgium), then German | The home market in its own languages | S | L1; legal texts per language | ✓ | LC-new (legal texts per language) | 9 |
| L3 | Locale preferences: week start, kJ, more currencies | Correctness outside the US | S | L1 | ✓ | — | 6 |
| L4 | Localized store pages, Help and privacy notice | Discovery and trust | S | L1; lawyer | ✓ | LC§2 | 9 |

### Accessibility

| ID | Idea | User value | Effort | Depends on | Principle fit | Legal flag | Score |
|---|---|---|---|---|---|---|---|
| AC1 | WCAG 2.2 AA audit and fixes for the core flows | Inclusion; European Accessibility Act readiness | M | — | ✓ | LC-new (EAA scope) | 7 |
| AC2 | Text size, contrast and motion settings everywhere (Motion exists) | Comfort | S | — | ✓ | — | 6 |
| AC3 | Colour-blind-safe charts with text equivalents | Clarity | S | — | ✓ honest | — | 7 |
| AC4 | Keyboard shortcuts and a voice-friendly quick add | Speed | S | A2 | ✓ | — | 6 |

### Delight and brand

| ID | Idea | User value | Effort | Depends on | Principle fit | Legal flag | Score |
|---|---|---|---|---|---|---|---|
| D1 | Origami fold moments for milestones (from the brand film) | Delight that is ZIGoals' own | S | — | ✓ | — | 6 |
| D2 | Light theme | Preference and daylight readability | M | Design pass | ✓ | — | 5 |
| D3 | Haptics and sound on check-in (native) | Feel | S | N2 | ✓ | — | 6 |
| D4 | Seasonal challenges and themes | Re-engagement | S | H5 | ✓ | — | 7 |
| D5 | "Your orbit": one view of the four pillars together | The identity of the product | M | M3 | ✓ honest | — | 7 |

### Trust and plumbing

| ID | Idea | User value | Effort | Depends on | Principle fit | Legal flag | Score |
|---|---|---|---|---|---|---|---|
| T1 | Transparency page: what leaves the device, per feature | Trust that can be checked | S | — | ✓ | LC§2 | 9 |
| T2 | Independent security review of sync and its report | Trust for paying users | L | Budget | ✓ | — | 7 |
| T3 | Passkeys for sign-in | Fewer email codes | M | Auth (Tier 3) | ✓ | — | 5 |
| T4 | One-tap export of everything in open formats | Portability; the opposite of lock-in | S | — | ✓ | LC§2 | 10 |
| T5 | Entitlements layer that works for any pricing model | Needed before anything is sold; decides nothing about price | M | Pricing brainstorm | ✓ | LC§5 | 8 |
| T6 | Opt-in, aggregate usage counts for Beta (no identifiers, no third-party analytics), to see retention | Lets the owner see whether Beta works without tracking people | M | A privacy design review; a consent text | ⚠ private: any product metric bends it unless strictly opt-in and aggregate | LC§2 (ePrivacy consent) | 7 |

## Ranked top 20
Ranked by the score above. Ties at 9 also include G4, HE10, L2, L4, M5 and N5, which fall just below the cut on effort and then ID order.

| Rank | ID | Idea | Score (V·E·effort·fit·U) | Effort | Evidence |
|---|---|---|---|---|---|
| 1 | H7 | Auto-complete habits from Health entries in the same app (water journal fills the water habit, steps fill the walk habit) | 12 (3·2·S·✓·0) | S | Streaks auto-completes from Apple Health; Habitify charges for automatic tracking (Pro) ([MARKET_LANDSCAPE.md §2](MARKET_LANDSCAPE.md#2-habit-trackers)) |
| 2 | HE1 | Activate barcode lookup (Open Food Facts) and keep favourites offline | 12 (3·2·M·✓·1) | M | Barcode is paid at MyFitnessPal and Lose It!, free at Cronometer; "paywall creep" on barcode is a top complaint ([MARKET_LANDSCAPE.md §6](MARKET_LANDSCAPE.md#6-what-the-leaders-charge-for)) |
| 3 | W3 | File import of holdings and transactions (exchange or broker CSV), parsed on the device | 12 (3·2·M·✓·1) | M | CSV import is offered by YNAB, Monarch, CoinStats, CoinTracker, getquin and Kubera; CoinStats users complain the mapping is hard ([MARKET_LANDSCAPE.md §4](MARKET_LANDSCAPE.md#4-personal-wealth-net-worth-budgets-and-crypto-portfolios)) |
| 4 | A2 | Quick-add parser on the device ("ran 5k, 2 glasses of water, saved 20") | 11 (3·1·M·✓·1) | M | Natural-language capture is standard in planners (Todoist Quick Add and "Ramble"); voice logging is paid in nutrition ([MARKET_LANDSCAPE.md §3](MARKET_LANDSCAPE.md#3-goals-and-planning)) |
| 5 | M3 | Cross-pillar insight cards ("on days you walked, you also logged water") | 11 (3·2·M·✓·0) | M | Correlation reports are a paid feature at Bearable, and the core of Exist; no app correlates across all four pillars ([MARKET_LANDSCAPE.md §5](MARKET_LANDSCAPE.md#5-all-in-one-and-life-os-apps)) |
| 6 | O1 | "Switch from your four apps": pick the apps you use, import each export file once | 11 (3·1·M·✓·1) | M | Planners and money apps invest in migration (TickTick imports five rivals; YNAB migrates from Mint); no nutrition import exists ([MARKET_LANDSCAPE.md §3](MARKET_LANDSCAPE.md#3-goals-and-planning)) |
| 7 | R2 | Local notifications inside a native app (no server) | 11 (3·2·M·✓·0) | M | Every habit and planning leader sends reminders; missed reminders are a complaint at Todoist, Productive and Habitica ([MARKET_LANDSCAPE.md §2](MARKET_LANDSCAPE.md#2-habit-trackers)) |
| 8 | N2 | Native shell around the web app with native bridges (HealthKit, notifications, widgets) | 11 (3·2·L·✓·1) | L | All leaders but Kubera ship store apps; Apple Health, widgets and watch need native code ([MARKET_LANDSCAPE.md §9](MARKET_LANDSCAPE.md#9-health-platforms-and-wearables-integration-facts)) |
| 9 | N3 | Fully native iOS and Android apps | 11 (3·2·L·✓·1) | L | As N2; Streaks (#1 paid) and Things 3 (#3 paid) show native polish ranks ([MARKET_LANDSCAPE.md §2](MARKET_LANDSCAPE.md#2-habit-trackers)) |
| 10 | H1 | Streak protection: rest days, vacation mode and planned skips | 10 (2·2·S·✓·0) | S | Cal AI sells a $0.99 "Streak Restore"; Todoist, Habitify and Way of Life offer vacation or skip modes ([MARKET_LANDSCAPE.md §1](MARKET_LANDSCAPE.md#1-nutrition-and-calorie-tracking)) |
| 11 | HE6 | Fasting timer (later a Live Activity) | 10 (2·2·S·✓·0) | S | Paid at MyFitnessPal, Lose It! and Cronometer Gold ([MARKET_LANDSCAPE.md §6](MARKET_LANDSCAPE.md#6-what-the-leaders-charge-for)) |
| 12 | T4 | One-tap export of everything in open formats | 10 (2·2·S·✓·0) | S | Export is paid at Strides, Zerion and Emma (live) and reportedly MyFitnessPal (UNVERIFIED); free at Habitica, Loop and Way of Life ([MARKET_LANDSCAPE.md §6](MARKET_LANDSCAPE.md#6-what-the-leaders-charge-for)) |
| 13 | G3 | Health-linked goals: progress from a Health metric (weight trend, average steps, water days) | 10 (3·1·M·✓·0) | M | No planner or habit app links goals to a health metric; Strides' "Target" with a pace line is the nearest ([MARKET_LANDSCAPE.md §3](MARKET_LANDSCAPE.md#3-goals-and-planning)) |
| 14 | I1 | Import a MyFitnessPal export (diary, weight) | 10 (3·1·M·✓·0) | M | MyFitnessPal is the largest base (2.37M App Store ratings); no rival documents importing its history ([MARKET_LANDSCAPE.md §1](MARKET_LANDSCAPE.md#1-nutrition-and-calorie-tracking)) |
| 15 | HE3 | Natural-language quick log on the device ("2 eggs and toast") | 10 (3·2·L·✓·0) | L | Voice and text logging are paid at MyFitnessPal, Lose It!, Cronometer Gold and Lifesum ([MARKET_LANDSCAPE.md §6](MARKET_LANDSCAPE.md#6-what-the-leaders-charge-for)) |
| 16 | R1 | Web Push for the installed web app (iPhone 16.4+, Android, desktop) | 10 (3·2·L·⚠·1) | L | As R2, for the web app; iPhone Home Screen apps get Web Push since iOS 16.4 ([GLOBAL_READINESS §4](GLOBAL_READINESS.md#4-store-availability-and-platform-rules)) |
| 17 | WE1 | Apple Health read and write (steps, weight, workouts, nutrition) | 10 (3·2·L·✓·0) | L | Paid syncs at Lose It!, Habitify Pro and Yazio PRO; HealthKit is native-only ([MARKET_LANDSCAPE.md §9](MARKET_LANDSCAPE.md#9-health-platforms-and-wearables-integration-facts)) |
| 18 | WE2 | Android Health Connect | 10 (3·2·L·✓·0) | L | As WE1, for Android Health Connect ([MARKET_LANDSCAPE.md §9](MARKET_LANDSCAPE.md#9-health-platforms-and-wearables-integration-facts)) |
| 19 | WI2 | Home-screen widgets with quick check-in (iOS, Android) | 10 (3·2·L·✓·0) | L | Widgets are standard (Streaks, Habitify, Loop, Way of Life); buggy widgets are a complaint ([MARKET_LANDSCAPE.md §2](MARKET_LANDSCAPE.md#2-habit-trackers)) |
| 20 | G1 | Weekly goal review: a 2-minute ritual (progress, what got in the way, next step) | 9 (2·1·S·✓·0) | S | TickTick prompts a daily review; Exist sends a weekly email ([MARKET_LANDSCAPE.md §3](MARKET_LANDSCAPE.md#3-goals-and-planning), [§5](MARKET_LANDSCAPE.md#5-all-in-one-and-life-os-apps)) |

**What the top 20 says:**
- **The all-in-one advantage, used:** H7, M3, G3 and A2 turn "four apps in one" into something separate apps can't do.
- **Capture and switching:** HE1, W3, O1, I1 and HE3. These remove the reasons people stay with their old apps.
- **The platform cluster:** R1, R2, N2, N3, WE1, WE2 and WI2. These are the paying-user basics in [FEATURE_GAP_MATRIX](FEATURE_GAP_MATRIX.md#the-gaps-that-matter-most-for-paying-users); most need a native app.
- **Small trust and retention wins:** H1, HE6, T4 and G1.

## First 90 days after the Alpha: three options to choose from
Each option is a coherent 13-week shape. They can be mixed (for example A's first month, then C), and none is recommended over the others. All of them:
- keep the friends Alpha running;
- assume Stage 7/8 activation of accounts and sync, already scheduled;
- leave Sessions M and N to finish their lanes.

### Option A: "Make it stick" (retention first, web only)
- **Weeks 1–4:**
  - H7 (Health fills Habits);
  - H1 (streak protection);
  - M5 (comeback);
  - O2 and O3 (focus picker, first check-in);
  - T4 (export everything).
- **Weeks 5–8:**
  - G1 (weekly review);
  - M1 and M2 (daily ritual, weekly recap);
  - HE1 (barcode activation, at Stage 8);
  - WI1 (more Today widgets).
- **Weeks 9–13:**
  - R1 (Web Push), as a Tier 3 piece with a privacy design review;
  - M3 (cross-pillar insights);
  - AC1 (accessibility audit).
- **What it teaches:** whether people come back.
  - **Measurement without telemetry** is limited to opt-in feedback and sync activity (metadata the server already sees). Using that for analytics would need disclosure: ⚠ **private**, LC§2.
- **Approvals:**
  - Tier 3 for the service worker, push and CSP;
  - no new dependency, if Web Push is built in-house.
- **Risks:**
  - iPhone reach stays limited to the installed PWA;
  - no store discovery.

### Option B: "Make switching easy" (the four-apps story first)
- **Weeks 1–4:**
  - O1 (the switch path);
  - I9 (generic CSV mapper);
  - W3 (holdings CSV);
  - T4 (export).
- **Weeks 5–8:**
  - I1 (MyFitnessPal);
  - I3 (habit apps);
  - I5 (money apps);
  - HE1 and HE2 (barcode, a second food source).
- **Weeks 9–13:**
  - I7 (Apple Health export) and I8 (Google Takeout, while Fitbit's Web API shuts down);
  - L1 and L2 (Dutch and French).
- **What it teaches:** whether people bring their history, and which of the four apps they leave first.
- **Approvals:**
  - a licence check for food data (LC§1, HE2);
  - an i18n library would need dependency approval (L1).
- **Risks:**
  - export formats change without notice;
  - MyFitnessPal's export may be Premium-only (**UNVERIFIED**).

### Option C: "Go native" (the platform first)
- **Weeks 1–4:**
  - **N2:** a native shell around the web app (a new dependency, for example Capacitor, needs owner approval);
  - **N4:** an Android listing through a Trusted Web Activity, if N2 is not chosen for Android;
  - **T5:** entitlements, model-agnostic.
- **Weeks 5–8:**
  - R2 (local notifications);
  - WE1 (Apple Health);
  - WE2 (Health Connect).
- **Weeks 9–13:**
  - WI2 (widgets);
  - N5 (store pages);
  - L4 (localized store pages);
  - TestFlight and Play testing tracks.
- **What it teaches:**
  - **Store discovery:** Apple says almost 65% of App Store downloads follow a search ([Apple Ads](https://ads.apple.com/app-store)).
  - **Privacy-safe store analytics:** App Store Connect's retention and peer benchmarks come from opted-in users with differential privacy ([peer group benchmarks](https://developer.apple.com/help/app-store-connect-analytics/benchmarks/peer-group-benchmarks/)).
- **Approvals:**
  - new dependencies;
  - App Review 4.2 (more than a website) and 5.1.3 (health data);
  - Google's Health apps declaration;
  - LC§5 (in-app purchase rules) before any sale in the apps.
- **Risks:**
  - the largest effort;
  - a second codebase surface to test;
  - store review timelines.

**Mixing note:** Option A's weeks 1–4 are all S-sized and independent of the platform choice, so they fit before any of the three paths.

## Not proposed (✗), listed for completeness
- **W10, bank aggregation through a third party:** conflicts with **private**.
- **W11, a card or bank on-ramp inside the app:** conflicts with **non-custodial** and needs KYC. Session N found no on-ramp that delivers to ZIGChain.
- **Also excluded by principle and not given IDs:**
  - exchange API keys;
  - money stakes (Beeminder- or stickK-style);
  - an ad-funded free tier;
  - custodial earn products.

## Sources
Evidence links point to [MARKET_LANDSCAPE.md](MARKET_LANDSCAPE.md) (every competitor fact, with URLs and access dates) and [GLOBAL_READINESS.md](GLOBAL_READINESS.md). External pages linked directly here (read 2026-10-03):
- Apple Ads, App Store discovery: <https://ads.apple.com/app-store>
- App Store Connect, peer group benchmarks: <https://developer.apple.com/help/app-store-connect-analytics/benchmarks/peer-group-benchmarks/>
