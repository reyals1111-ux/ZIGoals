# Lane 2 registry: Tasks 2 and roadmap (`roadmap`, branch `lane2/roadmap`)

Builder's own file (team brief). Branched from `feature/session-av-2` at `1513829c` (lane2/tasks already merged there, so
the task comments are in this branch's base). Copy is plain English; the answers are English and Dutch.

## Feature 1 — photos and voice notes on a task (LEDGER #8, the part left by lane2/tasks) — built

- In a task's editor, under its Comments: "Photos and voice notes". "Add a photo" (shrunk on the device to at most 200 kB,
  the meal/receipt photo steps) and "Record a voice note" (a browser recording, MediaRecorder, at most a minute: "Stop and
  keep (0:12 of 1:00)" or "Cancel recording"). Each shows on the task (a thumbnail that opens the photo; an audio player
  for a voice note) with Remove (asks first; focus goes back to the opener or to "Add a photo"). At most 10 on a task,
  300 per scope. Kept on this device only as soon as they are added (not with Save), never uploaded, synced or sent.
- An attachment whose task is no longer in the list is marked when an editor opens and deleted 30 days later (Undo or a
  restore brings the task back first). No motion: the recording says its seconds in words.
- The empty state teaches ("Add a photo of a receipt, a part or a whiteboard, or record a short voice note").

Files: lib/tasks/attachments.ts (new), components/tasks/task-attachments.tsx (new, its own lazy chunk),
components/tasks/task-attachments.css (new), components/tasks/task-editor.tsx (one lazy import, one mount after Comments).
Tests: lib/tasks/av2-attachments.test.ts. Spec: tests/av2-task-attachments.spec.ts (the voice test is Chromium-only: its
stand-in microphone is a page-made tone, no permission prompt).

Stored (TIER 3 stored formats, new database only; no record changed): NEW IndexedDB `zigoals-task-attachments-v1`, store
`items`, key `<scope>:<attachmentId>` (scope = lib/health-aa/photos.ts `photoScope()`), value
`{taskId, kind: 'photo', blob, type: image/webp|image/jpeg, bytes ≤ 200000, at, orphanSince?}` or
`{taskId, kind: 'voice', blob, type: audio/webm|audio/mp4|audio/ogg, bytes ≤ 1500000, seconds ≤ 60, at, orphanSince?}`.
The tasks record is untouched (an older build ignores the database). Export → erase → restore: the files go out in Export
everything like the receipt photos (export only; no restore of photo files exists for any photo store today).

Lead, please register (I did not edit the shared registries):
- Erase everything: add `'zigoals-task-attachments-v1'` to `AK_DATABASES` (lib/ak-device-keys.ts) and the database list in
  lib/erase-everything.ts; the pinned list in lib/aa-device-keys.test.ts gains it after `'zigoals-money-photos-v1'`.
- Export everything (lib/export/make-everything.ts, beside `moneyPhotos`):
  `const taskFiles = kept ? [] : await Promise.all([import('../health-aa/photos'), import('../tasks/attachments'), import('../tasks/schema'), import('../device-record')]).then(([a, t, sch, dr]) => t.exportTaskAttachmentEntries(a.photoScope(), new Map(dr.readDeviceRecord(storage, sch.TASKS).data.tasks.map(x => [x.id, x.title] as const)), now)).catch(() => []);`
  and add `...taskFiles` to `photos`.
- Leaving the Showcase (lib/showcase-storage.ts, beside the money photos):
  `import('./tasks/attachments').then(m=>m.deleteTaskAttachments(SHOWCASE_PHOTO_SCOPE)),`
- Data catalogue (lib/data-health/catalog.ts), area Today, device only, not synced: "Tasks: photos and voice notes on your tasks (files in this browser)".

Help (EN): Q "Can I add a photo or a voice note to a task?" A "Yes. Open the task and use Photos and voice notes: add a
photo, or record a voice note of up to a minute. They stay in this browser only, never uploaded or synced; Export
everything includes them as files and Erase everything removes them."
What's new: "Tasks: add photos and short voice notes to a task, kept on this device."
Showcase hook: none (the Showcase keeps no photos; it can take one, in its own scope, removed when the Showcase is left).
CSS touched: components/tasks/task-attachments.css (new; theme variables only). Nothing new on Today.

## Feature 2 — ZIGi's "Hello, in place" once a day (PK-6, owner decision, follow-up 3) — built

- The delivered Studio-4 clip X001 ("Hello, in place", `transitions.greetingInPlace` in the manifest) plays over the
  resting launcher figure, for its own 2.5 s, on the first open of the app on a new day while ZIGi is on screen and
  resting. Never with reduced motion, Motion Off or ZIGi's animation Off (motion.ts `motionAllowed`), never on a sensitive
  screen or a hidden tab, never on a phone (no floating figure below 901 px), never while ZIGi is busy. It waits for the
  page's first idle, fetches the clip, checks again, then plays (the alive chunk's reaction override, so it gives way to
  any state change). A reload, another page or tab that day does not play it again. The look is unchanged: only the
  existing clip plays; no CSS, no art, no manifest change.
- The very first open of all (no day kept) only keeps the day; the hello back starts the next day.
- An automated browser (`navigator.webdriver`) gets it only when the tab's session storage holds
  `zigoals:zigi:test-hello` = "1" (like alive.ts's `zigoals:zigi:test-random`), so no other spec sees a new key or clip.
- Meet ZIGi: X001's "When" now reads "Once a day, the first time you open the app that day while ZIGi rests on screen,
  under animation." (components/zigi/state-gallery.ts).

Files: lib/zigi-hello-day.ts (new, TIER 3 own commit), components/zigi/hello-in-place.ts (new, in the alive chunk),
components/zigi/alive.ts (one import, one start, one stop), components/zigi/state-gallery.ts (X001's line).
Tests: lib/zigi-studio4/av2-hello-in-place.test.ts; lib/zigi-studio4/meet-moves.test.ts changed, labelled
`// Session AV lane 2 (PK-6 …, deliberate)`: the unused list is now `[]` and X001's line is pinned exactly.
Spec: tests/av2-zigi-hello.spec.ts (desktop project; plays once, not on the second open, never with Motion Off or reduced motion).

Stored (TIER 3, own commit): NEW localStorage key `zigoals:zigi-hello-day` — a plain local "YYYY-MM-DD" (not JSON).
Lead, please register it as a display / non-personal key (AH_DISPLAY_KEYS / NON_PERSONAL_KEYS or the ZIGi display list,
lib/ai/store/keys.ts `ZIGI_DISPLAY_KEYS`): Erase removes it; not exported (it holds nothing personal); not synced.
Help (EN): Q "Why did ZIGi wave this morning?" A "Once a day, the first time you open ZIGoals, ZIGi says hello where it
stands. It does not play with Motion Off, reduced motion or ZIGi's animation Off."
What's new: "ZIGi says hello in place once a day."
Answers: none (it holds no data the person asks about). Showcase hook: none. CSS: none. Nothing new on Today (the launcher is not part of Today's Tab stops; no element added).

## Feature 3 — Chess: ZIGoals' own engine in a Web Worker, three levels, games kept (BL-10, GAP-131) — built

- lib/chess/engine/board.ts: the engine's own board and move generator (0x88 Int8Array, moves as integers, make and
  unmake in place, Zobrist keys): castling, en passant, promotion, check, checkmate, stalemate, the fifty-move rule,
  threefold repetition and bare material. It agrees move for move with lib/chess/rules.ts (the board's authority, unchanged).
- lib/chess/engine/search.ts: iterative deepening alpha-beta (negamax) with a transposition table, best-move-first,
  captures by most valuable victim, killer and history moves, a quiescence search, a check extension, repetition and
  fifty-move draws inside the search; evaluation is material, piece-square tables (king middlegame→endgame) and a bishop pair.
- lib/chess/engine/levels.ts (constants only): Easy (1 move, 0.4 s), Medium (up to 3, about 1 s), Hard (up to 8, up to 3 s).
- lib/chess/engine/worker.ts + client.ts: the search runs in a Web Worker (`new Worker(new URL(…))`, as the importer's)
  started on the first move asked of it — a game has begun — never before; closed on leaving or "Change side or level".
  A browser without workers, a worker that errors or is silent 13 s gets the same search on the page.
- Chess → Play → "Play the computer, on this device" (components/chess/board/computer-play.tsx, inside the Play panel's
  lazy chunk; its client loads with a dynamic import on the first engine move): the three levels with what each does, the
  depth its last move looked, the game kept after every move ("A game is waiting: … Continue the game"), and per level
  "Against Medium: 1 won · 0 lost · 0 drawn". Focus goes to the board on Start and back to Start on leaving. Lichess
  play and the daily puzzle are untouched.

Files: lib/chess/engine/{board,search,levels,worker,client}.ts (new), lib/chess/computer-record.ts (new, TIER 3 own commit),
components/chess/board/computer-play.tsx (rewired to the engine; lib/chess/computer.ts kept for `gameEnd` and its tests).
Tests: lib/chess/engine/engine.test.ts (perft: start position to depth 4 = 197,281; Kiwipete 3; positions 3 (depth 4), 4
and 5; agreement with rules.ts; the draws; mate in one at every level; a mate in two Medium and Hard find and Easy does
not; time and node limits; determinism at a depth limit), lib/chess/av2-computer-record.test.ts (the record, its
tolerant read, export → erase → restore, the client with a fake worker, the page fallback).
Spec: tests/av2-chess-engine.spec.ts (three themes at 390/1440; 320 px; no worker before Start, one after; reload and continue; resign counted).
Deliberate spec change: tests/grok53/chain/l6-fourth-chain.spec.ts (BN-182): "nothing about the game is stored" became
the exact stored value after the resign (`{version: 1, tally: {easy: {won: 0, lost: 1, drawn: 0}}}`), labelled.

Stored (TIER 3, own commit): NEW `zigoals:chess-computer:v1` — `{version: 1, game?: {side: 'w'|'b', level:
'easy'|'medium'|'hard', moves: [uci] ≤ 600, startedAt}, tally?: {easy?|medium?|hard?: {won, lost, drawn}}}` (loose, each part
dropped on read when unreadable). Lead, please register it as a personal device record (av-device-keys / Export
everything / catalogue / erase / restore, area Today; catalogue label "Chess: your game against the computer and your
results by level"); not synced.
Weight: the Chess route's first load is unchanged (nothing new in chess-view.tsx); the engine is a worker file and the
client a dynamic import; levels.ts and computer-record.ts are small and sit in the already-lazy Play panel chunk.
Help (EN): Q "Can I play chess against the computer?" A "Yes. Chess → Play → Play the computer: ZIGoals' own small chess
engine runs in this browser, with no account and nothing sent. Choose Easy, Medium or Hard. Your game is kept on this
device, so you can continue it later, and each level counts your wins, losses and draws."
Help, the lead's file: the Chess answer in help-page.tsx (and its copy in lib/ai/local-answers/al-final.ts `al-chess`,
pinned to Help's words) still says "Playing a game happens on Lichess"; suggested: "You can play ZIGoals' own chess engine
on this device (Play, three levels, no account), or play on Lichess after you sign in there."
What's new: "Chess: play ZIGoals' own engine at three levels; your game is kept to continue later."
CSS: none. Showcase hook: none (no Showcase games; counts untouched). Nothing on Today.

## NOVA and ZIGi (EN + NL)

`lib/ai/local-answers/av2-roadmap.ts` exports `av2RoadmapAnswer(question, env, extra?)`: results against the engine by
level, a game waiting to be continued, and photos and voice notes on tasks (where they are; how many when the caller passes
`{attachments: {photos, voice, tasks}}`). Cases: `lib/ai/evals/as/cases-av2-roadmap.ts` (`AV2_ROADMAP`, 3 intents, 12
questions). Test: `lib/ai/local-answers/av2-roadmap.test.ts`.
Wiring line for engine.ts (beside `avAnswer`, before it): `if (!subject) { const own = av2RoadmapAnswer(question, env); if (own) return own; }`
— pass `{chess}` when the env carries it (`env.nova.chessComputer` is read when present; the lead adds it to NovaToolSources from `zigoals:chess-computer:v1`).

## UNFINISHED.md `carried` rows, re-read (item 4)

| Row | Verdict |
|---|---|
| BL-10 chess engine | **built** (Feature 3) |
| CR-22 12–13 px notice and chip text (components/ui/ui.css) | left — against a named rule: owner decision T-069 (13 Nov) keeps the notice's "On this device" fact whole on one line at these sizes (shell-ab.css; CI 1629 showed the fact shrinking to 0 px when it was changed), and the notice is shell chrome (protected area: shell navigation); the chips sit on Today inside the accepted baseline's 390 px screen ceilings (docs/STATUS.md, protected) |
| CI-1, CI-2, CI-3, CI-4, CI-6, CI-7, CI-8, CI-9, CI-10, CI-11, CI-12 (browser, runner and engine intermittents) | left — against a named rule: the team brief forbids builders Playwright, WebKit and builds, and CLAUDE.md's rule for a known CI intermittent is one job re-run, then investigation on a second failure; these are recorded families with no second failure to investigate here (the lead's CI lane) |
| CI-14 `install-chrome.test.mjs:94` latent race | left — against a named rule: the fix on record (a longer attempt limit, as at `:100`) moves its `seconds < 7` check, and an assertion is never weakened; scripts/ci is the lead's CI lane |
| CI-18 D-SYNC, A45-1 | skipped: the lead's (named in the task) |
| S-8 Today 409 px for under a second after a reload (components/phone/phone-chrome.tsx) | left — a protected area: the phone top bar and tab row are the shell navigation |
| S-10 Dutch answers carry English dates and an all-English Life review card | left — against a named rule: every such answer is pinned word for word in the NOVA corpus `lib/ai/evals/as/expected.json` (the lead's file, e.g. `hab-missed-week` "Mon, Nov 16 t/m Tue, Nov 17"); a Dutch date would move those pinned answers. For the lead: Dutch day and month names in `lib/ai/local-answers/exact/period.ts` for `lang === 'nl'`, then regenerate the corpus |
| KL-8 "English only for now" (the interface) | left — a protected area and a named rule: a Dutch interface rewrites the Today hero and slogan and the shell navigation (protected), and Help (help-page.tsx, the lead's file) |

The two "seen in passing" notes in COMPETITORS.md (the clinician report says there is no medication or symptom record;
the sleep page's header says "No score") are Health's (the body builder's pillar, LEDGER row 48), so not taken here.
