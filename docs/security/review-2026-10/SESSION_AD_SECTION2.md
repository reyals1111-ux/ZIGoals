# Session AD item 12: every row of ROADMAP_SWEEP_X §2, as of 2026-10-16

Owner item 12 (ADR-026): Q-SYNC-05 first, then every item of [ROADMAP_SWEEP_X.md §2](../../ROADMAP_SWEEP_X.md)
(Session Q's [FIX_PLAN.md](FIX_PLAN.md)). That table was written on 2026-10-08, before Sessions Y and Z-Cloud closed most
of its open rows; this is each row's state now, checked against the code on `main` `61204c3f` plus this branch.
"Built here" means a commit of Session AD item 12.

## Built here
| Item | What | Commit | Tests |
|---|---|---|---|
| A7 / Q-SYNC-05 (the rest) | A remembered device checks for revocation while its page is visible (start, shown or focused, every 15 min; never hidden or in the background), with only the existing status GET; a definitive `SESSION_REVOKED` or `ACCOUNT_DELETED` removes the record at once, anything else keeps it. Coalesced with the locked tab's reopen. PRIVACY.md corrected | `TIER 3 (auth/sync)` b283eb9c | `lib/vault/revocation-check.test.ts` (16), `lib/vault-remember.test.ts` (+3) |
| B7 (owner amendment 3) | Strict on write (`written()`), never refusing a decodable value on read: a non-canonical spelling is read as the canonical one (same bytes) and noted once. Every value builds #32–#42 wrote, produced by each release's own encoder, reads with this reader | `TIER 3 (data formats)` c28d26f7 | `lib/vault/encoder-history.test.ts` (35; fixture by `scripts/frozen-writers.mjs`), `crypto.test.ts`, `extras-hardening.test.ts` |

## Already done before this session (verified, recorded only)
| Item | Done in | Evidence |
|---|---|---|
| A1–A4 | Sessions U, X | STATUS (U 5.1), ADR-016 X37; unchanged |
| A5 global send ceiling, IPv6 /48 | Session Z-Cloud Part 5, `fcfff5eb` (Workers) | `workers/auth-abuse/worker.mjs:17,31,60`: 60 code emails a UTC day, /48 for code requests |
| A6 step-up, remembering expiry | Session Z-Cloud Part 5, `85a0db10` | the recovery secret asked again for the five actions; `REMEMBER_DAYS=30` (`components/vault-sync-controls.tsx`); `STEP_UP_REQUIRED` is the owner's switch |
| A7 status route names the denials | Session Y Part 5, `242672a2` (ADR-018 Y20); Z-Cloud Part 5 | `lib/server/private-account.ts` status branch; `lib/vault/device-unlock.ts` `accountStatus` |
| B1, B2 | Session U | STATUS:593–594 |
| B3 older epoch refused, one way out | Session Y Part 5, `00deb6b4` (Y22); extras in AB-Cloud `5d91c083` | `OlderVaultError`; `scripts/run11/older-vault-recovery.test.mjs` |
| B4 / Q-SYNC-04 a Health restore asks | Session Y Part 5, `ea059062` and follow-up `4b15ff12` (Y19) | `confirmDomain()` keeps Health off and sets `HEALTH_RESTORE_ASK`; `lib/vault-sync-rules-y.test.ts` "B4: …" |
| B5 no outbox nothing reads; pruning | Session Y Part 5, `a8b84a2e` (Y23) | `lib/vault/outbox-independence.test.ts` |
| B6 `manifest: null` with a previous vault | Session Y Part 5, `ff14a16f` (Y21; Y36) | `hadVault()` and `VAULT_MISSING` in `components/vault-sync-controls.tsx` |
| B7 canonical base64 (first form) | Session Y Part 5, `76e462fc` (Y24, strict on read), revised here by owner amendment 3 | above |
| C1, C3, C5, C7 | Sessions R1, T and later | STATUS:1494, :964, :972, :965 |
| C4 `/api/positions` cache, limit, mainnet reads, and check 9 | Session Z-Cloud Part 5, `4f8abebb` (ADR-019 C38): owner option (a), testnet only on public builds; 60 s cache, 10 reads a minute per client, 120 per server | `lib/server/positions-relay.test.ts`, `lib/positions-route.test.ts` |
| D1–D4, D6; E1, E3–E5; F1–F4; G; H1, H2 | earlier sessions | ROADMAP_SWEEP_X §2 as of 2026-10-08 |
| E2 PRIVACY.md (lingering local entries) | Session Y Part 5 (with B5) | PRIVACY.md, the paragraph beginning "Alongside the account records" |
| Checks 1, 2 | Sessions U, P | ROADMAP_SWEEP_X §2 |

## Not built here, with reasons
| Item | Why not | Whose |
|---|---|---|
| A7 / Q-SYNC-05, the remainder | A device that stays closed, hidden or offline cannot learn of a revocation until it next checks; only a server push could reach it, which means a Worker and a new channel. PRIVACY.md says so, and keeps "revoke, then rotate the vault key after losing a remembered device" | inherent; the owner's rotation advice stands |
| C2 per-session quotas | needs sessions on the public Alpha, which has no account path; server side (market coordinator), not the web client | after accounts open |
| C6 generic "unavailable" for anonymous callers | "once sessions exist" (FIX_PLAN); a server route change | after accounts open |
| D5 | done in code; the owner's approval of the wording has no record (`lib/fix-plan-d5-copy.test.ts`) | owner: confirm |
| E2 wording | the sentence exists; whether it is the owner's wording for the notice is open | owner: confirm |
| F5 | decided: one Cloudflare account (STATUS:732, :802) | — |
| H3 | the Supabase dashboard's per-user sign-out is UNVERIFIED (`OWNER_SIGN_OUT_EVERYWHERE.md:10`) | owner, at Stage 8 |
| Check 5 push registration in Firefox/WebKit | needs a real device; the server side was rehearsed in Miniflare (Session X Part 8) | owner, Stage 8 |
| A6's switch | `STEP_UP_REQUIRED` stays the owner's switch on the sync Worker | owner |
