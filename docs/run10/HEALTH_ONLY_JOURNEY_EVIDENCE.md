JRN-01 local production integration evidence

- Test: `apps/web/tests/run10-health-only-journey.spec.ts`; one journey executed independently in fresh desktop and mobile browser contexts with no seeded or Showcase data.
- Verified Health-only selection; custom fictional food; 1.5 servings / 225 kcal meal; 250 mL water; chosen water widget; settings navigation; full reload retaining interests, widget, meal, water and food.
- Verified mobile touch activation, keyboard dialog submission, Escape cancellation with restored focus, keyboard reopen and keyboard settings navigation.
- Health-only already includes water: the journey removes that preset widget configuration before adding its chosen replacement; underlying water remains 250 mL.
- Request audit rejects market/wallet/financial/chain API requests and external fetch/XHR requests. Both successful runs detected none; no wallet connection or financial intelligence panel appears after Health-only selection.
- Command: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3110 pnpm --filter @zigoals/web exec playwright test tests/run10-health-only-journey.spec.ts --workers=1 --output=/private/tmp/run10-health-only-journey-verified`
- Result: **2 passed (9.9s)** against the already-running local production preview; desktop 3.7s, mobile 4.9s. Scoped ESLint passed.
- Earlier test-only attempts correctly rejected a duplicate water widget and exposed a test reload/navigation race; final setup removes the duplicate and waits for navigation before reload. No application changes.
- Screenshots: `docs/run10/evidence/health-only-journey-desktop.png`, `docs/run10/evidence/health-only-journey-mobile.png`. A subsequent explicit WebSocket-listener refinement could not rerun because preview3110 refused connections; `/private/tmp/run10-health-only-journey-verified` now records that infrastructure failure. Final socket-audit source awaits rerun.
- This is local Chromium desktop/mobile-emulation proof. Physical-device and hosted verification, owner acceptance and release remain separate; no blanket requirement-ledger promotion made.

Final source17a3e9af420f90e022120d9dabd5642c6e7e23a1 packaged Alpha preview8788: public-alpha/diagnostics/Health-only suite14passed11.9s, including both Health-only projects with explicit WebSocket audit. No forbidden egress found. See evidence/verification-receipts.json; earlier stopped-preview failure is not relabeled.
