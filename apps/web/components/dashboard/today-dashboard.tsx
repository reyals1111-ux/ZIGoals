'use client';
import {removedItems,reinsertItems} from '../../lib/undo-removal';
import {showToast} from '../ui/undo-toast';
import {TodayWeek} from '../bottom-sections';
import Link from 'next/link';
import {Suspense,cloneElement,isValidElement,lazy,useEffect,useMemo,useRef,useState,type ReactElement,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {useDeviceRecord} from '../ai/use-device-record';
import {CHESS_CACHE} from '../../lib/skills/chess/schema';
import {TODAY_CARDS,shownCards,toggleCard} from '../../lib/today-cards/store';
/** Session W Part 14: what asks chess.com and Lichess again, loaded only while a Chess widget is on Today. */
const ChessTodayRefresh=lazy(()=>import('../chess/chess-today'));
// Session AA-Cloud Part 8: the cards kept on this device load after the page (weights).
const TodayDeviceCards=lazy(()=>import('./today-device-cards'));
// Phase 2 (weights): the widget library opens with the Add widget dialog, the welcome card only on a new device: both chunks.
const WidgetLibrary=lazy(()=>import('./widget-library').then(m=>({default:m.WidgetLibrary})));
const MakeToday=lazy(()=>import('./make-today')),PresetChooser=lazy(()=>import('./preset-chooser'));
const WelcomeCard=lazy(()=>import('../onboarding/welcome-card').then(m=>({default:m.WelcomeCard})));
/** Session AE Gate C: while a new device's welcome cards load (their own chunks), their place is kept, so the widgets below
 *  do not jump up into view and back down (a layout shift over 0.1 on a busy machine: run11-layout-stability). */
const TodayReserve=({part}:{part:'welcome'|'make'})=><div className="today-reserve" data-reserve={part} aria-hidden="true"/>;
// Phase 2, Part 8 (owner request 9): the Journey widgets (device-only, while Gamify is on) and their switches in the picker.
const TodayGameCards=lazy(()=>import('../game/today-game-cards'));
const GameWidgetChoices=lazy(()=>import('../game/game-widget-choices'));
import {OrbitSlogan} from '../orbit-slogan';
import {NebulaFlow} from '../nebula-flow';
import {useUiPrefs} from '../../lib/ui-prefs/use-ui-prefs';
import {useGameEnabled} from '../game/use-game-enabled';
import {HeroFold} from './hero-fold';
import {HeroStar} from '../hero-star';
import {QuickAdd} from '../quick-add';
// Gate C weights: the how-to dialog is its own chunk (Today sat 0.3 kB over its budget; budgets are never raised).
const HowItWorks=lazy(()=>import('./how-it-works').then(m=>({default:m.HowItWorks})));
import {formatUnits,TESTNET} from '@zigoals/chain-config';
import {AppIcon} from '../app-icon';
import {ActivityFeed} from '../activity-feed';
import {usePhoneActive} from '../phone/use-phone-layout';
import {GoalSummaryCard} from '../goal-card';
import {SceneArt} from '../scene-art';
import {usePrivateStore} from '../use-private-store';
import {usePlatform} from '../platform/use-platform';
import {useGoals} from '../goal-provider';
import {useHabits} from '../habits/use-habits';
import {useHealth} from '../health/use-health';
import {useAutoCheckIns} from '../habits/use-auto-checkins';
import {TodayForYou,type ForYouParts} from '../for-you/today-for-you';
import {TodayFocus} from './today-focus';
import {TodayChecklistCard} from '../checklist/today-checklist-card';
import {ProgressSlot,Slot} from '../progress/slot';
import {HealthLinkContext} from '../habits/health-link-context';
import {exerciseData} from '../../lib/health-counters';
import {HabitsToday} from '../habits/habits-today';
import {HealthToday} from '../health/health-today';
import {HabitCompletion} from '../habits/habit-completion'; // the control alone (ADR-022 B53): Today never carries the full card
import {useMarketQuotes} from '../platform/use-market-quotes';
import {useEvidenceNow} from '../platform/use-evidence-now';
import {useLocalToday} from '../use-local-today';
import {isInvisibleName} from '../../lib/visible-text';
import {ProgressRing} from '../platform/financial-ui';
import {TodayIntelligence} from '../platform/today-intelligence';
import {StakingCard} from '../platform/staking-card';
import {WidgetOverview} from './widget-overview';
import {LayoutLockButton,LayoutPage,LayoutRegion,useSavedLayout,type LayoutEntry} from '../layout-edit';
import {entityLayoutId,resolveOrder,savedOrder} from '../../lib/page-layout';
import {CardOptions} from '../card-options';
import {AskZigiItem} from '../ai/ask-zigi-item';
import {wealthMarketRequests} from '../../lib/wealth';
import {unifiedGoalSummaries} from '../../lib/goal-summary';
import {attentionFirst,todayGoalRoles} from '../../lib/today/goal-roles';
import {dailyData,healthDay} from '../../lib/health-daily';
import {DASHBOARD_SETTINGS_KEY,dashboardSettingsSchema,TODAY_GROUPS,todayGroup,twinOf,type TodayGroup,emptyDashboardSettings,saveWidget,removeWidget,visibleDomains,WIDGET_CATALOG,DASHBOARD_BUILTINS,reconcileDashboardPlacement,moveDashboardItem,setDashboardBuiltinHidden,applyDashboardPreset,resetDashboardPlacement,type DashboardPreset,type DashboardWidget,type DashboardSettings,type WidgetKind,type DashboardBuiltinId,type DashboardItemRef,type DashboardRegion} from '../../lib/dashboard-settings';
import {dashboardIntegrityWarning,widgetMetric,type DashboardSources,type WidgetMetric} from '../../lib/dashboard-metrics';
import {widgetNeedsSource} from '../../lib/dashboard-widget-registry';
import './dashboard.css';
import {useShowcase} from '../showcase-controls';
import {noExistingData,onboardingSeen} from '../../lib/onboarding';
import {ACCOUNT_CHANGE,getAccountScope} from '../../lib/account-session';
import { formatPlainDecimal } from "../../lib/visual-format";
import {ReminderCards} from '../reminders/reminder-cards';
import {PhoneFold} from '../phone/phone-fold';
import {getAppStorage} from '../../lib/showcase-storage';
import {usePagesView} from '../pages/use-pages-view';
import {isShown,todayItemShown} from '../../lib/pages/visibility';
import {linksOf,sortedLinks} from '../../lib/links/engine';
import {TodayLinks} from '../links/today-links';
import {TodaySoundtrack} from '../music/today-soundtrack';
import {isFoldOpen,readTodayFolds,rememberFold,type TodayFolds} from '../../lib/today-folds';
import {LoadBoundary} from '../load-boundary';
import {Skeleton} from '../ui/skeleton';
import {WalletCard} from '../wallet/wallet-card';
/** On a phone these secondary Today modules fold to one row each, opened in place (Session I, Part 9). */
const PHONE_FOLDED=new Set<DashboardBuiltinId>(['watchlist','progress','wallet','staking','destination','activity']);
const PHONE_FOLD_LABEL:Partial<Record<string,string>>={watchlist:'Your market watch',progress:'Your financial progress',wallet:'Your wallet',staking:'Staking',destination:'Plan a new destination',activity:'Recent activity'};
function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null,dialog=ref.current;dialog?.showModal();return()=>{dialog?.close();previous?.focus();};},[]);
 return <dialog ref={ref} className="dashboard-dialog" aria-label={title} onCancel={onClose}><header><h2>{title}</h2><button className="secondary" type="button" onClick={onClose} aria-label="Close customization">Close</button></header>{children}</dialog>;
}
function Metric({metric,identity,flow=false}:{metric:WidgetMetric;identity:string;flow?:boolean}){return <><div className="dashboard-metric-value">{metric.percent!==undefined&&<ProgressRing percent={metric.percent} complete={metric.complete} size={88} identity={`widget-${identity}`} label={`${metric.title} progress`}/>}{/* Phase 2 closing pass: a figure sizes itself from its length (dashboard.css), so a money total never wraps. */}<strong className={/\d/.test(metric.value)&&!/[a-z]{4,}/.test(metric.value)?'is-figure':undefined} style={{'--chars':metric.value.length,'--ring':metric.percent!==undefined?'104px':'0px'} as import('react').CSSProperties}>{flow?<NebulaFlow identity={`widget-${identity}`}>{metric.value}</NebulaFlow>:metric.value}</strong></div><p className="fine">{metric.detail}</p>{metric.facts&&<dl className="dashboard-metric-facts">{metric.facts.map(f=><div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl>}{metric.warning&&<p className="notice">{metric.warning}</p>}<Link className="text-link" href={metric.href}>{metric.missing?'Review record':'Open details'} →</Link></>;}
function WidgetEditor({initial,sources,ready,onSave,onRemove,onClose}:{initial?:DashboardWidget;sources:DashboardSources;ready:(domain:string)=>boolean;onSave:(w:DashboardWidget,revision?:number)=>Promise<void>;onRemove?:()=>Promise<void>;onClose:()=>void}){
 const [kind,setKind]=useState<WidgetKind>(initial?.kind??'health'),[metric,setMetric]=useState(initial?.metric??'kcal'),[entity,setEntity]=useState(initial?.entity??''),[title,setTitle]=useState(initial?.title??''),[size,setSize]=useState<DashboardWidget['size']>(initial?.size??'compact');
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);const id=useRef(initial?.id??crypto.randomUUID());
 const requiresEntity=widgetNeedsSource(kind);
 const draft:DashboardWidget={id:id.current,kind,metric,...(requiresEntity||kind==='ecosystem'&&entity?{entity}:{}),title,size,hidden:initial?.hidden??false,revision:initial?.revision??1};
 const preview=widgetMetric(draft,sources);
 async function save(){if(isInvisibleName(title)){setError('Give the card title at least one visible character, or leave it empty.');return;}setBusy(true);setError('');try{await onSave(draft,initial?.revision);onClose();}catch(e){setError(e instanceof Error?e.message:'Could not save this widget.');}finally{setBusy(false);}}
 return <Modal title={initial?'Edit widget':'Add a widget'} onClose={onClose}>{!initial&&<LoadBoundary quiet><Suspense fallback={null}><GameWidgetChoices/></Suspense></LoadBoundary>}<form onSubmit={e=>{e.preventDefault();void save();}}><Suspense fallback={<Skeleton label="Opening the widget library…" lines={4}/>}><WidgetLibrary kind={kind} metric={metric} entity={entity} title={title} size={size} initial={initial} sources={sources} ready={ready} onKind={next=>{setKind(next);setMetric(WIDGET_CATALOG[next].metrics[0]);setEntity('');}} onMetric={setMetric} onEntity={setEntity} onTitle={setTitle} onSize={setSize}/></Suspense><section className="dashboard-widget-preview" aria-label="Widget preview" data-size={size} data-domain={WIDGET_CATALOG[kind].domain}><p className="eyebrow">PREVIEW · YOUR CURRENT RECORDS · {size==='wide'?'WIDE':'COMPACT'} CARD</p><h3>{preview.title}</h3><div className="dashboard-widget-preview-value">{preview.percent!==undefined&&<ProgressRing percent={preview.percent} complete={preview.complete} size={64} identity={`preview-${id.current}`} label={`${preview.title} progress`}/>}<strong>{preview.value}</strong></div><p>{preview.detail}</p>{preview.facts&&<dl className="dashboard-metric-facts">{preview.facts.map(f=><div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl>}{preview.warning&&<p>{preview.warning}</p>}</section>{error&&<p role="alert">{error}</p>}<div className="dashboard-actions">{initial&&onRemove&&<button type="button" className="secondary dashboard-remove" disabled={busy} onClick={()=>{setBusy(true);void onRemove().then(onClose).catch(e=>{setError(e instanceof Error?e.message:'Could not remove this widget.');setBusy(false);});}}>Remove widget</button>}<button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={busy||requiresEntity&&!entity}>{busy?'Saving…':'Save widget'}</button></div></form></Modal>;
}
export function TodayDashboard(){
 const settings=usePrivateStore(DASHBOARD_SETTINGS_KEY,dashboardSettingsSchema,emptyDashboardSettings);
 const platform=usePlatform(),legacy=useGoals(),habits=useHabits(),health=useHealth(),today=useLocalToday();
 // H7: linked habits tick themselves off from the Health journal on this page; the cards word it with the counter names.
 useAutoCheckIns({habits,health});
 const healthLinkContext=useMemo(()=>({counters:exerciseData(health.data).counters,waterUnit:dailyData(health.data).preferences.waterUnit}),[health.data]);
 const showcase=useShowcase(),[welcomeDismissed,setWelcomeDismissed]=useState(false),phone=usePhoneActive();
 // Session W Part 2: Quick add and the Health shortcut follow Your pages & buttons.
 const pagesView=usePagesView(),showQuickAdd=isShown(pagesView,'quick-add'),showHealth=isShown(pagesView,'health');
 // Session W Part 19: My links' card shows once a link exists, while its button is shown under Your pages & buttons.
 const myLinks=settings.loaded&&!settings.error?sortedLinks(linksOf(settings.data)):[];
 // The first-run welcome (Session E) appears only for a device that is certainly brand-new: every store read without
 // error, Today not yet chosen, no Showcase, no account, no private record stored and the welcome never seen here.
 const storesReady=settings.loaded&&!settings.error&&platform.loaded&&!platform.error&&habits.loaded&&!habits.error&&health.loaded&&!health.error&&legacy.loaded;
 let brandNew=false;
 if(!welcomeDismissed&&!showcase&&storesReady&&!settings.data.onboarded&&!platform.data.goals.length&&!platform.data.positions.length&&!habits.data.habits.length&&!legacy.goals.length){try{brandNew=!getAccountScope()&&!onboardingSeen(window.localStorage)&&noExistingData(window.localStorage);}catch{brandNew=false;}}
 const domains=visibleDomains(settings.data),financial=domains.includes('wealth')||domains.includes('goals');
 // Session Z-Cloud Part 4.3 (persona item 3): plain words until Keplr is connected (components/shell.tsx says the same).
 const plainWords=legacy.mode==='local'&&legacy.walletState!=='CONNECTED';
 const market=useMarketQuotes(settings.loaded&&financial?wealthMarketRequests(platform.data):false),now=useEvidenceNow(platform.data,market.now);
 const goals=unifiedGoalSummaries(legacy.goals,legacy.metadata?.goals??{},platform.data,market.quotes,now,legacy.mode==='local'?'Local simulation':'Future Goal Manager').filter(g=>!g.key.startsWith('legacy:')||!platform.data.legacyGoalUi?.[`${legacy.chain}:${legacy.owner}:${g.id}`]?.archived);
 const chessCache=useDeviceRecord(CHESS_CACHE);
 const todayCards=useDeviceRecord(TODAY_CARDS),deviceCards=todayCards.loaded&&!todayCards.unreadable?shownCards(todayCards.data):[];
 const sources:DashboardSources={platform:platform.data,goals,habits:habits.data,health:health.data,quotes:market.quotes,now,today,healthDate:healthDay(dailyData(health.data).preferences.timezone),...(chessCache.loaded&&!chessCache.unreadable?{chess:chessCache.data}:{})};
 const placement=reconcileDashboardPlacement(settings.data);
 const [customize,setCustomize]=useState(false),[editor,setEditor]=useState<DashboardWidget|'new'|null>(null),[preset,setPreset]=useState<DashboardPreset|null>(null),[status,setStatus]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [insertAt,setInsertAt]=useState<{region:DashboardRegion;anchor:DashboardItemRef}|null>(null);
 // Session V Part 1b: the widget rows a person left open on a phone stay open (zigoals:today-folds:v1), written only when
 // the person opens or closes a row. Read on the client's first render, so a remembered row is open the first time it
 // shows (the phone rows only appear after hydration, so the server's folded markup never differs), and read again
 // after mount and whenever the account changes.
 const [folds,setFolds]=useState<TodayFolds|null>(()=>{if(typeof window==='undefined')return null;try{return readTodayFolds(getAppStorage());}catch{return null;}});
 useEffect(()=>{let active=true;const read=()=>{if(!active)return;try{setFolds(readTodayFolds(getAppStorage()));}catch{setFolds(null);}};queueMicrotask(read);window.addEventListener(ACCOUNT_CHANGE,read);return()=>{active=false;window.removeEventListener(ACCOUNT_CHANGE,read);};},[showcase]);
 const toggleFold=(id:string,open:boolean)=>{try{setFolds(rememberFold(getAppStorage(),id,open));}catch{/* storage refused: the row still opens, it is just not remembered */}};
 const loaded=(domain:string)=>domain==='health'?health.loaded:domain==='habits'?habits.loaded:platform.loaded&&legacy.loaded;
 const domainError=(domain:string)=>domain==='health'?health.error:domain==='habits'?habits.error:platform.error;
 const savedLayout=useSavedLayout();
 const active=goals.filter(g=>g.status==='active');
 // Today's Goal cards follow the order arranged on the Goals page.
 const cardOrder=resolveOrder(goals.map(g=>entityLayoutId(g.key)),savedOrder(savedLayout,'goals','cards'));
 const activeCards=[...active].sort((a,b)=>cardOrder.indexOf(entityLayoutId(a.key))-cardOrder.indexOf(entityLayoutId(b.key)));
 // Session AF (L5a, Part 10.10): "Next step", "What matters today" and the goal cards each say something different
 // (lib/today/goal-roles.ts): the top goal's next step, the most urgent other goal, each goal's progress.
 const roles=todayGoalRoles(activeCards,platform.data.goals,today),nextGoal=roles.focus?.goal;
 const integrityWarning=platform.loaded&&!platform.error?dashboardIntegrityWarning(platform.data):undefined;
 const hasFundingGoal=platform.data.goals.some(g=>g.status!=='closed'&&g.type!=='PROJECT');
 const meta=(id:DashboardBuiltinId)=>DASHBOARD_BUILTINS.find(b=>b.id===id)!;
 async function change(update:(s:DashboardSettings)=>DashboardSettings,message='Layout saved on this device.'){
  setBusy(true);setError('');
  // Session AH Part 3 (DS5): a change that only removed something (a widget) offers a labelled Undo in the app's toast.
  let before:DashboardSettings|undefined,after:DashboardSettings|undefined;
  try{await settings.update(s=>{const next=update(s);before=s;after=next;return next;});const removed=before===undefined?null:removedItems(before,after);if(removed)showToast({message,undone:'Put back on Today.',undo:()=>settings.update(s=>reinsertItems(s,removed))});else setStatus(message);}catch(e){setError(e instanceof Error?e.message:'Could not save the layout.');throw e;}finally{setBusy(false);}
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
 const layoutId=(ref:DashboardItemRef)=>`${ref.kind}:${ref.id}`;
 const refLabel=(ref:DashboardItemRef)=>{if(ref.kind==='widget'){const w=settings.data.widgets.find(x=>x.id===ref.id);return w?w.title||WIDGET_CATALOG[w.kind].label:'Widget';}return meta(ref.id as DashboardBuiltinId).label;};
 /** Drag or arrow moves on Today go through the existing synced placement: the card is placed before (or after) its new visible neighbour. */
 async function placeAt(region:DashboardRegion,id:string,to:number,order:string[]){
  const ref=placement[region].find(r=>layoutId(r)===id);if(!ref)return;
  const after=order[to+1],before=order[to-1],anchor=placement[region].find(r=>layoutId(r)===(after??before));
  if(!anchor)return;
  await change(s=>moveDashboardItem(s,ref,{region,anchor,position:after?'before':'after'},placement.revision),`${refLabel(ref)} moved. Layout saved on this device.`);
 }
 const regionItems=(region:DashboardRegion):LayoutEntry[]=>{
  const entries=placement[region].flatMap((ref,index):(LayoutEntry&{group:TodayGroup})[]=>{const node=renderPlaced(ref,region,index);return node?[{id:layoutId(ref),label:refLabel(ref),node,group:todayGroup(ref,settings.data.widgets)}]:[];});
  // Session AA-Cloud Part 1: small group headings while Today keeps its default order and is not being arranged; a
  // person's own arrangement is shown exactly as saved, without headings.
  // The heading opens its group's first card (it is never a movable item of its own).
  if(region!=='main'||customize||settings.data.placement)return entries.map(e=>({id:e.id,label:e.label,node:e.node}));
  let last:TodayGroup|null=null;
  return entries.map(({group,...entry})=>{if(group===last||!isValidElement(entry.node))return entry;last=group;const g=TODAY_GROUPS.find(x=>x.id===group)!,node=entry.node as ReactElement<{children?:ReactNode;'data-group-start'?:string}>;return {...entry,node:cloneElement(node,{'data-group-start':group},<><h2 className="today-group-heading" data-group={group}>{g.label}</h2>{node.props.children}</>)};});
 };
 function addAfter(ref:DashboardItemRef,region:DashboardRegion){setInsertAt({region,anchor:ref});setEditor('new');}
 function renderWidget(w:DashboardWidget,region:DashboardRegion,index:number){
  const metric=widgetMetric(w,sources),domain=WIDGET_CATALOG[w.kind].domain,habit=w.kind==='habit'?habits.data.habits.find(h=>h.id===w.entity):undefined,ref:DashboardItemRef={kind:'widget',id:w.id};
  return <article id={`dashboard-widget-${w.id}`} className="dashboard-widget panel" data-domain={domain} data-size={w.size} data-hidden={w.hidden?'true':undefined} aria-label={metric.title}>
   <span className="dashboard-widget-art" aria-hidden="true"><AppIcon name={domain==='wealth'?'wallet':domain} size={82} luminous/></span>
   <div className="dashboard-widget-heading"><AppIcon name={domain==='wealth'?'wallet':domain} luminous/><h3>{metric.title}</h3>{w.hidden&&<span className="pill">Hidden</span>}</div>
   {!loaded(domain)?<p role="status">Loading records…</p>:domainError(domain)?<p role="alert">This data needs attention. Open Settings to recover it.</p>:w.kind==='habits'?<HabitsToday/>:w.kind==='music'?<TodaySoundtrack/>:<><Metric metric={metric} identity={w.id} flow={w.kind==='wealth'&&!metric.missing}/>{habit&&w.metric==='today'&&<HabitCompletion habit={habit} store={habits} compact/>}{w.kind==='goals'&&<ul className="dashboard-goal-links">{active.slice(0,3).map(g=><li key={g.key}><Link href={g.href}>{g.name}</Link></li>)}</ul>}</>}
   {w.kind==='chess'&&!w.hidden&&<LoadBoundary quiet><Suspense fallback={null}><ChessTodayRefresh/></Suspense></LoadBoundary>}
   <CardOptions label={metric.title}><AskZigiItem kind={w.kind} metric={w.metric} name={habit?.title??(w.entity?goals.find(g=>g.key===w.entity)?.name:undefined)}/><button type="button" disabled={busy} onClick={()=>setEditor(w)}>Edit widget</button><button type="button" disabled={busy} onClick={()=>apply(s=>saveWidget(s,{...w,hidden:!w.hidden},w.revision))}>{w.hidden?'Show widget':'Hide widget'}</button><button type="button" aria-label={`Move ${metric.title} up`} disabled={busy||index===0} onClick={()=>relocate(ref,region,index,-1,metric.title)}>Move earlier</button><button type="button" aria-label={`Move ${metric.title} down`} disabled={busy||index===placement[region].length-1} onClick={()=>relocate(ref,region,index,1,metric.title)}>Move later</button><button type="button" onClick={()=>moveLane(ref,region,metric.title)} disabled={busy}>Move to {region==='main'?'rail':'main'}</button><button type="button" disabled={busy||w.size==='compact'} onClick={()=>apply(s=>saveWidget(s,{...w,size:'compact'},w.revision),'Compact size saved.')}>Compact size</button><button type="button" disabled={busy||w.size==='wide'} onClick={()=>apply(s=>saveWidget(s,{...w,size:'wide'},w.revision),'Wide size saved.')}>Wide size</button><button type="button" disabled={busy} onClick={()=>apply(s=>removeWidget(s,w.id),'Widget removed. Your underlying record was kept.')}>Remove widget</button></CardOptions>
  </article>;
 }
 const intelligence=(module:'life'|'attention'|'funding'|'needs-attention'|'watchlist')=><TodayIntelligence sources={module==='attention'?{...sources,platform:{...platform.data,goals:attentionFirst(platform.data.goals,roles)}}:sources} habitsReady={habits.loaded&&!habits.error} healthReady={health.loaded&&!health.error} module={module}/>;
 function renderBuiltin(id:DashboardBuiltinId){
  if(['whole-life','attention','funding','needs-attention','watchlist'].includes(id)){
   if(!financial||!platform.loaded||!!platform.error||id==='attention'&&!hasFundingGoal)return null;
   return intelligence(({ 'whole-life':'life',attention:'attention',funding:'funding','needs-attention':'needs-attention',watchlist:'watchlist'} as const)[id as 'whole-life'|'attention'|'funding'|'needs-attention'|'watchlist']);
  }
  switch(id){
   case 'goals':return financial?<section className="today-goals surface-featured" aria-label="Your goals"><div className="section-heading"><div><h2>Your goals</h2><p>Small steps. A bigger future.</p></div><Link href="/app/goals" className="text-link">View all goals →</Link></div>{!legacy.loaded||!platform.loaded?<Skeleton label="Loading your Goals…" block lines={2}/>:active.length?<div className="today-goals-grid">{activeCards.map(g=><GoalSummaryCard key={g.key} summary={g} compact/>)}<Link href="/app/goals/new" className="new-destination-card"><span aria-hidden="true">＋</span><strong>Create a new goal</strong><small>A new destination<br/>is waiting.</small></Link></div>:<div className="today-goal-empty"><div><AppIcon name="goals" size={42}/><h3>A plan with your name on it.</h3><p>Choose what matters. Set a target. See the next step.</p><Link className="text-link" href="/app/goals/new">Create your first goal →</Link></div><SceneArt scene="home"/></div>}<p className="local-label">{legacy.mode==='local'?'Local demo · simulated ZIG, never wallet funds':'Testnet wallet view · financial execution disabled'}</p></section>:null;
   case 'progress':return financial?<section className="progress-summary" aria-label="Your financial progress"><div className="section-heading"><div><h2>Your financial progress</h2><p>Built on your contributions.</p></div><span className="pill">Idle strategy</span></div><div className="progress-stats"><div><AppIcon name="goals"/><strong>{active.length}</strong><small>Active goals</small></div><div><AppIcon name="activity"/><strong>{formatPlainDecimal(formatUnits(legacy.goals.reduce((total,g)=>total+BigInt(g.position_units),0n).toString(),TESTNET.nativeAsset.decimals))} <span>ZIG</span></strong><small>{legacy.mode==='local'?'Simulated local allocation':'Known wallet Goal allocation'}</small></div><div><AppIcon name="ecosystem"/><strong>None</strong><small>Future return assumed</small></div></div></section>:null;
   case 'habits':return domains.includes('habits')?<HabitsToday/>:null;
   case 'health':return domains.includes('health')?<HealthToday/>:null;
   case 'next-action':return financial&&nextGoal?<div className="next-step"><span className="eyebrow">Your next goal action</span><Link href={nextGoal.href} className="text-link">Review {nextGoal.name} →</Link></div>:null;
   case 'summary':return <WidgetOverview widgets={settings.data.widgets.filter(w=>todayItemShown(pagesView,{widgetDomain:WIDGET_CATALOG[w.kind].domain}))} sources={sources} loaded={settings.loaded} error={settings.error} ready={loaded} domainError={domainError} customizing={customize} onCustomize={()=>{setCustomize(x=>!x);requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>('[data-customize-today]')?.focus());}}/>;
   // Session AE (Part 6, ADR-027): the same card, with the wallet chooser and the display currency (components/wallet/wallet-card.tsx).
   case 'wallet':return financial?<WalletCard plainWords={plainWords}/>:null;
   case 'staking':return financial?<StakingCard/>:null;
   case 'destination':return financial?<section className="destination-panel" aria-labelledby="destination-title"><div><p className="eyebrow">Start with what matters</p><h2 id="destination-title"><NebulaFlow identity="today-destination-title">A destination for your next chapter.</NebulaFlow></h2><p>A home. A safety net. A trip you’ve been waiting for. {plainWords?'Give your savings a purpose.':'Give your ZIG a purpose.'}</p><Link href="/app/goals/new" className="primary">{goals.length?'Plan my next goal →':'Plan my first goal →'}</Link><div className="destination-steps"><div><AppIcon name="settings" luminous/><strong>Set a goal</strong><small>Define your future</small></div><div><AppIcon name="goals" luminous/><strong>Stay consistent</strong><small>Track your progress</small></div><div><AppIcon name="today" luminous/><strong>Reach farther</strong><small>A brighter tomorrow</small></div></div></div></section>:null;
   case 'activity':return financial?<section className="recent-panel"><div className="section-heading"><h2>Recent activity</h2><Link href="/app/activity" className="text-link">View all →</Link></div><ActivityFeed limit={phone?2:4}/></section>:null;
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
  // Session W Part 13: an item of a hidden page leaves Today with it (kept, and back when the page shows again).
  const withPage=ref.kind==='widget'?todayItemShown(pagesView,{widgetDomain:WIDGET_CATALOG[widget!.kind].domain}):todayItemShown(pagesView,{builtin:ref.id});
  if(!withPage&&!customize)return null;
  const label=ref.kind==='widget'?widget!.title||WIDGET_CATALOG[widget!.kind].label:builtin!.label;
  // Session U follow-up F3: on a phone each widget card also folds to a row named by the widget and opens in place; the
  // overview ("Your selected widgets") still shows every widget's value at a glance, so nothing is removed. While Today
  // is being customized no widget folds, so every card and its options stay in reach.
  // Session AC: a widget standing in for its hidden built-in twin (Daily Habits, Daily Health) folds as that built-in does.
  const twin=widget?twinOf(widget):null,standsIn=!!twin&&placement.hiddenBuiltins.includes(twin);
  const foldLabel=ref.kind==='widget'&&!standsIn?(customize?undefined:widgetMetric(widget!,sources).title):PHONE_FOLDED.has((standsIn?twin:ref.id) as DashboardBuiltinId)?PHONE_FOLD_LABEL[standsIn?twin!:ref.id]??label:undefined;
  return <div key={`${ref.kind}:${ref.id}`} id={itemId(ref)} tabIndex={-1} className="placed-module" data-kind={ref.kind} data-module={ref.id} data-size={widget?.size} data-hidden={hidden?'true':undefined} data-stands-in={standsIn?twin!:undefined}>
   {customize&&ref.kind==='builtin'&&<div className="dashboard-builtin-options"><CardOptions label={label}><button type="button" disabled={busy||index===0} onClick={()=>relocate(ref,region,index,-1,label)}>Move earlier</button><button type="button" disabled={busy||index===placement[region].length-1} onClick={()=>relocate(ref,region,index,1,label)}>Move later</button>{builtin!.hideable&&<button type="button" disabled={busy} onClick={()=>apply(s=>setDashboardBuiltinHidden(s,ref.id as DashboardBuiltinId,!hidden,placement.revision))}>{hidden?'Show card':'Hide card'}</button>}</CardOptions></div>}
   {!withPage?<p className="dashboard-hidden-placeholder">{label} is hidden with its page. Show the page again in Settings, under Your pages &amp; buttons.</p>:hidden&&ref.kind==='builtin'?<p className="dashboard-hidden-placeholder">{label} is hidden from Today.</p>:foldLabel?<PhoneFold label={foldLabel} {...(ref.kind==='widget'?{remembered:!!folds&&isFoldOpen(folds,ref.id),onToggle:(open:boolean)=>toggleFold(ref.id,open)}:{})}>{content}</PhoneFold>:content}
   {customize&&<button type="button" className="dashboard-insert-here" disabled={busy||settings.data.widgets.length>=24} onClick={()=>addAfter(ref,region)}>+ Add widget after {label}</button>}
  </div>;
 }
 // Session Z-Cloud Part 4.1 (persona item 1): with nothing in the rail (Habits + Health, Habits only) Today is one centred
 // column at a reading width; while arranging, the rail stays as a place to move modules to.
 const railItems=regionItems('rail'),single=!railItems.length&&!customize;
 let presetPreview:DashboardSettings|null=null,presetError='';
 if(preset)try{presetPreview=applyDashboardPreset(settings.data,preset);}catch(e){presetError=e instanceof Error?e.message:'This layout cannot be applied without removing a saved widget.';}
 // Session AA-Cloud Part 1 (docs/product/PAGE_ORDER_AA.md): the hero, then Today's focus, the grouped widgets, For you,
 // and What's new with the summaries at the end. "Make Today yours" stays a new device's first action; in the Showcase
 // it waits at the end of the main column.
 // Session AB-Design (owner request 12): the habits widget (the built-in card or a habits widget, not hidden) lists the due habits itself, so the focus tile stands down beside it.
 const habitsWidgetShown=domains.includes('habits')&&settings.loaded&&!settings.error&&((settings.data.placement?!settings.data.placement.hiddenBuiltins.includes('habits'):true)||settings.data.widgets.some(w=>w.kind==='habits'&&!w.hidden));
 const uiPrefs=useUiPrefs(),heroCollapsed=uiPrefs.loaded&&!uiPrefs.unreadable&&!!uiPrefs.data.heroCollapsed,gameOn=useGameEnabled();
 const setHeroCollapsed=(value:boolean)=>{try{uiPrefs.update(p=>({...p,heroCollapsed:value}));}catch{setError('This device refused to save that choice.');}};
 const [focusPlace,setFocusPlace]=useState<HTMLDivElement|null>(null),[mainPlace,setMainPlace]=useState<HTMLDivElement|null>(null),[endPlace,setEndPlace]=useState<HTMLDivElement|null>(null);
 const forYouOn=settings.loaded&&!settings.error&&(settings.data.onboarded||showcase)&&!brandNew&&storesReady;
 const makeToday=settings.loaded&&!settings.error&&!settings.data.onboarded?<Suspense fallback={<TodayReserve part="make"/>}><MakeToday chosen={settings.data.preset} onChoose={setPreset} onContinue={()=>apply(s=>({...s,onboarded:true}))}/></Suspense>:null;
 // The For you cards render into three fixed places (portals), so the page's own tree never changes shape when they
 // arrive: the hero and its slogan mount once per visit.
 const layout=(parts:ForYouParts)=><div className="today-page personalized-today" data-interests={settings.data.preset} data-single={single?'':undefined}>
  <div className="today-layout"><div className="today-primary">
   {heroCollapsed?<section className="today-hero today-hero-folded" aria-labelledby="dashboard-title"><LayoutLockButton/><h1 id="dashboard-title" className="sr-only">Today</h1><div className="today-hero-strip"><p className="eyebrow page-eyebrow financial-orbit"><NebulaFlow identity="today-eyebrow-folded">YOUR FINANCIAL ORBIT</NebulaFlow></p><div className="hero-actions">{financial?showQuickAdd&&<QuickAdd triggerClassName="primary"/>:showHealth&&<Link className="primary" href="/app/health">Open Health</Link>}</div><HeroFold collapsed onToggle={()=>setHeroCollapsed(false)}/></div></section>
   :<section className="today-hero" aria-labelledby="dashboard-title"><div className="today-scene" aria-hidden="true"/><div className="cosmic-glow ambient-light" aria-hidden="true"/><HeroStar/><LayoutLockButton/><HeroFold collapsed={false} onToggle={()=>setHeroCollapsed(true)}/><div className="today-hero-copy"><p className="eyebrow page-eyebrow financial-orbit"><NebulaFlow identity="today-eyebrow">YOUR FINANCIAL ORBIT</NebulaFlow></p><h1 id="dashboard-title" className="orbit-slogan"><OrbitSlogan/></h1><p className="page-lede today-lede">Set goals. Build habits. Protect your health.<br/>Make room for a brighter tomorrow.</p><div className="hero-actions">{financial?showQuickAdd&&<QuickAdd triggerClassName="primary"/>:showHealth&&<Link className="primary" href="/app/health">Open Health</Link>}<Suspense fallback={null}><HowItWorks/></Suspense></div></div><div className="hero-pillars" role="group" aria-label="Your connected journey">{(financial?[['goals','Your goals',plainWords?'Give your savings a purpose.':'Give your ZIG a purpose.'],['future','Your future','Build habits. Live well.'],['chain','Onchain','ZIGChain vision · Alpha simulation.']]:[['goals','Your goals','A destination with meaning.'],['habits','Your rhythm','Small steps, your pace.'],['health','Your wellbeing','Care for the everyday.']]).map(([icon,title,detail])=><div key={icon}><span className="icon-medallion"><AppIcon name={icon!} size={30} luminous/></span><span><strong>{title}</strong><small>{detail}</small></span></div>)}</div></section>}
   <ProgressSlot page="today"/>
   {brandNew&&<Suspense fallback={<TodayReserve part="welcome"/>}><WelcomeCard demoAvailable={legacy.mode==='local'} onDismiss={()=>setWelcomeDismissed(true)}/></Suspense>}
   {[settings.error,platform.error,habits.error,health.error].filter(Boolean).map((message,i)=><p role="alert" className="notice" key={i}>{message}</p>)}
   {financial&&platform.error&&legacy.loaded&&!legacy.error&&goals.some(g=>g.key.startsWith('legacy:'))&&<section className="panel" aria-label="Available local simulation Goals"><h2>Your local simulation Goals are still available.</h2><p>Private tracked records need recovery. These separate local simulation records remain readable.</p><ul>{goals.filter(g=>g.key.startsWith('legacy:')).map(g=><li key={g.key} data-goal-key={g.key}><Link href={g.href}>{g.name}</Link></li>)}</ul></section>}
   {integrityWarning&&<p role="alert" className="notice">{integrityWarning} <Link href="/app/wealth">Review saved sources →</Link></p>}
   {!showcase&&makeToday}
   {!brandNew&&<TodayFocus habitsWidget={habitsWidgetShown} reminders={<>{habits.loaded&&health.loaded&&<ReminderCards habits={habits.error?undefined:habits.data} health={health.error?undefined:health.data}/>}{parts.focus}<div className="for-you-place" ref={setFocusPlace}/></>} nextGoal={nextGoal} step={roles.focus?.step} financial={financial} showHabits={domains.includes('habits')&&isShown(pagesView,'habits')} showHealth={domains.includes('health')&&showHealth} healthDate={sources.healthDate}/>}
   {/* Session AF (L3, P7.21): the Checklist's progress card after Today's focus — a fixed card (Today's main order lives in the strict synced dashboard placement, ADR-028 H95); hidden when the Checklist is off on this device. */}
   {!brandNew&&<TodayChecklistCard/>}
   <section aria-label="Your Today widgets" className="dashboard-widget-area">
    {customize&&<div className="section-heading dashboard-layout-heading"><h2>Arrange your daily space</h2><div className="dashboard-actions"><button className="primary" disabled={busy||settings.data.widgets.length>=24} onClick={()=>{setInsertAt(null);setEditor('new');}}>Add widget</button><button className="secondary" onClick={()=>setPreset(settings.data.preset)}>Choose preset</button></div></div>}
    <p role="status" className="dashboard-save-status">{status}</p>{error&&<p role="alert">{error}</p>}
    <div className="dashboard-layout-grid"><LayoutRegion region="main" items={regionItems('main')} onMove={(id,to,order)=>placeAt('main',id,to,order)}/></div>
   </section>
   {platform.loaded&&habits.loaded&&health.loaded&&(deviceCards.length>0||customize&&todayCards.loaded&&!todayCards.unreadable)&&<LoadBoundary quiet><Suspense fallback={null}><TodayDeviceCards shown={deviceCards} customize={customize} onToggle={id=>{try{todayCards.update(c=>toggleCard(c,id));}catch{setError('This device refused to save that card choice.');}}} platform={platform.data} quotes={market.quotes} now={now} today={today} habits={habits.data} health={health.data} goals={goals}/></Suspense></LoadBoundary>}
   {gameOn&&uiPrefs.loaded&&!uiPrefs.unreadable&&!!uiPrefs.data.today?.gameWidgets?.length&&<LoadBoundary quiet><Suspense fallback={null}><TodayGameCards/></Suspense></LoadBoundary>}
  </div>
  {/* Gate C design review (finding 9): For you (and the Showcase's "Make Today yours") follow the main column in reading
      order but sit under both columns on a computer, as "Updates and summaries" does: the rail's column stayed reserved,
      empty, beside them once Recent activity ended (≈ 280 px beside a 498 px column at 1024 px). Before the rail in the
      page's order, exactly where they were. */}
  <div className="today-after">
   {parts.main}<div className="for-you-place" ref={setMainPlace}/>
   {showcase&&makeToday&&<PhoneFold label="Make Today yours">{makeToday}</PhoneFold>}
  </div>{!single&&<aside className="today-rail" aria-label="Your next chapter"><LayoutRegion region="rail" items={railItems} onMove={(id,to,order)=>placeAt('rail',id,to,order)}/></aside>}</div>
  {parts.end}<div className="for-you-place" ref={setEndPlace}/>
  {/* Session AB-Design (owner requests 9 and 11): Your week, then the game card while Gamify is on, then My links as the last card before the footer. Saved orders are kept (resolveOrder); "Reset this page" offers this order. */}
  {platform.loaded&&habits.loaded&&health.loaded&&<LayoutRegion region="bottom" items={[{id:'today:week',label:'Your week',node:<PhoneFold label="Your week"><TodayWeek today={sources.healthDate} habits={habits.data} health={health.data} platform={platform.data} financial={financial}/></PhoneFold>},gameOn&&{id:'today:game',label:'Your progress',node:<div className="today-game-place"><Slot place="today:game"/></div>},myLinks.length>0&&isShown(pagesView,'links')&&{id:'today:links',label:'My links',node:<PhoneFold label="My links"><TodayLinks links={myLinks}/></PhoneFold>}]}/>}
  {editor&&<WidgetEditor key={editor==='new'?'new':editor.id} initial={editor==='new'?undefined:editor} sources={sources} ready={loaded} onRemove={editor==='new'?undefined:()=>change(s=>removeWidget(s,editor.id),'Widget removed. Your underlying record was kept.')} onClose={()=>{setEditor(null);setInsertAt(null);}} onSave={(w,rev)=>change(s=>{const saved=saveWidget(s,w,rev);return editor==='new'&&insertAt?moveDashboardItem(saved,{kind:'widget',id:w.id},{region:insertAt.region,anchor:insertAt.anchor,position:'after'}):saved;},'Widget saved on this device.')}/>}
  {preset&&<Modal title="Choose your Today layout" onClose={()=>setPreset(null)}><Suspense fallback={null}><PresetChooser preset={preset} onChoose={setPreset} preview={presetPreview} previewError={presetError} busy={busy} error={error} onCancel={()=>setPreset(null)} onApply={()=>void change(s=>applyDashboardPreset(s,preset),'Preset saved on this device.').then(()=>setPreset(null)).catch(()=>{})}/></Suspense></Modal>}
 </div>;
 return <HealthLinkContext.Provider value={healthLinkContext}><LayoutPage page="today" unlocked={customize} onUnlockedChange={setCustomize} onReset={()=>apply(s=>resetDashboardPlacement(s),'Today is back to its default layout.')}>
  {layout({focus:null,main:null,end:null})}
  {forYouOn&&<TodayForYou reviewOnToday={deviceCards.includes('review')} habits={habits.data} health={health.data} platform={platform.data} localGoals={legacy.goals} metadata={legacy.metadata?.goals??{}} quotes={market.quotes} now={now} today={today} financial={financial} showcase={showcase} render={parts=><>{focusPlace&&createPortal(parts.focus,focusPlace)}{mainPlace&&createPortal(parts.main,mainPlace)}{endPlace&&createPortal(parts.end,endPlace)}</>}/>}
 </LayoutPage></HealthLinkContext.Provider>;
}
