# ADR-005 — Canonical Linux contract release builds

Status: accepted for M4 implementation. Hosted results are recorded separately; this decision is not a successful build or an upload approval.

## Decision

The canonical artifact comes from two separate fresh GitHub-hosted `ubuntu-24.04` x64 jobs at the same full source commit. They share no Cargo target directory, compiler cache, or downloaded build output. Each installs Rust 1.85.1, cosmwasm-check 2.2.2 and integrity-locked Binaryen 123.0.0. Node is 24.19.0. A clean-source check, empty temporary target, explicit compiler environment, fixed C locale/UTC and source-date epoch derived from the commit make uncontrolled build inputs visible or unavailable. No contract behavior changes.

The wrapper remaps the absolute checkout, Cargo and Rustup prefixes to `/src`, `/cargo`, `/rustup`, plus relative contract paths. It preserves `-C target-feature=-reference-types,-multivalue` and Binaryen `-Oz --signext-lowering`. Rust documents that remapping is textual, last-match wins and external/linker paths can remain; it is a best-effort normalization, not a hermetic-build guarantee. We use flags supported by the pinned compiler, without newer scope options. [Official rustc guidance](https://doc.rust-lang.org/rustc/remap-source-paths.html).

The recorded kernel, ImageOS and ImageVersion are actual environment observations. The runner label is moving, not a digest-pinned image. Matching outputs establish repeated independent Linux-job reproducibility for that source and recorded environment; they do not establish independent infrastructure trust, immutable infrastructure, a professional security audit, or Mac/Linux equality. M3's differing Mac and Linux hashes remain valid historical evidence. A digest-pinned container is a future environmental-hardening option, with a separate maintenance/distribution cost.

## Fail-closed evidence

One fixed JSON Schema and a shared validator constrain manifest fields, size, toolchain, statuses, source identity and job identities. The CLI reads each actual Wasm, independently measures size/hash, compares bytes/source/lock/environment, and executes the caller-selected trusted cosmwasm-check 2.2.2 again. A mismatch leaves the two diagnostic artifacts and prevents the comparison artifact. Canonical source must be clean both before and after compilation. Output directories must be new, preventing accidental stale-success reuse.

`BUILD_VERIFIED` means one recorded build; `REPRODUCIBLE` requires two distinct jobs from the same workflow run/attempt/repository. Both retain `approval: NOT_APPROVED`. The schema deliberately has no upload-approved state. A metadata claim by itself cannot prove that those jobs happened: independently inspect GitHub jobs and trusted source, and verify manual candidate attestations. Local `--compatibility` output is named `development-report.json`, has `DEVELOPMENT_ONLY` status and cannot pass canonical verification. The existing developer script remains supported and labels its output non-authoritative.

## Issuance and provenance

PR execution has only read-contents permission and no OIDC. Manual issuance requires the selected `main` SHA to equal a separately supplied reviewed full commit, then runs complete web/Rust/schema/browser/security gates and the same two-build workflow. A separate read-only job validates the downloaded evidence. Only the final job gets read-contents/write-attestations/write-OIDC, and it executes no checkout, dependency installer or repository script. Official pinned actions download the already verified artifact and attest the exact Wasm and manifest. No workflow signs a transaction, creates a release/tag, uploads chain code or changes owner approval.

GitHub's current documented mechanism is `actions/attest@v4`, pinned here to `1e69f48acb82d1966a394da916b4c1698aa569d6`; required permissions and `subject-path` follow the [official attestation instructions](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations). The attestation job is directly in `release-candidate.yml`, so that file is the signer identity. Attestation proves provenance of exact bytes, not security, correctness or approval.

A new `workflow_dispatch` workflow must exist on the default branch to be available. No unmerged-feature attestation is claimed; PR reproducibility evidence is the available pre-merge check. Manual issuance remains owner-run after merge/default-branch availability. [GitHub event/ref rules](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch).

## Reviewed immutable action pins

Resolved directly through the official repositories' commit API on 2026-09-13. Updating a tag does not update these workflow pins.

| Official action | Tag | Commit |
|---|---|---|
| actions/checkout | v4 | `11d5960a326750d5838078e36cf38b85af677262` |
| actions/setup-node | v4 | `49933ea5288caeca8642d1e84afbd3f7d6820020` |
| actions/upload-artifact | v4 | `ea165f8d65b6e75b540449e92b4886f43607fa02` |
| actions/download-artifact | v5 | `634f93cb2916e3fdff6788551b99b062d0335ce0` |
| actions/attest | v4 | `1e69f48acb82d1966a394da916b4c1698aa569d6` |

Sources: the corresponding `https://api.github.com/repos/actions/<name>/commits/<tag>` API responses; action documentation lives in each [official actions repository](https://github.com/actions).
