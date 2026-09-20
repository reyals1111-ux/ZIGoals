"use client";
import { useState } from "react";
import { ActivityFeed } from "../../../components/activity-feed";
import Link from "next/link";
import { ExplorerLinks } from "../../../components/explorer-links";
import { useGoals } from "../../../components/goal-provider";
import {
  pendingDescription,
  isTerminal,
} from "../../../lib/transaction-journal";
import { formatUnits, TESTNET } from "@zigoals/chain-config";
export default function ActivityPage() {
  const s = useGoals();
  const [category, setCategory] = useState("ALL");
  const [limit, setLimit] = useState(30);
  return (
    <div className="activity-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Every step forward</p>
          <h1>Activity.</h1>
          <p>
            {s.mode === "local"
              ? "Your Goals, wealth, habits and health — a private history of the steps you take."
              : "Known transactions saved on this device for this wallet and chain. This is incomplete history; other wallets, devices, and applications are not indexed."}
          </p>
        </div>
      </div>
      <section className="panel activity-timeline" aria-label="Unified private activity"><div className="activity-filter-row"><div><p className="eyebrow">YOUR PROGRESS, IN MOMENTS</p><h2>One journey. Every step.</h2></div><nav className="tab-row view-tabs" aria-label="Activity categories">{["ALL", "GOAL", "WEALTH", "HABIT", "HEALTH"].map(value => <button key={value} aria-pressed={category === value} onClick={() => { setCategory(value); setLimit(30); }}>{value === "ALL" ? "All" : value[0] + value.slice(1).toLowerCase()}</button>)}</nav></div><ActivityFeed limit={limit} category={category} onMore={() => setLimit(value => value + 30)}/><p className="fine">Habit and Health entries reflect current saved logs. Corrections update this view; removing a log removes it here. This is private browser history, separate from testnet receipts.</p></section>
      <p className="eyebrow">
        {s.historySource} ·{" "}
        {s.mode === "local"
          ? "Local simulation history"
          : "Known local receipts only · Incomplete"}
      </p>
      {s.mode === "testnet" && s.owner && (
        <button
          className="button secondary"
          onClick={() =>
            void s.refresh().catch((error) => s.setError(String(error)))
          }
        >
          Check known receipts
        </button>
      )}
      {s.mode === "testnet" && (
        <section
          className="panel"
          aria-label="Saved testnet transaction history"
        >
          {s.journalRecords.length ? (
            s.journalRecords.map((record) => (
              <div className="activity-row" key={record.operationId}>
                <div>
                  <strong>
                    {record.action} · {record.state.replaceAll("_", " ")}
                  </strong>
                  <small>{new Date(record.createdAt).toLocaleString()}</small>
                  <p>
                    {!isTerminal(record.state)
                      ? pendingDescription(record)
                      : record.state === "CONFIRMED"
                        ? `Confirmed at block ${record.height}.`
                        : record.state === "REJECTED"
                          ? "Cancelled in wallet before broadcast."
                          : record.hash
                            ? "Execution failed; a network fee may have been charged."
                            : "Stopped before a broadcast was recorded."}
                  </p>
                </div>
                {record.goalId ? (
                  <Link href={`/app/goals/${record.goalId}`}>
                    {s.metadata?.goals[record.goalId]?.name ??
                      `Goal #${record.goalId}`}
                  </Link>
                ) : (
                  <span>Create goal</span>
                )}
                <span>
                  {record.amount !== "0"
                    ? `${formatUnits(record.amount, TESTNET.nativeAsset.decimals)} ZIG`
                    : ""}
                </span>
                {record.hash && (
                  <div>
                    <p style={{ overflowWrap: "anywhere" }}>
                      Transaction {record.hash}
                    </p>
                    <ExplorerLinks
                      chainId={record.chainId}
                      kind="transaction"
                      identifier={record.hash}
                    />
                  </div>
                )}
              </div>
            ))
          ) : (
            <p>
              No saved transactions for this wallet and chain. This does not
              prove the wallet has no onchain history.
            </p>
          )}
        </section>
      )}
      {s.mode === "local" && (
        <details className="panel legacy-goal-history"><summary>Detailed Goal simulation history</summary>
          {s.activity.length ? (
            s.activity.map((a, i) => (
              <div className="activity-row" key={i}>
                <span className="activity-symbol" aria-hidden="true">
                  ↗
                </span>
                <div>
                  <strong>{a.action}</strong>
                  <small>{new Date(a.timestamp).toLocaleString()}</small>
                </div>
                <Link href={`/app/goals/${a.goalId}`}>
                  {s.metadata?.goals[a.goalId]?.name ?? `Goal #${a.goalId}`}
                </Link>
                <span>
                  {a.amount !== "0"
                    ? formatUnits(a.amount, TESTNET.nativeAsset.decimals) +
                      " ZIG"
                    : ""}
                </span>
              </div>
            ))
          ) : (
            <div className="empty-small">
              <h2>Your next step starts here.</h2>
              <p>Creating and funding a goal will appear in your activity.</p>
              <Link href="/app/goals" className="text-link">
                Go to goals →
              </Link>
            </div>
          )}
        </details>
      )}
    </div>
  );
}
