# Session AK security review Z1b: stored data, parsers and the new pillars

Fresh reviewer (did not build the code). Branch `feature/session-ak-number-one` at `fd4b223a`, range `58224a69..HEAD`,
read-only, 1 November 2026. Scope: notes (Markdown ZIP import and export, `[[links]]`, photos in
`zigoals-notes-photos-v1`), tasks and the calendar import (lib/tasks, lib/ics), focus sessions, BUILD list 2
(health-numbers with the lab-sheet scan, cycle, scales, journal-prompts, wrap-up-tasks, focus-rounds, money-photos with
the receipt draft, cash-forecast, spending-map, money-calc, review-cards, the net-worth share card, insight-feedback),
the registries (ak-device-keys, export/everything, export-everything.tsx, restore/plan, erase-everything,
data-health/catalog) and the Showcase data.

Method: code reading against SECURITY.md, docs/PRIVACY.md, docs/security/THREAT_MODEL.md and the earlier AK reviews
(SESSION_AK_RM12.md, SESSION_AK_F10.md); the existing unit tests for every scoped area (250 passed); throwaway timing and
fuzz probes under the session scratchpad (`z1b/*.probe.test.ts`, never committed). No code edits, no build, no browser.

**Result: no High. 3 Medium, 3 Low, 4 Info.**

| ID | Severity | Area | One line |
|---|---|---|---|
| Z1B-1 | Medium | Lab-sheet and receipt photo reads | Both skip the privacy mode: Strict and Guarded do not stop the photo going to a cloud model |
| Z1B-2 | Medium | Restore | NOVA briefs hold Health lines (sleep, water, steps, foods) but restore without the Health choice |
| Z1B-3 | Medium | .ics import | Quadratic RECURRENCE-ID matching: a 580 kB file blocks the tab for 46 s, well under the 2 MB cap |
| Z1B-4 | Low | Agenda, stored calendars | A COUNT rule from an old start is walked from the start on every agenda range change: 5.5 s for 1,000 events |
| Z1B-5 | Low | Notes ZIP import | Entries that fail their CRC are inflated but never counted: a 118 kB ZIP costs 2 GB of inflation (~14 s) |
| Z1B-6 | Low | Showcase / notes | A Showcase notes export imports into real notes without its Example label; the file name has no Showcase mark |
| Z1B-7 | Info | Notes photos | The orphan sweep deletes photos of notes a Restore replaced; Undo of the restore cannot bring them back |
| Z1B-8 | Info | Secret guard (pre-existing) | `groupedHexKey`'s regex is quadratic (80 k chars: 5 s); now also runs on each keystroke in Capture a note |
| Z1B-9 | Info | Showcase photos | Note and receipt photos taken in a Showcase tab stay in IndexedDB after the tab closes |
| Z1B-10 | Info | Lab-sheet scan | The photo is sent the moment it is picked, with no preview of what leaves (name, birth date, patient id on the sheet) |

---

## Z1B-1 (Medium): the lab-sheet scan and the receipt draft bypass the privacy mode

**Where.** `apps/web/components/health-numbers/lab-sheet-scan.tsx:59` and `apps/web/components/money-photos/receipt-draft.tsx:54`
pass the bare `streamChat` (lib/ai/chat.ts:10, which has no privacy check) to `runLabSheetScan` / `runReceiptRead`.

**Why Medium.** lib/ai/privacy-mode.ts says the mode is "enforced where every request of ZIGi and NOVA leaves the
device": Strict refuses every cloud provider before anything is sent, Guarded "sends no photo to a cloud model". The food
label scan was changed in this same range to honour it (`components/health/label-scan.tsx:16-17`, `guardedStream` →
`guardRequest`), and both new components say they follow "the label-scan pattern and its gates exactly", but neither
calls `guardRequest`. The lab sheet is Health-describing and the photo usually carries the person's name, birth date and
patient number; a receipt carries card digits and the shop. Same class as Session Y F4 (Health photo past a closed gate
on a tap), which was rated Medium.

**Exploit scenario.** A person sets NOVA's privacy mode to Guarded (cloud model allowed, text redacted, no photos) with
OpenAI as ZIGi's provider. They tap Health → Your numbers → Read my lab sheet from a photo and choose the photo. The
whole lab sheet image goes to OpenAI unredacted; ZIGi's own chat would have refused it with `GUARDED_PHOTO_REFUSAL`.
With Strict and a cloud key still configured, the same happens where every ZIGi message is refused. Also missed:
`hideRecoveryWordsInRequest` (harmless here, the requests carry no text records).

**Fix.** Wrap the stream as label-scan.tsx does: `const guardedStream: typeof streamChat = r => (async function* () { yield* streamChat(await guardRequest(r)); })();`
and pass `guardedStream` in both components; show `AiError('blocked')`'s message as the problem line. Add a test per
component (or one test over every `streamChat` importer outside `use-chat-session.ts`) that Strict and Guarded refuse a
cloud request carrying an image before `fetch` is called. Fails on the current code.

## Z1B-2 (Medium): NOVA briefs restore without the Health choice

**Where.** `apps/web/lib/restore/plan.ts:160`: `dev('novaBriefs', 'NOVA briefs', 'Today and Life', NOVA_BRIEFS)`, no
`health` flag. The stored briefs (`zigoals:nova-briefs:v1`, lib/nova/briefs.ts:32 `lines`, `sections`, `polished`) are
composed by `composeBrief` (briefs.ts:91) through `scopedEnv` and ZIGi's brief rules (lib/ai/proactive/brief.ts:67-72,
100-101), which write Health facts when the Health scope and gate were open: "From yesterday: 7 h 10 min of sleep logged
for last night", "water 1.8 L", "8,400 steps", "3 foods logged".

**Why Medium.** The product rule is that Health-describing records restore only with the Health choice; cycle and Your
numbers were flagged (`plan.ts:154, 156`), the briefs were not. The restore writes Health text into the device record of a
person who unticked Health, and the briefs panel then shows it (and a "reword" can send it to a model) regardless of the
Health gate at that moment.

**Exploit scenario.** A person exports everything on their own phone (Health shared with NOVA), then restores that file
on a family tablet choosing everything except Health. The tablet now shows "From yesterday: 5 h 40 min of sleep… water
0.6 L" in NOVA → Briefs to anyone who opens the app there.

**Fix.** Flag the part `true` (Health group or a Health-gated part), or on restore without Health drop the briefs' lines
and sections that came from Health (simplest: flag the whole part, as the briefs are recomputed daily anyway). Add the
key to whatever test enumerates Health-describing parts so a new NOVA record with Health text cannot slip in again.

## Z1B-3 (Medium): a small .ics file freezes the tab for most of a minute

**Where.** `apps/web/lib/ics/import.ts:237-242` collects every RECURRENCE-ID per UID without limit; `:276-277` then, for
**each** master event with a rule, JSON-parses and zone-converts (`into` → `instantAt`/`wallClock`, Intl) every override
of that UID; only after that work does `:285` drop a master whose id was already kept. 2,500 masters and 2,500 overrides
sharing one UID (5,000 = `MAX_EVENTS_READ`) is 6.25 M Intl conversions.

**Measured.** A 580 kB file (`z1b/ics.probe.test.ts`): `readIcs` took **46,326 ms** on the main thread
(components/agenda/calendar-import.tsx:27 calls it synchronously), then kept 169 events.

**Why Medium.** .ics files are the one import people routinely receive from third parties (invitations, club fixtures,
"subscribe to our schedule" downloads). The file is a quarter of the 2 MB cap, so the caps give no protection, and the
threat model's control for this threat reads "Size and count caps checked before work; linear duplicate checks". The
browser shows "Page unresponsive"; nothing is lost. (RM12 rated a 26 s self-exported CSV case Low; the third-party file
and the doubled time are why this is one step higher.)

**Fix.** (1) Build `replaced` as `Map<uid, Set<string>>` capped at `MAX_EXDATES` per UID, converting each override once
(store the converted wall time per target zone, or convert lazily and memoise). (2) Check `events.some(id)` (use a `Set`)
before computing exdates, so a repeated master costs nothing. (3) Optionally move `readIcs` into a Worker as the
Switch-to-ZIGoals importer does. Test: the probe's file read in under 1 s; fails today.

## Z1B-4 (Low): an imported COUNT rule from an old start slows every agenda view

**Where.** `apps/web/lib/ics/import.ts:281`: a rule with COUNT and no UNTIL has `ruleEnd = null`, so an event that ended
decades ago is kept. `apps/web/lib/ics/expand.ts:42`: with COUNT, `jump` is false and the walk starts at DTSTART, up to
`MAX_STEPS` (3,000) every call. Callers: `lib/agenda/time-items.ts:57` (every range change on the Agenda,
agenda-page.tsx:61) and NOVA's calendar tool (`lib/ai/tools/nova-tools.ts:141`).

**Measured.** 1,000 events `DTSTART:19000101T090000`, `RRULE:FREQ=DAILY;BYDAY=MO;COUNT=1000` (`z1b/expand.probe.test.ts`):
`eventAgendaItems` over 62 days took **5,546 ms** and returned nothing. With 1,500 stored events, ~8 s per view change,
persistently, until the calendar is removed.

**Fix.** At import, run the bounded walk once for COUNT rules and store the last start as `until` (or drop the event as
past when it ends before the 90-day window); in `ruleStarts`, give DAILY/WEEKLY without a filter an arithmetic skip for
COUNT too; and give `eventAgendaItems` one step budget for all events per call (e.g. 200,000) with a "some events not
shown" note.

## Z1B-5 (Low): the notes ZIP reader does not budget inflation of damaged entries

**Where.** `apps/web/lib/notes/zip-read.ts:65-89`. `total` (the 30 MB cap) grows only for entries that pass the CRC
(`:86-87`). Entries that inflate to the 1 MB per-file cap and then fail their check cost the full work and count nothing;
2,000 central-directory entries may all point at the same local entry (overlap is not refused). Across files,
`components/notes/notes-files.tsx:40-44` reads up to 1,000 ZIPs with no total budget and no Stop button.

**Measured.** A 118 kB ZIP (`z1b/zip.probe.test.ts`): 2 GB inflated, **13.8 s**, all 2,000 entries skipped. Asynchronous
(DecompressionStream), so the tab is slow rather than frozen.

**Fix.** Count every inflated byte against an unpacking budget (e.g. `maxTotal`) whether or not the entry is kept, as the
Strava importer's 1 GB budget does (RM12 R3-F5); refuse a local-header offset used twice; stop after a few damaged entries;
share one budget across all chosen ZIPs and offer Stop.

## Z1B-6 (Low): Showcase notes can become real notes without their label

**Where.** Export: `apps/web/components/notes/notes-files.tsx:30` names the file `zigoals-notes-<date>.zip` in a Showcase
tab too (Export everything marks Showcase files); the entries carry `example: true` (lib/notes/markdown.ts:73). Import:
`lib/notes/markdown.ts:163` builds each note without `example`, and nothing checks for it.

**Exploit scenario.** A person tries the Showcase, exports notes to look at them in Obsidian, later imports that ZIP into
their real account to bring their Obsidian vault in. Eight fictional notes ("Japan trip ideas", fake daily notes) join
their real notes, without the "Showcase example" mark (only the body's "(SHOWCASE DATA)" line remains), linking to their
real goals and habits if names match. Breaks "Showcase data never mixes with real data".

**Fix.** Name the Showcase export `zigoals-example-notes-<date>.zip`; in `planImport`, skip a file whose front-matter says
`example: true` (reason: "a Showcase example note") when the target storage is not the Showcase, or ask first.

## Z1B-7 (Info): a restore can make the notes' photo sweep delete photos for good

`apps/web/components/notes/notes-workspace.tsx:46-52` deletes, on arrival, every note photo no current note names. A
Restore that replaces `zigoals:notes:v1` with an older copy makes today's photos orphans; the next Notes visit deletes
them, and Undo of the restore brings the notes back without their photos. Integrity, not confidentiality. Fix: delete only
photos whose note was deleted by the person (a small tombstone list with a date, as the Undo window), or keep orphans for
30 days before sweeping.

## Z1B-8 (Info, pre-existing): quadratic hex-group scan, now on the notes capture box

`apps/web/lib/emergency-sheet/secrets.ts:159` `/[0-9a-fA-F]+(?:[\s:-]+[0-9a-fA-F]+)+/g` backtracks quadratically over a
long unbroken hex run: 20 k chars 256 ms, 40 k 1.2 s, 80 k 5.2 s (`z1b/b58.probe.test.ts`). Unchanged since before
`58224a69` (outside this range), but `SecretGuard` now also runs it on each change of Capture a note
(`components/notes/capture-box.tsx:48`, up to 20,000 characters). Fix: match `[0-9a-fA-F]+` tokens with a single linear
scan of separators (or anchor each block start with a lookbehind `(?<![0-9a-fA-F])`).

## Z1B-9 (Info): Showcase photos outlive the Showcase

Note photos and receipt photos taken in a Showcase tab are kept in IndexedDB under the `showcase` scope
(`lib/health-aa/photos.ts:53`), while the Showcase records they belong to live in the tab's own storage. After the tab
closes, the bytes stay on disk: note photos until the next Showcase visit to Notes sweeps them, receipt photos until the
person deletes orphans or erases. They never mix with real data and Erase removes them. Fix: clear the `showcase` scope of
both databases when a Showcase starts and when it ends.

## Z1B-10 (Info): the lab-sheet photo goes as soon as it is picked

`components/health-numbers/lab-sheet-scan.tsx:69` sends on file pick; the copy (`:78`) says the AI "copies the names,
values, units and printed ranges", while the whole image goes to the provider, typically including the person's name,
birth date, patient number and doctor. The receipt draft does the same. Fix: show the shrunk photo with "This whole photo
goes to <provider>" and a Send button (the meal-photo pattern), and say in the copy that names and numbers printed on
the sheet go too.

---

## Checked and sound

- **Notes Markdown import.** Front-matter read as plain strings into an `Object.create(null)` record, keys allow-listed by
  pattern, `__proto__`/`constructor`/`prototype` refused, counts and lengths capped; ids, `example` and photos never taken
  from a file; stubs skipped; every change planned and confirmed, with Undo. Rendering goes through `parseBlocks`
  (lib/ai/safe-render.ts): React elements only, links only `https:` without credentials (`safeHref`), no images, no HTML;
  `[[links]]` resolve only to existing notes, goals and habits (hrefs built by the app, ids `encodeURIComponent`ed). No
  `dangerouslySetInnerHTML`, `innerHTML`, `eval` or `Function` anywhere in the range's non-test code.
- **Notes ZIP reader.** No file is ever written, so zip-slip does not apply; names with `..`, absolute paths, drive letters,
  control characters and hidden parts are skipped anyway. Archive 25 MB, 2,000 entries, ZIP64/split/encrypted/other
  methods refused, per-file 1 MB stopped during inflation, ratio check, CRC and length checked (only Z1B-5 above).
- **Notes export.** Paths from `safeFileBase` (no separators, no reserved names); titles and tags JSON-quoted; photo names
  from schema-checked ids.
- **.ics reader.** Text only; nothing followed, fetched or run (ATTACH, URL, ALARM, HTML descriptions ignored); nesting
  depth 8, 200,000 lines, 2 MB checked on `file.size` before reading, 5,000 read, 1,000 kept, 1,500 stored, 8 calendars;
  INTERVAL ≤ 366, COUNT ≤ 1,000, 50 EXDATE lines, 100 exdates kept; parameter names upper-cased (no prototype keys);
  titles and calendar names only ever React text; the UID kept only as a 16-hex hash. Expansion bounded at 3,000 steps
  and 400 starts per event (only Z1B-3 and Z1B-4 above).
- **Regexes.** Timed against adversarial inputs (20 k–200 k chars): `[[link]]` parser, link autocomplete, front-matter,
  `isExpression`, `evaluateAmount`, `readTotal`, the recovery-word segmenter and span hider all ≤ 50 ms. Money-calc is a
  hand-written parser, 80 characters, 20 numbers, exact BigInt fractions, no `eval`.
- **AI replies (lab sheet, receipt).** Read as data: `extractJsonObject`, zod, every number bounded, names stripped of
  control and format characters and clipped, future dates dropped, 20 k / 60 k reply caps; result is an editable draft,
  nothing saved without a tap. Lab sheet behind the Health gate and `photoAllowance`; receipt behind the Wealth page share.
- **Health-describing records.** Cycle and Your numbers: `health: true` in restore; dropped from ZIGi/NOVA's tool env when
  the Health gate is closed (`lib/ai/tools/env.ts:95`); the cycle tool also needs the cycle switch; G1 write cards marked
  `healthContent`; neither appears in any notification (no notification code reads them; NOVA's brief notification only
  changes where a tap lands).
- **Registries.** Every new localStorage key (notes, calendar-import, nova ×6, health-numbers, scales, cycle, focus-rounds,
  insight-feedback) is in `DEVICE_KEYS` (export), `DEVICE_PARTS` (restore), the catalog and `AK_PERSONAL_KEYS` (account
  erase); `zigoals-notes-photos-v1` and `zigoals-money-photos-v1` are in `KNOWN_DATABASES` (Erase everything) and
  `AK_DATABASES` (account erase); Erase everything removes every `zigoals*` key by prefix. Tasks' `time` and focus
  sessions' `mode`/`block`/`taskId`/`pomodoro` are optional, `.catch(undefined)` on read and inside loose objects, so older
  builds keep and pass them through. `novaHermes` holds a localhost address and checks, never the key.
- **Exports.** No new CSV writer in the range; note and receipt photos exported as files with sanitised names, not from a
  deleted account's kept records; Export everything still asks for the "includes Health" acknowledgement.
- **Net-worth share card.** Without "Include numbers" it carries only a per cent change and words; no amount in the
  lines, eyebrow, alt text or file name; Showcase cards say Example.
- **Showcase.** Every new fixture is written by `buildShowcase` into the Showcase tab's storage only, labelled
  (`example: true`, "(SHOWCASE DATA)", "Showcase example" notes); photo stores are keyed by scope, so Showcase and real
  photos never share a key (apart from Z1B-6 and Z1B-9).
- **IndexedDB quota.** Note photos ≤ 300 × 200 kB and receipt photos ≤ 500 × 200 kB per scope, shrunk on the device and
  schema-checked before `put`.

## Fixes (lane ZG)

Z1B-3, Z1B-4, Z1B-5, Z1B-6 and Z1B-8 are fixed in `lib/`; Z1B-7 and Z1B-9 are recorded as notes, with no change. Timed
tests use generous bounds (about 3× what this machine takes). The review's own probes against the fixed code: .ics 46,326 ms
→ 272 ms, stored COUNT agenda 5,546 ms → 0 ms, notes ZIP 13.8 s → 53 ms, hex scan (80 k characters) 5.2 s → 5 ms.

- **Z1B-3 (.ics RECURRENCE-ID).** `lib/ics/import.ts`: changed occurrences are indexed once per UID (a `Map` of UID to
  distinct recurrence ids, at most `MAX_EXDATES` = 100 per UID), moved into a master's zone once per UID and zone, and no
  longer go through JSON. Duplicate checks use a `Set`. A master is checked for "ended", "already kept" and "over the
  1,000" **before** its skipped dates are worked out, and stops converting once it has 100 (what the stored event keeps
  anyway). Zone conversions go through `lib/ics/zone-move.ts` (`moveWall`): the same answers as `instantAt` + `wallClock`,
  read with a short Intl offset call (`timeZoneName: 'longOffset'`), about four times faster; within a day of an offset
  change, or where Intl cannot, it uses lib/zone-time.ts itself. The Agenda's `occurrences` uses it when the event's zone
  differs from the device's. Tests (`lib/ics/import-cost.test.ts`): the review's file in < 2 s (≈100 ms); a file at the
  2 MB cap built for the most conversions (1,000 masters × 100 EXDATEs in another zone, plus overrides) in < 3 s (≈1 s;
  3.6 s without the quick path); what is kept is unchanged (EXDATEs first, then overrides, repeated masters and overrides
  once); `moveWall` equals the old conversion for 3,000+ random times over 13 zones (half-hour, 45-minute and seconds
  offsets, 1900–2200) and every half hour of ten clock-change days; Agenda occurrences equal the reference across clock
  changes, and 1,000 zoned daily events over 62 days (62,000 starts) in < 1.5 s (1.9 s before).
- **Z1B-4 (COUNT from an old start).** `lib/ics/expand.ts`: `countEnd` gives a COUNT rule's last start (arithmetic for
  DAILY, filtered DAILY and WEEKLY; a numeric month or year walk, at most 3,000 steps as a view's walk had, for MONTHLY and
  YEARLY), and `settleCount` replaces the COUNT by the UNTIL of that start (or the rule's own earlier UNTIL). The import
  stores settled rules, so a series that ended is left out as past (counted "ended over 90 days ago"), and one that gives
  no start at all is counted as unreadable. `ruleStarts` settles a COUNT rule stored before this fix once per rule in a
  bounded memo (5,000), so every view jumps straight to its range; NOVA's calendar tool goes through the same code.
  A long COUNT series still running now shows its later starts correctly (the old walk stopped at step 3,000). Tests: the
  review's 1,000 events from 1900 import in < 1.5 s (≈20 ms) and, stored with their COUNT, a 62-day view in < 1.5 s (≈0 ms);
  settling equals walking the rule start by start for 400+ random rules of every kind; UNTIL before the COUNT's end wins; a
  filter that never matches gives nothing at no cost. One existing test changed: "a COUNT reaching back years" built its
  event through the import, which now leaves it out as past; its assertion (`[]` in November 2026) is kept on the same
  rule as stored before the fix, and two assertions are added (its last week in 1992; the import leaves it out as past).
- **Z1B-5 (notes ZIP budget).** `lib/notes/zip-read.ts`: every inflated byte counts against one unpacking budget
  (`maxTotal`, 30 MB), kept or not; a failed inflation is charged what it produced (`ZipError.inflated`), an inflater that
  cannot say is charged its full allowance; each inflation is limited to what is left of the budget. Entries whose bytes
  overlap another's are refused ("it is damaged (it overlaps another entry)"); a stored entry whose sizes disagree is
  damaged without a copy; after 20 damaged entries the rest of the archive is left unread ("the archive is damaged in too
  many places"). `readZip` takes a shared `budget` and an `AbortSignal` (checked between entries and inflated chunks;
  "Stopped. Nothing was changed."). New `lib/notes/read-files.ts` `readNoteFiles(list, {signal, budget})` is the
  component's file loop with ONE budget for all chosen ZIPs and .md files of an import. Tests
  (`lib/notes/import-budget.test.ts`): the review's ZIP in < 3 s (≈60 ms) inflating ≈1 MB, not 2 GB; damaged entries are
  charged and the rest wait for the budget; one budget across two 20 MB ZIPs and a file; Stop between files, in an archive
  and while inflating.
  **For lane NV (components/notes/notes-files.tsx, not changed here):** replace the loop at lines 39–49 with
  `const {files, skipped} = await readNoteFiles([...list], {signal: stop.signal})` and offer a Stop button while `busy`
  that calls `stop.abort()` (the existing `catch` already shows a `ZipError`'s message).
- **Z1B-6 (Showcase notes).** `lib/notes/markdown.ts`: `planImport` skips a Showcase example note (front-matter
  `example: true`, or a body ending "(SHOWCASE DATA)") with the reason "it is a Showcase example note, so it stays out of
  your own notes"; with `{showcase: true}` (importing into the Showcase) it imports them and keeps `example: true`.
  `notesExportName(day, showcase)` names a Showcase export `zigoals-example-notes-<day>.zip`. Tests: a Showcase export into
  real notes adds nothing and says why; the body line alone marks a note; into the Showcase the notes keep their mark; the
  file names. One existing test changed: the Markdown round trip uses the Showcase's notes as its fixture, so it now
  imports into the Showcase (`{showcase: true}`); every assertion is kept. **For lane NV:** in notes-files.tsx use
  `link.download = notesExportName(localDate(), isShowcase())` and pass `{showcase: isShowcase()}` to `planImport`.
- **Z1B-8 (hex groups).** `lib/emergency-sheet/secrets.ts`: the block regex starts only where a hex run starts
  (`(?<![0-9a-fA-F])`, exported as `HEX_GROUPS`), so a long run is tried once, not from each character. Same matches: a
  match's first group must reach its run's end. Tests (`lib/emergency-sheet/secrets-redos.test.ts`): five hostile 80 k
  inputs each < 1 s (≈5 ms); identical matches to the old regex on 3,000 random strings; grouped keys still found, dates
  and phone numbers not. Every existing secret-guard and emergency-sheet test passes.
- **Z1B-7 (Info, note only).** The fix (a tombstone list or a 30-day grace before the orphan sweep) is in
  components/notes/notes-workspace.tsx, lane NV's; no one-line safe fix in `lib/`.
- **Z1B-9 (Info, note only).** Clearing the `showcase` photo scope when a Showcase starts and ends touches the Showcase
  lifecycle and two photo stores; not a one-line change, left for a later session.

Observed while testing (not caused here, not changed): `lib/secret-guard/note-lists-arrive.test.ts` fails about one run in
three when run together with lib/notes, lib/ics, lib/agenda and lib/emergency-sheet at two workers (line 24: the cautious
line has already gone because the word list loaded within the first `act`); it fails the same way with the original
`secrets.ts` and passes alone.
