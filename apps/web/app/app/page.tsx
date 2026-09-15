"use client";
import Link from "next/link";
import { formatUnits, TESTNET } from "@zigoals/chain-config";
import { useGoals } from "../../components/goal-provider";
import { GoalCard } from "../../components/goal-card";
import { SceneArt } from "../../components/scene-art";
import { AppIcon } from "../../components/app-icon";
import { ActivityFeed } from "../../components/activity-feed";
import { HabitsToday } from "../../components/habits/habits-today";
import { HealthToday } from "../../components/health/health-today";
export default function Dashboard() {
  const s = useGoals();
  const active = s.goals.filter(goal => goal.status === "active");
  const allocated = s.goals.reduce((total, goal) => total + BigInt(goal.position_units), 0n).toString();
  return <div className="today-page">
    <div className="today-layout">
      <div className="today-primary">
        <section className="today-hero" aria-labelledby="dashboard-title">
          <div className="cosmic-glow ambient-light" aria-hidden="true"/>
          <div className="today-hero-copy">
            <p className="eyebrow">Your financial orbit</p>
            <h1 id="dashboard-title">Turn today’s ZIG<br/>into <span className="nebula-text">tomorrow’s you.</span></h1>
            <p>Set goals. Build habits. Protect your health.<br/>Make room for a brighter tomorrow.</p>
            <div className="hero-actions"><Link className="primary" href="/app/goals/new">+ Create a goal</Link><a href="#how-it-works" className="secondary"><span className="play-medallion"><AppIcon name="play" luminous/></span> See how it works</a></div>
            <p className="hero-truth">Testnet Alpha · simulated financial progress · private daily tracking</p>
          </div>
          <div className="hero-pillars" aria-label="Your connected journey">
            <div><span className="icon-medallion"><AppIcon name="goals" size={32} luminous/></span><span><strong>Your goals</strong><small>Give your ZIG a purpose.</small></span></div>
            <div><span className="icon-medallion"><AppIcon name="future" size={30} luminous/></span><span><strong>Your future</strong><small>Build habits. Live well.</small></span></div>
            <div><span className="icon-medallion"><AppIcon name="chain" size={30} luminous/></span><span><strong>Onchain</strong><small>ZIGChain vision · Alpha simulation.</small></span></div>
          </div>
        </section>
        <section className="today-goals surface-featured" aria-label="Your goals">
          <div className="section-heading"><div><h2>Your goals</h2><p>Small steps. A bigger future.</p></div><Link href="/app/goals" className="text-link">View all goals →</Link></div>
          {!s.loaded ? <p role="status">Loading your local goals…</p> : s.goals.length ? <div className="today-goals-grid">{s.goals.slice(0,3).map(goal => <GoalCard key={goal.id} goal={goal} plan={s.metadata?.goals[goal.id]} compact/>)}<Link href="/app/goals/new" className="new-destination-card"><span aria-hidden="true">＋</span><strong>Create a new goal</strong><small>A new destination<br/>is waiting.</small></Link></div> : <div className="today-goal-empty"><div><AppIcon name="goals" size={42}/><h3>A plan with your name on it.</h3><p>Choose what matters. Set a target. See the next step.</p><Link className="text-link" href="/app/goals/new">Create your first goal →</Link></div><SceneArt scene="home"/></div>}
          <p className="local-label">{s.mode === "local" ? "Local demo · simulated ZIG, never wallet funds" : "Testnet wallet view · contract not deployed"}</p>
        </section>
        <section className="progress-summary" aria-label="Your financial progress">
          <div className="section-heading"><div><h2>Your progress</h2><p>Built on your contributions.</p></div><span className="pill">Idle strategy</span></div>
          <div className="progress-stats"><div><AppIcon name="goals"/><strong>{active.length}</strong><small>Active goals</small></div><div><AppIcon name="activity"/><strong>{formatUnits(allocated, TESTNET.nativeAsset.decimals)} <span>ZIG</span></strong><small>{s.mode === "local" ? "Simulated allocation" : "Known goal allocation"}</small></div><div><AppIcon name="ecosystem"/><strong>0%</strong><small>Future return assumed</small></div></div>
        </section>
        <div className="today-daily"><HabitsToday/><HealthToday/></div>
        {active[0] && <div className="next-step"><span className="eyebrow">Your next goal action</span><Link href={`/app/goals/${active[0].id}`} className="text-link">Review {s.metadata?.goals[active[0].id]?.name ?? `Goal #${active[0].id}`} →</Link></div>}
      </div>
      <aside className="today-rail" aria-label="Your next chapter">
        <section className="account-panel"><div><h2>Your wallet <span className="pill">{s.mode === "local" ? "Local demo" : "Testnet"}</span></h2><strong className="account-value">{formatUnits(s.balance, TESTNET.nativeAsset.decimals)} <span>ZIG</span></strong><p>{s.mode === "local" ? "Simulated balance · this browser" : `${s.owner.slice(0,10)}…${s.owner.slice(-5)}`}</p><Link href="/app/settings" className="secondary account-action"><AppIcon name="wallet" luminous/>Wallet &amp; data →</Link></div></section>
        <section className="destination-panel" aria-labelledby="destination-title"><div><p className="eyebrow">Start with what matters</p><h2 id="destination-title">A destination for your <span className="nebula-text">next chapter.</span></h2><p>A home. A safety net. A trip you’ve been waiting for. Give your ZIG a purpose.</p><Link href="/app/goals/new" className="primary">{s.goals.length ? "Plan my next goal →" : "Plan my first goal →"}</Link><div className="destination-steps"><div><AppIcon name="settings" luminous/><strong>Set a goal</strong><small>Define your future</small></div><div><AppIcon name="goals" luminous/><strong>Stay consistent</strong><small>Track your progress</small></div><div><AppIcon name="today" luminous/><strong>Reach farther</strong><small>A brighter tomorrow</small></div></div></div></section>
        <section className="recent-panel"><div className="section-heading"><h2>Recent activity</h2><Link href="/app/activity" className="text-link">View all →</Link></div><ActivityFeed limit={4}/></section>
      </aside>
    </div>
    <section id="how-it-works" className="journey-panel" aria-label="How it works"><div><p className="eyebrow">One journey. Your pace.</p><h2>Where you’re going.<br/><span className="nebula-text">What you do today.</span></h2></div><ol><li><strong>01 · Set your destination</strong><p>A Goal gives your plan a purpose. Financial planning stays in the local simulation during this Alpha.</p></li><li><strong>02 · Find your rhythm</strong><p>Link a Habit to a Goal, or build one just for yourself. Check in and see consistency grow.</p></li><li><strong>03 · Care for the journey</strong><p>Keep nutrition, weight and activity private on this device. Wallet connection never enables financial execution.</p></li></ol><Link href="/app/ecosystem" className="text-link">Explore the ZIGChain ecosystem →</Link></section>
  </div>;
}
