# Session AM — resume file ("NOVA, ALWAYS ON")

Read this first after a pause; continue from "Next" without asking. Branch `feature/session-am-nova`, Draft
[PR #101](https://github.com/reyals1111-ux/ZIGoals/pull/101). Rules: CLAUDE.md, the owner's brief (in ADR-038), ADR-038 D1–D22.

## Environment notes (cloud sandbox)
- Node 24.19.0 through nvm: `export PATH=/opt/nvm/versions/node/v24.19.0/bin:$PATH` (install once: `source /opt/nvm/nvm.sh && nvm install 24.19.0`). `pnpm install --frozen-lockfile --ignore-scripts`.
- Dev server: `NEXT_PUBLIC_APP_ENVIRONMENT=LOCAL_DEMO pnpm dev` (3100). `next dev` rewrites `apps/web/AGENTS.md` and `next-env.d.ts`; restore them before a commit (`git checkout -- apps/web/AGENTS.md apps/web/next-env.d.ts`).
- Browser checks: Playwright Chromium only, at most 2 workers, one run at a time. `/opt/google/chrome/chrome` exists here. WebGL works headless (SwiftShader).
- Owner references: `git fetch origin review/session-am-refs` (REFERENCES.md and `grok/`); captures stay out of the repo.

## Done
- **Part 0** `30c867f9`: STATUS records; frozen readers #37–#54.
- **Pre-work:** `docs/design/NOVA_AM_ART_DIRECTION.md`, `docs/architecture/ADR-038-session-am.md`, this file. A shader prototype of the centre node was rendered in the sandbox (spiral, core, rim-lit planet, light streak, four states).

## In progress
- The plan was approved on 11 Nov with amendments A1–A8 (verbatim in ADR-038; the approved plan's parts are the list below). No more questions: decide and record in ADR-038.
- Part 1 (summon step and stage record).

## Next (the plan's parts, in order)
1. Summon step and the stage record (`lib/nova/summon`, `lib/nova/stage`), stored-format registries (TIER 3 stored format).
2. The widget kit and the widgets made on request (`components/nova/cards`).
3. The centre node (`components/nova/core`, WebGL star system, fallbacks, governor).
4. The live stage: calm default (D2), command bar with one-tap requests and voice, answer in place, made/pinned/hidden/closed, dock, Showcase stage.
5. Side bars: everything in the app (left); behind the intelligence, Requests and pins (right).
6. The agent with a model: lookups → widgets, weather lookup, confirm cards on the stage.
7. Outside data: MET Norway behind its switch (TIER 3 CSP/egress).
8. Sync: the `nova` extras section (TIER 3 sync), the Alpha's "on this device only".
9. Proactive cards (opt-in) and "Keep made widgets until I close them" (A5).
10. Phone chat agent; tablet check.
11. Standalone app (A3), setup guide and rename label; user guide.
12. Interconnection, performance and motion proofs, accessibility, specs (every A1 item on the new stage).
13. Reviews (design, security), hosted verifier stage 13, `AM_DEMO_TOUR.md`, STATUS.
After parts 2–4: add "Preview now" to this file (A8). The agent's widget tool (A4) is in part 6; the old-Worker sync proof (A6) in part 8; MET rules and privacy docs (A2) in part 7.
