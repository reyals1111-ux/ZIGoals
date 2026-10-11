# Pre-Alpha security and privacy review (October 2026)

> **Internal review by an AI (Claude), not a professional security audit.** Session Q wrote it on 2026-10-03 against `main` at `d439dc9`, for the friends Alpha that starts around 2026-10-26.
> - The repository is public, so these documents are public.
> - They explain each weakness with evidence and a fix, and leave out step-by-step attack recipes.
> - No exploit code, no secret and no personal data is in them.

## The documents
| Document | What it holds |
|---|---|
| [THREAT_MODEL_REFRESH.md](THREAT_MODEL_REFRESH.md) | Who might attack, what they want, what is exposed; what is new since THREAT_MODEL.md was written; proposed corrections |
| [DATA_FLOWS.md](DATA_FLOWS.md) | Live headers and DNS; exactly what Cloudflare, Supabase, Resend, CoinGecko, Open Food Facts, GitHub and the operator can see; public wording against the code |
| [FINDINGS.md](FINDINGS.md) | **54 findings**, each with severity, confidence, evidence, a safe reproduction, the fix, effort, an Alpha deadline and who fixes it |
| [OWNER_CHECKLIST.md](OWNER_CHECKLIST.md) | Your steps (why, how, how to verify): now during Stage 7, before Stage 8, before inviting friends, during the Alpha |
| [INCIDENT_RUNBOOK.md](INCIDENT_RUNBOOK.md) | Draft: leaked key, account takeover, deletion request, provider outage, bad deploy, suspected exposure, AI session gone wrong |
| [FIX_PLAN.md](FIX_PLAN.md) | The fixes in order, with Tier labels and acceptance tests, plus **"To review when Session P merges"** |

## The summary on one page
**Nothing Critical was found, and no secret is in the repository or its history.** The encryption design holds up:
- keys are random 256-bit values;
- records are encrypted on the device with AES-GCM, and each record gets its own key;
- the server cannot read, forge or quietly roll back records on a device that has synced before;
- the recovery secret is never sent.

The web app's content security policy is strict and was confirmed live. No path for injecting script into the page was found.

**One High, which only applies if the market feature is switched on for the friends' app** (the acctest template switches it on):
- one person, without signing in, could use up the Cloudflare account's free daily Durable Object allowance in a few hundred requests;
- that would stop sync and sign-in for everyone until midnight UTC, every day. On a paid plan, the same traffic becomes a bill;
- **the fix today is a switch:** keep market dispatch off for the friends deployment, or put a rate limit in front of it.

**The other urgent item is invite-only.** The app asks Supabase to create an account for any address. Invite-only therefore exists only if you switch sign-ups off in Supabase before the acctest app goes live.

**The nine Mediums share one theme: the account identity and the devices are softer than the encryption.**
- **The inbox:** a person who briefly controls a friend's inbox can sign in, delete the cloud copy, and (in Supabase) make the takeover stick. They still cannot read the records.
- **Revocation:** "revoke" in ZIGoals blocks the vault, but does not end the Supabase session.
- **A remembered device:** the installed app remembers by default, with no idle lock. A malicious script there can export the vault root, despite what ADR-008 says. Reproduced in Chromium.
- **Sign-in availability:** all sign-ins share one Supabase rate-limit budget.
- **Market budgets:** they can be drained by one person.
- **The deploy token:** the documented token can change every Worker in the account.
- **AI coding sessions:** they act on GitHub with your identity.

**What the server and providers see** is honest in Help and the notice draft, but the landing omits that the server sees *which section* (for example Health) each record belongs to. A few public lines are stale, and "deleted" data stays restorable at Cloudflare for 30 days.

## Severity scale
| Severity | Meaning here | Blocks the Alpha? |
|---|---|---|
| **Critical** | A secret or key exposed, or user data or account control reachable by an outsider now | Always |
| **High** | A security boundary bypassed (invite-only, tenant isolation, revocation, deletion, cost and abuse limits), or a privacy promise materially false | Unless mitigated |
| **Medium** | Needs a precondition (a stolen device, a compromised inbox, a provider insider, a supply-chain compromise), or a defence-in-depth gap with real impact | Case by case |
| **Low** | Hardening, a minor leak, imprecise wording | No |
| **Info** | An observation or a documentation note | No |

**Counts:** Critical **0** · High **1** · Medium **9** · Low **23** · Info **21** (54 in total).

**Confidence:**
- **Confirmed by reproduction:** 9. That is four sign-in findings (from local runs with fake upstreams), the remembered-root export in Node and Chromium, the dependency audit, the CI actor observation, and live header and DNS reads.
- **Confirmed by code reading:** 33.
- **Likely:** 9.
- **Hypothesis:** 3.

## Alpha blockers
| When | What | Who |
|---|---|---|
| **Before Stage 7 completes** | Supabase sign-ups **off**; you create the friends' users ([Q-AUTH-01](FINDINGS.md#q-auth-01--invite-only-is-not-enforced-in-code)) | you, minutes |
| **Before Stage 7 completes**, if the market binding is on | Market dispatch off, or a rate limit plus a plan decision first ([Q-WRK-01](FINDINGS.md#q-wrk-01--one-anonymous-client-can-use-up-the-accounts-free-daily-durable-object-allowance-through-the-market-feature-an-outage-on-workers-free-a-bill-on-workers-paid)) | you, minutes |
| **Before Stage 8**, if markets ship with the Alpha | The market fan-out fix in code (FIX_PLAN Part C1) | a session |

Nothing else blocks. The next section lists what should still be done before friends are invited.

## The top 10 actions
| # | Action | Who | When | Findings |
|---|---|---|---|---|
| 1 | Turn Supabase sign-ups off and add the friends yourself | **Owner** | Before Stage 7 completes | Q-AUTH-01 |
| 2 | Keep market dispatch off for the friends deployment, or rate-limit `/api/market-*` and settle the Workers plan | **Owner** | Before Stage 7 completes | Q-WRK-01 |
| 3 | In Supabase:<ul><li>raise the per-IP limits;</li><li>confirm the 8-digit, 900-second codes;</li><li>keep "Secure email change" on;</li><li>turn "Secure password change" on</li></ul> | **Owner** | During Stage 7 | Q-AUTH-05, Q-AUTH-03 |
| 4 | After deploying:<ul><li>verify the seven private configs by key names (OWNER_CHECKLIST A6);</li><li>check each Worker's routes and secret names (A7);</li><li>log out of Wrangler</li></ul> | **Owner** | During Stage 7 | Q-OPS-04, Q-OPS-02 |
| 5 | Security keys for 2FA on Cloudflare, GitHub and Bitwarden; MFA on Supabase and Resend; a separate browser profile without extensions for ZIGoals | **Owner** | Before Stage 8 | THREAT_MODEL_REFRESH A8 |
| 6 | In GitHub:<ul><li>a ruleset on `main` (pull request and checks required, no force push or deletion);</li><li>the Claude GitHub App limited to this repository;</li><li>push protection on</li></ul> | **Owner** | Before friends are invited | Q-AI-01 |
| 7 | The market fan-out fix: cap pairs, one Durable Object command per request, no writes for reads | **Session** | Before Stage 8, if markets ship | Q-WRK-01 |
| 8 | Sign-in fixes (one `TIER 3 (auth/sync)` PR):<ul><li>`create_user:false`;</li><li>one uniform answer for invited and uninvited addresses (coordinate with Session P's `72df238`);</li><li>"revoke others" also ends Supabase sessions;</li><li>plain HTTP only on loopback</li></ul> | **Session** | Before friends are invited | Q-AUTH-01/02/06/09 |
| 9 | Remembered devices:<ul><li>store the root as a non-extractable key;</li><li>Lock locks every tab;</li><li>correct ADR-008 and PRIVACY.md;</li><li>Help: "lost a device? revoke it, then rotate"</li></ul> | **Session** | Docs before Stage 8; code before wider launch | Q-SYNC-01/02, Q-AUTH-04 |
| 10 | Copy and documents:<ul><li>the landing names the section metadata;</li><li>the deletion text (30 days and the deletion record);</li><li>the stale PRIVACY.md and sessions-panel lines;</li><li>THREAT_MODEL.md updated from the refresh;</li><li>DMARC to quarantine (owner)</li></ul> | **Session** (+ owner) | Before friends are invited | Q-PRIV-01/02, Q-OPS-01 |

## Friends-Alpha lens: what is acceptable now and what is not
**Acceptable for 4–5 trusted people on fictional or low-stakes data**, with the owner steps done and the friend guidance (OWNER_CHECKLIST C5):
- **Metadata visible to the operator and the providers:** sections, sizes, times, device labels. Disclosed, and corrected on the landing (Q-PRIV-02, Q-SYNC-07, Q-PRIV-05).
- **Remembering on one's own device,** with its trade-offs, including the exportable root (Q-SYNC-01, Q-SYNC-05). Friends are told to remember only on their own devices.
- **Destructive actions without a step-up** (Q-AUTH-04), since local copies remain on devices.
- **Revocation ending only the vault session** (Q-AUTH-02), and inbox persistence (Q-AUTH-03), with the Supabase switches on and the owner's sign-out procedure ready.
- **Small denial-of-service risks:**
  - a targeted lockout (Q-AUTH-08);
  - the shared Supabase budget (Q-AUTH-05, once the limits are raised);
  - IPv6 grouping (Q-AUTH-07, once sign-ups are off);
  - food, positions and market budgets failing closed (Q-WRK-02/03/04);
  - one daily fate on Workers Free (Q-WRK-07).
- **Enumeration of invited addresses** among friends who know each other (Q-AUTH-06).
- **Inherent malicious-server limits, side channels, backup labels and the recovery-secret format** (the Info items).
- **Supply-chain hygiene items** (Q-SC-02/03/04/05/06) and the agent rules (Q-AI-02).

**Not acceptable even for the friends Alpha:** an open sign-up (Q-AUTH-01) and an unthrottled market binding (Q-WRK-01).

**Blockers before any wider launch** (more users, real stakes, a published privacy notice):

| Area | Findings |
|---|---|
| Account identity | Step-up for destructive actions; revocation at Supabase; inbox persistence (Q-AUTH-02/03/04) |
| Devices | The remembered root and its invalidation (Q-SYNC-01/05); Lock in every tab (Q-SYNC-02) |
| Abuse and cost | Per-user Supabase limits and a global send ceiling (Q-AUTH-05/07); rate limits and sessions for every public-data endpoint (Q-WRK-02/03/04/06); a paid plan with usage alerts, or separate accounts (Q-WRK-07, Q-SC-01) |
| Privacy | Retention sweeps and stated periods; deletion wording; an owner erase tool for requests (Q-PRIV-01/02/03, Q-OPS-06) |
| Platform | COOP and a Trusted Types trial (Q-WEB-01/04); DMARC reject (Q-OPS-01); an agent identity separate from the owner's (Q-AI-01) |

## Scope, method and limits
**Reviewed** (`main` at `d439dc9`):
- **The app:** `apps/web` middleware, API routes, `lib/server`, `lib/vault`, the account, sync, deletion and Help components, the manifest and headers.
- **Workers:** every Worker in `workers/` and its templates.
- **Tooling and deploys:** `scripts/run11` (activation checker, private-config generator, recovery-admin tool); the four workflows and the deploy scripts; `landing/`.
- **Documents:** THREAT_MODEL, SECURITY_CHECKLIST, PRIVACY, the notice draft, LEGAL_CHECKLIST, ADR-001–009, `docs/run10` and `docs/run11` design and activation documents, the deployment documents.

**How:**
- The plan was approved by the owner with 12 additions.
- **Three helper agents** read the code in parallel and wrote notes only; none edited the repository:
  - H1, sign-in and account Workers;
  - H2, vault and privacy;
  - H3, web and public endpoints.
- **The lead re-read every cited line** before a finding was accepted, and changed severities where the evidence did not support them (noted under each finding).
- **Local reproductions** were kept in the session scratchpad, not committed:
  - five calls of the sign-in route with fake upstreams;
  - the remembered-root export in Node 22.22.0 and Chromium 141.
- **Supply chain:** `pnpm audit`; a credential-pattern scan of all 41 refs' history.
- **Passive live reads:** one plain GET per public page, and DNS over HTTPS. Nothing was logged into, scanned, fuzzed or probed. `accounts-test.zigoals.app` did not resolve yet.
- **Official sources** are cited with access dates; anything unconfirmed is marked UNVERIFIED.

**Not reviewed:**
- The Rust contract and wallet flows (unchanged since Milestone 5), and the goal engine's maths.
- Dependency source code beyond the audit.
- Provider dashboards and settings, and the git-ignored private configs. Both are turned into owner checks.
- Physical phones, Safari and real provider behaviour (Stage 8 covers them), and load testing of live systems.
- Session P's unmerged code beyond a read-only look. Its ADR-010 and ADR-011 were not on any branch yet; see the FIX_PLAN checks.
- Formal cryptanalysis.

**Limits:**
- This is an AI's engineering review. It can miss things, and it does not replace an independent audit before a public launch.
- Local checks ran on the sandbox's Node 22.22.0; CI runs the pinned 24.19.0.

## Sources
Each document ends with the official pages it relies on, with access dates (2026-10-03): Cloudflare, Supabase, GitHub, Resend, CoinGecko, Open Food Facts, Bitwarden, Apple, Google Registry, OWASP, MDN, the EDPB and the Belgian data protection authority.
