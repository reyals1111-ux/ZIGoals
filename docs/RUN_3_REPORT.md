# ZIGoals — Milestone 3 report

Milestone 3 implementation and local/hosted verification are complete; the pull request remains open for owner review. No Goal Manager deployment, real signature, broadcast, faucet retry or private outreach occurred. Mainnet and external strategies remain disabled. This is engineering verification of an unaudited alpha, not an independent security audit.

## 1. Starting main commit

Started from verified merged `main` at `b6686ba37473e531baa223d1c72eb5162dae683d`. [PR #1](https://github.com/reyals1111-ux/ZIGoals/pull/1) was actually merged; its tracked tree matched M2 `a7b60cb`. Owner-generated Next development type-path drift was backed up and restored to the tracked generated file before the clean baseline. M1/M2 history and historical reports were preserved.

## 2. Branch created

Created `feat/m3-readiness` after the fresh baseline. No force push, history rewrite or merge to main.

## 3. Baseline verification

Fresh merged-main install, lint, types, production build, 299 JS tests, 24 Rust tests, Rust formatting/Clippy/schema checks, Wasm validation, 18 desktop/mobile browser cases and full Chrome process restart passed. Baseline success was verified from actual command output, not assumed from the M2 report.

## 4. Current ZIGChain facts

Live evidence at `2026-09-13T13:48:05.680Z`: chain `zig-test-2`, native `azig`, 18 decimals, height 7748162. Node info reports `v5.0.0-patch-1`, wasmd `v0.55.1`, wasmvm/v2 `v2.2.4`; it also lists a legacy wasmvm v1 dependency. Public sources: [RPC status](https://testnet-rpc.zigchain.com/status), [node info](https://testnet-api.zigchain.com/cosmos/base/tendermint/v1beta1/node_info). The preparation helper successfully rechecked the live network and validator at `2026-09-13T14:31:49.380Z`.

## 5. Documentation updates

Current README and [STATUS](STATUS.md) now acknowledge actual publication, merged PR1 and successful hosted jobs. Added manifest-v2, alpha testing, contribution, privacy and disclosure guidance; updated current deployment checklists and appended M3 threat/security/build-log sections. Historical M1/M2 reports, old prepared v1 evidence, landing assets, Worker configuration and license remain unchanged.

## 6. Real Keplr evidence recorded

[Owner results](verification/M3_KEPLR_OWNER_RESULTS.md) label A–H **REAL OWNER PASS**: detection/approval, address match, zero-balance separation, connection rejection, reconnect, retained permission, revocation and late connection approval after switching to Local demo. These are the owner's real-extension observations. Individual test dates/browser/extension versions were not provided. Account switching is **NOT RUN**; no extra wallet is required solely for that check. Real signer rejection, stale signer, broadcast, uncertain confirmation and restart/chain reconciliation against a deployed contract remain **NOT RUN / BLOCKED**. Mocked tests remain **AUTOMATED** evidence.

## 7. Toolchain / doctor changes

Added `node scripts/doctor.mjs` and `pnpm run doctor`, with expected/actual Node, pnpm, Rust, wasm target, Git state, fully validated public network config, required files and optional local Docker status. Probes are bounded, disable package/toolchain auto-install and suppress arbitrary failed-command stderr. No secrets, installation or global configuration change. `pnpm doctor` is pnpm's unrelated built-in; use the explicit command with `run`.

## 8. Node mismatch handling

Actual owner Node22.23.1 returns ERROR against pinned24.19.0 and exit1; Node24.19.0 passes required prerequisites. Missing Docker/contract-only tools and dirty Git are warnings. Added matching `.nvmrc`, retained `.node-version`, documented existing nvm/fnm alternatives. Starting a dev server under Node22 is not production compatibility evidence. No global shell/toolchain changes were made.

## 9. CI changes

Full checks run on pull requests and pushes to main. Feature pushes without a PR avoid duplicate runs. Read-only token permissions and pinned actions remain. Contract artifacts are uploaded only after validation and generated-schema/type drift checks. The downloadable bundle contains actual Wasm, SHA256 text and measured build report, retained 30 days. The artifact-service archive digest is distinct from the Wasm hash.

## 10. Hosted CI result

[GitHub run 34763386600](https://github.com/reyals1111-ux/ZIGoals/actions/runs/34763386600) completed **success** on branch head `d3538c8b6a9794d739ecdcb5573b361f14498e73`. Both web and contract jobs succeeded. The actual artifact checkout was PR merge-test commit `dc0e7b556df4462084e7dc68956b4e4fa72c96da`, not a merge into main. Full local checks and actual hosted results are separate evidence. The final report/evidence update triggers normal PR checks again; [the PR checks page](https://github.com/reyals1111-ux/ZIGoals/pull/2/checks) shows the current head. Main-push coverage is configured and will run after an owner-approved merge; this run did not merge to test it.

## 11. Independent-host Wasm checksum result

Downloaded Linux: **255,948 bytes**, SHA256 `43f7ebb8b18fc8108d64173018e6e2b37308c69e476a4edb0a9cf9b9905d6f73`, actual validator pass. Clean Mac: **258,540 bytes**, SHA256 `090b19225a93fc191810426973001ab400452799d1925aadddadef1fc0cc6e25`. These differ. Pinned compiler/LLVM/Binaryen/validator/target/optimization flags and Cargo.lock match; hosts differ. A temporary diagnostic-path remap reproduces the 2,592-byte size reduction but still yields a different hash; remaining function/table layout differences are not fully isolated. Both artifacts have matching import/export descriptors, which is not a semantic-equivalence proof. **Cross-host byte reproducibility is NOT ESTABLISHED.** This difference alone is not a release blocker: approve and verify one exact upload artifact. [Detailed evidence and experiment](deployment/M3_REPRODUCIBILITY.md).

## 12. Contract invariant tests

25 Rust tests pass, including one new seeded invariant test. Three seeds (24301, 12648430, 3735928559) exercise multiple owners, interleaved goals, large integer amounts, pagination, paused exits and closure. Accepted/rejected sequence steps compare independent bank receipts, positions/lifetime totals/liabilities/solvency and full storage equality after rejected operations. Deliberately omitting a liability update or losing one withdrawal unit makes the test fail. Contract production code did not change. Finite deterministic sequences and cw-multi-test do not prove deployed Wasm execution or replace independent auditing.

## 13. Goal Engine property tests

92 engine tests pass, including 17 new property/calendar cases. Coverage includes deterministic outputs, input/state isolation, finite/nonnegative horizons and monetary gaps, exact-target completion, contribution/capital/target monotonicity, sufficient rounded contributions, and original month-end anchoring. Deliberate changes to payment rounding, target completion, calendar anchoring and finite/integer/nonnegative/bounded horizons all made tests fail. These are bounded regressions, not exhaustive fuzzing.

## 14. Journal hardening

Atomic writes refuse duplicate normalized signed hashes, including retained future-schema claims. Future database versions are refused; unknown/corrupt records remain stored with warnings. Impossible future/reversed timestamps cannot crowd real receipts out of recovery priority. Quota/unavailable storage still stops the persisted-hash send barrier. UUID collisions, lowercase broadcast-hash normalization and terminal receipt protection were audited and retained. Recovery never signs, rebroadcasts or treats elapsed time/missing receipts as proof of failure.

## 15. Multi-tab findings

Reproduced lost simulated deposits, stale same-ID plan recovery, missing cross-tab review invalidation, future-schema replacement and timestamp starvation. Scoped Web Locks plus fresh durable revision checks prevent stale participating-tab commits; storage and journal notifications refresh the active scope and cancel reviews. Five real two-tab scenarios run on desktop/mobile: sequential deposits with re-review, simultaneous confirmations, metadata recovery, independent mode and journal transport/scope. Mode is explicitly per tab. Older nonparticipating versions, other devices/origins and hostile same-origin code are outside this cooperative guarantee; reload old tabs.

## 16. Diagnostics UI

Settings displays Local simulation/Testnet, shortened account, separate actual/simulated wallet balance, expected chain/denom, public RPC/REST, independent health and UTC timestamp, NOT DEPLOYED/current contract config, expected/current checksum, explorer providers and public app version/build commit. Checks are read-only and bounded; account changes discard stale results. Desktop/mobile screenshots were visually inspected and neither overflows horizontally. No private plan, full owner address, key, seed or token is exposed by diagnostics.

## 17. Deployment tooling changes

Preparation accepts no wallet/secret arguments, reads live chain/version/denom/RPC, hashes the actual optimized artifact, compares measured build evidence and reruns cosmwasm-check. It prints unsigned prepared JSON. Validation accepts a bounded public manifest and explicitly reports `chainVerified:false`; schema validity is not proof of deployment. Exact artifact path, instantiate message, optional pause admin, immutable migration-admin policy and abort criteria are documented. No signer or hidden hot wallet was introduced.

## 18. Manifest changes

Strict v2 discriminates PREPARED_NOT_DEPLOYED and DEPLOYED. Prepared live identifiers remain null. Deployed state requires valid public addresses, exact code ID/hash/receipts, creator, chain/software/denom, cw2 identity/version, both admin expectations, clean build provenance, canonical ordered timestamps and exact explorer evidence. Unknown/legacy/partial config fails closed. The app consumes the reviewed public JSON; old address/code-ID env variables no longer enable actions. Financial preflight verifies actual code ID/creator/checksum/admin/cw2/denom/software before simulation and again before signing/broadcast. Public RPC remains trusted transport.

## 19. Alpha tester / release preparation

Added [tester guide](testing/ALPHA_TESTER_GUIDE.md), [contributing guide](../CONTRIBUTING.md), concise bug form and safe sharing instructions. Local simulation is the default path; connection-only checks are optional. Testers stop at NOT DEPLOYED. No release/site deployment or community post occurred.

## 20. SECURITY / privacy docs

[SECURITY.md](../SECURITY.md) gives private disclosure via **hello@zigoals.app**, unaudited status and safe reproduction boundaries. [Privacy notes](PRIVACY.md) distinguish localStorage, IndexedDB, exported backups, public chain records, Keplr permission and external endpoint visibility. They prohibit sharing secrets, private backups or personal financial data. No Gmail address or owner wallet is published.

## 21. Ecosystem-registry review

Audited existing execution and link boundaries without repeating M2 research. `canExecuteProvider` remains false; lifecycle/disabled labels cannot create signing authority or routes. Provider pages remain sourced informational research. No financial integration, yield, endorsement, certification, eligibility or partnership was inferred. Existing registry/explorer behavioral tests pass.

## 22. Explorer / Hub status

ZIGScan uses the existing verified fixed-route catalogue. Range remains an official testnet homepage entry where a detail route is unverified; no URL was invented. Hub links remain read-only navigation to an external application. A link or healthy endpoint is not receipt confirmation or permission to stake/bridge/vote.

## 23. Valdora status

The owner already sent an inquiry and no reply has arrived. No duplicate outreach. stZIG/strategy execution remains deferred pending canonical interfaces, redemption/liquidity/accounting evidence and security review.

## 24. WME status

No canonical interface or execution contract is verified. WME remains research-only/deferred. No invented messages, mandate, custody authority or integration claim.

## 25. Exact commands / tests run

Pinned shell: Node24.19.0 and pnpm11.19.0. Rust uses the repository `.toolchain/cargo` and `.toolchain/rustup` with Rust1.85.1; `CARGO_NET_OFFLINE=true`. Host-local installation used `/Users/AIUSER/Library/pnpm/store`.

```bash
pnpm install --frozen-lockfile --offline --store-dir /Users/AIUSER/Library/pnpm/store
node scripts/doctor.mjs --json
pnpm run doctor
pnpm lint
pnpm typecheck
pnpm test --reporter=json --outputFile=/tmp/zigoals-m3-full-unit.json
NEXT_TELEMETRY_DISABLED=1 pnpm build
pnpm audit --prod --audit-level high --json
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test --workspace --locked
cargo schema --locked
node contracts/goal-manager/scripts/generate-types.mjs
git diff --exit-code -- contracts/goal-manager/schema packages/shared-types/src/contract.generated.ts
bash contracts/goal-manager/scripts/build-wasm.sh
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3101 pnpm --filter @zigoals/web exec playwright test --reporter=json
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3101 node scripts/verify-browser-restart.mjs
node scripts/check-secrets.mjs
node scripts/prepare-deployment.mjs
node scripts/validate-deployment.mjs /tmp/zigoals-m3-final-prepared.json
```

The production preview was `next start --hostname 127.0.0.1 --port 3101`. Chrome runs used isolated profiles and mocked wallet/network action boundaries. Separate targeted red/green and disposable mutation checks are recorded in the review evidence; initial sandbox DNS/Chrome/store permission failures were setup failures, not passing tests, and were corrected through authorized bounded execution. No global setup change was used to hide the Node mismatch.

## 26. Exact new test totals

Final local: **399 JS tests in 21 files; 25 Rust tests; 30 desktop/mobile browser cases; one full Chrome process restart verification**. All pass; browser failures/flaky/skipped = 0. Compared with baseline: **+100 JS, +1 Rust, +12 browser cases**. Rust total includes six boundary, eighteen integration and one seeded invariant case. Engine's 92 tests are part of the 399 JS total, not additional. Production dependency audit reports zero known findings at every severity; the tracked-file credential pattern check passes and is explicitly limited.

## 27. Security findings and fixes

Fixed the reproduced storage/concurrency/hash/timestamp defects and premature metadata-save copy. Review additionally caught an omitted finite horizon assertion, incomplete validation after moving network facts into JSON, and premature artifact upload before the final schema gate; all were repaired and scoped reviews approved. Four task reviews passed. Whole-branch review found no Critical/Important issue; two documentation sequencing/CI-wording corrections were fixed in `456657c` and approved in a single scoped rereview. [Review record](verification/M3_REVIEW_SUMMARY.md). Remaining limits: public RPC trust/no reorg quorum, first-terminal receipt retention, local clock assumptions, browser crash/eviction loss, older nonparticipating tabs, finite tests and no professional audit. No defect was found requiring a custody-contract source change.

## 28. Git commits

Implementation and verification commits preceding this report:

- `deb8028` — docs(m3): define hardening and release verification scope
- `fb1fb88` — test: add seeded contract and projection invariants
- `4ada7d2` — feat(m3): add read-only doctor and hosted artifact evidence
- `97bad15` — fix(web): harden transaction history and cross-tab writes
- `2c26212` — test: validate completion horizon output bounds
- `7a6b168` — fix(m3): validate complete network config before publishing builds
- `0aeb20e` — feat(m3): enforce deployment manifests and add read-only diagnostics
- `28cbf9f` — docs(m3): prepare safe alpha participation and disclosure
- `456657c` — docs: align M3 deployment and CI guidance
- `d3538c8` — docs(m3): record verified local release evidence

The final report/evidence commit is listed in [PR #2 commits](https://github.com/reyals1111-ux/ZIGoals/pull/2/commits); it contains documentation and measured evidence. No historical commit was rewritten.

## 29. Remote branch / PR status

Branch `feat/m3-readiness` is pushed and tracks origin. [PR #2](https://github.com/reyals1111-ux/ZIGoals/pull/2) targets main and is **OPEN, not merged**. Hosted web/contract checks succeeded on the implemented branch; current-head status is available on the PR. No automatic merge or deployment occurred.

## 30. Remaining external blockers

0 test ZIG; Discord approval pending; whitelist has not yet been requested; Goal Manager not deployed. Valdora has not replied and WME has no canonical interface. Real signing/deployed exit and restart-reconciliation evidence therefore remains blocked. Noble/USDC issuer-lifecycle and eligibility constraints remain a research/verification gate; no minting, backing or availability promise was added. OroSwap/Nawa/PermaPod/RWA, swaps/leverage/cross-chain, fiat, mobile-native/local-AI orchestration and external strategies remain outside executable scope.

## 31. Exactly what the owner must do next

Review the M3 PR and evidence; merge only when satisfied. Use the pinned Node in the active terminal and run the doctor for local work. Wait for the existing Discord approval, then request/verify upload eligibility for the existing dedicated account and resolve test funding through the official support process without repeated faucet attempts. When those gates are actually resolved, separately authorize the reviewed tiny testnet deployment/exit session. Keep every seed/key private. No new wallet, faucet retry, private inbox access or duplicate Valdora outreach is required now.

## 32. Next five highest-value engineering tasks

1. Once approved/funded, verify owner-operated upload permission and deploy one reviewed immutable testnet artifact with v2 evidence.
2. Record real Keplr signature rejection/stale signer, tiny create/deposit/partial/full-withdraw/close and paused-exit outcomes against that deployment.
3. Exercise real uncertain confirmation and full browser restart reconciliation with known public receipts; investigate disagreement without automatic resend.
4. Obtain an independent contract/frontend security review before widening alpha access; address production ingress/CSP and dependency review with concrete findings.
5. Standardize the canonical release build environment and source-path policy, then compare repeated clean artifacts before changing the approved hash. Canonical Valdora/WME interfaces and issuer eligibility/security evidence remain separate prerequisites for any later adapter.

## 33. Suggested ZIGFluencer Build Log posts

Owner-review drafts only; nothing was sent. [Build Log](social/BUILD_LOG.md) contains three verified themes: real owner Keplr connection evidence with signing still blocked; repaired two-tab and durable-history defects with limits; read-only doctor/diagnostics and strict undeployed manifest guards. An additional verified draft may state: “GitHub now validates the alpha and retains its Wasm build evidence. Linux and Mac artifacts both validate but have different hashes; we documented the difference rather than claiming cross-host byte identity. Nothing is deployed.” No partnership, certification, guaranteed return, audit, deployment or mainnet-readiness claim is supported.
