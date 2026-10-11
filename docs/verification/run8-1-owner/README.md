# Run #8.1 — final owner-acceptance Goals UX and Value Goal polish

Starting SHA: `1d815bbf520e0d93bed0a781d6228789186038bb`. Functional checkpoint: `100d543984bf5751a4c7abc949b0710008820903`, pushed to Draft PR #15 before screenshots. Final evidence commit follows; no Run #9.

`lib/goal-summary.ts` is the canonical adapter for both stores; `GoalSummaryCard` / `GoalProgressRing` provide one circular card family. Today previously sliced three legacy records and separately selected one private Goal; it now renders every active summary, preserving completed/closed distinctions and private-store recovery errors. Both detail pages reuse the summary/ring. Private detail opens on artwork, current/target/remaining, funding status and next action; accessible collapsed modules preserve allocations, plans, Habits, milestones, scenarios, history and editing. Hash links open their module.

Positions lead with exact wealth metrics and account scope; artwork-backed Track Wallet and APR utilities occupy the desktop right rail and stack on mobile. Existing read-only forms, safety text, account/network APR persistence and allocation ownership remain. The four-step creator design remains, with corrected Value Goal explanation and quote-aware review.

Value accounting uses canonical asset identity and generic fixed-decimal quote evidence. Native mainnet `zigchain-1 / uzig / 6` maps to CoinGecko `zignaly`, verified against live CoinGecko identity/API and the Cosmos chain registry ([evidence](market-provider-evidence.json)). Only USD automatic valuation is enabled. Explicit Position valuations remain distinguishable; future assets/providers are not implemented. Quantity Goals never depend on quotes. Plans and Habit completions never add current wealth.

Accounting rounds down per allocated Position to Goal currency units: `effective base units × quote integer × 10^goalDecimals / 10^(assetDecimals + priceDecimals)`, then sums. Allocation deficits first use the existing proportional integer floor. `263000 ZIG × 0.043 USD = 1130900 cents`; target 500000 USD gives 2.2618%, displayed floored to 2.26%. Quotes never change quantities or allocations.

One shared public cache and in-flight request per pair; browser persistence is separate from private stores. Quotes are fresh for five minutes, refresh attempts have a one-minute minimum interval, and one 30-second clock updates staleness across views. Stale verified prices remain counted with review text; failures preserve the last quote; missing evidence says valuation unavailable. Explicit manual valuation stays labeled. The fixed GET relay forwards no user data, credentials or cookies, rejects query parameters/redirects, limits response bodies to 8192 bytes, validates exact numeric JSON/identity/timestamps, and times out after eight seconds. Live production smoke: [200 GET, 400 arbitrary query, 405 POST](production-relay.json).

Validation: [783 unit tests](unit.txt), [70 production browser checks](browser.txt), [five screenshot executions](capture.txt), [lint](lint.txt), [typecheck](typecheck.txt), [production build](build.txt); diff check clean. Responsive widths 1440/1024/768/390/320 have no document overflow. Existing Next middleware deprecation and package-local lockfile workspace warnings remain. Functional review fixed clock aging, recovery-error visibility and malformed numeric JSON acceptance; no remaining blocking findings.

Health source/schema/storage/UI are unchanged. Habit implementation/history rules are unchanged and preservation is tested. No merge, deployment, signer access, blockchain transaction, staking action, contract change, DNS/email change or funds movement occurred. Evidence uses fictional isolated browser fixtures. The owner's 11 source screenshots were absent from the attachment; the written descriptions and repository's earlier fictional screenshots guided this pass.

Evidence: [01 unified Goals](screenshots/01-unified-goals.png), [02 legacy card](screenshots/02-legacy-card.png), [03 Quantity card](screenshots/03-quantity-card.png), [04 Value card](screenshots/04-value-card.png), [05 detail overview](screenshots/05-goal-overview.png), [06 wealth expanded](screenshots/06-wealth-expanded.png), [07 contribution expanded](screenshots/07-contribution-expanded.png), [08 valuation evidence](screenshots/08-valuation-expanded.png), [09 wealth first](screenshots/09-wealth-first.png), [10 desktop utilities](screenshots/10-positions-right-rail.png), [11 wallet opened](screenshots/11-track-wallet-open.png), [12 APR opened](screenshots/12-apr-open.png), [13 Today all Goals](screenshots/13-today-all-goals.png), [14 Today USD value](screenshots/14-today-value.png), [15 mobile Goals](screenshots/15-goals-390.png), [16 mobile detail](screenshots/16-detail-390.png), [17 mobile Positions](screenshots/17-positions-390.png).

Changed source groups: `app/app/{page,goals/page,goals/[id]/page}.tsx`; `components/{goal-card,goal-summary.css,use-unified-goals,unified-goal-wizard}`; `components/platform/{tracked-goals,tracked-detail,goal-detail.css,platform-today,positions-view,positions-layout.css,use-market-quotes}`; `lib/{goal-summary,positions,market-quotes,market-quote-cache}`; `app/api/market-quotes/route.ts`; related tests. No contract or chain reader changes. Full paths are listed by `git diff --name-only 1d815bb HEAD`.

Local production validation preview is `http://127.0.0.1:3113/app/goals`; the owner's existing port 3100 process/data were not changed. To rebuild/restart the owner preview at its original origin, preserving that origin's local storage:

```sh
cd /Users/AIUSER/.codex/.chatgpt-projects/g-p-6a9ef321fe54819194d286235dcda765/ZIGoals/.superpowers/run8 &&
export PATH=/Users/AIUSER/.local/share/fnm/node-versions/v24.19.0/installation/bin:$PATH &&
NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build &&
{ preview_pid="$(lsof -tiTCP:3100 -sTCP:LISTEN)"; if [ -n "$preview_pid" ]; then kill "$preview_pid"; fi; } &&
sleep 1 &&
pnpm --filter @zigoals/web exec next start --hostname 127.0.0.1 --port 3100
```
