# Stage 8 coverage map: what automation already proves

For every row of [STAGE8_ACCEPTANCE.md](STAGE8_ACCEPTANCE.md), this lists the automated tests that prove it locally or in CI, what they cannot prove, and a verdict. The owner's human-only steps are in [STAGE8_OWNER_RUNSHEET.md](STAGE8_OWNER_RUNSHEET.md).

- **Written:** 2026-10-02 (Session L), at source `c189313` (`main`, Alpha deploy #21). **Updated after Session L Part 2** and after the owner follow-up, in which the browser rehearsals joined CI **integ** (`66aea3d`), which added rehearsal tests for every PARTIAL row (`scripts/run11/stage8-rehearsal/`, "L-" IDs below).
- **Updated by Session M (PR B, 2026-10-02):** row B1 (the copy now happens in place, with no file) and a new section F for remembered devices, the in-place copy and deletion without a download ([ADR-008](../architecture/ADR-008-remember-this-device.md)). Unlocking changed, so the account rows must run on a build that includes PR B.
- **Checked:** every test below was found by file, line and name in that source.
- **Not a hosted claim:** nothing here touched a provider, a real inbox, a physical phone or a Cloudflare account.

## How to read it

**Kinds of evidence**
| Kind | What runs |
|---|---|
| **Unit** | Node, jsdom or fake-indexeddb, in memory |
| **MF** | Miniflare: the real Workers (private sync, lifecycle, admission, market, food) with SQLite Durable Objects, on this machine |
| **BR** | Real Chrome driven from Vitest against a production `next start`, with **fixture auth** (the email-code provider is faked; any code is accepted) and the real private-sync Worker in MF. The "phone" is a 390×844 mobile Chromium context, not Safari |
| **PW** | A Playwright spec (Desktop Chrome and an iPhone 13 descriptor running Chrome) against `next start`, with `page.route` fixtures for the account API |
| **PKG** | The generated OpenNext bundle running in MF with five services, driven by Chrome |

**CI jobs** (Milestone quality, `.github/workflows/ci.yml`)
| Job | Runs |
|---|---|
| **checks** | `pnpm lint && pnpm typecheck && pnpm test && pnpm build`: every ungated Unit and MF file |
| **shards** | `playwright test --shard=n/3`: every PW spec |
| **integ** | "Independent browser account and market integration": the 15 listed BR/PKG files, one at a time, with `RUN10_BROWSER=1` (8 before Session L's six rehearsal files were added in `66aea3d`; Session M added `remember-device-browser.test.mjs`) |
| **pkg** | `RUN11_PACKAGED=1` run of `packaged-runtime.test.mjs` against the generated bundle |
| **local** | None any more. The Session L browser rehearsals were local-only until `66aea3d` added them to **integ** (owner follow-up, 2026-10-02) |

**Verdicts** (about our code's behaviour; Stage 8 still confirms everything on real services)
- **PROVEN-LOCAL:** tests exercise everything our app and Workers do for this row, end to end. What stays open is only the real-world confirmation in "Cannot prove".
- **PARTIAL:** tests cover part of the row. The gap can be automated with fixture auth and Miniflare, without real providers. Session L Part 2 closed every PARTIAL row; "was PARTIAL" marks them.
- **HUMAN-ONLY:** the decisive part needs a real provider, a physical device or the hosted Cloudflare account. Local tests prove only the logic.

**Nothing local can prove:**
- real email delivery, and the provider's own code rules (wrong, expired, reused);
- Safari/WebKit or a physical iPhone (every "mobile" test is Chromium);
- a real camera;
- hosted Cloudflare: remote bindings, point-in-time recovery, dashboards;
- real provider quotas and costs.

## A. Sign-in and sessions
| Row | Check | Automated tests ([index](#test-index)) | Cannot prove | Verdict |
|---|---|---|---|---|
| A1 | Wrong one-time code | **L-CODES-BR** (the panel shows "Account access was not confirmed. Check the code and try again."; no cookie, no account selected, no vault controls, integ); **L-CODES** (400, no cookie, MF); PA-122 (unit: a rejected code is reported to admission as a failed verification); PA-50 (no session cookie without registration); AA-50 (failed verifications capped per email, MF) | The real provider's decision and real email | **PROVEN-LOCAL** (was PARTIAL) |
| A2 | Expired code | **L-CODES-BR** (the right code after expiry is refused with the same message and no session; after the cooldown a new code arrives and signs in, integ); **L-CODES** (MF); AA-16 (a second send inside 60 s gets 429; allowed again after 61 s, MF); ACC-17 | The provider's real expiry time | **PROVEN-LOCAL** (was PARTIAL) |
| A3 | Reused code | **L-CODES-BR** (after sign-out and a new send, the already-used code is refused with no session; the newest code works, integ); **L-CODES** (the same code twice: 400 the second time, no cookie, MF) | Reuse itself is the provider's rule | **PROVEN-LOCAL** (was PARTIAL) |
| A4 | Send cooldown | **L-CODES-BR** (the button counts down "(60s)"; after a reload resets that countdown, the real admission Worker still refuses with "Please wait before requesting another code." and the provider is never asked, integ); **L-CODES** (429 before the provider, MF); AA-16, AA-32, AA-62 (admission Worker, MF); ACC-17; RAS-3 (PW) | The provider's own send limits | **PROVEN-LOCAL** (was PARTIAL) |
| A5 | Sign out | AB (step at line 130, BR); SW (BR); RAS-3 (PW); ACC-22; PA-28, PA-45 (unit); SR (refresh cannot revive a revoked session, MF) | Real provider sign-out | **PROVEN-LOCAL** |
| A6 | Revocation | AB (lines 122–123: "Revoke other sessions", then the other device shows "Account access changed. Sign in and unlock again.", BR); RR (MF); SYN (MF); LR-31 (MF); PA-54; VO-41, VO-47 (unit) | Real provider tokens | **PROVEN-LOCAL** |
| A7 | Lock and account switch | **L-LOCK** ("Lock account vault" hides A's records until the recovery secret unlocks them; signed out, and as account B before and after B's vault, none of A's records; back as A, none of B's, integ); SW (switch to B; A's late response cannot enter B's workspace, BR); AI-8, AI-14 (unit); ACC-28 (unit); RAS-3 (PW); EI-47 (hostile B identity, MF) | Physical devices | **PROVEN-LOCAL** (was PARTIAL) |

## B. Private data and sync
| Row | Check | Automated tests ([index](#test-index)) | Cannot prove | Verdict |
|---|---|---|---|---|
| B1 | Local attachment | AB (lines 35–48: local records stay separate through sign-in; the copy happens in place after one explicit approval, with no file or secret (Session M); a populated section refuses a repeat, BR); HA-38 (BR); LIP-35, LIP-50 (unit); LA-11, LA-17, LA-21, LA-26 (unit); CS-37 (unit); EI-16 (MF) | Physical devices | **PROVEN-LOCAL** |
| B2 | Four-domain sync | AB (lines 50–68: Habits, Health, a project Goal and a Today widget between desktop and a mobile context, BR); PKG (funded Goal, cash position, presets) | A real phone, Safari | **PROVEN-LOCAL** |
| B3 | Explicit Health consent | **L-HEALTH** (a vault without consent: the Worker holds Habits but no Health record; the second device gets the Habit, not Health; after consent on the first device the Worker holds Health; the second device receives it only after its own consent, integ); HV (BR); HA-27 (BR); CL-32, CL-39, CL-54 (PW); CS-40, CS-44 (unit) | Physical devices | **PROVEN-LOCAL** (was PARTIAL) |
| B4 | Offline edits | AB (lines 75–82: both devices offline; water 250 + 500 = 750 mL; preferences and Habits merge; both reconnect orders, BR); CS-60, CS-67, CS-105 (unit) | Real network loss; the ADR-006 false conflict (X1–X4 below) | **PROVEN-LOCAL** |
| B5 | Conflict review | AB (lines 84–91: a 77/78 cm conflict, both copies kept, explicit review, BR); IF-64 (BR); SC (BR); CR-12 (MF); HC (4 kinds, MF); CRV-7, CRV-12, CRV-18 (unit) | None beyond devices; ADR-006 false conflicts are a known bug | **PROVEN-LOCAL** |
| B6 | Correction and funding replay | **L-REPLAY-HEAD** (a Goal funding and its reversal; the head write's acknowledgement is held and the page reloads; after unlock the upload replays; both devices show exactly one contribution and one reversal, the same entries, and no review prompt, integ); **L-REPLAY-RETRY** (the same with the first write's acknowledgement dropped and "Sync now" retried, integ); CR-28, SYN, OC (MF); CS-28, DB-12 (unit); PKG; R9-45, UG-66, TX-6 (PW) | Real network loss. An edit made *after* a lost acknowledgement is the known ADR-006 false conflict (X1–X4 below), deliberately not repeated | **PROVEN-LOCAL** (was PARTIAL) |
| B7 | Key rotation | AB (lines 101–105: the next recovery secret is shown and confirmed before "Activate new vault key", BR); RT-4, RT-31 (MF) | Minor: no test asserts the activate button stays disabled until the save box is ticked | **PROVEN-LOCAL** |
| B8 | Old-key denial | AB (lines 106–108: the other device gets "Account or vault changed"; the old secret gives "Unlock or integrity check failed", BR); RT-4 (an old-epoch write gets 409, MF); CRY-11 (unit) | A device or backup restored to the old key, then synced, in a browser | **PROVEN-LOCAL** |
| B9 | Section deletion | AB (lines 110–114, BR); DD-5 (persists across restart, fences old writes, keeps other domains, MF); DR-9, DR-22, DR-31 (MF) | The browser does not re-check the other sections on the second device | **PROVEN-LOCAL** |
| B10 | Stale-device denial | AB (lines 115–119, BR); DD-5 (409 `DOMAIN_GENERATION_CHANGED`), DD-31 (MF); IS-17 (MF); SYN (410, MF); SDR (Worker class, unit) | Physical devices | **PROVEN-LOCAL** |
| B11 | Encrypted backup restoration | PKG (`protectAndRestorePackagedRecords`: a fresh browser context, four domains); ER-11, RF-12 (wrong secret, damaged ciphertext, future schema, PW); BK-10 (unit) | Files on a real phone | **PROVEN-LOCAL** |
| B13 | What syncs from the Session P features | SP-SYNC (an automatic check-in, a planned skip, an imported Wealth holding and an imported meal reach a second device byte-identical through `synchronize`, unit); the H7, H1, W3 and I1 suites (unit and PW) | Two physical devices seeing the same records. By design the link rules, health goals, weekly reviews, fasting sessions, insight dismissals and the import undo note stay on their device until their write switch (docs/product/SYNC_HOMES.md) | **PROVEN-LOCAL** |

## F. Remembered devices and downloads (Session M)
| Row | Check | Automated tests ([index](#test-index)) | Cannot prove | Verdict |
|---|---|---|---|---|
| F1 | The choice | RD-34, RD-47 (unticked in a tab, ticked by default with `display-mode: standalone`, the warning as its description, PW); VR-65, VR-73, VR-80 (unit) | A real installed app: the tests emulate standalone display mode; the physical iPhone Home Screen app | **PROVEN-LOCAL** |
| F2 | Opening without the secret | **L-REMEMBER** (reload, a new tab on Today then Settings, 16 idle minutes with the browser clock, BR); RD-59 (reload, new tab, PW); VR-88, VR-100 (unit); CRY-DEV-11 (the remembered root opens the same records, unit) | Safari/WebKit keeping a non-extractable key in IndexedDB; closing and reopening the Home Screen app | **PROVEN-LOCAL** |
| F3 | Lock now and Forget | **L-REMEMBER** (Forget keeps the tab open and the idle lock applies again; Lock now forgets, and a reload asks, BR); RD-59 (PW); VR-125, VR-131 (unit) | Physical devices | **PROVEN-LOCAL** |
| F4 | Invalidation | **L-REMEMBER-INVALID** (rotation on the other device: the old record is deleted, the old secret is refused, the new one works once; sign-out; another account's sign-in, BR); VR-137 to VR-174 (a new sign-in, a revoked session, a stale device, a token expiry that keeps it, unit); CRY-DEV-20, CRY-DEV-33 (old material never opens a newer epoch, unit); DU-22 to DU-68 (unit) | Revoking the session from a real second device; WebKit | **PROVEN-LOCAL** |
| F5 | Deletion without a download | ADO-20, ADO-29, ADO-38 (unit); AB (lines 124–127: the optional copy is prepared, downloaded and decrypted, then deletion, BR) | Files on a real phone | **PROVEN-LOCAL** |

## C. Device and providers
| Row | Check | Automated tests ([index](#test-index)) | Cannot prove | Verdict |
|---|---|---|---|---|
| C1 | Camera permission | **L-CAM-C1** (a refused permission shows "Camera permission was denied. Manual barcode entry remains available.", no camera controls stay open, and a typed barcode is looked up and logged, integ); BC-26 (camera only on request); BC-11, BC-20, BC-117 (PW, mocked camera) | The real system prompt on a physical phone | **PROVEN-LOCAL** (was PARTIAL) |
| C2 | Camera cancel | **L-CAM-C2** ("Stop camera" stops the one camera track; the saved Health log is byte for byte unchanged, also after a reload; no lookup is made, integ); BC-26, BC-41, BC-67, BC-128, BC-142 (PW) | A physical camera | **PROVEN-LOCAL** (was PARTIAL) |
| C3 | Physical barcode | BC-91 (local EAN-8 decoding, no frames uploaded); BC-105, BC-53, BC-3, BC-11 (PW); FQ (one provider call per 12 s slot), FR, FT (MF); PKG food path | A real product from the real provider, a physical camera. The "at most 5 lookups a minute" logic is proven locally | **HUMAN-ONLY** |
| C4 | Bounded provider refresh | MB (refresh plus reload gives exactly one price call, BR); MO-11 (credits charged exactly; nothing new after restart), MO-41 to MO-109 (MF); MP-44 (MF) | A real CoinGecko call against the owner's real `MARKET_POLICY` | **HUMAN-ONLY** |

## D. Hosted recovery
| Row | Check | Automated tests ([index](#test-index)) | Cannot prove | Verdict |
|---|---|---|---|---|
| D0 | Stage 7 rehearsal | RA-184 (the committed fixture reconciles into an empty authority); RA-61 (MATCH, DRY RUN OK, RECONCILED, ALREADY RECONCILED); RA-95 (wrong anchor and other refusals); RA-128, RA-144 (MF, with a local stand-in for the remote binding); RAC-25, RAC-62; S7-28 | Wrangler's real remote binding, the outside-reach probe (runbook step 5), the dashboard comparison (step 8) | **HUMAN-ONLY** |
| D1 | Export after a deletion decision | RA-61 (export after deletions: 0600 file and digest, MF); LRC-14 (MF) | Bitwarden and offline-image custody | **HUMAN-ONLY** |
| D2 | Custody check | RA-61 (MATCH), RA-95 (MISMATCH, not 0600, changed after export) | Checking the real custody copies | **HUMAN-ONLY** |
| D3 | Point-in-time recovery | **L-RECONCILE** (in reconcile mode every route gets 503 `LIFECYCLE_RECONCILIATION_REQUIRED`: reads, writes, session registration, account and section deletion, rotation; back in serve mode the vault and account state are unchanged, MF, CI: checks); LR-17 (MF); LRC-44 (a copied persist directory as a local stand-in for PITR, MF); LR-6 (MF) | Hosted PITR | **HUMAN-ONLY** |
| D4 | Dry run and reconcile | RA-61, RA-128; LRC-14, LRC-25, LRC-32 (MF) | The hosted run | **HUMAN-ONLY** |
| D5 | Old-client denial after recovery | LRC-44 (offline re-enrollment denied with 410, MF); LR-6 (MF); AB (line 128, 410 after deletion, BR) | A stale browser client after a hosted reconcile | **HUMAN-ONLY** |
| D6 | Return to serve | AC-7 (a `serve` template is rejected); S7-46 (a serving lifecycle Worker is "not ready") | The owner's decision and deploy; nothing checks that the anchor vars are removed in the same change | **HUMAN-ONLY** |

## E. Before inviting friends
| Row | Check | Automated tests | Cannot prove | Verdict |
|---|---|---|---|---|
| E1 | Account-wide quotas re-checked | None. `market-policy.test.mjs` only validates the figures the owner types in | Provider dashboards | **HUMAN-ONLY** |
| E2 | Spend controls | None | Provider billing settings | **HUMAN-ONLY** |

## Counts (36 rows)
| Verdict | At `c189313` (before Part 2) | After Session L Part 2 |
|---|---|---|
| PROVEN-LOCAL | 11: A5, A6, B1, B2, B4, B5, B7, B8, B9, B10, B11 | **20**: the 11, plus A1, A2, A3, A4, A7, B3, B6, C1, C2 |
| PARTIAL | 9: A1, A2, A3, A4, A7, B3, B6, C1, C2 | **0** |
| HUMAN-ONLY | 11: C3, C4, D0, D1, D2, D3, D4, D5, D6, E1, E2 | **11** (unchanged; D3's logic is now fully covered) |

**Session M (PR B)** adds section F: 5 rows, all **PROVEN-LOCAL** (25 of 36 in all). Each still needs its check on the physical iPhone (STAGE8_OWNER_RUNSHEET.md, steps 12–13b).

A3 was counted PARTIAL, not HUMAN-ONLY: reuse is the provider's rule, but how the app handles that refusal can be rehearsed with a stricter fixture, exactly like A1.

**PROVEN-LOCAL is not Stage 8 done.** Every row still gets its real-world check from the owner (real inboxes, the physical iPhone, hosted services); the run-sheet lists only what automation cannot do.

## Known expected failures (ADR-006)
These four `test.fails` tests document a known sync bug: the cloud applies the final write but its acknowledgement is lost, so a later local edit reads as a false conflict. No data is lost; automatic sync pauses for review. They touch B4, B5 and B6.
- X1–X3: `scripts/run11/sync-lost-ack.test.ts:50`, `:55`, `:60` (unit).
- X4: `scripts/run11/sync-lost-ack-runtime.test.mjs:43` (MF).

## Test index
**Session L rehearsal** (`scripts/run11/stage8-rehearsal/`; shared helpers in `harness.mjs`: a stand-in code provider with one single-use code per send and an expiry clock, the real admission Worker in Miniflare, the same route adapter as the BR tests)
| ID | Test | Kind / CI |
|---|---|---|
| L-CODES | `sign-in-codes.test.mjs:11` "wrong, expired and reused codes are refused without a session, and the send cooldown is enforced by the admission Worker" | MF (route handler, admission and private-sync Workers) / checks |
| L-CODES-BR | `sign-in-codes-browser.test.mjs:8` "the sign-in panel refuses wrong, expired and reused codes without a session, and a second code only after the cooldown" | BR with the admission Worker / integ |
| L-LOCK | `lock-switch-browser.test.mjs:8` "locking hides account records until unlocked, and a second account sees none of the first account's records" | BR / integ |
| L-HEALTH | `health-consent-cloud-browser.test.mjs:8` "Health is uploaded only after consent, and another device receives it only after its own consent" | BR (desktop and mobile contexts) / integ |
| L-REPLAY-HEAD | `replay-browser.test.mjs:92` "a reload while the head write's acknowledgement is held replays the funding and its correction exactly once" | BR / integ |
| L-REPLAY-RETRY | `replay-browser.test.mjs:93` "a dropped acknowledgement of the first write and a retry replay the funding and its correction exactly once" | BR / integ |
| L-CAM-C1 | `camera-browser.test.mjs:22` "C1: a refused camera permission is explained and manual entry still logs a food" | Chrome against the app (stand-in camera and lookup) / integ |
| L-CAM-C2 | `camera-browser.test.mjs:47` "C2: cancelling a scan stops the camera and leaves the saved Health log unchanged" | Chrome against the app / integ |
| L-RECONCILE | `reconcile-mode.test.mjs:14` "reconcile mode refuses reads, writes, registration, section deletion, rotation and account deletion, then serving resumes unchanged" | MF / checks |

**Session M** (remembered devices, [ADR-008](../architecture/ADR-008-remember-this-device.md); the copy in place; deletion without a download)
| ID | Test | Kind / CI |
|---|---|---|
| L-REMEMBER | `stage8-rehearsal/remember-device-browser.test.mjs:34` "a remembered device reopens after a reload, in a new tab and after 15 idle minutes, until Forget or Lock now" | BR / integ |
| L-REMEMBER-INVALID | `stage8-rehearsal/remember-device-browser.test.mjs:66` "rotation on another device, sign-out and another account invalidate it; old material never opens the newer epoch" | BR (two contexts) / integ |
| RD-34, RD-47, RD-59 | `apps/web/tests/remember-device.spec.ts:34`, `:47`, `:59` (the choice in a tab and in the installed app; reload, new tab, Forget, Lock now) | PW / shards |
| VR-65 … VR-184 | `apps/web/lib/vault-remember.test.ts:65` to `:184` (the provider: choice, reopen, idle, Health, Lock now, Forget, sign-out, rotation, new sign-in, another account, token expiry, revoked session, stale device, sign-out during unlock, Showcase) | Unit (jsdom, fake-indexeddb, real WebCrypto) / checks |
| CRY-DEV-11 … CRY-DEV-66 | `apps/web/lib/vault/crypto-device.test.ts:11`, `:20`, `:33`, `:43`, `:52`, `:62`, `:66` (seal and open, bindings, epochs, non-extractable keys, lengths) | Unit / checks |
| DU-22 … DU-68 | `apps/web/lib/vault/device-unlock.test.ts:22`, `:27`, `:33`, `:41`, `:49`, `:56`, `:68` (no database created on read, one record, forget wins, exact deletes, invalid records deleted) | Unit (fake-indexeddb) / checks |
| LIP-35, LIP-50 | `apps/web/lib/local-attach-in-place.test.ts:35` "reviews what will be copied, asks for one explicit approval, and offers no file or secret"; `:50` "preparing the copy builds no encrypted backup file" | Unit (jsdom) / checks |
| ADO-20, ADO-29, ADO-38 | `apps/web/lib/account-deletion-optional-copy.test.ts:20`, `:29`, `:38` (the typed confirmation alone deletes; the identity phrase; the optional copy and its wording) | Unit (jsdom) / checks |

**BR and PKG** (CI: integ, unless noted)
| ID | Test |
|---|---|
| AB | `scripts/run10/account-browser.test.mjs:13` "two real browser profiles use encrypted account transport and persistent Worker (%s reconnect); auth delivery is a fixture" (a-first and b-first; line numbers above are its steps) |
| SW | `scripts/run11/account-switch-browser.test.mjs:12` "late encrypted account A response cannot enter the actual signed-in B browser workspace" |
| IF-43 | `scripts/run11/sync-inflight-edit-browser.test.mjs:43` "an edit during an in-flight upload syncs automatically without pausing" |
| IF-64 | `scripts/run11/sync-inflight-edit-browser.test.mjs:64` "another device finance edit still pauses automatic sync for review" |
| SC | `scripts/run11/sync-self-conflict-browser.test.mjs:14` "own held upload plus a concurrent local finance write syncs normally on Sync now" |
| HV | `scripts/run11/health-consent-verification-browser.test.mjs:13` "Health consent ticked during email verification is kept or not yet offered" |
| HA-27 | `scripts/run11/health-consent-a11y-browser.test.mjs:27` "a refused Health consent is described by its refusal message" |
| HA-38 | `scripts/run11/health-consent-a11y-browser.test.mjs:38` "local-copy choices are labelled and say why they are unavailable" (since Session M the copy approval has nothing to wait for: no file) |
| MB | `scripts/run11/market-browser.test.mjs:14` "wealth browser consumes actual mixed-pair route evidence and retains Bitcoin through failed ZIG refresh" (`RUN11_MARKET_BROWSER=1`) |
| PKG | `scripts/run11/packaged-runtime.test.mjs:22` "full generated OpenNext artifact uses local named account, market and food services across restart" (CI: pkg), driving `packaged-consumer-journey.mjs` and `packaged-goal-journey.mjs` |

**MF** (CI: checks)
| ID | Test |
|---|---|
| AA-16 | `scripts/run11/auth-abuse.test.mjs:16` "durable auth admission binds email and IP, survives restart, expires safely and fails closed" |
| AA-32 | `scripts/run11/auth-abuse.test.mjs:32` "one IP group can touch only a bounded number of distinct emails, and IPv6 groups by /64" |
| AA-50 | `scripts/run11/auth-abuse.test.mjs:50` "failed code verifications are capped per email per day on top of the 10-minute limit" |
| AA-62 | `scripts/run11/auth-abuse.test.mjs:62` "filling the admission table cannot stop sign-in for new users and keeps code-guessing limits" |
| SR | `scripts/run11/session-refresh.test.mjs:3` "refresh inherits device identity, retires old token, and cannot revive a revoked session" |
| RR | `scripts/run11/account-read-revocation.test.mjs:3` "account state is readable only by an active session, and the deleted state stays readable" |
| SYN | `scripts/run10/sync-runtime.test.mjs:7` "real Workers durable storage: two clients, auth denial, conflict, retry, deletion and restart" |
| LR-6 | `scripts/run11/lifecycle-runtime.test.mjs:6` "independent lifecycle decision denies restored pre-delete vault and fails closed in recovery mode" |
| LR-17 | `scripts/run11/lifecycle-runtime.test.mjs:17` "lifecycle recovery mode disables serving even with otherwise valid identity" |
| LR-31 | `scripts/run11/lifecycle-runtime.test.mjs:31` "cloud deletion cannot let a previously revoked device escalate to identity deletion" |
| EI-16 | `scripts/run11/enrollment-isolation.test.mjs:16` "JRN04 empty second device repeats interrupted enrollment without replacing ciphertext, epoch or records" |
| EI-47 | `scripts/run11/enrollment-isolation.test.mjs:47` "JRN08 hostile B identity cannot read, select, page, overwrite or delete A through any private Worker route" |
| CR-12 | `scripts/run11/conflict-runtime.test.mjs:12` "real encrypted account conflict review preserves both copies, fences changes and publishes explicit resolution" |
| CR-28 | `scripts/run11/conflict-runtime.test.mjs:28` "two independent funding aggregates retain both deposits, cap allocation and replay without duplication" |
| HC | `scripts/run11/habits-conflict.test.mjs:13` "real encrypted two-client ${kind} conflict retains both reviewed copies and does not silently overwrite" (4 kinds) |
| OC | `scripts/run11/observation-conflict.test.mjs:11` "encrypted independent imports merge to one visible reading with all originals, then correction resyncs" (2 orders) |
| RT-4 | `scripts/run11/rotation-runtime.test.mjs:4` "persistent rotation stages invisibly, resumes after restart and atomically fences old epoch writers" |
| RT-31 | `scripts/run11/rotation-runtime.test.mjs:31` "client rotation recovers lost %s acknowledgement without losing exact data" (stage, commit) |
| DD-5 | `scripts/run11/domain-deletion.test.mjs:5` "selected cloud deletion persists across restart, fences old writes, and preserves other domains" |
| DD-31 | `scripts/run11/domain-deletion.test.mjs:31` "an explicit backed-up restore creates a new section generation without replaying old work" |
| DR-9, DR-22, DR-31 | `scripts/run11/domain-review-race.test.mjs:9` "cloud deletion refuses changes published after its protected review"; `:22` "a real durable alarm completes an interrupted authorized deletion without the client returning"; `:31` "durable deletion intent fences writers and resumes a lost authority acknowledgement after restart" |
| IS-17 | `scripts/run11/incremental-sync.test.mjs:17` "receipt compaction fences operations outside the revision horizon without replay or deletion resurrection" |
| FQ | `scripts/run11/food-queue.test.mjs:21`, `:34`, `:47`, `:61` (the shared 12 s provider slot, refusals, throttling, cache) |
| FR | `scripts/run10/food-runtime.test.mjs:8` "shared food budget persists before outbound I/O, caches bounded public data and rejects arbitrary destinations" |
| FT | `scripts/run11/food-throttle.test.mjs:11` "an upstream %i backs off the shared budget and reports throttling, not a missing product" |
| MO-11 … MO-109 | `scripts/run11/market-open-next.test.mjs:11` "installed OpenNext production runtime → real routes → named service → one durable account → controlled provider", and `:41`, `:64`, `:77`, `:95`, `:109` |
| MP-44 | `scripts/run11/market-policy.test.mjs:44` "filled UTC-calendar figures produce a policy the real coordinator accepts; disabled reads fail closed" |
| RA-61 | `scripts/run11/recovery-admin.test.mjs:61` "export → verify → dry-run → reconcile → re-export → replay after a total lifecycle loss; output names digests and counts only" |
| RA-95 | `scripts/run11/recovery-admin.test.mjs:95` "refusals before anything starts: wrong digest, wrong account, readable or changed file, serve mode, foreign anchor, unsafe output, stray binding" |
| RA-128 | `scripts/run11/recovery-admin.test.mjs:128` "Worker-side refusals: a foreign anchor, and a reconcile without both typed confirmations changes nothing" |
| RA-144 | `scripts/run11/recovery-admin.test.mjs:144` "the admin Worker refuses requests without the session token, other paths, methods and bodies, and never reaches the ordinary service" |
| RA-184 | `scripts/run11/recovery-admin.test.mjs:184` "the committed rehearsal fixture is a valid fictional checkpoint that reconciles into an empty authority" |
| LRC-14 … LRC-44 | `scripts/run11/lifecycle-recovery.test.mjs:14` "external anchored checkpoint restores deletion after total lifecycle loss and receipts survive restart"; `:25` "older externally anchored checkpoint cannot lower domain fences or undo account deletion"; `:32` "validly anchored conflicting receipts and malformed checkpoints fail without writes; admin is not public or on ordinary service"; `:44` "local simultaneous vault and lifecycle rollback remains closed until external reconciliation, then denies offline reenrollment" |

**Unit** (CI: checks)
| ID | Test |
|---|---|
| PA-28 … PA-122 | `apps/web/lib/server/private-account.test.ts:28` "signout clears the local session even when upstream revocation cannot be confirmed"; `:45` "signout clears cookies even after hosted configuration disappears"; `:50` "provider verification cannot open an app session unless durable registration succeeds"; `:54` "a revoked durable session is locked even when provider token still validates"; `:122` "a rejected code is reported to admission as a failed verification; a provider throttle is not" |
| ACC-17, ACC-22, ACC-28 | `apps/web/lib/account-access.test.ts:17` "OTP cooldown and verification select only the returned account, still locked"; `:22` "signout clears selection and key callback even when the network fails"; `:28` "late OTP result cannot select a prior account after a scope transition" |
| AI-8, AI-14 | `apps/web/lib/account-isolation.test.ts:8` "local, two accounts and Showcase never read or erase one another"; `:14` "lock and same-account relogin revoke old storage objects" |
| VO-41, VO-47 | `apps/web/lib/vault-ownership.test.ts:41` "current-account revoked access locks the provider and keeps the explicit sign-in recovery reason"; `:47` "late A revoked response after B unlock cannot lock B or publish an A access error" |
| LA-11 … LA-26 | `apps/web/lib/vault/local-attach.test.ts:11`, `:17`, `:21` "Health has separate opt-in and unselected domains are not read into the plan", `:26` |
| CS-28 … CS-105 | `apps/web/lib/vault/cloud-sync.test.ts:28` "lost acknowledgement replays the same operation, then completes without partial publication"; `:37` "initial attach conflicts rather than replacing unrelated local data, while an empty device pulls"; `:40` "Health exclusion skips Health decryption and publication while preserving remote catalog"; `:44` "revoked Health permission cannot replay an unsent Health operation"; `:60`, `:67`, `:105` (offline merges) |
| CRV-7 … CRV-18 | `apps/web/lib/vault/conflict-review.test.ts:7`, `:12`, `:18` |
| DB-12 | `apps/web/lib/vault/database.test.ts:12` "replay is idempotent, reused operation is rejected, changed record delta is bounded" |
| CRY-11 | `apps/web/lib/vault/crypto.test.ts:11` "wrong recovery, tampering, context substitution and future envelope fail closed" |
| BK-10 | `apps/web/lib/vault/backup.test.ts:10` "wrong recovery and unsupported backup leave caller data untouched" |
| SDR | `scripts/run10/sync-delete-race.test.mjs:4` "an overlapping read is one snapshot and deletion fences every later read" (the Worker class with in-memory storage) |
| RAC-25, RAC-62 | `scripts/run11/recovery-admin-config.test.mjs:25`, `:62` |
| S7-28, S7-46 | `scripts/run11/stage7-preflight.test.mjs:28` "a ready ops checkout passes every check, and the report names secrets and files but no value"; `:46` (not-ready cases, including a serving lifecycle Worker) |
| AC-7 | `scripts/run11/activation-check.test.mjs:7` "activation check rejects unsafe %s template" (including `serve`) |

**PW** (CI: shards)
| ID | Test |
|---|---|
| RAS-3 | `apps/web/tests/run10-account-access.spec.ts:3` "fixture email access stays locked and preserves separate local Health at ${width}px" |
| CL-32, CL-39, CL-54 | `apps/web/tests/a11y-consent-labels.spec.ts:32`, `:39`, `:54` (the Health consent label, "Finishing sign-in…" and focus) |
| BC-n | `apps/web/tests/run10-barcode.spec.ts` at line n: `:3`, `:11`, `:20`, `:26` "camera is explicit and stops all tracks on cancel and navigation", `:41`, `:53`, `:67`, `:91`, `:105`, `:117`, `:128`, `:142` |
| ER-11 | `apps/web/tests/export-roundtrip.spec.ts:11` "Local Demo export, wipe and import restores all four modules identically" |
| RF-12 | `apps/web/tests/run11-recovery-failures.spec.ts:12` "protected backup wrong secret, damaged ciphertext and future domain schema each fail without changing the existing profile" |
| R9-45 | `apps/web/tests/run9.spec.ts:45` "confirmed Local Demo Add Funds records exactly once and never at preview" |
| UG-66 | `apps/web/tests/unified-goals.spec.ts:66` "failed Habit write retries without duplicating Goal or re-allocating reserved units" |
| TX-6 | `apps/web/tests/transactions.spec.ts:6` "restart preserves scoped journal and damaged rows without replay" |

**Session P, PR 3** (`apps/web/lib/`, unit):
| ID | Test |
|---|---|
| SP-SYNC | `apps/web/lib/import/sync-ordinary.test.ts` "an automatic check-in, a planned skip and imported records reach a second device as ordinary records" (fake-indexeddb journals and the in-memory cloud of `cloud-sync.test.ts`) |

## Run them locally
```sh
pnpm test                                   # Unit and MF (checks)
NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build
pnpm --filter @zigoals/web start &          # http://127.0.0.1:3100
RUN10_BROWSER=1 RUN11_REVIEW_ORIGIN=http://127.0.0.1:3100 \
  pnpm exec vitest run scripts/run10/account-browser.test.mjs --no-file-parallelism   # one BR file at a time
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 pnpm --filter @zigoals/web exec playwright test run10-barcode.spec.ts --workers=2
RUN10_BROWSER=1 RUN11_REVIEW_ORIGIN=http://127.0.0.1:3100 \
  pnpm exec vitest run scripts/run11/stage8-rehearsal/ --no-file-parallelism   # the Session L rehearsal (about 1 minute)
```
