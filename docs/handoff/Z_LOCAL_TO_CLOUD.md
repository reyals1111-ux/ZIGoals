# Handoff: Session Z-Local → Session Z-Cloud

**Session Z-Local's branch:** `feature/session-z-local` (base `main` `12a3ef9c`, Alpha #35), on the owner's Mac. Raw
model runs: the orphan branch `review/session-z-local-runs`. Z-Local never edits a path Z-Cloud owns; requests go here.
Z-Local reads `docs/handoff/Z_CLOUD_TO_LOCAL.md` on `origin/feature/session-z-cloud` at every gate. Dated entries,
newest last. Evidence labels as docs/STATUS.md.

## Paths Session Z-Local owns (please don't edit; ask here)
- **The brain:** `apps/web/lib/ai/**` except `lib/ai/voice.ts` and `lib/ai/hosted*.ts` (yours). This includes the
  adapters, `lib/ai/settings.ts` (the voice *settings* record: owner edit 6), the actions (schema, parser, planner), the
  context builders and specialists, the local answers, the evals (harness, corpus, golden sets), `lib/ai/pricing.ts`
  (new: the single source of the price table).
- **Scripts:** `scripts/zigi/**`.
- **Specs:** `apps/web/tests/real-model.ts`, `tests/zigi-real-model.spec.ts`, `tests/zigi-conversations.spec.ts`,
  `tests/zigi-pages-conversations.spec.ts`, `tests/zigi-day-in-the-life.spec.ts`, `tests/zigi-photo.spec.ts`, the new
  real-Claude specs and `apps/web/playwright.anthropic.config.ts`, the brain's unit tests.
- **Records:** `docs/verification/z-local/**`, `docs/architecture/ADR-020-session-z-local.md`,
  `docs/product/ZIGI_ACTIONS_Z.md`, `docs/product/ZIGI_MONTHLY_EVAL.md`, `docs/verification/zigi-monthly/**`, Z-Local's
  STATUS entry, this file.
- **Exception, announced here when it happens:** `components/ai/use-chat-session.ts` and
  `components/ai/proposal-list.tsx` for the WebKit freeze fix (Part 1) and one line in `use-chat-session.ts` passing
  the system prompt's stable prefix to the adapter (Part 3). Nothing else in `components/**`.

## Paths Session Z-Cloud owns (Z-Local never edits)
`apps/web/components/ai/**` (the chat UI, header, ⋯ menu, suggestions, composer, voice UI and animation, hosted panel,
the proposal runner `use-proposals.ts`), `components/zigi/**`, `lib/ai/voice.ts`, `lib/ai/hosted*.ts`, `workers/**`,
CI, the other app code, the STATUS records for #35. Shared files (What's new, Help, `scripts/weight-budgets.json`,
STATUS) are carried by whichever PR merges second, with a merge commit.

## 2026-10-10 — opened (Part 0)
- Plan approved by the owner with nine edits (ADR-020 "Owner decisions"); session decisions L1–L8 in ADR-020.
- **The WebKit freeze (Part 1) is first.** The fix will be its own commit and its exact lines are announced in the
  next entry. You also change `proposal-list.tsx` (cards collapsing into receipts, render branch only; owner edit 7):
  the second merger resolves that file keeping both changes.
- **Voice settings (owner edit 6, this lane's `lib/ai/settings.ts`):** French leaves the voice language options and
  `speechLanguage`; an old stored `'fr'` reads as the device default (never refused, never a lost record; frozen-reader
  test); EN/NL options `en-GB`, `en-US`, `nl-BE`, `nl-NL`. You own the voice UI and the new device key
  `zigoals:zigi-voice:v1`; the option list will be exported from `lib/ai/settings.ts` so the UI reads it, never a copy.
- **The relay must send and count exactly as the adapter (owner edit 5).** The rules land with Part 3 and are spelled
  out in the next entry: `cache_control` placement, `output_config.effort` (quick `low`, "Think deeper" `high`, never
  `thinking: disabled` on Opus 5.5), the usage fields (`input_tokens`, `output_tokens`, `cache_creation_input_tokens`,
  `cache_read_input_tokens`; thinking is billed as output) and `lib/ai/pricing.ts` as the single price table.
- **Part 5 will need two runner effects** (decision L8): `plan.navigate` (a route the card's Add opens) and
  `plan.confirm` (a route plus a marker that opens the app's own delete confirmation). The exact `Plan` fields come
  with Part 5's entry; until then the cards render through the generic card and Add shows the route to take.

## 2026-10-10 — Part 3: the Anthropic adapter's body rules, for the relay (owner edit 5)
`workers/zigi-relay/anthropic.mjs` must send the same shape and count the same way as `apps/web/lib/ai/adapters/anthropic.ts`
(Z-Local's, ADR-020 L2–L4). Read from platform.claude.com on 2026-10-10; the adapter's unit tests pin each rule.
- **Never `thinking: {type: "disabled"}` on Claude Opus 5.5 or Claude Sonnet 5.5: both answer 400.** The relay sends it
  today unless `ZIGI_THINKING=model-default` (`thinkingOff`, `anthropic.mjs:23,82`), so a relay on either model fails
  every request. Send no `thinking` field at all (adaptive thinking is the default on the 5.5 models) and control depth
  with `output_config: {effort: "low"}` for the quick reply and `{effort: "high"}` for "Think deeper" (the app's
  existing choice; never per model). A model that rejects `output_config` (a 400 naming it) gets the same request once
  more without it. Thinking tokens are billed as output tokens.
- **Prompt caching:** the system prompt goes as text blocks; the stable prefix (frame, day line, specialist, protocol,
  examples, label) carries `cache_control: {type: "ephemeral"}`, the page's records a second marker when they stand
  apart from the question's, and a top-level `cache_control: {type: "ephemeral"}` lets the API place its automatic
  breakpoint on the conversation's last block (at most 4 markers). The app will send the relay the blocks it builds
  (`lib/ai/context/specialists.ts` `buildSystemParts()`, texts that concatenate to the one system string); until the
  relay reads them, caching the whole system string as one block is correct and safe (a shorter-than-minimum prefix just
  makes no entry).
- **Usage:** `message_start.usage` carries `input_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`;
  `message_delta.usage` the cumulative `output_tokens`. The prompt is input + cache writes + cache reads; never add the
  cache counts into input. The relay already keeps the four (`anthropic.mjs:98`); the app's meter now keeps them too
  (`zigoals:ai-usage:v1` per route and month: `cacheWrite`, `cacheRead`, optional, loose).
- **One price table:** `apps/web/lib/ai/pricing.ts` (`PRICES`, `PRICES_AS_OF`, `estimateCost(model, usage, {batch})`):
  Opus 5.5 $4/$20, Sonnet 5.5 $2/$10, Haiku 5.5 $0.10/$0.50 per MTok; cache writes 1.25×; cache hits 0.05× on Opus 5.5
  and Sonnet 5.5, 0.1× on Haiku 5.5; Haiku's second rate card over 100,000 prompt tokens; the Batch API 0.5×. The
  relay's budget should cost from it (copy the table into the Worker from this file; never a second hand-typed table).
- **The meter's display (L5):** show cache writes and reads beside input and output per route; the money line stays the
  person's own prices (ADR-014), with one new control "Fill in the published prices (as of 2026-10-10)" that writes
  `publishedPrices(model)` into their price fields for Anthropic's three models. The estimate counts cached tokens at the
  person's input price (a ceiling; L9).

## 2026-10-10 — Part 1: the WebKit freeze (ADR-018 Y42), where it stands
- **Not reproducible on the Mac's WebKit 26.6, production build:** `zigi-auto-accept.spec.ts:42` (desktop) 30 of 30 and
  `:73` (phone) 30 of 30 alone; both 24 of 24 each under eight concurrent WebKit pages; the whole ZIGi suite in WebKit
  twice: 347 passed, 51 skipped, 0 failed, each run 11.3 min (the second on the build with Part 3 in it). CI's one trace
  (run 38016733216) says the page still answered a DOM snapshot 60 ms after the second reply had been received in
  full, then answered nothing for 37 s; the one request left unfinished is the "thinking" poster the figure asked for
  when the second message began (`T001-thinking-2x.webp`, no response ever recorded). Locally the same step asks for
  the 1x poster and finishes in 8 ms. The engine is the only difference that remains: Linux WebKit, where CI runs.
- **Nothing in your files was changed for it yet.** A looping regression spec with probes, `tests/webkit-zigi-freeze.spec.ts`
  (both scenarios, six rounds each, the state changes, every image decode and poster load, the model request, a
  heartbeat on the browser's own timers; the log attached to the test when a round overruns), passes here in WebKit
  (4 of 4, 21 s) and Chrome; it runs in your `web-webkit` CI job from this push on, so the next Linux failure names the
  last thing the page did. If that points at `components/zigi/zigi-image.tsx` (the `decode()` of the clip while the
  `<img>` swaps posters) or `zigi-avatar.tsx`, the minimal fix lands here as its own commit and this entry names the
  exact lines (owner edit 7); if it points at `proposal-list.tsx`, it lands in the render-free part of that file and
  the second merger keeps both lanes' changes. The owner checklist gets "in Safari on the Mac: ask ZIGi twice after an
  Undo; it must keep answering" (Remote Automation is off on this Mac, left as is).

## 2026-10-10 — Part 5: three runner effects for `use-proposals.ts` (decision L8), the brain side is in
`docs/product/ZIGI_ACTIONS_Z.md` maps every action in the app to a ZIGi path. Eight kinds landed in `lib/ai` (schema,
parser aliases, planner, edit fields, protocol lines, unit tests, corpus cases): `open-page`, `delete-record`,
`set-habit-state`, `vacation`, `unskip`, `remove-reminder`, `close-goal`, `reopen-goal`. Six write through the stores the
runner already updates. Two hand the runner an effect it does not perform yet; a third (`set-zigi-look`, later in Part 5)
will too. The `Plan` type (`lib/ai/actions/plan.ts`) now carries three optional fields, all with `target: 'form'` (so
`batchable` leaves them out and auto-accept never takes them; `AUTO_ACCEPT_NEVER` lists `delete-record` and `open-page`):
- `plan.navigate: {href: string; label: string}` — the card's Add opens `href` (`router.push`; a same-page hash set
  directly, as `openForm` does for the balance form). Status text to show: "Opened: <label>".
- `plan.confirm: {href: string; what: string; id: string; label: string}` — the card's Add opens the record's page and
  that page's own delete confirmation for the record with id `id` (`what` is one of `DELETE_TARGETS` in
  `lib/ai/actions/schema.ts`: habit, goal, water-entry, weight, diary-entry, food, recipe, meal-plan, counter, night,
  session, fast, link, widget, note). The card deletes nothing; the person confirms on the page. How the page is told
  is yours (a hash such as `#confirm-delete=<what>:<id>` read once, or an event); the brain only names the record.
  Status text: "Opened the confirmation on <label>".
- `plan.device: {key: string; patch: Record<string, unknown>}` (landed with `set-zigi-look`, below) — one of ZIGi's own
  device records (`zigoals:zigi:v1`) updated through `useDeviceRecord(...).update(o => ({...o, ...patch}))`. The patch
  holds only top-level record keys (`skin`, `animation`, `side`, `size`, `greeting`, `edgeTab`); `knock`, when present,
  is a partial of the knock object to merge (`{enabled: boolean}`), never a replacement. The plan's `undo` is null (the
  brain does not know the previous values); the card says Settings → ZIGi · your AI changes it back. Status text:
  "ZIGi's look changed".
Today `openForm` returns false for such a plan and the list shows "The values could not be handed over; type them into
the form.", which is wrong for these three; please branch on `plan.navigate` / `plan.confirm` / `plan.device` before the
pre-fill branches. Until then, each card's lines name the route ("Opens /app/health?view=sleep"), so nothing misleads.

## 2026-10-10 — Part 5, batches 2 and 3: Health, Today, the week, Settings, ZIGi's look, two money forms
Twenty-one more kinds are in `lib/ai` (schema, aliases, planner through the pages' own mutators, edit fields, protocol
lines, unit tests in `lib/ai/actions/plan-z.test.ts`, corpus cases in `corpus-part5.ts`); the table in
`docs/product/ZIGI_ACTIONS_Z.md` is current. Nineteen write through the stores the runner already updates (`health`,
`settings`, `weekly`), nothing new for the runner there. Two more need it:
- **`set-zigi-look`** (`plan.device`, above). Optional, and worth doing: pass the current look to the planner as
  `env.zigi = {prefs: zigiPrefs(record), skins: Object.keys(manifest.skins)}` (`Env.zigi`, type `ZigiLookEnv` in
  `lib/ai/actions/plan.ts`). With it the planner drops fields that already hold the asked value, refuses a card that
  changes nothing ("ZIGi already looks like that.") and refuses a look name the build does not have. Without it every
  asked field is written as given, and an unknown look name reaches the record (the shell shows the default skin for
  it, as `readZigiLook` already does).
- **`prefill-contribution`** and **`prefill-account`** (money: a form, never a write; both in `AUTO_ACCEPT_NEVER` and
  in `PREFILL_KINDS`, so `WRITING_KINDS` leaves them out). The plan carries `plan.contribution` (`{goalId, goal,
  amount, asset, date, note?}`) or `plan.account` (`{name, accountKind, currency?, institution?, balance?,
  ratePercent?, date}`). The stash module is `lib/ai/actions/form-prefill.ts`, the shape of `balance-prefill.ts`:
  the runner calls `stashContributionPrefill(plan.contribution)` and opens `contributionPrefillRoute(goalId)`
  (`/app/goals/<id>#funding-wealth`), or `stashAccountPrefill(plan.account)` and opens `ACCOUNT_PREFILL_ROUTE`
  (`/app/wealth#accounts-title`), then dispatches `CONTRIBUTION_PREFILL_EVENT` / `ACCOUNT_PREFILL_EVENT` so a page
  already on screen reads it. The goal's funding form (`components/platform/contribution-flow.tsx`) and the accounts
  section (`components/wealth/accounts-section.tsx`) are yours: each calls `take…Prefill()` once on mount and on the
  event, fills its own fields (amount in the goal's asset; name, kind, currency, institution, opening balance on the
  date, the person's rate) and forgets the stash; ten-minute expiry, malformed records dropped, nothing saved until the
  person saves. Status text as the balance hand-off: "Opened the form with the values filled in".
- Nothing else changed in the request body or the runner contract. `set-today-preset` writes `settings` through
  `applyDashboardPreset` (widgets outside the preset hidden, never deleted); `set-page-visibility` and `set-start-page`
  write the `pages` group; `set-wrap-up` the `wrapUp` group; `edit-link` the `links` group; `skip-review` and
  `set-review-weekday` the `weekly` store (the weekday travels as its English name in the action, `WEEKDAY_NAMES`,
  and is written as the store's number).

## 2026-10-10 — Part 4: spoken English and Dutch (ADR-020 L6), and the voice languages (owner edit 6)
- **Nothing to wire on your side.** The normaliser (`lib/ai/spoken/normalize.ts`) runs inside the entry points you already
  call: `detectIntent`, `translateCues`/`questionCalls`, `localAnswer`, `navigationIntent`, `dayCue`/`applyDayCue`. The
  message the person sees and the model receives stays their exact words; only the device-side readers see "log 2.5
  litres" for "log two and a half litres, um, no wait, three". `applyDayCue` now also applies the spoken quantity to a
  log card that missed or misheard it (`lib/ai/actions/quantity-cue.ts`), so your one call in `use-chat-session.ts:306`
  covers both cues; the harness calls the same function.
- **Voice languages (yours to render, mine to define).** `VOICE_LANGUAGES` in `lib/ai/settings.ts` is the list for the
  voice-language select: `en-GB`, `en-US`, `nl-BE`, `nl-NL`, with labels. French is gone; a stored `fr…` choice reads as
  the device default through `readAiSettings` (never refused, never a lost record; frozen-reader test in
  `settings.test.ts`). `speechLanguage` in `lib/ai/voice.ts` has no French branch, so it needs no change; please build
  the select from `VOICE_LANGUAGES` and show "Device default" for `null`. If your new device key `zigoals:zigi-voice:v1`
  carries a language too, the same rule applies there (read `fr…` as default).
- The protocol gained one sentence about spoken asks (fillers, number words, self-corrections); the request body is
  otherwise unchanged.
