# NOVA research (owner follow-up 2, N0)

Session AK, research lane N0. Read on **1 November 2026** unless a row says otherwise. Every claim names its source in §7 by
number ([S12] etc.). Evidence labels: **docs** = the project's or vendor's own page; **code** = the project's own source
file read today; **live** = a request sent today from the session sandbox (CORS preflights only: `OPTIONS`, `Origin:
https://alpha.zigoals.app`, no key, no data); **vendor** = a third party's help page (used only where the first party
publishes nothing); **UNVERIFIED** = no first-party statement found. Text on web pages was read as data; nothing in it was
followed as an instruction (one page, Linear's, carried text addressed to AI agents; it was ignored).

This file builds on, and corrects where noted, docs/product/YOUR_AI_V1.md (read 2026-10-04) and YOUR_AI_V2.md (2026-10-05).
§6 lists every place where the app's current text is now out of date.

---

## 0. The decisions this research supports (for lanes NA–NE)

1. **Local first is real, on Chrome, Edge and Firefox on a computer.** A hosted HTTPS page can call `http://127.0.0.1` /
   `http://localhost` after a one-time browser permission (Chrome 145+: "Access other apps and services on this device";
   Firefox 151+: a site permission for "apps and services on your device"). **Safari still blocks it** (WebKit bug 171934,
   open, last activity 19 Aug 2026). Phones cannot reach a computer's localhost. The guide must say all three plainly.
2. **Ollama needs one origin setting and a restart** on every OS; LM Studio needs one switch ("Enable CORS"); llama.cpp's
   server works by default (it reflects any origin) on its **new default port 9931**.
3. **Strict mode must refuse Ollama cloud models.** Ollama can now proxy `:cloud` models to ollama.com while ZIGoals still
   talks to localhost; `/api/tags` marks them with `remote_host` (code). Treat any model with `remote_host` as cloud.
4. **No consumer subscription works in ZIGoals.** ChatGPT Plus/Pro, Claude Pro/Max/Ultra, SuperGrok/X Premium and Google AI
   Pro do not give a third-party web app API access. Two nuances to state honestly: Claude Max/Ultra/Team include monthly
   **API credits** that a person can spend through an ordinary Console API key; ChatGPT "Sign in with ChatGPT" plan sharing
   exists only for participating/approved apps and open-source locally hosted apps, which ZIGoals is not (§4).
5. **Gemini's free tier exists, but not for people in the EEA, Switzerland or the UK** in an app like ZIGoals: Google's
   terms say apps offered to users there may use only Paid Services (§3.3). The owner is in Brussels: say it.
6. **pricing.ts is correct for the three Claude models it lists, and covers nothing else** (§3.4). The cost meter needs
   OpenAI, Gemini and xAI rows plus OpenRouter's per-model prices from its public model list.
7. **Engine finding for NE/NB:** OpenAI's newest models `gpt-6.1-sol` and `gpt-6.1-terra` state "Tool calling requires the
   Responses API"; ZIGi's OpenAI adapter sends tools on Chat Completions. Chat works; tool calls on those two models will
   not (§3.2).

---

## 1. The personal-Jarvis-dashboard trend

### 1.1 The setups people share (first-party claims, read today)

| Setup | What it is (its own words) | Local model | Voice | Memory | Visual presence | Runs as |
|---|---|---|---|---|---|---|
| **OpenClaw** (ex-Clawdbot/Moltbot) | Self-hosted agent gateway with macOS/iOS/Android apps, wake word, interruptible talk mode, sub-agents behind approvals [S40] | optional (cloud APIs common) | wake word, talk mode | yes | apps + chat channels | daemon on own hardware |
| **Open WebUI** | "Chat with Ollama, OpenAI, Anthropic, or any OpenAI-compatible provider from one interface"; "Speech-to-text, text-to-speech, hands-free voice & video calls"; memory "retains facts about you across conversations"; Python tools; knowledge bases [S41] | yes (Ollama) | yes | yes | chat UI | self-hosted web app |
| **Jan** | "Your personal intelligence. Run any model, your way."; open source; 7.2M+ downloads; memory "Coming Soon" [S42] | yes | — | coming | chat UI | desktop app |
| **AnythingLLM** | "Own your intelligence."; "A private AI assistant that runs entirely on your computer"; "No accounts, no API keys, no token limits"; documents become the agent's knowledge "with no data leaving your device"; Android app runs small models and pairs with the desktop [S43] | yes | — | documents | chat UI | desktop + Android |
| **Msty** | "Private AI for real work"; "privacy-first workspace"; "Zero product telemetry" [S44] | yes | — | knowledge stacks (coming) | chat UI | desktop |
| **LM Studio / Bionic** | "Bionic is LM Studio's agent for open models"; "Natively local"; "Your voice and audio data is processed locally and never leaves your device" [S45] | yes | local | — | agent UI | desktop |
| **Home Assistant Assist** | Assist "can run fully on your own hardware, so your voice commands stay private"; wake words "Hey Jarvis" or "Hey Nabu"; satellites in every room; opened from the dashboard [S46] | optional LLM | yes, wake word | — | the home dashboard | home server |
| **DIY "Jarvis" builds** (GitHub) | the curated list's four hallmarks: Voice, Hands-free, **Visual presence** ("An orb, HUD, avatar, overlay or dashboard shows state and work in progress. A chat transcript alone doesn't count."), Oversight (approvals, kill switch); proactive briefs ("Sir, you have a meeting in ten minutes") [S39] | mostly Ollama | wake word + TTS | RAG "memory vaults" | orb/HUD | Python/Electron |
| **The owner's own NOVA** (screenshots) | starfield + nebula band, centred orb "STANDBY · CLICK TO SPEAK", big clock, "Your day", service buttons, "What's on your mind" command bar with ⌘K, glass chat panel "Your context stays together when the model changes" | — | click to speak | — | orb + dashboard | web |

Adoption: OpenClaw "exploded in popularity in January 2026, amassing over 145,000 GitHub stars in weeks" (secondary
reporting, [S47]); Jan reports 7.2M+ downloads [S42]. The curated list's reviewers found "nobody is fully hands-free yet"
[S39].

### 1.2 What makes them feel magical
1. **A presence, not a transcript**: an orb/face/HUD that shows idle, listening, thinking, speaking [S39]. The owner's
   NOVA and every viral build lead with it.
2. **"It knows my day"**: the opening line is about *you* (calendar, tasks, habits), not a blank prompt. Proactive briefs
   are the hallmark example [S39].
3. **Voice with interruption**: wake word or click-to-speak, answers out loud, can be cut off [S39][S40].
4. **One command bar** for everything (⌘K): ask, open, do. Raycast's new app merges launcher and AI chat — "the same
   composer powers both" [S62].
5. **Widgets that are live**: clock, next items, timers, now playing, status — glanceable without asking.
6. **Visible agency with a kill switch**: you watch it work, approve each step, can stop it [S39].
7. **Model independence**: "Your context stays together when the model changes" (owner screenshot); Open WebUI/Jan/Msty
   all sell "any model" [S41][S42][S44].
8. **Ownership**: "Own your intelligence", "runs entirely on your computer" [S43].

### 1.3 What people complain about
| Pain | Evidence | NOVA's answer |
|---|---|---|
| **Setup pain** (origins, ports, 403s) | Many GitHub issues: "Ollama requests return 403 … unless OLLAMA_ORIGINS is configured"; macOS app not inheriting a shell `export`; restart forgotten [S48] | one copyable block per OS, a live test that names the failing step (403 → origin; refused → not running; TypeError → browser permission) |
| **Security of "agents with your keys"** | OpenClaw: secrets in plaintext files, exposed gateways, "ClawJacked" website hijack (secondary reporting) [S47] | NOVA has no gateway, no shell, no file access; keys stay in the browser; every write is a confirm card |
| **"Local-first" that is not** | "The data might live on your machine, but it flows through model APIs every time the assistant runs" (critic, [S47]); Ollama `:cloud` models [S20] | Strict mode = local only, enforced in the send path, cloud tags refused, "What NOVA can see" before sending |
| **Cost surprises** | pay-per-token keys; subscriptions that do not cover API (§4) | cost meter (estimate, daily cap), local = "free, on your device" |
| **Forgetting** | Jan ships memory as "Coming Soon" [S42]; memory is a headline feature where it exists [S41] | approved long-term memory with sources, edit and forget (N7) |
| **Not hands-free / approval fatigue** | "nobody is fully hands-free yet" [S39] | confirm cards stay (money never auto); briefs and read-only answers need no approval |

### 1.4 Which patterns fit a PWA (and which do not)
| Pattern | PWA fit | Notes |
|---|---|---|
| Orb + dashboard + command bar | ✅ | pure UI; canvas/SVG |
| Click-to-speak voice | ✅ with honesty | Chrome sends audio to a server unless `processLocally` (§5) |
| Always-listening wake word | ❌ | no background mic in a web page; skip |
| Morning brief on open / as notification | ✅ | composed on open; push only if notifications already on |
| Picture-in-picture mini window | ✅ Chrome 116+, Firefox 151+ (Document PiP); ❌ Safari [S38] | lib/ai/pip.ts |
| App badge for unread briefs | ✅ Chrome 81+, Safari 17 / iOS 16.4; ❌ Firefox [S38] | `navigator.setAppBadge` |
| Local model on the same computer | ✅ Chrome/Edge/Firefox; ❌ Safari; ❌ phones | §2.1 |
| On-device browser model | ✅ Chrome 148+ desktop (Prompt API) [S38] | already in lib/ai/on-device.ts |
| Shell/file/agent control of the computer | ❌ by design | the security complaints above |
| Multi-device sync, shared rooms, accounts | ❌ by the owner's rule | nothing that needs a server |

### 1.5 Ten design takeaways for NOVA, ranked
1. **Lead with presence and "your day"**: the orb with honest states (idle breathes, listening ripples, thinking swirls,
   speaking pulses; still under reduced motion) and a first line built from the person's own data — never a blank prompt.
2. **Make the local brain a 3-minute success**: one copyable block per OS, a "Test my setup" that names the exact failing
   step, the browser prompt explained before it appears, and Safari/phone limits said up front.
3. **Privacy you can see**: Strict/Guarded/Relaxed chip always visible; "What NOVA can see" before the first send; cloud
   models (including Ollama `:cloud`) blocked in Strict.
4. **One command bar for ask/open/do** (⌘/Ctrl+J and ⌘K), the same composer for questions and actions.
5. **Visible agency, safe agency**: every step shown live, every write a confirm card with Undo, a stop button always
   reachable; money never auto-accepted.
6. **Live, glanceable widgets on orbits** that open their pages with a shared-element transition; unknown shown as
   unknown, empty widgets teach.
7. **Proactive but calm briefs**: morning brief and evening recap composed on the device, unread badge, no nagging.
8. **Memory you control**: proposed → accepted, with source and date, edit/forget/export; "your context stays together
   when the model changes" (one history across ZIGi and NOVA, any model).
9. **Honest money and model talk**: subscriptions do not work; the cost meter is an estimate with a daily cap; local is
   "free, on your device".
10. **Make it yours without a server**: layouts, accent, persona name/avatar, custom instructions, and a shareable setup
    file with no personal data — the "build your own Jarvis" social loop without accounts.

---

## 2. Local models from an HTTPS web app

### 2.1 How each browser treats `https://alpha.zigoals.app` → `http://127.0.0.1:<port>`

| Browser (computer) | Mixed content | Permission | What the person sees | Verdict |
|---|---|---|---|---|
| **Chrome 145+** (stable 156 today; 157 on 3 Nov) [S31] | loopback is treated as a secure origin [S28]; `targetAddressSpace: 'loopback'` additionally exempts a request from mixed-content blocking "once the user grants permission" [S26] | permission split since Chrome 145 into **`local-network`** and **`loopback-network`** (old `local-network-access` kept as alias) [S27]; default allowlist `'self'` (top-level ZIGoals is fine) | prompt "**Access other apps and services on this device**"; site setting "**Apps on device**" (vendor help, [S29]); Chrome 142–144 said "Look for and connect to any device on your local network" [S25][S29] | ✅ after one Allow |
| Chrome 142–144 | as above | single LNA permission [S25] | "Look for and connect to any device on your local network" | ✅ |
| **Edge** (Chromium) | as Chrome | as Chrome | Edge setting text: "Sites can ask to connect to any device on your local network" (vendor help, [S29]) | ✅ |
| **Firefox 151+** (stable 159) | "Local resources are considered to be from secure origins … `http://127.0.0.1/` or `http://localhost/`" [S28] | "Firefox requires websites to request permission before connecting to devices on your local network or to apps and services on your device" — rolled out to all users progressively from 151 (19 May 2026) [S30] | a permission prompt near the address bar (allow/block, remember) | ✅ after one Allow |
| **Safari** (27.x) | **blocked**: WebKit bug 171934 "Don't treat loopback addresses … as mixed content" is still NEW (last comment 19 Aug 2026; developers report it "works fine in Chrome and Firefox" but not Safari) [S32] | — | the request fails | ❌ — say "use Chrome, Edge or Firefox on this computer for a local model" |
| **Any phone** | — | — | a phone's `localhost` is the phone | ❌ — phones use on-device answers or a cloud key |

Rules for the app (Chrome's guide [S26]):
- Query `navigator.permissions.query({name: 'loopback-network'})` (fall back to `'local-network-access'` in a try/catch;
  "older Chrome versions crash when querying 'local-network-access'" per the guide — so wrap it) and show remediation when
  `denied`: "Click the icon left of the address, turn on **Apps on device**, reload" [S26][S29].
- Make the **first** loopback request from the page (a click on "Test my setup"), not from the service worker: workers
  "fail unless permission is already 'granted'" [S26].
- A denied or missing permission surfaces as a `TypeError` network failure, indistinguishable from "server not running"
  except by first checking the permission state [S26].
- The permissions are "denied automatically in insecure (`http://`) top-level contexts" [S26] — the hosted HTTPS app is
  fine; a person running ZIGoals itself on `http://localhost` needs no prompt.

### 2.2 Ollama — per OS (docs [S1][S2][S3][S4], code [S5])

Facts: Ollama "binds 127.0.0.1 port 11434 by default" [S1]. Allowed origins are `OLLAMA_ORIGINS` (comma-separated) **plus**
the built-in localhost/127.0.0.1/0.0.0.0 origins on any port and `app://`, `file://`, `tauri://`, `vscode-webview://`
(code [S5]) — so setting the variable does not remove the defaults. A disallowed origin gets **403**. System requirements:
macOS Sonoma 14+ (Apple silicon GPU, Intel CPU only) [S3]; Windows 10 22H2+, NVIDIA driver 551.61+ [S4]; Linux install
script [S2].

Use the app's real origin (`location.origin`) in every block below; for both Alpha and production:
`https://alpha.zigoals.app,https://zigoals.app`.

**macOS**
```sh
# 1. Install: download Ollama for macOS from https://ollama.com/download, open the .dmg, drag Ollama to Applications, open it.
# 2. Get a model
ollama pull qwen3.5:9b
# 3. Allow ZIGoals (the Ollama app reads variables set with launchctl, not a shell export)
launchctl setenv OLLAMA_ORIGINS "https://alpha.zigoals.app"
# 4. Restart Ollama: menu bar icon → Quit Ollama, then open Ollama again (or:)
osascript -e 'quit app "Ollama"'; sleep 2; open -a Ollama
```
Note: `launchctl setenv` lasts until the Mac restarts (launchd behaviour; Ollama's FAQ does not say this); repeat step 3–4
after a restart. Issue reports confirm the menu-bar app does not inherit a shell `export` and that quitting is required
[S48].

**Windows** (PowerShell)
```powershell
# 1. Install (or download OllamaSetup.exe from https://ollama.com/download)
irm https://ollama.com/install.ps1 | iex
# 2. Get a model
ollama pull qwen3.5:9b
# 3. Allow ZIGoals for your user account (Ollama "inherits your user and system environment variables")
setx OLLAMA_ORIGINS "https://alpha.zigoals.app"
# 4. Restart Ollama: right-click the Ollama icon in the taskbar → Quit Ollama, then start Ollama from the Start menu.
```
GUI alternative from Ollama's docs: Settings (Windows 11) / Control Panel (Windows 10) → search "environment variables" →
"Edit environment variables for your account" → New `OLLAMA_ORIGINS` = `https://alpha.zigoals.app` → OK [S4].

**Linux** (systemd service installed by the script)
```sh
# 1. Install
curl -fsSL https://ollama.com/install.sh | sh
# 2. Get a model
ollama pull qwen3.5:9b
# 3. Allow ZIGoals (opens an editor: add the two lines below, save)
sudo systemctl edit ollama.service
#   [Service]
#   Environment="OLLAMA_ORIGINS=https://alpha.zigoals.app"
# 4. Apply and restart
sudo systemctl daemon-reload
sudo systemctl restart ollama
```
Non-interactive equivalent of step 3 (a standard systemd drop-in):
`printf '[Service]\nEnvironment="OLLAMA_ORIGINS=https://alpha.zigoals.app"\n' | sudo tee /etc/systemd/system/ollama.service.d/zigoals.conf`
(create the folder first with `sudo mkdir -p /etc/systemd/system/ollama.service.d`).

**Check from a terminal (all OSes; Windows: `curl.exe`)**
```sh
curl -i -H "Origin: https://alpha.zigoals.app" http://127.0.0.1:11434/api/version
# Allowed: HTTP 200 and an Access-Control-Allow-Origin header. Not allowed yet: HTTP 403 → step 3/4 again.
```

**Privacy: Ollama cloud models.** Ollama can "Run models in Ollama's cloud"; in the app or CLI they use a `:cloud` tag
(e.g. `gemma4:cloud`), and need an ollama.com sign-in; Ollama "processes cloud prompts and responses" and says it does not
train on them [S20]. Through the local server such a model **looks local to ZIGoals but sends the prompt to ollama.com**.
`GET /api/tags` returns `remote_model` and `remote_host` for these entries, and `/api/show` does too (code [S6]).
Rules: show such models as "cloud via Ollama"; refuse them in Strict; the guide may suggest `OLLAMA_NO_CLOUD=1`
("Disable Ollama cloud features (remote inference and web search)", code [S5]) set the same way as `OLLAMA_ORIGINS`.

### 2.3 LM Studio (docs [S7][S8][S9][S10])
- Requirements: macOS 14+ on Apple silicon ("16GB+ RAM recommended … You may still be able to use LM Studio on 8GB Macs,
  but stick to smaller models"; Intel Macs not supported); Windows x64 (AVX2) and ARM; Linux x64/ARM64 AppImage, Ubuntu
  20.04+; "At least 16GB of RAM is recommended", "at least 4GB of dedicated VRAM" [S9].
- Start the server: **Developer** tab → toggle **Start server** [S8]. The docs' examples use `http://localhost:1234/v1`
  [S10].
- **Server Settings → Enable CORS**: "allow applications from different origins to access the API" [S7]. Optional
  **Require Authentication** ("valid API token via the Authorization header") — paste the token as the key in ZIGoals.
- CLI: `lms server start --cors` ("When not set, CORS is disabled"); `--port` (without it, "the last port you used")
  [S8]. LM Studio warns: "Enabling CORS can expose your server to security risks; we recommend enabling authentication"
  [S8] — the guide should recommend the token.
- Leave **Serve on Local Network** off (not needed on the same computer) [S7].
- Download models in the app's model search; LM Studio's tool support metadata: see YOUR_AI_V2.md (`trained_for_tool_use`).

### 2.4 llama.cpp `llama-server` (docs/code [S11][S12])
- Install: `brew install llama.cpp` (macOS/Linux), `winget install llama.cpp` (Windows), MacPorts, Nix, or release
  binaries [S12].
- Run: `llama-server -m /path/to/model.gguf` or from Hugging Face `llama-server -hf <user>/<repo>-GGUF[:quant]` (quant
  defaults to Q4_K_M; README example `ggml-org/GLM-4.7-Flash-GGUF:Q4_K_M`) [S11].
- **Defaults changed:** `--host` default `127.0.0.1`; **`--port` default 9931** ("The above command will start a server
  that by default listens on `127.0.0.1:9931`"); older guides say 8080 [S11].
- **CORS:** "By default the server reflects any `Origin` header back with credentials allowed" — so a hosted ZIGoals page
  works with no flag. With `--tools`, `--agent` or MCP flags, `--cors-origins` "defaults to `localhost`" and ZIGoals would
  be refused; recommended for a frontend elsewhere: "set `--cors-origins` to your frontend's origin" [S11].
  Recommended command for ZIGoals:
  `llama-server -m /path/to/model.gguf --port 9931 --cors-origins https://alpha.zigoals.app`
- `--api-key KEY` optional (paste as the key) [S11]. OpenAI-compatible `/v1/models` and `/v1/chat/completions`;
  "OpenAI-style function calling is supported with the `--jinja` flag" (Jinja is on by default) [S11].
- ZIGoals' detection works unchanged (no `/api/version` → `/v1/models`), but `LOCAL_SERVER_DEFAULTS` offers only
  `http://localhost:1234` for OpenAI-compatible servers; add `http://127.0.0.1:9931` as the llama.cpp default (§6).

### 2.5 Which open models fit which computer
Rule of thumb (not from a vendor page): the download size below must fit in GPU memory (VRAM) for full speed, plus ~1–3 GB
for context; on Apple silicon the GPU shares RAM and macOS keeps a part for itself, so use about two thirds of RAM as the
budget. Sizes and capability tags are Ollama's library pages read today [S13][S14]; MoE = mixture of experts (fast for
its size). GPU memory: RTX 4070 / 4070 Super / 4070 Ti / 5070 = 12 GB; 4070 Ti Super / 4080 / 4080 Super / 5070 Ti / 5080
= 16 GB; 4090 = 24 GB; 5090 = 32 GB [S33][S34][S35].

| Budget | Recommended `ollama pull` (download size) | Also good | Avoid |
|---|---|---|---|
| **8 GB RAM** (no GPU or 6–8 GB VRAM) | `qwen3.5:4b` (3.3–4.0 GB; tools, vision, thinking) | `phi4-mini` (2.5 GB, tools), `llama3.2:3b` (2.0 GB, tools), `ministral-3:3b` (3.0 GB, tools, vision), `granite4.1:3b` (2.1 GB, tools) | anything ≥ 7 GB; `gemma4:e2b` is 4.6–7.5 GB |
| **16 GB RAM** / **12 GB VRAM** (RTX 4070, 5070) | `qwen3.5:9b` (6.6–7.6 GB; Ollama's default `qwen3.5`) | `gemma4:12b` (7.7–8.0 GB, tools, vision), `ministral-3:8b` (6.0 GB) or `ministral-3:14b` (9.1 GB), `llama3.1:8b` (4.9 GB), `gemma4:e4b` (6.6–9.5 GB) | `gpt-oss:20b` (14 GB) on a 16 GB Mac |
| **32 GB RAM** / **16 GB VRAM** (4070 Ti Super, 4080, 5070 Ti, 5080) | `gpt-oss:20b` (14 GB; tools, thinking) | `gemma4:26b` (16–19 GB, MoE ~4B active — on 16 GB VRAM it spills to RAM), `mistral-small3.2:24b` (15 GB, tools, vision), `granite4.1:30b` (17 GB) | 27B+ dense at full speed on 16 GB VRAM |
| **24 GB VRAM** (RTX 4090) or **32–48 GB Mac** | `qwen3.8:27b` (18 GB; tools, vision, thinking) | `gemma4:31b` (19–20 GB), `qwen3.6:27b` (18–19 GB), `nemotron-3.5-lightning:30b` (19–25 GB, MoE 3B active), `qwen3.6:35b` (23 GB, MoE 3B active) | 70B |
| **32 GB VRAM** (RTX 5090) | `qwen3.6:35b` (23 GB) with long context | `qwen3.8:27b`, `gemma4:31b` | 70B (43 GB) does not fit |
| **64 GB Mac** (unified) | `qwen3.6:35b` or `qwen3.8:27b` | `llama3.3:70b` (43 GB), `deepseek-r1:70b` (43 GB, reasoning) | `gpt-oss:120b` (65 GB) — needs 96–128 GB |

Licences (read today): Qwen 3.5 / 3.6 / 3.8 **Apache-2.0** (HF model metadata) [S15]; Gemma 4 **Apache-2.0** (HF metadata
for gemma-4-E4B-it; Gemma 4 left the old Gemma Terms) [S15][S49]; gpt-oss **Apache 2.0** [S14]; Ministral 3 **Apache 2.0**
[S14]; Mistral Small 3.2 **Apache-2.0** [S15]; Phi-4 and Phi-4-mini **MIT** [S15]; Granite 4.1 **Apache 2.0** [S14];
DeepSeek-R1 **MIT**, but "The Qwen distilled models are derived from Qwen-2.5 series, which are originally licensed under
Apache 2.0 … The Llama 8B distilled model is derived from Llama3.1-8B-Base and is originally licensed under llama3.1"
license [S14]; Llama 3.1/3.2/3.3 **Llama Community License** (llama3.1 metadata) [S15], Llama 4 **Llama 4 Community
License** [S14]; LFM2.5 "lfm1.0" (other) [S15]; Nemotron licence **UNVERIFIED** (gated page). All recommended defaults are
Apache-2.0 or MIT.

### 2.6 Tool (function) calling per family (Ollama capability tags [S13]; vendor cards)
| Family | Tools | Vision | Thinking | Notes |
|---|---|---|---|---|
| Qwen 3.5 / 3.6 / 3.8 | ✅ | ✅ | ✅ | "Qwen3.5 excels in tool calling" [S15] — best default |
| Gemma 4 | ✅ | ✅ (+audio on e2b/e4b) | ✅ | — |
| gpt-oss | ✅ | — | ✅ | text only |
| Ministral 3, Mistral Small 3.2 | ✅ | ✅ | — | 3.2 "improves on function calling" |
| Llama 3.1 / 3.2 / 3.3, Llama 4 | ✅ | Llama 4 ✅ | — | — |
| Phi-4-mini | ✅ | — | — | "function calling feature is finally supported" |
| Phi-4 (14b), Phi-4-reasoning | ❌ (no tools tag) | — | — | chat only; 16K context |
| DeepSeek-R1 distills | ✅ tag | — | ✅ | reasoning first; slower |
| Granite 4.1, Nemotron 3.5, LFM 2.5 | ✅ | — | some | LFM2.5 "built for fast, reliable tool calling" |
ZIGi already asks Ollama `/api/show` for `capabilities` before sending tools (YOUR_AI_V2.md); keep that.

---

## 3. The providers ZIGi already supports

Repo state read today: `lib/ai/providers.ts` (OpenAI, Anthropic, Gemini, xAI, OpenRouter with PKCE, local), adapters
`anthropic.ts`, `gemini.ts`, `ollama.ts`, `openai-compatible.ts`, `models.ts` (lists models live, never hard-codes a
"best"), `pricing.ts` (3 Claude rows, dated 2026-10-10), `openrouter-auth.ts` (PKCE).

### 3.1 Browser CORS (live preflight today, `Origin: https://alpha.zigoals.app`)
| Provider | Endpoint | Allow-Origin | Allowed headers seen | Extra header ZIGi must send |
|---|---|---|---|---|
| Anthropic | `POST api.anthropic.com/v1/messages` | `*` | `content-type,x-api-key,anthropic-version,anthropic-dangerous-direct-browser-access` (echoed) | `anthropic-dangerous-direct-browser-access: true` (the SDK's browser opt-in; YOUR_AI_V1), `anthropic-version: 2023-06-01` |
| OpenAI | `POST api.openai.com/v1/chat/completions` | `https://alpha.zigoals.app` (echoed) | `content-type,authorization` | none |
| Gemini | `POST generativelanguage.googleapis.com/v1beta/models/…:streamGenerateContent?alt=sse` | echoed origin | `content-type,x-goog-api-key` | key in `x-goog-api-key`, never the URL |
| xAI | `POST api.x.ai/v1/chat/completions` | `*` | `*` | none |
| OpenRouter | `POST openrouter.ai/api/v1/chat/completions`, `POST /api/v1/auth/keys` | `*` | long list incl. `HTTP-Referer`, `X-Title`, **`X-OpenRouter-Title`** | `HTTP-Referer` (required for attribution); OpenRouter now names `X-OpenRouter-Title` the header to use; "`X-Title` is still supported for backwards compatibility" [S24] |
| Local | 127.0.0.1 | per server (§2) | — | none |

All unchanged from v1 except OpenRouter's title header (ZIGi sends `x-title`: works; switch when convenient).

### 3.2 Current model names (official pages, today)
- **Anthropic** [S17]: `claude-fable-5-1`, `claude-opus-5-5` ("start with Claude Opus 5.5 for most workloads"),
  `claude-sonnet-5-5`, `claude-haiku-5-5`; all 1M context, 128K output, tool use; legacy still available: Fable 5,
  Opus 5, Opus 4.8–4.5, Sonnet 5, Sonnet 4.6, Haiku 4.5.
- **OpenAI** [S18][S19]: flagship `gpt-6-astra`, `gpt-6.1-sol`, `gpt-6.1-terra`, `gpt-6-luna`; older still priced
  (gpt-5.x). **`gpt-6.1-terra` and `gpt-6.1-sol` pages: "Tool calling requires the Responses API"** while listing Chat
  Completions as supported. `gpt-6-luna`, `gpt-6-astra` and gpt-5.x pages carry no such line (checked today).
  → NE/NB: tools on those two models need a Responses-API path or must be marked "chat only" there.
- **Gemini** [S21]: stable `gemini-4-argon`, `gemini-3.8-flash`, `gemini-3.6-flash`, `gemini-3.5-flash-lite`,
  `gemini-3.1-flash-lite` (+ live/TTS/image models); preview `gemini-3.1-pro-preview`, `gemini-3-flash-preview`; Gemini
  2.5 Pro/Flash/Flash-Lite still priced. The function-calling guide's examples use `gemini-3.8-flash` [S21].
- **xAI** [S22]: `grok-4.7`, `grok-4.6`, `grok-4.5` (500k), `grok-4.3`, `grok-4.20-0309-reasoning` / `-non-reasoning`
  (1M), `grok-build-0.1`. The models page states no tool support per model (**UNVERIFIED** here; YOUR_AI_V2 has xAI's
  tool docs).
- **OpenRouter** [S23]: 452 models in the public list today; per-model `pricing.prompt`/`completion` (USD per token) and
  `supported_parameters` (includes `tools`).

### 3.3 Free tiers
| Provider | Free tier | Conditions (quoted) |
|---|---|---|
| **Gemini API** | **Yes** for Flash/Flash-Lite and 2.5 Pro (not Gemini 4 Argon, 3.1 Pro Preview) [S21] | Free-tier data: Google "uses the content you submit … to provide, improve, and develop Google products"; "human reviewers may read, annotate, and process your API input and output" [S36]. **EEA/CH/UK**: "You may use only Paid Services when making API Clients available to users in the European Economic Area, Switzerland, or the United Kingdom" [S36]. 18+. Limits per project, not per key; shown in AI Studio; RPD resets at midnight Pacific [S37]. Some prices rise 1 Dec 2026 / 1 Jan 2027 (e.g. 3.8 Flash input $0.75 → $1.50 on 1 Jan) [S21]. |
| **OpenRouter** | `:free` models (today: Gemma 4 26B/31B, Nemotron 3.5, LFM 2.5 and others) and the `openrouter/free` router [S23][S50] | 20 requests/min; 50/day with < 10 credits bought, 1000/day with ≥ 10 [S50]; separate training settings for free models: "If you opt out of training in your account settings, OpenRouter will not route to providers that train" [S51]; OpenRouter itself: "Prompt and completion are not logged by default" [S52] |
| **Anthropic, OpenAI, xAI** | none documented on the pages read | prepaid / pay-as-you-go keys |
| **Local** | free | the person's own computer |

### 3.4 Prices per million tokens (for the cost meter) and differences vs `lib/ai/pricing.ts`
Standard tier, USD, read today [S16][S18][S19][S21][S22][S23].

| Provider | Model | Input | Cached input | Output | Notes |
|---|---|---|---|---|---|
| Anthropic | claude-fable-5-1 | 10 | 0.25 (hit) | 50 | 5m write 12.50; 1h write 20 |
| Anthropic | **claude-opus-5-5** | **4** | **0.20** | **20** | 5m write 5; 1h write 8 |
| Anthropic | **claude-sonnet-5-5** | **2** | **0.10** | **10** | 5m write 2.50; 1h write 4 |
| Anthropic | **claude-haiku-5-5** (≤ 100k prompt) | **0.10** | **0.01** | **0.50** | 5m write 0.125; >100k: 0.50 / 0.05 / 2.50 (write 0.625) |
| Anthropic | claude-sonnet-5 / opus-5 / haiku-4-5 | 2 / 5 / 1 | 0.20 / 0.50 / 0.10 | 10 / 25 / 5 | legacy |
| OpenAI | gpt-6-astra | 10 | 1.00 | 50 | ≤ 272K input |
| OpenAI | gpt-6.1-sol | 2 | 0.10 | 10 | tools need Responses API |
| OpenAI | gpt-6.1-terra | 1 | 0.05 | 5 | cache write 1.25; >272K: 2× input, 1.5× output |
| OpenAI | gpt-6-luna | 0.10 | 0.01 | 0.50 | — |
| Gemini | gemini-4-argon | 2 | — | 10 | paid only |
| Gemini | gemini-3.8-flash / 3.6-flash | 0.75 | — | 3.75 | free tier; 3.8 Flash input 1.50 from 1 Jan 2027 |
| Gemini | gemini-3.5-flash-lite | 0.30 | — | 2.50 | free tier |
| Gemini | gemini-3.1-pro-preview | 2 (≤200k) / 4 | — | 12 / 18 | paid only |
| Gemini | gemini-2.5-flash / -lite | 0.30 / 0.10 | — | 2.50 / 0.40 | free tier |
| xAI | grok-4.7 / 4.6 | 2 (<200k) / 4 | 0.50 / 1.00 | 6 / 12 | the whole request bills at the higher tier when ≥ 200k |
| xAI | grok-4.3, grok-4.20-0309-* | 1.25 / 2.50 | 0.20 / 0.40 | 2.50 / 5 | 1M context |
| OpenRouter | any | the model list's own `pricing` | — | — | "no markup on inference pricing"; a fee on buying credits [S52]. Today `google/gemini-3.8-flash` lists 0.825 / 4.125 — 10 % above Google's own price; read the list, never assume. |

**Differences vs `pricing.ts` (PRICES_AS_OF 2026-10-10):**
- The three rows it has are **identical** to today's page: Opus 5.5 4/20 (write 5, hit 0.20), Sonnet 5.5 2/10 (2.5,
  0.10), Haiku 5.5 0.10/0.50 (0.125, 0.01) with the >100k card 0.50/2.50 (0.625, 0.05). No price changed.
- **Missing for a cost meter:** `claude-fable-5-1` (10/50, hit 0.025× = 0.25, write 12.50), legacy Claude rows, every
  OpenAI, Gemini and xAI model, and OpenRouter (should come from the live list's `pricing`, scaled ×1e6).
- **Not modelled:** 1-hour cache writes (2× input: Opus 5.5 = 8, Sonnet 5.5 = 4, Haiku 5.5 = 0.20 / 1); the US-only
  `inference_geo` 1.1× multiplier; fast mode; Gemini's >200k and xAI's ≥200k tiers; OpenAI's >272K tier; the dated
  Gemini increases (1 Dec 2026 / 1 Jan 2027). An "estimate" label covers these, but the meter should at least show the
  long-prompt tier when a prompt crosses it.
- Batch factor 0.5 is still right for Anthropic [S16] (and for OpenAI Batch/Flex [S19]).

---

## 4. HONESTY: subscriptions are not API access

| Subscription | Official wording (quoted) | Source | Verdict for ZIGoals |
|---|---|---|---|
| **Claude Pro / Max / Ultra / Team** | Title: "Why is Claude API usage billed separately from my paid Claude plan?" — "A paid Claude subscription enhances your chat experience, and the Claude API is billed separately." To use both you must "separately set up Console access for API usage". **But:** "Claude Max, Ultra, and Team plans include monthly credits for the Claude API." Amounts: Max $100, Ultra $200, Team Standard $20/seat, Premium $100/seat (pool capped at $500); linked to one Console organization in claude.ai Settings → Billing → "API credits" → "Link organization"; "Everyone with an API key in the linked organization can use the balance"; "Unused credits expire at the end of each billing cycle." | [S53][S54] | The **login** does not work in ZIGoals. A Max/Ultra/Team subscriber can link the credits to a Console organization, create an API key there, and paste it — ZIGoals then spends those credits like any key. Say exactly that. |
| **ChatGPT Plus / Pro (and Go)** | Help Center (What is ChatGPT Plus): "API usage is separate and billed independently" (returned to us via search; the page refuses automated fetches — 403). Plan sharing: subscribers "can also choose to use your ChatGPT plan for AI requests in **participating** commercial apps and sites"; developer docs: "These docs explain ChatGPT plan usage for open-source and locally hosted apps … If you're interested in offering it in a paid or remotely hosted app, complete the interest form." Using the plan "does not share an OpenAI API key". | [S55][S56][S57] | Not available in ZIGoals: ZIGoals is a remotely hosted app that is not a participating partner (and owner decision D5 keeps "Sign in with ChatGPT" out of scope). A ChatGPT plan gives no API key. |
| **Google AI Pro / Ultra (ex-Gemini Advanced)** | "AI Studio UI only: Google AI plan benefits for developer usage apply only within the Google AI Studio web interface." "Direct use of the Gemini API (such as using API keys or external applications) is billed and managed separately." Subscribers with Cloud Billing may get monthly Google Developer Program Cloud credits (no amount stated). | [S58] (last updated 2026-10-16) | Not usable in ZIGoals. The Gemini API free tier (§3.3) is a separate thing, and not for the EEA/CH/UK in an app like this. |
| **SuperGrok / X Premium** | No xAI page found that says either way. xAI's FAQ: API "Teams are the level at which [xAI] tracks API usage, processes billing, and issues invoices"; "Large unexpected invoices are often a SuperGrok Heavy yearly subscription, not API usage." Third-party tools advertise a Grok-subscription OAuth sign-in, but xAI publishes no such flow for third-party web apps. | [S59]; third-party [S60] | **UNVERIFIED in first-party words**; treat as not available. The xAI API is a separately billed console product. |

**The honest ways in (in this order):**
1. **A local model** — recommended: private, free, works offline (computer + Chrome/Edge/Firefox).
2. **On-device in the browser** — Chrome 148+ on a computer (Prompt API), short tasks only.
3. **A free API tier** — Gemini (outside the EEA/CH/UK; prompts may be reviewed and used to improve Google products) or
   OpenRouter `:free` models (50 requests/day; check the training setting).
4. **A paid API key** — Anthropic, OpenAI, Gemini, xAI; set a spending limit at the provider. Claude Max/Ultra/Team
   subscribers: link your monthly API credits to a Console organization and use a key from it.
5. **OpenRouter sign-in (PKCE)** — one key for many models; prices pass through, plus a fee when buying credits.

Proposed guide copy (one line): "Your ChatGPT, Claude, Gemini or Grok subscription can't sign in here — those plans don't
include access for other apps. Use a free local model (recommended), a free API tier, or your own API key."

---

## 5. Voice

### 5.1 Speech recognition (speech → text)
| Browser | API | Where audio goes | On-device option |
|---|---|---|---|
| **Chrome 139+** (desktop) | `SpeechRecognition` unprefixed (webkit-prefixed since 33) [S37a] | "On some browsers, like Chrome, using Speech Recognition on a web page involves a server-based recognition engine. Your audio is sent to a web service for recognition processing, so it won't work offline." [S38a] | **Yes:** `recognition.processLocally = true`; `SpeechRecognition.available({langs, processLocally: true})`; `SpeechRecognition.install({langs, processLocally: true})` downloads the language pack and needs a user gesture (else `NotAllowedError`); a missing pack → `language-not-supported` [S38a][S38b]. Chrome 142+: `phrases` (contextual biasing) [S37a]. On-device was reported disabled on ChromeOS (forum, **UNVERIFIED** now) [S38b]. |
| **Chrome on Android** | same API | server | `processLocally` not supported (BCD: false) [S37a] |
| **Edge** | mirrors Chrome in BCD [S37a] | Microsoft's service (**UNVERIFIED**) | as Chrome per BCD |
| **Safari 14.1+ / iOS** | `webkitSpeechRecognition` [S37a] | Apple: "your device will indicate in Siri Settings or Keyboard Settings whether the things you say are processed on your device … Otherwise, the things you say are sent to and processed by Apple"; "the audio data to be transcribed may be sent to Apple" for apps using Speech Recognition [S39a] | no web switch (`processLocally` false) [S37a] |
| **Firefox** | preview only [S37a] | — | — |
Rules for N3 step 7: off by default; before the first use say where the audio goes for *this* browser; on Chrome desktop
offer "Recognise on this device" (install the pack from a click, then `processLocally = true`), and in Strict mode allow
voice input **only** with `processLocally` (or the provider's own transcription with a cloud key in Guarded/Relaxed).

### 5.2 Speech synthesis (text → speech)
- Supported everywhere: Chrome 33, Edge 14, Firefox 49, Safari 7 (BCD) [S37b].
- Privacy check per voice: `SpeechSynthesisVoice.localService` is "`true`" for "a local speech synthesizer service" and
  "`false`" for "a remote speech synthesizer service" [S38c]. NOVA must prefer `localService === true` voices and, in
  Strict, use only those (a remote voice sends the text away).
- Quality per OS (practical observations, verify on each device with `speechSynthesis.getVoices()`; not from vendor
  pages): **macOS/iOS** — system voices including downloadable Enhanced/Premium voices (good, local); **Windows** — the
  built-in voices are local but plain; Edge also lists "Online (Natural)" voices that are remote (`localService:false`);
  **Chrome desktop** — adds "Google …" voices that are remote; **Linux** — speech-dispatcher/eSpeak voices (robotic) or
  none; **Android** — the device's Google TTS. Pick the best local voice by language, let the person choose, remember per
  device.

---

## 6. Corrections to current app text and code (for the lead)
1. `components/help/help-page.tsx` and `lib/ai/errors.ts` (+ errors.test.ts) say "**Chrome 142** … connect to devices on
   your local network". Since Chrome 145 the prompt reads "Access other apps and services on this device" and the
   setting is "Apps on device" [S27][S29]. Firefox 151+ now asks too [S30]. Safari cannot reach localhost [S32].
2. `components/ai/ai-setup.tsx` macOS line lacks the quotes and the "quit and reopen" step; add that `launchctl setenv`
   does not survive a restart; Windows line lacks the `setx` command and the quit-from-taskbar step [S1][S4].
3. `lib/ai/providers.ts` `LOCAL_SERVER_DEFAULTS`: add llama.cpp `http://127.0.0.1:9931` [S11].
4. Ollama cloud models (`remote_host` in `/api/tags`) must read as cloud (Strict refuses) [S5][S6][S20].
5. OpenAI `gpt-6.1-sol` / `gpt-6.1-terra`: tool calls need the Responses API [S19].
6. OpenRouter: `X-OpenRouter-Title` is the current header name (`X-Title` still works) [S24].
7. `lib/ai/pricing.ts`: add rows per §3.4 (or read OpenRouter's list) before the cost meter shows non-Claude models.
8. Gemini free tier copy must carry the EEA/CH/UK rule and the "used to improve Google products" note [S36].

---

## 7. Sources (all read 1 November 2026 unless dated otherwise)
- [S1] Ollama FAQ — https://docs.ollama.com/faq
- [S2] Ollama on Linux — https://raw.githubusercontent.com/ollama/ollama/main/docs/linux.mdx
- [S3] Ollama on macOS — https://raw.githubusercontent.com/ollama/ollama/main/docs/macos.mdx
- [S4] Ollama on Windows — https://raw.githubusercontent.com/ollama/ollama/main/docs/windows.mdx ; install command shown on https://ollama.com/download/windows
- [S5] Ollama `envconfig/config.go` (AllowedOrigins, OLLAMA_NO_CLOUD) — https://raw.githubusercontent.com/ollama/ollama/main/envconfig/config.go
- [S6] Ollama `api/types.go` (ListModelResponse/ShowResponse `remote_host`) — https://raw.githubusercontent.com/ollama/ollama/main/api/types.go
- [S7] LM Studio server settings — https://lmstudio.ai/docs/developer/core/server/settings
- [S8] LM Studio `lms server start` — https://lmstudio.ai/docs/cli/server-start ; server — https://lmstudio.ai/docs/developer/core/server
- [S9] LM Studio system requirements — https://lmstudio.ai/docs/app/system-requirements
- [S10] LM Studio OpenAI compatibility — https://lmstudio.ai/docs/developer/openai-compat
- [S11] llama.cpp server README — https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md
- [S12] llama.cpp install — https://github.com/ggml-org/llama.cpp/blob/master/docs/install.md
- [S13] Ollama library (capabilities, sizes) — https://ollama.com/library?sort=popular and https://ollama.com/library/<model>/tags for gemma4, qwen3.5, qwen3.6, qwen3.8, gpt-oss, ministral-3, mistral-small3.2, phi4-mini, phi4, deepseek-r1, llama3.1, llama3.2, llama3.3, llama4, granite4.1, nemotron-3.5-lightning, lfm2.5
- [S14] Ollama model pages (licence text) — https://ollama.com/library/gpt-oss , /ministral-3 , /deepseek-r1 , /granite4.1 , /llama4
- [S15] Hugging Face model metadata — https://huggingface.co/api/models/{Qwen/Qwen3.5-9B, Qwen/Qwen3.6-35B-A3B, Qwen/Qwen3.8-27B, google/gemma-4-E4B-it, mistralai/Mistral-Small-3.2-24B-Instruct-2506, microsoft/phi-4, microsoft/Phi-4-mini-instruct, LiquidAI/LFM2.5-8B-A1B, meta-llama/Llama-3.1-8B-Instruct}; card https://huggingface.co/Qwen/Qwen3.5-9B
- [S16] Anthropic pricing — https://platform.claude.com/docs/en/about-claude/pricing
- [S17] Anthropic models overview — https://platform.claude.com/docs/en/about-claude/models/overview
- [S18] OpenAI models — https://developers.openai.com/api/docs/models
- [S19] OpenAI pricing — https://developers.openai.com/api/docs/pricing ; model pages https://developers.openai.com/api/docs/models/gpt-6.1-terra , /gpt-6.1-sol , /gpt-6-luna , /gpt-6-astra
- [S20] Ollama Cloud — https://docs.ollama.com/cloud
- [S21] Gemini pricing (updated 2026-10-30) — https://ai.google.dev/gemini-api/docs/pricing ; models (2026-10-28) — https://ai.google.dev/gemini-api/docs/models ; function calling — https://ai.google.dev/gemini-api/docs/function-calling
- [S22] xAI models and pricing — https://docs.x.ai/docs/models
- [S23] OpenRouter public model list — https://openrouter.ai/api/v1/models
- [S24] OpenRouter app attribution — https://openrouter.ai/docs/app-attribution
- [S25] Chrome blog, Local Network Access (2025-06-09, update 2025-09-29) — https://developer.chrome.com/blog/local-network-access
- [S26] Chrome guide, Local Network Access (updated 2026-10-07) — https://developer.chrome.com/docs/modern-web-guidance/guides/security/local-network-access
- [S27] blink-dev, Intent to Ship: Local Network Access split permissions (Chrome 145) — https://groups.google.com/a/chromium.org/g/blink-dev/c/Zl3P6NHhMBw
- [S28] MDN, Mixed content — https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content
- [S29] Okta help (vendor), Chrome device permissions — https://help.okta.com/eu/en-us/content/topics/end-user/ov-device-lna-prompt.htm
- [S30] Firefox 151.0 release notes (19 May 2026) — https://www.firefox.com/en-US/firefox/151.0/releasenotes/
- [S31] Chrome 154 release notes (stable 22 Sep 2026) — https://developer.chrome.com/release-notes/154 ; Chromium schedule — https://chromiumdash.appspot.com/fetch_milestone_schedule ; Firefox versions — https://product-details.mozilla.org/1.0/firefox_versions.json
- [S32] WebKit bug 171934 (status NEW, last change 2026-08-19) — https://bugs.webkit.org/show_bug.cgi?id=171934
- [S33] NVIDIA GeForce RTX 40 series — https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/
- [S34] NVIDIA RTX 5090 — https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5090/
- [S35] NVIDIA RTX 5080 and 5070 family — https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5080/ , https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5070-family/
- [S36] Gemini API Additional Terms (effective 2026-03-23, updated 2026-04-28) — https://ai.google.dev/gemini-api/terms
- [S37] Gemini rate limits (updated 2026-10-28) — https://ai.google.dev/gemini-api/docs/rate-limits
- [S37a] MDN browser-compat-data, SpeechRecognition — https://github.com/mdn/browser-compat-data/blob/main/api/SpeechRecognition.json
- [S37b] MDN browser-compat-data, SpeechSynthesis — https://github.com/mdn/browser-compat-data/blob/main/api/SpeechSynthesis.json
- [S38] MDN browser-compat-data, DocumentPictureInPicture, Navigator (setAppBadge), LanguageModel — https://github.com/mdn/browser-compat-data/tree/main/api
- [S38a] MDN, SpeechRecognition (modified 2026-08-19) — https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
- [S38b] New in Chrome 139 — https://developer.chrome.com/blog/new-in-chrome-139 ; WPT install test — https://chromium.googlesource.com/external/w3c/web-platform-tests/+/refs/heads/DOMParser-interface/speech-api/SpeechRecognition-installOnDevice.https.html ; chrome-ai-dev-preview thread — https://groups.google.com/a/chromium.org/g/chrome-ai-dev-preview-discuss/c/Rlyc2uAsFCY
- [S38c] MDN, SpeechSynthesisVoice.localService — https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService
- [S39] awesome-jarvis (curated list) — https://github.com/csells/awesome-jarvis
- [S39a] Apple, Ask Siri, Dictation & Privacy — https://www.apple.com/legal/privacy/data/en/ask-siri-dictation/
- [S40] OpenClaw (as described in [S39]) and Tom's Guide — https://www.tomsguide.com/ai/openclaw-is-the-viral-ai-assistant-that-lives-on-your-device-what-you-need-to-know
- [S41] Open WebUI features — https://docs.openwebui.com/features/
- [S42] Jan — https://www.jan.ai/
- [S43] AnythingLLM — https://anythingllm.com/
- [S44] Msty — https://msty.ai/
- [S45] LM Studio — https://lmstudio.ai/
- [S46] Home Assistant voice control — https://www.home-assistant.io/voice_control/
- [S47] Secondary reporting on OpenClaw: Malwarebytes https://www.malwarebytes.com/blog/news/2026/02/openclaw-what-is-it-and-can-you-use-it-safely ; Security Boulevard https://securityboulevard.com/2026/03/latest-openclaw-flaw-can-let-malicious-websites-hijack-local-ai-agents/ ; critique https://m3metix.substack.com/p/what-openclaw-gets-wrong-isnt-security
- [S48] Setup-pain issues: https://github.com/ollama/ollama/issues/6489 , https://github.com/ollama/ollama/issues/2308 , https://github.com/Haya-ChiChi/hayatab/issues/5 , https://github.com/janhq/jan/issues/8131 , https://github.com/n4ze3m/page-assist/discussions/317
- [S49] Gemma 4 licence change (secondary) — https://gigazine.net/gsc_news/en/20260403-google-released-gemma-4
- [S50] OpenRouter limits — https://openrouter.ai/docs/api-reference/limits
- [S51] OpenRouter provider logging — https://openrouter.ai/docs/guides/privacy/provider-logging
- [S52] OpenRouter FAQ — https://openrouter.ai/docs/faq
- [S53] Claude Help Center 9876003 — https://support.claude.com/en/articles/9876003
- [S54] Claude Help Center 17154008, Monthly API credits for Max, Ultra, and Team plans — https://support.claude.com/en/articles/17154008
- [S55] OpenAI Help Center 6950777 (What is ChatGPT Plus) — https://help.openai.com/en/articles/6950777 (403 to automated fetch; wording via search result)
- [S56] OpenAI Help Center, Using your ChatGPT plan in other apps and sites — https://help.openai.com/en/articles/20001542-using-your-chatgpt-plan-in-other-apps-and-sites (wording via search result) ; Sign in with ChatGPT — https://help.openai.com/en/articles/20001410-sign-in-with-chatgpt
- [S57] OpenAI developer docs, ChatGPT plan usage for open-source apps — https://developers.openai.com/siwc/token-sharing-open-source ; interest form https://openai.com/form/sign-in-with-chatgpt-interest/
- [S58] Google AI plans and the Gemini API (updated 2026-10-16) — https://ai.google.dev/gemini-api/docs/google-ai-plans
- [S59] xAI FAQ — https://docs.x.ai/grok/faq
- [S60] Third-party Grok-subscription sign-in (not xAI) — https://docs.roomote.dev/providers/inference/xai-subscription
- [S62] Raycast, The New Raycast (14 May 2026) — https://www.raycast.com/blog/the-new-raycast
- Live CORS preflights (§3.1): sent 1 Nov 2026 from the session sandbox to the five provider endpoints listed there.
