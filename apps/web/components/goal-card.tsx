"use client";
import Link from "next/link";
import { useId } from "react";
import { visualTone } from "./visual-tone";
import Decimal from "decimal.js";
import { evaluateGoal } from "@zigoals/goal-engine";
import type { GoalMetadata } from "@zigoals/shared-types";
import type { LocalGoal } from "../lib/local-ledger";
import { DemoPriceProvider } from "../lib/valuation";
import { SceneArt } from "./scene-art";
export function displayAmount(value: string, currency: string) {
  return `${currency === "EUR" ? "€" : currency === "USD" ? "$" : ""}${new Decimal(value).toDecimalPlaces(currency === "ZIG" ? 6 : 2).toFixed()}${currency === "ZIG" ? " ZIG" : ""}`;
}
export function GoalCard({
  goal,
  plan,
  compact = false,
  source = "Local simulation",
}: {
  goal: LocalGoal;
  plan?: GoalMetadata;
  compact?: boolean;
  source?: string;
}) {
  const ringId = useId();
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
    <article className={`goal-card destination-card${compact ? " compact-goal" : ""}`} data-tone={visualTone(goal.id)}>
      <div className="goal-card-art"><SceneArt scene={plan?.category === "Travel" ? "mountains" : plan?.category === "First Home" ? "home" : "garden"}/><span>{plan?.category ?? "Private goal"}</span></div>
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
        <span className="badge" data-health={goal.status === "closed" ? "CLOSED" : result?.fundingHealth}>
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
          <div className="goal-progress">
            <div
              className="goal-progress-ring"
              role="progressbar"
              aria-label={`${plan?.name} progress`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(100, Number(result.progressPct))}
            >
              <svg viewBox="0 0 88 88" aria-hidden="true" focusable="false">
                <defs><linearGradient id={ringId} x1="0" y1="0" x2="1" y2="1"><stop stopColor="var(--item-start)"/><stop offset="1" stopColor="var(--item-end)"/></linearGradient></defs>
                <circle className="ring-track" cx="44" cy="44" r="38" />
                <circle style={{ stroke: `url(#${ringId})` }} className="ring-value" cx="44" cy="44" r="38" pathLength="100" strokeDasharray={`${Math.min(100, Number(result.progressPct))} 100`} transform="rotate(-90 44 44)" />
              </svg>
              <strong aria-hidden="true">{new Decimal(result.progressPct).toFixed(1)}%</strong>
            </div>
            <div className="goal-progress-caption">
              <strong>Of your goal funded</strong>
              <span>Target {plan?.targetDate}</span>
            </div>
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
          {source} · {plan && plan.currency !== "ZIG" ? "Demo valuation · " : ""}Idle ·{" "}
          {goal.status === "active"
            ? "Available to withdraw"
            : "History preserved"}
        </small>
        <Link href={`/app/goals/${goal.id}`} className="text-link">
          Open Goal →
        </Link>
      </div>
    </article>
  );
}
