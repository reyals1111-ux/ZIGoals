# Worker type declarations

`pnpm typecheck` checks the Workers in a separate program, `tsconfig.workers.json`, with Workers runtime types instead of the DOM library:
- `workers/**/*.ts` (today the market coordinator) and its test fixture `scripts/run11/market-fault-fixture.ts`. The program overrides the root `exclude`, which lists that fixture, so it is really checked.
- The `.mjs` Workers (`workers/*/*.mjs`: auth-abuse, food-lookup, private-sync `worker`, `lifecycle`, `rotation`, `sessions`; push-reminders `worker`, `verify`, `hosts`, `clock`, `webpush`) through `checkJs`, with JSDoc types. Each Worker declares its bindings as a JSDoc `@typedef`. `checkjs.d.ts` describes Durable Object storage as these Workers use it: stored records are schemaless JSON that each Worker validates where it reads them, so a stored value reads as `any`, while the storage API itself is checked.

Declarations, all generated offline by the pinned wrangler (no account):
- `worker-runtime.d.ts`: runtime types (workerd, compatibility date 2026-09-13), shared by every Worker. Generated; do not edit.
- `market-coordinator/worker-configuration.d.ts`: the `Env` bindings from `wrangler.local.jsonc`. Generated; do not edit.
- `runtime-overrides.d.ts`: small hand-written corrections where the generated runtime types are stricter than workerd. Each entry says what was checked.
- `checkjs.d.ts`: hand-written storage types for the JSDoc in the `.mjs` Workers (above).

Regenerate after changing a Worker config, its compatibility date or the wrangler version (run from `workers/market-coordinator`):

```sh
../../apps/web/node_modules/.bin/wrangler types ../worker-runtime.d.ts -c wrangler.local.jsonc --include-env=false
../../apps/web/node_modules/.bin/wrangler types worker-configuration.d.ts -c wrangler.local.jsonc --include-runtime=false
```

`scripts/worker-types.test.mjs` runs the same commands with `--check`. That check compares the config and command hash recorded in each file's header, not the file contents, so it catches a changed config or wrangler version but not a hand edit.
