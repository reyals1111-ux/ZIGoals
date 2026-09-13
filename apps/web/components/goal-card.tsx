"use client";
import Link from "next/link";
import Decimal from "decimal.js";
import { evaluateGoal } from "@zigoals/goal-engine";
import type { GoalMetadata } from "@zigoals/shared-types";
import type { LocalGoal } from "../lib/local-ledger";
import { DemoPriceProvider } from "../lib/valuation";
export function displayAmount(value: string, currency: string) {
  return `${currency === "EUR" ? "€" : currency === "USD" ? "$" : ""}${new Decimal(value).toDecimalPlaces(currency === "ZIG" ? 6 : 2).toFixed()}${currency === "ZIG" ? " ZIG" : ""}`;
}
export function GoalCard({
  goal,
  plan,
}: {
  goal: LocalGoal;
  plan?: GoalMetadata;
}) {
  const current = DemoPriceProvider.value(
    goal.position_units,
    plan?.currency ?? "ZIG",
  );
  let result;
  try {
    result = plan
      ? evaluateGoal({
          targetValue: plan.targetValue,
          currentValue: current,
          currentDate: new Date().toISOString().slice(0, 10),
          targetDate: plan.targetDate,
          plannedMonthlyContribution: plan.monthlyContribution,
          annualReturnAssumption: "0",
        })
      : undefined;
  } catch {
    /* A stale or out-of-range plan must not block access to financial state. */
  }
  return (
    <article className="goal-card">
      <div className="card-top">
        <span className="category-icon" aria-hidden="true">
          {plan?.category === "Travel"
            ? "↗"
            : plan?.category === "First Home"
              ? "⌂"
              : plan?.category === "Education"
                ? "✧"
                : "◎"}
        </span>
        <span className="eyebrow">{plan?.category ?? "Plan unavailable"}</span>
        <span className="badge">
          {goal.status === "closed"
            ? "Closed"
            : (result?.fundingHealth.replaceAll("_", " ") ?? "Recover plan")}
        </span>
      </div>
      <h2>
        <Link href={`/app/goals/${goal.id}`}>
          {plan?.name ?? `Goal #${goal.id}`}
        </Link>
      </h2>
      <p className="goal-value">
        {displayAmount(current, plan?.currency ?? "ZIG")}
        <span>
          {" "}
          /{" "}
          {plan
            ? displayAmount(plan.targetValue, plan.currency)
            : "No target saved"}
        </span>
      </p>
      {result && (
        <>
          <div
            className="progress"
            role="progressbar"
            aria-label={`${plan?.name} progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, Number(result.progressPct))}
          >
            <span
              style={{ width: `${Math.min(100, Number(result.progressPct))}%` }}
            />
          </div>
          <div className="card-row">
            <strong>{new Decimal(result.progressPct).toFixed(1)}%</strong>
            <span>Target {plan?.targetDate}</span>
          </div>
          <div className="card-bottom">
            <div>
              <small>Monthly plan</small>
              <strong>
                {displayAmount(plan!.monthlyContribution, plan!.currency)}
              </strong>
            </div>
            <div>
              <small>
                Required{" "}
                {result.requiredContributionTiming === "immediate"
                  ? "now"
                  : "monthly"}
              </small>
              <strong>
                {displayAmount(
                  result.fundingRequiredContribution,
                  plan!.currency,
                )}
              </strong>
            </div>
          </div>
        </>
      )}
      <div className="card-footer">
        <small>
          {plan && plan.currency !== "ZIG" ? "Demo valuation · " : ""}Idle ·{" "}
          {goal.status === "active"
            ? "Available to withdraw"
            : "History preserved"}
        </small>
        <Link href={`/app/goals/${goal.id}`} className="text-link">
          View goal →
        </Link>
      </div>
    </article>
  );
}
