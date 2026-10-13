# Session AA-Local — STATUS entry draft (becomes the docs/STATUS.md entry in the session's last commit; figures filled at Gate C)

## Session AA-Local — Habits, Health and the game layer, best in class + ZIGi everywhere (branch `feature/session-aa-local`, base `32cb9c5a` = Alpha #37, PR #84)
Owner decisions and the eight plan edits: ADR-022. Handoffs: `docs/handoff/AA_LOCAL_TO_CLOUD.md` (mine), `AA_CLOUD_TO_LOCAL.md` (read at every gate). Raw model runs: `review/session-aa-local-runs`; captures: `review/session-aa-local-screens`.

### Parts and commits
| Part | Commit | What |
|---|---|---|
| 0 | `fe645374` | ADR-022, the handoff, the status file |
| Storage (Tier 3) | `af1882e5` | `[TIER 3] (storage)`: eleven device-only, versioned, loose keys (`lib/aa-device-keys.ts`), erase, Export everything, the frozen-record test |
| 1 | `004ecf7c` | Habits H1–H6, H8 (sections, timer finish, days since, skip reasons, routines, areas through AA-Cloud's list, year view) |
| 2 | `682bf199` | The game layer H7 and celebrations S10, `/app/journey`, the slot mirror, the Game layer switch (off by default) |
| Egress (Tier 3) | `59296b84` | `[TIER 3] (egress/security)`: the recipe import route (SSRF-safe, 1 MB, 8 s, JSON-LD only, rate-limited; THREAT_MODEL section) |
| 4 | `37dc787a` | Swipes S5, the welcome's focuses and Undo setup S4, the reminders plan S7 |
| 3 | `7401556e` | Health N1–N12 (no photo-plate) |
| 5 | `8f70aecd` | ZIGi: twelve kinds, mood on check-in, device-record writes through one registry, navigation, golden +26/+18, corpus-aa, accept-correct rows, `tests/zigi-aa.spec.ts`, ZIGI_ACTIONS_Z.md |
| Gate A | `bd7572b2`, `7d18aa4f`, `bd96d10c` | AA-Cloud's registry followed (B40), CI's two failures, the weight gate without raising a budget (B41), a11y aria-prohibited-attr, Part 7 the Showcase (B42) |
| Gate B | `bb9289b6` | the security read's three findings fixed and tested (B43), photos in Export everything |

### Model targets (Part 6) — filled at Gate C
| Model | Set | Target | Result |
|---|---|---|---|
| Sonnet 5.5 | corpus / spoken / new features / 15 conversations ×3 | ≥97 % / ≥97 % / ≥95 % / 15/15 | corpus S3 736/770 = 95.6 % ($6.22; 738/770 = 95.8 % re-scored after the two `set-time-of-day` case updates; S5 second pass 739/770 = 96.0 % ($6.01); target 97 not met over two passes (Z-Local closed at 96.4 %): the misses are Sonnet describing a Fund card it then omits (3), extra reminder cards beside new habits, two-card answers where one was asked, and the pre-existing conversation misses) / spoken S4 661/681 = 97.1 % ($3.19; S1 647/681 = 95.0 % before the seed and engine fixes) / new features S4 44/45 = 97.8 % ($0.21; S2 43/45) / 15/15, 15/15, 15/15 (S3, $0.90) |
| Haiku 5.5 | corpus / spoken / new features | ≥94 % / ≥90 % / ≥95 % | corpus S3 724/770 = 94.0 % ($0.42) / spoken S3 635/681 = 93.2 % ($0.31; S1 569/624 = 91.2 %) / new features S4 45/45 = 100 % ($0.01; S2 43/45) |
| gemma4 12B (RTX 5090) | corpus | ≥89 % | S3 676/770 = 87.8 % (88.4 % without the 45 new-features cases; Z-Local's final 88.8 %) — not met, free run |
| qwen3.8 27B (RTX 5090) | corpus | ≥88 % | S3 649/770 = 84.3 % — not met, free run; the misses are wrong refusals ("I can't record this in kg"), answers without a card and over-eager extra cards, not harness defects; second pass S3b 664/770 = 86.2 % |
Ledger: $… of $50 (`review/session-aa-local-runs/ledger.md`; S0 spoken top-up $0.30; …).

### Tier 2 / Tier 3 in plain words
- Storage (Tier 3): eleven new device-only keys; no field entered habits v3, health v4 or settings v3; `lib/aa-device-keys.test.ts` proves the three synced records are byte-identical beside them; the #37 reader proof ran at Gate B (2026-10-12 09:33Z): main's checkout at `32cb9c5a` in `~/Documents/ZIGoals-Claude-main` parsed the AA-Local Showcase's habits, health and settings records with its own strict schemas and holds none of the eleven keys in any list (one vitest file run in that worktree, 1/1; the file was not committed anywhere).
- Egress (Tier 3): one new server route, `/api/recipe-import`, which fetches one https page on 443 the person pasted and returns the schema.org Recipe fields; see THREAT_MODEL "Session AA-Local changes".
- Nothing in wallet, signing, keys or chain configuration changed.

### Storage and formats
… (keys, the Showcase's device records, export file names `photos/<day>-<pose>-<id>.<ext>`)

### Tests
… (unit: 516 files / 4674 tests green; browser: Chrome and WebKit on :3103, TZ=UTC; the new specs: habits-aa 14, journey 6, health-aa 10, flow-aa 6, zigi-aa 2, accept-correct +4 rows)

### Assertions changed
See ADR-022 "Assertions changed" (each as strict; the list is copied here at Gate C).

### Gate C evidence (2026-10-12)
- Revert gate: typecheck green at every part commit (12/12: fe645374 af1882e5 004ecf7c 682bf199 59296b84 37dc787a 7401556e 8f70aecd bd7572b2 7d18aa4f bb9289b6 6b64a842) in a throwaway worktree.
- Browser, final build on :3103, TZ=UTC: Chrome ZIGi + new specs 449/449 rows (two audit rows fixed and rerun 14/14 with the local-answers spec), Chrome smoke + phone 6/6, WebKit (webkit-*, zigi-*, the new specs, the audit) 459 passed + the one Health import row that timed out beside two extra specs, 10/10 alone; What's new + Help specs 14/14.
- Unit: 516 files / 4674 tests green (root); weights green, shell 1.2 kB below main.
- Audits: the Gate B security read (B43, three findings fixed) and the Gate C test-file audit (B47, one swallowed assertion restored); key scans clean.

### CI's full browser suite (Gate C finding)
- The three browser-suite shards had never finished on this branch: every Milestone quality run since Part 2 was cancelled by the next push (one PR, pushes at every part), and the two that did finish (bd7572b2, f77b3e24) were red. The ZIGi/new/smoke selection I ran locally at Gates A–B does not cover the 850-test full suite, so 75 CI failures (63 unique tests in 25 spec files) surfaced only at Gate C, on f77b3e24.
- All 65 were reproduced locally against the :3103 build, then fixed in five build-and-rerun rounds (ADR-022 B49–B51): sections open by default with the clock's section marked; the game card and year view out of the layout regions and Health's highlights at the top of the journal block (the pinned region orders of twelve specs keep); the timer's pre-existing control names; the full habit card static again and every lazy piece inside LoadBoundary; swipe rows without a wrapper and with no stacking context at rest; the Today timer chip's 44 px buttons; the welcome's setup record only when something was made; no sleep score on short nights; a five-letter stem for the local answerer's word match; Health's fasting item back in its region (lost on computers since B41). Spec updates, each listed in ADR-022 "Assertions changed": help topics 12, the onboarding and sleep flows pass the focuses step, the Showcase's seven habits / five Today rows, habits-aa H1/H2, Today's widget capped at five due habits; the Today ceilings 9.7 → 11.5 and 4.2 / 3.85 → 5.5 / 5.0 (owner item).
- Not this branch's: phone-touch-targets' `Goal actions (39×44)` on /app/goals/tracked/9201 fails identically against main's build on this Mac (font metrics); CI on Linux decides it.

### Revert gate, CI, decisions B1…Bn, owner items
… (filled at Gate C: typecheck per part boundary; CI run URL; B1–B51; owner items: Sonnet corpus 96.0 % and gemma4 87.8 % / qwen3.8 86.2 % below their targets, the Today ceilings (11.5; 5.5 / 5.0), vitamins beyond the seven nutrients, push delivery, the photo-plate test not built)
