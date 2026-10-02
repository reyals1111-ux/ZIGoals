# Pending upgrades: notes, October 2026

**Status (2026-10-01, Session J):** notes only. No version, lockfile or config changed. Installed pins at `main` `fc906e8`:
- wrangler 4.144.0;
- `@opennextjs/cloudflare` 1.20.7;
- next 16.3.6;
- `@cosmjs/*` 0.38.1;
- `cosmjs-types` 0.11.0.

Owner decisions this follows:
- Wrangler 4.146 waits until after Stage 7.
- CosmJS 0.39 is skipped.
- Workers are deployed from `main` tonight, so nothing here may move them.

Evidence labels:
- **changelog:** the project's own CHANGELOG at its `main` branch, read from `raw.githubusercontent.com` on 2026-10-01;
- **npm:** registry metadata read the same day;
- **local:** this checkout;
- **local docs:** `apps/web/node_modules/next/dist/docs` for the pinned Next.js 16.3.6.

`nextjs.org`, `opennext.js.org` and the GitHub web and API pages refuse connections under this sandbox's network policy (CONNECT 403), so they were **not** read.

## 1. Wrangler 4.144.0 → 4.146.0 (after Stage 7)

### What changed (changelog, npm)
Two releases. There was no 4.144.x patch release.

**4.145.0** (npm: published 2026-09-30 14:20 UTC):
- **New features:**
  - an Analytics SQL binding;
  - `wrangler basin sql|catalog|pipelines` graduated to stable, with the old `r2 sql` / `r2 bucket catalog` / `pipelines` paths kept as hidden aliases;
  - beta K2 producer bindings and `wrangler k2 streams …` commands.
- **Login scopes:** default OAuth logins now **request extra K2 scopes** (`k2.read`, `k2.write`). The owner's next `wrangler login` consent screen lists more permissions.
- **Renamed variable:** `WRANGLER_R2_SQL_AUTH_TOKEN` becomes `WRANGLER_BASIN_SQL_AUTH_TOKEN`.
- **Runtime:** workerd 1.20260926.1 → 1.20260930.2 and miniflare 5.20260930.0-alpha.

**4.146.0** (npm: published 2026-10-01 16:34 UTC):
- **New features:** Workflows `createBatch()` in local development, and `--allowed-mail` for the experimental `wrangler tunnel quick-start`.
- **Labels:** `wrangler artifacts` is marked open beta.
- **`wrangler tail --header` fix:** values containing colons are no longer cut.
- **Runtime:** workerd → 1.20261001.1, miniflare 5.20261001.0-alpha. The other pinned dependencies (esbuild 0.28.1, unenv 2.0.0-rc.24, `@cloudflare/unenv-preset` 2.16.2) are what npm lists for 4.146.0.

### Against our deploy path
- **Commands and flags we use are untouched.** We use `deploy`, `versions view|list`, `rollback`, `deployments list`, `tail`, `dev`, `types`, `secret put|delete` and `whoami`. The exact flags are pinned by `scripts/wrangler-cli-surface.test.mjs`, and none of them appear in either changelog.
- **The `tail --header` fix does not affect us.** We call `tail` with `--version-id`, `--method`, `--ip` and `--format` only, never `--header`.
- **Our Workers declare none of the new bindings or commands** (Analytics SQL, K2, Basin, Workflows, Artifacts, tunnels). Adding one would be a reviewed config change. The landing config is allowlisted, and the Alpha config's bindings are pinned to `ASSETS` and `WORKER_SELF_REFERENCE` by `check-deployment-configs.mjs`.
- **The workerd bump is the real change.** It changes the local runtime (Miniflare harnesses, `preview:alpha`) and the generated `workers/worker-runtime.d.ts`. The types-drift check will flag the regeneration, as it did for 4.144.0.
- **Peers:** OpenNext 1.20.7 peers `wrangler ^4.125.0` (npm), so 4.146.0 satisfies it.

### Risks
1. **Changing the tool mid-activation.**
   - The Stage 7 rehearsal of the recovery-admin remote binding is still **UNVERIFIED** and was reasoned from 4.144's code ([OWNER_RECOVERY_ADMIN.md](../run11/OWNER_RECOVERY_ADMIN.md)).
   - `stage7-preflight.mjs` checks that the installed wrangler equals the pin.
   - Upgrading before Stage 7 would invalidate that reasoning and the owner's rehearsal notes. **This is why it waits.**
2. **workerd behaviour drift** in the Alpha bundle or the private Workers. Mitigation: byte-compare the Alpha `worker.js` and re-run every Miniflare harness (below).
3. **The owner's OAuth consent shows more scopes** (K2). This is harmless, but the owner should expect it at the next `wrangler login`.
4. **pnpm's 24-hour release-age rule** refuses a frozen install of 4.146.0 until **2026-10-02 16:34 UTC**, as it did for 4.144.0 (Session D). Do not commit a `minimumReleaseAgeExclude`.

### Plan (after Stage 7 passes)
Follow Session D's 4.144.0 method (STATUS, "Part 2 — wrangler 4.144.0 (details)"):
1. **Own PR,** one commit for the bump: wrangler and its exact transitive pins only, through a frozen lockfile.
2. **Read every changelog entry again,** including any 4.146.x or 4.147 by then.
3. **Command surface and output:**
   - `scripts/wrangler-cli-surface.test.mjs`;
   - capture real `deploy --secrets-file` output against the local mock API, as for 4.144, and diff the JSONL `deploy` entry and the upload metadata;
   - confirm a dry run still writes `version_id: null`, which `deployedVersion` refuses.
4. **Alpha package:**
   - `build:alpha` under 4.144.0 and 4.146.0 from the same `.open-next`, and **byte-compare `worker.js`**;
   - the `check:alpha` size line;
   - bindings still `WORKER_SELF_REFERENCE` and `ASSETS`.
5. **Types and harnesses:**
   - regenerate `worker-runtime.d.ts` and re-check `runtime-overrides.d.ts`;
   - `pnpm test`, which includes all Miniflare harnesses;
   - `activation-check --dry-run`, then `RUN11_PACKAGED`;
   - `preview:alpha` plus `public-alpha.spec.ts` and `diagnostics.spec.ts`.
6. **Owner handover:**
   - a short "first deploy on 4.146" note, as [WATCHED_DEPLOY_WRANGLER.md](../run11/WATCHED_DEPLOY_WRANGLER.md) was for 4.144;
   - update the ops checkout, then re-run `stage7-preflight.mjs`.

## 2. CosmJS 0.39.0 (skipped)

### What changed (changelog: 0.39.0, 2026-05-04; npm: still `latest` on 2026-10-01)
- **Node.js ≥ 22 required.** We pin 24.19.0, so this is no problem in itself.
- **New crypto stack:** `@noble/*` and `@scure/bip39` move to v2.
  - Argon2id is now pure JS from `@noble/hashes`; `hash-wasm` is removed.
  - Argon2id itself is deprecated.
- **Breaking:** `@cosmjs/stargate` `Account.accountNumber` changes from `number` to `bigint`, and `makeSignDoc` now accepts `bigint` (encoded as `Uint64`).
- **Package manifests:** the classic `main`/`types` fields come back next to `exports`.
- **Security bumps:** `protobufjs` ^7.5.5 (GHSA-xq3m-2v4x-88gg) in `@cosmjs/proto-signing`, and `koa` in the faucet. Locally, `pnpm-lock.yaml` contains no `protobufjs` at all under 0.38.1, so that advisory does not reach our tree, and CI's `pnpm audit --prod --audit-level high` is clean.

### Why it is skipped now
- **Signing is the least-tested path in the Alpha.** Financial signing and broadcast are disabled, and the Goal Manager contract is not deployed. So the one breaking change (`accountNumber` as `bigint`) sits on a path we cannot exercise end to end yet.
- **It replaces the crypto libraries under Keplr signing.**
- **No advisory forces it.** The `protobufjs` fix does not apply to our lockfile.
- **It touches the wallet bundle,** which a platform session should not move while the owner is activating.

### What a later wallet session must check
1. **Every `@cosmjs` import site:**
   - `lib/wallet.ts` (`SigningCosmWasmClient` at :135, :146, :204 and :256; `calculateFee`/`GasPrice` from `@cosmjs/stargate` at :137; `@cosmjs/proto-signing` at :4);
   - `lib/diagnostics.ts`, `lib/contract-evidence.ts`;
   - `lib/position-reader.ts`, `lib/native-positions.ts` (`@cosmjs/encoding`).

   Search for any read of `accountNumber`. Today the app reads none directly (grep), but the signing clients use it internally.
2. **Keplr:** a direct and an amino signing round-trip with the real extension on the testnet (the owner's Keplr checklist). The sign doc's account number must round-trip as `Uint64`.
3. **Type pairing:** `cosmjs-types` stays 0.11.0. 0.39.0 depends on `^0.11.0`, so there is no second copy. Verify one copy in the lockfile.
4. **Bundle and CSP:** the client chunk sizes with `hash-wasm` removed and `@noble` v2. The production `script-src` allows neither `unsafe-eval` nor `wasm-unsafe-eval` (`lib/security-policy.ts:6`). Confirm in the browser that no signing path now needs either; never relax the CSP to make it work.
5. **Gates:** `wallet.test.ts`, `native-positions.test.ts`, `positions-route.test.ts`, the Keplr owner checklist ([KEPLR_OWNER_CHECKLIST.md](../deployment/KEPLR_OWNER_CHECKLIST.md)) and `pnpm audit`.
6. **Amounts** stay strings and BigInt, with no `Number(accountNumber)` shortcut (CONTRIBUTING).

## 3. Next.js `middleware.ts` → `proxy.ts` (not started)

### Status
- **Next.js 16.3.6 (pinned):**
  - **Deprecation:** "The `middleware.js` file convention has been **deprecated** in Next.js 16 and renamed to `proxy.js`." (local docs: `01-app/03-api-reference/03-file-conventions/middleware.md`)
  - **Runtime:** "Proxy defaults to using the Node.js runtime. The `runtime` config option is not available in Proxy files." (local docs: `…/proxy.md`, "Runtime")
  - **Migration:** a codemod exists: `npx @next/codemod@canary middleware-to-proxy .`

  Moving therefore also moves our CSP-nonce middleware **from the edge runtime to the Node.js runtime**.
- **OpenNext Cloudflare 1.20.7 (pinned; npm `latest`):**
  - Node.js middleware (`proxy.ts`) support arrived in **1.20.3** (#1309). It is bundled into a Workers-compatible `middleware/handler.mjs` and is **"experimental and requires the `nodejs_compat` compatibility flag"** (changelog).
  - 1.20.3 also fixed every proxied request failing on Next 16.3's dynamic instrumentation `require` (#1359).
  - Earlier releases errored out on a Node middleware (1.x, #978).
  - Nothing in 1.20.4–1.20.7 marks the support stable (changelog).
- **Us:** `apps/web/middleware.ts:3` says "Legacy edge middleware is intentional: OpenNext cannot run Node proxy yet". That is now **outdated in fact but right in effect**: support exists, but it is experimental.
  - `wrangler.alpha.jsonc` already sets `nodejs_compat`.
  - The middleware builds the per-request CSP nonce and headers for every HTML response, so it is security-critical.

### Recommendation
Stay on `middleware.ts` until OpenNext marks Node middleware stable (watch its CHANGELOG). Next 16 still runs it; deprecated is not removed.

When it moves, do it in its own PR:
1. Run the codemod.
2. `build:alpha` and inspect `middleware/handler.mjs`.
3. Run `public-alpha.spec.ts` and `diagnostics.spec.ts` on `preview:alpha`: a CSP nonce on every page, every security header, and no `x-nonce` leak.
4. Measure CPU with `scripts/measure-alpha-performance.mjs` against [M6_CPU_PLAN.md](../architecture/M6_CPU_PLAN.md). Node middleware adds a bundle and may cost CPU per request.
5. Update the comment at `middleware.ts:3`, which is in the app lane, and a later session's job.

### Sources
- changelog: `opennextjs/opennextjs-cloudflare`, `packages/cloudflare/CHANGELOG.md`, entries 1.20.3 (#1309, #1359) and 1.20.4–1.20.7;
- npm: `@opennextjs/cloudflare` dist-tags and times, and peer dependencies of 1.20.7;
- local docs: Next.js 16.3.6 `middleware.md` and `proxy.md` (Runtime, Migration to Proxy);
- local: `apps/web/middleware.ts`, `apps/web/wrangler.alpha.jsonc`;
- **Not read:** `opennext.js.org/cloudflare` and `nextjs.org/docs` (blocked here). Re-check them before the migration PR.
