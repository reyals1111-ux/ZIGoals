# Session AM — resume file ("NOVA, ALWAYS ON")

Read this first after a pause; continue from "Next" without asking. Branch `feature/session-am-nova`, Draft
[PR #101](https://github.com/reyals1111-ux/ZIGoals/pull/101). Rules: CLAUDE.md, the owner's brief (in ADR-038), ADR-038 D1–D22.

## Environment notes (cloud sandbox)
- Node 24.19.0 through nvm: `export PATH=/opt/nvm/versions/node/v24.19.0/bin:$PATH` (install once: `source /opt/nvm/nvm.sh && nvm install 24.19.0`). `pnpm install --frozen-lockfile --ignore-scripts`.
- Dev server: `NEXT_PUBLIC_APP_ENVIRONMENT=LOCAL_DEMO pnpm dev` (3100). `next dev` rewrites `apps/web/AGENTS.md` and `next-env.d.ts`; restore them before a commit (`git checkout -- apps/web/AGENTS.md apps/web/next-env.d.ts`).
- Browser checks: Playwright Chromium only, at most 2 workers, one run at a time. `/opt/google/chrome/chrome` exists here. WebGL works headless (SwiftShader).
- Owner references: `git fetch origin review/session-am-refs` (REFERENCES.md and `grok/`); captures stay out of the repo.

## Preview now (A8; added after parts 2–4 were pushed, 11 Nov)
1. `NEXT_PUBLIC_APP_ENVIRONMENT=LOCAL_DEMO pnpm dev`, open http://127.0.0.1:3100/app/nova on a computer (an empty profile shows the calm stage: the star alone).
2. Settings → Load Showcase Demo, then open NOVA again (the Command arrangement around the star, labelled as the Showcase's).
3. Three requests to try in the command bar (or tap the chips above it):
   - "Show my habits this week" (a cyan lattice is made beside the star; Pin, Hide and Close are in its header or under "More").
   - "Show my net worth" (gold; the answer appears under the star, "Answered on this device · no AI used").
   - "What's my weight progress this month?" (the Showcase keeps Health off for NOVA, so the widget is made *locked* and says which switch; turn Health on in NOVA → Permissions and in Settings → ZIGi to see it in magenta with hearts).
   Also: "clear the stage" (with Undo), "pin the net worth", "Sluit alles".
Not in yet at this checkpoint: the weather widget's look (the MET Norway client is being built), the side bars' redesign, the model's widget tool, sync, the phone pass, the specs.

## Done
- **Part 0** `30c867f9`: STATUS records; frozen readers #37–#54.
- **Pre-work** `d4035415`, plan and amendments `b7d15637`: art direction, ADR-038 (O1–O5, A1–A8, D1–D22), this file.
- **Part 1** `803d8dc2` (TIER 3 stored format: `zigoals:nova-stage:v1`, `zigoals:nova-world:v1` in every registry; backup format 4 kept; frozen readers #37–#54 pass), `30d6112b` (the summon step, EN/NL families, stage commands, sixteen new widget kinds with gates).
- **Parts 2–4, first pass** `14a4316c`, `e7936fa6`: the widget kit (`components/nova/cards/kit.tsx`), Health/Habits/Goals/Journal/Time/Wealth widgets and NOVA's own three, the WebGL star system (`components/nova/core`, `lib/nova/core`), the live stage (`components/nova/stage`: use-stage, use-summoner, stage-parts), D2's calm default, cut-corner frames, the Showcase's request history.

## In progress
- Helpers: the MET Norway client + CSP host (lib/nova/world, egress policy; TIER 3 CSP/egress commit of its own), the `nova` sync section with the old-Worker proof (TIER 3 sync commit of its own), the last four life widgets' polish.
- Lead: side bars (part 5), then the model's widget tool (part 6).

## Still open inside parts 2–4
- The weather and sun widgets' bodies (on the helper's client), the mic in the command bar, specs for the new stage (D2 changes to existing specs are deliberate and marked).
- Decided: the Showcase opens on its Command arrangement (existing HUD specs depend on it) and seeds a request history; made widgets stand in front of pinned ones; a made Health widget is locked while NOVA's Health permission or the device's Health gate is off.

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
