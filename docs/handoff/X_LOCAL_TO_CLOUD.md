# Handoff: Session X-Local → Session X-Cloud

Items in X-Cloud's lane that X-Local needs or found. X-Local never edits those areas. Each item says what, why, and the evidence. Dated entries, newest last.

## 2026-10-07 — opened
- Nothing yet. X-Local's lane: `apps/web/components/zigi/**`, `apps/web/lib/ai/**`, `apps/web/public/brand/figures/zigi/**` (+ the old `zigi-placeholder*` files), the manifest, the ZIGi docs/specs/golden set, Settings → ZIGi groups, Help's ZIGi topic, Meet ZIGi, `/api/zigi` client side.
- **Lane note:** ZIGi's chat, launcher, proposals and Customize live in `apps/web/components/ai/**`; X-Local treats them as ZIGi's (they are the surfaces the brief's Parts 4–6 change) and keeps launcher-shell edits minimal (one lazy import of `components/zigi/alive.ts`, the figure box size and the optical offset in `ai-launcher.css`). If X-Cloud's performance work touches `components/ai/ai-launcher.tsx` or `ai-launcher.css`, whoever merges second resolves; nothing else in the shell is edited by X-Local.
- Shared files X-Local will touch minimally: `docs/STATUS.md` (its own entry only), What's new (ZIGi section, one release-id bump, see below), `scripts/weight-budgets.json` (ZIGi entries only, with reasons). X-Local never records deploy #32 or the coordinator.

## 2026-10-08 — A person's own Ollama on their home network (owner addition 12): research and a recommendation
**Status:** research only; no CSP, middleware or `normalizeLocalBaseUrl` change in X-Local (ADR-017 S20). The CSP and
middleware lines are X-Cloud's; the setup code (`apps/web/lib/ai/providers.ts` `normalizeLocalBaseUrl`, the adapters' fetch)
is X-Local's and would follow once the policy side exists.

**What the sources say (read 2026-10-08):**
- Ollama FAQ (<https://docs.ollama.com/faq>): "Ollama binds 127.0.0.1 port 11434 by default. Change the bind address with
  the `OLLAMA_HOST` environment variable" (`OLLAMA_HOST="0.0.0.0:11434"` listens on the LAN); "Ollama allows cross-origin
  requests from `127.0.0.1` and `0.0.0.0` by default. Additional origins can be configured with `OLLAMA_ORIGINS`"; it runs
  plain HTTP and "can be exposed using a proxy server such as Nginx" for TLS. No TLS of its own.
- MDN, Mixed content (<https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content>): `fetch()` from an HTTPS page to
  an `http://` address is *blockable* mixed content and is blocked; "content accessed from loopback addresses such as
  `http://127.0.0.1/` or `http://localhost/`" counts as a secure origin (why today's local setup works from the Alpha).
- Chrome, Local Network Access (<https://developer.chrome.com/blog/local-network-access>): the permission prompt "is launching
  in Chrome 142"; it covers RFC1918 ranges, link-local, loopback and `.local` names; "the ability to request this permission
  is restricted to secure contexts"; mixed content is exempted when Chrome can tell the destination is local: a private IP
  literal, a `.local` name, or the fetch option `targetAddressSpace: "local"` ("flags that the request will go to the local
  network, and is thus exempt from mixed content"). Firefox and Safari have no equivalent (no signal; mixed content stays blocked).

**What it means for ZIGoals (the Alpha at `https://alpha.zigoals.app`, Trusted Types and CSP enforced):**
1. From the Alpha, a fetch to `http://192.168.1.20:11434` is blocked by mixed content in every browser, except Chrome 142+
   when the request carries `targetAddressSpace: 'local'` and the person allows the one-time Local Network Access prompt.
2. CSP `connect-src` cannot name an IP range; it can name a scheme (`http:`, far too wide) or a host pattern whose wildcard
   is the leftmost DNS label. `http://*.local:*` is expressible and matches mDNS names such as `reyals-pc.local`.
3. Ollama on the PC needs `OLLAMA_HOST=0.0.0.0:11434` and `OLLAMA_ORIGINS=https://alpha.zigoals.app` (the FAQ's own
   mechanism); the setup's error steps already tell people to set `OLLAMA_ORIGINS` for the hosted page.

**Recommendation (an owner decision; for X-Cloud's lane if accepted):**
- Support a home GPU box **by `.local` name only** (`http://<name>.local:<port>`), Chrome 142+ only, with a plain explanation
  in the setup ("Safari and Firefox cannot reach a computer on your network from a website; use the same computer, or Chrome").
- X-Cloud: `lib/egress-policy.json` `aiProviderOrigins`/`connect-src` gains `http://*.local:*` (app documents only), and the
  Permissions-Policy line for `local-network-access` is checked (the feature's policy name is not stated on the Chrome page;
  verify in the spec before adding).
- X-Local (later): `normalizeLocalBaseUrl` accepts `*.local` hosts; the Ollama and OpenAI-compatible adapters pass
  `targetAddressSpace: 'local'` on those fetches (a no-op elsewhere); the setup chooser gains the option with its caveats;
  a Playwright test with a mocked `.local` host.
- Not recommended: raw private IPs (no CSP allowlist short of `http:`), an HTTPS proxy on the PC (self-signed certificates on
  phones; a support burden), or relaying through ZIGoals' servers (breaks "private by design").

## Intermittent test seen at Gate A (not touched by this lane)
`apps/web/tests/sleep.spec.ts:40` (mobile project) reads `document.documentElement.scrollWidth` immediately after `page.setViewportSize({width: 320})`. The Sleep charts re-measure through a ResizeObserver (`components/charts/use-chart-width.ts`) and are still 324 px wide for a few milliseconds; the read fails once in a while in both builds (seen on main `72ad872` and on this branch in the same session; passes after ≤50 ms). A `toPass`/poll around that read, or an `expect.poll`, would settle it; this lane leaves the assertion as it is.

## Answer to X-Cloud's H1 (secret-shaped literals in `memory.test.ts`)
Done in Part 0 (`1cea510`): the four sample keys are joined at run time (`FAKE_OPENAI`, `FAKE_GOOGLE`, `FAKE_XAI`, `FAKE_BEARER` in `apps/web/lib/ai/memory.test.ts`), values unchanged. The one entry in `scripts/secret-allowlist.json` is yours to remove when this branch is in main (a stale entry only warns). The optional list (errors/keys/export/chats/launcher-record/settings/voice/openrouter-auth tests, `mock-streams.ts`, two specs) was left as it is: none matches a GitHub pattern and the lane rule keeps this PR to ZIGi's own files.

## Shared file: What's new (release id bump)
`apps/web/lib/whats-new.ts` `WHATS_NEW_RELEASE` is `2026-10-session-x` on this branch (was `2026-10-session-w`), so the one-time card shows once more with ZIGi's three links (Help anchors `help-your-ai-alive`, `help-your-ai-act`, `help-your-ai-auto`); Session W's links moved under "Earlier updates" in `components/for-you/whats-new-card.tsx`. If X-Cloud adds its own What's new links, add them to `WHATS_NEW_LINKS` in the same array (one grouped edit); the release id needs no second bump.

## CI: the dependency audit fails on an upstream Next.js advisory (your lane: dependencies)
Since 2026-10-08 ~00:40 UTC, `pnpm audit --prod --audit-level high` (the "web checks" job) fails on every branch, including this one at `d21fe0d`: GHSA-cjq9-62q9-8jv4, Next.js server-side request forgery in image optimisation, vulnerable `>=16.0.0 <16.3.8`, patched `>=16.3.8`; this repository pins `next` 16.3.6 (`apps/web`). This branch adds no dependency and changes no lockfile; the fix is a `next` bump to 16.3.8 on your side (one grouped dependency edit), after which both PRs go green at that step. Main's last green run predates the advisory (`72ad872`, 2026-10-07 19:39 UTC).

## Answers to X-Cloud's H2 and H3 (2026-10-08)
- **H2, measured and reverted here (2026-10-08 01:15 UTC).** The 19 files were rewritten to `import * as z from 'zod'` (`d529e7d`) and the production build measured against main's: with ZIGi's files on the namespace form while your 99 keep the braces, Turbopack puts zod into **two** shell chunks (55.4 kB + 40.1 kB gzip, both with the locales) instead of main's one (90.9 kB), so every page grew by about 4.7 kB and nine pages went over their budgets (`scripts/check-weight-budget.mjs`: shell 503.3 kB against 503.0). The mixed form is the cost; the saving needs every importer on one form. So this branch is back on the braces (same functions). Do the 19 files in the same change as your 99 (the sed in your H2 works unchanged on them), or right after the merge; nothing in ZIGi's code depends on the form.
- **H3:** this branch keeps `scripts/weight-budgets.json` as it is on main. At Gate B and Part 9 it measures its production build against *your* `weight-budgets.json` (fetched from `feature/session-x-cloud`) as well, and lists every page that would exceed it after the merge, with the reason, so whichever PR merges second can set the numbers in one edit. Today's figures on this branch (before H2): shell +877 B, Today +1,535 B, Habits +1,533 B, every other page +877 B over main `72ad872`.

## Answers to X-Cloud's H4 and H5 (2026-10-08, Part 6)
- **H4 (Meet ZIGi's title): done on this branch.** `apps/web/app/app/zigi/page.tsx` exports `metadata = {title: 'Meet ZIGi'}`
  (a server page, as you said); on this branch alone the tab reads "Meet ZIGi", with your root template it becomes
  "Meet ZIGi · ZIGoals Alpha". `tests/zigi-emotions.spec.ts` asserts the title on its Meet ZIGi test. Your
  `tests/page-titles.spec.ts` does not exist on this branch, so its `['/app/zigi', 'Meet ZIGi']` row is for whoever merges
  second (one line; no other change).
- **H5 (WCAG around ZIGi): read, nothing to change here.** The launcher is 56 px tall on computers and 44 px on phones, under
  your 70 px note. Part 6's real-model runs drove the panel through the keyboard-free path only (fill and click); the
  read-only audit smoke you ran is the keyboard evidence for this session.

## L1 — The Alpha security gate and a chunk that loads at page load (2026-10-08, Part 6; your lane: CSP and the gate)
**What fails.** `tests/public-alpha.spec.ts:79` ("strict production headers, fresh nonce…"), both projects, at line 101:
`document.scripts` must all carry a nonce. On this branch one script does not: the ZIGi "alive" chunk
(`components/zigi/alive.ts`, the state machine and the frames on every app page), which the launcher loads with a dynamic
`import()` once ZIGi is on screen and the browser is idle (ADR-017 S7: never in the shell). Red on every completed run of
this branch since `e164538`; green on `main` and on your branch.
**Why.** Turbopack's browser runtime appends lazily loaded chunks as `<script src="/_next/static/chunks/…">` **without a
nonce**: the runtime chunk (`turbopack-*.js` of main's own build) contains no nonce handling, and Next's CSP guide lists
framework scripts, page bundles, inline scripts and `<Script nonce>` as what it stamps, not runtime-appended chunks. The CSP
is `script-src 'self' 'nonce-…' 'strict-dynamic'`, so a chunk appended by the nonced runtime is **allowed and runs**; every
lazy chunk the app already has (the chat panel, the knock check-in, browser agents, the setup chooser, your wallet) is
appended the same way — the gate never met one because they all load on an interaction, and this one loads at rest.
Checked live on the dev server: after six seconds `document.scripts` without a nonce = the alive chunk (plus the dev HMR
client); production: the same chunk under its hashed name.
**What I did not do.** Stamp the nonce onto runtime-appended scripts from a MutationObserver (it would make the gate blind to
exactly the shape it watches for), delay the load until the gate has looked (a dodge), or fold the chunk into the launcher's
bundle (every app page would carry it: the ADR-017 S7 decision and your lowered budgets both say no; its production gzip
size is recorded in `docs/verification/x-local/ZIGI_REAL_MODEL_TEST.md` at Gate B so the owner can weigh it).
**Suggested change, yours to make.** Let the check accept a script without a nonce only when it is a chunk the runtime
appended: `src` starts with `/_next/static/chunks/` on the page's own origin and the element is not parser-inserted
(the injection probe in the same test keeps failing a parser-inserted `<script>` as it does today). Until then this
branch's Milestone run shows the integration job red for this one reason; the STATUS entry and ADR-017 S42 say so.

## Answers to X-Cloud's H6, H7 and H8 (2026-10-08, Phase 2 P2.8)
**H6 (Settings: ZIGi's section grows after a jump below it) — done in my lane.** `components/ai/ai-settings-section.tsx`
reserves the body's height until the body mounts (`.ai-settings-reserve`, `min-height` from `--ai-settings-reserve`:
928 px at computer widths, 1290 px up to 767.98 px wide, both measured on a new device: 927 and 1289 px). The Suspense
fallback keeps the reserve while the chunk loads. `tests/zigi-settings-reserve.spec.ts` keeps the number honest (the loaded
body within 15 % of the reserve, both projects) and proves the jump: the body's chunk held at the network until a hash jump
to `#settings-help` was made, the target then moved 62 px on a computer and 1 px on the phone once the body mounted (it moved
~930 px before). Your J201 and keep-jump are untouched and should keep passing. One fact for your lane: on a new device the
rest of the Settings page grows by ~1 900 px (computer) / ~2 900 px (phone) above `#settings-help` within the first quarter
second of first paint, before ZIGi's body is involved at all; a hash jump made in that window lands far off whatever ZIGi
does. Your keep-jump is the right tool for that; the reserve only removes ZIGi's share.
**H7 (phone: the launcher covers part of a first-screen action on six pages) — measured, not changed, owner decision.**
My numbers on the dev server (iPhone 13 profile 390 × 664, new device, every `/api` 503) match yours: Help "Your recovery
secret" 45 %, Markets "+ Find a market" 24 %, Portfolio "+ New portfolio" 15 %, Health "Log food or water" 11 %, Today
"See how it works" 10 %; nothing on the other seven. The launcher's box is the figure (y 494–550) over the hide chevron
(552–596, a transparent 44 px button): a tap on the covered corner of those controls hides ZIGi, with the Undo toast, rather
than opening the panel. I computed the candidates from the same control rects rather than restyling: a row layout (chevron
beside the figure) is worse on every page (17–36 %); the edge-tab tuck while the page is at the top leaves Help at 18 % and
hides the figure on every first screen; the figure alone at the bottom with no chevron on phones gives Today 5 %, Health 3 %,
Portfolio 9 %, Markets 14 %, Help 36 % (the chip fills that corner on a 664 px viewport; no corner element clears it). The
only change with real gain removes the phone's hide chevron (hiding stays in Settings → ZIGi → "Show the ZIGi button"),
a design change to the owner's Session W launcher that I am not making unasked; recorded in ADR-017 S56 and in the owner
items. The page-side fix (first-screen actions keeping clear of the bottom-right 68 × 110 px on phones) is yours if the
owner wants it.
**H8 (the Alpha security gate and the alive chunk) — read and agreed: an owner decision, neither lane alone.** Of your three
options I would take 1 (the narrowed gate plus the stronger "every server-sent `<script` carries the header's nonce" check);
2 is in my lane and I have not made it, because loading the alive chunk on the first interaction would start the idle
rotation and the knock only after a tap or key, which is not the "alive at rest" the brief asks for. Until the owner
chooses, this branch's integration job stays red for that one reason (ADR-017 S42, the STATUS entry says so). Whichever
PR merges second carries the chosen change, as you wrote.

