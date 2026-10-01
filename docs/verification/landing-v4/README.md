# Landing V4 — integration verification

The apex landing page at `landing/` is now the owner-approved V4 company site. This package records what was imported, what was deliberately left behind, and what was measured in this repository after the import. It is evidence for the integration pull request; it is not a deployment record. No production deploy, DNS change or Cloudflare mutation happened while preparing it.

## Source

| | |
| --- | --- |
| Design source | `/Users/Shared/ZIGoals-Website-Concept` (standalone, owner-approved, left unmodified) |
| Standalone package | final v4, generated 2026-09-30T21:15:24Z |
| Integration base | `main` at `75bf6497400f1c19915a0e8ec20634faf1baf65f` (merge of PR #53) |
| Branch | `landing/final-v4-integration` |
| Apex Worker | `zigoals` — unchanged |
| Alpha Worker | `zigoals-alpha` — untouched by this work |

The standalone directory is the reference copy and stays where it is. Nothing was developed inside it; files were read and copied out.

## What was imported

204 files, 7,481,170 bytes — the complete public runtime and nothing else. Per-file sizes and SHA-256 hashes are in [ASSET_MANIFEST.md](ASSET_MANIFEST.md).

- `index.html`, seven stylesheets, four scripts.
- 19 real public-Alpha captures — exactly the 19 the page references.
- The approved origami brand film as its two web encodes plus the poster.
- 162 origami scroll assets: six shapes × (20 desktop frames + 6 mobile frames + 1 settled still).
- Brand mark, favicons, Open Graph card.
- A new `_headers` file (below) and a rewritten `.assetsignore`.

Every copied file is byte-identical to the standalone source, verified with `diff -rq`. The three edits to `index.html` are listed under *Changes made during import*.

## What was deliberately not imported

| left behind | why |
| --- | --- |
| `assets/video/zigoals-origami-master-reference.mp4` (15,737,961 bytes) | archival 4K master; the page never requests it |
| `assets/product/source/` (34 MB) and 30 superseded loose captures | capture intake, not runtime |
| `activity-desktop.webp`, `habits-detail.webp`, `today-full-desktop.webp` | present in the package, unreferenced by the page |
| `review/` (131 MB), `backups/`, `tools/`, `docs/plans/` | review, backup and build material |
| `scripts/origami-state.test.mjs` | development test |
| `assets/brand/favicon.png`, `hero-poster.webp`, `zigoals-mark.webp`, `assets/social/card.html` | superseded or tooling |
| `README.md`, `FUTURE-INTEGRATION.md`, `assets/*/README.md`, `provenance.json` | documentation; the provenance facts are reproduced in the asset manifest instead |

## Changes made during import

Three, all owner-approved, none of them design:

1. **`<meta name="robots" content="noindex, nofollow">` removed.** The standalone was deliberately unindexable; the apex is the public company site.
2. **The comment calling the canonical and social URLs "illustrative" removed.** They are the real production URLs now.
3. **The footer's `LOCAL WEBSITE CONCEPT` label removed**, keeping its decorative `✧` so the footer's three-column balance is unchanged. The string is false once the page is served from `zigoals.app`. Nothing else in the footer changed; the independent/unaudited line is untouched.

The design itself was not reinterpreted. Copy, layout, palette, motion, the equation treatment and the exact owner slogan are the approved bytes.

## Security headers

The standalone package shipped no `_headers` file, and the live apex currently returns no security headers at all (verified: `curl -sSI https://zigoals.app/` on 2026-10-01 returns only Cloudflare's own `cf-cache-status`, `report-to`, `nel`, `server`, `cf-ray` and `alt-svc`). `landing/_headers` therefore adds protection and removes none:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; media-src 'self'; font-src 'self'; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: accelerometer=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()
Cross-Origin-Opener-Policy: same-origin
```

No HSTS and no `includeSubDomains`/`preload` directive is introduced, and no Cloudflare zone setting is touched. The strict CSP is possible because the page has no inline `<script>`, no inline `<style>`, no `style=` attribute, no `data:` URI and no external stylesheet, font or script — confirmed by grep over the imported tree and by a clean console at five viewport sizes.

`_headers` is denied in `.assetsignore` on purpose. Wrangler still parses it (`✨ Parsed 1 valid header rule.`) while leaving it out of the upload, so the policy applies and the file itself is not fetchable — both halves verified against a local Workers-Assets server.

## Deployment-config change

`landing/.assetsignore` previously allowed exactly one file, and `scripts/check-deployment-configs.mjs` asserted that literal two-line content, so a multi-file site could not pass `pnpm check:deploy-configs`. The rule is now deny-by-default with a fixed allowlist, and the checker enforces three things instead of one:

1. `.assetsignore` must still open with `*`.
2. Every `!` negation must be one of ten approved public paths — anything else (`!wrangler.jsonc`, `!docs`, `!review/**`, `!tools/**`, `!backups/**`, `!assets/product/source/**`, `!**`, `!*`, `!_headers`) is rejected by name.
3. The type denials that follow the negations must all be present, and the real `landing/` tree must contain no non-public file: no `.wrangler/`, `node_modules/`, `docs/`, `review/`, `tools/`, `backups/`, `source/` directory, and no `.md`, `.json`, `.jsonc`, `.py`, `.sh`, `.test.*` or `.env*` file.

Every other isolation guarantee is unchanged: Worker names, `assets.directory`, host-scoped routes, the ban on bindings, vars and services, and the Alpha-side checks.

## Landing contract tests

Three places outside `landing/` asserted the old page and had to follow it: `apps/web/tests/landing.spec.ts` (the landing's own contract test, which CI runs), `apps/web/tests/run9-2-visual.spec.ts` (an opt-in capture) and `scripts/verify-hosted-alpha.mjs` (the live-apex verifier). Each asserted the old `Explore the Alpha →` CTA and the old safety copy; the first two also served `index.html` alone from an in-memory server, which cannot render a multi-file site.

No assertion was dropped to make them pass. The harness now serves the real `landing/` directory with Cloudflare's content types, and every original assertion has a V4 equivalent. Four are new: no third-party request, no Google Fonts link, the equation's stepped reveal, and its reduced-motion settled state. These are the only files this work touches outside `landing/` and `docs/`.

## A defect inherited from the approved package

The equation's four-step reveal does not reach the words. The state machine and the four progress bars step correctly, but a rule in `styles/final-v4.css` overrides the dimming in `styles/motion.css`, and removing it only half works because V4 paints the spectrum from the parent, so a child's `opacity` cannot dim its glyph. It is the same in the standalone directory — the bytes are identical — so this is not an import regression. Nothing was changed; the measurements, the cause and three possible fixes are in [QA.md](QA.md).

## Limits of this evidence

- **Physical iPhone Safari is unverified.** Everything below was measured in Chrome on macOS. The standalone package said the same; importing does not change it.
- The local Workers-Assets dev server answers `Range` requests with `200` and the whole file rather than `206`. Cloudflare's production asset server does support ranges, so in-film seeking could not be exercised locally; the page has no seek control, and playback, pause, replay and sound were all verified by playing through.
- No WCAG certification, Core Web Vitals measurement, GPU/CPU attribution, Low Power Mode test, slow-network test or security audit is claimed.
- These numbers describe the committed bytes, not a deployed site. Nothing has been deployed.
