# Current Run 10 release state — 2026-09-25

PR [#20](https://github.com/reyals1111-ux/ZIGoals/pull/20) is merged. The reviewed Run 10 web and local experience is deployed on [Alpha](https://alpha.zigoals.app/app) from exact main source `901e2a6600fb8292b7956717d45341f050fd377c`. The owner confirmed that the deployed app works. This does not close account, sync, market readiness or the remaining engineering and owner-device gates recorded in [POLISH_REVIEW.md](POLISH_REVIEW.md), [BLOCKERS.md](BLOCKERS.md) and [FINAL_REPORT.md](FINAL_REPORT.md).

Existing [Manual Alpha deployment #7](https://github.com/reyals1111-ux/ZIGoals/actions/runs/36167099005) completed successfully. Its downloaded `deployment.json` records `VERIFIED`, new Worker version `1438406e-4ede-423b-81cc-5eeb0d1c1a8a`, deployment `08cfebe0-0970-48b7-a6a6-1a75ca5ca496`, rollback version `768673e8-9d39-4022-b1c0-fdd805fa2318`, rollback deployment `f68e9c54-735c-4d45-aefa-c2083c2ab142`, and eleven HTTP 200/security PASS route checks. These are historical rollout observations, not a fresh live probe.

Downloaded artifact SHA256: `deployment.json` `81e6422dac699e69808478fad7e9c4120edbf1eece1103b3df93f4b69d6800d7`; `rollback.json` `830ef145e9e0aa5b93ec8a6e5a5122813a3739879716c6e4f523886b6df9a0c9`; `alpha-build.json` `dc149bf20ebeacd52714c1757c4e2a6b00adfff5e9c2f56a885e7df00a8e4cce`; `wrangler-output.jsonl` `0c72a28bf1c270e13494a1af7a25c75bafd15cdf7e76e348b20f0cc6ba5916de`.

Source-only recovery archive: `.superpowers/pre-run11-recovery/source-901e2a6.tar.gz`, SHA256 `641102eeeba4b19b7f011b3188d8e285bc3d285bd39c08949068b4f903913391`; [integrity manifest](evidence/pre-run11-source-manifest.json). It contains the exact tracked Git tree at the deployed SHA (1,346 tar entries). Archive listing succeeded; extracted `OWNER_ACTIVATION.md`, `REQUIREMENTS.json` and `apps/web/lib/vault/database.ts` matched the checked-out source byte for byte. This archive is not a deployment artifact or a backup of browser, vault, financial or Health data.

The actual NovaVault project map and existing Run 10 checkpoint were updated separately with sanitized facts. Historical draft/no-deployment reports remain historical.
