"use client";
import {GoalModule} from "../../../../components/platform/tracked-detail";
import {usePlatform} from "../../../../components/platform/use-platform";
import {useRouter} from "next/navigation";
import "../../../../components/platform/goal-detail.css";
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
  const platform=usePlatform(),router=useRouter();
  const uiKey=`${s.chain}:${s.owner}:${id}`;
  const ui=platform.data.legacyGoalUi?.[uiKey]??{};
  const [remove,setRemove]=useState(false);
  async function preference(patch:typeof ui){try{await platform.update(data=>({...data,legacyGoalUi:{...data.legacyGoalUi,[uiKey]:{...data.legacyGoalUi?.[uiKey],...patch}}}));}catch(e){s.setError(String(e));}}
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
    if(ui.locked)return;
    try {
      const amount = parseUnits(funds, TESTNET.nativeAsset.decimals).toString();
      if (BigInt(amount) === 0n)
        throw Error("Enter an amount greater than zero.");
      void s.prepare({ kind, id, amount });
    } catch (e) {
      s.setError(e instanceof Error ? e.message : String(e));
    }
  }
  return <div className="dashboard platform-workspace goal-detail-workspace" data-tone={visualTone(id)}>
 <Link href="/app/goals" className="text-link">← All goals</Link>
 <section className="panel goal-detail-overview" aria-label="Goal overview">
 <div className="goal-detail-art"><SceneArt scene={summary.scene}/></div>
 <details className="goal-actions"><summary aria-label="Goal actions">…</summary><div className="panel"><button className="quiet" onClick={()=>void preference({pinned:!ui.pinned})}>{ui.pinned?'Unpin Goal':'Pin Goal'}</button><button className="quiet" onClick={()=>void preference({locked:!ui.locked})}>{ui.locked?'Unlock editing':'Lock editing'}</button><button className="quiet" disabled={!!ui.locked} onClick={()=>setRemove(true)}>Remove Goal from ZIGoals</button></div></details>
 <div className="goal-detail-heading"><p className="eyebrow">{summary.type} · {summary.source}</p><h1>{summary.name}</h1><span className="badge">{summary.status}</span></div>
 <div className="goal-detail-progress"><GoalProgressRing goalId={id} name={summary.name} progressPct={summary.progressPct}/><div><p className="eyebrow">Current progress</p><strong className="goal-detail-current">{displayAmount(current,summary.currency)}</strong><p>{summary.target?`of ${displayAmount(summary.target,summary.currency)}`:'Recover your private plan'}</p></div></div>
 <dl className="goal-detail-facts"><div><dt>Remaining</dt><dd>{summary.remaining?displayAmount(summary.remaining,summary.currency):'Review plan'}</dd></div><div><dt>Funding Health</dt><dd>{summary.fundingHealth}</dd></div><div><dt>Target date</dt><dd>{summary.targetDate??'Your own pace'}</dd></div></dl>
 <p className="fine">{s.mode==='local'?'Simulation only — no real funds.':'Legacy Goal Manager record.'} Your Goal organizes your plan. New Goals can use wealth where it already exists.</p>
 </section>
 {baselineError&&<p role="alert">{baselineError}</p>}
 {ui.locked&&<p className="notice">Editing locked. Unlock from Goal actions to make changes.</p>}
 {remove&&<section role="alertdialog" aria-label="Remove legacy Goal" className="panel"><h2>Remove Goal from ZIGoals?</h2><p>This archives its card. The ledger, private plan and Habit history remain recoverable at this Goal’s address.</p><button className="primary" disabled={!!ui.locked} onClick={()=>void preference({archived:true}).then(()=>router.push('/app/goals'))}>Confirm removal</button><button className="secondary" onClick={()=>setRemove(false)}>Cancel</button></section>}
 {ui.archived&&<button className="secondary" onClick={()=>void preference({archived:false})}>Restore Goal to ZIGoals</button>}
 <fieldset disabled={!!ui.locked} className="goal-edit-scope"><div className="goal-management-grid">
 <GoalModule id="wealth" title="Wealth / sources" description="Legacy simulation · private planning"><p>This existing Goal uses a saved simulated balance. Keep it for reference, or create a non-custodial Goal to allocate wallet holdings, stake or manual wealth.</p><Link href="/app/goals/new" className="text-link">Create a Goal using existing wealth →</Link></GoalModule>
 <GoalModule id="contribution-plan" title="Contribution plan" description={plan?`${displayAmount(plan.monthlyContribution,plan.currency)} monthly`:'Recover your plan'}>{result&&<><h2>Funding health · 0% future return</h2><p>{result.fundingHealthExplanation}</p><p>Contributions remaining: {result.contributionPeriodsRemaining}</p><p><span>Required {result.requiredContributionTiming==='immediate'?'now':'monthly'} at 0%</span>: {displayAmount(result.fundingRequiredContribution,summary.currency)}</p></>}{plan&&(        <div className="scenario-panel">
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
        </div>
)}</GoalModule>
 <GoalModule id="supporting-habits" title="Supporting habits" description="Private behavior · history preserved"><HabitGoalLinks goalId={id} chainId={s.chain} owner={s.owner}/><Link href="/app/habits" className="text-link">Manage supporting habits →</Link></GoalModule>
 <GoalModule id="history" title="Progress / history" description="Saved activity and observations">      <div>
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
      </div>
</GoalModule>
 <GoalModule id="edit-goal" title="Edit Goal" description="Private name, target and contribution plan"><button className="secondary" onClick={()=>setRecover(!recover)}>{recover?'Cancel editing':'Edit private plan'}</button>{recover&&<GoalWizard recoverId={id}/>}</GoalModule>
 <GoalModule id="local-simulation" title={s.mode==='local'?'Local simulation':'Legacy execution adapter'} description={s.mode==='local'?'Simulation only — no real funds.':'Optional legacy controls'}>          <p className="notice">Simulation only — no real funds.</p>
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
</GoalModule>
 </div></fieldset>      <details className="panel verify">
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
</div>;
}
