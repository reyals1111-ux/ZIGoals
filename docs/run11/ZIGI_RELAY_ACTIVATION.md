# ZIGoals hosted: owner activation of the relay (ADR-014)

**Status (2026-10-06):** written with Session V Part 17, before any activation. Nothing here has run against a Cloudflare account or a real provider: the relay, its budgets, the app route and the client are proven by local tests only (Miniflare, unit tests, a MOCK provider). Lines marked **UNVERIFIED** were read from code or inferred, not observed. Owner decision D2: the relay is **off by default** and the session never deploys it.

## What this is, and what stays off
- **ZIGoals hosted** is an AI that ZIGoals runs and pays for, for **invited accounts only**: a person who has no key, local model or subscription can still ask ZIGi. Replies say "Answer from <provider> via ZIGoals hosted".
- **Three switches, all off today:**
  1. the app build: the hosted option exists only in a build made with `NEXT_PUBLIC_ZIGI_HOSTED=on`. No build has it; adding it to the Alpha build is a reviewed deploy-workflow change (your decision);
  2. the app Worker: `/api/zigi` answers 503 `HOSTED_UNAVAILABLE` until the secret `ZIGOALS_ZIGI_RELAY_ORIGIN` is set (with `ZIGOALS_SYNC_ORIGIN`, as for push);
  3. the relay itself: paused unless `ZIGI_KILL_SWITCH` is exactly `off` (the template says `on`), and 503 until every value below is set.
- The browser never talks to the relay: it calls the app's own `/api/zigi` (the session is an HttpOnly cookie the page cannot read), so the app's `connect-src` does not change (ADR-014 S2; `lib/egress-policy.json` → `serverOnly`).
- It runs in its own Worker, `workers/zigi-relay/` (`worker.mjs`; the Durable Object class `RelayBudget`, SQLite, one object for the whole relay; binding `ZIGI_BUDGET`; migration `v1`; compatibility date 2026-09-13). It is outside the six-Worker topology: `activation-check.mjs` is untouched; `scripts/run11/zigi-relay-config.mjs` checks this Worker's config.
- Do it on the isolated acceptance services first, like every stage of [ACTIVATION.md](ACTIVATION.md). One mutation at a time; verify after each.

## What passes through, what is kept
- **Through the app route and the relay:** the messages of one chat turn (the system prompt with the page's records ZIGi attaches under the page switches, the conversation, the person's message, tool results), the tool definitions, and the output cap. The relay rebuilds the provider's body from the messages and tool definitions only and sets the model, the cap and streaming itself. Tools run in the browser; the relay never runs one.
- **Kept:** counts only, in the `RelayBudget` object: per account and UTC day, requests and tokens; per UTC day, the relay's own tokens; open reservations; the breaker's state. Account ids are kept with the counts for one extra day, then deleted. No message, reply, model output, IP address or user agent is stored by the relay.
- **Logs:** the relay has no `console` call (a test checks the source and captures every runtime log line), and its config sets `observability.enabled: false`. Cloudflare processes the connection itself (addresses, headers) as it does for every Worker; what Cloudflare retains is under its own terms (**UNVERIFIED** in detail).
- **The provider** (the template's: OpenAI, `gpt-6-luna`, checked on its official model page on 2026-10-06) receives what the relay forwards, under its API terms, with the relay's key. Read the provider's current data-retention terms for API use before activating.
- **Health** goes only when the person ticked "Also let Health go to ZIGoals hosted" in the first-use disclosure **and** the three-part Health gate is open.

## Prerequisites
- Stage 7 is done on the acceptance services: the private app Worker and the private sync Worker are deployed and sign-in works (the app route confirms every session with private sync before it forwards anything, exactly like `/api/push`).
- A provider API key **with a spending limit set at the provider** (the relay's own budgets are the second line, not the first).
- The invited account ids (from the acceptance sign-ins; never emails).
- Node 24.19.0 and pnpm 11.19.0; the pinned wrangler through `pnpm --filter @zigoals/web exec wrangler`; your Cloudflare login for that shell. Run every command from the checkout root.

## 1. The private relay copy (offline)
```sh
cp workers/zigi-relay/wrangler.local.jsonc workers/zigi-relay/wrangler.acctest.owner.jsonc
chmod 600 workers/zigi-relay/wrangler.acctest.owner.jsonc
```
Edit only: `name` (`<prefix>-zigi-relay`), `vars.AUTH_ORIGIN` (the acceptance Supabase origin), `vars.APP_ORIGIN` (the acceptance app's https origin), and, if you choose differently, the provider, model and budgets (`ZIGI_DAILY_REQUESTS`, `ZIGI_DAILY_TOKENS` per account, `ZIGI_GLOBAL_DAILY_TOKENS` for the whole relay). Leave `ZIGI_KILL_SWITCH` at `on`. Then:
```sh
node scripts/run11/zigi-relay-config.mjs workers/zigi-relay/wrangler.acctest.owner.jsonc
```
It must print "The relay config is quiet, paused or budgeted, and holds no secret." Fix anything it names.

## 2. Deploy, paused (one mutation)
```sh
pnpm --filter @zigoals/web exec wrangler deploy --config "$PWD/workers/zigi-relay/wrangler.acctest.owner.jsonc" --dry-run --outdir /tmp/zigoals-zigi-relay-dry
```
Review the dry run (one Durable Object class, no other binding, no route), then deploy without `--dry-run`. **Verify:** `GET /health` on the Worker's address answers `{"ok":true}`; `GET /v1/entitlement` answers `{"error":"HOSTED_CONFIGURATION_REQUIRED"}` (secrets not set yet). **Rollback:** `wrangler delete` for that Worker name.

## 3. The relay's secrets (one at a time, typed at the prompt only)
```sh
pnpm --filter @zigoals/web exec wrangler secret put AUTH_PUBLIC_KEY --config "$PWD/workers/zigi-relay/wrangler.acctest.owner.jsonc"
pnpm --filter @zigoals/web exec wrangler secret put ZIGI_UPSTREAM_KEY --config "$PWD/workers/zigi-relay/wrangler.acctest.owner.jsonc"
pnpm --filter @zigoals/web exec wrangler secret put ZIGI_ALLOWLIST --config "$PWD/workers/zigi-relay/wrangler.acctest.owner.jsonc"
```
`ZIGI_ALLOWLIST` is the invited account ids, separated by commas. Never pass a value as an argument, in a file, a report or a chat. **Verify:** `GET /v1/entitlement` from the app (step 4) answers `{"entitled":false,"reason":"paused"}`. **Rollback:** `wrangler secret delete NAME`.

## 4. The app route (one mutation)
On the private **app** Worker: `wrangler secret put ZIGOALS_ZIGI_RELAY_ORIGIN` (the relay's https origin, no path). `ZIGOALS_SYNC_ORIGIN` is already set from Stage 7. **Verify:** signed in on the acceptance app, `GET /api/zigi` with the account header answers the relay's `paused`. **Rollback:** `wrangler secret delete ZIGOALS_ZIGI_RELAY_ORIGIN`; the route answers 503 again.

## 5. A hosted build (reviewed change)
Build the acceptance app with `NEXT_PUBLIC_ZIGI_HOSTED=on` (a change to the build you deploy; for the public Alpha it is a deploy-workflow change that needs your review). Without it the app never asks `/api/zigi` and shows nothing.

## 6. Un-pause (one mutation), then verify
Set `ZIGI_KILL_SWITCH` to `off` in the private copy, run the config check, deploy. **Verify** with an invited test account:
1. Settings → ZIGi · your AI → "ZIGoals hosted" appears, with the disclosure; nothing has been sent yet.
2. "I agree, use ZIGoals hosted" (Health left unticked). The panel's header says "<provider> · <model> via ZIGoals hosted".
3. Ask "How many minutes did I meditate this month?" on Habits. The reply is labelled "Answer from <provider> via ZIGoals hosted"; Settings shows fewer messages left today.
4. With an account that is **not** invited: no card appears.
5. Set the kill switch back to `on` and deploy: the next message says "ZIGoals hosted is paused right now".
**Rollback at any point:** kill switch `on` (fastest), or delete `ZIGOALS_ZIGI_RELAY_ORIGIN` on the app Worker, or delete the relay Worker.

## Limits that hold whatever the config says (workers/zigi-relay/limits.mjs)
1 MiB per request, 2 MiB per streamed reply (cut at an event boundary with an error event), 4,096 output tokens per reply, 200 messages, 64 tools, 20 s for the provider to start answering, 120 s per reply. The breaker opens after 5 provider failures in a minute, probes once after 30 s, and doubles the wait up to 10 minutes while probes fail.

## Questions this raises (for you and counsel; not answered here)
- **Cost:** the provider bills ZIGoals for every invited account's use. The daily budgets cap it per day; set the provider's own spending limit below what you accept losing (COST_MODEL.md, relay drivers).
- **Privacy law:** with the relay on, ZIGoals processes the person's messages and possibly Health data (special-category data, GDPR Art. 9) as a processor or controller; a DPA with the provider, international transfers, the legal basis and retention need decisions (LEGAL_CHECKLIST §8). The disclosure in the app is a draft until then.
- **Labelling:** EU AI Act transparency for AI-generated replies (the label "via ZIGoals hosted" is there; whether more is required is open).
- **Abuse:** invite-only plus budgets; a public opening would need more (rate limits per IP at the edge, reporting).
