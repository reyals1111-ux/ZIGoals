# Security delta A: AI / NOVA area, 17069c7d..d86a85bd

Reviewer: a fresh security reviewer (read-only, 8 Nov 2026). Scope (owner rule 12): the diff `17069c7d..HEAD` of `apps/web/lib/ai/**`, `lib/nova/**`, `components/ai/**`, `components/nova/**`, `components/zigi*`, `lib/secret-guard/**` and the `app/api/**` routes in the diff. Method: I read the diff, with context where needed. I confirmed findings with throwaway vitest probes kept outside the repo; no file in the checkout was changed apart from this one.

## Findings

### SA-1 · Medium: a second Hermes inherits the saved Hermes's "runs a local model" confirmation, and Strict/Guarded send it unredacted
- **Where:** `lib/nova/hermes-record.ts:84-85` (`isHermesBase` now counts `seenBases`) together with `:100` (`localModelStillConfirmed` checks the *saved* `baseUrl` against `confirmedBase`, never the address the request goes to); used at `lib/ai/privacy-mode.ts:119-122`, `lib/nova/bridge-pack.ts:82` and `components/nova/chat/hermes-preview.tsx:24`.
- **What happens:** the person confirms that Hermes A (`:8642`) runs a local model. Later they connect a local brain to Hermes B (`:8643`, which forwards to a cloud model). `ai-setup.tsx` probes B's `/health` and notes B in `seenBases`. From then on `savedHermes` is true for B, so `probedHermes` is skipped, and `hermesUnconfirmed = !localModelStillConfirmed(A's record)`, which is false. The result is `'send'`: in Strict or Guarded, records, IBANs and names go to B unchanged. The default-port rule (`:8642` is always Hermes) has the same inheritance. Z1A-I5 aimed to stop exactly this ("a Hermes at another address … is asked about again").
- **Evidence (probe):** saved record `{baseUrl: :8642, localModelConfirmed: true, confirmedBase: :8642, seenBases: [:8643]}`, request to `:8643/v1`. `guardRequest` returned the same object in `strict` and `guarded`, with "My IBAN is NL91ABNA0417164300" intact. With `seenBases: []` the same request was redacted to `[IBAN]`.
- **Fix:** pass the request address. Make it `localModelStillConfirmed(record, requestBase)`, which holds only when `canonicalLocalBase(requestBase) === record.confirmedBase`. For a legacy confirmation that has no `confirmedBase`, it should hold only when the request address equals the saved `baseUrl`. Use it in all three call sites.
- **Test:** add to `p14b-hermes.test.ts`: saved A confirmed, `seenBases: [B]`, request to B in Strict and in Guarded → redacted (not the same object). Also a request to `:8642` while the saved and confirmed Hermes is `:9000` → redacted.

### SA-2 · High: recovery words, private keys and card numbers that chat refuses are still kept as "frequent asks" and exported
- **Where:** `components/ai/ai-chat.tsx:706` calls `onAsked(value)` *before* `session.ask`, and `ask` is where `looksSecret` and `cardNumberIn` refuse. The keep check `components/ai/ask-record.ts:9` (`keepsAsAsk`, new in this delta) consults only `safetyFirst`.
- **What happens:** a person pastes a 12-word recovery phrase, a hex private key or "Take my credit card 4111 1111 1111 1111 …" into ZIGi. The chat says it was "refused before anything is stored or sent", but the text has already gone in plaintext into `zigoals:zigi-suggestions:v1`. That localStorage record is part of Export everything (`lib/export/everything.ts:127`), and after three asks it shows as a "Yours" suggestion. The call order was there before this delta. The AL fifth-pass fix for guarded words left this case out.
- **Evidence (probe):** `keepsAsAsk` returned true and `recordAsk` stored the text verbatim for the `abandon … about` phrase (`looksSecret` true), a `0x…` 64-hex key (`looksSecret` true) and the 4111 card number (`cardNumberIn` true).
- **Fix:** in `keepsAsAsk`, return false when `looksSecret(text) || cardNumberIn(text)`. As defence in depth, add the same check inside `recordAsk` (`lib/zigi-suggestions.ts`), so no other caller can store such text.
- **Test:** extend the `keepsAsAsk` test in `l7-fifth-components.test.ts` with a BIP39 phrase, a hex key and a Luhn-valid card number → false, and `recordAsk` leaves the record unchanged.

### SA-3 · Medium: a message the guard answers as "secret" is still kept in the chat and its export, while the reply says it is never kept
- **Where:** `components/ai/use-chat-session.ts:302-307`. `guarded()` → `answerLocally(text, …)` → `persist`. Chats are kept by default (`:224`) and exported (`lib/ai/export.test.ts`).
- **What happens:** "my password is hunter2, keep it for me" and "remember my password: Tr0ub4dor&3" match the SECRET pattern `password\s*(is|=|:)\s*\S`. The guard's fixed reply says "ZIGoals never asks for, keeps or shows … passwords". The user turn with the password is still written to IndexedDB `zigoals-ai-chats-v1` and appears in History and in Export everything. It is not sent to a model (`messagesFor` drops `source: 'local'`).
- **Fix:** for `hit.topic === 'secret' | 'credential'`, store the user turn with a placeholder ("[a message with a password was not kept]") rather than the raw text, or do not persist that pair at all. Show the original only in memory for the current render.
- **Test:** call `send('my password is hunter2, keep it for me')` with a fake chat store, then assert that no stored turn contains `hunter2` and that the guard reply still shows.

### SA-4 · Medium: the harm guard misses the commonest English contractions
- **Where:** `lib/ai/safety-guard.ts:98`. The first HARM pattern is `i (?:want|am going|'m going|will|'ll|…)`, which needs a space between `i` and `'m` or `'ll`.
- **What happens:** "I'm going to kill my neighbour", "i'm going to hurt someone" and "I'll hurt him" all return no hit. "I am going to …" and "I will hurt him" are caught. A missed message goes to the device's lookups and examples list, or to the connected model, not to the fixed refusal with emergency numbers. I found no other HARM or THREAT pattern that catches these. All the replay's phrasings (GROK53_REPLAY_L7_2) do hit; I checked 30.
- **Fix:** `i(?: want| am going|'m going| will|'ll| feel like i (?:could|might))(?: to)? `, and the same shape anywhere else the code writes `i (?:…'…)`.
- **Test:** add to `g6-al-fifth.ts`: "I'm going to kill my neighbour", "I'll hurt him", "i'm going to hurt someone" → `harm`. Keep the near misses ordinary ("I'll kill it at the gym", if that is the wanted behaviour).

### SA-5 · Low: other guard false negatives outside the replay (guesses about which phrasings matter most)
- **Where:** `lib/ai/safety-guard.ts` DISTRESS, EMERGENCY and SECRET; `lib/ai/safety.ts` self-harm list.
- **Probed misses:** "life is not worth living", "het leven is niet de moeite waard", "Ik ben het leven zat", "i wanna die", "kms", "I took 20 pills" (EMERGENCY needs "too many / a lot of …"), "what's my wallet seed", "my bank pin is 4321", "store my pincode 1234" (an English verb with a PIN). "I want to hurt my dog" is also missed; whether animals belong in scope is an owner call.
- **Fix:** add these families with their near misses (for example "worth living for my kids" stays ordinary). Add `pin(?: ?code)?\s*(?:is|=|:)\s*\d` and `wallet seed`.
- **Test:** add a table to `safety-guard.test.ts`.

### SA-6 · Low: Guarded redaction skips any tool-call argument named `name`, `id` or `type`
- **Where:** `lib/ai/privacy-mode.ts:71` (KEEP in `mapStrings`, matched by key name at *any* depth) and `lib/secret-guard/redact-span.ts:48` (the same regex, for Gemini `raw`).
- **What happens:** `mapArguments('{"name":"Anna Jansen IBAN NL91…","note":"…"}')` cleans `note` but leaves `name` verbatim (probe). The case that matters: an earlier assistant turn from a local model in the same chat, such as `create_goal {name: "Anna's surgery fund"}`, is sent unredacted once the chat switches to a cloud model in Guarded. The same holds for recovery words in a Gemini `functionCall.args.name`.
- **Fix:** apply KEEP only at the structural levels (the call object and Gemini's `functionCall`, `thoughtSignature`), not inside `arguments` or `args`. For example, clean every string of the parsed arguments object, and in `raw` skip only `functionCall.name`, `role` and `*signature`.
- **Test:** `mapArguments` with `{name: "<IBAN>"}` → redacted. Also a Gemini raw `{functionCall: {name: 'create_goal', args: {name: '<IBAN>'}}}` → only `args.name` is cleaned.

### SA-7 · Low: the "is it really Ollama" check (BN-035) runs only in NOVA's setup scan
- **Where:** `components/nova/setup/steps/brain.tsx:61` and `lib/nova/setup-checks.ts:71` call `verifyOllama`. ZIGi's own setup does not: `components/ai/ai-setup.tsx:66-68` uses `detectLocalServer` and `testConnection` only, and so does NOVA's right-panel probe (`nova-right.tsx:54`).
- **What happens:** the mock on `:11434` that BN-035 describes still gets "Found Ollama" and the records through Settings → ZIGi. The code says itself that shape is not proof, so this is a consistency gap rather than a hard boundary.
- **Fix:** call `verifyOllama` in `AiSetup.test` when `server === 'ollama'`, and show `NOT_OLLAMA` on failure.
- **Test:** `ai-setup` component test with a fetcher that answers `{"version":"0.0.0-mock"}` → no "Found Ollama" and no Connect.

### SA-8 · Info: the version-lapse check fails open when the last check has no version
- **Where:** `lib/nova/hermes-record.ts:100-104`. When `lastCheck.version` is absent, the confirmation stands; a failed test drops it (`hermes.ts` `withCheck`).
- **Impact:** a guess. A gateway at the same address that stops reporting a version keeps an older confirmation. That is acceptable if the intent is "same address", but it is worth stating.
- **Fix:** optional. Keep the last known version across failed checks, or treat "confirmedVersion set, now unknown" as lapsed.

## Checked, no finding
- **XSS:** no `dangerouslySetInnerHTML`/`innerHTML` added; new links are internal paths (`goalHref` encodes ids); Next `Link` renders record titles as text.
- **SSRF / egress:** every new probe (`/api/version`, `/api/tags`, `/api/show`, `/health`) targets `normalizeLocalBaseUrl` or `canonicalLocalBase` addresses: loopback only, `credentials: 'omit'`, timeouts of 1.5 to 3 s. `egress-policy.json` only drops the non-standard `bluetooth` token (TIER 3 commit 91f0c1fb, documented). The new `/welcome`-style redirects in `next.config.ts` are fixed internal 307s.
- **Keys:** `forgetHermesKey`, and `forgetKey('local')` when a server is connected without a token, narrow key reach. No key appears in an error, log, export or URL in the diff.
- **Unsafe parsing:** model and tool JSON goes through Zod (`schema-nova` `repeat`, `recurSchema`). Local-server JSON is read whole (`r.json()`) with no size cap. That is only reachable from a program on this computer, so I note it and don't count it as a finding.
- **Writes:** every new write path stays behind a confirmed card or a person's own tap (HUD quick actions, Quick add, journal → goal/habit cards). `card-undo` re-checks `unchanged` before any undo. No change to auto-accept caps. In careful mode, write blocks are now stripped (`stripWriteBlocks`).
- **Non-custodial:** nothing new signs, holds keys or moves funds. Hermes is told never to sign, send or move money, and records reach it wrapped as data.
- **Privacy gates:** `aiGates.local` now honours the page switches (narrower). Health goals and the Health metrics of average goals are gated (`tools/env.ts`, `goals.ts`). The NOVA HUD shows Health locally only when the pillar is shown. Sensitive-screen `:focus` rules keep the panel paused, with nothing read, while a secret field has focus.
- **Safety guard:** it runs before the model, the lookups and the examples list in both `send` and `ask`, for ZIGi and NOVA. All 30 replay phrasings I tested (EN/NL distress, harm, threat, medicine, secret, injection) get the right topic.
- **API routes in the diff** (`private-account`, `push`, `chain/proposals`): not AI-called. The changes fail closed (`signedIn:false`) and return a fixed reason string; no error text is echoed.

## Summary

| ID | Severity | File:line | Issue |
|---|---|---|---|
| SA-1 | Medium | lib/nova/hermes-record.ts:84,100; lib/ai/privacy-mode.ts:119-122 | A second (seen or default-port) Hermes inherits the saved Hermes's local-model confirmation → unredacted in Strict/Guarded |
| SA-2 | High | components/ai/ai-chat.tsx:706; components/ai/ask-record.ts:9 | Refused recovery words, keys and card numbers kept as frequent asks (localStorage + export) |
| SA-3 | Medium | components/ai/use-chat-session.ts:302-307 | A password the guard answers is still kept in chat history and its export |
| SA-4 | Medium | lib/ai/safety-guard.ts:98 | "I'm going to …" / "I'll …" harm phrasings missed (regex needs `i 'm`) |
| SA-5 | Low | lib/ai/safety-guard.ts, lib/ai/safety.ts | Further EN/NL distress, emergency and PIN phrasings missed (outside the replay) |
| SA-6 | Low | lib/ai/privacy-mode.ts:71; lib/secret-guard/redact-span.ts:48 | Tool-argument keys `name`/`id`/`type` skipped by redaction at any depth |
| SA-7 | Low | components/ai/ai-setup.tsx:66-68 | Real-Ollama check not applied in ZIGi's setup |
| SA-8 | Info | lib/nova/hermes-record.ts:100-104 | Version-lapse check fails open when no version is reported |

## Fixes (8 Nov)

Fix lane, 8 Nov 2026. No stored format changed (the suggestions record and the chat turns keep their shapes; only what goes into them changed).

- **SA-1 Fixed.** `localModelStillConfirmed(record, requestBase?)` holds only when the request's own address (any spelling) is the confirmed one; a confirmation from before AL holds only for the saved gateway's own address. Used with the request's address in `lib/ai/privacy-mode.ts`, `lib/nova/bridge-pack.ts`, `components/nova/chat/hermes-preview.tsx` (the saved gateway) and, so the previews match the engine, `components/nova/setup/about-to-send.tsx` and `what-nova-sees.tsx`. Files: `lib/nova/hermes-record.ts` and those call sites. Tests: `lib/nova/p14b-hermes.test.ts` "security delta A" (B seen, A confirmed → B redacted in Strict and Guarded, A sent as is; :8642 with :9000 confirmed → redacted; legacy).
- **SA-2 Fixed.** `keepsAsAsk` refuses what `looksSecret` or `cardNumberIn` refuses, before any write; `recordAsk` repeats the check, drops such an entry kept by an earlier build on its next write, and `shownSuggestions` never shows one. Files: `components/ai/ask-record.ts`, `lib/zigi-suggestions.ts`. Tests: `lib/ai/l7-fifth-components.test.ts` "SA-2" (BIP39 phrase, 0x hex key, Luhn-valid card → not kept; older record → not shown, dropped).
- **SA-3 Fixed.** A message the guard answers as `secret` or `credential` is kept as "[Message not kept: it was about a password, a key or recovery words.]" (NL alike); the guard's reply still shows; Regenerate on it asks nothing again (the placeholder never goes to a model). File: `components/ai/use-chat-session.ts`. Test: `lib/secret-guard/zigi-send.test.ts` "SA-3" (hunter2 / Tr0ub4dor / NL: not in the chat, its title or IndexedDB; no fetch).
- **SA-4 Fixed.** The harm line reads "I'm going to", "Im gonna", "I'll", "Ill", "I wanna" (`norm` now also folds ‘ and ʼ); Dutch "'k ga …" too. File: `lib/ai/safety-guard.ts`. Tests: `lib/ai/evals/g6-al-fifth.ts` (5 harm rows, 3 near misses: "I'll kill it at the gym", "kill time", "beat my record") and `lib/ai/safety-guard.test.ts` "security delta A".
- **SA-5 Fixed.** Distress: "life is not worth living" (EN forms), "het leven is niet de moeite waard", "Ik ben het leven zat/beu"; "i wanna die" and "kms" after a wanting verb ("I'm gonna kms"; "I ran 5 kms" stays ordinary) in `lib/ai/safety.ts`. Emergency: ten or more pills taken (EN/NL; "this week/month" and "2 pills" stay ordinary). Secret: a PIN with digits ("my bank pin is 4321", "store my pincode 1234"), "wallet seed". Files: `lib/ai/safety-guard.ts`, `lib/ai/safety.ts`. Test: `lib/ai/safety-guard.test.ts` table with 23 near misses. Recorded: "I want to hurt my dog" (animals in scope is the owner's call); found in passing: Dutch with the verb last ("Wil je mijn wachtwoord voor mij onthouden?") is still not guarded (the NL pattern wants the verb first) — not fixed here, as "Hoe kan ik mijn wachtwoord opslaan?" would then be guarded too.
- **SA-6 Fixed.** The keep-list (`name`, `id`, `type`, …) applies to the turn's structure only; inside `args`/`arguments` every string is cleaned or checked, whatever its key. Files: `lib/ai/privacy-mode.ts` (`mapStrings`, `mapArguments`), `lib/secret-guard/redact-span.ts` (`eachString`). Tests: `lib/nova/p14b-hermes.test.ts` "SA-6" (name/id/type arguments redacted; Gemini `functionCall.args.name` cleaned and recovery words hidden, `functionCall.name`, `id`, `role`, `thoughtSignature` kept).
- **SA-7 Fixed.** ZIGi's setup (also NOVA's brain planet form) runs `verifyOllama` when the server answers as Ollama, loaded with the test; on failure it shows `NOT_OLLAMA` and no model list or Connect. File: `components/ai/ai-setup.tsx`. Test: `lib/ai/ai-setup-ollama.test.ts` (0.0.0-mock → NOT_OLLAMA, no "Found Ollama", no Connect; a real answer is still found). NOVA's right-panel probe (`nova-right.tsx`) is unchanged: it only shows status, it connects nothing.
- **SA-8 Recorded.** No one-line fail-closed fix is clean: treating "version now unknown" as lapsed would show "Your Hermes changed … a new address or version" whenever the gateway is merely down (a failed check drops the version), and nothing is sent to a gateway that is down. Keeping the last known version across failed checks (`lib/nova/hermes.ts` `withCheck`) is the better fix, for a later pass.
