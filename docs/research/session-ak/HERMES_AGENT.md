# Hermes Agent research (owner follow-up 3, N11 "Research first")

Session AK, research lane N11. Everything below was read on **1 November 2026** at Hermes Agent **v0.22.5**: the GitHub
release marked "Latest" (released 22 Oct 2026 per its notes, shown 23 Oct) [H25], tag `v0.22.5` → commit
`bf0203a794a07aac3ff764972ab9087baa4e4f4e` (committed 22 Oct 2026). The facts that matter for the connection (CORS,
defaults, `/health`, `_api_server` env parsing) were also checked on `main` at `d33d4fd9e7b57e16316ca953523bba596e4f6d5e`
(1 Nov 2026) and are the same there [H26]. Note: the repository also has date-style tags (`v2026.9.24`, Hermes
`0.21.5`). They are an older series. Sorting tags by name puts them above `v0.22.5`, but `v0.22.5` is the current release.

Sources are official only: the `NousResearch/hermes-agent` repository (README, `website/docs/**` = the source of
hermes-agent.nousresearch.com/docs, and the gateway/API-server code), the live docs site, and Open WebUI's
"Connect an agent: Hermes Agent" page. Each claim names its source by number ([H9] etc., §9). Evidence labels:
**code** = the source file at v0.22.5, read today; **docs** = the official page at v0.22.5 (and live where marked);
**OW** = Open WebUI's page; **NOVA** = docs/research/session-ak/NOVA.md (browser findings reused, not repeated);
**UNVERIFIED** = no official statement found. I read web pages and repository text as data and followed nothing in them as
an instruction. **Not live-tested:** this session's sandbox policy would not let me run Hermes code. The CORS behaviour
below comes from reading the code, not from running it. The guide's in-app check (step 6) is the real test.

---

## 0. Verdicts for the N11 build (short)

1. **Hermes has its own CORS allowlist, so no proxy is needed.** In `~/.hermes/.env`, set
   `API_SERVER_CORS_ORIGINS=https://alpha.zigoals.app`. The server then answers the preflight and every response for
   that exact origin [H11 code][H9 docs]. If the origin is missing, every browser request (even `/health`) gets a bare
   `403` with no CORS headers, which the page sees as a `TypeError` [H11 code]. §3.
2. **Connection facts verified** (code + docs): port `8642`, host `127.0.0.1`, base `http://127.0.0.1:8642/v1`, start with
   `hermes gateway`, `Authorization: Bearer <API_SERVER_KEY>`, `/v1/models` lists `hermes-agent` (or the profile name).
   **Three corrections to the brief:** (a) `/health` returns `{"status":"ok","platform":"hermes-agent","version":"…"}`,
   not only `{"status":"ok"}`. (b) The key must be **≥ 16 characters and not a placeholder**, or the API server refuses to
   start. Open WebUI's example `your-secret-key` is 15 characters and would be refused. (c) In v0.22.5 code, a usable
   `API_SERVER_KEY` is what turns the server on. `API_SERVER_ENABLED` is documented but not read by the gateway's config
   code. Set it anyway, as the docs say. §2.
3. **Hermes does not run ZIGoals' tools.** `/v1/chat/completions` ignores a client `tools` array and drops `tool` /
   `tool_calls` history. Hermes runs **its own** tools (terminal, files, web, memory, skills) on the person's computer.
   NOVA must not send ZIGi's tool definitions to Hermes. A ZIGoals action that Hermes suggests has to come back as
   text that NOVA turns into a confirm card. §2.5.
4. **Windows needs no WSL.** Native Windows 10/11 is Tier 1 (PowerShell installer or MSIX). The data folder is
   `%LOCALAPPDATA%\hermes`, so the "`~/.hermes/.env`" lines go in `%LOCALAPPDATA%\hermes\.env`. Use
   `hermes config set …` on every OS so nobody has to find the file. §1.3, §2.1.
5. **Privacy:** "Hermes uses a local model" can be checked with three CLI reads: model, fallback providers, auxiliary
   models. Hermes's **tools can still reach the internet** (web search, Tool Gateway, cloud browser) whatever the model
   is. Strict must say "the model is local", not "nothing leaves the computer". Hermes also **stores every API turn** on
   the person's disk (`state.db`, logs) and may write memory. §4.
6. **The summary belongs in a skill, not memory.** Memory is capped at 2,200 + 1,375 characters and managed by the agent.
   A skill folder `~/.hermes/skills/<category>/zigoals-summary/SKILL.md`, with an optional `references/` file, is the
   documented place for a long Markdown summary. §5.

---

## 1. What Hermes Agent is

### 1.1 Identity, licence
- "The self-improving AI agent built by Nous Research … it creates skills from experience, improves them during use,
  nudges itself to persist knowledge, searches its own past conversations, and builds a deepening model of who you are
  across sessions." [H1 docs]
- **Licence: MIT**, "Copyright (c) 2025 Nous Research" (`LICENSE`); `pyproject.toml` `license = "MIT"` [H2 code].
- Name to use in Help/PRIVACY/landing: **Hermes Agent** (by Nous Research), link
  https://github.com/NousResearch/hermes-agent and https://hermes-agent.nousresearch.com/docs/. Nothing found that
  suggests or allows wording that implies a partnership.

### 1.2 Capabilities (README v0.22.5 [H1], docs [H9][H17][H18][H20])
| Area | What the official text says |
|---|---|
| Tools | API server requests run "with its full toolset (terminal, file operations, web search, memory, skills)" [H9]; "Tool calls run where that API server is running" [H10]; six built-in terminal backends (local, Docker, SSH, Modal, Daytona, Vercel Sandbox) plus plugins [H1]; browser tools, cron scheduler, subagent delegation [H1]. |
| Skills | "All skills live in `~/.hermes/skills/`"; agent-created and self-improving; agentskills.io compatible [H18][H1]. |
| Memory | `MEMORY.md` + `USER.md` in `~/.hermes/memories/`, injected at session start; FTS5 session search; optional Honcho user modelling [H17][H1]. |
| Model providers | "Use any model you want — Nous Portal, OpenRouter, OpenAI, your own endpoint, and many others. Switch with `hermes model`" [H1]; Anthropic, Copilot, xAI, Bedrock, Vertex, Hugging Face, **Ollama Cloud** and more; "any OpenAI-compatible API endpoint" incl. local Ollama, vLLM, SGLang, llama.cpp, LM Studio [H20]; Desktop "Local Models" manages its own llama.cpp [H21]. |
| Gateways | One gateway process for Telegram, Discord, Slack, WhatsApp, Signal and more ("15+ platforms" on Windows' matrix [H5]) plus the OpenAI-compatible **API server** [H1][H9]. |

### 1.3 Platforms (docs, Platform Support [H4])
- **Tier 1:** macOS (**Apple Silicon**; Desktop or `install.sh`), **Windows 10/11** (x86_64, aarch64; `install.ps1` or
  MSIX desktop; "The MSIX package requires Windows 11 22H2 or later"), Linux/WSL2 (x86_64, aarch64; `install.sh`),
  Docker.
- **Tier 2:** Nix; Android/Termux (aarch64, APT package).
- **Unsupported:** pip/pypi and `brew` installs, AUR, 32-bit x86 macOS. "Intel x86_64 desktop bundles are built only for
  releases cut with `--with macos-intel`." The installation page says "The macOS installer is **Apple Silicon only**"
  [H3]. → **Intel Macs: UNVERIFIED / not Tier 1.** The guide should say "Apple Silicon Mac".
- **WSL is not needed on Windows:** "Native Windows runs Hermes without WSL — CLI, gateway, TUI, and tools all work
  natively. If you'd rather use WSL2, the Linux/macOS one-liner above works there too." [H1] The native feature matrix
  lists everything except the dashboard's embedded terminal pane [H5].

### 1.4 Install per OS (docs [H1][H3][H5])
| OS | Official command / path | After |
|---|---|---|
| macOS (Apple Silicon) | Desktop: download from https://hermes-agent.nousresearch.com/, "open the DMG, then copy `Hermes.app` to Applications". CLI only: `curl -fsSL https://hermes-agent.nousresearch.com/install.sh \| bash` | `source ~/.zshrc` then `hermes` [H1] |
| Linux | `curl -fsSL https://hermes-agent.nousresearch.com/install.sh \| bash`; prerequisites "Git, curl, tar, and SHA-256 utilities" [H3] | `source ~/.bashrc` |
| Windows (native, PowerShell, no admin) | `iex (irm https://hermes-agent.nousresearch.com/install.ps1)` [H1][H3]; or the `.appinstaller` (signed MSIX) from the website [H3] | "open a new terminal after it finishes" (User PATH changes) [H5] |
| Windows + WSL2 (optional) | the Linux command inside WSL [H1] | see §3.4 for browser reach |

Note: windows-native.md's quick-install block uses
`iex (irm https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.ps1)`, while the README and
installation page use the `hermes-agent.nousresearch.com/install.ps1` URL [H5][H1][H3]. Both are official. **Use the README
URL.** Both installer URLs answered HTTP 200 today (HEAD request).

**Verify command:** `hermes --version` (docs: "Show version and exit", `-V` too [H8]). Windows docs: `Get-Command hermes`
then `hermes --version` [H5]. The first line printed is `Hermes Agent v<version> (<release date>)` [H16 code]. OW also
says "check it with `hermes --version`" [OW]. For a broken setup, `hermes doctor` is the documented diagnostic [H3].

---

## 2. The OpenAI-compatible API server

### 2.1 Settings (env names and defaults verified in code)
| Variable | Default (code) | Notes |
|---|---|---|
| `API_SERVER_KEY` | none (required) | Gateway config enables the server only if the key is usable: `has_usable_secret(key, min_length=16)` [H13 code]. At startup it logs "Refusing to start: API_SERVER_KEY is a placeholder or too short (<16 chars) … a guessable key is remote code execution. Generate a strong secret (e.g. `openssl rand -hex 32`)" [H11 code]. Placeholders refused: `changeme`, `your_api_key`, `your-api-key`, `placeholder`, `example`, `dummy`, `null`, `none`, `your_*_here`, all-`x` shapes [H14 code]. Docs: "required for every deployment, including the default loopback bind" [H9]. |
| `API_SERVER_ENABLED` | docs: `false` | Docs and OW tell people to set `true` [H9][OW]. In v0.22.5 `gateway/config_env.py::_api_server` enables the platform from a usable key and never reads this name. It is only listed in the dashboard/secret-scope lists [H13 code]. **Set it anyway (harmless, documented).** |
| `API_SERVER_HOST` | `127.0.0.1` (`DEFAULT_HOST`) | Docs: "localhost only by default" [H11 code][H9]. Leave it. |
| `API_SERVER_PORT` | `8642` (`DEFAULT_PORT`) | [H11 code][H9][OW]. |
| `API_SERVER_CORS_ORIGINS` | empty | "Comma-separated allowed browser origins" [H9]; parsed by `_parse_cors_origins` (split on `,`, trimmed) [H11 code]. §3. |
| `API_SERVER_MODEL_NAME` | profile name, else `hermes-agent` | the id on `/v1/models` [H9][H11 code]. |

- Where the file is: `~/.hermes/.env` on macOS/Linux/WSL [H9]. On native Windows, `HERMES_HOME` is
  `%LOCALAPPDATA%\hermes`: "Setting API keys in `%LOCALAPPDATA%\hermes\.env` (your `HERMES_HOME`) is the normal path"
  [H5].
- **OS-neutral way:** `hermes config set NAME value`. Code: "Every UPPER_SNAKE name is an environment setting" and is saved
  to `.env` (prints `✓ Set NAME in <path>`). `hermes config get NAME` reads it back, masking secrets unless `--raw`
  [H15 code][H8]. (The Open WebUI page in Hermes's own docs says the flag goes to `config.yaml`. The v0.22.5 code sends
  every UPPER_SNAKE name to `.env` [H10 vs H15].)
- config.yaml alternative: `gateway.api_server: {enabled, port, host, key, cors_origins, model_name}`; "Environment
  variables take precedence over `config.yaml` values" [H9].

### 2.2 Start and keep running
- Start: `hermes gateway` ("Run in foreground") [H7][H9][OW]. Expected log: `[API Server] API server listening on
  http://127.0.0.1:8642` [H9][H10]. Code logs `API server listening on http://%s:%d (model: %s)` [H11]. OW: "The gateway
  must keep running" [OW]. After changing `.env`, restart it: the docs give `hermes gateway stop && hermes gateway`, and
  for the service `hermes gateway restart` [H10][H7].
- **At login (official docs):**
  - macOS: `hermes gateway install` → launchd agent `~/Library/LaunchAgents/ai.hermes.gateway.plist` (`RunAtLoad`);
    `hermes gateway start|stop|status`; logs `tail -f ~/.hermes/logs/gateway.log` [H7].
  - Linux: `hermes gateway install` (systemd **user** service), `hermes gateway start|status`; to keep it after logout:
    `sudo loginctl enable-linger $USER`; boot-time system service: `sudo hermes gateway install --system`; logs
    `journalctl --user -u hermes-gateway -f` [H7].
  - Windows: `hermes gateway install` → Scheduled Task `Hermes_Gateway` "ONLOGON … No UAC prompt", Startup-folder
    fallback; `hermes gateway status|start|stop|restart|uninstall` [H5].
  - WSL: "Use `hermes gateway run` instead of `hermes gateway start` — WSL's systemd support is unreliable … `tmux new -s
    hermes 'hermes gateway run'`" [H8].
- If the key is rejected at startup, the adapter marks itself non-retryable (`api_server_key_invalid`). The error message tells
  the person to fix the key, then run `/platform resume api_server` [H11 code].

### 2.3 Endpoints the app uses (code [H11][H12], docs [H9])
| Endpoint | Auth | Response (code) |
|---|---|---|
| `GET /health` (also `/v1/health`) | **none** | `200 {"status":"ok","platform":"hermes-agent","version":"<base version>"}`. Docs and OW show only `{"status": "ok"}`. → Check `status === "ok"`; show `version` if present. |
| `GET /v1/models` | Bearer | `{"object":"list","data":[{"id":"hermes-agent","object":"model","created":…,"owned_by":"hermes","permission":[],"root":"hermes-agent","parent":null}, …model_routes aliases]}`. The id is the profile name for a named profile [H9]. |
| `POST /v1/chat/completions` | Bearer | OpenAI Chat Completions; `stream: true` → SSE (§2.4). Non-stream: `{"id","object":"chat.completion","created","model","choices":[{"index":0,"message":{"role":"assistant","content":…,"reasoning_content"?},"finish_reason"}],"usage":{prompt_tokens,completion_tokens,total_tokens}}`; total failure → `502` `code:"agent_incomplete"`. |
| `GET /v1/capabilities` | Bearer | feature flags, incl. `features.cors` (true when an allowlist is set), `chat_completions_streaming: true` [H11]. Optional richer check. |
| `GET /health/detailed` | Bearer | readiness status and counts, "not config values, credentials, paths" [H9]. Not needed. |

- **Key:** `Authorization: Bearer <API_SERVER_KEY>`, constant-time compare [H11 code][H9]. Wrong or missing →
  `401 {"error":{"message":"Invalid gateway API key (API_SERVER_KEY)","type":"gateway_auth_error","code":"gateway_auth_failed"}}`
  [H11 code]. With the allowlist set, the 401 carries CORS headers, so the page **can** read it and say "wrong key" (§3.2).
- Other statuses the app should name: `429` "Too many concurrent runs (max N)" (default cap 10) [H9]; `503` with
  `Retry-After` while the gateway drains [H11 code]; `413` body over 10 MB [H11 code].

### 2.4 Streaming (SSE) shape (code [H12], docs [H9])
Response headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, plus the CORS headers, which are set before
the stream opens (`_sse_headers`: "CORS must be resolved up front") [H11]. Frames in order:
1. `data: {"id","object":"chat.completion.chunk","created","model","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}`
2. Content: `delta: {"content": "…"}` chunks.
3. Reasoning (only if the model produces it): `delta: {"reasoning_content": "…"}` chunks [H9].
4. Custom events (no `choices`): `event: hermes.tool.progress` with `data: {"tool","emoji","label","toolCallId","status"}`
   (`running`/completion) and `event: hermes.status`.
5. `: keepalive` comment lines after 10 s with no events ("custom parsers must skip lines that start with `:`") [H9].
6. Final chunk: `delta: {}`, `finish_reason` (`stop`, `length`, … or an error), `usage: {prompt_tokens, completion_tokens,
   total_tokens}`. When not `stop`, it may carry `error: {message, type}` (no `code`) and `hermes: {…}`.
7. `data: [DONE]`.

**Compatibility with ZIGoals' existing adapter** (read today: `apps/web/lib/ai/sse.ts`,
`lib/ai/adapters/openai-compatible.ts`): `sseEvents` skips `:` lines and passes `event:` names through. Custom-event
frames carry no `choices`, so no text is emitted. The stall timer is per received chunk, and keepalives every 10 s are well
inside `STALL_MS = 60 000`. `[DONE]` is handled. An in-stream `error` without `code` maps to 500. → It works without
change. Optional: show `hermes.tool.progress` labels as "Hermes is using …", and keep `reasoning_content` hidden or treat
it as thinking.

### 2.5 Request semantics that change the design (code [H12], docs [H9])
- Only `system`, `user` and `assistant` messages are read. System text is "layered on top" of Hermes's core prompt.
  Other roles (`tool`) and `tool_calls` history are dropped (`_parse_chat_messages`) [H12 code][H9].
- **Client `tools` are not used.** No code path passes a request's `tools` to the agent. `tools`/`tool_choice` appear
  only in the idempotency fingerprint [H12 code]. Tool calls are executed server-side by Hermes and never returned as
  pending calls [H9]. → NOVA's Hermes brain sends **no tools**. ZIGoals actions come back as plain text that NOVA
  parses into its own confirm card with Undo.
- `model`: a bare `model` without `provider` "is therefore ignored unless you enable" `direct_model_requests` [H9][H11].
  → Send the id from `/v1/models`. The person's Hermes config decides the real model.
- Stateless: the full `messages` array is sent each time. Server-side continuation (`X-Hermes-Session-Id`, allowed by
  CORS) is optional and not needed [H9].
- **Each request runs a full agent turn with terminal access** on the person's computer: "The API server gives full
  access to hermes-agent's toolset, **including terminal commands**" [H9]. ZIGoals text that NOVA forwards (journal,
  notes) reaches an agent that can run commands. Keep delegation person-triggered. Mark forwarded ZIGoals content as data
  in the system message. NOVA never asks Hermes to sign, send or move money (brief rule). Whether and how Hermes asks for
  approval of risky tools on `/v1/chat/completions` is **UNVERIFIED** (approval is documented for `/v1/runs`, `POST
  /v1/runs/{id}/approval` [H9]).
- The docs say `runtime` (the provider/model that served the turn) has "the same shape as on `/v1/chat/completions`"
  [H9]. **In v0.22.5 code the chat-completions response has no `runtime` field.** I found it only on
  `/api/sessions/{id}/chat` and the runs API [H11 code]. → Don't depend on it (§4.2).

---

## 3. Browser access from https://alpha.zigoals.app

### 3.1 CORS: native allowlist (code [H11], docs [H9])
- Framework: **aiohttp** (`web.Application(middlewares=[profile_prefix, cors_middleware, body_limit, security_headers])`)
  [H11 code].
- `cors_middleware` (verbatim logic): if the request's `Origin` is non-empty and not in the allowlist (and `*` is not in
  it) → `return web.Response(status=403)`, **before any handler, including `/health`**. `OPTIONS` with an allowed origin →
  `200` plus headers. Otherwise the handler runs and the headers are added to its response, errors included [H11 code].
- Headers for an allowed origin (code, `_CORS_HEADERS` + `_cors_headers_for_origin`):
  ```
  Access-Control-Allow-Origin: https://alpha.zigoals.app
  Vary: Origin
  Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS
  Access-Control-Allow-Headers: Authorization, Content-Type, Idempotency-Key, X-Hermes-Session-Id
  Access-Control-Max-Age: 600
  ```
  With `*` configured: `Access-Control-Allow-Origin: *` and no `Vary`. **Do not suggest `*`.** No
  `Access-Control-Allow-Credentials` and no `Access-Control-Expose-Headers` [H11 code].
- Docs: "The API server does **not** enable browser CORS by default. For direct browser access, set an explicit
  allowlist"; "SSE streaming responses include CORS headers"; "Keep `API_SERVER_CORS_ORIGINS` narrow" [H9]. The live
  docs page said the same today [H9 live]. OW's page does not mention CORS: Open WebUI talks server to server [OW][H10].
- **Preflight check for ZIGoals' request** (`POST`, `Authorization` + `Content-Type: application/json`, `credentials:
  'omit'`, `mode: 'cors'`, the adapter's current flags): the request method `POST` is in Allow-Methods, and both
  requested headers are in Allow-Headers (header names are case-insensitive). The status is 200. Allow-Origin echoes the
  exact origin. No credentials are sent, so no Allow-Credentials is needed. → **The preflight passes once the origin is
  listed** (from the code; not run live, see header).
- Exact string match: the value must be `https://alpha.zigoals.app`, with no trailing slash, path or port. Add more with
  commas (e.g. `,http://127.0.0.1:3100` for a developer's local build only).
- **No reverse proxy is needed.** The brief asked for a proxy only if Hermes had no CORS option, so none is specified.
  Adding one would put a second always-on local process in the guide for nothing.

### 3.2 What the page sees (code-derived; for the error messages)
| Situation | Browser result | App message → fix |
|---|---|---|
| Gateway not running / wrong port | `fetch` rejects (`TypeError`) | "gateway not running" → `hermes gateway` |
| Running, origin **not** allowed | `403` with no ACAO → `fetch` rejects (`TypeError`) | "blocked by the browser (CORS)" → `API_SERVER_CORS_ORIGINS` line + restart |
| Chrome/Firefox permission denied or not yet granted | `TypeError` | "blocked by the browser (local-network permission)" → site setting |
| Allowed, wrong key | `401`, readable JSON `gateway_auth_failed` | "wrong key" |
| Allowed, right key | `200` | name what was found (version from `/health`, model id from `/v1/models`) |

Telling the three `TypeError` cases apart (a **design inference** from Fetch semantics and the 403 above; prove it with
specs against a mock): (1) read the permission state first, as NOVA §2.1 describes (`loopback-network`, falling back to
`local-network-access` inside try/catch). (2) Then send `fetch(base + '/health', {mode: 'no-cors'})`. If it **resolves**
(an opaque response, which is what a 403 looks like), Hermes is running and only the origin allowlist is missing. If it
**rejects**, the gateway is not running, or the permission is still blocking.

### 3.3 Browsers (summary of NOVA §2.1; nothing port-specific)
- Chrome 145+/Edge: one prompt "Access other apps and services on this device" (site setting "Apps on device"). Make the
  first loopback request from a click, not a service worker. Firefox 151+: a permission prompt near the address bar.
  **Safari: blocked** (WebKit bug 171934). **Phones:** a phone's localhost is the phone. [NOVA §2.1, S25–S32]
- Port 8642: NOVA's sources apply these rules per loopback address space, and none of them names a port, so nothing
  differs for 8642. ZIGoals' CSP already allows `http://127.0.0.1:*` and `http://localhost:*`
  (`apps/web/lib/egress-policy.json` lines 17–18, read today). **No CSP change is needed.**
- Use `http://127.0.0.1:8642/v1` as the default (Hermes binds IPv4 `127.0.0.1` by default [H11]). That `localhost` might
  resolve to `::1` first on some systems is a precaution only, **UNVERIFIED** in these sources.

### 3.4 Windows + WSL2 (only if the person chose WSL)
Hermes docs: "`localhost` inside WSL is **not the same as** `localhost` on Windows". On Windows 11 22H2+ with mirrored
mode (`networkingMode=mirrored` in `%USERPROFILE%\.wslconfig`, then `wsl --shutdown`), a WSL bind to `127.0.0.1` "is
reachable from a Windows browser". In NAT mode, WSL's localhost forwarding "will generally forward Linux-side
`127.0.0.1` binds" [H6]. → The guide recommends native Windows and keeps WSL as a footnote.

---

## 4. Privacy facts

### 4.1 Local vs cloud models
- Cloud: Nous Portal, OpenRouter, OpenAI, Anthropic, xAI, Bedrock, Vertex, NIM, Hugging Face, **Ollama Cloud**, and others
  [H20][H1].
- Local: Desktop **Local Models** (managed llama.cpp): "Nothing leaves your computer: no account, no API key, and no network
  access after a model is downloaded" [H21]. Custom endpoint for local servers (Ollama `http://localhost:11434/v1`, vLLM,
  SGLang, llama.cpp, LM Studio) via `hermes model` → "Custom endpoint", or `config.yaml`
  `model: {default, provider: custom, base_url}` [H20][H22].
- Things that can send data out **even with a local main model**:
  - `fallback_providers` ("a cloud fallback that only activates when the local model fails") [H22][H20].
  - Auxiliary models (vision, compression, titles, …). Default `auto` = "your main chat model", but they can be set per
    task to a cloud provider [H23].
  - Tools: web search, Tool Gateway (web search, image generation, TTS, cloud browser) [H1]. Which tools are on is set in
    `hermes tools` [H1].
  - Ollama `:cloud` models behind a local Ollama URL (NOVA §2.2, S20).
  - External memory providers (e.g. Honcho) [H1][H17]. Their data flow was **not read in detail (UNVERIFIED)**.

### 4.2 How a person can confirm "my Hermes uses a local model" (step 8 checklist)
Commands (documented `hermes config get KEY [--json]` [H8]):
```
hermes config get model
hermes config get fallback_providers
hermes config get auxiliary
```
Strict needs all four confirmations:
- `model.provider` is `custom` with a `base_url` on `localhost`/`127.0.0.1` (and not an Ollama `:cloud` model), **or**
  Desktop's Local Models is in use (`local_runtime.enabled: true` [H21]).
- `fallback_providers` is empty or missing.
- Every auxiliary task is `auto` or local.
- The person accepts that enabled tools such as web search can still go online.

No HTTP endpoint the browser can call reports the model that actually served a chat-completions turn (§2.5), so this stays
a **person-confirmed** checkbox, as the brief requires. (`/api/model/options` lists configured providers [H9]. It could
inform but cannot prove locality.)

### 4.3 What Hermes stores, and where (`HERMES_HOME` = `~/.hermes`; Windows `%LOCALAPPDATA%\hermes` [H5])
- Sessions: `~/.hermes/state.db` (SQLite, "full message history", FTS5) [H24]. API-server turns are sessions with
  source `api_server` ("Source stamped on every session row this platform owns") [H11 code]. `/v1/responses` history:
  `response_store.db` [H11 code][H9].
- Logs: `~/.hermes/logs/` (`agent.log`: "All agent activity — API calls, tool dispatch, session lifecycle";
  `errors.log`, `gateway.log`, …) [H8].
- Memory: `~/.hermes/memories/MEMORY.md`, `USER.md`. The agent writes them with its `memory` tool, so a NOVA
  conversation can end up in Hermes's memory. `memory.write_approval: true` holds such writes for review [H17].
- Skills: `~/.hermes/skills/` [H18]. Config: `config.yaml`. Secrets: `.env` [H9][H15].
- Guide copy: "Whatever NOVA sends to Hermes is kept by your Hermes on your computer (its session database and logs) and
  handled by your Hermes settings. ZIGoals never sees, stores or proxies it." (consistent with the brief).

---

## 5. Dropping a ZIGoals summary into Hermes

### 5.1 Skill (recommended)
- Location: "All skills live in **`~/.hermes/skills/`** — the primary directory and source of truth" [H18]. Discovery
  walks the folder recursively for `SKILL.md` (`iter_skill_index_files`, `os.walk`) [H18 code]. The documented layout is
  `<category>/<skill>/SKILL.md` with optional `references/`, `templates/`, … [H18].
- Path to suggest: `~/.hermes/skills/personal/zigoals-summary/SKILL.md` (Windows
  `%LOCALAPPDATA%\hermes\skills\personal\zigoals-summary\SKILL.md`). A long summary goes in
  `references/zigoals-summary.md` next to it.
- Format (docs "SKILL.md Format"; fields beyond `name`/`description` optional):
  ```markdown
  ---
  name: zigoals-summary
  description: My goals, habits and plans exported from ZIGoals on <date>; use when planning my week or reviewing goals.
  version: 1.0.0
  ---
  # ZIGoals summary (<date>, <privacy mode>)
  ## When to Use
  When I ask about my goals, habits, weekly plan or review.
  ## Procedure
  1. Read references/zigoals-summary.md.
  2. Suggest changes as text; I apply them in ZIGoals myself.
  ## Pitfalls
  - This is a snapshot; ask me before treating it as current.
  ```
- Loading: the agent sees skill names first and loads content when needed ("progressive disclosure") [H18]. A new session
  picks up new files (memory and context are assembled at session start [H19]). Hermes says "The agent can modify or
  delete any skill" [H18]. The guide should tell the person to keep their own copy.

### 5.2 Memory (not for the summary)
`MEMORY.md` 2,200 chars and `USER.md` 1,375 chars, entries separated by `§`, managed by the agent's `memory` tool. A
write that would exceed the limit returns an error [H17][H17 code `memory_char_limit`/`user_char_limit`]. The
documented ways to add facts are to tell the agent ("use the `memory` tool to save …") or `hermes journey edit` [H17][H19].
Editing the file by hand is **not documented (UNVERIFIED)**. → The guide offers one line for the person to say to Hermes:
"Remember that my ZIGoals summary is the `zigoals-summary` skill."

---

## 6. Ten-step guide outline ("Connect your Hermes Agent")

Every command goes in its own copyable block, with macOS / Windows / Linux tabs. "App check" means ZIGoals verifies it
itself. "Person confirms" means a checkbox with the exact thing to look for.

1. **What Hermes is**: §1.1–1.2 in plain words; Hermes as NOVA's brain or "Ask my Hermes"; privacy picture (§4).
   *Person confirms:* "I understand Hermes can run commands on my computer and keeps its own history."
2. **Install** (§1.4). macOS (Apple Silicon): Desktop DMG, or
   `curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash` then `source ~/.zshrc`. Linux: same command, then
   `source ~/.bashrc`. Windows (no WSL needed): `iex (irm https://hermes-agent.nousresearch.com/install.ps1)` in
   PowerShell, then open a new PowerShell window. All: `hermes --version`.
   *Person confirms:* the output starts with "Hermes Agent v". (The app later shows the version from `/health`.)
3. **Choose Hermes's model**: local recommended (link the local-model planets; Desktop → Settings → Providers → Local
   Models, or `hermes model` → Custom endpoint `http://localhost:11434/v1` for Ollama [H20][H21]); or the person's
   provider, with the consequence that prompts go to that provider. *Check:* `hermes config get model` (feeds step 8).
4. **Turn on the API server.** Key generated locally, ≥ 16 chars (64 hex). Options: ZIGoals generates it in the browser
   with `crypto.getRandomValues` and fills it into the commands, or the person runs:
   - macOS/Linux:
     ```
     KEY="$(openssl rand -hex 32)"
     hermes config set API_SERVER_ENABLED true
     hermes config set API_SERVER_KEY "$KEY"
     hermes config set API_SERVER_CORS_ORIGINS https://alpha.zigoals.app
     echo "$KEY"
     ```
   - Windows PowerShell (the key line is a standard .NET call; **not from Hermes docs, not run here**):
     ```
     $b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); $KEY = -join ($b | ForEach-Object { $_.ToString('x2') })
     hermes config set API_SERVER_ENABLED true
     hermes config set API_SERVER_KEY $KEY
     hermes config set API_SERVER_CORS_ORIGINS https://alpha.zigoals.app
     $KEY
     ```
   - Or as file lines in `~/.hermes/.env` (`%LOCALAPPDATA%\hermes\.env` on Windows): `API_SERVER_ENABLED=true`,
     `API_SERVER_KEY=<key>`, `API_SERVER_CORS_ORIGINS=https://alpha.zigoals.app`. Optional `API_SERVER_HOST=127.0.0.1`
     and `API_SERVER_PORT=8642` are the defaults; never set the host to `0.0.0.0`.
   Notes: passing the key as an argument leaves it in shell history (fine on a personal computer; say so).
   `hermes config get API_SERVER_KEY --raw` shows it again [H15].
   *Person confirms:* `hermes config get API_SERVER_CORS_ORIGINS` prints exactly `https://alpha.zigoals.app`.
5. **Start the gateway**: `hermes gateway`, keep the window open, look for "API server listening on
   http://127.0.0.1:8642". After changes: `hermes gateway restart` (service) or stop and start again. Keep running at
   login: `hermes gateway install` on macOS (launchd), Linux (systemd user service; add `sudo loginctl enable-linger
   $USER` to survive logout) and Windows (Scheduled Task); `hermes gateway status` to check [H7][H5]. WSL: `tmux new -s
   hermes 'hermes gateway run'` [H8].
   *App check:* comes in step 6. *Person can also check:* `curl -s http://127.0.0.1:8642/health` (Windows:
   `curl.exe -s http://127.0.0.1:8642/health`; `curl.exe` is a Windows tool, **not from Hermes docs**) prints
   `"status": "ok"`.
6. **Let the browser reach it**: explain the Chrome/Edge/Firefox prompt before it appears; Safari and phones can't
   (§3.3). "Test my setup" button: permission query → `GET /health` (no key) → if `TypeError`, run the `no-cors` probe
   (§3.2) to name "not running" vs "origin not allowed" vs "permission".
   *App check:* `/health` → `status: "ok"` with `platform: "hermes-agent"`.
7. **Connect it in ZIGoals**: base URL `http://127.0.0.1:8642/v1` (editable), key stored device-only via `lib/ai/keys.ts`.
   *App check:* `GET /v1/models` with Bearer → 200 names the model id (`hermes-agent` or the profile name); 401 → "wrong
   key". Optional `GET /v1/capabilities` → `features.cors: true`.
8. **Confirm the privacy mode**: show the three commands in §4.2 and the four-part checklist. Strict only after the
   person ticks it; otherwise Guarded (redaction + "about to send" preview).
   *Person confirms:* checklist ticked.
9. **First run**: a short streamed chat (send no tools; §2.5), then one delegation: "Ask my Hermes to plan my week from my
   goals". The scoped, redacted context NOVA sends is shown first. Hermes's reply comes back as text; any ZIGoals change
   becomes a confirm card with Undo.
   *App check:* the stream completed with `finish_reason: "stop"` and non-empty text; the time to answer is recorded
   for N12's panel.
10. **Go further**: "Give Hermes my ZIGoals summary" (§5: preview → copy or save `SKILL.md`; the person drops it into the
    skills folder themselves), Hermes skills built from NOVA's workflows (same `SKILL.md` format), links: docs
    https://hermes-agent.nousresearch.com/docs/, GitHub https://github.com/NousResearch/hermes-agent, Discord
    https://discord.gg/NousResearch (from the README [H1]).
    *Person confirms:* "Hermes listed `zigoals-summary`" (in a new Hermes session, ask it to list skills).

Test fixtures implied: mock `/health` (with and without `platform`/`version`); `/v1/models`; SSE including
`event: hermes.tool.progress`, `: keepalive`, `reasoning_content` and an error final chunk; `401
gateway_auth_failed`; `403` no-CORS; connection refused; `429`; `503` + `Retry-After`.

---

## 7. UNVERIFIED / open
- Intel Mac support for `install.sh` (not Tier 1; the installer page says Apple Silicon only) [H3][H4].
- Approval behaviour for risky tools on `/v1/chat/completions` (documented only for `/v1/runs`) [H9].
- Hand-editing `MEMORY.md`/`USER.md` (only agent writes and `hermes journey edit` are documented) [H17][H19].
- A per-turn "model actually used" field on chat completions: documented, but absent from the v0.22.5 code [H9][H11].
- External memory providers' data flow (Honcho etc.) was not read in detail.
- The Windows PowerShell key one-liner and `curl.exe`: standard Windows/.NET, not from Hermes docs, not run here.
- Live behaviour of the CORS code: read from source, not executed here (sandbox policy refused running downloaded code).

## 8. Discrepancies between official sources (recorded, not guessed around)
| Topic | Docs say | Code (v0.22.5) does |
|---|---|---|
| `/health` body | `{"status": "ok"}` [H9][OW] | `{"status","platform","version"}` [H11] |
| Enabling | set `API_SERVER_ENABLED=true` [H9][OW] | a usable key enables it; the flag isn't read by `_api_server` [H13] |
| `hermes config set API_SERVER_ENABLED` | "auto-routes the flag to `config.yaml`" [H10] | every UPPER_SNAKE name → `.env` [H15] |
| Key example | OW `your-secret-key` (15 chars) [OW] | refused: < 16 chars [H11][H13] |
| `runtime` on chat completions | "same shape as on `/v1/chat/completions`" [H9] | not in the chat-completions response [H12] |
| Windows install URL | raw.githubusercontent `…/main/scripts/install.ps1` [H5] | README/installation: `hermes-agent.nousresearch.com/install.ps1` [H1][H3] |

## 9. Sources (all read 1 November 2026; repository files at tag `v0.22.5`, commit `bf0203a7…`)
Repository base: `https://github.com/NousResearch/hermes-agent/blob/v0.22.5/`. Docs-site pages map
`website/docs/<path>.md` → `https://hermes-agent.nousresearch.com/docs/<path>`.
- [H1] README — …/README.md (feature table, Quick Install, Nous Portal / Tool Gateway, Discord link)
- [H2] Licence — …/LICENSE ; …/pyproject.toml (`license = "MIT"`)
- [H3] Installation — …/website/docs/getting-started/installation.md ; installer URLs HEAD 200: https://hermes-agent.nousresearch.com/install.sh , https://hermes-agent.nousresearch.com/install.ps1
- [H4] Platform Support — …/website/docs/getting-started/platform-support.md
- [H5] Windows (native) — …/website/docs/user-guide/windows-native.md (install, feature matrix L114+, "Running the gateway at Windows login" L212+, data dir, `.env` location)
- [H6] Windows (WSL2) — …/website/docs/user-guide/windows-wsl-quickstart.md (networking, L196–L245)
- [H7] Messaging gateway — …/website/docs/user-guide/messaging/index.md (Gateway Commands; "Linux (systemd)" L593; "macOS (launchd)" L659)
- [H8] CLI reference — …/website/docs/reference/cli-commands.md (`--version`, `hermes gateway`, WSL tip, `hermes logs`, `hermes config get`)
- [H9] API Server — …/website/docs/user-guide/features/api-server.md (Quick Start, endpoints, `/health` L533, Authentication L862, Environment Variables L903, CORS L947); **live** https://hermes-agent.nousresearch.com/docs/user-guide/features/api-server (same Quick Start lines, env table, CORS text, `/health` text)
- [H10] Open WebUI (Hermes docs) — …/website/docs/user-guide/messaging/open-webui.md
- [H11] API server code — …/gateway/platforms/api_server.py: `DEFAULT_HOST`/`DEFAULT_PORT` L219–220, `listen_address` L224, keepalive L238, `_CORS_HEADERS` L697–699, `cors_middleware` L711–727, env `API_SERVER_CORS_ORIGINS` L1124–1126, `_cors_headers_for_origin` L1398–1407, `_sse_headers` L1409, `_origin_allowed` L1419, `_auth_failed_response` L1481, Bearer check L1502, route table L1650–1674, `_handle_health` L2367, `_handle_models` L2416, startup key guard L4407–4436, middlewares L4466–4469
- [H12] OpenAI routes code — …/gateway/platforms/api_server_openai_routes.py: `_parse_chat_messages` L672–692, `stream` L844, tool progress L930, fingerprint keys (incl. `tools`) L972, non-stream response ~L990–1015, `_prepare_sse_response` L1101, `_write_sse_chat_completion` L1115–1206
- [H13] Gateway config — …/gateway/config_env.py `_api_server` L111–120 ; …/gateway/config.py `_has_usable_api_server_key` L544–553
- [H14] Placeholder secrets — …/hermes_cli/auth.py L283–305
- [H15] `hermes config set/get` routing — …/hermes_cli/config.py `set_config_value` L3398+, `get_config_value` ; …/hermes_cli/config_env_routing.py `is_env_setting_key` L36
- [H16] Version output — …/hermes_cli/_startup_fast.py L203 (`Hermes Agent v{…} ({release date})`)
- [H17] Memory — …/website/docs/user-guide/features/memory.md ; …/tools/memory_tool.py L56 (2200 / 1375)
- [H18] Skills — …/website/docs/user-guide/features/skills.md (location, SKILL.md format, directory structure) ; …/agent/skill_utils.py `iter_skill_index_files` L859–868
- [H19] Which File Does What — …/website/docs/user-guide/which-file-does-what.md
- [H20] Providers — …/website/docs/integrations/providers.md ("Custom & Self-Hosted" L712, Ollama L779, Ollama Cloud L409, Fallback Providers L1702)
- [H21] Local Models — …/website/docs/user-guide/local-models.md
- [H22] Local Ollama guide — …/website/docs/guides/local-ollama-setup.md (config, fallbacks)
- [H23] Configuration, Auxiliary Models — …/website/docs/user-guide/configuration.md (~L1443)
- [H24] Sessions — …/website/docs/user-guide/sessions.md (`state.db`)
- [H25] Releases — https://github.com/NousResearch/hermes-agent/releases (v0.22.5 "Latest"; v0.22.4, v0.22.3 on 21 Oct 2026); tag via `git ls-remote`
- [H26] `main` HEAD `d33d4fd9e7b57e16316ca953523bba596e4f6d5e` (1 Nov 2026): same `_CORS_HEADERS`, defaults, `_api_server`, `/health`
- [OW] Open WebUI, "Hermes Agent" (Connect an agent) — https://docs.openwebui.com/getting-started/quick-start/connect-an-agent/hermes-agent (no date shown)
- [NOVA] docs/research/session-ak/NOVA.md §2.1 (browsers; its sources S25–S32), §2.2 (Ollama `:cloud`)
- Repo files read today: `apps/web/lib/ai/sse.ts`, `apps/web/lib/ai/adapters/openai-compatible.ts`, `apps/web/lib/egress-policy.json`
