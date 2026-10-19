# Session AF — design critique, round 1 (crit1)

Mon 19 Oct 2026, 13:05–13:40 Brussels. Three fresh, read-only reviewers (no repository writes, no browser of their own)
looked at captures of the new and changed pages from a local production build of `70f76578` (Chromium headless,
`PUBLIC_ALPHA_UNDEPLOYED`, the Showcase, fixed clock Fri 16 Oct 2026 09:30 UTC, every `/api` answer 503 except a second Earn
set served from the recorded Earn answers). Themes Nebula, Light and Dark; widths 1440 and 390 px. Decisions: ADR-028 H125.

Evidence label: design review of screenshots (not a usability test, not a device). The captures stay outside the
repository (`$SP/captures/crit1`); the review branch `review/session-af-screens` gets the Gate C set.

## Coverage limits, said plainly
- The first slicing cut the page tops wrongly (a centred crop) and kept each last slice whole; the slicer was fixed and the
  reviewers re-read the tops (`crit1-sliced2`). The Today and money reviewers judged the page tops from the earlier full
  images at reduced scale.
- Chrome's full-page capture stops at 16,384 px. Earn's lower sections (the rest of Governance, Goal Vaults, Stablecoins,
  Validators, Academy, Calculator, Safety; on a phone from Nawa on) were not reviewed in this round. Gate C's round
  captures them in clips.
- The For you cards fold behind "Show more" in these captures, so the Today Checklist card, the Earn card, the Stories door
  and My universe's Today card were not judged here.

## Findings and what happened to them

| Area | Finding (severity as reported) | Outcome |
|---|---|---|
| Checklist | Timer glyphs rotated 90° and enlarged to the ring (high) | Fixed: the ring rule targets the ring only |
| Checklist | An empty first screen with three zeros (high, the reviewer's call) | Fixed: a faint empty-path picture; the Showcase stars a short path |
| Checklist | Three timers in a four-column phone row (medium) | Fixed |
| Checklist | Four names for one page (medium) | Eyebrow now "Checklist · <day>"; the title "Your orbit" stays (L3's design, specs) |
| Checklist | Dark navy timer tiles in Light (medium) | Kept: the timers are a theme island by L3's design (P7.18) |
| Light | Gradient words' tails 1.3–2.4:1 on white (high, all three reviewers) | Kept as H111 records (the owner's "the flow to the right stays"; AE's deeper day stops were removed by the owner's Light redo and a guard test keeps them out). Owner item |
| Light | Earn's logo discs washed to near-white (high) | Fixed: theme islands |
| Light | Gold chips and figure cards matte on Earn (medium) | Not changed in this round (the generator's ink twins, H111); Gate C's parity and audit look again |
| Today | Market watch breaks words at 1440 (high) | Not changed: Today's accepted baseline; pre-existing (recorded for the owner) |
| Today | Repeated figures across cards (medium) | Not changed: pre-existing Showcase widget choice on the protected Today |
| Today | "Your day" twice | Fixed: the timeline card says "Day timeline" |
| Today | New For you cards hidden behind "Show more" on a computer (medium) | Kept: H104's folding rule |
| Timeline | "Done" as both a status and an action (medium) | Fixed: the action reads "Complete" as on Today |
| Timeline | Done items placed after "Now" (medium) | Kept: blocks sit at their planned time (H76); a later option |
| Timeline / Stories | No back link on a phone (medium) | Fixed: title and "‹ Today" |
| Stories | Covers are plain panels (medium) | Not in this round (a later polish) |
| Shell | The four right-edge launchers cover content edges on a computer (high/low) | Kept: AE's floating pattern; H12 keeps the order and compacts |
| Staking | The Alpha label "practice money (no real value)" beside a real-network choice (high) | Fixed: H124, `TIER 3 (public-safety labels)` |
| Staking | Lede and sources note say nothing moves (high) | Fixed with H124 |
| Staking | Network words at 15 px (high) | Fixed: 18/16 px |
| Staking | Network only as a chain id; the Showcase panel shows no network (high) | Not in this round: Staking's existing positions layout; the Showcase signs nothing |
| Governance | Choices stacked and unequal; practice and real chips alike; the banner looks like a third option (medium) | Fixed |
| Add money | Tiles do not look choosable; no "what follows" (medium) | Fixed: "Choose one …" and a ring per tile |
| Earn | Section titles at 20 px (high) | Fixed |
| Earn | Index hides six chips from a mouse (high) | Fixed: two rows with a fine pointer |
| Earn | Validators down read as "not in the shape ZIGoals checks for" (high) | Fixed: "did not answer" (unit cases) |
| Earn | Labels at 12–13 px (high) | Fixed: 14 px |
| Earn | Disclosures without a marker (medium) | Fixed: chevrons |
| Earn | "locked for unavailable" (medium) | Fixed |
| Earn | Valdora's date style (low) | Fixed |
| Earn | "%" split from its number (medium) | Kept this round: ZIGi's golden answers quote the strings; units keep together |
| Earn | Long sections on a phone (medium) | Not in this round (a later polish) |
| Earn | "Jump to your next step" parks over the first band (medium) | To check on the Gate C captures |

Commits: `c1a273c3` (pre-fill re-read), `eec7c6e3` (CI’s WebKit findings), `546bbd24` (H124 labels), `5fdad4ac` (the crit1 fixes). The full Chromium
suite runs on the result before the next push of fixes.
