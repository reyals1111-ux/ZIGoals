# Session AF — the owner request ledger

Every request of the Session AF brief as its own row, plus the owner's amendments 2 and 3 (one row per bullet, ADR-028
amendment 11). The final STATUS entry repeats this ledger with done / not done and why for every row. Parts and decisions:
[ADR-028](../architecture/ADR-028-session-af.md); the approved plan: [PLAN_APPROVED.md](../research/session-af/PLAN_APPROVED.md).

## The ledger as approved (2026-10-18)

Every request in the owner's prompt, one row each. The final STATUS entry repeats this ledger with done / not done + why. Columns: the request (the owner's words, shortened) → the part that builds it → acceptance → how it is proven.

### 2.1 Setup and session rules (S)

| # | Request | Part | Acceptance | Proof |
|---|---|---|---|---|
| S1 | Pull latest `main` first | B-0 (first minute) | `main` = `4f924956…` or newer, fast-forward only | `git log -1 main` in AF_RESUME.md |
| S2 | New branch `feature/session-af-wealth-unlocked` from it; harness branches untouched | B-0 | Branch exists from `main`; `review/*` and `feature/session-ab-design` unchanged | `git branch --show-current`; `git status` of the others |
| S3 | Plan mode until one plan is approved; then never ask; safest option; record in ADR-028 | This file; ADR-028 | No question after approval; every decision an H-row in ADR-028 | ADR-028 "Decisions made without the owner" |
| S4 | Read CLAUDE.md, apps/web/AGENTS.md, docs/STATUS.md newest first (AE, #43, AD, #42, AC) | Done in Phase R (audit B1) | Facts from those entries appear in sections 3 and 11 | Section 3.8 |
| S5 | Follow every project rule unless changed under "Owner rule changes" | All parts | No rule broken; the four changes applied as Tier 3 commits where they touch code | Gate C reviews; STATUS "Tier 3 in plain words" |
| S6 | Phase R: ~2 h research with parallel helpers; plan by 22:45 Brussels | Phase R | Plan presented before 22:45 | Timestamp of ExitPlanMode |
| S7 | Phase B: build everything in the approved plan, fully working, tested, visually integrated; multi-day; may use the weekly allowance | Parts 0–12 | Every ledger row done or explained | Final STATUS ledger |
| S8 | PR out of Draft with CI green by Sun 25 Oct 11:00 Brussels | Gate C / final | Milestone quality green on the final head; PR "Ready for review" | PR page, run URL |
| S9 | Gate C starts no later than Sat 24 Oct 08:00 Brussels | Schedule (section 12) | AF_RESUME.md logs Gate C start time | AF_RESUME.md |
| S10 | No pre-cut, no lean mode; only an owner message "lean finish" shortens | All parts | No part dropped unless that message arrives | Final report |
| S11 | A usage-limit pause resumes from the resume file without re-planning | AF_RESUME.md | The file carries the next action, lane states and open decisions after every part | AF_RESUME.md after each part |
| S12 | Every part is a must; the closest honest working version with the reason wherever impossible | All parts; ADR-028 | Each impossibility is an H-row with the honest version | ADR-028; final ledger |

### 2.2 Non-negotiables (N)

| # | Request | Where enforced | Acceptance | Proof |
|---|---|---|---|---|
| N1 | Consumer first, chain invisible: jargon always has a plain-words explanation one tap away; depth available, never forced | Earn, Staking, Wallets, Governance, Vaults, ZIGi | Every term in the glossary list (section 11.9) has a "What's this?" tap; no page needs it to be understood | Copy audit at Gate C; Playwright `earn-plain-words` |
| N2 | Private by design: personal data on device; sync end-to-end encrypted; nothing personal on-chain; on-chain uses only what the person explicitly publishes, said before signing | All; Part 6 | No goal/habit/health/amount-tied-to-identity leaves the device; every signing review says what becomes public | PRIVACY.md; review-screen specs; security review |
| N3 | Non-custodial: the person signs in their own wallet; ZIGoals/ZIGi never sign, hold keys or seeds, move funds or auto-submit; ZIGi only pre-fills; no server wallet, fee-payer or bot key | Part 2, 3, 6, 8 | Only one code path broadcasts, behind the review screen's Sign press; no key material anywhere | Guard tests (section 11.7); security review |
| N4 | Honest numbers: every APR/APY/TVL/price/commission/balance live from a named source with "as of", or "unavailable" with the reason; never invented or estimated; projections labelled illustrations; unknown never zero | Part 1, 2, 3, 6 | Every number component takes `{value, source, asOf}` or `{unavailable, reason}`; no literal rates in code | Unit `honest-number` tests; live-check script; Gate C audit |
| N5 | Risks in plain words next to every earning option (lockups, slashing, contract/admin keys, custody, fees, price, eligibility/KYC) with a source link | Part 1 | Every option card has a Risks block with ≥5 items each linking to the project's doc or on-chain read | Playwright `earn-risks`; copy audit |
| N6 | Wording: "ecosystem apps", never "partners"; official names and logos from press kits, unaltered | Part 1, 5, 12 | `grep -i partner` over new UI strings returns nothing; logo files match press-kit files | Unit string scan; logo manifest in docs/earn/af |
| N7 | Anti-phishing: one verified link registry (exact official URLs checked in Phase R), "verified link" mark, never built from user input; decoy "ZIG" factory token warning (native ZIG is azig/18 on zigchain-1) | Part 1, 2, 3 | All outgoing links go through `verifiedLink()`; a lint test fails on any `href` to an external host outside the registry; decoy warning on every asset list | Unit registry test; ESLint-style scan test |
| N8 | No secrets anywhere; only PUBLIC identifiers in one config file, empty by default, filled by the owner | Part 3, 4 | `apps/web/config/public-integrations.json` (section 11.4) empty by default; check-secrets and key-sweep clean | Gate C key scans |
| N9 | Agents never deploy, approve environments, log in to Cloudflare, change Workers outside the Alpha app's code; never merge; never auto-deploy | All | No deploy, merge, or Worker change happened | Final report; PR state |
| N10 | Motion: one-time by default; the owner-approved exceptions; still and readable under reduced motion and Motion Off | All visual parts | Every new animation runs once or is one of the listed exceptions (Nebula Checklist background); reduced-motion captures readable | Layout audits ×3 themes; `motion` specs |
| N11 | Additive: never remove a feature or card; redesign only where asked | All | Feature inventory diff: nothing removed | Gate C inventory check (section 16) |
| N12 | Agents never type into, unlock or sign with a real wallet; tests use mocked wallets, simulate calls, recorded fixtures, never a broadcast; the owner does real signing after deploy | Part 2, 3, 6 tests | No test touches a real extension; the broadcast function is stubbed in every spec | Test audit; mock harness |

### 2.3 Owner rule changes for this session (O)

| # | Request | Part | Acceptance | Proof |
|---|---|---|---|---|
| O1 | "Testnet first" relaxed for NATIVE staking only: practice on zig-test-2 and real on zigchain-1 (delegate/undelegate/redelegate/claim); everything else by guided link-outs; no in-app signing for third-party contracts | Part 2 (Tier 3 wallet/signing); Part 1 link-outs | Mainnet signing exists only for the four native actions (+ gov vote, authz grant per Part 6); no CosmWasm execute anywhere | Guard test lists allowed `typeUrl`s |
| O2 | New dependencies only if named here with version, gzip size, why the stack is not enough, lazy-loaded; owner approves the list | Section 11.5 | Only the approved packages added; each lazy | `package.json` diff; weight check |
| O3 | Existing budgets not raised; each NEW route gets a line at measured + 10 %, rounded up, in one commit "Owner-approved budgets for new routes" | Section 11.6 | Exactly one such commit; every existing page under its old budget | `check-weight-budget.mjs` at Gate C |
| O4 | No "ask your lawyer" gates; product honesty rules still apply | All copy | No legal gate in flows; honesty copy present | Copy audit |

### 2.4 Phase R research tracks (R) and what the plan must contain (PC)

| # | Request | Where | Acceptance | Proof |
|---|---|---|---|---|
| R1 | ZIG Finance end to end (rebrand, site, docs, tokenomics, explorers, validators, governance, modules, endpoints + CORS/limits, Hub/bridge, chain registry azig/18 vs uzig/6, Labs portfolio, mission, summit, roadmap); ecosystem map + plain-words explainer | Section 3.1, 4 | Map and explainer present; every fact sourced | Section 3.1 |
| R2 | Every live way to earn (native staking, Valdora, OroSwap, Zignaly, every other live dApp) with plain words, operator, status, step-by-step, live-data source + CORS/limits/samples/cadence, framing headers, deep links, wallets, fees, lockups, risks, URLs, logos | Section 5 | Table per option with its endpoint/query and a sample | Section 5 |
| R3 | On-ramps: re-verify the 2026-10-17 findings; choose two (public IDs only); integration mode, assets/networks, prefill, return, sandbox, owner registration, countries; the one "Add money" flow with time estimates | Section 6 | Two chosen with reasons; URL templates with public params; flow with times | Section 6 |
| R4 | Wallets: who can sign ZIGChain; who can be linked read-only; WalletConnect/Reown needs, size, lazy load; read-only chains + endpoints + pricing via coordinator + privacy decision | Section 7 | Wallet matrix; chain/endpoint matrix; dependency table; PRIVACY text | Section 7, 11.8 |
| R5 | On-chain purpose, ≥30 min deep reasoning; no-contract options via native modules; the seeds; ranked list with feasibility, privacy, what is built this session (expect Goal Vaults + governance) and what waits | Section 8 | Ranked table; built-this-session set; message types | Section 8 |
| R6 | ZIGi deep dive vs the named assistants; what ZIGi lacks; ≥5 features ranked; ≥3 built; no paid calls; ready for the real-model round | Section 9 | Gap list; ranked list; the 3+ chosen | Section 9 |
| R7 | Competitor gap scan (the 22 apps); confirm/replace the three extras with evidence; 3 + 2 alternates | Section 10 | Scored table 3 + 2 | Section 10 |
| R8 | Code audit of Staking, Wealth, Portfolio, wallet card + Connect Keplr menu, ecosystem directory, launchers, themes, sidebar sky, footer finale, habits widgets/records, game layer, timers, CSP, hosted verifier, weight budgets, frozen readers, extras-sync | Section 3.8, 11 | Each named area mapped to files and reuse | Section 3.8 |
| RM1 | Parallel research helpers; real internet; web search/fetch; Playwright captures of PUBLIC pages only, never logged in, never a wallet, never bypassing bot walls ("unreadable" otherwise) | Phase R | Done as described; captures deferred to Part 0 (plan mode) | Section 1; ADR-028 H1 |
| RM2 | Start from the repo's docs (docs/earn, docs/strategy, components, wallet code, pages); re-verify everything older than a week; keep raw notes; Part 0 commits them | Phase R, Part 0 | Audit B1 read them; re-verification verdicts recorded | Section 3; journal |
| PC1 | The plan contains the owner request ledger (every request, part, acceptance, test); the final report repeats it with done / not done + why | This section; final STATUS | Present | — |
| PC2 | Research results in short; ecosystem map; every earning option with live data source (endpoint/query + sample); the two on-ramps and why; wallet matrix; ranked on-chain list; ZIGi feature list; competitor scan and 3 + 2 | Sections 3–10 | Present | — |
| PC3 | Architecture: new routes, server routes (egress allowlist, caching, schema validation), CSP changes (exact directives), storage keys and formats (versioned, readers), sync impact, dependencies table, weight plan, privacy changes (PRIVACY.md text), Tier 3 commit list | Section 11 | Present | — |
| PC4 | Part order with helper lanes; the owner's account checklist (click-by-click, which public ID where); risks; readable (headings, tables, no filler) | Sections 12–14 | Present | — |

### 2.5 Part 0 — Records and setup (P0)

| # | Request | Acceptance | Proof |
|---|---|---|---|
| P0.1 | STATUS records Alpha #44: source `4f9249561736fbe19305b426de82f5c91a24763d` (Merge #89, Session AE; PR merged 2026-10-18 08:29:39 UTC), CI Milestone quality #1024 ([run 39111652354](https://github.com/reyals1111-ux/ZIGoals/actions/runs/39111652354), push to `main`, success attempt 1 — Actions API), Manual Alpha deployment run number 46 ([run 39121639375](https://github.com/reyals1111-ux/ZIGoals/actions/runs/39121639375), dispatched 2026-10-18 11:02:37 UTC by the owner from `main`, deploy job done 11:25:04 UTC, success attempt 1 — Actions API; the gap-fill helper read these), VERIFIED after 3 reads, live prices VERIFIED (market policy 13 days left), new version `24d86173-c7ac-457c-affd-b35ecd02b6ac`, rollback `5ee8241e-047f-4cf1-93d8-c688b4a71f29` (#43); release identity #44 live / #43 previous; rollback floor #32; the Worker ids, reads and price check owner-reported; live header `x-zigoals-build: 4f92495…` confirmed at 19:29 UTC | Entry in the existing "Alpha deploy #N" shape with every value verbatim and its label (Actions API / owner-reported) | docs/STATUS.md |
| P0.2 | Record the owner's hosted verifier run on #44 (2026-10-18, ops checkout at 4f92495, evidence `~/zigoals-evidence/alpha-44-2026-10-18`): all 8 stages PASS (incl. stage 6 Reminders/Share, stage 7 landing, stage 8 recipe-import refusals — first full live pass), overall FAIL only on the final HTTP-error check (5 × 503 from GET /api/push and /api/private-account?action=status, the designed "not configured" answers) — a verifier bug fixed in Part 11 | Paragraph in the #44 entry, owner-reported | docs/STATUS.md |
| P0.3 | ADR-028 with decisions H1…Hn | File exists; H-numbered; updated every part | docs/architecture/ADR-028-session-af.md |
| P0.4 | `docs/handoff/AF_RESUME.md` — "Resume here" after every part; model-switch and pause safe | Template in section 12.6; updated after every part and lane merge | File history |
| P0.5 | Research notes as docs: `docs/earn/af/` (earn, wallets, on-ramps, on-chain purpose) and `docs/research/session-af/` (ZIGi, competitor scan); reference captures to orphan branch `review/session-af-screens`, never the feature branch | Files listed in section 12.5 exist, each with the "as of" header and sources | Commit; `git ls-tree` |
| P0.6 | Before captures of every page to be changed: Nebula/Light/Dark at 390 and 1440 | Capture set on the orphan branch with an index | review branch commit |
| P0.7 | The Draft PR right after Part 0 | PR opened as Draft with the plan summary | PR URL in AF_RESUME.md |

### 2.6 Part 1 — The Earn hub (P1)

| # | Request | Acceptance | Proof |
|---|---|---|---|
| P1.1 | New page Earn at `/app/earn`: the explainer and launcher for every way to earn in the ZIG Finance ecosystem | Route renders in 3 themes at 320–1920 | Playwright `earn.spec.ts`; audits |
| P1.2 | Staking stays the page of the person's own positions and native actions; gets a rich empty state that previews Earn | Empty Staking shows the Earn preview cards and the Start-here CTA | `staking-empty.spec.ts` |
| P1.3 | Navigation: Earn in the Wealth group (desktop sidebar, phone Wealth tab, search, More); the plan proposes the exact placement with captures | Placement per section 11.1; captures in Part 0/1 | Nav specs; captures |
| P1.4 | Long scrolling: one big section per ecosystem app, with a sticky in-page index of chips | Chip index sticks, scroll-spies, keyboard reachable | `earn-index` spec |
| P1.5 | Hero "Make your money work" (premium) | Hero present, nebula gradient, one-time motion | Captures; critique |
| P1.6 | Live summary if a wallet is linked: total earning, rewards waiting, next unbonding date | Values from chain reads with "as of"; hidden without a wallet | `earn-summary` spec with mocked chain |
| P1.7 | "Start here" path on the shared path engine: 1 Get a wallet → 2 Practice first → 3 Add money → 4 Get ZIG → 5 First real stake → 6 Explore more (liquid staking, liquidity pools, governance — "copy trading" leaves the path because Zignaly is closing, H43) | Six steps render, each opens its guide | `earn-path` spec |
| P1.8 | Step 1 content: Keplr setup, seed-phrase safety in plain words | Copy present with the verified Keplr link | Copy audit |
| P1.9 | Step 2: testnet faucet + a practice stake signed in the wallet | Faucet verified link; practice stake opens Part 2's review on zig-test-2 | Spec with mocked Keplr |
| P1.10 | Steps 3–6 link to Part 4 (Add money), the Get-ZIG route with time estimates, Part 2 (first real stake), the Explore section | Each step deep-links correctly | Spec |
| P1.11 | Each step shows done/not done from real state (wallet linked, balance > 0, practice stake exists, delegation exists) | Detectors read the linked-wallet record and chain fixtures; undetectable steps say "mark as done" | Unit `start-here-state.test.ts` |
| P1.12 | One big section per earning option found in R2 (native staking, Valdora, OroSwap, Zignaly, every other live one) | Section count = options in section 5 | Spec |
| P1.13 | Per option: one sentence + "best for…"; who runs it; live/beta label | Present per card | Copy audit |
| P1.14 | Per option: LIVE numbers with source and "updated x min ago": APR/APY, TVL/pool depth, fees, lockup/unbonding, minimums | Each number from its route in section 11.3 with source + asOf | `earn-live` spec (fixtures); live-check script |
| P1.15 | Native staking APR computed from on-chain inflation, bonded ratio, community tax, validator commission; the formula on tap | `nativeApr()` unit-tested against fixtures; formula sheet opens | Unit test; spec |
| P1.16 | Polled while visible (cadence per source), cached server-side | Visibility-gated polling; route cache TTLs per table 11.3 | Unit tests on the poller; route tests |
| P1.17 | "Unavailable" with the reason when a source fails | Route returns `{unavailable, reason}`; card shows it; never zero | Route tests; spec |
| P1.18 | Illustrated step-by-step of what the person sees and does on the app's site, redrawn in nebula style from the Phase B captures (layout, buttons, labels match); official logo; numbered steps; time estimate; what they sign and why | One SVG illustration set per option, matching the capture index; steps numbered with times | Captures; critique; copy audit |
| P1.19 | Guide mode: "Open [app]" opens the verified link in a new tab AND keeps a compact step panel open (with a ZIGi helper) | Panel stays, steps tickable, ZIGi helper opens the Earn coach on that option | `earn-guide` spec |
| P1.20 | Frame the external site inside ZIGoals ONLY if Phase R proves allowed AND safe; wallet flows never in a frame | Decision per option in section 5 (expected: none framed) | ADR-028 |
| P1.21 | Risks in plain words per option (N5) | Risks block per card with sources | Spec |
| P1.22 | Eligibility (e.g. Zignaly KYC/excluded countries); custody line ("you keep the keys" vs "they hold the funds") | Present per card | Copy audit |
| P1.23 | If the linked wallet holds positions there (readable on-chain), show them here and in Staking/Portfolio | Positions from the chain readers appear on the card and the two pages | Spec with fixtures |
| P1.24 | Native validators section: full live list (moniker, commission, voting power, uptime/jailed/active, self-bond, website) | All bonded validators listed from the route | Spec; live-check |
| P1.25 | Plain-words guidance to pick a validator (avoid top-heavy, avoid jailed, mind commission); filters and sort | Guidance copy; filters (active/jailed, commission ≤ x) and sorts (power, commission, uptime) | Spec |
| P1.26 | "Earn calculator" link opens the Compound Interest Calculator pre-filled with a LIVE APR as a labelled illustration | Calculator reads the APR param and shows the "illustration" label | Spec |
| P1.27 | Earn Academy: short lessons + 3-question quizzes per topic (staking, APR vs APY, unbonding, liquid staking, liquidity pools and impermanent loss, copy trading and custody, spotting scams, gas/fees) as a mini path with progress; XP when the game layer is on | Eight lessons, 3 questions each, progress stored, XP granted once per lesson | Unit + spec |
| P1.28 | Scam safety block: verified-link registry, decoy-token warning, "never share your seed phrase", "ZIGoals will never ask you to sign anything you didn't start" | Block present with the four items | Spec |
| P1.29 | A beautiful empty state (no wallet; all explanations present) and a full state (positions) | Both states captured in 3 themes | Captures; critique |
| P1.30 | Today EARN card ("Learn to stake, earn and swap — in 30 minutes"; the owner's "copy trade" word changes because Zignaly is closing, H43) for new users → Start-here; steps aside (dismissible, re-addable from the widget picker) once the person has a position | Device-only Today card (H29); hides on position; re-addable | `today-earn-card` spec |

### 2.7 Part 2 — Native staking that really works (P2, Tier 3 wallet/signing)

| # | Request | Acceptance | Proof |
|---|---|---|---|
| P2.1 | With Keplr (and any other R4 wallet that signs ZIGChain safely): delegate, undelegate, redelegate, claim rewards (single and all) | Four actions + claim-all build the right messages | Unit message-builder tests |
| P2.2 | On PRACTICE (zig-test-2) and REAL (zigchain-1) | Both chain configs; the network switch | Spec |
| P2.3 | Network always shown in big plain words; practice visually distinct; switching to real requires an explicit confirm the first time | Banner + colour; first-real confirm dialog stored in a device key | Spec; captures |
| P2.4 | Review screen before every signature: action, validator, amount, fee (simulated gas), unbonding period and meaning, "you will sign this in your wallet; ZIGoals never sees your keys" | Every field present; gas from `simulate` | Spec with mocked signer |
| P2.5 | Amounts typed by the person; max keeps gas; no defaults that move money | Empty amount by default; max = balance − fee reserve | Unit test |
| P2.6 | After signing: pending → confirmed with the tx hash link to the explorer | States and the verified explorer link | Spec |
| P2.7 | Positions, rewards, unbonding entries update on Staking, Portfolio, Wealth, Today | Refetch after confirm; four surfaces show it | Spec with fixtures |
| P2.8 | Errors in plain words: rejected, insufficient fees, out of gas, sequence mismatch | Error mapper unit-tested on recorded error strings | Unit test |
| P2.9 | Chain configuration for mainnet and testnet (Keplr chain suggestion where needed); denom azig/18; decoy-token guard | Config values from section 3.1 verified by LCD; suggestion JSON; decoy denom rejected | Unit + live-check |
| P2.10 | ZIGi may pre-fill the staking form from a conversation; the person reviews and signs; never auto-accept | Prefill action opens the review screen only | ZIGi guard test |
| P2.11 | Tests: mocked wallet + chain simulate + recorded fixtures | Harness in section 11.7 | Test audit |
| P2.12 | A guard test fails on any code path that could sign or broadcast without an explicit user press on the review screen | Static + runtime guard | `signing-guard.test.ts` |
| P2.13 | A guard that no ZIGi path reaches signing | Static guard over `components/ai` and `lib/ai` | `zigi-no-signing.test.ts` |

### 2.8 Part 3 — Wallets: real connections and tracking everywhere (P3, Tier 3 wallet/storage/CSP)

| # | Request | Acceptance | Proof |
|---|---|---|---|
| P3.1 | Build on AE's "Connect Keplr ▾" menu: real connections for every R4 wallet (MetaMask, Rabby, Coinbase Wallet, Trust, OKX, Phantom as justified, Ledger via WalletConnect) | Each wallet in the menu connects through EIP-6963 (desktop) or WalletConnect (phones) | Spec with fake EIP-6963 providers |
| P3.2 | EIP-6963 on desktop; WalletConnect/Reown on phones with the public project ID from the config file | Discovery works; WC module lazy-loads only with an ID | Spec; weight check |
| P3.3 | Until the owner adds the ID, phones show the honest "available soon on phones" line; desktop extensions still work | Line shown when the ID is empty | Spec |
| P3.4 | No "Preview" labels: working connections | String scan finds no "Preview" in the wallet menu | Unit scan |
| P3.5 | Read-only tracking: balances and tokens of linked addresses on the R4 chains (ZIGChain, Cosmos Hub, Ethereum + main L2s, BNB, Solana if justified, BTC watch-only) | Readers per chain with fixtures | Unit + live-check |
| P3.6 | Priced through the existing market coordinator (no Worker change; respect its row budget) | Only symbols it serves; no Worker diff | Route tests; `workers/` diff empty |
| P3.7 | Shown in Wealth/Portfolio "What you have" with per-wallet and per-chain filters; totals in the person's currency | Filters and totals | Spec |
| P3.8 | Staking positions on ZIGChain read from chain | Delegations/unbonding/rewards readers | Spec with fixtures |
| P3.9 | Practice money never in fiat; real holdings get real conversion | Testnet balances carry no fiat; mainnet do | Unit test |
| P3.10 | Disconnect per wallet | Per-row disconnect | Spec |
| P3.11 | Linked addresses device-only: `zigoals:linked-wallets:v1` or a v2 with a reader for v1; in Export; never synced; never restored from backups (AE) | Key per section 11.4; frozen reader; Export catalog | Unit + frozen-readers |
| P3.12 | PRIVACY.md updated in plain words (which endpoints see which addresses) | Text in section 11.8 landed | Doc diff |

### 2.9 Part 4 — Two fiat on-ramps (P4, Tier 3 CSP/egress as needed)

| # | Request | Acceptance | Proof |
|---|---|---|---|
| P4.1 | The two R3 providers integrated end to end with PUBLIC identifiers only; config file empty by default; sandbox/test mode in tests; owner pastes production IDs later (exact place listed) | URL builders + config; sandbox hosts in tests | Unit tests; OWNER_ACCOUNTS.md |
| P4.2 | If a provider needs no ID for its plain buy page, that link works on day one | Plain buy link in the registry for such a provider | Spec |
| P4.3 | "Add money" lives in the Earn path step 3, the wallet card and Wealth | Three entry points open the same sheet | Spec |
| P4.4 | Flow: pick provider → pick what to buy for the chosen route (ATOM to the person's `cosmos1…` address, then the guided IBC transfer link-out (H49) + the guided OroSwap swap; route A/C shown as alternatives) → address pre-filled from the linked wallet (Ramp `userAddress`, Banxa `walletAddress`) → hand-off by redirect in a new tab (no widget: H18) → return with "what happens next" (arrival times, then step 4 Get ZIG, with the balance watch) | Each step rendered; return URL handled | Spec with sandbox URLs (never submitted) |
| P4.5 | Honest copy: ZIGoals doesn't sell anything or touch the payment; the provider does payment and KYC; fees shown by the provider | Copy present on the sheet | Copy audit |

### 2.10 Part 5 — The Earn dock (P5)

| # | Request | Acceptance | Proof |
|---|---|---|---|
| P5.1 | Optional floating launcher in the nebula style of the ZIGi and music buttons; tapping fans out round buttons for the live ecosystem apps with official logos | Fan-out with one-time motion; logos from the manifest | Spec; captures |
| P5.2 | Each opens that app's Earn section (then guide mode + verified link); shows the person's live position badge if one exists | Deep-link to `/app/earn#<app>`; badge from positions | Spec |
| P5.3 | Optional in Settings; foldable into the right edge with the arrow | Toggle + fold | Spec |
| P5.4 | Default right-edge order top→bottom: Earn dock, Music, Checklist, ZIGi; the plan may propose a better spot with captures; Music → Checklist → ZIGi is the owner's | Order per section 11.1 (dock on top as asked); adapts when one is hidden | Spec; captures |
| P5.5 | Phones: inside More / the Earn page, never crowding the tab bar | More row + Earn-page strip; no tab added | Phone spec |

### 2.11 Part 6 — ZIGoals on-chain (P6, Tier 3 wallet/signing/storage)

| # | Request | Acceptance | Proof |
|---|---|---|---|
| P6.1 | Build the top feasible R5 ideas (owner confirms at plan review); expected minimum Goal Vaults + governance | Section 8 set built | Ledger rows below |
| P6.2 | Goal Vaults: link a Wealth goal to the person's real stake (delegation and/or liquid-staking balance from their linked wallets) | Link sheet lists eligible stakes | Spec |
| P6.3 | Progress = staked amount + rewards earned since linking; live "your money is working toward this goal" visual; rewards shown pushing the goal | Progress reader with the linking baseline; visual | Unit + spec |
| P6.4 | A projection labelled as an illustration; nothing leaves the wallet; device-only link record (versioned key, in Export) | Label; no messages built; key per 11.4 | Unit; frozen reader |
| P6.5 | Governance: live proposals in plain words (title, what changes, deadline, tally) | Route + plain-words renderer | Spec with fixtures |
| P6.6 | Vote Yes/No/Abstain/NoWithVeto from the app signed in the wallet if they have a delegation; explanation of why voting matters | MsgVote through the same review screen; gated on delegation | Spec with mocked signer |
| P6.7 | Any further top idea needing no custom contract that keeps privacy | Built: validator-health alerts, the one-message rewards-to-goal sweep, the facts-only validator picker, the Get-ZIG balance watch, the read-only grants & allowances panel (+ revoke for direct signers); memo attestations designed and shipped opt-in on testnet only (H48) | Specs per item |
| P6.8 | The rest recorded as later options in ADR-028 and STATUS | List present | Docs |

### 2.12 Part 7 — Checklist (P7)

| # | Request | Acceptance | Proof |
|---|---|---|---|
| P7.1 | A Duolingo-style, full-screen, one-page daily path; favourites starred anywhere become today's path of glowing dots; ticking updates the real record; resets daily; feels like its own premium app | Route `/app/checklist` full-screen; captures in 3 themes | Spec; critique |
| P7.2 | Favourites: a star on every habit, goal (or step), health quick input (water, vitamins/supplements, weight, meal, sleep, meditation, fasting…) and custom items; outlined vs filled with the item's colour; instant toggle with Undo | Star component on each card type; Undo toast | Spec per surface |
| P7.3 | Manageable inside Checklist ("Edit path": add, remove, drag to reorder, custom items like "Play piano 15 minutes" that can optionally become a habit) | Edit mode with drag; "Make it a habit" action | Spec |
| P7.4 | The path: favourites in the person's order as large coloured dots (teal, blue, magenta, purple, gold, pink, cyan; each keeps its page colour) connected by neon flow lines like the footer banner | Path engine renders dots + lines; colours from the item | Captures; unit colour map |
| P7.5 | Sections as orbits/star systems ("Morning orbit", "Afternoon orbit", "Evening orbit", or own grouping) with a coloured section banner; the feeling of travelling planet to planet | Sections with banners; default grouping by time of day; custom groups | Spec |
| P7.6 | ZIGi on the path (cheering, pointing at the next dot, celebrating milestones) using existing ZIGi states | Companion anchored to the next dot; states reused | Spec |
| P7.7 | Reward chests/milestones (half way, all done) granting a badge/XP when the game layer is on | Milestone nodes; achievements wired | Unit + spec |
| P7.8 | "Jump to next" bubble for the first undone dot | Bubble scrolls to it | Spec |
| P7.9 | Top progress bar with a satisfying fill animation; today's streak flame and count | Bar + flame | Captures |
| P7.10 | Ticking: tap a dot → dot fills, burst/ring, the line to the next dot lights, ZIGi reacts, a soft sound if sounds on and not in quiet hours, vibration where supported; the real record updates (habit check-in with its rules, health log, goal progress/step) with Undo | Animation once; adapters call the existing write functions; Undo reverts | Unit adapters; spec |
| P7.11 | Any order allowed (last dot first) | No locking | Spec |
| P7.12 | Value inputs (100 push-ups, 500 ml water, weight) open an inline stepper with the item's default; remembers the last value | Stepper; last value stored | Spec |
| P7.13 | Streak: completing ALL dots in a day keeps the Checklist streak (no punishment for late ticking); "Perfect orbit" bonus badge when done in path order across the day; game-layer streak freezes apply | Streak logic unit-tested with day boundaries | Unit |
| P7.14 | Gentle in-app nudges to open it a few times a day (push stays off) | In-app nudge rules; no push | Unit |
| P7.15 | Daily reset at the person's day start (local midnight by default; respect an existing day-start setting); yesterday kept in history (calendar/heatmap in our colours) | Day key; history heatmap | Unit + spec |
| P7.16 | Always-on-top corner timers: Sleep, Meditate, Fast (and Focus if it exists); one tap starts the existing timer and tracks it on its own page; tap again ends it (Sleep at bedtime, again when waking: the full sleep recorded on Health); running state visible | Corner buttons bound to the existing timer stores | Spec |
| P7.17 | Two views: Path (default) and List (compact Todoist-style pills with an accent colour picker from our palette); List noted as the base for future wearables (no watch app) | Toggle; picker; note in docs | Spec; docs |
| P7.18 | Themes: Nebula animated star-system background; Light white with light colour mist; Dark black with subtle mist; dots/lines/colours identical | Theme captures; parity test | Parity test |
| P7.19 | Launcher: nebula-coloured checklist mark animating as a check once on first view; same size/style/glass/behaviour as ZIGi and music; optional in Settings; foldable; between Music (top) and ZIGi (bottom); order adapts when one is hidden | Launcher in the shared stack | Spec; captures |
| P7.20 | Phones: reachable from the top bar or More and as a Home Screen shortcut (Android manifest shortcut) | More row/top-bar entry; `shortcuts` in the manifest | Spec; manifest test |
| P7.21 | Today: a small Checklist progress card ("4 of 6 dots today") that opens it; Journey/game integration; ZIGi integration | Widget registered; Journey shows checklist badges | Spec |
| P7.22 | Storage: versioned device keys (favourites, order, custom items, daily results, settings) with readers for older builds; in Export; designed so extras sync can carry them later (decided in section 11.4; Tier 3 storage/data formats) | Keys per 11.4; frozen readers | Unit; frozen-readers |
| P7.23 | Reduced motion / Motion Off: all states readable as stills; no loops except the owner-approved Nebula background | Reduced-motion captures | Audit |
| P7.24 | Owner: "amaze me again with this feature" | Design critique round passes on the Checklist captures | Critique record |

### 2.13 Part 8 — Big ZIGi update (P8)

| # | Request | Acceptance | Proof |
|---|---|---|---|
| P8.1 | At least 3 new features fully (more if R6 found strong ones), ready for the real-model round | All six seeds built (Memory as the delta on the existing record, H30); Dutch on-device answers as the stretch | Golden tests |
| P8.2 | Seed 1 Daily Briefing + Evening Recap (morning plan: dots, habits due, meals, timers, goals needing a step, earning summary; evening recap) as a card, in chat, read aloud on request | Per section 9 | Golden + spec |
| P8.3 | Seed 2 ZIGi Memory: device-only, opt-in, visible/editable in Settings "What ZIGi knows", forget item by item, in Export, never synced without consent | Per section 9 | Unit + spec |
| P8.4 | Seed 3 Plans (agent mode): one reviewable bundle with per-item accept through the device-record registry; money pre-fill only | Per section 9 | Golden + spec |
| P8.5 | Seed 4 Earn coach using LIVE Part 1 data; explains APR/unbonding/impermanent loss; walks Start-here; pre-fills the staking review; never signs | Per section 9 | Golden + guard |
| P8.6 | Seed 5 Checklist by voice and text | Per section 9 | Golden EN/NL |
| P8.7 | Seed 6 Page awareness ("explain this card") | Per section 9 | Golden |
| P8.8 | Golden typed + spoken (EN and NL) cases for every new kind; mocked-model tests; no paid API calls | Case files listed in section 9 | Test audit |
| P8.9 | The real-model round test plan (what to measure, targets, cost estimate) written into docs | `docs/research/session-af/ZIGI_REAL_MODEL_ROUND.md` | Doc |

### 2.14 Part 9 — Three extra features (P9)

| # | Request | Acceptance | Proof |
|---|---|---|---|
| P9.1 | My Universe: a living personal star system; each pillar a planet gaining rings, moons, light, colour from streaks, goals reached, health consistency, money working; compact on Today, full in Journey; milestones once; shareable image; reduced-motion still | Per section 10 | Spec; captures |
| P9.2 | Day Timeline: one vertical timeline of today (habits at their times, meals, sleep window, fasting, timers, reminders, checklist dots); drag to move; now line; tap to complete; links to Checklist | Per section 10 | Spec |
| P9.3 | Stories: tap-through animated recaps (week/month/year: streaks, best day, goals moved, health trends, money working), each card shareable as an image; built on Life review's data (Life review stays) | Per section 10 | Spec |
| P9.4 | R7 confirms or swaps them, with 2 alternates for the owner at plan review | All three confirmed; Day Timeline's drag needs the owner's yes on a per-habit time field (Tier 3 storage), else tap-to-move only; alternates Guided Journeys and Focus Sessions recorded | Section 10 |

### 2.15 Part 10 — UI changes (P10)

| # | Request | Acceptance | Proof |
|---|---|---|---|
| P10.1 | Sidebar sky scroll-linked again: stars/background move with parallax on sidebar scroll; only the bottom-left planet, its text and the buttons stay fixed; keep AE's artwork; still under reduced motion / Motion Off | Transform bound to sidebar scroll; fixed layer unchanged | Spec measuring layer offsets at two scroll positions |
| P10.2 | Light mode redo: Light = Nebula with only white background + light mist, black text, calm heavy backgrounds; everything else keeps Nebula's exact colours and finish (buttons, chips, tools, charts, rings, pillar colours, glows, gradients); no matte/desaturation | Override sheet reduced to background/text/motion rules; parity test green | Parity test; captures |
| P10.3 | Nebula gradient text stays a gradient in Light (white part → black, the flow to the right stays) | Heading gradient token | Parity test on headings |
| P10.4 | Habits' 28-day blocks keep each card's own colour in Light (fix: all purple today) | Per-card colour in Light | Spec computed colours |
| P10.5 | Small coloured text on white failing contrast uses a deeper shade of the same hue, text only, never fills | Per-pillar deep text tokens; a11y contrast spec | `a11y-wcag` specs |
| P10.6 | Dark mode kept; only the star-system background becomes black with a very subtle colour mist | Background rule only | Captures; parity |
| P10.7 | Remove "Saved on device" below the three bottom sidebar buttons; keep the fact in Settings → Your data and Help; move any assertion at equal strength (Tier 3 public-safety labels) | Text gone from the sidebar; present in both places; the assertion moved | Spec; verifier |
| P10.8 | Footer finale: redesign the magenta line to "= Wealth" as an organic multi-curve, tapered stroke, magenta → pink → gold gradient blending into "= Wealth", soft glow, drawn once, responsive at every width; phones get an adapted arc | New SVG path; phone variant | Captures 320–1920; critique |
| P10.9 | Hero slogan: the two line boxes touch by 4–5 px at 768 and 1920 — fix spacing; nothing else in the hero changes | Gap ≥ 8 px at both widths; hero freeze otherwise | Spec measuring boxes |
| P10.10 | Today repeats: "Next step", "What matters today" and the goal card name the same goal — each shows something different; keep every card | Role assigner picks distinct items | Unit + spec |
| P10.11 | Wealth chip row: "Needs attention" must not wrap at 1440 | No wrap | Spec |
| P10.12 | Rail's 64 px lane must not wrap "ZIG reward / reserve" at 1001–1279; reward-reserve card follows the theme in Light; phones get the banner arc | Three fixes | Spec; captures |
| P10.13 | Final theme parity polish: Nebula ↔ Light ↔ Dark change only background, text colour, heavy-background calmness; a parity test compares accent/fill/chart/gradient computed colours and layout boxes across the three themes on every route and state; fix every difference | Test green at Gate C | `theme-parity.spec.ts` |

### 2.16 Part 11 — Leftovers (P11)

| # | Request | Acceptance | Proof |
|---|---|---|---|
| P11.1 | A1 STATUS records #44 | = P0.1–P0.2 | STATUS |
| P11.2 | A2 hosted verifier: on a LIVE base, set aside exactly GET /api/push → 503 (push-unavailable body) and GET /api/private-account?action=status → 503 (not-configured body) as named review items, not HTTP errors; anything else still counts; unit tests | Classifier change + tests | Unit tests |
| P11.3 | A3 hosted verifier: requests its own navigations abort (prefetches cancelled by navigation) are a count, not findings; a real failed request still counts; a healthy live site ends PASS | Abort classifier + tests; PASS on a local production build | Unit; Gate C run |
| P11.4 | A4 account-sync race (ADR-027 G24, account-browser b-first): after a replayed write answers 409, sync() reconciles once as runPortfolio does; a test reproduces the race (Tier 3 sync) | Reconcile step + race test | Unit/integration test |
| P11.5 | A10: a reader accepting goal-extras v1 and a future v2 (or a written guard blocking v2 without it); recipe-import DNS-rebinding reduced (resolve-then-pin or equivalent within Worker limits) or documented with the residual risk | Reader + guard; route change or security note | Unit; docs/security |
| P11.6 | Verifier stages for the Earn hub (renders, live numbers or honest "unavailable", verified links only) and the Checklist (opens, a fictional favourite ticks and updates its habit, Undo); origin allowlist updated for every new origin (Tier 3) | Two stages; allowlist | Verifier run at Gate C |
| P11.7 | Live-data smoke script `scripts/earn/live-check.mjs`: read-only; every live source returns well-formed data in sane ranges; run on the Mac at Gate C; left for the owner | Script + Gate C output in STATUS | Gate C |

### 2.17 Part 12 — Words and help (P12)

| # | Request | Acceptance | Proof |
|---|---|---|---|
| P12.1 | What's new release `2026-10-session-af-wealth-unlocked` | Entry in the release registry | Spec |
| P12.2 | Help answers for every new feature, mirrored in search | One answer per feature; search finds each | Spec |
| P12.3 | Known limitations updated | Entries for phones-without-Reown-ID, framing, on-ramp coverage, etc. | Doc |
| P12.4 | PRIVACY.md | Section 11.8 text | Doc |
| P12.5 | `docs/earn/af/OWNER_ACCOUNTS.md`: Reown project ID, the two on-ramp accounts — click-by-click, which public ID into which config field, nothing secret | Section 13 landed | Doc |

### 2.18 How you work (W), Gate C (G), final (F)

| # | Request | Acceptance | Proof |
|---|---|---|---|
| W1 | One giant PR; parts as separate commits; commit and push after every part (more often inside big parts) | Commit list per part in STATUS | git log |
| W2 | Tier 3 commits labelled "TIER 3 (<area>)" for wallet/signing, CSP, egress routes, storage, data formats, sync, public-safety labels, dependencies, verifier/CI, project rules | Section 11.10 list followed | git log |
| W3 | Lint, typecheck and focused tests before every push | AF_RESUME.md logs each push's checks | Log |
| W4 | Helpers in their own worktrees and branches `af/<lane>`, one owner per file, merged by merge commits; lanes (1) Earn hub + data routes, (2) wallets + on-ramps + native staking, (3) Checklist, (4) ZIGi, (5) UI/themes + extras | Section 12.2 | git log merges |
| W5 | Builds, Playwright runs and Chromium screenshots one at a time under a lock file; Playwright ≤ 2 workers | `scripts/af/with-lock.sh` used by every lane | Lock file log |
| W6 | Local rules: owner restarts the Mac first; `caffeinate -ims`; servers from Bash with nohup on 3102–3104 + curl health checks; every long command under a timeout with a log file; never preview_start/preview pane; no desktop screenshots/computer use; don't click "Relaunch to update"; never read `~/.config/zigoals/*`; stop caffeinate and servers at the end | Section 12.4 | AF_RESUME.md |
| W7 | Design language (premium cosmic/nebula, gradients, planets/orbits, one-time motion, liquid-glass hover without pointer tracking, labels ≥14 px, body 15–16 px, targets ≥44 px, desktop/tablet layouts kept, phones native-app, advanced options tucked away; pillar colours) | Critique rounds check against it | Critique |
| W8 | Use the frontend-design skill for Earn, Checklist, My Universe, Day Timeline, Stories | If enabled; else section 12.3 fallback with an H-row | ADR-028 |
| W9 | Quality loop per visual part: captures Nebula/Light/Dark at 390/768/1024/1440 → fresh design-critique helper → fix → re-capture; layout audit (overflow, contrast, touch) on every new route and state | Per part | Critique records; audit reports |
| W10 | Every new number has a source; every new string plain English (Alpha English-only; ZIGi EN + NL) | Copy audit | Audit |
| W11 | Daily ~18:00 Brussels PR comment (done today, next, owner items); AF_RESUME.md current after every part | Comments Mon–Sat | PR |
| W12 | Impossible as written → closest honest working version, explained in ADR-028 and the final report; never fake | H-rows | ADR-028 |
| G1 | Full unit suite | Green | STATUS |
| G2 | Full browser suite once (2 workers, nothing else running) | Counts in STATUS | STATUS |
| G3 | WebKit set | Green | STATUS |
| G4 | Layout audits in all three themes at 320/390/768/1024/1440/1920 + touch + stress records | Reports in docs/verification/af/ | Reports |
| G5 | Theme parity test green | — | STATUS |
| G6 | Weights: new routes within their new lines; existing pages within budgets | check-weight-budget output | STATUS |
| G7 | Revert gate: every commit newest-first with typecheck green | Scratch worktree log | STATUS |
| G8 | Frozen readers #37–#44 against every new key/format | Script green | STATUS |
| G9 | Key scans (check-secrets, key-sweep, no e-mail addresses) | Clean | STATUS |
| G10 | Live-data smoke script on real network | Output | STATUS |
| G11 | Hosted verifier against a local production build (ZIGOALS_VERIFY_BASE) | PASS | STATUS |
| G12 | Independent fresh-helper reviews: security of every Tier 3 commit (wallet/signing, CSP, egress, privacy); design critique of after captures in 3 themes; test audit for weakened assertions; one fix round each | Three reports + fix commits | docs/verification/af/ |
| G13 | CI green on the final head (Milestone quality incl. the required WebKit job); one re-run only for a known intermittent | Run URL | PR |
| F1 | Final commit: STATUS entry "Session AF — Wealth, unlocked" with parts/commits, the ledger (done/not done + why), evidence labels, Tier 3 in plain words per commit, tests/assertions changed, weights + budget lines, CI, owner items (account checklist, real signing checks testnet→mainnet, what waits), and the deferred list (ZIGi real-model round + end-of-month API eval after 25 Oct before 31 Oct; landing upgrade + www redirect; Customize editor + Inter; native apps (Beta); PR-review Action; friends pack/Help refresh; Guide phase 2; Studio-4 ZIGi art; pre-launch security run; market policy renewal + DMARC (28 Oct); acceptance redeploy (private-sync /v1/extras first) → push + relay activation → Stage 8 → friends Alpha (early November)) | Entry on top of STATUS | STATUS |
| F2 | PR out of Draft, never merged, never deployed | PR state | PR |
| F3 | Short report: truly done vs remaining; the account steps; preview steps (Earn hub, a practice stake, the Checklist, ZIGi's new features, the three extras on Mac and iPhone after the deploy) | Final message | — |


### Amendment 2 — Add money is multi-asset (A2.x, owner 2026-10-18)

| # | Request | Part | Acceptance | Proof |
|---|---|---|---|---|
| A2.1 | Assets: USDC, USDT, ETH, SOL, BTC and ATOM (plus any other top asset both providers support well), each to the person's own address on its native network (EVM from MetaMask/Rabby/Coinbase etc. on Ethereum and the cheap L2s the provider supports; Solana from Phantom; BTC typed or from the watch list; `cosmos1` from Keplr); never a ZIGoals address | 4 | `lib/onramps/assets.ts` table lists each asset × network × provider code; no ZIGoals address exists anywhere | unit `onramp-assets.test.ts` |
| A2.2 | Sheet step 1 "What do you want to buy?": popular-asset tiles with plain words ("USDC: a digital dollar, stays ~1 USD", ETH, SOL, BTC, "ZIG via ATOM") | 4 | Tiles render with the plain-words line and a "What's this?" tap | `add-money.spec.ts` |
| A2.3 | Step 2 "Which network?": a recommended cheap network per asset with the fee difference explained and a big "your wallet must be on this network" warning | 4 | Recommended network preselected; warning visible before hand-off | `add-money.spec.ts` |
| A2.4 | Step 3: the address pre-filled from the matching linked wallet, or "link a wallet for this network first" | 4 | Address chosen only from linked wallets of the matching network; otherwise the link-first state | `add-money.spec.ts` + unit |
| A2.5 | Step 4: provider choice (Ramp / Banxa) with live supported assets, minimums and fees from Ramp's public assets API (Banxa: shown on Banxa's page) | 4 | Ramp figures with source + "as of" from the server route; Banxa says "shown on Banxa's page" | route unit test + spec |
| A2.6 | Step 5: hand-off in a new tab with the provider's public parameters (Ramp hosted mode `swapAsset`/`defaultAsset` + `userAddress`; Banxa `coinType` + `blockchain` + `walletAddress`), each code verified in Part 0 | 4 | URL builders per asset/network/provider; codes recorded with their source | unit `onramp-urls.test.ts` (sandbox hosts, never submitted) |
| A2.7 | Step 6: return to ZIGoals with "what happens next" and a balance watch on that address so the funds appear in Wealth/Portfolio | 3, 4 | Return page reads the chosen address's balance through the Part 3 readers until the asset arrives | `add-money.spec.ts` with fixtures |
| A2.8 | "What can I do with it now?" per asset as guided steps: hold stablecoins (plain words on what a stablecoin is and its risks: issuer, depeg, network); swap on OroSwap (ZIGChain assets) or a well-known DEX for other chains (verified links only); bridge to ZIGChain (tonight's real routes for USDC/USDT/ETH/ATOM: Skip Go, IBC, the Hub bridge, Axelar — the recommended one with steps, time and fees; thin or wound-down routes such as Noble USDC said plainly); then "earn with it" | 1, 4 | One guide per asset; every link from the registry; route facts sourced in `docs/earn/af/ROUTES_ONTO_ZIGCHAIN.md` | spec + copy audit |
| A2.9 | Every route is a guided link-out with ZIGoals' step panel + balance watch; ZIGoals never touches the payment or the funds; all public IDs from `apps/web/config/public-integrations.json` | 4 | No payment code; one config file | guard test + scan |
| A2.10 | Tests: URL builders per asset/network/provider with sandbox hosts (never submitted); a network-mismatch guard (no EVM address offered for a Solana purchase, etc.); unit tests for the asset/network table | 4 | All three test files exist and pass | `pnpm test` |

### Amendment 3 — every way to earn, in depth (A3.x, owner 2026-10-18)

| # | Request | Part | Acceptance | Proof |
|---|---|---|---|---|
| A3.1 | Every R2 earning possibility gets its own big, fully designed section: plain words, illustrated step-by-step, live numbers (on-chain or labelled DefiLlama) with "as of", fees, lockups, risks, custody, a guide-mode link-out — not a one-line mention | 1 | One section component per option with all eight parts | `earn-hub.spec.ts` per section |
| A3.2 | Native validator staking (in-app) | 1, 2 | Section + in-app flow | specs |
| A3.3 | Valdora stZIG liquid staking | 1 | Section with live `protocol_info`/rate (two-source rule) | spec |
| A3.4 | The Valdora USDC vaults (Stablecoin Yield, Private Credit, Core Income) | 1 | One section (or three cards) with live AUM/share price | spec |
| A3.5 | OroSwap swaps AND liquidity pools (and farms the moment incentives are active) | 1 | Section with pools, fee tiers; farms appear when `active_pools` is non-empty | spec with both fixtures |
| A3.6 | Nawa Finance vaults (with the clear Zignaly-dependency note) | 1 | Section + note | spec |
| A3.7 | DeFa by InvoiceMate (what it is, who can access it) | 1 | Section | spec |
| A3.8 | Permapod (status after the exploit, so people understand why it is not an option today) | 1 | Section in neutral words with source and date | spec + wording check |
| A3.9 | Governance participation | 1, 6 | Section linking the governance page | spec |
| A3.10 | Goal Vaults | 1, 6 | Section linking the Goal Vault flow | spec |
| A3.11 | An "Earn with stablecoins" section: how someone holding USDC/USDT brings it onto ZIGChain and uses it (vaults, pools), step by step, with honest risks | 1 | Section with the recommended route and risks | spec |
| A3.12 | Part 0 re-check for any earning option launched since Phase R (ZIG Markets products, new vaults, new DEXs, any copy-trading/strategy product on ZIGChain), added the same way | 0, 1 | `docs/earn/af/RECHECK_2026-10-19.md` | doc |
| A3.13 | "Copy trading" explained in depth in the Academy (what it is, custody, the Zignaly closure as the example), shown as a live option the moment a non-closing one exists on ZIGChain; Zignaly stays "closing — how to withdraw by 1 December" | 1 | Academy lesson + Zignaly section | spec |
| A3.14 | The Today EARN card may name "stake, earn and swap" | 1 | Copy | spec |
