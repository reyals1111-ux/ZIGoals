# Session AE — Resume here

Kept current after every part (owner rule). On any resume, usage pause or model switch: `git pull`, read this file and
`git log --oneline -15`, then continue at the next unfinished step. Never redo finished work; never re-plan; never enter
plan mode again (the plan was approved once: ADR-027 and the PR description).

## Commands
- Node 24.19.0 outside the checkout: `export PATH=/root/node-v24.19.0-linux-x64/bin:$PATH` (download from nodejs.org,
  checked against SHASUMS256, if the container is new; `corepack enable --install-directory /root/node-v24.19.0-linux-x64/bin`
  for pnpm 11.19.0). Install: `pnpm install --frozen-lockfile --ignore-scripts`.
- Chrome channel locally: `mkdir -p /opt/google/chrome && ln -sf /opt/pw-browsers/chromium-1194/chrome-linux/chrome /opt/google/chrome/chrome`.
- The machine lock (ADR-027 G3): every build, Playwright run and screenshot takes `flock -w 3600 /tmp/ae-browser.lock …`;
  the server must not inherit it (start it outside the lock).
- Build + serve: `$SP/rebuild.sh` (the scratchpad's; it builds under the lock with
  `NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build`, then `cd apps/web && TZ=UTC pnpm exec next start --hostname 127.0.0.1 --port 3101`).
- Browser tests: `cd apps/web && PLAYWRIGHT_BASE_URL=http://127.0.0.1:3101 flock -w 3600 /tmp/ae-browser.lock pnpm exec playwright test <spec> --workers=2`.
- Captures: `capture.mjs` on `review/session-ae-screens` (`node capture.mjs <base> <out>`; `THEMES=nebula,light,dark`; `ONLY=<regex>`).
- Theme sheets after any CSS change: `node scripts/themes/build-themes.mjs` (the unit test fails otherwise).
- Times: `TZ=Europe/Brussels date`. Gate C starts by Sun 18 Oct 05:30 (rule: ≤ 06:00); PR out of Draft with CI green before Sun 12:00.

## Lanes (ADR-027 G3)
| Lane | Branch | Owner | State |
|---|---|---|---|
| Part 0b verifier | `ae/verifier` | helper V | merged |
| 4.2 demo balance + Part 6 wallets | `ae/wallet` | helper W | merged |
| 6.5 on-ramp research | `ae/onramp` | helper R | merged |
| 4.3/4.4 Habits | `ae/habits` | helper B | merged |
| Part 5 layout | `ae/layout` | helper L | merged (`98d5b11f`) |
| 4.1 sidebar, 3.1 icon, 3.5 cross-fade | `ae/sidebar` | helper S | merged |
| 4.5 header art | `ae/header-art`, `ae/header-art-2` | helpers H1, H2 | merged (`f49a9a5a`, `cdad35dd`) |
| What's new + Help | `ae/whats-new` | helper N | merged (`d71ef164`) |
| Parts 1, 2, 3, integration, builds, captures, Gate C | this branch | lead | Part 3 audits |

## Parts
| Part | State | Commits |
|---|---|---|
| 0 Records, rules, verifier | done | `f1d91638` (rule B), `57c8017a` (rule A), `fd0d56ee`, `b480412f`, verifier merge (V) |
| 1 Hero scene | done (D1) | `1e21a079` |
| 2 Banner finale, music twin | done (S2) | `28c26393`, `bd38ffe2` |
| 3 Themes | Light white-family (`e4198fc2`), translucent tints (`88b175db`); Preview labels removed once audits pass | `37f07128`, `e4198fc2`, `88b175db` |
| 4 | done: 4.1 (S), 4.2 (W), 4.3/4.4 (B), 4.5 (H1, H2) | merges `f49a9a5a`, `cdad35dd` et al. |
| 5 Layout | done: four issues (L) + the blur-order fix (`39ebce78`) | `98d5b11f`, `39ebce78` |
| 6 Wallets, on-ramp | merged (W, R); practice money never in fiat (`TIER 3 (public-safety labels)`) | merges + wallet-card commit |

## Resume here (2026-10-17 22:50 Brussels — Gate C under way)
- Done: Preview removed (`b9855e3f`); Light audit at 390/1440 (fixes `90c1b18d`, `87780f88`); frozen readers #37–#43 PASS
  incl. `habits:routines` and linked wallets (`47f95b2f`, `docs/verification/session-ae/gate-c-frozen-readers.txt`);
  security review (fresh agent): no high, one medium (a unit guard, fixed `418b14b2`), lows fixed (`419c781a` wallet,
  `0d5b5c2d` PRIVACY.md); review branch `review/session-ae-screens` has `before/` and the variants.
- Running (`$SP/chain1.sh`): wallet specs → Light re-check → Dark audit (390/1440).
- Next, in order: Dark fixes; Nebula audit 390/1440; width audits (changed pages 320/768/1024/1920 × 3 themes), touch,
  stress; after captures → review branch; design critique agent (one fix round); unit suite; revert gate; weights; key
  scans; rebuild; full browser suite once (nohup, 2 workers); local verifier (`ZIGOALS_VERIFY_BASE`); ADR outcomes; STATUS
  final entry (last commit); PR out of Draft.

## Resume here (2026-10-17 22:20 Brussels — every lane merged; Part 3 audits)
- Done since 21:35: Light white-family + hero pool (`e4198fc2`); L, N, H2 merged; blur order (`39ebce78`); translucent
  tints (`88b175db`); the fold test rewritten (a new device shows its welcome panels when folded: the old "moves up"
  assumption failed in CI run 997 on desktop and phone).
- Uncommitted at this note: Preview labels removed (theme-switch, specs) — commit after the Light/Dark audits.
- Next: focused specs (`$SP/logs/spec3.log`), Light/Dark audits + fixes, commit, push; Gate C by 05:30.

## Resume here (2026-10-17 21:35 Brussels — Parts 1, 2 done; 3–6 integrating)
- Running: the focused spec run on `bd38ffe2` (34 files; `$SP/logs/spec2.log`); helpers L (layout), H2 (header art for the
  hand-written headers), N (What's new + Help). CI run 998 on `3c304d0e`. Run 996 (Part 0 only) red once on
  `motion-polish:128` (the known family, code identical to `main`).
- Next: after spec2, regenerate the theme sheets (Light mapping, dusk banner), rebuild, Light/Dark captures and audits,
  fix; merge L, H2, N as they report; remove the Preview labels once the audits pass; then Gate C (by 05:30).
- Sandbox-only: `scripts/pre-run11-setup.test.mjs` fails here ("Select pnpm 11.19.0" inside a spawned CLI); CI decides.

## Resume here (2026-10-17 20:30 Brussels — Part 0)
- Done: branch, rules A and B, the generator's per-lane layers, STATUS #43 + Release identity, ADR-027, this file; seven
  helpers running; before captures running (`$SP/before`).
- Next: push, Draft PR, before captures to `review/session-ae-screens`, then Part 1 (hero scene).
- Open decisions: none.
