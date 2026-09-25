# Storage, recovery and encrypted transport checkpoint
Local implementation only; hosted accounts and full application sync remain incomplete.
- WebCrypto AES-GCM/HKDF: independent unlock, integrity/context/size rejection, random root/recovery; keys nonextractable/in memory.
- IndexedDB: atomic records/outbox/receipts/recovery, CAS, operation replay/reuse rejection, immutable queued snapshot; synthetic 2.4 MB/300-row case.
- Explicit legacy migration preserves exact original bytes, publishes unsupported-to-old-build marker last, resumes after pointer failure; Showcase rejected.
- Settings browser: Health250mL → upgrade → edit500mL → reload500mL verified; encrypted download disabled until recovery acknowledgement.
- Encrypted backup: 2.1MB fixture, exact strings, authenticated part inventory, missing part/wrong secret/future format rejection. One-module restore preview; no generic merge.
- Actual local workerd/Miniflare sync service test: auth fixture, two tenant scopes, independent recovery unlock, ciphertext storage, replay/conflict, tombstones and restart persistence.
- Sync coordinator tests: independent keys, conservative record merge, financial/delete conflicts, explicit tombstones, stale revision rejection, page revision consistency and batch bounds.
- OTP adapter tests: origin/config rejection, token only in HttpOnly cookie, cookie-derived proxy identity, local signout even if provider revocation is unconfirmed.
- Checks: vault crypto3/database4/local3/backup2/sync3 + account4 tests; Settings browser2 passed. Runtime test separately requires loopback permission.
- Required gaps: integrated account-scoped app persistence/outbox transport; real OTP; full two-browser journeys; device revocation/deletion/key epochs; server session revocation; expanded domain history capacity; durable throughput/batch staging.
- Limits: local32MB/domain,250KB top-level row,2MB index; transport1MB request/100changes,32MB ciphertext,50k operations; limits fail rather than silently erase facts.
- Native domain schemas retain their existing caps. This does NOT prove DAT-11 or core sync, and no hosted activation is authorized.
