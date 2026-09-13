# Verify a downloaded contract candidate

Use verification scripts from a separately reviewed source checkout that contains the expected commit object (fetch that reviewed commit if your clone is shallow). Obtain the expected full source commit and successful GitHub run from a trusted review record, not from the downloaded manifest. For PR evidence use the actual synthetic merge SHA; for issued candidates require the reviewed main SHA and a completed **Manual release candidate** run. Review both independent build jobs and their image identities. Two invented job names in unsigned JSON prove nothing.

1. Download the named artifact from the expected repository/run; unpack into a new directory. Identify the actual Wasm, not the artifact ZIP checksum. Confirm the four candidate files (Wasm, manifest, checksum file, signed bundle). PR reproducibility evidence lacks a bundle and is not an issued candidate.
2. Install the reviewed, pinned cosmwasm-check 2.2.2 yourself. Choose its executable path explicitly. The verifier never reads executable paths from metadata.
3. Run shared strict validation. It checks bounded schema/fields/status, `NOT_APPROVED`, exact expected source, actual Wasm SHA-256 and byte count, source tree and Cargo.lock from the trusted checkout commit, recorded pinned environment/validator and two distinct job identities; then reruns the trusted validator against actual bytes. Exit nonzero means reject.

```bash
node scripts/release/verify.mjs verify "$EXPECTED_COMMIT" "$TRUSTED_VALIDATOR" "$CANDIDATE_DIR"
```

4. Independently verify provenance for both the Wasm and its manifest. The expected repository and workflow below are fixed review policy; replace them only if you deliberately reviewed a different repository. GitHub CLI must support the shown source/signer constraints; an unsupported flag is a failed verification, not permission to omit it.

```bash
gh attestation verify "$CANDIDATE_DIR/zigoals_goal_manager.wasm" \
  --repo reyals1111-ux/ZIGoals \
  --signer-workflow reyals1111-ux/ZIGoals/.github/workflows/release-candidate.yml \
  --source-digest "$EXPECTED_COMMIT" --signer-digest "$EXPECTED_COMMIT" \
  --source-ref refs/heads/main --deny-self-hosted-runners \
  --bundle "$CANDIDATE_DIR/attestation.jsonl"
gh attestation verify "$CANDIDATE_DIR/artifact-manifest.json" \
  --repo reyals1111-ux/ZIGoals \
  --signer-workflow reyals1111-ux/ZIGoals/.github/workflows/release-candidate.yml \
  --source-digest "$EXPECTED_COMMIT" --signer-digest "$EXPECTED_COMMIT" \
  --source-ref refs/heads/main --deny-self-hosted-runners \
  --bundle "$CANDIDATE_DIR/attestation.jsonl"
```

These flags constrain source commit/ref, signer workflow/commit and runner trust, rather than accepting any attestation in the repository. The manifest is also attested, binding the recorded build evidence to its exact bytes. GitHub notes that certificate identity and verified timestamps have stronger trust than workflow-authored predicate fields; source/build metadata still requires review of the signed workflow. [Official CLI policy and verification flags](https://cli.github.com/manual/gh_attestation_verify).

5. Compare the printed size and SHA-256 with the recorded review and checksum file. Confirm source tree and Cargo.lock hash against the trusted checkout (`git rev-parse "$EXPECTED_COMMIT^{tree}"` and SHA-256 of `git show "$EXPECTED_COMMIT:Cargo.lock"`). Preserve the verification outputs and run URL. Missing/wrong attestations reject a purported manually issued candidate. For explicitly unsigned PR evidence, record provenance as unverified and do not silently treat it as an issued candidate.

A successful check is not professional audit, owner upload approval, chain deployment, uploaded-code checksum verification or proof of immutable/hermetic builders. The next separate owner-controlled process remains [TESTNET.md](TESTNET.md), including funding/eligibility, actual chain checksum and wallet checks. Never substitute newly built bytes for the reviewed checksum.
