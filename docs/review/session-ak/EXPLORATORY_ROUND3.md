# Session AK P7: exploratory round 3 (NOVA, the local-model and Hermes guides, Notes, Tasks)

Owner follow-up 4, item P7: "Exploratory round 3 on NOVA, the Hermes and local-model guides (mocked servers: online,
offline, wrong key, CORS blocked), Notes and Tasks at 1440 and 1920 px; bugs fixed at their cause with tests." A fresh
tester who built none of it. Earlier rounds (docs/review/session-ak/EXPLORATORY_BUGS.md, EX-1 … EX-19) are not repeated.

**Build tested.** The production server on 127.0.0.1:3101 served `1d6902be` (its build folder, `scratchpad/ak-build`),
an ancestor of the branch head. Every cause below was checked in the head's code: `lib/nova/hermes.ts`,
`lib/nova/local-servers.ts`, `components/nova/hermes/**` and the chat's clipping are unchanged from `1d6902be` to the head;
NOVA's Tasks widget (EX3-2) is newer than the served build, so it was reproduced in a DOM test instead.

**Method.** Playwright scripts (`channel: 'chromium'`) under the browser lock, every `/api/**` answered 503. The local
servers were **real HTTP servers** on their real ports (Ollama 11434, LM Studio 1234, llama.cpp 9931 and 8080, Hermes 8642)
in four states, so the browser itself enforced CORS: *online* (CORS headers, Hermes checks the bearer key), *offline*
(nothing listening: connection refused), *wrong key* (401 with Hermes's own error body) and *CORS blocked* (403 and no
`Access-Control-Allow-Origin`, as Hermes and Ollama answer an origin they do not allow). A first pass with `page.route`
mocks was discarded for the CORS state: Playwright's fulfilled responses are not CORS-checked, so it showed a readable 403.
Each bug names its runs.

**Privacy.** Nothing left the device. The only requests not to 127.0.0.1:3101 went to the localhost model ports, and only
after "Find models on this computer", a Hermes planet's test, or a question to a brain on this computer. The Hermes chat
request carried no tools.

## Summary

| ID | Severity | One line |
|---|---|---|
| EX3-1 | Major | NOVA chat in a short window: the bottom of the composer ("Let ZIGi answer here", "Open ZIGi on …", the Page list) is clipped and unreachable; a press lands on `.nova-foot` (lead's report, tests/nova-chat.spec.ts:132) |
| EX3-2 | Minor | NOVA's Tasks widget, fresh start: adding the first task drops the focus to the page; the next letter typed is a NOVA shortcut |
| EX3-3 | Minor | "Find models on this computer": a server that asks for a token is reported as "The key was not accepted. Check it in Settings … or create a new one at your provider"; a server that blocks this site (CORS) reads the same as one that is not running |
| EX3-4 | Major | Hermes as NOVA's brain, then a new API_SERVER_KEY: the guide says "Checked: it works", but NOVA's chat keeps sending the old key and fails with 401 |
| EX3-5 | Minor | Hermes test with no key pasted or kept: "Hermes refused the key."; after a refused key the guide says "Gateway not reachable" though it answered |
| EX3-6 | Minor | A Hermes that never answered (offline, wrong key, CORS) is saved as "your Hermes": NOVA lists "Hermes Agent" under its agents and offers "Ask my Hermes" |

**Counts:** 2 Major, 4 Minor.

---

## EX3-1 · Major · NOVA chat controls clipped under the foot in a short window

- **Where:** /app/nova on a computer, chat open, "Ask ZIGi about a page" open. 1366×640 and 1280×600 in a fresh start;
  1280×720 in the lead's Showcase run (tests/nova-chat.spec.ts:132, log `scratchpad/r3-b8.log`: "`<div class="nova-foot">`
  intercepts pointer events" on "Let ZIGi answer here", 58 retries).
- **Steps:** Open NOVA, type "hello" + Enter, type a question in the composer, open "Ask ZIGi about a page".
- **Expected:** every control of the open chat can be pressed (scrolled into view if needed), at any width 768–1920.
- **Actual (measured, 1366×640):** the panel (`.nova-talk`) is 380 px tall; the chat's header (106) + conversation padding
  (36) + composer with the hand-off tools (283) need 425. `.nova-chat` has `overflow: clip`, so the last 47 px of the
  composer are cut off and cannot be scrolled to (`scrollIntoView` changes nothing): the Page list's centre is at y=645 of
  640, "Let ZIGi answer here" and "Open ZIGi on Today" at y=630, where `elementFromPoint` is `.nova-foot` (the foot's
  padding under the panel). At 1280×600 they are outside the window. Runs: probe s6 twice (before and with the fix
  injected), spec `exploratory-round3` once, the lead's run once.
- **Cause:** `components/nova/chat/nova-chat.css` `.nova-chat{overflow:clip}` with `.nova-composer-wrap` unable to shrink
  (`min-height: auto`) inside `components/nova/nova.css` `.nova-talk` (height capped by the foot). The head's P3 layout
  (ND-7) gives the panel the stage's height, which helps; nothing guaranteed it at any height.

## EX3-2 · Minor · NOVA Tasks widget: the first task drops the focus

- **Where:** NOVA → Tasks widget (Medium or Large), a device with no task yet.
- **Steps:** Type "Water the plants" in "New task", press Enter. Type the next one.
- **Expected:** the title field keeps the focus (as on the Tasks page since EX-8).
- **Actual:** the form is a different element after the add: the empty start and the list render it at different places
  in the tree, so React mounts a new form and the focused field is gone; focus falls to `<body>`, and NOVA's single-key
  shortcuts take the next letter ("t" opens Tasks). 2 of 2 runs of the DOM test on the head's code; not on the served build
  (it predates the widget).
- **File:** `components/nova/widgets/tasks.tsx`.

## EX3-3 · Minor · "Find models on this computer" misnames a token request and a blocked origin

- **Where:** /app/nova/setup → Your brain → A model on this computer → Find models on this computer, at 1440.
- **Actual:**
  - *Wrong key (401):* every server reads "LM Studio: The key was not accepted. Check it in Settings → Your assistant →
    ZIGi · Your Personal AI Companion, or create a new one at your provider." The scan sends no key at all (server log:
    `auth=n`), there is no key in Settings to check, and no provider: the server asks for its own token. 2 runs (4 servers
    each).
  - *CORS blocked:* "LM Studio: nothing answered at http://localhost:1234 (not running, or not allowing this site yet)",
    word for word the offline line, although the server answered (the console shows the CORS refusal). The person cannot
    tell "start it" from "turn on Enable CORS / set OLLAMA_ORIGINS". 1 browser run with real servers, plus the unit test.
- **Cause:** `lib/nova/local-servers.ts` `probeServer` passes ZIGi's provider-key message through for `bad-key`, and treats
  every network failure as one case, although the Hermes test (`testHermes`) already tells them apart with one no-cors
  request.

## EX3-4 · Major · Hermes brain keeps the old key after a new one passes the test

- **Where:** /app/nova/hermes → 7 Connect it in ZIGoals, then /app/nova.
- **Steps:**
  1. Paste key A, tick "Remember the key", Test → "Checked: it works". Press "Use Hermes as NOVA's brain".
  2. Ask NOVA anything: Hermes answers.
  3. Change Hermes's API_SERVER_KEY to B (gateway restarted). In planet 7 paste B, tick Remember, Test → "Checked: it
     works"; the brain button reads "Hermes is NOVA's brain" (disabled).
  4. Ask NOVA again.
- **Expected:** NOVA uses key B.
- **Actual:** the request carries key A (server log: `POST /v1/chat/completions auth=Y` → 401), and NOVA says "The key was
  not accepted. Check it in Settings → Your assistant → ZIGi · Your Personal AI Companion, or create a new one at your
  provider." Nothing in the Hermes guide can fix it (the brain button is disabled). 2 runs (probe s3, spec run 1).
  Related: "Use Hermes as NOVA's brain" sealed the brain's key only if the page's Remember box was ticked at that moment, so
  after a reload (box unticked) a remembered Hermes key became a this-tab-only brain key.
- **Cause:** `components/nova/hermes/steps/connect.tsx`: the test writes the key store's `hermes` slot; the brain reads the
  `local` slot, which only "Use Hermes as NOVA's brain" copies, once.

## EX3-5 · Minor · Hermes test without a key: "Hermes refused the key"

- **Where:** /app/nova/hermes → 7 Connect it in ZIGoals, no key typed and none kept on the device.
- **Actual:** "Hermes refused the key. Show it with “hermes config get API_SERVER_KEY --raw” and paste it here again." No
  key was sent (`auth=n`). After any refused key, the guide's line and NOVA's Hermes card say "Gateway not reachable at the
  last check", although the gateway answered. 2 runs (wrong-key and online states of probe s2).
- **Cause:** `lib/nova/hermes.ts` `testHermes` maps every 401/403 to `wrong-key`; the status line reads only `reachable`.

## EX3-6 · Minor · A Hermes that never answered becomes "your Hermes"

- **Where:** /app/nova/hermes → 7, a first test that fails (gateway off, wrong key or CORS), then /app/nova.
- **Actual:** NOVA's left panel lists "Hermes Agent" under its agents ("not reachable"), the Hermes card is titled
  "Hermes Agent" with "Hermes guide" instead of "Continue the guide", and the chat offers "Ask my Hermes", for a gateway
  that never answered. `nova-left.tsx` says this shows "only once the person connected their Hermes Agent". 3 states in
  probe s2 (offline, 401, CORS).
- **Cause:** `lib/nova/hermes.ts` `withCheck` saves the tested address as the gateway on a failed test too, and
  `hermesStatus().connected` is "an address is saved".

### Checked and fine

- **Hermes guide, four states:** online → "Hermes 0.22.5 is reachable … answered in N ms" and the brain button; offline →
  "Hermes's gateway is not answering" (start `hermes gateway`); CORS blocked → "Hermes is running, but does not allow this
  site yet" via one no-cors request (no Origin header, nothing read); wrong key → "Hermes refused the key". The chat request
  to a Hermes brain carried no tools.
- **Local scan, online:** Ollama's cloud model is marked "runs on ollama.com, not on this computer"; offline: "nothing
  answered" for every server.
- **Notes and Tasks at 1440 and 1920 (Showcase):** no page-level horizontal overflow and no unnamed control on /app/notes,
  /app/tasks or /app/nova. (The theme switch was not on those pages, so this sweep ran in Nebula; Light and Dark were swept
  in round 1.)
- **Notes import/export (code review):** a re-import of this device's export skips notes already here by `zigoals-id`;
  Showcase example notes stay out of a person's notes; front-matter is read as strings only.
- **A chat that isn't kept (code review):** NOVA's chat unmounts on close, so the unkept chat is gone as its banner says.

---

## Fixes

Each bug fixed at its cause, with a test that fails on the old code (checked by running it against the committed file put
back in place, or against the served pre-fix build). The browser tests pass only after the lead rebuilds the server.

| ID | Cause fixed | Test (fails before the fix) |
|---|---|---|
| EX3-1 | `components/nova/nova.css`: inside NOVA's panel the conversation gives way first (`.nova-talk .nova-chat-log{flex-shrink:1000}`), then the composer shrinks and scrolls inside itself (`.nova-talk .nova-composer-wrap{min-height:0;overflow-y:auto}`), so no control is ever clipped under the foot. Verified on the served build with the rules injected: before, 3 controls covered or outside at 1366×640 and 1280×600; after, none at 1366×640, 1280×600, 1280×720, 1440×900. `lib/nova/css-collisions.test.ts` still passes (contextual rules). | `tests/exploratory-round3.spec.ts` "EX3-1": every chat control, scrolled into view, is where a press lands (elementFromPoint is the control) at 1280×720, 1440×900, 1440×800, 1920×1080, 1024×768, 768×1024 and 1366×640, then "Let ZIGi answer here" is clicked. Failed on the served build at 1366×640. |
| EX3-2 | `components/nova/widgets/tasks.tsx`: one tree for the empty start and the list; the add form and its status line keep their place, so the field keeps the focus. | `lib/nova/exploratory-round3-dom.test.ts` (jsdom): the same input, still focused, after the first add (failed 2 of 2 on the old file). Also `tests/exploratory-round3.spec.ts` "NOVA Tasks widget" for a head build. |
| EX3-3 | `lib/nova/local-servers.ts` `probeServer`: a 401/403 says "LM Studio is running at …, but asks for an API key (token). Connect it below with its address and that key."; a failed request is followed by one no-cors request to the server's own list address, and a server that answers it gets its own fix (Ollama: OLLAMA_ORIGINS; LM Studio: Enable CORS; llama.cpp: allow this site); "nothing answered … (not running)" only when nothing answers. New `ScanResult` reasons `key` and `origin` (no stored format). | `lib/nova/exploratory-round3.test.ts` "EX3-3" (3 tests, all failed on the old file). |
| EX3-4 | New `lib/nova/hermes-keys.ts`: `keepHermesKey` (sealed only when asked; otherwise an older sealed key is forgotten, so "this page forgets it on reload" holds) and `hermesKeyToBrain` (the brain's `local` slot gets the Hermes key, kept the same way). `components/nova/hermes/steps/connect.tsx`: a passing test while Hermes is the brain at that address refreshes the brain's key; "Use Hermes as NOVA's brain" keeps the key as the guide keeps it, not by the box's state after a reload. | `tests/exploratory-round3.spec.ts` "EX3-4" (MOCK Hermes on 8642 checking the bearer key: the chat's request carries key B and Hermes answers; failed on the served build with the 401 above). Unit: `lib/nova/exploratory-round3.test.ts` "EX3-4" (fake IndexedDB: rotation, reload, Showcase). |
| EX3-5 | `lib/nova/hermes.ts`: new problem `needs-key` when no key was sent ("Hermes is running and asks for its key: none is on this device yet."); planets 5 and 6 accept it as "running". `lib/nova/hermes-record.ts` `hermesCheckLine` (and `HermesStatus.problem`): "Gateway answered at the last check, but refused the key" / "… asks for its key" / "running …, but this site is not allowed yet"; used by the guide's status line and NOVA's Hermes card. | `lib/nova/exploratory-round3.test.ts` "EX3-5" (failed on the old `hermes.ts`). |
| EX3-6 | `lib/nova/hermes.ts` `withCheck`: only a passing test saves the gateway address and model; a failed test records the check and keeps the address that worked, or none. | `lib/nova/exploratory-round3.test.ts` "EX3-6" (failed on the old `hermes.ts`). |

Not changed (named for the owner): NOVA's left and right panels still say "not reachable" after a refused key (their files
belong to other lanes this round; the guide and the card are fixed), and the right panel labels a scan result that is
running but refused "Offline". A 401 from a Hermes brain in NOVA's chat still shows ZIGi's generic key words ("Check it in
Settings … create a new one at your provider"); with EX3-4 fixed, the guide's own test now keeps the brain's key right.
No new dependency, no stored-format change.

Files changed: `apps/web/components/nova/nova.css`, `apps/web/components/nova/widgets/tasks.tsx`,
`apps/web/components/nova/hermes/{hermes-card,hermes-guide}.tsx`,
`apps/web/components/nova/hermes/steps/{connect,gateway,browser}.tsx`, `apps/web/lib/nova/{hermes,hermes-record,local-servers}.ts`,
new `apps/web/lib/nova/hermes-keys.ts`; tests `apps/web/lib/nova/exploratory-round3.test.ts`,
`apps/web/lib/nova/exploratory-round3-dom.test.ts`, `apps/web/tests/exploratory-round3.spec.ts`.
