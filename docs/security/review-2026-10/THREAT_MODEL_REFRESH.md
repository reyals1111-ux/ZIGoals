# Threat model refresh: ZIGoals before the friends Alpha (2026-10-03)

> **Internal review by an AI (Claude), not a professional security audit.** Written by Session Q on 2026-10-03 against `main` at `d439dc9`.
> - The repository is **public**, so this text is public too.
> - It explains weaknesses in plain words and leaves out step-by-step attack recipes.
> - It proposes changes to [THREAT_MODEL.md](../THREAT_MODEL.md) but does not edit it. A future session makes those edits (see [FIX_PLAN.md](FIX_PLAN.md)).

## In plain words
- **The current threat model is a wallet model.** [THREAT_MODEL.md](../THREAT_MODEL.md) was written for Milestones 1–5 (wallet, contract, public web) plus a short Run #10 section on accounts. It still holds for those parts.
- **It does not describe the system the friends will use.** That system has:
  - email sign-in through Supabase and Resend;
  - an admission Worker against abuse;
  - end-to-end encrypted sync with rotation and deletion;
  - a lifecycle authority with external recovery checkpoints;
  - "remember this device";
  - a market coordinator and a food lookup;
  - six Cloudflare Workers.
- **Four things changed the picture most:**
  1. **An email inbox is now a key to an account.** It cannot read anyone's records, because they are encrypted with a recovery secret the server never sees. But it can sign in, see metadata, and delete cloud data.
  2. **One Cloudflare account most likely holds everything.** ACTIVATION Stage 1 reuses "existing approved Cloudflare … access", and DNS shows Cloudflare Email Routing. Not confirmed, because there was no dashboard access. That account would hold:
     - the public Alpha;
     - the landing;
     - the six private Workers;
     - the Supabase admin key on the lifecycle Worker;
     - email routing for `zigoals.app`.

     Whoever controls that account, or a token with account-wide Workers rights, controls the service.
  3. **AI coding sessions act on GitHub as the owner.** The GitHub connection used by Claude Code sessions signs in as `reyals1111-ux` with admin rights. So text that reaches an agent (a web page, a CI log, an issue) is now part of the attack surface.
  4. **The browser profile is still the weakest point.** Local records are plaintext at rest, and the vault key sits in page memory while unlocked. A remembered device can open the vault without the secret. Any script running in the app's origin (XSS, a hostile extension, a compromised dependency) can read everything that device holds.
- **For 4–5 trusted people on fictional or low-stakes data, most remaining risks are acceptable.** The README's [friends-Alpha lens](README.md#friends-alpha-lens-what-is-acceptable-now-and-what-is-not) separates the risks that must be fixed first.

## What this compares
- **The documents:**
  - [THREAT_MODEL.md](../THREAT_MODEL.md) and [SECURITY_CHECKLIST.md](../SECURITY_CHECKLIST.md);
  - [PRIVACY.md](../../PRIVACY.md) and the [privacy notice draft](../../legal/PRIVACY_NOTICE_DRAFT.md);
  - ADR-006 to ADR-009;
  - [ACTIVATION.md](../../run11/ACTIVATION.md), [KEY_USAGE.md](../../run11/KEY_USAGE.md), [DATA_PROTOCOL.md](../../run11/DATA_PROTOCOL.md), [OWNER_RECOVERY_ADMIN.md](../../run11/OWNER_RECOVERY_ADMIN.md) and [MARKET_KEY_CUSTODY.md](../../run11/MARKET_KEY_CUSTODY.md);
  - [MANUAL_ALPHA_WORKFLOW.md](../../deployment/MANUAL_ALPHA_WORKFLOW.md) and [LANDING.md](../../deployment/LANDING.md).
- **The code at `d439dc9`:**
  - `apps/web` (middleware, the `api/*` routes, `lib/server`, `lib/vault`, the account and sync components);
  - `workers/*`;
  - `.github/workflows/*`;
  - `landing/`.
- **Live and public facts,** read passively on 2026-10-03 (UTC): one plain GET of each public page for its response headers, and DNS records over DNS-over-HTTPS. Nothing was logged into, scanned or probed. See [DATA_FLOWS.md](DATA_FLOWS.md).

## The friends-Alpha reality
| Question | Answer (2026-10-03) |
|---|---|
| Who uses it | The owner, 2–3 friends and a colleague: 4–5 accounts, invite-only. Fictional data in Stage 8, then real Goals, Habits, Health and Wealth plans from about 2026-10-26 |
| Where it runs | An isolated app (the brief names `accounts-test.zigoals.app`, NXDOMAIN at 17:24 UTC today) plus six private Workers in the existing Cloudflare account (ACTIVATION Stage 1: "existing approved Cloudflare … access") |
| What is live already | The landing `zigoals.app` (static) and the public Alpha `alpha.zigoals.app` (local-only, no accounts), plus its `workers.dev` fallback hostname |
| Providers | Supabase (sign-in), Resend (code emails, through Supabase SMTP), Cloudflare (hosting, Durable Objects, DNS, email routing), CoinGecko (prices, through the coordinator), Open Food Facts (barcodes, through the food Worker), GitHub (source, CI, deploy) |
| Who operates it | One owner, from a Mac with an ops checkout (0600 private configs), Wrangler, Bitwarden and several provider dashboards. Claude Code sessions do most of the engineering |
| What is still changing | Session P is running in parallel: the ADR-006 sync fix, timezone reads, new features, web push (a push-only service worker and a new push Worker) and an on-device coach. See [FIX_PLAN.md](FIX_PLAN.md#to-review-when-session-p-merges) |

## Assets, most valuable first
| # | Asset | Where it lives | Who can hurt it |
|---|---|---|---|
| 1 | **Recovery secret and vault root** (decrypt every cloud record of one account epoch) | The secret: in the person's password manager, and on screen when created. The root: in page memory while unlocked; device-wrapped in IndexedDB on a remembered device | The person; malicious same-origin script while unlocked; someone holding a remembered device |
| 2 | **Plaintext local records** (Goals, Wealth, Habits, Health, settings, sync bases, pending operations, recovery copies) | Browser storage on each device, unencrypted at rest | Anyone using the profile; extensions; same-origin script; device backups |
| 3 | **Account control** (sign in, revoke sessions, delete cloud data, delete a section, delete the account) | An email inbox plus Supabase session tokens (HttpOnly cookies in the browser) | Anyone with the inbox or a stolen session cookie; phishing |
| 4 | **Cloud ciphertext and metadata** (account and vault IDs, record IDs, section, sizes, times, revisions, session labels) | PrivateVault Durable Objects; lifecycle Durable Objects; Cloudflare's 30-day point-in-time recovery | Cloudflare account holders; a compromised Worker; Cloudflare itself |
| 5 | **Provider credentials** | Supabase admin key (lifecycle Worker only); admission HMAC key (admission Worker); CoinGecko key (live Alpha app plus GitHub `alpha` environment, later the coordinator); Cloudflare deploy token (GitHub `alpha` environment); Wrangler OAuth token (the owner's Mac); Resend SMTP key (in Supabase) | Whoever reaches those stores; supply-chain code running beside them |
| 6 | **Deletion truth** (which accounts and sections were deleted, and when) | Lifecycle authority Durable Objects, plus checkpoint files and digests in Bitwarden and offline | Cloudflare account holders; a stale or forged checkpoint |
| 7 | **Release integrity** (what runs at `alpha.zigoals.app`, `zigoals.app` and the acctest app) | The `main` branch, GitHub Actions, the `alpha` environment, Wrangler on the Mac | GitHub account takeover; agents acting as the owner; npm/Actions supply chain |
| 8 | **Availability and budget** | Workers Free daily limits; Supabase per-IP limits shared through the Worker; Resend quota; CoinGecko credits; Open Food Facts' per-IP limits | Anyone who can send requests; one noisy client |
| 9 | **Trust in the brand** (email sender, landing, Help wording) | DNS (SPF, DMARC `p=none`), the landing, the in-app copy | Spoofers, phishers, and wording that promises more than the code does |

## Attackers, and what each can do today
| # | Who | What they want | What they can reach today | Main controls (where this pack checks them) |
|---|---|---|---|---|
| A1 | **Internet bots and opportunists** | Free resources, open admin paths, misconfigurations | Public pages and every route of the public app; `workers.dev` names | No public route on the private Workers; admission limits; budgets (FINDINGS: Workers, cost abuse) |
| A2 | **A targeted attacker against one friend** | That friend's records or a way to embarrass them | Phishing (fake code emails, look-alike sites), their inbox, social engineering for the recovery secret | Email codes alone cannot decrypt; per-email limits; DMARC (FINDINGS: sign-in, DATA_FLOWS: email) |
| A3 | **Someone holding a device** (shared computer, stolen unlocked phone, family member) | Read or change records | Everything in that browser profile; a remembered vault | Lock, Forget this device, idle lock on unremembered devices (FINDINGS: XSS and devices) |
| A4 | **Malicious same-origin code** (XSS, hostile extension, compromised bundle dependency) | Everything on that device, then the cloud | Plaintext stores, the open vault key, the recovery secret when typed | CSP with nonces and `strict-dynamic`, no HTML sinks (FINDINGS: web) |
| A5 | **A curious or compromised provider, or a malicious sync server** | Metadata; tampering, rollback or withholding | Ciphertext and metadata; responses to the client | Per-record AEAD binding, an authenticated catalog and revisions (FINDINGS: sync; H2's malicious-server table) |
| A6 | **Supply-chain attacker** (npm, Actions, Wrangler, OpenNext) | Code execution where secrets are | CI jobs; the credentialed deploy job; the owner's Mac | SHA-pinned actions, frozen lockfile, install scripts denied, split build and deploy jobs (FINDINGS: supply chain) |
| A7 | **Prompt-injection attacker** against AI coding sessions | Make an agent push, merge or dispatch something | Public issues and PRs, web pages agents read, CI logs, package docs | CLAUDE.md rules; the `alpha` environment's human approval (FINDINGS: AI agents) |
| A8 | **Takeover of the owner's provider accounts** | Everything | Cloudflare, GitHub, Supabase, Resend, CoinGecko, Bitwarden, Apple ID | 2FA, scoped tokens, logouts ([OWNER_CHECKLIST.md](OWNER_CHECKLIST.md)) |
| A9 | **A friend in the Alpha** (trusted, maybe careless or curious) | See or affect another account | The private-account route with their own valid session | Tenant chosen from the verified token, never from client input (FINDINGS: Workers) |
| A10 | **Denial of service or of wallet** | Make it stop working, or cost money | Code sends, verifications, market and food lookups | Admission, `FOOD_BUDGET`, `MARKET_POLICY`, Workers Free hard limits (FINDINGS: cost abuse) |

## Trust boundaries and data flows
```
Browser (plaintext stores; vault key in memory; optional remembered device key)
  │ same origin, HttpOnly __Host- cookies, Origin check on POST
  ▼
App Worker (OpenNext) ── service binding ─▶ admission Worker (HMAC counters)
  │ bearer token from cookie                 
  ├──────────────▶ Supabase Auth (email code, sessions; Resend delivers the email)
  ├─ service binding ─▶ private-sync Worker ─▶ PrivateVault DO (ciphertext, sessions)
  │                         └─ service binding ─▶ lifecycle Worker ─▶ LifecycleAuthority DO
  │                                                    └──▶ Supabase admin API (identity deletion)
  ├─ service binding ─▶ market coordinator ─▶ CoinGecko
  └─ service binding ─▶ food lookup Worker ─▶ Open Food Facts
Owner's Mac ─ wrangler dev + remote binding (one command at a time) ─▶ LifecycleRecoveryAdmin entrypoint
GitHub main ─▶ Actions (build job, then the approved deploy job with the Cloudflare token) ─▶ zigoals-alpha
Owner's Mac ─ wrangler ─▶ zigoals (landing) and the six private Workers (Stage 7)
```
Every arrow that leaves the browser carries only:
- ciphertext;
- public identifiers (an asset, a barcode);
- sign-in data: an email address, a code, tokens.

**Except for the email address, the content of a person's records never crosses a boundary in plaintext.** The metadata does: who, which section, how big, when. [DATA_FLOWS.md](DATA_FLOWS.md) lists it per provider.

## What the current model still gets right
- **The wallet and contract rows (Milestones 1–5)** stay valid. Mainnet is disabled, no Goal Manager contract is deployed, and the public Alpha is local-only.
- **The publication controls:**
  - nonce CSP without `unsafe-inline` or `unsafe-eval` for scripts;
  - frame denial;
  - `no-referrer`;
  - limited permissions;
  - HSTS on the app.

  The live headers matched on 2026-10-03 ([DATA_FLOWS.md](DATA_FLOWS.md#live-response-headers-2026-10-03)).
- **The Run #10 account rows still hold:**
  - cross-account late results;
  - ciphertext tampering and replay;
  - lost acknowledgement;
  - the revoked bearer token;
  - browser-profile compromise;
  - the remembered device;
  - withdrawal of Health permission;
  - camera and food data.

  This pack checks them again in [FINDINGS.md](FINDINGS.md).

## What is new since the model was written
| New since the model | Arrived with | In THREAT_MODEL.md? | Reviewed in this pack |
|---|---|---|---|
| Email code sign-in (Supabase, Resend SMTP), cookies and refresh | Run #10–11 | Only a link to Supabase's sign-out page | FINDINGS, sign-in and sessions |
| Admission Worker (per-email and per-IP limits, HMAC keys) | Run #11 | No | FINDINGS, sign-in and cost abuse |
| Invite-only behaviour for the friends Alpha | Sessions L–P | No | FINDINGS, sign-in; FIX_PLAN (Session P checks) |
| Session registry, revocation and its gap to Supabase sessions | Run #10–11 | Partly ("Revoked bearer token") | FINDINGS, sessions |
| Key rotation, epochs, old-key and stale-device denial | Run #11 | No: the row still says rotation is not implemented | FINDINGS, sync |
| Envelope v2 (per-record HKDF keys) | Run #11 | No | FINDINGS, sync |
| Section and account deletion, lifecycle authority, provider identity deletion | Run #11 | No: the row says erasure is not implemented | FINDINGS, Workers and sync |
| Cloudflare 30-day point-in-time recovery of "deleted" Durable Object data | Platform | No | DATA_FLOWS, FINDINGS (privacy) |
| Owner recovery admin (remote binding, external checkpoints) | ADR-007, Session H | No | FINDINGS, Workers; INCIDENT_RUNBOOK |
| Remember this device | ADR-008, Session M | Yes (one row) | FINDINGS, XSS and devices |
| Market coordinator with a CoinGecko budget; food lookup with an Open Food Facts budget | Run #10–11 | Partly (camera/food row; M4 "free-plan exhaustion") | FINDINGS, Workers and cost abuse |
| Read-only earn and staking readers | ADR-009, Session N | No (read-only chain reads) | DATA_FLOWS |
| Landing V5 and Cloudflare network error reporting (NEL) headers | Session N; platform | No | DATA_FLOWS |
| Six-Worker topology, service bindings, SQLite Durable Objects, no public routes | Run #11 | No | FINDINGS, Workers; OWNER_CHECKLIST (private configs) |
| Cost abuse ("denial of wallet") on paid or quota-limited providers | Run #11 | Partly | FINDINGS, cost abuse |
| AI agents acting as the owner on GitHub | Sessions A–Q | No | FINDINGS, AI agents |
| Public repository: public CI logs and artifacts | Always | No | FINDINGS, supply chain |
| Owner provider accounts (2FA, tokens, Wrangler OAuth) | Always | Only ADR-007 T3 | OWNER_CHECKLIST |
| Incident response | — | No | INCIDENT_RUNBOOK |
| Session P: web push, on-device coach, ADR-006 fix, invite-only message | In progress | No | FIX_PLAN, Session P checks |

## Rows that are out of date
| Where | Today's text | Proposed correction |
|---|---|---|
| THREAT_MODEL.md, Run #10 table, "Revoked bearer token" | "Key rotation and erasure of downloaded data are not implemented." | Key rotation is implemented: a new random root and recovery secret per epoch, and old-epoch writes are refused (DATA_PROTOCOL, KEY_USAGE). Erasure of data already downloaded to a device is still impossible. ZIGoals' revocation does not end the Supabase session itself (see FINDINGS) |
| THREAT_MODEL.md, Milestone 1 "Malicious metadata / XSS" | "localStorage is not encrypted" | Add: account records, sync bases, pending operations and recovery copies in IndexedDB are plaintext too. The unlocked vault key is in page memory, and a remembered device holds a usable, non-exportable device key. XSS therefore means total compromise of that device's data |
| THREAT_MODEL.md, closing line | Links only Supabase's sign-out page | Point to this refresh and to the sources in [DATA_FLOWS.md](DATA_FLOWS.md) |
| PRIVACY.md, Run #10 addendum, `docs/PRIVACY.md:9` | "Cryptographic key rotation and account deletion remain incomplete." | Both are implemented and are part of Stage 8 acceptance; keep the sentence about data already downloaded |

## Proposed new rows for THREAT_MODEL.md
The finding IDs are in [FINDINGS.md](FINDINGS.md); FIX_PLAN Part E has the editing task.

| Threat | Control today | Remaining exposure |
|---|---|---|
| **Inbox takeover or a stolen session cookie** | A code is single-use and short-lived; sessions are revocable; the server never sees the recovery secret, so no decryption | The holder can sign in, see metadata, revoke other sessions and delete cloud data, a section or the account. A ZIGoals revocation does not end the Supabase session |
| **Code guessing and sign-in flooding** | Admission: per-email, per-IP-group and distinct-email caps; a daily failed-code cap. Supabase's own limits | All users share the Worker's Supabase IP budget; IPv6 /64 grouping; no global cap on code sends |
| **Account enumeration and the invite-only boundary** | Generic "check your inbox" text on success | Invite-only rests on a Supabase setting, not on code. Error mapping can reveal whether an address is invited |
| **A malicious or rolled-back sync server** | AES-GCM with AAD binding the vault, section, object, revision and epoch; an authenticated catalog; a monotonic watermark | Withholding and availability attacks cannot be prevented. Metadata outside the AAD is listed in FINDINGS |
| **Same-origin script (XSS, extension, dependency)** | Nonce CSP with `strict-dynamic`; no HTML sinks; non-extractable keys | Script can use keys and read plaintext. Trusted Types are not yet used |
| **A shared computer or stolen unlocked phone** | Idle lock (unremembered only); Lock forgets; Forget this device | A remembered device opens the vault without the secret until it is forgotten or invalidated |
| **Deletion that is not final** | Lifecycle fences; physical removal; provider identity deletion | Cloudflare keeps 30 days of point-in-time recovery; provider backups; copies on devices and exports |
| **Recovery-admin exposure** | Entrypoint unbound; public `fetch` 404; the checker; local-only config | The remote proxy's reachability is UNVERIFIED until the Stage 7 rehearsal |
| **Provider credential compromise** | Secrets per Worker; GitHub environment approval | The documented Alpha deploy token has account-wide Workers Scripts edit rights, so it can change every Worker in the account, including those holding the Supabase admin key |
| **AI agent manipulated by injected text** | Written rules (CLAUDE.md); the human approval on `alpha` | The agent's GitHub identity is the owner's, with admin rights, merge and workflow-dispatch tools |
| **Denial of wallet** | `FOOD_BUDGET`, `MARKET_POLICY`, admission | Free-plan limits fail closed (outage, not cost) until a paid plan; Resend and Supabase quotas are shared by everyone |
| **Phishing of the friends** | HTTPS everywhere (the `.app` TLD is HSTS-preloaded) | DMARC is `p=none`, so look-alike or spoofed "ZIGoals" emails are not rejected |

## Limits of this refresh
- **UNVERIFIED (no dashboard access, by design):**
  - the live provider settings: Supabase sign-ups, code length and expiry, rate limits; Resend tracking; Cloudflare members and tokens; GitHub rulesets and environments;
  - the private `*.acctest.owner.jsonc` files.

  [OWNER_CHECKLIST.md](OWNER_CHECKLIST.md) turns each of these into a check for the owner.
- **Physical devices, Safari's behaviour and real providers were not tested.** Reproductions were local only.
- **The contract code and the wallet flows are unchanged since Milestone 5 and were not re-reviewed.**

## Sources (accessed 2026-10-03)
- Google Registry, the `.app` domain: "The .app top-level domain is included on the HSTS preload list, making HTTPS required on all connections to .app websites". <https://www.registry.google/domains/app/>
- Cloudflare, Durable Objects storage API, point-in-time recovery "to any point in time in the past 30 days". <https://developers.cloudflare.com/durable-objects/api/storage-api/>
- Supabase, Auth rate limits (per-IP limits, and server-side callers needing `Sb-Forwarded-For` with a secret key). <https://supabase.com/docs/guides/auth/rate-limits>
- Supabase, user sessions (access token lifetime, refresh tokens, sign-out). <https://supabase.com/docs/guides/auth/sessions>
- The other platform sources are listed in [DATA_FLOWS.md](DATA_FLOWS.md#sources-accessed-2026-10-03) and [OWNER_CHECKLIST.md](OWNER_CHECKLIST.md#sources-accessed-2026-10-03).
