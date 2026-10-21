# Session AF Gate C — test audit (G12, review 3 of 3)

Tue 20 Oct 2026, after the design critique's fix round. One fresh, read-only reviewer read the net diff of every test and
check in `origin/main...HEAD` (325 commits then): Playwright specs and helpers, the parity runner, every unit test, the
checks (`check-*`, the frozen readers, the hosted verifier, the parity report, the weight budgets and their guard), the
Playwright and vitest configs and CI; for new files also every in-session `-` line. Each deliberate move named in the lane
files, ADR-028 and the commit messages was judged against the code, not the records.

Evidence label: code review (no test run by the reviewer; the fixes below were run by the lead).

**Verdict:** most moves keep or raise strength; four genuine loosenings and three smaller gaps — all fixed in one round
except one rule kept by the approved plan.

## Findings and what happened to them

| # | Finding | Outcome |
|---|---|---|
| 1 | `checklist-overlay-af`: "ZIGi beside the next planet" loosened on a computer from 12–36 px to 12–104 px from the ring, checked only on opening (CONFIRMED) | Fixed (`ec8f5570`): the distances were measured (landing 78 px at 1280; rests after ticks up to 91 at 1440, 60 at 768, 27 at 390); the landing bound is 86 px on a computer and a nearness bound now holds after every tick and under reduced motion (12–100 / 68 / 36 px) |
| 2 | `earn-dock`: the phone strip 5 → 3 links; the two moved into the chip index were no longer checked visible, on the first screen or 44 px tall (CONFIRMED) | Fixed (`ec8f5570`): the new check showed the index is not on a phone's first screen, so the design round's three-link strip was undone (P5.5): the strip keeps its five links, its original check restored and backed by `toBeInViewport` |
| 3 | `onramp-assets.test`: "more than one guide, Earn last" became "at least one" (CONFIRMED) | Fixed (`c9d97eef`): every asset's guides pinned exactly and in order |
| 4 | Theme parity's `gradient-word` class applied in Dark too (no theme in the classifier) (CONFIRMED) | Fixed (`c9d97eef`): by day only, with a Dark case in the unit test; the full parity spec green with the rule. The 12° hue tolerance stays: the classifier reads rendered sRGB stops, the generator's 2.5° test reads its own OKLCH output |
| 5 | `help-page`: the 44 px exemption for in-sentence links did not limit which links fall into it (PLAUSIBLE) | Fixed (`c9d97eef`, count corrected in `ec8f5570`): pinned to exactly the 37 links it covers today |
| 6 | `valdora/testnet.test`: the scope rule caught only `import`/`from` (CONFIRMED, minor) | Fixed (`c9d97eef`): `require()` and re-exports count |
| 7 | The hosted verifier excuses an aborted RSC/prefetch request at any time, without the navigation window (CONFIRMED) | Kept: the approved plan's A3 rule says exactly this (a prefetch is speculative; its abort is no failure); recorded here |
| 8 | `wallet-guard.test`: a file was split only at `export function`, so a non-exported helper after `executeSigned` would count as its body (PLAUSIBLE) | Fixed (`c9d97eef`): split at every top-level declaration |

## Also judged (no change needed)
Moved at equal or greater strength: the Checklist overlay's other rounds, `brand-nav-polish`, `page-marks`, the Help topics
and phone fold, `wealth.spec` (eight class cards in order), the Alpha label and mode strings everywhere and verifier stage 2,
`earn-options` (≥ 5 sourced risks), `earn-hub` and `polish2-af`, `sign-gate`, the staking guard (SIGNER widened; issuer and
executor exact), `walletconnect` (`cosmos_getAccounts` only), `frozen-fixtures` (14 new keys), the golden sets. Timing or
diagnostics only: theme parity's waits, `send-feedback`, `whats-new` (90 s), `webkit-smoke` (120 s), `server-boundary` and
`execute.test` (20 s), `zigi-chat-polish`, `webkit-earn`, the live check's replay date and its contact-free record. Removed
by product change and covered elsewhere: `positions-relay`'s mainnet refusal (H16), the mainnet explorer builder (reverted),
`staking-preview`'s Valdora figure. No `.skip`, `.fixme` or `.only` was added to a pre-existing spec. CI: no job, step or
test dropped (the checks job 10 → 15 min, the Chrome suite 4 → 5 shards). Guards: the deliberate owner widenings (the
signer file, MsgRevoke, the practice badge's MsgSend, the CSP host lists) are pinned exactly; the new guards are strict.

## Verification
Unit: parity-report 8/8, onramps 7/7, Valdora 53/53, wallet guard 6/6. Chromium on the final build: `checklist-overlay-af`,
`earn-dock`, `help-page` 62 passed, 0 failed; theme parity on every route and state green.
