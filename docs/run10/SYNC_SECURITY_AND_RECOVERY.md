# Run #10 private data threat model and implementation decisions

Status: implementation in progress, NOT a deployed sync service or security audit.

The existing local records are plaintext in the browser. Opt-in encrypted transport keeps private payloads from storage/auth operators and other tenants. The service necessarily sees account identity, opaque record IDs, domain, revisions, sizes and timing. A compromised application bundle, unlocked browser, extension or OS can read data. This does not promise anonymity, hardware protection or remote erasure.

Chosen key design: random 256-bit vault root generated on-device; independent random 256-bit recovery secret wraps it using AES-256-GCM. No email, login password, wallet address, access token or server-visible signature derives encryption keys. Domain keys use HKDF-SHA256 with vault identity and distinct domain context. Every write generates a fresh 96-bit nonce. Authenticated context includes protocol, vault, domain, opaque object ID, revision and key epoch. Keys stay in memory; only wrapped material may be persisted. Recovery secret is shown only on explicit setup and never logged, included in URLs, screenshots or sent to backend. No low-entropy passphrase mode is offered.

Authentication candidate: maintained Supabase email OTP, separate from recovery-key unlock. No existing local project auth/bindings were found. SMTP/provider setup and approved recipients remain owner actions. No invented password/session cryptosystem. Production session revocation, account deletion and protected callbacks must be verified before activation.

Local storage design: transactional IndexedDB records and outbox, original legacy bytes retained inside the private database before publication, bounded parsing, version rejection, explicit restore snapshot and no silent memory fallback. Showcase remains in its isolated session namespace. Financial aggregates require compare-and-swap; unresolved concurrent edits preserve both candidates rather than last-write-wins. No financial signing is involved.

Remote transport design: authenticated tenant-derived scope, opaque encrypted records, atomic revisions/idempotent operations and tombstones. Prototype/local transport tests are NOT evidence of hosted email, production tenant policies, physical devices or cryptographic revocation. No hosted activation until every relevant security gate passes.

Recovery: a code rollback must never overwrite a newer data schema. Preserve source and private data separately. Losing all unlocked devices AND the recovery secret makes ciphertext unrecoverable; email recovery cannot decrypt it. Browser eviction can erase local-only data. Clearing an account locally is not remote erasure.

Sources checked 2026-09-23: https://supabase.com/docs/guides/auth/auth-email-passwordless and https://supabase.com/docs/guides/auth/auth-smtp (OTP template/sender limitations); https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/ (coordination alternatives). Supabase is selected over a homegrown auth service; a separate Cloudflare auth system would add session/security implementation and setup. Hosted design remains pending actual configuration.

## Limits against a malicious or compromised sync server (added 2026-10-04, Session S, FIX_PLAN E3)
From the pre-Alpha review ([FINDINGS.md](../security/review-2026-10/FINDINGS.md), "Malicious or compromised sync server: what the client detects", `Q-SYNC-03`, `Q-SYNC-07`, `Q-SYNC-08`), checked against the code at `d439dc9`. One untrusted server sequences every write, so some limits are inherent.

| What the server does | Detected by the client? |
|---|---|
| Replays an older encrypted catalog to a device that keeps its journal | **Yes**: "Older encrypted catalog refused" |
| Serves a different catalog at the same revision (a fork) | **Yes**: "fork refused" |
| Inflates or lowers the unauthenticated global revision | **Yes**: head anchor and revision check |
| Rolls back or swaps one part | **Yes**: parts are immutable; the AAD binds ID, section, revision and epoch; per-section sizes and SHA-256 are in the authenticated catalog |
| Serves another vault's or account's records | **Yes**: manifest equality, AAD and a different root |
| Relabels a record's epoch, or the manifest's vault or epoch | **Yes** |
| Withholds referenced parts or the head | **Yes** with a journal ("Snapshot is incomplete"); **no** on a fresh device, which then sees an empty cloud (nothing is deleted) |
| Rolls back a device with no journal (new device, eviction, cleared data) | **No** |
| Freezes a device at the last head it saw, or forks writes per device | **No** (inherent: one sequencer) |
| Downgrades to an older epoch | **No**, if the person types the old secret (`Q-SYNC-03`) |
| Returns `manifest: null` | **No**: the app offers to create a vault, and the remembered record is dropped (`Q-SYNC-08`) |
| Fakes "section deleted" | Partly: shown as "cloud copy deleted"; local data is kept |
| Forges 401, 409, 410 or 507 | Not destructive: the tab locks or sync pauses; local data is kept |
| Makes the client delete local data | Not possible (none found) |
| Learns plaintext from side channels | No content. Sizes, sections, change locality and timing are visible (`Q-SYNC-07`) |

**After losing a remembered device:** revoke its session from another device, then rotate the key. A script on that device could have copied the root (ADR-008 T2, corrected).

