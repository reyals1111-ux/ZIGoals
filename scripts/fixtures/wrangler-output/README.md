# Real wrangler output, pinned

These files were written by the real `wrangler` CLI, not typed by hand. They pin what the Manual Alpha deploy parses
(`deployedVersion` in `scripts/lib/alpha-deployment.mjs`) and the dry-run line the docs quote. `scripts/alpha-deployment.test.mjs`
and `scripts/wrangler-cli-surface.test.mjs` read them.

| File | Source |
|---|---|
| `<version>/deploy-mock-api.jsonl` | `WRANGLER_OUTPUT_FILE_PATH` of a real `wrangler deploy … --secrets-file` of the throwaway Worker in `capture/worker`, against `capture/mock-api.mjs` |
| `<version>/upload-metadata.json` | the metadata part of the script upload that deploy sent to the mock |
| `<version>/mock-api-requests.txt` | every API request that deploy made (method, path, body bytes) |
| `<version>/mock-api-requests-workers-dev.txt` | the same with `workers_dev: true` (as in `wrangler.alpha.jsonc`) and the mock reporting workers.dev already enabled |
| `<version>/alpha-dry-run.jsonl`, `.txt` | `wrangler deploy --config wrangler.alpha.jsonc --dry-run --outdir …` of the real Alpha build (output file; stdout without colour codes) |

Captured 2026-09-30 with wrangler 4.131.1 (before) and 4.144.0 (after), Node 24.19.0. Paths and timestamps are left as written.

**No Cloudflare account is involved.** `capture/capture.sh` runs only inside `unshare -rn`: a network namespace whose only
interface is loopback, so nothing can leave the machine. It points `CLOUDFLARE_API_BASE_URL` at the local mock, uses a
dummy token and account ID, removes proxy variables, and refuses to run if `api.cloudflare.com` resolves.

```sh
unshare -rn scripts/fixtures/wrangler-output/capture/capture.sh "$PWD/apps/web/node_modules/.bin/wrangler" /tmp/wrangler-capture
```

What changed from 4.131.1 to 4.144.0 (compare the two folders):
- The `deploy` entry has the same keys and types. A dry run writes a `deploy` entry too, with `version_id: null`.
- After the upload, deploy reads the Worker resource (`GET /accounts/:id/workers/workers/:name`) for its workers.dev settings, instead of `GET …/workers/scripts/:name/subdomain` (4.136.1). Every other call is the same.
- The upload metadata adds `code_update_strategy: {mode: "deferred", max_delay: 300}` (4.141.0). The Alpha has no Durable Objects.
- The same Alpha build bundles to a byte-identical `worker.js` under both versions: 13,560.94 KiB / gzip 2,625.33 KiB.
