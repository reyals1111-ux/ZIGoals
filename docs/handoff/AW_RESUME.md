# Session AW — resume file ("FINISH LINE")

Read this first after a pause, a limit or a model switch; continue from "Next" without asking. Branch
`feature/session-aw-finish-line` from `main` `8fa8aa1d` (Alpha #59), Draft PR "Session AW — Finish line". Rules:
CLAUDE.md, the owner's brief, the plan and the approval, all verbatim in `docs/architecture/ADR-046-session-aw.md`.

**Safe to merge now: no — run 2035 on `1856442f` red; its failures are fixed at their cause on the branch or being fixed;
run 2036 on `16ac3c53` queued; later commits wait for it.**

## Done
- Part 0; ADR-046 with the plan and the owner's 12 amendments verbatim.
- Batches 1–3 merged and wired: kcal, programmes + Read aloud, FR-TJ-7, X1–X7, simplicity a/b/c, p5-fixes, p5-answers
  (corpus: Dutch fields only moved), offline spec (aw-offline.spec, list 12).
- Reviews: b1 (0 Blockers, 2 Majors fixed), b2 (0 Blockers, 3 Majors fixed: recipe ZIP budget, card payment, Help
  paths); QUALITY-b2.md. Help: 150 "Where" sentences, then 23 corrected after two read-only checks (HELP_WHERE_FIXES.json).
- Part 6 privacy: audit (PRIVACY_AUDIT.md); Read aloud local voices only in every mode (TIER 3 AI tools `4509a812`);
  app, Help and landing/privacy.html texts match what the app sends.
- Real bugs found by specs: CSP had no media-src, so journal voice notes never played in production (`305431f5`);
  Settings jumps to lazily drawn targets; X2's progress line pushed Tasks' first task below the screen at 768.
- Part 7: OWNER_STEPS.md rewritten as one ordered checklist (`b1e27d13`).

## In progress
- Builders: offline (fixing aw-offline's 9 failures; may touch public/sw.js in a TIER 3 PWA commit), round-trip (the
  export → erase → restore unit test), content (#82 written collections, #278 sleep lessons), showcase (QUALITY b1 #13
  and the Showcase-examples row).
- Integrator: build of the current head (build-7), then speed attempt 2 (Today, Settings, NOVA, Help), the re-runs of
  2035's failures, SWEEP.md, persona walks; the verdict table (scratchpad VERDICTS.md draft) into docs.

## Next
- Push when 2036 finishes; CI intermittents' verdicts; Part 8 docs, ADR-046 closing table, STATUS final entry.

## Team
- Builders as above; review/research: review b2 and the privacy audit. Hand-backs: scratchpad registry-<group>.md.

## Toolchain in the sandbox
- Pinned Node 24.19.0 in the scratchpad (`node-v24.19.0-linux-x64/bin` first on PATH); `corepack enable pnpm`;
  `pnpm install --frozen-lockfile --ignore-scripts`. Typecheck and build need `NODE_OPTIONS=--max-old-space-size=8192`.
- Production build: `NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build`, then
  `pnpm --filter @zigoals/web exec next start --hostname 127.0.0.1 --port 3101`; Chromium at `/opt/google/chrome/chrome`
  (the sandbox's Playwright Chromium), at most 2 workers, one browser run at a time.
