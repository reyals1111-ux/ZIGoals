# ZIGoals
The Goal Layer for ZIGChain — goal-oriented onchain wealth planning, progress tracking and strategy orchestration.

Milestones 1–3 provide a **local alpha**: deterministic goal planning, a tested idle-custody CosmWasm contract, responsive web flows, and a guarded Keplr testnet client. **No contract has been deployed.** The local demo uses simulated balances; it does not send blockchain transactions. Testnet assets have no monetary value. This software is unaudited and mainnet is disabled.

Run 2 adds durable scoped testnet transaction outcomes, known-receipt recovery, verified ZIGScan links, official Range/Hub entry points and an 18-provider research registry. External strategies and funding routes remain disabled.

Milestones 1–2 are merged through [PR #1](https://github.com/reyals1111-ux/ZIGoals/pull/1), with successful [GitHub-hosted checks](https://github.com/reyals1111-ux/ZIGoals/actions/runs/34758309957). [Current status](docs/STATUS.md) separates owner evidence, automated checks and deployment blockers; historical reports retain their original findings.

The existing `landing/index.html`, `landing/wrangler.jsonc`, and Apache-2.0 license are preserved. No Cloudflare deployment or production settings were changed.

## Run locally

Use Node **24.19.0** (`.node-version` and `.nvmrc`) and pnpm **11.19.0** (`packageManager`). Use your preferred version manager. With an existing [nvm installation](https://github.com/nvm-sh/nvm#nvmrc), run `nvm install` then `nvm use` in this directory. [fnm](https://github.com/Schniz/fnm) also supports these pin files. No global shell changes are required by this repository.

First run `node scripts/doctor.mjs` (or `pnpm run doctor`). It only reads local prerequisites and checks the optional local Docker socket; it does not install tools or query the chain. `ERROR` blocks the relevant prerequisite; `WARNING` identifies optional tools or uncommitted work. **Use `pnpm run doctor`, with `run`: `pnpm doctor` is pnpm's own unrelated command.** The owner's Node 22.23.1 could start the development server but does not meet the pinned, CI-tested version; switch the current terminal to 24.19.0 before installing or verifying. Then:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open [the local app](http://127.0.0.1:3100/app). No wallet, environment file, API key, Docker service, or chain connection is required for the local demo. It starts with 1,000 simulated ZIG. Create a goal, review it, add funds, withdraw, and close it when empty. Starting balance in the wizard is a planning input; funds enter the goal only through the separate Add funds action.

Names, targets, dates and notes stay in browser storage. Export them from Settings before clearing site data. Backups contain private information. Testnet metadata is isolated by network and wallet; removing metadata does not remove the onchain withdrawal path. Clearing local demo storage does remove its simulated ledger. Known testnet outcomes are retained in a separate IndexedDB journal; clearing site data can also erase that history. Recovery checks known receipts only and never automatically resubmits a transaction.

## Verify the implementation

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm audit --prod --audit-level high
pnpm verify:network
```

Browser tests require Google Chrome. Install a test browser with `pnpm --filter @zigoals/web exec playwright install chrome` if needed. With the app running on port 3100:

```bash
pnpm --filter @zigoals/web exec playwright test
```

For a full Chrome exit and relaunch with the same isolated test profile, keep the production server running and run `node scripts/verify-browser-restart.mjs`. It verifies retained transaction records, uncertain hashes, damaged-history warnings and account isolation. The wallet and external network responses are mocked; it never uses the owner's browser profile or requests a real signature.

The desktop and mobile tests exercise the local lifecycle, metadata backup/recovery, wallet-unavailable state, review-dialog keyboard navigation, journal reload/account scope/corruption, and the read-only ecosystem page. They do not prove live Keplr signing or testnet execution. CI is defined in [.github/workflows/ci.yml](.github/workflows/ci.yml); local command results and hosted CI results are separate evidence.

## Contract development

Install Rust **1.85.1**, `rustfmt`, `clippy`, and the `wasm32-unknown-unknown` target using the official [rustup installer](https://rustup.rs/). The repository pins the toolchain and Cargo dependencies.

```bash
rustup toolchain install 1.85.1 --profile minimal --component rustfmt,clippy --target wasm32-unknown-unknown
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test --workspace --locked
cargo schema --locked
node contracts/goal-manager/scripts/generate-types.mjs
```

For this checkout's isolated `.toolchain` installation, first use the environment setup in the [contract README](contracts/goal-manager/README.md). That document also gives the pinned Binaryen and `cosmwasm-check` installation and validated Wasm build. Use `artifacts/zigoals_goal_manager.wasm` produced by that script, never raw Cargo output. The local optimization/validation passed; the Docker workspace optimizer was not run because its daemon was unavailable.

## Testnet gate

Read [current chain evidence](docs/research/ZIGCHAIN_CURRENT_STATE.md) and the [deployment runbook](docs/deployment/TESTNET.md). Live reads on 2026-09-13 confirmed `zig-test-2`, `azig`, 18 decimals, and `v5.0.0-patch-1`. The client rechecks identity and denomination, simulates fees, checks the signer around approval, and requires a verified immutable deployment before financial actions.

The owner still needs dedicated-wallet test funds and confirmed upload permission. No faucet retries, upload, instantiation, mainnet transaction, or external outreach occurred. The preparation script only reads the network and emits a manifest with null deployment IDs:

```bash
node scripts/prepare-deployment.mjs
```

After a separately verified deployment, validate the strict [v2 public manifest](docs/deployment/MANIFEST_V2.md), place it in `apps/web/config/deployment.json` and rebuild. Legacy address/code-ID environment variables no longer enable actions. Never put a seed phrase, private key, wallet password or API credential in the app. Real owner connection checks A–H passed; real signing and deployed-contract smoke tests remain pending.

## Repository map

| Path | Purpose |
|---|---|
| `apps/web` | Dashboard, wizard, goal detail, activity, settings, wallet and local demo |
| `packages/goal-engine` | Exact decimal planning; Funding Health always uses 0% return |
| `packages/chain-config` | Testnet facts, live guards and integer denomination conversion |
| `packages/shared-types` | Validated private metadata and Rust-generated contract messages |
| `packages/strategy-types` | Optional product-role, eligibility and liquidity metadata; separate non-executable FundingRoute |
| `packages/ecosystem-registry` | Strict sourced provider records and validated explorer/Hub navigation; no execution authority |
| `contracts/goal-manager` | Owner-only native idle custody, schema, tests and build script |
| `docs` | Architecture, evidence, product scope, security, deployment and future gates |

Valdora and WME integration are [deferred pending canonical interfaces](docs/research/VALDORA_STZIG.md). No invented messages, yield, stablecoin backing, fiat access or delegated wealth-management features are present. The demo's 1:1 display conversion is illustrative and never affects base-unit accounting.

For Run 2 use the [29-part report](docs/RUN_2_REPORT.md), [ecosystem integration map](docs/research/ZIGCHAIN_ECOSYSTEM_INTEGRATION_MAP.md), [owner deployment checklist](docs/deployment/OWNER_TESTNET_CHECKLIST.md) and [real Keplr procedure](docs/deployment/KEPLR_OWNER_CHECKLIST.md).

See the [Milestone 1 implementation report](docs/IMPLEMENTATION_REPORT.md), [threat model](docs/security/THREAT_MODEL.md), [security checklist](docs/security/SECURITY_CHECKLIST.md), [product scope](docs/product/PHASE1_PRD.md), and [truthful build log draft](docs/social/BUILD_LOG.md).

For safe alpha participation see [tester guide](docs/testing/ALPHA_TESTER_GUIDE.md), [contributing](CONTRIBUTING.md), [privacy](docs/PRIVACY.md) and [security reporting](SECURITY.md). Settings includes read-only connection diagnostics with separate RPC/REST outcomes and a build identifier.

Milestone 3 merged at `7d354e3` with successful [post-merge main CI](https://github.com/reyals1111-ux/ZIGoals/actions/runs/34764912650): [33-part report](docs/RUN_3_REPORT.md), [independent Linux artifact comparison](docs/deployment/M3_REPRODUCIBILITY.md), and [merged PR #2](https://github.com/reyals1111-ux/ZIGoals/pull/2). Local verification is 399 JS, 25 Rust and 30 browser cases plus full Chrome restart; actual hosted web/contract checks also passed. Cross-host Wasm byte identity is not established and no contract is deployed.
