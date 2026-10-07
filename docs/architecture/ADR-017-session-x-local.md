# ADR-017: Session X-Local, "ZIGi comes alive"

Status: **In progress; implemented in Session X-Local on the owner's Mac (branch `feature/session-x-local-zigi`, base `main` `72ad872`), not merged or deployed at the time of writing.** It builds on [ADR-014](ADR-014-zigi-v2.md) (ZIGi v2) and [ADR-015](ADR-015-session-w.md). Session X-Cloud runs in parallel on `feature/session-x-cloud`; lanes and the handoff files are described below. The product record is [ZIGI_ALIVE_X.md](../product/ZIGI_ALIVE_X.md); the real-model evidence is [ZIGI_REAL_MODEL_TEST.md](../verification/x-local/ZIGI_REAL_MODEL_TEST.md).

## Context
- Studio-2 (2026-10-06) delivered real art for eleven of ZIGi's twenty-five states: per state a static 1×/2×/large WebP, a 96×126 animated WebP (≤400 kB) and an APNG fallback, plus a reference companion controller (`controller.mjs`) with its tests and a semantic-event schema. Studio-4 (from 2026-10-08) will deliver the same file names plus reactions R001–R013, so later updates must be a pure file swap.
- Session V's manifest v2 shows one placeholder frame for every state with a small CSS move each; the launcher shell never imports the manifest.
- The owner's goal for this session: ZIGi · your AI feels like a flawless premium feature, the real animated ZIGi is alive in the app with emotions matching what the person and the AI do, and everything is tested so the owner doesn't have to.

## Owner decisions (2026-10-07, plan approval)
- **D1.** Small 96×126 animated WebP only; the large 192×253 set waits for Studio-4. WebP only, no alpha video. Never re-encode or edit the studio's images.
- **D2.** Use the most fitting delivered animations as idle variations; F008 sleepy only after the existing inactivity rule.
- **D3.** Of the two PC model pulls, at least one is a tool-capable model from a family other than Qwen (model-agnostic proof).
- **D4.** Auto-accept: Health logging kinds are eligible only while the Health gate is open, opt-in per kind; weight and fasting stay manual; money, wealth, funding, staking and pre-fill kinds are never eligible.
- **D5.** Calm celebrations: celebrate/proud only for meaningful validated moments; ordinary check-ins get a small success at most; a daily cap on celebrations.
- **D6.** The golden set is never weakened: the 91 existing cases stay unchanged at 100 %; the deterministic CI subset grows to ≥200; the model-scored corpus lives beside it.
- **D7.** The emotion hint marker is stripped before display and before every stored or outbound path.
- **D8.** Home-GPU support (a person's own Ollama on their LAN) is research and a recommendation only; no CSP change in this session.

## Lanes
- **This session owns:** `apps/web/components/zigi/**`, `apps/web/lib/ai/**`, `apps/web/public/brand/figures/zigi/**` and the old `zigi-placeholder*` files, the manifest, the ZIGi docs (`docs/product/YOUR_AI_*`, `ZIGI_*`), the ZIGi specs and the golden set, Settings → ZIGi groups, Help's ZIGi topic, Meet ZIGi, the app route `/api/zigi` (client side only).
- **X-Cloud owns:** chain config, performance/shell/sync/wallet lazy-loading, middleware/headers/CSP, `/api/market-logo`, CI and intermittents, dependencies, Workers (incl. `workers/zigi-relay` and push), accessibility and data-safety work outside ZIGi, Settings/Help outside ZIGi, the friends-Alpha pack, the deploy #32 / coordinator STATUS records.
- Requests across the lane go through `docs/handoff/X_LOCAL_TO_CLOUD.md` and `docs/handoff/X_CLOUD_TO_LOCAL.md`.

## Decision

### 1. Real ZIGi art in (Part 1, Tier 2)
- The 55 Studio-2 contract files are copied byte for byte to `apps/web/public/brand/figures/zigi/origami-nebula/` (6,989,976 bytes; receipt: [STUDIO2_RECEIPT.md](../verification/x-local/STUDIO2_RECEIPT.md), every SHA-256, pixel size and frame count). Nothing re-encoded.
- Manifest v2 (data): the skin is no placeholder; its base frame is the idle art; the eleven delivered states carry their five files (`1x`, `2x`, `large`, `animated` = `.anim.webp`, `animatedFallback` = `.anim.png`); the fourteen other states wear a delivered clip (`wears`), chosen after watching every clip on the studio review page (the table and the reasons are in [ZIGI_ASSET_SPEC.md](../product/ZIGI_ASSET_SPEC.md)); the Studio-4 slots exist and are empty.
- The picture (`zigi-image.tsx`): the poster shows at once; the animated file is fetched and decoded off screen, then swapped in only while motion is allowed and the figure is on screen; a browser that cannot play animated WebP (decided once by a one-frame probe, `motion.ts`) gets the APNG. A state's own clip carries its motion: while it plays, the CSS move rests (`[data-own] img[data-playing]`); worn clips keep the state's own CSS move on top.
- The shell stays small: the launcher figure reads the frames from the bus (`zigiFrames`), published by the lazily loaded alive chunk (`alive.ts`: the state machine on every page plus the frame table for the chosen skin and motion setting), and shows the idle still until then. The chat's avatar reads the manifest directly.
- Optical centre re-measured in Chrome from the idle art: x +0.023, y −0.090 (the placeholder: −0.041, +0.001); the figure box is 1.18× the placeholder's (the studio's figure fills 83 % of its frame) so ZIGi reads the same size.
- Tests: `lib/ai/zigi-assets.test.ts` (names, formats from the bytes, pixel sizes, budgets, loop counts, every state resolvable, every chain ending in a file, the slots empty, the placeholders gone); the manifest, look and brand tests updated; `tests/zigi-alive.spec.ts` on the real files (the optical centre at 1× and 2×, the clip semantics of the motion test).


## Session decisions (taken without asking, the safest option that keeps every promise)

| # | Part | Decision | Why |
|---|---|---|---|
| S1 | 1 | The studio's `CHECKPOINT-RECEIPT.md` lists none of the `encoded/` files, so the brief's "verify by SHA-256 against the receipt" cannot be done as written. Every copied file is verified by SHA-256 against its source (byte identity), by byte count against `encoded/encode-report.json` and the handoff table, and by its decoded header (format, pixel size). The repository keeps its own receipt, `docs/verification/x-local/STUDIO2_RECEIPT.md`, with every SHA-256; the Studio-4 importer verifies against that format. | The only hash source that exists; the repo's receipt makes the next swap verifiable. |
| S2 | 1 | The studio's file names (`<code>-<state>.anim.webp`, `.anim.png`) replace the spec's `-anim.webp`; the spec is updated. | Studio-4 ships the same names; a pure file swap needs them unchanged. |
| S3 | 1 | Files live under `public/brand/figures/zigi/origami-nebula/` (the spec's per-skin folder), not the handoff's `zigi/`. | The spec's "To add a skin" step; the importer targets `<skin>/`. |
| S4 | 1 | The three `zigi-placeholder*.webp` files and `SHELL_FRAME` are removed. A repo-wide grep (apps, landing, workers, the service worker and push code, Help, docs, tests, scripts, the manifest) found references only inside this lane: the manifest, `zigi-look.ts`, `zigi-alive.spec.ts` and the Customize "Coming soon" silhouette (now the idle art). The push code uses the separate `zigi-reminder*.png`, untouched. | Nothing outside the lane needs them; every fallback chain ends at idle's own art. |
| S5 | 1 | The studio's figure fills 83 % of the frame (the placeholder filled 100 %): the launcher and panel figure boxes are scaled by about 1.18 so ZIGi reads the same size; the optical offset is re-measured from the idle art. | The handoff's own note; checked by eye and by the centring test. |
| S6 | 1 | The APNG fallback is chosen by a one-time animated-WebP feature detection in the browser, not by `<picture>`. | One decision per page, testable, no double download. |
| S7 | 3–4 | A small "alive" chunk (the state machine, the controller, the idle rotation, the manifest) loads lazily on app pages when the browser is idle after mount and the launcher is visible; it is never part of the shell JS. The chat chunk still loads on the first open. | ZIGi reacts on every page without growing the shell. |
| S8 | 6 | The PC's Ollama is reached from the browser through a throwaway Node `http` forwarder on `127.0.0.1:11435`, kept outside the repository, stopped at the end. The PC address is never printed or committed. | The app allows only localhost/127.0.0.1 servers; the brief's rule. |
| S9 | 6 | LM Studio is not running on this Mac during the session; it is reported as unavailable, not tested. | Honest inventory. |
| S10 | 6 | Chrome's on-device model is checked for availability only; no 22 GB download is started without the owner. | The owner's disk and consent. |
| S11 | 2 | Reaction slots R001–R013 carry `trigger: null` until Studio-4 or the owner names them (the importer reads an optional `reactions.json`). | Semantics are not invented. |
| S12 | 5 | A correction ("make it 3 times a week") is a card with `"revise": true` that supersedes the previous reply's still-pending cards. | Multi-turn corrections without a new protocol. |
| S13 | 5 | Auto-accept eligibility per D4; default off per kind; daily cap 20. | Owner decision. |
| S14 | 8 | What's new gets a ZIGi section and the release id is bumped once; recorded in the handoff so X-Cloud does not bump it again. | Shared file, one bump. |
| S15 | 6 | WebKit runs through a separate Playwright config (`apps/web/playwright.webkit.config.ts`); `ci.yml` is untouched. | CI is X-Cloud's lane. |
| S16 | 0 | One PC pull is a tool-capable model from a family other than Qwen (D3); the other a small quick model. ≤2 pulls, ≤40 GB, PC only, through its HTTP API. | Model-agnostic proof. |
| S17 | 4 | Calm celebrations (D5): the list and a daily cap of 3 on top of the ≥8 s reaction rate limit. | Owner decision. |
| S18 | 4 | The emotion hint is stripped at one choke point (`lib/ai/emotion-hint.ts`) before every stored or outbound path (D7). | One place to test. |
| S19 | 6 | The 91 golden cases are immutable (D6). | Owner decision. |
| S20 | 6 | Home-GPU support is research and a handoff recommendation only (D8). | CSP is X-Cloud's lane. |

## Assertions changed (deliberate, listed)
- `lib/brand-assets.test.ts` (Part 1): the `-2x` twin count 18 → 28 (eleven delivered states); `.anim.webp` clips exempt from the twin rule like `-large` frames; the name character class allows uppercase letters (`[A-Za-z0-9/_.-]`): the studio's codes are `F001`, `T001`, `E001`, and Workers Assets re-spells only characters that need percent-encoding (the test's reason), which letters never do.
- `lib/ai/zigi-look.test.ts` (Part 1): the look gains `skin` (the chosen look's name, for the alive chunk).
- `lib/ai/zigi-manifest.test.ts` (Part 1): `frameFor` returns the poster and the animated file side by side (and the APNG when asked); animated names end in `.anim.webp`, fallbacks in `.anim.png`.
- `tests/zigi-alive.spec.ts` (Part 1): the optical-centre check expects `F001-idle.webp` / `F001-idle-2x.webp` instead of the placeholder; the motion test expects the idle clip to play under Calm and Full (the CSS breath only until it can) and the poster to hold still under Off, Motion Off and reduced motion. Nothing loosened: every stop condition is still asserted, and the clip's file name is asserted as well.

## Rejected options
- **Renaming the studio's files to lowercase** to keep the brand test's character class: Studio-4 ships the same names and a swap must stay a copy; the test's reason (percent-encoding) does not apply to letters.
- **Keeping the placeholder frames as the base frame:** every fallback chain now ends in the idle art, and nothing outside the lane referenced them (repo-wide grep, Part 0).
- **`<picture>` with a `type` source for the APNG fallback:** a per-page probe is one decision, testable, and never downloads both files.
- **Shipping the manifest in the launcher shell** so the launcher could pick its own files: the shell stays the size it was; the frames arrive as data on the bus from a lazy chunk.

## Consequences
(Filled in at the gate.)
