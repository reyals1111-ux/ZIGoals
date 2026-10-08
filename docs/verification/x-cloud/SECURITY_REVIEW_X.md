# Session X P2.7: internal security review

**When and how:** 2026-10-08. An independent reviewer agent read every change on `feature/session-x-cloud` against
`main` (`72ad872`), plus the Session W surfaces they touch. It had not seen this session's code or findings, edited
nothing and logged in nowhere. It traced each candidate from a real input to the failure and reproduced the one that
mattered. This session then fixed or decided each finding. Evidence labels as in docs/STATUS.md.

## Findings and what was done
| # | Severity | Finding | Done | Evidence |
|---|---|---|---|---|
| 1 | medium | The relay's `metered()` returned from `pull` after any whole event. On Anthropic's wire a ping, a block's start or stop, and the usage delta translate to nothing, and a pull that enqueues nothing is never called again. So a real stream, whose events arrive in separate reads, stalled after `message_start`. Its usage was never settled, reservations stayed, and a stalled half-open probe kept the breaker paused. The relay is not deployed. | `[TIER 3] (Workers)` `4d5fec5`: the pull returns only once bytes went out. | Reproduced by a new MOCK whose events arrive one per read (`anthropicSseByRead`): "the reply stalled" before the fix, passing after (Miniflare). |
| 2 | low | The input estimate (characters / 4) undercounts Chinese, Japanese and Korean text about fourfold. Prompts above 100,000 tokens were possible, at Anthropic's higher long-context price, which the activation guide's daily cost did not assume. | `4d5fec5`: at least one token per non-ASCII character (ASCII estimates unchanged; `reserveFor` and its test untouched). An Anthropic prompt estimated above 90,000 tokens is refused with 413 before the provider is called. The guide says so. | Unit test of the estimate; a Miniflare test where a 95,000-character Japanese prompt gets 413, reaches no provider and reserves nothing. |
| 3 | low | A `message_delta` with a usage object but no output count would have marked usage final and settled with `message_start`'s counts. | `4d5fec5`: final only with a valid output count. | Covered by the unit tests' usage cases. |
| 4 | low | `decodeURIComponent` on a fragment such as `#%` threw inside Settings' jump keeper and showed the error page; Settings could not open from such a link. The same unguarded decode was in the phone fold rows and the Ecosystem directory. | `457c541`: `lib/hash-id.ts` decodes safely, used by all three. | Unit test; browser test on both projects (`/app/settings#%`, `/app/ecosystem#%`, `/app#%`, `/app/wealth#%25%`). |
| 5 | low | The secret scan missed Anthropic's OAuth tokens, Supabase personal tokens, npm tokens, and this project's own secrets written as plain assignments. | `[TIER 3] (CI)` `34e45dc`: these shapes added, with runtime-built positives and near misses taken from the repository's own fixtures. | `secret-patterns.test.mjs` 6/6; the repository scan still passes (1 allowlisted X-LOCAL test value). |
| 6 | info | If middleware ever stopped matching `/api/private-account`, the A4 check would read OpenNext's reconstructed localhost URL. | Not built: not reachable today (the matcher always includes the route; a bypass needs the build's secret preview id). Recorded in THREAT_MODEL. | Reviewer's reading of OpenNext's edge converter and the matcher. |
| 7 | info | THREAT_MODEL "Session X changes": the relay row overclaimed exact usage, and the secret-scan row overclaimed coverage. | `c519b89`: both rows corrected; the fragment row added. | — |

## Checked and found sound (reviewer, 2026-10-08)
- **`/api/market-logo`:** the exception is an exact pathname. Every near miss (trailing slash, case, encoding, `.rsc`, `_next/data`) keeps the page policy. Every response from the route carries `default-src 'none'; sandbox`, and the image cache accepts only PNG, JPEG, GIF and WebP, checked by magic bytes.
- **The static manifest:** the real matcher, compiled with Next 16.3.8's own function, skips only the exact `/manifest.webmanifest`. Case, slash, encoding and `.rsc` variants all still run middleware.
- **A4:** on Cloudflare the origin comes from the edge's real URL, not the Host header, and middleware overwrites any client-sent `x-zigoals-origin`. WHATWG normalisation covers `127.1`, `0x7f.1` and IPv6 forms; `localhost.`, `127.0.0.2` and `[::ffff:…]` are refused.
- **The relay's request rebuilding:** only role, content, tool calls and their ids are kept. Images go as base64 only. Tools are rebuilt without a `type`, so no server tool, MCP server, `cache_control`, `metadata` or `service_tier` can be smuggled in. `max_tokens` is capped at 4,096. The key goes only in `x-api-key`, to the exact URL. The provider's error text is never passed on.
- **Push deletion:** `delete-all` is sent before the account deletion, while the session is still valid. The push Worker keys tenants by the verified account only.
- **404 and error pages:** nothing from the URL or the error is rendered. The catch-all sits only under `/app`; static routes win.
- **Trusted Types:** the default policy is unchanged, and the diff adds no HTML sinks.
- **Feedback mail:** subject and body are percent-encoded. Device lines appear only when the box is ticked, editable first and capped.
- **Lazy-loaded wallet and sync code:** the receipt-code import completes before any journal entry is created. Each sync action's import runs inside the one-at-a-time guard, and keys are read after the import.
- **CI trace artifacts:**
  - `ci.yml` references no `secrets.*`, and checkout keeps no credentials; the Alpha preview runs with an empty env file.
  - Traces are kept on failure only, for 7 days (both upload steps), and hold fixture cookies, tokens and keys only.
  - This session also scanned every Playwright trace from its own local runs (16 traces) with the repository's secret patterns: no finding, and no cookie, `set-cookie`, `authorization` or `x-api-key` header recorded (local, `/tmp/claude-0/p27/scan-traces.mjs`).

## Not in this review's lane
ZIGi's own surfaces (X-LOCAL's lane, ADR-017) were left to that lane's review.
