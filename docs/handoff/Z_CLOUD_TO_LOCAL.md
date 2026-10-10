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
