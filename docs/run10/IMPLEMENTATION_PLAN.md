# Actual Run #10 implementation plan

Spec: MASTER_PROMPT.md. Scope, gates and exact acceptance stay in REQUIREMENTS.json.

- [x] Read entire master, verify branch/PR/base, preserve source and ten images.
- [ ] Complete required repository audit/source register and app route/control inspection.
- [ ] Shared visual primitives: financial-ui, evidence-chart, goal-card, shell, habits/card; regression tests then width/motion screenshots.
- [ ] Canonical provenance policy: release comparator/schema/consumers; positive host-only drift and negative critical-input fixtures; no release.
- [ ] Private storage: new lib/vault transactional adapter, legacy recovery and atomic outbox; fake-indexeddb fault/restart tests then actual browser integration.
- [ ] Client crypto: threat model first, AES-GCM/HKDF random keys/recovery wrap; tamper/context/wrong-key/plaintext-marker tests.
- [ ] Auth/backend: established email OTP adapter, explicit setup/consent/unlock; actual local transport/storage two-client proof. Hosted/device gates separate.
- [ ] Today presets/widgets and Goal creator; same canonical selectors and deliberate responsive forms.
- [ ] Financial revisions and reliability adapters; preserve exact arithmetic and pre-run contracts, test invariant/fault matrix before activation.
- [ ] Health daily workflows, free food lookup, ecosystem sourced discovery; bounded external capabilities.
- [ ] Integrate, full unit/static/build/browser/security checks, independent scope review and exact ledger reconciliation.

Each coherent slice: write meaningful failing tests, implement, verify, inspect diff/secret boundaries, checkpoint source and resume. Retry stalled external blockers only with new evidence. Never merge/deploy/live migrate/buy/sign financially.
