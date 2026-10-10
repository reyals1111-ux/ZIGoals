# ZIGi UI audit (Session Z-Cloud Part 2, 2026-10-10)

**What and how.** Every ZIGi surface, measured on two production builds (`PUBLIC_ALPHA_UNDEPLOYED`, `next start`), before
(`12a3ef9`, Alpha #35's source) and after (this branch, Part 2), at 320, 360, 390, 430 (phone layout, touch, iPhone-like),
768, 1024 and 1440 (computer layout), with Playwright's Chromium in the `chrome` channel (CLAUDE.md), reduced motion. 21
states before, 23 after (the Suggestions sheet and the "⋯" list are new): not connected (empty and Showcase), a local
answer, the greeting, typing, waiting, streaming, a reply, an error, a stall (the 60 s watchdog, clock fast-forwarded),
cards, cards acted on, the auto-accept toast, the knock offer, the care note, History, Customize, the setup chooser,
expanded (computers), Settings → ZIGi, Meet ZIGi. Connected states talk to a **MOCK** local OpenAI-compatible server
(a Node server in the test worker, so streaming and stalls are real streams). The Showcase's records throughout, except
"not connected (empty)" and the setup chooser. The mini window (Document Picture-in-Picture) is not measured by the
script: the same panel markup and `panel-z.css` render there; `pip.css` no longer lets its toolbar wrap.

**The checks, per state and width (script outside the repository; raw JSON and every image on the orphan branch
`review/session-z-cloud-screens`):** overlapping boxes of every visible block (headings, paragraphs, list items, labels,
controls, cards, figures); every control hit-tested at its centre (`elementFromPoint`: a control under something else is
"covered"); text clipped by `overflow` or an ellipsis; anything sticking out of the panel; text under 14 px; contrast of
every text node against the colours actually behind it (each gradient stop composited down to an opaque layer; gradient
text checked stop by stop; WCAG 4.5:1, 3:1 for large text); targets under 44 × 44 px; the header's rows (centres of its
controls) and the composer's centre line (centres of the box, the mic and Send). Evidence: **local**, MOCK.

## Before (`12a3ef9`), 147 measurements (144 completed; 3 could not run, see the first row)
| # | Finding | Where | Measured |
|---|---|---|---|
| B1 | **The tablet's top bar sits over the panel's header.** At 768 px (any width 768–900) the app's top bar (sidebar as a bar, `z-index: 30`) paints over the panel, which lives inside `.app-content`'s isolated stacking context: New, History, Customize, Settings, Expand, Pop out and Close cannot be clicked where they overlap. The audit could not open History, Customize or Expand at 768 (timeouts). | header, 768 | 16 covered controls per state at 768 |
| B2 | **The header is two or three rows of text buttons.** Model, New, History, Customize, Settings, Expand, Pop out wrap under the title; the premium pill takes its own line on computers. | header, every width | 2 rows at 360–430; 3 rows at 320 and 768–1440; 120–169 px tall |
| B3 | **Send sits 15 px below the box's centre line** (a global `textarea { margin-bottom: 16px }` reaches the composer). | composer, every width | spread 15 px |
| B4 | **The page shows through the phone panel.** The phone sheet is 94 % opaque over a 78 % backdrop; the page's hero text is readable behind the greeting. | phone panel | visual (captures) |
| B5 | **A new chat is a screen of content before the box:** a 72 px figure, the trust sentence, the morning brief, four to six chips with "hide" buttons, Your week and Patterns, the first-run tips; the data line under it takes up to 300 px (switch, a three-line data-mode sentence, "What your AI sees"). | greeting, every width | captures |
| B6 | **"Jump to the latest message" floats over cards** and covers their Edit and Dismiss. | cards acted on, phones | 2–3 covered controls |
| B7 | **Targets under 44 px** (774 counted across states and widths): chips 40 px, "Log mode" 40 px, "What your AI sees" 32 px, the "Leave out" × buttons 32 px, Copy, Read aloud and Regenerate 32 px, Edit (last message) 28 × 31, History's "Clear all" 31 px, the data switch's label 43 px, Meet ZIGi's "← Back to Settings" 19 px; on computers every header text button 36 px. | everywhere | 774 |
| B8 | **Clipped text:** the status line ("via your local server · mock-chat") ends in an ellipsis at 320; History's chat titles at 320 and 360. | header, History | 16 |
| B9 | **The not-connected block** (72 px figure, two sentences, two buttons) and the local intro (brief, four example chips, entries, tips) fill the first screen before the box. | not connected | captures |
| B10 | The old name "ZIGi · your AI" in the header, Settings, Help, Meet ZIGi, the launcher's name, the phone Settings list, the onboarding and What's new. | names | text |
| — | Contrast: no text under 4.5:1 found by the computed check (B4 is a visual finding the computation cannot see). Text under 14 px: none in the panel. Nothing outside the panel horizontally. | — | 0 |

## After (this branch), 161 measurements, all completed
| # | What changed | Result |
|---|---|---|
| B1 | The tab's panel is portalled to the end of `<body>`, outside the page's isolated stacking context (phones open it as a modal already). | 0 covered controls at 768; `zigi-face-z.spec.ts` hit-tests New, Expand and "⋯" at 768 |
| B2 | One row: ZIGi's figure, "ZIGi · Your Personal AI Companion" (both halves in the nebula flow; the dot folds away when the role takes its own line), a small status line, then glyph buttons in the launcher chevron's nebula stroke: New chat, Expand/Shrink and Pop out (computers), "⋯", Close; each 44 × 44 with a name and a tooltip. History, Customize, Settings, Meet ZIGi, Help and "Change model" live in "⋯". The premium pill is a small "Premium" tag in the status line, dropped first when the title is narrow (and on phones, as before). The computer panel is 500 px wide (was 440). | 1 row at every width; header 77–131 px (phone 77–103, computer 95–131; the title and status wrap inside their column, never under the buttons) |
| B3 | The composer's box, mic and Send align on one line; the box grows to five lines, then scrolls; Send keeps its size; the box's global margin is cleared. | spread 0 at every width (one line) |
| B4 | The panel is opaque deep navy on every width. | captures |
| B5 | A new chat is one greeting ("Hi, I’m ZIGi. Ask about your records or tell me what to log. Nothing is written until you add a card.") and the box. Ideas, "Your day" (the brief, Your week, Patterns) and "Yours" wait in the Suggestions sheet, opened from a chip by the box; the first-run tips live in its Ideas tab. The data line is one row (the switch and "What your AI sees"; the data-mode sentence moved inside it). | captures |
| B6 | "Jump to the latest message" is a slim row of its own above the data line. | 0 covered |
| B7 | Every control in the panel ≥ 44 × 44 (chips, Log mode, the data switch, "What your AI sees", the × chips, reply actions, Edit, Clear all, the History and Meet ZIGi links). | 0 under 44 px in the panel |
| B8 | The status line and History's titles wrap instead of ending in an ellipsis. | 0 clipped |
| B9 | Not connected: one compact line above the box, "Not connected to an AI yet" · Set up · "Which setup fits me?"; the same short greeting; the examples in the sheet. | one or two lines, ≤ 112 px, never over the chat |
| B10 | The new name everywhere in this lane; strings in `lib/ai` (Z-Local's) asked for in the handoff. | text |
| — | Still listed by the script and not ZIGi's: on Settings → ZIGi and Meet ZIGi at phone widths, a control scrolled under the phone's fixed top bar or tab bar at the moment of measuring (the page scrolls under them by design; focus scroll padding keeps a focused control clear). | page layout, unchanged |

## Also changed in Part 2
- Acted-on cards are one-line receipts (✓ Added / – Dismissed / Undone / Replaced, with the card's title); an earlier
  reply's untouched cards fold into "N earlier cards, not added" once a newer reply brings cards; quick-reply chips are
  shown only under the newest reply (as before).
- The person's own frequent questions (`zigoals:zigi-suggestions:v1`): see ADR-019 and `lib/zigi-suggestions.ts`.

Images: `review/session-z-cloud-screens`, folders `before/` and `after/` (one PNG per state and width; `index.md` pairs them).
