# Lane L2a — chain + signing (Session AF, ADR-028)

Branch `af/signing` from `feature/session-af-wealth-unlocked` (`59e44be9`). Worktree `agent-ae398341cbdb51770`, server port 3102.
This file is the lane's running record for the lead: what is done, what the lead must wire into shared registries, and every
assertion that changed (with the reason). Updated with every step's commit.

## Status by step (brief order)
| # | Step | State | Commit |
|---|---|---|---|
| 1 | chain-config `mainnet.json` + `networks.ts`; zigchain-1 explorer entries (+ fix keeping `buildExplorerUrl` testnet-only) | done | `14f0d9a7`, `92b14481` |
| 2 | `zigoals:staking-prefs:v1` + `zigoals:staking-journal:v1` (loose v1 records, readers keep unknown fields) | done | `5c459ca8` |
| 4 | `NATIVE_STAKING_SIGNING_ALLOWED` + `assertNativeStakingAllowed(messages)` (committed before 3: the signer starts with it) | done | `d1af7bd2` |
| 3 | `lib/staking/` pipeline + `lib/wallets/keplr-session.ts` + `staking-guard.test.ts`; `wallet-guard.test.ts` re-scoped | done | `507e2781` |
| 5a | `apps/web/lib/chain/validators-wire.ts` (the wire schema L1 consumes), committed first | done | `ec957803` |
| 5 | `/api/positions` mainnet on public builds + `minHeight` + stZIG; `GET /api/chain/validators` | done | `3c2d0a7d` |
| 6 | `https://rpc.zigchain.com` in `chainOrigins`; CSP tests' exact lists | done | `b82c9fd4` |
| 7 | Staking UI on `/app/staking` (lazy `StakingActions`), the gate hardened, four specs | done | `94627c98` |
| 8 | The honesty sentence (H62) in the shell (About panel and Alpha notice take it from there), the Help bullet, the verifier's identity stage, ab-shell + six specs | done (landing: see below) | `15ab5eaa` |
| 9 | Deploy gate (H85): MANUAL_ALPHA_WORKFLOW's sentence; `build:alpha` + `check:alpha-artifact` + `check:alpha` proven locally | done | `c02d5a3b` |
| 10 | Unit tests for every module; four Playwright specs run on this lane's production build (3102) | done | `94627c98` + the final commit |

## Tests run (2026-10-18/19, this worktree; logs in `~/zigoals-af/logs/L2a-*.log`)
- Unit (vitest, from the repo root): `pnpm test` → 5,278 passed, 56 skipped, **1 failed**: `scripts/sanitize-alpha-tail.test.mjs`
  "the API buckets are exactly the app's route files" — it needs `/api/chain/validators` in `scripts/sanitize-alpha-tail.mjs`
  `API_ROUTES` (a verifier/CI registry, the lead's; see wiring below). With the theme sheets regenerated locally
  (`node scripts/themes/build-themes.mjs`, not committed) `scripts/themes/build-themes.test.mjs` passes; without, it fails
  until the lead regenerates (staking.css is new CSS).
- This lane's own unit files (test counts from the verbose reporter): chain-config networks 30, ecosystem-registry links 5,
  staking storage 10, flag 8, messages 17, quote 6, sign-gate 13, execute 12, receipt 16, errors 16, decoy-guard 2,
  refresh 2, prefill 2, view 3, staking-guard 7, keplr-session 8, validators-wire 14, chain-validators (+ the chain relay
  and the route) 7 — 178 in all, passing; plus the extended wallet-guard, positions-relay, positions-route,
  native-positions, mainnet-denomination, public-safety and csp-compose files.
- Playwright on the production build (`rebuild.sh … 3102`, PUBLIC_ALPHA_UNDEPLOYED), 2 workers, Chrome desktop + mobile:
  `staking-sign` (5 tests × 2), `staking-real-confirm` (2 × 2), `staking-errors` (5 × 2) → 24 passed (then staking-sign
  again with the lazy-chunk check, 10 passed). WebKit (`-c playwright.webkit.config.ts`): `webkit-staking`, `webkit-smoke`,
  `webkit-phone` → 9 passed, 3 skipped (project filters).
- Existing specs that open /app/staking or assert the honesty sentence, on the same build: phone-shell, product-shell,
  public-alpha, session-ac, send-feedback, honesty-banners, private-read-delay, persona-z → 128 passed, 4 skipped;
  staking-page, page-order-aa, positions-layout, owner-preview, wallet-menu, wallet-reload, ecosystem, staking-tabs, platform,
  hydration-zone, page-titles, a11y-wcag-x → 83 passed, 5 skipped; platform-visual, phone-form-sheets, phone-touch-targets,
  phone-pages, header-art-ae, coherence, owner-polish, page-marks, brand-nav-polish, unified-goals, wealth,
  run11-route-mobile-acceptance → 96 passed, 12 skipped. Not the full suite (the lead's Gate C).
- Weights (`node scripts/check-weight-budget.mjs http://127.0.0.1:3102`): `/app/staking` 442.4 kB (budget 487.0), `/app`
  516.5 kB (567.0), shell 397.9 kB (447.0) — all ok, no budget line changed. Lazy chunks (H54, gzip level 6): the
  `StakingActions` chunk ≈ 14.9 kB; the CosmJS signing/query client chunk ≈ 129.1 kB, fetched on the first Review press
  (asserted by staking-sign.spec.ts: not loaded on the page or on connect, loaded by Review).

### Step 9 — the deploy gates with the new flag (H85)
- The "financial signing and broadcasts remain disabled" assertion exists in exactly one place: the last sentence of
  `docs/deployment/MANUAL_ALPHA_WORKFLOW.md` line 9 (no workflow step, script or test states it; `deploy-alpha.yml` sets
  `NEXT_PUBLIC_APP_ENVIRONMENT: PUBLIC_ALPHA_UNDEPLOYED` and runs `pnpm test`, which now includes
  `lib/staking/flag.test.ts` and `lib/staking/staking-guard.test.ts`). It now reads "Contract execution stays disabled
  (`FINANCIAL_EXECUTION_ALLOWED` false); native staking signing only through the review screen (…)". The workflow file and
  the owner approval gate are untouched; `PUBLIC_ALPHA_UNDEPLOYED` stays the required build mode (the smoke's
  `/PUBLIC_ALPHA_UNDEPLOYED/` check and `alpha-deployment.mjs`'s build identity unchanged).
- Proven locally on 2026-10-19 (Brussels night) under the lock, on `15ab5eaa` + the doc edit:
  `NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build:alpha` → "OpenNext build complete." exit 0;
  `pnpm check:alpha-artifact` → "Alpha artifact check passed: empty compiled environment, no env file copies, no secret
  markers, no configured names." exit 0; `pnpm check:alpha` (wrangler dry-run) → exit 0. Logs:
  `~/zigoals-af/logs/L2a-build-alpha.log`, `~/zigoals-af/logs/L2a-check-alpha.log`.

## Facts read live for this lane (one GET each, 2026-10-18)
- 20:52 UTC `https://api.zigchain.com` node_info: network `zigchain-1`, application_version `v5.1.2` on both nodes
  (zrpc01-mainnet, zrpc02-mainnet; six reads), cosmos_sdk v0.53.8, CometBFT 0.38.25; staking params bond_denom `azig`,
  unbonding_time `1814400s`, max_entries 7; bank metadata base `azig`, display `zig` at exponent 18; node config minimum gas
  `2500000000azig` (testnet identical, testnet node_info `v5.1.2`). `REVIEWED_VERSIONS.real = ['v5.1.2']`.
- `https://rpc.zigchain.com`: `/status` network `zigchain-1`, 0.38.25; `abci_info` version `v5.1.2`; CORS `*` on GET and on
  an OPTIONS preflight for POST + content-type (204); `tx_search` by height answers (the signer's confirmation path).
- 20:55 UTC explorer probes (GET, all 200 text/html): `https://zigscan.org/tx/719C2171…7E93`, `/address/zig1akyvf3r…lpc2`,
  `/validators/zigvaloper18vykgjgcmp2z4xzkt6mh74glrpd7qda8fqldrl`, `https://app.range.org/tx/zigchain/719C2171…7E93`,
  `https://app.range.org/address/zigchain/zig1akyvf3r…lpc2`; testnet `https://testnet.zigscan.org/validators/zigvaloper1pwwy…rwk`.

## Decisions taken inside the brief (for the lead / ADR-028)
- `packages/chain-config` gains a subpath export `@zigoals/chain-config/networks` (as ecosystem-registry does) instead of a
  re-export from index.ts: networks.ts imports `TESTNET` from index.ts, so a re-export would be a circular import.
- The browser never reaches `api.zigchain.com` (H16): `verifyNetworkFor` (REST) serves server code, scripts and the practice
  network; the signing path checks the same evidence (`assertNetworkEvidence`) over the RPC it signs through.
- Mainnet explorers are a separate list (`mainnetExplorers`) so the Ecosystem page's "Open … testnet ↗" buttons
  (`explorers`, asserted by ecosystem.spec and human-x J168) stay exactly as they are. `buildExplorerUrl`/`explorerHome`
  keep their testnet-only answers (the Goal Manager records' `ExplorerLinks` must show no link for a mainnet id,
  `ecosystem-ui.test.ts`); the new `explorerLinksFor(chainId, kind, id)` searches both lists for the staking receipts. New
  explorer kind `validator` (zigscan both networks; Range has no validator route).

- **H4's file name.** ADR-028 H4 names the one signer `lib/wallet/sign.ts` / `signFromReview()`; the brief and the L2 design
  name it `lib/staking/execute.ts` / `executeSigned()` behind `issueSignTicket()`. Built as the brief says; every property
  H4 asks for holds (one signer file beside the blocked contract path, reachable only from the review screen's submit
  handler, the type-URL allowlist, `signAndBroadcast`/`sendTransaction`/`eth_sendTransaction`/`signTransaction` forbidden
  elsewhere, no import from `components/ai` or `lib/ai`). The lead may rename the H4 row's file names.
- **No signer before the Sign press.** The quote simulates through CosmJS's read-only `StargateClient` with the account's
  public key from `getKey` (`tx.simulate(messages, '', pubkey, sequence)`), so `getOfflineSignerAuto` is called only inside
  `executeSigned` (after the trusted submit). This is stricter than the L2 design (whose quote held a signer for simulate):
  the signer-using files are two (`lib/staking/execute.ts`, `lib/wallet.ts`), not three.
- **The reviewed fee is the signed fee.** `getOfflineSignerAuto(chainId, {preferNoSetFee: true})` (Keplr's sign option) so
  Keplr does not replace the 2.5 Gazig quote with its 25 Gazig "average"; the person can still raise it in Keplr, and the
  review says so. The signed bytes are checked against the reviewed messages before broadcast (a wallet that changed a
  message is refused) and again in the receipt; the fee is not compared (H61).
- **A node's CheckTx refusal is a certain failure.** CosmJS's `BroadcastTxError` (insufficient fee 13, sequence 32,
  insufficient funds 5) means the transaction never entered a block: the journal says FAILED with the code and the screen
  says nothing moved, instead of lib/transaction.ts's generic "may have moved" (which still applies to a lost connection).

- **stZIG in the platform record.** The relay adds an stZIG position (`providerId 'native-zig'`, `sourceType
  'LIQUID_STAKING'`, `asset 'stZIG'`, 6 decimals, id `<chain>:<address>:stzig`) only when the address holds some; its value
  is never converted (Wealth reads it as "unavailable" until H44's two-source rate exists). The Staking page's ZIG totals
  now count `asset === 'ZIG'` only. Mainnet stZIG metadata read live 2026-10-18 (display stZIG at exponent 6).
- **`/api/chain/validators`** reads, per network, at one block: the paged validator list, signing infos (`zigvalcons` =
  SHA-256 of the ed25519 consensus key, first 20 bytes), slashing params (window 35,000), the staking pool, and each
  validator's self-delegation (eight at a time; the chain's 404 code 5 = "0"). Checked live once on 2026-10-18 21:30 UTC:
  19 mainnet / 39 testnet validators answered the wire schema. Sorted by name, never by rate. Errors: 400 bad query, 429
  too many reads, otherwise 200 (`status: 'unavailable'` with a reason, H58).

- **The sign gate needs the click, not only the submit (found in this lane's first Chrome run).** `form.requestSubmit()`
  makes the browser fire a *trusted* submit event, and under a submit-only gate it reached the signer. The gate now
  requires both: the form's submit naming the Sign button as its `submitter`, and a trusted `click` on that button at most
  1 s before (recorded by the button's own onClick). `button.click()`, `requestSubmit()` (with or without the button) and a
  dispatched submit are refused (unit-tested, and in `staking-sign.spec.ts` against the real page); a mouse press, a tap
  or Enter/Space on the focused button sign. `staking-guard.test.ts` pins the exact wiring.
- **Where the actions sit.** `StakingActions` is mounted between the observed totals and the page's own layout region,
  not as a layout item, so `page-order-aa.spec.ts`'s exact `positions:` item list stays as it is and the tracked positions
  stay the region's first block. The lead may make it a movable item (`positions:actions`) and extend that list.
- **Staking's reader follows the staked network.** After a connect, a refresh or a confirmed action, the page's own
  "Read-only network" reader switches to the network just read (`onObserved`), so the Staking totals show what changed;
  nothing changes for a person who never connects.
- **Valdora placeholder.** `components/platform/staking-placeholder.tsx` (not in this lane's files) still says "ZIGoals does
  not track stZIG yet" (asserted by `tests/staking-page.spec.ts`), while the relay now reads stZIG balances (step 5). The
  lead or L1 should reword it with the Earn hub's Valdora work.
- **Phones (H87).** Without `window.keplr` on a phone: "Open ZIGoals in Keplr" (`keplrwallet://web-browser?url=<origin>/app
  /staking`; Android `intent://…#Intent;package=com.chainapsis.keplr;scheme=keplrwallet;end;`), built in
  `lib/wallets/keplr-session.ts` (`keplrMobileLink`). It is a deep link, not a web URL, so it is not in L1's verified link
  registry; the lead may move it there once that registry exists. Desktop without Keplr: "Get Keplr ↗" (`KEPLR_SITE`).
- **ZIGi's pre-fill.** `lib/staking/prefill.ts` `takeStakingPrefill()` reads and deletes sessionStorage
  `zigoals:ai:staking-prefill:v1` once when the actions open (≤ 10 min old, plain fields only) and fills the form; a
  real-network pre-fill without the first-real confirm stays on practice and says so. Never reviews or signs.

### Step 8 — public-safety labels: done, and three questions for the lead (not guessed)
- Changed: `components/shell.tsx`'s `networkSentence` (the About panel `components/alpha/about-this-alpha.tsx` and the Alpha
  notice `components/shell/alpha-notice.tsx` receive it as a prop, so neither file needed an edit) → exactly H62's sentence;
  Help's Known-limitations bullet → "**Only staking moves ZIG, and only in your own wallet.** Stake, unstake, move stake
  and claim rewards are signed in Keplr after a review screen, on the practice network (no real value) or the real one,
  as you choose; ZIGoals never holds keys, nothing is bought, sold or sent by ZIGoals, and Wealth and Portfolio show what
  you enter and public data." (votes are not built yet, so the bullet does not claim them); the hosted verifier's stage 2
  (identity) now expects the whole new sentence (it expected a fragment of the old one).
- `lib/search/static.ts` has no copy of the bullet (only the topic title "Known limitations"), so nothing changed there.
- **Landing (owner-deployed, H62's "the two copies may differ").** `landing/index.html` does not contain the old sentence;
  its own honesty lines are "Financial signing and broadcasting are disabled, and the Goal Manager contract is not
  deployed. Mainnet financial execution is disabled.", the FAQ answer "No financial execution is enabled in the public
  Alpha … financial signing and broadcasting remain disabled." and the status "Public Alpha / Financial execution
  disabled". They are asserted by `tests/landing.spec.ts` AND by the hosted verifier's stage 7 (live only), which is not the
  identity stage named in the brief. Changing them changes stage 7 too, and the live verifier then fails against the
  landing that is live until the owner redeploys it. Left unchanged; proposed text for the owner/lead: "The public Alpha is
  unaudited. Staking and votes sign in your own wallet (practice or real, your choice); nothing else moves, and ZIGoals
  never holds keys. The Goal Manager contract is not deployed." (+ the same idea in the FAQ; status "Public Alpha / Only
  native staking signs").
- **Other honesty texts outside this lane's files that the change makes inaccurate:** Help's FAQ "Is any of this real
  money?" (`components/help/help-page.tsx` line 120: "No. … nothing is bought, sold or sent"); `public/social-card.svg`/`.png`
  ("Local simulation + wallet connection only."); the shell's local mode strip "LOCAL SIMULATION · … · No blockchain
  transactions" (`MODE_LOCAL`, asserted by phone-shell and persona-z) — true of the demo records, but staking now sends
  transactions from the same page. Each needs the owner's or lead's wording.
- Specs moved at equal strength (the same assertion, the new words): `tests/ab-shell.ts` `ALPHA_SENTENCE` (used by
  honesty-banners, private-read-delay, persona-z through `expectAlphaFacts`/imports), `tests/phone-shell.spec.ts:117`,
  `tests/product-shell.spec.ts:20,22`, `tests/public-alpha.spec.ts:127`, `tests/session-ac.spec.ts:100` (each the whole
  new sentence; two of them had asserted only a fragment of the old one), `tests/send-feedback.spec.ts:97` (the bullet's
  new bold phrase plus "ZIGoals never holds keys"); `scripts/lib/hosted-alpha-stages.mjs:109,115`.

## What the lead must wire (shared registries)
### Storage keys (step 2; names in `apps/web/lib/af-signing-keys.ts`, a module with no imports)
| Registry | Row to add |
|---|---|
| `lib/onboarding.ts` `DEVICE_RECORD_KEYS` (personal: a device holding it is not new) | `STAKING_JOURNAL_KEY` (`zigoals:staking-journal:v1`) |
| `lib/onboarding.ts` `NON_PERSONAL_KEYS` | `STAKING_PREFS_KEY` (`zigoals:staking-prefs:v1`); `onboarding.test.ts` pins the literals |
| `lib/export/everything.ts` `DEVICE_KEYS` (Export everything) | `stakingJournal: STAKING_JOURNAL_KEY`, `stakingPrefs: STAKING_PREFS_KEY` |
| `lib/data-health/catalog.ts` `DEVICE_LABELS` | `stakingJournal: ['Staking and vote transactions', 'Wallet']`, `stakingPrefs: ['Staking choices: practice or real', 'Wallet']` |
| `lib/aa-device-forget.ts` erase list | both keys (the journal is personal; the prefs hold the first-real confirm, which the account's erase resets) |
| `lib/vault/frozen-fixtures.test.ts` records + checks + the equality assertion | `records[STAKING_PREFS_KEY] = JSON.stringify({version: 1, network: 'real', realConfirmedAt: '2026-10-18T21:00:00.000Z', lastValidator: {'zigchain-1': 'zigvaloper18vykgjgcmp2z4xzkt6mh74glrpd7qda8fqldrl'}})`, check `{key: STAKING_PREFS_KEY, module: './staking/prefs', spec: 'STAKING_PREFS', expect: {network: 'real'}}`; `records[STAKING_JOURNAL_KEY] = JSON.stringify({version: 1, entries: [{operationId: '00000000-0000-4000-8000-000000000001', chainId: 'zig-test-2', wallet: 'zig1qvpsxqcrqvpsxqcrqvpsxqcrqvpsxqcrrdrgwr' /* toBech32('zig', 20 × 0x03), fictional */, action: 'delegate', validator: 'zigvaloper18vykgjgcmp2z4xzkt6mh74glrpd7qda8fqldrl', amount: '25000000000000000000', state: 'CONFIRMED', hash: 'AB'.repeat(32), height: '8290600', code: 0, at: '2026-10-18T21:00:00.000Z'}]})`, check `{key: STAKING_JOURNAL_KEY, module: './staking/journal', spec: 'STAKING_JOURNAL', expect: {version: 1}}`. Both modules import only zod, device-record.ts, af-signing-keys.ts (and the prefs `@cosmjs/encoding` via staking/address.ts) |
| sync guard | nothing to add: `lib/staking/storage.test.ts` fails if any sync module, extras section or Worker names a staking key (the frozen-fixture test excepted) |
| Showcase | nothing: the staking actions refuse in the Showcase ("Exit the Showcase to stake") and write nothing |
| sessionStorage hand-offs (not records, never exported) | `WALLET_SESSION_KEY` `zigoals:wallet-session:v1`, `STAKING_PREFILL_KEY` `zigoals:ai:staking-prefill:v1` — PRIVACY.md "tab-only" sentence |

### CSP and the hosted verifier (step 6)
- `apps/web/lib/egress-policy.json` `chainOrigins` gains `https://rpc.zigchain.com` (after the testnet RPC), as the brief
  says; it therefore reaches every document class (site and app), like the two testnet hosts. The L2 design had put it in
  `csp.app.connect` (app documents only); the lead may move it there (one line, and the two tests' expectations).
- H16 (e): the hosted verifier's origin allowlist (`scripts/verify-hosted-alpha.mjs` lines 69/72: `alphaRequestOrigins`,
  `requestOrigins`) is the lead's registry. No verifier stage reaches `rpc.zigchain.com` (the staking page requests it only
  after a Connect or Review press), so nothing fails without it; add it in the same merge if the verifier should accept it.
- Weight budgets: no new route page and no budget line changed; `/app/staking` gains the lazy `StakingActions` chunk (sizes
  under "Tests run").

### Other registries
- `scripts/sanitize-alpha-tail.mjs` `API_ROUTES` += `"/api/chain/validators"` (its test fails until then).
- Theme sheets: regenerate after the merge (`node scripts/themes/build-themes.mjs`; `components/staking/staking.css` is new).
- Settings → Your data: a "Remove" for `zigoals:staking-prefs:v1` (the L2 design's way to be asked the first-real confirm
  again) belongs to the lead's Settings registry; the account's erase covers it once the key is in the erase list.
- PRIVACY.md (lead's): the relay now reads mainnet addresses too (H16 (a), as the Track-Wallet sentence says), the browser
  reaches `rpc.zigchain.com` / `testnet-rpc.zigchain.com` for signed staking (account, simulation, broadcast, receipt) and
  `/status` + `/abci_info` for the network check; the two sessionStorage hand-offs are tab-only.

## Open items (for the lead; nothing here blocks a merge of steps 1–10)
- Landing copy, Help's "Is any of this real money?", the social card and the local mode strip (step 8 notes): wording
  decisions for the owner/lead.
- `components/platform/staking-placeholder.tsx` still says stZIG is not tracked (step 7 notes).
- Governance UI (votes) and Goal Vaults are this lane's later chunk; `vote()` and the v1beta1 `MsgVote` path (messages,
  receipt event `proposal_vote`, the flag's allowlist) are already built and tested, with no UI.
- Owner-only, never by an agent: a real Keplr run on zig-test-2 (delegate, claim, move, unstake) with faucet ZIG, and a REAL
  delegate only if the owner chooses (L2 design's `owner-staking-evidence.md`).

## Assertions changed
- `apps/web/lib/wallet-guard.test.ts`, third test ("the only signer stays in lib/wallet.ts's blocked execute path"): the
  files that may name `getOfflineSigner` go from `['lib/wallet.ts']` to `['lib/staking/execute.ts', 'lib/wallet.ts']`
  (ADR-028 H4, the owner's rule change for native-staking signing). Equal or greater strength: lib/wallet.ts's checks are
  unchanged; the new file's only calling function must be `executeSigned`, whose first statement must be
  `assertNativeStakingAllowed(ticket.messages);`; `lib/wallets/keplr-session.ts` is added to the FORBIDDEN-shape check; and
  `lib/staking/staking-guard.test.ts` adds the stricter gate (signer shapes in exactly those two files, each signer call once,
  the review sheet's onSubmit as the only door, ZIGi's code never importing the pipeline, the type-URL allowlist).
- `apps/web/lib/server/positions-relay.test.ts`, "the public builds refuse mainnet with a plain sentence and read nothing":
  replaced by "every build reads mainnet through the relay, GET only, to api.zigchain.com only; the query stays strict"
  (ADR-028 H16, owner amendment 6 lifted Session Z-Cloud's C4). The refusal it pinned no longer exists by the owner's
  decision; the new test pins what the read may do (only GET, only the official mainnet LCD, every build), the strict query
  including the new `minHeight` (0, letters, 21 digits, a repeat → 400) and a 502 on upstream failure. A new test pins the
  `minHeight` cache rule (a lower kept block is re-read and counts toward the 10/min limit).
- Fixtures only (no assertion changed): `lib/native-positions.test.ts`, `lib/mainnet-denomination.test.ts`,
  `lib/positions-route.test.ts` and `lib/server/positions-relay.test.ts` answer the new stZIG `by_denom` read with a zero
  stZIG balance, so every existing quantity list and count is unchanged (the relay's "≤ 10 upstream calls" bound now
  measures 10, at its limit).
