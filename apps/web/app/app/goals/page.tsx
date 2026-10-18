"use client";
import { Suspense, lazy, useEffect, useState } from "react";
import Link from "next/link";
import "./collection.css";
import { GoalSummaryCard } from "../../../components/goal-card";
import { OrbitalArt } from "../../../components/orbital-art";
import { useUnifiedGoals } from "../../../components/use-unified-goals";
import { useGoals } from "../../../components/goal-provider";
import { CardOptions } from "../../../components/card-options";
import { ProgressSlot } from "../../../components/progress/slot";
import { PillarHero } from "../../../components/pillar-hero";
import { OrbitArt } from "../../../components/header-art/orbit-art";
import { GoalsGlyph } from "../../../components/header-art/glyphs/goals";
import {EmptyState} from "../../../components/ui/empty-state";
import { GoalMilestones } from "../../../components/bottom-sections";
import { useLocalToday } from "../../../components/use-local-today";
import { LayoutLockButton, LayoutPage, LayoutRegion, useLayoutPage } from "../../../components/layout-edit";
import { entityLayoutId } from "../../../lib/page-layout";
import { NebulaFlow } from "../../../components/nebula-flow";
import { useHealth } from "../../../components/health/use-health";
import { useHealthGoals } from "../../../components/health-goals/use-health-goals";
import { GoalsViewSwitch, type GoalsView } from "../../../components/goals/goals-view-switch";
import { LazyAchievementsHall as AchievementsHall, LazyAverageGoalCard as AverageGoalCard, LazyExtrasKeeper, LazyGoalsAltView as GoalsAltView, LazyGoalsFigures as GoalsFigures, LazyLifeBalanceCard as LifeBalanceCard, LazyTemplateTeaser as TemplateTeaser } from "../../../components/goals/lazy";
import { useAverageGoals } from "../../../components/goals/use-average-goals";
// Phase 2 (weights, never a raised budget): Health goals follow the cards; their section and editor load as a chunk.
const HealthGoalsSection = lazy(() => import("../../../components/health-goals/health-goals-section").then(m => ({default: m.HealthGoalsSection})));
export default function GoalsPage() {
  const collection = useUnifiedGoals();
  // Session Z-Cloud Part 4.3: plain words until Keplr is connected.
  const wallet = useGoals(), plainWords = wallet.mode === "local" && wallet.walletState !== "CONNECTED";
  const today = useLocalToday();
  // G3 (Session P): health goals read the Health journal and live in their own device key.
  const health = useHealth(), healthGoals = useHealthGoals();
  const [filter, setFilter] = useState("Active");
  // Session AA-Cloud Part 2: the average goals (G8), the goal extras (G2–G7) and three views of the same goals.
  const averages = useAverageGoals(), [view, setView] = useState<GoalsView>("cards");
  useEffect(() => { const v = new URLSearchParams(window.location.search).get("view"); if (v === "board" || v === "tree") queueMicrotask(() => setView(v)); }, []);
  const averageGoals = averages.loaded && !averages.unreadable ? averages.data.goals : [];
  const shownAverages = averageGoals.filter(g => filter === "All" || g.status === filter.toLowerCase());
  const keeperReady = collection.loaded && !collection.error && healthGoals.loaded && !healthGoals.unreadable && averages.loaded && !averages.unreadable;
  const [query,setQuery]=useState(''),[sort,setSort]=useState('pinned'),[page,setPage]=useState(0);
  const total=collection.goals.length,large=total>24;
  const visible=collection.goals.filter(g=>(filter==='All'||g.status===filter.toLowerCase())&&(!large||g.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())));
  if(large&&sort!=='pinned')visible.sort((a,b)=>(sort==='name-desc'?-1:1)*a.name.localeCompare(b.name,undefined,{numeric:true})||a.key.localeCompare(b.key));
  const count=visible.length,pages=Math.max(1,Math.ceil(count/24)),currentPage=Math.min(page,pages-1),displayed=large?visible.slice(currentPage*24,(currentPage+1)*24):visible;
  const changePage=(next:number)=>{setPage(next);document.getElementById('goal-collection-controls')?.focus();};
  return <LayoutPage page="goals"><div className="goals-page dashboard platform-workspace">
    <PillarHero pillar="goals" titleId="goals-title" className="goals-heading page-heading" eyebrow="A destination worth building" title="Your Goals" lede="Small steps. A bigger future. Every plan starts with you." buttons={<Link className="primary" href="/app/goals/new">+ Create a goal</Link>} about="goals" art={<OrbitArt glyph={GoalsGlyph} tone="goals"/>}/><LayoutLockButton/>
    {keeperReady && <LazyExtrasKeeper liveKeys={[...collection.goals.map(g => g.key), ...healthGoals.data.goals.map(g => `health:${g.id}`)]} ready/>}
    {/* Session AB-Design (owner request 15): the filters on the left, the Cards / Vision board / Tree switch at the right end; the count lives in the Active filter's name; Positions stays reachable from the page's ⋯ menu (never removed). */}
    {!!total && <div className="goals-toolbar"><nav className="tab-row view-tabs goal-view-filters" aria-label="Goal views">{["Active", "Completed", "Closed", "All"].map(v => <button key={v} aria-pressed={filter === v} aria-description={filter === v ? `${count + shownAverages.length} ${count + shownAverages.length === 1 ? "destination" : "destinations"}` : undefined} onClick={() => {setFilter(v);setPage(0);}}>{v}</button>)}</nav><div className="goals-toolbar-end"><GoalsViewSwitch view={view} onChange={setView}/><CardOptions label="Goals"><Link href="/app/staking#positions">Positions →</Link></CardOptions></div></div>}
    {collection.error&&<p role="alert" className="notice">{collection.error}</p>}
    {large&&<section id="goal-collection-controls" className="goal-collection-controls" aria-label="Browse Goals" tabIndex={-1}><label>Search Goals<input aria-label="Search Goals" type="search" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/></label><label>Sort Goals<select aria-label="Sort Goals" value={sort} onChange={e=>{setSort(e.target.value);setPage(0);}}><option value="pinned">Pinned first</option><option value="name-asc">Name A–Z</option><option value="name-desc">Name Z–A</option></select></label>{pages>1&&<nav className="goal-collection-pages" aria-label="Goals pages"><button className="secondary" aria-label="Previous Goals page" disabled={currentPage===0} onClick={()=>changePage(currentPage-1)}>Previous</button><span role="status">Page {currentPage+1} of {pages}</span><button className="secondary" aria-label="Next Goals page" disabled={currentPage+1===pages} onClick={()=>changePage(currentPage+1)}>Next</button></nav>}</section>}
    {!collection.loaded ? <p role="status">Loading your local goals…</p> : <LayoutRegion region="body" items={[
      {id:"goals:collection",label:"Your Goals",node:(view === "board" || view === "tree") && (total || averageGoals.length) ? <GoalsAltView view={view} goals={visible} averages={shownAverages}/> : total || averageGoals.length ? <section className="goal-grid" aria-label="Your goals">{large?displayed.map(g=><GoalSummaryCard key={g.key} summary={g}/>):<LayoutRegion region="cards" grid allIds={[...collection.goals.map(g=>entityLayoutId(g.key)),...averageGoals.map(g=>entityLayoutId(`average:${g.id}`))]} items={[...displayed.map(g=>({id:entityLayoutId(g.key),label:g.name,node:<GoalSummaryCard summary={g}/>})),...shownAverages.map(g=>({id:entityLayoutId(`average:${g.id}`),label:g.name,node:<AverageGoalCard goal={g}/>}))]}/>}{large&&shownAverages.map(g=><AverageGoalCard key={g.id} goal={g}/>)}</section> : <section className="destination-state"><OrbitalArt/><p className="eyebrow">Start with what matters</p><h2><NebulaFlow identity="goals-destination-title">A destination for your next chapter.</NebulaFlow></h2><p>A home. A safety net. A trip you’ve been waiting for.<br/> {plainWords ? "Give your savings a purpose." : "Give your ZIG a purpose."}</p><Link className="primary" href="/app/goals/new">Plan my first goal →</Link></section>},
      // Session AB-Design (owner request 14): the summary figures are their own movable block, after the cards by default.
      !!(total || averageGoals.length) && {id:"goals:summary",label:"Your goals at a glance",node:<div className="goals-summary-item"><GoalsFigures goals={collection.goals} averages={averageGoals}/></div>},
      !!total && !count && {id:"goals:filter-empty",label:"No Goals in this view",node:<EmptyState as="section" level={2} className="panel empty-small" zigi="curious" title={query.trim()?"No matching goals.":`No ${filter.toLowerCase()} goals.`} action={<button className="secondary" onClick={() => {setFilter("All");setQuery("");setPage(0);}}>View all goals</button>}>{query.trim()?"Try a different name or clear your search.":"Your other destinations are under All. Closed Goals keep their history."}</EmptyState>},
      // Session AA-Cloud Part 1: Health goals are goals too, so they follow the cards; the timeline is a summary.
      // A wrapper takes the region's attributes, so the Health goals section can be moved like the others (it never could on main).
      {id:"goals:health",label:"Health goals",node:<div className="goals-health-item"><Suspense fallback={null}><HealthGoalsSection goals={healthGoals} health={health.data} healthLoaded={health.loaded&&!health.error}/></Suspense></div>},
      {id:"goals:balance",label:"Life balance",node:<LifeBalanceCard/>},
      // Session AA-Cloud (order rule): the templates are a tool, then the Hall of finished goals; Milestones ahead stays the
      // page's last section, as every main page ends with its timeline (ui-design-pass Part 8).
      {id:"goals:templates",label:"Goal templates",node:<TemplateTeaser/>},
      {id:"goals:hall",label:"Hall of achievements",node:<AchievementsHall/>},
      {id:"goals:milestones",label:"Milestones ahead",node:<GoalMilestones goals={collection.goals} today={today}/>},
    ]}/>}
    <div className="page-game-slot"><ProgressSlot page="goals"/></div>
    {large&&<LargeCollectionNote/>}
  </div></LayoutPage>;
}
/** Past 24 Goals, search, sort and pages decide the order; say so while the page is unlocked. */
function LargeCollectionNote(){const page=useLayoutPage();return page?.unlocked?<p className="notice" role="status">With more than 24 Goals, cards follow search, sort and page order. The page sections can still be arranged.</p>:null;}
