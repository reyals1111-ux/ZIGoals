# ADR-047 — Session AX: "PROFESSIONAL REVIEW & POLISH"

Status: in progress (26 Nov 2026). Branch `feature/session-ax-pro-review` from `main` `36bd987f` (PR #110 merged:
parents `8fa8aa1d` and `b29f08c5`). Draft PR "Session AX — Professional review & polish". Resume file:
`docs/handoff/AX_RESUME.md`. Reviews: `docs/review/session-ax/`.

## Why this session exists
A panel of expert reviewers audits the whole app like a professional review firm, then the team fixes what they find,
so the friends Alpha looks and behaves professionally finished. Nothing has been deployed since Alpha #59; #60 will be
deployed by the owner after this PR. Frozen readers stay #37–#59.

## Part 0 — records (26 Nov 2026)
- **PR #110** (Session AW) merged into `main` as `36bd987fb374c0c5e5e41363530161e60a981f24` (parents `8fa8aa1d` and
  `b29f08c5`).
- **Frozen readers** #37–#59 (`scripts/frozen-readers.mjs`; #59 = `8fa8aa1d`): unchanged, nothing deployed since #59.

## The brief (owner, 26 Nov 2026, verbatim)

SESSION AX — "PROFESSIONAL REVIEW & POLISH" (Claude Code cloud, Opus 5.5, effort High). A panel of expert reviewers audits the whole app like a professional review firm would, then the team fixes what they find, so the friends Alpha looks and behaves professionally finished. Budget: the owner's remaining weekly usage (~17 %) — review broadly first, then fix by severity across all areas, so the most important things are done if the budget runs out.

START
1. Pull the latest main (it must contain the merge of PR #110, Session AW; record its SHA) and create `feature/session-ax-pro-review`. Open a Draft PR "Session AX — Professional review & polish". Nothing has been deployed since Alpha #59; #60 will be deployed by the owner after this PR.
2. Read CLAUDE.md, apps/web/AGENTS.md, CONTRIBUTING.md, SECURITY.md, docs/STATUS.md, ADR-045 and ADR-046 (closing tables), docs/review/session-aw/ (VERDICTS, SIMPLICITY, SWEEP, PRIVACY_AUDIT, FRIEND_READINESS), docs/review/session-al/CI_INTERMITTENTS.md, docs/friends-alpha/OWNER_STEPS.md.
3. Plan mode once, with one owner approval; then no questions. Record plan, approval and amendments verbatim in ADR-047. Keep docs/handoff/AX_RESUME.md current, with "Safe to merge now: yes/no (CI run N)" at every part, also in the PR description.

EXIT CRITERIA (or the owner writes "wrap up")
E1 CI on the final head: two consecutive full runs green on the first attempt; fallback: green except registered known intermittents that passed on their one allowed re-run, each named. A red job blocks the end, whoever caused it.
E2 Every Blocker and Major from the review panel is fixed and re-checked by a fresh helper who did not fix it. Every Minor is fixed or has a cause from AW's E2 list.
E3 docs/review/session-ax/REVIEW.md: per area a score out of 10 before and after, with the evidence for each score.
E4 Records and docs (Part 5).

PART 0 — RECORDS: PR #110 merged (SHA); STATUS Part 0; ADR-047; AX_RESUME. Frozen readers #37–#59.

PART 1 — THE REVIEW PANEL (up to 6 reviewer helpers in parallel, each a fresh agent with one role; read and test first, fix nothing yet). Each one tests the production build (PUBLIC_ALPHA_UNDEPLOYED) with an empty profile, the Showcase, and a HEAVY profile. Each returns one table: id, finding, severity (Blocker, Major, Minor), evidence (route, width, theme, steps), suggested fix. Browser runs one at a time through the shared lock, Playwright at most 2 workers.
- HEAVY PROFILE first (one helper, shared by all): a generator script in scripts/ (test-only, never in the Alpha artifact) that fills two years of realistic data in every pillar: ~10,000 transactions with imports, budgets and bills, ~3,000 tasks, ~700 journal entries (photo stubs), ~5,000 food logs, a year of sleep, workouts, habits, mood, notes and goals.
a. SECURITY AND PRIVACY reviewer.
 - Script/HTML injection through every place user or imported text is shown: notes Markdown, journal, task comments, Help search, NOVA and ZIGi replies, exports (HTML, Word, e-book) and every importer (Day One ZIP/JSON, Markdown, Apple Journal HTML, bank files CAMT.053/OFX/MT940/CSV, Trello/Asana, HabitBull/Tickmate, FIT/GPX/Strava/Apple Health).
 - Malformed and huge files and ZIP bombs: size limits, clear errors.
 - The CSP still holds: no eval, no inline script.
 - Permissions (microphone, notifications, persistent storage) are asked only on the person's tap.
 - The service-worker cache holds no private data beyond the app's own.
 - Every network request in the code matches the privacy page and `landing/privacy.html`.
 - Nothing sensitive in URLs or logs.
b. DATA AND EDGE-CASE QA.
 - The heavy profile: speed and correctness of every list, chart, search, export and backup.
 - Time edges with Playwright's clock: Europe/Brussels DST (29 Mar 2027, 25 Oct 2026), month ends, "every 31st" repeats, leap day 2028, New Year, "My day ends at" past midnight, other time zones (America/New_York, Asia/Tokyo).
 - Storage nearly full and over quota (honest message, no silent loss), two tabs editing the same record, offline then online, a private window.
 - Very long text, emoji, pasted rich text.
 - Backup → restore of the heavy profile, and frozen readers on it.
c. UX AND VISUAL DESIGN reviewer. Nielsen's 10 heuristics per pillar at 390 and 1440, empty and Showcase, plus a consistency audit across every screen: type scale, spacing, card radius and padding, icon set and sizes, button styles, empty states, headings white→nebula, liquid-glass hover without pointer tracking, the five themes. List every inconsistency, with the screen to copy from. No redesign: align to the app's own best existing pattern.
d. ACCESSIBILITY auditor, WCAG 2.2 AA beyond axe:
 - focus order and visible focus (never under sticky bars), target size ≥ 44 px, reflow at 320 and 200 % zoom, text spacing;
 - names and roles for a screen reader;
 - live regions not chatty, Motion Off and reduced motion;
 - manual keyboard walks of each persona's top three flows.
e. CONTENT EDITOR. All English copy: consistent terms across pillars, sentence case, plain words. No crypto words outside the modules people chose. No tiny grey copy. Estimates labelled, unknown never 0. Also checks Help accuracy against the app, ZIGi/NOVA answers in English and Dutch (natural Dutch, not translated-sounding), What's new, FIRST_WEEK and FRIENDS_GUIDE.
f. PERFORMANCE engineer.
 - AW's carried speed targets: every route hydrated ≤ 3,000 ms, NOVA blocking ≤ 1,500 ms, on AW's probe (CPU 4×, 390×844, median of 3). Settings' blocking went UP in AW (2,082 → 2,308 ms): find out why first.
 - Also measure with the heavy profile.
 - No route's JS grows; route budgets never raised; ≥ 5 kB headroom.
 - AR's NOVA composition and look stay unchanged; deferring work, splitting chunks and moving work off the first frame are allowed.

PART 2 — FIX EVERYTHING, BY SEVERITY ACROSS AREAS
Blockers first (security and data loss before anything else), then Majors, then Minors. Up to 6 builder helpers in git worktrees, each on one area or pillar.
- Only the integrator edits the shared registries (Help, What's new, shard lists, theme sheets, catalogue, export/erase/backup registries, device keys, frozen fixture, corpus expected.json, STATUS).
- Per batch: typecheck, lint, the full unit suite, frozen readers, one production build, route budgets, the batch's specs plus the touched areas' specs. Then push, but only when no CI run is in progress on the PR. Nobody waits idle.
- Every fix gets a regression test as strict as the finding.
- A fresh helper re-checks each fixed Blocker and Major.
- After the fixes, the six reviewers re-score their area (E3).

PART 3 — OWNER DECISIONS (26 Nov; build exactly these)
- CR-22: the phone notice uses ≥ 14 px like every label (the readability rule wins over T-069).
- Today's tab-stop limit (≤ 90) stays. The two held-back Showcase examples move behind Today's "More", reachable and labelled.
- Account erase scope: one plain sentence on the erase screen and in Help, saying exactly what is erased (this device's data; the synced copy if any; what stays: nothing on this device), with a spec.
- OWNER_STEPS gaps (PK-21, PK-14, PK-13, KL-5, KL-6, PK-5/7/9): each gets an "Optional / later" line with what the owner would do and why it is not needed for friends.

PART 4 — CI AND INTERMITTENTS
- The 5 first-sighting retries from AW (`aw-x2-marvin:51`, `zigi-alive:296` and `zigi-memory-page:40` on WebKit, `earn-plain-words:110`, `logo-fold:166` phone), `theme-parity-af:15`, `market-status` and `nova-dashboard:210`: fix each at its cause, at most 2 attempts, or keep it registered with evidence.
- Shards: none over 45 min on the slowest measured runner (rebalance by measured minutes; TIER 3 CI). The 60-min limit and 2 workers stay.

PART 5 — DOCS AND END
- REVIEW.md: scores before → after, every finding with its fix commit or cause.
- Updated Known limitations, Help, FIRST_WEEK, FRIENDS_GUIDE; OWNER_STEPS stays one ordered owner sitting (deploy #60 first).
- ADR-047 closing table: E1–E4, speed before → after per route (empty and heavy), worker-minutes per run, intermittents.
- STATUS final entry as the final commit, and a ≤ 12-line report with preview steps.

RULES (unchanged)
- Never merge, enable auto-merge, dispatch, approve a deployment, deploy, or log in to Cloudflare.
- No new dependencies (runtime, dev or Actions) and no outside services. No wallet, contract-signing or key changes.
- Stored data only additive: TIER 3 commits, frozen readers #37–#59.
- TIER 3 labels for CI, PWA, stored formats, sync, auth, AI tools, release verifier, CSP, landing headers, Workers. Touch `workers/*` and `landing/` only where a finding needs it, each listed in OWNER_STEPS.
- Lint, typecheck and focused tests before every push. Deliberate test changes are labelled "Session AX (<id>, deliberate)", each with an equally strict replacement. Never weaken an assertion, raise a timeout or budget, or narrow a check to get green.
- At most 2 fix attempts per problem, then Carried with its cause.
- Protected areas untouched: Today hero and slogan, Checklist orbit path, footer finale, swan intro, Light's dark islands, shell navigation, Governance hidden by default, the locked ZIGi look, AR's NOVA composition, the Habits baseline as changed in AW (FR-TJ-7).
- Consumer first, chain invisible; private by design; unknown is never 0; estimates say so; Showcase labelled.
- Readability: labels ≥ 14 px, body 15–16 px, phone inputs ≥ 16 px, targets ≥ 44 px, contrast ≥ 4.5:1. Motion Off and reduced motion still and complete.
- English UI, USD/EUR; ZIGi and NOVA in EN and NL.
- Merge commits only, never rebase or force-push. Push per batch. The STATUS entry is the final commit.
- Usage: use the whole remaining budget; continue from AX_RESUME after any pause or reset without asking; the owner may type "wrap up" (finish the fix in hand, unwire anything half-done, push, END honestly).

## The plan as presented (verbatim)
(Recorded after plan mode.)

## Owner approval (verbatim)
(Recorded after plan mode.)

## Decisions
(As they are made.)
