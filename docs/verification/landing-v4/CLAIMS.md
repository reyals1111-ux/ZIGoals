# Landing V4 — claims re-validation

The standalone package carried a claims audit generated on 2026-09-30 against the then-current public Alpha. Product work continued after that, so every substantive claim on the imported page was re-checked here against `main` at `75bf6497400f1c19915a0e8ec20634faf1baf65f` and against the live public Alpha on 2026-10-01. This document is the repository's own record; it does not depend on the standalone package remaining on disk.

Method: each claim below was matched to evidence in this repository (`docs/STATUS.md` on the integration base, the application source) or to the live Alpha. Editorial and brand language is marked as such and is not treated as a capability claim.

## The five sensitive boundaries

| boundary | the page says | current evidence | verdict |
| --- | --- | --- | --- |
| Audit status | "The public Alpha is unaudited." | `SECURITY.md`: "ZIGoals is an unaudited alpha." | holds |
| Financial execution | "Financial signing and broadcasting are disabled." | `docs/STATUS.md` (base `75bf649`): "no financial signing/broadcast is enabled"; "Financial preparation/signing/broadcast refuse at low-level boundaries" | holds |
| Goal Manager | "the Goal Manager contract is not deployed" | `docs/STATUS.md`: "Goal Manager / Code ID remain **NOT DEPLOYED**"; the in-app Goal wizard still renders "Goal Manager: Not deployed. Real contract funding is unavailable." | holds |
| Mainnet | "Mainnet financial execution is disabled… The app can offer mainnet read-only / watch-only position context; that is observation, not a deployed financial service." | `docs/STATUS.md`: "`PUBLIC_ALPHA_UNDEPLOYED` means web deployed, contract absent. Simulation, local metadata/backups, diagnostics and explicit wallet connection/public reads only." The Goal wizard's wealth scope offers "Mainnet + manual" and "Testnet + manual" as observation scopes. | holds |
| Hosted account sync | "Encrypted account sync and recovery are built. Hosted activation is still in progress; cloud sync is not available in the public Alpha." | `docs/STATUS.md`: the eight owner activation stages remain open, Stage 4 local configuration passed, and `wrangler secret put` is "deferred until after Stage 7 approval, because it creates the Worker remotely". Session H (PR #53) added the owner recovery admin tool as a local-only Worker plus an unconfigured template. | holds — and the wording is still correct after Session H, which prepared activation rather than performing it |

## Capability claims

| the page says | evidence | verdict |
| --- | --- | --- |
| Four Goal workflows: Value, Quantity, Reward, Project | `apps/web/components/unified-goal-wizard.tsx` implements `VALUE`, `QUANTITY`, `REWARD`, `PROJECT`; the imported `goal-creator-desktop.webp` capture shows all four | holds |
| "Rewards: recorded, unclaimed rewards" | wizard: "Only currently unclaimed rewards count." | holds |
| "Project: progress through milestones" | wizard: "Only completed milestones count toward progress." | holds |
| "Linked positions, contribution plans and adjustments… Private accounting; no automatic investing." | Goal allocations are accounting over tracked positions; no execution path exists (see financial-execution row above) | holds |
| Habits: "Set schedules and targets, record check-ins, and review your streaks and history. Link a Habit to the Goal it supports." | Habits workspace in `apps/web/components/habits/` | holds |
| "Check-ins can include partial progress. Skipped, paused and future days do not become invented successes." (in-capture) | the imported `habits-desktop.webp` shows that exact disclosure | holds |
| Health: "Food, water, movement, and measurements—in a personal journal, with targets you choose." | `apps/web/components/health/` and `apps/web/lib/health.ts`; the capture shows user-set targets | holds |
| Wealth: "Market references and manual values stay distinct. Currencies stay separate." | the capture shows "Currency totals stay separate. No FX assumed." and a separate EUR line | holds |
| "Goal allocations organize what you track. They do not transfer money." | no transfer path exists | holds |
| Markets: "Source and freshness labels show what is known, missing or awaiting an update." | the capture shows "Price unavailable", "Needs value", "Last verified", "Some market data could not refresh." | holds |
| Ecosystem: "Listings are information, not partnerships or endorsements." | the capture carries "An ecosystem listing is not a ZIGoals partnership, endorsement or security audit" and per-entry "Research only" | holds |
| "Local Goals, Habits, Health and portfolio records stay in the browser. No account is needed for Local Demo. Browser storage is not encrypted or a backup." | local-first storage in `apps/web/lib/private-storage.ts`; Local Demo needs no account | holds |
| "Export your records or prepare an encrypted backup with a separate recovery secret. Health inclusion is an explicit choice." | `apps/web/lib/vault/backup.ts`; Health inclusion is an explicit consent | holds |
| "The public Alpha is a responsive web app and can be opened in a mobile browser." | still true, and strengthened by Session E's phone experience (PR #52) | holds |
| "ZIGoals is an independent project described as the Goal Layer for ZIGChain… no official affiliation, partnership, endorsement, or security audit." | the page repeats "Independent project · Not affiliated with ZIGChain" in the ecosystem section and the footer | holds |
| "No. It is a planning and tracking tool, not an investment adviser or financial manager. Scenarios are illustrative; they do not guarantee returns." | no advice surface exists | holds |
| "No. Health is a personal journal… It does not diagnose, treat, or recommend medical care." | no medical surface exists | holds |

## Editorial language, not capability

"Shape & Fold Your Own Future", "A future takes shape.", "Your life is connected. So is your progress.", "A goal is never just a number.", "One life. One personal orbit.", "SAME YOU. A BRIGHTER TOMORROW.", and the equation slogan are brand language. The equation section states its own limit on the page: **"A philosophy for progress. Never a promise of financial return."**

The approved slogan is reproduced exactly, with its line break:

> Today's Goals, Habits & Health
> = Tomorrow's Wealth

A browser check asserts that exact string is present at runtime.

## Screenshot disclosure

All 19 captures are of the real public Alpha with fictional Showcase records. The page labels them where they appear: "ACTUAL PUBLIC ALPHA / Fictional Showcase records · no real funds" (Today), "ACTUAL ALPHA · FICTIONAL SHOWCASE" (Habits, Health), "FICTIONAL SHOWCASE / Private tracking · no funds move" (Wealth), "GOAL DETAIL · FICTIONAL SHOWCASE", "Fictional manual positions · no wallet observation" (Positions), "Quotes unavailable during capture · no invented prices" (Markets), "Public research listings · no external execution" (Ecosystem). Several captures carry the disclosure inside the image as well: "SHOWCASE DATA · fictional plan and history", "Showcase example history · fictional check-ins", "SHOWCASE DATA · fictional manual example, no wallet observation".

### Privacy re-scan

Every one of the 19 imported captures was opened and read during this import, not sampled. None contains an email address, a wallet address, an account identifier, a person's name, a real financial balance or a real health record. Figures shown are Showcase fixtures ($501,800 tracked wealth, 0.45 BTC, 1,970 kcal, 161 check-ins and so on). The only dates are fictional target dates and a capture timestamp ("Manual observation · 30/09/2026, 00:00:00"). The Markets capture shows "Price unavailable" throughout, so no price is asserted.

## Claims deliberately absent

No user counts, revenue, assets managed, uptime, returns, audit certification, automated investing, custody, medical advice, creator biography, official ZIGChain affiliation, or mainnet transaction availability appears anywhere on the page. No email capture, newsletter, Discord, Telegram, docs site, press page or partner link exists — the only external destinations are the Alpha, the two X profiles and the GitHub repository.

## What changed since the 2026-09-30 audit

Between the standalone audit and this import, `main` advanced from `c4135f1` to `75bf649`: Session E (PR #52, phone experience and first-run welcome), Session G (Alpha deploy #17), Session H (PR #53, owner recovery admin, recovery-copy cleanup, activation readiness). None of it moved a boundary the page describes: the contract is still undeployed, execution still disabled, hosted sync still inactive. No claim needed rewording.

## Recheck before release

Public status can change. If the Goal Manager is deployed, financial execution is enabled, or hosted account sync is activated, the Privacy section, the "Built openly. Still Alpha." section and FAQ answers 4, 5, 6 and 9 all need revisiting before the next apex deploy.
