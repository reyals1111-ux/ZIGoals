# ZIGoals
The Goal Layer for ZIGChain — goal-oriented onchain wealth planning, progress tracking and strategy orchestration.

Milestone 1 is a **local alpha**: deterministic goal planning, a tested idle-custody CosmWasm contract, responsive web flows, and a guarded Keplr testnet client. **No contract has been deployed.** The local demo uses simulated balances; it does not send blockchain transactions. Testnet assets have no monetary value. This software is unaudited and mainnet is disabled.

Publication is currently blocked by missing command-line Git sign-in and a **403** from the connected GitHub write API. The feature branch and complete commit history are preserved locally; hosted CI has not run.

The existing `landing/index.html`, `landing/wrangler.jsonc`, and Apache-2.0 license are preserved. No Cloudflare deployment or production settings were changed.

## Run locally

Use Node **24.19.0** (`.node-version`) and pnpm **11.19.0** (`packageManager`). Install those with your preferred version manager, then:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open [the local app](http://127.0.0.1:3100/app). No wallet, environment file, API key, Docker service, or chain connection is required for the local demo. It starts with 1,000 simulated ZIG. Create a goal, review it, add funds, withdraw, and close it when empty. Starting balance in the wizard is a planning input; funds enter the goal only through the separate Add funds action.

Names, targets, dates and notes stay in browser storage. Export them from Settings before clearing site data. Backups contain private information. Testnet metadata is isolated by network and wallet; removing metadata does not remove the onchain withdrawal path. Clearing local demo storage does remove its simulated ledger.

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

The desktop and mobile tests exercise the local lifecycle, metadata backup/recovery, wallet-unavailable state and review-dialog keyboard navigation. They do not prove live Keplr signing or testnet execution. CI is defined in [.github/workflows/ci.yml](.github/workflows/ci.yml); local command results and hosted CI results are separate evidence.

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

After a separately verified deployment, copy `.env.example` to `apps/web/.env.local` and fill only the public contract address/code ID. Never put a seed phrase, private key, wallet password or API credential in the app. Keplr connection code is implemented, but real extension signing, existing-chain metadata behavior and deployment smoke tests remain pending.

## Repository map

| Path | Purpose |
|---|---|
| `apps/web` | Dashboard, wizard, goal detail, activity, settings, wallet and local demo |
| `packages/goal-engine` | Exact decimal planning; Funding Health always uses 0% return |
| `packages/chain-config` | Testnet facts, live guards and integer denomination conversion |
| `packages/shared-types` | Validated private metadata and Rust-generated contract messages |
| `packages/strategy-types` | Idle descriptor and explicit future liquidity/capability types |
| `contracts/goal-manager` | Owner-only native idle custody, schema, tests and build script |
| `docs` | Architecture, evidence, product scope, security, deployment and future gates |

Valdora and WME integration are [deferred pending canonical interfaces](docs/research/VALDORA_STZIG.md). No invented messages, yield, stablecoin backing, fiat access or delegated wealth-management features are present. The demo's 1:1 display conversion is illustrative and never affects base-unit accounting.

See the [implementation report](docs/IMPLEMENTATION_REPORT.md), [threat model](docs/security/THREAT_MODEL.md), [security checklist](docs/security/SECURITY_CHECKLIST.md), [product scope](docs/product/PHASE1_PRD.md), and [truthful build log draft](docs/social/BUILD_LOG.md).
