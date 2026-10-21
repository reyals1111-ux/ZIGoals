# Session AF — lane L1c (Earn, third chunk): N1, N5, P1.19, P1.23

Branch `af/earn3`, from `feature/session-af-wealth-unlocked` at `05f339c2` (the helper worktree was created at `main`
`4f924956`; the branch was cut at `05f339c2` before any work). Port 3104 only. Every build and Playwright run went through
`$HOME/zigoals-af/bin/with-lock.sh` + `tmo.sh`; Chromium headless only (`--project=desktop --project=mobile`, 2 workers);
no WebKit, no headed browser, no preview tools. Nothing pushed, nothing merged; no theme sheet committed.

## Done against the brief

### N1 — plain words one tap away
- **One source of definitions:** `apps/web/lib/ai/earn/glossary.ts` (ZIGi's Earn glossary). It already explained 14 of the
  plan's words; the other 14 are added as **page terms** (English only, no patterns): redelegate, rewards / claim, jailed,
  voting power, stZIG's exchange rate, pool depth, swap, copy trading / profit sharing, seed phrase, practice vs real
  network, IBC / bridge, governance proposal, quorum, verified link. Facts from `docs/earn/af` (R2 §1–5, RECHECK A–B,
  ONCHAIN, R5 LB5 and line 201); none carries a number (unit-tested: no digit). The coach's own matching is unchanged:
  `glossaryTerm`'s order list is untouched and page terms have no patterns, so ZIGi answers exactly what it answered before
  (unit-tested). The type now allows `en`/`nl` patterns and the Dutch words to be absent; `glossaryAnswer` falls back to
  English only if a page term is ever added to the coach's order.
- `apps/web/lib/earn/plain-words.ts`: the plan's 22 items (PLAN_APPROVED 11.9) as glossary ids (28 terms) and each tap's
  own question ("What’s a validator?", "What does jailed mean?").
- `apps/web/components/earn/whats-this.tsx` (+ `whats-this.css`): the one component. A native `<button type="button">`
  with `aria-expanded` and `aria-controls`; its answer opens inline right after it (a `<span hidden>` until pressed, with
  `aria-live="polite"`); Enter and Space by keyboard; a 44 × 44 px target, a 14 px label, a 15 px answer; `transition: none`
  and no animation, so it is the same still thing by default, under reduced motion and under Motion Off. The glossary is
  **its own chunk, loaded on the first tap** (no page carries the definitions until asked; a failed load says so in words).
- **Placement:** once per section, where the word first appears, always at the end of that sentence, fact or list item
  (never inside one, so existing text assertions hold). Earn: native staking (12 taps), Valdora (9), USDC vaults (2),
  OroSwap (8), Nawa (1), Zignaly (2), governance (5), Goal Vaults (2), stablecoins (5), validators (4), safety (3), and the
  Start-here guides (get a wallet: seed phrase; practice: practice network; get ZIG: bridge, gas; first stake: unbonding;
  explore: liquid staking, pool, proposal). DeFa and Permapod use none of the list's words. Staking actions: practice
  network and staking under the network banner; the validator choice explains validator, commission and voting power, and
  "jailed" beside the hidden inactive ones; the fee note explains gas; Unstake / Move stake / Claim rewards name unbonding /
  redelegate / rewards. Review screen: the action's word (staking, unbonding, redelegate, rewards, proposal for a vote,
  rewards for the sweep, practice network for a badge), the validator, the network fee, and voting power under a vote's
  "How it counts". Governance: proposal, validator, voting power and practice network in "Why voting matters"; the quorum
  once, in the first proposal whose tally shows it.
- Every word of the plan's list is one tap away on Earn alone (browser-tested), and on Staking/Governance where it appears.

### N5 — risks with their sources
Every earning option's Risks block (`components/earn/risk.tsx`) lists at least five plain-word risks, each followed by
"Source: …": a **verified link** already in the registry whose URL the notes record as checked, or **the on-chain read named
in words** (no link). No new link, no registry edit, nothing invented; the old bare items are kept, now sourced.

| Section | Risks | Sources (notes) |
|---|---|---|
| Native staking | 7: unbonding lock; double-sign slashing; downtime slashing and jailing; commission can rise (rate, max, daily change); concentration; ZIG's price; docs vs chain penalty | staking / slashing params and the validator records read live; OroSwap's ZIG pools on chain; ZIGChain docs link (R2 §1.2, §1.5; plan §5 row 1) |
| Valdora stZIG | 8: contract; single admin key; code replaced before (30 Sep 2026); weeks-long exit, no cancel; fee its pages disagree on; DEX discount; slashing through its ledgers; price | contracts / security / FAQ / economics links; admin and contract history and ledgers on chain (R2 §2, LB6, LB8) |
| USDC vaults | 6: credit; up to 60 days; custody off-chain; reported figures the chain cannot check; USDC.n wind-down; admin | vault page, Circle's notice, security page; vault records on chain (R2 §5.1, RECHECK A) |
| OroSwap | 6: impermanent loss; depth/slippage; contracts; the factory's 2-of-3 owner can pause a pool; price; decoy | OroSwap liquidity docs; pools and factory on chain (R2 §3, LB9; RECHECK B) |
| Nawa | 6: custody via closing Zignaly; credit; USDC.n; single-key admins; eligibility unpublished; withdrawal time unpublished | DefiLlama's Nawa tracker, Zignaly's notice, Circle, Nawa's site; admins and vault contracts on chain (R2 §5.2) |
| DeFa | 5: private; credit; only a counter on chain; its figures disagree; DefiLlama's mispriced-token flag | DeFa's site, Valdora's Private Credit page ("Capital is at risk"), DeFa on DefiLlama; the counter on chain (R2 §5.4, RECHECK) |
| Permapod | 5: exploit, no post-mortem; liquidation; main market moved to a "residual sweeper"; single-key admin; site figures far from DefiLlama's | DefiLlama tracker note, safety page, site; admin on chain (R2 §5.3) |
| Zignaly | 5: final deadline; Private Credit's earlier one; BEP20 only; custody; identity check and 24 h pauses | the closure notice and its collection (R2 LB12, §4) |
| Governance | 5: a vote is public forever; your validator votes for you if you do not; unstaked votes weigh nothing; a short title can hide a large change; quorum, thresholds and the veto burn apply whether you vote or not | the chain's governance records, tally and staking rules, proposal messages (R5 LB5, line 201; ONCHAIN) |
| Goal Vaults | 5: price; claimed rewards not counted back; unbonding; slashing; stZIG carries Valdora's risks | a Goal Vault is a view of a stake, so its stake's own risks (R5 rank 1; R2 §1–2) |
| Stablecoins | 6: a ZIG pool is not stable; vaults may not be repaid; USDC.n wind-down; bridges; fees in ZIG only; the young, small USDC.inj pool | OroSwap docs, vault page, Circle, Skip Go's quoted routes; the chain (RECHECK A–B, ROUTES_ONTO_ZIGCHAIN) |

The notes support five or more for every section, so none is short. One sentence moved: governance's "Voting does not earn
rewards by itself" was a fact without a risk source, so it now sits under Fees (kept, not removed).

### P1.19 — ZIGi in guide mode
The guide panel's **Ask ZIGi about this** (a 44 px button with "Opens ZIGi with this guide named. Nothing is sent until you
press Send.") calls the app's own `askZigi` (`components/ai/ask.ts`, the way "Ask ZIGi about this" works on cards): the
composer gets "Explain this guide, “<title>” on <app>, in plain words: what each step does and what the risks are." and the
Earn coach's figures for the guide's option (`earn_rates`, `{option}`) as a removable chip ("Earn figures · <option>"; on a
chat opened cold ZIGi drops it and shows the page's "Earn figures" chip instead: see open items).
Each guide names its option (`Guide.option`: native-staking, valdora, oroswap, valdora-vaults). It never signs, fills in no
amount and sends nothing; only Send reaches the person's AI. Shown only while the ZIGi launcher is. Escape inside an open
dialog (ZIGi's chat) now belongs to that dialog, so closing the chat leaves the guide open.

### P1.23 — your own position (done, time allowed)
Native staking shows "Your position" (stake and rewards waiting) and Valdora the stZIG held, per linked or connected
wallet, with the relay's block and "as of"; a practice wallet labelled and never counted as money; the relay's own
sentence when it refuses; nothing without a wallet. It reuses the reads the page already makes (`usePositionReads` in
`earn-view.tsx`, passed down): **nothing new is fetched by address** (one `/api/positions` request per wallet,
browser-tested). `lib/earn/your-position.ts` adds them up in base units (stZIG rows that disagree on decimals are said to be
unreadable, never guessed); `OptionSection` gains a `mine` slot under the live numbers.

## Commits (on `af/earn3`, oldest first)
- `e3723a3a` TIER 3 (public-safety labels) — the glossary's 14 page terms, `lib/earn/plain-words.ts`, `WhatsThis`, `Risk`
- `2f6f63b9` Part 1 — P1.19, "Ask ZIGi about this" in guide mode (+ `tests/earn-guide-zigi.spec.ts`)
- `9271252d` TIER 3 (public-safety labels) — N5 risks with sources and N1 taps on Earn; the earn-options risk assertion moved;
  `lib/earn/plain-words.test.ts`
- `8e46513a` TIER 3 (wallet/signing) — N1 taps in the Staking actions and the review screen (behaviour-preserving)
- `44dce9db` N1 on Governance + `tests/earn-plain-words.spec.ts`
- `443e4f91` N5 — `tests/earn-hub.spec.ts` risk counts moved at equal strength
- `0c56d724` Part 1 — P1.23, your own position (+ `lib/earn/your-position.test.ts`, `tests/earn-your-position.spec.ts`)
- `e8f0304e` P1.19 — the spec's chip assertion (see open items)
- (this file) the lane file

## Assertions moved (each at equal or greater strength)
- `tests/earn-options.spec.ts`: per section the risk count was "at least 2"; now **at least 5**, and every risk carries
  `data-risk-source`, a "Source: …" line, only `VERIFIED_URLS` links, and a chain source that names ZIGChain or the chain
  (greater strength).
- `tests/earn-hub.spec.ts` ("a source that fails…"): the native staking risk list's exact count 5 → **7** (still exact: the
  list is longer), and Valdora's exact count **8** added beside it (equal strength, plus one).

## Tests run
- Unit, focused (from the worktree root: `pnpm exec vitest run apps/web/lib/earn apps/web/lib/ai/earn apps/web/lib/staking`):
  **31 files, 301 passed** (new: `lib/earn/plain-words.test.ts` 8, `lib/earn/your-position.test.ts` 4; `coach.test.ts`,
  `links.test.ts`, `staking-guard.test.ts` unchanged and passing).
- Unit, whole repository (`pnpm test`): **5,870 passed, 58 skipped, 1 failed** — `scripts/themes/build-themes.test.mjs`
  (the theme sheets, waiting on the lead's regeneration; expected, not touched).
- Browser, production build (`$HOME/zigoals-af/bin/rebuild.sh <worktree> 3104 …`), Chromium headless, `--project=desktop
  --project=mobile --workers=2`, through `$HOME/zigoals-af/L1c/pw.sh` (= `with-lock.sh tmo.sh 3600 pnpm exec playwright test
  <specs> --project=desktop --project=mobile --workers=2` from `apps/web` with `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3104`):
  - new and moved: earn-plain-words, earn-guide-zigi, earn-your-position, earn-options — **24 passed** (the guide spec's
    first run failed 4 on the option chip, see open items; after `e8f0304e` 4 of 4 passed).
  - affected: earn-hub, earn-guide-mode, earn-path, earn-validators, earn-academy, earn-dock, earn-calculator-link,
    hosted-earn-stage, today-earn-card-af, zigi-earn-coach-af, staking-page, staking-sign, staking-real-confirm,
    staking-errors, staking-tabs, governance, governance-vote, goal-vaults — **106 passed, 5 skipped, 1 failed**: earn-hub's
    "chip index … marks the section on screen" on desktop only, **pre-existing at the base `05f339c2`** and already fixed on
    the feature branch by the lead's `66609d71` (the scroll-spy line vs crit1's 150 px scroll padding plus `.panel`'s 24 px
    scroll margin; measured here: the section lands at 174 px, the line is at 164 px). Nothing in this lane touches the chips.
  - neighbours: a11y-wcag-x, phone-touch-targets, hydration-zone, rewards-sweep, positions-layout, phone-pages,
    honesty-banners, page-marks — **69 passed, 5 skipped**.
- `pnpm typecheck` clean; `pnpm lint` 0 errors (the 19 baseline warnings).

## What the lead must wire
- **Theme sheets:** regenerate (new `components/earn/whats-this.css`; `components/earn/earn.css` gains `.earn-risk-source`,
  `.earn-guide-ask`, `.earn-mine`). On this branch alone `scripts/themes/build-themes.test.mjs` fails until then (the only
  failing unit test of the whole run; not "fixed" here).
- **Weight budgets:** no change needed. Measured on this build (`node scripts/check-weight-budget.mjs http://127.0.0.1:3104`):
  `/app/earn` 456.0 kB (budget 496.0; L1 chunk 2 measured 448.5), `/app/staking` 447.2 kB (487.0), `/app/governance`
  426.7 kB (468.0), shell 402.2 kB (447.0). The glossary's own chunk (the "What's this?" words) is 20,012 B raw,
  7,860 B gzip, fetched only on the first tap.
- **Nothing else:** no route, no egress or CSP change, no storage key, no navigation, search, Help, What's new, Settings,
  Export, catalog or verifier row. The hosted verifier's stage 9 is unaffected (the taps have no link and no "sign" word;
  "Your position" appears only with a wallet, which the verifier never has).
- **Optional, ZIGi (lane L4's call):** the 14 page terms could join the Earn coach's matching once each has Dutch words and
  patterns; until then the coach answers exactly as before.

## Open items and findings
- **ZIGi drops an "Ask ZIGi" chip on a cold open (outside this lane).** `components/ai/ai-chat.tsx` passes the composer
  `onAbout={connected ? onAbout : undefined}`; when the chat is opened by an ask before the AI settings say "connected",
  the composer takes the pending question (the text arrives) but the `about` chip is dropped. So "Ask ZIGi about this" in a
  guide shows the page's "Earn figures" chip, not the option's own `earn_rates {option}` one, on the first open. The
  question still names the guide and nothing is sent. The same path serves the cards' "Ask ZIGi about this". A fix for
  lane L4 / the lead: keep `onAbout` for the composer whatever `connected` is, or re-apply the last pending `about` when
  `connected` turns true. The spec asserts "Earn figures" (`e8f0304e`) and would accept the option's chip too.
- earn-hub's desktop chip-index test fails at this lane's base and passes after the lead's `66609d71` (above); nothing to do
  here.
- The 14 page terms are English only; ZIGi's coach does not match them (by design, so its answers are unchanged). Adding
  them to the coach needs Dutch words and patterns (lane L4's call).
- Every risk's wording is taken from the notes as read on 18–19 Oct 2026; dated facts say their date ("read 18 Oct 2026",
  "on 30 September 2026", "created 9 Oct 2026"). If a later live check changes one (for example Permapod's site, the
  USDC.inj pool's size), the sentence is the one to update, not the source.
