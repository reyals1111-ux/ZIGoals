# Run 8.1 — final Wealth patch
Starting SHA: `dac9740c142f99cad251ee57533970eb0f9ce424`; functional checkpoint pushed before screenshots: `9444a039dd3ade3b3cecc4204c24ec13e24f91ea`.
Value Goal creation retains an editable list and commits every selected allocation together; $25k Crypto + $40k Stablecoins + $10k Metals + $5k Cash = $80k / 80%.
Asset mix uses canonical counted amounts and deterministic colors; percentage rounding reconciles to canonical progress, overfunded rings cap at 100%, Quantity rings remain unchanged.
Wealth reads existing Positions/allocations, includes unallocated wealth, separates currencies, and flags missing valuation, stale observations and allocation deficits. Property is manual only; no new quote provider or store.
Optional assetClass loads old data safely and survives edits through the existing Position editor. ZIG quote/cache, Health behavior/storage and Habit accounting are unchanged.
Explanatory text uses shared 14px / 1.5 typography; eyebrows and badges retain their scale. Existing cards, actions and Position layout remain intact.
Validation: 72 targeted unit tests, six production browser tests, lint, typecheck, production build and diff check pass. Responsive checks: 1440, 1024, 768, 390, 320; no horizontal overflow. Evidence is in `checks/`.
Screenshots (fictional fixtures only): [Value mix](screenshots/01-segmented-value-goal.png), [selected sources](screenshots/02-multiple-selected-sources.png), [Wealth desktop](screenshots/03-wealth-desktop.png), [seven categories](screenshots/04-all-seven-categories.png), [Property](screenshots/05-property-source.png), [Stablecoin](screenshots/06-stablecoin-source.png), [390px](screenshots/07-wealth-mobile.png), [readability](screenshots/08-readable-positions.png).
PR #15 remains Draft. No merge, deployment or Run 9 work. CI is reported from GitHub after the final push.
Exact owner-preview command (replaces the existing port-3100 preview and preserves that origin’s browser data):
```sh
cd /Users/AIUSER/.codex/.chatgpt-projects/g-p-6a9ef321fe54819194d286235dcda765/ZIGoals/.superpowers/run8 &&
export PATH=/Users/AIUSER/.local/share/fnm/node-versions/v24.19.0/installation/bin:$PATH &&
NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build &&
{ preview_pid="$(lsof -tiTCP:3100 -sTCP:LISTEN)"; if [ -n "$preview_pid" ]; then kill "$preview_pid"; fi; } &&
pnpm --filter @zigoals/web exec next start --hostname 127.0.0.1 --port 3100
```
