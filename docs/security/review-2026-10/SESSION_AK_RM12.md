# Session AK security review (RM12, Part 15)

Three independent reviewers who did not build the code read the AK branch against `main` (`7000807`) on 31 October 2026,
read-only, with the existing tests and their own scratch probes and fuzz harnesses (Miniflare for the push Worker;
mutation fuzzing for the bank-file and FIT parsers). Every High and Medium is fixed; Lows and Infos are fixed too unless
listed under "Recorded". Each fix has a test that fails on the previous code.

**Result: no High. 6 Medium (all fixed), 14 Low (all fixed), 14 Info (9 fixed or documented, 5 recorded below).**

## Areas and findings

| # | Area | Finding | Severity | Fix (commit) |
|---|---|---|---|---|
| R1-F1 | Push Worker | The hourly registration budget was counted before validation, so junk requests blocked every registration, refresh and Snooze for an hour | Medium | Budget counted only for a new, valid device after the endpoint and secret checks; per-client-group share; refreshes have their own per-device caps (`2e27d8c3`) |
| R1-F2 | Push Worker | Registrations with nothing to wake for were kept 30 days with a daily alarm (free-plan cost amplification) | Medium | Refused; no-next-wake devices get one alarm at their 30-day end; budgets sized to rows-written (`2e27d8c3`) |
| R1-F3 | Service worker | Pages with a query (share-target text, goal pre-fills, OAuth codes) were stored in Cache Storage | Medium | Only query-free pages (besides `_rsc`) are stored; never `/app/share` or the Spotify callback (`2e27d8c3`) |
| R2-M1 | Lichess | The token was device-wide and unsealed: another local account, a locked device or the Showcase could use it | Medium | Sealed per account scope in the sign-in store (AES-GCM, the Spotify pattern); never read while locked or in the Showcase (`bafa240c`) |
| R3-F1 | Account erase | Deleting the account deleted the push identity before telling the push Worker, leaving reminders arriving and the record unremovable | Medium | Notifications are turned off (DELETE with the device secret) before the database goes; best effort, capped (`fd074085`) |
| R3-F2 | Emergency sheet | The seed-phrase/private-key guard missed common layouts (bullets, numbering, quotes/JSON, split fields, non-English lists, grouped hex, base58, nsec, age, byte arrays) | Medium | Unicode word runs that skip numbering, all fields read together, grouped hex, the new key kinds; ordinary notes still print (`fd074085`) |
| R1-F4 | Notifications | Names could include Health-linked habits | Low | Linked habits never carry a name; unreadable links mean no names (`2e27d8c3`) |
| R1-F5 | Notifications | Locking did not refresh the snapshot (names for up to 10 min) | Low | Refresh on the lock event (`2e27d8c3`) |
| R1-F6 | Offline queue | A queued exchange read ran without a tap | Low | Offered as a toast with a one-time link; read only on the tap (`2e27d8c3`) |
| R1-F7 | Service worker | Unhashed assets were cache-first in an unversioned cache | Low | Cache-first only for `/_next/static/`; other assets network-first per build (`2e27d8c3`) |
| R1-F8 | Notifications | Turning off or erasing left shown notifications; the worker could re-create erased databases | Low | Shown notifications closed; databases never created by the worker (`2e27d8c3`) |
| R2-L1 | WalletConnect | A wallet could widen a read-only pairing into a signer | Low | Signing only on a pairing started for staking, intersected with the requested methods and chains (`bafa240c`) |
| R2-L2 | WalletConnect | Staking pairings were described as read-only | Low | Honest wording (`bafa240c`) |
| R2-L3 | Push Worker | One client could use the whole registration budget | Low | Per-client-group share (`2e27d8c3`) |
| R2-L4 | Erase | Erase everything deleted the Lichess token without revoking it | Low | Revoked first (`bafa240c`) |
| R3-F3 | CSV export | The Loop export used its own weaker formula check; a zero-width character hid a formula from the app's guard | Low | One guard everywhere, including invisible leading characters (`fd074085`) |
| R3-F4 | Strong/Hevy import | Quadratic duplicate check; cap checked at the end | Low | Linear, refused at the cap (60k rows: 70 ms, was 26 s) (`fd074085`) |
| R3-F5 | Strava import | Files re-read per row, no archive budget, no Stop | Low | Each file once, a 1 GB unpacking budget, a Stop button (`fd074085`) |
| R3-F6 | Habitica import | Lists built before the 2,000 cap | Low | Cap checked first (`fd074085`) |
| R3-F7 | FIT import | Every session and lap kept before the cap | Low | 51st session refused during the read; laps summed as they arrive (`fd074085`) |
| R1-I1 | Service worker | `//host` passed the same-origin check for notification taps | Info | Same-origin `/app` paths only (`2e27d8c3`) |
| R1-I3 | Notifications | Taps are applied at most once (not exactly once) | Info | Documented (`2e27d8c3`) |
| R2-I1–I5 | WalletConnect, Lichess | Stale error path; deep-link URI validation; one session per account; Lichess URL and body caps; signer caller pinned | Info | Fixed (`bafa240c`) |
| R3-F8 | Restore | Oversized unknown fields in a device part | Info | Parts over ~5 MB left out with a plain reason (`fd074085`) |
| R3-F9 | Meal photos | File names could collide | Info | Unique names; Help and PRIVACY say a restore does not bring them back (`fd074085`) |

## Recorded (not changed, with reasons)

- **R1-I2** The "Price alerts" notification switch does nothing today (no price wakes are planned, by design A2/Q20). If price
  wakes are ever added, the worker's market read after each wake would let the server link watched coins to wake times;
  that design must be reviewed then.
- **R1-I4** A cached page replays its own stored CSP nonce offline only; each build's cache is dropped on activate, Trusted
  Types and `strict-dynamic` stay enforced; no practical replay found.
- **R1-I5** Two device ids can share one push endpoint; someone who learns an endpoint could cause up to 24 empty "nothing is
  due" pushes a day. Endpoints are not public; recorded.
- **R3-F10** Pre-existing card kinds (`create-habit`) can be auto-accepted by a person's own choice; a goal bundle's habit
  cards follow that choice. Every AK card kind is never auto-accepted.
- **R2-I6** The Checklist extras section syncs counts and the random ids of on-device Health quick inputs (never their
  contents); minimal metadata.
- **Not reviewed for real devices:** Keplr Mobile signing over WalletConnect on a real phone (owner follow-up).

## What was checked and found sound (summary)

CSP and egress (WalletConnect relay and Verify only in the app class, no new host without an entry, Trusted Types
intact); the one signer path and its guards; Lichess PKCE and token handling; the food Worker's FDC key handling, budgets
and the `grade=1` gate; BYO Spotify; the Checklist extras section's backward compatibility; the push Worker's payload-free
sends, endpoint allowlist, hashed secrets and kill switch; Erase everything's order and coverage; bank-file parsers (no
DTD, no entity expansion, caps, 30k mutation-fuzz runs without a raw error); FIT/gzip/ZIP caps; CSV readers; label-scan
validation; ZIGi's AK cards (never auto-accepted, relative `/app` navigation only, sound only from a tap).
