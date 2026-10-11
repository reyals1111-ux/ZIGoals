# Release supply-chain review

Historical baseline scope: M4 release infrastructure, contract/application lockfiles and the pinned OpenNext/Workers hosting toolchain on 2026-09-13. Results below distinguish the initial release-tooling scan from the subsequent hosting dependency scans. Later dependency changes require new audit and install-script review.

## Sources and execution privileges

- Cargo.lock registry entries use the crates.io index and crate checksums; workspace/path entries are reviewed repository source. `--locked` prevents unnoticed resolution updates. Rust itself is installed by the runner's existing rustup at exact 1.85.1; cosmwasm-check is built from pinned 2.2.2 with its published locked dependencies. Cargo build scripts/procedural macros still execute build-time dependency code; version pins are not an audit of those sources.
- Binaryen 123.0.0 is fetched from the official npm registry through the new committed npm lockfile. Its SHA-512 integrity is enforced by `npm ci`; lifecycle scripts are disabled. No floating optimizer URL, custom binary patcher, shell-piped downloader or new application dependency is introduced by this task.
- Existing application installation uses pnpm 11.19.0 and the frozen pnpm lockfile. `pnpm-workspace.yaml` explicitly denies `esbuild`, `workerd` and `unrs-resolver` build scripts. Existing CI installs pnpm at the pinned version on ephemeral hosted runners. Next's platform packages and Chrome installation remain existing tooling trust boundaries. No install script is granted OIDC or write-attestation permission.
- Workflows pin official GitHub actions with supported Node24 runtimes by full verified commit (checkout7.0.1, setup-node7.0.0, upload-artifact7.0.1, download-artifact8.0.1; exact pins in ADR-005). Automatic package-manager caching is explicitly disabled. Upload keeps archive=true, overwrite=false and hidden-files=false defaults; download keeps exact same-run names, automatic archive extraction and digest-mismatch=error defaults. Checkout credentials are not persisted. PR/reusable build jobs get read-contents only. The sole OIDC job runs no repository code or dependency installer; its official actions download the same-run verified artifact and attest exact Wasm+manifest. There is no `pull_request_target`, secrets inheritance, arbitrary artifact path input or automatic approval/deployment.

## Actual local advisory results

`pnpm audit --prod --json` completed successfully with zero reported vulnerabilities (134 total dependencies in its returned metadata). This is the audited production dependency set at task 1, not future hosting dependencies or proof of absence of unknown vulnerabilities.

Pinned official [cargo-audit 0.22.2](https://github.com/rustsec/rustsec/releases/tag/cargo-audit/v0.22.2) was installed locally with its required Rust 1.88.0, separate from the contract compiler. The actual Cargo.lock scan completed successfully: 119 dependencies, zero vulnerability findings, and two **unmaintained** notices: `derivative 2.2.0` ([RUSTSEC-2024-0388](https://rustsec.org/advisories/RUSTSEC-2024-0388.html)) and `paste 1.0.15` ([RUSTSEC-2024-0436](https://rustsec.org/advisories/RUSTSEC-2024-0436.html)). These are maintenance warnings, not confirmed exploitable contract vulnerabilities. No dependency or contract semantics were changed to hide them. The database commit was `b50980aad8b8f14f77e25a97b32dd94bf008b0af`; hosted manual issuance fetches current advisories again and blocks vulnerability findings. No ignore list is added.

Re-run with the pinned task-local audit executable and database path:

```bash
.toolchain/audit/bin/cargo-audit audit --file Cargo.lock --db .toolchain/advisory-db
```

## Hosting tools and license inventory

Task 2 added development/build tools `@opennextjs/cloudflare 1.20.6` and `wrangler 4.131.1`, retaining Next 16.3.5. The adapter expands build-time dependencies substantially, including AWS helpers and minifiers; Wrangler brings pinned prerelease Miniflare/unenv dependencies. Their presence is a tooling trust boundary, not a new financial integration or proof those packages enter the browser bundle. Installation used ignore-scripts; the offline frozen reinstall passed, and platform binaries worked with fallback install scripts disabled. Inspected esbuild/workerd fallback scripts can install/download platform packages, so their execution remains explicitly denied alongside unrs-resolver. Added lockfile package resolutions use SHA-512 integrity, with no custom tarball/Git/file sources; no existing package metadata changed or packages were removed in the reviewed addition.

After that addition, actual `pnpm audit --prod --json` and `pnpm audit --json` both returned zero advisories: their respective metadata reported 133 production-set and 846 full-set dependencies. These saved Task 2 scans cover known advisories at the time of the scan. The actual audit outputs, lifecycle-script inventory and lockfile review support this update; the final milestone report records integrated verification.

The repository Apache-2.0 license is retained. The installed macOS package metadata includes MIT/Apache/ISC/BSD/0BSD entries, LGPL-3.0-or-later `@img/sharp-libvips-darwin-arm64 1.3.3` and CC-BY-4.0 `caniuse-lite 1.0.30001810`. Full tooling also includes MPL-2.0 `axe-core 4.13.0`, `lightningcss 1.33.0` and `lightningcss-darwin-arm64 1.33.0`. Preserve upstream notices when distributing those dependencies. The [installed license inventory](../verification/m4/LICENSE_INVENTORY.json) records actual names/versions; it is neither legal certification nor a claim that every installed dependency is distributed to browsers. Other platform optional packages require their own distribution inventory.

## Native GitHub checks evaluated

GitHub dependency review can inspect newly changed lockfile dependencies in public-repository PRs when the dependency graph is enabled. We retain lockfile review and actual pnpm/RustSec scans here; no additional dependency-review action is added without confirming graph snapshots and its benefit beyond those gates. [Official dependency-review behavior](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-review).

Current CodeQL documentation includes JavaScript/TypeScript, Rust and GitHub Actions workflow support. It could add data-flow/workflow findings, but enabling a new code-scanning service and interpreting its initial results is separate from implementing deterministic candidate issuance. We do not claim CodeQL ran or provides CosmWasm semantic coverage. [Official CodeQL supported languages and setup](https://docs.github.com/en/code-security/concepts/code-scanning/codeql/codeql-code-scanning). No repository settings were changed.

## M5 refresh

Fresh production and full pnpm scans returned zero vulnerability advisories for 133 and 846 dependencies respectively. Rust audit refreshed the database successfully; its latest returned commit remains `b50980aad8b8f14f77e25a97b32dd94bf008b0af` (2026-09-09), with 119 locked dependencies, zero vulnerability findings and the same derivative/paste unmaintained notices. Frozen offline installation passed and `pnpm store status` reported untouched packages. No dependency versions changed. See [dated M5 scan](../verification/m5/DEPENDENCY_SCAN.json).

The existing successful owner issuance logs still contain the official download-artifact `DEP0005 Buffer()` deprecation. It is not suppressed or replaced with a custom action. M5 leaves the full-SHA action pins and OIDC isolation unchanged. Advisory scans and integrity checks are bounded evidence, not a professional security audit.
