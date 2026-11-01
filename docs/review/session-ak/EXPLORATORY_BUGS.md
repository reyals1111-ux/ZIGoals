# Session AK G5/Z2: exploratory bugs

A fresh tester used the app as first-time people would: a brand-new device and the Showcase; 1440×900, 1024, 390×844 and
320 px; Nebula, Light and Dark; keyboard only for NOVA, Notes and Tasks; reduced motion and Motion Off/Calm. Priority was
NOVA, Notes, Tasks, BUILD list 2 and motion.

**Build tested.** The production server on 127.0.0.1:3101 was built from `28fb9b43`, two commits after the brief's head
`367b6b65`. The working tree has since moved to `981f6537`, which includes the RELEASE_REVIEW_2 fixes R2-1 to R2-5 and R2-22.
For each bug below I checked whether its cause is still in the working tree, and the bug says so.

**Method.** Playwright scripts with every `/api/**` request answered 503. Every bug was reproduced at least twice, and each
one names the runs. An axe-core 4.13 sweep (WCAG 2.0/2.1/2.2 A and AA) and a horizontal-overflow check ran on 14 routes in
the Showcase: Nebula and Dark at 1440 and 390, Light at 1440 and 390, Nebula at 320. Apart from EX-12, that sweep found no
contrast failures, no unnamed controls and no page-level overflow.

**Privacy.** Nothing left the device. The only requests that did not go to 127.0.0.1:3101 went to localhost model ports
(11434, 1234, 9931, 8080, 8642), and only after "Find models on this computer", "Look for local servers" or the Hermes
"Test" button was pressed. The "Share my NOVA setup" file (985 bytes) contained none of: the person's name, custom
instructions (an address and an IBAN were typed in for this test), goal names or chats. Showcase changes (the persona
name, "What NOVA calls you", chats) did not leak into the person's own data after "Return to my data".

**Browser note.** Playwright's default `chromium.launch()` (chromium-headless-shell 1243) crashes the renderer on every
open of /app/nova; see EX-4. Every other test therefore ran in the full Chromium 1243 build (`channel: 'chromium'`).

## Summary

| ID | Severity | One line |
|---|---|---|
| EX-1 | Blocker | NOVA on desktop and tablet: the command field "What's on your mind?" and the whole conversation panel sit below the window and are cut off |
| EX-2 | Major | NOVA: after the first message, focus drops to the page, so typing the next question fires the single-key shortcuts and leaves NOVA |
| EX-3 | Minor | NOVA reached with ⌘/Ctrl+J and Enter: Esc neither closes the chat nor leaves NOVA |
| EX-4 | Minor | /app/nova calls `SpeechRecognition.available()` on every load; in Chromium headless shell 1243 this crashes the tab |
| EX-5 | Minor | Phone: the swan logo intro plays for about 15 s on top of NOVA's "Exit NOVA" button |
| EX-6 | Minor | A letter key pressed to skip NOVA's opening also runs its shortcut (2 of 3 runs) |
| EX-7 | Minor | Tasks: adding a task with a long word or a URL makes the page scroll sideways (752 px at 390, 539 px at 320) |
| EX-8 | Minor | Tasks: after "Add task" by keyboard or mouse, focus falls to the page |
| EX-9 | Minor | Amount calculator: large numbers get the wrong reason ("Use only numbers…", "…at most two decimals") |
| EX-10 | Minor | Make NOVA yours: 16 toggle buttons are all named "Shown", without the entry they belong to |
| EX-11 | Minor | Setup guide, Privacy mode: after "Use Guarded" the check still says "Checked: it works. Strict is on." |
| EX-12 | Minor | Health: the "Settings → Backup & restore" link is not underlined and has 1.08:1 contrast with its sentence (Nebula, Dark) |
| EX-13 | Polish | Setup guide: a button labelled "Not done yet" sits next to "Checked: it works" and reads like a status |
| EX-14 | Polish | NOVA widgets on a fresh start: "Open the Checklist →" twice in Today's orbit, "Open Music" twice in Now playing |
| EX-15 | Polish | Notes: the hidden `[[` suggestion list is still drawn as an empty cyan strip under every note field |
| EX-16 | Polish | NOVA Goal pace: "45%", "65%" and then "41.66%" in the same list |
| EX-17 | Polish | NOVA, fresh start: the chip says "Privacy not chosen yet" while the guide says "Strict is on" |
| EX-18 | Polish | NOVA: "Open the conversation" after a reload starts a new, empty chat instead of the last one |
| EX-19 | Polish | NOVA chat (phone): Edit, Copy, Read aloud and More are 36×33 px, under the project's 44 px target |

**Counts:** 1 Blocker, 1 Major, 10 Minor, 7 Polish.

**Seen again and already recorded, not counted:**
- **R2-1:** on the served build, NOVA's phone chat says "paused on a private screen". "How far am I on my Emergency fund
  goal?" gets the generic list on the phone and the figure at 1440, in 2 of 2 runs. The fix, `52bd5286`, is not in
  `28fb9b43`.
- **R2-2:** "How did I sleep last night?" is answered "Health isn't shared with ZIGi — turn it on in Settings → ZIGi…".
- **R2-3:** the first desktop screen.
- **R2-22:** the greeting is read twice.

---

## EX-1 · Blocker · NOVA command field and chat are below the window on desktop and tablet

- **Where:** /app/nova at 1920×1080, 1440×900, 1440×800, 1280×720, 1024×768 and 768×1024. Every theme (this is layout).
  Fresh start and Showcase. Phones (390) are fine.
- **Steps:** Open /app/nova and wait for the opening to finish. Look for the command field at the bottom.
- **Expected:** At the bottom of the stage, the command field "What's on your mind?" with View controls and model routing.
  Pressing Enter opens the conversation as a large panel above the field.
- **Actual:**
  - The field's top edge is always 17 px below the bottom of the window. `.nova-frame` has `overflow: hidden`, and the
    document does not scroll (`scrollHeight` equals the window height), so the field cannot be seen or scrolled to.
  - The middle widgets scroll inside `.nova-stage-area` (1659 px of content in a 636 px box at 1440×900).
  - After asking via ⌘K or ⌘/Ctrl+J, the conversation opens inside `.nova-foot`. Only the "YOUR PRIVATE INTELLIGENCE" line
    shows at the very bottom (y = 879 of 900); the composer is at y = 1245.
  - So the chat, "the heart" of NOVA, cannot be read or used with a mouse on any desktop or tablet size.
  - Measured at 7 window sizes, in fresh and Showcase states, across 4 runs. Screenshots: g5/shots/03-, 06-, 07-nova-1024.png.
- **Cause:**
  - `components/nova/nova.css:37` declares 6 rows for `.nova-centre`:
    `grid-template-rows: auto auto auto minmax(0, 1fr) auto auto`. Those rows are for top, chips, the optional wake line,
    stage, the optional edit bar and foot.
  - `components/nova/nova-dashboard.tsx:198-215` normally renders only 4 children: `.nova-top`, `.nova-chips`,
    `.nova-stage-area` and `.nova-foot`. They fill rows 1 to 4 in order.
  - The stage therefore lands in an `auto` row and grows to its content. The foot lands in the `1fr` row, which gets
    0 px, and is pushed out.
  - Computed rows at 1440×900: `166px 98px 636px 0px 0px 0px`.
  - Both files are unchanged in `981f6537` on this point.
- **Proposed fix:** Place the children explicitly. For example, give `.nova-stage-area` `grid-row: 4` and `.nova-foot`
  `grid-row: 6`, or use named grid areas. Add a spec that checks the field's `boundingBox().y + height <= viewport.height`
  at 1024 and 1440. `toBeVisible()` passes for clipped elements.

## EX-2 · Major · After the first NOVA message, focus is lost and typing triggers shortcuts

- **Where:** /app/nova at 1440×900. Fresh start and Showcase. Any theme.
- **Steps:**
  1. Press ⌘/Ctrl+K and type "hello", then Enter.
  2. Without clicking, type the next question: "What is my next bill?"
- **Expected:** Focus moves to the chat's composer ("Message NOVA"), and the follow-up is typed there.
- **Actual:**
  - `document.activeElement` is `<body>` after the first send. On the ⌘/Ctrl+J route it is `<main>`.
  - The typed letters are read as single-key shortcuts, and the page leaves NOVA for /app/tasks. This happened in 2 of
    2 runs, plus the same result in 2 earlier runs.
  - A keyboard or screen-reader user has to find the composer again with Tab.
- **Cause:**
  - `components/nova/nova-dashboard.tsx:97` sets `openChat = () => setChatOpen(true)` and moves focus nowhere.
  - The command field that had focus unmounts (`{!chatOpen && <div className="nova-foot-row">…}`, line 209), so focus
    falls to the body.
  - The ⌘K handler at line 170 focuses the composer only when the chat is already open.
  - Still in `981f6537`.
- **Proposed fix:** After `setChatOpen(true)`, use `requestAnimationFrame(() => root.current?.querySelector('.nova-talk
  textarea')?.focus())`. On phones, focus the sheet's composer. Spec: send, then `expect(composer).toBeFocused()`.

## EX-3 · Minor · Arriving through ⌘/Ctrl+J, Esc does nothing on NOVA

- **Where:** Any page, then NOVA, at 1440. Fresh start.
- **Steps:**
  1. On /app/goals, press ⌘/Ctrl+J.
  2. Type a question and press Enter. NOVA opens with the chat.
  3. Press Esc three times.
- **Expected:** The first Esc closes the chat and the next one leaves NOVA, as happens after a direct visit: Esc 1 closes
  the chat and Esc 2 returns to /app.
- **Actual:**
  - The chat stays open and the URL stays /app/nova after three presses.
  - Focus is on `<main>` the whole time.
  - Reproduced 3 times, in 2 separate runs. "Exit NOVA" still works by mouse or Tab.
- **Likely cause:** Focus left on `<main>` after the route change, outside the element whose key handler closes the chat.
  This is related to EX-2.

## EX-4 · Minor · /app/nova crashes the tab in Chromium headless shell because of `SpeechRecognition.available()`

- **Where:** /app/nova at every size, every motion setting and every data state, with Playwright's default
  `chromium.launch()` (chromium-headless-shell 1243). The full Chromium 1243 build does not crash.
- **Steps:** Open /app/nova. The page fires `crash` within about a second, every time: 3 contexts, plus reduced motion, plus
  `--disable-gpu`.
- **Isolation:**
  - Removing `SpeechRecognition.available` with an init script stops the crash. Stubbing canvas, view transitions or
    battery does not.
  - On a plain page (/robots.txt), `await SpeechRecognition.available({langs:['en-US'], processLocally:true})` alone
    crashes the target.
  - So the root cause is a Chromium bug. The app's part: `components/nova/nova-right.tsx:55` calls `wakeSupport(window)`,
    and with it this new experimental API, on every mount of the right panel. That panel is open by default, so the call
    happens before the person asks for anything voice-related.
  - Any tool or CI job on headless shell cannot open NOVA at all. Real Chrome and Edge were not checked.
- **Proposed fix:**
  - Ask for wake-phrase support only when the Voice section is expanded, or when "Hey NOVA" is turned on.
  - Optionally, skip the call when `navigator.webdriver` is set or the user agent contains HeadlessChrome.

## EX-5 · Minor · Phone: the swan logo intro plays over "Exit NOVA"

- **Where:** /app/nova at 390×844, when NOVA is the first page opened in a tab (a fresh visit, NOVA as the start page, or
  the PWA shortcut "NOVA"). Nebula.
- **Steps:** Open a new tab directly on /app/nova at phone width.
- **Expected:** NOVA hides the app's top bar, so the top bar's intro does not play.
- **Actual:**
  - `video.logo-intro.logo-intro-phone` (`position: fixed; z-index: 41`) plays its clip at (4, 7, 53 px wide), right on top
    of the "Exit NOVA" button's icon.
  - It stays from about 1 s to between 12 and 20 s (`data-state=playing`).
  - Clicks still reach the button (`pointer-events: none`), but the button looks broken.
  - 2 of 2 runs. Screenshots: g5/shots/07-nova-390.png, 08-phone-nova-8s.png.
- **Files:** `components/motion.css:100`, `components/logo-intro.tsx`. The intro is protected; the fix is to not start it,
  or to hide it, while NOVA has taken over the window.

## EX-6 · Minor · A letter key used to skip NOVA's opening also runs its shortcut

- **Where:** /app/nova at 1440, first visit, Full motion.
- **Steps:** Open NOVA on a fresh device. While `data-opening="play"`, press `t`.
- **Expected:** The key only skips the opening, which is "skippable with any key or tap".
- **Actual:** In 2 of 3 runs, the opening ends and the page goes to /app/tasks. Space, Shift and a tap only skip, in 2 of
  2 runs each.
- **Proposed fix:** While the opening plays, the skip handler should `preventDefault()` and stop propagation, so the
  shortcut handler ignores that key.

## EX-7 · Minor · Tasks: a long word or URL makes the page scroll sideways

- **Where:** /app/tasks, fresh start, Nebula.
- **Steps:** Add a task titled with a pasted URL, for example
  `https://docs.google.com/document/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789abcdefghij/edit`.
- **Expected:** The page stays the width of the window.
- **Actual:**

  | Width | Title | Page width after adding |
  |---|---|---|
  | 390 | the URL above | 752 px |
  | 320 | "Rindfleischetikettierungsüberwachungsaufgabenübertragungsgesetz" | 539 px |
  | 1440 | 140 characters with no space | 1722 px |

  - The overflowing element is the status line "Added “…”." (`p.tasks-status`), which pushes the form wider.
  - The list itself wraps, and the page is fine again after a reload.
  - 2 runs.
- **Files:** `components/tasks/tasks.css:25` (`.tasks-status` has no `overflow-wrap: anywhere`) and
  `components/tasks/task-parts.tsx:95`. `tasks.css` changed in `981f6537`; recheck after that change.

## EX-8 · Minor · Tasks: focus falls to the page after "Add task"

- **Where:** /app/tasks at 1440, fresh start.
- **Steps:** Type a title, Tab to "Add task" and press Enter (or click it).
- **Expected:** Focus stays on the form, either in the title field or on the new task, so the next task can be typed.
- **Actual:**
  - `document.activeElement` is `<body>` in 3 of 3 runs (keyboard twice, mouse once).
  - The button becomes `disabled` when the field clears, and a focused button that turns disabled drops focus.
  - Pressing Enter inside the title field keeps focus there.
- **Proposed fix:** Return focus to the title input after a successful add.

## EX-9 · Minor · Amount calculator: wrong reason for large numbers

- **Where:** /app/wealth → Room to spend → Amount. Fresh start.
- **Steps and actual messages:**

  | Typed | Message shown | Real reason |
  |---|---|---|
  | `999999999999*999999` | "Use only numbers and + − × ÷." | The number has more than 10 digits |
  | `99999999999999999` (Save) | "Enter an amount above zero, with at most two decimals (for example 12.50)." | The amount is too large |

  2 runs each.
- **Expected:** "Keep each number under 10 digits" or "That amount is too large".
- **Cause:** `lib/money-calc/expression.ts:32` uses `/^(\d{1,10})…/`, so any longer number is "not a number". Line 50
  then gives the generic reason.

## EX-10 · Minor · Make NOVA yours: 16 buttons named only "Shown"

- **Where:** /app/nova → Make NOVA yours → Quick access. Any width.
- **Actual:**
  - Each entry has `<button aria-pressed="true">Shown</button>` with no `aria-label` or `aria-describedby`.
  - A screen reader hears "Shown, toggle button, pressed" 16 times and cannot tell which entry it changes.
  - The neighbouring buttons are named well, for example "Move Health up".
  - 2 runs.
- **Proposed fix:** Use `aria-label={`Show ${e.label} in quick access`}` with `aria-pressed`, keeping the visible "Shown".
  File: `components/nova/make-it-yours.tsx`, near line 90.

## EX-11 · Minor · Setup guide, Privacy mode: the check result goes stale after changing mode

- **Where:** /app/nova/setup → 2. Privacy mode at 1440. Fresh start and Showcase.
- **Steps:**
  1. Do Meet NOVA, then press "Check the mode holds". The result reads "Checked: it works. Strict is on…".
  2. Choose Guarded and press "Use Guarded".
- **Expected:** The check is redone for Guarded, or marked as needing a new check.
- **Actual:** The header shows "Guarded is on", but the result line still says "Checked: it works. Strict is on. A test
  message to a cloud model was refused before sending…", and the planet stays lit. 2 runs.

## EX-12 · Minor · Health: the backup link cannot be told apart from its sentence

- **Where:** /app/health, `.health-private-note`, in Nebula and Dark at 1440 and 390. Showcase.
- **Actual:**
  - axe `link-in-text-block` (serious): the "Settings → Backup & restore" link has 1.08:1 contrast with the surrounding
    text and no underline.
  - In Light it passes.
  - Found in 2 sweeps.
- **File:** `components/health/health.css:117`. Add `text-decoration: underline`, as `.text-link` does.

## EX-13 · Polish · Setup guide: "Not done yet" looks like a status

- **Where:** Every planet of /app/nova/setup and /app/nova/hermes, once checked.
- **Actual:** "Check again | Not done yet | Checked: it works." Here "Not done yet" is a `button.text-link` that un-marks
  the planet, but it reads as a status that contradicts "Checked: it works". 2 runs.
- **Proposed fix:** Rename it "Mark as not done".

## EX-14 · Polish · NOVA widgets repeat their link on a fresh start

- **Where:** /app/nova, fresh start, at 1440 and 1024.
- **Actual:**
  - Today's orbit shows "Open the Checklist →" twice: the empty-state action from `components/nova/widgets/orbit.tsx:11`
    and the widget's own link from `lib/nova/widgets/catalog.ts:25`.
  - Now playing shows "Open Music" twice.
  - A screen reader's link list has two identical entries. Seen in 3 runs.

## EX-15 · Polish · Notes: an empty suggestion strip under every note field

- **Where:** /app/notes, every note textarea, Nebula and Light. Fresh start.
- **Actual:**
  - `<ul class="note-suggest" hidden>` is still drawn as a 14 px bordered cyan strip under the field (screenshot
    g5/shots/25-note-suggest-Light.png).
  - `.note-suggest { display: grid }` (`components/notes/notes.css:81`) overrides the `hidden` attribute.
  - When `[[` finds nothing (for example on a fresh device, where inbox notes are not offered), nothing says "No match".
  - 2 runs.
- **Proposed fix:** Add `.note-suggest[hidden] { display: none; }`.

## EX-16 · Polish · NOVA Goal pace mixes percentage formats

- **Where:** /app/nova → Goal pace, Showcase, 1440.
- **Actual:** "Emergency fund 45%", "First home deposit 65%", "Japan adventure 41.66%". 2 runs.
- **Note:** The text comes from `progressText` in `lib/goal-summary`, which Today shares. Rounding there would change
  Today too.

## EX-17 · Polish · NOVA's privacy chip and the guide disagree

- **Where:** /app/nova, fresh start, at 1440.
- **Actual:**
  - The status chip reads "Privacy not chosen yet".
  - The guide's Privacy planet already reads "Strict is on", and Strict is applied: its check refuses a cloud message.
  - A person may think NOVA has no protection yet.
  - Seen in 3 runs. `status-chips.tsx` changed in `981f6537`; recheck.

## EX-18 · Polish · Reopening NOVA's chat after a reload starts an empty chat

- **Where:** /app/nova at 1440, fresh start.
- **Steps:**
  1. Ask anything.
  2. Reload, then press "Open the conversation with NOVA".
- **Actual:**
  - A new, empty chat opens.
  - The last conversation is only under Conversations ("… · 2 turns · Started in NOVA").
  - 2 of 2 runs.
- **Expected:** The latest conversation reopens, or the empty chat offers "Continue your last conversation".

## EX-19 · Polish · NOVA chat buttons under 44 px on a phone

- **Where:** NOVA chat sheet at 390. Showcase.
- **Actual:** "Edit your last message", "Copy", "Read aloud" and "More for this reply" are 36×33 px, and the suggestion
  chips are 40 px tall. They pass WCAG 2.2 AA (24 px) but miss the project's 44 px rule. 1 run on the served build.
  `nova-chat.tsx` and `nova-turns.tsx` changed in `981f6537`; recheck.

---

### Checked and fine

- **Tasks:**
  - Add with a day and a time.
  - The `min` date blocks past days with the browser's message.
  - An empty title cannot be added.
  - Done, then Undo, then reload.
  - Remove, then Undo.
  - Focus from a task opens the Pomodoro panel.
  - The evening wrap-up lists today's open task; Move to tomorrow, then Undo, works.
- **Notes:**
  - Capture to inbox, then reload.
  - Delete, then Undo, then reload.
  - `[[` autocomplete in the Showcase by keyboard (listbox, `aria-activedescendant`, status line).
  - The daily note saves with Ctrl+Enter.
  - The Markdown ZIP export has front-matter.
  - Pasted HTML stays text.
- **NOVA:**
  - Panels fold and hide, and that is remembered after a reload.
  - Single-key shortcuts can be turned off (WCAG 2.1.4).
  - The persona name and "What NOVA calls you" are kept after a reload.
  - The share file has no personal data.
  - The opening plays only once.
  - Motion Off, Calm and reduced motion: no running animation on NOVA, Notes, Tasks or Today. In Full, only the orb
    breathes and ZIGi peeks.
  - The Hermes guide refuses non-localhost addresses, https on localhost and keys under 16 characters, with clear messages.
  - "Gateway not answering" is explained.
  - Local-server discovery is only on request.
- **Money:**
  - The calculator works out `12,50+3,20`, `1/3`, `0.1+0.2` and `3 + 4` correctly.
  - "Next 60 days" adds up its bills (€120 + €9.99 + €950 = €1,079.99).
- **Layout:** No page-level horizontal overflow on the 14 swept routes at 320 and 390, apart from EX-7.
