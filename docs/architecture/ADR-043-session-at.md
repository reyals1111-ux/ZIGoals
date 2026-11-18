# ADR-043 — Session AT: "READY FOR FRIENDS"

Status: in progress (18 Nov 2026). Branch `feature/session-at-ready-for-friends` from `main` `3d510124` (Merge PR #106,
Session AS). One Draft PR. Resume file: `docs/handoff/AT_RESUME.md`.

## Why this session exists
The last big session before the friends Alpha: every carried fix, a trust pass (friends will put real data in), a polish
pass across the app, CI reliability, the remaining buildable roadmap items, the release verifier's new stages, and the
owner's weekend checklist.

## The brief (owner, 18 Nov; summary of the scope in priority order)
1. The carried list: AP's seven copy/visual minors; CSV Value and Unit as their own fields; Someday counts in the Tasks
   menu; Today's Tab stops ≤ 90 on every day and time; Earn's Zignaly wording by date (no deploy on the day; Playwright's
   clock); `a11y-wcag-x:271`; `scripts/pre-run11-setup.test.mjs` on any Node; the other open CI_INTERMITTENTS rows; WebKit
   shard 4 near its limit (rebalance or raise, TIER 3 CI); AL's L7 rows replayed against AS's exact layer.
2. Trust pass: backup → restore round trip with every record kind since AL and Showcase-merge safety; erase removes every
   kind; export files open; "unknown is not zero" and as-of; privacy page and in-app list match what the app sends where.
3. Friends-Alpha polish pass (390 and 1440, three themes; phone performance; one fresh-helper UX review).
4. Roadmap items that fit: Help screenshots (backlog #12), What's new / Known limitations for AR and AS, FRIENDS_GUIDE,
   a landing draft for NOVA (landing/ only, for the owner's local preview).
5. Release verifier (TIER 3, behaviour-preserving): stages for AO, AP, AR and AS where a live read-only check is possible.
6. The owner's weekend list (OWNER_STEPS.md rewritten as one ordered checklist).
Budget and stop rules, rules and the end are as in the brief (CLAUDE.md and the session prompt).

## The plan as approved (18 Nov)
The plan is the one presented once in plan mode (Parts 0–6 above with these specifics): Zignaly wording through one date
helper; Tab stops walked across a week of clocks; shard time rebalanced first, a job limit raised by ≤ 15 min only if
rebalancing is not enough; Help screenshots as committed, lazy-loaded WebP labelled as example data; Showcase examples
for mood tags, symptoms, run splits and bill changes (Showcase seed only); Alpha #57's ids a placeholder unless sent.

**Owner approval (verbatim):** "Plan approved, approval items 1–5 included, with two changes:
1. Zignaly by date: every sentence about the closure states only what Zignaly's own closure notice says, with that notice
   linked (the existing verified "closure-notice" link). If the notice does not name 1 December as the last day to
   withdraw, the 1 December text is "Zignaly closes on 1 December" and from 2 December "has closed".
2. Order: do Part 6 (OWNER_STEPS.md, the weekend list) right after Part 1, then Parts 2–5; push it as soon as it is done."

Order of work therefore: 0, 1, 6, 2, 3, 4, 5, end.

## Decisions
(D-numbers are referenced from code comments; added as the session goes.)
