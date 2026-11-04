# Berlin — NOVA local-AI setup log (box), 2026-11-04 (Brussels, UTC+1)
Box: Debian trixie, x86_64, 8 vCPU, 15.6 GiB RAM (~3-4 GiB free), CPU only (no GPU).

## Steps, timings, errors
1. 01:17:44 `curl -fsSL https://ollama.com/install.sh | sh` → **ERROR** "This version requires zstd for extraction" (5 s). Real-user note: the official one-liner fails on a minimal Linux without zstd.
2. `sudo apt-get install zstd` → **ERROR** archives not fetchable; `apt-get update` → 500 Internal Server Error from deb.debian.org (box network proxy). zstd could not be installed via apt.
3. Workaround: python venv + `pip install zstandard`; downloaded `https://ollama.com/download/ollama-linux-amd64.tar.zst`, decompressed in Python, `sudo tar -x -C /usr/local`. 14 s. Installed **Ollama client 0.40.14** (/usr/local/bin/ollama). No systemd service set up.
4. **Port conflict:** 127.0.0.1:11434 is already occupied by another agent's mock server (`python3 server.py 11434`, cwd /workspace/qa/mock, running since Nov 3; `/api/version` → "0.0.0-mock", `/api/tags` → `mock:latest`). Not killed (belongs to another job on the shared box). So `curl localhost:11434/api/tags` "works" but hits the MOCK, not Ollama.
5. Started real server on **127.0.0.1:11435**: `OLLAMA_HOST=127.0.0.1:11435 OLLAMA_ORIGINS='*' nohup ollama serve > /tmp/ollama-serve.log 2>&1 &` (01:19:11). CPU backend (sapphirerapids). OLLAMA_ORIGINS='*' set so the browser app at alpha.zigoals.app can call it (CORS).
6. `ollama pull llama3.2:1b` → **ERROR** after 65 s: "max retries exceeded … redirect target not allowed: …r2.cloudflarestorage.com resolves to non-public 198.18.0.1" (box proxy DNS; registry pulls blocked).
7. Workaround: `curl` GGUF from Hugging Face (Qwen/Qwen2.5-0.5B-Instruct-GGUF, qwen2.5-0.5b-instruct-q4_k_m.gguf, 491 MB, 20 s) to /workspace/models/, Modelfile with ChatML template + stop `<|im_end|>`, `ollama create qwen2.5:0.5b -f Modelfile` → success.
8. Checks: `curl localhost:11435/api/tags` → lists `qwen2.5:0.5b` (digest 4a74059a1f67…). `/api/generate` "Say hi in 5 words" → "Hello!" in 20.5 s (incl. cold load); "What is staking? One sentence." → 50 tokens in 27.9 s (~2 tok/s on busy CPU). Answer quality is weak (factually loose on staking) — expected for 0.5B.

## For the NOVA tutorial test
- Endpoint to enter in the app: **http://127.0.0.1:11435** (or localhost:11435), model `qwen2.5:0.5b`. Using 11434 will reach the mock server instead — useful only for a "fake model" failure-state test.
- Restart if needed: `OLLAMA_HOST=127.0.0.1:11435 OLLAMA_ORIGINS='*' nohup ollama serve >/tmp/ollama-serve.log 2>&1 &`
- Expect slow first replies (20-30 s); test NOVA's timeout/loading states.
- Tutorial truth-check points: does it mention zstd, port 11434 conflicts, OLLAMA_ORIGINS/CORS for a browser app, pull failures, and realistic CPU speed?

## LM Studio
Not installed (not forced). LM Studio headless = `llmster`/`lms` CLI (`curl -fsSL https://lmstudio.ai/install.sh | bash` → reachable, HTTP 200), then `lms server start --port 1234` and `lms get <model>`; model downloads would likely hit the same proxy restrictions. Desktop LM Studio needs an AppImage + GUI. Left for a later step if needed.
