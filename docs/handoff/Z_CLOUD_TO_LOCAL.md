# Handoff: Session Z-Cloud → Session Z-Local

**Z-Cloud's branch:** `feature/session-z-cloud` (base `main` `12a3ef9`, Merge #80, Alpha #35). Draft PR: see the branch on
GitHub. Z-Local's branch: `feature/session-z-local`; its notes to this lane go in `docs/handoff/Z_LOCAL_TO_CLOUD.md`, read by
Z-Cloud at every gate. Dated entries, newest last. Evidence labels as in docs/STATUS.md.

## 2026-10-10 — opened (Setup)
### Paths Z-Cloud owns (please don't edit; ask in Z_LOCAL_TO_CLOUD.md)
- **ZIGi's face:** `apps/web/components/ai/**`, `apps/web/components/zigi/**`, ZIGi's CSS (`components/ai/*.css`,
  `components/zigi/*.css`, ZIGi rules in `app/globals.css`), the launcher (`components/ai/ai-launcher.tsx`, `.css`,
  `launcher-rest.ts`).
- **Two files in `lib/ai`:** `apps/web/lib/ai/voice.ts` (and `voice.test.ts`) and `apps/web/lib/ai/hosted*.ts` (and their tests).
- **New, outside `lib/ai`:** `apps/web/lib/z-device-keys.ts`, `apps/web/lib/zigi-suggestions.ts`, `apps/web/lib/zigi-voice.ts`
  (device keys `zigoals:zigi-suggestions:v1` and `zigoals:zigi-voice:v1`, wired into `lib/onboarding.ts` and
  `lib/export/everything.ts`).
- **Everything else in the app:** shell, navigation, Today, Habits, Wealth, Goals, Settings, Help, the vault and account
  paths, `app/api/**`, `workers/**` (auth-abuse, private-sync, zigi-relay), `.github/**`, `scripts/**` except
  `scripts/zigi/**`.
- **Records and docs:** `docs/STATUS.md` (Z-Cloud's entry, Alpha #35 and Release identity), `docs/architecture/ADR-019-session-z-cloud.md`,
  this file, `docs/verification/z-cloud/**`, `docs/run11/**`, `docs/friends-alpha/**`, `docs/product/ZIGI_ALIVE_X.md`
  (iPhone checklist rows), `docs/business/LEGAL_CHECKLIST.md` §10.
- **Shared (whoever merges second brings `main` in and carries them):** What's new (`lib/whats-new.ts`, its card), Help,
  `scripts/weight-budgets.json`, `docs/STATUS.md` (each lane its own entry).

### Paths Z-Local owns (Z-Cloud never edits them)
`apps/web/lib/ai/**` except `voice.ts` and `hosted*.ts`; `scripts/zigi/**`; the real-model harness and corpus; the brain's
unit tests. For the WebKit freeze fix Z-Local may edit `components/ai/use-chat-session.ts` and `components/ai/proposal-list.tsx`
and announces the change here or in its own file.

### What Z-Cloud will touch near the brain (announced before the edit)
- `components/ai/proposal-card.tsx` and the render branch of `components/ai/proposal-list.tsx` (Part 2.5: an acted-on card
  collapses to a one-line receipt). Rendering only: no change to `claimAuto`, `reserve`, the add/undo calls or their order.
  If Z-Local's freeze fix lands in `proposal-list.tsx` first, Z-Cloud merges on top of it, never around it.
- `components/ai/ai-chat.tsx` `Composer` (voice: the mic shows wherever the browser offers speech recognition, connected or
  not; words go through `session.ask` exactly as typed text does).
- Voice settings: `lib/ai/settings.ts` keeps `voice.transcription` (strict, `'off'` by default). Z-Cloud does not change it;
  a new device key `zigoals:zigi-voice:v1` holds the new voice choices (show the mic, language EN/NL, send when I stop,
  read spoken replies, tap ZIGi to talk, mute). A `voice.language` outside English and Dutch is ignored by the face. If
  Z-Local removes French from `lib/ai/settings.ts`, Z-Cloud mirrors it in every option it renders.

### Asks to Z-Local
- **Usage cost:** when `estimateCost()` and the per-model price table (incl. cache reads and writes) land in `lib/ai`, say so
  here; Z-Cloud renders it in the usage meter and the relay uses the same accounting (Part 6).
- **New card kinds:** they render through the generic proposal card. If one needs a visual, ask in Z_LOCAL_TO_CLOUD.md.
- **Spoken English and Dutch:** voice sends the recognised words as one message (`session.ask`), with no marker. If the
  brain wants to know a message was spoken (for shorter replies to read aloud), propose the field here; until then the
  face only decides whether to read the reply aloud.

## 2026-10-10 — Part 2 (committed)
- **Changed near the brain (rendering only):** `components/ai/proposal-card.tsx` returns a one-line receipt for every status
  but `proposed` and `busy` (same `.ai-card`, `.ai-card-<status>`, `.ai-card-status` text and title); `components/ai/proposal-list.tsx`
  takes `earlier` and, when set, wraps the still-`proposed` cards in a `<details class="ai-proposals-earlier">` and hides
  "Add all". Nothing in `add`, `addAll`, `autoAdd`, the auto-accept effect, `undo` or `claimAuto` changed. If your WebKit fix
  lands in the same file, merge both; I will do the same if mine lands second.
- **`components/ai/use-chat-session.ts`:** two failure steps now say "Settings → ZIGi · Your Personal AI Companion" (string
  only, lines with `not-connected` and `missing-key`).
- **Ask: the new name in `lib/ai`.** The panel, Settings, Help, Meet ZIGi and the launcher say "ZIGi · Your Personal AI
  Companion". Strings in your lane still say "Settings → ZIGi · your AI → …" (`lib/ai/session.ts`, `photo.ts`, `errors.ts`,
  `tools/format.ts`, `tools/activity.ts`, `tools/registry.ts`, `on-device-chat.ts`, `setup-chooser.ts`,
  `context/specialists.ts`, `context/consent.ts`, `context-pack/build.ts`, `actions/plan.ts`) and the mini window's title
  (`pip.ts`, `doc.title`). Please rename them to "ZIGi · Your Personal AI Companion" in your PR (tests:
  `tests/zigi-mini-window.spec.ts:96` expects `pip.ts`'s title; update it with yours).
- **New device key** `zigoals:zigi-suggestions:v1` (`lib/zigi-suggestions.ts`, outside `lib/ai`): the person's frequent
  questions, never sent unless the person sends one. Nothing in `lib/ai` needs to read it.

## 2026-10-10 — Part 3 (voice, committed with this entry)
- **Composer (`components/ai/ai-chat.tsx`, mine):** the microphone shows wherever the browser offers speech recognition,
  connected to an AI or not. The recognised words go through `session.ask` exactly as typed text (no marker, no new
  field); without an AI they reach the on-device answers and, when Quick add's parser understands them, a Quick add card.
  The engine (`components/ai/voice-engine.ts`, `use-talk.ts`, `talk-events.ts`, `voice-waves.tsx`) is face-only and
  imports nothing from `lib/ai` but `lib/ai/voice.ts` (mine) for `detectBrowser` and `browserSpeechDisclosure`.
- **Voice language (your owner edit 6):** my UI offers exactly `en-GB`, `en-US`, `nl-BE`, `nl-NL` or the device default,
  from `lib/zigi-voice-lang.ts` (outside `lib/ai`), and `lib/ai/voice.ts` `speechLanguage` now resolves through it: a
  stored `'fr-FR'` (or anything outside EN/NL) reads as the device default, never refused. When your option list is
  exported from `lib/ai/settings.ts` and on `main`, whichever PR merges second points `VOICE_LANGUAGES` at it (one list).
  `settings.voice.transcription` is unchanged and still decides provider transcription; the new choices (show the mic,
  send when I stop, read spoken replies, tap ZIGi to talk, mute, the per-browser disclosure) live in `zigoals:zigi-voice:v1`.
- **Read aloud:** a reply to a spoken question is read with `speechSynthesis` in the chosen language (never in quiet
  hours, never while muted); nothing in the reply or the request changes. If the brain later marks spoken questions for
  shorter replies, propose the field here.
- **Your entries read at this gate:** the relay rules (Part 3 entry) are Part 6's spec here, followed exactly; the price
  table is copied from your `lib/ai/pricing.ts` with its source commit named. The runner effects (`plan.navigate`,
  `plan.confirm`, `plan.device`) and the two money pre-fills depend on types and modules that exist only on your branch;
  my plan for them is in ADR-019 "Handoff applied".

## 2026-10-10 — Parts 4–6 (persona decisions, security, the relay for friends)
- **Nothing of yours was edited.** Part 4 touched only my lane (the shell, Today, Wealth, Health display, Habits, Goals on
  phones, Help, the music button); Part 5 touched private sync, auth admission, the vault UI and `/api/positions`.
- **The relay follows your Part 3 rules** (`workers/zigi-relay/anthropic.mjs`, one function `anthropicBody`): no
  `thinking` field; `output_config.effort` "low", or "high" for "Think deeper" (the app's `request.think`, sent by
  `lib/ai/hosted.ts` as Chat Completions' `reasoning_effort: "high"`); one retry without `output_config` on a 400 that
  names it; the whole system string as one block with `cache_control`, plus the top-level marker; no `tool_choice`. When
  `buildSystemParts()` is on `main`, sending its parts as separate blocks is a change to that one function; say if you
  want it in this PR or after.
- **The price table is copied** from your `lib/ai/pricing.ts` at 64ec6f6 into `workers/zigi-relay/pricing.mjs`;
  `scripts/run11/zigi-relay-pricing.test.mjs` compares the two (PRICES, PRICES_AS_OF and `estimateCost` over a matrix)
  as soon as both are on one branch. I read the live pricing page on 2026-10-10 too: it matches your table (Sonnet 5.5
  cache hits $0.10). If you change the table, the second merger copies it.
- **Budgets in dollars** count each reply from its four usage fields with that table, and the relay's daily and monthly
  money per person is optional (ADR-019 C40). Nothing changes in `lib/ai`.
- **One ask:** `lib/ai/setup-chooser.ts:59` titles the hosted route "ZIGoals hosted". On the Claude relay the product's
  name is "ZIGoals AI · powered by Claude" (`hostedName(provider)` in `lib/ai/hosted.ts`, mine). If you want the chooser to
  say it too, call `hostedName` there; I left your file alone.

## 2026-10-11 — Gate C: the persona round's findings in your lane (nothing of yours edited)
The fresh-eyes round (`docs/verification/z-cloud/PERSONAS_Z.md`, 20 sessions, MOCK AI, this branch's build) found these
in `lib/ai`; I changed only my side of each and left your files alone.
- **On-device answers** (`lib/ai/local-answers`, S02, S03, S08): with no AI, "Which habits are open today?" (one of ZIGi's
  own examples), "How many habits do I have?", "What habits do I have?", "Did I floss today?" and "Which habits did I
  archive?" all get the generic fallback, also with six Showcase habits. An example ZIGi offers should be one it answers.
  My side: an earlier reply now keeps its examples as plain words (they were buttons on the latest reply only).
- **Dutch questions without an AI** (S06, S16): "Hoeveel minuten heb ik deze maand gemediteerd" gets the English fallback;
  the English question answers "95 minutes". Your L6 work covers it once both lanes are on `main`. My side: the Voice note
  and Help say "questions in English" for now, and a question spoken in Dutch gets no Quick add card (Quick add reads
  English; it now also asks for a unit after a number and an unknown word: "2 glazen water" was 2 mL).
- **Which setup fits me?** (`lib/ai/setup-chooser`, S02): "Nothing yet" → "On a phone" → "Nothing leaves my computer"
  suggests the subscription bridge, and the next option says "computer" right after "phone" was picked.
- **The edit-habit card** (the planner, S19): the card says "From today… as in Habits" and changes today, while Habits'
  own edit form says rule changes begin tomorrow.
- **The water card's edit fields** (`lib/ai/actions/edit.ts`, S04): both say "(optional)" though one is required (the
  validation message is right).
- **A duplicate habit from a card** (S05): a create-habit card added after an edited resend made a second "Stretch" with
  no warning (your `dedupePlans` may already cover it).
- **The knock offer** (`lib/ai/knock/offer.ts`, S04): it shows in every new chat until answered; Help says ZIGi asks once.
  If "once" should mean once, the rule is yours.
- **For the merger of `proposal-list.tsx`:** it now keeps each reply's card outcomes on the device (`replyId`,
  `lib/zigi-cards.ts`, ADR-019 C50) so a reopened chat never offers an added card again; keep both lanes' changes.
