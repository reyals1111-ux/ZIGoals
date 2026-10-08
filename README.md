# Session X-Local — ZIGi comes alive: review gallery

An orphan branch for looking, never for merging: screenshots of ZIGi's surfaces on this session's branch
(`feature/session-x-local-zigi`, PR #79) and four of the shipped clips. Fictional Showcase records only; no real data,
no keys. Captured with Chrome 154 against the dev server (desktop 1280×800, iPhone 13 viewport).

| File | What |
|---|---|
| screens/desktop-today-launcher.jpg · screens/phone-today-launcher.jpg | Today with ZIGi's launcher (the real idle art, posters first) |
| screens/desktop-launcher-idle.png · screens/phone-launcher-idle.png | The launcher alone |
| screens/desktop-panel-open.jpg · screens/phone-panel-open.jpg | The panel |
| screens/desktop-meet-zigi.jpg · screens/phone-meet-zigi.jpg | Meet ZIGi: every state with the real art and its plain-words meaning (full page) |
| screens/desktop-customize.jpg · screens/phone-customize.jpg | Customize: Full / Calm / Off |
| clips/F009-celebrate.anim.webp, F002-greeting, F003-insight, F006-presenting | Four of the eleven studio clips, as shipped (96×126 animated WebP, never re-encoded) |

## Phase 2 (P2.5): ZIGi's states as clips, desktop and phone

Recorded from the dev server with a MOCK provider (no real model, fictional Showcase records), Chrome 154, the look set as named; `clips/states/desktop/` (recorded at 1280×800, scaled to 720×450 for the gallery) and `clips/states/phone/` (iPhone 13 emulation, recorded at 390×844, the gallery file 390×844), H.264 mp4, each a few hundred kB. ZIGi is small at that scale, so the close-ups below show the same recordings at full size.

| Clip | What it shows |
|---|---|
| `idle-full.mp4` | Idle under Full for 74 s: the idle loop with its rare variation |
| `greeting-listening.mp4` | The panel opened: the greeting plays out, then listening as the composer has focus |
| `thinking-speaking.mp4` | A slow MOCK reply: thinking before the first byte, speaking while it streams |
| `cards-presenting-success.mp4` | A reply with a card: writing the proposal, presenting, success on Add |
| `insight.mp4` | A plain answer: insight |
| `curious.mp4` | The AI's hint: curious |
| `empathetic.mp4` | The AI's hint: empathetic |
| `error.mp4` | A failed request: error |
| `wave-goodbye.mp4` | The panel closed: wave goodbye |
| `idle-off.mp4` | Animation Off: the still frame |

### Close-ups, at full size (the same recordings)
`clips/states/desktop-closeup/`: the right column of the desktop recording at 1:1 (460×600, from x 820, y 200), which holds the panel's header figure, the figure beside the first message and, with the panel closed, the launcher. `clips/states/phone-viewport/`: the phone recording cut to the real viewport (390×664; the recording's lower 180 px were blank), ZIGi at the size a phone shows it. Same ten clips, same names. Judged on these (ADR-017 S58): the greeting plays out before the listening lean, thinking holds through the waiting dots and speaking starts with the first streamed word, Add shows the success pose over "Added", Escape returns the focus ring to the launcher; no timing changed.

