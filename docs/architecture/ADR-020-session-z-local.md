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
| L4 | 3 | The dated price table (`lib/ai/pricing.ts`) carries the published values with their date, read from platform.claude.com on 2026-10-10: the owner's rates match the page exactly (cache hits 0.05× the input price on Opus 5.5 and Sonnet 5.5 per the page's footnote, 0.1× on Haiku 5.5; writes 1.25×; the Batch API half price; Haiku's second rate card over 100,000 prompt tokens). The API reference skill's "0.1× on Sonnet" note was stale and is not used. | The ledger prices every call at the page's own figures; a hard stop needs the true rate. |
| L5 | 3 | ADR-014's promise stands: money in the app only from the person's own prices. `estimateCost` feeds the harness, the ledger and the relay; the handoff asks Z-Cloud to show cache reads/writes and to offer "fill in published prices (as of <date>)" into the person's own fields. | No silent built-in price for the person. |
| L6 | 4 | Spoken understanding is device-side and post-parse: the message sent to the model and shown in the chat stays the person's exact words; the normaliser feeds intent, router, local answers, day cue and a new quantity/time cue that fills or corrects a card's numeric field; one model-agnostic prompt sentence about fillers and spoken numbers. | "What your AI sees" stays exactly what the person said. |
| L7 | 4 | French removal is bounded by the byte-identical golden set: a French cue a golden case pins stays; corpus `fr` cases, router/intent/day-cue/prompt French forms, the scorer's French refusal cue and the `fr` test assertions go; EN/NL proven unchanged by the golden 272 at 100 % and a gemma4 corpus run before and after. | The golden set is the owner's immutable bar (ADR-017 D6). |
| L9 | 3 | The usage meter's estimate from the person's own prices counts cached prompt tokens (writes and reads) at the person's input price: a ceiling, since a cache hit costs the provider less. The exact figure from the published table is the ledger's and the relay's, never shown in the app by itself (L5). | The meter promises an estimate from the person's prices only; a ceiling never under-states. |
| L10 | 1 | **The WebKit freeze is attacked where it happens.** It never reproduced on the Mac's WebKit on the production build: `zigi-auto-accept.spec.ts:42` 30 of 30 and `:73` 30 of 30 in isolation, 48 of 48 of both under eight concurrent pages, two full ZIGi suites in WebKit clean. CI's one trace (run 38016733216) shows the page answering a DOM snapshot 60 ms after the second reply had been received, then nothing for 37 s, with one request left unfinished: the "thinking" poster the figure asked for the moment the second message began. So a looping regression spec with probes (`tests/webkit-zigi-freeze.spec.ts`: the two scenarios six rounds each; ZIGi's state changes, every image decode and poster load, the model request's start and end, and a heartbeat on the browser's own timers taken before the fake clock installs, all in the console so a retained trace and the test's attachment keep them even when the page no longer answers) runs in CI's WebKit job on Linux, the only place the freeze has occurred, and in Chrome. A fix follows the evidence; a guessed change was rejected. | A fix without a reproduced cause would be a guess; the spec is a regression test either way (every round must end with the reply's card). |
| L11 | 3 | **The before/after caching measurement runs on every multi-turn case the corpus has: 33 cases, 180 turns** (six chats of 11 to 23 turns among them), in corpus order, cache markers off then on, on Sonnet and Opus. The brief's "fixed 50-case multi-turn slice" cannot be met as written because the corpus holds 33 multi-turn cases; padding with single-turn cases would measure no prefix reuse. Measured in two halves: 17 cases (37 turns) first, the 16 others (143 turns, the long chats) after the corpus stages, the ledger permitting (Opus's uncached half is the costly one). A text scan of the corpus had listed 17 cases; the bundled corpus gives 33, and the bundle is the oracle from here on. | The measurement is about reuse across turns; the real conversations are the honest slice, and a count read from the code itself, never from a scan. |
| L12 | 2 | **The probe calibrated the forecast; no re-plan.** Twenty important cases (22 turns) on Claude Sonnet 5.5, cached, quick-reply effort: $0.2313, $0.0105 per turn with tool rounds and the repair round counted, against a forecast of $0.012 (0.88×; owner edit 4's re-plan trigger is 1.5×). Every request after the first on a page read about 12,000 tokens of stable prefix from the cache and wrote only the question's records; the uncached remainder was 4 to 12 tokens. Stage forecasts: Part 3's measurement $8 Sonnet and $15 Opus; the corpus $10 Sonnet, $7 Sonnet important ×2, $2 Haiku ×3, $18 Opus. | The owner's rule: measure before the big stages; the figures are the API's own usage fields at the published prices. |
| L8 | 5 | The two effects only the runner can perform (navigate to a page; open the app's own delete confirmation) are specified for Z-Cloud's `use-proposals.ts`; the brain side is complete here; until the effect lands, Add shows the route to take; if Z-Cloud declines, the table records a deliberate "no". | The runner is Z-Cloud's file; a card that explains is honest. |
| L13 | 5 | **Funding a goal and adding an account are forms, not refusals.** "Fund the Japan goal with 200 euros" gives one `prefill-contribution` card that opens the goal's own Fund form filled in; "add a savings account" one `prefill-account` card for Wealth's add-account form. Both are in `AUTO_ACCEPT_NEVER` and `PREFILL_KINDS`, write nothing, have no Undo, and stash through `lib/ai/actions/form-prefill.ts` (the shape of the balance hand-off). | The owner's rule is "money = pre-filled form only": a form the person saves is allowed, a write is not, and a refusal of a form the app offers would be a lost task. |
| L14 | 5 | **ZIGi's look is a device write the runner performs**, `plan.device = {key: 'zigoals:zigi:v1', patch}` with top-level keys only (`knock` a partial to merge), `undo: null`; the planner takes an optional `env.zigi` (current prefs and the build's skins) and then refuses no-ops and unknown looks. The weekly review's day travels as its English name (`WEEKDAY_NAMES`; Dutch names, short forms and 0–6 read as that name) and is stored as the number. | The brain cannot read device storage or the manifest (`components/zigi/`, Z-Cloud's); a name survives the card editor's select, a number does not. |
| L15 | 4 | **The spoken normaliser is a rewrite into the typed forms the device readers already read**, applied inside the entry points (`detectIntent`, `translateCues`, `localAnswer`, `navigationIntent`, `dayCue`) and never to the words shown or sent: wake words and fillers out; English and Dutch number words, compounds and decimals as digits ("twaalfhonderd" 1200, "twee komma vijf" 2.5, "5,000 steps" 5000, "1,5 liter" 1.5); halves and quarters; clock idioms as H:MM with the Dutch "half acht" = 7:30 and an evening word moving a small hour into the afternoon; a self-correction keeps the last value; ranges stay. A lone "one"/"een" converts only before a unit. The quantity cue fills a log card's missing figure, or replaces a figure that appears nowhere in the message, only when the message names exactly one quantity with a unit the card's kind takes; it rides inside `applyDayCue`, so the app's one call and the harness's one call read both cues. | The person's words stay theirs (L6); every rule is a plain spoken-to-typed equivalence, model-agnostic; the golden 272 stayed at 100 % with the normaliser wired. |
| L16 | 4 | **Whole-Dutch questions stay the model's on the device.** The golden set pins `x-nl-whole` ("Hoeveel stappen heb ik gisteren gezet?") and `x-nl-sleep` as `none`, so Dutch question words and Dutch sleep cues were tried in the device engine and reverted; the spoken golden set tests Dutch device answers only where an English figure word carries them (as today), and Dutch lookups are scored on the models through the spoken corpus. The navigation intent did gain "show me …", "laat … zien" and a trailing "please/alsjeblieft". | The golden 272 are byte-identical and the bar (ADR-017 D6); a device gain that breaks a pinned case is not a gain. |
| L17 | 8 | **The monthly evaluation is the harness's own batch mode** (`ZIGI_BATCH=1`): the corpus's important cases, first turns, attach mode (records in the prompt, no tools, no repair round), one Message Batch request per case at half price, the adapter's own body minus `stream`, scored by the same scorer; the dollar cap lives inside the harness (`ZIGI_MAX_USD`, the forecast refused before anything is submitted) and the driver sums the real spend per model from the run files. The dry run on 40 cases: Haiku 33/40, Sonnet 35/40, $0.16 (cache reads inside the batch were honoured). | One pipeline, one scorer, one price table; a second harness would drift from the first. |
| L18 | 2 | **The photo stage is owed to the owner's plates folder.** The X-Local plates (`real-1-1600.jpg` … and the script-drawn breakfast plate) are not on this Mac (searched the home folder); the UI chain skips the photo stage unless `ZIGI_PHOTOS_DIR` names the folder. Owner item: copy the folder and run the three `ui-photos-*` stages. | The plates were X-Local's and outside the repository by design. |

## Assertions changed (deliberate, listed)
- **Part 5, the corpus's deletion cases (`lib/ai/evals/corpus-phase2.ts`):** `p2-delete-habit`, `p2-delete-goal`, `p2-delete-entry`
  and `p2-delete-weight` expected a refusal; they now expect one `delete-record` card (the owner's rule: a deletion is a
  card that opens the app's own confirmation). `p2-delete-all` and `p2-delete-milestone` stay refusals (never "everything";
  milestones are Goals' own, ADR-017 S22). The golden set is untouched: `delete` still reads as "none" on the device and
  a `delete-habit` block is still an unknown kind (byte-identical, D6).
- **Part 5, `lib/ai/actions/auto-accept.test.ts`:** the never list is asserted as exactly weight, fasting, the four money
  pre-fills (`prefill-holding`, `update-account-balance`, `prefill-contribution`, `prefill-account`), `delete-record`
  and `open-page` (four more than before Part 5, never fewer).
- **Part 4 (L7), the corpus tests:** `LANGS` is `en`/`nl`; the important set covers two languages; Phase 2 holds 248 cases
  (288 before); the typed corpus bar is 590 (636 cases now; 600 before). The bar follows the count the owner's rule took
  out, never a weaker check of the cases that remain.
- **Part 5, the corpus's funding cases:** `p2-money-fund-goal` (`corpus-phase2.ts`, important) expected a refusal and now
  expects one `prefill-contribution` card with amount 300 (L13); `p5-no-fund` became `p5-fund` (a card with amount 200).
  `p2-delete-all`, `p5-delete-everything` and `p5-no-milestone` stay refusals. The golden set's `contribute` case (an
  unknown kind reading as "none" on the device) is untouched: no alias maps `contribute` to the new kind.
- **Part 5, `lib/ai/actions/plan.test.ts` and `edit.test.ts`:** the "every kind" coverage samples gain the eight new kinds
  of the first batch, the eleven Health kinds of the second and the ten of the third (those needing a planned skip, a
  reminder, a closed goal, a diary entry by name, a planned meal, a favourite, an existing counter, a running night, a
  link, a weekday other than the Showcase's or an active goal are covered in `plan-z.test.ts` and listed in the coverage
  set as `stop-fast` already was). The auto-accept test's Health list is
  asserted against the group it renders, not a literal, so the eleven new Health kinds change no assertion there.

## French removal (Part 4, L7): what went, what stayed, the proof
- **Went:** the 50 French corpus cases (8 in `corpus.ts`, 40 in `corpus-phase2.ts`, the French third of 41 three-language
  builders), `Lang` is `'en' | 'nl'`; the French forms in the intent router (log verbs, statements, quantities, number
  words, the clock, plan words, lookup words, vague asks, the refuse list, the decline cue, question starts), the question
  router's French cues and families, the day cue's French day words and weekday names, the prompt's French reminder and
  clock-idiom lines, the money-ask decline verbs; the French assertions in the intent, question, day-cue, decline, score,
  specialists and corpus tests.
- **Stayed (pinned):** the period words of `lib/ai/tools/range.ts` and the local engine's future-range refusal, because
  the golden case `x-fr-week` ("How many steps la semaine dernière?") pins an answer; the careful-mode phrases in
  `safety.ts` (golden `risky-health`); the number-mark reading of "2 350" in the scorer (a parsing rule, not a cue).
- **Proof so far:** the golden 272 at 100 % before and after (both runs today); the full brain suite green (667 tests).
  The gemma4 corpus run before and after is owed: the PC was unreachable (tailnet host unreachable) and gemma4 on the
  Mac's Ollama processes a 10,000-token prompt in 50 s (207 tokens/s), which is 12 hours per run; that run was stopped
  after its first case. When the PC is back, the "before" runs from a worktree at `fe2d64d2` (the last commit with
  French) and the "after" from the branch head, on the same machine, and the EN/NL rows go here.

## Independent security read after Part 5 (owner edit 1, 2026-10-10)
One read-only agent reviewed the key handling (the sweep, the ledger and summariser, the browser helpers and the
Anthropic config, the harness, the adapter, the stage scripts and logs, both branch histories). **No key was found in
any artifact, log, history or profile; the recording-off, env-only and redacted-base rules were met.** Six findings,
each answered in the `TIER 3 (security)` commit that follows this record:
1. (high) The stage scripts pushed the runs branch without the sweep. A local `pre-push` hook (untracked, in the
   repository's `.git/hooks`, shared by its worktrees) now runs the sweep before every push and refuses on a hit;
   `part3-measure.sh` gates its push explicitly; `part2-corpus.sh` is gated the same way when its current run ends
   (a running bash script is never edited in place).
2. (medium) The sweep scanned only the net diff. It now scans `git log -p origin/main..HEAD` and the orphan runs
   branch's whole history (that branch only: the worktree shares main's objects, whose test fixtures hold allowlisted
   fake keys).
3. (medium) Zip members are DEFLATE-compressed, so a key inside a trace would have been invisible. Members are inflated
   now; an unreadable zip is itself a hit. Traces stay off for every real-Claude stage.
4. (medium, latent) The init script that seals the key ran in every frame of every origin. It now returns unless
   `location.origin` is the app's, and the context aborts every request to any host but the app's and the provider's.
5. (medium) A browser profile left behind by a killed run would hold the sealed key as ciphertext. A profile directory
   younger than six hours under the temporary folders is now a hit by itself; the UI stage wrapper removes them.
6. (low) The prefix needle grew from 12 to 24 characters and is also searched in its base64 (three alignments) and
   UTF-16LE forms; every file is scanned whatever its size or name (the 200 MB ceiling is itself a hit).

## Part 7: Session Y's open findings (SECURITY_REVIEW_Y F5–F16), each with a test
| Finding | Fix | Test |
|---|---|---|
| F5 quadratic hint marker and `repairJson` | Markers are found by their opening bracket (`indexOf`) and read with a sticky, fully bounded pattern; the trailing-blank trim goes line by line; `repairJson` refuses bodies over 32,000 characters and walks with sticky scans (no `slice` per comma or word, no copy of the output per character). | `emotion-hint.test.ts` (20,000 spaces under 200 ms), `parse.test.ts` (a 64 KB body refused at once; 4,000 bare keys and 8,000 commas under 300 ms) |
| F6 nested markers | Stripped to a fixed point (at most four passes); only a marker that was whole in the reply can name the hint. | `emotion-hint.test.ts` |
| F7 "10,000" read as 10 | The card editor reads a comma followed by three digits as a thousands separator ("10,000", "10.000,5"); a lone comma stays a decimal comma ("1,5"). The spoken normaliser does the same for messages (L15). | `edit.test.ts` |
| F8 first-word match for writes | A name of several words never resolves by its first word; the stem rule is for one word ("reading" → Read, "walking" → Walk); a title of several words matches whole. | `plan-z.test.ts` |
| F9 Health content behind other kinds; any-host brand icons | The plan carries `healthContent` for a Health-domain widget and a diet note; `autoAcceptVerdict` takes it and gates it like a Health kind (the runner passes `plan.healthContent`, handoff). A brand icon only when the address is that brand's host; any other host gets the host's own suggestion. Wealth widgets are not Health content and stay as they were (the Wealth page's own share switch governs them). | `plan-z.test.ts`, `auto-accept.test.ts` |
| F10 Summary line escaping | Goal names in the context pack's Summary line go through `cell()` like every table cell. | `context-pack/build.test.ts` |
| F11 Stop during the repair round | The round runs in `use-chat-session.ts` (Z-Cloud's); the fix is specified in the handoff: on Stop during the repair, keep the first answer with its hint marker stripped (`stripHint`). | handoff |
| F13 `autoAccept` not strict | The stored options object is `z.object` (unknown keys dropped on read, never refused). | `store/records.test.ts` |
| F14 equivalent cards | `dedupePlans(plans, stores)`: two plans of one kind whose writes are the same change (fresh ids and stamps set aside) are one card, the first kept; `batchable(plans, stores)` applies it. The runner is asked to dedupe at listing time (handoff). | `plan-z.test.ts` |
| F16 no headers timeout | `fetchWithStall` races the request itself against the same 60 s window (and abandons a fetch that ignores its signal); every adapter uses it; the caller's own Stop still wins. | `sse.test.ts` |
F12 and F15 were Y's own (fixed, and an owner item).

## Rejected options
None yet.

## Consequences
Filled at the end of the session.
