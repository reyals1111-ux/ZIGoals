# ADR-020: Session Z-Local, "ZIGi's brain, flawless": session decisions

Status: **In progress** on `feature/session-z-local`, from `main` `12a3ef9c` (Merge #80 and after; Alpha #35), on the
owner's Mac (M1 Max) with the RTX 5090 PC for local models. This record holds the owner's decisions at plan approval
and every decision the session took without asking (the brief: the safest option that keeps every promise). The parallel
lane Z-Cloud (`feature/session-z-cloud`) owns ZIGi's face; the lanes talk through `docs/handoff/Z_LOCAL_TO_CLOUD.md` and
`Z_CLOUD_TO_LOCAL.md`. Evidence: `docs/verification/z-local/`; raw runs on `review/session-z-local-runs`.

## Owner decisions (2026-10-10, plan approval)
- **The brief:** nine parts (the WebKit freeze; the real-Claude round on the owner's test key, ≤ $130; prompt caching
  and the exact cost; spoken English and Dutch; ZIGi can do everything; fix rounds to the targets; Y's eleven open
  findings; the monthly evaluation tool; owner material), three gates, one PR, raw runs on an orphan branch, the
  decisions here as L1…Ln. French is out of scope everywhere.
- **Plan edits (approved with the plan):**
  1. Independent agents where independence matters, one at a time: Gate C's audit; an independent security read of
     every `[TIER 3]` commit and the key handling after Part 5 and at Gate C; optionally a fresh-eyes "talk to ZIGi"
     pass after Part 6 (40 everyday EN/NL tasks through the real UI on Sonnet). No exploratory agents.
  2. The session runs past the weekly reset; nothing is trimmed; a pause resumes exactly where it stopped.
  3. Browser stages with the key: ephemeral contexts only, storage deleted after the stage, the key passed to
     `addInitScript` as an argument from the process environment, the key-sweep covering Playwright's output and
     temp profile paths.
  4. The ledger counts thinking tokens (billed as output), cache writes and reads and the repair round; a 20-case
     Sonnet probe first; above 1.5× the forecast the stage sizes are re-planned (every stage kept, fewer repeats).
  5. The relay sends and counts exactly as the adapter; the rules go to Z-Cloud in the handoff.
  6. Voice settings are this lane's (`lib/ai/settings.ts`): French removed; an old `'fr'` reads as the device default
     with a frozen-reader test; options `en-GB`, `en-US`, `nl-BE`, `nl-NL`; Z-Cloud told.
  7. The WebKit freeze fix first, its own commit, the exact lines announced; the second merger keeps both lanes'
     changes to `proposal-list.tsx`.
  8. Real Safari: "Allow Remote Automation" is not set on this Mac (read, never changed), so the freeze scenario gets
     an owner checklist row instead of a `safaridriver` run.
  9. The spoken corpus is generated after Part 5's inventory, so every new kind and navigation intent has spoken EN
     and NL cases.

## Session decisions
| # | Part | Decision | Why it is the safest option |
|---|---|---|---|
| L1 | order | Part 3's adapter work (caching, effort mapping, usage accounting) lands before Part 2's paid stages; Part 3's own before/after measurement is a separate fixed 50-case slice. | Uncached Sonnet runs alone would cost ~$70 of the $130; the measurement still compares like with like. |
| L2 | 3 | On Claude the app's existing quick/deep choice maps to `output_config.effort`: quick reply `low`, "Think deeper" `high`; thinking is never disabled (Opus 5.5 answers 400 to `disabled`). Provider-wide, never per model. | The app's two modes already exist; no model is tuned, and the cheapest setting is the quick reply's. |
| L3 | 3 | Cache breakpoints: one explicit marker on the stable system prefix (frame, date line, specialist, protocol, examples, label), a second on the page's records when separable from the question's, and the top-level automatic breakpoint for the conversation tail. `buildSystemPrompt` stays byte-identical; `buildSystemParts()` returns the split and a test proves the join equals the old string. | Every other wire's body is unchanged; the Anthropic body gains only cache markers. |
| L4 | 3 | The dated price table carries the published values with their date; where the owner's rates differ (cache reads 0.05× on Sonnet in the brief; the reference says 0.1× on Sonnet and Haiku, 0.05× on Opus 5.5) the ledger shows both. | The ledger must not under-count against a hard stop. |
| L5 | 3 | ADR-014's promise stands: money in the app only from the person's own prices. `estimateCost` feeds the harness, the ledger and the relay; the handoff asks Z-Cloud to show cache reads/writes and to offer "fill in published prices (as of <date>)" into the person's own fields. | No silent built-in price for the person. |
| L6 | 4 | Spoken understanding is device-side and post-parse: the message sent to the model and shown in the chat stays the person's exact words; the normaliser feeds intent, router, local answers, day cue and a new quantity/time cue that fills or corrects a card's numeric field; one model-agnostic prompt sentence about fillers and spoken numbers. | "What your AI sees" stays exactly what the person said. |
| L7 | 4 | French removal is bounded by the byte-identical golden set: a French cue a golden case pins stays; corpus `fr` cases, router/intent/day-cue/prompt French forms, the scorer's French refusal cue and the `fr` test assertions go; EN/NL proven unchanged by the golden 272 at 100 % and a gemma4 corpus run before and after. | The golden set is the owner's immutable bar (ADR-017 D6). |
| L8 | 5 | The two effects only the runner can perform (navigate to a page; open the app's own delete confirmation) are specified for Z-Cloud's `use-proposals.ts`; the brain side is complete here; until the effect lands, Add shows the route to take; if Z-Cloud declines, the table records a deliberate "no". | The runner is Z-Cloud's file; a card that explains is honest. |

## Assertions changed (deliberate, listed)
None yet.

## Rejected options
None yet.

## Consequences
Filled at the end of the session.
