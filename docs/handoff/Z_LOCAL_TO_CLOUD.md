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
