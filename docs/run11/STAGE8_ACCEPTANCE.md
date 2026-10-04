# Stage 8 acceptance sheet (real acceptance and private recovery)

A fillable copy of every check in [ACTIVATION.md](ACTIVATION.md) Stage 8, plus the Stage 7 recovery-admin rehearsal.

**Session M changed how unlocking works** ([ADR-008](../architecture/ADR-008-remember-this-device.md), "remember this device"), and the local copy and account deletion no longer need a download. Run the account rows (A5–A7, B1, B7–B10 and section F) on a build that includes PR B of Session M.

**How to use it:**
- Make a copy outside the repository for each run, for example in Bitwarden or a local folder, and fill it in there.
- Commit only a **sanitized** summary: pass or fail per row and the receipt IDs. Leave out everything listed under "Never record" below.

**Run**

| Field | Value |
|---|---|
| Date (UTC) | |
| Source commit (full SHA, the reviewed Stage 7 commit) | |
| App build version shown in Settings | |
| Environment | nonproduction acceptance (never the live Alpha) |
| Stage 7 preflight (`node scripts/run11/stage7-preflight.mjs`) | READY / READY with known Stage 6 items |
| Tester | owner |

**Result values:**
- **PASS**: behaved as expected.
- **FAIL**: did not. Add a receipt and stop that row's group.
- **NOT RUN**: give the reason.

**Devices and inboxes** are labels only:
- Desktop A: OS family and browser family/major, for example "macOS · Chrome 141".
- Phone B: a physical phone, OS family and browser.
- Inbox 1 and Inbox 2: two controlled inboxes, named by label only.

## A. Sign-in and sessions (two inboxes, desktop and physical phone)
| # | Check | Expected | Result | Receipt |
|---|---|---|---|---|
| A1 | Wrong one-time code | Refused with a plain message; no session | | |
| A2 | Expired code | Refused; a new code can be requested after the cooldown | | |
| A3 | Reused code | Refused | | |
| A4 | Send cooldown | A second request inside the cooldown is refused, with the wait shown | | |
| A5 | Sign out | The session ends on that device; private reads need a new sign-in | | |
| A6 | Revocation | Signing out everywhere (or revoking) denies the other device on its next request | | |
| A7 | Lock and account switch | Locking hides account records. Switching to Inbox 2's account shows none of Inbox 1's data | | |

## B. Private data and sync (fictional data only)
| # | Check | Expected | Result | Receipt |
|---|---|---|---|---|
| B1 | Local attachment | Existing local records attach to the account after explicit review, in place with no file to save; the originals stay on the device; nothing is silently merged | | |
| B2 | Four-domain sync | Goals/positions, Habits, Health and settings each sync desktop ↔ phone | | |
| B3 | Explicit Health consent | Health stays local until consent is given; it syncs only after that | | |
| B4 | Offline edits | Edits made offline on both devices upload on reconnect | | |
| B5 | Conflict review | A real conflict pauses sync and offers review; nothing is overwritten silently | | |
| B6 | Correction and funding replay | A correction and a funding event replay once; no duplicate after retry or reload | | |
| B7 | Key rotation | Rotation completes; the next recovery secret was saved first | | |
| B8 | Old-key denial | A device or backup still on the old key is refused after rotation | | |
| B9 | Section deletion | Deleting one cloud section removes it everywhere; the other sections stay | | |
| B10 | Stale-device denial | A device that missed a deletion cannot bring the deleted section back | | |
| B11 | Encrypted backup restoration | An encrypted backup restores on a fresh profile with the recovery secret; a wrong secret is refused | | |
| B13 | What syncs from the new features | An automatic check-in, a planned skip, an imported Wealth holding and an imported meal made on one device appear on the other as ordinary records; the link rules, health goals, reviews, fasting sessions and insight dismissals stay on their device | | |

## C. Device and providers
| # | Check | Expected | Result | Receipt |
|---|---|---|---|---|
| C1 | Camera permission | The barcode scanner asks; a refusal shows a plain message and manual entry still works | | |
| C2 | Camera cancel | Cancelling the scan leaves the food log unchanged | | |
| C3 | Physical barcode | A real product barcode finds the product (or "not found"), at most 5 lookups a minute | | |
| C4 | Bounded provider refresh | One real market refresh stays within the configured `MARKET_POLICY` budget; no extra dispatch | | |

## D. Hosted recovery (fictional accounts only)
Run the procedures in [OWNER_RECOVERY_ADMIN.md](OWNER_RECOVERY_ADMIN.md).

| # | Check | Expected | Result | Receipt |
|---|---|---|---|---|
| D0 | Stage 7 rehearsal, runbook steps 3–8 | MATCH, export of the empty authority, no outside reach, DRY RUN OK then RECONCILED then ALREADY RECONCILED, wrong anchor refused, no new Worker, route or subdomain besides the rehearsal Worker | | |
| D1 | Export after a deletion decision | Fictional account deleted, then `export`. The digest is recorded in custody (two Bitwarden items plus the offline image) | | |
| D2 | Custody check | `verify` of the Bitwarden copy and of the offline copy against the separately kept digest: MATCH | | |
| D3 | Point-in-time recovery (PITR) of the lifecycle authority | The restored authority stays in `reconcile`, so private sync refuses reads and writes (503) | | |
| D4 | Dry run and reconcile | DRY RUN OK, then RECONCILED, with "Re-export digest matches" | | |
| D5 | Old-client denial after recovery | A device that was offline during the deletion is refused (410) after reconcile | | |
| D6 | Return to serve | Only by explicit owner decision after D1–D5, with the anchor vars removed in the same change | | |

## E. Before inviting friends
| # | Check | Expected | Result | Receipt |
|---|---|---|---|---|
| E1 | Account-wide quotas re-checked | Cloudflare, Supabase, Resend and CoinGecko usage are within the free tiers, with headroom (ACTIVATION.md "Capacity and cost") | | |
| E2 | Spend controls | No paid upgrade or automatic reload is enabled | | |

## F. Remembered devices and downloads (Session M, ADR-008)
| # | Check | Expected | Result | Receipt |
|---|---|---|---|---|
| F1 | The choice | "Remember on this device — don’t use on shared computers" is unticked in a desktop browser tab and ticked in the iPhone Home Screen app; its warning is shown in both | | |
| F2 | Opening without the secret | A remembered device opens the vault without the recovery secret after a reload, in a new tab, after 15 idle minutes, and after closing and reopening the Home Screen app | | |
| F3 | Lock now and Forget | "Lock account vault" locks and forgets: the next open asks for the secret. "Forget this device" keeps the tab open, and the next open asks | | |
| F4 | Invalidation | Each of these makes the device ask for the secret again: sign-out; another account on the same browser; a new sign-in; key rotation on the other device (the old secret is refused, the new one works); revoking this device's session from the other device; deleting a cloud section or the account | | |
| F5 | Deletion without a download | Cloud deletion works with the typed confirmation alone. "Download a copy first (optional)" still downloads a copy that restores with its own secret | | |

## Receipt template (sanitized)
One receipt per FAIL, and per PASS that needs evidence:

```
Receipt ID:        S8-<row>-<n>          e.g. S8-B5-1
Date (UTC):        YYYY-MM-DD HH:MM
Source commit:     <40-character SHA>
Row:               <A1…E2>
Device / browser:  <Desktop A | Phone B> · <OS family> · <browser family major>
Inbox / account:   <Inbox 1 | Inbox 2> (labels only)
Steps:             1. … 2. … 3. …
Expected:          …
Observed:          …   (the app's own message text is fine; no personal values)
Result:            PASS | FAIL | NOT RUN (reason)
Evidence:          <none | screenshot of fictional data | log excerpt with identifiers removed>
Sanitized:         [ ] no email  [ ] no account/session/family UUID  [ ] no code, token or key
                   [ ] no host name of a private Worker  [ ] no real name or personal data
```

**Never record:**
- email addresses;
- one-time codes;
- account, session-family or vault UUIDs;
- tokens, keys or recovery secrets;
- checkpoint contents or digests of real accounts;
- private Worker host names or `workers.dev` subdomains;
- IP addresses;
- screenshots with real data.

Write "redacted" in their place.
