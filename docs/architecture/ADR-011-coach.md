# ADR-011: the Guide, a coach that runs on this device

Status: **Accepted; phase 1 implemented on-device (Session P, PR 4, 2026-10-04), phase 2 design only.** The addendum at the end records where the code differs from the first draft. Owner decision P4 at the approval of the Session P plan: the name "Guide", the tone, the placement, opt-in and off by default. Phase 1 adds no service, no model, no network call and no dependency. Phase 2 (a model on the device or through a proxy Worker) is described for a later owner decision; no cloud AI code is written. Code references are to `main` at `d439dc9`.

## Context
- **The person's records already live on the device**, and the app already computes from them:
  - habit days and streaks (`apps/web/lib/habits.ts`, `computeHabitStats`);
  - the day's water, weight and activity (`lib/health-daily.ts`);
  - goals with a contribution plan and a next date (`lib/positions.ts`, `goal-intelligence.ts`);
  - the in-app reminders ([REMINDERS_V1.md](../product/REMINDERS_V1.md)).
- **PR 3 adds the engines a coach needs, and nothing more:**
  - insight cards (`lib/insights/`): counts over the last 60 days, never causal;
  - the weekly review (`lib/weekly-review/`): a chosen weekday and six calm steps;
  - streak protection (planned skips are neutral), health goals and fasting.
  - Each keeps its records in a device-only key; their synced homes exist read-only ([SYNC_HOMES.md](../product/SYNC_HOMES.md)).
- **Promises that must hold:** no analytics, no trackers, no content on any server (the sync server holds ciphertext and metadata only, [PRIVACY_NOTICE_DRAFT.md](../legal/PRIVACY_NOTICE_DRAFT.md)); Health has its own explicit consent; nothing in the app gives money or medical advice ([LEGAL_CHECKLIST.md](../business/LEGAL_CHECKLIST.md) §2 and §4, which already asks the lawyer about an AI assistant).
- **Why a coach at all:** the Beta brainstorm pack lists AI coaches among the leading apps ([MARKET_LANDSCAPE.md](../strategy/MARKET_LANDSCAPE.md)). The owner wants the calm version for the friends Alpha, built from the person's own records, with the model question left open.

## Decision: phase 1, the Guide on this device
### Name and label
- The coach is called **Guide**: "your Guide, on this device".
- Every place it speaks carries the label **"Guide · on this device, no AI service"**.
- It never calls itself an assistant, a coach or an AI.

### Where it appears
- **One card on Today**, inside the "For you" area (the block that holds the reminder cards and PR 3's insight and weekly-review cards), directly below the reminder cards. At most one nudge a day; no card when there is nothing to say.
- **The summary step of the weekly review** (PR 3, G1): one read-only paragraph above the person's own notes, built from the week's counts.

### Opt-in, off by default, easy off
- Settings gains a section `id="guide"`, **"Guide on this device"**, with one switch, its explanation and the label:
  - explanation: "Reads only what you record here, on this device. Nothing is sent anywhere. Turn it off any time.";
  - the phone settings list gets the row `["Guide on this device", "Calm notes from your own records", "guide"]` under "Try & display".
- The choice is a device key, `zigoals:guide:v1`:
  - shape `{version: 1, enabled: boolean, dismissed: {[nudgeId]: "YYYY-MM-DD"}}`, through `getAppStorage()`, per account; in Showcase it lives in the tab's session storage;
  - zod-validated and read-tolerant: unreadable data reads as off and is never rewritten;
  - written only by the switch and "Not today"; listed in `onboarding.ts` as personal; never synced; included in T4's export like the other device keys.
- Every card offers **Not today** (hides that nudge until tomorrow) and **Turn off the Guide** (one tap, no confirmation).

### The card
- Eyebrow: "Guide · on this device, no AI service".
- Heading: the nudge's first sentence; body: the rest of the copy, at most two sentences.
- Actions: the nudge's action as a secondary link, "Not today" as a quiet button, and the text link "Turn off the Guide" to `/app/settings#guide`.
- Layout and type follow the reminder cards (`components/reminders/reminder-cards.tsx`): a `panel` article, labels of at least 14 px, targets of at least 44 px, one-time motion, the final state under reduced motion or Motion Off.
- The review's summary step uses the same eyebrow above its paragraph and no actions.

### Inputs
- A pure engine, `lib/coach/guide.ts`: `guideNudge({habits, health, platform, reminders, insights, review, now, zone, guide})` returns at most one nudge.
- It reads only what Today already loaded: habits and their stats, Health's daily data (after the existing Health consent on this device, exactly like Today's own Health widgets), goals and plans, the due reminders, the insight engine's cards and the weekly review's state.
- It never fetches, never reads another account's storage, and never looks at the clipboard, the location or anything outside the records.

### Nudges: the copy table
Conditions are exact and testable. Days follow the habit journal's day (`habitCalendarDay`) and Health's day (`healthDay`); the clock is the device's. Priority decides when several hold; the first match wins.

| # | Id | Condition (all must hold) | Copy (exact) | Action |
|---|---|---|---|---|
| 1 | `review-ready` | Today is the review's chosen weekday; this week's review is neither completed nor skipped; the review card is not dismissed | "Your weekly review is ready when you are. It takes about five minutes." | Open the review |
| 2 | `habits-open` | Device time ≥ 18:00; N ≥ 1 habits scheduled today with status `due` or `partial`; none of them has a reminder card showing right now | "N of your habits are still open today: {up to two titles}. A small step counts." (N and the titles come from `habitDay`) | Open habits |
| 3 | `streak-notice` | A habit's current streak equals 7, 14, 30, 60, 100 or 365 days today (`computeHabitStats`, skips neutral); once per habit and milestone | "{title}: {n} days in a row today. Worth noticing." | Open habit |
| 4 | `goal-next-date` | An active goal with an active contribution plan whose next date (`planDay`, UTC today) is today or tomorrow | "{goal name}: your plan's next date is {today / tomorrow}. Nothing moves by itself; this is only the date you chose." | Open goal |
| 5 | `insight-ready` | The insight engine has a card that is not dismissed and was first shown today | "A pattern from your own records is below. It is a count, not a cause." | None (points at the card) |
| 6 | `quiet-day` | No habit is scheduled today, nothing is due, no review is ready; shown at most once in 7 days | "Nothing is due today. Rest is part of the plan." | None |
| 7 | `first-time` | The Guide was turned on today and the account has no habit, goal or Health entry yet | "I read only what you record here, on this device. Add a habit or a goal and I will keep an eye on the dates." | Open habits |

### Weekly review summary (G1, step 6)
- One paragraph composed from the week's numbers, each from an engine with a test: habit days done of scheduled, days with water logged, weights recorded, planned contributions and recorded ones, and last week's intention if any.
- Template: "This week: {done} of {scheduled} habit days done, water logged on {w} days, {k} weights recorded, {c} of {p} planned contributions recorded. {Last week you wrote: '{intention}'.}"
- Counts of zero are written out ("no weights recorded"), never hidden.

### Tone rules (checked by a test over the copy table and the templates)
| Rule | Means |
|---|---|
| Calm, second person | "you", "your"; short sentences; no exclamation mark anywhere |
| No shame | none of: failed, missed, only, should, must, behind, lazy, lost, broke |
| No praise inflation | none of: amazing, crushing, incredible, perfect |
| No urgency | none of: now, hurry, last chance, before it is too late |
| No number it cannot back | every figure is a value an engine computed from the records; never an estimate, a projection or a comparison with other people |

### Guardrails (A5)
- **Never money advice:** no suggestion to buy, sell, stake, contribute more, change a plan or move an asset; it states dates and counts the person chose or recorded. This keeps the MiFID II and MiCA questions of LEGAL_CHECKLIST §4.1 where they are.
- **Never medical advice:** no comment on weight direction, calories, fasting or targets beyond the count of records; nothing about a health goal except that it exists and its date.
- **Never moves anything:** the engine returns text and a link; the only write is its own key (the switch and "Not today").
- **Always labelled** "Guide · on this device, no AI service"; the card is an `article` with `aria-label="Guide"`.
- **No persuasion mechanics:** no countdown, no "you will lose your streak", nothing scheduled to interrupt. It appears once a day on Today and respects Motion Off and reduced motion like every card.
- **Fixed rules written by people.** Phase 1 contains no model, no learning and no adaptation. Whether such a rule table is an "AI system" under the AI Act's Art. 3(1) ("infers, from the input it receives, how to generate outputs such as … recommendations") is a question for the lawyer (below); the label is worded so that it is true either way.

## Phase 2: options for a later owner decision
Nothing below is built. Each option would need its own ADR, the lawyer's answers and, for (a) and (b), a new dependency or a new Worker, which need owner approval.

| | (a) A model on the device (WebGPU) | (b) Opt-in cloud through a proxy Worker | (c) Hybrid |
|---|---|---|---|
| What | A small instruct model runs in the browser through WebGPU; the Guide's rules choose the facts and the model only words them, or answers a question | A new Worker forwards one explicitly composed message to a hosted model provider and returns the answer; nothing is stored | Rules and, where available, the on-device model; the cloud only for an explicit "ask the Guide", with consent each time |
| Privacy | Best: nothing leaves the device. The model file is downloaded once from a host the app names (our host or the model's publisher), which sees that download | Weakest: the composed message leaves the device. Mitigations: the app shows the exact message before sending; the person picks what goes in; no raw records, no identifiers; the Worker keeps nothing; the provider agreement must exclude training and set retention; health content needs the Health consent plus a per-message confirmation | Between the two; the default never sends anything |
| Platform support (sources below) | WebGPU: Safari 26 (iOS mirrors), Chrome 113 partial and 144 full on desktop, Chrome 121 on Android, Firefox 141 partial (MDN compat data); Apple's Safari 26 notes: "Added support for WebGPU" | Any browser | As (a) where supported, otherwise rules only |
| Device cost | A usable model is hundreds of megabytes to a few gigabytes: a long first download on a phone, memory pressure, battery and heat during use; small models have limited quality and must be checked against the guardrails with tests | None on the device | As (a) |
| Money | Hosting the model file: bandwidth per install (**unknown** price; a 1 GB file for 20 friends is about 20 GB of transfer once); no per-use cost | Per token at the provider (**unknown** here; no provider page was read). Order of magnitude with COST_MODEL's assumptions A1–A4: 20 friends × 1 short exchange a day × about 1,000 tokens ≈ 600,000 tokens a month; the Worker's own load is far below the Durable Objects Free figures quoted in ADR-010. A monthly cap in the Worker must fail closed | Both, but the cloud share is small by design |
| Legal (for the lawyer) | AI Act Art. 50(1): a system interacting with people must say so (the label already does; the Act applies from 2 August 2026, Art. 113). No high-risk use is intended (Annex III is not engaged by a wellbeing and planning app, to be confirmed). Health and money wording limits stay as in phase 1. Minors: an age limit for the Alpha is still open (PRIVACY_NOTICE_DRAFT §8) | As (a), plus: a processor agreement and transfer safeguards for the provider (LEGAL_CHECKLIST §2.5); special-category data if health content is sent (GDPR Art. 9); the provider's own terms on retention and training; whether a free-text conversation about money or health can slide into advice (§4.1, §4.3). Art. 5(1)(a) and (b) (manipulative techniques, exploiting vulnerabilities) rule out any persuasion design | Both |
| UX | Works offline after the download; latency depends on the device; needs an "installing the model" state and a way to delete it | Fast and good wording; needs a consent sheet per conversation, a visible "sent to a service" state and a plain failure state | The most to explain |
| Dependencies | An inference library and model weights: a new dependency and a licence review | A provider client (or plain `fetch`), a new Worker, a secret through `secret put` | Both |

**Added 2026-10-05 (Session T):** a fourth option, **(d) the person's own provider, browser-direct**, was chosen and built as a separate feature, ZIGi · your AI ([ADR-012](ADR-012-your-ai.md)). The Guide is unchanged; its phase 2 (a)–(c) remain open.

**Questions the owner must answer before phase 2:**
1. Is a conversation wanted at all, or only better wording of the rule-based nudges?
2. Which is acceptable: a one-time large download on the person's device (a), or sending composed text to a provider (b)?
3. For (b): which provider, under which agreement (no training, retention, region), at what monthly cap, and who pays?
4. May the Guide ever read Health in a conversation, and under which consent?
5. The age limit for the Alpha and how it is checked.
6. The lawyer's answers to LEGAL_CHECKLIST §4.2 and to the Art. 3(1) question above.

## Consequences
- **Privacy:** phase 1 changes nothing about what leaves the device; the privacy notice gains one line ("The Guide reads your records on this device only"). The server is not involved.
- **Product:** one more card competes for Today; it is off by default and never appears without the switch. The desktop freeze check lists the Settings section and the card as authorised differences.
- **Honesty:** the label states what it is. No claim of intelligence, memory or learning is made anywhere.
- **Operations:** nothing to activate, no secret, no Worker, no flag.
- **Rollback:** revert the PR. Older builds ignore `zigoals:guide:v1`; the key is harmless if left behind.
- **Not done here:** phase 2 in any form; the open legal questions are appended to LEGAL_CHECKLIST §4 as questions, not answers.

## Implementation plan (phase 1)
1. `apps/web/lib/coach/`: `schema.ts` (the key, zod), `store.ts` (read, enable, disable, dismiss), `copy.ts` (the table above as data), `guide.ts` (the engine), `summary.ts` (the weekly review paragraph).
2. `apps/web/components/coach/`: `guide-card.tsx` (Today), `guide-settings.tsx` (Settings), `use-guide.ts` (the hook, same shape as `use-reminders.ts`); one row in `components/phone/phone-settings.tsx`; the review's summary step renders `summary.ts` when enabled.
3. `apps/web/lib/onboarding.ts`: the key is personal.
4. Help: one entry, "What is the Guide and what does it read".
5. Docs: PRIVACY.md (one line), PRIVACY_NOTICE_DRAFT.md (one line), LEGAL_CHECKLIST.md §4 (questions), this ADR's status.

## Tests
- **Engine** (`lib/coach/guide.test.ts`):
  - each nudge's condition true and false; the priority order; one nudge a day;
  - "Not today" hides exactly that nudge until the next journal day;
  - the 11 time zones used by the habit tests, through `habitCalendarDay`;
  - the Showcase data (`buildShowcase(day)`) yields a deterministic nudge sequence over 14 days (snapshot);
  - nothing is returned when the Guide is off.
- **Copy and tone** (`lib/coach/copy.test.ts`): no exclamation mark and no emoji; none of the words in the tone table; every `{placeholder}` maps to an engine value; the label is present on every output.
- **Summary** (`lib/coach/summary.test.ts`): the paragraph's numbers equal the engines' counts for the same week; zeros are written out.
- **Store** (`lib/coach/store.test.ts`): unreadable data reads as off and is left untouched; writes only on the switch and "Not today".
- **Browser** (`tests/guide.spec.ts`, desktop and 390 px):
  - off by default: no card and no request;
  - enabling in Settings shows the card with the label; "Not today" hides it until tomorrow (clock advanced); "Turn off the Guide" removes it and resets the switch;
  - viewing writes nothing;
  - the weekly review's summary step shows the paragraph only when enabled;
  - keyboard and screen-reader names.
- **Freeze check:** the Settings section and the Today card are the only authorised differences.

## Sources (read 2026-10-03)
- Regulation (EU) 2024/1689 (AI Act), EUR-Lex HTML: <https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32024R1689>.
  - Art. 3(1): "'AI system' means a machine-based system that is designed to operate with varying levels of autonomy and that may exhibit adaptiveness after deployment, and that, for explicit or implicit objectives, infers, from the input it receives, how to generate outputs such as predictions, content, recommendations, or decisions".
  - Art. 50(1): "Providers shall ensure that AI systems intended to interact directly with natural persons are designed and developed in such a way that the natural persons concerned are informed that they are interacting with an AI system, unless this is obvious".
  - Art. 5(1)(a) and (b): prohibited manipulative techniques and the exploitation of vulnerabilities.
  - Art. 113: "It shall apply from 2 August 2026."
- MDN browser-compat-data, `api.GPU` (WebGPU), read from `github.com/mdn/browser-compat-data` (main): Safari 26 (iOS mirrors), Chrome 113 partial and 144, Chrome Android 121, Firefox 141 partial.
- Apple, Safari 26 release notes, <https://developer.apple.com/documentation/safari-release-notes/safari-26-release-notes> (read through its JSON data endpoint): "Added support for WebGPU."
- Cloudflare Durable Objects pricing (for a proxy Worker's own load): <https://developers.cloudflare.com/durable-objects/platform/pricing/>, figures quoted in ADR-010.
- Repository: [LEGAL_CHECKLIST.md](../business/LEGAL_CHECKLIST.md) §2 and §4, [COST_MODEL.md](../business/COST_MODEL.md) assumptions A1–A4, [PRIVACY_NOTICE_DRAFT.md](../legal/PRIVACY_NOTICE_DRAFT.md), [SYNC_HOMES.md](../product/SYNC_HOMES.md), the Session P plan (owner decision P4).

## Addendum (2026-10-04, implementation)
- **The key** `zigoals:guide:v1` is `{version: 1, enabled, enabledOn?: "YYYY-MM-DD", dismissed: {[nudgeId]: "YYYY-MM-DD"}}`: `enabledOn` is the day the switch was turned on, which the `first-time` nudge needs. Dismissals older than 28 days are dropped at the next write; at most 100 are kept.
- **Hiding windows.** "Not today" hides a nudge from its day: one day for `review-ready`, `habits-open`, `goal-next-date` and `first-time`; 7 days for `quiet-day` (the table's "at most once in 7 days", which viewing cannot record because viewing writes nothing); 28 days for a `streak-notice:<habit>:<n>` and an `insight-ready:<card>` (once per milestone or card).
- **Two conditions were tightened.** `quiet-day` needs at least one habit (a rest day presumes a plan), so a brand-new account hears `first-time` instead. `insight-ready` holds while an insight card is shown and not dismissed; "first shown today" was dropped, since nothing records when a card was first shown.
- **Two sentences changed** for the tone table's own word list ("only" is on it): `goal-next-date` ends "this is just the date you chose."; `first-time` begins "I read nothing but what you record here, on this device."
- **The card** is an `article` labelled "Guide"; each nudge has a heading and a body sentence in the copy table (`apps/web/lib/coach/copy.ts`) rather than being split at a full stop. The review's paragraph appears on the last step ("One intention") as a `note` labelled "Guide", above the person's own words.
- **Showcase** turns the Guide on from its first day (owner addition 3), so the card is visible in the demo; the words come from the fictional records.
- **Files:** `apps/web/lib/coach/{schema,store,copy,guide,summary}.ts` with their tests, `apps/web/components/coach/{use-guide.ts,guide-card.tsx,guide-settings.tsx,guide.css}`, the Today wiring in `components/for-you/today-for-you.tsx`, the review's `guideNote`, `apps/web/tests/guide.spec.ts`.
