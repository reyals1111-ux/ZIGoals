# Next session backlog (Session AL, owner decision 8 Nov)

Ranked by value for a person using ZIGoals. Each item has its AL row (docs/review/session-al/GROK53_LEDGER.md) and why it is
not built in AL. Part 15 built the top 40 web-possible items; these are the rest, plus the rows AL carried.

## Competitor / roadmap items not built in AL
| rank | AL row | item | why it waits |
|---|---|---|---|
| 1 | AL-COMPETITOR-GAP-087 (C-DVG-19) | "Perfect day" view with a backlog of past days | a new Today/Habits surface with its own write paths; past days are reachable through the month grid and each habit's History (L3 fifth pass) |
| 2 | AL-COMPETITOR-GAP-041 (C-TK-33) | Daily snapshot message (net worth / day summary) | needs a channel: email is an outside host and push is off until the owner activates it; in the app it is Today's wealth line with its change since yesterday |
| 3 | AL-COMPETITOR-GAP-088 (C-DVG-20) | Flexible day goal ("4 of 6 counts") | changes the protected Checklist day rule behind the flame, Journey's light and the XP quests — an owner decision first |
| 4 | EARLIER_SCOPE CO4 | P&L row and logging from the week grid's cells (ADR-033 M42 "later") | a new write path in the week grid; needs its own spec set |
| 5 | AL-COMPETITOR-GAP-019 | DeFi positions and any-address P&L | needs new chain/indexer sources and egress review (TIER 3 egress) |
| 6 | AL-COMPETITOR-GAP-013 | An AI copilot that explains a chart | needs a connected model for anything beyond the on-device facts; no real-model runs in AL (AL_SCOPE F) |
| 7 | AL-COMPETITOR-GAP-111 | ZIGi as a companion (personality, check-ins over weeks) | a judgement on ZIGi as a whole for L7 and the owner, not a single gap |
| 8 | EARLIER_SCOPE M2 | Bento layout for the pillar overviews and Today's non-protected area | Today's hero is protected; an owner call first |
| 9 | AL-COMPETITOR-GAP-161 | Multichain portfolio, hardware wallet and multisig | Beta (AL_SCOPE F); wallet signing is out of scope |
| 10 | AL-COMPETITOR-GAP-131 | Chess: built-in opponent / playable board | a chess engine is a product of its own (weight budget, worker) |
| 11 | EARLIER_SCOPE CO6 | Net worth history by source | can only start from the day it is recorded (back-filling would invent data); needs a new stored series (TIER 3 stored format) |
| 12 | AL-COMPETITOR-GAP-159 | Help: screenshots | needs art assets per theme and width; text Help is complete |
| 13 | AL-COMPETITOR-GAP-069 | Calorie-burn estimate | by design: "No calorie expenditure is estimated" (owner) |
| 14 | AL-COMPETITOR-GAP-177 (C-DVG-83), Strides part | Strides import preset | Strides publishes no export column format (as Streaks, already "off" in lib/import/switch/formats.ts) |
| 15 | AL-COMPETITOR-GAP-118, templates part | 150+ goal and habit templates | content work; the wizard now offers "Keep an average" and Habits (P15-B) |
| 16 | AL-COMPETITOR-GAP-049/067/081, push part | "Start your fast" as a notification while the app is closed | waits on push, which the owner keeps off; in the app Today asks after the logged meal (P15-B) |
| 17 | AL-COMPETITOR-GAP-076, photo part | Meal estimate from a photo | needs an on-device model the browser does not have; no fake estimate |
| 18 | AL-COMPETITOR-GAP-108, live part | Live wearable sync | needs an outside host per vendor (TIER 3 egress); file imports are built |

## Rows AL carried to the next session
The full list, with each cause in one line, is in docs/STATUS.md (Session AL final entry, "Carried to next session") and
ADR-037's closing table. Owner decisions waiting are listed there too.

## Where each built item is
docs/review/session-al/PART15_BUILD.md has one line per Part 15 item (40 items: builder A money/chain/platform, builder B
Health/Habits/Today/Goals) with its files and tests.
