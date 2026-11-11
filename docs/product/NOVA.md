# NOVA: your personal AI command centre

A user guide. NOVA lives at `/app/nova` (⌘/Ctrl + J from any page, or NOVA in the menu). The in-app guide is
**Build your own NOVA** (`/app/nova/setup`); this document follows it, and the commands below are the ones the app shows
(`apps/web/lib/nova/setup-guide.ts`). Decisions: [ADR-038](../architecture/ADR-038-session-am.md).

## What it is

NOVA is a calm, full-screen stage with one star in the middle. You ask for something, NOVA answers, and it makes a widget
for that answer from your own records: goals, habits, health, money, tasks, notes, journal and agenda. It is the same
assistant as ZIGi with a different face: one engine, one history, one memory. ZIGi is the chat on every page; NOVA is the
place you keep open.

It works with no AI connected. A model of your own (a "brain") adds open questions and writing; it never changes what a
widget shows. NOVA proposes and you confirm: every change is a card with Undo, and nothing is ever signed, sent or moved.

## The stage

A new NOVA starts nearly empty: the star, a greeting, a line about your day, a few one-tap requests and one field to ask
in. Three ways to ask:

- **Type** in the field and press Enter. Nothing is sent before Enter.
- **Tap** a one-tap request: My day, What's next, Habits this week, Weight this month, Goals, Net worth, Agenda, Weather.
- **Speak**, once you turn voice on (it is off until you do).

NOVA answers under the star and the widget appears beside it. Ask again about the same thing and the same widget is made
again in place (another range, another goal). At most three widgets per request.

Ten requests the on-device step understands in English, with no model:

| Ask | Widget |
|---|---|
| How is my day? | Your day |
| What's next? | The next three |
| Show my habits this week | Habits this week |
| How are my goals? | Goals |
| What's on my agenda? | Agenda |
| What are my tasks? | Tasks |
| What's my weight progress this month? | Weight, the last 30 days (needs Health, see Permissions) |
| What is my net worth? | Net worth |
| Which bills are due? | Upcoming bills |
| What's the weather? | Weather (needs the weather switch) |

Five in Dutch:

| Vraag | Widget |
|---|---|
| Hoe gaat mijn dag? | Je dag |
| Laat mijn gewoontes zien | Gewoontes deze week |
| Hoe gaan mijn doelen? | Doelen |
| Wat staat er in mijn agenda? | Agenda |
| Wat voor weer is het? | Weer |

You can also name one of your goals ("Am I on track for Japan?") and NOVA makes that goal's widget. A message the safety
guard answers makes no widget.

## Widgets

- **Pin** keeps a widget on the stage. Pinned widgets are your own arrangement.
- **Hide** folds it into the **dock**, a row of chips. Tap a chip to bring it back.
- **Close** removes it, with Undo.
- **Open** goes to the widget's full page. Back returns to the same stage.
- **Sizes:** Small, Medium and Large, in Customize the view.
- **Arrangements:** ready-made sets, one request away: Command, Health HUD, Wealth HUD and Minimal. An arrangement
  replaces yours; Undo puts it back. The layouts Orbit, Bento, Focus and Minimal, and the Holo and Classic looks, are in
  Customize the view too.

A widget you did not pin leaves by itself after 12 hours. To keep made widgets until you close them, turn on "Keep made
widgets until I close them" (right bar → Your choices).

You can say it instead: "Pin my weight", "Hide the sleep widget", "Close the weather", "Show the Command arrangement",
"Clear the stage" (what you pinned stays). In Dutch: "Maak het podium leeg", "Sluit het weer", "Verberg mijn taken".

The right bar keeps **Requests**: what you asked, newest first, each with "Show again", and "Forget all requests". A chat
you chose not to keep writes no request. **Gentle cards** (Your choices → "Gentle cards from your briefs") are off until
you turn them on: while NOVA is open, one card may appear for today's plan, something due today, a streak at risk or a bill
due. At most three a day, and never a notification. The top bar's "NOVA in its own window" opens NOVA in a separate window
you can keep beside your work.

Renaming NOVA (Customize the view → Persona) is Premium, free during the Alpha, and works for everyone now.

## Connect a brain

Open `/app/nova/setup`, step 3, "Your brain, local first". Its first line says what answers right now, for example
"Right now: on-device answers, no AI connected" or "Right now: Local · qwen3.5:9b". The **live checks** are in the app:
"Find models on this computer" and "Test the connection" in step 3, "Check what NOVA sees" in step 5, and the Brain chip on
NOVA's own page ("Test my setup"). A ChatGPT, Claude, Gemini or Grok subscription cannot sign in here; those plans cover
the provider's own apps only.

### No model at all

Nothing to set up. NOVA answers questions about your records on this device, in English and Dutch, and makes the widgets.

### A model on your own computer (recommended)

Free, private and offline once set up. It needs a computer and Chrome, Edge or Firefox; the browser asks once whether this
site may reach apps on this device: choose Allow. Safari cannot reach a model on your computer. Pick a model that fits your
memory (the app suggests one; for most 16 GB laptops `qwen3.5:9b`). The app fills in your own address where the commands
below say `https://alpha.zigoals.app`; copy them from the app.

**Ollama on macOS**

1. Install Ollama: download it from ollama.com/download, drag Ollama to Applications, open it once.
2. Download a model: `ollama pull qwen3.5:9b`
3. Allow ZIGoals: `launchctl setenv OLLAMA_ORIGINS "https://alpha.zigoals.app"`
4. Restart Ollama: `osascript -e 'quit app "Ollama"'; sleep 2; open -a Ollama`
5. This setting lasts until the Mac restarts. After a restart, run steps 3 and 4 again.
6. Check: `curl -i -H "Origin: https://alpha.zigoals.app" http://127.0.0.1:11434/api/version` answers "HTTP/1.1 200" with
   an Access-Control-Allow-Origin line. "403" means the setting is not active yet.

**Ollama on Windows** (PowerShell)

1. Install Ollama: `irm https://ollama.com/install.ps1 | iex` (or download OllamaSetup.exe from ollama.com/download).
2. Download a model: `ollama pull qwen3.5:9b`
3. Allow ZIGoals for your user account: `setx OLLAMA_ORIGINS "https://alpha.zigoals.app"`
4. Restart Ollama: right-click its taskbar icon, choose Quit Ollama, then start it from the Start menu.
5. Check: `curl.exe -i -H "Origin: https://alpha.zigoals.app" http://127.0.0.1:11434/api/version`

**Ollama on Linux**

1. Install Ollama: `curl -fsSL https://ollama.com/install.sh | sh` (it asks for your password and needs curl and zstd).
2. Download a model: `ollama pull qwen3.5:9b`
3. Allow ZIGoals: `sudo systemctl edit ollama.service`, and under `[Service]` add
   `Environment="OLLAMA_ORIGINS=https://alpha.zigoals.app"`, then save.
4. Load the change: `sudo systemctl daemon-reload`
5. Restart Ollama: `sudo systemctl restart ollama`
6. No systemd? Skip 3 to 5 and start it by hand: `OLLAMA_ORIGINS="https://alpha.zigoals.app" ollama serve`
7. Check: `curl -i -H "Origin: https://alpha.zigoals.app" http://127.0.0.1:11434/api/version`

**LM Studio** (macOS on Apple silicon, Windows, Linux)

1. Install LM Studio from lmstudio.ai and open it once.
2. Download a model in its model search (for example Qwen3.5 9B).
3. In the Developer tab, open Server Settings and turn on Enable CORS. LM Studio recommends Require Authentication too;
   then paste its token as the server token in the app.
4. Start the server: `lms server start --cors --port 1234` (or the Start server switch).
5. Leave "Serve on Local Network" off.

**llama.cpp**

1. Install: `brew install llama.cpp` (macOS, Linux) or `winget install llama.cpp` (Windows).
2. Start the server: `llama-server -hf unsloth/Qwen3.5-9B-GGUF --port 9931 --cors-origins https://alpha.zigoals.app`
   (9931 is llama.cpp's current default port; older guides say 8080).
3. Optional: add `--api-key` and a secret of your choice, and paste the same secret as the server token.

**Then, for all three:** in step 3 press "Find models on this computer", choose "I run a model on this computer", the
preset for your program, "Test connection", and pick the model. "Test the connection" names the model it found.

### Your own provider key

1. Set a monthly spending limit in the provider's billing settings first. NOVA's cost meter is an estimate.
2. Make a key: Anthropic (platform.claude.com/settings/keys), OpenAI (platform.openai.com/api-keys), Google Gemini
   (aistudio.google.com/apikey) or xAI (console.x.ai).
3. In step 3 choose "My own API key", then "I have an API key", paste it, "Test connection", pick a model.

The key is sealed on this device and goes only to that provider, with each request. In Strict a cloud key is refused;
choose Guarded (the provider gets a redacted copy) or Relaxed.

### OpenRouter sign-in

1. In step 3 choose "OpenRouter sign-in", then "I have an API key", choose OpenRouter, "Sign in with OpenRouter instead".
2. You come back with the key sealed on this device. Models whose name ends in ":free" cost nothing, with limits.

### Chrome's on-device model

In step 3 choose "In the browser". Chrome on a computer can run a small model of its own: free, nothing sent, short
answers only.

### Your own Hermes Agent

Hermes Agent is Nous Research's open-source agent that runs on your computer. ZIGoals has no partnership with it.

1. In step 3 choose "My Hermes Agent", or open `/app/nova/hermes`. It has its own ten steps, each with a check.
2. Install Hermes and check it: `hermes --version`
3. Turn on its API server: `hermes config set API_SERVER_ENABLED true`, set a key of at least 16 characters with
   `hermes config set API_SERVER_KEY …`, and allow exactly this site with `hermes config set API_SERVER_CORS_ORIGINS …`.
4. Test the gateway in the app, then choose "Use Hermes as NOVA's brain", or keep your brain and use "Ask my Hermes".

Hermes may use a cloud model and its own tools, so NOVA treats it as Guarded until you confirm it runs a local model.
The widgets are still made on this device from your own records; no model puts words or numbers into a widget.

## Privacy modes

- **Strict** (recommended): only a model on this computer answers.
  Anything meant for a cloud model is refused before it is sent.
- **Guarded:** a cloud model may answer, but secrets, account numbers, addresses, exact amounts and names are taken out
  or rounded first. You see exactly what goes before it goes; photos are never sent to a cloud.
- **Relaxed:** the areas you share go to your model as they are, local or cloud.
  Your chosen provider receives them unchanged, under its own terms.

Choose one in step 2 of the guide. On a phone the suggestion is Guarded, because Strict needs a model on a computer.

## Permissions and the Health rule

NOVA → Permissions decides what NOVA may read: Today, Goals, Habits and Wealth, each with its own switch. These are the
same switches as Settings → ZIGi. Notes and the Journal are off until you turn them on; the Journal also needs its own
sharing switch in Journal.

**Health is off unless you choose it.** It opens only when all of these hold: Health is on in NOVA → Permissions, Health
is on your Today layout, and with an account its Health permission is allowed on this device. Until then a Health widget
you ask for is made locked: it names the switch and shows nothing else.

A connected model can show, pin, hide or close a widget. It can never change a permission, the weather switch, your
privacy mode or which pages may be read. "What NOVA can see" (step 5) shows the exact text that would leave.

## Weather

Weather is the only outside data in NOVA, and it is off until you turn it on.

- **Turn it on:** NOVA → Permissions → "Weather (outside data)", then choose a place: a city from a list that ships with
  the app, or a position you type. Your browser's location is never asked.
- **What MET Norway sees:** your network address and your place rounded to about 1 km, and it keeps both in its logs. No
  account, no key, no cookie, nothing else. Your browser asks MET Norway directly; ZIGoals has no server in between.
- **When:** only while a weather widget is on the stage and the page is visible, at most once per place per 10 minutes.
- **Credit:** the widget says "Data from MET Norway", licence CC BY 4.0, and names the reading's time.
- **Turn it off:** the same switch. Nothing is asked from MET Norway after that. The last reading stays on this device
  until you erase it; it is in Export everything.
- **Not built yet:** a caching proxy that would hide your network address from MET Norway.

## Phone

On a phone NOVA is a chat: it answers in words, with a small chart where one fits, and the weather and the time are
answered in words. A phone has no stage, so "clear the stage" says the stage is on a computer. A phone cannot reach a model
on your computer; use on-device answers or your own key there.

## Sync

On the public Alpha your requests, pinned widgets and layout stay on the device. With an account they can travel in an
optional, end-to-end encrypted sync section; a request made on your phone then shows on your computer under Requests,
marked "from your phone", with "Show again". The weather switch, your place, NOVA's name, what NOVA calls you and your
instructions never sync.

## Troubleshooting

| What you see | What to do |
|---|---|
| "No model is connected yet." | Follow one path in step 3, then press Test again. |
| The check answers "403" | The origin setting is not active yet. Restart Ollama; on a Mac, set it again after a restart. |
| "… answered at …, but refused this site." | Allow this site: OLLAMA_ORIGINS for Ollama, Enable CORS in LM Studio, `--cors-origins` for llama.cpp. |
| "Something answered at …, but it is not Ollama" | Another program holds port 11434. Close it, start Ollama, try again. |
| "Nothing answered at that address." | The program is not running, or the browser was not allowed: in Chrome or Edge click the icon left of the address, turn on "Apps on device", reload. |
| "… is a cloud model, and Strict sends nothing to a cloud." | Connect a local model, or choose Guarded or Relaxed in step 2. |
| "… answered, but … is not in its list." | Choose another model, or download it first (`ollama pull …`). |
| The model download fails | Check free disk space and run the same command again; it picks up where it stopped. |
| A widget is locked | Turn on the switch it names in NOVA → Permissions (Health also needs Health on your Today layout). |
| "This browser did not open a new window." | Allow pop-ups for ZIGoals, or install ZIGoals and open NOVA from its shortcut. |
