# Lane L5c — design polish from critique round 2 (Session AF)

Branch `af/polish2` from `feature/session-af-wealth-unlocked` `b7b05b4f`. Port 3104 only; every build, Playwright run and
screenshot through `$HOME/zigoals-af/bin/with-lock.sh` + `tmo.sh`; Chromium headless only (`--project=desktop
--project=mobile`, 2 workers, `TZ=UTC`); no WebKit, no headed browser, no preview tools. Nothing pushed, nothing merged;
no theme sheet committed (regenerated locally for the runs, restored before the last commit). Scratch scripts, probes and
screenshots: `$HOME/zigoals-af/l5c/` (`probe.mjs`, `shots1`–`shots3`, the negative control `zz-l5c-negative.spec.ts`).

## Commits
| Commit | Subject |
|---|---|
| `d05bd0f3` | TIER 3 (public-safety labels): Part 1 — Earn, findings 1–15 |
| `c409aa13` | Part 2 — the path engine, findings 16–18 |
| `6cc22d2e` | Part 3 — Today and Journey, findings 19–22 |
| `955877ee` | Part 4 — the measured proofs (`tests/polish2-af.spec.ts`, `lib/earn/polish2.test.ts`) |
| (this file) | Session AF (L5c) — lane file |

## Per finding: what changed and the proof
Every proof below is in `tests/polish2-af.spec.ts` (both projects) unless named otherwise.

**Earn** (`components/earn/**`)
1. **Titles 24–32 px.** The captures showed option titles at about 20 px; measured here, Earn’s SectionHeading titles were 20.32 px (desktop) / 19 px (phone),
   from the app's `:root .panel :is(.aa-section-heading, …) h2 { clamp(19px, …, 22px) }`. Now
   `:root .earn-page .earn-option > .earn-option-head .earn-option-title > h2` and
   `:root .earn-page .earn-sections > .panel > .aa-section-heading h2` hold `clamp(24px, 2.2vw + 10px, 32px)`: 32 px at
   1440, 24 px at 390 (all 11 options and Start here, validators, Academy, calculator, safety, summary). Proof: every
   one ≥ 24 px.
2. **Taps.** `whats-this.css`: `margin: -14px 0 -14px -6px; padding: 0 6px; vertical-align: baseline` — the button stays
   44 × 44 px but its margin box is 16 px, so no line grows; the start padding is cancelled, so a tap that wraps alone
   starts at the text's edge; two taps side by side keep a 4 px gap; a `.whats-this-row` keeps full height. In risks
   (`risk.tsx`) the tap is a `tap` prop rendered after "Source: …"; "Source:" is glued by U+00A0; the closing stop stays
   with the last link's mark (`.earn-risk-end`: nowrap for the mark and the stop, the link's words still wrap) — a
   probe found a lone "." starting a line on phones (Chrome breaks after the inline-flex mark and ignores a word joiner
   there). Proof: 53 taps, each 44 × 44, no line holding one taller than its line-height (+1.5 px), none indented at a
   line start; every risk's tap after its source; every closing stop on its mark's line (> 30 checked).
3. **Sentence links on phones.** `earn.css`: `:root .earn-page :is(p, li, dd, span, small) > a.text-link` and a verified
   link there are `display: inline` at every width; under `(max-width: 767.98px), (pointer: coarse)` they get
   `padding-block: 15px`. Scoped to `.earn-page`. Proof (phone): every visible Earn link ≥ 44 px tall, per line fragment
   (> 30 links); every sentence link computes `inline`; Stablecoins' "(" and ")" / ":" sit on their link's lines.
4. **#validators.** Native staking step 2 "the list on this page" and its risk "see the list below" are `href="#validators"`
   (also Start here's first-stake step). Proof: hrefs, and a click lands on `#validators`.
5. **OroSwap titles**: "What you’ll see on OroSwap’s page when you swap" / "… when you add to a pool". Proof: both texts.
6. **Circle.** `components/earn/words.ts` `continueSentence` lowers the first letter only for an ordinary word (names and
   multi-capital words keep their case); used for Circle's notice, Valdora's redemption claim and the vault curator line.
   Proof: "but Circle stopped new minting"; unit-tested (`lib/earn/polish2.test.ts`).
7. **Full marks** on "On DefiLlama" (×4), "All of Valdora’s vaults", "All closure articles". Proof: no compact mark in any
   `.earn-option-actions`; each says "verified link · <date>".
8. **Permapod caution** beside its site link: "Read only: do not connect a wallet or sign anything there while it is
   halted." (`[data-caution="permapod"]`, right after the link). Proof: text and order.
9. **Eyebrows** `text-wrap: balance`. Proof: computed `balance` on every option eyebrow.
10. **Decoy denom**: `<wbr>` after each dot, no `break-all` (`overflow-wrap: anywhere` stays only as the last resort);
    the safety tiles sit two by two from 820 px of panel width (container query), so the 42-character address fits.
    Proof: text unchanged, 2 `<wbr>`, not `break-all`, on a computer every break falls after a dot; "azig" on one line.
    **Not fully met on phones:** at 390 px the address alone (≈ 362 px of monospace) is wider than the tile (≈ 290 px), so
    it still wraps once inside the address (after "coin." first); keeping it whole would need a sideways-scrolling code
    box or a font under 14 px — a call for the owner/lead.
11. **"How this is read"** (`how-read.tsx`, the "How this is computed" look): Valdora's rate basis (`reverse_st_zig_price,
    read as 18-decimal ZIG in and 6-decimal stZIG out …`), Nawa's "Read as stZIG with 6 decimals" and its fee number
    (1,000, with Valdora's meaning), DeFa's "Read as dollars with 6 decimals", and `MsgDelegate` / `MsgVote` in the steps
    (native staking, governance, Start here) — each card says one plain sentence. `LiveFigure` gains `how`, steps gain
    `how`. Proof: none of the words on the surface (`innerText`), each one inside a `[data-how-read]`; opening one shows it.
    No existing spec pinned these strings (searched), so none moved.
12. **Live boxes.** Governance: "On the Governance page" + "Earn does not read ZIGChain’s proposals itself, so it has no
    count to show here. Governance reads them live …" with the link. Goal Vaults: "Goals with a linked stake on this
    device" — the count from `zigoals:goal-vaults:v1` (valid links only; "None yet" when none), source "this device’s Goal
    Vault record, read on this device · as of <time>", `data-device-figure` (not `data-live-figure`: the hosted
    verifier's "every source down" stage expects network figures only). Proof: texts, `data-state=ok`, the source line.
13. **Calculator source**: the ok state is `[data-live-figure="calculator"]` with the chain's `SourceLine` (and the
    validator list's for the commission). Proof: "ZIGChain mainnet LCD (official)" and " · as of ".
14. **Validators by name**: sort `name` (A to Z, `localeCompare(…, 'en')`, then operator) by default; "Most voting power",
    "Lowest commission", "Best uptime" kept. Proof: `earn-validators.spec.ts` (moved, below) + unit test of all four orders.
15. **"Academy, complete"** (`lib/earn/academy.ts`). Proof: spec + unit test beside "Start here, complete".

**Path engine** (`components/path/**`)
16. **Jump bubble**: a `.path-jump-track` laid over the stage (absolute, no layout space) holds a zero-height sticky
    `.path-jump-dock`; the bubble hangs from it at the path's start edge. Shown (`data-clear`) only while the next dot is
    off screen and the bubble is whole on screen, inside its path, over no banner, chest, end or open panel (rAF-throttled
    scroll/resize measure); hidden otherwise (`visibility: hidden`: not focusable, not read). Arrow from the next dot's
    side (`data-direction`). Proof: the space below the last orbit equals the stage's own padding (28 px);
    sweeping Start here and the Checklist, every shown bubble is in view, in its path, over no banner/chest, pointing the
    right way, and it does show. (Before, the bubble's own grid row and its gap sat below the last orbit.)
17. **ZIGi's line**: one line (`nowrap`, ellipsis beyond `min(260px, 46cqi)`), from ZIGi's outer edge toward the dot.
    Proof: `nowrap`, one line high, intersects no `.path-label`.
18. **Chests**: unreached = `drop-shadow` + `opacity: .55` (no `saturate(.55) brightness(.75)`). Proof: computed filter.

**Today and Journey**
19. **Universe names**: `UniverseRow` draws one 80 × 84 SVG per planet in a 4-column grid (the names' columns); "· lit" is
    a real element. Proof: each label's centre within 3 px of its planet's, at 1280 and 390 px.
20. **Lit planet**: corona (r + 8, 7 px, 30 %) + halo (r + 4.5, 2.6 px, full) + full-strength body. Proof: attributes.
21. **Checklist card**: a dot row (`.today-checklist-dots`, path order, `--dot` = the item's `PATH_COLOURS` token, done
    filled, next larger); "Next" = `nextStep(normalisePath(checklistPath(record, dots, [])))`. Proof: on a path whose stored
    order (evening item first) differs from its orbits (morning first), the card's "Next" equals the Checklist's
    `[data-next]` label; two dots, two colours; unit test shows the old `summary.next` disagreed on that fixture.
22. **Timeline card**: rail (`::before` gradient), 12 px nodes in pillar colours, the "Now" pill on its gradient line among
    the rows. Proof: rail gradient, node size and colour, one `li[data-now]` with "Now · …" on a gradient.

## Assertions moved (equal or greater strength)
- `tests/earn-validators.spec.ts`: default order now asserted as the whole shown list by name (was the first row by
  power); "Most voting power" still puts the largest first.
- `tests/earn-options.spec.ts`: "Source:" separator `\s` (the no-break space) instead of a literal space; links leaving the
  page in a source must still be verified, a "link" source must still carry one, and in-page links (`#validators`) must
  resolve to a section.
- `lib/earn/plain-words.test.ts`: the exact Risk markup now carries U+00A0; a second exact markup pins the tap after the
  source and the stop kept with the link.
- `tests/checklist.spec.ts` "Jump to next focuses the first waiting dot": the bubble no longer shows at the page's foot
  (below the path), so the test asserts no bubble while Water is on screen, sweeps down the path until the bubble shows
  in view, then still jumps to Water and focuses it (greater strength).

## Tests run (final build of this branch on 127.0.0.1:3104)
Command (from `apps/web`): `TZ=UTC PLAYWRIGHT_BASE_URL=http://127.0.0.1:3104 $HOME/zigoals-af/bin/with-lock.sh
$HOME/zigoals-af/bin/tmo.sh 3600 pnpm exec playwright test <specs…> --project=desktop --project=mobile --workers=2`.
- Earn set: polish2-af, earn-hub, earn-options, earn-plain-words, earn-path, earn-academy, earn-validators,
  earn-guide-mode, earn-guide-zigi, earn-your-position, earn-calculator-link, earn-dock, hosted-earn-stage,
  today-earn-card-af, zigi-earn-coach-af, goal-vaults, governance — **107 passed, 5 skipped** (project skips), 0 failed.
- Path/Today/a11y set: checklist, path-engine, checklist-launcher, checklist-themes, checklist-view-writes-nothing-af,
  checklist-timers, universe-af, timeline-af, today-screens, today-phone-folds, today-v2, today-folds-memory,
  today-scene, today-roles-af, phone-touch-targets, touch-targets, aa-a11y, a11y-wcag-x, staking-page, journey —
  **119 passed, 13 skipped, 2 failed** on the first run (checklist's jump test, moved above); after the move,
  checklist + polish2-af **26 passed**.
- theme-parity-af (with the sheets regenerated locally from this branch's CSS): **55 passed, 1 skipped** (the More
  sheet is the phone's), 0 failed.
- Negative control (old CSS re-applied over this build, not committed): every reachable check failed as it should.
- Unit: `pnpm test` **5,875 passed, 58 skipped, 0 failed** (sheets regenerated locally; with the committed sheets
  `scripts/themes/build-themes.test.mjs` fails until the lead regenerates — expected, not touched), run again after
  the last Risk change with the same counts; new: `lib/earn/polish2.test.ts` 4.
- `pnpm typecheck` clean; `pnpm lint` 0 errors, 19 warnings (the baseline).
- Weight (`node scripts/check-weight-budget.mjs http://127.0.0.1:3104`): every line within budget; `/app/earn` 458.1 kB
  (budget 496.0; L1c 456.0), `/app/checklist` 448.8, `/app/journey` 443.3, `/app/timeline` 428.8, `/app` 531.6, shell 402.2.

## What the lead must wire
- **Theme sheets**: regenerate after the merge (`node scripts/themes/build-themes.mjs`): new colours in `earn.css`
  (`.earn-caution`), `today-checklist.css` (dots), `timeline.css` (rail, nodes, Now pill), `universe.css`, `path.css`.
  `scripts/themes/build-themes.test.mjs` fails on this branch alone until then.
- Nothing else: no route, egress, CSP, storage key, registry, navigation, search, Help, Settings or verifier change.
  The Goal Vaults box reads the existing `zigoals:goal-vaults:v1` record (read only).

## Open items
- Finding 10 on phones (above): the address part of the decoy denom cannot fit a 390 px tile at 14 px monospace.
- On phones the Start-here path is short, so the jump bubble rarely finds a clear place to show (by the rules it
  must follow); on longer paths (the Checklist) it shows.
- `continueSentence` keeps a small list of names; a new dated fact that starts with a new name needs it added.
