# ZIGi · your AI: the owner's test, click by click (Session T follow-up, 2026-10-05)

> **v2 (Session V, 2026-10-06):** parts 1–9 below are Session T's test, unchanged. The ZIGi v2 test, for [PR #76](https://github.com/reyals1111-ux/ZIGoals/pull/76), is **Part V** at the end: it reuses part 1's setup on the branch `feature/session-v-zigi-v2`.

This is the test you run yourself, on your Mac and later on your iPhone. It assumes nothing: every Terminal command
sits in its own block with one line saying what it does, and every click is named. Real providers could not be reached
from the build sandbox, so this document is how the real thing gets proven. Nothing here needs a ZIGoals secret; every
key stays yours. Plan about an hour for parts 1 to 7, and twenty minutes for part 8 after the deploy.

Facts about other people's software (Ollama, OpenAI, OpenRouter, Chrome) come from their official pages, read on
2026-10-05 and listed at the end. Where a provider's menu may have moved since, the step says what to look for.

## 1. Start the local preview on your Mac

Open **Terminal** (press ⌘ Space, type `Terminal`, press Return). Then run these blocks one at a time: paste a block,
press Return, wait until the prompt comes back.

Install the Node version manager `fnm` if you do not have it yet (skip when `fnm --version` already answers):
```
curl -fsSL https://fnm.vercel.app/install | bash
```
Close Terminal and open it again so `fnm` is on your path. Then go to the repository (adjust the path if you keep it
elsewhere):
```
cd ~/ZIGoals
```
Select the exact Node version the repository pins (`.node-version` says 24.19.0):
```
fnm install 24.19.0 && fnm use 24.19.0
```
Turn on Corepack so the exact pnpm version from `package.json` (11.19.0) is used automatically:
```
corepack enable
```
Check out the pull request's branch:
```
git fetch origin && git checkout feature/session-t-your-ai-2026-10-04 && git pull
```
Install the dependencies exactly as locked, without running any package's install scripts:
```
pnpm install --frozen-lockfile --ignore-scripts
```
Confirm the toolchain (it prints the Node and pnpm versions and says whether they match):
```
pnpm run doctor
```
Start the app as a Local Demo on port 3101 (leave this Terminal window open; it keeps the server running):
```
NEXT_PUBLIC_APP_ENVIRONMENT=LOCAL_DEMO pnpm --filter @zigoals/web exec next dev --hostname 127.0.0.1 --port 3101
```
Now open **Chrome** and go to `http://127.0.0.1:3101/app`. You should see Today. If the page is empty, go to
**Settings** (left sidebar) → **Load Showcase Demo**, which fills the app with fictional records.

Expected: at the bottom right of every app page a round **ZIGi** button with the placeholder figure, and in Settings a
section **ZIGi · your AI** with the label **Premium · free during Alpha**. If the section is missing, the branch did
not check out; run the `git checkout` block again.

## 2. Install Ollama and one small model

1. In Chrome open `https://ollama.com/download`, download Ollama for macOS, open the downloaded file and move Ollama
   to Applications. Open it once; a llama icon appears in the menu bar.
2. Pull one small chat model. Ollama's library lists Llama 3.2 in two sizes: `llama3.2:1b` (1.3 GB download) and
   `llama3.2:3b` (2.0 GB). Start with the 1B model; it answers quickly on any recent Mac. Open a **second** Terminal
   window (⌘ N) and run:
   ```
   ollama pull llama3.2:1b
   ```
3. Confirm the model runs. This opens a chat in Terminal; type `hello`, read the answer, then type `/bye`:
   ```
   ollama run llama3.2:1b
   ```
4. Confirm the server answers on its default address. You should see one line of JSON with a version:
   ```
   curl http://127.0.0.1:11434/api/version
   ```
Expected: a version number. If Terminal says `Connection refused`, open the Ollama app from Applications and try again.

A page on `127.0.0.1` (your preview) may talk to Ollama without any extra setting. The hosted Alpha needs one more
step; it is in part 8.

## 3. Connect ZIGi to Ollama and use it on every page

1. In the preview, open **Settings** → scroll to **ZIGi · your AI** → press **I run a model on this computer**.
2. Press the **Ollama** preset. The address field shows `http://127.0.0.1:11434`.
3. Press **Test connection**. Expected: "Found Ollama at http://127.0.0.1:11434" and a list with `llama3.2:1b`.
4. Press `llama3.2:1b`, then **Connect**. Expected: a connection card "Ollama · llama3.2:1b" and the note that no key is
   kept because none is needed.
5. Go to **Habits**. Press the **ZIGi** button at the bottom right (or press ⌘ K). Expected: the panel opens with
   ZIGi's greeting and four suggestion chips. Press **Which habits are still open today?** Expected: an answer built
   from your real habits, under it the line **Answer from your AI (Ollama), not from ZIGoals.** and a token count such
   as "128 in · 40 out tokens". No money appears anywhere.
6. Type `Mark <one of your open habits> as done` and press **Send**. Expected: one card "Check in: <habit>" with the
   day. Press **Add**. Expected: the habit shows as done behind the panel and the card says "Added". Press **Undo**
   within ten seconds. Expected: the check-in is gone again.
7. Type `I drank two glasses of water and had two eggs for breakfast`. Expected: two cards (water, and the eggs
   labelled **AI estimate** with the estimated values), a button **Add all**, and after it one **Undo** for both.
8. Press **What your AI sees** above the message box. Expected: the exact text sent with your messages: habit names,
   schedules, today's state, nothing else. Close it again.
9. Go to **Today**, **Goals**, **Health** and **Wealth**, open ZIGi on each, press one chip each time. Expected: each
   page has its own chips; Health's answer says Health data is off until you turn on **Include Health** in Settings;
   Wealth shows one total per currency and never converts.
10. Go to **Settings** → ZIGi · your AI → **Health page data** on and **Include Health** on. Back on Health, ask
    `What did I log today?` Expected: today's own entries as names and counts.
11. Voice without any key: in the chat press the **microphone** button. Expected: a line saying which browser service
    may process the audio (Chrome: Google's service unless on-device recognition is available). Allow the microphone
    when Chrome asks, speak one sentence, press the button again. Expected: your words appear in the message box for
    you to edit; nothing is sent until you press Send. If you deny the microphone, expected: a calm note with the steps
    to allow it again, no error dialog.

## 4. Optional: one API key (OpenAI shown; it also covers provider transcription)

Do this only if you want to test a cloud provider. The key stays in your browser; ZIGoals never receives it.

1. In Chrome open `https://platform.openai.com/api-keys` and sign in. Press **Create new secret key**, name it
   `ZIGoals test`, and copy it once (OpenAI shows it only once).
2. Give it a small monthly budget so a mistake cannot cost much: in the platform's **Settings** look for **Limits**
   (`https://platform.openai.com/settings/organization/limits`) and set a low monthly budget there; the page names
   the fields. If your account is on prepaid billing, **Billing** shows your credit balance and lets you top it up.
   Pick an amount you are comfortable losing; this document does not suggest one.
3. In the preview: Settings → ZIGi · your AI → **Disconnect** (from Ollama) → **I have an API key** → provider
   **OpenAI** → paste the key. Leave **Remember on this device** off for this first run.
4. Press **Test connection**. Expected: a list of chat models (no embedding or audio models). Pick one, press
   **Connect**. Expected: "OpenAI · <model>" and "Key kept in this page's memory only".
5. Open ZIGi on Today, send `How is my day?`. Expected: an answer labelled "Answer from your AI (OpenAI)…" with token
   counts.
6. Reload the page (⌘ R) and send another message. Expected: the calm failure **Your key is not on this device.** with
   the step to paste it again: the key lived in the page's memory only. In Settings press **Replace the key**, paste
   it again with **Remember on this device** on. Reload: the chat works, and Settings says **Key sealed on this
   device**.
7. Check `https://platform.openai.com/usage`. Expected: a few requests. That page is the only bill; ZIGoals shows
   tokens only.
8. Voice through the key: Settings → ZIGi · your AI → **Voice** → **Recorded, transcribed by OpenAI**, model
   `gpt-4o-mini-transcribe`. In the chat press the microphone, speak, press again. Expected: the words appear in the
   message box; a recording stops by itself after sixty seconds.
9. Afterwards: Settings → **Disconnect**. Expected: the connection card disappears and reconnecting asks for a key
   again. Then delete the key at `https://platform.openai.com/api-keys` (the bin icon next to `ZIGoals test`).

## 5. The OpenRouter sign-in (the one official sign-in flow)

1. Settings → ZIGi · your AI → **I have an API key** → provider **OpenRouter** → **Sign in with OpenRouter instead**.
2. Expected: OpenRouter's own page asks you to allow ZIGoals. Allow it. You come back to Settings → ZIGi · your AI
   with a clean address (no `code=` in the URL) and the setup continues at the model list.
3. Pick a model, Connect, send one message on Today. Then open `https://openrouter.ai/settings/keys`: the new key is
   listed. Revoke it there when done; the next message in ZIGi should fail with the "key" fix steps.

## 6. Someone with only a subscription (the bridge)

1. Settings → ZIGi · your AI → **Disconnect** if connected → **I only have a subscription** → **ChatGPT** → **Use my
   subscription**.
2. Go to **Goals**, press the ZIGi button. Expected: a question box, **Copy for my AI** and **Open ChatGPT ↗**; a
   fold **What will be copied** shows the exact text, which starts by saying the records are data, not instructions.
3. Type a question, press **Copy for my AI**, press **Open ChatGPT ↗**, paste. Nothing was sent by ZIGoals.

## 7. Privacy checks

1. Settings → **Account & sync**: while the sign-in form, a one-time code, the vault unlock or a recovery secret is
   on screen, the ZIGi button must be gone. Close the form: it comes back.
2. Settings → **Export everything**: unzip the file, open the JSON. Expected: `device.aiChats` (your chats) and
   `device.ai` (your settings) exist and no key appears anywhere (search the files for `sk-`).
3. Open Chrome's console (⌥ ⌘ J): no key, no prompt and no reply is ever printed; provider errors show a status and
   plain words only.
4. Settings → ZIGi · your AI → **Turn off ZIGi** with **Also delete all chats** ticked. Expected: the section returns
   to the setup, a new chat's History is empty, and reconnecting asks for the key again.
5. The ZIGi button's **×** hides it; a toast offers **Undo** for ten seconds. Afterwards **Settings → ZIGi · your AI →
   Show the ZIGi button** brings it back (on a phone also **More → Show ZIGi again**).

## 8. After the deploy: alpha.zigoals.app and the iPhone

1. The hosted page must be allowed to reach Ollama. In Terminal (the exact command from Ollama's FAQ, with our origin):
   ```
   launchctl setenv OLLAMA_ORIGINS "https://alpha.zigoals.app"
   ```
   Then quit Ollama from the menu bar icon and open it again. Without this, Test connection fails with "No local
   server answered" and the fix steps name this variable.
2. Open `https://alpha.zigoals.app/app` in **Chrome 142 or later**. Settings → ZIGi · your AI → I run a model on this
   computer → Ollama → **Test connection**. Expected: Chrome asks once whether the site may "look for and connect to
   devices on your local network"; allow it. Then "Found Ollama…" as in part 3. Safari shows no such prompt and works
   through the same `OLLAMA_ORIGINS` setting; Firefox works too but has no browser speech recognition.
3. iPhone: open the Alpha in Safari, add it to the Home Screen (Help → Install on iPhone). Open the installed app.
   Settings → ZIGi · your AI → I have an API key: **Remember on this device** is on by default here (it is off in a
   Safari tab). Connect with the OpenAI key from part 4 (local models do not work from a phone: nothing listens on the
   phone's own localhost, and the setup says so).
4. Expected on the phone: the ZIGi button sits above the tab bar and disappears while **More** or any sheet is open;
   the chat is a full-height sheet; when the keyboard opens, the message box stays above it and the page behind does
   not scroll; the × closes it and focus returns to the ZIGi button.
5. Voice on the phone: hold the microphone to talk and release to stop, or tap once to start and once to stop; iOS
   Safari shows the Apple disclosure line.

## 9. What to report back

For each part, a line "passed" or the exact text of the failure card (it is written to be copied). Please add:
- screenshots of anything that looks wrong, with the device (Mac/iPhone), the browser and the page;
- whether Chrome's local-network prompt appeared once and whether a denied prompt was explained well enough;
- whether the labels **Premium · free during Alpha** and the Help topic say what you want;
- the first ZIGi figure set, when ready: the file contract is in [YOUR_AI_V1.md](YOUR_AI_V1.md) §4.

## Part V. ZIGi v2 (Session V, PR #76), click by click

Start as in part 1, with this branch instead of T's (in the first Terminal window, after stopping the server with
Control-C):
```
git fetch origin && git checkout feature/session-v-zigi-v2 && git pull
```
```
pnpm install --frozen-lockfile --ignore-scripts
```
```
NEXT_PUBLIC_APP_ENVIRONMENT=LOCAL_DEMO pnpm --filter @zigoals/web exec next dev --hostname 127.0.0.1 --port 3101
```
Open `http://127.0.0.1:3101/app` in Chrome and load the Showcase (Settings → **Load Showcase Demo**) unless you
test with your own records. Every reply, card and file says when its data is fictional.

### V1. Mac: your question, answered (the finding from #29)
1. Before connecting anything: open **Health**, press the ZIGi button, type `How many minutes did I meditate this
   month?` and press **Send**. Expected: an answer at once, labelled **Answered on your device · no AI used**, with
   the minutes, the days counted and **Records used** (open it: the meditation habit's check-ins this month). Nothing
   was sent anywhere.
2. Ask `How did I sleep?` with Health not shared. Expected: "Health isn't shared with ZIGi" with the way to turn it on;
   nothing was read.
3. Ask something that is not a lookup, such as `Help me plan a calmer evening`. Expected: examples of what ZIGi can
   answer here, made from your own records, and the pointer to connect an AI.

### V2. Mac: the subscription bridge with the meditation question
1. Settings → ZIGi · your AI → **Connection** → **I only have a subscription** → your app (ChatGPT, Claude, Grok or
   Gemini) → **Use my subscription**.
2. On **Health**, type `How many minutes did I meditate this month?`. Expected: above the box, chips naming the
   records ZIGi chose (the meditation habit, this month); each has a remove button. Open **What will be copied**:
   the habit's figures for this month are in the text, after the line that they are records, not instructions.
3. Remove the chip and open **What will be copied** again: the figures are gone. Put them back by typing the question
   again.
4. Press **Copy for my AI**, then **Open <app> side by side** (on a wide window) or **Open <app> ↗**. Paste in the app
   and ask. Expected: the app can now answer with your month's minutes. ZIGoals sent nothing.

### V3. Mac: Ollama on the hosted Alpha (after the deploy) or the preview
1. For the preview, part 3 of the v1 test is enough. For `https://alpha.zigoals.app`, allow the origin exactly as part
   8 says:
   ```
   launchctl setenv OLLAMA_ORIGINS "https://alpha.zigoals.app"
   ```
   then quit and reopen Ollama.
2. In Chrome 142 or later, Settings → ZIGi · your AI → **I run a model on this computer** → **Ollama** → **Test
   connection**. Expected: Chrome's prompt to "look for and connect to devices on your local network" once; allow it.
   Then "Found Ollama…".
3. Ask the meditation question on Health with **Health page data** and **Include Health** both off. Expected: ZIGi's
   own answer (as in V1) or, for questions it cannot answer itself, a reply from Ollama labelled **Answer from your AI
   (Ollama), not from ZIGoals.** Under **Advanced → How your AI gets your data**, the line says whether your model
   takes tools.

### V4. Mac: one API key with a spending limit (tools, photo, quick and deep)
1. Create a key and set a monthly limit at the provider first, as in part 4 (OpenAI shown; Anthropic, Google, xAI or
   OpenRouter work the same way). Connect it in Settings.
2. Tools: Settings → **Advanced** → **Data for each message** → **Tools**. On **Habits**, ask `Compare my meditation
   this week with last week`. Expected: under the reply, **ZIGi looked at:** chips (for example "meditation · this
   week"); open one to see exactly what went to your AI. The usage table in **Advanced → Usage on this device** counts
   the requests.
3. Health stays out: ask `How much water did I drink yesterday?` with Health not shared. Expected: your AI says it
   cannot see Health; no Health chip appears.
4. Photo meal: Settings → **Health page data** and **Include Health** on, and tick **<model> reads photos** under
   **Advanced** if your provider's model page says the model takes images. On **Health**, press the 📷 button (**Add a
   meal photo**), choose a photo of a meal, type `log this as lunch`, **Send**. Expected: cards labelled **Estimated
   by your AI from a photo**; unknown nutrients stay unknown; nothing is written until you press **Add**. In the
   conversation the message says the photo went to your AI and ZIGoals did not keep it.
5. Quick and deep: **Advanced → Choose a deep model**, pick a larger model. Ask a question, then press **Think
   deeper** under the reply. Expected: the same question answered again by the deep model, labelled with it.
6. Optional prices: **Advanced → Your prices for <provider>**, enter the prices from the provider's pricing page.
   Expected: "Estimate from your prices", per currency, never converted, "not a bill".
7. Log by voice: press **Log mode**, hold the microphone (or tap it), say `two eggs, toast and a coffee for breakfast,
   30 minutes meditation and two glasses of water`. Expected: editable words in the box; after **Send**, several
   cards with **Add all** and one **Undo**. Activity then shows **Actions by ZIGi**.

### V5. Mac: the context pack in a Claude or ChatGPT project
1. Settings → ZIGi · your AI → **Privacy & data** → **Context pack for my AI**. Leave Health unticked. Read the
   preview and the warning **This file isn't encrypted. Anyone and any AI you give it to can read it.**
2. Press **Download (.md)**. Expected: a file named `zigoals-context-pack-<date>.md` whose text equals the preview.
3. In Claude: **Projects** → your project → add the file to the project's knowledge (in ChatGPT: a Project → add
   files). Ask there `How many minutes did I meditate this month?`. Expected: the answer comes from the file.
4. Optional: tick **Remind me each week to make a new one**; the reminder shows on Today and in **Reminders → ZIGi's reminders**, where
   **Remove** deletes it.

### V6. Mac: the mini window
1. In Chrome (116 or later) open ZIGi on any page and press **Pop out**. Expected: the same conversation in a small
   window that stays on top of other apps.
2. Ask a question in the window; switch to another app: the window stays. Press **Back to tab**: the chat returns to
   the panel with the same messages.
3. With the window open, open a private screen in the tab (Wealth → Add asset). Expected: the window blurs and says it
   is paused; closing the sheet resumes it.

### V7. Mac: browser AI agents (WebMCP) with Chrome's flag
1. In Chrome open `chrome://flags/#enable-webmcp-testing`, set it to **Enabled**, and relaunch Chrome.
2. Settings → ZIGi · your AI → **Privacy & data** → **Browser AI agents** (the card appears only now). Read it; turn on
   **Let browser AI agents use ZIGoals tools**.
3. Use Chrome's built-in agent, or any WebMCP inspector you trust, on Habits. Expected: tools named `zigoals_…`; each
   call shows a ZIGi notice with **What it got**. A proposal opens ZIGi's panel with cards; nothing is written until
   **Add**. On Settings no tool is offered.
4. Press **Turn off browser agents** in the notice. Expected: the tools are gone.
5. Set the flag back to **Default** when done.

### V8. Mac: Chrome's on-device model, if your Chrome has it
1. Settings → ZIGi · your AI → **Connection** → **Chrome's on-device model**. If the card is missing, Chrome has no
   model here (it needs Chrome 148+ on a computer, about 22 GB free and a capable GPU or CPU); note it and skip.
2. Press **Download Chrome's model** and wait for it to finish. Then turn on **Use Chrome's on-device model**.
3. Disconnect any AI. Ask a question ZIGi's lookups did not understand. Expected: **Answered by Chrome's on-device
   model**, or "Read as … with Chrome's on-device model" followed by figures from your records.

### V9. Mac: Customize, Meet ZIGi and the knock
1. In ZIGi's panel press **Customize**. Try **Animation** Full / Calm / Off, **Side** left, **Size** Large, **Greeting**
   Quiet. Expected: ZIGi changes at once; with macOS "Reduce motion" on, it holds still whatever you choose.
2. Press **Meet ZIGi: every state and move →**. Expected: every state at three sizes, with play buttons.
3. Press the small arrow under the ZIGi button (**Hide ZIGi**). Expected: the button goes, an Undo shows for ten
   seconds, and a **Show ZIGi** tab stays at the screen edge; press it to bring ZIGi back.
4. After your first chat ends, ZIGi asks once whether to knock. Press **Yes, knock**. Give a habit a reminder time a
   minute from now, and stay on Habits. Expected: ZIGi peeks out and knocks once with **Do it now**, **Snooze** and
   **Not today**. It never knocks on Today, where the reminder has its own card.

### V10. iPhone (after the deploy, the Home Screen app)
1. **Launcher:** the ZIGi button sits above the tab bar and is centred in its circle at each size; the small arrow
   under it hides it; the edge tab brings it back; it hides while More, a sheet or the keyboard is open.
2. **Panel and keyboard:** open ZIGi; the panel is a full-height sheet; when the keyboard opens the message box stays
   above it and the page does not scroll behind it.
3. **Voice, talk to log:** press **Log mode**, hold the microphone and say the breakfast sentence from V4.7; release.
   Expected: the Apple disclosure line, then your words in the box to edit; **Send** gives several cards.
4. **Chips and proposals:** the chips above the box come from your records (for example a streak); press one; add
   one card and undo it.
5. **Knock:** with knocking on (V9.4), a habit due while you are on Habits or Goals makes ZIGi knock.
6. **Folded rows:** on Today open two folded rows, leave Today and come back, then close the app and reopen it.
   Expected: the two rows are still open; the others stay folded.
7. Note: the mini window, browser agents and Chrome's on-device model do not exist on an iPhone; their buttons and
   cards are absent there by design.

### V11. ZIGoals hosted (only after you activate it)
It is off in every build, and this PR deploys nothing. If you later activate it, follow
[ZIGI_RELAY_ACTIVATION.md](../run11/ZIGI_RELAY_ACTIVATION.md) step 6, which is the test.

### V12. What to report back
- For each step, "passed" or the exact text of what went wrong, with the device, the browser and the page.
- Whether the meditation question (V1, V2, V3) now gets the month's figures on each path.
- Whether the five Settings groups read clearly, and whether the Help questions under "ZIGi · your AI" answer what you
  would ask.
- Whether the knock offer's wording and the knock itself feel right; whether Calm breathing is calm enough.
- Anything shown that you did not expect to see, especially Health with Health switched off.

## Sources (read 2026-10-05)
- Ollama library, Llama 3.2: <https://ollama.com/library/llama3.2> (tags `1b` 1.3 GB and `3b` 2.0 GB; `ollama run`
  and `ollama pull`). Ollama FAQ: <https://docs.ollama.com/faq> (`OLLAMA_ORIGINS`, `launchctl setenv`, "Restart Ollama
  application"). Ollama download: <https://ollama.com/download>.
- OpenAI API keys: <https://platform.openai.com/api-keys>; usage: <https://platform.openai.com/usage>; limits:
  <https://platform.openai.com/settings/organization/limits> (the help article on prepaid billing could not be read
  from the sandbox on 2026-10-05, so the budget step names the page and no amount).
- OpenRouter PKCE and keys: <https://openrouter.ai/docs/use-cases/oauth-pkce>, <https://openrouter.ai/settings/keys>.
- Chrome 142 Local Network Access prompt and the browser facts: [YOUR_AI_V1.md](YOUR_AI_V1.md) §2, with its sources.
- Node and pnpm versions: the repository's `.node-version` and `package.json` (`packageManager`); `fnm`:
  <https://github.com/Schniz/fnm>.
- Session V additions (read 2026-10-05/06): Chrome's WebMCP testing flag, Document Picture-in-Picture support and the Prompt API requirements, with their sources in [YOUR_AI_V2.md](YOUR_AI_V2.md) §2 and §7.
