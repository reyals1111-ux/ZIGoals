"use client";
import Link from "next/link";
import { useGoals } from "../../components/goal-provider";
import { GoalCard } from "../../components/goal-card";
export default function Dashboard() {
  const s = useGoals();
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">A little closer, every month</p>
          <h1>Your goals.</h1>
          <p>Give your ZIG a purpose. Build a plan you can follow.</p>
        </div>
        <Link href="/app/goals/new" className="primary">
          + Create a goal
        </Link>
      </div>
      <div className="overview">
        <div>
          <small>Active goals</small>
          <strong>{s.goals.filter((g) => g.status === "active").length}</strong>
        </div>
        <div>
          <small>Funding health</small>
          <strong>Built on your contributions</strong>
          <span>0% future return assumed</span>
        </div>
        <div>
          <small>Current strategy</small>
          <strong>Idle</strong>
          <span>No external investment strategy active</span>
        </div>
      </div>
      {!s.loaded ? (
        <p role="status">Loading your local goals…</p>
      ) : s.goals.length ? (
        <div className="goal-grid">
          {s.goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              plan={s.metadata?.goals[goal.id]}
            />
          ))}
        </div>
      ) : (
        <section className="empty-state">
          <div className="destination-mark" aria-hidden="true">
            ◎
          </div>
          <p className="eyebrow">Start with what matters</p>
          <h2>A destination for your next chapter.</h2>
          <p>
            An emergency fund. A first home. Somewhere you’ve always wanted to
            go.
            <br />
            Create your first goal and see what it takes to get there.
          </p>
          <Link href="/app/goals/new" className="primary">
            Plan my first goal →
          </Link>
          <p className="fine">
            {s.mode === "local"
              ? "Try the complete local flow with 1,000 simulated ZIG."
              : "Testnet contract actions become available after verified deployment."}
          </p>
        </section>
      )}
      <aside className="principle">
        <span aria-hidden="true">◇</span>
        <div>
          <strong>Progress first. You stay in control.</strong>
          <p>
            Monthly contributions are a plan, never automatic debits. Every
            testnet action needs your wallet approval.
          </p>
        </div>
        <Link href="/app/settings" className="text-link">
          Back up goal data →
        </Link>
      </aside>
    </>
  );
}
