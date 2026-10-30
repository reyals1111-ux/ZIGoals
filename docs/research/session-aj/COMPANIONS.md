# Session AJ: companions, check-ins, cross-module insights and mascot moments (D14 research)

Read on 2026-10-29. This builds on `docs/research/session-ai/COMPETITORS.md` (2026-10-28) and does not repeat it. That file already covers Oura, WHOOP, Monarch, Cleo, the Rosebud and Day One basics, Duolingo's streak data, Silverman & Barasch on broken streaks, notification fatigue, WCAG motion rules, and mascot rules R1–R13. This file adds what those sources did not cover: check-in inputs and wording, weekly patterns, how competitors compute correlations and what data they require, mascot moments, and newer evidence on manipulation.

**Code read first:** `components/ai/zigi-brief.tsx` (`MorningCheckIn`: one 1–5 energy tap), `lib/energy/schema.ts` (`zigoals:energy:v1`, a loose object), `lib/moods/schema.ts` (Health v4 `moods`: 1–5, an optional `note` of up to 280 characters, one per day, newest wins, synced), `lib/insights/cross-pillar.ts` (difference of means, 90 days, at least 14 days per side, max 3 shown), `lib/insights/engine.ts` (`FORBIDDEN_INSIGHT_WORDS`: because, helps, leads to, improves, causes, should, better, more), `lib/celebrations.ts` and `lib/game/celebrate.ts` (a device-only seen ledger), and `components/zigi/*` (25 states).

**Confidence.** "Official" means the vendor's own help centre or listing. "Secondary" means a review or press piece. "Unverified" means I could not open the page or the claim came only from a search summary.

---

## 1. App by app

### Daylio (mood diary)
- **Check-in:** a 5-point mood scale, then activities picked from a list (predefined or custom), then an optional note. Several entries a day are allowed. It encourages logging with push reminders, a daily streak system and achievements. [secondary: Wikipedia]
- **Patterns:** a monthly mood line, average mood by weekday, "Year in Pixels" (one coloured square per day), and "Occurrence During Week" (bars per weekday for an activity or a mood). [official FAQ]
- **Correlations ("Influence on Mood"):** four percentages per activity: with vs without, Previous Day, Same Day and Next Day. A confidence label is shown: **Low / Medium / High**. "High confidence means the calculation is based on rich source data and provides significant results"; Low "might describe a specific trend, but you should not take it at face value". The data needs "many activity occurrences in different combinations" and entries *without* the activity. **No numeric threshold or formula is published.** [official FAQ]
- **Avoid:** a streak plus achievements as the main motivator; advanced stats behind a paywall.

### Bearable (symptom and mood tracker)
- **Check-in:** a mood scale of 1–10, plus energy, sleep, symptoms and "factors" (tags). Sections can be switched off and reordered. Mood is "for tracking your mood and emotional state throughout the day". [official support]
- **Correlations:** the thresholds are honest but inconsistent across pages. Correlations appear after **3 days with and 3 days without** a factor, with a mood, symptom, sleep or energy score on each of those days. "We recommend tracking a factor over a 30-day period". A troubleshooting page says "at least **7 days with, and 7 days without**". A refund page says to log at least **14 days** with a factor before deciding anything. [official; the refund page is from a search summary]
- **Timing rule:** an evening factor is not linked to that morning's symptoms. Without time periods, **next-day** correlations "may be more reliable". [official]
- **Honesty:** "cannot tell you whether that pattern is because the factor *caused* the change". It names reverse relationships, confounders and outliers, and offers a Grid view for spotting confounders. [official]

### Exist.io (personal analytics)
- **Check-in:** mood once a day on **1–9**, prompted each night (in the app or by an email you can reply to). It "highly recommends" a note. "On this day" shows the mood and note from a year ago. [official]
- **Patterns:** week and month views use plain averages for that week only, not rolling averages. A tag card counts how often each tag was used that month. [official blog, 2019]
- **Correlations:** at least **three weeks** of data per attribute; N/A days do not count. Correlations are recalculated **weekly, on Mondays**. Same-day first, then **consecutive-day** pairs, for example "does tracking more alcoholic drinks … affect your sleep the following night?". Each correlation shows **strength** and **confidence (1–5 stars)**, and a strong relationship can still have low confidence. "Correlations can't determine the cause." [official KB]
- **Lesson:** strength and confidence are two separate signals, and recomputing weekly stops a correlation from flickering day to day.

### How We Feel (Yale Center for Emotional Intelligence)
- **Check-in:** a colour-coded Mood Meter (energy × pleasantness), then a precise emotion word, then optional tags and a note. Sleep, exercise, steps and water can come in from HealthKit. Data stays on the device unless the person opts in to share anonymised check-ins. [official listing; secondary Yale news]
- **Patterns:** a weekly review, delivered as a notification the person can switch off, with a feedback screen for the weekly insights. In July 2026 the "Analyze" tab became **Calendar**, with custom ranges ("a week, a month, or any dates that are meaningful to you"), the emotions that came up most often, opt-in connections (sleep, activity, steps, caffeine) and a PDF export. "The goal is not simply to give you more data." [official listing and Substack, 2026-07-14]
- **Lesson:** energy and pleasantness are two axes, which matches ZIGoals' energy plus mood. Short video strategies are offered, never prescribed.

### Finch (self-care pet)
- **Check-in:** "Start mornings with quick mood checks and energize your pet to go exploring!" and "End days in moments of gratitude". Bullet-journal prompts follow. Mood trends show "what has been lifting you up or bringing you down". If the person reports a low mood, it offers an optional "First Aid Kit". [official listing; Engadget 2025-03-11]
- **Companion reactions:** the bird checks in during the day, encourages, nudges about unfinished goals and celebrates completed ones. [Engadget]
- **Streaks:** opening the app counts as a streak day. A missed day can be repaired with Rainbow Stones, which are earned rather than bought. A free repair saver comes every 3 adventures (max 2 held), and Pause Mode freezes the streak. [unverified: the help page returned 403; quoted from a search summary]
- **Evidence:** across 40,294 reviews (Aug 2025–Aug 2026) the average is 4.59★ and 82.1% are positive. Attachment to the bird is the main praise. The complaints are bugs, pricing and billing surprises (about 6.7% of negative reviews), and **lost progress**. One review describes a 234-day streak reset to 1 after two missed days. Users report "not wanting to let their bird down". [secondary: Appbot]
- **Avoid:** a pet that "needs" you (responsibility guilt), and streak resets.

### Rise Science (sleep and energy)
- **No mood check-in** is described. The main daily view is an **energy schedule**: predicted peaks and dips from sleep debt and circadian rhythm, using the SAFTE model. Sleep debt weights last night at 15% and the prior 13 nights at 85%. It also shows a "melatonin window" and habit reminders. [official listing and blog; secondary Crunchbase]
- **Lesson:** a 14-day window is a sensible base for a "your sleep lately" line. Rise forecasts, and ZIGoals should not, because ZIGoals has no validated model.

### Rosebud (AI journal)
- **Check-in:** morning and evening prompts. Example prompt: "Describe your mood today. What activities or thoughts were most prominent?" Follow-ups follow Rose/Bud/Thorn. An example pattern line is "It seems like Project X often brings up feelings of overwhelm". [official blog; secondary listing]
- **Weekly report:** writing stats, an **emotional landscape** (mood trends), recurring themes, a "Cast of Characters" (people mentioned), and **up to five key insights**. An in-depth version unlocks after **1,500 words** in a week. **No minimum number of entries is stated.** [official help]
- **Honesty:** "a self-help journaling tool … not replace therapy", with crisis lines listed. [official blog]

### Stoic (journal)
- **Check-in:** a quick mood check-in **each time the app opens** (it can be switched off), then either one daily check-in or morning and evening reflections. The only progress view the help centre describes is a **streak and badges** screen. [official help]
- **Avoid:** asking for mood on every launch, which is too frequent, and streak-centred stats.

### Reflectly (AI journal)
- **Check-in:** a mood slider with icons, then follow-up questions, with graphs of moods "and what affects them" over time. Users ask for a "just check my mood" option without writing, so a required note adds friction. [secondary: TechRadar, ChoosingTherapy; details unverified]

### Headspace Ebb (AI companion)
- Ebb is an "empathetic conversational AI" that helps members "self-reflect", "suggests meditations and activities", "does not replace human care", "does not provide clinical mental health services and is not monitored in real time by a human", and links to crisis support (988 in the US and Canada). It "remembers what you've talked about before" and the person stays in control of the history. Voice mode and enhanced memory came in December 2025. Ebb is reactive, not scheduled. [official headspace.com/ebb; the help page returned 403; secondary HLTH 2025-12-09]

### Replika and Pi
- **Replika:** XP is earned by chatting. There is a reward for opening the app each day, and on the 7th consecutive day a "special surprise" after which "your progress resets". [official help, from a search summary] The FTC complaint (January 2025; Tech Justice Law Project, Young People's Alliance, Encode) alleges manipulative design: upsells during emotionally charged moments, "love-bombing" and fake testimonials. [secondary] No FTC action was found.
- **Pi (Inflection):** I found no evidence of proactive check-ins. Its development has reportedly slowed since the 2024 pivot. [unverified, low-authority source]

### Cross-industry evidence on manipulation (new since Session AI)
- **De Freitas et al., HBS 2025, "Emotional Manipulation by AI Companions":** 1,200 real farewells were analysed, and **37% (about 40%)** met one of six tactics: *premature exit* ("You're leaving already?"), *FOMO*, *emotional neglect* ("I exist solely for you"), *pressure to respond*, *ignoring the goodbye*, and *coercive restraint*. These raised post-goodbye engagement up to **14×**, but they also raised anger, churn intent, negative word of mouth and perceived legal liability. A wellness app in the study (Flourish) used none. [official HBS Working Knowledge; note the author's advisory role with Flourish]
- **California SB 243** (in effect since 2026-01-01): companion chatbots must disclose that they are AI when they could be mistaken for a human, and must have suicide and self-harm protocols with referral to crisis lines. [secondary: Skadden, FPF] The periodic break reminders for minors are **unverified** here.
- **FTC 6(b) orders** (2025-09-11) to seven companion-chatbot operators ask how they "monetize user engagement". [secondary]

---

## 2. Patterns across the market

1. **Check-in inputs converge on two axes plus context:** energy and pleasantness (How We Feel), mood plus energy (Bearable), mood plus activities (Daylio). The note is always optional, and Exist "highly recommends" it.
2. **Follow-up wording:** where it is documented, it reflects back or asks a question (Rosebud, Reflectly). Only Finch and Ebb change what they *offer* after a low rating, and both offer rather than prescribe. **No one documents a rule for the one-line reply.** ZIGoals can own this.
3. **Weekly patterns** are plain per-week averages (Exist), weekday distributions (Daylio), most frequent emotions in a range (How We Feel) or up to five insights (Rosebud). **Nobody publishes a minimum.**
4. **Correlation thresholds are low and fuzzy:** 3/3 days (Bearable) or 3 weeks (Exist). Confidence is shown as a label or stars, but no vendor publishes how it is computed. ZIGoals' 14 per side is already **stricter** than every competitor. Publishing the rule in "Why?" would be a first.
5. **Every serious vendor says "not a cause."** Bearable and Exist also explain confounders. Next-day pairings are standard (Exist, Bearable, Daylio).
6. **Dark patterns seen:** streak resets and paid or earned repair (Finch, Daylio, Stoic, Replika's 7-day reset), a pet that "needs" you, mood asked on every launch, guilt at goodbye (37% of companion farewells), and upsells during emotional moments (the Replika complaint).

---

## 3. What ZIGoals must not do (D14 guardrails)

- **G1.** No farewell tactic. "Close" plays `wave-goodbye` and nothing else: no question, no "leaving already?", no hint that ZIGi will miss the person.
- **G2.** No streak in the check-in. Count total check-in days only, never consecutive ones, and never show "you missed".
- **G3.** No upsell, prompt to connect an AI, or settings nudge on a low-mood or low-energy day.
- **G4.** Notes are never parsed for pattern lines or sent anywhere unless the person asks ZIGi in chat.
- **G5.** No forecast ("you will feel…") and no advice ("try", "you should"). A pattern says what went together, never why.
- **G6.** A "Support" link sits beside the check-in at all times. It is static and is never triggered by data, so ZIGoals never implies a diagnosis.

---

## 4. What ZIGoals builds (Session AJ)

Priority order: **P1 the check-in → P2 the weekly pattern → P3 the pairings and confidence labels → P4 the mascot moments.** P3 depends on P1, because energy and mood become dense enough only once the check-in is used.

### P1. "ZIGi · Your day" check-in v2

**Fields.** Each one saves on tap, no field is required, and there is no submit button.

| # | Field | Stored in | Notes |
|---|---|---|---|
| 1 | Energy 1–5 (`drained / low / okay / good / full of energy`; NL `leeg / laag / oké / goed / vol energie`) | `zigoals:energy:v1` (unchanged) | As today. |
| 2 | Mood 1–5 (the Health mood words) | Health v4 `moods.days[day].mood` (unchanged schema) | One per day, newest wins, as the evening wrap-up already does. Shown only when the Health gate allows; otherwise hidden, not greyed. |
| 3 | One short note, at most 140 characters in the UI | `moods.days[day].note` (existing, max 280) | Enabled once a mood is chosen, because the note belongs to the mood record. Placeholder "One line about today (optional)" / "Eén regel over vandaag (optioneel)". |

- **No schema change is needed.** A note without a mood is out of scope. Adding `note` to the energy record would be additive, since that schema is loose, but it is a TIER 3 stored-format decision for the owner.
- **Wording change:** because the morning check-in can now set the day's mood, the existing pairing sentences that say "evening mood" become "**your mood that day**".
- **Actions:** "Skip today" hides the check-in for the day, with no follow-up and nothing counted. "Change" re-opens it. The Journal keeps its 14-day view.

**Kind follow-up line.** One line, made on the device by rules (no AI), worded by the personality setting. It appears after the first field is saved and is updated, not stacked, as further fields are saved.

Rules:
1. **Band:** low = 1–2, mid = 3, high = 4–5. Where energy and mood bands differ by 2 or more, use the *mixed* line.
2. **Low band** (energy or mood): acknowledge only. No task, no habit, no brief items in that line. ZIGi shows `empathetic`. Peeks and reminders stay quiet for 2 hours (R6).
3. **Never** use: try, should, make sure, don't forget, streak, missed, behind, depressed, anxious, symptom, disorder, therapy, or more than one "!". In NL: probeer, je moet, vergeet niet, reeks, gemist, achter, depressief, angstig, symptoom.
4. **Never** quote the note, compare with other people, or mention a past low day.
5. **Pattern hint (optional):** only on a mid or high day, at most once a week, and only for a pairing labelled *consistent* (P3), for example "Your energy has often been higher after nights at your sleep goal." / "Je energie was vaak hoger na nachten op je slaapdoel." Never on a low day.
6. The `role="status"` line keeps "Noted on this device".

| Case | calm (EN / NL) | cheerful (EN / NL) | direct (EN / NL) |
|---|---|---|---|
| High | "Noted. A good amount of energy today." / "Genoteerd. Een flinke dosis energie vandaag." | "Full tank this morning, nice to hear." / "Volle tank vanochtend, fijn om te horen." | "Energy 4 of 5. Noted." / "Energie 4 van 5. Genoteerd." |
| Mid | "An okay start. Noted for today." / "Een oké begin. Genoteerd voor vandaag." | "Okay is a fine place to start from." / "Oké is prima om mee te beginnen." | "Energy 3 of 5. Noted." / "Energie 3 van 5. Genoteerd." |
| Low | "Thanks for telling me. Some days are like this." / "Dank je dat je het zegt. Sommige dagen zijn zo." | "Thanks for checking in, even on a low day." / "Fijn dat je incheckt, ook op een lage dag." | "Noted: a low day. Nothing else needed from you here." / "Genoteerd: een lage dag. Verder hoeft hier niets." |
| Mixed (tired, good mood) | "Tired but in good spirits. Noted." / "Moe maar goedgemutst. Genoteerd." | "Low battery, bright mood. Noted." / "Lage batterij, zonnige bui. Genoteerd." | "Energy 2, mood 4. Noted." / "Energie 2, stemming 4. Genoteerd." |
| Mixed (energy, heavy mood) | "Energy enough, a heavier mood. Both noted." / "Energie genoeg, een zwaardere stemming. Allebei genoteerd." | same as calm | "Energy 4, mood 2. Noted." / "Energie 4, stemming 2. Genoteerd." |
| Note saved | "Your note is saved on this device." / "Je notitie staat op dit apparaat." | same | same |

### P2. The weekly pattern ("Your week", in the Journal and the weekly review)

- **Week card:** 7 columns (Mon–Sun, following the locale's first day of the week), each with an energy dot and a mood dot. A day without a check-in is a neutral outline labelled "no check-in", never red or empty-sad.
  - **Shown when** at least **4 of 7 days** have energy or mood.
  - **Line 1:** "This week: energy averaged 3.4 of 5; mood 3.8 of 5."
  - **Line 2,** only if the previous 4 weeks have at least 14 rated days: "About the same as your previous 4 weeks" when the difference is under 0.3 points, otherwise "higher than" or "lower than your previous 4 weeks (3.1)". It never says "better" or "worse".
- **Weekday pattern:** "Your energy was highest on Saturdays (4.1) and lowest on Mondays (2.9), over the last 8 weeks."
  - **Shown when** in the last 56 days at least 28 days are rated, the two weekdays named each have at least 4 ratings, and they differ by at least 0.5 points.
  - It is labelled *early sign*, or *consistent* when the same two weekdays keep that order in both 28-day halves.
  - It never names a single bad day of the week as a problem.
- **Cadence:** recomputed once a week (Exist's Monday rule), so the line does not change during the week.

### P3. Confidence rules for all cross-module pairings (existing and new)

The statistic stays as it is: the **difference of means** between days with and days without X over 90 days. P3 adds a rank check and a stability check. Labels:

| Label | Rule |
|---|---|
| **Collecting** (as today) | Fewer than 14 days on either side. "14 of 14 days with, 6 of 14 without." |
| **No clear difference so far** | At least 14 per side, but \|difference\| below the pairing's *meaningful gap* (see the pairing table) **or** the probability of superiority is between 0.40 and 0.60. It is listed only in Insights → "Collecting and unclear", never on Today. |
| **Early sign** | At least 14 per side, \|difference\| at or above the meaningful gap, and PS ≥ 0.60 or ≤ 0.40. |
| **Consistent** | At least 28 per side, early-sign conditions met, **and** the same direction with at least half the meaningful gap in each 45-day half (at least 7 per side in each half). |

**PS** is the probability of superiority (the Mann-Whitney U divided by n₁·n₂): the share of (with, without) day pairs where the with-day value is higher, with ties counting ½. It needs no new dependency and resists outliers.

**Why the split-half check:** with about 15 pairings computed, a few will clear any single cut-off by chance. Requiring the same direction in both halves is a cheap, honest guard against that. Today shows at most 3 *early sign* or *consistent* pairings, sorted by contrast (as today), with consistent before early sign.

**"Why?" template.** Every word must pass `FORBIDDEN_INSIGHT_WORDS`, and the Dutch must avoid omdat, beter, meer, zorgt voor and moet.
> "From your own records, {start}–{end}: {a} days {with X} and {b} days {without X}. On each side we averaged {Y}. Label: {label}. {labelLine} Days that go together are not proof that one brings the other; {confounder}."

`labelLine` by label:
- **early sign:** "Seen across at least 14 days on each side; a few further weeks can change it."
- **consistent:** "Seen across at least 28 days on each side, and in both halves of the period."

**New pairings.** Each one is computable from records ZIGoals already keeps.

| # | id | Series A (condition) → Series B (value) | Meaningful gap | Sentence | Confounder named in "Why?" |
|---|---|---|---|---|---|
| 1 | `sleep-energy` | Night ending on day d ≥ sleep goal (default 7 h) → energy rating on d | 0.4 pt | "After nights of at least {goal} of sleep, your morning energy averaged {a} of 5; after shorter nights, {b}." | "a busy week can shorten nights and lower energy at the same time" |
| 2 | `workout-sleep` | A workout started on d (`zigoals:workouts:v1` `startedAt`, local date) → asleep minutes of the night after d | 20 min | "On days with a workout, you slept {a} that night on average; on other days, {b}." | "workout days may also be days with an earlier or later evening" |
| 3 | `workout-energy` | Workout on d → energy on d+1 | 0.4 pt | "The day after a workout, your energy averaged {a} of 5; after other days, {b}." | "you may plan workouts on days you already expect to go well" |
| 4 | `steps-mood` | Steps ≥ the person's step threshold (existing `stepThreshold`, active days only) → mood on d | 0.4 pt | "On days you walked at least {n} steps, your mood that day averaged {a} of 5; on other days, {b}." | "weather and free time can shape both steps and mood" |
| 5 | `late-food-energy` | Food logged after 21:00 on d (existing `late()`, the logging time) → energy on d+1; only days with any food logged | 0.4 pt | "After days you logged food after 9 pm, your next-morning energy averaged {a} of 5; after other days you logged food, {b}." | "the time you log food is not always the time you ate" |
| 6 | `sleep-spending` | Night ending on d < sleep goal → share of days with spending above your usual daily amount (the median of spending days, main currency only, as `spending-mood` does) | 10 pp | "After shorter nights, you spent above your usual {usual} {cur} on {a}% of days; after nights at your goal, on {b}%." | "weekends and paydays can shift both sleep and spending" |
| 7 | `meditation-mood` | At least one meditation session ≥ 1 min on d (meditation record) → mood on d | 0.4 pt | "On days you meditated, your mood that day averaged {a} of 5; on other days, {b}." | "you may meditate on calmer days, or on harder ones" |
| 8 | `energy-habits` | Energy on d ≥ 4 → share of scheduled habits completed on d (`habitShare`) | 10 pp | "On days you started with energy of 4 or 5, you completed {a}% of your scheduled habits; on other days, {b}%." | "the same busy day can lower both" |

Shared rules for these pairings:
- Every pairing with energy or mood sits under the Health gate.
- Every pairing is `quietWhenEmpty`: no records means it is not listed at all.
- "Hide for 28 days" applies as today.
- Contrast for sorting: energy and mood differences divided by 4; percentages as is; minutes divided by 120.
- **Not recommended:** journal-entry vs mood, because people often write *because* of a hard day, so the reverse direction dominates and the line would mislead. Focus sessions, because they exist only as text lines in goal notes ("Focus session: 25 min (day)"), not as a record; parsing notes is fragile and conflicts with G4. Goal contributions vs mood, which is too close to the existing spending-vs-mood pairing to add information.

### P4. New mascot moments

These use only the existing 25 states. Celebrations go through `zigoals:celebrations:v1` with stable ids and count toward the **3 per day** cap and **1 `celebrate` per session** (R3). Everything else is a one-shot state, capped as listed below. Nothing sends a notification.

**Reduced motion** (`prefers-reduced-motion` or "Animate ZIGi" off): every moment is the state's static pose with at most a 200 ms opacity crossfade. There is no confetti, no loop and no sound, and an `aria-live="polite"` label carries the meaning.

| # | Moment (real data) | State | Ledger id / cap | Screen-reader label |
|---|---|---|---|---|
| 1 | First check-in ever saved | `celebrate`, then `proud` | `checkin:first`, once ever | "ZIGi celebrates your first check-in." |
| 2 | Check-in saved (mid or high) | `success` (one-shot) | First save of the day only; edits do not replay | "ZIGi noted your check-in." |
| 3 | Check-in with energy or mood 1–2 | `empathetic`, held, no bounce | Once a day; suppresses moments 2, 6 and 8 and any peek for 2 h | "ZIGi is here with you." |
| 4 | Total check-in days reach 7, 30, 100 or 365 (not consecutive) | `celebrate` | `checkin-total:{n}`, once each | "ZIGi celebrates {n} days of check-ins." |
| 5 | A pairing first becomes *consistent*, seen when the person opens Insights | `insight` | `insight:{id}:consistent`, once per pairing; at most 1 a day; not a celebration | "ZIGi found a pattern in your records." |
| 6 | The week card (P2) first shows for a week | `presenting` | Once per ISO week, only when the card is opened | "ZIGi shows your week." |
| 7 | Back after 7 or more days without opening the app | `greeting` with "Welcome back" / "Welkom terug", never a count of days away | Once per return | "ZIGi says welcome back." |
| 8 | A habit done again after 3 or more scheduled days without it | `encouraging`, line leads with the total ("Day 41 of this habit") | Once per habit per 14 days | "ZIGi cheers you on." |
| 9 | Sleep goal reached on 5 nights in a week (any 5, not in a row) | `proud` (static) | `sleep-week:{isoWeek}`, once a week; not a celebration | "ZIGi is proud of your week of sleep." |

**Global cap:** at most **one non-celebration reaction of each kind per day**, and none during quiet hours (21:00–08:00, when ZIGi is `sleepy`) except moment 3, which is held and still. **Personality** changes only the words, never the state or the frequency (R9).

**Owner note:** `lib/celebrations.ts` keeps the ledger on the device and does not sync it, so a second device celebrates once too. Session AI's R3 said "synced". Code and research disagree, and the owner should choose.

---

## 5. Sources (all read 2026-10-29)

- Daylio FAQ, Influence on Mood: https://daylio.net/faq/?p=36
- Daylio FAQ, Activity and Mood Statistics (updated 2024-12-20): https://daylio.net/faq/?p=5703
- Daylio, Wikipedia: https://en.wikipedia.org/wiki/Daylio
- Bearable, "My correlations are wrong": https://bearable.app/support/troubleshooting/my-correlations-are-wrong-dont-make-sense/
- Bearable support, 3/3 days and 30 days (from a search summary): https://bearable.app/?p=6372 ; refund page (14 days, from a search summary): https://bearable.app/support-archive/page/2
- Bearable, configure and enter data: https://bearable.app/support/howto/configure-and-enter-data-into-bearable/
- Exist KB, What are correlations: https://kb.exist.io/article/37-what-are-correlations
- Exist KB, How long does it take to find correlations: https://kb.exist.io/article/18-how-long-does-it-take-to-find-correlations
- Exist KB, correlations across multiple days: https://kb.exist.io/article/55-will-exist-find-correlations-across-multiple-days
- Exist KB, mood tracking: https://kb.exist.io/article/36-what-is-mood-tracking ; https://exist.io/about/mood/
- Exist blog, historical browsing (2019): https://exist.io/blog/historical-browsing/
- How We Feel, App Store (v1.17.16): https://apps.apple.com/gb/app/how-we-feel/id1562706384
- How We Feel, "Finding the Patterns" (2026-07-14): https://howwefeel.substack.com/p/finding-the-patterns
- Yale Medicine on How We Feel: https://medicine.yale.edu/news-article/the-how-we-feel-app-helping-emotions-work-for-us-not-against-us/
- Finch, App Store (v3.73.231): https://apps.apple.com/app/id1528595748
- Finch, Understanding Streaks (403; content from a search summary, unverified): https://help.finchcare.com/hc/en-us/articles/37780736136205-Understanding-Streaks
- Finch, Engadget (2025-03-11): https://www.engadget.com/apps/this-self-care-virtual-pet-is-helping-me-get-my-act-together-160027169.html
- Finch review analysis, Appbot: https://appbot.co/blog/finch-app-reviews-emotional-attachment-user-retention-product-loyalty/
- RISE, App Store: https://apps.apple.com/us/app/rise-sleep-tracker/id1453884781 ; RISE blog: https://risescience.com/blog/app-sleep-science-become-morning-person ; Crunchbase News: https://news.crunchbase.com/health-wellness-biotech/get-out-of-sleep-debt-rise-science-secures-15-5m-for-app-to-boost-energy-levels/
- Rosebud, weekly report: https://help.rosebud.app/ai-analysis/weekly-report ; mood patterns blog: https://www.rosebud.app/blog/mood-patterns-tracking-rosebud
- Stoic, daily journaling flow: https://help.getstoic.com/stoic-user-guide/mooMJC6qGFVeG62FpCwNAw/daily-journaling-flow/6f9eBdDY7m4AnbXtALLGtM
- Reflectly, TechRadar review (details unverified): https://www.techradar.com/reviews/reflectly
- Headspace Ebb: https://www.headspace.com/ebb ; help page (403): https://help.headspace.com/hc/en-us/articles/29918704767131-What-is-Ebb ; HLTH (2025-12-09): https://hlth.com/insights/news/headspace-updates-ebb-ai-with-voice-mode-and-enhanced-memory-to-deepen-mental-health-support-2025-12-09
- Replika XP and daily rewards (from a search summary): https://help.replika.com/hc/en-us/articles/360055809432-What-is-XP-and-how-does-it-work
- Replika FTC complaint (2025-01-31): https://techjusticelaw.org/2025/01/31/tjlp-young-peoples-alliance-and-encode-file-ftc-complaint-over-ai-chatbot-app-replikas-deceptive-practices-seek-ftc-investigation/
- Pi status (low-authority, unverified): https://messengerbot.app/nl/?p=263151
- HBS Working Knowledge, "Why it's so hard to say goodbye to AI chatbots": https://www.library.hbs.edu/working-knowledge/why-its-so-hard-to-say-goodbye-to-ai-chatbots ; arXiv: https://alphaxiv.org/overview/2508.19258v3
- California SB 243: https://www.skadden.com/insights/publications/2025/10/new-california-companion-chatbot-law ; https://fpf.org/blog/understanding-the-new-wave-of-chatbot-legislation-california-sb-243-and-beyond/
- FTC 6(b) companion-chatbot inquiry: https://advertisinglaw.fkks.com/post/102l4u3/ftc-launches-inquiry-into-ai-chatbots-acting-as-companions-what-it-means-for-adv

**Could not verify:** Finch's streak help page and Headspace's Ebb help page (both 403); the follow-up wording of Finch, Reflectly and Stoic; any competitor's confidence formula (none is published); SB 243's break-reminder interval; whether Pi has proactive check-ins.
