"use client";
import Link from "next/link";
import { useGoals } from "../../../components/goal-provider";
import { GoalCard } from "../../../components/goal-card";
import { OrbitalArt } from "../../../components/orbital-art";
export default function GoalsPage() {
  const s = useGoals();
  return <div className="goals-page dashboard">
    <div className="page-heading"><div><p className="eyebrow">A destination worth building</p><h1>Your goals.</h1><p>Small steps. A bigger future. Every plan starts with you.</p></div><Link className="primary" href="/app/goals/new">+ Create a goal</Link></div>
    <p className="local-label">{s.mode === "local" ? "Local demo · simulated financial progress" : "Testnet wallet view · financial execution unavailable in the public Alpha"}</p>
    {!s.loaded ? <p role="status">Loading your local goals…</p> : s.goals.length ? <section className="goal-grid" aria-label="Your goals">{s.goals.map(goal => <GoalCard key={goal.id} goal={goal} plan={s.metadata?.goals[goal.id]}/>)}</section> : <section className="destination-state"><OrbitalArt/><p className="eyebrow">Start with what matters</p><h2>A destination for your <span className="nebula-text">next chapter.</span></h2><p>A home. A safety net. A trip you’ve been waiting for.<br/> Give your ZIG a purpose.</p><Link className="primary" href="/app/goals/new">Plan my first goal →</Link></section>}
  </div>;
}
