# Handoff: Session Y-Cloud → Session Z

**Session Y's branch:** `feature/session-y-cloud` (the owner-named branch; no fallback was needed). Draft PR: see the
branch on GitHub. Base: `main` `e30b7c6` (Alpha #34).

Items Session Z needs to know from Session Y. Y never edits a path Z claims in `docs/handoff/Z_TO_Y.md` (read at every
Y gate on any `origin/feature/session-z*` branch). Dated entries, newest last. Evidence labels as in docs/STATUS.md.

## 2026-10-09 — opened (Part 1)
### Paths Session Y owns (please don't edit; ask here or in Z_TO_Y.md)
- **Records:** `docs/STATUS.md` (Y's entries, the #33 and #34 deploy records and "Release identity"; Y alone records
  deploys #33 and #34), `docs/architecture/ADR-018-session-y.md`, this file, `docs/verification/y-cloud/**`.
- **Docs:** `docs/product/PERSONA_DECISIONS_Y.md` (new), `docs/product/ZIGI_ALIVE_X.md` (the iPhone checklist only),
  `docs/security/THREAT_MODEL.md` (new sections "Session X-Local changes" and "Session Y changes", one corrected row),
  `docs/business/LEGAL_CHECKLIST.md` §10, `docs/dependencies/**`, `docs/run11/FINAL_ACCTEST_REDEPLOY.md`,
  `docs/run11/STAGE8_OWNER_RUNSHEET.md`, `docs/PRIVACY.md` (one draft sentence, owner wording),
  `docs/verification/x-cloud/HUMAN_TEST.md` (a new "Pass 3 (live #34)" section only).
- **CI:** `.github/workflows/ci.yml` (a WebKit job; possibly a time-zone step in the integration job),
  `apps/web/playwright.webkit.config.ts`, `apps/web/tests/webkit-*.spec.ts`.
- **Sync and accounts (Tier 3):** `apps/web/lib/vault/**`, `apps/web/components/vault-sync-controls.tsx`,
  `apps/web/components/vault-sync-panel.tsx`, `apps/web/lib/server/private-account.ts`, `apps/web/lib/vault-*.test.ts`,
  `workers/private-sync/**` only if B3 needs it, `scripts/run11/*sync*`, `scripts/run11/stage8-rehearsal/**`.
- **Time:** `apps/web/lib/fasting/**`, `apps/web/components/health/use-fasting.ts`, `fasting-timer.tsx`,
  `apps/web/components/use-local-today.ts`, `use-health-today.ts`, `apps/web/lib/local-date.ts`,
  `apps/web/lib/journal-zone.ts`, the time and hydration specs (`fasting`, `health-midnight`, `timezone-*`, new
  `hydration-zone*`).
- **Tests Y root-causes:** `apps/web/tests/push-reminders.spec.ts`, `run11-recovery-failures.spec.ts`,
  `run10-widgets.spec.ts`.
- **Small features:** habits vacation and the habit card's −/+ controls (`components/habits/vacation-panel.tsx`,
  `habit-card.tsx`, `use-habits.ts`, `lib/habits.ts` vacation helpers), the Wealth asset editor
  (`components/platform/asset-editor.tsx`, `lib/positions.ts` manual-unit path).
- **Accessibility:** a shared field-error helper and the forms it is applied to (Goals wizard and edit, habit editor,
  Wealth asset/accounts forms, Health entry forms, time-zone and wrap-up settings), file-input and radio CSS
  (`app/globals.css` and the local rules), `tests/a11y-audit.ts`, `packages/ecosystem-registry/src/providers.json`
  notes, `lib/visual-format.ts` `written()`, `components/progress/glass-progress.tsx`.
- **Owner tooling:** `scripts/run11/stage7-preflight.mjs` and its test.
- **Shared, merged by whoever lands second:** What's new (`lib/whats-new.ts` and its card), Help, `scripts/weight-budgets.json`.

### ZIGi's paths (`components/ai/**`, `lib/ai/**`, `components/zigi/**`)
Not claimed by Y. Y's Part 4 is an independent security review of ZIGi's lane plus an API-key handling review. If Z
claims ZIGi, Y puts medium findings here as handoff items instead of editing; high or critical findings, and any
medium+ finding in API-key handling (owner instruction), are fixed by Y and announced here.

### What Y does at every gate
`git fetch origin`; read `docs/handoff/Z_TO_Y.md` on any `origin/feature/session-z*`; never edit a path Z claims; update
this file. If Z's PR merges into `main` first, Y merges `main` in with a merge commit and carries the shared items.

## 2026-10-09 — Part 4: ZIGi's security review (announced; ZIGi was unclaimed)
No `feature/session-z*` branch existed when the review finished, so Y fixed every medium-and-above finding in ZIGi's
lane, and the API-key one (owner edit 5). Details and evidence: `docs/verification/y-cloud/SECURITY_REVIEW_Y.md`.
- **Changed in ZIGi's files** (please build on these, not around them):
  - `components/ai/use-chat-session.ts`: `claimFresh(turnId)` (a reply may be auto-added once, when it arrives);
    `handlesFor` gives `staleHandles(...)` for a turn whose handles are no longer in memory; `send` drops a photo and
    Health-gated records on a resend once Health is no longer shared (`ExtraData.health`).
  - `components/ai/proposal-list.tsx` (`claimAuto` prop; no auto-accept for a replaced reply; a slot is reserved before
    each automatic write), `components/ai/use-auto-accept.ts` (`reserve(kind)` replaces `note()`),
    `components/ai/ai-chat.tsx` (passes `claimAuto`), `components/ai/ai-settings.tsx` (Disconnect forgets every key of
    the account), `lib/ai/handles.ts` (`STALE_HANDLE`, `staleHandles`), `lib/ai/actions/plan.ts` (`writableGoal`;
    `edit-goal`, `edit-habit`, `add-goal-note`, `add-milestone` write onto the current record).
  - Tests: `lib/ai/auto-accept-once.test.ts`, `lib/ai/actions/plan-current.test.ts`, `lib/ai/resend-gate.test.ts`, one
    new test in `tests/your-ai.spec.ts`.
- **Left for ZIGi's lane (low/info, not fixed here):** F5 (the hint marker and `repairJson` are quadratic on a degenerate
  reply), F6 (nested hint markers survive the strip), F7 ("10,000" read as 10), F8 (first-word name match for writes),
  F9 (Health/Wealth widgets, diet notes and any-host links stay auto-accept eligible with Health closed), F10 (context
  pack Summary escaping), F11 (Stop during the repair round), F13 (`autoAccept` not strict), F14 (equivalent cards not
  deduplicated), F15 (the Alpha gate's proof plan), F16 (no headers timeout). Reproductions are in the review document.
