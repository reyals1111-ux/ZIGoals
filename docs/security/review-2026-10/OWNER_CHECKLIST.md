# Owner checklist: account hardening and pre-Alpha actions (2026-10-03)

> **Internal review by an AI (Claude), not a professional security audit.** Session Q.
> - Every step says **why**, **how** and **how to verify**.
> - Menu paths come from the providers' official pages, read on 2026-10-03 (sources at the end). Dashboards change; where a label could not be confirmed, the step says so.
> - **Never paste a key, token, code, recovery secret or email address into a chat, an issue, a screenshot or this repository.** The verification steps print key *names* or `true`/`false` only.

## Order of work
| Group | When | Steps |
|---|---|---|
| **A** | **Now, while Stage 7 runs**, before the acctest app answers on its host name | A1–A8 |
| **B** | Before Stage 8 | B1–B7 |
| **C** | Before inviting friends | C1–C8 |
| **D** | During the Alpha | D1–D5 |

---

## A. Now, during Stage 7

### A1. Make the Alpha invite-only at Supabase
- **Why:** the app asks Supabase to create a user for any address that requests a code (`Q-AUTH-01`). Invite-only exists only if this switch is off.
- **How:**
  1. Supabase dashboard → your project → Authentication → the general configuration ("Allow new users to sign up").
  2. Turn it **off**.
  3. Then add each friend yourself under Authentication → Users ("Add user"), so they can sign in with a code. The exact "Add user" label is UNVERIFIED.
- **Verify:**
  - With a second address you control that has no user, request a code in the acctest app. No email should arrive.
  - The app shows an error that reveals non-membership: see `Q-AUTH-06`, a known trade-off.
  - Your own address still receives a code.

### A2. Keep the market service off for the friends deployment, or put a rate limit in front of it
- **Why:** with the market binding on, one person can exhaust the account's free daily Durable Object allowance, and sync and sign-in then stop until 00:00 UTC (`Q-WRK-01`, High).
- **How (choose one):**
  - **Off (recommended for now):** in the coordinator's private config, do not set `MARKET_QUOTE_DISPATCH` to `durable-v1`. The coordinator then answers "setup required" without touching storage.
  - **On:** first add a Cloudflare rate-limiting rule for `/api/market-*` on the acctest host (zone → Security → WAF → Rate limiting rules; what your plan includes is UNVERIFIED). Then settle the Workers plan (step A8).
- **Verify:**
  - The private-config check in A6 shows `MARKET_QUOTE_DISPATCH` absent.
  - Or the rule is listed under Security → WAF.

### A3. Raise Supabase's per-IP rate limits
- **Why:** every sign-in reaches Supabase from the Worker, so all friends share one per-IP budget (30 sign-ins and 30 verifications per 5 minutes by default). One person can use it up (`Q-AUTH-05`). ZIGoals' admission Worker already limits per email and per IP.
- **How:** Supabase → Authentication → Rate Limits. Raise "sign-ups and sign-ins", "token verifications" and "token refreshes" well above what the admission Worker allows. Set the email rate (custom SMTP) to fit your Resend plan's daily quota.
- **Verify:** the page shows the new values. Record them, without screenshots of other data, in your Stage 8 receipts.

### A4. Check the code and email-change settings
- **Why:** these settings decide what a brief inbox compromise can do (`Q-AUTH-03`), and whether your planned 8-digit, 15-minute code is really active.
- **How:** Supabase → Authentication → Sign In / Providers → Email:
  - code length **8**;
  - code expiry **900** seconds;
  - "Secure email change" **on** (the default: both the old and the new address must confirm);
  - "Secure password change" **on**.
- **Verify:** the settings page shows these values. In Stage 8, rows A2 (expired code) and A3 (reused code) behave as expected.

### A5. Use a scoped Cloudflare login for Stage 7, and log out afterwards
- **Why:** `wrangler login` asks for **all** scopes by default and stores the token in a plaintext file on the Mac until you log out (`Q-OPS-02`).
- **How:**
  - Prefer an **account API token** limited to this account (Workers Scripts: Edit), with an expiry date, in the shell for that session only. Use `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
  - Or use `wrangler login --scopes …` (`wrangler login --scopes-list` shows them), with `--use-keyring`.
  - Afterwards, run `pnpm --filter @zigoals/web exec wrangler logout`, or revoke the token.
- **Verify:** `pnpm --filter @zigoals/web exec wrangler whoami` reports that you are not logged in, and `~/.config/.wrangler/config/default.toml` no longer exists.

### A6. Verify the seven private configs by key names only
- **Why:** this review cannot see your git-ignored `*.acctest.owner.jsonc` files (`Q-OPS-04`). The activation checker covers their topology; this list makes the result visible to you without printing any value.
- **The files:**
  - `apps/web/wrangler.run11.acctest.owner.jsonc`;
  - `workers/private-sync/wrangler.acctest.owner.jsonc`;
  - `workers/private-sync/wrangler.lifecycle.acctest.owner.jsonc`;
  - `workers/market-coordinator/wrangler.acctest.owner.jsonc`;
  - `workers/food-lookup/wrangler.acctest.owner.jsonc`;
  - `workers/auth-abuse/wrangler.acctest.owner.jsonc`;
  - `workers/recovery-admin/wrangler.acctest.owner.jsonc` (local only).
- **How, in the ops checkout, read-only:**
  1. `node scripts/run11/activation-check.mjs --private` and `node scripts/run11/activation-check.mjs --admin`. Expect PASS. They print problems, never values.
  2. File mode and ignore status:
     ```sh
     for f in apps/web/wrangler.run11.acctest.owner.jsonc workers/*/wrangler*.acctest.owner.jsonc; do stat -f '%Lp %N' "$f"; git check-ignore -q "$f" && echo "  ignored"; done
     ```
     Every line should start with `600` and be followed by `ignored`.
  3. Public-surface keys. These values are booleans and names, not secrets:
     ```sh
     grep -nE '"(workers_dev|preview_urls|routes|route|account_id)"' apps/web/wrangler.run11.acctest.owner.jsonc workers/*/wrangler*.acctest.owner.jsonc
     ```
     Expect `"workers_dev": false` and `"preview_urls": false` in every file, and **no** `routes`, `route` or `account_id` line.
  4. Logging and dates:
     ```sh
     grep -nE '"(enabled|compatibility_date)"' apps/web/wrangler.run11.acctest.owner.jsonc workers/*/wrangler*.acctest.owner.jsonc
     ```
     Expect `"enabled": false` (observability) and `"compatibility_date": "2026-09-13"` everywhere.
  5. Durable Objects and migrations:
     ```sh
     grep -nE '"(class_name|new_sqlite_classes|tag)"' workers/*/wrangler*.acctest.owner.jsonc
     ```
     Expect:
     - `PrivateVault` (private sync), `LifecycleAuthority` (lifecycle), `MarketAccount` (market), `FoodBudget` (food) and `AdmissionAuthority` (admission);
     - each with tag `v1` under `new_sqlite_classes`.
  6. Bindings:
     ```sh
     grep -nE '"(binding|entrypoint)"' apps/web/wrangler.run11.acctest.owner.jsonc workers/*/wrangler*.acctest.owner.jsonc
     ```
     Expect:
     - the app: `WORKER_SELF_REFERENCE`, `MARKET_QUOTES`/`QuoteService`, `PRIVATE_SYNC`, `FOOD_LOOKUP` and `AUTH_ABUSE`/`AdmissionService`;
     - private sync: `LIFECYCLE`/`LifecycleService`;
     - recovery admin: only `ADMIN`/`LifecycleRecoveryAdmin`.

     **`LifecycleRecoveryAdmin` must appear in no other file.**
  7. Recovery mode and origins (key names only):
     ```sh
     grep -c '"RECOVERY_MODE": "reconcile"' workers/private-sync/wrangler.lifecycle.acctest.owner.jsonc
     grep -lE '"(APP_ORIGIN|AUTH_ORIGIN|ZIGOALS_AUTH_ORIGIN|ZIGOALS_SYNC_ORIGIN)"' apps/web/wrangler.run11.acctest.owner.jsonc workers/*/wrangler*.acctest.owner.jsonc
     ```
     Expect `1` for the recovery mode, and the expected files listed. Check by eye, without copying it anywhere, that `APP_ORIGIN` is exactly `https://accounts-test.zigoals.app`.
- **What the checker does not cover:** provider settings (A1–A4), the actual secrets on each Worker (A7), dashboard routes and custom domains (A7), and the deploy token's scope (B5).

### A7. After deploying: list each Worker's routes and secret names
- **Why:** the configs say "no public route", but the dashboard is what serves traffic. Secrets belong only where the design puts them.
- **How:**
  1. Cloudflare → Workers & Pages → each of the six Workers → Settings → Domains & Routes. `workers.dev` and Preview URLs should be **disabled**. The only custom domain should be the app's (`accounts-test.zigoals.app`), on the app Worker.
  2. Secret names only: `pnpm --filter @zigoals/web exec wrangler secret list --config "$PWD/<private config>"`.
  3. Expect:
     - `AUTH_ADMIN_KEY` only on lifecycle;
     - `AUTH_ADMISSION_KEY` only on admission;
     - `COINGECKO_DEMO_API_KEY` only on the coordinator;
     - `AUTH_PUBLIC_KEY`/`ZIGOALS_AUTH_PUBLIC_KEY` (the **publishable** key) on private sync and the app.
- **Verify:** write the list of names in your Stage 7 receipt. No values.

### A8. Know which Workers plan the account is on
- **Why:** on Workers Free, limits fail closed: an outage, not a bill. On Workers Paid, the same abuse becomes cost (`Q-WRK-01`, `Q-WRK-07`).
- **How:** Cloudflare → Workers & Pages → Plans (label UNVERIFIED). If on Paid, set up step C4 immediately.
- **Verify:** the plan is noted in the Stage 7 receipt.

---

## B. Before Stage 8

### B1. Cloudflare: two-factor authentication with security keys
- **Why:** one Cloudflare account holds the landing, the Alpha, the six private Workers, DNS and email routing (THREAT_MODEL_REFRESH, A8).
- **How:**
  1. My Profile → Authentication.
  2. Add **two** security keys (or passkeys) plus an authenticator app. Cloudflare recommends "multiple security keys" and "at least two different 2FA factors".
  3. Keep the backup codes in Bitwarden.
- **Verify:** the Authentication page lists at least two factors.

### B2. Cloudflare: members, tokens and audit log
- **Why:** every member and token is a way in.
- **How:**
  - **Members:** Manage Account → Members. Only you, as Super Administrator. Turn on 2FA enforcement.
  - **Tokens:**
    - User tokens: My Profile → API Tokens.
    - Account tokens: Manage Account → Account API tokens.
    - Delete what is unused, give the rest an expiry and client-IP filtering where practical, and write down what each one is for.
  - **Audit log:** open the Audit Logs page and look for logins, token creations and Worker changes you do not recognise. It is retained for 18 months.
- **Verify:** the token list matches your notes, and the audit log shows nothing you cannot explain.

### B3. GitHub: two-factor authentication, tokens and apps
- **Why:** GitHub holds the source, CI, the `alpha` deploy credentials and the identity that Claude sessions use (`Q-AI-01`).
- **How:**
  - **2FA:** Settings → Password and authentication → two-factor authentication: an authenticator app, plus a security key or passkey as backup (not SMS). Save the recovery codes in Bitwarden.
  - **Tokens:** Settings → Developer settings → Personal access tokens. Delete unused ones; prefer fine-grained tokens with an expiry.
  - **Claude GitHub App:** Settings → Applications → Installed GitHub Apps → **Configure**. Choose "Only select repositories" → `ZIGoals`. Review the permissions shown there.
- **Verify:** "Password and authentication" shows 2FA on, and the app's repository access lists only `ZIGoals`.

### B4. GitHub: repository settings
- **Why:** these turn written rules into enforcement.
- **How:**
  - **Ruleset on `main`:** Settings → Rules → Rulesets → New branch ruleset, targeting `main`. Turn on:
    - restrict deletions;
    - block force pushes;
    - require a pull request before merging;
    - require status checks to pass: the checks PRs already run, `web` and `contract` (Milestone quality) and `compare` (Canonical reproducibility).

    Leave the bypass list empty, or only you if you need an emergency path.
  - **Actions (Settings → Actions → General):**
    - require actions to be pinned to a full-length commit SHA;
    - allow only GitHub-made actions (all current workflows use only `actions/*`);
    - keep the workflow token read-only;
    - keep "Allow GitHub Actions to create and approve pull requests" off;
    - require approval for all external contributors' workflow runs.
  - **Code security:**
    - secret scanning (free on public repositories) and push protection: Settings → Advanced Security / Code security;
    - "Push protection for yourself" in your personal Settings → Code security;
    - Dependabot alerts on.
  - **Private vulnerability reporting:** Settings → Advanced Security → Enable. This matches SECURITY.md's private channel.
- **Verify:** an agent or a direct push to `main` is refused, the rules page lists the ruleset, and the Security tab shows scanning on.

### B5. GitHub `alpha` environment and the deploy token
- **Why:** the documented deploy token can change **every** Worker in the account (`Q-SC-01`).
- **How:**
  - Settings → Environments → `alpha`:
    - required reviewer: only you;
    - "Prevent self-review" off (by design);
    - administrator bypass **disabled**;
    - deployment branches: only `main`.
  - In Cloudflare, give the deploy token an expiry date and note its "last used" time. After Stage 7, roll it.
  - Decide (C8) whether the friends' Workers move to a separate Cloudflare account.
- **Verify:** `scripts/alpha-deploy.mjs authorize` already checks the environment's protection on every run. The token page shows an expiry.

### B6. Supabase, Resend and CoinGecko accounts
- **Supabase:**
  - MFA (TOTP) at Account → Security (`supabase.com/dashboard/account/security`). Organisation-wide enforcement needs a paid plan.
  - Only you as an organisation member.
  - The project's secret or `service_role` key exists in one place only: the lifecycle Worker's secret, plus your Bitwarden copy.
- **Resend:**
  - Profile → Enable MFA.
  - The SMTP key used by Supabase: **sending access**, restricted to the auth sending domain. Check its "last used".
  - Open and click tracking: **off** for the auth domain (Resend: "disabled by default for all domains"; confirm it).
- **CoinGecko:** a strong unique password, and 2FA if the dashboard offers it (UNVERIFIED). The Demo key goes only to the coordinator. After moving it, **regenerate** the key in the Developer Dashboard so the copy on the app Worker becomes useless (`Q-WRK-05`).
- **Verify:**
  - each dashboard shows MFA on;
  - Resend's key list shows one sending-only key for the auth domain;
  - Resend's domain settings show tracking off.

### B7. Bitwarden and the Mac
- **Bitwarden:**
  - two-step login with a FIDO2 security key (free) plus an authenticator;
  - keep the two-step **recovery code** offline (paper);
  - checkpoint files and their digests in separate items (ADR-007);
  - a vault timeout of minutes, not hours.
- **The Mac:**
  - **FileVault on:** System Settings → Privacy & Security → FileVault. Keep the recovery key apart from the Mac (Bitwarden and paper).
  - Screen lock and automatic updates on.
  - In the ops checkout:
    - private configs `0600` and ignored (A6);
    - **nothing secret in shell history**: `wrangler secret put` prompts for the value, so never pass it as an argument;
    - the `FOOD_USER_AGENT` command line holds your contact email in history; delete that history line if you prefer.
  - Use a separate browser profile, without extensions, for ZIGoals testing (`Q-SYNC-01`).
- **Verify:** Bitwarden shows two-step login on; System Settings shows FileVault on.

---

## C. Before inviting friends

### C1. Email that cannot be spoofed easily
- **Why:** DMARC is `p=none` today, so "ZIGoals" emails from `@zigoals.app` that are not yours are not rejected (`Q-OPS-01`).
- **How:**
  1. Verify Resend's dedicated auth sending subdomain (SPF and DKIM aligned).
  2. Then change `_dmarc.zigoals.app` to `p=quarantine`, and later `p=reject`. Keep `rua`.
  3. Add CAA records for the certificate authorities Cloudflare uses.
  4. Turn on DNSSEC: DNS → Settings → Enable DNSSEC, then add the DS record at your registrar.
- **Verify:** a DNS lookup of `_dmarc.zigoals.app` shows the new policy; a DS record exists.

### C2. HTTPS everywhere at the zone
- **Why:** plain HTTP is answered today. Browsers are protected by the `.app` HSTS preload, but other clients are not (`Q-AUTH-09`).
- **How:** zone `zigoals.app` → SSL/TLS → Edge Certificates → **Always Use HTTPS** on.
- **Verify:** `curl -sI http://zigoals.app/` returns a redirect to `https://`.

### C3. Decide on Cloudflare's network error reporting
- **Why:** the notice draft says "no trackers"; Cloudflare's NEL makes browsers send failure reports to Cloudflare (`Q-PRIV-04`).
- **How:** either turn NEL off for the zone (Cloudflare: a dashboard toggle, or `PATCH /zones/{zone_id}/settings/nel`), or keep it and mention it in the notice.
- **Verify:** `curl -sI https://zigoals.app/` no longer shows `nel:` and `report-to:` headers, or the notice mentions them.

### C4. Turn on usage and billing alerts at every provider
- **Why:** abuse should be noticed in hours, not at the end of the month (owner addition 4; `Q-WRK-01`/`02`, `Q-AUTH-05`/`07`).
- **How:**
  - **Cloudflare:**
    - on Workers Paid, Notifications → "Usage Based Billing";
    - on Free, there is no billing; check Workers & Pages → each Worker's metrics and the Durable Objects usage daily in the first week.
  - **Supabase:** the organisation's Usage page. On a paid plan, keep the spend cap on.
  - **Resend:** the quota and usage page. Watch bounces and complaints.
  - **CoinGecko:** the Developer Dashboard's credit usage against the monthly credits in `MARKET_POLICY`.
- **Verify:** each provider shows an alert or a bookmarked usage page that you check in D1.

### C5. Friend guidance (one short message)
- **Why:** most of the remaining risks are on the friends' side: inbox, devices, phishing.
- **Say:**
  - "Keep the recovery secret in a password manager; ZIGoals and I will never ask for it."
  - "Codes come only from our sender; never share a code."
  - "Use Remember on this device only on your own phone or computer."
  - "If you lose a device or your email account is compromised, tell me; then revoke that device under Devices and sessions and rotate the key."
  - "Don't use ZIGoals in a browser profile with unknown extensions."
- **Verify:** the message is sent; FRIENDS_GUIDE says the same.

### C6. Help and landing wording
- **Why:** friends read the landing and Help. Several lines say more, or less, than the code does (`Q-PRIV-02`, `Q-AUTH-04`).
- **How:** approve a small copy PR for:
  - "which part of the app" on the landing;
  - "Lost a device? Revoke it, then rotate";
  - the stale rotation sentence in the sessions panel;
  - the end-to-end encryption qualifiers.

  See [FIX_PLAN.md](FIX_PLAN.md) Part D.
- **Verify:** the PR is merged and deployed.

### C7. How to sign a friend out everywhere at Supabase
- **Why:** ZIGoals' "revoke" blocks access to the vault, but not the Supabase session (`Q-AUTH-02`).
- **How (updated by Session S):** follow [OWNER_SIGN_OUT_EVERYWHERE.md](../../run11/OWNER_SIGN_OUT_EVERYWHERE.md). Supabase's Auth admin API has no sign-out by user ID, so there is no script; the page gives the dashboard steps. Try it once with your own test user in Stage 8.
- **Verify:** after it, the test user's refresh fails and sign-in needs a new code.

### C8. One Cloudflare account, or two?
- **Why:** the public Alpha's deploy token and every Worker share one account, so a problem in one is a problem in all (`Q-SC-01`, `Q-WRK-07`).
- **How:** decide whether the friends' Workers (sync, lifecycle, admission, food, market, acctest app) move to a separate account with its own login and tokens. If not, accept it explicitly and keep B5's token hygiene.
- **Verify:** the decision is recorded in STATUS.

---

## D. During the Alpha

### D1. A weekly 15-minute review
Check each place below for anything you cannot explain:
- the Cloudflare audit log;
- Supabase → Users (new users, last sign-ins, email changes) and the auth logs;
- Resend logs (bounces, complaints, unusual volume);
- CoinGecko credit use;
- GitHub's Security tab and the Actions history (runs you did not start).

### D2. After every deletion decision
Export the lifecycle checkpoint the same day ([OWNER_RECOVERY_ADMIN.md](../../run11/OWNER_RECOVERY_ADMIN.md), "When to export").

### D3. After every Claude session
- Read the PR's diff, not only its description.
- Approve `alpha` deployments only for runs you started yourself, in the GitHub UI.
- If a session reports text that looked like instructions inside a web page, an issue or a log, treat it as an incident ([INCIDENT_RUNBOOK.md](INCIDENT_RUNBOOK.md)).

### D4. Every 90 days, and after any suspicion
Roll the deploy token, the admission HMAC key (all counters reset, which is harmless) and the Resend SMTP key. Review the Bitwarden items.

### D5. Keep the stop rule ready
The friends checklist asks for "a stop rule if usage or errors rise". The fastest stops:
- turn the market dispatch off;
- set the lifecycle Worker's `RECOVERY_MODE` back to `reconcile`. The sync Worker then refuses every request: sync and new sign-ins stop, and nothing is deleted;
- remove the acctest app's custom domain.

---

## Sources (accessed 2026-10-03)
- **Cloudflare:**
  - 2FA: <https://developers.cloudflare.com/fundamentals/user-profiles/2fa/>
  - audit logs (18 months): <https://developers.cloudflare.com/fundamentals/account/account-security/review-audit-logs/>
  - notifications ("Usage Based Billing"): <https://developers.cloudflare.com/notifications/notification-available/>
  - creating tokens (resources, client IP filtering, TTL; "My Profile > API Tokens"): <https://developers.cloudflare.com/fundamentals/api/get-started/create-token/>
  - account API tokens: <https://developers.cloudflare.com/fundamentals/api/get-started/account-owned-tokens/>
  - Wrangler login, scopes, plaintext storage, `--use-keyring`, logout: <https://developers.cloudflare.com/workers/wrangler/commands/general/>
  - Always Use HTTPS: <https://developers.cloudflare.com/ssl/edge-certificates/additional-options/always-use-https/>
  - DNSSEC: <https://developers.cloudflare.com/dns/dnssec/>
  - Network Error Logging: <https://developers.cloudflare.com/network-error-logging/>
  - Durable Objects pricing and Free limits: <https://developers.cloudflare.com/durable-objects/platform/pricing/>
  - Workers limits: <https://developers.cloudflare.com/workers/platform/limits/>
- **GitHub:**
  - 2FA: <https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/configuring-two-factor-authentication>
  - installed apps: <https://docs.github.com/en/apps/using-github-apps/reviewing-and-modifying-installed-github-apps>
  - rulesets: <https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets>
  - Actions settings: <https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository>
  - environments: <https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments>
  - Actions hardening: <https://docs.github.com/en/actions/how-tos/security-for-github-actions/security-guides/security-hardening-for-github-actions>
  - secret scanning: <https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning>
  - push protection for users: <https://docs.github.com/en/code-security/secret-scanning/working-with-secret-scanning-and-push-protection/push-protection-for-users>
  - private vulnerability reporting: <https://docs.github.com/en/code-security/security-advisories/working-with-repository-security-advisories/configuring-private-vulnerability-reporting-for-a-repository>
- **Supabase:**
  - MFA: <https://supabase.com/docs/guides/platform/multi-factor-authentication>
  - general configuration ("Allow new users to sign up"): <https://supabase.com/docs/guides/auth/general-configuration>
  - email codes: <https://supabase.com/docs/guides/auth/auth-email-passwordless>
  - rate limits: <https://supabase.com/docs/guides/auth/rate-limits>
  - sessions: <https://supabase.com/docs/guides/auth/sessions>
  - API keys: <https://supabase.com/docs/guides/api/api-keys>
  - settings defaults (`double_confirm_changes`, `secure_password_change`, `otp_length`, `otp_expiry`, rate limits): <https://supabase.com/docs/guides/local-development/cli/config>
- **Resend:**
  - MFA: <https://resend.com/docs/knowledge-base/how-can-i-add-mfa>
  - API keys: <https://resend.com/docs/dashboard/api-keys/introduction>
  - tracking: <https://resend.com/docs/dashboard/domains/tracking>
- **CoinGecko:** authentication (header, backend proxy): <https://docs.coingecko.com/v3.0.1/reference/authentication>
- **Bitwarden:** two-step login: <https://bitwarden.com/help/setup-two-step-login/>
- **Apple:** FileVault: <https://support.apple.com/guide/mac-help/protect-data-on-your-mac-with-filevault-mh11785/mac>
- **UNVERIFIED labels:** Supabase "Add user" and its per-user sign-out action; the Cloudflare "Plans" page label; the WAF rate-limiting rules included in your plan; CoinGecko account 2FA.
