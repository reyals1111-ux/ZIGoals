# Public Alpha publication checklist

Current web state: **PUBLIC_ALPHA_DEPLOYED / OWNER_VERIFIED_LIVE** at https://alpha.zigoals.app/app. The owner also deployed the apex CTA. This checklist governs a future separately owner-approved Alpha update; M5 performs no production mutation and grants no contract/signing/DNS/email permission.

## Required evidence before upload

- Record the exact reviewed source commit, clean tree, app version and `PUBLIC_ALPHA_UNDEPLOYED` build mode.
- Require passing local lint/types/unit/Rust/build/schema checks and actual GitHub CI for that source. Record independent engineering review findings and close material issues.
- Verify production CSP, frame protection, HTTPS HSTS, no sniff, referrer and permissions policies. Exercise navigation and wallet detection in a production browser; distinguish mock injection from real-extension evidence.
- Verify direct wallet preparation/signing/broadcast calls refuse public mode, including when supplied a structurally valid mocked deployed manifest. Keep all real deployment IDs absent.
- Exercise local create, deposit, partial/full withdrawal, closure, backup/recovery, reload and participating tabs. Use only disposable fictional data.
- Observe request URL, headers and bodies for private sentinel names, targets, dates and notes through tested flows. Record actual public route/transport disclosures; do not promise secrecy from extensions, hosting access logs or compromised origins.
- Verify diagnostics/clipboard output contains safe build and environment fields, no full account, balances, plan, backup, token or arbitrary error body. Check ordinary bug and private security-contact links.
- Inspect desktop, small phone, keyboard/reduced-motion, empty/error states and no horizontal overflow. Measure the production asset/runtime baseline.
- Build and test the actual hosting package in the Workers runtime. Read dry-run output and free-plan compatibility limits. No implicit R2/database/paid-plan creation.

## Isolate publication

- Preserve the separate `zigoals` apex Worker, active version and public landing body; inspect them before and after. Preserve its existing build configuration.
- Inventory MX/SPF/DKIM and existing web records; keep values for comparison. Never delete or modify email routing records for an Alpha subdomain.
- Use a distinct `zigoals-alpha` Worker/configuration with no apex or wildcard routes. Keep analytics trackers absent. For an initial deployment, first publish to an isolated preview URL; for an update, preserve the existing verified fallback and custom domain.
- Record actual deployment/version ID, URL, source commit, build mode and time. Check the live HTTPS response and security headers, simulation lifecycle, diagnostics, mobile layout and private data egress.
- Bind `alpha.zigoals.app` only after preview verification, inspecting the exact single new web record/domain assignment. Verify TLS and repeat live checks. If the subdomain is unavailable, keep the verified preview URL and document the gate.
- Mark only an actually verified URL as deployed/official Alpha. Preserve the owner-reviewed apex CTA and disclaimer; a later apex update uses its own reviewed configuration.

## Rollback and handoff

Restore the last verified Alpha Worker version or detach/disable only its Alpha domain/route. Preserve the apex Worker and email. The owner-supplied known-good Alpha version is `c3843317-2105-4a18-bfb3-53067e81999b`; inspect current history and record the actual safe rollback version before any later update. Retain exact package/source evidence and describe the observed failure.

Browser data belongs to each origin. Changing from a preview hostname to the custom domain does not transfer local plans. Users may export/import their private metadata backup themselves; never collect these backups. A frontend rollback does not erase browser data. Once a contract is deployed, rollback needs a separately reviewed compatibility/exit plan.

Leave the feature PR open and unmerged with actual checks and known limitations. No contract funds exist in this run. Funding, upload permission, real signing and onchain reconciliation remain separate owner-controlled gates.

The first hosted real-Keplr gate is owner-verified at both origins. Retest after a material CSP/wallet update; injected mocks remain a separate regression signal. [M5 evidence](../verification/m5/OWNER_LIVE_ALPHA_EVIDENCE.json), [exact Alpha commands](CLOUDFLARE_ALPHA.md), [apex commands](LANDING.md).
