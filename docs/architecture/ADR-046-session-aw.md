# ADR-046 — Session AW: "FINISH LINE"

Status: in progress (25 Nov 2026). Branch `feature/session-aw-finish-line` from `main` `8fa8aa1d` (Alpha #59, PR #109
merged). Draft PR "Session AW — Finish line". Resume file: `docs/handoff/AW_RESUME.md`. Reviews and walks:
`docs/review/session-aw/`.

## Why this session exists
The last big session before the friends Alpha: after it, the owner does every manual step once (OWNER_STEPS.md, Part 7).
Nothing a session can do may be left open.

## The brief (owner, 25 Nov 2026, verbatim)

SESSION AW — "FINISH LINE" (Claude Code cloud, Opus 5.5, effort High). The last big session before the friends Alpha: after it, the owner does every manual step once. Nothing a session can do may be left open.

START
1. Pull the latest main (expected `8fa8aa1ddc4edd6243c87621b4775f7897410964`, Alpha #59) and create `feature/session-aw-finish-line`. Open a Draft PR "Session AW — Finish line".
2. Read CLAUDE.md, apps/web/AGENTS.md, CONTRIBUTING.md, SECURITY.md, docs/STATUS.md, ADR-045 (both closing tables), and in docs/review/session-av/: LEDGER.md, COMPETITORS.md, UNFINISHED.md, QUALITY.md, FRIEND_READINESS.md. Also docs/review/session-al/CI_INTERMITTENTS.md and docs/friends-alpha/OWNER_STEPS.md, FIRST_WEEK.md and FRIENDS_GUIDE.md.
3. Plan mode once, with one owner approval; after that no questions. Record the plan, the approval and any amendments verbatim in ADR-046. Keep docs/handoff/AW_RESUME.md current (done / in progress / next / team), with "Safe to merge now: yes/no (CI run N)" at every part, also in the PR description.

EXIT CRITERIA (the session ends only when all hold, or the owner writes "wrap up")
E1 CI: two consecutive full runs on the final head green on the first attempt. Fallback, defined now: the last full run is green except jobs that failed only on a registered known intermittent and passed on their one allowed re-run, each named exactly. A red job blocks the end, whoever caused it.
E2 Every row has its own verdict: LEDGER round 7 (#432–#464), every Carried or "built in part" row in LEDGER.md, every open or Carried row in UNFINISHED.md, QUALITY.md and FRIEND_READINESS.md. A verdict is built (commit) / already have (file, opened) / Carried with a cause from this list only: needs an outside service; needs a model; native-only; against a named rule; a new dependency the owner declined; a protected area outside FR-TJ-7; 2 failed attempts. "Effort", "time", "low priority" and "not daily" are not causes.
E3 A fresh-agent check (a reviewer helper who did not write the code) on every batch, with all Blockers and Majors fixed.
E4 The persona walks of Part 3 pass at 390 and 1440.
E5 Records and docs (Part 8).

PART 0 — RECORDS
- Alpha #59 = Manual Alpha deployment run 62, from main 8fa8aa1ddc4edd6243c87621b4775f7897410964 (merge of PR #109), 24 Nov 2026: new version 3a68c327-91c0-490a-b909-c04912b3695e, rollback f2729d28-e9db-436f-a66a-67922cf5d924 (#58), VERIFIED after 3 reads, live prices VERIFIED, build archive SHA-256 29d0a5f2f2548b4a932419f29920413afa1d99a48ddfa5f45c23eb384cac1925, the market policy warning (period ends 2026-11-30T16:00Z).
- PR #103 is closed. Add #59 = 8fa8aa1d to the frozen readers (#37–#59). STATUS Part 0 entry; ADR-046 and AW_RESUME created.

PART 1 — OWNER DECISIONS (22–25 Nov; build exactly these)
a. kcal on manual activities: no estimated calorie burn anywhere. A manual activity shows its minutes, distance and effort. Calories appear only when the person typed them or an imported file carries them, labelled with their source ("from your file", "you entered"). Estimated maintenance on the energy card stays (owner, AK 4.5), labelled "estimate, not medical advice".
b. Passkey unlock (#41): not now. Carried as "owner: Beta". The device lock stays as it is.
c. New dependencies: declined for Mermaid, KaTeX/MathJax, pdf.js and Tesseract (#274, #322, #368, #443). Carried with "a new dependency the owner declined". Their fallbacks stay readable: code, text, the browser's own PDF viewer.
d. Content made for ZIGoals: YES to written content in the repository, NO to recorded audio or video.
 - Write programmes as text: a 4-week beginner strength plan, a 0→5 km running plan in 8 weeks, a 14-day habit starter, a 7-day sleep reset, and a 10-day meditation starter from the written guides.
 - Each programme gets days and steps, progress, Showcase and Help. Every health programme says "general guidance, not medical advice; stop if something hurts". Nothing promises a result.
 - Add "Read aloud" with the device's own voice (Web Speech `speechSynthesis`: no dependency, offline, nothing sent) for written meditations, stretches and programme steps. Offer it only where the browser has a voice; Motion Off and reduced motion are unaffected.
 - Habitica classes and skills stay Carried (game content, game layer off by default).
e. FR-TJ-7: APPROVED as a scoped change inside the protected Habits baseline, phone and desktop.
 - Today's habits and their Complete buttons come first.
 - Empty morning/afternoon/evening groups fold into one "Add a habit" line.
 - Cards with nothing to show yet ("Your week in motion" at all 0, "Trend per habit · Not enough days yet") stay hidden until there is data, with one teaching line instead.
 - Same visual language, hero and card styles. Nothing else in the baseline changes.

PART 2 — STABILISE (CI and real-phone speed)
- Speed on slow devices: measure first load and time-to-interactive of Today, Habits, Health, Wealth, Tasks, Journal, Settings and NOVA on the production build. Use Playwright Chromium with CPU throttling 4× and a phone viewport, before and after, and record it in ADR-046.
 - Fix the worst at the cause: Settings' first scripts and hydration (the WebKit slow-load class: `zigi-voice-z:199`, `zigi-alive:54`), and NOVA's start on a busy machine (`nova-dashboard:210`, the D36 family). Use lazy sections, less work before first paint and no blocking timers.
 - Route budgets are never raised; keep ≥ 5 kB headroom everywhere.
- Every registered or recorded intermittent gets fixed at its cause, at most 2 attempts each: the WebKit slow load, NOVA's slow start, `zigi-browser-agents:126`, `earn-guide-zigi:54`, `sign-in-codes-browser` after A45-1, D34, D-SYNC. A fixed one is removed from the registry with its evidence.
- CI headroom (TIER 3 CI): no WebKit or main shard over 45 min on the slowest measured runner. Add WebKit shards (4 → up to 6) or rebalance by measured minutes; keep the 60-min limit and 2 workers.
- Suite health: merge duplicate or overlapping specs only where the replacement is equally strict (labelled deliberate), so worker-minutes drop. No spec loses an assertion; no check is narrowed (axe scope, timeouts, assertions).

PART 3 — SIMPLICITY PASS (calm first screens, no redesign)
- For Today, Goals, Habits, Health, Wealth, Tasks, Journal, Notes, Agenda, NOVA's entry and Settings, at 390 and 1440, empty and Showcase:
 - the pillar's main action (log, complete, add, check) is visible without scrolling more than one screen on a phone;
 - cards that would show nothing, 0 or "not enough data" stay hidden until they have data, replaced by one teaching line;
 - optional and advanced tools sit behind each section's "More" or "Customise", never deleted;
 - no new card is added to a first screen.
- Settings: groups in a clear order, plus a search that finds every setting by its name and common words (EN and NL).
- Help search: finds every feature by its own name and by the competitor's common name ("snowball", "time blocking", "streak freeze"…). Each Help entry says where to find the feature.
- "Your first five" and first-run guidance updated, so each persona (Sanne, Tom, Lina, Max, Jules) reaches their daily core in under a minute. What's new stays short and grouped.
- Measure it with fresh persona walks, before and after: taps and scroll depth to the main action per pillar. Write them to docs/review/session-aw/SIMPLICITY.md.
- Protected areas stay untouched (Today hero and slogan, Checklist orbit path, footer finale, swan intro, Light's dark islands, shell navigation, Governance hidden by default, the locked ZIGi look, AR's NOVA composition), except FR-TJ-7 as scoped in Part 1e.

PART 4 — ROUND 7 (LEDGER #432–#464)
Build all 31 "to build" rows (Amazing Marvin, Due, Evernote, The Five Minute Journal, Strides, Paprika, Happy Scale, Sleep as Android, Cashew, Money Manager). The drafts from AV exist only on its local branches: rebuild from the ledger rows. Each row is built to the definition of done:
- reachable from its natural place, with an empty state that teaches;
- 320/390/1440 in Nebula, Light, Dark, pure black and high contrast;
- keyboard and axe clean, Motion Off and reduced motion still;
- every new record in export, erase, backup/restore, the catalogue and sync consent;
- where it holds data, NOVA/ZIGi answer about it (corpus case EN + NL);
- a labelled Showcase example, Help and a grouped What's new line;
- unit tests and a spec, route budgets kept (lazy chunks).
New rows land behind Part 3's rules: no new first-screen cards.

PART 5 — EVERYTHING CARRIED, ONCE MORE
Re-read every Carried and "built in part" row (LEDGER, UNFINISHED, the three QUALITY batch-1 Minors, FRIEND_READINESS' 15 Carried and 3 Partly Minors) and every open item in ADR-045. Build what is possible now, and give the rest its E2 cause.

PART 6 — TRUST AND FRIEND-READINESS, FINAL
- Export → erase → restore round trip for every record kind incl. #59's and AW's.
- Encrypted backup restore across #58 → #59 → this head; frozen readers #37–#59 green.
- The privacy page matches what the app really sends.
- Fresh-agent persona walks of all five personas over a first week with Playwright's clock (empty and Showcase, 390 and 1440, two themes) → docs/review/session-aw/FRIEND_READINESS.md. Fix every Blocker and Major and the quick Minors, then re-check with a fresh helper.

PART 7 — ONE OWNER SITTING
- Rewrite OWNER_STEPS.md as one ordered checklist the owner does once after this PR merges: deploy #60, private-sync, verifier, landing, food Worker, Reown, optional switches, acceptance redeploy + Stage 8, hardening, friends.
- Touch `workers/*` or `landing/` only where needed. Every such change is listed in OWNER_STEPS with why. The landing copy must match the app ("ZIGi · your companion", features, privacy).
- Note that the market policy window is the owner's separate task with its own date.

PART 8 — DOCS AND END
- FIRST_WEEK.md, FRIENDS_GUIDE.md, Known limitations and Help screenshots (labelled Showcase) match the app.
- ADR-046 closing table: E1–E5; the ledger counts; the speed before and after; the worker-minutes per run; the intermittents fixed, registered and carried.
- STATUS final entry as the final commit, and a ≤ 12-line report with preview steps.

TEAM AND PACE (owner-approved)
- Up to 6 builder helpers at once, each in its own git worktree on a sub-branch, plus up to 2 helpers for review and research.
- Builders write code, unit tests, specs, Help text and Showcase data, and run typecheck, lint and unit tests in their worktree. They never start a production build or a browser run.
- Shared files only the integrator (you) edits: Help page, What's new, CI shard lists, theme sheets, data catalogue and export/erase/backup registries, device-key lists, the frozen-reader fixture, the NOVA corpus `expected.json`, docs/STATUS.md. A builder returns a short registry list.
- The integrator merges each finished group with a merge commit, then runs typecheck, lint, the full unit suite, frozen readers, ONE production build per batch, route budgets, and the batch's specs plus the touched areas' specs (Playwright at most 2 workers, through the shared lock, one browser run at a time). Then push.
- Push only when no CI run is in progress on the PR. Keep integrating locally meanwhile: nobody waits idle, and no part waits on CI to start. Push at least after every batch.

USAGE
This is meant to be very large. Use the whole remaining weekly budget, and continue from AW_RESUME after any pause or reset without asking. There is no "if time" anywhere. The owner may type "wrap up": then finish the fix in hand, unwire anything half-done, push, and END honestly as in Part 8.

RULES (unchanged)
- Never merge, enable auto-merge, dispatch a workflow, approve a deployment, deploy, or log in to Cloudflare.
- No new dependencies (runtime, dev or Actions) and no outside services. No wallet, contract-signing or key changes.
- Stored data only additive: TIER 3 (stored formats) commits, frozen readers #37–#59.
- TIER 3 labels for CI, PWA, stored formats, sync, auth, AI tools, release verifier, CSP, landing headers, Workers.
- Lint, typecheck and focused tests before every push. Deliberate test changes are labelled "Session AW (<id>, deliberate)", each with an equally strict replacement. Never weaken an assertion, raise a timeout or budget, or narrow a check to get green.
- At most 2 fix attempts per problem, then Carried with its cause.
- Consumer first, chain invisible; private by design; unknown is never 0; estimates say so; no simulated data shown as real (Showcase labelled).
- Design language and readability: headings white → nebula, liquid-glass hover without pointer tracking, labels ≥ 14 px, body 15–16 px, phone inputs ≥ 16 px, targets ≥ 44 px, contrast ≥ 4.5:1, no tiny grey copy.
- Motion Off and reduced motion still and complete.
- English UI, USD/EUR; ZIGi and NOVA in EN and NL.
- Merge commits only, never rebase or force-push. Commit and push per part or batch. The STATUS entry is the final commit.

## The plan as presented
(Recorded after plan mode; see below.)

## Owner approval (verbatim)
(Recorded after plan mode.)

## Decisions
