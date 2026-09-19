"use client";
import { useState } from "react";
import Link from "next/link";
import { GoalSummaryCard } from "../../../components/goal-card";
import { OrbitalArt } from "../../../components/orbital-art";
import { useUnifiedGoals } from "../../../components/use-unified-goals";
import { PlatformNav } from "../../../components/platform/common";
export default function GoalsPage() {
  const collection = useUnifiedGoals();
  const [filter, setFilter] = useState("Active");
  const visible = collection.goals.filter(g=>filter==='All'||g.status===filter.toLowerCase());
  const total=collection.goals.length,count=visible.length;
  return <div className="goals-page dashboard platform-workspace">
    <div className="page-heading"><div><p className="eyebrow">A destination worth building</p><h1>Your goals.</h1><p>Small steps. A bigger future. Every plan starts with you.</p></div><Link className="primary" href="/app/goals/new">+ Create a goal</Link></div>
    <PlatformNav/>{collection.error&&<p role="alert" className="notice">{collection.error}</p>}
    {!!total && <div className="goals-toolbar"><nav className="tab-row view-tabs" aria-label="Goal views">{["Active", "Completed", "Closed", "All"].map(view => <button key={view} aria-pressed={filter === view} onClick={() => setFilter(view)}>{view}</button>)}</nav><span>{count} {count === 1 ? "destination" : "destinations"}</span></div>}
    {!collection.loaded ? <p role="status">Loading your local goals…</p> : total ? <section className="goal-grid" aria-label="Your goals">{visible.map(g=><GoalSummaryCard key={g.key} summary={g}/>)}</section> : <section className="destination-state"><OrbitalArt/><p className="eyebrow">Start with what matters</p><h2>A destination for your <span className="nebula-text">next chapter.</span></h2><p>A home. A safety net. A trip you’ve been waiting for.<br/> Give your ZIG a purpose.</p><Link className="primary" href="/app/goals/new">Plan my first goal →</Link></section>}
    {collection.loaded && !!total && !count && <section className="panel empty-small"><h2>No {filter.toLowerCase()} goals.</h2><p>Your other destinations are under All. Closed Goals keep their history.</p><button className="secondary" onClick={() => setFilter("All")}>View all goals</button></section>}
  </div>;
}
