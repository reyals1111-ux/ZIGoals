# Session AK — Z1c fresh security review

Reviewer: Z1c (fresh; did not build this code). Branch `feature/session-ak-number-one`, head `fd4b223a`, range `58224a69..HEAD`.
Scope: wallet/staking (4a4cbfc9 `TIER 3 (wallet): AFL9`), CSP/egress, service worker + manifest, motion layer, shell + NOVA
entry, Settings fragment jump, landing. Method: read the diffs and the code around them; ran unit tests (below). No code
edits, build or Playwright.

**Result: 0 High, 0 Medium, 4 Low, 6 Info.** No way was found to reach a signature without the review sheet, with a
pairing not started for staking, or on a chain other than ZIGChain's two; no CSP widening; no service-worker poisoning path;
no open redirect.

## Verified as holding

- **Signing still has one path.** `walletConnectKeplr` is called only by `components/staking/review-sheet.tsx:69` (pinned by
  `lib/staking/staking-guard.test.ts:76`), after `issueSignTicket` and inside `executeSigned` (sign ticket, mainnet
  one-time confirm, quote expiry, signed-bytes/fee checks, `fresh()` account re-check). The new `walletConnectStakingKeys`
  (`lib/staking/execute.ts:210-223`) exposes only `enable`/`getKey` (`cosmos_getAccounts`); it has no signer.
- **The pairing gate is ZIGoals-owned.** `stakingPairing` (`execute.ts:174-190`) requires `live.staking === true` (set only in
  `startWalletConnect` from the caller's `stakingMethods`, `lib/wallets/walletconnect.ts:136-145`), then a chain in
  `WC_STAKING_CHAINS`, then namespaces that include that chain, an account on it, and `cosmos_signDirect`. Wallet-added
  methods or chains on a linking pairing get nothing. Namespaces keyed by a chain (`cosmos:zigchain-1`) fail closed.
- **Chain confusion.** `signDirect` refuses a document whose `chainId` is not the quote's (`execute.ts:233`) and refuses a
  `signed` answer that differs in chain, account number, body or fee (`:236`); `signed` returned to CosmJS is ZIGoals' own
  `signDoc`, not the wallet's.
- **Session swap between connect and sign.** A new pairing calls `stopWalletConnect` first, which nulls `live` and fires
  the change event, so the Staking panel drops a Keplr Mobile connection and its quote (`staking-actions.tsx:122-134`). A
  late approval of a replaced pairing is disconnected (`walletconnect.ts:141-144`). A signer captured before the swap is
  bound to the old client and topic, so its request fails. `executeSigned`'s `fresh()` also re-checks the account.
- **`zigoals:walletconnect-change` spoofing** (see Z1C-I1): the event carries nothing; listeners only re-read module state.
- **CSP / egress / `_headers`**: unchanged in range (`git diff --stat 58224a69..HEAD` shows no change to
  `lib/egress-policy.json`, `lib/csp-compose.mjs`, `public/_headers`, `landing/_headers`). The WalletConnect hosts predate the
  range and have their egress entry and PRIVACY line (`docs/PRIVACY.md:165`).
- **Service worker**: the only change is `INSTALL_PAGES` gaining `/app/nova` and `/app/notes` (`public/sw.js:110`). Both are
  server shells whose content loads on the client (`app/app/nova/page.tsx`, `app/app/notes/page.tsx`), so the cached HTML
  holds no personal data. The `storable`/`cacheable`/`neverStored` rules are unchanged, so query URLs (`?capture=1`), `/api/*`,
  cross-origin and non-GET requests are still never stored. The manifest's new shortcuts (`/app/nova`,
  `/app/notes?capture=1`) are same-origin. The packaged-asset hash pin was moved to the new file's actual sha256
  (`9ab51f5e…`, verified), not loosened.
- **Redirects**: start-on-NOVA uses `router.replace('/app/nova')`, and the command bar uses the constant `NOVA_PATH`. No input
  reaches a URL. The Settings jump decodes the fragment through `hashId` (throw-safe) and only calls `getElementById` and
  `scrollIntoView`.
- **Reduced motion**: every new animation in `motion-2026.css` and `landing/styles/final-v7.css` sits under
  `prefers-reduced-motion: no-preference` or is zeroed under `reduce`. Under Motion Off or reduced motion, the gate shadows
  `document.startViewTransition` (`lib/motion/view-transition-gate.ts`).
- **Landing / Nous Research**: the Hermes line names Nous Research as the author and says "ZIGoals is not affiliated with Nous
  Research". There are no financial projections; the dashboard mock is labelled "Example data".

## Findings

### Z1C-L1 (Low): the start-on-NOVA redirect fires late and can pull the person off a page they already moved to
- **Severity reason:** this is a navigation hijack in a first-party race only. It cannot reach a signature, but it can tear
  down an open review sheet or mainnet confirm. It needs a slow chunk load.
- **Where:** `apps/web/components/nova/nova-entry.tsx:32-37`. The pathname is checked once, before three dynamic imports.
  `router.replace('/app/nova')` then runs whenever they resolve, without checking again that the page is still `/app`.
- **Exploit scenario:** a person with "Open ZIGoals on NOVA" on opens the installed app on a slow or flaky connection (or
  while the service worker is fetching the chunks). They tap Wealth → Staking straight away and press Review. When the imports
  land a few seconds later, the app replaces the route with `/app/nova`. The review sheet unmounts mid-flow. If Sign was
  already pressed on Keplr Mobile, the wallet prompt stays open on the phone while ZIGoals no longer shows progress for that
  action.
- **Fix:** inside the `.then`, redirect only if `window.location.pathname === '/app'` and no navigation has happened since,
  for example by capturing `history.length` or a module navigation counter before the imports. Better still, read the
  preference synchronously before the first paint.

### Z1C-L2 (Low): ⌘/Ctrl+J opens the NOVA bar over an open modal, including the staking review sheet during signing
- **Severity reason:** the person triggers it themselves, so it is not a signature path. It does bypass the review sheet's
  deliberate "cannot be dismissed while signing" guard (`onCancel` blocked while `signing`).
- **Where:** `apps/web/components/nova/nova-entry.tsx:41-46` adds a `window` `keydown` listener and does not check for an
  open modal dialog. `components/nova/command-bar.tsx:23` calls `showModal()` on top, and `:31` calls `router.push(NOVA_PATH)`
  on Enter.
- **Exploit scenario:** while the review sheet is waiting for Keplr Mobile's approval (`signing === true`, Escape blocked), the
  person presses Ctrl+J by habit (Chrome's Downloads shortcut; `preventDefault` swallows it) and Enter. The app navigates to
  NOVA and unmounts the sheet and its progress/receipt view, while the phone still holds the signature prompt. The broadcast
  can still happen, and its outcome is visible only in the journal or explorer.
- **Fix:** in `onKey`, return early when `document.querySelector('dialog[open]:modal')` (or a top-layer check) finds another
  open modal dialog.

### Z1C-L3 (Low): view-transition overlay is click-through, so taps land on the arriving page while the old one is still painted
- **Severity reason:** this is a misclick vector during 120–180 ms windows, with no third-party control of timing. Signing
  still needs a trusted press on the review sheet's own button, which cannot be on screen during a page transition.
- **Where:** `apps/web/components/motion/motion-2026.css:21`, `::view-transition { pointer-events: none; }`. The browser
  default blocks hits during a transition; this rule sends them to the live (new) DOM underneath the old snapshot.
- **Exploit scenario:** a double tap on a navigation item (or a tap on an old-page button just as a transition starts) hits
  whatever control of the new page sits at that point, for example a primary action on Settings or Wealth. The person never
  saw that control. Any destructive action guarded only by a single button press would fire.
- **Fix:** keep the browser default (remove the rule) so taps during the brief transition are dropped. If responsiveness
  matters, at least scope pass-through to the pinned chrome groups (`::view-transition-group(zg-chrome-*)`), not the page.

### Z1C-L4 (Low): landing privacy claim "Keys and chats stay on your device" is untrue when a cloud API key is used
- **Severity reason:** a public privacy statement that contradicts `docs/PRIVACY.md:178-183`, which says messages go "to that
  provider, straight from your browser". The same landing list offers "your own API key".
- **Where:** `landing/index.html:125`, `.nv-facts`, "Yours alone." bullet.
- **Exploit scenario:** none technical. A visitor adds an OpenAI/Anthropic key in Relaxed mode, believing chats stay on the
  device, and shares health or money details that go to the provider. This is the kind of claim a privacy complaint would cite.
- **Fix:** reword, for example: "Keys stay on your device and nothing goes to a ZIGoals server. With a local model, chats
  stay on your computer; with your own cloud key, they go only to that provider." Keep "NOVA never moves money".

### Z1C-I1 (Info): `zigoals:walletconnect-change` can be dispatched by any page script, with no effect
- **Where:** `apps/web/lib/wallets/walletconnect.ts:107-108`, `components/staking/staking-actions.tsx:122-134`.
- **Analysis:** the event has no detail. The listener calls `walletConnectStakingCheck(walletConnectSession(), …)`, which is
  module state that script cannot reach through the event. A spoofed event only re-reads the true state, and can at most drop
  a connection whose pairing is already unusable. Script able to dispatch it is already same-origin. No change needed. Keep
  the "carries nothing" property if this event is ever extended.

### Z1C-I2 (Info): a session ended or expired by the wallet is not observed
- **Where:** `apps/web/lib/wallets/walletconnect.ts:99-157`. No `session_delete`/`session_expire` listener is registered, so
  `live` keeps the dead session and the panel keeps saying Keplr Mobile is paired.
- **Impact:** fails closed (requests to a deleted topic are refused by the client), so this is not a signing risk, only a
  misleading "paired" state and an error at Review/Sign.
- **Fix:** on `session_delete`/`session_expire` for `live.session.topic`, set `live = null` and call `changed()`.

### Z1C-I3 (Info): the account address is taken from `cosmos_getAccounts`, not bound to the approved CAIP-10 account, and any wallet is labelled "Keplr Mobile"
- **Where:** `apps/web/lib/staking/execute.ts:196-202` (first entry of the wallet's answer; `isZigAccount` is checked later
  in `connectStaking`); `staking-actions.tsx:329-333, 347` (label).
- **Impact:** the wallet is the person's own signer, and `executeSigned`'s `fresh()` and the chain's signature check bind the
  signer to `quote.address`, so this is not a bypass. Two gaps remain. The address may differ from the one the person approved
  in the session (shown elsewhere as the linked wallet). Any wallet that approves a staking pairing, not only Keplr Mobile, is
  shown as "Keplr Mobile" (A7: no wallet is listed for more than it does).
- **Fix (optional):** require `answer[0].address` to appear in the session's `cosmos:<chainId>:` accounts. Show the peer's
  metadata name (already sliced to 40 chars in `startWalletConnect`) as "via WalletConnect".

### Z1C-I4 (Info): battery and hardware signals are read locally on the app and the landing page
- **Where:** `apps/web/lib/motion/ambient.ts:46-57`, `landing/scripts/motion.js:56-58` (`navigator.getBattery`,
  `hardwareConcurrency`, `deviceMemory`, `saveData`).
- **Impact:** nothing is sent or stored, so this is not tracking. The Battery Status API is a known fingerprinting surface
  that Firefox and Safari removed, and the read is not described in `docs/PRIVACY.md` (`:214` mentions only the Motion
  choice).
- **Fix (optional):** one PRIVACY line: "To calm slow background motion on low-end devices or a low battery, the page reads
  the device's core count, memory, Save-Data and battery level in the browser; nothing is stored or sent."

### Z1C-I5 (Info): connect-time network race (pre-existing pattern, now also on the Keplr Mobile path)
- **Where:** `components/staking/staking-actions.tsx:192-203`. If the network is switched while `connect()` awaits,
  `setWallet` stores a wallet for the old network while the selector shows the new one.
- **Impact:** quotes use `wallet.network`, and the review sheet shows the quote's own network badge and chain id, so the
  person still signs what is shown. This is cosmetic and confusing, not a bypass.
- **Fix (optional):** capture `network` at the start of `connect()` and discard the result if it changed (as the `revision`
  check does for quotes).

### Z1C-I6 (Info): landing wording "Build your own Jarvis"
- **Where:** `landing/index.html:125`.
- **Note:** this breaks none of the product rules (there is no partnership claim; the Nous Research disclaimer is present).
  "Jarvis" is a third-party character name; the owner may want a brand check. Linking to `github.com/NousResearch/hermes-agent`
  is navigation only (`rel="noopener noreferrer"`), not egress.

## Tests run

`pnpm exec vitest run <paths> --maxWorkers=2`, all green:
- `lib/staking/walletconnect-connect.test.ts`, `lib/wallets/walletconnect.test.ts`, `lib/motion/*` (9 files, 53 tests).
- `lib/staking/walletconnect-signer.test.ts`, `staking-guard.test.ts`, `execute.test.ts`, `sign-gate.test.ts`,
  `decoy-guard.test.ts`, `lib/wallets/walletconnect-panel.test.ts` (6 files, 55 tests).

## Lead's disposition (Session AK)
- Z1C-L1 fixed: the start-on-NOVA redirect re-checks that the person is still on Today before it moves them.
- Z1C-L2 fixed: ⌘/Ctrl+J never opens the NOVA bar over an open dialog (`dialog[open]` or `aria-modal="true"`).
- Z1C-L3 accepted (recorded): the transition overlay takes no taps by design (lane M, motion-m spec); a page transition
  lasts at most 180 ms and the review sheet's own guards hold during signing.
- Z1C-L4 fixed: the landing says keys stay on the device and chats go only to the model the person chooses.
- I6: "Build your own Jarvis, with a real life to run" is the owner's own wording (follow-up 2); left for the owner's call.
- I2, I3, I5 recorded for the next wallet pass; I4 (battery and hardware read locally, nothing sent) gets a PRIVACY line.
