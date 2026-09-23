# Actual Run #10 — PARTIAL, DRAFT PR #20

The authoritative expanded Run10 is implemented in part on `codex/run10-beta-reliability-foundation`; it is not merged or deployed. Local four-domain encrypted continuity, Health/Habit/financial/UI work and canonical CI improvements have concrete evidence. Account/domain deletion, key rotation, incremental sync/conflict UI, larger-history and several integrated journeys remain incomplete. Hosted email/backend and physical acceptance are separately unconfigured.

See [current report](run10/FINAL_REPORT.md), [full ledger](run10/REQUIREMENTS.json), [verification](run10/VERIFICATION.md), [blockers](run10/BLOCKERS.md) and [exact resume](run10/RESUME_STATE.md). Earlier Run11/12 scheduling exclusions and open sync decisions are superseded by [the preserved authoritative brief](run10/MASTER_PROMPT.md); required gaps remain inside Run10. The deployed Alpha and financial-execution gates are unchanged.

---

# Run #9.2 — MERGED + PUBLIC ALPHA LIVE

Run #9.2 is merged and publicly hosted on the owner-controlled Alpha. PR #17 delivered Goal Intelligence, Live Wealth, Markets, Showcase, Funding Wealth, Today, Activity, Habits/Health productization and the final consumer visual system. PR #18 added the protected CoinGecko runtime-secret publication boundary. The release-closure source adds a native-ZIG CoinGecko token-address fallback and updates the deployment smoke from the obsolete V2.1 hero to the Run #9.2 surface.

The Alpha remains `PUBLIC_ALPHA_UNDEPLOYED` with respect to Goal Manager: no Goal Manager/code ID is deployed and no financial signing/broadcast is enabled. Product UI deployment and contract deployment are separate states.

An isolated Showcase now fills Goals, Wealth, Markets, Habits, Health and Activity with clearly fictional examples. Today connects funding pace, upcoming contributions, attention items and Life + Wealth. Markets adds canonical logos, actual public movement and seven-day sequences; portfolio composition and the Life dashboards add usable depth. The hero uses the owner’s exact capitalized two-line slogan.

See [Run #9.2 report](RUN_9_2_REPORT.md), [complete deliverables](RUN_9_2_DELIVERABLES.md), [verification](verification/run9-2/README.md) and [remaining Beta backlog](RUN_9_1_BETA_BACKLOG.md). The Run #9/#9.1/#9.2 product line is now merged into `main` and hosted on Public Alpha. Exact deployment source/version and rollback evidence are retained by the owner-approved Manual Alpha workflow.

Final Run #9.2 closure PR #19 is merged and deployed. Reviewed closure head: `2a9deead68ddd187b13f0505319cf0962f97adff`; deployed main: `95ff4d3ea3e0d8c2c33b497bdcefaac0cc539a90`. Deployment [35702856008](https://github.com/reyals1111-ux/ZIGoals/actions/runs/35702856008): **SUCCESS / VERIFIED**, deployment/security smoke **11 / 11 PASS**. Live Worker: `768673e8-9d39-4022-b1c0-fdd805fa2318`; preserved rollback: `cca2b972-3b40-47a6-affe-1249fe260465`. See [exact release evidence](verification/run9-2-release/README.md).

Separate immediate market acceptance recorded native ZIG quote 503, Bitcoin quote 200 / VERIFIED, catalog 503 and Bitcoin history 503. Subsequent Run #10.0 cloud testing was BLOCKED by HTTP 403 / Cloudflare Error 1010 / access_denied. The original live market incident remains **UNCONFIRMED**; runner access denial is not provider-failure evidence and does not undo successful deployment/security verification. [Run #10 master plan](RUN_10_BETA_RELIABILITY_MASTER_PLAN.md) defines the reliability foundation and remaining owner decisions; documentation correction does not require a deployment.

---

## Historical snapshots — superseded by the Run #9.2 state above

All sections below describe their original observation window. References to local-only work, current Alpha versions or pending funding are historical, not the current release state.

# Run #9.1 — local Beta productization

Wealth is the canonical asset home, with shared asset selection/editing, eight favourites, CoinGecko history and atomic Fund Goal / explicit history-only modes. Funding Wealth, Today, Activity, Health groundwork and consumer branding are redesigned. Public Alpha is unchanged; no merge, push, deployment or financial execution occurred.

See [implementation report](RUN_9_1_REPORT.md), [verification](verification/run9-1/README.md), [market/accounting guide](RUN_9_MARKET_DATA.md) and [remaining Beta backlog](RUN_9_1_BETA_BACKLOG.md).

---

# Run #9 — Goal Intelligence + Live Wealth (local owner review)

Run #9 is implemented on `codex/run9-goal-intelligence-live-wealth`, starting from the owner’s prep commit `a6950f7f7cfeeef0c5be286179e5bc99235d9a66`. The public Alpha remains unchanged. Nothing was merged, pushed, deployed, signed or executed financially.

The local upgrade adds server-only CoinGecko discovery/valuation, schema v2 migration, explicit contributions and reversals, current-plan pace, zero-return Funding Wealth, separate recorded income, bounded evidence history, and updated Wealth / Goal Detail / Today / Activity. Automatic and manual values remain distinct. Full verification and remaining Beta limits are recorded in [Run #9 report](RUN_9_REPORT.md), [market/accounting guide](RUN_9_MARKET_DATA.md), and [Beta backlog](RUN_9_BETA_BACKLOG.md).

---

# Run #8 / #8.1 release closure — 2026-09-19

**HISTORICAL PUBLIC ALPHA — RUN #8/#8.1 MERGED + DEPLOYED + OWNER-VERIFIED LIVE.**
PR #15 merged to exact `main` source `c3997841c7b07b6adcc430616c86e4e4728d3222`. Post-merge Milestone quality passed. The owner-approved Alpha rollout published Worker version `30468b51-fb8d-4f9e-bd6c-b36d4a9f89e5` with rollback `836e3ad7-af0a-46cd-8e32-e050d747e6f2` preserved before upload.

Both official Alpha origins subsequently served the exact merged SHA and `PUBLIC_ALPHA_UNDEPLOYED`; the repository's complete nine-request production smoke passed, followed by owner browser acceptance of Wealth, Value Goal multi-asset progress, Today, Goals, Habits, Health, reload/reconnect and mobile behavior.

Manual deployment run `35444908631` uploaded successfully but its immediate exact-source hostname check raced propagation and recorded `NEEDS_OWNER_REVIEW`. The later exact-source/full-smoke evidence proved the intended version live. GitHub Alpha deployment `6541222439` was therefore subsequently marked `success`. The original red Actions attempt is retained as historical evidence and was not rerun.

Goal Manager / Code ID remain **NOT DEPLOYED**. Public Alpha remains simulation, private local data, watch-only/public reads and explicit wallet connection only. No contract upload/instantiation, staking transaction, financial signing or broadcast occurred.

See [Run #8/#8.1 release closure](verification/run8-1-release/README.md).

---

# Run #8 superseding direction — 2026-09-17

Run #8 is implemented on [draft PR #15](https://github.com/reyals1111-ux/ZIGoals/pull/15) with required local checks and all five hosted quality/reproducibility checks passing; owner review remains pending. See [delivery report](RUN_8_REPORT.md), [explicit partial/deferred scope](RUN_8_BETA_BACKLOG.md), and [verification](verification/run8/README.md). No merge or deployment occurred. Complete implementation scope is [the complete master brief](RUN_8_ASTRA_MASTER_PROMPT.md). V2.1 visuals and Health V1 are frozen. Goals, Positions, native staking read-only, allocations, projections, Habits Beta and Today are the active milestone. Prior references to Run #8 Health Beta/UI V3 are superseded.

Owner-supplied new evidence: funding SOLVED (5,000 test ZIG); self-transfer 0.01 ZIG succeeded, hash 53216EEFF500DDD5D5A69B6EABF2E844ADC3988BE8D61CA277C1A979BCE5EA4C, height 7812205, sequence now 1. Post-transaction balance 4999997258125000000000 azig. Fee 2741875000000000 azig / 109675 gas wanted = 25000000000 azig/gas, versus configured 2500000000. No fee-policy change authorized without further evidence. Upload whitelist AnyOfAddresses excludes dedicated wallet; instantiate default Everybody does not authorize upload. Goal Manager/Code ID NOT DEPLOYED. No live financial execution, mainnet signing, upload or production deployment. Historical text below is dated evidence, not current funding status.

---

# Historical project status — 2026-09-17

**HISTORICAL PUBLIC ALPHA — OWNER-VERIFIED LIVE (2026-09-17).** Manual Alpha run `35153444566` deployed exact source `69aa0260eaa6bde3294ba7a778086839246c030a` to `zigoals-alpha` as Cloudflare version `836e3ad7-af0a-46cd-8e32-e050d747e6f2`. Rollback version `dd86bc45-0fcd-45e2-b8c4-5ec278d1cb80` was captured before upload. Automated deployment/security verification passed, followed by owner verification of build identity, real Keplr connect, reload to Local Demo, explicit reconnect, Habits persistence, Health persistence and mobile. Goal Manager and Code ID remain **NOT DEPLOYED**; no financial signing/broadcast is enabled.

**Run #7 / V2.1: MERGED + DEPLOYED + OWNER-VERIFIED LIVE.** Owner confirmation is recorded in the [manual Alpha runbook](deployment/MANUAL_ALPHA_WORKFLOW.md). Visual Refresh v1 remains historical: [PR #8](https://github.com/reyals1111-ux/ZIGoals/pull/8) merged at `b81262f1b9ae7e4a07efb9a6415e64d90fe120f9`. M6 and PR #7 housekeeping remain completed historical infrastructure work. [PR #6](https://github.com/reyals1111-ux/ZIGoals/pull/6) merged at `0c953a00d9f3e615289ae286549c74298b95dbdc`. **PUBLIC_ALPHA_DEPLOYED / OWNER_VERIFIED_LIVE:** [official Alpha](https://alpha.zigoals.app/app), [fallback](https://zigoals-alpha.reyals1111.workers.dev/app), and [apex landing](https://zigoals.app) are live.

- **Run #7 V2.1: OWNER-VERIFIED LIVE.** Merged [PR #9](https://github.com/reyals1111-ux/ZIGoals/pull/9) contains the product expansion and owner-requested visual correction. [Review package](verification/run7-v21/README.md): 17 visual corrections, 610 JS tests, 82 production browser tests, 22 local Workers checks, clean Alpha build/dry run and five successful implementation CI checks. The owner confirmed visual, real Keplr connect/reload/reconnect, Habit/Health persistence and mobile checks.
- **CONTRACT_NOT_DEPLOYED**: Goal Manager/code ID/onchain checksum absent. `PUBLIC_ALPHA_UNDEPLOYED` means web deployed, contract absent. Simulation, local metadata/backups, diagnostics and explicit wallet connection/public reads only. Financial preparation/signing/broadcast refuse at low-level boundaries.
- Live Alpha: Worker `zigoals-alpha`, owner-verified version `836e3ad7-af0a-46cd-8e32-e050d747e6f2`, exact source `69aa0260eaa6bde3294ba7a778086839246c030a`; verified rollback `dd86bc45-0fcd-45e2-b8c4-5ec278d1cb80`; successful manual run `35153444566`. Current Alpha remains simulation + explicit wallet connection only; Goal Manager and Code ID **NOT DEPLOYED**, no financial signing/broadcast.
- Live apex: Worker `zigoals`, owner version `de83a26a-d2ce-4f19-8067-09fa46a49fff` (new source SHA not supplied). CTA **Explore the Alpha →** targets the exact official `/app` URL with simulation/connection-only and no-transaction disclaimers.
- Real hosted Keplr rejection/reconnection is **OWNER_VERIFIED_HOSTED_EXTENSION_EVIDENCE** at both Alpha origins under production CSP. Correct truncated disposable account, 0 ZIG, no fee prompt/arbitrary-message/financial signature/broadcast. This closes the M4 hosted-extension limitation; mocks remain separate evidence.
- **ATTESTED CONTRACT CANDIDATE / NOT_APPROVED / HISTORICAL SOURCE**: release-candidate run `35023262754`, source `5765e356dcab1047f8f488515dfe44dd01eda5b4`, Wasm SHA256 `9ac9fec2941db7be4db13b4f6d7f8512b3d4fb87165e0284eaa10385782bea10`. Its reproducibility/attestation remains valid evidence, but later merges moved `main`; a fresh exact-current-main candidate plus explicit owner approval is required before any future upload.
- Owner verified real Keplr/reload to Local Demo/explicit reconnect, testnet diagnostics, mobile layout, CSP/security headers and no financial signing/broadcast on the current Alpha. PR #13 completed the duplicate HSTS/X-Robots cleanup while preserving Next/static coverage.
- Fresh read-only `zig-test-2` verification confirms the dedicated test wallet has **0 azig** and is not in `code_upload_access.addresses`. Owner-reported ZIGChain support communication on 2026-09-16 says CosmWasm whitelisting is on hold while a broad EVM integration is completed/tested, with no due date; support expects announcements and offered to ping the owner when things settle. The separate testnet-funding request remains pending. This DM is planning evidence, not a public protocol commitment. Real financial signing/upload remains **NOT RUN**.
- Owner reports **Workers Paid**, $5/month + usage. Exact M6 version, last 1 hour: CPU P50/P90/P99/P99.9 **120/229/428/428ms**, 61 invocations, 12 asset requests, 100% cache hit, 0 subrequests, 0 errors, 0 `exceededCpu` events. The **2000ms** limit is present in deployed config, **not separately confirmed by dashboard/version view**.
- Controlled production CPU: `/app` [524,42,33,28,42], median **42ms**; `/app/settings` [25,29,26,37,27], median **27ms**. `/icon.svg`: no Worker invocation, five HTTP 200 client requests and cache-hit corroboration; **asset bypass / Worker CPU N/A**, never 0ms. Static-routing optimization succeeded; dynamic Next/OpenNext SSR CPU did not improve in this window. Bundle remains **~6.84% smaller**; spike attribution is unproven.
- [Owner post-deploy evidence](verification/m6/OWNER_POST_DEPLOY.json), [M6 report](RUN_6_REPORT.md), [resume state](verification/m6/RESUME_STATE.md) and [CPU comparison/checklist](deployment/CPU_OWNER_CHECKLIST.md) close the rollout. Historical [M5 evidence](verification/m5/README.md), [Run 5](RUN_5_REPORT.md) and [Run 4](RUN_4_REPORT.md) retain their original findings. That historical housekeeping changed documentation only; Run #7 was subsequently merged/deployed and owner-verified; adding the manual workflow performs no production mutation.
- **Next documented product gate:** owner-controlled testnet readiness, then first idle Goal Manager deployment and deposit/withdraw/close proof via the [owner checklist](deployment/OWNER_TESTNET_CHECKLIST.md). Funding, upload permission and approval of the exact attested artifact remain prerequisites. Run #7 is closed with [merged PR #9](https://github.com/reyals1111-ux/ZIGoals/pull/9) and owner verification; see [report](RUN_7_REPORT.md). The [manual Alpha workflow](deployment/MANUAL_ALPHA_WORKFLOW.md) adds explicit owner dispatch/review, exact-main checks and rollback evidence; protected environment/credential setup precedes first use. This does not advance the contract deployment gate. The existing [Alpha tester guide](testing/ALPHA_TESTER_GUIDE.md) supports simulation-only feedback while those gates remain blocked.

Run #7 starts from the exact owner-approved V1 main. V1 final owner checks: clean exact-source Alpha build (dirty:false), dry-run, 14/14 desktop and 8/8 mobile checks, isolated preview, 100% rollout, custom-domain HTTP 200, live hero and CSP/security headers. These are owner-supplied production evidence, not new Run #7 production actions.
