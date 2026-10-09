# ADR-018: Session Y-Cloud, "Loose ends to zero": session decisions

Status: **In progress** on `feature/session-y-cloud`, from `main` `e30b7c6` (Merge #79, Session X-Local; live as Alpha
deploy #34). This record holds every decision Session Y-Cloud took without asking the owner (the brief asks for the
safest option that keeps the project's promises), and the owner's own decisions. A parallel lane, Session Z, may start
later on a `feature/session-z…` branch; the two lanes talk through `docs/handoff/Y_TO_Z.md` and
`docs/handoff/Z_TO_Y.md`.

## Owner decisions (2026-10-09, plan approval)
- **The brief:** twelve parts (records, the fasting time-zone bug and a time sweep, `push-reminders:210`, an independent
  security review of ZIGi's lane, the six FIX_PLAN sync rules, a WebKit job in CI, a persona decision pack, three small
  features, accessibility and polish, Friends-Alpha readiness, a live human test on #34, research notes) and three
  gates; one PR, merge commits only, Tier 3 in its own commits; never merge, deploy, dispatch, log in or handle secrets;
  no new dependency except Playwright's WebKit download in CI.
- **Plan edits (approved with the plan):**
  1. Part 2 also answers whether the server rendering in UTC while the browser is in another zone caused the one-off
     React #418 on Wealth → Portfolio (#32), fixes any server/browser date mismatch, and adds a spec that fails on any
     hydration error under a zone/date split.
  2. B5: before any outbox entry is removed or no longer written, tests prove that sync never depends on old outbox
     entries for history (this build and #34); the sweep is idempotent and never touches synced sections or anything
     not yet acknowledged.
  3. B3: the refusal of an older epoch never locks anyone out; the way out is tested end to end in Miniflare.
  4. A7: dropping the remembered-device record leaves the person's local data readable and exportable.
  5. Part 4 adds an API-key handling review (the owner uses a real Anthropic key in ZIGi); a medium+ finding there is
     fixed in this session regardless of Z's lane.
  6. Part 12 starts from the owner's reading of Anthropic's credit terms (2026-10-09) and records the relay question
     as open (owner-only until answered).
  7. Part 7 adds "Other owner decisions" (A5, A6, C4/check 9, home GPU by `.local` name), text only.
  8. If the fallback branch is used, its name goes at the top of `Y_TO_Z.md`.

## Session decisions
| # | Part | Decision | Why it is the safest option |
|---|---|---|---|
| Y1 | — | The owner-named branch `feature/session-y-cloud` is used (the git proxy accepted it on the first push, 2026-10-09 19:18 UTC); the harness's designated branch is not used, so no fallback name is needed in `Y_TO_Z.md`. | The owner named the branch in the brief and in the preview steps; Session Z looks for it there. |
| Y2 | — | The sandbox shipped Node 22.22.0; Node 24.19.0 (the repository's `.node-version`) was fetched from nodejs.org, checked against the release's `SHASUMS256.txt`, unpacked outside the checkout and linked ahead of the sandbox's Node. Nothing was installed into the repository. | Release compatibility is only established under the pinned Node (CONTRIBUTING); a checksum-verified official tarball adds no dependency. |
| Y3 | 7 | The persona mocks are built in a scratch worktree only and their captures go to the orphan branch `review/session-y-screens`; nothing of a mock reaches the feature branch. | The brief: "nothing built"; the accepted baseline stays untouched. |
| Y4 | 6 | The WebKit job joins the aggregate `web` check (so it becomes required with it) only after two consecutive green runs on the PR; until then it runs beside it, non-blocking. | The brief's rule; a new browser engine must prove itself stable before it can block a merge. |
| Y5 | 1 | ZIGI_ALIVE_X's iPhone checklist becomes 13 uniquely numbered rows: the keyboard-and-rotation check joins the panel row (5) and the lock check joins the idle row (9), so the two checks the owner asked for explicitly (dictation by hand, Wealth → Portfolio in the Showcase) fit in 13 rows; every earlier check's "pass looks like" text is kept. The column is now "#" (the old "Min" was read as a row number by the owner). X-Local's STATUS entry ("now twelve rows") is a record and stays as written. | The brief asks for 13 rows and two new explicit rows; merging two pairs of checks that happen in the same sitting keeps every check and the 15-minute promise. |
| Y6 | 1 | The #33 and #34 records cite the deploy job's own CI log (Actions API) for `VERIFIED`, the version IDs, the four reads, live prices and the policy end; the owner's values are identical and are noted as such. The dispatch times are the runs' creation times (19:34:57 and 23:20:29 UTC); the owner's "~19:43" and "~23:25" match the runs' end and middle. | A primary record is stronger evidence than a relayed value; nothing differs. |
| Y7 | 2 | `fasting.spec.ts:66` did not fail in this sandbox under any combination tried (server, test runner and browser in Europe/Brussels; the test alone three times per project; the server's own clock moved to 00:28 Brussels time): 6/6 every time. The code had the defect that produces exactly the owner's symptom, so it is fixed at that cause: with the sync writes on, the page showed only what the automatic stop's save left behind, so a save that landed late (racing the reload) or not at all kept a running clock and no note until the next minute tick, although the code's own comment promised the computed state. The page now shows the fasts with the 24-hour stop applied for the current minute and saves it as before; a change (a new fast) starts from the stopped state; the device-key path shows the computed stop when its save fails. A new test takes the save away after the reload: the note was missing on both projects before the fix, present after. Stored bytes are written exactly as before (same `endedAt`, same `stoppedBy`), so no data-format change and no Tier 3 label. | The owner's machine could not be reached; fixing the one code path that yields the symptom, with a test that reproduces it deterministically, removes the dependency on timing that a faster machine can hit consistently. |
| Y8 | 2 | The time sweep's unit runs under five zones found zone-dependent results only where a fixture describes a person in UTC but was built in the machine's zone: the Showcase builder made its clock times at device-local midnights while labelling its fictional fast "UTC", so a person in New York saw yesterday evening's fast on today. `buildShowcase(day, zone)` now builds for a named zone (the device's by default, so the app builds what it always built and UTC devices get byte-identical records) and the fast carries that zone; the test fixtures that model a UTC person pass `'UTC'` (and give their habits record the UTC zone their environment already claims). No assertion changed. | The records were wrong for real people east and west of UTC in one place (the Showcase fast); everywhere else the tests, not the app, assumed a UTC machine, and naming the zone in the fixture keeps every assertion exact under any zone. |
| Y9 | 2 | **#418 verdict (owner edit 1):** the server/browser date split is not the cause of the one-off React #418 seen on Wealth → Portfolio on #32. Evidence (local): every app page (20) in four zones (Kiritimati and Chatham, already on the next day; Pago Pago; Brussels), empty and with the Showcase, both projects, against a production server in UTC: no hydration error; the owner's exact scenario (the server's clock at 22:30 UTC, the browser at 00:30 Brussels the next day; then Chatham) with Wealth → Portfolio → Chess → Portfolio and the in-app link three times at 320/360/390 px and desktop: none; the detector catches a forced mismatch as `Minified React error #418`. X-Cloud's live run was at 14:30–15:16 UTC (16:30–17:16 in Brussels), when server and browser were on the same day. The shell renders page content after hydration and every "today" is read on the client, so no date text is part of the server's HTML. `tests/hydration-zone.spec.ts` keeps it that way. The #33 iPhone check of Wealth → Portfolio was all good (owner-reported). | A verdict needs both the reproduction attempt the owner asked for and the timing of the original sighting; the spec guards the property that was in doubt. |
| Y10 | 2 | Goals' plan days stay in UTC for a goal without a saved plan zone (`planZone`), as today: a Showcase correction made at a Brussels midnight lists on the previous day in a goal's contributions. Changing it is the open owner decision "Valuation days in UTC" (ROADMAP_SWEEP_X §4), listed again in the decision pack. | A data-meaning change the owner has reserved. |

## Assertions changed (deliberate, listed)
None yet.

## Rejected options
None yet.

## Consequences
Filled at the end of the session.
