# Session AK security delta review (F10, owner follow-up 1)

Three independent reviewers who did not build the code read `9401dcbb..HEAD` (everything built after the RM12 review,
`SESSION_AK_RM12.md`) on 31 October 2026, read-only, with their own probes (mocked fetchers, no network). Areas: the
calendar export and the agenda, search actions, the recovery-words guard, new numeric planners, Wrapped and On this day
(R1); the ZIGChain read-only work — the token check route, look-alike names, governance summaries and reminders, the
validator chooser, the rewards CSV (R2); stored data, notifications, the supplements log and progress photos, the landing
and ZIGi (R3). The signing code (lib/staking, execute.ts, review-sheet.tsx, lib/governance, lib/chain) is unchanged.

**Result: no High. 1 Medium (fixed). 11 Low: 8 fixed, 3 recorded. 6 Info: 3 fixed, 3 recorded** (a finding two reviewers both reported counts once).

| # | Area | Finding | Severity | Fix |
|---|---|---|---|---|
| R1-F1 / R2-F3 | Agenda, .ics | An unbonding date carried its ZIG amount and the validator's name into the agenda and the calendar file, against the export panel's "titles and days" | Medium | Titles are "Unstaked ZIG becomes usable" (test ZIG on the practice network); a test runs real `unbondingEvents()` through the agenda into the file |
| R1-F2 / R2-I3 / R3-F3 | .ics | Semicolons were not escaped (`'\;'` is `';'` in JavaScript; the test had the same slip) | Low | Escaped; the test's expectation corrected (a wrong assertion, not a weaker one) |
| R1-F3 | .ics | A Showcase file's events had no Example mark (calendar apps ignore the file's name) | Low | Every Showcase event's title starts "Example · " |
| R1-F4 | ZIGi | Recovery words split over two messages passed the transport check | Low | The person's turns are also read together |
| R1-F8 | Feedback | The guard said "it stays on this device" under the feedback email's details | Low | "This would go in your email. Remove it before sending." |
| R2-F1 | Token check | An IBC token with a checked route showed no caution; "uusd" counted as USDC | Low | Every IBC token off the curated list carries a caution; one family rule (scale prefix, then an exact word; "usd" never USDC) |
| R2-F2 | Token check | Greek capitals and other scripts' look-alikes (Lisu, Cherokee, palochka, dotless i, small capitals, Armenian) escaped the folding; some separators hid a family word | Low | Capitals folded by their own shape before lower-casing; those letters mapped; words split on anything not a letter or digit |
| R3-F1 | Notifications | A vote reminder moved to a morning inside quiet hours | Low | A quiet morning moves to the end of quiet hours; a day already past its morning wakes now unless now is quiet |
| R3-F2 / R2-I1 | Notifications | The vote wake's minute (exactly 24 h before the public end) told the push Worker which proposal the device follows | Low | It wakes at the person's morning time on that day, as bills do |
| R2-I2 | Token check | Bidi isolates, the Arabic letter mark, variation selectors and tag characters stayed in a token's own name | Info | Removed with the other invisible characters |
| R2-I5 | Token check | A known IBC token pasted with a lower-case hash was not matched | Info | The hash is upper-cased in the route, the client and the classifier |
| R3-F5 | Habit extras | `monthWeekday` had no count limit in the schema (only in the app's writes and reads) | Info | Declared with the 400-entry limit; entries are still checked where read |

## Recorded (not changed, with reasons)

- **R1-F5 (Low)** Japanese, Chinese and Korean recovery-word lists are not detected (the detector reads lower-case Latin-style
  words). Accepting single CJK characters separated by spaces would flag ordinary CJK text; a reviewed per-language rule is
  owner follow-up work.
- **R1-F6 (Low)** A 12-word grocery or habit list sent to ZIGi is refused as possible recovery words. The refusal is calm,
  loses nothing and can be rephrased; a false negative would send a seed to an AI provider, so the cautious side stays.
  A word-list membership check (BIP39 lists for every language) is owner follow-up work.
- **R1-F7 (Low)** Recovery words saved in a note despite the warning still reach ZIGi inside tool results and the page's
  records. The warning at saving is the control; redacting saved records in transit would also hide ordinary lists. As
  RM12's R3-F10: the person's own saved data is not second-guessed.
- **R1-F9 (Info)** Hiding a 501st memory un-hides the oldest (500 kept).
- **R2-I4 (Info)** A proposal's short summary keeps bare domains and other chains' addresses as plain, unclickable text; the
  full summary is already shown as text.
- **R3-F4 (Info)** Vote reminders have no switch in Settings → Notifications; each is its own opt-in on the proposal
  (ADR-036 Q25).

## Checked and sound (summary)

The .ics file (line breaks neutralised, folding at 75 octets never inside a character, caps, local Blob, no network); search
actions (static `/app` paths, goal ids digits only, nothing written); the recovery-words guard on every send path; the debt
planner (exact bigint, 1,200-month cap, a plan that never clears returns null), savings challenges and experiments (bounded);
Wrapped (numbers off by default and per card, Showcase in its own storage); On this day (hidden ids and the switch honoured);
GET /api/chain/denom (strict ASCII input, 5 allowed LCD paths on fixed hosts, no redirects, 200 kB and 10/20 s caps, chain
id and block height checked, cache key unsplittable, 10 reads a minute per client group, fixed error body, nothing logged);
trace hashes recomputed on both sides; token text only ever React text; governance reminder keys and counts bounded,
notifications generic; validators by stake and name only, jailed never offered; the rewards CSV through the one formula
guard; supplements and every new key in all registries, bounded, never synced (habit extras' optional fields inside the
encrypted section only), Showcase gated; the landing's CSP and headers unchanged, no inline script, motion once and off
under reduced motion, every importer named exists; ZIGi receives none of the new records and Today's prompt equals main's.
