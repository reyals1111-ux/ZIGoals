# Run #10 private data threat model and implementation decisions

Status: implementation in progress, NOT a deployed sync service or security audit.

The existing local records are plaintext in the browser. Opt-in encrypted transport keeps private payloads from storage/auth operators and other tenants. The service necessarily sees account identity, opaque record IDs, domain, revisions, sizes and timing. A compromised application bundle, unlocked browser, extension or OS can read data. This does not promise anonymity, hardware protection or remote erasure.

Chosen key design: random 256-bit vault root generated on-device; independent random 256-bit recovery secret wraps it using AES-256-GCM. No email, login password, wallet address, access token or server-visible signature derives encryption keys. Domain keys use HKDF-SHA256 with vault identity and distinct domain context. Every write generates a fresh 96-bit nonce. Authenticated context includes protocol, vault, domain, opaque object ID, revision and key epoch. Keys stay in memory; only wrapped material may be persisted. Recovery secret is shown only on explicit setup and never logged, included in URLs, screenshots or sent to backend. No low-entropy passphrase mode is offered.

Authentication candidate: maintained Supabase email OTP, separate from recovery-key unlock. No existing local project auth/bindings were found. SMTP/provider setup and approved recipients remain owner actions. No invented password/session cryptosystem. Production session revocation, account deletion and protected callbacks must be verified before activation.

Local storage design: transactional IndexedDB records and outbox, original legacy bytes retained inside the private database before publication, bounded parsing, version rejection, explicit restore snapshot and no silent memory fallback. Showcase remains in its isolated session namespace. Financial aggregates require compare-and-swap; unresolved concurrent edits preserve both candidates rather than last-write-wins. No financial signing is involved.

Remote transport design: authenticated tenant-derived scope, opaque encrypted records, atomic revisions/idempotent operations and tombstones. Prototype/local transport tests are NOT evidence of hosted email, production tenant policies, physical devices or cryptographic revocation. No hosted activation until every relevant security gate passes.

Recovery: a code rollback must never overwrite a newer data schema. Preserve source and private data separately. Losing all unlocked devices AND the recovery secret makes ciphertext unrecoverable; email recovery cannot decrypt it. Browser eviction can erase local-only data. Clearing an account locally is not remote erasure.

Sources checked 2026-09-23: https://supabase.com/docs/guides/auth/auth-email-passwordless and https://supabase.com/docs/guides/auth/auth-smtp (OTP template/sender limitations); https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/ (coordination alternatives). Supabase is selected over a homegrown auth service; a separate Cloudflare auth system would add session/security implementation and setup. Hosted design remains pending actual configuration.
