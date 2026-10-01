# ADR-007: owner-only caller for lifecycle recovery administration

Status: **Proposal — awaiting owner decision.** Nothing here is implemented. It adds operator tooling next to the auth/sync lifecycle Worker, so any implementation needs explicit owner approval and its own reviewed PR, labelled TIER 3 (lifecycle). Code references are to `main` at `d21ba8f`. No Cloudflare account, secret or wrangler command was used to write this.

## Decision requested
Choose one of:
- **A**, a local owner CLI with a remote service binding (recommended);
- **B**, a deployed admin Worker behind Cloudflare Access;
- **A now, plus C later** (scheduled export only);
- **no change**: keep Stage 5 manual and blocked.

The recommendation is at the end.

## Context: the gap
- **The authority.** `LifecycleAuthority` (`workers/private-sync/lifecycle.mjs`) owns account deletion and domain generations. Its history can only be restored from a checkpoint kept **outside** Cloudflare storage (`scripts/run11/LIFECYCLE_RECOVERY.md`).
- **The admin surface is a separate named entrypoint:** `export class LifecycleRecoveryAdmin extends WorkerEntrypoint` (`lifecycle.mjs:71-81`). It serves three fetch paths:
  - `GET /admin/export`: returns `{checkpoint, digest}` (canonical SHA-256). It works in `serve` and `reconcile` mode.
  - `POST /admin/dry-run`: validates without writing.
  - `POST /admin/reconcile`: merges atomically.
  - Dry-run and reconcile need `RECOVERY_MODE=reconcile` plus `RECOVERY_ACCOUNT_ID` and `RECOVERY_CHECKPOINT_SHA256` set in the Worker's own configuration (`:153-156`). The body is checked against that anchor (409 `CHECKPOINT_ANCHOR_MISMATCH`).
- **It has no caller authentication.** Whoever holds a service binding to it has full admin power. `x-verified-account` only selects the account.
- **Nothing may call it today:**
  - the public `fetch` returns 404 (`:6-7`);
  - `LifecycleService` returns 404 for `/admin*` (`:13`);
  - no template binds the entrypoint;
  - `scripts/run11/activation-check.mjs:20` fails any runtime template (and the Stage 4 private copies) that does ("Recovery administration must remain unbound in runtime templates").
- **So Activation Stage 5** ("Lifecycle and recovery custody", `docs/run11/ACTIVATION.md:22`) cannot export a checkpoint, dry-run or reconcile on hosted Workers. There is no protected, owner-only caller. That is the gap.

**What a checkpoint contains** (`lifecycle.mjs:94-126`):
```
{version:1, account, lifecycle:{generation, deleted, provider, account, authorizedFamily, deletedAt,
 domainGenerations, domainDecisions:{<domain>:{generation, operation, at}}}, receipts:[{operation, domain, generation}]}
```
It is plaintext **metadata**: no vault data, keys or credentials. It is still personal. It links an account UUID and a session-family UUID to deletion times and to which private domains were deleted. Its **integrity** is what matters most, because the digest is the reconciliation anchor.

## Threat model
| # | Threat | What an attacker gains | Existing control | Needed from the caller |
|---|---|---|---|---|
| T1 | The admin entrypoint becomes reachable from the internet (route, `workers.dev`, preview URL, Access misconfiguration) | Export: every checkpoint's metadata, account by account (UUIDs must be known or guessed). No reconcile: that also needs `RECOVERY_MODE` and the anchor, which only the owner's Cloudflare configuration can set | 404 public `fetch`; the checker rejects routes, `workers_dev`/`preview_urls` other than `false`, and admin bindings in the six templates | No public route or preview URL, ever; authentication in code for any network path (B) |
| T2 | App or private-sync code is compromised and reaches admin | Same as T1, from inside | Those configs cannot bind the entrypoint (checker); private-sync rebuilds requests with only two headers (`worker.mjs:35,76`) | Keep the admin binding in its own seventh config, outside the runtime set |
| T3 | The owner's Cloudflare account or API token is compromised | Everything, including the anchor variables | Out of scope for this code | 2FA, a scoped API token for the admin session only, and token rotation after use |
| T4 | A checkpoint is tampered with in custody | A forged checkpoint could raise generations or mark an account deleted on reconcile (monotonic: it cannot undo a deletion) | The anchor digest must match; dry-run first | The digest is kept **apart** from the file and verified offline before it becomes an anchor |
| T5 | A stale checkpoint is used after a newer deletion | Recovery certifies old state | Monotonic merge; "an older export cannot prove absence of newer deletion" | Export after **every** deletion decision; keep a latest-decision inventory |
| T6 | Custody is lost | No recovery from a simultaneous rollback | Recovery stays paused (fail closed) | Two independent copies: a password manager and an offline copy |
| T7 | Checkpoint contents leak (screenshots, logs, chat) | Account metadata | — | No printing to the terminal; files are encrypted at rest; never paste into support |
| T8 | The admin config is deployed by accident | T1 | — | Refuse to deploy it: a guard in the checker plus a local-only name |

## Constraints
- **Defaults stay unchanged.** The six runtime templates and `activation-check.mjs` rules stay as they are; the admin caller is additive.
- **Free.** Workers Free, Access Free (up to 50 users), and no paid add-on.
- **Owner's custody.** Checkpoints must leave Cloudflare into the owner's own custody. Automation that stores them inside the same Cloudflare account does not count as external custody.
- **Scope.** Recovery is one account at a time, as today. This ADR does not change the lifecycle Worker, its endpoints or the checkpoint format.

## Options

### A. Local owner CLI with a remote service binding (no deployed surface)
- **What:**
  - A tiny local-only admin Worker (`scripts/run11/recovery-admin/worker.mjs`, about 60 lines).
  - It is run by the owner with `wrangler dev` on 127.0.0.1, and a wrapper script calls it: `node scripts/run11/recovery-admin.mjs export|dry-run|reconcile --account <uuid>`.
  - Its private config `<prefix>.recovery-admin.owner.jsonc` (git-ignored, mode 0600, inside the checkout like the Stage 4 copies) declares one binding:
    `services:[{binding:"ADMIN", service:"<lifecycle worker name>", entrypoint:"LifecycleRecoveryAdmin", remote:true}]`,
    with no routes, `workers_dev:false`, `preview_urls:false`, and no other bindings.
  - wrangler 4.144's `config-schema.json` accepts `entrypoint` and `remote` on a service binding in local development.
  - **UNVERIFIED:** the runtime behaviour of a *named-entrypoint* remote binding on the owner's account, and whether the remote proxy session is itself reachable. Verify both in the Stage 5 rehearsal (test plan step 4) before relying on it.
- **Authentication:** the owner's own Cloudflare login (OAuth or a scoped API token) is what opens the remote binding. Nothing is deployed, and nothing listens except on the owner's loopback while the command runs.
- **Owner setup (about 30 min):**
  1. Generate the admin config with the Stage 4 generator (new `--recovery-admin` flag). Check it with `activation-check.mjs --private --admin`.
  2. Run `wrangler login`, or export a token scoped to *Workers Scripts: Edit* on this account only.
  3. Export: `recovery-admin.mjs export --account <uuid> --out <file>`. It writes the checkpoint file and prints only the digest and a record count.
  4. Custody (below).
  5. For a recovery: set `RECOVERY_MODE=reconcile` and the anchor variables on the lifecycle Worker (Stage 7 procedure), then `dry-run`, then `reconcile`, then re-export and compare digests.
- **Custody:**
  - The checkpoint file goes into the owner's password manager as an attachment, in a vault item named per account and date.
  - The digest goes into a **separate** item or note, with the date and the deletion decision it follows.
  - An offline copy goes on an encrypted USB stick (for example an `age`- or `gpg`-encrypted file, kept off-line).
  - The CLI can verify a file against a digest with no network (`recovery-admin.mjs verify --file --digest`), using the same canonical hashing as `scripts/run11/lifecycle-recovery.test.mjs:31`.
- **How the default stays safe:**
  - The six runtime templates never gain the binding.
  - The checker gets an `--admin` mode that accepts exactly one ADMIN remote binding and rejects routes, `workers_dev`, `preview_urls`, triggers, other bindings and `account_id`. It also **fails any deploy path** given that file: `check-deployment-configs` and the Manual Alpha workflow refuse `*.recovery-admin.*`.
  - The file name and the Worker name carry `local-only`.
- **Cost:** free. **Rollback:** delete the private config; nothing remote changes.
- **Test plan:**
  1. Checker unit tests: accept one ADMIN remote binding; reject each forbidden field; refuse the file in deploy checks.
  2. Miniflare: the admin Worker with a *local* service binding to `LifecycleRecoveryAdmin` runs export → offline verify → dry-run (anchor mismatch 409, wrong mode 503) → reconcile → replay. This reuses the `lifecycle-recovery.test.mjs` harness, with the outbound service throwing.
  3. Negative checks: the app and private-sync configs still cannot reach `/admin/*`, and the CLI never prints checkpoint content.
  4. Owner rehearsal on a **non-production** lifecycle Worker with a fictional account (Stage 5/8): confirm the named-entrypoint remote binding works, and that no public URL is created (check the account's Workers list and routes before and after).
- **Effort:** 0.5–1 day of code and tests, plus a 1-hour owner rehearsal.
- **Risk:** the remote proxy session is wrangler behaviour, not ours, which is why step 4 checks it. If a wrangler version drops named-entrypoint remote bindings, the CLI fails closed, and no exposure follows.

### B. Deployed admin Worker behind Cloudflare Access
- **What:**
  - A separate Worker `zigoals-recovery-admin` on a dedicated hostname (for example `recovery-admin.<owner zone>`), protected by a Cloudflare Access application: one allowed identity, with an MFA-required policy.
  - The Worker **also** verifies the `Cf-Access-Jwt-Assertion` JWT against the team's JWKS and the application AUD in code, so a missing or misconfigured Access policy still gets 403.
  - It has a service binding to `LifecycleRecoveryAdmin`, with `workers_dev:false` and `preview_urls:false` (otherwise those URLs bypass Access).
- **Owner setup (1–2 h):** set up the Zero Trust team (free), the Access application and policy, the DNS route, the AUD and team domain as Worker variables, deploy through a separate approved workflow, and test with a non-admin identity.
- **Custody:** same as A. The browser download goes straight to the password manager and the offline copy.
- **How the default stays safe:** it is a seventh config that the checker validates separately (the Access JWT check is required in the code, and no `workers.dev` or preview URLs are allowed). It is never bound to the app, and the Manual Alpha workflow never deploys it.
- **Cost:** free (Access Free up to 50 users).
- **Test plan:** unit tests for JWT verification (valid, expired, wrong AUD, wrong issuer, missing header); Miniflare end-to-end as in A; an owner check that the hostname without Access returns 403; a check that `workers.dev` is disabled.
- **Effort:** 1.5–2 days, plus owner setup.
- **Risk:** it adds a permanently reachable hostname and a second authentication system to keep correct. A single misconfiguration (a preview URL, a policy set to "Everyone") is exposure T1. It also relies on JWT code being right.

### C. Scheduled export only (Cron-triggered admin Worker), later
- **What:** a Worker with no route that, on a Cron trigger and after each deletion decision (queued), exports checkpoints. It encrypts them to an owner public key (age/X25519) and delivers them off-platform, for example by email to the owner through the existing provider. The encrypted file and digest go to the owner's mailbox; the owner then files them in the password manager.
- **Why only later:** it covers **export** (T5, freshness) but not dry-run or reconcile, which must stay manual. It needs an account inventory to know which accounts to export. It adds a delivery provider to the recovery path. Most useful when there are more accounts than the owner can export by hand.
- **Cost:** free within Workers Free and the email provider's free tier. **Effort:** about 1 day plus custody design. **Default safety:** no route, no preview URL, output encrypted to a key the platform never holds.

### Considered and rejected: D. `workers.dev` admin Worker with a shared bearer secret
- It puts a publicly reachable admin endpoint behind one long-lived secret. A leaked secret (logs, shell history, screenshots) is full export access, and there is no second factor.
- It is rejected for T1, T3 and T7.

## Recommendation
- **Choose A.** It closes the Stage 5 gap with **no deployed surface**. The only credential is the owner's own Cloudflare login, which already controls the anchor variables. It is free, small (0.5–1 day) and removable.
- **Custody:** the checkpoint file in the password manager and the digest in a separate entry, plus an encrypted offline copy. Export after every deletion decision.
- **Revisit C** once account numbers make manual export after each deletion impractical. Prefer A over B unless the owner needs to act from a device without the repository.
- **Until approved:** Stage 5 stays as documented (`RECOVERY_MODE=reconcile`, nothing binds the admin entrypoint), and hosted recovery is not relied on.
