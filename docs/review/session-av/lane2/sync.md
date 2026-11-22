# Lane 2 registry: sync and appearance (`lane2/sync`)

Builder: the sync-and-appearance builder. Scope: LEDGER group 17 "Sync and safety" (#33, #34, #41, #134), N6 (#191,
#192, #193) and N10 (#209).

## Rows

| Row | Verdict | Feature |
|---|---|---|
| #41 Day One E2E encryption and passcode — journal part | **built (app side)**; the sync service part is left: **needs an outside service** (a Worker change and its deploy, the owner's) | F1 |
| #41 — passkey (Face ID / Touch ID) unlock | left: **against a named rule** (no wallet, signing or key changes) | — |
| #134 YNAB multi-device sync — money part | **built (app side)**; the sync service part as #41 | F1 |
| #209 Strong Cloud | **built (app side)**; the sync service part as #41 | F1 |

## F1 The journal, the money records and the workout log in the encrypted sync — LEDGER #41, #134, #209 (TIER 3 (sync))

- What: Settings → Account & sync → "Also sync my extras" now has a group "Also, if you choose": "Also sync my journal",
  "Also sync my money records", "Also sync my workout log", each unticked until the person ticks it on this device
  (ADR-034 N18 promised these stay on the device, so none starts travelling by itself). Each is its own encrypted extras
  section (`journal`, `money`, `workouts`), sealed like the other extras (same parts, same AEAD context, own fixed
  objects 0x4C0–0x51F), merged three-way like them (entries by id, the later stamp on a both-sides edit, an edit beats a
  removal), travelling as stored (`verbatim`: a later build's fields and records are carried untouched). Each chosen
  section has "Remove my … from the cloud…" (asks first; every other device then stops that section only and keeps its
  records; ticking it again uploads this device's). "Remove the extras from the cloud" also deletes the chosen sections.
- What travels: journal — entries (photo and voice-note ids only; the bytes stay where they were added, and the entry
  already says "This photo is not in this browser"), journals, own templates, prompt packs, default template, follow-up
  setting. Stays on each device: `shareWithAi` (a per-device consent), `versions` (earlier versions, up to 200,000
  characters — keeps the section inside its 1 MB), `reminder` (rings where it was set), `todayLines`, `affirmations`
  (what Today shows). Money — money log, budgets, budget periods, bills, rules, money tags, reviewed marks. Workouts —
  the workout log (routines, own exercises, plates) and run splits; under the **Health consent** (only while Health sync
  is on in the tab), as every Health-describing record.
- Wire and storage, additive: a device that chose none sends exactly the requests it sent before
  (`?action=extras&with=checklist&with=nova`), stores nothing new and has no new outcome. A device that chose some adds
  `&with=journal&with=money&with=workouts` (only those chosen, in that order). The relay
  (`lib/server/private-account.ts`) accepts those forms and every earlier one, and `section=journal|money|workouts`;
  anything else is refused before a call. Older builds never ask for the sections, so they never read or write them.
- **Left (needs an outside service: a Worker change and its deploy, the owner's):** `workers/private-sync/extras.mjs`
  knows only `EXTRAS_SECTIONS` + `EXTRAS_SECTIONS_OPTIONAL = ['checklist', 'nova']`; a well-formed name it does not know
  is simply not listed. Until the owner changes and deploys it, a chosen section waits on the device: "Your journal
  entries sync once the sync service is updated. Nothing was changed here." (proven against the deployed and the current
  Worker in `scripts/run11/av2-extras-choice.test.mjs`). The Worker change the owner would make (not made here):
  1. `EXTRAS_SECTIONS_OPTIONAL = ['checklist', 'nova', 'journal', 'money', 'workouts']` (the client and relay already
     send them after `nova`; `EXTRAS_WITH_MAX = 8` already allows five).
  2. The Health rule for `workouts` as for `health`: write it with `healthGeneration`, and drop it in `head()` / on a
     Health domain deletion exactly as `health` is (so the workout log never outlives a Health deletion). The client
     already stops `workouts` on every device when its copy goes, and only the person's own tick uploads it again.
  3. The frozen-reader fixture of the deployed Worker stays as it is.
- Files: `lib/vault/extras-keys.ts` (EXTRAS_CHOICE_SECTIONS, EXTRAS_CHOICE_DEVICE_KEYS, EXTRAS_CHOICE_SECTIONS_FIELD,
  stopsExtras), `lib/vault/extras-sections.ts` (EXTRAS_CHOICE_SECTION_LIST, ALL_EXTRAS_SECTIONS, JOURNAL_DEVICE_FIELDS;
  EXTRAS_SECTIONS unchanged), `lib/vault/extras-sync.ts` (choice read/write, heads with chosen names, the chosen
  sections after the six, deletion of one chosen section, labels and notes), `lib/server/private-account.ts` (relay
  forms), `components/vault-sync-controls.tsx` (stopsExtras; `removeExtrasCloud(section?)`),
  `components/sync/extras-sync-choice.tsx` (the group, the remove buttons, the status line).
- Tests: `lib/vault/av2-extras-choice.test.ts` (pinned contents; the choice; chose-none is byte-identical; round trip;
  conflicts; money; workouts and Health; a later build's record/fields; an earlier build beside this one; a service that
  does not list them; removal of one; removal of all; the wire and the relay), `scripts/run11/av2-extras-choice.test.mjs`
  (real chain against the deployed frozen Worker and the current one). Existing extras, relay, Worker-chain, frozen-fixture
  and catalog tests unchanged and green.
- Spec: `tests/av2-sync-choices.spec.ts`.
- Stored changes (TIER 3 stored formats, for the lead): one optional field `sections` (`{journal?: true, money?: true,
  workouts?: true}`) inside the existing `zigoals:extras-sync-choice:v1` (no new key). Builds before it read only
  `enabled`/`explained`; one that rewrites the choice drops `sections`, which reads as none chosen (the safe side). The
  extras bases in IndexedDB `zigoals-extras-sync-v1` gain entries `<account>:journal|money|workouts` (same schema).
  Export / erase / restore: unchanged — the choice is a per-device consent, not exported (erase-coverage NOT_RECORDS
  already says so), erased by Erase everything with every `zigoals` key, left untouched by a restore; the bases are
  forgotten by `forgetExtrasBases` as before.
- Catalogue (lead): `lib/data-health/catalog.ts` keeps the ten keys as "device"; suggested label suffix "— synced only if
  you tick it in Settings → Account & sync". `lib/av2-device-keys.ts`'s doc says `zigoals:budget-periods:v1` is "never
  synced": now "synced only when chosen". (The catalogue test only reads EXTRAS_SECTIONS, which is unchanged.)
- Help (EN). Q: "Can my journal, money records and workouts sync to my other devices?" A: "Yes, if you choose. In Settings
  → Account & sync, under Also sync my extras, tick Also sync my journal, my money records or my workout log on each
  device. They travel end-to-end encrypted like your other records. Photos and voice notes stay on the device where you
  added them, and the workout log travels only while Health sync is on. Remove … from the cloud deletes that copy; every
  device keeps its own records."
- What's new: "Sync: choose to sync your journal, money records and workout log, end-to-end encrypted."
- Answers wiring: see F-answers below.
- Showcase: none (sync needs an account).
- Today: nothing added.
- CSS: none.
