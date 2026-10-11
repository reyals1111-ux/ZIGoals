# Public web Alpha engineering notes

App version **0.1.0**. **PUBLIC_ALPHA_DEPLOYED / OWNER_VERIFIED_LIVE** at [alpha.zigoals.app/app](https://alpha.zigoals.app/app), backed by `zigoals-alpha`. The apex [zigoals.app](https://zigoals.app) has the reviewed Alpha CTA and safety disclaimer. No tag or GitHub Release has been created by M5.

Goal Manager is **CONTRACT_NOT_DEPLOYED**. The live build's `PUBLIC_ALPHA_UNDEPLOYED` mode supports simulation, browser-local plans/backups, diagnostics, optional Keplr connection and public chain reads. Financial preparation, signer acquisition, signing and broadcast remain blocked. Idle is the only executable strategy. Real financial signing has not run.

The owner tested real Keplr rejection and connection on both hosted origins under production CSP, using the disposable 0-ZIG test account. This is owner-observed extension evidence; browser-injected mocks do not establish extension compatibility. Source/version and exact observations are [recorded separately](../verification/m5/OWNER_LIVE_ALPHA_EVIDENCE.json).

The first manual canonical candidate was issued and attested for exact source `3645b489e4bc2a31ef16d39bdc27f7c00e2ecd72` in run `34772005556`. M5 independently verified the downloaded Wasm and both native attestations. It remains **ATTESTED_CANDIDATE_NOT_APPROVED**. Later commits are not attested by that evidence. Mac/Linux cross-host byte identity remains unestablished; canonical Linux is the release authority.

M5 improves explicit reconnect guidance while keeping local mode on reload, fixes the landing config-relative assets path, adds deployment-target regression checks, and consolidates live evidence. These repository changes are pending separate owner review and deployment; M5 does not update either live Worker.

See [current status](../STATUS.md), [Run 5](../RUN_5_REPORT.md), [evidence](../verification/m5/README.md), [tester guide](../testing/ALPHA_TESTER_GUIDE.md) and [privacy](../PRIVACY.md). This remains experimental, unaudited software with no mainnet support or return guarantee. Funding/upload permission and canonical external-provider interfaces remain separate gates.
