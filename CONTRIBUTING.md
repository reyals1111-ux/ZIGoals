# Contributing to the alpha

Read [current status](docs/STATUS.md), [README setup](README.md#run-locally) and [SECURITY.md](SECURITY.md). Keep changes scoped to the relevant milestone. Idle is the only executable strategy; no mainnet, keys, custodial helpers, invented protocol messages or external financial integrations.

Use Node24.19.0 and pnpm11.19.0. Run `node scripts/doctor.mjs` first. `.node-version` and `.nvmrc` agree; select the version through your own version manager. A successful development server under another Node version does not establish release compatibility. The doctor does not install anything.

Use a feature branch, preserve history and submit a pull request with the concrete problem, resulting behavior and relevant verification. Run `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build`; browser changes need production desktop/mobile checks. Contract changes also need pinned Rust formatting, Clippy, tests, schema/type consistency and the validated Wasm build. CI runs full pull-request checks and full main-push checks after merge. Feature pushes without a PR intentionally avoid a second duplicate run.

Add tests that catch observable defects. Keep token/base-unit amounts in strings/BigInt and calculations in Decimal. Preserve owner/network/contract scope, withdrawal availability, uncertainty after broadcast and refusal of unknown schemas. Never convert a missing receipt into failure or automatically resend it. Research lifecycle labels and explorer links confer no execution authority.

Do not commit `.env` files, keys, browser profiles, logs containing personal data or private goal backups. Use synthetic fixtures and the [bug template](.github/ISSUE_TEMPLATE/bug_report.yml). Security issues go privately to **hello@zigoals.app**. Historical milestone reports are evidence: update current STATUS or append a clearly dated section instead of rewriting them.
