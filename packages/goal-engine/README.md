# Goal engine

Pure `evaluateGoal(input)` planning calculations. No network, storage, clock, wallet, or environment access. Decimal.js 10.6.0 uses a private 160-significant-digit context; money never passes through JavaScript floating-point arithmetic. Dates use calendar integers.

## Inputs and limits

- `targetValue`, `currentValue`, `plannedMonthlyContribution`: plain nonnegative decimal **strings**, at most 18 fractional digits, at most 10^36. Target must be positive. No exponent notation, whitespace, leading zeroes, or nonfinite values.
- `annualReturnAssumption`: fractional effective annual return (`'0.05'` or `0.05` means 5%), between -1 and 10 inclusive. Plain strings allow 36 fractional digits; finite numbers are converted to plain decimals and subject to the same limits. Prefer strings for exact caller intent. This is an illustrative assumption, not a yield guarantee.
- `currentDate`, `targetDate`: validated `YYYY-MM-DD` calendar dates, years 1900–9999. Current year must be at most 9899 so the completion horizon fits. Target cannot be more than 1200 calendar months after current date. Invalid, missing, unbounded, and nonfinite values throw TypeError or RangeError.

## Calendar and scenario conventions

Contributions occur at the end of each full calendar-month period after `currentDate`, anchored to its **original** day. January 31 → February 28/29 → March 31; January 30 → February 28/29 → March 30. A mid-month start retains that day. February 29 starts use day 29 in subsequent months (not every month's final day). Contributions on the target date count. No contribution occurs on the current date. No partial-period contributions or day-rate return prorating apply; a target between scheduled dates uses the last completed period's value.

Monthly growth factor `q = (1 + annualReturnAssumption)^(1/12)` is rounded to 80 decimal places, then each period computes `balance = balance × q + contribution`. Principal growth and the annuity factor are accumulated using the same schedule. Scenario `requiredContribution` solves `(target − current × q^n) / (1 + q + … + q^(n−1))`, floored at zero. It is the **total** recurring contribution required, not the extra contribution above the existing plan. Already-completed goals require zero new contribution. With no remaining periods (today, past deadline, or before the first scheduled date), required values report the immediate remaining funding gap and `requiredContributionTiming` is `immediate`; the target-date projection is current value, not reconstructed historical wealth.

## Outputs

Money and `progressPct` are plain decimal strings without exponent notation or trailing zeroes. Output values round half-up to 18 fractional places, except `requiredContribution` and `fundingRequiredContribution`, which round **up** to avoid an underfunded plan. Calculations and comparisons retain internal precision until output. Progress can exceed 100%; remaining, shortfall, and surplus never become negative. These decimal precision conventions are planning units, not a token's executable denomination or exchange rate.

`contributionPeriodsRemaining` is an integer. `requiredContribution` reflects the scenario return. `fundingRequiredContribution` always equals the zero-return gap divided by remaining periods, independently of scenario assumptions. `requiredContributionTiming` is `monthly` or `immediate`.

`fundingHealth` and `fundingHealthExplanation` always assume **zero future return**:

- `COMPLETED`: current value is at least target.
- `AHEAD`: the zero-return plan reaches target at least one whole scheduled contribution period before the deadline.
- `ON_TRACK`: the zero-return plan reaches target in the final scheduled period. A small final-period surplus does not imply AHEAD.
- `BEHIND`: the plan cannot fund the target by the deadline, or an unmet goal has no scheduled periods left.

`projectedValueAtTargetDate`, `shortfallAtTargetDate`, and `surplusAtTargetDate` use the scenario. An already-completed goal can show a later scenario shortfall under a negative return assumption; completed status reflects its current value.

`projectedCompletionDate` is the current date for an already-reached goal, otherwise the first scheduled date meeting target, or null. `projectedCompletionStatus` distinguishes `completed`, `projected`, `unreachable`, and `beyond_horizon`. Completion search includes 1200 periods (100 years), reported as `completionHorizonPeriods`, and may continue after the requested target date. `unreachable` means the fixed scenario mathematically cannot reach target (including a declining balance's equilibrium at/below target); `beyond_horizon` means no completion within the bounded search, not impossible. Total monthly loss (-100% annual assumption) has factor zero and can still reach target with a sufficient end-period contribution. `explanation` states these scenario and timing limitations.

## Verification

From the repository root: `pnpm exec vitest run packages/goal-engine`. Tests use literal known answers for returns, funding states, calendar boundaries, precision, invalid inputs, and completion limits. Package strict typecheck: `node node_modules/typescript/bin/tsc --noEmit --strict --noUncheckedIndexedAccess --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler packages/goal-engine/src/index.ts packages/goal-engine/src/index.test.ts`.
