# ZIGoals Milestone 1 engineering report

Execution date: 2026-09-13. Local implementation, public read-only research and deployment preparation. Final local verification passed on Node 24.19.0. Hosted CI was not executed because remote publication was denied. Real signing remains a separate external gate.

## 1. Executive summary

A working local goal application and independently tested idle Goal Manager are implemented. The app supports planning, explicit simulated deposits/withdrawals, goal closure, progress, activity and private metadata backup/recovery. A guarded Keplr testnet client is implemented. Nothing has been uploaded, instantiated or deployed to production; no mainnet or real-money action occurred.

## 2. Repository state when work started

The connected GitHub repository was readable and reported push/admin permissions. A fresh isolated clone began at `e2c7ed14cafcad72b5cb0e9206a32eae3081a84c` on main, with three commits and five tracked files: README, Apache-2.0 LICENSE, .gitignore, landing/index.html and landing/wrangler.jsonc. There was no app, contract, package manifest or test suite. Existing landing/Worker files were preserved; external Cloudflare root/build settings were not changed or inferred.

## 3. Current ZIGChain facts verified

Live official RPC/REST and a listed gRPC service returned `zig-test-2` and `v5.0.0-patch-1`. Staking uses `azig`; bank metadata reports ZIG with 18 decimal places. Node dependencies report wasmd 0.55.1 and wasmvm/v2 2.2.4. Fresh official version.txt agrees. gRPC GetNodeInfo completed with status 0. The published testnet explorer homepage and public account route returned HTTP 200. Mainnet ID `zigchain-1` was read from official configuration only. Timestamped snapshots and primary links: [current chain evidence](research/ZIGCHAIN_CURRENT_STATE.md).

## 4. Documentation contradictions discovered

Older `uzig`/6-decimal examples and the owner's failed faucet request do not describe the observed v5 testnet asset. A browser-cached version.txt response showed v4.1.0; a direct current fetch matched v5.0.0-patch-1. Both examined Wasm-params REST routes returned HTTP 501, which establishes no upload permission. Actual Worker configuration is under `landing/`, unlike the prompt's root-path assumption. Official ZIGChain SDK documentation requires authenticated GitHub Packages; exact private SDK versions could not be verified from public npm. Each limitation is explicit rather than filled with guessed configuration.

## 5. Architecture actually selected

pnpm monorepo, Next.js/React strict TypeScript app, independent Decimal goal engine, Zod metadata and integer chain units. One native-coin CosmWasm contract manages multiple owner-only idle goals. Rust schemas generate frontend contract message types. Private goal names/plans are outside the contract. Direct documented Keplr APIs plus CosmJS replace unavailable private SDK access and avoid a multi-wallet dependency for this Keplr-only alpha. Plain CSS and native accessible elements implement the small design system; React context and explicit refresh/revision guards provide state management without an unnecessary global query framework. These are deliberate adjustments to preferred, not mandatory, libraries.

## 6. Exact implementation completed

The engine computes progress, remaining amount, contribution periods, scenario-required contribution, zero-return funding requirement, target-date projection, shortfall/surplus, projected completion/status and Funding Health. Dates preserve the original monthly anchor through month-end clamping. A bounded 1,200-period horizon distinguishes unreachable and beyond-horizon outcomes. The contract implements create, deposit, withdrawal, empty-goal close, optional public commitment update, deposit pause, config/version/goal/owner-page/position/solvency queries and public events. The frontend implements local and testnet modes, explicit review, fee estimation, scoped wallet state, local ledger, private versioned metadata, backup import/export and recovery. External strategy execution is absent.

## 7. Important files created or modified

| Area | Entry points |
|---|---|
| Setup | [README](../README.md), [.node-version](../.node-version), [package.json](../package.json), [pnpm-lock.yaml](../pnpm-lock.yaml), [Rust toolchain](../rust-toolchain.toml) |
| Planning | [goal engine](../packages/goal-engine/src/index.ts), [engine tests](../packages/goal-engine/src/index.test.ts) |
| Custody | [contract](../contracts/goal-manager/src/contract.rs), [schema](../contracts/goal-manager/schema/zigoals-goal-manager.json), [generated messages](../packages/shared-types/src/contract.generated.ts) |
| Client | [chain configuration](../packages/chain-config/src/index.ts), [wallet](../apps/web/lib/wallet.ts), [goal provider](../apps/web/components/goal-provider.tsx), [storage](../apps/web/lib/storage.ts) |
| Product | [app routes](../apps/web/app/app), [browser tests](../apps/web/tests/goals.spec.ts), [PRD](product/PHASE1_PRD.md) |
| Readiness | [CI](../.github/workflows/ci.yml), [threat model](security/THREAT_MODEL.md), [security checklist](security/SECURITY_CHECKLIST.md), [deployment runbook](deployment/TESTNET.md) |

The four ADRs, three research reports, whitelist-request draft, four roadmap documents and build-log/strategy documents requested by the owner are present. Generated outputs, local toolchains, browser state and secrets are ignored.

## 8. Git branch and commit summary

Work is isolated on `feat/m1-foundation`, forked from the original main commit. Initial logical commits cover repository/design scaffold (`17f3157`), engine implementation (`fa67307`), exact annual-boundary correction (`5b27fa3`), and the Goal Manager/schema/toolchain (`63fff6e`). Further commits: pinned tooling/CI (`075fcf6`), chain/metadata foundation (`3892852`), wallet/local data (`7f487de`), and responsive flows/tests (`dcbfc97`). Readiness documents follow separately. Readiness documentation is committed as f576ccd. Publication is BLOCKED: non-interactive git push failed because no command-line credentials are configured; the connected GitHub create-tree API returned403 Resource not accessible by integration. No remote feature branch was created. All local commits remain intact; a separate documentation follow-up records this blocker. Main has not been merged or replaced.

## 9. Commands actually run

```bash
pnpm install --frozen-lockfile --offline
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm audit --prod --audit-level high
pnpm --filter @zigoals/web exec playwright test
pnpm verify:network
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test --workspace --locked
cargo schema --locked
node contracts/goal-manager/scripts/generate-types.mjs
bash contracts/goal-manager/scripts/build-wasm.sh
node scripts/prepare-deployment.mjs
```

Public-source/RPC/REST/gRPC reads, Git inspection, independent code reviews and direct contract/amount/backup probes also ran. Rust uses the isolated project toolchain. Initial web checks used the shell's Node 22.23.1; final verification explicitly selects the pinned bundled Node 24.19.0. No signing, upload, instantiation, faucet claim or external message command ran.

## 10. Exact test results

**220/220 unit and component tests passed across eight files:** engine 75, chain units/config 11, metadata schema 18, local ledger 57, storage/recovery 31, wallet 16, transaction driver 8, actual provider/Shell components 4. **24/24 Rust tests passed:** 18 cw-multi-test integration and 6 boundary tests. **14/14 production-build browser cases passed** across desktop and mobile, with zero skipped, unexpected or flaky cases. The independent integration reviewer separately reran 145 focused tests successfully. [Recorded results](verification/M1_RESULTS.json) contain the machine-derived JavaScript/browser totals and per-file counts.

## 11. Build results and failures resolved

The final Next.js production build, typecheck and lint passed after the review repairs. Locked cached installation succeeded under pinned Node 24.19.0/pnpm 11.19.0. Production dependency audit reported no known vulnerabilities. All seven build routes completed; production browser tests then passed against that build. Rust formatting, warning-free Clippy and tests passed. The validated Wasm is 258,540 bytes, SHA-256 `090b19225a93fc191810426973001ab400452799d1925aadddadef1fc0cc6e25`, and cosmwasm-check 2.2.2 passed 1/1 contracts. Raw Rust Wasm initially failed due to newer standard-library indirect-call encodings; official Binaryen 123 canonicalization resolved it. Docker optimizer was not run because the daemon socket was absent. Browser checks first exposed a real modal focus escape, now fixed; ambiguous selectors and Vitest accidentally including Playwright tests were also corrected. A public RPC transaction search timed out, so it is not explorer transaction-route proof.

## 12. UI and screens completed

Responsive dashboard, five-step goal wizard, goal detail, manual funding/withdrawal review, activity, metadata settings and optional onchain verification details. Persistent TESTNET and distinct LOCAL SIMULATION labels separate environments. Goal cards prioritize progress, contribution needs and health. Desktop/mobile lifecycle tests include loss of private metadata followed by withdrawal, export/import and closure. Native modal semantics and a keyboard containment regression protect review focus. Screenshots: [desktop dashboard](product/screenshots/dashboard-desktop.png), [goal detail](product/screenshots/goal-detail-desktop.png), [mobile dashboard](product/screenshots/dashboard-mobile.png). No native mobile app or production-site replacement was built.

## 13. Contract status

Source, Rust-derived schemas, generated TypeScript, local bank tests and a statically validated Wasm are ready for testnet preparation. Amounts and IDs use decimal JSON strings; timestamps are nanosecond strings. Exact-coin/nonpayable checks, immutable ownership, checked arithmetic, pause-with-exit, rollback on failed bank send, preserved closed history, pagination and liabilities/surplus accounting are covered. No migrate, arbitrary execution, admin drain, owner transfer or sweep surface exists. Instantiate must omit chain-level migration admin independently from the optional pause admin. No live code ID or address exists for this project.

## 14. Wallet and network status

Keplr suggestion/enable/address/signer integration and CosmJS query/signing paths are implemented. Guards verify testnet identity, current denom, reviewed code ID, absence of migration admin, contract name/version and denomination. Each action simulates gas with a 30% margin, preserves the estimated network fee, expires quotes after 60 seconds, rechecks signer/account and broadcasts at most once. Confirmation failure after possible broadcast remains explicitly uncertain. Sixteen direct wallet tests and four actual provider/Shell component regressions supplement eight transaction-driver tests. Valid ZIG addresses use an explicit 90-character Bech32 decoding bound to avoid CosmJS 0.38.1 passing Infinity to scure-base 2.4.0. Outcomes retain original wallet/hash/uncertainty across account changes within the mounted app; live extension prompts, actual signed transactions, wallet-side existing-chain metadata and remote inclusion remain untested.

## 15. Testnet deployment status

**PREPARED_NOT_DEPLOYED.** The preparation script reads chain facts and hashes the validated artifact; it cannot sign or broadcast. Code ID, contract address, public deployer and upload/instantiate transaction hashes remain null. The saved [preparation manifest](deployment/prepared-manifest.json) records application source commit dcbfc97 before documentation was committed. The runbook specifies immutable instantiation, checksum verification, manifest fields, public app configuration and a small manual create/deposit/withdraw/close smoke test. Local simulation and cw-multi-test are separate evidence from deployment.

## 16. Faucet and whitelist blockers

The owner reports no test funds and an unsuccessful older-denom faucet request. Only the official faucet route is verified; no request was retried and no alternate funding route was invented. Upload membership for the owner's public address is unconfirmed. The documented CLI permission query was not run because zigchaind is absent; failed REST queries do not authorize upload. The [whitelist request](deployment/TESTNET_WHITELIST_REQUEST.md) is a draft and was not sent.

## 17. Valdora status

Deferred. Published testnet staker/token identifiers and live contract-info were confirmed, but address existence is not source/version/v5 compatibility. Conceptual documentation describes variable value ratios and delayed redemption; it does not establish the exact exchange-rate, deposit, redeem, pending, claim, fee or permission schema needed here. No message was inferred, adapter implemented, protocol transaction sent or additional outreach made. See [the integration gate](research/VALDORA_STZIG.md).

## 18. WME status

Deferred. Official module descriptions were examined; dedicated WME documentation is still being prepared. Public examples do not provide a verified executable WME interface, and authenticated SDK/protobuf sources were not available through this connection. Exact messages, representation, manager permissions, fees, exits, CosmWasm interoperability and a current testnet example remain unconfirmed. This is a limit of verified evidence, not a claim that WME does not exist. See [the research matrix](research/WME_INTEGRATION.md).

## 19. Security findings

Independent engine and contract reviews passed after correction of an exact annual-growth boundary defect. Integration review found no Critical issue but required repairs for corrupted metadata recovery, oversized merged backups, malformed local ledgers, cancelled connection races and transaction results lost after account change. Direct wallet tests also exposed a CosmJS/scure Bech32 compatibility issue. All five Important and both Minor integration findings were fixed and approved on re-review; no Critical or Important finding remains within the reviewed local scope. This review is not a third-party security audit. Production dependency auditing is limited to known advisories.

## 20. Critical/high issues fixed

No issue was classified Critical or High by the independent reviews. Medium/Important fixes cover the annual-threshold residual, recovery/data-validation and wallet races above. Additional tests fixed a revision change during the final awaited RPC identity check before broadcast, and the bounded Bech32 compatibility failure. Corrupt metadata is quarantined before recovery; full merged records are validated against count and UTF-8 byte limits. The modal keyboard escape was reproduced and fixed. Smaller fixes preserve zero-return health while scenario input is invalid and explain exact fee requirements on insufficient balance. The independent reviewer approved these repairs; no severity is inflated to imply a stronger audit.

## 21. Remaining risks and blockers

Dedicated test funds, verified upload permission, real Keplr testing, deployment checksum/inclusion verification, GitHub Contents-write access or an authenticated Git remote, hosted CI execution, container reproducibility and an independent security review remain release gates. The app relies on configured public endpoints rather than light-client proofs. Browser metadata is not encrypted against device compromise or XSS; backups must be protected. Real activity is session-local with public verification links, not a complete indexed history. Demo fiat conversion is not a price feed. External strategy, SDK, fiat and mainnet capabilities are unavailable. No claim of audited custody, guaranteed returns or production readiness follows from local tests.

## 22. Exactly what the owner must do next

1. Run or inspect the local alpha and export any plans worth retaining. No wallet or funding is needed for this. To publish, grant the connected GitHub integration repository Contents-write access (and permission to update workflow files), or authenticate command-line Git yourself; then push feat/m1-foundation. Do not send credentials in chat. The supplied source archive and Git bundle preserve the implementation and local history.
2. When the existing support request resolves, provide the dedicated testnet **public address**, funding confirmation and upload-approval evidence. Do not supply a seed phrase/private key or repeat unsuccessful faucet requests.
3. Follow the runbook for a separately reviewed owner-signed testnet upload/instantiation and tiny withdrawal smoke test. Do not configure the app's contract address/code ID until checksum, immutable admin state and included transactions are verified.
4. Pass along the already-requested Valdora canonical source/schema response when it arrives. Mainnet and production deployment require a later explicit decision.

## 23. Next five highest-value engineering tasks

1. Restore repository publication access, push the verified feature branch and execute hosted CI plus a clean container Wasm reproducibility check.
2. Verify real Keplr connection, account changes, network/denom display and cancellation with the dedicated test wallet.
3. After funding/whitelist gates clear, deploy the reviewed immutable testnet contract and verify the full bank/event/withdrawal lifecycle.
4. Persist and reconcile scoped transaction outcomes across browser restarts, using indexed chain history and recoverable metadata backups.
5. Evaluate the canonical Valdora response against deployed code, then implement/test one explicitly allowlisted adapter only if its valuation and exit mechanics are proven. Keep WME gated on executable evidence.

## 24. Suggested ZIGFluencer build log post

ZIGoals now has a working local alpha: create a savings goal, plan contributions, add simulated funds, withdraw and track progress. Funding Health uses 0% future return; optional scenarios stay clearly labelled. The idle Goal Manager has local bank-accounting, permission and withdrawal tests, while private goal plans stay on your device and can be exported. Next: testnet funding and upload approval, then a small owner-signed deployment and withdrawal smoke test. Nothing is deployed yet. Valdora and WME remain pending verified interfaces.

Draft only; not published or sent. [Build log context](social/BUILD_LOG.md).
