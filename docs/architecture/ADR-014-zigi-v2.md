# ADR-014: ZIGi · your AI, v2: one local data layer, more ways in, still the person's own AI

Status: **Accepted; implemented in Session V ([PR #76](https://github.com/reyals1111-ux/ZIGoals/pull/76), 2026-10-05/06), not merged or deployed at the time of writing.** It builds on [ADR-012](ADR-012-your-ai.md) (Session T, Alpha deploy #29) and supersedes it **in part** (listed under "What this supersedes"; ADR-012's text stays as written). The Guide ([ADR-011](ADR-011-coach.md)) is untouched (owner decision D6). Sources and dates for every provider and browser fact: [YOUR_AI_V2.md](../product/YOUR_AI_V2.md).

## Context
- The owner's real-use finding on #29: on the subscription path, "How many minutes did I meditate this month?" asked on Health copied only today's Health snapshot, so the AI could not answer. Root cause: T chose the context by **page**, and most pages describe **today**.
- A privacy defect found while planning: T's Today context added a "This week (for your weekly review)" section and Health-filled habit values whatever the Health gate said. It was fixed first (Part 1c) and as a separate hotfix PR, [reyals1111-ux/ZIGoals#75](https://github.com/reyals1111-ux/ZIGoals/pull/75). Corrected later (commit `47ec0fd`): on #29 the week section itself never reached ZIGi, because T read the review through a store that refused its key. What did reach the person's own provider, with page sharing on, was the values of habit check-ins filled in from Health. Both are closed.
- The promises stay: data leaves the device only to the provider the person chose (or, if they agree, ZIGoals hosted), always with a visible preview; Health through T's three-part gate on every path, fail-closed; no AI write without the person's confirmation; money pre-fill only; no advice; no provider call without a user action; no new dependency.

## Owner decisions (2026-10-05)
- **D1. Native tool calling, for read-only tools only.** Providers and models that support it may call ZIGi's read-only data tools. The `zigoals-action` block protocol stays the universal write path and the fallback everywhere. A write is never a tool side effect; it is always a proposal card.
- **D2. A ZIGoals-hosted relay is allowed** as a separate, clearly disclosed, **off-by-default** path. Browser-direct stays the default and is unchanged. No stored plaintext server copy of anyone's data is built (it would break "private by design"); that remains a future owner decision.
- **D3. ZIGi notifications are allowed:** the in-app knock, push reminders with a ZIGi image (push stays off until [PUSH_ACTIVATION.md](../run11/PUSH_ACTIVATION.md)), and push-while-open. This replaces ADR-012's "no notifications from ZIGi, ever".
- **D4. A motion exception for ZIGi only:** a gentle looping idle animation while ZIGi is visible, paused when hidden, static under reduced motion and Motion Off, controlled by ZIGi's animation setting (Full / Calm / Off; default Calm). All other motion stays one-time. The owner extended it to a CSS-only breathing loop on the launcher figure.
- **D5. No ChatGPT plan sharing** ("Sign in with ChatGPT") in this session. No registrations, applications or tokens with any provider, store, origin trial or developer program.
- **D6. The Guide stays exactly as it is,** still "no AI service". ZIGi's local features belong to ZIGi; the overlap is written up below for the owner's Guide phase-2 decision.

## Decision

### 1. One local, read-only data layer (Part 2)
- `lib/ai/gates.ts` `aiGates()` holds T's rules in one place, per area: the area's page switch, the three-part Health gate, "Settings attaches nothing", sensitive screens read nothing. It has two modes: **provider** (what may go to an AI) and **local** (what ZIGi may read to answer on the device: every area before setup, Health still only through its gate). Every consumer gets `health: null` when the gate is closed, so Health cannot be read by mistake. Health-filled check-in values are held back the same way.
- `lib/ai/tools/`: 26 read-only tools (plus `about_me`, Part 8) over Habits, Health, Goals, Wealth, Today and Activity:
  - plain JSON-Schema parameters (`type`, `properties`, `required`, `enum`, `description`), checked again by Zod;
  - handles instead of identifiers (T's `h`/`g`/`f`/`r`, plus `c` counters and `m` saved meals; `lib/ai/handles.ts`, one set per reply);
  - a provenance line, and per-tool row (31) and character (4,000) caps with the cut stated; 16,000 characters per answer (32,000 with Think deeper).
- Honest numbers: unknown stays unknown, one total per currency, never converted; prices carry their source and time. Fasting is a list only, with HE6's note (no totals, streaks or "longest").
- `range.ts`: today, yesterday, this/last week (Monday–Sunday, the habit engine's week; the `weekly_review` tool uses the person's review day), this/last month, last N days/weeks, since, between, `a..b`, named months, weekdays. nl/fr/de range words are recognised. Ranges over 366 days or in the future are refused, never guessed.
- **The cross-path privacy test** (`lib/ai/privacy-cross-path.test.ts`) plants sentinel Health values, closes the gate and checks every path built in this session (one block per part). The control with the gate open sees the sentinels.

### 2. Local answers (Part 3)
- An intent engine over the tools answers pure lookups on the device, labelled **"Answered on your device · no AI used"**: totals, counts, minutes, averages, best/lowest days, streaks, rates, progress, remaining, last time, this-versus-last, a day's meals, targets, holdings.
- Two equal matches become choice chips, never a guess. Advice, plans and logging go to the person's AI (or, with none, examples from their own records). Health with the gate closed gets a plain refusal before anything is read.
- It works before setup (nothing is written to `zigoals:ai:v1`), without a provider and in Showcase. "Ask my AI for more" sends the same question and the same records, recomputed under the provider gate. Local turns are stored as chat v2 (tool, arguments, label; never results) and **never sent to a provider later**.

### 3. Question-aware context on every path (Part 4)
- `lib/ai/context/question.ts`: the records sent with a message are chosen from **the question and the page**. Each source is a removable chip; "What your AI sees" (and, on the bridge, "What will be copied") shows the exact text; at most 16,000 characters, the cut stated. A closed area or Health adds nothing and is listed as not included.
- "Open <app> side by side" (wide screens): one `window.open` from the click with the app's fixed address and `noopener`. Nothing personal goes in the URL, and the app is never embedded (`frame-src 'none'` unchanged).
- Found in T and fixed (`c17c06c`): Portfolio context priced every portfolio with the first portfolio's currency.

### 4. Context pack (Part 5, `[TIER 3] (export format)`)
- A Markdown file (optionally JSON) for an AI's project knowledge. It has a "How to use this file" header and a line saying everything after it is records, not instructions. It holds plain summaries, then tables for the chosen period (90 days by default).
- Health appears only with the three-part gate **and** its own box (off by default). Wealth totals are per currency with price sources and times. Notes are included only if chosen.
- Guards: Markdown and spreadsheet-formula escaping, escaped data marks. The pack has no ids, emails, keys, addresses, hashes, networks or handles.
- The warning "This file isn't encrypted. Anyone and any AI you give it to can read it." comes before the buttons. An optional weekly refresh reminder is offered.

### 5. Native tool calling, Think deeper, usage (Part 6)
- Tools and tool turns follow each provider's documented wire (YOUR_AI_V2 §1):
  - OpenAI, OpenRouter and LM Studio send fragments merged by index.
  - xAI, Gemini and Ollama send whole calls.
  - Anthropic sends `tool_use` + `input_json_delta`, with all `tool_result` blocks in one user turn and no `tool_choice`.
  - Gemini model turns are echoed unchanged (thought signatures).
  - Without tools, every body is T's, byte for byte.
- `lib/ai/tool-loop.ts`: at most 4 rounds and 8 calls a round, with the data cap above. Repeated calls stop the loop. Bad or unknown calls become results the model reads. A private screen, an account change or Stop ends it. Only the tools the gates allow are offered.
- Capabilities: documented for OpenAI, Anthropic, Gemini and xAI chat models; read from metadata for OpenRouter (`supported_parameters`), Ollama (`/api/show`) and LM Studio (`/api/v1/models`). A tools-related 400/422 retries with the records attached and keeps the model on Attach for the session. Settings: **Automatic / Tools / Attach**.
- "ZIGi looked at" chips show the exact text sent, made again under today's gate after a reload (the chat keeps tool + arguments + label only).
- "Think deeper": a deep model per provider and twice the data cap.
- Usage meter (`zigoals:ai-usage:v1`): tokens per route per month as the provider reports them (a request without counts is counted, not zeroed). Money appears only as an estimate from the person's own prices, per currency, never converted. A soft cap gives notes at 80 % and 100 % and blocks only if the person chose "ask first".

### 6. Act by chat, voice and photo (Part 7)
- New proposal kinds, each with Zod, a card, Edit and Undo through the existing mutators:
  - `create-food`, `create-recipe`, `plan-meal`, `grocery-item`, `counter`;
  - check-in `minutes`/`quantity` (converted to the habit's own measure; anything else is refused);
  - `create-reminder` (habit and water into T's reminders; goal check-ins, the Wealth look and the pack refresh into `zigoals:zigi-reminders:v1`);
  - `plan-goal`, `build-habit` (expanded into separate cards), `review-intention`, `remember` (Part 8).
- One message can become several cards, with "Add all" and one Undo. Money stays pre-fill only.
- Photo meals are offered only with a model that reads images (metadata or the person's declaration) **and** Health shared. The photo is downscaled to ≤ 1024 px JPEG in the browser and sent with that one message in each wire's documented form. It is never stored: the chat keeps `{kind:"photo"}`. Cards say "Estimated by your AI from a photo".
- Talk to log: Log mode or `/log`; the transcript is editable before sending.
- "Actions by ZIGi" in Activity, from `zigoals:ai-actions:v1` (added on confirm, removed on Undo).

### 7. What ZIGi knows about me (Part 8, `[TIER 3] (storage keys/data formats)`)
- Up to 100 notes of 500 characters, written only by the person or a confirmed "Remember this?" card. Key-shaped text is never kept, and neither is a note about a health condition proposed by the AI.
- "Use my notes" is on once a note exists. Notes go first as a removable "About me" chip, and through `about_me` for tool-calling models. Never from Settings or private screens. Health and diet notes go only through the Health gate.

### 8. Proactive, all local (Part 9)
- Chips from the records (rotating daily, dismissible; T's starters as the fallback), the morning brief (greeting and a lowest-priority "For you" card while ZIGi is connected and its launcher shows), the guided weekly review, and patterns on top of `lib/insights/engine.ts` thresholds (with sample sizes, "a pattern, not proof", Health pairings only with the gate).
- "Ask ZIGi about this" next to a number is in the options menu the number's card already has (no layout shift) and is shown only while the launcher shows.
- Everything that sends ("Say it nicer", "Ask my AI for a reflection", "Ask my AI about this pattern") sends only on click and shows its preview first.

### 9. Chat polish (Part 10, `[TIER 3] (storage keys/data formats)`)
- Slash commands (`/log /ask /plan /review /pack /insights /remember /help`, a WAI-ARIA list box), edit-and-resend, timestamps, the person's own "Useful / Not useful" note (never sent), Copy as Markdown, local follow-up chips, charts drawn from a tool's own rows (unknown left out, never drawn as zero; figures also in a table), "Continue in my AI" (shown in full before copying; on-device turns left out), jump to latest, a `?` shortcuts sheet, first-run tips, History pin and a page filter.
- GFM tables come from the parsed tree: cells as text, no HTML, images, scripts or style attributes.

### 10. Voice, safety, evals (Part 11)
- [ZIGI_VOICE_AND_SAFETY.md](../product/ZIGI_VOICE_AND_SAFETY.md) sets the voice: warm, short, plain, says which records it rests on, "I don't know" rather than a guess.
- Careful mode (`lib/ai/safety.ts`) works from the person's own words only, never their records. It covers self-harm, eating-disorder signals, under 800 kcal a day, more than about 1 kg a week, and fasts of 48 h or more or dry fasts. It gives a supportive local note without numbers, and tells the AI to give no numbers, targets or plans. HE6's note is kept.
- The golden set (`lib/ai/evals/`): 91 deterministic cases in 9 categories, run on every CI run, with a 100 % bar.

### 11. ZIGi alive (Part 12)
- Manifest v2: 25 states (T's eleven keep their codes; F010–F023 are added), each a loop or a timed one-shot with a fallback chain to idle. It has skins with an optical offset and per-state files, and still reads v1. The shell carries no manifest: a tiny bus and a constant frame; the machine runs in the chat chunk.
- Launcher:
  - a "Hide ZIGi" chevron (44 px target, the same Undo);
  - a "Show ZIGi" edge tab while hidden, outside the `ai-launcher` test id;
  - the "Open <app>" pill restyled as one control with the circle;
  - side and size S/M/L;
  - optical centring from the measured alpha centroid.
- The CSS-only breathing (D4): keyframes on the figure, no JS. It is still under reduced motion, Motion Off or ZIGi's animation Off.
- Customize (panel and Settings), Meet ZIGi (`/app/zigi`), [ZIGI_ASSET_SPEC.md](../product/ZIGI_ASSET_SPEC.md).

### 12. Knock, reminders, push (Part 13; `[TIER 3] (service worker/push)` for the worker)
- The knock lives in a companion chunk loaded only while knocking is on. When a reminder is due, ZIGi peeks out and knocks once with Do it now / Snooze (15 min, 1 h, Tonight) / Not today.
  - At most 3 a day; never 22:00–08:00.
  - Never on Today, while hidden, on a sensitive screen or while the panel is open.
  - No sound.
- Today shows ZIGi's weekly reminders (goal check-ins, the Wealth look, the pack refresh).
- Push-while-open: every push still shows its notification (platform rule), and open pages also knock for people who turned knocking on.
- Notification look: ZIGi's reminder figure as the icon, and a wide `image` where supported (Chrome). Safari ignores the icon.
- Opt-in reminder names (see "Owner-approved changes").
- A T bug was found and fixed (`88661e3`): push schedules lost every habit reminder once the account vault kept the habits in its durable store. Push is not on in any deployed build.

### 13. The mini window (Part 14)
- "Pop out" appears only where Document Picture-in-Picture exists (Chrome/Edge 116+, Firefox 151 desktop). It is hidden in Safari, on Android and in phone layouts.
- It opens from the click, one window per tab. The same React tree renders into it through a portal.
- Same-origin stylesheet rules are copied as text. The window's own clipboard and frames are used, raced against a tab timer: in headless Chromium the window's own event loop does not run.
- "Back to tab". A private screen in the tab pauses the window behind a blur.

### 14. More ways to use AI (Part 15)
- Chrome's on-device model (Prompt API, Chrome 148+ on computers) is shown only where the API exists and isn't "unavailable".
  - It downloads only from its Settings button. A question or "Say it nicer" never starts the download.
  - It gets only fixed instructions and the person's own words (or the brief's lines, made under the local gates).
  - Answers are labelled "Answered by Chrome's on-device model". Its turns are never sent to a provider later.
- "Which setup fits me?": three or four questions, then one suggestion with honest pros and cons and steps. It is worked out on the device, nothing is stored, and hosted is suggested only when offered.

### 15. Browser AI agents, WebMCP (Part 16)
- `document.modelContext.registerTool(tool, {signal})`, only where the browser offers it and only after the person turns on "Let browser AI agents use ZIGoals tools" (off by default). There is no trial token and no polyfill.
- Read-only lookups are `zigoals_<tool>` (`readOnlyHint`, `untrustedContentHint`) under the provider gates. One proposal tool (`consequentialHint`) feeds the whitelist parser, and its actions become cards in ZIGi's panel.
- Every request shows at once in a ZIGi notice with the exact text that went back and "Turn off browser agents".
- The tools are taken away when the page, the gates or the screen change, and for good when the switch goes off.
- An accessibility pass for screen readers and role-driven agents: stable names, descriptions for what changes, named groups. Accessibility-snapshot differences only.

### 16. ZIGoals hosted, off by default (Part 17, `[TIER 3] (new Worker, app route, entitlements)`)
- A separate Worker, `workers/zigi-relay/`:
  - invite-only (an allowlist of account ids, a secret);
  - sessions verified like the push and sync Workers;
  - per-account and global daily budgets, reserved up front and settled from reported usage, in one SQLite Durable Object;
  - a circuit breaker, a kill switch (paused unless exactly `off`), and size and time caps;
  - it stores counts only, logs nothing (no `console`, observability off) and never passes on provider error bodies;
  - one provider and model (template: OpenAI Chat Completions, `gpt-6-luna`, checked 2026-10-06), with the body rebuilt from messages and tool definitions only;
  - tools run in the browser.
- The browser reaches it only through the app's own `/api/zigi` (session cookie, private-sync session check, streamed back), so `connect-src` doesn't change (S2).
- Three switches, all off:
  - the build flag `NEXT_PUBLIC_ZIGI_HOSTED=on`;
  - the app Worker secret `ZIGOALS_ZIGI_RELAY_ORIGIN`;
  - the kill switch.
- A first-use disclosure before agreeing. Health needs the consent's own box on top of the gate. Replies are labelled "Answer from <provider> via ZIGoals hosted". `lib/entitlements.ts` gains `hosted` (no payment code).
- Activation is the owner's: [ZIGI_RELAY_ACTIVATION.md](../run11/ZIGI_RELAY_ACTIVATION.md).

## Storage keys (all device-only, in "Export everything", never synced; Showcase in the tab's session storage)
`zigoals:today-folds:v1` (1b), and, defined once in the storage foundation (`f146c96`, loose schemas so later parts revert alone): `zigoals:ai-options:v1`, `zigoals:ai-usage:v1`, `zigoals:ai-memory:v1`, `zigoals:ai-actions:v1`, `zigoals:zigi:v1`, `zigoals:zigi-reminders:v1`, `zigoals:zigi-knock:v1`. Chat records stay in IndexedDB `zigoals-ai-chats-v1` with the database version unchanged; a chat becomes `version: 2` only with a V field and #29 skips it untouched. IndexedDB `zigoals-push-labels-v1` exists only for people who opt in to reminder names. `zigoals:ai:v1` is unchanged byte for byte.

## Egress, CSP, Permissions-Policy
- Browser `connect-src`: **unchanged**. Everything new is local or reuses T's provider origins. The relay origin is server-side only (`lib/egress-policy.json` → `serverOnly.zigiRelay`), and a test proves it never enters `connect-src`.
- Permissions-Policy: unchanged (`language-model` and `tools` default to `self`; Document PiP has no policy feature).
- Trusted Types: Part 19.

## Owner-approved changes (exactly as designed in the plan)
- **The 1c hotfix PR** ([#75](https://github.com/reyals1111-ux/ZIGoals/pull/75)) as an exception to "one PR per session", for a live privacy defect.
- **Reminder names in notifications** (S10). This changes ADR-010 rule 2, its "no storage" service-worker line, and the Help/Settings copy "and nothing more".
  - Opt-in, off by default. The text is composed on the device from an IndexedDB table the service worker opens **read-only**. The payload stays `{"v":1}` (ADR-010 rule 1 kept).
  - Water and Health-linked habits always get the generic text. After 30 minutes (the push TTL) the text is generic too.
  - The table is cleared on switch-off, push-off, sign-out, account change and erase.
  - `lib/public-safety.test.ts`'s service-worker pin is narrowed to that one read-only open (listed under "Assertions changed").
- **The launcher breathing loop** (D4 extension), CSS only.
- **The one-time knock offer.** Knock stays off by default; the answer is stored and the offer never returns.

## Session decisions (taken without asking, safest option that keeps every promise)
- **S1** Branch `feature/session-v-zigi-v2`, as the brief names it.
- **S2** The relay is reached through same-origin `/api/zigi`, not from the browser. The session is an `HttpOnly` cookie the page cannot read, so a browser→relay call could not be verified like the acceptance Workers verify. `connect-src` stays unchanged and the relay origin is a secret on the app Worker. *Deviation from the brief's wording*, which pictured the relay origin in `connect-src`: this keeps a smaller browser surface and the same verification as `/api/push`.
- **S3** V's options live in `zigoals:ai-options:v1`; `zigoals:ai:v1` is untouched (strict; #29 must keep reading it), and hosted and on-device never enter its `mode`/`provider`.
- **S4** Chats stay v1 unless V fields are used. Tool results are never stored; local and on-device turns are never sent to providers.
- **S5** Knock off by default and offered once; edge tab on; animation Calm; launcher breathing CSS-only.
- **S6** "Ask ZIGi about this" affordances and the brief card only while the launcher is visible (the brief also only when connected and not empty).
- **S7** "This/last week" = Monday–Sunday; the weekly-review tool uses the person's review day.
- **S8** Local answers are worded in English; nl/fr/de range words are recognised.
- **S9** The fasting tool lists fasts only (P5/HE6).
- **S10** Push names are opt-in (default off), composed on the device, with Health reminders generic (owner-approved, above).
- **S11** Vision and tool support come from metadata where documented; otherwise vision is declared by the person and tools use try-and-fall-back.
- **S12** The usage meter blocks only if the person chose "ask first".
- **S13** New reminder kinds get their own key (`zigoals:reminders:v1`'s strict schema would reset in #29).
- **S14** The Activity filter appears only once a ZIGi action exists.
- **S15** Relay defaults are placeholders; the model id was checked on the provider's official page.
- **S16** `today-folds` is exported but counts as non-personal for onboarding.
- **S17** The Guide is untouched; the overlap is below.
- **S18** The storage foundation is one early Tier 3 commit with loose schemas, so later parts revert alone.
- **S19** Browser agents follow ZIGi's provider gates exactly: ZIGi set up, each area's switch, Health only through its gate, nothing on Settings (no tool at all there), nothing on sensitive screens; before setup an agent can only propose.
  - Rejected: a separate area list for agents (duplicate UI), and "the switch is the connection" (it would read with switches the person never saw).
- **S20** Every agent request shows at once in a ZIGi notice with the exact text that went back, refusals included. It is not a blocking confirmation per read: the draft has no user-interaction API (`requestUserInteraction` is gone from the 2 Oct draft), and a UI-driving agent can already read what the page shows.
- **S21** Agent proposals:
  - the same whitelist parser (one action block) and schemas;
  - handles only from this tab's lookups (one set per tab, reset on account change);
  - at most 10;
  - in memory only (last 3 batches);
  - nothing written until "Add".
  - No new chat-record source ('agent' would be a storage-format change).
- **S22** Settings → ZIGi · your AI is regrouped into five labelled regions (Connection, Privacy & data, ZIGi's look and feel, Reminders, Advanced), with T's headings as h4. The new "ZIGi's reminders" card lists ZIGi's weekly reminders with Remove (until now they could be added but not removed). No new phone row.
- **S23** The What's new release id is bumped once (`2026-10-session-v`) and one link is appended, so every device sees the card once more.
- **S24** Names: tools are `zigoals_<tool>` with an underscore (the WebMCP draft allows dots; OpenAI and Anthropic function names do not).

## Rejected options
- **A stored server copy** of conversations or records, for hosted or sync. It would break "private by design"; it stays a future owner decision (D2).
- **ChatGPT plan sharing / "Sign in with ChatGPT"** (D5). Also no cookies, scraped logins or reverse-engineered endpoints for any consumer subscription (as ADR-012).
- **Embedding a provider's site** in a frame for "side by side": `frame-src 'none'` stays. The provider sites' own framing rules would also refuse it, and a frame would mix origins in one view. Instead there is a separate window with `noopener` and a fixed URL.
- **Polyfills or trial tokens** for WebMCP, Document PiP or the Prompt API, and libraries for markdown, charts, animation or SDKs. Each feature exists only where the browser has it, behind feature detection.
- **Native write tools** (D1): a write is always a proposal card.
- **A browser→relay connection** (S2).
- **WebM/HEVC alpha video** for ZIGi: animated WebP works in every engine (Safari 14+); Safari drops WebM alpha. Rive or Lottie remain an owner decision ([ZIGI_ASSET_SPEC](../product/ZIGI_ASSET_SPEC.md)).
- **A blocking per-read confirmation for agents** (S20).

## What this supersedes (ADR-012 and ADR-010 keep their text, with a dated note)
- ADR-012 decision 1, "Structured `zigoals-action` blocks, not native tool calling": native tool calling is added for read-only tools (D1); the blocks stay the write path.
- ADR-012 Addendum, "no notifications from ZIGi, ever": replaced by D3.
- ADR-012 "Token counts are shown, never money": money is now shown only as an estimate from the person's own prices, per currency, never converted (Part 6).
- ADR-012 "the data path is browser → provider" and the entitlement "no check against a server": still true by default; ZIGoals hosted adds a disclosed, off-by-default server path with an entitlement asked from the relay.
- ADR-012 "Settings and Ecosystem use the Help specialist (no page data on Settings)": unchanged. Settings also gives agents nothing (S19).
- ADR-010 rule 5 ("never both" the notification and the in-app card): for people who turned knocking on, an open page also knocks (the platform requires the notification).
- ADR-010 rule 2 and its service-worker "no storage" line: changed for opted-in reminder names only (above).

## The Guide overlap (D6, input for the owner's Guide phase-2 decision)
The Guide and ZIGi's local features now both read the person's records on the device with no AI:
- the Guide's one daily note (an open habit, a streak at a round number, a goal date, the weekly review);
- ZIGi's brief, chips, patterns and local answers.

They are kept apart: different switches, labels ("Guide · on this device, no AI service" vs "Answered on your device · no AI used") and code. Options for phase 2: keep both as they are; let the Guide's note become one of ZIGi's brief lines when ZIGi is on; or retire the Guide's card in favour of ZIGi's brief for people who use ZIGi. Nothing changed here.

## Consequences
- **Privacy:** by default, nothing new runs on our servers. The relay is off, and when on it keeps counts only. Every new path is under `aiGates()` and the cross-path test. New residual channels are listed in the [THREAT_MODEL](../security/THREAT_MODEL.md): tool loops, WebMCP agents, the mini window, the relay, the context pack, push names.
- **Weight:** the launcher shell grew by +563 B gz JS and +899 B gz CSS against main (+1,462 B, within the +2 kB budget). Everything else is lazy. See YOUR_AI_V2 §6 for both methods.
- **Legal (questions, not answers):** [LEGAL_CHECKLIST §8](../business/LEGAL_CHECKLIST.md).
