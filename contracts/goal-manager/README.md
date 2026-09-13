# Goal Manager 0.1.0

Owner-only native-coin custody for idle savings goals. All money and external IDs are decimal JSON strings (`Uint128` / `Uint64`); timestamps are nanoseconds since Unix epoch, also strings. The denomination is injected at instantiation and validated against the Cosmos native-denom character/length rules. No business logic assumes a particular chain denomination.

`CreateGoal`, `Deposit`, `Withdraw`, `CloseGoal`, and `UpdateMetadataCommitment` operate on the sender's goals. Deposit requires exactly one nonzero coin in the configured denomination. Every other execute message and instantiate reject attached funds. A withdrawal sends only to the stored owner. Lifetime deposit/withdrawal counters and liabilities use checked arithmetic. Closing requires an empty active goal, retains its history, and permanently disables further mutation of that goal.

An optional config admin can only pause/resume deposits. Withdrawals and empty-goal closure remain available while paused. There is no owner reassignment, config-admin replacement, arbitrary execution, sweep, or migration entry point. **Instantiate with chain-level admin omitted (`None` / `--no-admin`)**; this is separate from the optional pause admin in the instantiate message. No deployment is included in this milestone.

Only a 64-character ASCII hexadecimal commitment is accepted as metadata (uppercase is normalized to lowercase). Names, plans, notes, targets, and deadlines belong in private local storage. Commitments are public and are not encryption. Contract events contain only public action/goal/accounting identifiers; the commitment is omitted from events but is visible in state and transaction input.

Unexpected direct bank transfers never credit goals and remain unsweepable surplus. `solvency` compares the actual bank balance in the native denomination against total liabilities. Owner pagination is exclusive, ascending by ID, defaults to 30, and caps at 100; closed goals remain in the index.

## Toolchain and verification

Rust **1.85.1**, CosmWasm standard/schema/core/crypto/derive **2.2.2** (locked), cw-storage-plus/cw2 **2.0.0**, cw-multi-test **2.2.0**. Keep `Cargo.lock` and use `--locked`. When using the isolated project toolchain, from the repository root:

```bash
export CARGO_HOME="$PWD/.toolchain/cargo"
export RUSTUP_HOME="$PWD/.toolchain/rustup"
export PATH="$PWD/.toolchain/cargo/bin:$PATH"
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test --workspace --locked
cargo schema --locked
node contracts/goal-manager/scripts/generate-types.mjs
```

The schema command always writes under `contracts/goal-manager/schema`, regardless of invocation directory. TypeScript generation uses the root development dependency `json-schema-to-typescript@15.0.4`; `packages/shared-types/src/contract.generated.ts` is generated exclusively from the combined Rust schema.

For the validated local Wasm build, install these public development tools once (no services or chain access):

```bash
cargo install cosmwasm-check --version 2.2.2 --locked --root .toolchain/check
npm install --prefix .toolchain/wasm-tools --ignore-scripts --no-audit --no-fund binaryen@123.0.0
bash contracts/goal-manager/scripts/build-wasm.sh
```

The script compiles with Cargo's release optimization profile for **developer validation only**, runs official Binaryen `wasm-opt -Oz --signext-lowering`, validates `artifacts/zigoals_goal_manager.wasm` with `cosmwasm-check` 2.2.2, and writes `artifacts/checksums.txt`. `BINARYEN_JS` and `COSMWASM_CHECK` may override tool paths. Raw `cargo wasm` output is **not** the final artifact: Rust 1.82+ precompiled standard-library indirect-call encodings can be rejected by CosmWasm 2.2 despite disabling reference-types for project code. This canonicalization is described by the [Rust Compiler Team](https://blog.rust-lang.org/2024/09/24/webassembly-targets-change-in-default-target-features/) and uses [official Binaryen](https://github.com/WebAssembly/binaryen/releases/tag/version_123).

This local artifact/report is non-authoritative for deployment preparation or upload. Release candidates must come from the two independent canonical Linux jobs and pass the [download verifier](../../docs/deployment/VERIFY_RELEASE_ARTIFACT.md); future upload also requires the [manual main-branch issuance process](../../docs/release/RELEASE_PROCESS.md), attestations and explicit owner approval.

Local Binaryen optimization and static compatibility validation are distinct from the CosmWasm Docker workspace optimizer. Docker was present but its daemon socket was absent in this environment, so the Docker optimizer was not run. Do not infer a container-reproducible release, an independent audit, or live-chain execution from the local checks.

## Test coverage

The integration suite uses cw-multi-test's real bank module: multiple owners/goals, repeated deposits, partial/full withdrawals, pause-with-exit, authorization, invalid denominations and funds, unknown/closed goals, lifecycle/history, commitments, pagination, events, unsolicited surplus, and 120 interleaved financial operations. A test-only bank fault proves an unsuccessful outgoing send rolls back both goal state and total liabilities. Direct native boundary tests cover zero/duplicate coin inputs, all nonpayable messages, ID exhaustion, deposit/withdrawal arithmetic overflow and liabilities underflow without partial state writes, and unsupported privileged message shapes.
