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
| #41 — passcode | already **built** before this lane: the optional PIN screen lock (`lib/device-lock.ts`, Settings → Device lock, Session AH SE14) | — |
| #34 Notion high contrast mode | **built** | F2 |
| #191 Loop pure black dark mode | **built** | F2 |
| #192 Daylio custom fonts | **built** with system font stacks (Serif, Rounded, Monospace); a bundled font file would need an outside source (none is in the repository beyond Inter, and no `.woff2` is in any existing dependency's node_modules) | F2 |
| #193 Loop automatic backups | **built** | F3 |
| #33 Notion version history | already **built** by the journal builder (journal entries, notes) and the tasks builder (tasks); the row names no other record | — |

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
- Answers wiring: see F4 below.
- Showcase: none (sync needs an account).
- Today: nothing added.
- CSS: none.

## F2 Dark's styles (High contrast, Pure black) and three more fonts — LEDGER #34, N6 #191, #192

- What: Settings → Appearance → Customize gains a fifth group, **Dark style**: Standard (Dark as it is), **Pure black**
  (true black ground for OLED screens; cards a near-black that still tells them apart) and **High contrast** (white
  words on black, every word at least 7:1 = WCAG AAA, coloured fills deepened so words keep ≥ 7:1 on them, lines and
  icons ≥ 7:1 and opaque, gradient words plain, a strong 3 px yellow focus ring with a black halo, links underlined).
  Choosing Pure black or High contrast from Nebula or Light also turns Dark on ("Dark is on now."); the style is
  remembered and shows whenever Dark is on. Font gains **Serif**, **Rounded** and **Monospace** from the device's own
  fonts (system stacks: nothing is fetched). Back to the defaults resets the Dark style too. The sidebar theme bar (shell
  navigation, protected) is unchanged: still Light / Nebula / Dark.
- How it is built (the existing theme way): `scripts/themes/build-themes.mjs` gains `DARK_STYLES` and `buildDarkStyle`.
  Each style is an override of the **generated Dark sheet itself**: every colour declaration of the style's roles is
  carried, mapped by the style's rule or as it is, under `<html data-theme=dark data-dark-style=…>` with one more id of
  weight than its Dark original, so among the copies the cascade is Dark's own and each copy beats its original. Only
  colour declarations are carried (no layout, no animation: Motion Off and reduced motion untouched). Hand layers
  `apps/web/themes/dark-contrast.extra.css` and `dark-black.extra.css` (ground, focus ring, links, inputs) are appended.
  The early script (`bootScript`) sets `data-dark-style` and adds the style's sheet before the first paint (only with
  Dark), and sets `data-font` for the three new fonts. `buildAll` writes `public/themes/dark-black.css`,
  `public/themes/dark-contrast.css` and `DARK_STYLE_SHEETS` in `lib/ui-prefs/theme-sheets.ts`.
- **For the lead: run `node scripts/themes/build-themes.mjs`** (not run here, per the brief). Until then the two
  "are what the generator builds" tests of `scripts/themes/build-themes.test.mjs` are stale (they already were on
  `feature/session-av-2` before this branch: light.css and text-large.css, from other lanes' CSS), and
  `lib/ui-prefs/dark-style.ts` falls back to the unhashed `/themes/dark-<style>.css` (read by name, so nothing breaks
  before the regeneration). Measured in memory: the High contrast sheet writes > 500 word colours, every one ≥ 7:1 on
  black (`scripts/themes/av2-dark-styles.test.mjs`); each style sheet is about the size of dark.css (~1 MB), fetched only
  when chosen.
- Files: `scripts/themes/build-themes.mjs`, `apps/web/themes/dark-contrast.extra.css`, `apps/web/themes/dark-black.extra.css`,
  `apps/web/app/customize.css` (three font rules), `lib/ui-prefs/look.ts` (font choices), `lib/ui-prefs/dark-style.ts`
  (new), `lib/ui-prefs/theme.ts` (applyTheme applies Dark's style), `components/settings/customize-settings.tsx`.
- Tests: `scripts/themes/av2-dark-styles.test.mjs` (the rule by role with WCAG ratios; selectors and scope; the early
  script; the real sheets built in memory: scope, and AAA for every literal word colour), `lib/ui-prefs/av2-appearance.test.ts`.
- Spec: `tests/av2-appearance.spec.ts` (High contrast from Nebula with axe's AAA rule `color-contrast-enhanced` on the
  Appearance group, the focus ring, the first paint of the next page; Pure black; the three fonts with nothing fetched).
  Deliberate change: `tests/customize-aj.spec.ts` — Font now has 5 radios (labelled; the other groups still exactly 2).
- Stored (TIER 3 stored formats, separate commit): `zigoals:ui-prefs:v1` `look.font` accepts `serif | rounded | mono`
  (older builds read them as System: their enum's `.catch` drops the value on read and keeps the group); `look.darkStyle`
  `black | contrast` (optional, `.catch(undefined)`; older builds keep it and show Dark). In Export everything with the
  rest of the display record; a restore leaves display choices to the device (unchanged).
- CSS sources touched (the lead regenerates the theme sheets): `apps/web/app/customize.css` (not a theme source:
  NOT_SOURCES), `apps/web/themes/dark-contrast.extra.css`, `apps/web/themes/dark-black.extra.css` (hand layers of the new
  sheets only: `handLayers('dark')` reads `dark.*.css`, so Dark's own sheet is unchanged), and
  `apps/web/components/restore/backup-folder.css` (F3; layout only, no colour declaration, so no theme sheet changes for it).
- Help (EN). Q: "Is there a high-contrast or pure black look?" A: "Yes. In Settings → Appearance → Customize, Dark style
  offers Pure black (a true black page for OLED screens) and High contrast (white words on black, every word at least
  7:1, strong focus rings). Choosing one turns Dark on; it is kept on this device and shows whenever Dark is on."
  Q: "Can I change the font?" A: "Yes: Settings → Appearance → Customize → Font offers System, Inter, Serif, Rounded and
  Monospace. Serif, Rounded and Monospace use the fonts your device already has, so nothing is downloaded."
- What's new: "Appearance: High contrast and Pure black styles for Dark, and Serif, Rounded and Monospace fonts."
- Search (lead, `lib/search/static.ts`): "high contrast", "pure black", "OLED", "font" → Settings → Appearance.
- Route weight: Settings gains the Dark style group (inside the Customize part) and a dynamic import of the theme module
  on choosing; every page's global CSS gains the three font rules in customize.css (~0.6 kB raw).
- Showcase: none (a display choice). Today: nothing added.

## F3 A copy on a schedule into a folder — LEDGER N6 #193 (Loop's automatic backups)

- What: Settings → Your data → "A copy on a schedule" (under the monthly reminder): How often (Off / Every day / Every
  week / Every month) and — where the browser can write into a folder (File System Access: Chrome or Edge on a computer)
  — "Choose a folder…" once, "Make a copy now", "Forget the folder". When a copy is due, opening the app writes Export
  everything's own file (`zigoals-export-YYYY-MM-DD.zip`, the same format byte for byte) into the folder and says so in
  a toast; if the browser wants permission again, the toast links to Your data, where one tap writes it. Elsewhere
  (Safari, Firefox, phones) the schedule reminds instead: "Your scheduled copy is due. · Make it" links to Your data.
  Nothing leaves the device; never in the Showcase. A written copy also sets "I saved a copy" (the monthly reminder stays
  quiet). Copies already in the folder are never deleted.
- Files: `lib/backup-folder/schedule.ts`, `lib/backup-folder/handle.ts`, `lib/backup-folder/run.ts`,
  `components/restore/backup-folder.tsx`, `components/restore/backup-folder.css`, `components/restore/backup-reminder.tsx`
  (renders it), `components/notify/notify-sync.tsx` (once per visit, when idle, only on a device with a schedule: a raw
  string check before anything loads), `lib/export/make-everything.ts` (behaviour-preserving split:
  `buildEverythingExport()` makes the file, `makeEverythingExport()` downloads it as before).
- Tests: `lib/backup-folder/av2-backup-folder.test.ts`, `lib/backup-folder/av2-backup-folder-export.test.ts`.
- Spec: `tests/av2-backup-folder.spec.ts` (the picker is answered with a folder of the page's own private file system, so
  the copy is really written and read back; three themes; 320 px; axe; the copy on opening the app; the reminder fallback).
- Stored (TIER 3 stored formats, separate commit): `zigoals:backup-reminder:v1` gains optional `schedule: {every:
  'day'|'week'|'month', folder?, lastOn?, failedOn?}` (loose, `.catch(undefined)`; older builds keep it). In Export
  everything (the record is already exported); "Restore from a backup" does not restore the reminder (a device's own
  choice, unchanged), proven in the export test. New IndexedDB database **`zigoals-backup-folder-v1`** (store `folders`,
  key = account scope or `local`): the folder handle, device-only, never exported.
- Registries (lead): add `zigoals-backup-folder-v1` to `KNOWN_DATABASES` in `lib/erase-everything.ts` (Erase everything
  deletes it) and to the account erase list (`lib/aa-device-forget.ts`); `forgetFolder(scope)` in
  `lib/backup-folder/handle.ts` removes one scope's entry. `lib/erase-coverage.test.ts` names it until then (that test is
  already red on this base for `zigoals-journal-media-v1`, `zigoals-task-attachments-v1` and `zigoals:chess-computer:v1`).
  Catalogue: the reminder's label could add "and your backup schedule".
- Help (EN). Q: "Can ZIGoals back up by itself?" A: "Yes. In Settings → Your data → A copy on a schedule, choose how often.
  In Chrome or Edge on a computer you can also choose a folder once: when a copy is due, ZIGoals writes Export everything
  into it as you open the app (if the browser asks for permission again, one tap does it). Other browsers remind you
  instead. The file never leaves your device."
- What's new: "Backups: a copy of everything on a schedule, written into a folder you choose."
- Search (lead): "automatic backup", "scheduled backup", "backup folder" → Settings → Your data.
- Showcase: none (it keeps no copies). Today: nothing always visible; a toast only when a scheduled copy is due (once per
  visit, when idle).

## F4 NOVA's and ZIGi's answers — sync and appearance

- `lib/ai/local-answers/av2-sync.ts` exports `av2SyncAnswer(question, env, extra)`; cases `lib/ai/evals/as/cases-av2-sync.ts`
  (`AV2_SYNC`, EN + NL); test `lib/ai/local-answers/av2-sync.test.ts`.
- Wiring line for engine.ts (the lead), beside the other lane-2 answers, with the device's choices read where the env is
  built (without `extra` each answer says where the choice lives):
  `if (!subject) { const own = av2SyncAnswer(question, env, {sections: readExtrasSectionsChoice(storage), extrasOn: readExtrasChoice(storage).enabled, look: {theme: readTheme(), darkStyle: readDarkStyle(), font: readLook().font}, backup: readDeviceRecord(storage, BACKUP_REMINDER).data}); if (own) { const info = novaEnvInfo(env); return info ? novaWording(own, info, questionLanguage(question) === 'nl' ? 'nl' : 'en') : own; } }`
