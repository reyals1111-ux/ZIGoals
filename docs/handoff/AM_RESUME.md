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
- The plan is presented to the owner once; work starts after the one approval.

## Next (the plan's parts, in order)
1. Summon step and the stage record (`lib/nova/summon`, `lib/nova/stage`), stored-format registries (TIER 3 stored format).
2. The widget kit and the widgets made on request (`components/nova/cards`).
3. The centre node (`components/nova/core`, WebGL star system, fallbacks, governor).
4. The live stage: calm default (D2), command bar with one-tap requests and voice, answer in place, made/pinned/hidden/closed, dock, Showcase stage.
5. Side bars: everything in the app (left); behind the intelligence, Requests and pins (right).
6. The agent with a model: lookups → widgets, weather lookup, confirm cards on the stage.
7. Outside data: MET Norway behind its switch (TIER 3 CSP/egress).
8. Sync: the `nova` extras section (TIER 3 sync), the Alpha's "on this device only".
9. Phone chat agent; tablet check.
10. Setup guide and rename label; user guide.
11. Interconnection, performance and motion proofs, accessibility, specs.
12. Reviews (design, security), hosted verifier stage 13, `AM_DEMO_TOUR.md`, STATUS.
