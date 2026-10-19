# Session AF — design critique, round 2 (crit2)

Mon 19 Oct 2026, 16:35–16:45 Brussels. Three fresh, read-only reviewers looked at captures of a local production build of
`da6b42dc` (Chromium headless, `PUBLIC_ALPHA_UNDEPLOYED`, the Showcase, fixed clock Fri 16 Oct 2026 09:30 UTC, Earn served
from its recorded answers, Today's "Show more" folds opened). Themes Nebula, Light and Dark; widths 1440 and 390 px. The
capture tool now shoots each page in consecutive viewport-sized clips (`$SP/bin/capture-clips.mjs`), so Chrome's 16,384 px
full-page limit no longer repeats a long page's top: Earn's lower half (Governance to Safety; on a phone Nawa onward) was
reviewed for the first time. Decisions: ADR-028 H129.

Evidence label: design review of screenshots (not a usability test, not a device).

## Round-1 fixes, as the reviewers found them
Confirmed: the Checklist's timer icons and phone row, its name, the Showcase's path, "‹ Today" on the Day timeline and
Stories, the timeline card's label and "Complete", the Staking wording, the Alpha label, every Earn label ≥ 14 px, the
two-row index with a mouse, Earn's disclosure chevrons, the logo discs in Light, five sourced risks per option, the
"What's this?" taps present. Not confirmed (fixed in this round): Earn's section titles still ~20 px; numbers still parting
from their units; the Stories covers' big number shown small (a `.panel p` rule again).

## Findings and what happened to them

| Area | Finding | Outcome |
|---|---|---|
| Stories | Covers' big number at 15 px (`.panel p` won) | Fixed by the lead (`:root` lift) |
| Today | The For you fold read "Hide … Hide ⌃" when open | Fixed by the lead (the hint shows only the chevron when open; the button's name stays "Hide") |
| Checklist | The Showcase never lit the signature: no neon segment, a "0 days" streak, an empty twelve-week history | Fixed by the lead: the glass of water opens the path so the two done habits sit side by side and their line lights; twelve weeks of day counts ending in a six-day streak (rest and partial days included); the Showcase's game record is made again with that history so no celebration opens over the demo (unit-tested) |
| Checklist | "Your last twelve weeks" showed no open control | Fixed by the lead (Show/Hide hint and a turning chevron) |
| Checklist | "8000 steps" unformatted | Fixed by the lead (`formatNumber` in the dot notes) |
| Earn | Numbers parting from their units ("36.4 / million ZIG", "5 / %") | Fixed by the lead: a no-break space between a number and its unit in `lib/earn/format.ts`; every test that matched a plain space now matches any space (`\s`), negative checks included, and ZIGi's golden runner compares text whatever the space |
| Earn | Section titles ~20 px; "What's this?" taps growing their lines; in-sentence links breaking on phones; native staking's "list on this page" unlinked; two OroSwap disclosures with one title; "circle" lower-cased; bare shield marks; Permapod without a caution; lone-word eyebrows; the decoy denom breaking mid-word; developer words on the surface; Governance's and Goal Vaults' empty "Live numbers" boxes; the calculator figure without a source line; the validator list opening on "Most voting power"; the Academy's end chest label | Fixed in helper lane L5c (`af/polish2`, merged `2c30c9dd`; proofs in `tests/polish2-af.spec.ts` and `docs/handoff/af-lanes/L5c.md`); three safety labels in a `TIER 3 (public-safety labels)` commit (the full verified mark on standalone links, Permapod's caution, the decoy denom's line breaks). Kept on phones: at 390 px the decoy denom's 42-character address is wider than its tile, so after breaking at its dots it also breaks once inside the address; an address is not a word and is shown whole (no scroll box, no type under 14 px); on computers the tiles sit two by two and it breaks only after a dot |
| Path engine | "Jump to your next step" over the first banner and its empty band; ZIGi's bubble over the next label; brown chests | Fixed in helper lane L5c (the jump bubble stays hidden over a banner, chest or open panel and away from the page's foot, so on Earn's short path it rarely shows; the Checklist's jump test moved at equal strength: no bubble while the next dot is on screen, then it shows, jumps and focuses) |
| Today / Journey | My universe's names not under their planets; the lit planet not visibly lit; the Checklist card without dots and its "Next" disagreeing with the path; the Day timeline card as a plain list | Fixed in helper lane L5c |
| Earn | Validator cards ~386 px each on a phone; the same source line repeated on every figure | Later polish (recorded) |
| Earn | "updated just now" beside an older "as of" | Kept: the age is when ZIGoals read the figure, the "as of" the chain's own time; in the recorded replay the two drift apart, live they agree |
| Light | Gold rings and card edges faint on white | Kept: H75/H111 (coloured lines keep Nebula's colour by day) |
| Light | Dark navy Checklist banners and timer tiles | Kept: theme islands by L3's design (P7.18) |
| Today | Showcase figures that disagree (water, a finished Read with a paused timer) | Kept: the pre-existing Showcase data (protected Today) |
| Phones | Header art behind titles on Timeline, Stories, Staking | Kept: the app's page-header art pattern (pre-existing) |
| Earn | DeFa's white square logo | Kept: the official asset as published (H39) |

Commits: the lead's `6c4ae382`; the lane's `d05bd0f3`, `c409aa13`, `6cc22d2e`, `955877ee`, `3da8ff9b`, merged as `2c30c9dd` with the theme sheets regenerated after it. Goal Vaults' live box reads this device's own record (`zigoals:goal-vaults:v1`), so it carries `data-device-figure` and stays outside the hosted Earn stage's "no figure when every source is down" check.
