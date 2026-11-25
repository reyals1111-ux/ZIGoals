# Friends Alpha: your checklist

Rewritten 25 Nov 2026 (Session AW, ADR-046 Part 7) as one ordered list from the code on PR #110's head: deploy #60, the
sync service, the verifier, the landing, the food Worker, Reown, the optional switches, the acceptance redeploy and Stage 8,
hardening, then friends. Tick each box as you go. Every step says how long it takes, where you do it, the command or
click path, and how you know it is done; the linked runbook has the details. **No secrets or real values belong in this
file, a PR, a chat or a screenshot.** Agents never merge, dispatch or deploy for you (CLAUDE.md), except the one dispatch
of option 3 (docs/deployment/AGENT_DISPATCH.md) after your own `deploy <SHA>` message.

**Hard deadline, a separate task:** the market price policy (the dated task at the end) must be done **before Monday 30 Nov 2026, 16:00 UTC** (17:00 in
Brussels). After that moment, without the next window installed, every live price reads "unavailable".

**Total:** about 4 hours for steps 1–7 and 9–11 (one weekend), plus Stage 8 (step 8, about 5½ hours, can be split over
days), plus the dated market task. Optional steps are marked; skip them freely.

**Off until you switch it on:** notifications (both kinds), the weather proxy, ZIGoals AI · powered by Claude. Accounts
and sync open only after Stage 8.

All commands run from the repository root of a clean checkout of the release SHA (`git worktree add ../zigoals-release
<SHA>` keeps your working tree out of it), on Node 24.19.0 and pnpm 11.19.0 (`pnpm run doctor`).

---

### ☐ 1. Alpha #60: merge PR #110 and deploy it · 10 min (+ about 45 min of workflow) · GitHub
- Merge [PR #110](https://github.com/reyals1111-ux/ZIGoals/pull/110) ("Session AW — Finish line") with a merge commit
  once its description says **Safe to merge now: yes**. Wait for "Milestone quality" on `main` to be green, then
  Actions → **Manual Alpha deployment** → Run workflow on `main`, `expected_commit` = the new `main` SHA, tick
  `owner_approval`, read the summary, approve `alpha`. Runbook: [MANUAL_ALPHA_WORKFLOW.md](../deployment/MANUAL_ALPHA_WORKFLOW.md),
  "Every deployment". (Option 3 in docs/deployment/AGENT_DISPATCH.md: you may instead type `deploy <40-character SHA>` in
  a session's chat and the agent dispatches it once; you still approve `alpha`.)
- Session AW adds no service, host, key, secret or workflow for you: every new record is device-only or rides an existing
  sync section (an activity's extras with Health, a goal's repeat with the goals), and no Worker changed.
- A friend who still has #59 open gets "A new version of ZIGoals is ready · Reload" and never a crash; #59's records
  read in #60 (frozen readers #37–#59).
- **Done when:** Settings on https://alpha.zigoals.app shows the release SHA as its build. Send the version id and the
  rollback id to the next session (docs/STATUS.md records them).
- Copy the release's full 40-character SHA: it is `<SHA>` below.

### ☐ 2. Private-sync redeploy (lane 2's extras sections and NOVA's) · 20 min · your machine (wrangler), Cloudflare dashboard read only
- Needed once, if you have not deployed it since Session AV lane 2 merged (PR #108): `workers/private-sync/extras.mjs`
  takes the journal, money records and workouts sections (workouts with Health's deletion rule) and NOVA's. Until then a
  device that chose one of them under Settings → Account & sync → Also sync my extras waits with "… sync once the sync
  service is updated." Session AW changed nothing here; the order with the app is safe either way (ADR-038).
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

### ☐ 3. The hosted verifier on #60 · 15 min · your machine
```bash
EXPECTED_COMMIT=<SHA> node scripts/verify-hosted-alpha.mjs ../verifier-$(date +%Y%m%d-%H%M)
```
- The directory must not exist yet; it receives the evidence. `node scripts/verify-hosted-alpha.mjs --help` lists the stages.
- **Done when:** it prints `"status":"PASS"` (exit 0). Notifications, the weather proxy and the food binding read "off"
  while they are off, which is never a failure. Read the line "Market policy period ends …": it should name
  2026-11-30T16:00:00Z now, and after the dated market task also the next window.

### ☐ 4. Landing redeploy (the privacy page, 25 Nov) · 20 min · your machine (wrangler)
- Session AW changed `landing/privacy.html` only, to match what the app sends (docs/review/session-aw/PRIVACY_AUDIT.md):
  Read aloud (voices on your device only), Spotify, chess usernames, Earn and Ecosystem sources and Polkachu, transcription
  by your provider, every AI provider named, notification fields, recipe files and Markdown notes in imports, the food
  lookup heading, the sign-in service when accounts open, and the date. `index.html` and `terms.html` are unchanged.
1. **Look first (local, nothing deployed):**
   ```bash
   pnpm --filter @zigoals/web exec wrangler dev --config ../../landing/wrangler.jsonc --name zigoals --port 8788 --ip 127.0.0.1 --persist-to .wrangler/landing-state
   ```
   Open http://127.0.0.1:8788/ and http://127.0.0.1:8788/privacy. Read the privacy page through once.
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
- **Done when:** `/`, `/privacy` and `/terms` answer 200 with the full header set, and `/privacy` says "Last updated 25 November 2026" and names Read aloud
  (`curl -sSI https://zigoals.app/privacy`). Runbook: [LANDING.md](../deployment/LANDING.md), "Owner-only deployment".

### ☐ 5. The food Worker · 20 min · your machine (wrangler)
- Deploy `workers/food-lookup` before (or with) the Alpha: the Alpha's `FOOD_LOOKUP` binding names it (`node
  scripts/check-deployment-configs.mjs` prints the order). It carries Session AV's "never early" fix: a provider request
  leaves no sooner than 2 s (FSVO), 4 s (FDC) or the barcode spacing after the previous one actually left. Runbook:
  [FOOD_WORKER_PUBLIC_ALPHA.md](../run11/FOOD_WORKER_PUBLIC_ALPHA.md).
- Once barcode lookup answers on alpha.zigoals.app, the landing's Food card line "Barcode lookup. Being switched on." can
  say it is on (a landing change for a later session; scripts/landing-ak-claims.test.mjs pins today's words).
- **Done when:** a barcode scan in Health → Diary on the Alpha finds a product, and the verifier's food stage reads "on".

### ☐ 6. Reown (WalletConnect) allowed domains · 5 min (+ up to 15 min to apply) · dashboard.reown.com
- Reown dashboard → your project → **Configuration** → "Domain" → **+ Domain** → `alpha.zigoals.app` → **Allowlist**.
  Add the acceptance app's hostname too if friends will use it. An empty list allows every origin, so this narrows it.
- **Done when:** the list shows the domain(s), and a WalletConnect pairing from alpha.zigoals.app on your phone still
  opens your wallet (pair only; sign nothing). Reference: `docs/research/session-ak/WALLETS.md` ("Allowlist").

### ☐ 7. Optional switches · each on its own day if you like
- **7a. Notifications on the public Alpha** · about 20 min, a phone, one commit and one Alpha deploy. Keys offline, the
  Worker's private config, deploy the Worker and its secret, the app's runtime secret, then one commit
  (`pushDeviceEnabled: true` plus the public key in `apps/web/config/public-integrations.json`), step 1's deploy, kill
  switch off. **Done when:** "Send a test notification" arrives within a minute and the verifier's push stage reports the
  key. Runbook: [PUSH_PUBLIC_ALPHA.md](../run11/PUSH_PUBLIC_ALPHA.md).
- **7b. Reminders through an account** (acceptance stack only) · about 45 min, during step 8. Runbook:
  [PUSH_ACTIVATION.md](../run11/PUSH_ACTIVATION.md). **Done when:** Stage 8 row 15b passes.
- **7c. The weather proxy** · 25–35 min plus a rebuild · your zone's custom domain (not `workers.dev`). Private copy, dry
  run, deploy, the curl checks, then build the app with
  `NEXT_PUBLIC_WEATHER_PROXY_URL=https://weather.<your zone>/v1/forecast` (exactly that shape). **Done when:** the second
  nearby call says `x-weather-cache: hit`, another origin gets 403, the 61st call a minute gets 429.
  Runbook: [WEATHER_PROXY_ACTIVATION.md](../run11/WEATHER_PROXY_ACTIVATION.md). Off switch: remove the custom domain.
- **7d. ZIGoals AI · powered by Claude** (acceptance stack, your own account first). Runbook:
  [ZIGI_RELAY_ACTIVATION.md](../run11/ZIGI_RELAY_ACTIVATION.md).

### ☐ 8. The acceptance redeploy and Stage 8 · about 5½ hours, over several days · desktop, iPhone, two inboxes, Cloudflare, Supabase, Resend, CoinGecko
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

### ☐ 9. Hardening: DMARC, www and the stop rule · about 50 min · Cloudflare DNS and dashboard, your mail, your private notes
**DMARC from `none` to `quarantine`** (15 min, after a week of reading reports if you have not):
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

**`www.zigoals.app` → `zigoals.app`** (10 min):
- Rules → Redirect Rules → Create rule `www to apex`: wildcard `https://www.zigoals.app/*` → `https://zigoals.app/${1}`,
  301, keep the query string. If asked for a proxied DNS record, accept `AAAA www 100::` (orange cloud), nothing else.
```bash
curl -sSI https://www.zigoals.app/
```
- **Done when:** `301` with `location: https://zigoals.app/`. Runbook: [LANDING.md](../deployment/LANDING.md), "`www.zigoals.app` → `zigoals.app`".

**Quotas, spend and the stop rule** (25 min):
- Usage against the free tiers; no paid upgrade or automatic reload on (run sheet rows 22–23).
- Write the stop rule privately before the first invite: pause invites when any service passes about half a free daily
  allowance, "Sign-in codes are paused for today" appears, two friends report the same breakage, or any security report
  reaches hello@zigoals.app. Then: no more invites; each switch's own off switch; an Alpha rollback through
  [MANUAL_ALPHA_WORKFLOW.md](../deployment/MANUAL_ALPHA_WORKFLOW.md) (no automatic rollback, by design).
- **Done when:** the rule and the friend count are in your private notes (FRIENDS_ALPHA_CHECKLIST.md, last line).

### ☐ 10. Adding friends · 5 min per friend · Supabase (only once Stage 8 has passed and you open accounts)
- The public Alpha needs nothing: it works on each friend's own device with no account.
- **Accounts:** a sign-in code goes only to an address that already exists as a user (the app asks Supabase with
  `create_user: false`, `apps/web/lib/server/private-account.ts`). Supabase → the project → Authentication → Users →
  **Add user** → the friend's address. **This click path is not verified by any runbook yet (UNVERIFIED):** check with
  your own second address first that a code arrives. Keep the invite list in Bitwarden, never in the repository.
- **Done when:** your test address receives a code and signs in; then each friend's.

### ☐ 11. What friends receive · 10 min · your mail
- The link **https://alpha.zigoals.app/app** and [FRIENDS_GUIDE.md](FRIENDS_GUIDE.md) (as text or a PDF). Remove its
  `<!-- … -->` comment lines first; keep the NOVA weather line only if 9c is on.
- A message you can copy (change the name):
  > Hi <name>, here is the ZIGoals Alpha I mentioned: https://alpha.zigoals.app/app. Everything stays on your own device
  > unless you choose otherwise; there is no account to make. On an iPhone, open it in Safari and Add to Home Screen first.
  > The attached guide has two minutes of reading: the one thing to keep safe, what's new, and what it can't do yet.
  > Settings → Send feedback writes me a mail with the details I need (nothing is sent until you press Send).
  > Please put no real money into anything: it is an unaudited test.
- **Done when:** each friend has the link and the guide.
- **What a friend gets on day one:** the Alpha on their own device with no account: Today with the Checklist and today's
  habits first, Habits, Health (food, water, sleep, weight, workouts and five written programmes with Read aloud in their
  device's voice), Wealth (spending, bills, budgets, accounts), Tasks with named timers, the Journal and Notes, NOVA and
  ZIGi answering on the device, Help with a search, and "Load Showcase Demo" to see it all with example data. Their
  records stay on their device; Settings → Your data → Export everything keeps a copy.

---

## The dated task: market price policy, the next window · 30 min · your machine (ops checkout), CoinGecko dashboard · **before Mon 30 Nov 2026, 16:00 UTC**
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
5. Run step 3's verifier again; then `wrangler logout`.
- **Done when:** the verifier prints "Market policy period ends 2026-11-30T16:00:00.000Z; the next period is installed and
  takes over by itself, ending <your end>". Runbook: [ALPHA_PRICES_ROLLOUT.md](../run11/ALPHA_PRICES_ROLLOUT.md), "Next policy period".
