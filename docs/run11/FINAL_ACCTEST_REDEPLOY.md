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
0. **The sync-writes switch is on in the release SHA.** Session W Part 1 (2026-10-06) switched `SYNC_WRITES` on in the
   Session W PR, by owner decision W1 (it overrides SYNC_WRITES_ON.md's "from 2026-10-12" wait). Check that the release
   SHA contains it: `grep -n "SYNC_WRITES: boolean = true" apps/web/lib/vault/sync-writes.ts` prints one line. If the
   Session W PR is not merged, the switch commit can be merged alone (it is self-contained); if neither is in the release
   SHA, deploy anyway and mark Stage 8 rows 15 and 15c and the Session W sync rows "not run: switch off".
1. **The release SHA:** the full SHA of `main` that you deploy. Main's CI is green on it.
2. **The Alpha prices rollout is done:** [ALPHA_PRICES_ROLLOUT.md](ALPHA_PRICES_ROLLOUT.md). Note the SHA the market coordinator was deployed from there.
3. **The market policy window:** the private `MARKET_POLICY` uses an exact window that ends **2026-10-31 16:00 UTC**. Around **28 October** install the two-window policy (the current window and the next), and the coordinator takes the next period by itself at the boundary ([ALPHA_PRICES_ROLLOUT.md, Next policy period](ALPHA_PRICES_ROLLOUT.md#next-policy-period); Session U follow-up F2). If this redeploy runs after that, keep the two-window policy in the private coordinator config.

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
         "private-sync:workers/private-sync/worker.mjs workers/private-sync/sessions.mjs workers/private-sync/rotation.mjs workers/private-sync/portfolio.mjs" \
         "push-reminders:workers/push-reminders/" \
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

## Session U changes (PR #74, 2026-10-05)
Session U changed four Workers and the local admin tool. Re-run step 2 at your release SHA; this is what to expect.

| Worker | What changed (commits) | Must redeploy |
|---|---|---|
| private sync (`PrivateVault`, new `PrivateVaultRecoveryAdmin` entrypoint) | revoked sessions deleted 90 days after revocation, swept by the vault's alarm (`8ace5b0`); the owner-only erase entrypoint (`9e60016`); the opt-in Portfolio copy, `/v1/portfolio`, its own keyspace (Part 9, ADR-013) | **yes** |
| market coordinator (`MarketAccount`, `QuoteService`) | `QuoteService /status` names when the policy period ends (`4b88a67`); the optional public share of the daily rows (`8b8059d`); the public daily cap on new price work (`43a05ca`) | **yes** (it serves the public Alpha too: check prices there afterwards) |
| push reminders | only the four cited vendor hosts, never an explicit port or an IP address (`9ef5abd`) | **yes, if you activated it** (PUSH_ACTIVATION.md) |
| lifecycle, food lookup, auth admission | nothing by Session U | only if your diff shows a change |
| acceptance app (OpenNext) | Parts 2–9 | **yes**, last |
| recovery admin (local, never deployed) | a second remote binding, to private sync, for "erase" (`9e60016`) | **regenerate the local copy** after private sync is deployed |

**Order:** lifecycle (if changed), **private sync**, food lookup and auth admission (if changed), **market coordinator**,
**push reminders** (if active), then **regenerate the admin copy** (`node scripts/run11/make-private-configs.mjs`, as in
OWNER_RECOVERY_ADMIN.md, then `node scripts/run11/activation-check.mjs --admin`: PASS with the two-binding shape), and
**the app last** (step 5).

**Checks after:**
- private sync: `deployments list` at 100% and the same secret names; there is nothing to curl (no routes). Stage 8 rows
  6c, 13c, 13d, 15 and 15c exercise it.
- market coordinator: `node scripts/verify-hosted-alpha.mjs` prints the policy window end and BTC/USD on the public Alpha.
- the app on `accounts-test.zigoals.app` (step 6's curl): also `cross-origin-opener-policy: same-origin`, and on
  `/app/health` a `permissions-policy` with `camera=(self)`.
- the recovery rehearsal (step 7): "Erase an account" now also prints `Encrypted vault rows: REMOVED` at its serve step (`NOT REMOVED YET` before the serve switch).

**The sync-writes switch (Session U follow-up F1):** PR #74 ships `SYNC_WRITES = false`, so it can go to
`alpha.zigoals.app` any time after the coordinator redeploy: it writes exactly what #28 writes and adds the Health v3
read support. The switch turns on in its own one-line PR before this redeploy (step 0 above;
docs/product/SYNC_WRITES_ON.md). From the Alpha deploy that carries the switch on, the Alpha's rollback floor is the
build that first carried v3 read support (PR #74's deploy).

**The acceptance app skips R1:** it goes from its Stage 7 build straight to this one, which (with the switch-ON PR merged)
writes the newer sections (settings v2, Health v2 and v3). After the app's redeploy, reload every open tab and reopen the Home Screen app on each
test device before syncing. A tab still on the Stage 7 build cannot read the newer sections: its sync stops with an
error instead of applying them, until it is reloaded.

**Rollback, Session U specifics** (in addition to the rules below):
- **App back to a build before Session U** (the acceptance app's Stage 7 version, or #28 on the public Alpha):
  remembered devices ask for the recovery secret once, because older builds delete the new v2 remembered-device records
  (fail-closed; ADR-008 addendum). A Health section that reached v3 is unreadable there until the roll-forward; its bytes
  and recovery copies are kept, and the four device keys keep working on the older build. Never roll back below R1 (#27).
- **Private sync back:** the Portfolio copy stays in its keyspace, unread and untouched (older code never lists it); the
  account erase still removes it (it removes every key). Revoked-session records simply stop being swept.
- **Market coordinator back:** the partition and the public cap disappear; `/status` answers "not reported" to newer apps.

## Session V changes (PR #76, 2026-10-06)
Session V changed **only the app** for this stack; re-run step 2 at your release SHA to confirm.

| Worker | What changed | Must redeploy |
|---|---|---|
| acceptance app (OpenNext) | ZIGi v2 (ADR-014): Trusted Types **enforced** in the production build (`require-trusted-types-for 'script'; trusted-types default`); ZIGi's device keys (`zigoals:ai-options:v1`, `ai-usage`, `ai-memory`, `ai-actions`, `zigi`, `zigi-reminders`, `zigi-knock`); chat records v2 (only with V fields; older builds skip them); push reminder names opt-in (IndexedDB `zigoals-push-labels-v1`, read-only in the service worker) | **yes**, last |
| ZIGi relay (`workers/zigi-relay`, new) | ZIGoals hosted, off by default | **no**: not part of this stack; it is activated only by ZIGI_RELAY_ACTIVATION.md, never by this redeploy |
| private sync, lifecycle, market coordinator, push, food lookup, auth admission | nothing by Session V | no |

**Checks after:** step 6's curl of `/app` shows `require-trusted-types-for 'script'` and `trusted-types default` in the
`content-security-policy`; open ZIGi on a phone and on a computer (Stage 8 has no ZIGi row; the owner test v2,
docs/product/YOUR_AI_OWNER_TEST.md Part V, covers it).

## Session W changes (Session W PR, 2026-10-06/…)
Filled in part by part as Session W lands. Re-run step 2 at your release SHA; this is what to expect.

| Worker | What changed | Must redeploy |
|---|---|---|
| acceptance app (OpenNext) | the sync-writes switch on (Part 1): Session P's four records live in Health v2/v3 and settings v2, and the opt-in Portfolio sync appears | **yes**, last |
| acceptance app (OpenNext) | Part 1b–1e: Health v4 / settings v3 read and written lazily (finance v5 read only), `X-ZIGoals-Build` on every app answer, one CSP composer (byte-identical headers), dependency fixes | same deploy |
| acceptance app (OpenNext) | Part 17, timezone phase 4: a chosen journal zone is written to settings v2 (`journalTimeZone`) and a plan zone to finance v4 (`timeZone`); both are read by #29 and later. An instalment is "due today" until its day ends in the plan's zone | same deploy |
| acceptance app (OpenNext) | Part 2, Your pages & buttons: hiding a page or button, or choosing a start page, writes settings v3 `pages` (stamped choices; the newer one wins between devices); the device keeps a display mirror (`zigoals:pages-view:v1`, never synced) | same deploy |
| acceptance app (OpenNext) | Part 4, Sleep (a view of Health, `/app/health?view=sleep`): a night, a nap, the goal, "I'm going to bed" or the welcome's sleep goal writes Health v4 `sleep`; a habit linked to time asleep or a bedtime writes Health v4 `habitLinks`; a Today Sleep widget writes settings v3. The wind-down time stays on the device. Also the Part 1 fix (`3879b65`): no blank page when a remembered device reopens while Settings verifies the session | same deploy |
| acceptance app (OpenNext) | Part 5, Meditation (a view of Health, `/app/health?view=meditation`): a saved session, mindful minutes, the weekly goal or the bell writes Health v4 `meditation`; a habit linked to mindful minutes writes Health v4 `habitLinks`; a Today Meditation widget writes settings v3. The running session and the reminder time stay on the device. Bells are made in the browser (no new origin) | same deploy |
| acceptance app (OpenNext) | Part 6, focus sounds (Meditation → Focus sounds; a Stop pill on other pages while one plays): made in the browser, nothing synced, nothing fetched; choices in the device key `zigoals:music:v1` | same deploy |

**What syncs now that did not before:** with the switch on, fasting sessions (Health v2), health goals, habit-health links
with their automatic check-in markers and the weekly review's Health note (Health v3, under the Health consent), and the
weekly review (settings v2). Session W adds the pages choice (settings v3), sleep and meditation (Health v4, under the Health consent). "Also sync my Portfolio (optional)" appears under account sync, unticked.

**Rollback, Session W specifics:**
- The Alpha's rollback floor is **#29** (the first build that reads Health v3): never roll back past it.
- A person who used Your pages & buttons has settings v3: on #29–#31 their Today layout and preferences read as unreadable (bytes and recovery copies kept, every page shown) until the roll-forward reads them again.
- A person who logged sleep or meditation (or linked a habit to either) has Health v4: on #29–#31 their whole Health page reads as unreadable (bytes and recovery copies kept) until the roll-forward reads it again. A Today Sleep or Meditation widget raises settings v3, as above.

## Rollback
- Per Worker: `pnpm --filter @zigoals/web exec wrangler rollback <version you wrote down> --config "$PWD/<private config>"`.
- **Never** roll back across a Durable Object migration or a data-format change. Session S changes neither: new rows and fields are additive, and older code ignores them.
- The app first, then the services in reverse order.

## Merged into the runsheet (Session U, 2026-10-05)
Session P has merged, so these rows are now in [STAGE8_OWNER_RUNSHEET.md](STAGE8_OWNER_RUNSHEET.md): the final redeploy and the market policy window under "Before you start", the erase rehearsal as row 1b, sign out everywhere as row 6b, and the Supabase key proof on row 16. The table stays as the record of what was proposed:

| Proposed row | Where in the runsheet | What |
|---|---|---|
| Final redeploy | before Part 1 | "Do [FINAL_ACCTEST_REDEPLOY.md](FINAL_ACCTEST_REDEPLOY.md) once; every changed Worker, services first, app last" |
| Erase rehearsal | Part 1, after the recovery rehearsal | OWNER_RECOVERY_ADMIN "Erase an account" steps 1–4, then step 5 at the serve switch |
| Supabase key proof | the delete-account row | "The fictional Supabase user disappears within about a minute (Session S Part 1)" |
| Sign out everywhere | Part 2 (sessions) | [OWNER_SIGN_OUT_EVERYWHERE.md](OWNER_SIGN_OUT_EVERYWHERE.md) once with your own test user |
| Market policy window | before Stage 8 | Around 28 October, install the two-window policy with `next-market-policy.mjs`; the coordinator takes the next period by itself at 2026-10-31 16:00 UTC ([Next policy period](ALPHA_PRICES_ROLLOUT.md#next-policy-period)) |
