# M4 release supply-chain review

Review scope: task-1 release infrastructure and existing application/contract lockfiles on 2026-09-13. Hosting adapters added later require a fresh audit and install-script review; this document does not pre-approve them.

## Sources and execution privileges

- Cargo.lock registry entries use the crates.io index and crate checksums; workspace/path entries are reviewed repository source. `--locked` prevents unnoticed resolution updates. Rust itself is installed by the runner's existing rustup at exact 1.85.1; cosmwasm-check is built from pinned 2.2.2 with its published locked dependencies. Cargo build scripts/procedural macros still execute build-time dependency code; version pins are not an audit of those sources.
- Binaryen 123.0.0 is fetched from the official npm registry through the new committed npm lockfile. Its SHA-512 integrity is enforced by `npm ci`; lifecycle scripts are disabled. No floating optimizer URL, custom binary patcher, shell-piped downloader or new application dependency is introduced by this task.
- Existing application installation uses pnpm 11.19.0 and the frozen pnpm lockfile. `pnpm-workspace.yaml` explicitly denies `unrs-resolver` build scripts. Existing CI installs pnpm at the pinned version on ephemeral hosted runners. Next's platform packages and Chrome installation remain existing tooling trust boundaries. No install script is granted OIDC or write-attestation permission.
- New workflows pin official GitHub actions by full verified commit. Checkout credentials are not persisted. PR/reusable build jobs get read-contents only. The sole OIDC job runs no repository code or dependency installer; its official actions download the same-run verified artifact and attest exact Wasm+manifest. There is no `pull_request_target`, secrets inheritance, arbitrary artifact path input or automatic approval/deployment.

## Actual local advisory results

`pnpm audit --prod --json` completed successfully with zero reported vulnerabilities (134 total dependencies in its returned metadata). This is the audited production dependency set at task 1, not future hosting dependencies or proof of absence of unknown vulnerabilities.

Pinned official [cargo-audit 0.22.2](https://github.com/rustsec/rustsec/releases/tag/cargo-audit/v0.22.2) was installed locally with its required Rust 1.88.0, separate from the contract compiler. The actual Cargo.lock scan completed successfully: 119 dependencies, zero vulnerability findings, and two **unmaintained** notices: `derivative 2.2.0` ([RUSTSEC-2024-0388](https://rustsec.org/advisories/RUSTSEC-2024-0388.html)) and `paste 1.0.15` ([RUSTSEC-2024-0436](https://rustsec.org/advisories/RUSTSEC-2024-0436.html)). These are maintenance warnings, not confirmed exploitable contract vulnerabilities. No dependency or contract semantics were changed to hide them. The database commit was `b50980aad8b8f14f77e25a97b32dd94bf008b0af`; hosted manual issuance fetches current advisories again and blocks vulnerability findings. No ignore list is added.

Re-run with the pinned task-local audit executable and database path:

```bash
.toolchain/audit/bin/cargo-audit audit --file Cargo.lock --db .toolchain/advisory-db
```

## Native GitHub checks evaluated

GitHub dependency review can inspect newly changed lockfile dependencies in public-repository PRs when the dependency graph is enabled. We retain lockfile review and actual pnpm/RustSec scans here; no additional dependency-review action is added without confirming graph snapshots and its benefit beyond those gates. [Official dependency-review behavior](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-review).

Current CodeQL documentation includes JavaScript/TypeScript, Rust and GitHub Actions workflow support. It could add data-flow/workflow findings, but enabling a new code-scanning service and interpreting its initial results is separate from implementing deterministic candidate issuance. We do not claim CodeQL ran or provides CosmWasm semantic coverage. [Official CodeQL supported languages and setup](https://docs.github.com/en/code-security/concepts/code-scanning/codeql/codeql-code-scanning). No repository settings were changed.
