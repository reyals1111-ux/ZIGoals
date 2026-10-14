# Pre-launch security run (early November 2026)

Session AB-Cloud Part 10 (ADR-023 C31). One sitting, about two hours, on the build you intend to open to more people,
before the invite list grows beyond the friends' Alpha. Every step is read-only or runs against the isolated acceptance
services; nothing here deploys, dispatches a workflow or touches a wallet, a key or a contract. Record each row as
**pass** or the first sentence that differed, in a copy of this file under `docs/verification/`.

## 1. The build and its record (15 min)
| # | Check | How | Pass |
|---|---|---|---|
| 1.1 | The candidate is `main` and its CI is green | Actions → Milestone quality on the SHA: every job green (the WebKit shards are advisory) | all required jobs green |
| 1.2 | No secret in the tree | `node scripts/check-secrets.mjs` | no finding |
| 1.3 | Dependencies | `pnpm audit --prod --audit-level high`; compare `pnpm-lock.yaml` with the last reviewed one | no high; no unreviewed new package |
| 1.4 | The live build is the one you think | `EXPECTED_COMMIT=<sha> node scripts/verify-hosted-alpha.mjs <new dir>` | PASS (or only the price review reason, ALPHA_PRICES_ROLLOUT.md) |

## 2. Headers, egress and the public surface (20 min)
| # | Check | How | Pass |
|---|---|---|---|
| 2.1 | CSP, HSTS, frame and referrer headers on `/app` | the verifier's header stage, and `curl -sI https://alpha.zigoals.app/app` | as in `apps/web/lib/csp-compose.mjs` and `docs/security/` |
| 2.2 | The browser talks only to reviewed origins | the verifier's `requestOrigins` | only the app, the testnet RPC/REST and (landing) Google Fonts |
| 2.3 | The recipe route refuses before fetching | the verifier's "Recipe import refuses…" stage | NOT_HTTPS, PRIVATE_HOST, INVALID_URL, each 400 |
| 2.4 | Rate limits | `scripts/run11/auth-abuse.test.mjs` and the recipe route's unit tests (Miniflare, local) | green |

## 3. Accounts, sync and the extras (40 min, acceptance services)
| # | Check | How | Pass |
|---|---|---|---|
| 3.1 | Two devices, one account: records and extras travel encrypted | STAGE8_OWNER_RUNSHEET rows 15, 15h, 15i | as written |
| 3.2 | A revoked device and a rotated key | OWNER_SIGN_OUT_EVERYWHERE.md; Settings → Rotate vault encryption on Desktop A, then sync Phone B | Phone B needs the secret again; the extras wait, then travel (ADR-023 C28 finding 2) |
| 3.3 | Health deletion removes Health and its extras | Settings → Delete a section → Health on Desktop A | the cloud holds no Health section and no Health extras (the Worker removes both in the same step); Phone B says Health was deleted and asks before syncing Health again |
| 3.4 | Account erase | OWNER_RECOVERY_ADMIN.md "Erase an account" with a fictional account | every key gone; a second erase says so |
| 3.5 | Older build | open the previous Alpha (rollback floor #32) against the same account | it reads finance v5 and ignores the extras; nothing is refused |

## 4. This device's data (25 min)
| # | Check | How | Pass |
|---|---|---|---|
| 4.1 | Export everything holds no key | export with ZIGi connected to a key; search the ZIP for the key's first characters | absent |
| 4.2 | Restore refuses what is not an export, and changes nothing before the confirmation | a renamed text file; then a real export with every part left as is | a plain sentence; nothing changed |
| 4.3 | Restore never turns Health sync on | restore Health with Health sync off | Health sync stays off |
| 4.4 | Point & tell keeps no form values | turn it on, pin a filled form field, read the note's target | the field's label, never its value; the path has no query |

## 5. People (20 min)
| # | Check | How | Pass |
|---|---|---|---|
| 5.1 | The invite list | Supabase → the allowlist; remove anyone who should not be there | only intended addresses |
| 5.2 | The owner's own sessions | Settings → Devices and sessions on your own account | only your devices |
| 5.3 | Where reports go | `contact@zigoals.app` (feedback) and `hello@zigoals.app` (security) reach you; SECURITY.md names the second | both arrive |

## After the run
- File every finding as a row in `docs/STATUS.md` "Owner items" with its severity; a high finding stops the wider launch.
- Keep the verifier's output directory with the copy of this file.
