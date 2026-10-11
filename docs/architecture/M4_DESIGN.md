# Milestone 4 design

The owner's Run 4 brief authorizes implementation, verification, a feature PR and a conditional isolated web preview. This is release infrastructure and security hardening of the existing product. Start: merged main `7d354e3c72fa671abc100facf908b247fb992cc0`; feature branch `feat/m4-release-alpha`.

## Canonical contract build

Use two fresh GitHub Linux runner jobs with pinned toolchains, clean checkout/target directories, controlled locale/timezone and explicit source-path remapping. Compare actual bytes, sizes, validated manifests and source identity. Candidate metadata records the real source, tree, lock hash, compiler/optimizer/validator and runner identity. A mismatch blocks candidate promotion. Developer Mac builds remain non-authoritative. No contract semantic change is justified merely to match bytes.

GitHub-hosted Ubuntu with recorded image version is maintainable and available now; a digest-pinned container could improve environmental stability but adds image maintenance and distribution trust. Independent builds and fail-closed comparison detect drift in the chosen hosted environment. Do not call a moving runner label an immutable image.

Separate PR reproducibility verification from explicit manual release-candidate issuance. Use the same canonical scripts in both. Official GitHub OIDC attestation may certify exact bytes and source; it never certifies security or owner approval. Only owner action can approve a future testnet upload. No tag, GitHub release, wallet, signing or chain upload is part of this run.

## Public Alpha

Preserve Next.js 16 and existing local/wallet/storage behavior. Add explicit build modes `LOCAL_SIMULATION`, `PUBLIC_ALPHA_UNDEPLOYED`, `TESTNET_DEPLOYED`. Default and public builds refuse financial wallet operations at preparation, signing and broadcast boundaries. The deployed mode additionally requires the existing strict deployed manifest and runtime chain evidence. Invalid modes fail closed. Local simulated operations remain available. A wallet connection is compatibility evidence only.

Persistent mode copy, safe version/build identity and copyable diagnostics omit wallet address and private plans. Alpha metadata and robots discourage indexing. Bug-report links contain no user information. Goals remain browser-local; tests inspect requests for private sentinel values while exercising creation, editing, backup/recovery and network diagnostics.

Production CSP must remove broad inline-script permission using per-request nonces with dynamic rendering, or build-derived script hashes only if a static deployment is proven compatible. Avoid production eval, permit only configured public RPC/REST and local assets, frame-deny, no sniff, narrow permissions/referrer policy and HTTPS HSTS. Test actual production navigation and wallet injection; never claim a mocked extension proves a real Keplr CSP pass. Existing inline presentation may use a narrowly documented style policy if replacing it would introduce unnecessary complexity.

## Cloudflare choice and conditional publication

Evaluate official current guidance against this existing app. Static export cannot trivially represent arbitrary browser-owned `/app/goals/[id]` routes. Cloudflare currently recommends beta vinext for new Next deployments; OpenNext remains documented but has runtime constraints. A beta framework replacement is a material tradeoff, not an automatic migration. Prefer the smallest compatible approach demonstrated by production Workers-runtime tests; record unsupported paths and limits honestly.

Use isolated `zigoals-alpha` configuration with no apex routes, no DNS/email mutations and no analytics. Prove local and hosted checks, security mode, privacy, rollback and compatible packaging before preview publication. Inspect available Cloudflare access. If actual owner login/permissions are unavailable, deliver exact minimal deployment steps. A custom alpha subdomain is optional only after real preview verification and exact DNS-change inspection. Landing CTA is a separate draft, never automatically published.

## Evidence and boundaries

Fresh baseline: 399 JS, 25 Rust, 30 browser cases and full Chrome restart passed. Main push run `34764912650` completed success at the starting SHA. Keep historical M1–M3 reports, marketing landing, license, email routing and existing private data intact. Independent contract and frontend engineering reviews are not professional audits. Prioritize material findings with regressions. No private inbox/Discord, faucet retry, real wallet tests, guessed strategies or external outreach. End with clean pushed feature branch, open unmerged PR, actual hosted results and a 38-part report.
