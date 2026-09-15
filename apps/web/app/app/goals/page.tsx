"use client";
import { useState } from "react";
import Link from "next/link";
import { useGoals } from "../../../components/goal-provider";
import { GoalCard } from "../../../components/goal-card";
import { OrbitalArt } from "../../../components/orbital-art";
export default function GoalsPage() {
  const s = useGoals();
  const [filter, setFilter] = useState("Active");
  const visible = s.goals.filter(goal => filter === "All" || (filter === "Closed" ? goal.status === "closed" : goal.status === "active"));
  return <div className="goals-page dashboard">
    <div className="page-heading"><div><p className="eyebrow">A destination worth building</p><h1>Your goals.</h1><p>Small steps. A bigger future. Every plan starts with you.</p></div><Link className="primary" href="/app/goals/new">+ Create a goal</Link></div>
    <p className="local-label">{s.mode === "local" ? "Local demo · simulated financial progress" : "Testnet wallet view · financial execution unavailable in the public Alpha"}</p>
    {!!s.goals.length && <div className="goals-toolbar"><nav className="view-tabs" aria-label="Goal views">{["Active", "All", "Closed"].map(view => <button key={view} aria-pressed={filter === view} onClick={() => setFilter(view)}>{view}</button>)}</nav><span>{visible.length} {visible.length === 1 ? "destination" : "destinations"}</span></div>}
    {!s.loaded ? <p role="status">Loading your local goals…</p> : s.goals.length ? <section className="goal-grid" aria-label="Your goals">{visible.map(goal => <GoalCard key={goal.id} goal={goal} plan={s.metadata?.goals[goal.id]}/>)}</section> : <section className="destination-state"><OrbitalArt/><p className="eyebrow">Start with what matters</p><h2>A destination for your <span className="nebula-text">next chapter.</span></h2><p>A home. A safety net. A trip you’ve been waiting for.<br/> Give your ZIG a purpose.</p><Link className="primary" href="/app/goals/new">Plan my first goal →</Link></section>}
    {s.loaded && !!s.goals.length && !visible.length && <section className="panel empty-small"><h2>No {filter.toLowerCase()} goals.</h2><p>Your other destinations are under All. Closed Goals keep their history.</p><button className="secondary" onClick={() => setFilter("All")}>View all goals</button></section>}
  </div>;
}
