# Owner recovery administration: runbook (ADR-007 option A)

**Status (2026-10-01):** the tool, the config checks and the local end-to-end tests are done (Session H). Two things are **UNVERIFIED** until the Stage 7 rehearsal below passes on your account:
- that wrangler's remote binding to the named `LifecycleRecoveryAdmin` entrypoint works;
- that the temporary remote session it opens is not reachable by anyone else.

Do not rely on hosted recovery before then.

## What it is
- One local command, `node scripts/run11/recovery-admin.mjs`, run from your ops checkout.
- It starts a small admin Worker on your own computer (127.0.0.1) for the length of one command, then stops it. Nothing is deployed and there is no URL.
- The admin Worker reaches the lifecycle Worker's recovery entrypoint through a remote service binding. Your own Cloudflare login opens that binding; there is no other credential.
- Every command except `verify` first checks your ignored configs. It refuses unless the admin config binds **only** the private lifecycle Worker that your private-sync config uses and (since Session U) that private-sync Worker's own erase entrypoint, and unless no other config binds either recovery entrypoint.
- It prints digests, counts and file paths only. It never prints checkpoint contents, the account UUID, or wrangler's own output (that can include your login email).

| Command | Contacts Cloudflare | What it does |
|---|---|---|
| `status` | no | Checks the configs; shows the target Worker name, `RECOVERY_MODE`, whether an anchor is set locally, the wrangler version |
| `export --account <uuid> --out <file>` | yes | Writes `{checkpoint, digest}` to a **new 0600 file outside the checkout**; prints the SHA-256 digest |
| `verify --file <file> --digest <sha256>` | no | Checks a custody copy against its separately kept digest. Works anywhere, without configs |
| `dry-run --account <uuid> --file <file> --digest <sha256>` | yes | Asks the Worker whether the checkpoint would apply; changes nothing |
| `reconcile --account <uuid> --file <file> --digest <sha256>` | yes | Dry run, then you **type** the account UUID and the digest, then reconcile, re-export and compare digests |
| `erase --account <uuid> --out <file>` | yes | Exports first, then you **type** the account UUID and that export's digest, then the deletion is recorded, re-exported and, while the lifecycle Worker serves, the encrypted vault rows are removed (Sessions S and U; see "Erase an account") |

## One-time setup (after Stage 4, about 15 minutes)
> **Session U (2026-10-05): a copy made before Session U must be made again.** The admin config now has a second binding, `VAULT_ADMIN`, to the private-sync Worker's `PrivateVaultRecoveryAdmin` entrypoint (erase uses it to remove the vault rows). The tool refuses an old copy ("exactly two remote bindings are required"). In the ops checkout: move the old `workers/recovery-admin/wrangler.acctest.owner.jsonc` out of the checkout (for example into your custody folder; it holds no secret), then run step 2 below again. Do this after the private-sync Worker of this PR is deployed (FINAL_ACCTEST_REDEPLOY.md, "Session U changes").

1. In the ops checkout, on the reviewed commit: `node scripts/doctor.mjs`.
2. Create the seventh private config. It is written as `workers/recovery-admin/wrangler.acctest.owner.jsonc`, 0600 and ignored by git:
   ```sh
   node scripts/run11/make-private-configs.mjs --recovery-admin
   node scripts/run11/activation-check.mjs --admin     # PASS
   node scripts/run11/recovery-admin.mjs status        # nothing is contacted
   ```
3. Never deploy that config, and never add routes, `workers_dev`, vars or other bindings to it. `activation-check` refuses all of these.
4. Your Cloudflare login, for each session in which you use the tool:
   - Run `pnpm --filter @zigoals/web exec wrangler login` (browser sign-in, with 2FA on the account).
   - Or, for that shell only, export an API token limited to this account (Workers Scripts: Edit). Use `CLOUDFLARE_API_TOKEN` plus `CLOUDFLARE_ACCOUNT_ID`.
   - If your login can see more than one Cloudflare account, also set `CLOUDFLARE_ACCOUNT_ID` in that shell. The tool runs wrangler without a prompt, so wrangler cannot ask you which account to use.
   - Never write these into a file in the checkout.
   - After the session, run `wrangler logout` or revoke the token.

## Stage 7 rehearsal (required once, before relying on the tool)
Use fictional data and a separate, non-production lifecycle Worker. This needs the Stage 7 approval to deploy that one rehearsal Worker.

Run every command from the checkout root. `pnpm --filter @zigoals/web exec` runs wrangler inside `apps/web`, so wrangler config paths are written as `"$PWD/…"`.

**What wrangler 4.144 does, read from its code but not yet observed** (Session S, 2026-10-04: 4.147.0's config schema still accepts `entrypoint` and `remote` on a service binding, and its changelogs since 4.144.0 name no change to remote bindings or `wrangler dev`; still UNVERIFIED until the rehearsal):
- `remote: true` opens a "remote proxy session".
- It uploads a temporary edge-preview proxy Worker, named after the admin Worker, to your `workers.dev` subdomain.
- That proxy is what holds the real binding.
- If the account has no `workers.dev` subdomain, wrangler creates one.

The rehearsal checks all of this.

1. **Before.** In the Cloudflare dashboard (Workers & Pages), write down:
   - the list of Workers;
   - each Worker's routes and custom domains;
   - the account's `workers.dev` subdomain.
2. **Rehearsal checkout.** Clone the repository into a separate folder and check out the same commit. Then generate fictional-prefix configs there:
   ```sh
   node scripts/run11/make-private-configs.mjs --auth-ref <your project ref> --workers-subdomain <subdomain> \
     --app-origin https://<isolated-app-host> --name-prefix <prefix>-rehearsal --market-account-id rehearsal --market-policy-file <policy.json>
   node scripts/run11/make-private-configs.mjs --recovery-admin
   ```
   In the rehearsal lifecycle copy (`workers/private-sync/wrangler.lifecycle.acctest.owner.jsonc`), add two vars. Both are fictional; they are the fixture's account and digest:
   - `"RECOVERY_ACCOUNT_ID": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"`
   - `"RECOVERY_CHECKPOINT_SHA256": "33e70212b302c80fd63479ace8c50f52581c4714a11940e826d571ea8f86e637"`

   Keep `RECOVERY_MODE` at `reconcile`, and put no secret on this Worker. Then:
   ```sh
   node scripts/run11/activation-check.mjs --admin
   pnpm --filter @zigoals/web exec wrangler deploy --config "$PWD/workers/private-sync/wrangler.lifecycle.acctest.owner.jsonc"
   ```
   Deploy the lifecycle copy only, not the other five.
3. **Fixture.** Copy the fixture outside the checkout, 0600:
   ```sh
   mkdir -p ~/zigoals-rehearsal && install -m 600 scripts/run11/fixtures/recovery-rehearsal-checkpoint.json ~/zigoals-rehearsal/fixture.json
   node scripts/run11/recovery-admin.mjs verify --file ~/zigoals-rehearsal/fixture.json --digest 33e70212b302c80fd63479ace8c50f52581c4714a11940e826d571ea8f86e637
   ```
   Expected: `MATCH`.
4. **The remote binding works.**
   ```sh
   node scripts/run11/recovery-admin.mjs export --account aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa --out ~/zigoals-rehearsal/before.json
   ```
   Expected: `Exported … Receipts: 0`, because the rehearsal authority is empty. A refusal or a start failure here means the named-entrypoint remote binding did not work. Stop and go to **Fallback**.
5. **Nothing else can reach it.**
   - In a second terminal, start the admin Worker by hand without a session token. It then refuses every request itself. The empty, private dev registry keeps it apart from any other local wrangler session (the pinned Wrangler has no `--disable-dev-registry` flag: 4.144.0, and 4.147.0 since Session S; `scripts/wrangler-cli-surface.test.mjs` checks it):
     ```sh
     WRANGLER_REGISTRY_PATH="$(mktemp -d)" pnpm --filter @zigoals/web exec wrangler dev --config "$PWD/workers/recovery-admin/wrangler.acctest.owner.jsonc" --ip 127.0.0.1 --port 8799
     ```
   - While it runs, use another device on another network (for example a phone on mobile data, not signed in to Cloudflare). Open `https://<admin Worker name>.<workers.dev subdomain>.workers.dev/` and `/admin/export` there.
   - Expected: no JSON from ZIGoals, only a Cloudflare error page or nothing.
   - Then stop wrangler with Ctrl-C.
   - The session report lists one more probe for this step.
   - **Any** ZIGoals JSON (for example `IDENTITY_REQUIRED` or a checkpoint) is a failure. Stop, revoke your login or token, and go to **Fallback**.
6. **Dry run and reconcile.**
   ```sh
   node scripts/run11/recovery-admin.mjs dry-run --account aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa --file ~/zigoals-rehearsal/fixture.json --digest 33e70212b302c80fd63479ace8c50f52581c4714a11940e826d571ea8f86e637
   node scripts/run11/recovery-admin.mjs reconcile --account aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa --file ~/zigoals-rehearsal/fixture.json --digest 33e70212b302c80fd63479ace8c50f52581c4714a11940e826d571ea8f86e637
   ```
   - Expected: `DRY RUN OK`, then two prompts, then `RECONCILED` with "Re-export digest matches".
   - Run the reconcile again. Expected: `ALREADY RECONCILED`.
   - `export` to `~/zigoals-rehearsal/after.json`. Expected: `Receipts: 1`.
7. **A wrong anchor is refused.**
   - Run `dry-run` with `--file ~/zigoals-rehearsal/before.json` and `--digest` set to `before.json`'s digest.
   - Expected: "Refused: the recovery anchor in the private lifecycle config names another account or digest. Nothing was sent." The CLI refuses before the Worker is asked; the Worker's own anchor check is covered by the local tests.
8. **After.**
   - Compare the dashboard with step 1. Only the rehearsal lifecycle Worker should be new.
   - No new route, custom domain, or `workers.dev` subdomain should appear (a subdomain counts only if you already had one).
   - Any other new Worker, route or subdomain is a failure. Record it.
9. **Teardown.**
   - Delete the rehearsal lifecycle Worker in the dashboard.
   - Run `wrangler logout`, or revoke the token.
   - Delete `~/zigoals-rehearsal` and the rehearsal checkout.
10. **Receipt.** Record pass or fail for steps 3–8 with the date, the wrangler version and the commit, in [STAGE8_ACCEPTANCE.md](STAGE8_ACCEPTANCE.md) (recovery section). Add no account names, emails or URLs.

The rehearsal passes only if steps 3, 4 and 6 succeed and steps 5, 7 and 8 show nothing unexpected.

## When to export
- **After every deletion decision.** That means an account deletion or a section deletion you learn about, from the app, from a friend, or from your own test. Export that account the same day.
- **On a fixed schedule** (for example weekly) for every account in your account inventory. An older export cannot prove that no newer deletion happened.
- **Before any restore**, export the authority's current state to a new file first, even if it looks damaged.
- Keep a short inventory outside Cloudflare (a Bitwarden secure note). For each account label, record the latest export date and digest, plus the deletion decision it follows. Account labels can be your own nicknames; the UUID belongs in the items below, not in titles.

## Custody (owner decision: Bitwarden plus an offline encrypted copy)
For each export:
1. **Bitwarden item 1, the file.** Title: `ZIGoals checkpoint — <label> — <date>`.
   - Attach the exported file. Bitwarden attachments need a Premium or Families plan.
   - Without attachments, paste the file's text into the item's notes, if it fits Bitwarden's note length limit (small accounts do). Then check the pasted text: paste it into a new 0600 file and run `verify` against the digest. A large checkpoint stays offline only (step 3).
2. **Bitwarden item 2, the digest, kept separately.** Title: `ZIGoals checkpoint digest — <label> — <date>`. It holds:
   - the 64-character digest;
   - the date;
   - the deletion decision it follows.
   Never put it in the same item as the file. The digest is the reconciliation anchor, so it must be possible to check the file against it independently.
3. **Offline copy (macOS Disk Utility).**
   - Choose File → New Image → Blank Image.
   - Settings: size 100 MB, format APFS, **Encryption: 256-bit AES**, Image Format "read/write disk image".
   - Use a strong passphrase. Keep it in Bitwarden as a third item, or memorise it.
   - Copy the checkpoint file into the mounted image and run `verify` on the copy, then eject.
   - Keep the `.dmg` on a USB stick that stays offline. Optionally keep a second stick in another place.
4. Delete the working copy from your home folder once both copies verify.
5. **Never** put a checkpoint or digest into:
   - chat, support tickets, issues or email;
   - screenshots;
   - an unencrypted cloud folder;
   - this repository.

If the latest checkpoint or the inventory is lost, recovery stays paused (fail closed). Do not substitute an older file.

## Restore and reconcile (one account at a time)
Use this when the lifecycle authority lost history (a point-in-time restore, a rebuilt Worker, or a simultaneous vault and authority rollback).
1. **Keep the lifecycle Worker in `RECOVERY_MODE=reconcile`** (owner decision: deployed in reconcile mode). Private sync then refuses reads, writes and re-enrollment (503). That is expected.
2. **Export the current state first** to a new file (see "When to export").
3. **Take the latest checkpoint for the account from custody.** Run `verify` against the digest from the **separate** Bitwarden item. If it says MISMATCH, try the offline copy. If both mismatch, stop.
4. **Set the anchor on the lifecycle Worker:**
   - `RECOVERY_ACCOUNT_ID` = the account UUID;
   - `RECOVERY_CHECKPOINT_SHA256` = the verified digest.

   Put them in your private lifecycle copy and deploy that Worker only, as an approved change. These are vars, not secrets. They are personal, and the file is ignored by git.
5. `node scripts/run11/recovery-admin.mjs dry-run --account <uuid> --file <file> --digest <digest>`, then read the result digest.
6. `… reconcile …` (same arguments). Type the UUID and the digest when asked. Expected: `RECONCILED`, with "Re-export digest matches".
7. `export` again to a new file, and put it into custody (new Bitwarden items, offline copy).
8. Repeat from step 3 for the next account. The anchor names one account at a time.
9. **Return to serve:**
   - only after every restored account is reconciled and checked against the inventory;
   - and only by an **explicit owner decision**: an approved deploy with `RECOVERY_MODE=serve`, removing the anchor vars in the same change.
   - Never because a storage restore finished. One account's receipt does not certify the whole restored population.

## If something fails
| You see | Meaning | Do this |
|---|---|---|
| `wrangler dev did not start the recovery admin Worker` | Login missing or expired, no network, or the remote session failed | Run `wrangler whoami`, then `wrangler login`, and retry once. Do not paste wrangler's output anywhere public: it can include your email |
| `binds the recovery admin entrypoint` / `not mode 0600` / `missing` | A config is unsafe or missing | Fix the named file; `activation-check.mjs --admin` must PASS. Never relax the check |
| `not in RECOVERY_MODE=reconcile` (from the CLI or the Worker) | The lifecycle Worker serves, or its anchor is not set for this account | Restore step 1 or 4. Dry run and reconcile never run in serve mode |
| `not the anchor configured on the Worker` | The Worker's anchor digest differs from this file | Re-check custody. Never change the anchor to fit a file you cannot verify |
| `MISMATCH` / `changed after export` | This file is not the one you exported | Use the other custody copy. If both fail, recovery stays paused |
| `conflicts with the stored history` | Incompatible histories (409) | Keep both files and stop. This is an administrative error, not permission to reset |
| `receipt history is incomplete` / `capacity` | The stored or supplied history is incomplete, or above a limit | Stop. Keep everything as it is |
| `re-export digest … differs` | Something changed during reconcile | Keep recovery paused. Export to a new file and compare |
| Rehearsal step 4, 5 or 8 fails | Option A is not safe on this account or wrangler version | Stop using option A, then see **Fallback** |

## Fallback: ADR-007 option B
If the rehearsal fails, Stage 5 stays manual and paused. The lifecycle Worker stays in `reconcile` and nothing binds the entrypoint. Hosted recovery is not relied on.

Option B is the alternative: a deployed admin Worker behind Cloudflare Access, which also checks the Access JWT in code. See [ADR-007](../architecture/ADR-007-owner-recovery-admin.md). It needs its own approved PR and setup.

## Erase an account (Session S, FIX_PLAN H1)
**When to use it:** a friend asks for deletion but can no longer sign in, because they lost their email or every device. If they can sign in, the in-app "Delete cloud records" path is better: it also removes the encrypted rows at once (INCIDENT_RUNBOOK §3).

**What it does:**
1. Checks the configs, like every command.
2. **Exports** the account's current state into a **new 0600 file outside the checkout**, and prints its digest.
3. Asks you to **type** the account UUID, then the digest it just printed.
4. Asks the lifecycle Worker to record the deletion. The Worker applies it only if the account's current state still has exactly that digest; otherwise you see "the account changed after the export" and nothing happens.
5. **Re-exports** to `<file>-after-erase.json` and prints the new digest. Put both files and both digests into custody as separate items ("Custody" above).
6. **Removes the encrypted vault rows** (Session U), through the private-sync Worker's own erase: exactly what the app's "delete cloud data" does (every row, then the marker that refuses the account). Private sync does this only when the lifecycle Worker reports the account deleted, so only while the lifecycle Worker is in `RECOVERY_MODE=serve`. In `reconcile` the command prints `Encrypted vault rows: NOT REMOVED YET`; run `erase` again for that account after the switch to `serve` (a new `--out` file): it reports `ALREADY DELETED` and removes the rows.

**What the deletion is:** the same as the app's "delete account":
- the deletion decision, recorded with a fixed owner marker instead of a session;
- a request to delete the sign-in identity.

From then on, private sync refuses that account (410) and no device can enrol it again. The lifecycle alarm deletes the Supabase user once the Worker is in `RECOVERY_MODE=serve`. In `reconcile` it stays "pending" until then.

**What it does not do:** it cannot reach copies outside the service: a friend's devices, their exports and backups, and the Cloudflare and Supabase backups for their own retention periods. Before Session U the encrypted vault rows also stayed stored; with this version they are removed (step 6). Tell the friend, as INCIDENT_RUNBOOK §3 says.

**Running it:**
```sh
node scripts/run11/recovery-admin.mjs erase --account <uuid> --out ~/zigoals-custody/<label>-erase-<date>.json
```
- Expected: `ERASED: identity deletion pending…` (or `already done`), then `Encrypted vault rows: REMOVED` (or `NOT REMOVED YET` in reconcile mode), then the re-export path and digest.
- `ALREADY DELETED` means the account was deleted before; the command then only asks for the identity deletion if it was still retained.

**Rehearsal on the final acceptance redeploy day** (fictional account, after the recovery rehearsal steps 4 and 6; [FINAL_ACCTEST_REDEPLOY.md](FINAL_ACCTEST_REDEPLOY.md)):
1. Use a fictional account that already exists in the acceptance services. Note its UUID in your private notes only.
2. Run `erase` for it.
   - Expected: two prompts, `ERASED: identity deletion pending`, and two files at 0600.
3. Run `verify` on both files against their printed digests.
   - Expected: `MATCH` twice.
4. Run `export` again to a third file.
   - Expected: the same digest as the `-after-erase` file, which means nothing changed in between.
5. The lifecycle Worker stays in `RECOVERY_MODE=reconcile` until the Stage 8 row that switches it to `serve`, so the identity deletion and the vault rows wait (step 2 printed `Encrypted vault rows: NOT REMOVED YET`).
   - After that switch, run `erase` for the same fictional account again (a new `--out` file). Expected: `ALREADY DELETED`, then `Encrypted vault rows: REMOVED`.
   - After that switch, the fictional Supabase user disappears within about a minute (Authentication → Users).
   - Signing in again with that inbox is refused.
   - This also proves Session S Part 1's header form.
6. Record pass or fail in your STAGE8_ACCEPTANCE copy, recovery section, with no UUID, email or digest.

## Why this is safe by default
- No runtime config can bind the recovery entrypoint. `activation-check` scans every Worker config in the checkout, including your ignored copies.
- The admin config is refused if it gains a route, `workers_dev`, preview URLs, triggers, vars, an account id or any second binding.
- The admin Worker listens on 127.0.0.1 only, for one command. Its dev registry is a fresh, private folder inside the run's temporary directory (`WRANGLER_REGISTRY_PATH`), deleted afterwards, so no other local wrangler session can see or bind it. Each request must carry a random per-run session token, so other local programs and web pages cannot use the port.
- Reconcile needs reconcile mode and the Worker's own anchor, and both typed confirmations. It is followed by a re-export check.
