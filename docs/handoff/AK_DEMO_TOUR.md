# Session AK demo tour (about 15 minutes)

A spoken walk-through of what Session AK added, in the order that shows it best. It starts with "Open NOVA". Each step
says where to click, what you should see, and what is honestly not live yet.

## Before you start (not counted in the 15 minutes)
- **Where:** the local preview at http://127.0.0.1:3100/app (start it with
  `NEXT_PUBLIC_APP_ENVIRONMENT=LOCAL_DEMO pnpm dev`), or the Alpha at https://alpha.zigoals.app/app once Alpha #53 is
  deployed. Until then the Alpha still runs #52, which has no NOVA.
- **Browser:** Chrome or Edge on a computer, window 1440 px wide or more, so NOVA shows its left panel. Firefox 151 or
  later also works. Safari can't reach a model on your own computer from a web page, so don't use it for step 3.
- **Optional, for step 3:** Ollama or LM Studio on a Mac with Apple silicon, with one small model already downloaded
  (a download takes far longer than the demo).
- **Optional, for step 4:** Hermes Agent (by Nous Research) installed on the same Mac.
- **Example data:** Settings → "Load Showcase Demo" (the card "Take a tour of your tomorrow."). It fills the app with
  fictional records in this tab only. Every Showcase screen says so ("Showcase · fictional example data" on NOVA). "Return
  to my data" leaves it. Load it before step 1, so NOVA's widgets have something to show. Skip it if you'd rather show the
  empty start, where every widget explains what it needs.
- **Motion:** Settings → Appearance → Motion set to "Full", and the Mac's "Reduce motion" off. Otherwise the opening in
  step 1 does not play (that is on purpose; see step 8).
- **Nothing in this tour needs a ZIGoals server.** NOVA runs on the device. The only outside calls it ever makes go to
  the person's own local model (localhost) or, if they choose, their own cloud API key, straight from the device to that
  provider.

## Time budget
| # | Part | Minutes |
|---|---|---|
| 1 | Open NOVA: the opening | 1.5 |
| 2 | The side panels | 1.5 |
| 3 | The setup guide with Ollama or LM Studio on a Mac | 2.5 |
| 4 | Hermes Agent | 1.5 |
| 5 | A workflow | 1 |
| 6 | The ZIGi duo | 1 |
| 6b | Meet the new ZIGi | 1 |
| 7 | Notes and Tasks | 1 |
| 8 | Motion: Full, Calm, Off | 1 |
| 9 | New health, habit and money features | 1 |
| 10 | Push and offline | 1 |
| 11 | The landing | 1 |
| | **Total** | **15** |

---

## 1. Open NOVA: the opening (1.5 min)
**Where to click:** "NOVA" (star icon) in the sidebar, or go to `/app/nova`. From any other page, ⌘ + J (Ctrl + J on
Windows) opens the small "Ask NOVA" bar, which has an "Open NOVA" link.

**What you should see:**
- The app's own sidebar, top bar and footer disappear. NOVA fills the window over a slow starfield.
- The first time on this device (or in this Showcase tab) a "system online" sequence plays for about 2 seconds: the orb
  lights up in the centre, three orbit rings grow out, the side panel slides in, the widgets settle onto the rings one by
  one, and the greeting types itself in.
- Any key or click ends it at once. It does not play again on its own. To show it twice: "Customize the view" (top-right
  grid) → "Make NOVA yours" → "Replay the opening".
- The greeting depends on the time of day. With no brain connected it reads, for example, "Good morning. NOVA is here for
  simple questions." It only says "NOVA is online." once a model is connected.
- The orb shows its state in words under it: "Standby · Tap to talk". Top centre: "Local time" and the date.
- The status chips: "Brain · On-device answers" and "Sees · …" (the areas NOVA may read). In the Showcase, also
  "Showcase · fictional example data".
- A slim banner: "Give NOVA a brain of its own", with "Start the guide" and "Not now".
- At the bottom: the command field "What's on your mind?" with "Enter to ask NOVA · nothing is sent before you press it."
- "Exit NOVA" (or Esc) brings the normal app back.

**Not live yet / honest limits:**
- Without a model, NOVA answers only from the person's own records on this device ("On-device answers · no AI used").
  It does not chat freely until a brain is connected in step 3.
- Under the device's "Reduce motion", Motion Calm or Motion Off, the opening never plays. The finished dashboard shows
  at once.
- Phones (640 px and narrower) get a minimal NOVA: the orb, the command field and the chat as a sheet, with quick access
  in a sheet. There are no side panels on a phone.

## 2. The side panels (1.5 min)
**Where to click:**
- Left panel: open by default at 1440 px and wider (an icon rail from 1100 px, hidden below). Its button cycles open →
  icon rail → hidden. With single-key shortcuts on, `[` does the same.
- Right panel: the last tile of the top-right grid, "Show Behind the intelligence", or `]`. It is hidden by default.

**What you should see:**
- **Left panel:** "NOVA · Private intelligence", "Your space" with "Everything stays on this device", "Your life" (all four
  pillars, on Today), a search field "Find a page or agent…", then "Your pillars", "Your pages" (Notes, Journal, Tasks,
  Agenda, Focus and music, Checklist, Review, Settings, with live counts) and "Agents" (NOVA and ZIGi, each with a status
  dot). At the foot: "Brain: On-device answers".
- **Right panel "Behind the intelligence"** ("Live, on this device"), six numbered sections that fold one by one:
  01 Brains (the brain, this device's facts; a fact the browser does not give says "unknown"), 02 Voice ("Microphone off
  until you press Talk"), 03 Your pages and tools (habits left today, water to go, next bill, unread briefs, notes in the
  inbox, tasks due), 04 Models and usage, 05 Memory and scopes, 06 Activity. "Refresh" at the foot.
- Open "Technical details: local servers, Hermes Agent, this device" → "Look for local servers". Only this computer is
  asked. Chrome may ask once to let the site reach apps on this device.
- Both panels remember their state on this device.

**Not live yet / honest limits:**
- Unknown is shown as unknown, never as zero (for example memory or battery on browsers that don't share them).
- "Listen for 'Hey NOVA'" is offered only where the browser can recognise speech on the device. Elsewhere it says why it
  is not offered. Nothing is checked until you press "Check 'Hey NOVA' on this device".
- Hermes appears under Agents and in 01 Brains only after the person connects their own Hermes (step 4).

## 3. The setup guide with Ollama or LM Studio on a Mac (2.5 min)
**Where to click:** "Start the guide" on NOVA's banner, or `/app/nova/setup`. The page is "Build your own NOVA": ten
planets on four orbits, with "Back to NOVA" at the top. Click a planet to open its step.

**What you should see:**
- Planet 1 "Meet NOVA": "Everything stays on this device.", "Keys never leave it.", "Nothing is trained on.", "Money never
  moves."
- Planet 2 "Privacy mode": Strict (Recommended: only a model on this computer answers), Guarded (a cloud model with
  secrets, account numbers, addresses, exact amounts and names taken out first) and Relaxed. "See what a cloud model would
  get" shows the redacted text before anything is sent. Press "Turn on Strict".
- Planet 3 "Your brain, local first" → "A model on this computer":
  - "How much memory does this computer have?" picks a model (for 16 GB: `qwen3.5:9b`, about 6.6–7.6 GB).
  - "Your computer": macOS. "The program that runs the model": Ollama or LM Studio. Each command is its own copy block.
  - **Ollama on a Mac**, as the guide shows it: download Ollama from ollama.com/download and open it once;
    `ollama pull <model>`; then allow this site:
    `launchctl setenv OLLAMA_ORIGINS "https://alpha.zigoals.app"` and restart Ollama with
    `osascript -e 'quit app "Ollama"'; sleep 2; open -a Ollama`. The guide says this lasts until the Mac restarts. A last
    `curl -i -H "Origin: …" http://127.0.0.1:11434/api/version` check should answer "HTTP/1.1 200" with an
    Access-Control-Allow-Origin line ("403" means the setting is not active yet). On the local preview
    (http://127.0.0.1:3100) the guide says instead: "This page runs on this computer, so Ollama already allows it: no
    setting needed." "For Strict privacy (optional)" explains Ollama's "cloud" models and `OLLAMA_NO_CLOUD=1`.
  - **LM Studio on a Mac** (Apple silicon only): install from lmstudio.ai, download a model in its search, then Developer
    tab → Server Settings → turn on "Enable CORS"; start the server with `lms server start --cors --port 1234` (or the
    Start server switch). Leave "Serve on Local Network" off.
  - The browser note: "Chrome and Edge ask once whether this site may 'Access other apps and services on this device'.
    Choose Allow."
  - "Find models on this computer" lists what Ollama or LM Studio report.
  - Below, in the connect box: "I run a model on this computer" → the preset "Ollama (11434)" or "LM Studio (1234)" →
    "Test connection" → pick the model → "Connect". Then "Test the connection" on the planet. It lights when it works.
- Back on NOVA: the Brain chip now reads "Brain · Local · <model>", the greeting says "NOVA is online.", and the
  command field answers in full sentences. The first local reply is marked "This answer came from <model> on your
  computer. Nothing left this device."

**Not live yet / honest limits:**
- Real model replies need a local model the person runs (or their own key). Without one, NOVA says it answers on this
  device for now and offers "Build NOVA's brain".
- "Your ChatGPT, Claude, Gemini or Grok subscription can't sign in here." The guide says so under "Have a ChatGPT, Claude,
  Gemini or Grok subscription?". Other ways in: a free local model, a free API tier, the person's own key, or OpenRouter.
- Safari can't reach a local model. A phone can't reach a computer's localhost.
- In the Showcase the first three planets show as lit with "Showcase example: …" notes. That is example progress: no
  brain is connected, and the Brain chip still says "On-device answers".

## 4. Hermes Agent (1.5 min)
**Where to click:** the link "Connect your Hermes Agent" on planet 3, or `/app/nova/hermes`. The page is "Connect your
Hermes Agent": a second ten-planet guide on four orbits (Get Hermes · Open its door · Link it to NOVA · Work together).

**What you should see:**
- Planets: Meet Hermes Agent, Install Hermes (`hermes --version`; on a Mac, Apple silicon only), Choose its model (local
  recommended), Turn on its API server, Start the gateway (`hermes gateway`), Let the browser reach it, Connect it in
  ZIGoals, Confirm the privacy mode, First run, Go further.
- "Turn on its API server" gives one command per block: `hermes config set API_SERVER_ENABLED true`, the key
  (`hermes config set API_SERVER_KEY …`, or "Make a key here"), and this site exactly:
  `hermes config set API_SERVER_CORS_ORIGINS <this page's address>` (never "*"). On the local preview that address is
  `http://127.0.0.1:3100`; on the Alpha it is `https://alpha.zigoals.app`.
- "Let the browser reach it" → "Test from this page": the CORS allowlist plus Chrome's one-time "apps on this device"
  prompt. No extra program or proxy is needed.
- "Connect it in ZIGoals": "Hermes address" (`http://127.0.0.1:8642/v1`) and "API_SERVER_KEY" → "Test /health and
  /v1/models" → "Use Hermes as NOVA's brain", or keep the current brain and ask Hermes as a second agent ("Ask my
  Hermes").
- In the Showcase, a card "What a linked Hermes Agent looks like", labelled "Showcase example": "An example connection,
  not a real gateway."

**Not live yet / honest limits:**
- Hermes needs the person's own install and running gateway on their computer. ZIGoals runs no server for it and has
  no partnership with Nous Research.
- Hermes may use a cloud model and its own tools. NOVA treats it as Guarded (redacted) until the person confirms it uses a
  local model. Anything Hermes suggests comes back as a card to confirm; it never moves money.
- The Showcase example never connects to anything; "Ask my Hermes" appears only after a real connection.

## 5. A workflow (1 min)
**Where to click:** back on NOVA, "Workflows" (top left). The panel opens on the Workflows tab. Under "Templates", "Run"
on "Review my week and suggest three adjustments". In the Showcase there is also "Sunday look back (Showcase)" under
"Your workflows".

**What you should see:**
- Each step shows live: "Read your habits of the last seven days", "Read your goal steps", "Read your money log", "Read
  your sleep", each "Done" or "Nothing here".
- A short summary. Without a model it is labelled "MADE ON THIS DEVICE"; with a local model it is "WORDED BY YOUR LOCAL
  MODEL", with "What went to your local model" to see exactly what was sent.
- Then cards ("Propose your weekly intention") that the person adds or dismisses. Nothing is written until a card is
  added, and Undo works. "Stop" ends a run: "Stopped. Nothing was saved."
- "Edit and save as mine" keeps a personal copy. "Export my workflows" saves names, instructions and steps, never records.

**Not live yet / honest limits:** the eight templates read only the person's records on this device. Wording by a model
needs a connected model and a privacy mode that allows it.

## 6. The ZIGi duo (1 min)
**Where to click:** click the orb (or the command field) to open the conversation. Type a question, for example "How
much water today?". Open "Ask ZIGi about a page", choose a page (for example Health), then "Let ZIGi answer here".

**What you should see:**
- NOVA hands the task to ZIGi. On a computer, NOVA and ZIGi appear side by side above the chat, with four steps:
  "Handed over · Reading · Answering · Reported back". The chat shows the same steps and marks ZIGi's answer as ZIGi's.
- "Open ZIGi on Health" opens ZIGi on that page with the words in its box. Nothing is sent until Send is pressed there.
- The other way: in ZIGi's own chat, the ⋯ menu has "Continue in NOVA" once the chat has a message. NOVA and ZIGi share
  one history and one memory on this device.

**Not live yet / honest limits:** without a model, ZIGi uses its on-device answers. Questions those can't answer need a
connected brain, and the chat then points to the setup guide. Every change still comes as a card to confirm.

## 6b. Meet the new ZIGi (1 min)
**Where to click:** Settings → "ZIGi · Your Personal AI Companion" → "Meet ZIGi: every state and move →" (or go to
`/app/zigi`). Then open the Checklist ("Open the Checklist: today’s path") and tick the last item of an orbit.

**What you should see:**
- ZIGi in Studio-4's new look everywhere it appears: the launcher, the chat, NOVA and Meet ZIGi.
- On Meet ZIGi, every one of ZIGi's 25 states has its own animation, at the launcher's, the panel's and a large size.
  The new moves section shows all 26 moves in four groups: Reactions, While resting, Variations and Special moves.
  Each says what it means and when it plays.
- "How much ZIGi moves" (Full, Calm, Off) is on the same page. Under reduced motion, Motion Off or ZIGi's Off, every
  move shows as a still.
- On the Checklist, completing an orbit plays ZIGi's new arms-up cheer (X030). The day's end celebration still plays
  your own video, and a single tick keeps its usual cheer.
- On a phone with notifications switched on (after activation), a notification shows ZIGi's own icon and badge.

**Not live yet / honest limits:**
- ZIGi's greeting-in-place (X001) and the three gaze moves (X020–X022) are delivered but not played anywhere yet;
  Meet ZIGi says "Not used yet".
- The "waiting while offline" reaction (R011) rarely plays: by the studio's rule the offline state takes over first.
- The larger 2× animations are static files of up to 2.5 MB each, loaded one at a time when shown, so the first play
  of a move on a slow connection can take a moment.
- The polish items the studio listed for later are in Help → Known limitations.

## 7. Notes and Tasks (1 min)
**Where to click:** in NOVA's left panel, "Notes" (`/app/notes`), then "Tasks" (`/app/tasks`). On a computer they are not
in the main sidebar. They are in NOVA's left panel, the tablet rail, the phone's More sheet and search (press `/`).

**What you should see:**
- **Notes** ("Capture now, file later…"): the capture box ("Save to inbox", "Add a photo", "Speak a note"), then tabs
  Today · Inbox · Notes · Days · Graph · Files. Today's note has a "This day" strip that links to that day's habits, Health
  logs, workouts and money entries. Typing `[[` links a note, goal or habit. "Graph" shows the links as a star system or
  as a list. "Files" has "Export notes (.zip)" for Obsidian and "Import Markdown". In the Showcase: "Fictional Showcase
  notes, labelled as examples."
- "Ask about my notes" sends a question to NOVA. It needs Notes on in NOVA → Permissions (off by default) and a model.
- **Tasks** ("One list for the things to do"): "New task" with "More options" (priority, due day, time, goal). Groups
  are Overdue, Today, Next 7 days, Later and Someday. "Focus" on a task starts a Pomodoro, and a finished run can tick
  the task, with Undo. Tasks with a day show on the Agenda ("Your agenda →"). The Agenda has "Import a calendar" for an
  .ics file (read-only). In the Showcase: "Showcase · fictional. These example tasks are not yours."

**Not live yet / honest limits:**
- Everything stays on this device. Notes and tasks are not synced (accounts and sync are not open on the Alpha).
- Speaking a note uses the browser's own speech recognition. It is off until turned on, and its note says when the
  browser sends audio to its vendor.
- The Checklist is unchanged and separate from Tasks.

## 8. Motion: Full, Calm, Off (1 min)
**Where to click:** Settings → Appearance → "Motion" (`/app/settings#appearance`). The choices are "Full", "Calm
(entrances only)" and "Off". "Preview motion again" plays a sample.

**What you should see:**
- **Full:** pages glide in, numbers count up once, a finished habit, task or goal gets a short ring of light. On NOVA:
  the "system online" opening, the starfield's slow drift, and the side panels slide in.
- **Calm:** short fades only; nothing moves around or loops. On NOVA the side panels fade in instead of sliding, the
  starfield is a still picture, and the opening does not play. "Replay the opening" then says: "Motion is calm on this
  device, so the opening does not play. Everything is already in place."
- **Off:** nothing moves, NOVA included.
- The device's own "Reduce motion" setting always wins: with it on, every level behaves as Off.

**Not live yet / honest limits:** a widget does not morph into its page (that shared-element transition was not built).
NOVA's orb idles with a slow breath under Full only.

## 9. New health, habit and money features (1 min)
Pick two or three; all work in the Showcase.

**Where to click and what you should see:**
- **Habits** (`/app/habits`): sort by "Your order" and "Reorder" to move habits; "Compact" shows one row per habit with
  its last five days. "Auto-complete rules" → "Set up rules", for example "When steps ≥ 8,000 → Walk is done". A rule ticks
  a day only from records on this device, and the person's own tap or Undo always wins.
- **Health** (`/app/health`): Targets → Micronutrients → "Open the nutrient report" (a nutrient with no value is left
  out, never counted as zero). Targets → "Weekly calorie budget (optional)": the person's own daily target as seven days.
  Diary → "Scan or look up a food barcode" → "Recent scans" and the offline food library (French CIQUAL and British
  CoFID tables).
- **Wealth** (`/app/wealth`): "Upcoming bills" ("A reminder only: ZIGoals never pays or cancels anything") and "Budgets
  by category".

**Not live yet / honest limits:**
- Health and money screens give information, not advice. Projections are labelled as estimates, never promises.
  Currencies are never converted.
- **Barcode lookup is off until the owner deploys the food Worker** (then Alpha #53). Until then, "Look up barcode" says:
  "Barcode lookup is being switched on. Your private food library still works." US foods (USDA FoodData Central) also
  need that Worker and its key.
- Phone wallets by WalletConnect say "Phone wallets are being switched on…" until Reown allow-lists ZIGoals' domain.
  Keplr in the browser is the tested way to sign.
- Reading a food label or estimating a meal from a photo needs the person's own AI connected to ZIGi.

## 10. Push and offline (1 min)
**Where to click:** Settings → "Notifications, even when ZIGoals is closed." (`/app/settings#notifications`) and Settings
→ "Install ZIGoals" (`/app/settings#install`).

**What you should see:**
- **Notifications:** the card explains the design: the text is written on this device; the server only knows *when* to
  wake the device, never *why*; every push is empty. "What the server gets, and what it never gets" lists it. The switches
  per kind (habits, water, wind-down, contributions, bills, price alerts, weekly review), morning and evening times, and
  quiet hours can be set and are kept.
- **Install:** "Install ZIGoals", or the Share → Add to Home Screen steps on iPhone. After installing, the pages already
  visited open without a connection.
- **Offline:** turn the network off (for example in the browser's developer tools) and open a page visited before. It
  opens, a pill says "Offline · this page keeps saving on this device", and NOVA's chip says "Offline · on-device answers
  still work". A barcode lookup or exchange refresh asked for while offline waits on the device and is offered again (not
  run by itself) when back online. When a new version is ready, a note offers "Reload".

**Not live yet / honest limits:**
- **Push is off until the owner activates it** (the VAPID keys, the device push Worker, the `pushDeviceEnabled` switch;
  `docs/run11/PUSH_PUBLIC_ALPHA.md`). Until then the card shows a "Being switched on" pill and "Notifications are being
  switched on. Your reminders still show inside ZIGoals." No "Turn on notifications" button appears, and nothing reaches
  a phone. In the Showcase the card says instead: "Not available in the Showcase: its example data never reaches a
  notification." On iPhone, notifications will need ZIGoals on the Home Screen (iOS 16.4 or later).
- Offline copies hold the app's pages, never records. A page never visited on this device does not open offline.
- Offline is best shown on the Alpha or a production build (`pnpm build` then `pnpm --filter @zigoals/web start`), not
  the dev server.

## 11. The landing (1 min)
**Where to click:** the new landing is in `landing/index.html`. To preview it before deploy, serve the `landing/` folder
with any static server (for example `python3 -m http.server 8080 --directory landing`) and open http://127.0.0.1:8080.
zigoals.app still shows the previous landing until the owner deploys this one.

**What you should see, in the intended final order:** the starfield hero ("Shape & Fold Your Own Future"), the film,
"Your life is connected", Today, the Goals · Habits · Health = Wealth equation, the four pillar chapters, then the **NOVA
chapter** ("Your life data and your own AI, in one private place." / "Build your own AI command center, with a real life
to run."): Local first, Not a subscription, Yours alone, Bring your agent (Hermes Agent, "ZIGoals is not affiliated with
Nous Research"), and an example NOVA dashboard labelled "Example data" with "Play the opening again". Directly after it
comes **"Private by design"** (OD-4), then the ecosystem, "New in the Alpha", "Install it like an app", "Switch to
ZIGoals", "Planned, not promised", the story, "Built openly. Still Alpha.", the FAQ and the final call to action.
Chapters reveal gently on scroll under Full motion and are still under reduced motion.

**Not live yet / honest limits:**
- "Jarvis" is gone from public copy (OD-1). NOVA is described as "your own AI command center" or "your personal AI
  assistant".
- The landing deploy is the owner's and comes only after Alpha #53 is live, so the landing never points to features the
  live app doesn't have yet.
- Sync, recovery and the friends Alpha are marked "NOT ACTIVE YET · COMING WITH THE FRIENDS ALPHA" on the landing.
