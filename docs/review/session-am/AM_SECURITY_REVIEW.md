# Session AM — security review

- **Reviewed:** `c65882f3..3af3959a` (branch `feature/session-am-nova`). The review started on `ac1984cf`; three commits landed while it ran and the findings below are stated against `3af3959a`. Line numbers are that commit's.
- **Read first:** ADR-038 (O1–O5, A1–A8, D1–D34), `SECURITY.md`, `docs/security/THREAT_MODEL.md`.
- **Method:** line-by-line reading of the four areas in the brief, with nine throwaway vitest proofs (not in the repository): `/tmp/claude-0/-home-user-ZIGoals/d6c11e74-8a00-51b0-b796-7af61a82b3aa/scratchpad/sec/am-proofs.test.ts` and `before-fix.test.ts`, all passing. Fictional values only.
- **Not done:** no build, no browser run. A finding that depends on what a browser draws says "not run in a browser". This is a review, not an audit.

## Summary

| Id | Severity | Finding | Where |
|---|---|---|---|
| AM-S1 | Medium | A connected model's `pin` lifts a made widget's locked state and changes the synced arrangement, without Undo | `components/nova/stage/use-stage.ts:133,142` |
| AM-S2 | Medium | Made widgets read under a coarser gate than NOVA's on-device answers: Notes, Journal and Today permissions are not honoured | `lib/nova/widgets/catalog.ts:52,70`, `components/nova/chat/nova-chat.tsx:153` |
| AM-S3 | Medium | The weather record is written back from a stale copy: a switch turned off during a request is on again | `components/nova/widgets/use-weather.ts:37-40`, `lib/nova/world/ask.ts:29,32` |
| AM-S4 | Medium | In the Showcase on a phone a weather question asks MET Norway, although the page says no service is ever asked | `components/nova/stage/use-summoner.ts:70`, `lib/nova/world/ask.ts:22-39` |
| AM-S5 | Medium | Request words that describe health travel under the account's consent, not the Health consent, and survive a Health deletion | `lib/vault/extras-sections.ts:65`, `workers/private-sync/extras.mjs:23` |
| AM-S6 | Low | A `stage_widget` call the tool registry refused is applied all the same (also on a phone and with refused arguments) | `components/nova/stage/use-summoner.ts:104-110`, `lib/nova/summon/summon.ts:181` |
| AM-S7 | Low | Up to three model `close` commands per reply, one Undo | `components/nova/stage/use-stage.ts:95-102`, `lib/primitives/toast-queue.ts:9` |
| AM-S8 | Low | Request words outlive "Don't keep this chat" pressed later, and a deleted conversation | `components/ai/use-chat-session.ts:643-652`, `components/nova/stage/use-stage.ts:72` |
| AM-S9 | Low | A restore or an encrypted backup turns the outside-data switch on on another device | `lib/restore/plan.ts:242`, `lib/nova/world/record.ts:39` |
| AM-S10 | Low | Weather manners that do not hold in every case: a place with more decimals ignores `Expires`; no guard across tabs; no size cap, timeout or redirect rule | `lib/nova/world/record.ts:20,52`, `lib/nova/world/met.ts:250-262` |
| AM-S11 | Low | A second device sets this device's gentle cards, "keep" and stage through the `nova` section; unknown fields are stored as sent | `lib/vault/extras-sync.ts:173-175`, `lib/nova/stage/record.ts:55-67` |
| AM-S12 | Info | On a phone the made widgets' gates are only fresh while the conversation is open | `components/nova/chat/nova-chat.tsx:150-154` |
| AM-S13 | Info | Three sentences of the privacy text are narrower than the code | `docs/PRIVACY.md` (Session AM entry) |

**Closed while the review ran (verified):** three issues present at `ac1984cf` are closed by `3af3959a` (`unsafeWords`, `lib/nova/summon/summon.ts:32,129`; `use-summoner.ts:52,86`). They are listed at the end so the fix has a second pair of eyes.

No Critical or High finding. Nothing in the diff touches auth, keys, the wallet or signing (confirmed, section 4 of "Checked and found sound").

---

## Findings

### AM-S1 — Medium — A model's `pin` lifts the locked state and changes the synced arrangement
**Where:** `components/nova/stage/use-stage.ts:133` (`case 'pin': … if (!onStage(c.id)) make([{id: c.id}]); pin(c.id)`), `:142` (`if (w.pinned || !gate) return true;`), `:108` (pin has no Undo); `lib/ai/tools/nova-stage.ts:24` (`'pin'` is a model action).

**Scenario.** NOVA's Health permission is off (the default), or a page-data switch is closed. A note, journal entry, calendar import or an earlier reply carries text that steers the person's model; or the model is hostile. On any ordinary question the model calls `stage_widget {action:"pin", widget:"weight"}` (or `health-hud`, `net-worth`, `wealth-hud`, `sleep`).
1. The reply arrives; `stageCalls` returns `{kind:'pin', id:'weight'}`; `bridge.command` runs it.
2. `command` makes the widget if it is not on the stage and pins it into `zigoals:nova:v1`.
3. `gateOpen` returns `true` for every pinned widget, so the body is drawn with the person's figures instead of the locked notice.
4. `widgets` is one of the two fields of `zigoals:nova:v1` that sync (`lib/vault/extras-nova.ts:15`), so the pinned widget also appears on the person's other devices.

**Impact.** D5 and D25 promise that a widget NOVA makes for a closed switch is locked, and that only "a widget the person pinned themselves" keeps the earlier behaviour. Here the model pins. Health or Wealth figures the person closed for NOVA are put on a stage that is meant to stay open all day, in its own window and during screen sharing. Nothing is sent to the model (the widget reads on the device). There is no Undo toast for a pin; the person can unpin by hand.

**Evidence.** The three quoted lines. The proof test shows a `pin` command comes out of `stageCalls` for any catalogue widget (`AM-S5` test, last assertion).

**Smallest fix.** A model's `pin` is refused unless that widget's gate is open. The least code: do not let `stageCalls` return `pin` for a widget whose gate is not open (pass the stage's gates in through `SummonContext`). Add the case to `lib/ai/tools/nova-stage.test.ts`.

### AM-S2 — Medium — Made widgets do not honour NOVA's Notes, Journal and Today permissions
**Where:** `lib/nova/widgets/catalog.ts:52` (`notes … gate: 'today'`), `:70` (`journal … gate: 'today'`); `components/nova/chat/nova-chat.tsx:153` (`today: env.areas.today`); `lib/ai/context-pack/nova.ts:85` (`today: env.areas.today && (open('today') || open('notes') || open('journal'))`).

**Scenario.** NOVA → Permissions has eight scopes; Notes and Journal are off by default (`DEFAULT_NOVA_SCOPES`, `nova.ts:28`). The stage has five gates, and `today` is true when *any* of Today, Notes or Journal is open.
- Default permissions (Today on, Notes off, Journal off): "show my notes" or a model's `stage_widget show notes` makes the Notes widget, which draws the titles of the two newest inbox notes (`components/nova/widgets/notes.tsx:17`). The Journal widget draws the month of days written and the streak. NOVA's on-device answer for the same question refuses (the `journal` source is `null`, the `search_notes` tool is closed).
- Today off, Journal on: every Today-gated made widget (tasks, agenda, next three, day at a glance, checklist orbit, focus, briefs) reads as open, although the on-device answers are limited to the journal tool (`todayTools`).

**Impact.** D5: "A widget made by a request reads under the same switches as NOVA's on-device answers … NOVA → Permissions". It does not for these two permissions. Data stays on the screen; the person's stated choice is not kept, and a model can cause it (see AM-S1 for why that matters).

**Evidence (proof run).** With the default scopes: `env.journal === null`, `env.areas.today === true`, `widgetSpec('journal').gate === 'today'`, `widgetSpec('notes').gate === 'today'`; with Today off and Journal on: `env.areas.today === true`, `todayTools = ['journal']`, `widgetSpec('tasks').gate === 'today'`.

**Smallest fix.** Add `notes` and `journal` to `WidgetGate`; set them on those two catalogue rows; in `nova-chat.tsx:153` compute `today` from NOVA's Today scope and the Today page-data switch (not `env.areas.today`), `notes` from the Notes scope, `journal` from `env.journal !== null`. Add the two rows to `GATE_WORDS` in `stage-parts.tsx:52`.

### AM-S3 — Medium — A weather switch turned off during a request is turned on again
**Where:** `components/nova/widgets/use-weather.ts:37-40` (`update(() => next)`, `update(() => e.world!)`), `lib/nova/world/ask.ts:29,32` (the same on a phone), `lib/nova/world/met.ts:248,282` (the returned record is built from the `world` the request started with).

**Scenario.** Weather is on and a request to api.met.no is in flight (no timeout is set, so on a poor network this can be many seconds). The person opens Permissions and turns "Weather (outside data)" off, or presses "Remove my place", or picks another city. The request then settles and the handler replaces the whole record with a copy taken before the tap: `on: true` and the old place are back. This also happens when the request fails (`e.world` is the same stale copy with `askedAt`). The handlers run after the widget unmounted too.

**Impact.** The owner's rule is "outside data only after the person's own switch". After this race the record says on without the person, and the next weather widget or weather question sends the place and the network address to MET Norway. The same race restores a removed place.

A second effect of the same code: `inFlight` (`use-weather.ts:21`) is one promise for the whole page, not per storage scope. If the account changes (or the Showcase opens) while a request is in flight and the new scope also wants weather, the new scope's hook attaches to the old request and writes the old scope's record (place included) into the new scope. Narrow, not run in a browser.

**Evidence (proof run).** `weatherAnswer` with a fetch double that clears the record to `{version: 1}` while the request is open (the person's tap): afterwards the stored record has `on = true`, `place = Brussels`. `use-weather.ts` contains the same write, `update(() => next)`.

**Smallest fix.** Write by merge, never by replace: `update(cur => worldOn(cur) && cur.place?.lat === next.place?.lat && cur.place?.lon === next.place?.lon ? {...cur, reading: next.reading, askedAt: next.askedAt} : cur)` in both callers and for `e.world` (only `askedAt`). Key `inFlight` by the request's URL and scope, and pass an `AbortSignal.timeout(15_000)`.

### AM-S4 — Medium — The Showcase on a phone asks MET Norway
**Where:** `components/nova/stage/use-summoner.ts:68-72` (`weatherAnswer(getAppStorage(), …)`), `lib/nova/world/ask.ts:22-39` (no Showcase check), `components/nova/panels/weather-choice.tsx:36-38` (the switch works in the Showcase; the note says "In the Showcase no service is ever asked").

**Scenario.** A visitor opens the Showcase at a width of 640 px or less, opens NOVA → Permissions, turns the weather switch on and picks a city (the record is written to the Showcase's own storage), then asks "What's the weather?" or taps the Weather one-tap request. On a phone the summon step answers in words through `weatherAnswer`, which reads the Showcase's record, passes `shouldFetch` and calls api.met.no. On a computer the widget path refuses in the Showcase (`use-weather.ts:24,46`); the phone path has no such check.

**Impact.** ADR-038 D24 and the sentence on the screen both say the Showcase asks no service. The visitor's network address and chosen place reach MET Norway from a mode that promises none. It needs the visitor's own switch, so it is not a fetch "before the switch"; it is a false statement at the switch. Not run in a browser.

**Evidence (proof run).** `weatherAnswer(storage, …)` with a record that is on with a place requests `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=50.85&lon=4.35`; `ask.ts` has no reference to the Showcase; `use-summoner.ts` calls it with `getAppStorage()` and no Showcase test.

**Smallest fix.** In `use-summoner.ts` phone branch: `if (isShowcase()) say(text, <the Showcase's example sentence, labelled as an example>)` before `weatherAnswer`; or make `weatherAnswer` take `{showcase}` and return the example words. Add a unit test beside `lib/nova/world/ask.test.ts`.

### AM-S5 — Medium — Health-describing request words travel without the Health consent
**Where:** `lib/vault/extras-sections.ts:65` (`{name: 'nova', consent: 'account', …}`), `workers/private-sync/extras.mjs:23` ("An optional section holds no Health-describing record, so only `health` follows the Health domain's deletions"), `lib/nova/stage/record.ts:45` (`text`, 300 characters of the person's own words), ADR-038 D34.

**Reasoned opinion.** The house rule (THREAT_MODEL, "Health-describing extras leave without consent") is that Health-describing data is sealed and sent only with the Health consent, and that a Health deletion removes it from the Worker. Session AK applied that rule strictly to the Checklist section: `healthItems` and today's tick receipts stay on the device "so nothing Health-describing leaves without the Health consent" (`extras-sections.ts:56-58`). The NOVA section is not consistent with that precedent:
- The widget kinds alone (`weight`, `sleep`) are no more Health-describing than a habit's title. Fine.
- The request words are free text typed or spoken to an agent whose main use includes Health: "I weighed 82.4 this morning, show my weight", "my blood pressure was 150 over 95, show my steps". Those are Health values in the person's own words, kept for 200 requests, synced under the account's consent, restored "outside the Health choice" (`lib/am-device-keys.test.ts`, the restore test), and not removed by a Health deletion.
- D34's comparison with a note or a task title is fair for the encryption (the server reads nothing), but a note is written to be kept; a request to NOVA is a by-product of asking, and the Checklist precedent treated by-products that can name a Health entry as Health-describing.

The data is end-to-end encrypted, so this is a consent-consistency issue, not a disclosure to the server. Since `3af3959a` messages the safety guard answers (distress, careful-mode topics) are no longer recorded, which removes the most sensitive case.

**Recommendation (smallest first).**
1. Do not let the words travel when the request made, or its words match, a Health-gated widget and this tab has no Health consent: in `collectSection` for `zigoals:nova-stage:v1`, send such an ask with its `text` replaced by the widget titles ("Weight · the last 30 days"); the device keeps the words. A dozen lines in a `collect` hook beside `fit`, plus a test.
2. On a Health deletion in the app, forget the asks whose widgets are Health-gated.
3. If the owner keeps D34 as it is: say so in the sentence at "Your choices" (`right-stage.tsx:125`) and in PRIVACY.md ("your request words travel with your account even when Health sync is off"), and correct the Worker comment, which today states something the app does not guarantee.

### AM-S6 — Low — A refused `stage_widget` call is applied
**Where:** `components/nova/stage/use-summoner.ts:104-110`, `lib/nova/summon/summon.ts:181-193`, `components/ai/use-chat-session.ts:268,444` (every tool result, refused or not, is stored on the turn), `components/nova/nova-dashboard.tsx:289` (`command` has no phone check; `make` has one at `:288`).

**Scenario.** The stage reads the reply's stored call list, not the calls that succeeded. A call the registry refused (no stage in the environment: a phone, where `nova-chat.tsx:124` sets none; arguments the strict schema refused) still has `tool: 'stage_widget'` and its arguments on the turn, and `stageCalls` applies it after its own catalogue check. On a phone a model that names `stage_widget` unprompted can therefore pin, hide or close widgets of the synced stage although D29 says a phone has no stage. The `wait.question === question` test (`:103`) keeps tasks handed to ZIGi or Hermes out in practice.

**Impact.** Small: the second validation (`widgetSpec`, `available`, `WIDGET_RANGES`) holds, so nothing outside the catalogue runs. It is a gap between "the tool said no" and "the stage did it".

**Evidence (proof run).** `runTool('stage_widget', {action:'close', widget:'glance'}, envWithoutStage)` → `ok: false, tool: 'stage_widget'`; `stageCalls([{tool, args}]).commands` → `[{kind:'close', id:'glance'}]`. With an extra argument the tool refuses and `stageCalls` returns the pin.

**Smallest fix.** Store `ok` with each stored call (or filter in `finish`: keep `stage_widget` only when `l.result.ok`), and return early in `bridge.command` on a phone as `make` does.

### AM-S7 — Low — Three model closes, one Undo
**Where:** `components/nova/stage/use-stage.ts:95-102,131`, `lib/primitives/toast-queue.ts:9` (`TOAST_CAP = 1`), `lib/nova/summon/summon.ts:190` (three commands per reply).

**Scenario.** A steered model sends `close` for three pinned widgets in one reply. Each close removes the widget from `zigoals:nova:v1` and shows an Undo toast; the newest toast replaces the earlier ones. The last Undo puts back the made list and, only if the *last* closed widget was pinned, the pinned list; if it was not, the first two pinned widgets (their place and size) are gone without an Undo.

**Impact.** Loss of arrangement only (no record of the person's life is touched); recoverable by hand. A4 asks for Undo on what the agent does to the stage.

**Smallest fix.** One Undo per reply: collect the reply's commands, take one `before` snapshot (pinned list and stage record), apply all, show one toast that restores both. Or allow a model one `close` per reply.

### AM-S8 — Low — Requests outlive "Don't keep this chat" and a deleted conversation
**Where:** `components/ai/use-chat-session.ts:643-652` (turning keeping off removes the saved chat, History's index and NOVA's bridge record), `components/nova/stage/use-stage.ts:72,82` (`kept` is read when each request is recorded).

**Scenario.** The person asks three things, then presses "Don't keep this chat" (or later deletes the conversation under Conversations). The chat leaves the device. Its three questions stay in `zigoals:nova-stage:v1` → Requests, the Requests widget, Export everything and the `nova` sync section.

**Impact.** D16 says "A chat that is not kept writes no request"; that holds only for requests asked after the press. A person who uses the control to remove what they just typed still has the words on this device and, with an account, in the cloud copy.

**Smallest fix.** When keeping is turned off, or a NOVA conversation is deleted, forget the asks recorded since that chat's first turn (`forgetAsk` per id; keep the ask ids of the open chat in memory in `useSummoner`). Or say in the banner that the requests list is separate and offer "Forget these requests".

### AM-S9 — Low — A restore or a backup carries the outside-data switch
**Where:** `lib/restore/plan.ts:242`, `lib/nova/world/record.ts:10-11,39` ("never synced (the switch is a choice per device)"), `lib/am-device-keys.test.ts` (the backup test restores `{on: true, place}` onto a fresh device).

**Scenario.** A restore from `everything.json` or the encrypted backup on a new device, or a crafted export file the person is talked into restoring (THREAT_MODEL, "A crafted export file"), writes `on: true` and a place. The next weather widget or question on that device asks MET Norway although nobody turned the switch on there.

**Impact.** One request to a public weather API with the device's network address and the file's coordinates. Low, but it is the one switch the owner singled out.

**Smallest fix.** On restore of `zigoals:nova-world:v1`, drop `on` (keep the place, drop `reading` and `askedAt`), and say "Weather stays off until you turn it on here" in the restore preview.

### AM-S10 — Low — Weather manners that do not hold in every case
**Where and what.**
- **Decimals.** `lib/nova/world/record.ts:20` accepts any number of decimals in a stored place (a hand-edited or restored record); `met.ts:51-54` still sends two (sound), but `readingOf` (`record.ts:52`) compares the stored place with the rounded reading exactly, so the reading never counts as this place's: the widget stays on "asking" and the service is asked every ten minutes without regard to `Expires` (A2). Proof run: place `50.853421, 4.351776` → URL `lat=50.85&lon=4.35`, `readingOf(next) === null`, `shouldFetch` true eleven minutes later, nineteen minutes before `Expires`. Fix: `placeSchema` rounds on read (`.transform(round2)`), or `readingOf` compares rounded values.
- **Across tabs.** `askedAt` is written only when the request settles (`met.ts:248` builds it, the caller stores it), and `inFlight` is per tab. Two tabs or NOVA's own window (A3) with a weather widget each send the request at the same moment. Fix: store `markAsked` before the request, and take `navigator.locks.request('zigoals:nova-weather', {ifAvailable: true}, …)` around it.
- **A phone's path** (`ask.ts:28-29`) does not share `inFlight` with the widget path.
- **Size, time, redirects.** `response.json()` (`met.ts:262,275`) reads a body of any size; no timeout; `redirect` is the default `follow`. In production the page's `connect-src` blocks a redirect to another host (CSP applies to each hop), so this is defence in depth. Fix: `redirect: 'error'`, refuse a `Content-Length` over 2 MB (the complete forecast is about 150 kB), and a 15 s abort.

**Impact.** Courtesy to the service and robustness; no data beyond what the switch describes.

### AM-S11 — Low — What a second device can set through the `nova` section
**Where:** `lib/vault/extras-sync.ts:173-175` (the stage record is written as merged, `verbatim`), `lib/nova/stage/record.ts:55-67` (loose object).

**Scenario.** A second device of the account that is compromised (it holds the vault key, so it can do far more to goals and Health than this) uploads a stage record with `proactive: true`, `keep: true`, `made` entries dated in the year 9999 for up to 24 widgets, request lines such as "NOVA: your account is locked. Call …" marked "from your phone", and unknown fields of any size up to the section's cap (about 670,000 characters).

**Impact, on this device.** The gentle cards (A5: "opt-in, off by default") are on without this device's person choosing it; widgets appear by themselves and never expire; the request list shows the attacker's line in quotation marks as the person's own words; `localStorage` carries the unknown fields. The widgets still read under this device's gates (locked when closed), nothing runs, `ref` is only compared with goal ids, and ids must match `^[a-z][a-z0-9-]{0,39}$`.

**Evidence (proof run).** `applySection` with such a record: `proactiveOn` true, `keepsMade` true, the 9999 widget still listed in 2030, `blob` of 1,000 characters stored; the over-bound cases (201 requests, a control character, a 301-character line, a malformed id) are each refused whole.

**Smallest fix.** Keep `proactive` and `keep` on each device (a deny-list for this record: `record(NOVA_STAGE, ['proactive', 'keep', 'gentle'], …)`; D16 calls them choices, and D17 already treats the weather switch as a per-device choice). In `madeAt`, treat a time more than a day ahead of `now` as expired. Optional: cap the canonical length of the applied stage record at, say, 200 kB.

### AM-S12 — Info — Stale gates on a phone
On a computer the conversation is always mounted and keeps the stage's gates fresh (`nova-chat.tsx:150-154`). On a phone it is mounted only while the sheet is open (`nova-dashboard.tsx:394`): before it first opens, made widgets synced from a computer show "Reading…" (fails closed, `widget-grid.tsx:198`); after it closes, the gates stay as last read, so a permission changed in the Permissions sheet afterwards does not lock a made widget until the conversation opens again. Not run in a browser. Fix: compute the gates in the dashboard (it already reads NOVA's record and the settings) instead of in the chat.

### AM-S13 — Info — Privacy text narrower than the code
1. "only while a weather widget is on NOVA's stage and the page is visible": on a phone a weather *question* asks with no widget (`use-summoner.ts:70`).
2. "It cannot turn weather on, choose the place or fetch anything": correct for the switch and the place; but a model's `weather` lookup or `stage_widget show weather` makes the weather widget (`summon.ts:163`, `TOOL_WIDGET.weather`), which then asks the service if the person's switch is on and the rules allow. Say "it can ask for the weather widget, which follows your switch and the ten-minute rule".
3. The `weather` lookup gives the model the place's name and the reading (`lib/ai/tools/nova-stage.ts:71-72`) with no page-data switch in front of it (`registry.ts:51`); under Guarded or Relaxed that goes to a cloud provider. One sentence in PRIVACY.md.

---

## Closed while the review ran (`3af3959a`), verified

| Was | At `ac1984cf` | Now |
|---|---|---|
| **A secret or a card number in a "show me …" line was kept.** `summon.direct` ran before the engine's `looksSecret` / `cardNumberIn` checks; the line was stored as a chat turn and as a request, and synced. | Proof (`before-fix.test.ts`, the old `summon.ts`): `summonFor('show my spending, my card is 4111 1111 1111 1111')` → `direct: true, widgets: [spending]`; the same for a WIF private key. | `unsafeWords` (`summon.ts:32`) is checked first in `direct`, `note` and `summonFor`; the line goes to the engine, which refuses it before anything is stored. Proof: both lines now make nothing. |
| **Words the safety guard answered (distress) were recorded as a request** and travelled in the `nova` section. | `noteAsk` ran for a reply with no widgets. | `pending` is cleared for unsafe words, so the reply's branch at `use-summoner.ts:103` is skipped. |
| **Careful mode still made widgets.** With a model connected, a careful-mode question ("I have been starving myself … what is my weight") made the Weight widget from the model's lookup. | `summonForTools` / `stageCalls` ran on the reply. | Same change: no pending plan, nothing made. |

Residual, by design: a secret typed in a *later* message of the same conversation is refused by the engine as before; nothing of it reaches the stage.

---

## Checked and found sound

**1. AI / NOVA**
- The safety guard, the secret guard and the card check run before any widget or stage command on every device path — `lib/nova/summon/summon.ts:129`, `components/nova/stage/use-summoner.ts:52,86`.
- The catalogue is closed twice: the tool refuses an unknown or unavailable widget (`lib/ai/tools/nova-stage.ts:47`) and the stage checks again (`lib/nova/summon/summon.ts:185-186`); the range is an enum (`:188`).
- No free text or markup can enter a widget: `stage_widget` has no text argument and a strict schema — `lib/ai/tools/nova-stage.ts:27`.
- There is no tool, action or command for permissions, the outside-data switch, the privacy mode or a page-data switch; `StageCommand` is clear / close / pin / unpin / hide / arrangement only — `lib/nova/summon/summon.ts:19`.
- The answer line is plain text in React, cut to 320 characters, no link, no HTML sink — `components/nova/stage/stage-parts.tsx:90-94`; no `dangerouslySetInnerHTML` anywhere under `components/nova` or `lib/nova` (searched).
- The live region says catalogue titles and counts only — `lib/nova/summon/words.ts:29-33`.
- Flood: at most three shows and three commands per reply (`summon.ts:28,189-190`), 24 made widgets (`lib/nova/stage/record.ts:118`), one widget per kind.
- `stage` is set only on NOVA's own message on a computer — `components/nova/chat/nova-chat.tsx:124`; a task for ZIGi or Hermes uses `taskEnv` (`components/ai/use-chat-session.ts:418`); WebMCP builds its own environment with no stage (`components/ai/agent-tools.tsx:41`); NOVA never passes `hosted`; without `stage` the two tools are not offered and refuse — `lib/ai/tools/registry.ts:51`.
- Made widgets with unknown gates show "Reading…", closed gates the locked notice, a private screen closes all five — `components/nova/widget-grid.tsx:198`, `components/nova/chat/nova-chat.tsx:152-153`; Health needs NOVA's permission and the device's gate (`health: env.areas.health && env.health !== null`).
- Gentle cards: off by default, never before the gates are known, never for a closed gate, made as ordinary (gated) widgets — `components/nova/nova-dashboard.tsx:307`, `lib/nova/stage/proactive.ts:28`.
- A phone projects nothing — `components/nova/nova-dashboard.tsx:288`.
- "Don't keep this chat": no request is recorded while it is on — `components/nova/stage/use-stage.ts:72,82` (for the press-later case see AM-S8).
- A turn the secret guard replaced with its placeholder is not recorded: the stored turn's text no longer equals the pending question — `components/nova/stage/use-summoner.ts:103`.
- Widget parameters: `range` is an enum with a tolerant read, `ref` is plain text of at most 80 characters and is only compared with goal ids and keys; the link is the goal's own — `lib/nova/stage/record.ts:30-33`, `lib/nova/cards/goal-focus.ts:60-62`.
- Selectors built from ids (`[data-widget="…"]`, `[data-nb="…"]`) take ids that match `^[a-z][a-z0-9-]{0,39}$` and are in the catalogue — `lib/nova/store.ts:46`, `components/nova/stage/use-stage.ts:77`.
- Hand-offs to NOVA are module memory of one tab; no address parameter carries words — `lib/nova/bridge.ts:126-130` (only `?chat=<id>`, checked by `CHAT_ID`).
- Left bar: every address is a constant of the app — `lib/nova/go-to.ts:36-`.

**2. Outside data**
- Nothing is fetched while the switch is off, without a place, while hidden, before `Expires`, or within ten minutes of the last ask — `lib/nova/world/met.ts:206-212`; `fetchWeather` itself refuses when off — `:245`.
- The Showcase on a computer asks nothing — `components/nova/widgets/use-weather.ts:24,46` (phone: AM-S4).
- The model's `weather` tool reads the device record only and takes no argument — `lib/ai/tools/nova-stage.ts:53,63-72`, `lib/nova/world/stage-weather.ts:11-20`; no tool or record can change the place (`setPlace` is called only from `weather-choice.tsx:26,50`).
- Coordinates on the wire always have exactly two decimals, range-checked — `lib/nova/world/met.ts:51-54`.
- The answer is validated before it is stored: symbol codes `^[a-z_]+$` up to 48 characters, every number range-checked, 24 hours and 6 days at most, then the record's own schema — `lib/nova/world/met.ts:100,110,138-142,159,280`, `lib/nova/world/record.ts:23-35`; an unknown symbol reads "Weather" — `met.ts:186-192`. No text of the service reaches the screen or a model.
- `Expires` is clamped to between 10 minutes and 24 hours — `lib/nova/world/met.ts:230-233`.
- A failed ask counts for the ten-minute rule — `met.ts:249`, `use-weather.ts:40`.
- Requests are simple GETs without credentials, with an origin-only Referer — `met.ts:250-252`, `lib/nova/world/egress.test.ts`.
- Exactly one new host, on `/app` documents only — `lib/egress-policy.json` (`https://api.met.no`), `lib/public-safety.test.ts`; no geocoder; the city list ships with the app (`weather-choice.tsx:24`).
- External links carry `target="_blank" rel="noreferrer noopener"` — `components/nova/widgets/weather.tsx:61`, `components/nova/panels/weather-choice.tsx:52`.

**3. Sync and stored formats**
- Of `zigoals:nova:v1` only `layout` and `widgets` leave the device (`lib/vault/extras-sync.ts:106`) and only those two are written from another device; the persona, instructions, panels and every other field are kept from this device (`:158-168`). Proof run: a remote record with `persona`, `customInstructions` and `panels` changes none of them here.
- Bounds on apply: the merged record must pass the record's own schema or nothing is written (`extras-sync.ts:164,173-174`): 200 requests, 300 plain characters, no control characters, ids by pattern — `lib/nova/stage/record.ts:26,41-52,57-60`. Proof run: four over-bound records refused whole.
- `zigoals:nova-world:v1` is in no section — `lib/vault/extras-sections.ts:65`, `lib/am-device-keys.test.ts`.
- The Worker's `with`: the first name must be an optional section, at most eight, each once, each by pattern; unknown names are not listed; head keys come from the Worker's own list — `workers/private-sync/extras.mjs:88-90,97`. No section-name injection, no unbounded work.
- The relay passes exactly `with=checklist` or `with=checklist&with=nova` and builds the upstream address from those constants — `lib/server/private-account.ts:128`.
- No plaintext leaves: the `nova` section is sealed like the others (same `sealSection` path); the frozen-Worker fixtures equal `c65882f3` byte for byte (compared).
- Erase: "Erase everything on this device" removes every key starting with `zigoals` and the bases database — `lib/erase-everything.ts:10,30,36`; the account erase removes both new keys (`lib/aa-device-forget.ts:38-39`, `lib/am-device-keys.ts:26`), the plaintext bases (`components/vault-sync-controls.tsx:288`) and, on the Worker, every stored key including the sealed NOVA copy (`workers/private-sync/worker.mjs:191`); "Remove from the cloud" deletes the `nova` section when the service lists it — `lib/vault/extras-sync.ts:292-300`.
- Account storage is namespaced per account, so another account on the same device has its own stage and weather records — `lib/showcase-storage.ts:37`.

**4. Auth, keys, wallet, signing**
- No file under the wallet, staking, signing, session, step-up or rotation code changed; the only server change is the `with` allow-list (`lib/server/private-account.ts:128`); the only Worker change is `extras.mjs`; `theme-boot.js` differs only in the four style-sheet version strings (compared with the versions stripped); the diff adds no Keplr call, no key import and no signing call (searched the added lines).
