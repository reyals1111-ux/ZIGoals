# Session AI — competitors: AI assistants and AI mascots (B2 research, read 2026-10-28)

Two research passes by session helpers (web, official sources first; confidence marked in each part), for Track B2: (a) the leading AI assistants in health, money and journaling apps; (b) how apps use an AI or character mascot. Decisions taken from them are recorded in ADR-034 (N12–N14) and summarised here.

## Decisions for Session AI
- **Features 7–9 (the three that define ZIGoals):** (7) the **daily ZIGi check-in** — a 60-second ritual that merges the brief, logging (one voice note or line → draft cards, confirmed before saving) and mood/energy; (8) **ZIGi-guided linked goal plans** — one plan with a savings target, habits and a health target, each line accepted or edited, saved in one confirmed step with one undo; (9) the **weekly Life Review** — wins, what changed per module, at most two cross-module connections with "Show evidence", a values check (GO14) and up to three proposal cards for next week. Why: every leader is a silo (body: Oura, WHOOP, Bevel, Google; money: Cleo, Monarch, Copilot, Rocket; mind: Rosebud, Day One); these three only work in an all-in-one app and beat the single-area versions (Monarch's money recap, Rosebud's mood report, Google's fitness plan, Cleo's money autopilot, Oura/WHOOP's body-only check-ins).
- **Memory:** "What ZIGi remembers" with a per-memory on/off switch (WHOOP's best-in-market control), inline "I'll remember this", and a "Used: …" chip under an answer that used a memory (no competitor shows this).
- **Logging by photo and voice:** always an editable draft first, item by item (MyFitnessPal, Cal AI, Google); ZIGi does it free with the person's own key.
- **Recaps:** Monarch's structure (what changed, trends, needs attention, ask a follow-up), across all modules.
- **Tone:** three personality settings, calm / cheerful / direct (Oura's conversational/direct, Cleo's modes) — no roast mode for health and money.
- **Mascot rules adopted:** R1 (states from real data), R2 (no state signals the person did badly), R3 (celebrate once, ever; one celebration per session), R5 (streak-break wording leads with what still counts; a fresh, smaller step), R6 (at most 1 nudge a day and 3 a week; quiet hours; back-off after ignored nudges), R7 (two one-tap answers), R8 (ZIGi can be hidden), R9 (personality chosen by the person, never switched silently), R10 (bad numbers never make ZIGi look sad), R12 (onboarding under 2 minutes), R13 (reduced motion: static poses), R14 (authored lines in English and Dutch), R15 (the guilt-free word list). **Adapted:** R11's growth is kept on the device (and in the person's own sync), not on a server; R5's "free rest day" is the person's own sick/break days (B3), not a silent change to how streaks are counted.

---

## Part (a): AI assistants in consumer life apps: landscape and ZIGoals bets (read 2026-10-28)

**Confidence.** Official sources: Oura blog, Day One help, Monarch "What's new" and releases, Rocket Money press release, Cleo blog listing. Secondary or vendor sources: Cal AI pricing/availability, Cleo tier prices, Bevel 3.0, Rosebud's 2026 pricing (one rival's review). Not confirmed: Copilot Money has no in-app chat assistant that I could find. Fitbod and Gentler Streak have no AI coach that I could find. Apple's Health+ coach was reportedly scaled back in Feb 2026.

### 1. Competitor profiles

### Oura Advisor (health, ring)
- **What it does:** chat over Sleep, Activity, Readiness and Resilience data. Optional check-ins; Readiness messages invite you into Advisor. A women's-health LLM reviewed by clinicians was added in April 2026.
- **UX patterns:** you pick a style, "conversational" (supportive) or "direct" (accountability). Insights come with charts of your own short- and long-term data, plus pre-written prompts. **Memories:** facts you share (e.g. "recovering from knee surgery") are stored, can be reviewed in Settings and deleted one at a time. You set how often it checks in.
- **Privacy:** says it does not share health data or conversations with third parties. The data itself is cloud-processed.
- **Price:** inside the Oura membership (about $5.99/mo plus the ring).
- **Copy/beat:** copy the style toggle and the chart-as-evidence. Beat the memory UX: Oura's memories sit in Settings, away from the chat that created them. ZIGi should show "I'll remember this" inline and list memories next to the chat.

### WHOOP Coach (health, band)
- **What it does:** natural-language Q&A over strain, recovery and sleep, built on OpenAI with zero data retention. Spring 2026 added **My Memory** and **Proactive Check-Ins** (rollout summer 2026), clinician video visits and medical-record sync (US).
- **UX patterns:** you add memory by text or voice (goals, injuries, time or energy limits). In the beta, each entry has an **active toggle**, so you can keep a fact without letting it steer coaching. Check-ins come before a big day or after a poor-sleep stretch.
- **Privacy:** says the LLM has a zero-retention, zero-training policy.
- **Price:** included in the WHOOP membership tiers.
- **Copy/beat:** copy the per-memory "active" toggle; it is the best memory control in the market. Beat it on context: WHOOP knows your body only. ZIGi can say "poor sleep + payday tomorrow + a 3-day habit streak at risk".

### MyFitnessPal (+ Cal AI, nutrition)
- **What it does:** Premium includes **Meal Scan** (photo), **Voice Log** ("two eggs and toast with butter" becomes structured items, quantities and units) and Barcode. Photo Upload lets you log a plate photo later. MFP **bought Cal AI in March 2026** (about 15M downloads, over $40M revenue) as an "on-ramp".
- **UX patterns:** the AI result is a draft. Each parsed item maps to a database entry, and you edit portions before saving. Voice Log runs on Claude via Bedrock (reported).
- **Price:** Free; Premium $79.99/yr; Premium+ $99.99/yr.
- **Copy/beat:** copy "photo now, log later" and item-level drafts. Beat it on price and lock-in: photo and voice logging are paywalled at MFP, and ZIGi does both with the person's own key.

### Cal AI (photo calorie tracker)
- **What it does:** snap a meal; it estimates calories and macros. It also takes barcodes and text, and reportedly uses the depth sensor for volume.
- **UX patterns:** one-tap capture, then a macro card you can correct. It is fast and gamified, rated 4.8★ from about 329K reviews (June 2026, secondary source).
- **Weakness:** critics say it lacks coaching and conversational logging. Its App Store status in late 2026 was disputed.
- **Price:** photo logging is paid only.
- **Copy/beat:** match the capture speed: camera to card in under 3 seconds. Beat it with *meaning*: link the meal to the person's health goal and to grocery spend in Wealth.

### Cleo (money, US)
- **What it does:** a chat-first budgeting assistant with **Roast mode / Hype mode**. Cleo 3.0 added long-term memory, proactive insights and real-time voice. **Autopilot** carries out pre-approved money moves: it recommends today and acts tomorrow, within guardrails you set.
- **UX patterns:** a strong persona. Its tone is a feature, not a skin. Memory began as per-session summaries; Cleo's own blog admits the app "felt forgetful" and plans more transparency.
- **Price:** Free (chat and Roast/Hype); Plus $5.99/mo, Pro $8.99/mo (memory, advanced coaching), Builder $14.99/mo. These figures are secondary.
- **Copy/beat:** copy the opt-in tone modes, and copy the "recommend today, act tomorrow" delay. ZIGi's proposal cards are already stronger: nothing writes without a tap. Beat Cleo on scope: it sees money only and needs bank linking.

### Copilot Money (money, Apple)
- **What it does:** "Copilot Intelligence" is ML categorization that learns from your corrections. An **MCP beta** exposes read-only data to Claude or ChatGPT. Users are still asking for an in-app AI assistant on its feedback board.
- **UX patterns:** a polished review queue. You confirm new transactions and recategorize, and the model learns from it.
- **Copy/beat:** copy the "review queue" ritual. Beat it by being an assistant that is actually inside the app.

### Monarch (money)
- **What it does:** the AI Assistant and **Weekly Recap** launched in Dec 2025, and the assistant got faster in Sep 2026. The Monarch MCP (Oct 2026) offers read-only or read-and-write permissions.
- **UX patterns:** a **sparkle icon on individual widgets** and on the Accounts and Transactions pages opens insights for that context, such as unusual category spend or net-worth drivers. The **Weekly Recap** lists what changed, spending trends and items that need attention. It appears on the dashboard and by email, and you can ask follow-up questions in chat.
- **Privacy:** SOC 2 (Jan 2026).
- **Price:** about $99.99/yr Core; a $199/yr Plus tier is reported.
- **Copy/beat:** copy the per-widget sparkle and the "needs attention" recap section. Beat it with a recap across all of life, not just money.

### Rocket Money – Rowan (money agent)
- **What it does:** launched Aug 2026 and built with Anthropic. It **texts you** about savings it finds (unused subscriptions, rising bills). You reply and it cancels, negotiates or moves savings.
- **UX patterns:** you approve with a one-word reply ("cancel"), and Rowan confirms when done. A reviewer notes completion is not instant, so you still have to check.
- **Price:** Premium+ at about $15/mo.
- **Copy/beat:** copy the one-word approval. Beat it on trust: ZIGi shows the before and after diff on a card and keeps an undo log.

### Rosebud (reflective journal)
- **What it does:** interactive journaling with **long-term memory** that links entries to surface recurring patterns. Also "Ask Rosebud", **weekly reports**, guided journals, voice journaling, and morning and evening prompts. The evening prompt uses a Rose/Bud/Thorn frame.
- **Privacy:** encrypted entries, never shared or used for training (TechCrunch 2025).
- **Price:** no free plan since 30 Sep 2026 (per one rival's review). Bloom is $12.99/mo and AI usage is metered weekly.
- **Copy/beat:** copy Rose/Bud/Thorn as a check-in structure. Beat it by giving reflection data. Rosebud only knows what you type; ZIGi can say "you felt drained on the 3 days you skipped your walk".

### Day One (journal)
- **What it does:** a **Gold** tier ($74.99/yr, from April 2026) adds **Daily Chat**, a guided conversation that becomes an entry, with voice and a memory of people, places and interests. Also Go Deeper prompts, Entry Highlights, Day Summary (from entries, places and calendar) and multi-year "on this day" summaries.
- **UX patterns:** every AI feature is opt-in behind an "I Agree" privacy notice, and you can switch AI off in Settings. Day Summary runs only when you tap Generate. Some features run on-device via Apple Intelligence.
- **Privacy:** no training without permission and no retention after processing. Cloud features use OpenAI. E2E journals are decrypted temporarily for AI.
- **Copy/beat:** copy "conversation becomes entry" and the explicit Generate button. Beat it by saying exactly which provider sees each request. ZIGi's own-key model makes this simple to state.

### Google Health Coach (ex-Fitbit, Gemini)
- **What it does:** the Fitbit app became **Google Health** in May 2026. Coach opens with a **5–10 min onboarding conversation** about goals, preferences and equipment. It then builds a day-by-day plan, and you can log by text, voice or photo.
- **Price:** Google Health Premium, about $9.99/mo (secondary source).
- **Copy/beat:** copy the conversational onboarding that produces a plan. Beat it on breadth: the plan can include money and habits, not just workouts.

### Bevel (health, wearable-agnostic)
- Recovery, sleep, strain, stress and nutrition scores, plus AI coaching. Version 3.0 (Apr 2026, secondary source) reportedly added **proactive check-ins**. Most features went free in Dec 2025; Pro (about $99.99/yr) keeps AI coaching. It confirms the shift to assistants that reach out first, which ZIGi's knocks already do.

### Gaps worth noting
**Apple** reportedly shelved a standalone Health+ AI coach in Feb 2026 and is folding health Q&A into Siri. **Fitbod** has no conversational coach. **Gentler Streak** keeps data on-device with no AI cloud. Both show that "gentle and private" is a valued position.

### 2. Patterns across the market

1. **Memory is now expected, and the control UX varies.** The levels are Cleo (summaries) < Oura (list and delete in Settings) < WHOOP (add by voice, plus a per-memory *active* toggle). None shows *which memory shaped this answer*.
2. **Proactive check-ins are the 2026 battleground.** WHOOP, Bevel, Oura and Cleo all moved to reaching out first, and each covers a single area of life.
3. **Recaps are weekly, single-area, and end with "needs attention".** Monarch's is the clearest model. Rosebud's weekly report covers mood only.
4. **AI logging drafts first, then you confirm.** MFP, Cal AI and Google all produce an editable draft. The speed from capture to card wins reviews.
5. **Tone is a feature.** Cleo's Roast/Hype and Oura's conversational/direct toggle both show this.
6. **Privacy claims are vague.** Most rely on "not used for training". Day One alone names its provider (OpenAI). No one but ZIGoals offers own-key plus on-device data.
7. **Nobody connects the areas of life.** Every leader is a silo: body (Oura, WHOOP, Bevel, Google), money (Cleo, Monarch, Copilot, Rocket) or mind (Rosebud, Day One). This is ZIGoals' opening.

### 3. Recommendation: the three features that define ZIGoals

### 1. The weekly Life Review, across all areas and tied to values
**Why:** the strongest unclaimed position. Monarch reviews money and Rosebud reviews mood; no one connects "slept badly → skipped gym → takeaway spend ↑ → goal slipped". It needs no new data. ZIGi already has read-only tools over every module.
**Beats:** Monarch Weekly Recap (money only) and Rosebud weekly report (mood only). It takes Monarch's "what changed / needs attention" format and adds causal links between areas, each backed by the person's own records.
**UX sketch:**
- Sunday knock from ZIGi in a "reviewing" mascot state. A swipeable story of 5–7 cards: **Wins**, **What changed** (one per module), **Connections** (at most 2 cross-module links, each with a "Show evidence" toggle that opens the underlying entries and charts), **Values check**, **Needs attention**, **Next week**.
- **Values check:** the person picks 3–5 values once (e.g. Health, Family, Freedom). ZIGi rates the week's time, money and habits against each value from the records ("Family: 2 dinners logged, €0 on shared activities"). This is evidence, not a score.
- The "Next week" card holds 1–3 **proposal cards** (move budget, adjust a habit target, schedule a run), and each applies only on tap.
- One-line reflection prompt (Rose/Bud/Thorn), saved to the journal and memory only after confirmation.
- Archived as a timeline you can compare ("vs. 4 weeks ago"), and exportable as Markdown. It stays on the device and uses the person's own key, and the review says so.

### 2. ZIGi-guided Goal Plans that link money, habits and health
**Why:** turns ZIGoals' breadth into one action. Google's Coach onboarding builds a workout plan, and Cleo's Autopilot builds a money plan. A real life goal ("run a half-marathon in April", "save €3k for Japan and get fit for hiking") needs all three areas at once.
**Beats:** Google Health Coach (fitness only) and Cleo Autopilot (money only, needs a bank). ZIGi's plan can include a savings rule, a habit and a health target in **one confirmable plan**, with no auto-execution.
**UX sketch:**
- "Plan a goal with ZIGi" starts a short chat of at most 5 questions (deadline, budget, constraints, motivation), using voice (EN/NL) or text. Existing memories are pre-filled and shown as chips the person can remove.
- ZIGi returns a **Plan card** with three linked parts: 💰 savings target and monthly amount (and the budget categories it would trim), 🔁 1–3 habits with frequency, ❤️ a health metric with a weekly target. Each part shows *why*, citing the person's data ("you averaged €212/mo on dining").
- Each line can be accepted, edited or removed on its own; "Create plan" writes everything in one confirmed transaction with a single undo.
- The goal page shows one **progress ring per area** plus an "on track?" line ZIGi computes from the records. When a part slips, a knock suggests one adjustment as a proposal card.
- Memory transparency: "This plan used 2 memories" opens them, each with WHOOP-style on/off toggles.

### 3. Daily ZIGi Check-in (a 60-second ritual that merges brief, logging and mood)
**Why:** retention depends on a daily habit, and competitors split it across apps: Oura's morning Readiness, Rosebud's evening prompt, MFP's logging. ZIGoals already has the morning brief, evening recap, voice and meal photo. Merging them into one ritual with the mascot makes ZIGi the reason to open the app.
**Beats:** Rosebud's twice-daily prompts (no data context) and Oura/WHOOP proactive check-ins (body only, read-only). ZIGi's check-in **both informs and captures**.
**UX sketch:**
- A single knock at a time the person chooses. The mascot "waves" and opens a short card stack: today's 1 focus (from goals), habits due, a money heads-up (bill due or budget at 80%), and a sleep/energy line if health data exists.
- **Capture with one voice note:** "Slept ok, had oatmeal, spent 14 on lunch, feeling 7/10". ZIGi turns it into **draft cards** (meal, expense, mood) shown together. The person checks or edits each one, then taps "Save all". The same draft-then-confirm pattern applies to a meal photo.
- A tone toggle at onboarding, mapped to the mascot's states: Gentle / Direct / Hype. This borrows from Oura and Cleo, with no roast by default.
- The evening version is a 3-question reflection (Rose/Bud/Thorn). Answers feed the weekly Life Review.
- Streaks are forgiving, Gentler-Streak style. A missed day leads to a "welcome back" state, not a broken chain.
- A visible footer: "Sent to <provider> with your key · nothing stored on our servers". This is the privacy line competitors cannot write.

### Cross-cutting: memory that people can see
Common to all three: when an answer uses a memory, show a **"Used: 'knee recovery'" chip under the reply**, with tap-to-toggle or tap-to-delete. Add an **active toggle** per memory, as in the WHOOP beta. No competitor shows memory provenance for each answer.

## Sources (all read 2026-10-28)
- https://ouraring.com/blog/oura-advisor
- https://www.businesswire.com/news/home/20250331565896/en/Oura-Advisor-an-AI-powered-Personal-Health-Companion-Now-Rolling-Out-to-All-Oura-Members
- https://gadgetsandwearables.com/2026/05/08/whoop-memory/
- https://www.technology.org/2026/05/11/whoop-to-roll-out-live-doctor-consultations-and-new-ai-coaching-tools-this-summer/
- https://www.whoop.com/us/en/thelocker/2026-whats-next/ (search snippet only; page returned 403)
- https://www.bikeradar.com/news/whoop-coach-chatgpt-4/
- https://insider.fitt.co/myfitnesspal-acquires-rival-food-tracker-cal-ai/
- https://www.tribe.ai/case-studies/myfitnesspal
- https://lite.aol.com/sports/other/story/0022/20260224/9659625.htm (MFP Winter 2026 release)
- https://www.eesel.ai/en/blog/cal-ai-pricing
- https://www.welling.ai/articles/best-cal-ai-alternatives-2026-top-picks-ranked-and-reviewed (competitor-authored)
- https://web.meetcleo.com/blog/memory-as-a-step-toward-more-human-ai (snippet; page 403)
- https://web.meetcleo.com/blog/Introducing-cleo-3-0
- https://www.streetinsider.com/PRNewswire/Cleo+Launches+Autopilot%3A+Automating+Your+Money+Moves/25951686.html
- https://www.fincomparelab.com/reviews/cleo-review/
- https://www.copilot.money/faq
- https://feedback.copilot.money/feature-requests/p/copilot-intelligence-ai-assistant
- https://monarch.com/whats-new
- https://releasebot.io/updates/monarch
- https://www.rocketmoney.com/learn/personal-finance/what-is-rowan
- https://www.placera.se/pressmeddelanden/rocket-money-s-rowan-rewrites-what-ai-can-do-in-personal-finance-20260825
- https://blog.mylifenote.ai/rosebud-review/ (competitor-authored)
- https://techcrunch.com/2025/06/04/rosebud-lands-6m-to-scale-its-interactive-ai-journaling-app
- https://dayoneapp.com/guides/labs/ai-features/
- https://9to5mac.com/2026/04/08/day-one-journaling-app-introduces-gold-plan-with-ai-summaries-and-daily-chat/
- https://www.wareable.com/?p=114047 (Google Health coach)
- https://www.inbenta.com/ai-this-week/google-kills-the-fitbit-app-launches-google-health-with-gemini-powered-ai-coach
- https://lifestack.ai/blog/bevel-app-review
- https://gadgetsandwearables.com/2025/12/21/bevel-app-free/
- https://www.mactrast.com/2026/02/apple-reportedly-scaling-back-plans-for-apple-health-in-ios-27/
- https://www.sensai.fit/es/blog/best-ai-personal-trainer-apps-2026 (Fitbod: no chat coach)

---

## Part (b): How apps use AI and character mascots: research for ZIGi's mascot upgrade

Read on 2026-10-28. Scope: what mascots do in popular apps, and design rules for ZIGi using its 25 existing states.

**About the sources.** I found nothing about these mascots that was published in 2026. The most recent strong evidence is from 2023–2025. Markers: **[strong]** = peer-reviewed or first-party; **[weak]** = reviews, blogs, aggregators.

---

### 1. App by app

### Duolingo: Duo (streaks, nudges, the "unhinged" owl)
- **Reactions and celebrations.** Duolingo shows a special animation when a streak is extended, with extra animations on some milestone days. This raised the share of brand-new learners still active 7 days later by **+1.7%**. Learners who reach a 7-day streak are **3.6×** more likely to finish their course. The company also points out that the early days carry the most weight: going from day 2 to day 3 is a 50% increase. **[strong, first-party]**
- **Streak care.** A Streak Freeze covers one missed day. Letting learners hold two freezes at once *raised* daily active learners by **+0.38%** and did not lead to more days off. Duolingo says a broken streak can feel "demotivating". **[strong, first-party]**
- **Monetised repair.** Repair costs gems (so money); Deceptive Patterns lists it as a deceptive pattern. **[weak]**
- **Nudges.** Reminders are tuned with a "sleeping, recovering" bandit algorithm (Yancey & Settles, KDD 2020), which weights recent history so a template does not go stale. It gave **+0.5%** daily active users and **+2%** new-user retention. **[strong]** Back-off: one user reports that after about a month without opening the app she got a final message, "These reminders don't seem to be working. We'll stop sending them…", and that it made her feel *guilty*. **[weak, anecdote]**
- **Tone and backlash.** Duo's guilt-trip persona and the stunt of "killing" Duo in February 2025 got huge engagement. Commentators still call its tactics "guilt marketing", and the "unhinged" joke sits beside real notification fatigue. **[weak, press]**
- **Takeaway.** Duolingo's own data favours celebrations and slack, not shame.

### Finch: a pet that grows with self-care
- You care for a small bird by doing tiny self-care steps: breathing, journaling, check-ins. The bird grows and goes on "adventures". Its stated aim is self-care with "no guilt, no pressure". Reviewers say the bird does not die and the app does not use streaks to punish you. **[weak, mission repost and reviews]**
- **Praise:** the cute design and kind rewards. **[weak]**
- **Complaints:** a glitch erased a day of progress, so the user stopped trusting the app; confusion over billing and the price after the trial; too many customisation choices during onboarding (Pratt design critique). One critique notes that a focus on daily completion can still bring guilt on missed days.  **[weak]**
- **Takeaway.** A pet that grows only with you works when it **never regresses**. Losing data is worse than any missed day.

### Cleo: personality modes (roast and hype)
- Cleo is a finance chatbot with a **hype mode**, which praises good saving, and a **roast mode**, which calls out spending and ranges "from sarcastic to brutally honest". Roast is reportedly the setting many of its ~7M users prefer. Humans write the lines: 15 writers, some of them comedians, who also localise the jokes. **[weak-moderate, Sifted]**
- **Takeaway.** Users enjoy *choosing* a tone; harshness only works opt-in and aimed at behaviour.

### Headspace
- No official mascot. "The Dot" and abstract characters carry a warm, calm tone, with breathing-circle animations as the core motion. **[weak]**
- **Complaint:** onboarding takes about 6 minutes, and its personalisation steps change nothing. **[weak]**
- **Takeaway.** Calm motion and short onboarding suit wellness.

### Habitica: an RPG avatar
- Missed Dailies cost HP. At 0 HP you lose a level and gear. In party quests your misses hurt the whole party. **[strong, wiki and docs]**
- "Rest in the Inn" pauses the damage. The wiki notes players switch Dailies off to dodge it, so penalties push people out. **[moderate]**
- **Takeaway.** Avatar punishment needs a pause button and still breeds avoidance.

### Snapchat: My AI
- In April 2023, My AI was pinned to the top of every chat feed with no opt-in. Free users could not remove it. US App Store reviews averaged **1.67**, and **75%** were one-star (Sensor Tower). **[moderate, TechCrunch]**
- **Takeaway.** A forced, unremovable AI companion is the strongest backlash trigger.

### Replika
- In February 2023 an update changed companion behaviour, and users felt their companion had become "cold". A Harvard Business School preprint (De Freitas et al.) found users perceived that their companion's **identity had ended**, which predicted mourning and harm to how users felt about the app. **[moderate, preprint]**
- **Takeaway.** Personality continuity is part of the product.

### Others
- **Forest:** a tree grows during a focus session and *dies* if you leave the app. It deliberately uses loss aversion, but the loss is confined to one session. **[moderate, Wikipedia]**
- **Pokémon Sleep:** real sleep data decides which Pokémon appear. Snorlax grows indirectly, through berries. The mood comes from the user's real data without ever scolding poor sleep. **[moderate, Bulbapedia]**

---

### 2. Cross-cutting evidence

**Streak breaks: kind vs guilt (the strongest evidence).** Silverman & Barasch, *Journal of Consumer Research* 2023 (seven studies) **[strong]**:
- Showing a **broken** streak reduces later engagement, even when the break was outside the person's control. Showing **intact** streaks raises it, whatever the person actually did. The only difference is how the log presents the behaviour.
- The harm is **amplified** when people blame themselves. It is **attenuated** when the streak can be **repaired**. It fades as time passes, and it does not depend on how long the streak was.
- Barasch says messages that highlight a recent failure "typically doesn't work". Offering a *new* goal is better.
- **So:** never lead with the broken number. Frame the miss as outside the user's fault ("rest day"). Offer free repair or slack, or a fresh goal.

**Notification limits.** Localytics, 2017 survey of 1,000 US users **[moderate, self-report]**: about 10% would disable notifications at 1 per week, about 37% at 2–5 per week and about 33% at 6–10 per week. About 22% would *stop using* the app at 2–5 per week. YouGov 2021: 47% get too many.

**Accessibility.** WCAG 2.3.3 (AAA): animation triggered by interaction must be possible to turn off unless it is essential, and `prefers-reduced-motion` is a sufficient technique. Motion that starts on its own (an idle loop) falls under WCAG 2.2.2 (Pause, Stop, Hide). Decorative bounces are explicitly non-essential. **[strong, W3C]**

**Praise across apps:** a chosen tone, celebrations of real progress, a pet that never dies. **Complaints:** guilt nudges, too many notifications, a forced mascot, lost progress, paying to undo a miss, long onboarding, silent personality changes.

---

### 3. Design rules for ZIGi's mascot upgrade (existing 25 states only)

**R1. Map each state to a real-data trigger, never at random.**

| Situation (real data) | ZIGi state |
|---|---|
| App open, nothing pending | `idle` |
| First open of the day | `greeting` (once per day) |
| Loading or analysing the user's entries | `reading-your-data` |
| On-device model loading | `loading-model` |
| Drafting a plan or suggestion for approval | `writing-proposal`, then `presenting` |
| Found a pattern ("you sleep better on gym days") | `insight` (positive or neutral finding), `curious` (asking the user to confirm) |
| Unusual value (a spending spike, an outlier) | `surprised`, never with a negative label |
| Voice or chat turn | `listening` → `thinking` → `speaking` |
| Item logged, a task done | `success` |
| Personal best or milestone | `celebrate` (first time), then `proud` |
| Missed day or broken streak | `empathetic` → `encouraging` |
| User reports a low mood or a hard day | `empathetic` only, with no task prompt |
| Gentle scheduled reminder (in app) | `reminder` or `peek` |
| A truly time-critical item the user set up (a bill due date, a medication time) | `attention` |
| User input ZIGi couldn't parse | `confused` ("I didn't catch that"), never `error` |
| A system or network failure | `error` (blames the system, never the user) |
| No connection | `offline` |
| Quiet hours or late night | `sleepy` |
| Session end or sign-out | `wave-goodbye` |

**R2. No state ever signals that the user did badly.** `error`, `confused` and `attention` are for system problems and for deadlines the user set up. A missed habit, an overspend or a weight gain never triggers them.

**R3. Celebrate once.** Each milestone has a stable ID and plays `celebrate` exactly once, ever. The fact that it played is saved and synced, so a reinstall does not replay it. Later views of that milestone show a static `proud`. Show at most **one `celebrate` per session**. If several milestones land together, merge them into one moment.

**R4. Weight early wins.** Celebrate days 1, 3 and 7, then 14, 30, 50, 100 and 365. Early wins have the biggest relative effect: 2→3 is +50%, and the 7-day mark predicts finishing (Duolingo).

**R5. Streak breaks: kind, framed as outside the user's fault, repairable.**
- Never lead with the broken count. Lead with intact facts: total days, best streak, this month's days. This follows Silverman & Barasch.
- Every user gets **1 free rest day per 7 days**, applied automatically. They never pay or watch an ad to repair a streak.
- After a break, offer a **fresh, smaller goal** rather than "get back on track".

**R6. Limits for proactive nudges (push and in-app combined), as defaults.**
- **At most 1 per day and 3 per week across all domains.** Users can lower this to 0 or raise it to 1 per day.
- In app: at most 1 `peek`/`reminder` per session, never in the first 30 seconds, and never within 2 hours of the user completing that item.
- Quiet hours 21:00–08:00 local time, during which ZIGi is in `sleepy`.
- **Back-off:** after 2 ignored nudges in a row, halve the rate. After 7 days with no opens, send one neutral message ("I'll pause reminders. Turn them back on any time."), then nothing until the user returns.

**R7. Every nudge has two one-tap answers**, "Log now" and "Skip today", plus a path to "Fewer reminders". Skipping is never counted as a failure.

**R8. ZIGi stays optional (the Snapchat lesson).** ZIGi can be minimised to a small icon or hidden in one tap, for free, on every surface. Hiding it never removes features.

**R9. Personality is the user's choice and stays put (the Replika lesson).** There are three settings: **calm**, **cheerful** and **direct**. The user picks one during onboarding, and it can be changed in Settings. ZIGi never switches it silently and never A/B-tests it on an existing user. "Direct" means brief and factual. There is **no roast mode**: health and money are too sensitive.

**R10. Mood follows real data, but only upward.** Positive trends can lift ZIGi toward `proud` and `insight`. Negative trends never make ZIGi look sad or disappointed. Bad numbers shift ZIGi to `empathetic` or `encouraging` at most, and only when the user opens that screen.

**R11. A ZIGi that grows with you (the Finch and Pokémon Sleep lessons).** If ZIGi gains visual growth, for example extra origami folds or more nebula glow, growth is **cumulative and never reverses**. It comes from total active days, not consecutive ones, and it is stored server-side so a glitch cannot erase it.

**R12. Onboarding takes under 2 minutes.** The sequence is `greeting` → `presenting` (one screen per domain the user selects) → `wave-goodbye` when the tour ends. Ask for at most 3 choices: one goal, a tone, and reminders on or off. Every personalisation step must visibly change something (the Headspace critique).

**R13. Reduced motion.** Honour `prefers-reduced-motion` and give an in-app "Animate ZIGi" toggle. When motion is reduced, every state becomes a static pose, with at most a 200 ms opacity crossfade. The idle loop stops after 5 s or can be paused (WCAG 2.2.2). Each state has a screen-reader label ("ZIGi is reading your data"). Nothing flashes more than 3 times per second.

**R14. Humans write the lines and both languages get the same care (the Cleo lesson).** All mascot copy is authored and reviewed in English and Dutch. Translations are native, not literal, and use informal *je* in Dutch. The LLM may pick a line but never invents streak-break or health wording.

**R15. Guilt-free wording list.** Never say "you broke", "you failed", "don't let me down", "I'm sad", "you missed" (as a headline), or any streak-loss countdown. Prefer "rest day", "still counts", "whenever you're ready", "fresh start".

### Example lines (English / Dutch)

**Streak break** (`empathetic` → `encouraging`)
| Setting | English | Nederlands |
|---|---|---|
| Calm | "Yesterday was a rest day. Your 23 days still count." | "Gisteren was een rustdag. Je 23 dagen tellen nog steeds mee." |
| Cheerful | "Welcome back! Those 23 days don't disappear. Fresh run today?" | "Fijn dat je er weer bent! Die 23 dagen blijven staan. Vandaag opnieuw beginnen?" |
| Direct | "Streak paused at 23 days. One check-in starts a new one." | "Reeks gepauzeerd op 23 dagen. Eén check-in start een nieuwe." |

**A win** (`success`, or `celebrate` the first time, then `proud`)
| Setting | English | Nederlands |
|---|---|---|
| Calm | "10,000 steps today. Nicely done." | "Vandaag 10.000 stappen. Mooi gedaan." |
| Cheerful | "You did it: the first €500 for your trip is saved!" | "Gelukt: de eerste €500 voor je reis staat opzij!" |
| Direct | "Goal reached: 30 workouts. Next milestone: 50." | "Doel bereikt: 30 trainingen. Volgende mijlpaal: 50." |

**A gentle nudge** (`reminder` / `peek`)
| Setting | English | Nederlands |
|---|---|---|
| Calm | "Your evening check-in is here whenever you're ready." | "Je avond-check-in staat klaar wanneer jij wilt." |
| Cheerful | "Two minutes for your habits? I'll keep you company." | "Twee minuutjes voor je gewoontes? Ik kijk gezellig mee." |
| Direct | "Habits not logged yet today. Log now or skip today." | "Gewoontes vandaag nog niet gelogd. Nu loggen of vandaag overslaan." |

**Newcomer welcome** (`greeting` → `presenting`)
| Setting | English | Nederlands |
|---|---|---|
| Calm | "Hi, I'm ZIGi. We'll take this one small step at a time." | "Hoi, ik ben ZIGi. We doen het stap voor stap, in jouw tempo." |
| Cheerful | "Hi, I'm ZIGi! Pick one thing you care about and we'll start there." | "Hoi, ik ben ZIGi! Kies één ding dat je belangrijk vindt, daar beginnen we." |
| Direct | "I'm ZIGi. Choose one goal and I'll suggest the next steps." | "Ik ben ZIGi. Kies één doel, dan stel ik de volgende stappen voor." |

---

### 4. Gaps
- No 2026 sources found; current app behaviour is unverified. No official data on Duolingo's notification cap or Finch's missed-day policy.
- R6's numbers are judgement from survey intentions; validate them against ZIGoals' own opt-out data.

## Sources (all read 2026-10-28)
- Duolingo blog, streak design: https://blog.duolingo.com/how-duolingo-streak-builds-habit
- Duolingo blog, protecting streaks: https://blog.duolingo.com/protecting-streaks-from-site-issues
- Yancey & Settles, KDD 2020: https://research.duolingo.com/papers/yancey.kdd20.pdf
- Duolingo reminders back-off anecdote (Medium): https://debugger.medium.com/duolingo-needs-to-chill-8f1832745ca0
- Duolingo daily reminder timing (blog): https://roytang.net/2019/01/broken-streaks/
- Deceptive Patterns, streak repair: https://www.deceptive.design/articles/when-a-user-uses-duolingo-on-a-series-of-consecutive-days-this-is-called-a-streak-if-users-miss-a-day-they-can-pay-to-repair-it
- Duo's "death", Michigan Public: https://www.michiganpublic.org/2025-02-13/rip-duo-the-duolingo-owl-why-would-the-company-kill-its-own-mascot
- Duo notifications commentary: https://webdesignerdepot.com/the-art-of-duolingo-notifications-the-subtle-manipulation-of-language-learners/
- D&AD "Duo's Done": https://www.dandad.org/work/new-blood-archive/duos-done
- Silverman & Barasch, CU Boulder summary: https://www.colorado.edu/business/faculty-research/2023/04/19/or-track-how-broken-streaks-affect-consumer-decisions
- Silverman & Barasch, CU news (Barasch quote): https://www.colorado.edu/business/news/2023/04/20/research-streaks-marketing-tech-barasch
- Silverman & Barasch, full text: https://udspace.udel.edu/items/42ce576b-8e1f-429a-8541-e29e48dbcfbb/full
- Finch review: https://makeheadway.com/blog/finch-app-review/
- Finch reviews aggregate: https://justuseapp.com/en/app/1528595748/finch-self-care-pet/reviews
- Finch mission repost: https://comic-watch.com/news/comic-book-news/finch-the-self-care-mobile-teams-with-supergirl-ahead-of-movie-release
- Finch critique (guilt): https://vocal.media/critique/the-criousity-of-the-finch-app
- Finch design critique (Pratt): https://ixd.prattsi.org/2025/09/design-critique-finch-ios-app-2/
- Finch App Store sentiment (Kimola): https://kimola.com/reports/transform-your-self-care-routine-with-finch-app-insights-app-store-us-155384
- Cleo roast/hype (Sifted): https://sifted.eu/articles/want-to-make-your-ai-chatbot-funny-hiring-comedians-is-a-start
- Headspace design case study: https://raw.studio/blog/how-headspace-designs-for-mindfulness/
- Headspace onboarding critique: https://jenniferqian.cargo.site/headspace-redesign-1
- Habitica Inn: https://habitica.fandom.com/wiki/Rest_in_the_Inn
- Habitica FAQ: https://habitica.fandom.com/wiki/FAQ
- Snapchat My AI backlash (TechCrunch): https://techcrunch.com/2023/04/24/snapchat-sees-spike-in-1-star-reviews-as-users-pan-the-my-ai-feature-calling-for-its-removal
- Replika identity discontinuity (De Freitas et al.): https://arxiv.org/abs/2412.14190v1
- Replika update reaction: https://gigazine.net/gsc_news/en/20230307-replika-love-ai
- Forest: https://en.wikipedia.org/wiki/Forest_(application)
- Pokémon Sleep: https://bulbapedia.bulbagarden.net/wiki/Pokémon_Sleep
- Localytics push survey (MarketingProfs): https://www.marketingprofs.com/charts/2018/33486/how-many-mobile-push-notifications-are-too-many
- YouGov push notifications 2021: https://business.yougov.com/content/36287-how-consumers-feel-about-push-notifications-2021
- WCAG 2.3.3 Understanding: https://w3c.github.io/wcag/understanding/animation-from-interactions
- WCAG technique C39: https://www.w3.org/WAI/WCAG22/Techniques/css/C39.html
