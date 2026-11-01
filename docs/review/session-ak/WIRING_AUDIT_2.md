# Session AK — Z3 wiring audit 2 (rows built after the Q1 audit)

Fresh read-only auditor (Z3). **Checked:** the production server on http://127.0.0.1:3101 (`next start`; the brief names head
**e0f93816** on `feature/session-ak-number-one`), plus the code at that head. Every outside host and every app `/api/*` route
was answered 503 by `page.route`; nothing reached a third party (`stray 0` in every run). Browser: Playwright full Chromium
(`channel: 'chromium'`), 1440×900 and 390×844 (touch), fresh profile and Showcase, under the browser lock.
Evidence (scripts and page dumps): `/tmp/claude-0/-home-user-ZIGoals/a64d6793-df8d-5435-a8c1-37163e44c609/scratchpad/z3/`
(`r1.js`…`r6.js`, `r345.out`, `r6.out`, `out/*.txt|png`). Below, `out/x` means that folder's `out/x`.

**Scope:** the ADR-036 closing rows N0–N12, B1–B5, T1–T3, G1 (BUILD list 2 #4, #6, #7, #9–#19, #21, and #20, which the
owner's "all 21 except #1 #2 #3 #5 #8" includes), G7, G8, M1–M6, the Z1 security fixes and the RELEASE_REVIEW_2 fixes.

**Checks per row** (the owner's quality bar, follow-up 2): **R** reachable from the UI (phone and desktop) · **E** wired end
to end (UI → store → Export everything / Restore / Erase / catalog where it stores) · **S** works in the Showcase with a
labelled example where data applies · **F** works on a fresh empty start and teaches · **U** unit tests · **B** a browser spec
on the UI path · **H** Help answer. Statuses as in WIRING_AUDIT.md: Working · Partly working (exact gap named) · Not reachable ·
Stub. A fix row is Working only if it holds in the build **and** a test would fail if it broke.

## Summary

| Class | Count |
|---|---|
| Working | 57 |
| Partly working | 25 |
| Not reachable | 1 |
| Stub | 0 |
| Rows counted | 83 |
| Not counted: owner decisions / recorded / not reproduced | 7 (R2-7, R2-24, Z1A-8 rule, Z1B-7, Z1B-9, Z1C-L3, Z1A lead leftovers) |

**Dead code found (built, never mounted or applied):**
- `components/nova/chat/nova-duo.tsx:34` `NovaDuo` (N1's "Duo view") — imported nowhere; `setDuo` in
  `components/nova/chat/nova-chat.tsx:169,204,212` writes a state nothing on screen reads (`lib/nova/bridge.ts:189-190`).
- `components/tasks/tasks-widget.tsx:18` `TasksWidget` ("exported for NOVA", T1) — imported nowhere; NOVA's widget catalog
  (`lib/nova/widgets/catalog.ts:24-37`) has no tasks widget.
- `components/focus/focus-widget.tsx:22` `FocusWidget` (the running Pomodoro timer "exported for NOVA", T3/N2) — imported
  nowhere; NOVA's "Focus" widget (`components/nova/widgets/focus.tsx`) only counts this week's sessions.
- `components/motion/motion-2026.css:83,116,143` `.zg-nebula-border`, `.zg-glass`, `.zg-aurora` (M2) — no element uses them.

No feature flags that never turn on, no TODO/"coming soon" stubs and no unlabelled example data were found in the new code
(grep over components/nova, notes, tasks, focus, motion, money-photos, lib/nova, notes, tasks, ics, motion and the G1 libs).
Every Showcase surface visited carried its label (NOVA "Showcase · fictional example data", Notes "Fictional Showcase notes,
labelled as examples", Tasks "Showcase · fictional. These example tasks are not yours", Your numbers "Showcase: fictional
example readings", the Pomodoro "SHOWCASE", the agenda's imported calendar "Example").

**Store wiring (static):** every new key is in `AK_PERSONAL_KEYS` (`lib/ak-device-keys.ts:52-77`, erased by the account erase),
in Export everything (`lib/export/everything.ts`) and in Restore's `DEVICE_PARTS` (`lib/restore/plan.ts:132-165`: tasks,
insightFeedback, cycle and novaBriefs with the Health choice, scales, healthNumbers, novaHermes, novaSetup, novaWorkflows,
novaBridge, nova, calendarImport, notes). The two new IndexedDB stores (`zigoals-notes-photos-v1`, `zigoals-money-photos-v1`)
are in `lib/erase-everything.ts:23,25`, `AK_DATABASES`, and exported as files (`components/export-everything.tsx:43-50`).
Exception: NOVA's shared memory (`zigoals:ai-memory:v1`) is exported and erased but never restored (N7 below).

**Navigation (browser):** desktop sidebar on a fresh start: Today, Goals, Habits, Health, Wealth, Activity, **NOVA**,
Checklist, Settings, Help (`r1` nav-fresh). Tasks, Notes and the Journal are not in the desktop sidebar (owner decision R2-10)
but are in NOVA's left panel ("Your pages": Notes, Journal, Tasks, Agenda, Focus and music, Checklist, Review, Settings;
`out/r1-nova-ask.png`), in Search (`/` → "tasks" → page "Tasks"; "notes" → "Notes"; "nova" → "NOVA"; "journal" → "Journal";
r4, r6) and on the phone's More sheet (fresh: Activity, NOVA, Checklist, Tasks, Notes, Journal…; r3). ⌘/Ctrl + J opens the
"ASK NOVA" bar on any page (r2). PWA shortcuts include "NOVA" and "Capture a note" (`public/manifest.webmanifest`).

## Rows

### N — NOVA

| Row | Status | Evidence / exact gap |
|---|---|---|
| N0 research (NOVA.md) | Working | A document (docs/research/session-ak/NOVA.md); its conclusions show in Help `nova-brain` (subscriptions don't work, local first). Nothing to reach. |
| N1 one engine, two companions (shared history, hand-offs, delegation, **Duo view**) | Partly working | R: "Continue in NOVA" in ZIGi's chat (`components/ai/ai-chat.tsx:296`); "Ask ZIGi about a page" under NOVA's composer (`out/r1-nova-ask.png`); delegation in two voices inside NOVA's chat. S: `showcaseNovaChat` (lib/nova/bridge-showcase.ts) — a labelled duo conversation. B: nova-chat "Continue in NOVA…", "delegation (MOCK model)…". U: lib/nova/bridge*.test.ts. H: `nova-what`. **Gap:** the "Duo" view on the dashboard (both figures side by side while a task uses both) is dead code: `NovaDuo` (`components/nova/chat/nova-duo.tsx:34`) is mounted nowhere, so the state nova-chat writes is never shown; the Showcase NOVA page shows no Duo (r2 `Duo:N`). |
| N2 the NOVA page (opening, orb, chat, dock, widgets, chips, panels, make it yours, share setup, entry points) | Partly working | R: sidebar NOVA, phone More → NOVA, Search, ⌘/Ctrl+J bar, PWA shortcut (r1–r3). E/S/F: fresh NOVA teaches ("Build NOVA's brain · Start the guide", empty widgets teach: "Nothing is planned yet…", `out/r1-nova-fresh.txt`); Showcase is labelled, widgets read real Showcase records ("2 of 5 planets lit", "You slept 7 h 17 min", `out/r2-nova-sc.txt`); chat streams, Conversations with search and pins, Save as Markdown (`out/r2-nova-convs.txt`); Customize the view offers Orbit/Bento/Focus/Minimal, accent, Share my NOVA setup, Import a setup, Open ZIGoals on NOVA (r6). B: nova-dashboard (opening once, reduced motion, takeover, Fullscreen/Esc, panels, widgets add/move/resize/remove, quick access, share setup, Behind the intelligence, names/themes, phone, tablet), nova-chat, exploratory-exf. H: `nova-what`, `nova-yours`. **Gaps:** (1) the "active focus timer" widget asked for in N2 is not on NOVA: `FocusWidget` (`components/focus/focus-widget.tsx:22`, the running Pomodoro) is dead code and NOVA's "Focus" widget only counts the week's sessions; (2) "each widget opens its page with a shared-element transition" is not built (M1 records it); (3) no browser spec for the layouts, accent, persona name/avatar, the Activity panel or the per-task model picker. |
| N3 Build your own NOVA (10 planets, checks) | Working | R: NOVA's card "Start the guide" / "Continue the guide", `/app/nova/setup` (r1). S: `showcaseNovaSetup` (lib/nova/setup.ts:110; each check note starts "Showcase example:"); the Showcase card reads "Continue the guide" (`out/r2-nova-sc.txt:71`). F: "Ten planets… nothing checked yet". B: nova-setup (7 tests: every planet's check with MOCK local and cloud servers, reduced motion, phone). U: lib/nova/setup.test.ts. H: `nova-brain`, `nova-privacy`. |
| N4 NOVA reads everything (packs, What NOVA can see) | Working | R: planet 5 "What NOVA can see" (`components/nova/setup/steps/scopes.tsx`), NOVA → Permissions. E: R2-2/RA follow-up make on-device answers and tools follow NOVA → Permissions (0ef32f0d). B: nova-setup "planets 5 to 10: scopes with the exact pack", nova-chat R2-2 (Health waits for Permissions). U: lib/nova/scopes.test.ts, lib/ai/context-pack. H: `nova-privacy`. |
| N5 NOVA acts (confirm cards with Undo for every pillar) | Partly working | E: a NOVA card adds a record and Undo restores it byte for byte (nova-chat "a confirm card in NOVA…", log-water); workflow cards are confirmed and undone (nova-workflows). U: lib/ai/actions/plan-nova.test.ts. H: `nova-safety`. **Gap:** the five NOVA-only cards (`add-task`, `log-workout`, `capture-note`, `file-note`, `start-focus`; lib/ai/actions/schema-nova.ts) are exercised by unit tests only; no browser spec confirms or undoes one. |
| N6 briefs and 8 workflows (+ custom) | Working | R: "Your day", NOVA briefs widget, Workflows button (r6 button list). S: `showcaseNovaWorkflows`; briefs composed from Showcase records ("Showcase: made from fictional example records", `components/nova/panels/nova-briefs.tsx:68`). F: "No brief yet… Set up daily briefs" (`out/r2-nova-sc.txt:137`). B: nova-workflows (Review my week with a MOCK model, save a template, Briefs marked read). U: lib/nova/briefs.test.ts, workflows tests. H: `nova-briefs`. |
| N7 long-term memory (see, edit, pin, forget, export; in export, **restore**, erase, catalog) | Partly working | R: NOVA → Memory panel, planet 6. B: nova-workflows "Memory: remember a person, pin it, forget it and undo; one memory with ZIGi". U: lib/ai/memory tests, frozen fixtures. E: exported (`lib/export/everything.ts:118` aiMemory), in the catalog (lib/data-health/catalog.ts), erased. H: `nova-briefs`, `af-zigi-memory`. **Gap:** Restore never brings memory back — no `aiMemory` part in `DEVICE_PARTS`, and `NEVER_RESTORED` says "ZIGi's settings, notes…" (`lib/restore/plan.ts:204`); the owner's N7 asks for restore. |
| N8 always open (start page, picture-in-picture, unread briefs, ⌘/Ctrl+J) | Partly working | R: Customize the view → "Open ZIGoals on NOVA" (r6); "Open a mini window that stays on top" on NOVA's top bar where Document PiP exists (r6; `components/nova/nova-dashboard.tsx:121-131`); ⌘/Ctrl+J bar (r2); PWA shortcut NOVA. B: exploratory-exf EX-3 (⌘/Ctrl+J), install-manifest (shortcut), nova-workflows (briefs read). **Gap:** no browser spec for "Open ZIGoals on NOVA" (the start-page redirect, incl. Z1C-L1's re-check) or for the NOVA mini window; N10 asked for "the start-page setting". |
| N9 safety and privacy | Working | U: lib/ai/privacy-cross-path, nova-injection, lib/nova/zf-security.test.ts, lib/ai/untrusted.test.ts. B: nova-setup (Strict refuses a cloud, Guarded previews the redacted text), nova-hermes (redacted copy for an unconfirmed Hermes). H: `nova-privacy`, `nova-safety`; docs/PRIVACY.md. CSP unchanged. |
| N10 tests (units, specs, **NOVA journey**, evals, REAL_MODEL_TODO) | Partly working | Units, five nova-* specs, evals (lib/ai/evals/corpus-nova.ts, local-answers/nova-evals.ts) and REAL_MODEL_TODO cases exist. **Gap:** there is **no NOVA journey in tests/journeys** (j01–j11 never mention NOVA; N10 asked for fresh start → NOVA on-device → guide → mock local model → brief → workflow → ZIGi delegation → actions with Undo → share setup → erase, and N11 a Hermes step in it). |
| N11 Hermes Agent (research, brain, privacy rule, delegation, summary, 10-step guide) | Partly working | R: `/app/nova/hermes`, NOVA's right panel "Brain setup → Technical details: … Hermes Agent", Search "hermes" → Help. F: "Already run Hermes Agent…? …ZIGoals runs no server for it" (r1). B: nova-hermes (5 tests with a MOCK gateway: commands per OS, gateway down, CORS, wrong key, privacy, the summary). U: lib/nova/hermes.test.ts. H: `nova-hermes`. **Gaps:** no labelled Showcase example (the guide and right panel show nothing connected in the Showcase; no Showcase Hermes record — the owner's message 3 asks for one); no Hermes step in a NOVA journey (see N10). |
| N12 NOVA takes the whole screen (left/right panels, stage, Fullscreen, phone minimal view) | Working | R/E: desktop left panel (pillars, pages with counts, agents), stage with clock, "Your day", quick access, command field; right panel folded by default (R2-3); phone: orb, "Message NOVA", chat sheet (r3). B: nova-dashboard at 1024/1440/1920 and 390 (panels remembered, takeover, Fullscreen and Esc order, phone minimal view, tablet). H: `nova-yours`. |

### B — Notes

| Row | Status | Evidence / exact gap |
|---|---|---|
| B1 capture inbox (text, voice, device-only photo) | Working | R: Quick add → Note, Search "Capture a note", NOVA dock, PWA shortcut "Capture a note" (`/app/notes?capture=1`), Notes page. E: notes in `zigoals:notes:v1`, photos in `zigoals-notes-photos-v1` (exported as files, erased). S: `showcaseNotes` ("Fictional Showcase notes, labelled as examples", r2). F: "Capture a note · Save to inbox" (r1). B: notes "capture from Quick add…", "the palette's Capture a note…". H: `notes-what`. Note: voice and photo capture have no browser spec. |
| B2 daily notes with "This day" strip | Working | R: Notes → Today. B: notes (filing into today's note, then the "This day" region is visible). U: lib/notes tests. H: `notes-what`. Note: the spec checks the region shows, not its links. |
| B3 [[links]], backlinks, graph and list view | Working | B: notes "[[link]] to a habit… backlink in that habit's Details", "[[link]] to a goal… (Showcase goal)", "the graph: bodies reached with Tab… reduced motion opens the list first", exploratory-exf EX-15. H: `notes-what`. |
| B4 one search across notes and the four pillars | Working | R: Search palette finds notes (notes spec "notes are found in the palette"); NOVA's search button opens it. U: lib/search/notes-everything (`searchEverything`, NOVA's scopes). H: `notes-what`. |
| B5 Markdown ZIP export/import; "Chat with my notes" | Partly working | Export/import: B notes "Markdown export is a ZIP… import shows a plan, then Import, then Undo"; Z1B-5/6 fixes wired (`components/notes/notes-files.tsx:34,44,46,67`). **Gap:** "Chat with my notes" has no UI entry of its own (it is NOVA's chat with Notes allowed in Permissions, via the `search_notes` tool, `lib/ai/tools/nova-tools.ts:114`) and no browser spec; only unit tests and the eval case `nova-notes-search`. |

### T — Tasks and time

| Row | Status | Evidence / exact gap |
|---|---|---|
| T1 tasks and goal next-actions on the Agenda **and as a NOVA widget** | Partly working | R: phone More → Tasks, Search "tasks", NOVA left panel; `/app/tasks` fresh teaches "Your list starts here" (r1); Showcase "These example tasks are not yours", 5 open, 1 overdue (r2). B: tasks-time "a task with a day, a time and a goal: on the Agenda's day view and its goal's page; ticked there with Undo". H: `tasks-what`. **Gap:** no NOVA tasks widget — `TasksWidget` (`components/tasks/tasks-widget.tsx:18`, "exported for NOVA") is dead code and `lib/nova/widgets/catalog.ts:24-37` has no tasks entry; NOVA shows only a "Tasks due" count in its right panel (`components/nova/nova-right.tsx:120`). |
| T2 calendar .ics import (read-only on the Agenda) | Working | R: Agenda → "Import a calendar" (r1, r2). S: `showcaseCalendarImport`, shown with "Example" (r2). B: tasks-time "import an .ics file…; remove the import with Undo". U: lib/ics (incl. Z1B-3/4 cost tests). H: `tasks-what`. |
| T3 Pomodoro from a task, with the ambient player **and a NOVA widget** | Partly working | R: Journey → Focus → Pomodoro, "Bell and breaks" (r6); started from a task. S: `withShowcasePomodoro` (labelled SHOWCASE, r6). B: tasks-time "a Pomodoro started from a task…", g1a-focus-rounds. H: `tasks-what`, `ak-focus-bell`. **Gap:** the NOVA widget for a running Pomodoro (`components/focus/focus-widget.tsx:22`) is dead code; NOVA's Focus widget shows the week's count only. |

### G1 — BUILD list 2

| Row | Status | Evidence / exact gap |
|---|---|---|
| #4 Your numbers (BP and lab values) | Working | R: Health → Measurements → "Your numbers: blood pressure and lab values". F: "Your readings. Not a diagnosis… No readings yet. Type the two numbers…" (r6). S: `showcaseHealthNumbers`, "Showcase: fictional example readings, not a real person's" (r6). B: g1a-health-numbers (fresh, Showcase, report section). H: `ak-your-numbers`. |
| #6 recent categories first | Working | B: g1b-recent-categories (fresh keeps order, most used lead, Showcase). U: lib/money-log tests. H: `ak-money-quicker`. Derived; no storage. |
| #7 running total of selected entries | Working | R: Wealth → Spending "Select" (r4). B: g1b-selection-total (fresh, mixed currencies, Showcase). H: `ak-money-quicker`. |
| #9 card mode for the review inbox | Working | R: Money tools → "To review" → "One at a time" (r4). S: `showcaseMoneyReview` (lib/showcase-data.ts:211). B: g1b-review-cards (fresh, keyboard and buttons with Undo, Showcase cards labelled "SHOWCASE DATA"). H: `ak-money-quicker`. Note: the Showcase test's title still says "(once the lead wires showcaseMoneyReview)" though it is wired. |
| #10 a photo on a money entry | Working | R: Money tools → "Receipt photos" (r4). E: `zigoals-money-photos-v1`, exported as files, erased. B: g1b-money-photos (fresh teaches, add/see/replace/delete, Showcase). H: `ak-receipt-photos`. Note: no Showcase photo exists (photos are the person's own; the Showcase entries can take one). |
| #11 cash forecast, next 60 days | Working | R: Money tools → "Next 60 days" (r4). B: g1b-cash-forecast (fresh teaches, lowest point, unknown not zero, labelled Showcase). H: `ak-cash-forecast`. |
| #12 your own scales | Working | R: Journal → "Your own scales" (r4), Search. S: `showcaseScales`. B: g1a-scales (fresh, Showcase). H: `ak-scales`. |
| #13 start from a prompt | Working | R: Journal → "Start from a prompt" (r4), Search. B: g1a-journal-prompts (fresh, Showcase). H: `ak-journal-prompts`. |
| #14 wrap-up: what's moving to tomorrow | Working | B: g1a-wrap-up-tasks (move/let go with Undo; a device with no task gets a teaching line). U: lib/wrap-up-tasks. H: `ak-wrap-up-tasks`. |
| #15 focus intervals (bell, breaks) | Working | R: Journey → Focus → Pomodoro → "Bell and breaks" (r6). S: labelled Showcase Pomodoro. B: g1a-focus-rounds. H: `ak-focus-bell`. |
| #16 cycle log (opt-in) | Working | R: Settings → Your pages & buttons → Cycle log, then Health → Diary (r4 "Cycle", "an estimate"). S: `showcaseCycle` (switched on). B: g1a-cycle (hidden by default, on in Settings, log, hide keeps entries; labelled Showcase with a range). H: `ak-cycle`. Restore only with the Health choice. |
| #17 share a net-worth moment | Working | R: net-worth milestones → "Share this moment" (r4). B: g1b-networth-share (fresh: nothing to share; per cent only until "Include numbers"; Showcase says Example). H: `ak-spending-map`. |
| #18 spending map (treemap) | Working | R: Spending → This month by category → Map (r4). B: g1b-spending-map (fresh, keyboard, table, 320 px, Showcase). H: `ak-spending-map`. |
| #19 calculator in money amount fields | Working | B: g1b-amount-calculator (money log, monthly budget, EX-9, Showcase). U: parser tests. H: `ak-money-quicker`. |
| #20 a chat that isn't kept ("Don't keep this chat") | Not reachable | Not built and not recorded. COMPETITORS_2.md #20 is inside the owner's "all 21 except #1 #2 #3 #5 #8", but the G1 closing row (ADR-036) lists #4, #6, #7, #9–#19, #21 only, §4 "Recorded, not built" does not name it, and no such switch exists in components/ai or components/nova. |
| #21 "Was this useful?" on weekly insights | Working | R: Review → under ZIGi's note "Useful" / "Not for me" (r4). F: a fresh start asks nothing under a quiet note. B: g1-insight-feedback (fresh, Showcase with Undo). H: `ak-note-useful`. |

### G7, G8

| Row | Status | Evidence / exact gap |
|---|---|---|
| G7 F10's Lows and Infos | Working | Security hardening (CJK recovery words, everyday lists, hidden in what leaves, refuse past 500, summaries); unit tests, vendored BIP-39 lists checked word for word (06e86e00). Surfaces through the existing recovery-words line (Help `ak-safety-more`). |
| G8 ZIGi and NOVA tools for G1 | Partly working | U: lib/ai/actions/plan-g1.test.ts, lib/ai/local-answers/g1.ts, 16 G6 cases, corpus-g1 (unit 1324). **Gaps:** no browser spec drives any G8 tool or card on the UI path (log-blood-pressure, rate-scale, move-task, amount calculator; j08 covers only the earlier AK cards); Help `ak-zigi-more` still lists only F9's questions and names none of the new reads or cards. |

### M — motion and design

| Row | Status | Evidence / exact gap |
|---|---|---|
| M0 motion research | Working | A document (MOTION_2026.md). |
| M1 web-native motion | Partly working | Built: view transitions (`app/app/template.tsx`), once-only reveals, chart strokes, the Wealth ticker, the completion moment. B: motion-m (Full/Calm/Off, transition overlay, completion, ticker). H: `ak-motion-calm`. **Gap:** shared-element transitions between a card or widget and its page (the owner's M1 and N2 ask) are not built (the ADR row says so). |
| M2 next-gen surfaces | Partly working | Built: glass refinements, NOVA's Bento layout, the landing bento, the sidebar starfield on scroll (`components/shell/sidebar-sky.css`). **Gaps:** the M2 utilities `.zg-glass`, `.zg-aurora` and `.zg-nebula-border` (`components/motion/motion-2026.css:116,143,83`) are applied to no element (dead CSS); no bento for Today's non-protected area or the pillar overviews; only unit tests (no browser spec for any M2 surface). |
| M3 ambient and attention | Partly working | Built: completion ring and sparks (Habits card, a done task, Goal reached), a 12 ms vibration following the Checklist's switch (`lib/motion/haptics.ts`), skeleton sheen (G3), the NOVA orb (N2). B: motion-m "completing a habit…". **Gap:** "live activity chips" and "optimistic UI with calm confirmation" from M3 are not built or recorded. |
| M4 Motion: Full / Calm / Off | Working | R: Settings → Appearance → Motion. B: motion-m (Calm saved, mirrored on `<html>`, survives reload; Off/reduced: nothing runs). U: lib/motion/level.test.ts. H: `ak-motion-calm`. |
| M5 performance before/after | Partly working | Before measured (scratchpad m5/before.json); **the after measurement (INP, long tasks on Today, NOVA, Wealth, Earn) is not done** (ADR row: "after pending"). |
| M6 the landing's NOVA chapter | Working | landing/index.html `#nova` (labelled "Example data", orb, reveals, bento); scripts/landing-nova-m6.test.mjs (5 tests), check:landing. A separate static site the owner deploys. |

### Z1 — security fixes

| Row | Status | Evidence / exact gap |
|---|---|---|
| Z1A-1 / Z1B-1 photos through the privacy mode | Working | `lib/ai/guarded-stream.ts` for label, lab-sheet and receipt reads; U guarded-stream.test.ts. |
| Z1B-10 photo send confirmation | Partly working | `components/ai/photo-send-confirm.tsx` (where it goes, what a sheet shows, "Send to …"); Help `nova-safety`. **Gap:** no test (unit or browser) renders the confirm sheet or proves nothing is sent before "Send to …". |
| Z1A-2 untrusted replies never auto-accepted | Working | `lib/ai/untrusted.ts`; U untrusted.test.ts; Help `nova-safety`. |
| Z1A-3 read aloud in Strict | Working | `lib/ai/voice-privacy.ts`; U untrusted.test.ts "Z1A-3". |
| Z1A-4 hand-offs follow NOVA → Permissions | Working | `lib/nova/bridge-pack.ts:33-63`; U zf-security.test.ts; B nova-chat R2-2. |
| Z1A-5 imported workflows | Working | `approveImported`, `mayImportInstruction`; U zf-security.test.ts; B nova-workflows (template exported, import shown first). |
| Z1A-6, Z1A-7 Hermes and Ollama-cloud recognition | Working | `canonicalLocalBase`, `lib/nova/cloud-models.ts`; U zf-security.test.ts. |
| Z1A-9 – Z1A-12 (brief rewording, guide scopes, recovery words for Hermes, speech in Strict) | Working | U zf-security.test.ts, untrusted.test.ts "Z1A-12". |
| Z1B-2 briefs restore only with Health | Working | `lib/restore/plan.ts:161` (novaBriefs, Health); U restore.test.ts. |
| Z1B-3, Z1B-4 .ics cost | Working | lib/ics/import-cost.test.ts, expand tests. |
| Z1B-5, Z1B-6 notes ZIP budget and Showcase notes | Working | lib/notes/import-budget.test.ts, markdown tests; wired in `components/notes/notes-files.tsx:34-67` (Stop button, `notesExportName`, `{showcase}`). |
| Z1B-8 hex-group regex | Working | lib/emergency-sheet/secrets-redos.test.ts. |
| Z1C-L1 start-on-NOVA re-check, Z1C-L2 ⌘/Ctrl+J not over a dialog | Partly working | Fixed in `components/nova/nova-entry.tsx:36,44` (e0f6d56a). **Gap:** the commit adds no test; nothing would fail if either check were removed. |
| Z1C-L4 landing privacy claim | Partly working | landing/index.html corrected. **Gap:** no landing claim test pins the new wording. |
| Not counted | — | Z1A-8 (owner's rule; Strict copy now says it, zf-security "Z1A-8"), Z1B-7 and Z1B-9 (Info, recorded), Z1C-L3 (accepted), Z1A's "for the lead" leftovers (AboutToSend before "Ask my Hermes", `/health` platform check, `/api/show`, Docker advice) — recorded in Z1A_SECURITY.md, not built. |

### RELEASE_REVIEW_2 fixes

| Row | Status | Evidence / exact gap |
|---|---|---|
| R2-1 NOVA's phone chat reads records (Blocker) | Partly working | Fixed (52bd5286, `data-ai-dialog` on `components/nova/nova-sheet.tsx`). Verified: on the phone the Showcase "How far am I on my Emergency fund goal?" answers "45% of the target — 9,000.00 USD of 20,000.00 USD", no "Paused on this private screen" (r3). **Gap:** no spec asserts it; the phone test in nova-dashboard.spec.ts:278-295 sends a question but checks only that the sheet opens (the review's proposed spec was not added). |
| R2-2 natural questions answered on the device | Working | "What is due today?" fresh → "Habits: none kept yet. Tasks: none due today…" (r1); Showcase "How far am I on my goals?" → 5 goals with figures (r2). B: nova-chat "R2-2…". U: nova-evals (53 cases). |
| R2-3 consumer-first NOVA first screen | Working | Right panel folded, technical details under "Brain setup" (`out/r2-nova-sc.txt:174`); B nova-dashboard. |
| R2-4 one sentence for NOVA and ZIGi | Working | "NOVA is your command center for everything; ZIGi is the same assistant inside each page" (r1); B nova-dashboard, settings-groups, page-order-aa. |
| R2-5 NOVA dark island in Light | Working | B nova-dashboard "in Light, the phone's bottom bar wears NOVA's night…"; ADR owner decision recorded. |
| R2-6 "Goals & money" keeps the chain off | Working | B consumer-first-x1, onboarding. |
| R2-8 Health and Wealth length | Working | B pillar-phone-length (ceilings, fresh and Showcase). |
| R2-9 Today repeats less | Working | U lib/today/next-money-steps.test.ts; B coherence, run10-widget-overview, today-phone-folds. |
| R2-10 finding Notes and Tasks | Partly working | Phone More and tablet rail list NOVA, Tasks, Notes, Journal (r3); Search has page results "Tasks", "Notes", "Journal" (r4, r6); B page-marks, pages-visibility, phone-shell. **Gap (owner decision):** not in the desktop sidebar (ADR "R2-10 (desktop)"). |
| R2-11 one onboarding question | Working | B onboarding, consumer-first-x1. |
| R2-12 welcome extras, Habits kept | Working | B consumer-first-x1; U templates.test.ts. |
| R2-13 Quick add order and Note row | Working | B logo-quickadd-goals-header (an intro-video spec that fails locally by design, CLAUDE.md). |
| R2-14 energy tile names weigh-ins | Working | Showcase tile no longer says "28 of 14 days", names weigh-ins (r5). U energy-progress.test.ts. |
| R2-15 unknown is not zero | Partly working | Fresh Health shows "—", no "0 kcal"/"Protein 0 g"; Habits' weekday strip hidden with no habit (r5). **Gaps:** the pre-made quick counters stay (owner decision, ADR); no test pins either fix. |
| R2-16 Settings backup wording | Working | B copy-polish, settings-groups, storage-health-wording. |
| R2-17 Tasks list first | Working | B tasks-time. |
| R2-18 Notes capture box | Partly working | Fresh Notes: one-line intro "Journal is how the day felt; a note is anything you want to keep", Capture/Save to inbox (r1). **Gap:** no test references the change. |
| R2-19 Health header actions | Partly working | Fresh Health header: Log weight, Log water, Log food; no "Privacy & backups" (r5). **Gap:** no test. |
| R2-20 Wealth total copy | Working | "no exchange rate is assumed", no "coming later" (r5); B ah-numbers, ui-design-pass. |
| R2-21 Showcase habit whys | Partly working | The filler line appears 0 times in the Showcase Habits (r5). **Gap:** no test. |
| R2-22 greeting read once | Working | B nova-dashboard "the greeting is in the page once". |
| R2-23 "Finished" alone | Working | B goals-best-aa. |
| R2-25 one-tap habit ideas | Partly working | Fresh Habits empty card: "+ Drink water · + Walk · + Read" (r5, `out/r5-habits-fresh.txt:38-43`). **Gap:** no test. |
| Not counted | — | R2-7 (owner decision, not fixed), R2-24 (not reproduced). |

## Counts by section

| Section | Working | Partly | Not reachable |
|---|---|---|---|
| N0–N12 (13) | 6 | 7 | 0 |
| B1–B5 (5) | 4 | 1 | 0 |
| T1–T3 (3) | 1 | 2 | 0 |
| G1 (16 incl. #20) | 15 | 0 | 1 |
| G7, G8 (2) | 1 | 1 | 0 |
| M0–M6 (7) | 3 | 4 | 0 |
| Z1 (14 counted) | 11 | 3 | 0 |
| R2 (23 counted) | 16 | 7 | 0 |
| **Total (83 rows)** | **57** | **25** | **1** |

Of the 25 Partly rows: 5 are dead code or an unbuilt part (N1 Duo view, N2 focus-timer widget and shared-element transition, T1 and T3 NOVA widgets, M2 unused utilities), 5 are an unbuilt or unmeasured part with no dead code (N7 restore, N11 Showcase example, M1 shared elements, M3 activity chips and optimistic UI, M5 after measurement), 1 is an owner decision (R2-10 desktop), and the rest lack a test on the UI path (N5, N8, N10, B5, G8, Z1B-10, Z1C-L1/L2, Z1C-L4, R2-1, R2-15, R2-18, R2-19, R2-21, R2-25).
