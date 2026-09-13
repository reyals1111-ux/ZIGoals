"use client";
import Link from "next/link";
import { useGoals } from "../../../components/goal-provider";
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
              : "Confirmed actions in this browser session. The explorer holds complete onchain history."}
          </p>
        </div>
      </div>
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
                  ? formatUnits(a.amount, TESTNET.nativeAsset.decimals) + " ZIG"
                  : ""}
              </span>
              {a.hash && (
                <a
                  href={TESTNET.explorerTxBaseUrl + a.hash}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Explorer ↗
                </a>
              )}
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
    </>
  );
}
