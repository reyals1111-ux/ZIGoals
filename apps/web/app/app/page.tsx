"use client";
import Link from "next/link";
import { useGoals } from "../../components/goal-provider";
import { GoalCard } from "../../components/goal-card";
import { OrbitalArt } from "../../components/orbital-art";
export default function Dashboard() {
  const s = useGoals();
  return (
    <div className="dashboard">
      <section className="dashboard-hero" aria-labelledby="dashboard-title">
        <div className="hero-copy">
          <p className="eyebrow">Your financial orbit</p>
          <h1 id="dashboard-title">Turn today’s ZIG<br /><span className="nebula-text">into tomorrow’s you.</span></h1>
          <p>Set goals. Build a steady habit. Explore your next chapter<br className="desktop-break" /> with simulated ZIG in the public Alpha.</p>
          <div className="hero-actions">
            <Link href="/app/goals/new" className="primary">+ Create a goal</Link>
            <a href="#how-it-works" className="text-link">See how it works <span aria-hidden="true">↗</span></a>
          </div>
        </div>
        <OrbitalArt className="hero-orbit" />
      </section>
      <div className="dashboard-stats">
        <div className="stat-card stat-featured">
          <small>Active goals</small>
          <strong>{s.goals.filter((g) => g.status === "active").length}</strong>
          <span>Your next chapter starts here</span>
        </div>
        <div className="stat-card">
          <small>Funding health</small>
          <strong>Built on your contributions</strong>
          <span>0% future return assumed</span>
        </div>
        <div className="stat-card">
          <small>Current strategy</small>
          <strong>Idle</strong>
          <span>No external investment strategy active</span>
        </div>
      </div>
      {!s.loaded ? (
        <p role="status">Loading your local goals…</p>
      ) : s.goals.length ? (
        <section aria-label="Your goals" className="goal-grid">
          {s.goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              plan={s.metadata?.goals[goal.id]}
            />
          ))}
        </section>
      ) : (
        <section className="destination-state" aria-labelledby="destination-title">
          <OrbitalArt />
          <p className="eyebrow">Start with what matters</p>
          <h2 id="destination-title">A destination for<br className="mobile-break" /> your <span className="nebula-text">next chapter.</span></h2>
          <p>
            A home. A safety net. A trip you’ve been waiting for.
            <br />{" "}
            Give your ZIG a purpose.
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
      <section className="ecosystem-invitation">
        <div>
          <strong>Explore the ZIGChain ecosystem</strong>
          <p>
            Public verification tools, official Hub links and sourced provider
            research.
          </p>
        </div>
        <Link href="/app/ecosystem" className="text-link">
          Explore the ecosystem →
        </Link>
      </section>
      <aside className="principle" id="how-it-works" aria-label="How it works">
        <span aria-hidden="true">◇</span>
        <div>
          <strong>Progress first. You stay in control.</strong>
          <p>
            Create a goal, plan your contributions and track progress in the local simulation.
            Monthly contributions are a plan, never automatic debits. The public Alpha supports
            wallet connection only; blockchain financial execution is disabled.
          </p>
        </div>
        <Link href="/app/settings" className="text-link">
          Back up goal data →
        </Link>
      </aside>
    </div>
  );
}
