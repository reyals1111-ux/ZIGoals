# Incident runbook (draft, 2026-10-03)

> **Internal review by an AI (Claude), not a professional security audit, and not legal advice.** Session Q.
> - A first draft for a one-person operation with 4–5 friends.
> - Legal points are **questions for a lawyer**, not conclusions.
> - Rehearse sections 1, 2 and 5 once during Stage 8, with fictional accounts.

## The rules for every incident
1. **Contain first, investigate second.** Rotating a key or pausing a service is cheap; a leak that keeps going is not.
2. **Never paste a secret, code, token, recovery secret or personal data** into a chat, an issue, a PR, a screenshot or STATUS. Record key *names* and times only.
3. **Never roll back code over newer data** to fix a symptom. Use forward recovery ([ACTIVATION.md](../../run11/ACTIVATION.md), "Compatibility and recovery").
4. **Write a short log as you go:** the time (UTC), what you saw and what you did. Keep it in Bitwarden (a secure note) when it names people. The public record in STATUS is sanitised.
5. **Stop rule** ([OWNER_CHECKLIST.md](OWNER_CHECKLIST.md#d5-keep-the-stop-rule-ready)), the fastest way to pause:
   - turn market dispatch off;
   - set the lifecycle Worker's `RECOVERY_MODE` back to `reconcile` (all sync and new sign-ins stop, and nothing is deleted);
   - remove the acctest app's custom domain.

## Who can see what, in one line each
- **Device:** plaintext records.
- **Sync server:** ciphertext plus metadata.
- **Supabase:** emails and sign-ins.
- **Resend:** the code emails.
- **Cloudflare:** all traffic.
- **GitHub:** the source and CI.

Details in [DATA_FLOWS.md](DATA_FLOWS.md).

---

## 1. A key or token has leaked
**Signs:**
- a provider warns you (for example GitHub secret scanning);
- a key appears in a log, a screenshot or a chat;
- usage you did not cause;
- an audit-log entry you cannot explain.

| Secret (name only) | Where it lives | Rotate how | Then check | Side effects |
|---|---|---|---|---|
| `AUTH_ADMIN_KEY` (Supabase secret or `service_role`) | Lifecycle Worker secret; your Bitwarden copy | Supabase → API keys: create a new **secret** key. Put it on the lifecycle Worker: `pnpm --filter @zigoals/web exec wrangler secret put AUTH_ADMIN_KEY --config "$PWD/workers/private-sync/wrangler.lifecycle.acctest.owner.jsonc"` (interactive). Then delete the old key. Legacy `service_role`: ask a session first; rolling the JWT secret affects every session (`Q-OPS-03`) | Supabase → Users and auth logs: users created, deleted or changed; email changes | Pending identity deletions retry by alarm |
| `AUTH_ADMISSION_KEY` | Admission Worker secret | Generate ≥32 random characters (for example `openssl rand -base64 48`), then `wrangler secret put AUTH_ADMISSION_KEY --config <admission private config>` | — | All rate-limit counters reset (harmless) |
| `COINGECKO_DEMO_API_KEY` | Coordinator secret; still on `zigoals-alpha` and in the GitHub `alpha` environment until MARKET_KEY_CUSTODY steps 3–5 | CoinGecko Developer Dashboard: regenerate. Update the coordinator's secret (and the GitHub environment secret while the deploy still needs it) | Credit usage in the dashboard | Prices fail closed until the new key is in place |
| `CLOUDFLARE_ALPHA_API_TOKEN` (deploy) | GitHub `alpha` environment secret | Cloudflare → My Profile → API Tokens (or Manage Account → Account API tokens): roll or delete, and create a new one with the documented scope and an expiry. Update the GitHub environment secret | Cloudflare audit log for its use; each Worker's versions (`wrangler versions list --name <worker>`) for deployments you did not make; Worker secrets and routes | The next Manual Alpha deploy uses the new token |
| Wrangler login on the Mac | `~/.config/.wrangler/config/default.toml` or the keychain | `wrangler logout` (invalidates the token). If the Mac itself is suspect, also revoke from another device in Cloudflare's dashboard; the label for revoking OAuth apps is UNVERIFIED | Same as above | — |
| Resend key (Supabase SMTP password) | Supabase SMTP settings; Bitwarden | Resend → API keys: create a new **sending-only** key for the auth domain, put it in Supabase SMTP, remove the old one | Resend logs: unusual volume or recipients | Codes keep flowing after the switch |
| Supabase publishable key (`AUTH_PUBLIC_KEY`, `ZIGOALS_AUTH_PUBLIC_KEY`) | App and private-sync secrets | Not a secret. Rotate only if it is being abused, and update both Worker secrets | Rate-limit hits | — |
| GitHub personal access tokens, or the GitHub account | Your GitHub account | Settings → Developer settings → tokens: revoke. Account takeover: section 2B | GitHub security log; new deploy keys, webhooks, apps, workflow changes, environment approvals | — |
| A friend's recovery secret | The friend's password manager | The friend (or you with them) rotates the vault key **from a trusted device**: Settings → Account & sync → rotate. Save the new secret first | Their Devices and sessions list | Other remembered devices must open with the new secret |
| A session cookie (a stolen browser profile) | The friend's browser | Revoke under Devices and sessions, then section 2A step 2 (Supabase sign-out) | — | — |
| Lifecycle checkpoint file or digest | Bitwarden plus the offline copy | No rotation: these are metadata. Re-export a fresh checkpoint; keep the digest apart | — | Personal metadata: see section 6 |

**Afterwards:**
- check every other secret that sat in the same place: a Bitwarden or Mac compromise means *all* of them;
- write a sanitised STATUS line: the key name, the time and "rotated".

## 2. Account takeover

### 2A. A friend's inbox or device was compromised
1. **The friend** (from a trusted device), or you on a call with them:
   - sign in and open Settings → Devices and sessions;
   - **revoke every session they do not recognise** (or "revoke others").
2. **You, in Supabase:** sign that user out everywhere ([OWNER_SIGN_OUT_EVERYWHERE.md](../../run11/OWNER_SIGN_OUT_EVERYWHERE.md), OWNER_CHECKLIST C7). Then open the user's record:
   - **email address**: changed?
   - **password**: set? (it cannot be seen, but "last sign-in method" may tell);
   - **last sign-ins.**

   If the email was changed, set it back in the dashboard before anything else (`Q-AUTH-03`).
3. **Rotate the vault key** from a trusted device, and save the new recovery secret. This locks out any remembered device the attacker holds (`Q-SYNC-01`).
4. **Check for deletion.** If cloud data or the account was deleted:
   - the friend's devices still hold their local copies;
   - after an account deletion the identity is gone, so add the user again in Supabase, then sign in and attach the local data;
   - after "delete cloud data" alone, that user ID stays deleted for good (`Q-AUTH-04`). Delete the Supabase user so the same email gets a new ID, then re-attach. The lifecycle export rules still apply: export first ([OWNER_RECOVERY_ADMIN.md](../../run11/OWNER_RECOVERY_ADMIN.md)).
5. **Tell the friend what an attacker could and could not have seen:**
   - **could:** metadata (sections, sizes, devices), and the email address;
   - **could not:** the records, unless the attacker held a remembered device or the recovery secret.
6. **If the friend's records may have been read** (a remembered device, or a leaked recovery secret), continue with section 6.

### 2B. One of your own provider accounts (Cloudflare, GitHub, Supabase, Resend, Bitwarden, Apple ID)
1. **From a clean device:**
   - change the password;
   - re-enrol 2FA;
   - end all other sessions;
   - revoke every API token and OAuth app.
2. **Pause** with the stop rule if Cloudflare, GitHub or Supabase is affected.
3. **Review:**
   - **Cloudflare:** audit log; Workers, versions, routes and custom domains; secrets (names); DNS (MX, SPF, DMARC; new records); email routing rules.
   - **GitHub:** security log; branch rules; Actions and environments; deploy keys; webhooks; installed apps; recent pushes to `main`.
   - **Supabase:** users, keys, SMTP settings, URL configuration (redirect URLs).
4. **Rotate every secret** that account could reach (section 1).
5. **Redeploy from a reviewed commit** if code or configs may have changed: the Manual Alpha workflow for `zigoals-alpha`; your clean checkout for the others.
6. **Section 6** if data could have been read.

## 3. A friend asks for deletion
1. **Confirm it is them:** reply to their known email or phone, not to a new address.
2. **The supported path is in the app:** Settings → Account deletion → "Delete cloud records" ("delete my sign-in identity" is optional).
   - It removes the active encrypted records and stops their devices from re-creating them.
   - It does **not** erase copies on their devices or exported files; they clear site data themselves.
3. **The same day,** export the lifecycle checkpoint for that account (ADR-007 custody).
4. **Tell them, in plain words, what remains:**
   - Cloudflare's 30-day point-in-time recovery of the encrypted data;
   - a minimal deletion record (account ID, dates, which sections) kept for good, so the data cannot come back (`Q-PRIV-01`);
   - provider logs (Supabase sign-ins, Resend code emails) under their retention.
5. **If they cannot sign in any more** (lost email access, or no device):
   - since Session S, use `recovery-admin.mjs erase` ([OWNER_RECOVERY_ADMIN.md](../../run11/OWNER_RECOVERY_ADMIN.md), "Erase an account"). It exports first, records the deletion so no device can sync the account again, and deletes the sign-in identity once the lifecycle Worker serves (`Q-OPS-06`);
   - the encrypted rows still stay stored, unreadable and unreachable, until a private-sync change removes them;
   - tell them so, and log it as an open request.
6. **Legal flags (for the lawyer):**
   - the response time for erasure requests;
   - whether the deletion record and the 30-day recovery window need to be stated;
   - how to treat data you hold but cannot decrypt (LEGAL_CHECKLIST §2, question 7).

## 4. A provider is down
| Down | What friends see | Do | Don't |
|---|---|---|---|
| **Supabase** | Sign-in and refresh fail ("not confirmed"); open vaults keep working locally; sync errors | Check Supabase's status page; tell friends "local records are safe; sync resumes later" | Don't change auth settings, switch providers or delete anything |
| **Cloudflare** (or the daily Free limit: Error 1027 or Durable Object errors until 00:00 UTC) | The app and the landing are unavailable, or sync and sign-in fail | Check Cloudflare's status page. For a Free-limit outage, turn market dispatch off (`Q-WRK-01`) and consider a rate-limiting rule | Don't redeploy hoping to fix it, and don't reset Durable Objects |
| **Resend** | No code emails | Ask friends to wait. Signed-in sessions keep working (refresh needs no email) | Don't let friends hammer "Send code": 6 a day per address |
| **CoinGecko / Open Food Facts** | Prices or barcode lookup unavailable; manual entry works | Nothing; the budgets fail closed | Don't raise budgets to "catch up" |

## 5. A bad deploy
- **The public Alpha (`zigoals-alpha`):** follow the rollback in [MANUAL_ALPHA_WORKFLOW.md](../../deployment/MANUAL_ALPHA_WORKFLOW.md):
  - the previous version ID is in the deploy run's `alpha-rollback-*` artifact and in STATUS → Release identity;
  - roll back only `zigoals-alpha`, check `/app`, then record it in STATUS.
- **The landing (`zigoals`):** follow the rollback in [LANDING.md](../../deployment/LANDING.md): choose the recorded known-good version and roll back only `zigoals`.
- **The private Workers (acctest):**
  - `pnpm --filter @zigoals/web exec wrangler rollback --name <worker>`, or `wrangler versions deploy <version-id>`, per Worker;
  - **never** roll back across a Durable Object migration or a data-format change. Prefer forward recovery, and ask a session first;
  - rolling back the app does not change any browser's data.
- **A deploy you did not make** (a version in `wrangler versions list` that you don't recognise): treat it as section 2B for Cloudflare, plus section 1 for the deploy token.

## 6. Suspected data exposure
**First, sort out what may have been exposed and whether it is readable:**

| Data | Readable by whoever got it? |
|---|---|
| Ciphertext from the sync server (vault Durable Objects, or a point-in-time restore) | **No**, without a recovery secret, a vault root or a remembered device. Metadata is readable |
| Metadata (account and vault IDs, sections incl. Health, sizes, times, device labels, deletion records) | Yes |
| Email addresses and sign-in history (Supabase), code emails (Resend) | Yes |
| A recovery secret, a vault root (`Q-SYNC-01`) or a remembered device | **Yes: that account's records** |
| Plaintext on a device (a stolen profile, an extension, XSS) | Yes |
| Lifecycle checkpoint files | Yes: deletion metadata |

**Then:**
1. **Contain:** sections 1 and 2; the stop rule if needed.
2. **Preserve evidence** without copying personal data: version IDs, audit-log entries (times and actions), workflow run IDs.
3. **Write down:** who is affected (account labels, not names), which data, from when to when, whether readable, and what you did.
4. **Tell the affected friends** what happened and what they should do (rotate, revoke, watch for phishing), and keep it factual.

**Legal flags: questions for a lawyer, not conclusions:**
- Is this a "personal data breach" (GDPR Art. 4(12)), and who is the controller (the notice draft's open question 1)?
- **The supervisory authority:**
  - EDPB Guidelines 9/2022 (v2.0) describe notifying the supervisory authority without undue delay, within 72 hours where feasible, unless the breach is unlikely to result in a risk (Art. 33).
  - For Belgium, the APD/GBA says notifications go through its portal: "Les notifications qui nous sont envoyées par e-mail ne seront pas traitées."
  - Does ciphertext-only exposure, with metadata showing someone keeps Health records, count as "unlikely to result in a risk"?
- **The affected people:** EDPB says communication to individuals (Art. 34) can be omitted when the data were made unintelligible, for example by encryption, if the measures were effectively applied. Does that hold when metadata was readable?
- **Documentation:** every breach must be documented (Art. 33(5)), whatever is notified. Where does that record live?
- **The processors:** what must Supabase, Resend and Cloudflare tell you, and when (their processing agreements)?

## 7. An AI coding session went wrong (prompt injection)
**Signs:**
- a merge, push, workflow dispatch or log deletion you did not ask for;
- a PR that does more than its description;
- a session quoting instructions it found in a web page, an issue or a log.

**Steps:**
1. **Stop the session.**
2. **In GitHub:** list the PRs, merges, pushes and workflow runs since it started. Revert anything unintended through a new PR. Reject any pending `alpha` approval you did not start.
3. **If a deploy ran,** go to section 5.
4. **Check for leaks:** nothing secret should be reachable by a session (the history scan found none). If a key was ever pasted into a session, go to section 1.
5. **Record what text triggered it,** and add a rule to CLAUDE.md through a reviewed PR (`Q-AI-01`).

---

## Sources (accessed 2026-10-03)
- EDPB, Guidelines 9/2022 on personal data breach notification under GDPR, version 2.0: <https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-92022-personal-data-breach-notification-under_en>
- Autorité de protection des données (Belgium), "Notifier et gérer une violation de données": "dans les meilleurs délais et, si possible, 72 heures au plus tard"; notifications by email are not processed; portal access. <https://www.autoriteprotectiondonnees.be/professionnel/actions/violation-de-donnees-personnelles>. A two-part form with 21 days for part 2 appears only in a search snippet: **UNVERIFIED**.
- Cloudflare, Durable Objects storage API (30-day point-in-time recovery): <https://developers.cloudflare.com/durable-objects/api/storage-api/>
- Cloudflare, Workers limits (daily Free limit, Error 1027): <https://developers.cloudflare.com/workers/platform/limits/>
- Cloudflare, Wrangler commands (`login`, `logout`): <https://developers.cloudflare.com/workers/wrangler/commands/general/>
- Supabase, API keys (secret key rotation): <https://supabase.com/docs/guides/api/api-keys>
- Repository procedures: [MANUAL_ALPHA_WORKFLOW.md](../../deployment/MANUAL_ALPHA_WORKFLOW.md), [LANDING.md](../../deployment/LANDING.md), [OWNER_RECOVERY_ADMIN.md](../../run11/OWNER_RECOVERY_ADMIN.md), [MARKET_KEY_CUSTODY.md](../../run11/MARKET_KEY_CUSTODY.md), [ACTIVATION.md](../../run11/ACTIVATION.md).
