# Friends Alpha: your weekend checklist

Rewritten 18 Nov 2026 (Session AT, ADR-043) from the code on `main` (`3d510124`, PR #106 merged) and Session AT's
[PR #107](https://github.com/reyals1111-ux/ZIGoals/pull/107); step 1 checked again 20 Nov 2026 (Session AV, ADR-045) against
[PR #108](https://github.com/reyals1111-ux/ZIGoals/pull/108), and on 21 Nov after owner follow-up 1: its 49 features add no
step for you (no new service, host, key, secret or workflow; every new record is device-only). One ordered list: tick each box as you go. Every step says how
long it takes, where you do it, the command or click path, and how you know it is done. The linked runbook has the
details. **No secrets or real values belong in this file, a PR, a chat or a screenshot.** Agents never merge, dispatch or
deploy for you (CLAUDE.md).

**Hard deadline:** step 6 (the market price policy) must be done **before Monday 30 Nov 2026, 16:00 UTC** (17:00 in
Brussels). After that moment, without the next window installed, every live price reads "unavailable".

**Total:** about 4 hours for steps 1–9 and 11–13 (one weekend), plus Stage 8 (step 10, about 5½ hours, can be split over
days). Optional steps are marked; skip them freely.

**Off until you switch it on:** notifications (both kinds), the weather proxy, ZIGoals AI · powered by Claude. Accounts
and sync open only after Stage 8.

All commands run from the repository root of a clean checkout of the release SHA (`git worktree add ../zigoals-release
<SHA>` keeps your working tree out of it), on Node 24.19.0 and pnpm 11.19.0 (`pnpm run doctor`).

---

### ☐ 1. The release you will invite friends to · 10 min (+ about 45 min of workflow) · GitHub
- **If you merge Sessions AU + AV ([PR #108](https://github.com/reyals1111-ux/ZIGoals/pull/108)) first** (checked
  20 Nov by Session AV against its final code): merge with a merge commit, wait for "Milestone quality" on `main` to be
  green, then Actions → **Manual Alpha deployment** → Run workflow on `main`, `expected_commit` = the new `main` SHA, tick
  `owner_approval`, read the summary, approve `alpha`. Runbook: [MANUAL_ALPHA_WORKFLOW.md](../deployment/MANUAL_ALPHA_WORKFLOW.md),
  "Every deployment". A friend who still has #57 open gets "A new version of ZIGoals is ready · Reload" and never a crash
  (Session AV Part 2).
- **If not:** the newest Alpha (#57, from `836534c3`, Session AT) is the release.
- **Done when:** Settings on https://alpha.zigoals.app shows the release SHA as its build (as the workflow summary says). Send the new version id
  and the rollback id to the next session (docs/STATUS.md records them; frozen readers gain the release).
- Copy the release's full 40-character SHA: it is `<SHA>` below.

### ☐ 2. The hosted verifier on that release · 15 min · your machine
```bash
EXPECTED_COMMIT=<SHA> node scripts/verify-hosted-alpha.mjs ../verifier-$(date +%Y%m%d-%H%M)
```
- The directory must not exist yet; it receives the evidence. `node scripts/verify-hosted-alpha.mjs --help` lists the stages.
- **Done when:** it prints `"status":"PASS"` (exit 0). Notifications, the weather proxy and the food binding read "off"
  while they are off, which is never a failure. Read the line "Market policy period ends …": it should name
  2026-11-30T16:00:00Z now, and after step 6 also the next window.

### ☐ 3. Landing redeploy (privacy page, and the new NOVA section if you approve it) · 20 min · your machine (wrangler)
1. **Look first (local, nothing deployed):**
   ```bash
   pnpm --filter @zigoals/web exec wrangler dev --config ../../landing/wrangler.jsonc --name zigoals --port 8788 --ip 127.0.0.1 --persist-to .wrangler/landing-state
   ```
   Open http://127.0.0.1:8788/ and http://127.0.0.1:8788/privacy. The refreshed section from Session AT is drafted for
   your review (docs/STATUS.md, Session AT, "landing preview"); if you do not want it, deploy from a commit without it.
2. **Read only, then deploy** (from the clean checkout):
   ```bash
   pnpm --filter @zigoals/web exec wrangler whoami
   ```
   ```bash
   pnpm --filter @zigoals/web exec wrangler deployments list --config ../../landing/wrangler.jsonc --name zigoals
   ```
   Write down the live version (the rollback), then:
   ```bash
   pnpm --filter @zigoals/web exec wrangler deploy --config ../../landing/wrangler.jsonc --name zigoals --strict
   ```
- **Done when:** `/`, `/privacy` and `/terms` answer 200 with the full header set, and `/privacy` names MET Norway
  (`curl -sSI https://zigoals.app/privacy`). Runbook: [LANDING.md](../deployment/LANDING.md), "Owner-only deployment".

### ☐ 4. Private-sync redeploy (NOVA's section syncs) · 20 min · your machine (wrangler), Cloudflare dashboard read only
- Needed once since PR #101: `workers/private-sync/extras.mjs` carries the optional `nova` section. Doing the Worker before
  accounts open means the first sync carries NOVA; the order with the app is safe either way (ADR-038).
1. `STEP_UP_REQUIRED` check (offline):
   ```bash
   node scripts/run11/activation-check.mjs --private
   ```
   PASS, or follow its message (`--add-missing-template-vars`; the value must be `"on"`).
2. Rollback first, then deploy:
   ```bash
   pnpm --filter @zigoals/web exec wrangler deployments list --config "$PWD/workers/private-sync/wrangler.acctest.owner.jsonc"
   ```
   ```bash
   pnpm --filter @zigoals/web exec wrangler deploy --config "$PWD/workers/private-sync/wrangler.acctest.owner.jsonc"
   ```
- **Done when:** "No targets deployed"; `deployments list` shows the new version at 100%; `secret list` shows the same
  names as before; the dashboard shows no route, `workers.dev` URL or preview URL.
  Runbook: [FINAL_ACCTEST_REDEPLOY.md](../run11/FINAL_ACCTEST_REDEPLOY.md), step 4.

### ☐ 5. Reown (WalletConnect) allowed domains · 5 min (+ up to 15 min to apply) · dashboard.reown.com
- Reown dashboard → your project → **Configuration** → "Domain" → **+ Domain** → `alpha.zigoals.app` → **Allowlist**.
  Add the acceptance app's hostname too if friends will use it. An empty list allows every origin, so this narrows it.
- **Done when:** the list shows the domain(s), and a WalletConnect pairing from alpha.zigoals.app on your phone still
  opens your wallet (pair only; sign nothing). Reference: `docs/research/session-ak/WALLETS.md` ("Allowlist").

### ☐ 6. Market price policy: install the next window · 30 min · your machine (ops checkout), CoinGecko dashboard · **before 30 Nov 16:00 UTC**
- Window 2 ends 2026-11-30 16:00 UTC. Read your next reset on the CoinGecko dashboard (UTC), then:
1. Dry run (writes nothing; prints both windows):
   ```bash
   node scripts/run11/next-market-policy.mjs --owner-file <name>.market-policy.owner.json --current-policy <installed>.market-policy.private.json --window-end <next reset, e.g. 2026-12-30T16:00:00Z> --credits-used 0 --daily-row-budget 100000
   ```
2. The same command with `--write --out <name>.market-policy.private.json`.
3. ```bash
   node scripts/run11/make-private-configs.mjs --set-market-policy <name>.market-policy.private.json
   ```
4. `wrangler login`, then `deployments list` on the coordinator (your rollback), then deploy it:
   ```bash
   pnpm --filter @zigoals/web exec wrangler deploy --config "$PWD/workers/market-coordinator/wrangler.acctest.owner.jsonc"
   ```
5. Run step 2's verifier again; then `wrangler logout`.
- **Done when:** the verifier prints "Market policy period ends 2026-11-30T16:00:00.000Z; the next period is installed and
  takes over by itself, ending <your end>". Runbook: [ALPHA_PRICES_ROLLOUT.md](../run11/ALPHA_PRICES_ROLLOUT.md), "Next policy period".

### ☐ 7. DMARC from `none` to `quarantine` · 15 min (+ a week of reading reports first if you have not) · Cloudflare DNS, your mail
- Today `_dmarc.zigoals.app` says `p=none` (Session M5's public DNS read). Before you tighten it, check every sender of
  `@zigoals.app` mail passes SPF and DKIM: the sign-in code mail (Resend, acceptance stack) and `hello@` replies. Send
  yourself one of each and read the headers (`dmarc=pass`).
```bash
dig +short TXT _dmarc.zigoals.app
```
- Cloudflare → zigoals.app → DNS → the `_dmarc` TXT record → change only `p=none` to `p=quarantine` (keep every other tag
  as it is; `pct=` lets you start at a share if you prefer).
- **Done when:** the `dig` above shows `p=quarantine`, and one fresh sign-in code mail and one `hello@` reply still arrive
  in the inbox (not spam).

### ☐ 8. `www.zigoals.app` → `zigoals.app` · 10 min · Cloudflare dashboard
- Rules → Redirect Rules → Create rule `www to apex`: wildcard `https://www.zigoals.app/*` → `https://zigoals.app/${1}`,
  301, keep the query string. If asked for a proxied DNS record, accept `AAAA www 100::` (orange cloud), nothing else.
```bash
curl -sSI https://www.zigoals.app/
```
- **Done when:** `301` with `location: https://zigoals.app/`. Runbook: [LANDING.md](../deployment/LANDING.md), "`www.zigoals.app` → `zigoals.app`".

### ☐ 9. Optional switches · each on its own day if you like
- **9a. Notifications on the public Alpha** · about 20 min, a phone, one commit and one Alpha deploy. Keys offline, the
  Worker's private config, deploy the Worker and its secret, the app's runtime secret, then one commit
  (`pushDeviceEnabled: true` plus the public key in `apps/web/config/public-integrations.json`), step 1's deploy, kill
  switch off. **Done when:** "Send a test notification" arrives within a minute and the verifier's push stage reports the
  key. Runbook: [PUSH_PUBLIC_ALPHA.md](../run11/PUSH_PUBLIC_ALPHA.md).
- **9b. Reminders through an account** (acceptance stack only) · about 45 min, during step 10. Runbook:
  [PUSH_ACTIVATION.md](../run11/PUSH_ACTIVATION.md). **Done when:** Stage 8 row 15b passes.
- **9c. The weather proxy** · 25–35 min plus a rebuild · your zone's custom domain (not `workers.dev`). Private copy, dry
  run, deploy, the curl checks, then build the app with
  `NEXT_PUBLIC_WEATHER_PROXY_URL=https://weather.<your zone>/v1/forecast` (exactly that shape). **Done when:** the second
  nearby call says `x-weather-cache: hit`, another origin gets 403, the 61st call a minute gets 429.
  Runbook: [WEATHER_PROXY_ACTIVATION.md](../run11/WEATHER_PROXY_ACTIVATION.md). Off switch: remove the custom domain.
- **9e. The food Worker's "never early" fix** (Session AV, `workers/food-lookup/worker.mjs`) · reaches the food Worker at
  its next owner redeploy, together with any other food-Worker change; not needed for Alpha #58. A provider request now
  leaves no sooner than 2 s (FSVO), 4 s (FDC) or the barcode spacing after the previous one actually left.
- **9d. ZIGoals AI · powered by Claude** (acceptance stack, your own account first). Runbook:
  [ZIGI_RELAY_ACTIVATION.md](../run11/ZIGI_RELAY_ACTIVATION.md).

### ☐ 10. The acceptance redeploy and Stage 8 · about 5½ hours, over several days · desktop, iPhone, two inboxes, Cloudflare, Supabase, Resend, CoinGecko
1. The acceptance redeploy: services first, then the app, then the hostname check
   ([FINAL_ACCTEST_REDEPLOY.md](../run11/FINAL_ACCTEST_REDEPLOY.md)); the app last, hermetic:
   ```bash
   pnpm --filter @zigoals/web build:alpha
   ```
   (`build:alpha` refuses while any `.env*` other than `.env.example` is in the checkout; keep private env files outside it.)
2. Owner hardening H1–H16, if not done yet.
3. The run sheet, Parts 1–8 ([STAGE8_OWNER_RUNSHEET.md](../run11/STAGE8_OWNER_RUNSHEET.md)), Part 4b included.
4. The tickable [FRIENDS_ALPHA_CHECKLIST.md](../run11/FRIENDS_ALPHA_CHECKLIST.md).
- **Done when:** every row of your private STAGE8_ACCEPTANCE copy is pass, PROVEN-LOCAL with its CI run, or "not run" with
  its reason. Commit a sanitized summary only.

### ☐ 11. Quotas, spend and the stop rule · 25 min · Cloudflare, Supabase, Resend, CoinGecko dashboards; your private notes
- Usage against the free tiers; no paid upgrade or automatic reload on (run sheet rows 22–23).
- Write the stop rule privately before the first invite: pause invites when any service passes about half a free daily
  allowance, "Sign-in codes are paused for today" appears, two friends report the same breakage, or any security report
  reaches hello@zigoals.app. Then: no more invites; each switch's own off switch; an Alpha rollback through
  [MANUAL_ALPHA_WORKFLOW.md](../deployment/MANUAL_ALPHA_WORKFLOW.md) (no automatic rollback, by design).
- **Done when:** the rule and the friend count are in your private notes (FRIENDS_ALPHA_CHECKLIST.md, last line).

### ☐ 12. Adding friends · 5 min per friend · Supabase (only once Stage 8 has passed and you open accounts)
- The public Alpha needs nothing: it works on each friend's own device with no account.
- **Accounts:** a sign-in code goes only to an address that already exists as a user (the app asks Supabase with
  `create_user: false`, `apps/web/lib/server/private-account.ts`). Supabase → the project → Authentication → Users →
  **Add user** → the friend's address. **This click path is not verified by any runbook yet (UNVERIFIED):** check with
  your own second address first that a code arrives. Keep the invite list in Bitwarden, never in the repository.
- **Done when:** your test address receives a code and signs in; then each friend's.

### ☐ 13. What to send each friend · 10 min · your mail
- The link **https://alpha.zigoals.app/app** and [FRIENDS_GUIDE.md](FRIENDS_GUIDE.md) (as text or a PDF). Remove its
  `<!-- … -->` comment lines first; keep the NOVA weather line only if 9c is on.
- A message you can copy (change the name):
  > Hi <name>, here is the ZIGoals Alpha I mentioned: https://alpha.zigoals.app/app. Everything stays on your own device
  > unless you choose otherwise; there is no account to make. On an iPhone, open it in Safari and Add to Home Screen first.
  > The attached guide has two minutes of reading: the one thing to keep safe, what's new, and what it can't do yet.
  > Settings → Send feedback writes me a mail with the details I need (nothing is sent until you press Send).
  > Please put no real money into anything: it is an unaudited test.
- **Done when:** each friend has the link and the guide.

## Lane 2 (feature/session-av-2, after PR #108): one deploy step for you
- Deploy the private-sync Worker from `main` once lane 2 merges (`workers/private-sync`; `extras.mjs` now takes the
  journal, money records and workouts sections, workouts with Health's deletion rule). Until then a journal, money
  records or workout log chosen under Settings → Account & sync → Also sync my extras waits on each device with
  "… sync once the sync service is updated." Nothing else changes for devices that chose none.
