# M5 live Alpha hardening implementation plan

> **For agentic workers:** Use subagent-driven-development task by task. This checklist implements the owner's approved Run 5 brief; ordinary reversible decisions are authorized without further approval.

**Goal:** Make repository operations and evidence accurately support the now-live public Alpha, with safe reload UX and isolated deployment tooling.
**Architecture:** Keep the deployed financial boundary unchanged. Correct config-relative static assets and validate both deployment targets. Preserve fail-closed local mode on reload and require an explicit wallet reconnect; an optional tab-scoped hint is presentation only and cannot restore an account or grant capability.
**Tech Stack:** Next 16.3.5 / React 19.3, Node 24.19.0, pnpm 11.19.0, Wrangler 4.131.1, CosmWasm / Rust 1.85.1.
**Spec:** Owner Run 5 brief at `/Users/AIUSER/.codex/attachments/376e1cf9-f65f-43f7-8b72-2073ed32ad6b/pasted-text.txt`.

## Global Constraints

- Starting main: `6be2de74f22f676e6a633ed05208decebb0dbff3`; branch `feat/m5-live-alpha-hardening`.
- Production state is READ-ONLY. No web deployment, DNS/email mutation, paid resource, release issuance, tag, financial signing/broadcast, chain upload, outreach or X post.
- Worker `zigoals` serves `zigoals.app`; `zigoals-alpha` serves `alpha.zigoals.app`. Do not interchange configurations.
- Keep `LOCAL_DEMO`, `PUBLIC_ALPHA_UNDEPLOYED`, `TESTNET_DEPLOYED`; unknown/missing modes fail closed.
- Goal Manager NOT_DEPLOYED, wallet owner-observed 0 ZIG, Idle only. Funding/upload permission, Valdora and WME interfaces remain pending.
- Owner's real hosted Keplr evidence is OWNER_VERIFIED_HOSTED_EXTENSION_EVIDENCE, not an automated extension test.
- Attested candidate applies ONLY to source `3645b489e4bc2a31ef16d39bdc27f7c00e2ecd72`, run `34772005556`, Wasm SHA256 `9ac9fec2941db7be4db13b4f6d7f8512b3d4fb87165e0284eaa10385782bea10`. It is NOT APPROVED for upload.
- Preserve historical Run 1–4 reports. Use fictional data for public smoke and redact wallets to the supplied truncated identifier. Never invent observation times.
- Read `apps/web/AGENTS.md` and relevant installed Next docs before web code. No dependency upgrades without demonstrated need.

## Controller evidence and acceptance checklist

- [x] Fetch, verify clean expected main, create requested branch in the existing dedicated checkout.
- [ ] Record owner evidence with null observation timestamp and actual recorded-at clock.
- [ ] Read-only inspect existing release artifacts, validate bytes and GitHub native attestation against exact source.
- [ ] Independent public HTTP/TLS/headers/fresh-nonce/performance and browser fictional lifecycle/backup/diagnostics checks; capture all outbound headers, bodies, URLs; inspect layout, errors, resources and landing links.
- [ ] Public DNS snapshot without changing records or exposing forwarding destinations; label unavailable private account/CPU/email evidence.
- [ ] Fresh production/full pnpm and Rust audits, lock/source checks.
- [ ] Consolidate current status, README, release/deploy/privacy/checklists/social drafts and 31-part Run 5 report.
- [ ] Full lint/types/unit/build/Rust fmt/clippy/tests/schema/generated/secrets/browser/restart/workerd checks.
- [ ] Focused independent review; commit, push, PR against main, observe CI and fix failures, leave unmerged.

### Task 1: Isolated landing deployment regression

**Files:** `landing/wrangler.jsonc`, `landing/.assetsignore` if needed, `scripts/check-deployment-configs.mjs`, `scripts/check-deployment-configs.test.ts`, root `package.json`, `.github/workflows/ci.yml`, `docs/deployment/LANDING.md`.
**Interfaces:** Produce a no-network validation command `pnpm check:deploy-configs` and root-only canonical `pnpm check:landing` dry run. The former reads repository configs and returns nonzero on target/path/isolation mismatch. No deployment automation is added.

- [ ] Reproduce existing `landing/landing` failure using installed pinned Wrangler with `--dry-run`, with telemetry disabled and no account mutation.
- [ ] Read pinned Wrangler path-resolution behavior and fix `assets.directory` to `.` if confirmed. Prevent config or local scratch files being public assets with a narrow `.assetsignore` allowlist.
- [ ] Add regression tests using actual config validation and tampered fixture objects: swapped names, old asset path, cross-target host/routes, Alpha self binding mismatch, unexpected executable/bindings in static apex, missing index. Valid current pair passes. Avoid brittle string-only implementation tests.
- [ ] Add root commands and CI non-uploading gate. Resolve config from repository root, not caller working directory. Use pinned workspace Wrangler, no global installation.
- [ ] Run dry run and inspect exact target and assets. Write owner-only deployment and rollback commands with explicit config paths and known safe Worker/version checks. Preserve CTA wording and links unchanged.
- [ ] Run covering tests, lint/types where affected, self-review full diff, commit only owned files, report evidence and any limits.

### Task 2: Explicit safe wallet reconnect after reload

**Files:** `apps/web/components/goal-provider.tsx`, `apps/web/components/shell.tsx`, focused helper if needed, `apps/web/lib/goal-provider.test.ts`, relevant wallet/mode tests and `apps/web/tests/` browser coverage, `docs/deployment/KEPLR_OWNER_CHECKLIST.md` reload section.
**Interfaces:** Existing `connect()` remains the ONLY reconnect action. Any new presentation-only hint must not restore mode, owner, balance, financial capability, or invoke extension methods.

- [ ] Trace initial local state, connect flow, account-change and stale-request cancellation. Read official Keplr enable/getKey documentation: enable may unlock/prompt; getKey has permission/unlock prerequisites, without a documented universal silent-permission guarantee.
- [ ] Choose Outcome B: local mode on reload, explain intentional reconnect. A successful connection may save only a versioned boolean tab-scoped sessionStorage hint to show `Reconnect Keplr` after reload. Never save wallet/account or read marker as authorization. Clear on explicit Local demo choice; invalid/unavailable storage must leave app usable and fail closed.
- [ ] Write tests first proving no enable/suggest/getKey/signer/preparation/sign/broadcast on mount/reload; explicit reconnect uses existing verified connection flow; stale request, account switch, rejection and tab-mode invariants hold. Retain unknown/missing/public low-level financial refusal tests.
- [ ] Implement minimal UI/hint change; no automatic wallet access, network permission loop or signer. Explain browser permission may remain remembered but extension may still prompt when explicitly reconnecting.
- [ ] Add browser reload coverage with injected provider clearly labelled mock, asserting Local demo after reload, no automatic extension calls, explicit reconnect and local-choice behavior. Do not treat mocks as owner hosted proof.
- [ ] Run focused unit/browser checks, self-review, commit owned files and report exact results. Controller owns later full suite and production packaging.

### Task 3: Repair independently observed public presentation defects

**Files:** `landing/index.html`, Alpha app icon/metadata file, focused local browser checks (separate from live evidence), and deployment asset validator/allowlist only if the chosen icon requires a new landing asset.
**Interfaces:** Preserve exact CTA text/href/target/rel and both safety sentences. No production deployment. Existing scripts/check-deployment-configs validates any consciously expanded minimal public asset allowlist.

- [ ] Reproduce hosted findings locally: landing 320px viewport has 335px document width; Alpha and apex implicitly request missing `/favicon.ico`. Locate overflowing element before CSS fix; do not hide overflow to conceal content.
- [ ] Apply minimal responsive typography/layout correction preserving existing branding and copy. Provide same-origin/local icons with explicit link metadata, no external asset or telemetry. Read installed Next metadata/icon docs first.
- [ ] Add meaningful local browser regression at 320,390,768,1280px for landing content visibility/no overflow and exact CTA/disclaimer; assert fresh-context icon requests resolve on Alpha/apex. Keep real-host pre-fix findings documented, since M5 cannot redeploy.
- [ ] Re-run relevant browser/asset/isolation/dry-run checks and lint/types; commit owned fixes and report exact results.
