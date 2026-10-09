# Session Y Part 4: independent security review of ZIGi's lane (ADR-017) and the API-key handling

**When and how:** 2026-10-09. An independent reviewer agent read ZIGi's code on `feature/session-y-cloud` (base `main`
`e30b7c6`, Alpha #34): every surface ADR-017 added or changed, plus how the person's own provider key is handled. It had
not seen this session's work, edited nothing in the repository, logged in nowhere and called no third party (every
`fetch` was mocked). It traced each candidate from a real input to the failure and reproduced it as a unit or jsdom test
outside the repository. This session then fixed or recorded each finding. Evidence labels as in docs/STATUS.md.

**Lane:** no `feature/session-z*` branch existed at the review or at the fixes (`git fetch`, 2026-10-09), so no lane
claimed ZIGi and the medium-and-above findings were fixed here (brief, Part 4). The API-key handling fix (F12) would have
been made here whatever Z claimed (owner edit 5). All of it is announced in `docs/handoff/Y_TO_Z.md`.

## Findings and what was done
| # | Severity | Finding | Done | Evidence |
|---|---|---|---|---|
| F1 | **high** | **Auto-accept ran again every time a reply's card list mounted.** History and back, Customize, Review, Insights, the setup chooser, an older chat opened from History and a reload all mount a turn's cards again, and each mount auto-added the switched-on cards once more (a second water entry, a second check-in). A reply already marked "Replaced" could replay too. After a reload, a card's handle (`h2`) was resolved against the current page's records, so a check-in or an edit could land on a different record. | ZIGi adds a reply's cards only once, when the reply has just arrived in this session: `use-chat-session` marks each new reply fresh and `claimFresh(turnId)` hands that out exactly once (cleared on a new chat, an opened chat, an account change); a list mounted again, or a replaced reply, waits for the person. A turn whose handles are no longer in memory resolves its cards with every handle key made unmatchable (`staleHandles`): a record named by its exact title is still found, one named only as `h2` is refused with the existing "not in this page's context" message. | `lib/ai/auto-accept-once.test.ts` (fails on `e30b7c6`'s code: 4 writes after a remount, writes for History turns, 6 writes under a cap of 2); `lib/ai/actions/plan-current.test.ts` "F1"; existing `tests/zigi-auto-accept.spec.ts` (local) |
| F2 | medium | The daily auto-accept cap was checked against the count read at render. Lists that mounted together (F1's case, or a new reply while another was being added) all saw the same count. | Each write first takes its slot from the stored count (`reserve(kind)`: read the record, check the verdict now, count it), then writes; no slot, no write, and the cap note shows. A write that then fails keeps its slot (the cap is a ceiling, never exceeded). | `lib/ai/auto-accept-once.test.ts` "F2": cap 2, three lists, exactly 2 writes |
| F3 | medium | Edit cards wrote a copy of the record taken when the card was shown. Two edits of one goal or habit in one reply kept only the last ("Add all", auto-accept); a tap after the goal was closed reopened it and dropped a milestone ticked meanwhile; a note or milestone landed on a goal locked or closed meanwhile, and a note dropped text typed meanwhile. `add-goal-note` never refused a closed goal. | `edit-goal`, `edit-habit`, `add-goal-note` and `add-milestone` now build their write from the record as it is when the card is added, changing only the fields they name; the goal is checked again then (present, open, not locked: `writableGoal`); Undo of an edit puts back only the fields it changed, as they were just before. `add-goal-note` refuses a closed goal at plan time, like `edit-goal` and `add-milestone`. | `lib/ai/actions/plan-current.test.ts` (4 of 5 fail on `e30b7c6`'s planner); `lib/ai` suite unchanged and green |
| F4 | medium | Regenerate and Think deeper sent the meal photo and the Health records chosen for the question again after Health stopped being shared with ZIGi (both kept in memory, not checked again); "Send anyway" and the monthly cap's confirm replayed their stored options the same way. | `send` meets the gates of the moment: records chosen for a question are tagged with whether the Health gate was open; with Health no longer shared, a photo and records chosen while it was shared are dropped from any resend. | `lib/ai/resend-gate.test.ts` (fails on `e30b7c6`'s code; the control case still resends both while Health is shared) |
| F5 | low | The emotion-hint marker's regular expression is quadratic on `[[zigi:` followed by many spaces and no closing bracket (20,000 characters ≈ 20 s), and `repairJson` is quadratic (64 KB ≈ 3.8 s). A degenerate reply can freeze the tab. | Recorded for ZIGi's lane (handoff); no data leaves the device. | Reviewer's timing probe |
| F6 | low | Nested markers survive the one-pass strip (`[[zi[[zigi: x]]gi: curious]]` shows as `[[zigi: curious]]`); never read as a hint. | Recorded (handoff). | Reviewer's test H1 |
| F7 | low | "10,000" steps is read as 10 (a thousands separator taken for a decimal comma). | Recorded (handoff). | Reviewer's test C1 |
| F8 | low | A name that matches no title resolves by its first word ("Walk the dog" → Walk) for write kinds. | Recorded (handoff). | Reviewer's test M1 |
| F9 | low | With Health closed, Health widgets, Wealth widgets and diet notes are still auto-accept eligible; `add-link` can plant any https host with any brand icon. | Recorded (handoff); the cards were always shown and undoable. | Reviewer's tests M2, R5 |
| F10 | low | Goal names in the context pack's Summary line skip the cell escaping the tables use. | Recorded (handoff). | Reviewer's test |
| F11 | low | Stop during the repair round drops the first answer; the first answer is sent back with its hint marker. | Recorded (handoff). | Reviewer's test |
| F12 | low (API key) | Disconnect forgot only the connected provider's key and then said "The key was removed from this device"; a key another provider left behind a reset setup record stayed sealed. | Fixed regardless of lane (owner edit 5): Disconnect forgets every key this account remembered on the device (`forgetAiKeys(scope)`), as "Turn off ZIGi" does. | `tests/your-ai.spec.ts` "Disconnect removes every key…" (two sealed keys → 0) |
| F13 | info | The stored `autoAccept` options object is not strict (extra keys survive a parse). | Recorded. | Reviewer's test M3 |
| F14 | info | Equivalent cards (250 mL, "1 glass") are not deduplicated. | Recorded. | Reviewer's test M4 |
| F15 | info | The Alpha gate (H8 option 1) checks `/app` at rest and the scripts present at that moment only. | Recorded with the reviewer's proof plan (a MutationObserver from `addInitScript`, a `securitypolicyviolation` listener, every `/app` route and after opening ZIGi). THREAT_MODEL's stale row corrected. | Reading; URL-normalisation check |
| F16 | info | The stall watchdog covers the body only; a provider that never sends headers waits until Stop. | Recorded. | Reviewer's test W4 |

## API-key handling (owner edit 5: the owner adds a real Anthropic key)
| Where the key could appear | Result | Evidence |
|---|---|---|
| Console and logs | No `console.*` in `lib/ai`, `components/ai`, `components/zigi`, `app/api/zigi` | Code search (reviewer and this session) |
| Chat records (IndexedDB) | Never | `your-ai.spec.ts:409` (OpenAI key); `lib/ai/resend-gate.test.ts` (Anthropic key) |
| localStorage and sessionStorage | Never | `your-ai.spec.ts:71`, `:123`, `:409` |
| Export everything ZIP | Never; the key database is not read | `lib/ai/export.test.ts` (`sk-ant-FAKE-4444`), `your-ai.spec.ts:409` |
| Send feedback's device lines | Browser, system, window, motion, install, zone only | `lib/feedback.test.ts:40` |
| Connection diagnostics | Reads no AI data | Reading |
| Context pack and "What ZIGi knows" | Forbidden-field scan includes `sk-`; secret-shaped notes refused | `lib/ai/context-pack/build.test.ts`, `lib/ai/memory.test.ts:61`, `:169` |
| Error messages shown to the person | A 401 shows fixed text; other provider bodies are scrubbed (Anthropic `api03`, `admin01`, `oat01` shapes) | `lib/ai/errors.test.ts`, reviewer's K2 |
| URLs (query, fragment, history) | Never; header only | `lib/ai/adapters.test.ts:60`, `models.test.ts`, `lib/ai/resend-gate.test.ts` |
| Request bodies | Never | `lib/ai/resend-gate.test.ts` (new: the suite did not assert it for Anthropic before) |
| Anything synced or backed up | The key database is referenced only by `lib/ai/keys.ts`; sync and the protected backup never read it | Reading; export covered above |
| At rest with "Remember on this device" | Sealed with a non-extractable AES-GCM-256 key, bound to the account scope and provider | `lib/ai/keys.test.ts:24–46`, `your-ai.spec.ts:123` |
| Without "Remember", and in the Showcase | Memory only; Showcase refuses to remember | `lib/ai/keys.test.ts:17`, `:44`; `your-ai.spec.ts:71`, `:393` |
| Disconnect | Every key of this account on this device (F12) | `tests/your-ai.spec.ts` (new) |
| Turn off ZIGi; sign-out; account erase | Every key of the account | `your-ai.spec.ts:123`, `lib/ai/keys.test.ts`, `lib/ai/account.test.ts` |
| Destination | Only `https://api.anthropic.com`, in `x-api-key`, `credentials: 'omit'`, no `authorization` header | `lib/ai/adapters.test.ts:56–68`, `models.test.ts:32`, `lib/ai/resend-gate.test.ts` |
| The hosted relay | Off in this build; same origin only; the key is forced to `null` | `lib/ai/hosted.test.ts:41` |

## Checked and found sound (reviewer, 2026-10-09)
- **Whitelist parser:** every kind is a strict object, so unknown kinds and fields are refused; repaired blocks still go through the schema; the limit of 10 holds after composite expansion; `revise` is stripped before validation; plan-time refusals for locked, closed, simulation and project-target goals hold.
- **Auto-accept verdict:** never-list kinds stay refused even when switched on in storage; Health kinds are refused when the gate is closed (fail-closed via the page's consent); an unreadable record means off; `setAutoAcceptKind` refuses never-list kinds.
- **JSON repair and the repair round:** one bounded pass, no recursion; at most one retry per send, never after Stop, never in careful mode; a failed or stalled retry restores the first answer.
- **The 60 s stall watchdog:** a stall throws, the body is cancelled once, a later write is rejected, 30 racing trials never ended as "done", Stop reports aborted, the timer is cleared.
- **Hints:** only the six names are accepted; none maps to a celebration or a knock.
- **Photos:** never stored (the chat keeps only a `{"kind":"photo"}` marker, checked in IndexedDB); the composer drops an attached photo when the gate closes.
- **Prompt injection:** data marks applied; tool results are JSON with escaped text; local answers collapse whitespace, so no fence can form; `/remember` escapes backticks; browser-agent proposals go through the same parser and never auto-accept.
- **Tools and local answers:** read-only (no writes or fetches); the Health gate is enforced and check-ins filled by a Health link are held back.
- **Context pack:** Health needs both the gate and its own box; Health-tagged notes are filtered; the forbidden-field scan exists.
- **Hosted relay client:** off; same origin only; no key, no `authorization` header.

## Left to the owner or Session Z
F5–F11 and F13–F16 are recorded in `docs/handoff/Y_TO_Z.md` for ZIGi's lane; none is reachable without the person's own
AI replying with a degenerate or misleading block, and every card they concern is shown and undoable.
