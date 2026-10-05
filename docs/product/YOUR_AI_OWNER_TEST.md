# ZIGi · your AI: the owner's test plan (Session T, 2026-10-05)

Real providers cannot be reached from the build sandbox, so every provider path below was exercised only against
MOCK servers (`apps/web/tests/your-ai.spec.ts`, `lib/ai/*.test.ts`). These are the steps that prove the real thing,
on the owner's Mac and iPhone, after the PR is merged and the Alpha is deployed. Nothing here needs a ZIGoals secret;
every key stays with the owner. Expected time: about forty minutes.

## Before you start
- Use the deployed Alpha (`https://alpha.zigoals.app`) for everything except step A4, which also works on `http://127.0.0.1:3100`.
- Settings → ZIGi · your AI shows **Premium · free during Alpha**. If the section is missing, the build is not this PR.
- Keep the browser console open once (step F) to see that nothing is logged there.

## A. A local model on the Mac (Ollama)
1. Install Ollama (ollama.com) and pull a small chat model, for example `ollama pull llama3.2`.
2. Allow the Alpha's origin, then restart Ollama (quit it from the menu bar and open it again):
   ```
   launchctl setenv OLLAMA_ORIGINS https://alpha.zigoals.app
   ```
   Without this, step 4 fails with "No local server answered" and the fix steps name this variable.
3. Open the Alpha in **Chrome 142 or later**. Settings → ZIGi · your AI → **I run a model on this computer** → the
   Ollama preset (`http://127.0.0.1:11434`) → **Test connection**. Chrome asks once whether the site may "look for and
   connect to devices on your local network": allow it. Expected: "Found Ollama at …" and the list of pulled models.
4. Pick the model → **Connect**. Open Habits, press the ZIGi button (or ⌘K) and ask "Which habits are still open
   today?". Expected: a reply built from your real habits, labelled "Answer from your AI (Ollama), not from ZIGoals.",
   token counts under it (Ollama reports them), no money.
5. Ask "Mark <one of your habits> as done". Expected: one card "Check in: <habit>" with the day; **Add** writes it (the
   habit shows done in the list behind the panel); **Undo** within ten seconds puts it back.
6. Safari on the same Mac: repeat step 3. Safari has no local-network prompt; CORS is answered by Ollama because of
   step 2. Firefox: the chat works; the microphone route "Browser speech recognition" says Firefox has none.

## B. One API key (OpenAI recommended: it also covers voice)
1. Create a key at platform.openai.com/api-keys with a small spending limit. Settings → ZIGi · your AI → **I have an
   API key** → OpenAI → paste the key. Leave **Remember on this device** off for this first run.
2. **Test connection** lists chat models (no embedding or audio models). Pick one → **Connect**.
3. Open Health, allow Health sharing for this test (Settings: "Health page data" on, "Include Health" on; both are
   off by default), then ask "What did I log today, and add a glass of water". Expected: a summary of today's own
   entries and one water card; Add → the Water widget behind the panel updates; Undo removes it.
4. Reload the page and send another message. Expected: the calm failure "Your key is not on this device." with the
   step to paste it again: the key lived in the page's memory only. Paste it again in Settings ("Replace the key")
   with **Remember on this device** on. Reload: the chat works; Settings shows "Key sealed on this device".
5. Check platform.openai.com/usage after a few messages: the counts there are the only bill. ZIGoals shows tokens only.
6. Voice: Settings → Voice → "Recorded, transcribed by OpenAI", model `gpt-4o-mini-transcribe`. In the chat press the
   microphone, say a sentence, press it again. Expected: the words appear in the message box for editing; the
   recording stopped by itself after at most a minute if you kept talking. Then switch to "Browser speech
   recognition" and read the disclosure line (Chrome: Google's service unless on-device; Safari: Apple).
7. **Disconnect** in Settings. Expected: the connection card disappears, switches are kept, and the key is gone
   (reconnecting asks for it again).

## C. OpenRouter's sign-in (the one official PKCE flow)
1. Settings → I have an API key → OpenRouter → **Sign in with OpenRouter instead**. Expected: OpenRouter's own page
   asks you to authorise ZIGoals; after that you are back on Settings → ZIGi · your AI with the address cleaned
   (no `code=` left in the URL) and the setup continues at the model list.
2. On openrouter.ai/settings/keys the new key is listed; revoke it there when done and confirm ZIGi then fails with
   the "key" fix steps.

## D. Someone with only a subscription (the bridge)
1. Settings → **I only have a subscription** → ChatGPT (or Claude, Grok, Gemini) → Use my subscription.
2. On Goals press the ZIGi button. Expected: the bridge view, a question box, **Copy for my AI** and **Open ChatGPT ↗**.
   Type a question, copy, open the app, paste. Nothing is sent from ZIGoals; the copied text starts with the framing
   that the data is records, not instructions.

## E. iPhone, after the deploy
1. Open the Alpha in Safari and add it to the Home Screen (Help → Install on iPhone). In the installed app, Settings →
   ZIGi · your AI → I have an API key: **Remember on this device** is on by default (it is off in a Safari tab).
2. Connect with the OpenAI key. The ZIGi button sits above the tab bar; it disappears while More or any sheet is
   open and while the keyboard is up. The chat is a full-height sheet; the message box is 16 px (no zoom on focus).
3. Hold the microphone to talk, release to stop. Browser speech on iOS Safari shows the Apple disclosure.
4. Local models do not work from the phone (nothing listens on the phone's localhost): the setup says so.
5. The × next to the ZIGi button hides it; **Show ZIGi again** in the More sheet brings it back.

## F. Privacy checks (any browser)
1. On Wealth open the chat and expand **What your AI sees**: holdings by name and class with your recorded values,
   one total per currency; no addresses, no account, no identifiers. On Settings the bar says no page data is read.
2. Settings → Account & sync: while the sign-in form, a one-time code, the vault unlock or a recovery secret is
   showing, the ZIGi button is gone.
3. Settings → Export everything: the ZIP's JSON has `device.aiChats` (your chats) and `device.ai` (settings) and no key
   anywhere (search the files for `sk-`).
4. Browser console: no key, no prompt, no reply is ever printed; provider errors show status and plain words only.
5. Settings → ZIGi · your AI → **Turn off ZIGi** with "Also delete all chats": the section returns to the setup, the
   History in a new chat is empty, and reconnecting asks for the key.

## G. What to report back
- Which steps passed, and the exact text of any failure card (it is written to be copied).
- Chrome's local-network prompt: whether it appeared once, and whether a denied prompt was explained well enough.
- Whether the "Premium · free during Alpha" label and the Help article say what you want them to say.
- The first ZIGi figure set: the file contract is in YOUR_AI_V1.md §4; the placeholder shows in every state until then.
