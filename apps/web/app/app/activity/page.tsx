"use client";
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
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Every step forward</p>
          <h1>Activity.</h1>
          <p>
            {s.mode === "local"
              ? "A history of your local simulation. No onchain transactions."
              : "Known transactions saved on this device for this wallet and chain. This is incomplete history; other wallets, devices, and applications are not indexed."}
          </p>
        </div>
      </div>
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
        <section className="panel">
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
              <Link href="/app" className="text-link">
                Go to goals →
              </Link>
            </div>
          )}
        </section>
      )}
    </>
  );
}
