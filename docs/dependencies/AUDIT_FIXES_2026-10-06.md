# Dependency alerts fixed in Session W (Part 1c, 2026-10-06)

**Status:** done on `feature/session-w-whole-life`, `[TIER 3] (dependencies)`. Owner addition A: "owner-approved narrow overrides or in-range updates, no new packages"; fix every vulnerable copy, development tooling included; "Do not touch secrets or the GitHub security settings." (none were touched). No package was added or removed from any `package.json`.

## Before (`pnpm audit`, main `1063765` + Part 1/1b, 2026-10-06)
| Advisory | Severity | Package and locked version | Path | Patched |
|---|---|---|---|---|
| GHSA-jqcg-44mw-7w3h | critical | proxy-addr 2.0.7 | apps/web › @opennextjs/cloudflare › @opennextjs/aws › express › proxy-addr | ≥2.0.8 |
| GHSA-68fv-2mgg-jv7q | high | source-map-js 1.2.1 (the development copy) | jsdom › css-tree › source-map-js (8 paths, all jsdom/vitest) | ≥1.2.2 |
| GHSA-wq5f-xc86-pv6w (librsvg CVE-2026-96889) | high | sharp 0.35.4 | apps/web › wrangler › miniflare › sharp (and through @opennextjs/cloudflare › wrangler) | ≥0.35.5 |
| GHSA-vfj7-8cjw-p6xm | high | braces 3.0.3 | eslint-config-next › @next/eslint-plugin-next › fast-glob › micromatch › braces | ≥3.0.4 |

The production copies of source-map-js (through postcss) and sharp (through next) were already on 1.2.2 and 0.35.5 by the overrides of an earlier session (`pnpm-workspace.yaml`).

## What changed
| Package | From | To | How | Within the declared range? |
|---|---|---|---|---|
| source-map-js (css-tree's copy) | 1.2.1 | 1.2.2 | `pnpm update --depth Infinity source-map-js` (the lock now holds one copy) | yes (css-tree declares ^1.2.1) |
| proxy-addr | 2.0.7 | 2.0.8 | override `"express>proxy-addr": ^2.0.8` (`pnpm update` kept the locked 2.0.7, the pattern of the earlier overrides) | yes (express declares ^2.0.7) |
| sharp (miniflare's copy) | 0.35.4 | 0.35.5 | override `"miniflare>sharp": 0.35.5`, the narrowest possible: miniflare pins sharp to exactly 0.35.4 | no: a patch release over an exact pin (owner-approved narrow override); sharp 0.35.5 brings its own `@img/sharp-libvips-*` 1.3.4 |

**Lockfile delta** (`pnpm-lock.yaml`, 8 insertions, 317 deletions): overrides +2 lines; `proxy-addr@2.0.8` replaces `proxy-addr@2.0.7`; `sharp@0.35.4` and its 26 platform packages (`@img/sharp-*@0.35.4`, `@img/sharp-libvips-*@1.3.3`) are removed (miniflare now shares next's `sharp@0.35.5`); `source-map-js@1.2.1` is removed (css-tree now resolves `source-map-js@1.2.2`). Nothing else moved; `pnpm install --frozen-lockfile --ignore-scripts` is clean.

## After
- `pnpm audit --prod --audit-level high`: **No known vulnerabilities found** (exit 0).
- `pnpm audit` (full): **1 high, braces 3.0.3** (development tooling only: ESLint's Next.js plugin).

### Why braces cannot be fixed now, and what the owner could approve
The advisory names braces ≥3.0.4 as patched, but **no such release exists**: the npm registry lists braces 2.3.2 and 3.0.0–3.0.3 only, `latest` is 3.0.3, last modified 2024-09-18 (registry metadata read 2026-10-06). micromatch 4.0.8 (latest) declares braces ^3.0.3 and fast-glob 3.3.3 (latest) declares micromatch ^4.0.8, so no update or override can reach a fixed copy. The path is the ESLint plugin of `eslint-config-next`; braces only expands the plugin's own glob patterns while linting, so nothing a visitor or the deployed app sends reaches it, and the production audit is clean. Options for the owner:
1. **Recommended:** accept it until braces 3.0.4 is published, then add `"micromatch>braces": ^3.0.4` (in range) in a small PR.
2. Approve an audit ignore entry with an expiry date (hides the advisory; not recommended).
3. Approve replacing `eslint-config-next` with a hand-written ESLint config without `@next/eslint-plugin-next` (changes the lint gate; not recommended).

## Checks (local, this branch)
Full unit suite (406 files, 3,728 tests); `next build` (`PUBLIC_ALPHA_UNDEPLOYED`); `build:alpha` (OpenNext); `check:alpha-artifact`; `wrangler deploy --config wrangler.alpha.jsonc --dry-run`; `ALPHA_PACKAGED=1` packaged prices and headers tests (8/8); `check:deploy-configs`; the Miniflare suites in the unit run (miniflare with sharp 0.35.5). CI runs the same on the PR.

## Session X Part 3 re-check (2026-10-07)
Read-only, local; nothing changed (no override, no lockfile change, so no Tier 3 commit).
- `pnpm audit` (full, 2026-10-07 21:49 UTC): **1 high, braces 3.0.3** (GHSA-vfj7-8cjw-p6xm), the same development-only
  path (`eslint-config-next › @next/eslint-plugin-next › fast-glob › micromatch › braces`); 848 dependencies.
- `pnpm audit --prod`: **No known vulnerabilities found**.
- **braces: no fix released, 2026-10-07.** The npm registry still lists only 2.3.2 and 3.0.0–3.0.3 (`latest` 3.0.3);
  micromatch's latest still declares `^3.0.3` and fast-glob's latest `^4.0.8`, so no in-range override can reach a fixed
  copy. Option 1 above stands: add `"micromatch>braces": ^3.0.4` once 3.0.4 is published.
- **The earlier fixes hold** (lockfile, 2026-10-07): `proxy-addr@2.0.8` only; `source-map-js@1.2.2` only; `sharp@0.35.5`
  only (next's and miniflare's copies share it). Wrangler stays 4.147.0 and pnpm 11.19.0.

## Session X: next 16.3.6 → 16.3.8 (2026-10-08, `[TIER 3] (dependencies)`)
**Why now.** Since 2026-10-08 about 00:40 UTC (reported by X-LOCAL in its handoff, then checked here), CI's
`pnpm audit --prod --audit-level high` step fails on every branch: GitHub's advisory database added six Next.js
advisories on 2026-10-07, all fixed in **16.3.8** (published 2026-09-30, npm registry read 2026-10-08):
- **high:** GHSA-cjq9-62q9-8jv4, server-side request forgery in Image Optimization (`>=16.0.0 <16.3.8`). Per the advisory
  an app with no `images.remotePatterns` is not affected; this app configures none (`apps/web/next.config.ts`), so the
  Alpha was not exposed to it.
- **moderate:** App Router metadata image routes information disclosure (`dynamicParams` bypass); cache poisoning of SSG
  and ISR pages in self-hosted apps; SSG/ISR cross-user content substitution; a pending `use cache` fill leaking Draft
  Mode content (and, in the release notes, a `use cache` leak across root params). **low:** the development server's MCP
  endpoint.

**What changed.** `apps/web/package.json` pins `next` 16.3.8 (was 16.3.6); nothing else. The lockfile change is only
`next`, `@next/env`, the ten `@next/swc-*` binaries and the peer strings of `@opennextjs/aws` and `@opennextjs/cloudflare`
that name the next version (48 lines each way). `eslint-config-next` stays 16.3.6 (no advisory; the narrowest change).
Release notes (github.com/vercel/next.js, read 2026-10-08): v16.3.7 backports one fix ("turbo-tasks-backend: fix strongly
consistent read hanging on a canceled task"); v16.3.8 lists the security fixes only; neither lists a breaking change.

**Deviation recorded.** The brief's Part 3 said "no other upgrades"; these advisories were published after it and block
CI for both lanes, and the brief's hard rule forbids only *new* dependencies. ADR-016 X23 records the choice; reverting
the one commit restores 16.3.6.

**After:** `pnpm audit --prod --audit-level high`: no known vulnerabilities; `pnpm audit` (full): 1 high, braces 3.0.3
(development only, unchanged). Checks: Session X Gate A (full unit and browser suites, build, packaged Alpha tests,
weights, freeze check) ran on 16.3.8.
