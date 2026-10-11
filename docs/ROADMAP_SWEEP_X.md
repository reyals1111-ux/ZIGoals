# Roadmap sweep, Session X (2026-10-08)

Every open item found in the repository, with its source, as of `feature/session-x-cloud` on 2026-10-08. Each is either
**closed in Session X** (with the commit or record) or listed with **why it stays open** and **whose action it is**.

**Sources swept:** `docs/STATUS.md` (every session's open, follow-up, owner-item, decide and intermittents lists, Sessions
G–W); `docs/ops/HOUSEKEEPING.md`; ADR-001…016; Session Q's `docs/security/review-2026-10/FIX_PLAN.md` (every item);
the activation and owner documents under `docs/run11/`, `docs/deployment/`, `docs/product/` and `docs/security/`; TODO,
FIXME, XXX and HACK markers in `apps/web`, `packages/`, `workers/` and `scripts/`; both lane handoffs. Line numbers are
those of this branch on 2026-10-08. **Labels:** local, CI, source (dated), owner-reported.

**Markers:** none in authored code. The only hit is a lowercase "todo" in Cloudflare's generated `workers/worker-runtime.d.ts`
(vendor file) and base64 data inside two SVGs (false positives).

## 1. Closed in Session X
| Item (source) | Closed by |
|---|---|
| Connection diagnostics said "Unavailable or changed" for the testnet's zigchaind v5.1 (owner evidence 2026-10-07) | Part 1, `[TIER 3] (chain config)` `5db848f` (ADR-016 X1–X3) |
| Secret-shaped test values; GitHub's pattern on a ZIGi test (X-LOCAL fixed its file, `1cea510`) | Part 2, `cbf2822`, `edae17a` (X4, X5) |
| Dependency audit re-check (STATUS W "Decide": braces) | Part 3 `b6bf954`: still unpatched upstream, recorded (X6) |
| `/api/market-logo`'s headers replaced by middleware (STATUS:211) | Part 4 `215a1bd` (X7, X8) |
| Performance options (STATUS:157, :211, :529; SESSION_W_PERFORMANCE) | Part 5 (X9–X21): the shell 497.7 → 401.0 kB |
| Known CI intermittents of Session W (STATUS:194–200): account-browser, route-mobile, push-reminders:210, market-disconnect, ui-design-pass:335 | Part 6 (X22; `docs/verification/x-cloud/part6/CI_INTERMITTENTS.md`) |
| CI's audit step red on every branch (Next.js advisories of 2026-10-07; X-LOCAL's handoff) | `[TIER 3] (dependencies)` `9715281`, next 16.3.8 (X23) |
| `sleep.spec.ts:40` intermittent (X-LOCAL's handoff) | `ecf8855` (X25) |
| Export everything's consent row (STATUS:211; ADR-015 S141) | Part 7 `f59561f` (X26) |
| Session W's remaining items (STATUS:206–211, WHOLE_LIFE_W, ADR-015) | Part 7, each listed in `docs/verification/x-cloud/part7/W_SWEEP.md` |
| Account deletion left another device's push data for 30 days | Part 8, `[TIER 3] (auth/sync)` `2ddf11a` (X29) |
| Push activation readiness (STATUS:1209) | Part 8 `1d8d83b`: Miniflare rehearsal and a one-step run sheet (X31); activation stays the owner's |
| Hosted relay readiness with Anthropic | Part 9 `e2695b5`, `f0fd827` (X32, X33); activation stays the owner's |
| Goals at 320 px scrolled sideways with Inter installed (STATUS:165) | `d331812` (X36) |
| Friends pack: feedback, known limitations, friends guide | Part 11 `f58d333` (X34, X35) |
| The live `icon.svg` check after a deploy (STATUS:750, FIX_PLAN D2) | done 2026-10-07 by a read-only `curl -I` (plan, "Part 10"): the sandbox SVG policy is served on `/icon.svg` |
| The duplicate React key `habits-settings` (STATUS:747) | already fixed (rows keyed `${target}:${label}`, `components/phone/phone-settings.tsx`); recorded here |
| Trusted Types enforcement (STATUS:748), What's new folded on phones (STATUS:749), D2 plain static 404 (STATUS:751) | already done in Sessions V and W (STATUS:271, `whats-new-card.tsx` "Earlier updates", STATUS:52); recorded here |
| `--persist-to` missing from the wrangler surface test's `dev` row (STATUS:2146) | Part 10: added (`scripts/wrangler-cli-surface.test.mjs`) |
| The sync offer's "Not now" flag counted as personal data for the welcome (STATUS:3036) | Part 10: in `NON_PERSONAL_KEYS` with a test (`lib/onboarding.ts`) |
| Unused intro media (STATUS:3475) | Part 10: `public/media/zigoals-intro.mp4`, its poster and `zigoals-logo-intro.mp4` deleted (2.9 MB; no reference anywhere) |
| FIX_PLAN C1's acceptance line predates R1's decision 1 (STATUS:1599) | Part 10: a dated review note in FIX_PLAN Part C |
| FIX_PLAN A4, plain-http cookies (Q-AUTH-09) | Part 10, `[TIER 3] (auth/sync)`: only loopback may use plain http; tested |

## 2. Session Q's FIX_PLAN, every item (`docs/security/review-2026-10/FIX_PLAN.md`)
| ID | State | Evidence or reason; owner action |
|---|---|---|
| A1 sign-in creates no user | done | STATUS:589 (U 5.1) |
| A2 identical answers | done | STATUS:590; PRIVACY.md |
| A3 revoke ends the provider session | done | STATUS:591, :721; W's "Sign out all other devices" |
| A4 plain-http cookies only on loopback | **done in Session X** | `lib/server/private-account.ts`, unit test; ADR-016 X37 |
| A5 global send ceiling; IPv6 /48 grouping | open | `workers/auth-abuse/worker.mjs` groups by /64 and has no global ceiling. The ceiling's value is policy (how many codes a day the Alpha may send in total) → **owner decides the number**; the /48 grouping then lands with it in one Worker change |
| A6 step-up for destructive actions; an expiry on remembering | open | needs a product decision (which proof, how long a device is remembered; ADR-008:146) → **owner decision** |
| A7 / Q-SYNC-05 status route passes `SESSION_REVOKED`/`ACCOUNT_DELETED`; the client drops the remembered record | **not done** | changes what the status route answers and when a remembered device forgets its record (`lib/server/private-account.ts:89–97`, `lib/vault/device-unlock.ts:205–216`, `vault-remember.test.ts:156–158` pins today's behaviour). The owner allowed Q-SYNC-04/05 only if behaviour-preserving; it is not → **owner decision** (a Tier 3 PR of its own) |
| B1 non-extractable root | done | STATUS:593; ADR-008:144 |
| B2 Lock in every tab | done | STATUS:594 |
| B3 refuse an older manifest epoch | open | `lib/vault/cloud-sync.ts` accepts the manifest's epoch in either direction. A sync-merge rule change → its own Tier 3 PR with the frozen #29–#31 readers; **owner go-ahead** (the same rule as Q-SYNC-04/05) |
| B4 / Q-SYNC-04 a Health restore shows the Health box instead of turning Health sync on | **not done** | `components/vault-sync-controls.tsx` `confirmDomain()` turns Health sync on after a restore; the fix changes consent behaviour (Health stays off until ticked), so it is not behaviour-preserving → **owner decision** |
| B5 no outbox entry nothing consumes; receipts and archives pruned past a horizon | open | `lib/vault/database.ts`; changes stored data and needs a PRIVACY.md sentence (E2 remainder) → **owner go-ahead and wording** |
| B6 `manifest: null` with a previous vault | open | `components/vault-sync-controls.tsx`; sync behaviour → **owner go-ahead** |
| B7 canonical base64 for every ciphertext string | partly | only the salt is checked canonically (`lib/vault/crypto.ts`); a reader change on stored data → **owner go-ahead** |
| C1 market fan-out | done | STATUS:1494–1495; acceptance note added in Session X |
| C2 catalog validation, 404 cache, history pool, per-session quotas | mostly done | per-session quotas need sessions on the public Alpha (STATUS:1594) → after accounts open |
| C3 food | done | STATUS:964 |
| C4 `/api/positions` cache, rate limit, mainnet reads | open | the mainnet-reads decision is the owner's (FIX_PLAN check 9); the cache and limit follow it in one change → **owner decision** |
| C5 key off the app path | done | STATUS:972, :854, :857 |
| C6 generic "unavailable" for anonymous callers | open | "once sessions exist" (FIX_PLAN) → after accounts open |
| C7 retention sweeps | done | STATUS:965–966, :592 |
| D1, D3, D4, D6 | done | STATUS:598, :600, :601, :603 |
| D2 | done | STATUS:599, :52; the live `icon.svg` check done 2026-10-07 |
| D5 | done | STATUS:602; the owner's approval of the wording has no record → **owner: confirm** (`lib/fix-plan-d5-copy.test.ts`) |
| E1, E3, E4, E5 | done | THREAT_MODEL; `docs/run10/SYNC_SECURITY_AND_RECOVERY.md`; FRIENDS_GUIDE; LEGAL_CHECKLIST §7 |
| E2 | largely done | PRIVACY.md lacks Q-SYNC-06's "lingering local entries" sentence; it belongs with B5 → **owner wording** |
| F1 | done | STATUS:604; eslint-config-next stays until braces 3.0.4 exists (X6) |
| F2, F3, F4 | done | STATUS:605–607 |
| F5 | decided | one Cloudflare account (STATUS:732, :802) |
| G | done | STATUS:969, :610 |
| H1 | done | STATUS:967, :595; ADR-007 |
| H2 | done in code | the live proof is Stage 8 row F5 |
| H3 | done as a document | the Supabase dashboard's per-user sign-out is **UNVERIFIED** → owner, at Stage 8 (`OWNER_SIGN_OUT_EVERYWHERE.md:10`) |
| "To review when Session P merges" checks 1, 2 | done | U 5.2; P PR2's tests (ADR-006) |
| Check 5 (push registration in Firefox/WebKit) | open | Session X Part 8 rehearsed the server side in Miniflare; a real Firefox/WebKit registration needs a device → **owner, Stage 8** |
| Check 9 (mainnet reads on the public Alpha) | open | with C4 → **owner decision** |

## 3. Owner actions (deploys, activations, accounts, schedules)
| Item | Source | Next step |
|---|---|---|
| Acceptance-stack redeploy (Session W, now with Session X) | STATUS:207, :845, :1067–1071, :1586; FINAL_ACCTEST_REDEPLOY | run FINAL_ACCTEST_REDEPLOY.md from the ops checkout (22–24 October per STATUS:1088–1099) |
| Stage 8 real acceptance; the uninvited-address test; Firefox/WebKit rows | ACTIVATION.md:43; STAGE8_OWNER_RUNSHEET; STATUS:1304, :1374, :1633; ADR-008:151 | the runsheet, Parts 1–8 (about 4¾ h) |
| Hardening H1–H16 (Cloudflare 2FA, members, tokens; Supabase, Resend, CoinGecko MFA; Bitwarden; FileVault; DMARC to quarantine mid-October) | STATUS:1122–1131; STAGE8_OWNER_RUNSHEET:42–112; OWNER_CHECKLIST C1–C4 (:232–262), D (:295–322) | the runsheet's H rows; Bitwarden offline export at the friends launch |
| Stage 7 rehearsal steps 8–9 and a re-run with the merged tool; its D0 receipt | STATUS:1010, :1589, :1619–1622; STAGE8_ACCEPTANCE.md:74 (empty); ADR-007:68, :140 | re-run and fill D0 |
| MARKET_POLICY two-window install around 28 October (the current window ends 2026-10-31 16:00 UTC) | STATUS:843, :1072; STAGE8_OWNER_RUNSHEET:16 | date-bound |
| `dailyRowBudget: 100000` on Workers Paid | STATUS:1072, :1587; ALPHA_PRICES_ROLLOUT:200 | owner option |
| A rate limit (Workers Rate Limiting or WAF) in front of `/api/market-*` | STATUS:1596 | dashboard configuration |
| Optional CoinGecko key regeneration (prices rollout step 5); the deploy-token scope | STATUS:1058–1064; ALPHA_PRICES_ROLLOUT:76 | owner |
| Push activation (acceptance stack only) | STATUS:1209; PUSH_ACTIVATION.md; FINAL_ACCTEST "Push activation" | optional |
| Hosted relay activation (own account first; Anthropic or OpenAI) | STATUS:393; ZIGI_RELAY_ACTIVATION.md | optional; after LEGAL §8a/§10 for anyone else |
| Health links (Oura, Withings, Polar, Strava) | STATUS:209; HEALTH_LINK_ACTIVATION.md | optional registrations |
| Spotify (development mode, five users) and the official logo file via PR; Apple Music membership | STATUS:209; MUSIC_ACTIVATION.md; ADR-015 S123 | optional |
| RECOVERY_MODE=serve | ACTIVATION.md; ADR-007:155 | an explicit owner decision only |
| Housekeeping: delete `review/session-l-screenshots` first (a fixture recovery secret in a public screenshot, Q-SC-05), then nine stale `review/*` branches, then `review/session-u-today-screens` after the visual OK; old worktrees on the Mac | HOUSEKEEPING.md:11–83; THREAT_MODEL:112 | owner (branch deletion is never an agent's) |
| Galleries to review: `review/session-u-today-screens`, `-t-`, `-v-`, `-w-` and this session's `-x-` | STATUS:392, :664, :797, :208 | visual OK, then housekeeping |
| Owner tests: YOUR_AI_OWNER_TEST (T, V), WHOLE_LIFE_W's 20 rows | STATUS:208, :391, :528 | on the owner's devices |
| Landing: `www` → apex 301 rule; HSTS `includeSubDomains`/`preload` | LANDING.md:32–75 | DNS and a redirect rule; a separate zone decision |
| Testnet: the Goal Manager upload (whitelist request draft not sent; contract prepared, not deployed) | TESTNET_WHITELIST_REQUEST.md; OWNER_TESTNET_CHECKLIST.md:3; `docs/research/ZIGCHAIN_V5_1.md` | owner; uploads still restricted (Part 1) |
| Custody setup (Bitwarden items, offline image, inventory) | STATUS:4062–4065 | owner; no record |
| GitHub secret-scanning alert on the old literal, if one exists | ADR-016 X5; X_CLOUD_TO_LOCAL H1 | dismiss as a test value (the API is unavailable to this session) |
| Finance-homes switch PR | STATUS:123, :210; ADR-015 S2 | at least seven days after the W deploy (#32, 2026-10-07), rollback target at or after W; out of this session's scope |

## 4. Owner decisions
| Decision | Source |
|---|---|
| Home GPU by `.local` name (`connect-src http://*.local:*`, Chrome 142+) | X-LOCAL handoff 2026-10-08; ADR-016 X24 |
| Q-SYNC-04 (B4), Q-SYNC-05 (A7), and the other sync rules B3, B5, B6, B7 | §2 above |
| A5's global ceiling; A6's step-up and remembering expiry; C4 mainnet reads | §2 above |
| Passkey (PRF) protection; a time limit on remembering | ADR-008:51, :145–146; STATUS:2575–2596 |
| ADR-010: accept the rule-5 reading; a service binding app → push; the Badging API; Chrome Beta's push host (`PUSH_ALLOWED_HOSTS`) | ADR-010:101, :113, :168, :235; STATUS:1201–1203 |
| Guide phase 2 ((a)–(c), six questions) and its overlap with ZIGi | ADR-011:86–116; ADR-014:217–222; STATUS:1204, :393 |
| ZIGi: the figure set, Rive/Lottie, a sync home for chats, a stored server copy | ADR-012:59, :79; ADR-014:199, :205; STATUS:484 (X-LOCAL's lane) |
| Strategy adapters, mainnet signing, ADR-009's execution path, stZIG value | ADR-003; ADR-004:7; ADR-009 |
| Scheduled export (option C) | ADR-007:11, :107–110 |
| Phone LCP (accept, or ask for a faster first paint) | STATUS:2153 |
| Valuation days in UTC; Health's "today" (QA-24) | STATUS:2418 |
| Older open owner choices: QA-23 (offline shell), QA-35–38, QA-06's trailing zero; QA2-02…07; the hero re-encode (kept in practice) | STATUS:3889–3890, :3250, :1446 |
| Portfolio's ~1 MB cap; D5's wording; Session U's Today visual OK | STATUS:736, :733, :664 (no record of the acceptance) |

## 5. Counsel
LEGAL_CHECKLIST §6 (LC-new flags, STATUS:2032), §8 and §8a (ZIGi, the hosted relay), §9 (Session W), §10 (Session X: the
relay with Anthropic, API credits); the privacy notice's review and publication (STATUS:3038–3040); the ODbL "derived
database" question (ACTIVATION.md, FOOD_READINESS.md:69); the strategy decision log (`docs/strategy/README.md:97–102`,
empty); Valdora's answers and a re-read of Noble/Circle after 2026-10-13 (STATUS:2301–2317).

## 6. Device tests (the owner's devices)
Physical iPhone Safari (STATUS:3774); the iPhone 7-day storage exemption (STATUS:2756); iPhone and Android landing checks
(STATUS:2161–2163); Oura's revoke method on the first real Disconnect (ADR-015 S78); push on a real iPhone (Stage 8 15b).

## 7. Agent-doable, not done in this session (reason)
| Item | Source | Why not now |
|---|---|---|
| `stage7-preflight.mjs` reports env files in the build's reach | STATUS:1598 | `build:alpha` already refuses while one is present (CLAUDE.md, owner builds); the preflight addition is convenience only. Next session |
| The two older Monitor rows: `run11-recovery-failures.spec.ts:22` (mobile), `run10-widgets.spec.ts:20` | STATUS:4913, :4923 | neither failed in Session X's CI runs or local Gate A; monitored, investigated when they next fail |
| desktop-freeze-check: the sidebar's planet not captured; one capture that hung | STATUS:3252–3254 | tooling; the check passes as it is (each gate lists its differences) |
| Ecosystem registry `notes` in developer wording on cards | STATUS:3472 | registry content; part of Part 14's copy review if it shows |
| `lib/private-storage.ts` validate-once (Tier 3) | STATUS:3478 | a storage-path change with no reported problem; not worth a Tier 3 commit in this session |
| QA2-08 leftovers (`written()` reuse, lazy glass bars) | STATUS:2749–2752 | low priority; no reported problem |
| The goal card ring overlapping its text by 4 px on phones | STATUS:2148 | Part 14 checks it on the phone viewport |
| UI "today" computations list (N3) | STATUS:2422–2428 | possibly covered by Session W Part 17; Part 14's timezone and midnight journeys check it |
| `actions/cache` in CI | STATUS:1447 | low priority; a CI change with no failure behind it |

## 8. At merge time, with X-LOCAL
- The `scripts/secret-allowlist.json` entry for `memory.test.ts`: removed by whichever PR merges second (a stale entry only
  warns).
- H2: the zod namespace form for ZIGi's 19 files, applied by whichever PR merges second (X_CLOUD_TO_LOCAL, Gate A
  answers); if that is X-Cloud, it is an owner item in its PR description.
- H3: weight budgets set once by whichever merges second.
- `components/ai/ai-launcher.tsx`/`.css`, `lib/whats-new.ts` (X-LOCAL's release id), STATUS, Help: resolved by the
  second merger.

## 9. Out of scope for this session (the brief)
New sync domains (including Portfolio sync) and the finance-homes switch; Guide phase 2; ADR-009 and the Valdora UI;
passkeys and Face ID; native apps; the hosted build flag (`NEXT_PUBLIC_ZIGI_HOSTED`); real ZIGi art; "cold market work
only for signed-in sessions" (Session R2, STATUS:1594), which needs accounts on the public Alpha.
