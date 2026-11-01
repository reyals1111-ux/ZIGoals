# First-run experience review (Session AK, P4 · FIRST_RUN_REVIEW)

Reviewer: a fresh read-only agent that built none of ZIGoals, playing a brand-new person who has never heard of crypto. Date: 1 Nov 2026.
Build: the production server on 127.0.0.1:3101 (branch `feature/session-ak-number-one`, head `50b71ba2` when the review began; HEAD moved to `e4a5b1c9` during it, and other lanes had uncommitted work in the tree, so some lines below may already be changing).
Method: Playwright, full Chromium, `/api/**` answered 503, a new empty browser context for every journey, under the browser lock. Widths: 390×844 (touch) and 1440×900, in Nebula.
- The local model was mocked with `page.route`: an Ollama on `127.0.0.1:11434` (`/api/version`, `/api/tags` with `llama3.2:3b` and `qwen3:8b`, `/api/show`, and a streamed NDJSON `/api/chat`) and an LM Studio on `:1234` (`/v1/models`, a streamed `/v1/chat/completions`), both with CORS for the app's origin.
- Scripts and 35 screenshots: the session scratchpad, `p4/`.

PROTECTED, not up for redesign: the swan intro (logo fold), the Today hero and slogan, the Checklist and its celebrations, the nav bars and the ZIGi look. Every fix below changes copy, defaults, order, folding or state, never those surfaces.

Not repeated here: findings already in [RELEASE_REVIEW_2.md](RELEASE_REVIEW_2.md) and [NOVA_DESIGN_REVIEW.md](NOVA_DESIGN_REVIEW.md). Where the first run runs into one of them, it is listed under "Covered elsewhere", with what the first run needs from that fix.

| Severity | Count |
|---|---|
| Major | 6 |
| Minor | 13 |
| Polish | 4 |

---

## The first ten minutes, minute by minute

Times are from the first navigation to `/app`. "Auto" times are the script's. A person reading the screens takes several times longer, so the minute marks show the pace a real person would have.

**0:00–0:15. The swan.** The page is interactive at 0.4 s.
- At 0.7 s the fold starts in the logo: the sidebar Z at 1440, the top-bar Z at 390. It runs for 11.8 s (`currentTime` 11.7 at 12.9 s) and settles cleanly into the Z.
- At 1440 it is lovely and easy to see: the swan folds in the sidebar while the hero's slogan settles.
- At 390 it plays in a ~36 px top-bar logo while the eye is on the big hero. Most people will miss it (owner's call; PROTECTED).
- The first words a desktop newcomer reads, above the hero, are **"PUBLIC ALPHA · Staking and votes sign in your own wallet (practice or real, your choice). Nothing else moves, and ZIGoals never holds keys."** On the phone this folds to "PUBLIC ALPHA · More". → FR-6.
- The hero itself ends in "Onchain · ZIGChain vision · Alpha simulation." That is a crypto word on the very first screen, but it belongs to the PROTECTED hero (R28 waits for the owner).

**0:15–0:30. The welcome card.** It is in the page from about 1.5 s.
- At 1440 it sits right under the hero: "Set up your first goal and habit in about a minute. No wallet or account needed." Clear and inviting.
- At 390 only its eyebrow and half its heading peek above the tab bar (y ≈ 720 of 844), under the floating ZIGi button. The first thumb-reachable actions are the hero's "Quick add" and "See how it works", not "Start setup". → FR-16.

**0:30–2:30. The welcome, 8 steps.** It took 11 s auto; a reader needs about 2 minutes.
- **Step 1** has a warm ZIGi introduction, four pillar tiles and three promises ("Private by design", "No ads, no trackers", "No crypto needed. The blockchain stays out of sight…"). On the phone, "Let's begin" is three screens down, and the ZIGi button covers the "= Wealth" tile. → FR-18, FR-19, FR-23.
- **Steps 2–3** ("What do you want to improve?" then "Two or three things to focus on") read well. Crypto is an optional Extra (R2-6 and R2-12 are fixed and hold).
- **Step 4** is the first snag. Ticking the focus "Save for something" pre-picks a goal ("A safety net", named "Emergency fund") with an empty target. "Continue" then does nothing visible. The only sign is grey body text above the buttons, "Add a target amount, or choose No goal for now.", and focus stays on the button. I pressed Continue ten times before noticing. → FR-7.
- The same focus adds a daily habit called just **"Contribute"**. → FR-8.
- **Step 8**'s "When you finish" summary is excellent: it lists exactly what will be created.

**2:30–3:00. Finish.** About 3 s to a reload of Today.
- The page looks exactly as it did before setup: hero, slogan and Quick add. Nothing says "You're set".
- The goal and the two habits begin below the fold. The PROTECTED hero is unchanged, but the person gets no landing. → FR-4.
- Further down, the weekly "Your coach · Log a weight or two…" card appears, although the person did not choose Health and Health is no longer in the nav. → FR-15.

**3:00–4:30. A first goal by hand** (Goals → "+ Create a goal" → "A holiday"; 6.3 s auto, about 90 s for a reader).
- Step 1 is friendly: idea tiles, a name, a target and a currency.
- **Step 2, "What counts toward this Goal?"**, defaults to "Use wealth I already have" and offers *Crypto · Stablecoins · Stocks · ETFs…*. It then says "No transaction, unstaking or delegation change. Allocation happens only when you confirm Create goal." and "Selected CoinGecko assets use automatic quotes…".
- The review step says "Allocations are private Goal accounting."
- The goal's page opens on **"VALUE GOAL · PRIVATE ALLOCATION"**, with a tab row "Goals | **Positions**" (linking to Staking), "Funding Wealth · NO PLAN" and "Link your wealth →". There is no "Goal created" word.
- For someone saving for a holiday, this is the most crypto-flavoured screen of the first ten minutes. → FR-1.

**4:30–5:00. A first habit.**
- Habits' empty state offers "+ Drink water · + Walk · + Read". One tap on "+ Walk" adds it in 1.3 s, with the toast "Walk added. Change anything about it from its card." This is the smoothest moment of the run.
- "+ New habit" opens a 20-field form instead (BUILD/QUIT/LIMIT, measurement, unit, target period, schedule grammar, auto-complete rules). Its templates include **"My ZIG plan"**. → FR-17.

**5:00–5:30. Logging it.**
- On Today, "Up next · Anytime · Walk · 0 / 8,000 steps · Complete".
- I pressed Complete. Within 400 ms the whole card disappears, the page jumps up, and a toast says "Walk: done for today. Undo".
- The first thing I ever logged vanished from the screen. → FR-3.

**5:30–7:00. NOVA, first open, no model.** The opening sequence settles in about 3.5 s.
- **390:** The orb, "STANDBY · TAP TO TALK" and **"Good morning. NOVA is online."** are followed directly by "Build NOVA's brain … a model of your own makes it a full assistant." It says "online" and "has no brain yet" in the same breath. → FR-12.
- **1440:**
  - The chips read "Brain On-device answers" and **"Sees 4 of 5 pillars · Health off"**, while the left panel lists "Your pillars · 4". → FR-13.
  - The greeting and the "Build NOVA's brain" card sit below the 900 px fold ("Start the guide" at y = 1111). → Covered elsewhere (ND-1).
- **Asking "Help me save for a holiday"** (2.5 s) and then "What can you do?" gives the same reply both times: "I answer questions about your own records right here, on this device, **without any AI**. For example: What is due today? … What is my net worth?"
  - It does not offer to create the goal, and it does not point to the guide the card above it advertises. "Without any AI" on a screen titled "Private intelligence" is confusing.
  - The provenance shows twice ("On-device answers · no AI used" and "Answered on your device · no AI used"). → FR-2, FR-21.

**7:00–10:00. "Build your own NOVA" with a (mocked) local model** (1440; about 60 s auto, about 3–4 minutes for a reader).
- **Planet 1, Meet NOVA.** It is clear and honest ("Money never moves. NOVA proposes; you confirm each card."). "I understand — check this device" lights the planet. ✔
- **Planet 2, Privacy mode.**
  - The Strict radio is already drawn as selected, yet the text says "No mode is chosen yet, so ZIGi works as it always has", and "Check the mode holds" is disabled until you press "Use Strict".
  - Strict's description repeats "Nothing goes to a cloud." twice and brings in Hermes Agent and "the redacted copy" in the second card a newcomer reads. → FR-9.
  - Once chosen, the check is the best line in the product: "Checked: it works. Strict is on. A test message to a cloud model was refused before sending…" ✔
- **Planet 3, Your brain.**
  - It opens with a paragraph about ChatGPT/Claude/Gemini/Grok subscriptions, then a memory picker that names RTX 4070/5090 cards, then `OLLAMA_NO_CLOUD=1`. → FR-14.
  - "Find models on this computer" finds Ollama (2 models) and LM Studio (1 model) in 2.6 s and names them ✔.
  - "Test connection" says "Found Ollama… 2 of 2 chat models · choose one", with Connect disabled and no hint which one. The guide had recommended `qwen3.5:9b`, which isn't installed. → FR-11.
  - After Connect (2.2 s), the success message is about the other assistant: "Connected. **ZIGi** now answers with your own AI… Open **ZIGi** from the button at the bottom right, or with ⌘K". → FR-10.
  - "Test the connection" then reads "Checked: it works. Found llama3.2:3b on Ollama… It runs on this computer." 3 of 10 planets lit ✔.
- **Planet 4, First conversation.** Its question chips open the chat "with **ZIGi's** button; press Send there." → FR-10.
- **Back on NOVA,** the chips now read "Brain Local · llama3.2:3b · Privacy Strict · Memory off". I asked "Help me save for a holiday". The reply streamed from the mock in under 4 s, labelled "via Ollama · llama3.2:3b". It's a real "it's mine" moment, but only one line of it is visible above the composer at 1440×900. → Covered elsewhere (ND-7).
- **On the phone** the brain planet defaults to "My own API key" while still badging "A model on this computer · **Recommended**". It is 2,498 px tall and ends with "In Strict, a cloud key is refused: choose Guarded or Relaxed in step 2 first", after step 2 had recommended Strict. → FR-5.

### Timing notes

| Moment | 390 | 1440 | Note |
|---|---|---|---|
| Page interactive | 0.4 s | 0.4 s | |
| Swan fold starts / ends | 0.7 s / ≈12.5 s | 0.7 s / ≈12.5 s | Calm and well paced. Easy to miss at 390 |
| Welcome card in the page | ≈1.5 s | ≈1.5 s | Below the fold at 390 (FR-16) |
| Welcome, 8 steps | 11 s auto · ≈2 min read | same | Step 4 can stall silently (FR-7) |
| Finish → Today | ≈3 s | — | No landing (FR-4) |
| Goal wizard, 4 steps | 6.3 s auto · ≈90 s read | — | Jargon in steps 2 and 4 (FR-1) |
| "+ Walk" habit | 1.3 s | — | Good |
| Complete → card gone | < 0.4 s | — | Too abrupt (FR-3) |
| NOVA opening settles | ≈3.5 s | ≈3.5 s | Card below the fold at 1440 (ND-1) |
| No-model reply | 2.5 s | 2.5 s | Generic (FR-2) |
| Local scan / test / connect | — | 2.6 s / <1 s / 2.2 s | Fast and honest |
| First streamed local reply | — | < 4 s | One line visible (ND-7) |

---

## Findings

### Major

**FR-1 · Major · Goal creation and the goal page · 390 and 1440 · fresh, chain never chosen**
- **What the person experiences:**
  - Saving for a holiday, step 2 defaults to "Use wealth I already have" and lists *Crypto, Stablecoins, Stocks, ETFs…*, with "No transaction, unstaking or delegation change" and "Selected CoinGecko assets use automatic quotes…".
  - The review step says "Allocations are private Goal accounting. Planned amounts and Habits do not count as current wealth."
  - The new goal's page reads "VALUE GOAL · PRIVATE ALLOCATION", "Funding Wealth · NO PLAN" and "Link your wealth →", with a "Positions" tab that opens Staking.
- **Why:**
  - `components/unified-goal-wizard.tsx:69` defaults `funding` to `'wealth'`; lines 211–222 show the asset picker and the CoinGecko and unstaking lines on every device. `components/platform/asset-picker.tsx:20` lists Crypto and Stablecoins second and third.
  - `lib/goal-summary.ts:66` builds the eyebrow from `type` ("Value Goal") and `source` ("Private allocation"), and `components/platform/tracked-detail.tsx:167` prints it.
  - `components/platform/common.tsx:12` `PlatformNav` always links "Positions" to `/app/staking#positions`.
- **Fix (consumer copy and defaults, no layout change):** While the chain is not chosen (the same `chain.chosen` the shell uses):
  - Default `funding` to `'future'` when the person tracks no assets.
  - Order the picker's categories Cash, Property, Stocks, ETFs, Precious metals, Custom, and leave out Crypto and Stablecoins.
  - Drop the unstaking/delegation and CoinGecko sentences.
  - Say "A plan, not a transfer: nothing moves." once on the review step.
  - Make the goal-page eyebrow plain: "Savings goal · Your own plan" (Value), "Count goal" (Units), "Project" (Project).
  - Show "No saving plan yet · Set one up →" in place of "Funding Wealth · NO PLAN".
  - Render "Positions" in `PlatformNav` only once the chain is chosen.
  - Extend `tests/consumer-first-x1.spec.ts`: create "A holiday" on a fresh device and assert that none of Crypto, CoinGecko, unstaking, delegation, Positions or "Private allocation" is visible from the wizard through the goal page.

**FR-2 · Major · NOVA and ZIGi without a model · all widths · fresh**
- **What the person experiences:** "Help me save for a holiday" and "What can you do?" both get "I answer questions about your own records right here, on this device, without any AI. For example: …net worth?". There is no way forward (no "create this goal", no link to the guide), and "without any AI" contradicts NOVA's "Private intelligence" title.
- **Why:**
  - `lib/ai/local-answers/no-model.ts:41` recognises a goal request only when the word "goal" appears (`plan|create|make|set|start|new … goal`).
  - Nothing answers "what can you do / help".
  - `lib/ai/local-answers/examples.ts:12` words the fallback as "without any AI".
- **Fix:**
  - Widen the `plan-goal` how-to to saving intents ("save for / saving for / put (money) aside / a fund for / budget for", plus Dutch "sparen voor"). Its reply includes the button to the new-goal page, prefilled with the noun when there is one ("holiday" → name "Holiday").
  - Add a `capabilities` how-to for "what can you do / help / who are you". It says in two lines what works now (questions about today, habits, goals and money on this device) and what a brain adds, with a "Build NOVA's brain" link to `/app/nova/setup`.
  - Reword `EXAMPLES_INTRO` to "Until you give me a brain, I answer from your own records on this device. For example:".
  - Golden tests in `lib/ai/local-answers/*.test.ts` and one NOVA spec at 390 and at 1440.

**FR-3 · Major · Today "Up next" after completing the only due habit · 390 and 1440 · fresh**
- **What the person experiences:** The first habit they ever complete, from Today, vanishes with its whole card within 400 ms. The page jumps up, and only a toast remains. The very first "I did it" moment reads as "it's gone".
- **Why:** `components/habits/habit-time-card.tsx:28` picks the current section with habits, or any section with `due > done`. When the only habit is in "Anytime" (not the current part of the day) and it is now done, `pick` is null and line 29 returns null.
- **Fix:**
  - Fall back to the last section that has habits today (`?? sections.find(s => s.habits.length)`), so the card stays with its done state: "1 / 1 · All done for now", the Complete button turned into "Done ✓ · Undo".
  - The first time any habit is completed on this device, add one line under it: "Your first step is logged. Day 1 of your streak." Keep it in a device record so it shows once, as text (no new motion).
  - Spec: a fresh device with one Anytime habit, completed in the morning; the card and its done state are still visible.

**FR-4 · Major · Finishing the welcome · 390 and 1440 · fresh**
- **What the person experiences:** After a minute of choices and "Finish setup", Today reloads looking exactly as it did before: the hero, the slogan and Quick add. The new goal and habits start below the fold, and nothing confirms that setup worked or says what to do next.
- **Why:** The finish handler in `components/onboarding/onboarding-flow.tsx` navigates to `/app`. The welcome card is gone (the seen flag is set), and nothing takes its place.
- **Fix (no change to the hero):**
  - Navigate to `/app?welcome=done`. Today then shows, in the welcome card's own slot, a one-time "You're set" card in the same panel style: "Your goal "Emergency fund" · 2 habits for today · Tick your first habit ↓". Its link anchors to the habit card.
  - Move focus to that card's heading, and dismiss it with ×, or by itself once a habit is ticked. Keep it once per device.
  - Spec in `tests/onboarding.spec.ts`.

**FR-5 · Major · NOVA guide on a phone: the recommended privacy mode blocks the only brain a phone can use · 390 · fresh**
- **What the person experiences:**
  - Planet 2 recommends Strict ("Only a model on this computer answers").
  - Planet 3 on the phone defaults to "My own API key" but badges "A model on this computer · Recommended", which a phone cannot run. Its footnote says "In Strict, a cloud key is refused: choose Guarded or Relaxed in step 2 first."
  - Following the recommendations in order leads straight to a refusal.
- **Why:**
  - `components/nova/setup/steps/brain.tsx` switches the default way to `'key'` on `PHONE` but keeps the static "(recommended)" label in `WAYS`.
  - `components/nova/setup/steps/privacy.tsx` recommends Strict without regard to the device.
- **Fix:** On a phone (the same `PHONE` query):
  - Privacy shows "Guarded" with the tag "Recommended on a phone", and one honest line: "Strict needs a model on a computer. On a phone, Guarded sends a redacted copy to the provider you choose."
  - The brain planet drops the Recommended badge from "A model on this computer" and shows "Needs a computer" there instead.
  - The key path's footnote becomes a one-tap "Switch to Guarded" button when the mode is Strict.
  - Spec at 390: planet 2 → planet 3 never shows a refusal on the recommended path.

**FR-6 · Major (verify) · Alpha notice at ≥ 1024 px · fresh**
- **What the person experiences:** On the build tested (3101), the desktop notice still opens every page with "Staking and votes sign in your own wallet (practice or real, your choice). Nothing else moves, and ZIGoals never holds keys." These are the first words a non-crypto person reads.
- **Why:** RELEASE_REVIEW_2 R2-7 is marked fixed (lane P2). In this checkout, the change to `components/shell/alpha-notice.tsx` and `components/shell.tsx` (`behindMore`) sits uncommitted in the working tree, and the running build predates it.
- **Fix:** Land R2-7 as written. Add a 1440 assertion to `tests/consumer-first-x1.spec.ts`: on a fresh device, the notice text contains no "Staking", "wallet" or "keys". Re-check here after the next build.

### Minor

**FR-7 · Minor · Welcome step 4 stalls silently on an empty goal target · 390 and 1440**
- **What the person experiences:** "Continue" does nothing visible. The error "Add a target amount, or choose No goal for now." is plain grey body text (rgb 164 178 205, weight 400), far from the empty field, and focus stays on Continue.
- **Why:**
  - `.field-error` has **no CSS anywhere in the app**, although six components use it (onboarding among them).
  - `checkGoal()` (`onboarding-flow.tsx:166`) sets the error but never focuses the field.
  - The "Save for something" focus pre-picks a goal kind, so the target becomes required without the person having asked for a goal.
- **Fix:**
  - Give `.field-error` a style in the design system: the danger token, weight 600, an icon, spacing under its field. That fixes all six users.
  - In `checkGoal`, focus the invalid input (`aria-invalid` is already set) and scroll it into view.
  - Keep the pre-pick, but put the goal's own suggested amount in the target as a placeholder-like starting value the person can change, or leave the goal unpicked until they choose a tile.
  - Spec: Continue with an empty target focuses the target field.

**FR-8 · Minor · The habit "Contribute" · all · fresh**
- **What the person experiences:** "Save for something" creates a daily habit called "Contribute" (category "Wellbeing", 0 / 1), with no link to the goal and no sense of "contribute what".
- **Why:**
  - `lib/onboarding-setup.ts:24` `habits: ['Contribute']`.
  - Free-title extras get `category: "Wellbeing"` and a daily schedule (`onboarding-flow.tsx:201`).
- **Fix:** Name it "Put money aside", weekly, category "Money", and link it to the goal created in the same setup (the goal id is known at finish).

**FR-9 · Minor · NOVA guide, planet 2 "Privacy mode" · all**
- **What the person experiences:**
  - Strict's radio looks chosen while the text says "No mode is chosen yet", and "Check the mode holds" is disabled until "Use Strict" is pressed.
  - Strict's text says "Nothing goes to a cloud." twice and brings in Hermes Agent and "the redacted copy".
- **Why:**
  - `steps/privacy.tsx:30` checks the radio from the local `choice`, which defaults to strict while `stored === null`.
  - The `sends` text in `lib/nova/privacy-mode.ts:14` repeats `what`.
- **Fix:**
  - Leave all radios unchecked until a mode is stored, or keep Strict pre-selected but label the button "Turn on Strict" and the line "Strict is suggested; turn it on to check it."
  - Drop the duplicate sentence.
  - Move the Hermes sentence into the existing "See what a cloud model would get" disclosure.

**FR-10 · Minor · NOVA's guide speaks about ZIGi · 1440 and 390**
- **What the person experiences:**
  - After connecting a model in "Build your own NOVA": "Connected. ZIGi now answers with your own AI… Open ZIGi from the button at the bottom right, or with ⌘K".
  - Planet 4's question chips "open in the chat with ZIGi's button; press Send there."
  - The person came to build NOVA. R2-4's one sentence explains the pair once, but these lines send them elsewhere.
- **Why:**
  - `components/ai/ai-setup.tsx:89` (the shared done message) hard-codes ZIGi.
  - `components/nova/setup/steps/first-chat.tsx:21` opens ZIGi's chat.
- **Fix:**
  - Give `AiSetup` an `assistant` prop (persona name; default "ZIGi"). The guide passes NOVA's persona: "Connected. NOVA now answers with your own model. Ask it on NOVA."
  - In planet 4, the chips open NOVA's own conversation at `/app/nova` with the question prefilled (NOVA already accepts a prefill for "Ask ZIGi here" in the command bar).

**FR-11 · Minor · Choosing the model after "Test connection" · 1440**
- **What the person experiences:** "2 of 2 chat models · choose one", with Connect disabled and no hint. The guide had just recommended a model by name that is not among them.
- **Why:** `components/ai/ai-setup.tsx` leaves `model` empty until a model button is pressed.
- **Fix:**
  - Pre-select the guide's pick when it is installed, otherwise the largest installed chat model that fits the memory chosen in planet 3, otherwise the first. Mark it "Suggested".
  - Connect is enabled at once.
  - Unit test on the choice; spec with the mock above.

**FR-12 · Minor · "NOVA is online." before NOVA has a brain · all**
- **What the person experiences:** "Good morning. NOVA is online." sits directly above "Build NOVA's brain".
- **Why:** `lib/nova/orb.ts:60` always ends the greeting with "is online."
- **Fix:** Take the brain kind into the greeting. With no brain: "Good morning. NOVA is here for simple questions." Once a brain is connected: "… NOVA is online."
- The guide's "NOVA online" badge and celebration keep their meaning.

**FR-13 · Minor · "Sees 4 of 5 pillars · Health off" · 1440**
- **What the person experiences:** The app has four pillars (the left panel says "Your pillars · 4"), so "4 of 5" reads as a bug.
- **Why:** `components/nova/status-chips.tsx:39` counts Today as a pillar (`[today, goals, habits, wealth, health]`).
- **Fix:** Say what it sees: "Sees Today, Goals, Habits, Wealth · Health off", or "Sees 3 of 4 pillars + Today · Health off". Same in the tooltip and the Permissions panel.

**FR-14 · Minor · Planet 3 "Your brain" reads like a manual · 1440; 2,498 px tall at 390**
- **What the person experiences:**
  - The first paragraph is about subscriptions they may not have.
  - The memory picker names RTX 4070, 4080, 5070 Ti and 5090 cards.
  - Step 5 is `OLLAMA_NO_CLOUD=1`, and the Gemini note goes into EEA, Switzerland and UK terms.
  - The choice itself ("A model on this computer / My own API key / …") comes after the subscription note.
- **Why:** The order and strings in `steps/brain.tsx` and `lib/nova/setup-guide.ts`.
- **Fix (order and folding only, inside ND-8's layout):**
  - Lead with the four-way choice.
  - Fold "About subscriptions" into the existing "What each subscription includes" disclosure.
  - Label memory options in plain words first ("Light laptop · 8 GB", "Most laptops · 16 GB", …), with card names in the `hint` only.
  - Put step 5 (Ollama cloud) under "For Strict privacy (optional)".
  - Fold each provider's fine print under its name.

**FR-15 · Minor · Today's "Your coach" check-in after a setup without Health · 390 and 1440**
- **What the person experiences:**
  - "Weekly check-in · Your coach · Log a weight or two and the coach can read your week. The adjustment appears once the energy estimate has two weeks of logs."
  - The person chose Goals and Habits, and Health is not in the nav. The card has no link.
  - Its chip "an estimate, not medical advice" starts lower-case and reads as a fragment.
- **Why:** `components/dashboard/today-focus.tsx:123` renders `<Slot place="today:coach"/>` unconditionally; the `CoachSlotCard` has no action without readings.
- **Fix:**
  - Render the coach slot only when the Health page is shown or a weight reading exists.
  - Give the empty state a "Log a weight →" link (`/app/health?add=weight`).
  - Capitalise the chip ("An estimate, not medical advice").

**FR-16 · Minor · The welcome is below the fold on a brand-new phone · 390**
- **What the person experiences:** Only the welcome card's eyebrow peeks above the tab bar, under the floating ZIGi button. The visible actions are the hero's Quick add and "See how it works".
- **Why:** The PROTECTED hero fills the first screen, and the welcome card follows it.
- **Fix (no hero change):**
  - On a brand-new phone (the same condition that shows `WelcomeCard`), add a slim one-line bar fixed above the tab bar: "Set up in a minute · Start ›", plus ×.
  - It leaves when the welcome is answered or the card itself scrolls into view.
  - It uses the existing glass/panel tokens and no new motion.

**FR-17 · Minor · "+ New habit" is a power form, with a ZIG template · 390**
- **What the person experiences:** A 20-field form (habit type BUILD/QUIT/LIMIT, measurement, unit, target period, schedule grammar, reminder, auto-complete source). Its template list includes "My ZIG plan".
- **Why:** The habit editor shows every field by default. Chain templates are not filtered in plain mode.
- **Fix:**
  - Show Title, Time of day and Schedule first. Put the rest under "More options" (measurement, target, reminder, auto-complete), keeping their defaults.
  - Filter chain templates ("My ZIG plan") until the chain is chosen, as `lib/templates` already does for page templates (R2-6).

**FR-18 · Minor · Welcome steps on a phone: the actions are screens away · 390**
- **What the person experiences:** On step 1, "Let's begin" is about three screens below the ZIGi intro. Step 4's Continue is below 13 habit rows and the goal form.
- **Why:** `.onboarding-actions` sits at the end of each step's content.
- **Fix:** On narrow screens, make each step's action row sticky to the bottom of the viewport, above the tab bar, with the panel's glass background. "Skip setup" and "Explore the demo" stay in the flow below.

**FR-19 · Minor · The floating ZIGi button covers content during setup · 390**
- **What the person experiences:**
  - On /app/welcome it covers the "= Wealth" tile.
  - In the goal wizard it covers the right edge of "Continue →" and the "Create goal" button.
  - On Today it overlaps the welcome card's chevron.
- **Why:** The launcher is fixed bottom-right on every page, with no clearance for sticky action rows.
- **Fix:**
  - Don't mount the launcher on `/app/welcome` (ZIGi is already on the page as the guide).
  - Give pages with a sticky action row a CSS variable the launcher respects (`--launcher-clearance`), as the tab bar does.
  - The ZIGi look itself is unchanged.

### Polish

**FR-20 · Polish · Goal wizard legalese · all.** Step 3 says "Habit completion records behavior only. It never increases financial Goal progress." Step 4 says "Planned amounts and Habits do not count as current wealth." Replace them with one friendly line: "Habits help you keep going; only money you add counts toward the target."

**FR-21 · Polish · The no-model reply shows its provenance twice · all.** "On-device answers · no AI used" and "Answered on your device · no AI used" sit under the same message. Keep one: the message's own footer.

**FR-22 · Polish · The local model's first answer isn't marked · 1440.** The first time a reply comes from the person's own model, show one quiet line under it, once per device: "This answer came from llama3.2:3b on your computer. Nothing left this device." Also light planet 4 automatically when that first reply arrives on NOVA. Planet 4's check said "No question and answer from today yet" until asked in a particular place.

**FR-23 · Polish · Welcome step 1 "No crypto needed." · all.** The sentence goes on, "The blockchain stays out of sight; a wallet is optional and can come later." That introduces two crypto words to someone who has never heard of them. Use "No crypto needed. Nothing to connect, nothing to buy."

---

## Covered elsewhere (the first run depends on these fixes)

| Ref | What the first run saw | Acceptance for the first run |
|---|---|---|
| ND-1 (NOVA_DESIGN_REVIEW) | At 1440×900, "Build NOVA's brain" and "Start the guide" are below the fold (y = 1111). The greeting is hidden under the command field. | A fresh 1440×900 device sees the setup card's "Start the guide" without scrolling. |
| ND-2 | "Day at a glance" is a tall empty slab with two bullets. | — |
| ND-7 | The first streamed local reply shows one line above the composer at 1440×900. At 390 the first no-model reply is cut by the composer. | The first reply's first three lines are visible without scrolling at 390 and at 1440×900. |
| ND-23 | The setup card's copy explains NOVA and ZIGi in one long sentence. | — |
| R2-4 | ZIGi and NOVA. Continued by FR-10. | — |
| R2-7 | The desktop notice. Continued by FR-6 (verify). | — |
| R2-11 | "Make Today yours" appears right after "Not now". This is by decision. Note that a person who just declined setup is asked again at once. | Owner's call. |
| R28 (owner) | The hero's "Onchain · ZIGChain vision · Alpha simulation" row is the first crypto word on Today. | Owner's call; PROTECTED hero. |

## Moments that should delight

**These already do (keep them):**
- The swan fold at 1440: slow, quiet and exact, landing on the Z.
- Welcome step 8's "When you finish" list, which says exactly what will be created before anything is.
- "+ Walk": one tap, 1.3 s, "Walk added. Change anything about it from its card."
- Privacy check: "Checked: it works. Strict is on. A test message to a cloud model was refused before sending." It is honest and concrete.
- "Find models on this computer" names what it found in 2.6 s, including LM Studio.
- The chip changing to "Brain Local · llama3.2:3b" and the reply labelled "via Ollama · llama3.2:3b": it is visibly *mine*.

**These should, but don't yet:**
1. **The first habit ticked:** the card vanishes (FR-3). It should stay and say "Day 1".
2. **Setup finished:** the screen is unchanged (FR-4). It should say "You're set" and point to the first tick.
3. **First goal created:** it lands on "VALUE GOAL · PRIVATE ALLOCATION" (FR-1). It should say "Holiday · your plan starts here" and offer "Set a monthly amount".
4. **NOVA's first answer from your own model:** only one line is visible, and there is no "this came from your computer" beat (ND-7, FR-22).
5. **The swan on a phone:** it plays in a ~36 px logo while the eye is on the hero. This is PROTECTED and the owner's call; noted only so the owner knows most phone users won't see it.
