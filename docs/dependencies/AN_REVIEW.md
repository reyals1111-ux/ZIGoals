# Session AN: the Dependabot alerts on main (12 Nov 2026)

Follows [`AL_REVIEW.md`](AL_REVIEW.md). The owner approved option 1 first, falling back to option 2 (targeted overrides) if upstream had not moved. Owner additions:
- the new transitive packages are allowed only from the same npm maintainer as glob and minimatch;
- the OpenNext output must be proven unchanged.

## 1. Upstream (option 1): not available
Checked on npm on 12 Nov 2026.

| Package | Newest | Declares | Fixed in | Result |
|---|---|---|---|---|
| `@opennextjs/cloudflare` | 1.20.17 | `glob ^13.0.6` | 14.0.2 | still vulnerable |
| `@opennextjs/aws` | 4.1.16 | `@node-minify/core ^10.5.0` (its glob ≤ 13) | — | still vulnerable |
| `@typescript-eslint/typescript-estree` | 8.72.2 | `minimatch ^10.2.2` | 11.0.1 | still vulnerable |

`eslint-config-next` 16.4.6 reaches the same `typescript-estree`, so bumping it changes nothing. **No upstream bump is possible.**

## 2. Overrides (option 2), in `pnpm-workspace.yaml`
| Override | Advisory | Before → after |
|---|---|---|
| `"@opennextjs/cloudflare>glob": ^14.0.2` (new) | GHSA-3g3m-2fjr-6pw4 | 13.0.6 → 14.0.5 |
| `"@node-minify/core>glob": ^14.0.2` (the Session AH entry, raised from `10.5.0`) | GHSA-3g3m-2fjr-6pw4 | 10.5.0 → 14.0.5 |
| `"@typescript-eslint/typescript-estree>minimatch": ^11.0.1` (new) | GHSA-g3hv-75wg-m249 | 10.2.6 → 11.0.8 |

- AL_REVIEW's fourth line, `"glob>minimatch"`, was not needed. glob 14 declares `minimatch ^11.0.0` itself, and a global `glob>minimatch` could also hit other glob majors.
- After the change, `pnpm audit` reports **No known vulnerabilities found** (before: 2 moderate).
- The lock adds 4 entries and removes 20. Every glob 10/13, minimatch 9/10 and path-scurry 1/2 entry is gone, along with their CLI helpers (`jackspeak`, `@isaacs/cliui`, `foreground-child`, `string-width`, `wrap-ansi`, …).
- The Session AL override `minimatch@10>brace-expansion` no longer matches anything, because minimatch 10 has left the lock. It is kept (no other dependency changes) and can go in a later cleanup.

### New packages in the lock (owner addition 2)
| Package | Version | Integrity (lock = registry) | npm publisher |
|---|---|---|---|
| `glob` | 14.0.5 | `sha512-nbKW5Sl53DEM5PkmZ5Jwfeyss1ohuqcgOBjOarSjz1fp8W4ss4EOOvKADQRbApD6JmVBX+HkpZYfBez4wXbeQQ==` | GitHub Actions trusted publishing, approver `isaacs`; maintainer `isaacs` |
| `minimatch` | 11.0.8 | `sha512-nFQuYSTVrGvysVBps5Ih+0BdnYFN/Cj3C816r6+p7yK+FHrVLGE4O4N9AFwykrlNlvM2HYt+Rad1Uiro6h88Ig==` | GitHub Actions trusted publishing, approver `isaacs`; maintainer `isaacs` |
| `path-scurry` | 3.0.0 (new major of an existing package) | `sha512-1pTbQqH1wIwMi/eleQ5leFTTCkzFsPcgXNjwOA8YGGW/W4/kHT3dssE7Z6NH+zuqNLOzOB0uaD61yl7cAcVhgg==` | `isaacs`; maintainer `isaacs` |
| `@isaacs/nonrecursive-glob-match` | 1.1.0 (new package) | `sha512-GPm/Dbvk5RLmhRnxXIa7nTpK0xtl4E0wj0MslsuNiJ1FIROU+2+9lgUC/dgF7Ey4QCWhfEsgxilMRMCdHPfDfw==` | `isaacs`; maintainer `isaacs` |

glob and minimatch have the same sole maintainer (`isaacs`), so the condition holds and neither override was stopped.

### Breaking changes checked
The packages ship no changelog, so I compared the exported API and the READMEs.
- **glob 13 → 14:** identical named exports. OpenNext calls only `glob()` and `globSync()`, and `@node-minify/core` 9.0.2 calls only `globSync()`.
- **minimatch 10 → 11:** a new matcher that does not build regular expressions, which is the security fix. It removes `makeRe` and the `MMRegExp` type. `typescript-estree` uses only `minimatch()`, and only for `allowDefaultProject`, which this repository does not configure.
- **Engines:** glob 14 needs Node 18/20/≥22 and minimatch 11 needs Node 20/≥22. The project uses Node 24.

### Proof
- **Local:** `pnpm lint` shows 0 errors (the same 20 warnings as main), `pnpm typecheck` passes, and `pnpm test` passes (count in the STATUS entry).
- **Local:** `pnpm build:alpha` (the OpenNext build) and `pnpm check:alpha` (the wrangler dry run) both pass. The upload was 29,911.07 KiB before and 29,911.18 KiB after.
- **OpenNext output (owner addition 3):** I listed every `.open-next` file with its size before and after. The result is in the STATUS entry. The first after-build ran on an uncommitted tree, so it showed:
  - the dirty-build markers: the `-d` version suffix, "(working changes)" and `"dirty": true`;
  - chunk renames that follow from those markers;
  - the per-build Next build id.

  Nothing came from glob or minimatch. The clean rerun after the commit is recorded in the STATUS entry.
- **CI:** the full "Milestone quality" run on the PR.

## 3. GitHub's third alert (Security tab, 10 Nov)
**How it was identified:**
- This session cannot read the Dependabot API (HTTP 403) or GitHub's global advisory API.
- `pnpm audit` showed only the two alerts above.
- Dependabot also scans `Cargo.lock` and `scripts/release/toolchain/package-lock.json`. Checking them against the public OSV database (crate and package names and versions only) finds one real vulnerability:
  - **`crypto-bigint` 0.5.5: RUSTSEC-2026-0387** (published 23 Oct 2026; "Multiple timing variability issues in operations intended to be constant-time"; fixed in 0.7.6).
  - Its path: `zigoals-goal-manager → cosmwasm-std 2.2.2 → cosmwasm-crypto 2.2.2 → ecdsa 0.16.9 / k256 0.13.4 / p256 0.13.2 → elliptic-curve 0.13.8 → crypto-bigint 0.5.5`.
  - Its advisory appeared after AL's review on 4 Nov, which fits the count going from 2 to 3. It is therefore very likely the third alert, though not confirmed against the Security tab.
- The other two OSV hits are RustSec "unmaintained" notices (`derivative` 2.2.0, RUSTSEC-2024-0388; `paste` 1.0.15, RUSTSEC-2024-0436), which Dependabot does not raise as alerts.

**Not fixed:**
- It is not build or lint tooling. It is the Goal Manager contract's crypto stack.
- The fix crosses a major version (0.5 → 0.7) that `elliptic-curve` 0.13 does not accept. It needs a new CosmWasm release.
- The brief rules out contract-signing and key changes.

**Reachability:**
- The contract does no secret-key arithmetic. CosmWasm's `secp256k1_verify` and similar functions check public signatures over public data, and on chain they are host functions in the node's own crypto, not this Wasm.
- The timing issue matters for operations on secret integers, so the exposure is low.

**Owner step:** confirm on the Security tab that the third alert is `crypto-bigint`. Then take it up with the next CosmWasm upgrade, as a contract change.
