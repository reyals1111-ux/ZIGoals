"use client";
import { ExplorerLinks } from "../../../../components/explorer-links";
import { use, useState } from "react";
import Link from "next/link";
import Decimal from "decimal.js";
import { evaluateGoal } from "@zigoals/goal-engine";
import { formatUnits, parseUnits, TESTNET } from "@zigoals/chain-config";
import { useGoals } from "../../../../components/goal-provider";
import { GoalWizard } from "../../../../components/goal-wizard";
import { displayAmount, GoalProgressRing } from "../../../../components/goal-card";
import { legacyGoalSummary } from "../../../../lib/goal-summary";
import { localDate } from "../../../../lib/local-date";
import { visualTone } from "../../../../components/visual-tone";
import { SceneArt } from "../../../../components/scene-art";
import { HabitGoalLinks } from "../../../../components/habits/habit-goal-links";
import { CONTRACT_ADDRESS } from "../../../../lib/wallet";
export default function GoalDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const s = useGoals();
  const goal = s.goals.find((g) => g.id === id);
  const plan = s.metadata?.goals[id];
  const [funds, setFunds] = useState("10");
  const [scenario, setScenario] = useState("0");
  const [custom, setCustom] = useState("3");
  const [recover, setRecover] = useState(false);
  if (!s.loaded) return <p role="status">Loading goal…</p>;
  if (!goal)
    return (
      <section className="empty-state">
        <h1>Goal unavailable.</h1>
        <p>Connect the wallet and network that own this goal, then refresh.</p>
        <Link className="secondary" href="/app/goals">
          Back to goals
        </Link>
      </section>
    );
  const summary=legacyGoalSummary(goal,plan,s.mode==='local'?'Local simulation':'Future Goal Manager');
  const current = summary.current;
  const evaluation = plan
    ? {
        targetValue: plan.targetValue,
        currentValue: current,
        currentDate: localDate(),
        targetDate: plan.targetDate,
        plannedMonthlyContribution: plan.monthlyContribution,
      }
    : undefined;
  let result;
  let baselineError = "";
  try {
    if (evaluation)
      result = evaluateGoal({ ...evaluation, annualReturnAssumption: "0" });
  } catch {
    baselineError =
      "This saved plan exceeds the supported planning limits. Review its target date and amounts to calculate Funding Health.";
  }
  let scenarioResult;
  let scenarioError = "";
  try {
    if (evaluation && !baselineError)
      scenarioResult = evaluateGoal({
        ...evaluation,
        annualReturnAssumption: new Decimal(
          scenario === "custom" ? custom : scenario,
        )
          .div(100)
          .toFixed(),
      });
  } catch {
    scenarioError =
      "Choose a valid illustrative annual return from −100% to 1,000%.";
  }
  function fund(kind: "deposit" | "withdraw") {
    try {
      const amount = parseUnits(funds, TESTNET.nativeAsset.decimals).toString();
      if (BigInt(amount) === 0n)
        throw Error("Enter an amount greater than zero.");
      void s.prepare({ kind, id, amount });
    } catch (e) {
      s.setError(e instanceof Error ? e.message : String(e));
    }
  }
  return (
    <div className="goal-detail-page" data-tone={visualTone(id)}>
      <Link href="/app/goals" className="text-link">
        ← All goals
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {summary.type} · {summary.status} · {summary.source}
          </p>
          <h1>{plan?.name ?? `Goal #${id}`}</h1>
          <p>
            {plan?.currency !== "ZIG" && plan ? "Demo valuation. " : ""}Testnet
            assets have no monetary value.
          </p>
        </div>
        <button
          className="secondary"
          onClick={() => void s.refresh().catch((e) => s.setError(String(e)))}
        >
          Refresh
        </button>
      </div>
      <div className="detail-grid">
        <section className="panel progress-panel">
          <div className="detail-destination-art"><SceneArt scene={summary.scene}/></div>
          <p className="eyebrow">Your progress</p>
          <p className="hero-amount">
            {displayAmount(current, plan?.currency ?? "ZIG")}
          </p>
          <p>
            {plan
              ? `of ${displayAmount(plan.targetValue, plan.currency)}`
              : "No target is saved on this device."}
          </p>
          {baselineError && <p role="alert">{baselineError}</p>}
          {result && plan && (
            <>
              <div className="legacy-shared-orbit"><GoalProgressRing name={summary.name} progressPct={summary.progressPct}/></div>
              <div className="card-row">
                <strong>
                  {new Decimal(summary.progressPct).toFixed(2,Decimal.ROUND_DOWN)}% complete
                </strong>
                <span>
                  {displayAmount(result.amountRemaining, plan.currency)} to go
                </span>
              </div>
              <div className="health">
                <span className="badge">
                  {result.fundingHealth.replaceAll("_", " ")}
                </span>
                <h3>Funding health · 0% future return</h3>
                <p>{result.fundingHealthExplanation}</p>
              </div>
              <dl className="metrics">
                <div>
                  <dt>Target date</dt>
                  <dd>{plan.targetDate}</dd>
                </div>
                <div>
                  <dt>Contributions remaining</dt>
                  <dd>{result.contributionPeriodsRemaining}</dd>
                </div>
                <div>
                  <dt>Your monthly plan</dt>
                  <dd>
                    {displayAmount(plan.monthlyContribution, plan.currency)}
                  </dd>
                </div>
                <div>
                  <dt>
                    Required{" "}
                    {result.requiredContributionTiming === "immediate"
                      ? "now"
                      : "monthly"}{" "}
                    at 0%
                  </dt>
                  <dd>
                    {displayAmount(
                      result.fundingRequiredContribution,
                      plan.currency,
                    )}
                  </dd>
                </div>
              </dl>
            </>
          )}
          {!plan && (
            <div className="notice">
              <p>
                Your onchain goal is still yours. Import a backup or recreate
                the private plan. You can withdraw without it.
              </p>
              <Link href="/app/settings" className="text-link">
                Import backup →
              </Link>
              <button
                className="secondary"
                onClick={() => setRecover((v) => !v)}
              >
                Recreate private plan
              </button>
            </div>
          )}
        </section>
        <section className="panel funding-panel">
          <p className="eyebrow">Move at your own pace</p>
          <h2>Add or withdraw funds.</h2>
          <p>Available in this goal</p>
          <strong>
            {formatUnits(goal.position_units, TESTNET.nativeAsset.decimals)} ZIG
          </strong>
          <label>
            Amount in ZIG
            <input
              inputMode="decimal"
              value={funds}
              onChange={(e) => setFunds(e.target.value)}
              aria-describedby="funds-note"
            />
          </label>
          <p className="fine" id="funds-note">
            {s.mode === "local"
              ? "Local simulation · No fee or wallet signature."
              : "Network fees are estimated before you approve. Keep ZIG in your wallet for withdrawal fees."}
          </p>
          <div className="actions">
            <button
              className="primary"
              disabled={s.busy || !s.canTransact || goal.status === "closed"}
              onClick={() => fund("deposit")}
            >
              Add funds
            </button>
            <button
              className="secondary"
              disabled={
                s.busy ||
                !s.canTransact ||
                goal.position_units === "0" ||
                goal.status === "closed"
              }
              onClick={() => fund("withdraw")}
            >
              Withdraw
            </button>
          </div>
          <button
            className="quiet"
            disabled={
              s.busy ||
              !s.canTransact ||
              goal.position_units !== "0" ||
              goal.status === "closed"
            }
            onClick={() => void s.prepare({ kind: "close", id })}
          >
            Close empty goal
          </button>
          <div className="idle-note">
            <strong>Idle</strong>
            <p>
              No external investment strategy is active.{" "}
              {s.mode === "local"
                ? "The local ledger simulates assets held in the Goal contract."
                : "Your assets remain inside the ZIGoals Goal contract."}
            </p>
            <small>Unaudited alpha. Smart contract risk remains.</small>
          </div>
          {plan && BigInt(goal.total_deposited) === 0n && (
            <p className="fine">
              Planned starting amount:{" "}
              {displayAmount(plan.startingAmount, plan.currency)}. No starting
              funds have been deposited.
            </p>
          )}
        </section>
      </div>
      <div className="goal-daily-bridge"><div><p className="eyebrow">GOAL → PLAN → HABITS → PROGRESS</p><h2>Give your plan a daily rhythm.</h2><p>A contribution reminder. A spending review. Small intentions you choose, entirely private.</p></div><Link className="secondary" href="/app/habits">Add a supporting habit →</Link></div>
      <HabitGoalLinks goalId={id} chainId={s.chain} owner={s.owner}/>
      {recover && !plan && <GoalWizard recoverId={id} />}{" "}
      {plan && (
        <section className="panel scenario-panel">
          <div>
            <p className="eyebrow">Explore the possibilities</p>
            <h2>Illustrative scenario.</h2>
            <p>
              Assumptions are not predictions. They do not change Funding
              Health.
            </p>
          </div>
          <label>
            Assumed annual return
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
            >
              <option value="0">0%</option>
              <option value="3">3%</option>
              <option value="5">5%</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          {scenario === "custom" && (
            <label>
              Custom annual return (%)
              <input
                inputMode="decimal"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
              />
            </label>
          )}
          {scenarioError ? (
            <p role="alert">{scenarioError}</p>
          ) : (
            scenarioResult && (
              <dl className="metrics">
                <div>
                  <dt>Projected completion</dt>
                  <dd>
                    {scenarioResult.projectedCompletionDate ??
                      (scenarioResult.projectedCompletionStatus ===
                      "unreachable"
                        ? "Not reachable under this assumption"
                        : "Beyond 100-year horizon")}
                  </dd>
                </div>
                <div>
                  <dt>Projected at target date</dt>
                  <dd>
                    {displayAmount(
                      scenarioResult.projectedValueAtTargetDate,
                      plan.currency,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Shortfall / surplus</dt>
                  <dd>
                    {displayAmount(
                      scenarioResult.shortfallAtTargetDate,
                      plan.currency,
                    )}{" "}
                    /{" "}
                    {displayAmount(
                      scenarioResult.surplusAtTargetDate,
                      plan.currency,
                    )}
                  </dd>
                </div>
              </dl>
            )
          )}
        </section>
      )}
      <section className="panel">
        <h2>Activity</h2>
        <p className="fine">
          {s.mode === "local"
            ? "Local simulation history."
            : "Confirmed actions from this browser session. Use the explorer for complete onchain history."}
        </p>
        {s.activity
          .filter((a) => a.goalId === id)
          .map((a, i) => (
            <div className="activity-row" key={i}>
              <span className="activity-symbol" aria-hidden="true">
                {a.action === "Withdrew funds" ? "↖" : "↘"}
              </span>
              <div>
                <strong>{a.action}</strong>
                <small>{new Date(a.timestamp).toLocaleString()}</small>
              </div>
              <span>
                {a.amount !== "0"
                  ? formatUnits(a.amount, TESTNET.nativeAsset.decimals) + " ZIG"
                  : ""}
              </span>
              {s.mode === "testnet" && a.hash && (
                <ExplorerLinks
                  chainId={s.chain}
                  kind="transaction"
                  identifier={a.hash}
                />
              )}
            </div>
          ))}
      </section>
      <details className="panel verify">
        <summary>Verify onchain · advanced details</summary>
        <dl className="metrics">
          <div>
            <dt>Network / chain ID</dt>
            <dd>{s.chain}</dd>
          </div>
          <div>
            <dt>Goal ID</dt>
            <dd>{id}</dd>
          </div>
          <div>
            <dt>Owner</dt>
            <dd>{goal.owner}</dd>
          </div>
          <div>
            <dt>Goal Manager</dt>
            <dd>
              {s.mode === "local"
                ? "Local simulation — no deployed contract"
                : CONTRACT_ADDRESS}
            </dd>
          </div>
          <div>
            <dt>Base asset / position</dt>
            <dd>
              {goal.base_denom} / {goal.position_units}
            </dd>
          </div>
          <div>
            <dt>Strategy</dt>
            <dd>{goal.strategy_id}</dd>
          </div>
          <div>
            <dt>Total deposited / withdrawn</dt>
            <dd>
              {goal.total_deposited} / {goal.total_withdrawn} base units
            </dd>
          </div>
        </dl>
        {s.mode === "testnet" && (
          <ExplorerLinks
            chainId={s.chain}
            kind="contract"
            identifier={CONTRACT_ADDRESS}
          />
        )}
      </details>
    </div>
  );
}
