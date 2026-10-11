'use client';
import {useEffect,useState} from 'react';
import {hashId} from '../lib/hash-id';
import {directoryEntries,directoryResources,directoryCategories,directoryReviewedAt,filterDirectory} from '@zigoals/ecosystem-registry/providers';
import {EcosystemCard} from './ecosystem-card';
import './ecosystem-directory.css';
import {NebulaFlow} from './nebula-flow';
export function EcosystemDirectory(){
 const [query,setQuery]=useState(''),[category,setCategory]=useState('All');const visible=filterDirectory(directoryEntries,query,category);
 // Open cards (Session I, Part 6): any number at once. A #project-<id> link opens its card and brings it into view.
 const [open,setOpen]=useState<ReadonlySet<string>>(()=>new Set());
 function toggle(id:string){setOpen(current=>{const next=new Set(current);if(!next.delete(id))next.add(id);return next;});}
 useEffect(()=>{
  const follow=()=>{const id=location.hash.startsWith('#project-')?hashId('#'+location.hash.slice(9)):null;if(id===null||!directoryEntries.some(e=>e.id===id))return;setQuery('');setCategory('All');setOpen(current=>current.has(id)?current:new Set([...current,id]));requestAnimationFrame(()=>document.getElementById(`project-${id}`)?.scrollIntoView({block:'start'}));};
  follow();window.addEventListener('hashchange',follow);return()=>window.removeEventListener('hashchange',follow);
 },[]);
 function clear(){setQuery('');setCategory('All');}
 return <section className="ecosystem-directory" aria-labelledby="ecosystem-directory-title">
  <div className="ecosystem-intro"><p className="eyebrow page-eyebrow"><NebulaFlow identity="ecosystem-eyebrow">ZIG Chain ecosystem</NebulaFlow></p><h1 id="ecosystem-directory-title"><NebulaFlow identity="ecosystem-title">Explore the ZIGChain ecosystem.</NebulaFlow></h1><p className="page-lede">Discover projects, understand their role, and follow official sources. Your plan stays yours.</p><div className="ecosystem-review"><span>{directoryEntries.length} research records</span><span>Sources reviewed <time dateTime={directoryReviewedAt}>{directoryReviewedAt}</time></span><span>No external execution in ZIGoals</span></div></div>
  <p className="ecosystem-context">An ecosystem listing is not a ZIGoals partnership, endorsement or security audit. Descriptions summarize project or network sources. External sites set their own network, access rules and terms.</p>
  <div className="ecosystem-controls"><label>Search projects<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name, role or topic"/></label><label>Category<select value={category} onChange={e=>setCategory(e.target.value)}>{directoryCategories.map(c=><option key={c}>{c}</option>)}</select></label><button type="button" className="quiet" onClick={clear} disabled={!query&&category==='All'}>Clear filters</button></div>
  <p className="ecosystem-result" role="status">{visible.length} of {directoryEntries.length} projects{category!=='All'?` · ${category}`:''}</p>
  {!visible.length?<div className="panel ecosystem-no-results"><h2>No projects match these filters.</h2><p>Try another name, topic or category.</p></div>:<div className="ecosystem-projects">{visible.map(entry=><EcosystemCard key={entry.id} entry={entry} open={open.has(entry.id)} onToggle={()=>toggle(entry.id)}/>)}</div>}
  <details className="ecosystem-coverage"><summary>About this directory’s coverage</summary><p>The reviewed set is the existing 18-provider registry, the official ZIGChain homepage and network documentation on {directoryReviewedAt}. It is a dated research snapshot, not an exhaustive or continually monitored list.</p><p>Additional official resources outside the existing provider registry:</p><ul>{directoryResources.map(r=><li key={r.name}><a href={r.url} target="_blank" rel="noopener noreferrer">Visit {r.name} ↗</a> · {r.description} <a href={r.source} target="_blank" rel="noopener noreferrer">Source ↗</a></li>)}</ul><p>The homepage’s unnamed social-only RWA lending listing could not be resolved during this review and was not merged into a provider by assumption.</p><p>Available official-site icons were locally re-encoded for directory identification. Missing marks use a labeled initials fallback with the specific reason on each card. No third-party images load on this page; an icon does not imply a ZIGoals partnership or endorsement.</p><a href="https://zigchain.com/" target="_blank" rel="noopener noreferrer">Review the official ecosystem source ↗</a></details>
 </section>;
}
