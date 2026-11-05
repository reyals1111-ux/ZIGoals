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
import { GoalMilestones } from "../../../components/bottom-goal-milestones";
import { useLocalToday } from "../../../components/use-local-today";
import { LayoutLockButton, LayoutPage, LayoutRegion, useLayoutPage } from "../../../components/layout-edit";
import { entityLayoutId } from "../../../lib/page-layout";
import { NebulaFlow } from "../../../components/nebula-flow";
import { useHealth } from "../../../components/health/use-health";
import { useHealthGoals } from "../../../components/health-goals/use-health-goals";
import { GoalsViewSwitch, type GoalsView } from "../../../components/goals/goals-view-switch";
import { LazyAchievementsHall as AchievementsHall, LazyAverageGoalCard as AverageGoalCard, LazyExtrasKeeper, LazyGoalsAltView as GoalsAltView, LazyGoalsFigures as GoalsFigures, LazyLifeBalanceCard as LifeBalanceCard, LazyTemplateTeaser as TemplateTeaser } from "../../../components/goals/lazy";
import { useAverageGoals } from "../../../components/goals/use-average-goals";
import { isFinished } from "../../../lib/goals/finished";
import { useGoalExtras } from "../../../components/goals/use-goal-extras";
import { areasOf } from "../../../lib/goal-extras/store";
// Phase 2 (weights, never a raised budget): Health goals follow the cards; their section and editor load as a chunk.
const HealthGoalsSection = lazy(() => import("../../../components/health-goals/health-goals-section").then(m => ({default: m.HealthGoalsSection})));
// Session AL third pass (GAP-119): debts tracked in Wealth, as goals to reach zero (read-only, its own chunk).
const DebtPaydownCard = lazy(() => import("../../../components/goals/debt-paydown-card"));
// Session AL sweep 4 (C-BN-23): the rating goals set on Chess, read-only, with the goals (its own chunk, imports goals.css).
const ChessRatingGoals = lazy(() => import("../../../components/goals/chess-rating-goals"));
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
  // Session AL (DV-022f, P-DV-62): the status filter lives in the address too (?filter=completed), so a view switch, a
  // reload or a shared link keeps it.
  useEffect(() => { const q = new URLSearchParams(window.location.search), v = q.get("view"), f = q.get("filter"); const known = ["Active", "Completed", "Closed", "All"].find(x => x.toLowerCase() === f); queueMicrotask(() => { if (v === "board" || v === "tree") setView(v); if (known) setFilter(known); }); }, []);
  const chooseFilter = (v: string) => { setFilter(v); setPage(0); try { const url = new URL(window.location.href); if (v === "Active") url.searchParams.delete("filter"); else url.searchParams.set("filter", v.toLowerCase()); window.history.replaceState(window.history.state, "", url); } catch { /* the filter still changes */ } };
  const averageGoals = averages.loaded && !averages.unreadable ? averages.data.goals : [];
  const shownAverages = averageGoals.filter(g => filter === "All" || g.status === filter.toLowerCase());
  const keeperReady = collection.loaded && !collection.error && healthGoals.loaded && !healthGoals.unreadable && averages.loaded && !averages.unreadable;
  const [query,setQuery]=useState(''),[sort,setSort]=useState('pinned'),[page,setPage]=useState(0);
  // Session AL fourth pass (DV-022b): goals sorted by life area, so each area's goals sit together (no area last).
  const goalExtras=useGoalExtras(),areaLabels=new Map(goalExtras.loaded&&!goalExtras.unreadable?areasOf(goalExtras.data).map(a=>[a.id,a.label] as const):[]);
  const areaName=(key:string)=>{const id=goalExtras.loaded&&!goalExtras.unreadable?goalExtras.data.goals[key]?.area:undefined;return id?areaLabels.get(id)??'':'';};
  // Session AL third pass (BUG-064, P-DVR-35): search and sort from 4 goals (they appeared only past 24); pages stay past 24.
  const total=collection.goals.length,large=total>24,browse=total>=4;
  // Session AL (DV-058a, P-DV-22): Completed lists every finished goal, closed-after-reaching included.
  const visible=collection.goals.filter(g=>(filter==='All'||(filter==='Completed'?isFinished(g):g.status===filter.toLowerCase()))&&(!browse||g.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())));
  if(browse&&sort!=='pinned')visible.sort(goalSort(sort,areaName));
  // A search or a sort shows the cards in that order; "Pinned first" keeps the order the person arranged.
  const ordered=large||(browse&&(sort!=='pinned'||!!query.trim()));
  const count=visible.length,pages=Math.max(1,Math.ceil(count/24)),currentPage=Math.min(page,pages-1),displayed=large?visible.slice(currentPage*24,(currentPage+1)*24):visible;
  const changePage=(next:number)=>{setPage(next);document.getElementById('goal-collection-controls')?.focus();};
  return <LayoutPage page="goals"><div className="goals-page dashboard platform-workspace">
    <PillarHero pillar="goals" titleId="goals-title" className="goals-heading page-heading" eyebrow="A destination worth building" title="Your Goals" lede="Small steps. A bigger future. Every plan starts with you." buttons={<Link className="primary" href="/app/goals/new">+ Create a goal</Link>} about="goals" art={<OrbitArt glyph={GoalsGlyph} tone="goals"/>}/><LayoutLockButton/>
    {keeperReady && <LazyExtrasKeeper liveKeys={[...collection.goals.map(g => g.key), ...healthGoals.data.goals.map(g => `health:${g.id}`)]} ready/>}
    {/* Session AB-Design (owner request 15): the filters on the left, the Cards / Vision board / Tree switch at the right end; the count lives in the Active filter's name; Positions stays reachable from the page's ⋯ menu (never removed). */}
    {!!total && <div className="goals-toolbar"><nav className="tab-row view-tabs goal-view-filters" aria-label="Goal views">{["Active", "Completed", "Closed", "All"].map(v => <button key={v} aria-pressed={filter === v} aria-description={filter === v ? `${count + shownAverages.length} ${count + shownAverages.length === 1 ? "destination" : "destinations"}` : undefined} onClick={() => chooseFilter(v)}>{v}</button>)}</nav><div className="goals-toolbar-end"><GoalsViewSwitch view={view} onChange={setView}/><CardOptions label="Goals">{/* Session AL (DV-022b, P-DV-61): the list menu says what Positions is and offers the other ways to start */}<Link href="/app/goals/templates">Goal templates</Link><Link href="/app/goals/average/new">Keep an average…</Link><Link href="/app/staking#positions" aria-describedby="goals-positions-why">Positions →</Link><p className="fine" id="goals-positions-why" style={{margin:"2px 12px 6px"}}>Every holding that counts toward your goals, in one list.</p></CardOptions></div></div>}
    {collection.error&&<p role="alert" className="notice">{collection.error}</p>}
    {browse&&<section id="goal-collection-controls" className="goal-collection-controls" aria-label="Browse Goals" tabIndex={-1}><label>Search Goals<input aria-label="Search Goals" type="search" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/></label><label>Sort Goals<select aria-label="Sort Goals" value={sort} onChange={e=>{setSort(e.target.value);setPage(0);}}><option value="pinned">Pinned first</option><option value="name-asc">Name A–Z</option><option value="name-desc">Name Z–A</option><option value="progress-desc">Most progress first</option><option value="date-asc">Target date, soonest first</option><option value="area">By life area</option></select></label>{pages>1&&<nav className="goal-collection-pages" aria-label="Goals pages"><button className="secondary" aria-label="Previous Goals page" disabled={currentPage===0} onClick={()=>changePage(currentPage-1)}>Previous</button><span role="status">Page {currentPage+1} of {pages}</span><button className="secondary" aria-label="Next Goals page" disabled={currentPage+1===pages} onClick={()=>changePage(currentPage+1)}>Next</button></nav>}</section>}
    {/* CI fix (page-order-aa): a layout item's node takes the region's attributes (cloneElement), which a fragment cannot
        hold, so the cards, debts and chess goals share one wrapper: "Your Goals" is a movable block again. */}
    {!collection.loaded ? <p role="status">Loading your local goals…</p> : <LayoutRegion region="body" items={[
      {id:"goals:collection",label:"Your Goals",node:<div className="goals-collection-item">{(view === "board" || view === "tree") && (total || averageGoals.length) ? <GoalsAltView view={view} goals={visible} averages={shownAverages}/> : total || averageGoals.length ? <section className="goal-grid" aria-label="Your goals">{ordered?displayed.map(g=><GoalSummaryCard key={g.key} summary={g}/>):<LayoutRegion region="cards" grid allIds={[...collection.goals.map(g=>entityLayoutId(g.key)),...averageGoals.map(g=>entityLayoutId(`average:${g.id}`))]} items={[...displayed.map(g=>({id:entityLayoutId(g.key),label:g.name,node:<GoalSummaryCard summary={g}/>})),...shownAverages.map(g=>({id:entityLayoutId(`average:${g.id}`),label:g.name,node:<AverageGoalCard goal={g}/>}))]}/>}{ordered&&shownAverages.filter(g=>!query.trim()||g.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).map(g=><AverageGoalCard key={g.id} goal={g}/>)}</section> : <section className="destination-state"><OrbitalArt/><p className="eyebrow">Start with what matters</p><h2><NebulaFlow identity="goals-destination-title">A destination for your next chapter.</NebulaFlow></h2><p>A home. A safety net. A trip you’ve been waiting for.<br/> {plainWords ? "Give your savings a purpose." : "Give your ZIG a purpose."}</p><Link className="primary" href="/app/goals/new">Plan my first goal →</Link></section>}{/* Session AL third pass (GAP-119): debts as goals to reach zero, with the goals (one layout item, so the page order stays) */}<Suspense fallback={null}><DebtPaydownCard/></Suspense><Suspense fallback={null}><ChessRatingGoals filter={filter as "Active" | "Completed" | "Closed" | "All"}/></Suspense></div>},
      // Session AB-Design (owner request 14): the summary figures are their own movable block, after the cards by default.
      !!(total || averageGoals.length) && {id:"goals:summary",label:"Your goals at a glance",node:<div className="goals-summary-item"><GoalsFigures goals={collection.goals} averages={averageGoals} healthActive={healthGoals.loaded && !healthGoals.unreadable ? healthGoals.data.goals.filter(g => g.status === 'active').length : 0}/></div>},
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
    {ordered&&<LargeCollectionNote large={large}/>}
  </div></LayoutPage>;
}
/** Past 24 Goals, search, sort and pages decide the order; say so while the page is unlocked. */
function LargeCollectionNote({large}:{large:boolean}){const page=useLayoutPage();return page?.unlocked?<p className="notice" role="status">{large?'With more than 24 Goals, cards follow search, sort and page order.':'While you search or sort, cards follow that order; choose “Pinned first” to arrange them.'} The page sections can still be arranged.</p>:null;}
type Sortable={key:string;name:string;progressPct:string;targetDate?:string;status:string};
/** BUG-064: the Goals list's sort orders; ties keep a stable order by name, then key. */
function goalSort(sort:string,areaName:(key:string)=>string=()=>''){
  const byName=(a:Sortable,b:Sortable)=>a.name.localeCompare(b.name,undefined,{numeric:true})||a.key.localeCompare(b.key);
  if(sort==='name-desc')return (a:Sortable,b:Sortable)=>-byName(a,b);
  if(sort==='progress-desc')return (a:Sortable,b:Sortable)=>(Number(b.progressPct)||0)-(Number(a.progressPct)||0)||byName(a,b);
  if(sort==='area')return (a:Sortable,b:Sortable)=>{const x=areaName(a.key),y=areaName(b.key);return x&&!y?-1:!x&&y?1:x.localeCompare(y)||byName(a,b);};
  if(sort==='date-asc')return (a:Sortable,b:Sortable)=>(a.targetDate??'9999-12-31').localeCompare(b.targetDate??'9999-12-31')||byName(a,b);
  return byName;
}
