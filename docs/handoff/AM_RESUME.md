# Session AM — resume file ("NOVA, ALWAYS ON")

Read this first after a pause; continue from "Next" without asking. Branch `feature/session-am-nova`, Draft
[PR #101](https://github.com/reyals1111-ux/ZIGoals/pull/101). Rules: CLAUDE.md, the owner's brief (in ADR-038), ADR-038 D1–D22.

## AM-2 — "NOVA, STUNNING" (a visual pass on this branch; read this section first)
The owner's brief and the approved plan are in ADR-038 "AM-2" (approval items 1–8, additions B1–B3, decisions E1–…). Order of work: (a) the star → (b) the hologram frame and Close/Hide/Pin on every widget → (c) the instruments → (d) the stage, side bars, top bar, command bar, answer → (e) phone, conversation, setup → (f) critique rounds against the 43 references → (g) production build, specs, B2 proofs, weights → (h) ADR-038 AM-2, `AM_DEMO_TOUR.md`, STATUS (final commit), the report. Rules: push after each part and at least every 45 minutes; lint, typecheck, focused tests before each push; every NOVA CSS change regenerates the theme sheets (`node scripts/themes/build-themes.mjs`); never merge, deploy or dispatch.

**Environment for AM-2 (this sandbox had no nvm):** Node 24.19.0 unpacked from nodejs.org into `/opt/node24` (`export PATH=/opt/node24/bin:$PATH`); `NODE_OPTIONS=--max-old-space-size=8192 pnpm typecheck`; captures with a small Playwright script in the scratchpad (never in the repo); the star's workbench renders `lib/nova/core/star-shader.ts` on a blank page.

**Done so far:** (a) the star: portable shader, read-back proof, the new pace rules, the still picture, the honest line, the capture switches, `tests/nova-stage-am2.spec.ts` (six star specs).
**Next:** (b), then on down the list above.

### Preview now (star) — B1, for the owner's Mac
1. `git fetch origin && git checkout feature/session-am-nova && git pull`, then `pnpm install --frozen-lockfile --ignore-scripts`.
2. `NEXT_PUBLIC_APP_ENVIRONMENT=LOCAL_DEMO pnpm dev`, then open **http://127.0.0.1:3100/app/nova?star=why** in Chrome, and the same address in Safari. (A fresh profile or a private window avoids an older NOVA record; if NOVA shows ZIGi's face in the centre, choose the star again under Make it yours.)
3. **What you should see:** in the centre a large violet–magenta spiral galaxy with a white core, a thin blue streak through it, a dark planet with a lit rim on its orbit and a small moon, slowly turning; under "STANDBY" the line **"The star is running"** and below it something like `active · 30 fps · tier 0 · 840 px · ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Max, …)` in Chrome, or `… · Apple GPU` in Safari. Tap the star and type a question: the arms wind tighter while it thinks. Without `?star=why` the line is hidden while the star runs at full pace.
4. **If the galaxy is not turning, or not there, read back three things:** (i) the line under STANDBY, word for word (for example "Still picture: the graphics driver drew an empty frame", "Slow star: frames arrived late on this device", "Still star: your device asks for reduced motion"); (ii) the small grey details line under it (pace, tier, size, renderer name); (iii) which browser, and whether the Mac was on battery or in Low Power Mode. A still galaxy *picture* with a "Still picture: …" line means WebGL could not draw it and the fallback worked; an empty centre with "The star is running" would be a new finding.
5. The other lines can be tried on purpose: Settings → Motion → Off ("Still star: Motion is Off in ZIGoals"); macOS System Settings → Accessibility → Display → Reduce motion ("…your device asks for reduced motion"); Motion → Calm ("Slow star: Calm motion is on").
The rest of NOVA still has AM's look at this checkpoint; the overhaul of the widgets and the stage follows in the next pushes.

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

## Done since the preview checkpoint
- **Part 6** `cf43a6e3` (TIER 3 AI safety): the model's `stage_widget` tool and `weather` lookup on NOVA's surface only; the A4 proof; the gentle cards' rules.
- **Part 7** `bbdad363` (TIER 3 CSP/egress: `https://api.met.no` only; the MET Norway client, city list, words), `652b6f56` (the weather and sun widgets, the Permissions switch with the place picker), `76f48de7` (docs/PRIVACY.md, landing/privacy.html).
- **Part 8** `c544c922` (TIER 3 sync: the optional `nova` extras section with the old-Worker proof; backup format 4; rollback notes in ADR-038).
- **Parts 5, 9, 10, 11** `ac1984cf`: the side bars (go-to, Requests, On the stage, Your choices), gentle cards wired, the phone path (answers in words; requests kept for the computer), NOVA in its own window (no manifest change), the mic, the rest rule.
- ADR-038 D23–D34 record every decision made after the approval.

## Done in the finish (11 Nov; everything is committed and pushed)
- **Reviews:** `docs/review/session-am/AM_SECURITY_REVIEW.md` (13 findings, none Critical or High; all closed, ADR-038 D35) and `NOVA_AM_DESIGN_REVIEW.md` (40 findings; the 3 blockers and 20 of 23 majors fixed, 3 majors partly; ADR-038 D40).
- **Security fixes:** `98b1afb5` TIER 3 (sync), `ddff3472` TIER 3 (stored format, CSP/egress), `d83c8ff0` TIER 3 (AI safety), `3abf5068` (privacy text).
- **Design fixes:** `63d95b2a`, `e3d57efe`, `718c2ce7` (answers with figures and the engine-first rule; the star's states, beam, sharpness and disc; a widget keeps its side; the widget head, weather, sun, time, notices; the stage layout, the docked conversation, the phone), `3a8eaf97` and the commit after `259c9363` (software rendering gets the still star), `259c9363` (log lines stay the engine's; three columns only from 900 px of stage).
- **Browser specs:** first pass `a15d2273`, second pass on the production build in the commits after it (`tests/nova-am.ts`, `tests/nova-stage-am.spec.ts` and twelve updated specs, each change marked deliberate).
- **Proofs** (ADR-038 "Proofs on the production build"): weights `/app/nova` 434.3 kB of 458; hud-perf at CPU 4× 16.7 ms median; hidden tab 0 frames; 140 NOVA specs on desktop.
- The hosted verifier's stage 13 (`b496d275`, `e9d79f52`), the user guide (`2218e518`), the demo tour (`9f82a35d`, `d05c49fb`).

## What is left for a next session (also in STATUS "Not done")
- The weather caching proxy (carried). A true net-worth widget. Figure sentences for nine older widgets. Row-dropping thresholds of three HUD panels in narrow columns. The design review's partly-done items (D4, D17, D26, D27, D28, D34, D36, D40). The running star on real graphics hardware (not measurable in the cloud sandbox).

## If CI is red on the final head
- Known intermittents and their rule (one re-run): STATUS "Known CI intermittents (this session)". A second failure of the same test means investigate (at most two fix attempts, then record it).
- Local reproduction: `NODE_OPTIONS=--max-old-space-size=8192 NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build`, stop any `next-server` process, `pnpm --filter @zigoals/web start`, then `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 pnpm --filter @zigoals/web exec playwright test <spec> --project=desktop --workers=2 --trace off`. In the sandbox the build's type-check needs the larger heap, and the browser draws WebGL in software (the star is its still frame, `data-star-software`).

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
