# Worker type declarations

`pnpm typecheck` checks `workers/**/*.ts` (today the market coordinator) and its test fixture `scripts/run11/market-fault-fixture.ts` in a separate program, `tsconfig.workers.json`. That program uses Workers runtime types instead of the DOM library. The `.mjs` Workers are not type-checked.

Declarations, all generated offline by the pinned wrangler (no account):
- `worker-runtime.d.ts`: runtime types (workerd, compatibility date 2026-09-13), shared by every Worker. Generated; do not edit.
- `market-coordinator/worker-configuration.d.ts`: the `Env` bindings from `wrangler.local.jsonc`. Generated; do not edit.
- `runtime-overrides.d.ts`: small hand-written corrections where the generated runtime types are stricter than workerd. Each entry says what was checked.

Regenerate after changing a Worker config, its compatibility date or the wrangler version (run from `workers/market-coordinator`):

```sh
../../apps/web/node_modules/.bin/wrangler types ../worker-runtime.d.ts -c wrangler.local.jsonc --include-env=false
../../apps/web/node_modules/.bin/wrangler types worker-configuration.d.ts -c wrangler.local.jsonc --include-runtime=false
```

`scripts/worker-types.test.mjs` runs the same commands with `--check`. That check compares the config and command hash recorded in each file's header, not the file contents, so it catches a changed config or wrangler version but not a hand edit.
