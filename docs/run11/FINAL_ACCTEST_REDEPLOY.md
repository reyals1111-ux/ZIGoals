# The final acceptance redeploy: owner run sheet

**When:** once, after every update planned for the next 2–3 weeks is merged and live on `alpha.zigoals.app` first (owner decision, 2026-10-03/04; STATUS). Then Stage 8 (target 22–24 October), then the friends Alpha (26 October).

**What:** every Worker whose code changed since the Stage 7 deploy (`d439dc9`) is redeployed from the merged `main`. The services go first, and the app last.

**Rules for every step:**
- One command per step.
- A read-only check comes before every change.
- Never paste output that shows an email, a UUID, a digest or a `workers.dev` subdomain anywhere public.
- Record receipts in your private STAGE8_ACCEPTANCE copy.

Written by Session S (2026-10-04) from the Stage 7 lessons. Nothing here was run by a session.

## 0. Before you start (read only)
1. **The release SHA:** the full SHA of `main` that you deploy. Main's CI is green on it.
2. **The Alpha prices rollout is done:** [ALPHA_PRICES_ROLLOUT.md](ALPHA_PRICES_ROLLOUT.md). Note the SHA the market coordinator was deployed from there.
3. **The market policy window:** the private `MARKET_POLICY` uses an exact window that ends **2026-10-31 16:00 UTC**. Prepare the next period around **28 October** and switch at or after 16:00 UTC on 31 October ([ALPHA_PRICES_ROLLOUT.md, Next policy period](ALPHA_PRICES_ROLLOUT.md#next-policy-period)); the coordinator refuses a period before it starts and every price after the old one ends.

## 1. Ops checkout at the release SHA
```sh
cd ~/ops/ZIGoals                                   # your ops checkout, with the 7 ignored 0600 configs
git status --short                                 # read only: nothing but your ignored files
git fetch origin
git checkout --detach <release SHA>
git rev-parse HEAD                                 # read only: prints the release SHA
node scripts/doctor.mjs                            # read only: Node 24.19.0, pnpm 11.19.0
pnpm install --frozen-lockfile --ignore-scripts
pnpm --filter @zigoals/web exec wrangler --version # read only: the pinned version (4.147.0 after Session S)
```
- **The private env file lives outside the checkout:** `~/.config/zigoals/acctest.env`, mode 600.
- `build:alpha` refuses to run while any `.env*` other than `.env.example` is in `apps/web` or the checkout root.

```sh
ls -l ~/.config/zigoals/acctest.env                # read only: -rw------- and outside the checkout
ls -a apps/web | grep '^\.env' ; ls -a | grep '^\.env'   # read only: only .env.example may appear
node scripts/run11/activation-check.mjs --private  # read only: PASS
node scripts/run11/activation-check.mjs --admin    # read only: PASS
node scripts/run11/stage7-preflight.mjs            # read only: READY
```

## 2. Which Workers changed (read only)
Run this from the checkout. It lists each Worker's sources that changed since the Stage 7 deploy:
```sh
for w in "lifecycle:workers/private-sync/lifecycle.mjs" \
         "private-sync:workers/private-sync/worker.mjs workers/private-sync/sessions.mjs workers/private-sync/rotation.mjs" \
         "food-lookup:workers/food-lookup/" \
         "auth-abuse:workers/auth-abuse/" \
         "market-coordinator:workers/market-coordinator/ apps/web/lib/server/ apps/web/lib/market-*.ts apps/web/lib/exact-market-json.ts apps/web/lib/provider-validation.ts apps/web/lib/json-media-type.ts" \
         "app:apps/web/"; do
  name=${w%%:*}; paths=${w#*:}
  echo "$name: $(git diff --name-only d439dc9..HEAD -- $paths | wc -l) changed files"
done
```
**Authoritative check:** if a list is unclear, compare the bundles. Run the dry run of that Worker's template at both SHAs:

```sh
pnpm --filter @zigoals/web exec wrangler deploy --config "$PWD/<template>" --dry-run --outdir /tmp/<name>-<sha>
```

Then compare with `shasum -a 256 /tmp/<name>-*/*.js`. Different bytes mean redeploy.

**As of Session S's branch** (re-run at your release SHA; later PRs can add rows):

| Worker | Changed by | Must redeploy |
|---|---|---|
| lifecycle (`LifecycleAuthority`) | Session S Part 1 (Supabase key format), Part 5 (owner erase path) | **yes** |
| private sync (`PrivateVault`) | nothing since `d439dc9` | **no**, unless your diff shows a change |
| food lookup (`FoodBudget`) | Session S Parts 3–4 (unknown-barcode cache, per-client share, retention) | **yes** |
| auth admission (`AdmissionAuthority`) | Session S Part 4 (retention sweep) | **yes** |
| market coordinator (`MarketAccount`, `QuoteService`) | Session R1 Part 1, Session S Parts 2, 4 and 8 | **yes, unless** already deployed from the same commit by the Alpha prices rollout (step 4) |
| acceptance app (OpenNext) | Sessions R1, S and P | **yes**, last |

The admin config (`workers/recovery-admin/…`) is **never deployed**.

## 3. Wrangler login
```sh
pnpm --filter @zigoals/web exec wrangler login     # browser sign-in with 2FA. No local agent or helper process may be running
pnpm --filter @zigoals/web exec wrangler whoami    # read only: the right account; never paste this output
```

## 4. Services first, one at a time
For each Worker marked **yes**, in this order: lifecycle, private sync (only if its row says yes), food lookup, auth admission, market coordinator.

1. **Read only, before:**
   ```sh
   pnpm --filter @zigoals/web exec wrangler deployments list --config "$PWD/<private config>"
   pnpm --filter @zigoals/web exec wrangler secret list --config "$PWD/<private config>"   # names only
   ```
   Write down the live version: it is the rollback.
2. **Deploy:**
   ```sh
   pnpm --filter @zigoals/web exec wrangler deploy --config "$PWD/<private config>"
   ```
   Expected: "No targets deployed": these Workers have no routes, and `workers_dev` and `preview_urls` are off.
3. **Read only, after:**
   - `deployments list` shows the new version at 100%;
   - `secret list` shows the **same names** as before;
   - the dashboard shows no route, custom domain, `workers.dev` URL or preview URL.
4. **Secrets:** only if a key changed. Use `wrangler secret put NAME --config "$PWD/<private config>"` and type the value at the prompt, never as an argument.

**Private configs** (ignored, 0600):

| Worker | Private config |
|---|---|
| lifecycle | `workers/private-sync/wrangler.lifecycle.acctest.owner.jsonc` |
| private sync | `workers/private-sync/wrangler.acctest.owner.jsonc` |
| food lookup | `workers/food-lookup/wrangler.acctest.owner.jsonc` |
| auth admission | `workers/auth-abuse/wrangler.acctest.owner.jsonc` |
| market coordinator | `workers/market-coordinator/wrangler.acctest.owner.jsonc` |

**Lifecycle:** keep `RECOVERY_MODE=reconcile` in its private config, and deploy it that way. It changes to `serve` only at the Stage 8 row that switches it, by your explicit decision.

**Market coordinator, skip check:** compare the SHA you noted in step 0.2 with the release SHA.
```sh
git diff --name-only <rollout SHA>..<release SHA> -- workers/market-coordinator/ apps/web/lib/server/ apps/web/lib/market-*.ts
```
- No output means the coordinator is current: **skip it**.
- Any output means compare the dry-run bundles as in step 2, and redeploy if they differ. It serves the public Alpha too, so check prices on `alpha.zigoals.app` afterwards (ALPHA_PRICES_ROLLOUT step 5).

## 5. The app last, hermetic
```sh
pnpm --filter @zigoals/web build:alpha
pnpm --filter @zigoals/web check:alpha-artifact --values-from ~/.config/zigoals/acctest.env   # names only, never values
node scripts/run11/activation-check.mjs --source "$(git rev-parse HEAD)" --dry-run             # read only
pnpm --filter @zigoals/web exec wrangler deployments list --config "$PWD/apps/web/wrangler.run11.acctest.owner.jsonc"  # rollback version
pnpm --filter @zigoals/web exec opennextjs-cloudflare deploy --config "$PWD/apps/web/wrangler.run11.acctest.owner.jsonc"
```
- Use the same app deploy command as at Stage 7. The line above is the documented form; if yours differed, keep yours.
- Then `deployments list` (new version at 100%) and `secret list` (same names).

## 6. Re-attach the hostname
The dashboard's "Add Domain" refused the subdomain at Stage 7 ("No zones match"), so the hostname runs on a DNS record plus a zone route:
1. **Read only:** DNS → the proxied AAAA record `accounts-test` → `100::` still exists. It stayed when the route was removed.
2. **Zone route:** Workers Routes → Add route `accounts-test.zigoals.app/*` → the acceptance app Worker. Exactly this pattern, **never a wildcard host**.
3. **Read only:**
   ```sh
   curl -sSI https://accounts-test.zigoals.app/app | grep -iE '^(HTTP|content-security-policy|strict-transport-security|x-frame-options|cache-control|permissions-policy)'
   ```
   Expected: HTTP 200, a nonce CSP, HSTS, `DENY`, `private, no-store`, the restricted permissions.
4. **After every later app deploy,** check that the route survived. Workers Routes must still list `accounts-test.zigoals.app/*`, and the curl above must still answer 200.

## 7. Recovery rehearsal with the merged tool
From [OWNER_RECOVERY_ADMIN.md](OWNER_RECOVERY_ADMIN.md):
- **Step 4** (export: the remote binding works);
- **Step 6** (dry run, reconcile, already reconciled), on the rehearsal Worker as before;
- **"Erase an account"**, the rehearsal for this day: its steps 1–4 now, step 5 at the Stage 8 serve switch.

Record each in the recovery section of your STAGE8_ACCEPTANCE copy, with the wrangler version and the commit.

**The Supabase key form (Session S Part 1)** is proven by the Stage 8 account-deletion check (STAGE8_ACCEPTANCE F5, with the sign-in identity deleted too): after the lifecycle Worker serves, the fictional Supabase user disappears from Authentication → Users within about a minute. If it stays, the identity deletion is pending: check the lifecycle secret's key format (a `sb_secret_…` or legacy JWT is sent; anything else never is).

## 8. Log out
```sh
pnpm --filter @zigoals/web exec wrangler logout
```
Close the browser profile used for the dashboard. The private env file stays in `~/.config/zigoals/`.

## Rollback
- Per Worker: `pnpm --filter @zigoals/web exec wrangler rollback <version you wrote down> --config "$PWD/<private config>"`.
- **Never** roll back across a Durable Object migration or a data-format change. Session S changes neither: new rows and fields are additive, and older code ignores them.
- The app first, then the services in reverse order.

## To merge into the runsheet after Session P
Session P edits [STAGE8_OWNER_RUNSHEET.md](STAGE8_OWNER_RUNSHEET.md), so these rows wait here until P has merged:

| Proposed row | Where in the runsheet | What |
|---|---|---|
| Final redeploy | before Part 1 | "Do [FINAL_ACCTEST_REDEPLOY.md](FINAL_ACCTEST_REDEPLOY.md) once; every changed Worker, services first, app last" |
| Erase rehearsal | Part 1, after the recovery rehearsal | OWNER_RECOVERY_ADMIN "Erase an account" steps 1–4, then step 5 at the serve switch |
| Supabase key proof | the delete-account row | "The fictional Supabase user disappears within about a minute (Session S Part 1)" |
| Sign out everywhere | Part 2 (sessions) | [OWNER_SIGN_OUT_EVERYWHERE.md](OWNER_SIGN_OUT_EVERYWHERE.md) once with your own test user |
| Market policy window | before Stage 8 | Dry run of `next-market-policy.mjs` around 28 October; switch at or after 2026-10-31 16:00 UTC ([Next policy period](ALPHA_PRICES_ROLLOUT.md#next-policy-period)) |
