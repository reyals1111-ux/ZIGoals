# Milestone 3 — independent-host Wasm evidence

Actual [GitHub PR run 34763386600](https://github.com/reyals1111-ux/ZIGoals/actions/runs/34763386600) succeeded on feature head `d3538c8b6a9794d739ecdcb5573b361f14498e73`. Checkout tested the synthetic PR merge commit `dc0e7b556df4462084e7dc68956b4e4fa72c96da`; this is distinct from the feature SHA and did not merge the PR into main. The artifact was downloaded and its actual byte count/hash recomputed locally, then independently accepted by the local cosmwasm-check2.2.2 tool.

| Build | Bytes | SHA256 |
|---|---:|---|
| Clean Mac arm64, source `28cbf9f` | 258,540 | `090b19225a93fc191810426973001ab400452799d1925aadddadef1fc0cc6e25` |
| GitHub-hosted Linux x64 | 255,948 | `43f7ebb8b18fc8108d64173018e6e2b37308c69e476a4edb0a9cf9b9905d6f73` |
| Temporary Mac path-remapping experiment | 255,948 | `5956b595f313257b9bd68d93fe7dc39bc929a1e0f57d57112696c63efc54d543` |

**Cross-host byte identity is NOT ESTABLISHED.** The Linux hash matches the checksum already logged in [PR1's Linux run](https://github.com/reyals1111-ux/ZIGoals/actions/runs/34758309957); only the M3 artifact was downloaded for this comparison. Both original artifacts pass validation. This is stronger independent-host validation and provenance, not a claim that Mac and Linux produced the same bytes.

## What was compared

- Both use Rust1.85.1, compiler commit `4eb161250e340c8f48f66e2b929ef4a5bed7c181`, LLVM19.1.7, Binaryen123, cosmwasm-check2.2.2, Node24.19.0 and `wasm32-unknown-unknown`.
- Compiler hosts differ: `aarch64-apple-darwin` versus `x86_64-unknown-linux-gnu`. Kernel releases are `25.6.0` and `6.17.0-1022-azure`. CI uses `ubuntu-latest`; no unobserved distro/image version is inferred.
- Cargo.lock SHA256 is identical: `79aee297543060d068666823087e6304e1f5806f4a6534984ab5b389fa105565`. No custody-contract production source or Rust dependency change occurred. Release profile and tracked target flags match; optimizer arguments are `-Oz --signext-lowering` on both hosts.
- All 24 import descriptors and 17 export descriptors match, including instantiate/execute/query and required CosmWasm capabilities. This is ABI comparison, not a proof of identical semantics or actual chain execution.
- Optimized binaries retain diagnostic source paths from dependency files. Mac embeds its local Cargo home; Linux embeds `/home/runner/.cargo`. Disassembly confirmed those paths and remaining function/table-reference differences. No private goal or wallet material is involved.

## Controlled path experiment

A separate temporary target directory compiled the unchanged source on the Mac with the original target-feature flags plus `--remap-path-prefix=$CARGO_HOME=/home/runner/.cargo`, followed by the original Binaryen flags and actual validation. It removed exactly 2,592 bytes and matched Linux's byte size, but **not its hash**. The ordinary artifact and build script were not replaced. Remaining code/table layout differences were observed but their full compiler/linker cause was not isolated; path normalization alone is insufficient. No semantic-equivalence claim is made from matching imports, exports or size.

```bash
export CARGO_TARGET_DIR=/tmp/zigoals-m3-path-remap-target
export RUSTFLAGS="-C target-feature=-reference-types,-multivalue --remap-path-prefix=$CARGO_HOME=/home/runner/.cargo"
cargo wasm --locked
node .toolchain/wasm-tools/node_modules/binaryen/bin/wasm-opt /tmp/zigoals-m3-path-remap-target/wasm32-unknown-unknown/release/zigoals_goal_manager.wasm -Oz --signext-lowering -o /tmp/zigoals-m3-path-remapped.wasm
.toolchain/check/bin/cosmwasm-check /tmp/zigoals-m3-path-remapped.wasm
```

This was a per-command experiment, with repository-local pinned Cargo/Rustup/Node paths and offline dependencies. No global flags or shell configuration changed. A future reproducibility improvement should standardize the build environment/source-path policy and compare repeated clean outputs before adopting a new canonical hash.

## Release implication

A different cross-host checksum alone is **not** a release/deployment blocker. Review and approve one exact artifact, retain its source/toolchain report and verify that exact checksum on the uploaded code. Never silently substitute the experiment or another host's bytes after approval. Deployment remains blocked separately by test funding, upload eligibility and required owner authorization; no transaction was sent.

Machine-readable evidence: [Mac](../verification/M3_MAC_BUILD.json), [Linux](../verification/M3_LINUX_BUILD.json), [comparison](../verification/M3_WASM_COMPARISON.json). CI artifact `goal-manager-linux-dc0e7b556df4462084e7dc68956b4e4fa72c96da` contains Wasm, checksums and build report (30-day retention); its archive digest/size is not the Wasm's hash/size. No Docker optimizer or live wasmvm execution is claimed.
