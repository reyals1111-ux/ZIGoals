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
