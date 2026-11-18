# Session AS follow-up: the audit gate and the Next.js security patch (18 Nov 2026)

Follows [`AN_REVIEW.md`](AN_REVIEW.md). The owner asked for the smallest safe change, in this order: an upstream bump if
one exists, otherwise a scoped override to a patched version. The owner also approved Next.js 16.4.2 → 16.4.6 with its
same-line packages. Anything that cannot be proven safe within two attempts is recorded here and left out. Every finding
was checked on npm on 18 Nov 2026.

## What CI's audit reported (`pnpm audit --prod --audit-level high`, runs 1863 and 1864)
| Severity | Package | Advisory | Path | Fixed in |
|---|---|---|---|---|
| high | `picomatch` ≤ 4.0.7 | GHSA-fc5q-39xc-vjpf (ReDoS through single-branch repeated extglobs) | `@walletconnect/*` › `@walletconnect/keyvaluestorage` › `unstorage@1.17.6` › `anymatch@3.1.3` › `picomatch@2.3.2` (7 paths) | "≥ 4.0.8" |
| moderate | `next` 16.2.0–16.4.4 | GHSA-vc7v-qv4w-wrv8 (cache leak across root param values in nested `use cache`) | `apps/web` › `next@16.4.2` | 16.4.5 |
| moderate | `next` 16.3.0–16.4.4 | GHSA-mfr8-8qww-v76h (information disclosure across root params with `use cache`) | `apps/web` › `next@16.4.2` | 16.4.5 |

The two moderates are not the same class as the high, but they are in Next.js, which the owner approved patching.

## 1. Next.js 16.4.2 → 16.4.6 (done, TIER 3)
| Package | Before → after | Where |
|---|---|---|
| `next` | 16.4.2 → 16.4.6 | `apps/web/package.json` |
| `eslint-config-next` (with `@next/eslint-plugin-next`) | 16.3.6 → 16.4.6 | root `package.json` |
| `@next/env`, `@next/swc-*` (Next's own) | 16.4.2 → 16.4.6 | lock only |

- `@opennextjs/cloudflare` 1.20.12 declares `next >=15.5.28 <16 || >=16.4.1`. It accepts 16.4.6 and is **not bumped**
  (the newest is 1.20.17; no reason to move it).
- The lock moves the Next line only: `next`, `@next/env`, the eight `@next/swc-*` platform builds, `eslint-config-next`
  and `@next/eslint-plugin-next`. Nothing else moves: no new package and no new maintainer.
- After the change, `pnpm audit --prod` and `pnpm audit` both report **No known vulnerabilities found** (before: 2 moderate).
- Also passing: `pnpm lint` (0 errors, the same 23 warnings as before, none new from the 16.4 config) and `pnpm typecheck`.
  `build:alpha` builds the OpenNext worker. `check:alpha` (the `wrangler` dry run) passes. Route weights, frozen readers,
  the unit suite and the browser specs: see the STATUS entry.
- Next's security-advisory notice, which stopped `next dev` and `next build` once each on 16.4.2, no longer appears.

## 2. picomatch (GHSA-fc5q-39xc-vjpf): no fix exists to apply
- **Upstream:** none. `unstorage` 1.x declares `anymatch ^3.1.2`; `anymatch` 3.1.3 is its newest and declares
  `picomatch ^2.0.4`; the `@walletconnect/*` packages pin `unstorage` 1.x.
- **Override:** none possible. The advisory names `≥ 4.0.8` as fixed, but **picomatch 4.0.8 is not published**: on npm on
  18 Nov the newest is 4.0.7 (24 Aug 2026), and no 2.x release after 2.3.2 exists. A 4.x override under `anymatch` 3
  would also change the API that `anymatch` calls (it is written for picomatch 2). That cannot be proven safe, so it was
  not tried.
- **Today:** the npm advisory service this session reaches (`/-/npm/v1/security/advisories/bulk`) returns no advisory for
  picomatch 2.3.2 or 4.0.7, and `pnpm audit` here reports none. CI's audit is the authority, so its result on the final
  head is recorded in the STATUS entry.
- **Reach, for the owner's judgement if the advisory stands:** in this app `unstorage` serves WalletConnect's key-value
  storage in the browser. Its glob patterns are the library's own, never a person's input, so a pattern that triggers
  the ReDoS cannot be supplied from outside. The fix is a picomatch release; until then the options are an audit
  exception (an owner decision, not made here) or waiting for the release.
