# Landing Worker operations

The static landing page and the application Alpha are separate Cloudflare Workers. `landing/wrangler.jsonc` names the apex Worker `zigoals`; `apps/web/wrangler.alpha.jsonc` names the application Worker `zigoals-alpha`. The apex may serve only `zigoals.app`, and Alpha may serve only `alpha.zigoals.app`. Never substitute one config, Worker name, route, or version for the other.

## Local validation

Run these commands from the repository root. They use the checked-in Wrangler 4.147.0 dependency from `@zigoals/web`; no global Wrangler installation is used.

```sh
pnpm check:deploy-configs
WRANGLER_SEND_METRICS=false pnpm check:landing
```

`check:deploy-configs` reads both repository configs without network access and fails on a target, path, route, binding, or static-asset isolation mismatch. It also enforces the apex upload allowlist: `landing/.assetsignore` must deny everything with `*` and may re-include only the public runtime (`index.html`, `favicon.ico`, `styles/*.css`, `scripts/*.js`, `scripts/*.mjs`, `assets/**`); the type denials that follow it must stay; and the real `landing/` tree must contain no non-public file — no `.wrangler/`, `node_modules/`, `docs/`, `review/`, `tools/`, `backups/` or `source/` directory, and no `.md`, `.json`, `.jsonc`, `.py`, `.sh`, `.test.*` or `.env*` file. It also requires `"workers_dev": false` and `"preview_urls": false` in `landing/wrangler.jsonc` (see below).

Since Session U (FIX_PLAN F4, FINDINGS Q-WEB-02), `.assetsignore` ends with one more block, in this order: `assets/**/*`, then `!assets/**/` and `!assets/**/*.webp`, `*.png`, `*.svg`, `*.mp4`, then `.*`. Under `assets/` only those media types are uploaded, and no dotfile is uploaded anywhere: a note, a draft, a `.DS_Store` or a `.git` folder left in the tree stays out (`scripts/landing-assets.test.mjs` asks Wrangler's dry run). `check:deploy-configs` requires the block at the end of the file and, in a git checkout, fails while any untracked file sits under `landing/`.

`check:landing` is the canonical apex dry run. It compiles and inspects the static upload without contacting the deployment API or changing Cloudflare. Wrangler reports every entry in `landing/` before ignore filtering — currently 274, which is 251 files plus 23 directories (Landing V5; V4 had 225) — and then ignores `.assetsignore`, `wrangler.jsonc` and `_headers`. For a local audit of those decisions, set `WRANGLER_LOG=debug` and direct `WRANGLER_LOG_PATH` to a scratch file outside `landing/`; the log prints an `Ignoring asset:` line per excluded file.

`landing/_headers` is excluded from the upload on purpose. Wrangler still parses it into the Worker's response headers — it logs `✨ Parsed 1 valid header rule.` — so the security policy applies while the file itself is not fetchable. Keep it denied in `.assetsignore`.

### Serving the apex locally

To exercise the deployable bytes through the real Workers-Assets runtime, including `_headers`:

```sh
pnpm --filter @zigoals/web exec wrangler dev --config ../../landing/wrangler.jsonc --name zigoals --port 8788 --ip 127.0.0.1 --persist-to .wrangler/landing-state
```

`--persist-to` keeps Miniflare's state in `apps/web/.wrangler/landing-state/` (ignored by git), outside the deployable tree; delete it afterwards. Without it, Wrangler 4.144 writes its state to `landing/.wrangler/`, inside the assets directory it watches, and reloads in a loop without answering a request (seen on `main` and on Landing V5, 2026-10-03). If `landing/.wrangler/` exists, delete it: `check:deploy-configs` fails while it is present, because nothing but the public site may sit in the deployable tree.

## Owner-only deployment

The following commands mutate or inspect the owner’s Cloudflare account. They are documented for an authenticated owner and were not run while preparing this change.

Deploy from a clean checkout of the reviewed commit, never from a working tree with other files in it (FINDINGS Q-WEB-02). For example, from the repository root: `git worktree add ../zigoals-landing-deploy <reviewed SHA>`, then `cd ../zigoals-landing-deploy`, `pnpm install --frozen-lockfile --ignore-scripts`, and run `pnpm check:deploy-configs` there; it must pass. Remove the worktree afterwards with `git worktree remove ../zigoals-landing-deploy`. Keep the explicit config path and Worker name on every Worker/version command. Before an upload, verify the authenticated account, inspect the current deployment, and record its known-good version ID for rollback:

```sh
pnpm --filter @zigoals/web exec wrangler whoami
pnpm --filter @zigoals/web exec wrangler deployments list --config ../../landing/wrangler.jsonc --name zigoals
pnpm --filter @zigoals/web exec wrangler versions list --config ../../landing/wrangler.jsonc --name zigoals
pnpm --filter @zigoals/web exec wrangler versions view SAFE_VERSION_ID --config ../../landing/wrangler.jsonc --name zigoals
```

Stop if the account, Worker name, current version, or existing apex assignment is unexpected. The repository config deliberately contains no route or custom-domain mutation, so confirm that the existing `zigoals.app` assignment is already attached to `zigoals` before continuing. After reviewing the dry-run manifest and the exact source commit, the owner may publish only the static apex Worker:

```sh
pnpm --filter @zigoals/web exec wrangler deploy --config ../../landing/wrangler.jsonc --name zigoals --strict
pnpm --filter @zigoals/web exec wrangler deployments list --config ../../landing/wrangler.jsonc --name zigoals
```

The config keeps workers.dev and Preview URLs off (`"workers_dev": false`, `"preview_urls": false`; Session R1), and `check:deploy-configs` refuses any other value. A config that says nothing lets a deploy turn workers.dev back on: the Landing V5 deploy did on 2026-10-03, and the owner switched it off in the dashboard afterwards. With both off and no route in the config, Wrangler ends the deploy with "No targets deployed for zigoals". That is expected: the version is uploaded and deployed, and the `zigoals.app` custom domain, attached in the dashboard, keeps serving the Worker.

Verify `https://zigoals.app/` and the CTA links after publication, and confirm the security policy survived the upload:

```sh
curl -sSI https://zigoals.app/
```

Expect `content-security-policy`, `x-content-type-options`, `x-frame-options`, `referrer-policy`, `permissions-policy`, `cross-origin-opener-policy` and `strict-transport-security: max-age=31536000`, and expect `https://zigoals.app/_headers` to answer 404.

Since Session U, `landing/_headers` sends `Strict-Transport-Security: max-age=31536000`, the app's value, with no `includeSubDomains` and no `preload`. `.app` is on browsers' HSTS preload list as a whole top-level domain, so browsers already reach `zigoals.app` and its subdomains only over HTTPS; the header says the same to every other client and cannot lock a subdomain out. Adding `includeSubDomains` or `preload` stays a separate zone-level decision.

### `www.zigoals.app` → `zigoals.app` (owner steps, dashboard)

The landing Worker serves static assets only and cannot redirect by host name without a route, so the redirect is a zone rule (Cloudflare docs, "Create a redirect rule in the dashboard" and "Redirect www to root", read 2026-10-05):

1. Cloudflare dashboard → the `zigoals.app` zone → **Rules → Overview → Create rule → Redirect Rule**.
2. **Rule name:** `www to apex`. **When incoming requests match:** wildcard pattern, request URL `https://www.zigoals.app/*`.
3. **Then:** target URL `https://zigoals.app/${1}`, status code **301**, **Preserve query string** on. Deploy.
4. Redirect Rules apply only to traffic Cloudflare proxies: `www` needs a proxied (orange-cloud) DNS record. If the dashboard offers to create one, accept a proxied `AAAA www 100::`: Cloudflare's DNS docs ("Manage DNS records", read 2026-10-05) give `100::`, from the IPv6 discard prefix, as the placeholder for a host that only redirects. Do not point `www` at anything else.
5. Check: `curl -sSI https://www.zigoals.app/` answers `301` with `location: https://zigoals.app/`.

This procedure does not publish `zigoals-alpha`, add routes, change DNS or email records, sign a release, or authorize any chain upload.

## Rollback

Choose the previously recorded known-good apex version, inspect it again, and roll back only `zigoals`:

```sh
pnpm --filter @zigoals/web exec wrangler versions view SAFE_VERSION_ID --config ../../landing/wrangler.jsonc --name zigoals
pnpm --filter @zigoals/web exec wrangler rollback SAFE_VERSION_ID --config ../../landing/wrangler.jsonc --name zigoals
pnpm --filter @zigoals/web exec wrangler deployments list --config ../../landing/wrangler.jsonc --name zigoals
```

Recheck the apex and CTA links. Do not delete the Worker, change its domain or DNS assignment, or roll back `zigoals-alpha` as part of apex recovery.
