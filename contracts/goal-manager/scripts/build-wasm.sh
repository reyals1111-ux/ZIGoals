#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
cd "$ROOT"
if [[ -x "$ROOT/.toolchain/cargo/bin/cargo" ]]; then
  export CARGO_HOME="$ROOT/.toolchain/cargo"
  export RUSTUP_HOME="$ROOT/.toolchain/rustup"
  export PATH="$ROOT/.toolchain/cargo/bin:$PATH"
fi
BINARYEN_JS=${BINARYEN_JS:-"$ROOT/.toolchain/wasm-tools/node_modules/binaryen/bin/wasm-opt"}
COSMWASM_CHECK=${COSMWASM_CHECK:-"$ROOT/.toolchain/check/bin/cosmwasm-check"}
[[ -f "$BINARYEN_JS" ]] || { echo "Install binaryen@123.0.0 as documented in contracts/goal-manager/README.md" >&2; exit 1; }
[[ -x "$COSMWASM_CHECK" ]] || { echo "Install cosmwasm-check 2.2.2 as documented in contracts/goal-manager/README.md" >&2; exit 1; }
cargo wasm --locked
mkdir -p artifacts
# Rust 1.82+ precompiled std contains overlong call_indirect encodings. Binaryen
# canonicalizes those encodings; no custom byte rewriting or runtime changes.
node "$BINARYEN_JS" target/wasm32-unknown-unknown/release/zigoals_goal_manager.wasm \
  -Oz --signext-lowering -o artifacts/zigoals_goal_manager.wasm
"$COSMWASM_CHECK" artifacts/zigoals_goal_manager.wasm
shasum -a 256 artifacts/zigoals_goal_manager.wasm > artifacts/checksums.txt
cat artifacts/checksums.txt
