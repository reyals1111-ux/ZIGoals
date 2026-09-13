# Public deployment manifest, version 2

The schema in `packages/shared-types/src/deployment.ts` accepts exactly two states. Unknown fields, legacy versions and partial/malformed deployments are refused. This is public configuration: never add a mnemonic, key, token, private plan or signature. The checked-in `apps/web/config/deployment.json` is **PREPARED_NOT_DEPLOYED** and enables no financial action.

`node scripts/prepare-deployment.mjs` accepts no arguments. It reads live testnet identity/denomination/software version and RPC readiness, hashes the actual `artifacts/zigoals_goal_manager.wasm`, compares the matching build report and reruns the local CosmWasm validator. It prints unsigned JSON only; no wallet, upload, instantiate or broadcast API is present. Redirect the output to a review file if desired. A dirty preparation snapshot is permitted and explicitly labelled; a deployed manifest requires a clean reviewed build.

Required common fields: schemaVersion2, environment=`testnet`, chainId=`zig-test-2`, chainVersion=`v5.0.0-patch-1`, denom=`azig`, decimals18, wasmSha256, null migrationAdmin, explicit nullable pauseAdmin, contractName=`crates.io:zigoals-goal-manager`, contractVersion=`0.1.0`, source gitCommit, buildEnvironment (OS, architecture, pinned Rust/Binaryen/validator and dirty flag), preparedAt, rpcUsed and restUsed.

| Field | PREPARED_NOT_DEPLOYED | DEPLOYED |
|---|---|---|
| codeId | null | Positive exact integer string within CosmJS safe code-ID range |
| contractAddress | null | Valid 32-byte `zig` Bech32 address |
| uploadTx / instantiateTx | null | Distinct 64-digit hex receipt hashes |
| deployerPublicAddress | null | Valid 20-byte `zig` account |
| deploymentTimestamp | null | Actual canonical UTC time after preparation |
| migrationAdmin | null | null, immutable deployment required |
| pauseAdmin | Explicit null by default | Explicit null or separately approved valid account |
| explorerVerification | NOT_VERIFIED, null URL/time | VERIFIED, exact testnet ZIGScan contract URL and actual verification time |

Validate a public file with `node scripts/validate-deployment.mjs /path/to/manifest.json`. It reports **structural validation only** (`chainVerified:false`). Well-formed JSON is not evidence that a deployment occurred. Do not hand-fill imaginary identifiers or upgrade prepared state merely to bypass the gate. Keep the historical v1 prepared file under `docs/deployment/prepared-manifest.json` as M1 evidence; it is not accepted frontend configuration.

After separately authorized owner deployment and verification, replace the app's public JSON with the reviewed v2 deployed manifest and rebuild. Old `NEXT_PUBLIC_GOAL_MANAGER_ADDRESS`/`CODE_ID` variables are ignored. The app rechecks chain/software/denomination, code ID, creator, absence of migration admin, actual code checksum, cw2 name/version and expected pause admin before fee simulation and again before signing/broadcast. A failure disables that action. Diagnostics also offer read-only contract checks once a deployment exists. RPC evidence remains trusted transport, not a light-client consensus proof.

Record the exact approved artifact's bytes/hash, host and source commit. A Linux/Mac checksum difference is an investigation result, not permission to substitute a different artifact after approval. The checksum in the final manifest must match the actual uploaded code. See the [runbook](TESTNET.md) and [owner exit checklist](OWNER_TESTNET_CHECKLIST.md).
