"use client";
import { useState } from "react";
import {
  CATEGORIES,
  validateMetadata,
  type GoalMetadata,
} from "@zigoals/shared-types";
import { evaluateGoal } from "@zigoals/goal-engine";
import { useGoals } from "./goal-provider";
import { displayAmount } from "./goal-card";
function defaults(): GoalMetadata {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return {
    name: "",
    category: "Emergency Fund",
    targetValue: "1200",
    currency: "ZIG",
    targetDate: d.toISOString().slice(0, 10),
    startingAmount: "0",
    monthlyContribution: "100",
    riskPreference: "Conservative",
    liquidityPreference: "Anytime",
    deadlineFlexible: false,
    notes: "",
  };
}
export function GoalWizard({ recoverId }: { recoverId?: string }) {
  const s = useGoals();
  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState<GoalMetadata>(defaults);
  const [error, setError] = useState("");
  const steps = ["Purpose", "Target", "Plan", "Preferences", "Review"];
  const set = <K extends keyof GoalMetadata>(key: K, value: GoalMetadata[K]) =>
    setPlan((p) => ({ ...p, [key]: value }));
  function next() {
    try {
      if (step === 0 && !plan.name) set("name", plan.category);
      if (step === 1) {
        validateMetadata({ ...plan, name: plan.name || plan.category });
        if (plan.targetDate < new Date().toISOString().slice(0, 10))
          throw Error("Choose today or a future target date.");
      }
      if (step === 2) validateMetadata(plan);
      setError("");
      setStep((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }
  let projection;
  try {
    projection = evaluateGoal({
      targetValue: plan.targetValue,
      currentValue: plan.startingAmount,
      currentDate: new Date().toISOString().slice(0, 10),
      targetDate: plan.targetDate,
      plannedMonthlyContribution: plan.monthlyContribution,
      annualReturnAssumption: "0",
    });
  } catch {}
  return (
    <section className="wizard">
      <ol className="steps" aria-label="Goal creation progress">
        {steps.map((label, i) => (
          <li key={label} aria-current={step === i ? "step" : undefined}>
            <span>{i + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      <div className="wizard-content">
        <p className="eyebrow">Step {step + 1} of 5</p>
        {step === 0 ? (
          <>
            <h2>What are you working toward?</h2>
            <p>
              Your goal sets the direction. It never selects an investment for
              you.
            </p>
            <div className="templates">
              {CATEGORIES.map((category, i) => (
                <button
                  key={category}
                  className={`template ${plan.category === category ? "selected" : ""}`}
                  onClick={() => {
                    set("category", category);
                    set("name", category);
                  }}
                  aria-pressed={plan.category === category}
                >
                  <span aria-hidden="true">
                    {["◎", "⌂", "↗", "✧", "◈", "＋"][i]}
                  </span>
                  <strong>{category}</strong>
                </button>
              ))}
            </div>
          </>
        ) : step === 1 ? (
          <>
            <h2>Make your destination clear.</h2>
            <div className="form-grid">
              <label className="span-two">
                Private goal name
                <input
                  value={plan.name}
                  onChange={(e) => set("name", e.target.value)}
                  maxLength={80}
                  required
                />
                <small>Saved on this device. Never sent to the contract.</small>
              </label>
              <label>
                Target amount
                <input
                  inputMode="decimal"
                  value={plan.targetValue}
                  onChange={(e) => set("targetValue", e.target.value)}
                  required
                />
              </label>
              <label>
                Display currency
                <select
                  value={plan.currency}
                  onChange={(e) =>
                    set("currency", e.target.value as GoalMetadata["currency"])
                  }
                >
                  <option value="ZIG">ZIG (test assets)</option>
                  <option value="EUR">EUR (demo valuation)</option>
                  <option value="USD">USD (demo valuation)</option>
                </select>
              </label>
              <label className="span-two">
                Target date
                <input
                  type="date"
                  value={plan.targetDate}
                  onChange={(e) => set("targetDate", e.target.value)}
                  required
                />
              </label>
            </div>
            {plan.currency !== "ZIG" && (
              <p className="notice">
                Demo valuation: 1 simulated ZIG = 1 {plan.currency}. Testnet
                assets have no monetary value.
              </p>
            )}
          </>
        ) : step === 2 ? (
          <>
            <h2>A plan you can build on.</h2>
            <p>Choose a starting contribution and a monthly pace.</p>
            <div className="form-grid">
              <label>
                Planned starting amount
                <input
                  inputMode="decimal"
                  value={plan.startingAmount}
                  onChange={(e) => set("startingAmount", e.target.value)}
                />
                <small>
                  Planning only. Add funds separately after creating the goal.
                </small>
              </label>
              <label>
                Planned monthly contribution
                <input
                  inputMode="decimal"
                  value={plan.monthlyContribution}
                  onChange={(e) => set("monthlyContribution", e.target.value)}
                />
                <small>You make each contribution. No automatic debits.</small>
              </label>
            </div>
            {projection && (
              <div className="plan-preview">
                <small>At 0% future return, your proposed plan is</small>
                <strong>{projection.fundingHealth.replaceAll("_", " ")}</strong>
                <p>{projection.fundingHealthExplanation}</p>
              </div>
            )}
          </>
        ) : step === 3 ? (
          <>
            <h2>What feels right for you?</h2>
            <p>
              These preferences are saved for future planning. Idle is the only
              available strategy.
            </p>
            <div className="form-grid">
              <label className="span-two">
                If the value temporarily fell, what would matter most?
                <select
                  value={plan.riskPreference}
                  onChange={(e) =>
                    set(
                      "riskPreference",
                      e.target.value as GoalMetadata["riskPreference"],
                    )
                  }
                >
                  <option value="Conservative">Preserving what I have</option>
                  <option value="Balanced">
                    Balancing stability and growth
                  </option>
                  <option value="Growth">
                    Staying focused on long-term growth
                  </option>
                </select>
              </label>
              <label className="span-two">
                How quickly might you need these funds?
                <select
                  value={plan.liquidityPreference}
                  onChange={(e) =>
                    set(
                      "liquidityPreference",
                      e.target.value as GoalMetadata["liquidityPreference"],
                    )
                  }
                >
                  <option>Anytime</option>
                  <option>Within a month</option>
                  <option>Flexible</option>
                </select>
              </label>
              <label className="checkbox span-two">
                <input
                  type="checkbox"
                  checked={plan.deadlineFlexible}
                  onChange={(e) => set("deadlineFlexible", e.target.checked)}
                />
                My target date could move if needed.
              </label>
            </div>
          </>
        ) : (
          <>
            <h2>{plan.name}</h2>
            <p>Review your plan. Creating a goal does not deposit funds.</p>
            <dl className="metrics">
              <div>
                <dt>Target</dt>
                <dd>{displayAmount(plan.targetValue, plan.currency)}</dd>
              </div>
              <div>
                <dt>Target date</dt>
                <dd>{plan.targetDate}</dd>
              </div>
              <div>
                <dt>Planned monthly</dt>
                <dd>
                  {displayAmount(plan.monthlyContribution, plan.currency)}
                </dd>
              </div>
              <div>
                <dt>Planned starting amount</dt>
                <dd>{displayAmount(plan.startingAmount, plan.currency)}</dd>
              </div>
              <div>
                <dt>Preference</dt>
                <dd>
                  {plan.riskPreference} · {plan.liquidityPreference}
                </dd>
              </div>
              <div>
                <dt>Strategy</dt>
                <dd>Idle only</dd>
              </div>
            </dl>
            <p className="notice">
              {recoverId
                ? "This saves private planning data only."
                : "Your goal opens empty. Add funds in a separate action once it is created."}{" "}
              Export a backup to keep your plan recoverable.
            </p>
          </>
        )}
        {error && (
          <p role="alert" className="alert">
            {error}
          </p>
        )}
        <div className="wizard-actions">
          <button
            className="secondary"
            onClick={() => setStep((n) => n - 1)}
            disabled={step === 0 || s.busy}
          >
            Back
          </button>
          {step < 4 ? (
            <button className="primary" onClick={next}>
              Continue →
            </button>
          ) : (
            <button
              className="primary"
              disabled={s.busy || (!recoverId && !s.canTransact)}
              onClick={() => {
                try {
                  const valid = validateMetadata(plan);
                  evaluateGoal({
                    targetValue: valid.targetValue,
                    currentValue: valid.startingAmount,
                    currentDate: new Date().toISOString().slice(0, 10),
                    targetDate: valid.targetDate,
                    plannedMonthlyContribution: valid.monthlyContribution,
                    annualReturnAssumption: "0",
                  });
                  if (recoverId) s.recover(recoverId, valid);
                  else void s.prepare({ kind: "create" }, valid);
                } catch (e) {
                  setError(String(e));
                }
              }}
            >
              {recoverId
                ? "Save private plan"
                : s.busy
                  ? "Preparing…"
                  : "Create goal"}
            </button>
          )}
        </div>
        {!s.canTransact && !recoverId && (
          <p className="fine">
            Testnet contract deployment is pending. Select Local demo to try the
            full flow.
          </p>
        )}
      </div>
    </section>
  );
}
