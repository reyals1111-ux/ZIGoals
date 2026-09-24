'use client';
import Link from 'next/link';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {OrbitSlogan} from '../orbit-slogan';
import {formatUnits,TESTNET} from '@zigoals/chain-config';
import {AppIcon} from '../app-icon';
import {ActivityFeed} from '../activity-feed';
import {GoalSummaryCard} from '../goal-card';
import {SceneArt} from '../scene-art';
import {usePrivateStore} from '../use-private-store';
import {usePlatform} from '../platform/use-platform';
import {useGoals} from '../goal-provider';
import {useHabits} from '../habits/use-habits';
import {useHealth} from '../health/use-health';
import {HabitsToday} from '../habits/habits-today';
import {HealthToday} from '../health/health-today';
import {HabitCompletion} from '../habits/habit-card';
import {useMarketQuotes} from '../platform/use-market-quotes';
import {useEvidenceNow} from '../platform/use-evidence-now';
import {useLocalToday} from '../use-local-today';
import {ProgressRing} from '../platform/financial-ui';
import {TodayIntelligence} from '../platform/today-intelligence';
import {StakingCard} from '../platform/staking-card';
import {WidgetOverview} from './widget-overview';
import {wealthMarketRequests} from '../../lib/wealth';
import {unifiedGoalSummaries} from '../../lib/goal-summary';
import {dailyData,healthDay} from '../../lib/health-daily';
import {DASHBOARD_SETTINGS_KEY,dashboardSettingsSchema,emptyDashboardSettings,PRESETS,saveWidget,removeWidget,visibleDomains,WIDGET_CATALOG,DASHBOARD_BUILTINS,reconcileDashboardPlacement,moveDashboardItem,setDashboardBuiltinHidden,applyDashboardPreset,type DashboardPreset,type DashboardWidget,type DashboardSettings,type WidgetKind,type DashboardBuiltinId,type DashboardItemRef,type DashboardRegion} from '../../lib/dashboard-settings';
import {dashboardIntegrityWarning,stakingWidgetSource,widgetMetric,widgetMetricLabel,type DashboardSources,type WidgetMetric} from '../../lib/dashboard-metrics';
import './dashboard.css';
function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null,dialog=ref.current;dialog?.showModal();return()=>{dialog?.close();previous?.focus();};},[]);
 return <dialog ref={ref} className="dashboard-dialog" aria-label={title} onCancel={onClose}><header><h2>{title}</h2><button className="secondary" type="button" onClick={onClose} aria-label="Close customization">Close</button></header>{children}</dialog>;
}
function Metric({metric,identity}:{metric:WidgetMetric;identity:string}){return <><div className="dashboard-metric-value">{metric.percent!==undefined&&<ProgressRing percent={metric.percent} complete={metric.complete} size={88} identity={`widget-${identity}`} label={`${metric.title} progress`}/>}<strong>{metric.value}</strong></div><p className="fine">{metric.detail}</p>{metric.facts&&<dl className="dashboard-metric-facts">{metric.facts.map(f=><div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl>}{metric.warning&&<p className="notice">{metric.warning}</p>}<Link className="text-link" href={metric.href}>{metric.missing?'Review record':'Open details'} →</Link></>;}
function WidgetEditor({initial,sources,onSave,onClose}:{initial?:DashboardWidget;sources:DashboardSources;onSave:(w:DashboardWidget,revision?:number)=>Promise<void>;onClose:()=>void}){
 const [kind,setKind]=useState<WidgetKind>(initial?.kind??'health'),[metric,setMetric]=useState(initial?.metric??'kcal'),[entity,setEntity]=useState(initial?.entity??''),[title,setTitle]=useState(initial?.title??''),[size,setSize]=useState<DashboardWidget['size']>(initial?.size??'compact');
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);const id=useRef(initial?.id??crypto.randomUUID());
 const entities=kind==='goal'?sources.goals.map(g=>({id:g.key,label:`${g.name} · ${g.source}`})):kind==='habit'?sources.habits.habits.map(h=>({id:h.id,label:h.title})):['asset','allocation','staking'].includes(kind)?sources.platform.positions.filter(p=>kind!=='staking'||stakingWidgetSource(p)).map(p=>({id:p.id,label:`${p.providerId} · ${p.asset} · ${p.network} · ${p.sourceType.toLowerCase().replaceAll('_',' ')}${p.archivedAt?' · archived':''}`})):[];
 const requiresEntity=['goal','habit','asset','staking','allocation'].includes(kind);
 const draft:DashboardWidget={id:id.current,kind,metric,...(requiresEntity?{entity}:{}),title,size,hidden:initial?.hidden??false,revision:initial?.revision??1};
 const preview=widgetMetric(draft,sources);
 async function save(){setBusy(true);setError('');try{await onSave(draft,initial?.revision);onClose();}catch(e){setError(e instanceof Error?e.message:'Could not save this widget.');}finally{setBusy(false);}}
 return <Modal title={initial?'Edit widget':'Add a widget'} onClose={onClose}><form onSubmit={e=>{e.preventDefault();void save();}}><div className="form-grid"><label>Widget type<select value={kind} onChange={e=>{const next=e.target.value as WidgetKind;setKind(next);setMetric(WIDGET_CATALOG[next].metrics[0]);setEntity('');}}>{Object.entries(WIDGET_CATALOG).map(([key,value])=><option key={key} value={key}>{value.label}</option>)}</select></label><label>Metric<select value={metric} onChange={e=>setMetric(e.target.value)}>{WIDGET_CATALOG[kind].metrics.map(m=><option key={m} value={m}>{widgetMetricLabel(m)}</option>)}</select></label>{requiresEntity&&<label className="span-two">Choose a {['asset','staking','allocation'].includes(kind)?'record':kind}<select required value={entity} onChange={e=>setEntity(e.target.value)}><option value="">Choose a saved record</option>{entity&&!entities.some(e=>e.id===entity)&&<option value={entity}>Previously selected record · unavailable</option>}{entities.map(e=><option value={e.id} key={e.id}>{e.label}</option>)}</select>{!entities.length&&<small>No saved records yet. You can create one from its page first.</small>}</label>}<label>Title (optional)<input maxLength={80} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Size<select value={size} onChange={e=>setSize(e.target.value as DashboardWidget['size'])}><option value="compact">Compact</option><option value="wide">Wide</option></select></label></div><section className="dashboard-widget-preview" aria-label="Widget preview"><p className="eyebrow">PREVIEW · YOUR CURRENT RECORDS</p><h3>{preview.title}</h3><strong>{preview.value}</strong><p>{preview.detail}</p>{preview.facts&&<dl className="dashboard-metric-facts">{preview.facts.map(f=><div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl>}{preview.warning&&<p>{preview.warning}</p>}</section>{error&&<p role="alert">{error}</p>}<div className="dashboard-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={busy||requiresEntity&&!entity}>{busy?'Saving…':'Save widget'}</button></div></form></Modal>;
}
export function TodayDashboard(){
 const settings=usePrivateStore(DASHBOARD_SETTINGS_KEY,dashboardSettingsSchema,emptyDashboardSettings);
 const platform=usePlatform(),legacy=useGoals(),habits=useHabits(),health=useHealth(),today=useLocalToday();
 const domains=visibleDomains(settings.data),financial=domains.includes('wealth')||domains.includes('goals');
 const market=useMarketQuotes(settings.loaded&&financial?wealthMarketRequests(platform.data):false),now=useEvidenceNow(platform.data,market.now);
 const goals=unifiedGoalSummaries(legacy.goals,legacy.metadata?.goals??{},platform.data,market.quotes,now,legacy.mode==='local'?'Local simulation':'Future Goal Manager').filter(g=>!g.key.startsWith('legacy:')||!platform.data.legacyGoalUi?.[`${legacy.chain}:${legacy.owner}:${g.id}`]?.archived);
 const sources:DashboardSources={platform:platform.data,goals,habits:habits.data,health:health.data,quotes:market.quotes,now,today,healthDate:healthDay(dailyData(health.data).preferences.timezone)};
 const placement=reconcileDashboardPlacement(settings.data);
 const [customize,setCustomize]=useState(false),[editor,setEditor]=useState<DashboardWidget|'new'|null>(null),[preset,setPreset]=useState<DashboardPreset|null>(null),[status,setStatus]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [insertAt,setInsertAt]=useState<{region:DashboardRegion;anchor:DashboardItemRef}|null>(null);
 const loaded=(domain:string)=>domain==='health'?health.loaded:domain==='habits'?habits.loaded:platform.loaded&&legacy.loaded;
 const domainError=(domain:string)=>domain==='health'?health.error:domain==='habits'?habits.error:platform.error;
 const active=goals.filter(g=>g.status==='active'),nextGoal=active[0];
 const integrityWarning=platform.loaded&&!platform.error?dashboardIntegrityWarning(platform.data):undefined;
 const hasFundingGoal=platform.data.goals.some(g=>g.status!=='closed'&&g.type!=='PROJECT');
 const meta=(id:DashboardBuiltinId)=>DASHBOARD_BUILTINS.find(b=>b.id===id)!;
 async function change(update:(s:DashboardSettings)=>DashboardSettings,message='Layout saved on this device.'){
  setBusy(true);setError('');
  try{await settings.update(update);setStatus(message);}catch(e){setError(e instanceof Error?e.message:'Could not save the layout.');throw e;}finally{setBusy(false);}
 }
 const apply=(update:(s:DashboardSettings)=>DashboardSettings,message?:string)=>void change(update,message).catch(()=>{});
 const itemId=(ref:DashboardItemRef)=>`dashboard-item-${ref.kind}-${ref.id}`;
 function relocate(ref:DashboardItemRef,region:DashboardRegion,index:number,direction:-1|1,label:string){
  const anchor=placement[region][index+direction];if(!anchor)return;
  void change(s=>moveDashboardItem(s,ref,{region,anchor,position:direction===-1?'before':'after'},placement.revision),`${label} moved ${direction===-1?'up':'down'}. Layout saved on this device.`).then(()=>requestAnimationFrame(()=>document.getElementById(itemId(ref))?.focus())).catch(()=>{});
 }
 function moveLane(ref:DashboardItemRef,from:DashboardRegion,label:string){
  const target=from==='main'?'rail':'main';
  void change(s=>moveDashboardItem(s,ref,{region:target},placement.revision),`${label} moved to ${target==='rail'?'the rail':'the main column'}.`).then(()=>requestAnimationFrame(()=>document.getElementById(itemId(ref))?.focus())).catch(()=>{});
 }
 function addAfter(ref:DashboardItemRef,region:DashboardRegion){setInsertAt({region,anchor:ref});setEditor('new');}
 function renderWidget(w:DashboardWidget,region:DashboardRegion,index:number){
  const metric=widgetMetric(w,sources),domain=WIDGET_CATALOG[w.kind].domain,habit=w.kind==='habit'?habits.data.habits.find(h=>h.id===w.entity):undefined,ref:DashboardItemRef={kind:'widget',id:w.id};
  return <article id={`dashboard-widget-${w.id}`} className="dashboard-widget panel" data-size={w.size} data-hidden={w.hidden?'true':undefined} aria-label={metric.title}>
   <div className="dashboard-widget-heading"><AppIcon name={domain==='wealth'?'wallet':domain} luminous/><h3>{metric.title}</h3>{w.hidden&&<span className="pill">Hidden</span>}</div>
   {!loaded(domain)?<p role="status">Loading records…</p>:domainError(domain)?<p role="alert">This data needs attention. Open Settings to recover it.</p>:w.kind==='habits'?<HabitsToday/>:<><Metric metric={metric} identity={w.id}/>{habit&&w.metric==='today'&&<HabitCompletion habit={habit} store={habits} compact/>}{w.kind==='goals'&&<ul className="dashboard-goal-links">{active.slice(0,3).map(g=><li key={g.key}><Link href={g.href}>{g.name}</Link></li>)}</ul>}</>}
   {customize&&<div className="dashboard-widget-controls"><button type="button" className="secondary" disabled={busy} onClick={()=>setEditor(w)}>Edit</button><button type="button" className="secondary" disabled={busy} onClick={()=>apply(s=>saveWidget(s,{...w,hidden:!w.hidden},w.revision))}>{w.hidden?'Show':'Hide'}</button><button type="button" className="secondary" aria-label={`Move ${metric.title} up`} disabled={busy||index===0} onClick={()=>relocate(ref,region,index,-1,metric.title)}>↑ Move up</button><button type="button" className="secondary" aria-label={`Move ${metric.title} down`} disabled={busy||index===placement[region].length-1} onClick={()=>relocate(ref,region,index,1,metric.title)}>↓ Move down</button><button type="button" className="secondary" onClick={()=>moveLane(ref,region,metric.title)} disabled={busy}>Move to {region==='main'?'rail':'main'}</button><button type="button" className="secondary" disabled={busy} onClick={()=>apply(s=>removeWidget(s,w.id),'Widget removed. Your underlying record was kept.')}>Remove</button></div>}
  </article>;
 }
 const intelligence=(module:'life'|'attention'|'funding'|'needs-attention'|'watchlist')=><TodayIntelligence sources={sources} habitsReady={habits.loaded&&!habits.error} healthReady={health.loaded&&!health.error} module={module}/>;
 function renderBuiltin(id:DashboardBuiltinId){
  if(['whole-life','attention','funding','needs-attention','watchlist'].includes(id)){
   if(!financial||!platform.loaded||!!platform.error||id==='attention'&&!hasFundingGoal)return null;
   return intelligence(({ 'whole-life':'life',attention:'attention',funding:'funding','needs-attention':'needs-attention',watchlist:'watchlist'} as const)[id as 'whole-life'|'attention'|'funding'|'needs-attention'|'watchlist']);
  }
  switch(id){
   case 'goals':return financial?<section className="today-goals surface-featured" aria-label="Your goals"><div className="section-heading"><div><h2>Your goals</h2><p>Small steps. A bigger future.</p></div><Link href="/app/goals" className="text-link">View all goals →</Link></div>{!legacy.loaded||!platform.loaded?<p role="status">Loading your Goals…</p>:active.length?<div className="today-goals-grid">{active.map(g=><GoalSummaryCard key={g.key} summary={g} compact/>)}<Link href="/app/goals/new" className="new-destination-card"><span aria-hidden="true">＋</span><strong>Create a new goal</strong><small>A new destination<br/>is waiting.</small></Link></div>:<div className="today-goal-empty"><div><AppIcon name="goals" size={42}/><h3>A plan with your name on it.</h3><p>Choose what matters. Set a target. See the next step.</p><Link className="text-link" href="/app/goals/new">Create your first goal →</Link></div><SceneArt scene="home"/></div>}<p className="local-label">{legacy.mode==='local'?'Local demo · simulated ZIG, never wallet funds':'Testnet wallet view · financial execution disabled'}</p></section>:null;
   case 'progress':return financial?<section className="progress-summary" aria-label="Your financial progress"><div className="section-heading"><div><h2>Your progress</h2><p>Built on your contributions.</p></div><span className="pill">Idle strategy</span></div><div className="progress-stats"><div><AppIcon name="goals"/><strong>{active.length}</strong><small>Active goals</small></div><div><AppIcon name="activity"/><strong>{formatUnits(legacy.goals.reduce((total,g)=>total+BigInt(g.position_units),0n).toString(),TESTNET.nativeAsset.decimals)} <span>ZIG</span></strong><small>{legacy.mode==='local'?'Simulated local allocation':'Known wallet Goal allocation'}</small></div><div><AppIcon name="ecosystem"/><strong>None</strong><small>Future return assumed</small></div></div></section>:null;
   case 'habits':return domains.includes('habits')?<HabitsToday/>:null;
   case 'health':return domains.includes('health')?<HealthToday/>:null;
   case 'next-action':return financial&&nextGoal?<div className="next-step"><span className="eyebrow">Your next goal action</span><Link href={nextGoal.href} className="text-link">Review {nextGoal.name} →</Link></div>:null;
   case 'summary':return <WidgetOverview widgets={settings.data.widgets} sources={sources} loaded={settings.loaded} error={settings.error} ready={loaded} domainError={domainError} customizing={customize} onCustomize={()=>setCustomize(x=>!x)}/>;
   case 'wallet':return financial?<section className="account-panel"><div><h2>Your wallet <span className="pill">{legacy.mode==='local'?'Local demo':'Testnet'}</span></h2><strong className="account-value">{formatUnits(legacy.balance,TESTNET.nativeAsset.decimals)} <span>ZIG</span></strong><p>{legacy.mode==='local'?'Simulated balance · this browser':`${legacy.owner.slice(0,10)}…${legacy.owner.slice(-5)}`}</p><Link href="/app/settings" className="secondary account-action"><AppIcon name="wallet" luminous/>Wallet &amp; data →</Link></div></section>:null;
   case 'staking':return financial?<StakingCard/>:null;
   case 'destination':return financial?<section className="destination-panel" aria-labelledby="destination-title"><div><p className="eyebrow">Start with what matters</p><h2 id="destination-title">A destination for your <span className="nebula-text">next chapter.</span></h2><p>A home. A safety net. A trip you’ve been waiting for. Give your ZIG a purpose.</p><Link href="/app/goals/new" className="primary">{goals.length?'Plan my next goal →':'Plan my first goal →'}</Link><div className="destination-steps"><div><AppIcon name="settings" luminous/><strong>Set a goal</strong><small>Define your future</small></div><div><AppIcon name="goals" luminous/><strong>Stay consistent</strong><small>Track your progress</small></div><div><AppIcon name="today" luminous/><strong>Reach farther</strong><small>A brighter tomorrow</small></div></div></div></section>:null;
   case 'activity':return financial?<section className="recent-panel"><div className="section-heading"><h2>Recent activity</h2><Link href="/app/activity" className="text-link">View all →</Link></div><ActivityFeed limit={4}/></section>:null;
  }
 }
 function renderPlaced(ref:DashboardItemRef,region:DashboardRegion,index:number){
  const widget=ref.kind==='widget'?settings.data.widgets.find(w=>w.id===ref.id):undefined;
  if(ref.kind==='widget'&&!widget)return null;
  const builtin=ref.kind==='builtin'?meta(ref.id):undefined;
  const content=ref.kind==='widget'?renderWidget(widget!,region,index):renderBuiltin(ref.id as DashboardBuiltinId);
  if(!content)return null;
  const hidden=ref.kind==='widget'?widget!.hidden:placement.hiddenBuiltins.includes(ref.id as DashboardBuiltinId);
  if(hidden&&!customize)return null;
  const label=ref.kind==='widget'?widget!.title||WIDGET_CATALOG[widget!.kind].label:builtin!.label;
  return <div key={`${ref.kind}:${ref.id}`} id={itemId(ref)} tabIndex={-1} className="placed-module" data-kind={ref.kind} data-module={ref.id} data-size={widget?.size} data-hidden={hidden?'true':undefined}>
   {customize&&ref.kind==='builtin'&&<div className="dashboard-placement-controls"><strong>{label}</strong><button type="button" className="secondary" disabled={busy||index===0} onClick={()=>relocate(ref,region,index,-1,label)}>↑ Move earlier</button><button type="button" className="secondary" disabled={busy||index===placement[region].length-1} onClick={()=>relocate(ref,region,index,1,label)}>↓ Move later</button>{builtin!.hideable&&<button type="button" className="secondary" disabled={busy} onClick={()=>apply(s=>setDashboardBuiltinHidden(s,ref.id as DashboardBuiltinId,!hidden,placement.revision))}>{hidden?'Show':'Hide'}</button>}</div>}
   {hidden&&ref.kind==='builtin'?<p className="dashboard-hidden-placeholder">{label} is hidden from Today.</p>:content}
   {customize&&<button type="button" className="dashboard-insert-here" disabled={busy||settings.data.widgets.length>=24} onClick={()=>addAfter(ref,region)}>+ Add widget after {label}</button>}
  </div>;
 }
 let presetPreview:DashboardSettings|null=null,presetError='';
 if(preset)try{presetPreview=applyDashboardPreset(settings.data,preset);}catch(e){presetError=e instanceof Error?e.message:'This layout cannot be applied without removing a saved widget.';}
 return <div className="today-page personalized-today" data-interests={settings.data.preset}>
  <div className="today-layout"><div className="today-primary">
   <section className="today-hero" aria-labelledby="dashboard-title"><div className="cosmic-glow ambient-light" aria-hidden="true"/><div className="today-hero-copy"><p className="eyebrow financial-orbit">YOUR FINANCIAL ORBIT</p><h1 id="dashboard-title" className="orbit-slogan"><OrbitSlogan/></h1><p>Set goals. Build habits. Protect your health.<br/>Make room for a brighter tomorrow.</p><div className="hero-actions"><Link className="primary" href={financial?'/app/goals/new':'/app/health'}>{financial?'+ Create a goal':'Open Health'}</Link><a href="#how-it-works" className="secondary"><span className="play-medallion"><AppIcon name="play" luminous/></span> See how it works</a></div><p className="hero-truth">{financial?(legacy.mode==='local'?'Testnet Alpha · simulated financial progress · private daily tracking':'Testnet Alpha · watch-only wallet view · private daily tracking'):'Private daily tracking · Health-only layout'}</p></div><div className="hero-pillars" aria-label="Your connected journey">{(financial?[['goals','Your goals','Give your ZIG a purpose.'],['future','Your future','Build habits. Live well.'],['chain','Onchain','ZIGChain vision · Alpha simulation.']]:[['goals','Your goals','A destination with meaning.'],['habits','Your rhythm','Small steps, your pace.'],['health','Your wellbeing','Care for the everyday.']]).map(([icon,title,detail])=><div key={icon}><span className="icon-medallion"><AppIcon name={icon!} size={30} luminous/></span><span><strong>{title}</strong><small>{detail}</small></span></div>)}</div></section>
   {[settings.error,platform.error,habits.error,health.error].filter(Boolean).map((message,i)=><p role="alert" className="notice" key={i}>{message}</p>)}
   {financial&&platform.error&&legacy.loaded&&!legacy.error&&goals.some(g=>g.key.startsWith('legacy:'))&&<section className="panel" aria-label="Available local simulation Goals"><h2>Your local simulation Goals are still available.</h2><p>Private tracked records need recovery. These separate local simulation records remain readable.</p><ul>{goals.filter(g=>g.key.startsWith('legacy:')).map(g=><li key={g.key} data-goal-key={g.key}><Link href={g.href}>{g.name}</Link></li>)}</ul></section>}
   {integrityWarning&&<p role="alert" className="notice">{integrityWarning} <Link href="/app/wealth">Review saved sources →</Link></p>}
   {settings.loaded&&!settings.error&&!settings.data.onboarded&&<section className="dashboard-welcome panel"><h2>Make Today yours.</h2><p>Start with your interests. Your records stay as they are, and no wallet or account is required.</p><div className="dashboard-preset-choices">{PRESETS.map(p=><button className="secondary" key={p.id} onClick={()=>setPreset(p.id)}><strong>{p.label}</strong><span>{p.description}</span></button>)}</div><button className="text-link" onClick={()=>apply(s=>({...s,onboarded:true}))}>Keep Balanced and continue</button><p className="fine">Saved locally. Explore account, backup and encrypted-sync options in <Link href="/app/settings">Settings</Link>.</p></section>}
   <section aria-label="Your Today widgets" className="dashboard-widget-area">
    {customize&&<div className="section-heading dashboard-layout-heading"><h2>Arrange your daily space</h2><div className="dashboard-actions"><button className="primary" disabled={busy||settings.data.widgets.length>=24} onClick={()=>{setInsertAt(null);setEditor('new');}}>Add widget</button><button className="secondary" onClick={()=>setPreset(settings.data.preset)}>Choose preset</button></div></div>}
    <p role="status" className="dashboard-save-status">{status}</p>{error&&<p role="alert">{error}</p>}
    <div className="dashboard-layout-grid">{placement.main.map((ref,index)=>renderPlaced(ref,'main',index))}</div>
   </section>
  </div><aside className="today-rail" aria-label="Your next chapter">{placement.rail.map((ref,index)=>renderPlaced(ref,'rail',index))}</aside></div>
  <section id="how-it-works" className="journey-panel" aria-label="How it works"><div><p className="eyebrow">One journey. Your pace.</p><h2>What matters to you.<br/><span className="nebula-text">One day at a time.</span></h2></div><ol><li><strong>01 · Choose your interests</strong><p>Pick a starting layout. Add the Goals, Habits, assets and Health metrics you use.</p></li><li><strong>02 · Take a small step</strong><p>Log a Habit or meal, review a Goal, or record your tracked wealth. Financial execution remains disabled.</p></li><li><strong>03 · Keep your records safe</strong><p>Use Settings for local storage, backups and optional account setup. Browser storage is not a backup.</p></li></ol></section>
  {editor&&<WidgetEditor key={editor==='new'?'new':editor.id} initial={editor==='new'?undefined:editor} sources={sources} onClose={()=>{setEditor(null);setInsertAt(null);}} onSave={(w,rev)=>change(s=>{const saved=saveWidget(s,w,rev);return editor==='new'&&insertAt?moveDashboardItem(saved,{kind:'widget',id:w.id},{region:insertAt.region,anchor:insertAt.anchor,position:'after'}):saved;},'Widget saved on this device.')}/>}
  {preset&&<Modal title="Choose your Today layout" onClose={()=>setPreset(null)}><fieldset className="dashboard-preset-choices"><legend>Choose a starting point</legend>{PRESETS.map(p=><label key={p.id}><input type="radio" name="dashboard-preset" value={p.id} checked={preset===p.id} onChange={()=>setPreset(p.id)}/><span><strong>{p.label}</strong><small>{p.description}</small></span></label>)}</fieldset><h3>Layout preview</h3>{presetPreview?<><ul>{presetPreview.widgets.filter(w=>!w.hidden).map(w=><li key={w.id}>{w.title||WIDGET_CATALOG[w.kind].label} · {widgetMetricLabel(w.metric)}</li>)}</ul><p>{presetPreview.widgets.filter(w=>w.hidden).length} existing widgets will be kept but hidden. This changes placement and visibility only; Goals, Habits, Health and assets remain saved.</p></>:<p role="alert">{presetError}</p>}<div className="dashboard-actions"><button className="secondary" onClick={()=>setPreset(null)}>Cancel</button><button className="primary" disabled={busy||!presetPreview} onClick={()=>void change(s=>applyDashboardPreset(s,preset),'Preset saved on this device.').then(()=>setPreset(null)).catch(()=>{})}>Apply layout</button></div>{error&&<p role="alert">{error}</p>}</Modal>}
 </div>;
}
