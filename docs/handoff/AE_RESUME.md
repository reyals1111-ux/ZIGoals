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
| Part 0b verifier | `ae/verifier` | helper V | running |
| 4.2 demo balance + Part 6 wallets | `ae/wallet` | helper W | running |
| 6.5 on-ramp research | `ae/onramp` | helper R | running |
| 4.3/4.4 Habits | `ae/habits` | helper B | running |
| Part 5 layout | `ae/layout` | helper L | running |
| 4.1 sidebar, 3.1 icon, 3.5 cross-fade | `ae/sidebar` | helper S | running |
| 4.5 header art | `ae/header-art` (+ H2 later) | helper H1 | running |
| Parts 1, 2, 3, integration, builds, captures, Gate C | this branch | lead | Part 1 next |

## Parts
| Part | State | Commits |
|---|---|---|
| 0 Records, rules, verifier | done | `f1d91638` (rule B), `57c8017a` (rule A), `fd0d56ee`, `b480412f`, verifier merge (V) |
| 1 Hero scene | done (D1) | `1e21a079` |
| 2 Banner finale, music twin | done (S2) | `28c26393`, `bd38ffe2` |
| 3 Themes | in progress: sidebar/icon/cross-fade merged (S); Light mapping + dusk banner edited, not yet built | `37f07128` + this part's next commits |
| 4 | 4.1 merged (S); 4.2 merged (W); 4.3/4.4 merged (B); 4.5 H1 merged, H2 running | merges `f49a9a5a` et al. |
| 5 Layout | helper L running | — |
| 6 Wallets, on-ramp | merged (W, R); practice money never in fiat (`TIER 3 (public-safety labels)`) | merges + wallet-card commit |

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
