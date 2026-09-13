# ZIGoals — Run 4 report

Milestone 4 prepares a public web Alpha and a canonical contract release process. Goal Manager is **NOT DEPLOYED**. Public Alpha is **PREPARED_NOT_DEPLOYED**. No chain upload, financial signature, transaction broadcast, tag, release, outreach or production landing change occurred.

## 1. Starting main commit

Fetched and verified clean main at `7d354e3c72fa671abc100facf908b247fb992cc0`. M1–M2 and M3 were already merged; implementation continued from that baseline.

## 2. M3 post-merge CI evidence

[Main push run 34764912650](https://github.com/reyals1111-ux/ZIGoals/actions/runs/34764912650) succeeded. [PR #2](https://github.com/reyals1111-ux/ZIGoals/pull/2) is merged. Historical M1–M3 reports retain the facts observed during those runs.

## 3. Branch and commits

Work is on `feat/m4-release-alpha`, targeting main in [PR #3](https://github.com/reyals1111-ux/ZIGoals/pull/3). Logical commits cover design, current baseline, canonical tooling, public safety and hosting, release handoff integration, and final evidence. Verified implementation head: `736f195`. Core commits: `f2e3a21`/`60e80db` release tooling; `0f6f023` public Alpha; `f70c98c`/`9dc2f5f` canonical preparation and current guidance; `1edf000`/`736f195` review test repairs. Subsequent documentation commits record evidence without changing contract semantics.

## 4. Baseline tests

Fresh baseline: **399 JavaScript tests, 25 Rust tests, 30 production browser cases and full Chrome process restart passed**. Frozen installation, lint, types, production build, Rust formatting/Clippy, schema/generated types, Wasm validation and limited tracked secret-pattern scanning passed. See [BASELINE.json](verification/m4/BASELINE.json).

## 5. Canonical release-build decision

[ADR-005](architecture/ADR-005-canonical-release-build.md) chooses two fresh GitHub-hosted Ubuntu 24 x64 jobs with no shared compiler cache/target directory. Rust 1.85.1, Node 24.19.0, Binaryen 123 and cosmwasm-check 2.2.2 are pinned. The moving runner image/kernel are recorded; this is not an immutable-container claim. Mac builds remain developer verification only.

## 6. Reproducibility investigation

Normalized source/Cargo/Rustup/target paths, clean source checks, explicitly controlled compiler environment, locale, timezone and commit-derived SOURCE_DATE_EPOCH remove avoidable inputs without changing contract semantics. The normalized Mac build is 255,532 bytes / `ea33ec7f6dadc50e1467cbdaf9767a35b85e6b6778b1a7ae6e1d9143222c94d6`; the Linux build has equal size but different bytes. Section comparison finds differences in function, element, code and data sections and no custom sections. This does not establish a remaining root cause or semantic equivalence. Original M3 Mac/Linux mismatch remains documented.

## 7. Two-build checksum results

First actual [canonical run 34767074194](https://github.com/reyals1111-ux/ZIGoals/actions/runs/34767074194) produced two independently built, validated **255,532-byte** Wasm files with matching SHA256 `9ac9fec2941db7be4db13b4f6d7f8512b3d4fb87165e0284eaa10385782bea10`. The actual build checkout was synthetic PR merge `9a0f7681617e8fd98d1e44221bca7aab3bc4fcad`, distinct from feature head `60e80db`. Downloaded bytes and comparison were independently reverified locally. The integrated source has been pushed for fresh hosted checks; the first candidate above remains the observed canonical evidence until those checks finish.

## 8. Canonical artifact status and hash

The canonical candidate status is **REPRODUCIBLE**, with approval **NOT_APPROVED**. Matching builds do not authorize upload. The manifest records exact source/tree, Cargo.lock, tools, environment, run/job identities, size and digest. [Candidate evidence](verification/m4/FIRST_PR_CANDIDATE.json) is metadata for the actual first unsigned PR artifact, not proof by itself.

## 9. Provenance and attestation

Official GitHub native keyless attestation is implemented for the exact Wasm and manifest in a main-only manual workflow with an explicit expected commit. The isolated OIDC job runs official pinned actions and no repository code/dependency installer. PR jobs have read-only permissions and cannot issue attestations. **Attestation has NOT RUN**: the workflow must first reach reviewed default-branch source through the owner's merge decision. No provenance has been invented.

## 10. Release workflow

[Release process](release/RELEASE_PROCESS.md) defines a possible future `v0.1.0-alpha.1`, later Alpha increments and `0.1.0-testnet.1`. Manual candidate issuance requires full verification, two clean canonical builds and advisory review. It never deploys to ZIGChain, approves an upload, creates wallet material or deploys mainnet. No tag or release was created.

## 11. Download and verification

[Owner verification guide](deployment/VERIFY_RELEASE_ARTIFACT.md) requires independently trusted source/run identity, strict closed metadata, actual hash/size, pinned toolchain/environment and real cosmwasm-check. Future issued artifacts additionally require GitHub attestation verification. Read-only deployment preparation accepts a verified reproducible canonical candidate and explicit expected source, and refuses developer/single-build evidence; all live deployment identifiers remain null.

## 12. Cloudflare architecture

[Cloudflare guide](deployment/CLOUDFLARE_ALPHA.md) packages the existing Next 16.3.5 app with OpenNext 1.20.6 / Wrangler 4.131.1 as a separate `zigoals-alpha` Worker. It supports dynamic nonce-rendered routes and normal browser storage/wallet APIs. Configuration contains only assets and self-reference bindings, no apex/custom routes, database, R2 or paid resources. Current official guidance and adapter support were checked; a framework rewrite was unnecessary.

## 13. Public Alpha deployment status

**PREPARED_NOT_DEPLOYED.** The clean `0f6f023` package built and passed actual local workerd tests and a non-uploading dry run: 9,361.11 KiB raw / 1,753.55 KiB gzip, 32 assets. Browser access to Cloudflare was later denied because the admin-enforced policy could not be verified; normal retry confirmed the same block. Wrangler reported `loggedIn:false`. Final integrated clean package `736f195` also passed, with9361.11 KiB raw/1753.53 KiB gzip and8 workerd cases. No authentication workaround, upload or Worker creation occurred. The unsubmitted UI form was not a deployment.

## 14. Exact Alpha URL

**None deployed or verified.** `alpha.zigoals.app` is a planned destination only. Local test URLs are not public Alpha endpoints. No deployment/version ID exists for a new Alpha Worker.

## 15. Apex landing status

The separate `zigoals` Worker and landing were preserved. Public apex HTML before/after is byte-identical: SHA256 `e2f7dd2598b682d6db27f2fa85cd6458b9b39ca244ab9b41b025c06a6a2d200a`. Existing active version `9a2cc4f1` was observed; its latest automatic build was already failed before M4, while the manual deployment remained live. No apex build settings were repaired or replaced. The [Alpha CTA](deployment/LANDING_ALPHA_CTA_DRAFT.md) remains an unpublished draft.

## 16. Email and DNS safety

Initial read-only inspection found the apex Worker record, three Cloudflare mail MX records, SPF and DKIM; no Alpha record. No DNS or email-routing modification occurred. Browser access blocked the final dashboard reread, so no new mail-delivery or final-record comparison is claimed. The private forwarding destination is not published.

## 17. Public safety mode

Explicit build modes are `LOCAL_DEMO`, `PUBLIC_ALPHA_UNDEPLOYED` and `TESTNET_DEPLOYED`; unknown/missing values fail closed. Local UI remains labelled LOCAL SIMULATION. Public Alpha allows simulated goals, private backups, diagnostics and optional read-only wallet connection. Direct preparation, execution, signer, signing and broadcast boundaries require deployed-testnet mode independently of manifest shape; a connected wallet cannot enable financial actions.

## 18. Security headers and CSP

Each dynamic HTML response receives a fresh Web Crypto nonce used by the Next runtime. Production script policy omits unsafe-inline/unsafe-eval; connection origins are same-origin and canonical testnet RPC/REST. Frame/object/base restrictions, nosniff, no-referrer, permissions restrictions, noindex/noarchive and private/no-store are implemented; HSTS applies on HTTPS. Inline CSS remains allowed for existing style attributes and is documented. Edge middleware is deliberately retained because this adapter does not support Next's Node proxy.

## 19. CSP test results

Production browser and actual workerd tests verify nonce freshness, rendering/navigation, injection rejection under unchanged policy, diagnostics, safe connection mocks and local lifecycle. Complete request headers are captured asynchronously and drained before assertions; a real HttpOnly synthetic-cookie regression proved the old capture blind spot and passes after repair. The initial DevTools-created script experiment used a privileged mechanism and was replaced by untrusted HTML-response injection. Real M4 Keplr connection was attempted, remained pending and became inaccessible when browser policy verification failed; approval/cancellation and compatibility under this CSP are **NOT VERIFIED**. M3 owner's A–H connection evidence remains prior real evidence, distinct from mocks.

## 20. External resources

App fonts/images/social card are local. Actual production route samples recorded only the local app resource origin and no page errors; connection diagnostics legitimately use configured ZIGChain services. No Google Analytics, advertising pixel or application analytics was added. External informational links remain explicit navigation to fixed reviewed origins.

## 21. Dependency and supply-chain findings

Production and full pnpm advisory scans after hosting dependencies reported **zero vulnerabilities**. Cargo scan covered 119 dependencies with zero vulnerability findings and two unmaintained notices: derivative 2.2.0 (RUSTSEC-2024-0388) and paste 1.0.15 (RUSTSEC-2024-0436). Lock integrity and allowed source origins were inspected; installation scripts for esbuild/workerd/unrs-resolver remain denied. Adapter build tooling expands trusted dependencies. Installed license metadata includes LGPL native libvips, CC-BY compatibility data and MPL tooling; retain upstream notices. This is not legal certification or assurance against unknown vulnerabilities. CodeQL/dependency-review capabilities were evaluated using official documentation but not enabled or claimed run. All checkout/setup-node/upload/download actions now declare supported Node24 runtimes with exact official pins; initial hosted Node20 deprecation annotations motivated the update. Final hosted annotation verification is pending.

## 22. Contract review

[Fresh independent engineering review](verification/m4/CONTRACT_REVIEW.md) covered owner authorization, accounting/liabilities, malformed funds, overflow, pause/exits, queries/pagination, solvency, events, commitments, cw2 and deployment admins. No Critical/High/Important finding. LOW runbook wording incorrectly included goal creation in pause semantics; corrected to deposits only. Contract semantics were preserved. This is not a professional audit or a live-chain compatibility test.

## 23. Frontend review

[Fresh baseline review](verification/m4/FRONTEND_REVIEW.md) found no material custody bypass and identified weak remote goal/balance parsing. M4 now rejects noncanonical/out-of-range integers, invalid owner/denom/strategy/status/commitment fields, oversized pages and nonprogressing numeric cursors; unknown remote fields are discarded. Release, public Alpha and canonical-preparation task reviews approved the changes. Minor schema/tamper, complete Cookie-header capture and exact preparation-error assertions were corrected and re-reviewed without new breakage. Whole-branch review is pending at this evidence checkpoint.

## 24. Privacy and network egress

Production browser tests inspect request URLs, headers and bodies across fictional goal lifecycle, backup and diagnostic flows for private sentinels. No private sentinel was sent in those tested flows. Names, targets, dates and notes stay browser-local. Actual exceptions: hosting sees ordinary page/asset requests and goal IDs in `/app/goals/<id>`; RPC operators can see public query identifiers/IPs. Browser storage is unencrypted and accessible to compromised same-origin code/extensions. [Privacy notes](PRIVACY.md) avoid stronger guarantees.

## 25. Diagnostics and bug reports

Safe copied diagnostics use an explicit whitelist: build version/commit/mode, chain/deployment, wallet yes/no, endpoint status, bounded browser class and timestamp. No full address, balance, plan, backup or raw error body. Clipboard denial has a manual-copy textarea fallback. Public bug-template and private `hello@zigoals.app` links warn against secrets/private backups/personal finances; no report was sent.

## 26. UX and accessibility

Persistent environment and per-tab connection-only labels, clearer disabled actions, 320px heading wrapping/min-width, keyboard flow, reduced-motion checks and local social metadata preserve the established visual identity. A real narrow-screen defect expanded the layout to 546px for an unbroken goal name; fixed and covered by an exact 320px regression. Desktop/mobile screenshots were inspected. No product redesign occurred.

## 27. Performance

Cold local production `/app` loaded **292,821 encoded JavaScript bytes**, down from **577,954** before lazy loading the signing transport (about 49.3%). Settings: 279,617; Ecosystem: 275,856. No sampled page errors/external resource origins or horizontal overflow. These are unthrottled local diagnostic samples, not field Core Web Vitals, hosted CPU or latency guarantees. Current Workers code size fits the documented 64 MiB raw limit; Free's 10ms CPU budget remains unproven for dynamic SSR.

## 28. Threat model

[M4 threat-model additions](security/THREAT_MODEL.md#milestone-4-public-exposure-and-release-boundaries) address hostile origin/extensions, backups/XSS, nonce caching, clickjacking, phishing, hostile Wi-Fi, RPC compromise, unsafe links, environment confusion, privacy disclosures, indexing, denial of service, dependency compromise, forged candidates and rollback. No seed phrase belongs in ZIGoals; only an actually verified deployment makes an Alpha hostname official.

## 29. Release and tester documentation

Canonical ADR, schema/validator, verification and release process, Cloudflare setup, public checklist/rollback, privacy/threat/security notes, version scheme, Alpha disclaimer, tester guidance and separate landing CTA draft are provided. App package identity is 0.1.0; this does not imply a published release. Historical reports remain untouched.

## 30. New tests and totals

**476 JavaScript tests in 25 files, 25 Rust tests, 36 production desktop/mobile browser cases and 8 actual local workerd cases passed** on clean implementation commit `736f195`. Lint/types/build/Rust formatting/Clippy/schema/generated-type drift and limited tracked secret-pattern checks passed. [Exact case matrix](verification/m4/TEST_MATRIX.json) and [structured local results](verification/m4/LOCAL_RESULTS.json) record scope; the JavaScript increase from the399-test baseline is77 and browser increase is6.. New coverage exercises release schema/source/environment/hash comparison and tampering; canonical-only preparation; public/invalid mode refusal through transaction boundaries; strict RPC fields/pages; header/nonce/spoofed-origin handling; safe diagnostic copy; local lifecycle and private egress under CSP. Full Chrome process restart on the clean M4 app retained four records, uncertain hash, damaged rows/warnings and account scope with **zero signer calls, broadcasts and page errors**.

Failures were retained: canonical preparation initially rejected the new input and its legacy CLI import attempted network access before local validation (DNS failure); initial mode/CSP/parser missing-implementation regressions; five browser trace ENOENT failures from concurrent runs sharing an output directory; two missing per-tab labels; the real 320px overflow; a social-origin local assertion affected by Next's deliberate loopback normalization. Each implementation/test-harness issue was corrected and rerun. Known remaining build warning: deprecated middleware required by adapter compatibility. Earlier local test tooling emitted inherited NO_COLOR/FORCE_COLOR warnings; normalized final invocations and CI no longer emit that conflict.

## 31. GitHub CI

First M4 quality [run 34767074157](https://github.com/reyals1111-ux/ZIGoals/actions/runs/34767074157) passed **431 JavaScript, 25 Rust and 30 browser cases** before Task2. The independent canonical run also passed. Integrated source `736f195` has been pushed; new hosted quality/Workers and canonical comparison checks are pending at this evidence checkpoint.

## 32. M4 PR status

[PR #3](https://github.com/reyals1111-ux/ZIGoals/pull/3) targets main. It is open and currently draft while integrated hosted checks and whole-branch review finish.. No merge or force push occurred. Main remains the merged M3 baseline until the owner chooses to merge.

## 33. ZIGChain blockers

Goal Manager NOT DEPLOYED; test wallet 0 ZIG; Discord/upload permission pending; no faucet retry. Required network reads confirm zig-test-2/azig/18. Latest known node versions remain v5.0.0-patch-1, wasmd 0.55.1 and wasmvm/v2 2.2.4. Real financial signing, contract execution and chain receipt reconciliation remain NOT RUN.

## 34. Valdora and WME

No response was supplied in this conversation. Valdora remains pending; WME has no verified canonical executable interface. Idle is the only executable strategy. No private inbox/Discord search, invented message/interface, external allocation or outreach occurred.

## 35. Remaining risks

Real Keplr under the M4/hosted CSP, public HTTPS behavior/Free CPU and account publishing are unverified. Manual main attestation has not run. Canonical matching bytes do not prove safety, cross-host identity or independence from a common compromised toolchain. RPC is trusted transport; browser/device/origin compromise, storage loss and uncertain receipts remain boundaries. Cargo maintenance warnings and expanded adapter dependencies remain disclosed. No professional audit or live contract exists.

## 36. Exactly what the owner does next

1. Review PR #3 and its passing checks/evidence; merge only if satisfied. This run leaves it unmerged.
2. For public web preview, restore permitted Cloudflare access or authenticate Wrangler yourself, then follow [the exact isolated publish path](deployment/CLOUDFLARE_ALPHA.md#exact-owner-only-publish-path) from a clean reviewed commit. Confirm zigoals-alpha/public mode/no apex routes. Test the returned HTTPS URL and real Keplr connection before adding only alpha.zigoals.app. Preserve mail and keep the landing CTA pending separate review.
3. After merge, manually issue a candidate on the exact reviewed main SHA, verify both builds and GitHub attestations using the guide. Reproducible remains NOT_APPROVED until a separate owner decision.
4. Wait for actual ZIGChain funding/upload permission and provide those responses in a new explicit deployment session. Do not upload/sign based on this report. The current real wallet connection attempt may still need owner cancellation/revocation in Keplr; this run could not observe its final state.

## 37. Next five highest-value tasks

1. Owner review/merge and first observed main-only attested release candidate.
2. Isolated HTTPS preview, runtime CPU/limits measurements and reversible publication verification.
3. Real Keplr connection/rejection/reconnect/account-switch checks under the published CSP, with no financial signing.
4. Once actual permission and test funds arrive, separately authorized minimal immutable testnet deployment and tiny owner-only exit/uncertainty checks using the canonical attested artifact.
5. Reassess Valdora/WME only when canonical developer evidence arrives; continue dependency/advisory maintenance meanwhile.

## 38. Evidence-backed content drafts

Owner-review drafts only; none posted. Full drafts and evidence are in [BUILD_LOG](social/BUILD_LOG.md).

> The first three ZIGoals engineering milestones are merged. Fresh browser, Rust and JavaScript checks protect the local Alpha, with real Keplr connection evidence kept separate from automated mocks. Goal Manager is still not deployed.

> Two independent clean Linux builds now produce the same ZIGoals Goal Manager checksum. Download verification checks the bytes, source and toolchain evidence. Reproducible is not approval to upload: funding, permission and owner authorization remain separate.

> The ZIGoals public Alpha package supports fictional goals and local simulation, with wallet connection kept separate from financial execution. Its production script policy uses fresh nonces. Private plan fields stayed local in the tested flows; hosting still sees ordinary requests and goal IDs.

> The isolated Cloudflare Alpha package is prepared and locally tested. Publication is still pending account access and live HTTPS verification. The existing zigoals.app landing and email settings were preserved. No onchain deployment or return claim is being made.
