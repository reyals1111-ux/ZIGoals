"use client";
import { useState } from "react";
import Link from "next/link";
import "./collection.css";
import { GoalSummaryCard } from "../../../components/goal-card";
import { OrbitalArt } from "../../../components/orbital-art";
import { useUnifiedGoals } from "../../../components/use-unified-goals";
import { PlatformNav } from "../../../components/platform/common";
import { PageHeader } from "../../../components/page-header";
import { GoalMilestones } from "../../../components/bottom-sections";
import { useLocalToday } from "../../../components/use-local-today";
import { LayoutLockButton, LayoutPage, LayoutRegion, useLayoutPage } from "../../../components/layout-edit";
import { entityLayoutId } from "../../../lib/page-layout";
export default function GoalsPage() {
  const collection = useUnifiedGoals();
  const today = useLocalToday();
  const [filter, setFilter] = useState("Active");
  const [query,setQuery]=useState(''),[sort,setSort]=useState('pinned'),[page,setPage]=useState(0);
  const total=collection.goals.length,large=total>24;
  const visible=collection.goals.filter(g=>(filter==='All'||g.status===filter.toLowerCase())&&(!large||g.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())));
  if(large&&sort!=='pinned')visible.sort((a,b)=>(sort==='name-desc'?-1:1)*a.name.localeCompare(b.name,undefined,{numeric:true})||a.key.localeCompare(b.key));
  const count=visible.length,pages=Math.max(1,Math.ceil(count/24)),currentPage=Math.min(page,pages-1),displayed=large?visible.slice(currentPage*24,(currentPage+1)*24):visible;
  const changePage=(next:number)=>{setPage(next);document.getElementById('goal-collection-controls')?.focus();};
  return <LayoutPage page="goals"><div className="goals-page dashboard platform-workspace">
    <PageHeader className="page-heading goals-heading" eyebrow="A destination worth building" title={<span className="nebula-text">Your Goals</span>} actions={<Link className="primary" href="/app/goals/new">+ Create a goal</Link>} lede="Small steps. A bigger future. Every plan starts with you." tools={<LayoutLockButton/>}/>
    <div className="goals-toolbar"><PlatformNav/>{!!total && <><nav className="tab-row view-tabs goal-view-filters" aria-label="Goal views">{["Active", "Completed", "Closed", "All"].map(view => <button key={view} aria-pressed={filter === view} onClick={() => {setFilter(view);setPage(0);}}>{view}</button>)}</nav><span className="goals-count">{count} {count === 1 ? "destination" : "destinations"}</span></>}</div>
    {collection.error&&<p role="alert" className="notice">{collection.error}</p>}
    {large&&<section id="goal-collection-controls" className="goal-collection-controls" aria-label="Browse Goals" tabIndex={-1}><label>Search Goals<input aria-label="Search Goals" type="search" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/></label><label>Sort Goals<select aria-label="Sort Goals" value={sort} onChange={e=>{setSort(e.target.value);setPage(0);}}><option value="pinned">Pinned first</option><option value="name-asc">Name A–Z</option><option value="name-desc">Name Z–A</option></select></label>{pages>1&&<nav className="goal-collection-pages" aria-label="Goals pages"><button className="secondary" aria-label="Previous Goals page" disabled={currentPage===0} onClick={()=>changePage(currentPage-1)}>Previous</button><span role="status">Page {currentPage+1} of {pages}</span><button className="secondary" aria-label="Next Goals page" disabled={currentPage+1===pages} onClick={()=>changePage(currentPage+1)}>Next</button></nav>}</section>}
    {!collection.loaded ? <p role="status">Loading your local goals…</p> : <LayoutRegion region="body" items={[
      {id:"goals:collection",label:"Your Goals",node:total ? <section className="goal-grid" aria-label="Your goals">{large?displayed.map(g=><GoalSummaryCard key={g.key} summary={g}/>):<LayoutRegion region="cards" grid allIds={collection.goals.map(g=>entityLayoutId(g.key))} items={displayed.map(g=>({id:entityLayoutId(g.key),label:g.name,node:<GoalSummaryCard summary={g}/>}))}/>}</section> : <section className="destination-state"><OrbitalArt/><p className="eyebrow">Start with what matters</p><h2>A destination for your <span className="nebula-text">next chapter.</span></h2><p>A home. A safety net. A trip you’ve been waiting for.<br/> Give your ZIG a purpose.</p><Link className="primary" href="/app/goals/new">Plan my first goal →</Link></section>},
      !!total && !count && {id:"goals:filter-empty",label:"No Goals in this view",node:<section className="panel empty-small"><h2>{query.trim()?"No matching goals.":`No ${filter.toLowerCase()} goals.`}</h2><p>{query.trim()?"Try a different name or clear your search.":"Your other destinations are under All. Closed Goals keep their history."}</p><button className="secondary" onClick={() => {setFilter("All");setQuery("");setPage(0);}}>View all goals</button></section>},
      {id:"goals:milestones",label:"Milestones ahead",node:<GoalMilestones goals={collection.goals} today={today}/>},
    ]}/>}
    {large&&<LargeCollectionNote/>}
  </div></LayoutPage>;
}
/** Past 24 Goals, search, sort and pages decide the order; say so while the page is unlocked. */
function LargeCollectionNote(){const page=useLayoutPage();return page?.unlocked?<p className="notice" role="status">With more than 24 Goals, cards follow search, sort and page order. The page sections can still be arranged.</p>:null;}
