# Friends Alpha: your steps, from merge to inviting friends

Written 14 Nov 2026 (Session AP) from the code on `feature/session-an-ci-tooling` (PR #102) and `feature/session-am-nova`
(PR #101). One ordered list. Each step says how long it takes, where you do it, what to do, and how you know it is done.
Follow the linked runbook for the exact commands. **No secrets or real values belong in this file, a PR, a chat or a
screenshot.** Agents never merge, dispatch or deploy for you (CLAUDE.md).

**Total:** about 1½ days of your time, spread over a week. Stage 8 (step 10) is most of it and can be split over days.

**What is off until you switch it on:** notifications (both kinds), the weather proxy, ZIGoals AI · powered by Claude.
Accounts and sync open only after Stage 8.

---

### 1. Review and merge the first PR · 1–2 hours · GitHub
- **Do:** review [PR #101](https://github.com/reyals1111-ux/ZIGoals/pull/101) (Session AM, NOVA) and
  [PR #102](https://github.com/reyals1111-ux/ZIGoals/pull/102) (Sessions AN, AO and AP). Merge one, with a merge commit.
  Suggested order: **#101 first, then #102.** Either order works, as long as the second one merges `main` in.
- **Done when:** the first PR is merged and "Milestone quality" on `main` is green (a listed intermittent gets one re-run;
  docs/STATUS.md, "Known CI intermittents").

### 2. Bring the second PR up to date, then merge it · 30 min of yours, plus about 45 min of CI · GitHub
- **Do:** the second PR merges `main` in (a merge commit, never a rebase). Its session or you do it: theme sheets
  regenerated, both sides' registry entries kept, and any new `webkit-*`/`zigi-*` spec added to a WebKit shard list
  (`apps/web/playwright.webkit.shards.ts`; the WebKit job names the file if one is missing). Then review the merge and merge the PR.
- **Done when:** both PRs are merged, and CI on `main` is green. Copy the full 40-character SHA of `main`: it is the
  release SHA for every step below.

### 3. Private sync: check `STEP_UP_REQUIRED` · 5 min · your machine (ops checkout, read only)
- **Do:** at the release SHA, check that your private-sync copy has `STEP_UP_REQUIRED` set to `"on"` and run
  `node scripts/run11/activation-check.mjs --private`.
  - `"on"` (the committed value) means the recovery secret is asked again before Delete cloud data, Delete account,
    Delete a section, Sign out all other devices and Rotate.
  - `template var missing: STEP_UP_REQUIRED` → `node scripts/run11/make-private-configs.mjs --add-missing-template-vars`.
  - `STEP_UP_REQUIRED must be "on" or "off".` → correct the value by hand.
  - Set it to `"off"` only to roll the app back to #35 or older while vaults already have a verifier. Set it before the
    rollback, and back to `"on"` afterwards.
- **Done when:** `activation-check --private` prints PASS.
- **Runbook:** [FINAL_ACCTEST_REDEPLOY.md](../run11/FINAL_ACCTEST_REDEPLOY.md), "Sessions AM, AO and AP changes", owner step 1.

### 4. Private sync: redeploy for NOVA · 20 min · your machine (wrangler) and Cloudflare dashboard (read only)
- **Only if PR #101 is merged.** It changes one file, `workers/private-sync/extras.mjs` (the optional `nova` extras
  section). `main` and PR #102 alone change nothing in private sync, so skip this step if #101 is not merged.
- **Do:** write down the live version, deploy `workers/private-sync/wrangler.acctest.owner.jsonc`, then check it.
  ADR-038 says the order with the app is safe either way. Doing the Worker first means the first sync carries NOVA.
- **Done when:** `deployments list` shows the new version at 100%, `secret list` shows the same names as before, and
  the dashboard shows no route, `workers.dev` URL or preview URL.
- **Runbook:** [FINAL_ACCTEST_REDEPLOY.md](../run11/FINAL_ACCTEST_REDEPLOY.md), step 4 and "Sessions AM, AO and AP changes".

### 5. Deploy the public Alpha (#55) · about 45 min, mostly waiting · GitHub Actions
- **Do:** Actions → **Manual Alpha deployment** → Run workflow, on `main` only. Paste the release SHA into
  `expected_commit` and tick `owner_approval`. Read the build summary, then approve the protected `alpha` environment.
  This is the only way to deploy.
- **Done when:** the run is green ("new version answering on every route"), and Settings on alpha.zigoals.app shows the
  release SHA as its build. Record the new version id and the rollback id in docs/STATUS.md.
- **Runbook:** [MANUAL_ALPHA_WORKFLOW.md](../deployment/MANUAL_ALPHA_WORKFLOW.md), "Every deployment".

### 6. The hosted verifier · 15 min · your machine
- **Do:** `EXPECTED_COMMIT=<release SHA> node scripts/verify-hosted-alpha.mjs <a new directory>`. The directory holds
  the evidence and must not exist yet.
- **Done when:** PASS (exit 0) with 12 stages, or 13 with PR #101 (its NOVA stage). Notifications and the food binding
  are listed as "off" while they are switched off, and that is never a failure.
- **Runbook:** [MANUAL_ALPHA_WORKFLOW.md](../deployment/MANUAL_ALPHA_WORKFLOW.md) (the verifier paragraph);
  `node scripts/verify-hosted-alpha.mjs --help` lists the stages.

### 7. The landing page · 10 min · your machine (wrangler) · only if PR #101 is merged
- **Do:** redeploy the landing for `landing/privacy.html`, which carries the MET Norway text and Session AL's change.
  The landing still runs on version `1a2c1c75`.
- **Done when:** `/`, `/privacy` and `/terms` answer 200 with the full header set, and the privacy page names MET Norway.
- **Runbook:** [LANDING.md](../deployment/LANDING.md), "Owner-only deployment".

### 8. Food lookup: check it, nothing to deploy · 5 min · alpha.zigoals.app
- The food Worker was deployed on 4 Nov from `17069c7d`, with its `FDC_API_KEY` secret (docs/STATUS.md, Session AL
  Part 0). `workers/food-lookup/` is unchanged on `main`, #101 and #102, so it needs no redeploy.
- **Do:** Health → "Scan or look up a food barcode" → look up `3017620422003`; then an unknown barcode such as `00000000`.
- **Done when:** the first answer names Open Food Facts, and the second says "Product not found in the food databases. Add it yourself…".
- **Runbook:** [FOOD_WORKER_PUBLIC_ALPHA.md](../run11/FOOD_WORKER_PUBLIC_ALPHA.md), step 4.

### 9. Optional: switch things on · each on its own day if you like
- **9a. Notifications on the public Alpha** · about 20 min, plus a phone, plus one commit and one Alpha deploy ·
  your machine (wrangler), GitHub, Cloudflare dashboard. **Off until you do it:** `pushDeviceEnabled` is `false` in
  `apps/web/config/public-integrations.json`.
  - **Do:** make the keys offline, then the private config. The app must reach the Worker by a service binding, or by one
    custom domain with a rate-limiting rule. Deploy the Worker and its secret, set the app's runtime secret, then switch
    on with one commit (`pushDeviceEnabled: true` plus the public key). Deploy the Alpha (step 5) and turn the kill switch off.
  - **Done when:** "Send a test notification" arrives within a minute, and the verifier's push stage reports the key.
  - **Runbook:** [PUSH_PUBLIC_ALPHA.md](../run11/PUSH_PUBLIC_ALPHA.md).
- **9b. Reminders through an account (acceptance stack only)** · about 45 min, plus the iPhone. It does nothing on the
  public Alpha, which has no accounts. Do it during the acceptance redeploy (step 10), after the app.
  **Runbook:** [PUSH_ACTIVATION.md](../run11/PUSH_ACTIVATION.md). **Done when:** Stage 8 row 15b passes.
- **9c. The weather proxy** · 25–35 min · your machine (wrangler), a custom domain on your Cloudflare zone. It does not
  work on a `workers.dev` address. **Off until you deploy it.** The app does not call it yet; the NOVA lane wires the client later.
  - **Do:** make a private copy and dry run it, then deploy. Run the curl checks, then give the proxy's origin to the NOVA lane.
  - **Done when:** step 3's checks pass: `x-weather-cache: hit` on the second nearby call, 403 for another origin, and
    429 after 60 a minute.
  - **Runbook:** [WEATHER_PROXY_ACTIVATION.md](../run11/WEATHER_PROXY_ACTIVATION.md).
- **9d. ZIGoals AI · powered by Claude** (acceptance stack, your own account first). **Runbook:**
  [ZIGI_RELAY_ACTIVATION.md](../run11/ZIGI_RELAY_ACTIVATION.md). Off until then.

### 10. Stage 8: the acceptance run · about 5½ hours, over several days · your desktop, your iPhone, two inboxes, Cloudflare, Supabase, Resend, CoinGecko
- **Do, in order:**
  1. the acceptance redeploy ([FINAL_ACCTEST_REDEPLOY.md](../run11/FINAL_ACCTEST_REDEPLOY.md): services first, then the
     app, then the hostname check);
  2. the owner hardening H1–H16, if not done yet;
  3. the run sheet, Parts 1–8 ([STAGE8_OWNER_RUNSHEET.md](../run11/STAGE8_OWNER_RUNSHEET.md)), including Part 4b (new in
     AM, AO and AP);
  4. the tickable [FRIENDS_ALPHA_CHECKLIST.md](../run11/FRIENDS_ALPHA_CHECKLIST.md), including "14 Nov 2026 (Session AP)".
- **Done when:** every row in your private STAGE8_ACCEPTANCE copy is pass, PROVEN-LOCAL with its CI run, or "not run"
  with its reason. Commit a sanitized summary only.

### 11. Quotas and spend · 15 min · Cloudflare, Supabase, Resend and CoinGecko dashboards
- **Do:** check usage against the free tiers, and confirm that no paid upgrade or automatic reload is on.
- **Done when:** there is comfortable headroom everywhere, and nothing paid is on (run sheet rows 22–23).

### 12. The stop rule · 10 min · write it down before the first invite
- **Do:** decide and write down, privately, when you pause invites. Suggested triggers:
  - any service passes about half of a free-tier daily allowance;
  - "Sign-in codes are paused for today" appears (the 60-a-day ceiling);
  - two friends report the same breakage;
  - any security report to hello@zigoals.app.
- Also write down what you do when one fires: send no more invites. For anything switched on, use its own off switch:
  the notifications kill switch, removing the weather proxy's domain, or the relay's kill switch. To roll back the
  Alpha, follow [MANUAL_ALPHA_WORKFLOW.md](../deployment/MANUAL_ALPHA_WORKFLOW.md) (no automatic rollback, by design).
- **Done when:** the rule and the friend count are written in your private notes ([FRIENDS_ALPHA_CHECKLIST.md](../run11/FRIENDS_ALPHA_CHECKLIST.md), last line).

### 13. The invite list and the welcome · 30 min · Supabase, your mail
- **Do:**
  1. Remove the two `<!-- AP: … -->` comment lines in [FRIENDS_GUIDE.md](FRIENDS_GUIDE.md): the Part 6 features, and
     the NOVA weather line (keep it only if #101 is deployed). Then send each friend the link
     **https://alpha.zigoals.app/app** and the guide.
  2. **Accounts, only once Stage 8 has passed and you decide to open them:** a code is sent only to an address that
     already exists as a user. The app asks Supabase with `create_user: false` (`apps/web/lib/server/private-account.ts`).
     Add each invited address as a user in the Supabase project's Authentication → Users. **No runbook describes this
     click path yet (UNVERIFIED).** Keep the list in Bitwarden, never in the repository.
- **Done when:** each friend has the link and the guide. With accounts open, one friend's test code also arrives.
