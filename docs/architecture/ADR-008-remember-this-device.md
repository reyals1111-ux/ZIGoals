# ADR-008: "remember this device" for the encrypted account vault

Status: **Accepted.** Option 1 below, with the owner's decision M1 (2026-10-02, at the approval of the Session M plan). The implementation is Session M, PR B, labelled [Tier 3] (vault and account client code). No sync protocol, journal, wire format, Worker or server session handling changes. Code references are to `main` at `57275a6`.

## Context: the chore
- **Today the vault key lives only in memory.**
  - `unlockVault` (`apps/web/lib/vault/crypto.ts`) turns the recovery secret into the vault root, a non-extractable WebCrypto HKDF key.
  - `VaultSyncProvider` (`apps/web/components/vault-sync-controls.tsx`) keeps it in a React ref.
- **So the secret is asked again after every reload, every new tab and 15 minutes idle.** Session L recorded this as Stage 8 finding F1. It is the opposite of the owner principle: "People should never have to back up, re-sync, download or upload anything to stay up to date… The one thing a person must keep safe is the recovery secret."
- **Signing in is not the problem.**
  - The email session survives reloads already: the HttpOnly cookie, refreshed by the route.
  - Only the vault key does not, and the email session can never decrypt anything (vault rule: no key is derived from email, password, wallet signature or token).

## What must hold (vault rules from the handover)
- **No key is derived** from email, password, wallet signature or token.
- **No private accounts are merged automatically.**
- **Rotation issues a new recovery secret.**
- **Losing the recovery secret plus every unlocked device means the data is gone,** and the interface says so. A remembered device counts as an unlocked device for this rule. See "Honesty" below.
- **Nothing new reaches the server:** remembered material is local, versioned and validated.
- **Health keeps its own explicit consent.**

## Threat model
**Assets:**
- the current epoch's vault root, which decrypts every cloud record of that epoch;
- the account records. Their local copy is already plaintext at rest in this browser profile ([PRIVACY.md](../PRIVACY.md));
- the recovery secret. It is never stored by this design.

| # | Threat | Today (memory-only key) | With a remembered device |
|---|---|---|---|
| T1 | **Someone uses this unlocked browser profile:** a shared or family computer, an unlocked laptop, a phone handed over | Reads the plaintext local copies, but cannot open the account view or sync without the secret | **Can open and sync this account here, and change records that then sync to every device.** This is the trade-off a person accepts. Mitigations: an explicit, warned choice; "Forget this device"; "Lock now" forgets; signing out forgets |
| T2 | **Malicious script in the origin** (XSS, a hostile extension, a compromised bundle) | Reads local data; captures the secret when it is typed | Can *use* the device key while it runs: WebCrypto does not stop use by same-origin script, and it can post a key to another origin (W3C Web Cryptography API, security considerations). It cannot export the device key's own bytes (non-extractable). **Corrected 2026-10 (Session S, `Q-SYNC-01`):** it *can* recover the root. `unwrapKey` lets the caller choose the algorithm and extractability of the unwrapped key, so script that reads the sealed record can unwrap the root as an extractable AES or HMAC key and export its 32 bytes. That is a lasting offline copy of the epoch root, valid until the next rotation. The app itself still imports the root as a non-extractable HKDF key. **After losing a remembered device, or after a suspected compromise: revoke its session from another device, then rotate the key** (a new root and recovery secret), which makes the copied root useless for new records. The planned code fix stores the root itself as a non-extractable HKDF key (FIX_PLAN B1) |
| T3 | **Stolen profile files** (backup, disk image) | Plaintext local copies | "Non-extractable" is enforced by the browser's API, not on disk; deleting a record is not a secure erase. On Apple platforms, WebKit's source wraps stored CryptoKeys with a per-application master key kept in the Keychain (`SerializedCryptoKeyWrapCocoa.mm`); other engines document no such wrapping. **Treat the key as recoverable by someone holding the profile's files.** Cloud records still need a valid email session to fetch. ZIGoals promises no device-level encryption |
| T4 | Server compromise | — | Unchanged: nothing new is sent or stored remotely |
| T5 | **Stale material after rotation, deletion, revocation or a new sign-in** | — | Bound to (account, exact manifest, server session) and checked against the live manifest and session before every use; deleted by every lifecycle event below. Each epoch has a new random root (`docs/run11/DATA_PROTOCOL.md`), so material from an old epoch cannot decrypt a newer one even if used |
| T6 | **Eviction** (Safari's 7-day rule, storage pressure, clearing site data) | Local data lost | The remembered material disappears with the site's data. The next open asks for the secret (fail-closed); cloud records are unaffected |
| T7 | **Two people, two accounts, one browser** | Accounts never read each other's records | Signing in with another account deletes the previous account's record before anything opens. At most one account is remembered per browser profile |

## Options compared

| | (1) Non-extractable WebCrypto device key in IndexedDB that wraps the vault root | (2) WebAuthn passkey with the PRF extension | (3) Longer session lifetimes only |
|---|---|---|---|
| Removes the secret after reload, new tab and idle | **Yes** | It replaces the secret with Face ID, Touch ID or a PIN at every open | **No.** Login already persists; the vault key is the part that is lost |
| Protects against T1 | No (by design; the choice is the person's) | Yes: user verification at each open | — |
| Protects against T3 | No | Better: the PRF secret comes from the authenticator | — |
| Platform support (official sources, read 2026-10-02) | **CryptoKey is serializable:** "CryptoKey objects are serializable objects" (W3C Web Cryptography API, read from `github.com/w3c/webcrypto`). **CryptoKey is in the structured-clone list** that IndexedDB stores (MDN "The structured clone algorithm", read from `github.com/mdn/content`). **`SubtleCrypto.unwrapKey`:** Chrome 37, Firefox 34, Safari 7, Safari on iOS 7 (MDN browser-compat-data `api.SubtleCrypto.unwrapKey`, commit `f2dd714`). **Checked on 2026-10-02 in Node 24.19.0 and Chromium 141.0.7390.37:**<ul><li>the sealed root is 48 bytes;</li><li>`unwrapKey` gives a non-extractable HKDF key usable only for `deriveKey`;</li><li>a wrong AAD and a 16-byte payload are refused (`OperationError`);</li><li>a device key without `decrypt` cannot decrypt the sealed root (`InvalidAccessError`);</li><li>the device key survives a round trip through IndexedDB and still unwraps</li></ul> | **Conflicting sources, so UNVERIFIED on a real iPhone.** Apple's Safari 18 release notes say "Added support for the WebAuthn PRF extension", and Safari 26.4 adds PRF "for both credential creation and authentication flows with security keys" (developer.apple.com, read 2026-10-02). MDN's compatibility data marks `get()` with PRF as **not supported** in Safari and Safari on iOS (`api.CredentialsContainer.get.publicKey_option.extensions.prf`, impl_url webkit.org/b/259934, commit `f2dd714`), and `create()` with PRF supported from Safari 18. Chrome 116, Firefox 139 (MDN). The extension is defined in W3C Web Authentication Level 3, §10.1.4 "Pseudo-random function extension (prf)" (read from `github.com/w3c/webauthn`) | n/a |
| What it adds | One local IndexedDB store; no server change; no new dependency | A WebAuthn ceremony and a new key path; a relying-party ID and permissions policy; synced passkeys would become a recovery path (a model change for "lost the secret") | Server session handling, out of bounds for this work |
| Testable here and in CI | Yes: Chrome with fixture sign-in and the real Worker in Miniflare | Partly: a virtual authenticator, not Safari | — |

**Recommendation:**
- **(1) now.** It meets every requirement of B2 with no server change. Its weakness, T1 and T3, is stated plainly and is the person's choice.
- **(2) later**, as an optional "protect this remembered device with Face ID". Only after PRF `get()` is confirmed on the owner's iPhone, because the official sources disagree today. It would wrap the same root with a PRF-derived key, so (1)'s storage, binding and invalidation carry over.
- **(3) rejected:** it does not remove the prompt.

## Decision (owner, 2026-10-02: M1)
- **(a) An explicit choice** when creating or unlocking the vault: **"Remember on this device — don't use on shared computers"**, with its warning always visible.
- **(b) Ticked by default only in the installed app;** unticked in a browser tab.
  - "Installed" means the app runs standalone: an iPhone or iPad Home Screen web app, or an installed desktop app (`currentInstallContext()`, `apps/web/lib/install/platform.ts`).
  - The box is never hidden, and its warning is always shown.
- **(c) No secret after idle on a remembered device.** The 15-minute idle lock does not ask for the secret there; the vault stays open, as after a reload. Unremembered devices keep the idle lock unchanged.
- **(d) "Lock now" = lock and forget.** The next open asks for the secret: a lock that a reload undoes is not a lock.
- **(e) The Health choice is remembered with the device,** but only if the person ticked it. It is cleared with the device.
- **(f) "Forget this device"** (Settings → Account & sync) deletes the remembered material at once. The current tab stays open until it is locked or reloaded.

## Design
**Cryptography** (`apps/web/lib/vault/crypto.ts`; additions only, existing functions unchanged)
- **`createDeviceKey()`:** AES-GCM 256, `extractable: false`, usages `encrypt` and `unwrapKey`. No `decrypt`. **Correction (2026-10, `Q-SYNC-01`):** `unwrapKey` still lets same-origin script unwrap the root into an extractable key and export it, so the absence of `decrypt` does not keep the root's bytes from script (T2).
- **`unlockVaultForDevice(manifest, secret, account, deviceKey)`:**
  - does exactly what `unlockVault` does;
  - before the 32 root bytes are wiped, encrypts them once with the device key (fresh 96-bit IV, 128-bit tag);
  - returns the root key and the sealed root.
- **`openDeviceRoot(deviceKey, sealed, account, manifest)`:**
  - checks the IV is exactly 12 bytes and the ciphertext exactly 48 bytes (`unwrapKey` would otherwise import a short or empty payload as a valid HKDF key);
  - then calls `unwrapKey('raw', …, 'HKDF', false, ['deriveKey'])`, so no root bytes reach script.
- **Authenticated binding:** additional data `["zigoals-device-root", 1, account, sha256(manifest)]`, built from the server-verified account and the live manifest.
  - The manifest includes the vault and its epoch.
  - A record cannot be moved to another account, vault or epoch, or even to a re-created manifest with the same numbers.

**Storage** (`apps/web/lib/vault/device-unlock.ts`)
- **Where:** IndexedDB database `zigoals-device-unlock-v1`, object store `devices`, keyed by account.
- **The record:** `{version: 1, account, vault, epoch, manifest (sha256), session, health, createdAt, sealed: {iv, ciphertext}, key}`.
  - `session` is the server session the record was made in, read from the existing `?action=sessions` (`current`).
  - That id survives token refreshes but not a new sign-in.
- **Validation:** zod checks everything but the key. The key must be a non-extractable AES-GCM CryptoKey with exactly the expected usages. Anything else, including an unknown version, is deleted and treated as not remembered.
- **Reading:**
  - never creates the database;
  - has a time limit (Safari can hang on a first open; `database.ts`), after which the device simply counts as not remembered;
  - deletes only by compare-and-delete on the exact record, except for an explicit forget, a sign-out or an account switch.
- **Nothing is written to localStorage,** and nothing new is sent anywhere.

**Opening** (`apps/web/components/vault-sync-controls.tsx`)
- **When:**
  - on page load;
  - when the window regains focus or becomes visible while this tab is locked;
  - only if a record exists, and never in Showcase.
- **No reopen on another tab's "lock" broadcast,** so a sign-out elsewhere cannot race it.
- **Steps:**
  1. Read the record.
  2. Confirm the server identity with the existing status call (the refresh path runs as today).
  3. Confirm the current session id matches.
  4. Adopt the account in this tab without locking the other tabs. A sign-in still locks them, and so does Settings' own account check in a new tab, as before (`account-browser` L72–L74); a remembered tab locked that way opens again, without the secret, as soon as it is focused or shown.
  5. Read the manifest. It must match the record's binding.
  6. Unwrap the root and open.
  7. Apply the remembered Health choice, with the same "Health held" check as the checkbox.
  8. Sync.
- **The ordinary sign-in path does the same** when it finds a record: Settings' account check calls the same `authenticated` step.

**Invalidation:** the record is deleted when any of these happens.

| Event | Where |
|---|---|
| Sign-out (every record) | `AccountAccess` → `onSignout` |
| Another account signs in on this browser | the identity check |
| A new sign-in (new server session) | the session check |
| Key rotation on this device: before `rotateVault`, and on resuming a staged rotation | `finishRotation`, `resumeRotation` |
| Rotation elsewhere: the manifest no longer matches, or sync reports "Account or vault changed" | opening; sync |
| Stale-device denial: 410 `ACCOUNT_DELETED`; 401 `SESSION_REVOKED`; 409 `ACCOUNT_CHANGED`; a cloud section deleted on another device | sync; the `access-changed` lock |
| Section deletion on this device | `confirmDomain` |
| Account deletion on this device, cloud data or identity, before the lock | `eraseAccount` |
| "Lock now" | the lock button |
| "Forget this device" | Settings |
| A record that fails validation or cannot be unwrapped | opening |

**A routine token expiry (401 `SIGN_IN_REQUIRED`) does not delete the record.** The route refreshes the token, and the session id stays the same.

**Old material can never open a newer epoch:**
- the binding names the exact manifest;
- the live manifest is compared before use;
- each epoch's root is new and random, so the AES-GCM check would refuse anyway.

## Honesty in the interface
- **The choice:** "Remember on this device — don't use on shared computers."
- **Its explanation:** ZIGoals then opens your account records here without the recovery secret, also after a restart; anyone who can use this browser on this device can open them too. Forget this device in Settings at any time; locking also forgets it.
- **Never claimed:** device-level encryption, protection from someone holding the device, or remote erasure.
- **"Lost the secret?"** A remembered device can still open the vault, and from there a key rotation gives a new recovery secret. Without the secret and without any remembered or unlocked device, the data is gone; nobody can recover it.

## Consequences
- The remembered device becomes a convenience, never a recovery promise: eviction (T6) or any invalidation brings back the secret prompt.
- Stage 8's account rows must run on a build with this change (B7, B8, B10 and A7 behave differently on a remembered device), with new rows for remember, forget and invalidation.
- **Rollback:**
  - An older build ignores the `zigoals-device-unlock-v1` database and asks for the secret, as today.
  - Forgetting every device needs nothing more than "Forget this device" or clearing site data.

## Not done here (follow-ups)
- ~~**Store the root as a non-extractable HKDF `CryptoKey`** instead of a sealed blob plus an unwrap-capable device key (FIX_PLAN B1, `Q-SYNC-01`; Session S corrected T2 above, the code change is a later `TIER 3 (auth/sync)` session).~~ Done in Session U Part 5: see the addendum below.
- Option (2), a passkey (PRF) to protect a remembered device, after a device test on the owner's iPhone.
- A time limit on remembering independent of the session. Today the session's own lifetime bounds it: a new sign-in needs the secret once.

## Addendum (Session U, 2026-10-05): version 2 records (B1) and Lock in every tab (B2)
**B1, as built** (`apps/web/lib/vault/crypto.ts`, `device-unlock.ts`, `components/vault-sync-controls.tsx`):
- A **version 2** record stores the root itself: the non-extractable HKDF `CryptoKey` that opening the vault made, usable only for `deriveKey`. It keeps the version 1 bindings (account, vault, epoch, manifest digest, server session, Health choice, created date) and adds a random `id` and a **commitment**: an HMAC, under a key derived from the root, over the account and the manifest digest. The commitment is checked before the stored key opens anything, so a record stays bound to one account and one manifest, as the version 1 seal's additional data bound it.
- **New remembers write version 2.** Where a browser cannot store the key object, or does not read it back intact, the remember is version 1 as before (owner decision, listed in STATUS: such a browser keeps version 1). Chromium and Node are tested; Firefox and WebKit are Stage 8 rows.
- **Migration:** the next open of a version 1 record unseals it as before, then writes the version 2 record in its place by compare-and-swap (only if that exact version 1 record is still stored), reads it back and checks the commitment. Any failure puts the version 1 record back, so the migration never costs a remember. The version 2 record keeps the version 1 seal's digest (`migratedFrom`), so another tab that opened with the version 1 record still recognises its record (idle check, Health choice, drop on a stale event).
- Same database and stores (`zigoals-device-unlock-v1`, version 1): no IndexedDB upgrade.

**T2 now (script running in the origin, on a device with a version 2 record):**
- It **can** use the root while the app runs: derive record keys and decrypt what this account's session can fetch, exactly as the app does.
- It **can** derive keys and export *those*: a per-record key for a record whose salt it knows, or a legacy version 1 per-domain key of an epoch (which opens that domain's legacy-envelope records of that epoch). It can post the key object to another context of this origin; it stays non-extractable there.
- It **cannot** export the root's bytes, wrap it, or unwrap anything: no stored key has `unwrapKey`, and an HKDF key is never extractable. The finding's lasting offline copy of the root is closed for version 2 records. A version 1 record that remains (a browser that cannot keep version 2) keeps the old T2 row.
- Unchanged: T3 (someone with the profile's files), and **after losing a remembered device or a suspected compromise: revoke its session, then rotate the vault key.**

**B2, as built** (`apps/web/lib/account-session.ts`): **Lock** locks the tab where it is clicked at once, as before, then every other tab of this browser: it sends a manual lock on the `zigoals:account-lock:v1` channel, then the plain `'lock'` that tabs of earlier builds understand. A tab of this build marks that lock as manual, so a remembered device does not reopen it; then the device is forgotten (the broadcast goes out even if forgetting fails). The panel says "Locking locks every tab of this browser and forgets this device."

**Rollback:** a build before Session U (for example #27 or #28) treats a version 2 record as one it cannot use: it deletes it and asks for the recovery secret once. Rolling forward again needs the secret once too (the deleted record is gone); nothing else is lost.

