# ADR-033: Session AH, "The Big Polish": session decisions

Status: **In progress** on `feature/session-ah-polish`, from `main` `f13abb0` (Merge #94, Session AG Polish 3; live as Alpha #49), in a cloud session. This record holds the owner's decisions at plan approval, the owner's amendments, every decision the session took without asking (M1…), and the closing table for every ID in the brief's index. Resume point: `docs/handoff/AH_RESUME.md`.

## Owner decisions (2026-10-25, plan approval)
- **The brief:** Session AH, "The Big Polish": every owner-approved finding from the two Grok reports (Alpha #44 picklist 1, Alpha #45 picklist 2), the open roadmap (RM4–RM8), security (scope E) and CI stability (scope F), in Parts 0–16. No UI redesign; every item is a logical fix to a real problem. After plan approval the session runs to the end without owner steps.
- **The scope file:** `origin/review/session-ah-scope:owner-scope/AH_SCOPE.md`, read into the session scratchpad with `git show`, never committed or merged.
- **Lane rule:** `apps/web/lib/ai/**`, ZIGi components and ZIGi evals belong to the later ZIGi session. Shared numbers and limits go into shared modules; ZIGi wires to them later.
- **Non-negotiables:** never merge, deploy, approve environments or log in to Cloudflare; no change to wallet signing, keys, transaction building or contract calls; no new dependency except Part 1's security bumps (pre-approved); reduced motion and Motion Off; theme parity; phones native-feel, computers and tablets keep their layout; route weights within budget; no fake data shown as real; the Checklist path, phone river, labels, footer and everything AG Polish 3 shipped are protected; the NO2 keep-list stays working; the Showcase and the empty start both clean.
- **Not in AH:** AF1, AF2, AF8, AF9, LA12; ZIGi items (ZI1–ZI15, DE7, the G-items, J10, L6, RM1–RM3, AF5, HE17); everything Later or Skipped in the scope file.
- **The approved plan:** `/root/.claude/plans/snug-fluttering-hartmanis.md` (summarised in the resume file).

## Owner amendments (2026-10-25, after approval; pre-approved)
1. **Every finding, not every row.** For each scope row, every finding ID (B-, N-, D-, L-, M-, T-, C-, BUG-) is fixed, or recorded as already fixed (with evidence) or not possible (with the reason). The closing table lists them per row.
2. **The "already fixed" check runs per part.** At the start of each part, for that part's rows only. Part 0 keeps the records, this ADR, the resume file, the Draft PR and RM8.
3. **DS1's revision stamp** is a stored-format change: additive (an optional field or a new device-only key), labelled TIER 3 (stored format), proven with the frozen readers #37–#49.
4. **SE14 device lock:** optional and off by default. It never makes the person's own local data unreachable: a clear recovery path, no encryption of data by the lock itself, no lockout beyond a short delay after failed attempts. If that cannot be done safely without dependencies, it is recorded instead of built.
5. **HA2/TR9 auto-tick from Health never double-counts.** A manual tick or log plus a Health log counts the day once. Unticking a Health-derived tick explains why it is ticked.
6. **TR7:** if the app has no exchange-rate source already, the currency switch hides with an honest "coming later"; no new outside data source or egress.
7. **RM6 PR-review Action:** `pull_request` only (never `pull_request_target`), never on forks, least-privilege permissions, the secret never echoed, a clean skip without it.
8. **CO11 notification actions and any service-worker or manifest change:** TIER 3 (PWA), with rollback.

## Decisions taken without asking
- **M1 — The branch.** The owner named `feature/session-ah-polish`; the harness branch `claude/wizardly-albattani-zc9cco` stays untouched, as L1 and K1 did.
- **M2 — The sandbox runs Node 22.22.0 against the project's 24.19.0.** As in AG Polish 2 and 3, a handful of unit files fail only here (`pre-run11-setup`, `run11/domain-review-race`, `visual-format` ja-JP, `vault/finance-homes`); CI on Node 24 is the judge for them. The Chrome channel points at the preinstalled Playwright Chromium (153) locally only.
- **M3 — The alert list.** The GitHub Security tab is not readable from this session; Part 1 works from `pnpm audit` on the lockfile of `f13abb0` (25 Oct): 16 advisories in five packages — `vite` 8.3.0–8.3.2 (GHSA-698v-4r3x-3vcv, GHSA-r825-w8mm-5pxw, GHSA-587h-7wmj-h5pm high, GHSA-9jrq-w75r-8gcw low, GHSA-rq7h-c2jc-7f22, GHSA-vfpm-58rq-9qcg; through `vitest` → `@vitest/mocker`; AF14), `@vitest/mocker` < 5.0.3 (GHSA-qxg6-89mg-rqv8, GHSA-xp26-3454-mjgp), `glob` 10.3.3 (GHSA-5j98-mcp5-4vw2 high; `@node-minify/core` under OpenNext), `body-parser` < 2.4.0 (GHSA-27r3-jxmh-p828 high; `express` under OpenNext), `undici` < 7.30.1 / < 8.12.2 (GHSA-4qv8-2p9j-2685, GHSA-f72v-6w45-q472, GHSA-xjj6-f33q-929c high; `miniflare` and `jsdom`). STATUS lists exactly which are cleared.

## The "already fixed" checks (per part, amendment 2)
Filled at the start of each part.

## Closing table (every ID in the brief's index)
Filled part by part: per row, the finding IDs fixed, already fixed (evidence) or not possible (reason).
