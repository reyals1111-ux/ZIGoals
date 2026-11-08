'use client';
import {EmptyState} from './ui/empty-state';
import {useEffect,useState} from 'react';
import {hashId} from '../lib/hash-id';
import {directoryEntries,directoryResources,directoryCategories,directoryReviewedAt,filterDirectory} from '@zigoals/ecosystem-registry/providers';
import {EcosystemCard} from './ecosystem-card';
import {usePlatform} from './platform/use-platform';
import {usedByMe} from '../lib/zigchain-eco/used-by-me';
import {useEarnLive} from './earn/use-earn-live';
import './ecosystem-directory.css';
import {NebulaFlow} from './nebula-flow';
import {HeaderArtCorner,OrbitArt} from './header-art/orbit-art';
import {EcosystemGlyph} from './header-art/glyphs/ecosystem';
import {formatDate} from '../lib/visual-format';
import {DIRECTORY_SOURCES_READ,NOT_LIVE_YET} from '../lib/zigchain-eco/directory-status';
import {newestDay} from '../lib/earn/dated';
// Session AL (BN-027): the header's date is the newest source read, not the registry's first review day.
const SOURCES_READ=newestDay([directoryReviewedAt.slice(0,10),...DIRECTORY_SOURCES_READ]);
import './zigchain-eco/zigchain-eco.css';
import {SORTS,STATUS_FILTERS,VALUE_SORT,sourcesReadDay,viewDirectory,withAuditReports,type DirectorySort,type StatusFilter,type ValueSort} from '../lib/zigchain-eco/directory-view';
import {ECOSYSTEM_LIVE} from './ecosystem-live';
import {localDate} from '../lib/local-date';
// Session AL sweep 4 (C-BN-17): the value-locked sort sits after the plain sorts.
const SORT_OPTIONS=[...SORTS,VALUE_SORT] as const;
export function EcosystemDirectory(){
 // Session AH (CO7): Earn's DefiLlama read, once for the page (every 10 minutes while it is visible), for the cards Earn covers.
 const llama=useEarnLive('defillama');
 // Session AL (C-BN-16, GAP-146): Wealth's holdings, read on this device, for the "Used by you" line.
 const platform=usePlatform(),positions=platform.loaded?platform.data.positions:[];
 const [query,setQuery]=useState(''),[category,setCategory]=useState('All');
 // Session AL (Part 15, P-BN-82/P-BN-83): a status filter and a sort beside the search and the category.
 const [status,setStatus]=useState<StatusFilter>('any'),[sort,setSort]=useState<DirectorySort|ValueSort>('directory');
 // Session AL (C-BN-15): an optional box for projects whose record lists an audit report (a dated review, not a rating).
 const [audited,setAudited]=useState(false);
 // Session AL sweep 4 (C-BN-17): a project's value locked from the page's one DefiLlama read, null when unknown.
 const valueLocked=(id:string)=>{const l=ECOSYSTEM_LIVE[id];const p=l&&llama.phase==='ok'?llama.answer.data.protocols[l.slug]:undefined;return p?.status==='ok'?p.tvlUsd:null;};
 const visible=viewDirectory(withAuditReports(filterDirectory(directoryEntries,query,category),audited),status,sort,valueLocked);
 // Session AL sweep 4 (BN-027, B-122): the header's day is the newest read on the page, the live read included.
 const readDay=sourcesReadDay(SOURCES_READ,llama.phase==='ok'?llama.answer.fetchedAt:null,iso=>localDate(new Date(iso)));
 // Open cards (Session I, Part 6): any number at once. A #project-<id> link opens its card and brings it into view.
 const [open,setOpen]=useState<ReadonlySet<string>>(()=>new Set());
 function toggle(id:string){setOpen(current=>{const next=new Set(current);if(!next.delete(id))next.add(id);return next;});}
 useEffect(()=>{
  const follow=()=>{const id=location.hash.startsWith('#project-')?hashId('#'+location.hash.slice(9)):null;if(id===null||!directoryEntries.some(e=>e.id===id))return;setQuery('');setCategory('All');setOpen(current=>current.has(id)?current:new Set([...current,id]));requestAnimationFrame(()=>document.getElementById(`project-${id}`)?.scrollIntoView({block:'start'}));};
  follow();window.addEventListener('hashchange',follow);return()=>window.removeEventListener('hashchange',follow);
 },[]);
 function clear(){setQuery('');setCategory('All');setAudited(false);}
 return <section className="ecosystem-directory" aria-labelledby="ecosystem-directory-title">
  <div className="ecosystem-intro header-art-host"><p className="eyebrow page-eyebrow"><NebulaFlow identity="ecosystem-eyebrow">ZIG Chain ecosystem</NebulaFlow></p><h1 id="ecosystem-directory-title"><NebulaFlow identity="ecosystem-title">Explore the ZIGChain ecosystem.</NebulaFlow></h1><p className="page-lede">Discover projects, understand their role, and follow official sources. Your plan stays yours.</p><div className="ecosystem-review"><span>{directoryEntries.length} research records</span><span>Sources last read <time dateTime={readDay}>{formatDate(readDay)}</time></span><span>No external execution in ZIGoals</span></div><HeaderArtCorner><OrbitArt glyph={EcosystemGlyph} spin={4}/></HeaderArtCorner></div>
  <p className="ecosystem-context">An ecosystem listing is not a ZIGoals partnership, endorsement or security audit. Descriptions summarize project or network sources. External sites set their own network, access rules and terms.</p>
  <div className="ecosystem-controls"><label>Search projects<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name, role or topic"/></label><label>Category<select value={category} onChange={e=>setCategory(e.target.value)}>{directoryCategories.map(c=><option key={c}>{c}</option>)}</select></label><label>Status<select value={status} onChange={e=>setStatus(e.target.value as StatusFilter)}>{STATUS_FILTERS.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label>Sort<select value={sort} onChange={e=>setSort(e.target.value as DirectorySort|ValueSort)}>{SORT_OPTIONS.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><button type="button" className="quiet" onClick={()=>{clear();setStatus('any');}} disabled={!query&&category==='All'&&status==='any'&&!audited}>Clear filters</button><label className="ecosystem-audited"><input type="checkbox" checked={audited} onChange={e=>setAudited(e.target.checked)}/><span>Only projects with an audit report listed<small>A report is a dated review of some of a project&rsquo;s code, not a safety rating: an audited project can still fail.</small></span></label></div>
  <p className="ecosystem-result" role="status">{visible.length} of {directoryEntries.length} projects{category!=='All'?` · ${category}`:''}{status!=='any'?` · ${STATUS_FILTERS.find(([id])=>id===status)![1]}`:''}{audited?' · with an audit report listed':''}</p>
  {/* Session AL fifth pass (D-187): the app's one empty state, with the way back */}{!visible.length?<EmptyState className="panel ecosystem-no-results" level={2} zigi="curious" title="No projects match these filters." action={<button className="secondary" onClick={()=>{clear();setStatus('any');}}>Clear search and filters</button>}>Try another name, topic or category.</EmptyState>:<div className="ecosystem-projects">{visible.map(entry=><EcosystemCard key={entry.id} llama={llama} used={usedByMe(entry.id,positions)} entry={entry} open={open.has(entry.id)} onToggle={()=>toggle(entry.id)}/>)}</div>}
  {/* Session AK (F4): what is announced for ZIGChain but not live yet, said plainly. */}
  <details className="ecosystem-coverage ecosystem-not-live"><summary>Announced, not live yet</summary><ul>{NOT_LIVE_YET.map(n=><li key={n.what}><strong>{n.what}.</strong> {n.detail} <small>({n.source}, read {formatDate(n.readOn)})</small></li>)}</ul></details>
  <details className="ecosystem-coverage"><summary>About this directory’s coverage</summary><p>The reviewed set is the existing 18-provider registry, the official ZIGChain homepage and network documentation on {formatDate(directoryReviewedAt)}. It is a dated research snapshot, not an exhaustive or continually monitored list.</p><p>Additional official resources outside the existing provider registry:</p><ul>{directoryResources.map(r=><li key={r.name}><a href={r.url} target="_blank" rel="noopener noreferrer">Visit {r.name} ↗</a> · {r.description} <a href={r.source} target="_blank" rel="noopener noreferrer">Source ↗</a></li>)}</ul><p>The homepage’s unnamed social-only RWA lending listing could not be resolved during this review and was not merged into a provider by assumption.</p><p>Available official-site icons were locally re-encoded for directory identification. Missing marks use a labeled initials fallback with the specific reason on each card. No third-party images load on this page; an icon does not imply a ZIGoals partnership or endorsement.</p><a href="https://zigchain.com/" target="_blank" rel="noopener noreferrer">Review the official ecosystem source ↗</a></details>
 </section>;
}
