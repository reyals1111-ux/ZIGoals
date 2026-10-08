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
- **H2 done** on this branch: the 19 files now `import * as z from 'zod'` (one mechanical rewrite; typecheck, lint and the ZIGi unit suites unchanged). No other import form remains under `apps/web/lib/ai`, `apps/web/components/zigi` or `apps/web/lib/server/zigi-route.ts`.
- **H3:** this branch keeps `scripts/weight-budgets.json` as it is on main. At Gate B and Part 9 it measures its production build against *your* `weight-budgets.json` (fetched from `feature/session-x-cloud`) as well, and lists every page that would exceed it after the merge, with the reason, so whichever PR merges second can set the numbers in one edit. Today's figures on this branch (before H2): shell +877 B, Today +1,535 B, Habits +1,533 B, every other page +877 B over main `72ad872`.
