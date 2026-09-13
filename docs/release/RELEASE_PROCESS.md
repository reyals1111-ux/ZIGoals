# Manual contract candidate process

A candidate is reproducible build evidence, never permission to upload chain code. The owner must separately approve an exact checksum and complete the existing testnet deployment gates. No upload, signing, tagging or GitHub release is automated here.

1. Review the source, dependency/advisory results and PR's **Canonical reproducibility** run. GitHub PR checkout uses its synthetic merge SHA (`github.sha`), not necessarily the feature head. Record that exact SHA and run/attempt, inspect both `canonical-build-a` and `canonical-build-b` jobs, and download `reproducible-<SHA>`. This is PR evidence, not manual issuance or an attested candidate. Both raw diagnostic artifacts are retained for 30 days; on mismatch there is no reproducible artifact.
2. After owner-controlled merge and availability of the workflow on the default branch, independently determine the reviewed full main SHA. Manually run **Manual release candidate**, select `main` and pass that SHA as `expected_commit`. Any ref/commit mismatch stops issuance. If main moves before dispatch, re-review its new SHA; do not take a commit from an untrusted manifest.
3. Wait for every gate: existing lint/typecheck/unit/production-build/browser/network-doctor/secret checks; Rust format/Clippy/tests/schema drift; production npm audit; current RustSec audit; two fresh canonical builds; strict byte/source/environment comparison; downloaded-candidate validation; official attestation. The audit compiler is Rust 1.88.0 for cargo-audit 0.22.2 only; contract builds still use 1.85.1. Known unmaintained-crate notices remain visible; vulnerability findings block the audit job without an ignore list.
4. Download `release-candidate-<SHA>` from that successful manual run. Preserve Wasm, `artifact-manifest.json`, `checksums.txt`, `attestation.jsonl`, the source SHA and run URL. Verify using [the download checklist](../deployment/VERIFY_RELEASE_ARTIFACT.md). The intermediate `validated-for-issuance-*` artifact and ordinary CI developer artifacts are not evidence that attestation/issuance finished.
5. Archive the verified candidate externally before GitHub retention expires (90 days for issued candidates). Any rebuilt bytes, toolchain/environment change, edited manifest or source change require new evidence and separate owner review. Only an explicit owner decision may approve a future upload; no status in this build schema can express that approval.

## Commands

From a reviewed checkout with the pinned local dependencies installed, the interfaces are:

```bash
node scripts/release/build.mjs "$EXPECTED_COMMIT" "$NEW_OUTPUT_DIR"
node scripts/release/verify.mjs compare "$EXPECTED_COMMIT" "$TRUSTED_VALIDATOR" "$LEFT_DIR" "$RIGHT_DIR" "$NEW_OUTPUT_DIR"
node scripts/release/verify.mjs verify "$EXPECTED_COMMIT" "$TRUSTED_VALIDATOR" "$CANDIDATE_DIR"
```

The build command is authoritative only in the documented GitHub-hosted Linux workflow. For local diagnostic compatibility, append `--compatibility`; it deliberately cannot produce a canonical manifest. Use a fresh output path outside the source tree. Install Binaryen with `npm ci --prefix scripts/release/toolchain --ignore-scripts --no-audit --no-fund`; it is locked by package integrity. Install cosmwasm-check as already documented in the contract README. Never execute a tool path suggested by downloaded metadata.

## Current execution boundary

The first manual issuance **succeeded**: [run 34772005556](https://github.com/reyals1111-ux/ZIGoals/actions/runs/34772005556), exact main source `3645b489e4bc2a31ef16d39bdc27f7c00e2ecd72`. Its 255532-byte Wasm SHA256 is `9ac9fec2941db7be4db13b4f6d7f8512b3d4fb87165e0284eaa10385782bea10`. M5 downloaded the existing candidate, reran strict source/byte/validator checks, and verified native attestations for both Wasm and manifest with exact main source/signer constraints. See [verification record](../verification/m5/RELEASE_VERIFICATION.json).

Status is **ATTESTED_CANDIDATE_NOT_APPROVED**. The candidate is not approved for chain upload. Main `6be2de74f22f676e6a633ed05208decebb0dbff3`, the M5 branch and future commits have no attestation claim from this run, even if Wasm bytes match. Later exact-main issuance is optional and owner-only after review; M5 does not trigger it, create a tag or publish a GitHub Release. [ADR-005](../architecture/ADR-005-canonical-release-build.md) defines the unchanged trust model.
