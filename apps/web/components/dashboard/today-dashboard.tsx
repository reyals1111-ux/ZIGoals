'use client';
import {removedItems,reinsertItems} from '../../lib/undo-removal';
import {showUndo} from '../ui/undo-toast';
import {useBackCloses} from '../use-back-closes';
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
const TodayWrapped=lazy(()=>import('./today-wrapped'));
const TodayTasksDue=lazy(()=>import('../tasks/today-tasks-due'));
// Phase 2 (weights): the widget library opens with the Add widget dialog, the welcome card only on a new device: both chunks.
const WidgetLibrary=lazy(()=>import('./widget-library').then(m=>({default:m.WidgetLibrary})));
const MakeToday=lazy(()=>import('./make-today')),PresetChooser=lazy(()=>import('./preset-chooser'));
const FirstFive=lazy(()=>import('../onboarding/first-five'));
const WelcomeCard=lazy(()=>import('../onboarding/welcome-card').then(m=>({default:m.WelcomeCard}))),FirstRunEntryCard=lazy(()=>import('../onboarding/welcome-card').then(m=>({default:m.FirstRunEntry})));
const FirstRunEntry=({demoAvailable}:{demoAvailable:boolean})=><Suspense fallback={null}><FirstRunEntryCard demoAvailable={demoAvailable}/></Suspense>;
// Session AK P4 (FIRST_RUN_REVIEW FR-4): "You're set" after the welcome, in the welcome card's place; its chunk loads only
// on a device whose welcome set something up (a raw read of the setup record's key; the card itself reads it properly).
const SetupLanding=lazy(()=>import('../onboarding/setup-landing').then(m=>({default:m.SetupLanding})));
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
import {ActivityFeed} from '../activity-feed-lazy'; // CI14: the list is its own chunk (weights)
import {usePhoneActive} from '../phone/use-phone-layout';
import {GoalSummaryCard} from '../goal-card';
import {RovingGroup} from '../ui/roving-group'; // Session AO (D-028): the goal cards' titles are one Tab stop
import {SceneArt} from '../scene-art';
import {usePrivateStore} from '../use-private-store';
import {usePlatform} from '../platform/use-platform';
import {useGoals} from '../goal-provider';
import {useHabits} from '../habits/use-habits';
import {useHealth} from '../health/use-health';
import {useAutoCheckIns} from '../habits/use-auto-checkins';
import type {ForYouParts} from '../for-you/today-for-you';
// CI14 (page weights; budgets are never raised): For you renders only once Today's stores have been read (after mount;
// never on the server or the first paint), into its three fixed places, so its code is a chunk of its own, asked for as
// this page loads; its stylesheets stay here, in the order it brought them, so the cascade is unchanged.
import '../insights/insights.css';
import '../health-goals/health-goals.css';
import '../coach/guide.css';
import '../weekly-review/weekly-review.css';
import '../for-you/for-you.css';
import '../earn/today-earn-card.css';
import '../stories/today-stories-card.css';
import '../skeleton/zg-skeleton.css';
// CI19 (CI 1575: guide:46, whats-new:36/57): read through use-chunk, not lazy()+Suspense. A lazy part that suspends after
// mount is revealed by React no sooner than 300 ms after its (empty) fallback was committed, so For you arrived about
// 300 ms after the rest of Today even with its chunk long since here. With the chunk in hand (it is asked for as this
// module runs, well before the stores are read) For you now mounts in the same render as the rest, as before CI14; if
// it is still on its way it mounts the moment it arrives. A chunk that cannot be fetched shows nothing, as before.
const useForYou=chunk(()=>import('../for-you/today-for-you'));
import {TodayFocus} from './today-focus';
import {TodaySkips} from './today-skips';
import {chunk} from '../use-chunk';
import {TodayLine} from './today-line';
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
import {todayGoalRoles} from '../../lib/today/goal-roles';
import {dailyData,healthDay} from '../../lib/health-daily';
import {DASHBOARD_SETTINGS_KEY,dashboardSettingsSchema,TODAY_GROUPS,todayGroup,twinOf,type TodayGroup,emptyDashboardSettings,saveWidget,removeWidget,visibleDomains,WIDGET_CATALOG,DASHBOARD_BUILTINS,reconcileDashboardPlacement,withDestinationsOnceGoals,moveDashboardItem,setDashboardBuiltinHidden,applyDashboardPreset,resetDashboardPlacement,type DashboardPreset,type DashboardWidget,type DashboardSettings,type WidgetKind,type DashboardBuiltinId,type DashboardItemRef,type DashboardRegion} from '../../lib/dashboard-settings';
import {dashboardIntegrityWarning,widgetMetric,widgetMetricLabel,type DashboardSources,type WidgetMetric} from '../../lib/dashboard-metrics';
import {widgetNeedsSource} from '../../lib/dashboard-widget-registry';
import {goalCounts} from '../../lib/numbers/counts';
import './dashboard.css';
import {useShowcase} from '../showcase-controls';
import {noExistingData,onboardingSeen} from '../../lib/onboarding';
import {ACCOUNT_CHANGE,getAccountScope} from '../../lib/account-session';
import { formatPlainDecimal } from "../../lib/visual-format";
import {ReminderCards} from '../reminders/reminder-cards';
import {PhoneFold} from '../phone/phone-fold';
import {getAppStorage} from '../../lib/showcase-storage';
import {deficitSignature,dismissIntegrity,integrityDismissed} from '../../lib/today/integrity-dismiss';
import {ONBOARDING_SETUP_KEY} from '../../lib/aa-device-keys';
import {usePagesView} from '../pages/use-pages-view';
import {isShown,todayItemShown} from '../../lib/pages/visibility';
import {PAGE_IDS,type PagesView} from '../../lib/pages/schema';
import {settingsGroupIn} from '../../lib/vault/w-homes';
/** Session AL fourth pass (NB-220): a built-in named as its card's heading reads, where the two differ. */
const BUILTIN_HEADING:Partial<Record<string,string>>={summary:'Your snapshot'};
import {linksOf,sortedLinks} from '../../lib/links/engine';
import {TodayLinks} from '../links/today-links';
import {TodaySoundtrack} from '../music/today-soundtrack';
import {isFoldOpen,readTodayFolds,rememberFold,type TodayFolds} from '../../lib/today-folds';
import {LoadBoundary} from '../load-boundary';
import {Skeleton} from '../ui/skeleton';
import {WalletCard} from '../wallet/wallet-card';
import {useAverageGoals} from '../goals/use-average-goals';
import {plainErrorMessage} from '../../lib/plain-error';
import {useChainChoice} from '../chain/use-chain-choice';
import {useMountOnView} from '../use-mount-on-view';
/** Addresses that point into the widget area (a card or a widget): it mounts at once for them. */
const WIDGET_AREA_HASHES=['#dashboard-'] as const;
/** On a phone these secondary Today modules fold to one row each, opened in place (Session I, Part 9). */
const PHONE_FOLDED=new Set<DashboardBuiltinId>(['watchlist','progress','wallet','staking','destination','activity']);
/** Session AK X1 (RELEASE_REVIEW R14): on a brand-new device Today shows the welcome and one empty card per area, nothing more. */
const BRAND_NEW_CARDS=new Set<string>(['goals','habits','health']);
const PHONE_FOLD_LABEL:Partial<Record<string,string>>={watchlist:'Your market watch',progress:'Your financial progress',wallet:'Your wallet',staking:'Staking',destination:'Plan a new destination',activity:'Recent activity'};
function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){
 const ref=useRef<HTMLDialogElement>(null);useBackCloses(true,onClose);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null,dialog=ref.current;dialog?.showModal();return()=>{dialog?.close();previous?.focus();};},[]);
 return <dialog ref={ref} className="dashboard-dialog" aria-label={title} onCancel={onClose}><header><h2>{title}</h2><button className="secondary" type="button" onClick={onClose} aria-label="Close customization">Close</button></header>{children}</dialog>;
}
function Metric({metric,identity,flow=false}:{metric:WidgetMetric;identity:string;flow?:boolean}){return <><div className="dashboard-metric-value">{metric.percent!==undefined&&<ProgressRing percent={metric.percent} complete={metric.complete} size={88} identity={`widget-${identity}`} label={`${metric.title} progress`}/>}{/* Phase 2 closing pass: a figure sizes itself from its length (dashboard.css), so a money total never wraps. */}<strong className={/\d/.test(metric.value)&&!/[a-z]{4,}/.test(metric.value)?'is-figure':undefined} style={{'--chars':metric.value.length,'--ring':metric.percent!==undefined?'104px':'0px'} as import('react').CSSProperties}>{flow?<NebulaFlow identity={`widget-${identity}`}>{metric.value}</NebulaFlow>:metric.value}</strong></div><p className="fine">{metric.detail}</p>{metric.facts&&<dl className="dashboard-metric-facts">{metric.facts.map(f=><div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl>}{metric.warning&&<p className="notice">{metric.warning}</p>}<Link className="text-link" href={metric.href}>{metric.missing?'Review record':'Open details'} →</Link></>;}
/** Session AL (DV-152): what a widget kind needs chosen before it can be saved, in words. */
const WIDGET_SOURCE_NOUN:Partial<Record<WidgetKind,string>>={goal:'a goal',habit:'a habit',asset:'an asset',staking:'a stake',allocation:'a goal',"food-entry":'a food entry',meal:'a meal'};
function WidgetEditor({initial,sources,ready,onSave,onRemove,onClose}:{initial?:DashboardWidget;sources:DashboardSources;ready:(domain:string)=>boolean;onSave:(w:DashboardWidget,revision?:number)=>Promise<void>;onRemove?:()=>Promise<void>;onClose:()=>void}){
 const [kind,setKind]=useState<WidgetKind>(initial?.kind??'health'),[metric,setMetric]=useState(initial?.metric??'kcal'),[entity,setEntity]=useState(initial?.entity??''),[title,setTitle]=useState(initial?.title??''),[size,setSize]=useState<DashboardWidget['size']>(initial?.size??'compact');
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);const id=useRef(initial?.id??crypto.randomUUID());
 const requiresEntity=widgetNeedsSource(kind);
 const draft:DashboardWidget={id:id.current,kind,metric,...(requiresEntity||kind==='ecosystem'&&entity?{entity}:{}),title,size,hidden:initial?.hidden??false,revision:initial?.revision??1};
 const preview=widgetMetric(draft,sources);
 async function save(){if(isInvisibleName(title)){setError('Give the card title at least one visible character, or leave it empty.');return;}setBusy(true);setError('');try{await onSave(draft,initial?.revision);onClose();}catch(e){setError(plainErrorMessage(e, 'Could not save this widget.'));}finally{setBusy(false);}}
 return <Modal title={initial?'Edit widget':'Add a widget'} onClose={onClose}>{!initial&&<LoadBoundary quiet><Suspense fallback={null}><GameWidgetChoices/></Suspense></LoadBoundary>}<form onSubmit={e=>{e.preventDefault();void save();}}><Suspense fallback={<Skeleton label="Opening the widget library…" lines={4}/>}><WidgetLibrary kind={kind} metric={metric} entity={entity} title={title} size={size} initial={initial} sources={sources} ready={ready} onKind={next=>{setKind(next);setMetric(WIDGET_CATALOG[next].metrics[0]);setEntity('');setError('');}} onMetric={next=>{setMetric(next);setError('');/* Session AL (P-NB-41; NB-140, NB-162): a refusal about the last choice goes when the choice changes */}} onEntity={next=>{setEntity(next);setError('');}} onTitle={setTitle} onSize={setSize}/></Suspense><section className="dashboard-widget-preview" aria-label="Widget preview" data-size={size} data-domain={WIDGET_CATALOG[kind].domain}><p className="eyebrow">PREVIEW · YOUR CURRENT RECORDS · {size==='wide'?'WIDE':'COMPACT'} CARD</p><h3>{preview.title}</h3><div className="dashboard-widget-preview-value">{preview.percent!==undefined&&<ProgressRing percent={preview.percent} complete={preview.complete} size={64} identity={`preview-${id.current}`} label={`${preview.title} progress`}/>}<strong>{preview.value}</strong></div><p>{preview.detail}</p>{preview.facts&&<dl className="dashboard-metric-facts">{preview.facts.map(f=><div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl>}{preview.warning&&<p>{preview.warning}</p>}</section>{error&&<p role="alert">{error}</p>}<div className="dashboard-actions">{initial&&onRemove&&<button type="button" className="secondary dashboard-remove" disabled={busy} onClick={()=>{setBusy(true);void onRemove().then(onClose).catch(e=>{setError(plainErrorMessage(e, 'Could not remove this widget.'));setBusy(false);});}}>Remove widget</button>}<button type="button" className="secondary" onClick={onClose}>Cancel</button>{/* Session AL (DV-152, P-DV-06): a Save that waits on a choice says which */}{requiresEntity&&!entity&&<p className="fine dashboard-save-hint" id={`${id.current}-save-hint`}>{`Choose ${WIDGET_SOURCE_NOUN[kind]??'a source'} above to save this widget.`}</p>}<button className="primary" aria-describedby={requiresEntity&&!entity?`${id.current}-save-hint`:undefined} disabled={busy||requiresEntity&&!entity}>{busy?'Saving…':'Save widget'}</button></div></form></Modal>;
}
export function TodayDashboard(){
 const settings=usePrivateStore(DASHBOARD_SETTINGS_KEY,dashboardSettingsSchema,emptyDashboardSettings);
 const platform=usePlatform(),legacy=useGoals(),habits=useHabits(),health=useHealth(),today=useLocalToday();
 // H7: linked habits tick themselves off from the Health journal on this page; the cards word it with the counter names.
 useAutoCheckIns({habits,health});
 const healthLinkContext=useMemo(()=>({counters:exerciseData(health.data).counters,waterUnit:dailyData(health.data).preferences.waterUnit,...(health.loaded&&!health.error?{health:health.data}:{})}),[health.data,health.loaded,health.error]);
 const showcase=useShowcase(),[welcomeDismissed,setWelcomeDismissed]=useState(false),phone=usePhoneActive();
 // Session W Part 2: Quick add and the Health shortcut follow Your pages & buttons.
 const pagesView=usePagesView(),showQuickAdd=isShown(pagesView,'quick-add'),showHealth=isShown(pagesView,'health');
 // Session W Part 19: My links' card shows once a link exists, while its button is shown under Your pages & buttons.
 const myLinks=settings.loaded&&!settings.error?sortedLinks(linksOf(settings.data)):[];
 // The first-run welcome (Session E) appears only for a device that is certainly brand-new: every store read without
 // error, Today not yet chosen, no Showcase, no account, no private record stored and the welcome never seen here.
 const [setupMade,setSetupMade]=useState(false);
 const storesReady=settings.loaded&&!settings.error&&platform.loaded&&!platform.error&&habits.loaded&&!habits.error&&health.loaded&&!health.error&&legacy.loaded;
 let brandNew=false;
 if(!welcomeDismissed&&!showcase&&storesReady&&!settings.data.onboarded&&!platform.data.goals.length&&!platform.data.positions.length&&!habits.data.habits.length&&!legacy.goals.length){try{brandNew=!getAccountScope()&&!onboardingSeen(window.localStorage)&&noExistingData(window.localStorage);}catch{brandNew=false;}}
 // Session AL (P-NB-08; NB-002, NB-033): with nothing recorded and no setup made, the setup entry is Today's one first
 // action (defined here, before the cards that step back for it; fourth pass: the destination panel's link is secondary).
 const emptyDevice=storesReady&&!showcase&&!brandNew&&!setupMade&&!habits.data.habits.length&&!platform.data.goals.length&&!platform.data.positions.length&&!legacy.goals.length;
 // Session AL (P-NB-10; NB-041): money cards ("Your goals", the destination panel) follow the pages the person shows too, so
 // a Habits and Health setup that left Goals and Wealth off sees no goal tiles (the PROTECTED hero itself is unchanged).
 const domains=visibleDomains(settings.data),financial=(domains.includes('wealth')&&isShown(pagesView,'wealth'))||(domains.includes('goals')&&isShown(pagesView,'goals'));
 // Session Z-Cloud Part 4.3 (persona item 3): plain words until Keplr is connected (components/shell.tsx says the same).
 const plainWords=legacy.mode==='local'&&legacy.walletState!=='CONNECTED';
 // Session AK X1 (RELEASE_REVIEW R2): the wallet, staking and simulated-ZIG cards only once the chain is chosen (lib/chain-choice.ts).
 const chainChosen=useChainChoice().chosen;
 const market=useMarketQuotes(settings.loaded&&financial?wealthMarketRequests(platform.data):false),now=useEvidenceNow(platform.data,market.now);
 const goals=unifiedGoalSummaries(legacy.goals,legacy.metadata?.goals??{},platform.data,market.quotes,now,legacy.mode==='local'?'Local simulation':'Future Goal Manager').filter(g=>!g.key.startsWith('legacy:')||!platform.data.legacyGoalUi?.[`${legacy.chain}:${legacy.owner}:${g.id}`]?.archived);
 const chessCache=useDeviceRecord(CHESS_CACHE);
 const averageGoals=useAverageGoals();
 const todayCards=useDeviceRecord(TODAY_CARDS),deviceCards=todayCards.loaded&&!todayCards.unreadable?shownCards(todayCards.data):[];
 const sources:DashboardSources={platform:platform.data,goals,habits:habits.data,health:health.data,quotes:market.quotes,now,today,healthDate:healthDay(dailyData(health.data).preferences.timezone),...(averageGoals.loaded&&!averageGoals.unreadable?{averages:averageGoals.data.goals}:{}),...(chessCache.loaded&&!chessCache.unreadable?{chess:chessCache.data}:{})};
 const [customize,setCustomize]=useState(false),[editor,setEditor]=useState<DashboardWidget|'new'|null>(null),[preset,setPreset]=useState<DashboardPreset|null>(null),[status,setStatus]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 // Session AL (NB-166, P-NB-53): once a goal exists, an un-arranged Today shows "Your destinations" (display only; while
 // arranging, the stored record is shown and edited as it is).
 const view=customize?settings.data:withDestinationsOnceGoals(settings.data,goals.length);
 const placement=reconcileDashboardPlacement(view);
 // Session AL fourth pass (NB-220): the pages this person switched off themselves (a stamped "hidden"), apart from the
 // pages that are off until chosen and were never switched on.
 const stampedPages=settings.loaded&&!settings.error?settingsGroupIn(settings.data,'pages'):undefined;
 const chosenHiddenView:PagesView={version:1,hidden:PAGE_IDS.filter(id=>stampedPages?.items[id]?.v==='hidden')};
 // Session AL fourth pass (NB-092, DV-024b): a hidden built-in whose widget twin is on Today says why it stands down.
 const twinShown=(id:DashboardBuiltinId)=>view.widgets.some(w=>!w.hidden&&twinOf(w)===id);
 const [insertAt,setInsertAt]=useState<{region:DashboardRegion;anchor:DashboardItemRef}|null>(null);
 // Session V Part 1b: the widget rows a person left open on a phone stay open (zigoals:today-folds:v1), written only when
 // the person opens or closes a row. Read on the client's first render, so a remembered row is open the first time it
 // shows (the phone rows only appear after hydration, so the server's folded markup never differs), and read again
 // after mount and whenever the account changes.
 const [folds,setFolds]=useState<TodayFolds|null>(()=>{if(typeof window==='undefined')return null;try{return readTodayFolds(getAppStorage());}catch{return null;}});
 useEffect(()=>{let active=true;const read=()=>{if(!active)return;try{setFolds(readTodayFolds(getAppStorage()));}catch{setFolds(null);}};queueMicrotask(read);window.addEventListener(ACCOUNT_CHANGE,read);return()=>{active=false;window.removeEventListener(ACCOUNT_CHANGE,read);};},[showcase]);
 useEffect(()=>{if(brandNew||showcase||!storesReady)return;let active=true;queueMicrotask(()=>{if(!active)return;try{const raw=getAppStorage().getItem(ONBOARDING_SETUP_KEY);setSetupMade(!!raw&&!/"(?:undone|landingClosed)":true/.test(raw));}catch{/* no card */}});return()=>{active=false;};},[brandNew,showcase,storesReady]);
 const toggleFold=(id:string,open:boolean)=>{try{setFolds(rememberFold(getAppStorage(),id,open));}catch{/* storage refused: the row still opens, it is just not remembered */}};
 const loaded=(domain:string)=>domain==='health'?health.loaded:domain==='habits'?habits.loaded:platform.loaded&&legacy.loaded;
 const domainError=(domain:string)=>domain==='health'?health.error:domain==='habits'?habits.error:platform.error;
 const savedLayout=useSavedLayout();
 const active=goals.filter(g=>g.status==='active');
 // Session AL (BUG-062, PR-082, G-037): every count of active goals on Today is the one count (goals and average goals),
 // as Goals and the Today widgets give it; `active` stays the list of cards to show.
 const activeCount=goalCounts(goals,averageGoals.data.goals).active;
 // Today's Goal cards follow the order arranged on the Goals page.
 const cardOrder=resolveOrder(goals.map(g=>entityLayoutId(g.key)),savedOrder(savedLayout,'goals','cards'));
 const activeCards=[...active].sort((a,b)=>cardOrder.indexOf(entityLayoutId(a.key))-cardOrder.indexOf(entityLayoutId(b.key)));
 // Session AF (L5a, Part 10.10): "Next step", "What matters today" and the goal cards each say something different
 // (lib/today/goal-roles.ts): the top goal's next step, the most urgent other goal, each goal's progress.
 // Session AK G2 (RELEASE_REVIEW R29): the Showcase's "What matters today" leads with a currency goal; its ZIG goal follows further down.
 const roles=todayGoalRoles(activeCards,platform.data.goals,today,showcase?{lead:'currency'}:{}),nextGoal=roles.focus?.goal;
 const integrityWarning=platform.loaded&&!platform.error?dashboardIntegrityWarning(platform.data):undefined;
 // Session AL (TK-226): Dismiss hides the notice in this tab until the deficits change (lib/today/integrity-dismiss.ts).
 const integritySignature=integrityWarning?deficitSignature(platform.data):'';
 const [integrityHidden,setIntegrityHidden]=useState<string|null>(null);
 const tabStore=()=>{try{return window.sessionStorage;}catch{return null;}};
 const integrityShown=!!integrityWarning&&integrityHidden!==integritySignature&&!integrityDismissed(typeof window==='undefined'?null:tabStore(),integritySignature);
 const hasFundingGoal=platform.data.goals.some(g=>g.status!=='closed'&&g.type!=='PROJECT');
 const meta=(id:DashboardBuiltinId)=>DASHBOARD_BUILTINS.find(b=>b.id===id)!;
 // Session AK RB (RELEASE_REVIEW_2 R2-9): a goal shows once below the hero — in "What matters today" when that panel
 // picked it (from other goals), otherwise as its card under "Your goals"; "Next money steps" leaves out both, and the
 // destinations widget lists no goal names while the goal cards are on Today.
 const placedWidgets=new Set([...placement.main,...placement.rail].flatMap(r=>r.kind==='widget'&&view.widgets.some(w=>w.id===r.id&&!w.hidden)?[r.id]:[]));
 const builtinOnToday=(id:DashboardBuiltinId)=>!placement.hiddenBuiltins.includes(id)&&todayItemShown(pagesView,{builtin:id});
 const panelGoalId=financial&&platform.loaded&&!platform.error&&hasFundingGoal&&builtinOnToday('attention')&&roles.attention&&roles.attention.why!=='only'?roles.attention.id:null;
 const goalCardsOnToday=financial&&builtinOnToday('goals');
 // Session AO (RR-17, D-134; owner decision 13 Nov): a goal's name appears once on Today. The focus tile's goal (named there,
 // with its progress) has no second card either, as the panel's goal has none (R2-9).
 const focusGoalKey=financial&&!brandNew?nextGoal?.key:undefined;
 const gridCards=activeCards.filter(g=>(!panelGoalId||g.key!==`private:${panelGoalId}`)&&g.key!==focusGoalKey);
 const shownGoals=new Set<string>([...(focusGoalKey?.startsWith('private:')?[focusGoalKey.slice('private:'.length)]:[]),...(panelGoalId?[panelGoalId]:[]),...(goalCardsOnToday?gridCards.flatMap(g=>g.key.startsWith('private:')?[g.key.slice('private:'.length)]:[]):[])]);
 async function change(update:(s:DashboardSettings)=>DashboardSettings,message='Layout saved on this device.'){
  setBusy(true);setError('');
  // Session AH Part 3 (DS5): a change that only removed something (a widget) offers a labelled Undo in the app's toast.
  let before:DashboardSettings|undefined,after:DashboardSettings|undefined;
  try{await settings.update(s=>{const next=update(s);before=s;after=next;return next;});const removed=before===undefined?null:removedItems(before,after);if(removed)showUndo({message,undone:'Put back on Today.',restore:()=>settings.update(s=>reinsertItems(s,removed))});else setStatus(message);}catch(e){setError(plainErrorMessage(e, 'Could not save the layout.'));throw e;}finally{setBusy(false);}
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
 // Session AL fourth pass (NB-220, DV-155): each card is named as its heading reads ("Water today", not the catalog's
 // "Health metric"; "Your snapshot", not "Widget summary"), and a hidden built-in says so, so the arrow buttons and the
 // move messages never name two cards alike.
 const titleCache=new Map<string,string>(),cardTitle=(x:DashboardWidget)=>{let t=titleCache.get(x.id);if(t===undefined){try{t=widgetMetric(x,sources).title;}catch{t=x.title||WIDGET_CATALOG[x.kind].label;}titleCache.set(x.id,t);}return t;};
 const refLabel=(ref:DashboardItemRef)=>{if(ref.kind==='widget'){const w=view.widgets.find(x=>x.id===ref.id);if(!w)return 'Widget';const base=cardTitle;/* Session AL (DV-155, P-DV-70): two cards with one name are told apart by what they show */const twins=view.widgets.filter(x=>!x.hidden&&base(x)===base(w));if(twins.length<2)return base(w);const same=twins.filter(x=>x.metric===w.metric);return `${base(w)} · ${widgetMetricLabel(w.metric,w.kind)}${same.length>1?` ${same.indexOf(w)+1}`:''}`;}const id=ref.id as DashboardBuiltinId,name=BUILTIN_HEADING[id]??meta(id).label;return placement.hiddenBuiltins.includes(id)?`${name} (hidden)`:name;};
 /** Drag or arrow moves on Today go through the existing synced placement: the card is placed before (or after) its new visible neighbour. */
 async function placeAt(region:DashboardRegion,id:string,to:number,order:string[]){
  const ref=placement[region].find(r=>layoutId(r)===id);if(!ref)return;
  const after=order[to+1],before=order[to-1],anchor=placement[region].find(r=>layoutId(r)===(after??before));
  if(!anchor)return;
  await change(s=>moveDashboardItem(s,ref,{region,anchor,position:after?'before':'after'},placement.revision),`${refLabel(ref)} moved. Layout saved on this device.`);
 }
 const regionItems=(region:DashboardRegion):LayoutEntry[]=>{
  const entries=placement[region].flatMap((ref,index):(LayoutEntry&{group:TodayGroup})[]=>{const node=renderPlaced(ref,region,index);return node?[{id:layoutId(ref),label:refLabel(ref),node,group:todayGroup(ref,view.widgets)}]:[];});
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
   {!loaded(domain)?<p role="status">Loading records…</p>:domainError(domain)?<p role="alert">This data needs attention. Open Settings to recover it.</p>:w.kind==='habits'?<HabitsToday/>:w.kind==='music'?<TodaySoundtrack/>:<><Metric metric={metric} identity={w.id} flow={w.kind==='wealth'&&!metric.missing}/>{habit&&w.metric==='today'&&<HabitCompletion habit={habit} store={habits} compact/>}{w.kind==='goals'&&!goalCardsOnToday&&<ul className="dashboard-goal-links">{active.slice(0,3).map(g=><li key={g.key}><Link href={g.href}>{g.name}</Link></li>)}{/* Session AL (NB-176, P-NB-53): the goals not listed are counted, not hidden */}{active.length>3&&<li><Link href="/app/goals">{`+${active.length-3} more`}</Link></li>}</ul>}</>}
   {w.kind==='chess'&&!w.hidden&&<LoadBoundary quiet><Suspense fallback={null}><ChessTodayRefresh/></Suspense></LoadBoundary>}
   <CardOptions label={metric.title}><AskZigiItem kind={w.kind} metric={w.metric} name={habit?.title??(w.entity?goals.find(g=>g.key===w.entity)?.name:undefined)}/><button type="button" disabled={busy} onClick={()=>setEditor(w)}>Edit widget</button><button type="button" disabled={busy} onClick={()=>apply(s=>saveWidget(s,{...w,hidden:!w.hidden},w.revision))}>{w.hidden?'Show widget':'Hide widget'}</button><button type="button" aria-label={`Move ${metric.title} up`} disabled={busy||index===0} onClick={()=>relocate(ref,region,index,-1,metric.title)}>Move earlier</button><button type="button" aria-label={`Move ${metric.title} down`} disabled={busy||index===placement[region].length-1} onClick={()=>relocate(ref,region,index,1,metric.title)}>Move later</button><button type="button" onClick={()=>moveLane(ref,region,metric.title)} disabled={busy}>Move to {region==='main'?'rail':'main'}</button><button type="button" disabled={busy||w.size==='compact'} onClick={()=>apply(s=>saveWidget(s,{...w,size:'compact'},w.revision),'Compact size saved.')}>Compact size</button><button type="button" disabled={busy||w.size==='wide'} onClick={()=>apply(s=>saveWidget(s,{...w,size:'wide'},w.revision),'Wide size saved.')}>Wide size</button><button type="button" disabled={busy} onClick={()=>apply(s=>removeWidget(s,w.id),'Widget removed. Your underlying record was kept.')}>Remove widget</button></CardOptions>
  </article>;
 }
 const intelligence=(module:'life'|'attention'|'funding'|'needs-attention'|'watchlist')=><TodayIntelligence sources={sources} goalId={module==='attention'?roles.attention?.id:undefined} nameShown={!!focusGoalKey&&module==='attention'&&focusGoalKey===`private:${roles.attention?.id}`} shownGoals={shownGoals} habitsReady={habits.loaded&&!habits.error} healthReady={health.loaded&&!health.error} module={module} pricesLoading={!market.quotes.length&&(market.loading||!market.error)}/>;
 function renderBuiltin(id:DashboardBuiltinId){
  if(['whole-life','attention','funding','needs-attention','watchlist'].includes(id)){
   if(!financial||!platform.loaded||!!platform.error||id==='attention'&&!hasFundingGoal)return null;
   // Session AK RB (R2-9): the funding agenda is part of "Next money steps" (the needs-attention card) while that card shows.
   if(id==='funding'&&builtinOnToday('needs-attention'))return null;
   // Session AH (TO12, M-122): the attention count waits for the first price read, so it never changes after load.
   // CI19 (CI 1575, phone-refinements:65): "first" — a later read while no price is held (the watchlist's own, once its
   // chunk is here) no longer swaps the card back to this line after the first read has ended in an error: that remounted
   // the list mid-view (its rows gone for a moment, "View all" undone).
   if(id==='needs-attention'&&market.loading&&!market.quotes.length&&!market.error)return <section className="needs-attention panel" aria-busy="true" aria-label="Needs attention"><p className="loading-line" role="status">Checking what needs attention…</p></section>;
   return intelligence(({ 'whole-life':'life',attention:'attention',funding:'funding','needs-attention':'needs-attention',watchlist:'watchlist'} as const)[id as 'whole-life'|'attention'|'funding'|'needs-attention'|'watchlist']);
  }
  switch(id){
   case 'goals':return financial?<section className="today-goals surface-featured" aria-label="Your goals"><div className="section-heading"><div><h2>Your goals</h2><p>Small steps. A bigger future.</p></div><Link href="/app/goals" className="text-link">View all goals →</Link></div>{!legacy.loaded||!platform.loaded?<Skeleton label="Loading your Goals…" block lines={2}/>:active.length?<RovingGroup className="today-goals-grid" selector=".unified-goal-card h2 a, a.new-destination-card">{gridCards.map(g=><GoalSummaryCard key={g.key} summary={g} compact/>)}<Link href="/app/goals/new" className="new-destination-card"><span aria-hidden="true">＋</span><strong>Create a new goal</strong><small>A new destination<br/>is waiting.</small></Link></RovingGroup>:<div className="today-goal-empty"><div><AppIcon name="goals" size={42}/><h3>A plan with your name on it.</h3><p>Choose what matters. Set a target. See the next step.</p><Link className="text-link" href="/app/goals/new">Create your first goal →</Link></div><SceneArt scene="home"/></div>}{chainChosen&&<p className="local-label">{legacy.mode==='local'?'Local demo · simulated ZIG, never wallet funds':'Testnet wallet view · financial execution disabled'}</p>}</section>:null;
   case 'progress':return financial&&chainChosen?<section className="progress-summary" aria-label="Your financial progress"><div className="section-heading"><div><h2>Your financial progress</h2><p>Built on your contributions.</p></div><span className="pill">Idle strategy</span></div><div className="progress-stats"><div><AppIcon name="goals"/><strong>{activeCount}</strong><small>Active goals</small></div><div><AppIcon name="activity"/><strong>{formatPlainDecimal(formatUnits(legacy.goals.reduce((total,g)=>total+BigInt(g.position_units),0n).toString(),TESTNET.nativeAsset.decimals))} <span>ZIG</span></strong><small>{legacy.mode==='local'?'Simulated local allocation':'Known wallet Goal allocation'}</small></div><div><AppIcon name="ecosystem"/><strong>None</strong><small>Future return assumed</small></div></div></section>:null;
   case 'habits':return domains.includes('habits')?<HabitsToday/>:null;
   case 'health':return domains.includes('health')?<HealthToday/>:null;
   case 'next-action':return financial&&nextGoal?<div className="next-step"><span className="eyebrow">Your next goal action</span><Link href={nextGoal.href} className="text-link">Review {nextGoal.name} →</Link></div>:null;
   // Session AK RB (RELEASE_REVIEW_2 R2-9): the overview no longer repeats the widgets that are cards on Today ("Your
   // destinations · 7 active goals" showed twice); it keeps Customize Today and lists only a widget that has no card here.
   case 'summary':return <WidgetOverview cards={placedWidgets.size} widgets={view.widgets.filter(w=>todayItemShown(pagesView,{widgetDomain:WIDGET_CATALOG[w.kind].domain})&&!placedWidgets.has(w.id))} sources={sources} loaded={settings.loaded} error={settings.error} ready={loaded} domainError={domainError} customizing={customize} onCustomize={()=>{setCustomize(x=>!x);requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>('[data-customize-today]')?.focus());}}/>;
   // Session AE (Part 6, ADR-027): the same card, with the wallet chooser and the display currency (components/wallet/wallet-card.tsx).
   case 'wallet':return financial&&chainChosen?<WalletCard plainWords={plainWords}/>:null;
   case 'staking':return financial&&chainChosen?<StakingCard/>:null;
   case 'destination':return financial?<section className="destination-panel" aria-labelledby="destination-title"><div><p className="eyebrow">{activeCount?'Your destinations':'Start with what matters'}</p><h2 id="destination-title"><NebulaFlow identity="today-destination-title">{activeCount?`${activeCount} ${activeCount===1?'goal':'goals'} in motion. Room for another.`:'A destination for your next chapter.'}</NebulaFlow></h2><p>A home. A safety net. A trip you’ve been waiting for. {plainWords?'Give your savings a purpose.':'Give your ZIG a purpose.'}</p><Link href="/app/goals/new" className={emptyDevice?'secondary':'primary'}>{goals.length?'Plan my next goal →':'Plan my first goal →'}</Link><div className="destination-steps"><div><AppIcon name="settings" luminous/><strong>Set a goal</strong><small>Define your future</small></div><div><AppIcon name="goals" luminous/><strong>Stay consistent</strong><small>Track your progress</small></div><div><AppIcon name="today" luminous/><strong>Reach farther</strong><small>A brighter tomorrow</small></div></div></div></section>:null;
   case 'activity':return financial?<section className="recent-panel"><div className="section-heading"><h2>Recent activity</h2><Link href="/app/activity" className="text-link">View all →</Link></div><ActivityFeed limit={phone?2:4}/></section>:null;
  }
 }
 // Session AK RB (RELEASE_REVIEW_2 R2-11): the brand-new Today's empty cards cover Habits and Wealth too, as R14 intended —
 // the habits widget that stands in for the hidden Daily Habits, and the first wealth widget (on a phone a row with its
 // figure under its name, as every widget is there).
 const brandNewWidgets=new Set(brandNew?[...settings.data.widgets.filter(w=>!w.hidden&&twinOf(w)==='habits'&&placement.hiddenBuiltins.includes('habits')).slice(0,1),...(financial?settings.data.widgets.filter(w=>!w.hidden&&w.kind==='wealth').slice(0,1):[])].map(w=>w.id):[]);
 function renderPlaced(ref:DashboardItemRef,region:DashboardRegion,index:number){
  const widget=ref.kind==='widget'?view.widgets.find(w=>w.id===ref.id):undefined;
  if(ref.kind==='widget'&&!widget)return null;
  // Session AK X1 (RELEASE_REVIEW R14): a brand-new device keeps the widget grid, the funding agenda and the overviews
  // back until its first record; the welcome card leads, with one empty card for Goals, Habits and Health.
  if(brandNew&&!customize&&(ref.kind==='widget'?!brandNewWidgets.has(ref.id):!BRAND_NEW_CARDS.has(ref.id)))return null;
  const builtin=ref.kind==='builtin'?meta(ref.id):undefined;
  const content=ref.kind==='widget'?renderWidget(widget!,region,index):renderBuiltin(ref.id as DashboardBuiltinId);
  if(!content)return null;
  const hidden=ref.kind==='widget'?widget!.hidden:placement.hiddenBuiltins.includes(ref.id as DashboardBuiltinId);
  if(hidden&&!customize)return null;
  // Session W Part 13: an item of a hidden page leaves Today with it (kept, and back when the page shows again).
  const withPage=ref.kind==='widget'?todayItemShown(pagesView,{widgetDomain:WIDGET_CATALOG[widget!.kind].domain}):todayItemShown(pagesView,{builtin:ref.id});
  if(!withPage&&!customize)return null;
  // Session AL fourth pass (NB-220): a built-in of a page that was never switched on (Markets' Watchlist on a device that
  // never chose the chain) is not one of this person's cards: Arrange leaves it out instead of saying it is "hidden with
  // its page". A page the person hid keeps its cards listed, kept for when it shows again.
  if(!withPage&&ref.kind==='builtin'&&todayItemShown(chosenHiddenView,{builtin:ref.id}))return null;
  const label=ref.kind==='widget'?widget!.title||WIDGET_CATALOG[widget!.kind].label:builtin!.label;
  // Session U follow-up F3: on a phone each widget card also folds to a row named by the widget and opens in place; the
  // overview ("Your selected widgets") still shows every widget's value at a glance, so nothing is removed. While Today
  // is being customized no widget folds, so every card and its options stay in reach.
  // Session AC: a widget standing in for its hidden built-in twin (Daily Habits, Daily Health) folds as that built-in does.
  const twin=widget?twinOf(widget):null,standsIn=!!twin&&placement.hiddenBuiltins.includes(twin);
  const foldLabel=ref.kind==='widget'&&!standsIn?(customize?undefined:widgetMetric(widget!,sources).title):PHONE_FOLDED.has((standsIn?twin:ref.id) as DashboardBuiltinId)?PHONE_FOLD_LABEL[standsIn?twin!:ref.id]??label:undefined;
  // Session AK RB (RELEASE_REVIEW_2 R2-9): a folded widget row carries its figure under its name (the overview's second
  // copy of every widget is gone), while its records are readable.
  const foldDetail=ref.kind==='widget'&&!standsIn&&foldLabel&&loaded(WIDGET_CATALOG[widget!.kind].domain)&&!domainError(WIDGET_CATALOG[widget!.kind].domain)?widgetMetric(widget!,sources).value:undefined;
  return <div key={`${ref.kind}:${ref.id}`} id={itemId(ref)} tabIndex={-1} className="placed-module" data-kind={ref.kind} data-module={ref.id} data-size={widget?.size} data-hidden={hidden?'true':undefined} data-stands-in={standsIn?twin!:undefined}>
   {customize&&ref.kind==='builtin'&&<div className="dashboard-builtin-options"><CardOptions label={label}><button type="button" disabled={busy||index===0} onClick={()=>relocate(ref,region,index,-1,label)}>Move earlier</button><button type="button" disabled={busy||index===placement[region].length-1} onClick={()=>relocate(ref,region,index,1,label)}>Move later</button>{builtin!.hideable&&<button type="button" disabled={busy} onClick={()=>apply(s=>setDashboardBuiltinHidden(s,ref.id as DashboardBuiltinId,!hidden,placement.revision))}>{hidden?'Show card':'Hide card'}</button>}</CardOptions></div>}
   {!withPage?<p className="dashboard-hidden-placeholder">{label} is hidden with its page. Show the page again in Settings, under Your pages &amp; buttons.</p>:hidden&&ref.kind==='builtin'?<p className="dashboard-hidden-placeholder">{label} is hidden from Today.{twinShown(ref.id as DashboardBuiltinId)?` Your ${label} widget shows the same list, so this card stands down; Show card brings it back as well.`:' Show card brings it back.'}</p>:foldLabel?<PhoneFold label={foldLabel} detail={foldDetail} {...(ref.kind==='widget'?{remembered:!!folds&&isFoldOpen(folds,ref.id),onToggle:(open:boolean)=>toggleFold(ref.id,open)}:{})}>{content}</PhoneFold>:content}
   {customize&&<button type="button" className="dashboard-insert-here" disabled={busy||settings.data.widgets.length>=24} onClick={()=>addAfter(ref,region)}>+ Add widget after {label}</button>}
  </div>;
 }
 // Session Z-Cloud Part 4.1 (persona item 1): with nothing in the rail (Habits + Health, Habits only) Today is one centred
 // column at a reading width; while arranging, the rail stays as a place to move modules to.
 const railItems=regionItems('rail'),single=!railItems.length&&!customize;
 let presetPreview:DashboardSettings|null=null,presetError='';
 if(preset)try{presetPreview=applyDashboardPreset(settings.data,preset);}catch(e){presetError=plainErrorMessage(e, 'This layout cannot be applied without removing a saved widget.');}
 // Session AA-Cloud Part 1 (docs/product/PAGE_ORDER_AA.md): the hero, then Today's focus, the grouped widgets, For you,
 // and What's new with the summaries at the end. "Make Today yours" stays a new device's first action; in the Showcase
 // it waits at the end of the main column.
 // Session AB-Design (owner request 12): the habits widget (the built-in card or a habits widget, not hidden) lists the due habits itself, so the focus tile stands down beside it.
 const habitsWidgetShown=domains.includes('habits')&&settings.loaded&&!settings.error&&((settings.data.placement?!settings.data.placement.hiddenBuiltins.includes('habits'):true)||settings.data.widgets.some(w=>w.kind==='habits'&&!w.hidden));
 const uiPrefs=useUiPrefs(),heroCollapsed=uiPrefs.loaded&&!uiPrefs.unreadable&&!!uiPrefs.data.heroCollapsed,gameOn=useGameEnabled();
 const setHeroCollapsed=(value:boolean)=>{try{uiPrefs.update(p=>({...p,heroCollapsed:value}));}catch{setError('This device refused to save that choice.');}};
 const [focusPlace,setFocusPlace]=useState<HTMLDivElement|null>(null),[mainPlace,setMainPlace]=useState<HTMLDivElement|null>(null),[endPlace,setEndPlace]=useState<HTMLDivElement|null>(null);
 const TodayForYou=useForYou().mod?.TodayForYou;
 const forYouOn=settings.loaded&&!settings.error&&(settings.data.onboarded||showcase)&&!brandNew&&storesReady;
 // Session AK G2 (R11): arranging Today and a brand-new device's short Today mount the widget area at once.
 const widgetArea=useMountOnView({hashPrefixes:WIDGET_AREA_HASHES,force:customize||brandNew});
 // Session AL (P-NB-08; NB-002, NB-033): a device with nothing recorded and no setup made keeps one way into the setup on
 // Today after "Not now" (the welcome itself shows once); while it shows, it is the page's one first action.
 // Session AL (TK-148, N-TK-21): with records already kept, the chooser moves after the data and can be put away.
 const hasRecords=storesReady&&!showcase&&(habits.data.habits.length>0||platform.data.goals.length>0||platform.data.positions.length>0||legacy.goals.length>0);
 const makeToday=emptyDevice?<FirstRunEntry demoAvailable={legacy.mode==='local'}/>:settings.loaded&&!settings.error&&!settings.data.onboarded?<Suspense fallback={<TodayReserve part="make"/>}><MakeToday hasRecords={hasRecords} chosen={settings.data.preset} onChoose={setPreset} onContinue={()=>apply(s=>({...s,onboarded:true}))}/></Suspense>:null;
 // The For you cards render into three fixed places (portals), so the page's own tree never changes shape when they
 // arrive: the hero and its slogan mount once per visit.
 const layout=(parts:ForYouParts)=><div className="today-page personalized-today" data-interests={settings.data.preset} data-single={single?'':undefined}>
  <TodaySkips/>
  <div className="today-layout"><div className="today-primary">
   {heroCollapsed?<section className="today-hero today-hero-folded" aria-labelledby="dashboard-title"><LayoutLockButton/><h1 id="dashboard-title" className="sr-only">Today</h1><div className="today-hero-strip"><p className="eyebrow page-eyebrow financial-orbit"><NebulaFlow identity="today-eyebrow-folded">YOUR FINANCIAL ORBIT</NebulaFlow></p><div className="hero-actions">{financial?showQuickAdd&&<QuickAdd triggerClassName={emptyDevice?'secondary':'primary'/* Session AL sweep 3 (NB-033): beside the first-run "Start setup", Quick add is not a second primary */}/>:showHealth&&<Link className="primary" href="/app/health">Open Health</Link>}</div><HeroFold collapsed onToggle={()=>setHeroCollapsed(false)}/></div></section>
   :<section className="today-hero" aria-labelledby="dashboard-title"><div className="today-scene" aria-hidden="true"/><div className="cosmic-glow ambient-light" aria-hidden="true"/><HeroStar/><LayoutLockButton/><HeroFold collapsed={false} onToggle={()=>setHeroCollapsed(true)}/><div className="today-hero-copy"><p className="eyebrow page-eyebrow financial-orbit"><NebulaFlow identity="today-eyebrow">YOUR FINANCIAL ORBIT</NebulaFlow></p><h1 id="dashboard-title" className="orbit-slogan"><OrbitSlogan/></h1><p className="page-lede today-lede">Set goals. Build habits. Protect your health.<br/>Make room for a brighter tomorrow.</p><div className="hero-actions">{financial?showQuickAdd&&<QuickAdd triggerClassName={emptyDevice?'secondary':'primary'/* Session AL sweep 3 (NB-033): beside the first-run "Start setup", Quick add is not a second primary */}/>:showHealth&&<Link className="primary" href="/app/health">Open Health</Link>}<Suspense fallback={null}><HowItWorks/></Suspense></div></div><div className="hero-pillars" role="group" aria-label="Your connected journey">{(financial?[['goals','Your goals',plainWords?'Give your savings a purpose.':'Give your ZIG a purpose.'],['future','Your future','Build habits. Live well.'],['chain','Onchain','ZIGChain vision · Alpha simulation.']]:[['goals','Your goals','A destination with meaning.'],['habits','Your rhythm','Small steps, your pace.'],['health','Your wellbeing','Care for the everyday.']]).map(([icon,title,detail])=><div key={icon}><span className="icon-medallion"><AppIcon name={icon!} size={30} luminous/></span><span><strong>{title}</strong><small>{detail}</small></span></div>)}</div></section>}
   <ProgressSlot page="today"/>
   {brandNew&&<Suspense fallback={<TodayReserve part="welcome"/>}><WelcomeCard demoAvailable={legacy.mode==='local'} onDismiss={()=>setWelcomeDismissed(true)}/></Suspense>}
   {!brandNew&&setupMade&&<Suspense fallback={null}><SetupLanding/></Suspense>}
   {[settings.error,platform.error,habits.error,health.error].filter(Boolean).map((message,i)=><p role="alert" className="notice" key={i}>{message}</p>)}
   {financial&&platform.error&&legacy.loaded&&!legacy.error&&goals.some(g=>g.key.startsWith('legacy:'))&&<section className="panel" aria-label="Available local simulation Goals"><h2>Your local simulation Goals are still available.</h2><p>Private tracked records need recovery. These separate local simulation records remain readable.</p><ul>{goals.filter(g=>g.key.startsWith('legacy:')).map(g=><li key={g.key} data-goal-key={g.key}><Link href={g.href}>{g.name}</Link></li>)}</ul></section>}
   {integrityShown&&<p role="alert" className="notice">{integrityWarning} <Link href="/app/wealth">Review saved sources →</Link> <button type="button" className="text-link" aria-label="Dismiss this notice in this tab" onClick={()=>{dismissIntegrity(tabStore(),integritySignature);setIntegrityHidden(integritySignature);}}>Dismiss</button></p>}
   {/* Session AK RB (RELEASE_REVIEW_2 R2-11): "Make Today yours" waits until the welcome above is answered (they asked the same question one after the other). */}
   {!showcase&&!brandNew&&storesReady&&!hasRecords&&makeToday}
   {/* Session AP (friends Alpha): after setup, the first five steps (its own chunk; nothing stored but its "hide"). */}{!showcase&&!brandNew&&storesReady&&!emptyDevice&&settings.loaded&&settings.data.onboarded&&<Suspense fallback={null}><FirstFive goals={platform.data.goals.length+legacy.goals.length} habits={habits.data.habits.length} meals={health.data.diary.length}/></Suspense>}
   {!brandNew&&storesReady&&<TodayLine habits={habits.data} health={health.data} platform={platform.data} quotes={market.quotes} now={now} today={today} healthDate={sources.healthDate} showHabits={domains.includes('habits')&&isShown(pagesView,'habits')} showHealth={domains.includes('health')&&showHealth} financial={financial}/>}
   {!brandNew&&<TodayFocus habitsWidget={habitsWidgetShown} reminders={<>{habits.loaded&&health.loaded&&<ReminderCards habits={habits.error?undefined:habits.data} health={health.error?undefined:health.data}/>}{/* Session AL fourth pass (PR-103, C-LS-09): tasks due today and task reminders */}<LoadBoundary quiet><Suspense fallback={null}><TodayTasksDue/></Suspense></LoadBoundary>{parts.focus}<div className="for-you-place" ref={setFocusPlace}/></>} nextGoal={nextGoal} goalsReady={legacy.loaded&&platform.loaded} step={roles.focus?.step} financial={financial} showHabits={domains.includes('habits')&&isShown(pagesView,'habits')} showHealth={domains.includes('health')&&showHealth} healthDate={sources.healthDate}/>}
   {/* Session AF (L3, P7.21): the Checklist's progress card after Today's focus — a fixed card (Today's main order lives in the strict synced dashboard placement, ADR-028 H95); hidden when the Checklist is off on this device. */}
   {!brandNew&&<TodayChecklistCard/>}
   {/* Session AK G2 (RELEASE_REVIEW R11, SESSION_AK_F8 proposal 2): on a phone the widget area (most of Today's elements)
       mounts when it comes within 600 px of the screen, on an address into it, on focus or when the browser is first idle;
       its place is kept meanwhile. The hero, slogan and first cards above render as before (components/use-mount-on-view.ts). */}
   <section aria-label="Your Today widgets" id="today-widgets" tabIndex={-1} className="dashboard-widget-area" ref={widgetArea.ref}>
    {customize&&<div className="section-heading dashboard-layout-heading"><h2>Arrange your daily space</h2><div className="dashboard-actions"><button className="primary" disabled={busy||settings.data.widgets.length>=24} onClick={()=>{setInsertAt(null);setEditor('new');}}>Add widget</button><button className="secondary" onClick={()=>setPreset(settings.data.preset)}>Choose preset</button></div></div>}
    <p role="status" className="dashboard-save-status">{status}</p>{error&&<p role="alert">{error}</p>}
    {widgetArea.mounted?<div className="dashboard-layout-grid"><LayoutRegion region="main" items={regionItems('main')} onMove={(id,to,order)=>placeAt('main',id,to,order)}/></div>:<div className="dashboard-widget-reserve" aria-hidden="true"/>}
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
   {!showcase&&!brandNew&&storesReady&&<LoadBoundary quiet><Suspense fallback={null}><TodayWrapped habits={habits.data} health={health.data} platform={platform.data} today={today}/></Suspense></LoadBoundary>}
   {showcase&&makeToday&&<PhoneFold label="Make Today yours">{makeToday}</PhoneFold>}{!showcase&&!brandNew&&hasRecords&&makeToday}
  </div>{!single&&<aside className="today-rail" aria-label="Your next chapter"><LayoutRegion region="rail" items={railItems} onMove={(id,to,order)=>placeAt('rail',id,to,order)}/></aside>}</div>
  {parts.end}<div className="for-you-place" ref={setEndPlace}/>
  {/* Session AB-Design (owner requests 9 and 11): Your week, then the game card while Gamify is on, then My links as the last card before the footer. Saved orders are kept (resolveOrder); "Reset this page" offers this order. */}
  {platform.loaded&&habits.loaded&&health.loaded&&!brandNew&&<LayoutRegion region="bottom" items={[{id:'today:week',label:'Your week',node:<PhoneFold label="Your week"><TodayWeek today={sources.healthDate} habits={habits.data} health={health.data} platform={platform.data} financial={financial}/></PhoneFold>},gameOn&&{id:'today:game',label:'Your progress',node:<div className="today-game-place"><Slot place="today:game"/></div>},myLinks.length>0&&isShown(pagesView,'links')&&{id:'today:links',label:'My links',node:<PhoneFold label="My links"><TodayLinks links={myLinks}/></PhoneFold>}]}/>}
  {editor&&<WidgetEditor key={editor==='new'?'new':editor.id} initial={editor==='new'?undefined:editor} sources={sources} ready={loaded} onRemove={editor==='new'?undefined:()=>change(s=>removeWidget(s,editor.id),'Widget removed. Your underlying record was kept.')} onClose={()=>{setEditor(null);setInsertAt(null);}} onSave={(w,rev)=>change(s=>{const saved=saveWidget(s,w,rev);return editor==='new'&&insertAt?moveDashboardItem(saved,{kind:'widget',id:w.id},{region:insertAt.region,anchor:insertAt.anchor,position:'after'}):saved;},'Widget saved on this device.')}/>}
  {preset&&<Modal title="Choose your Today layout" onClose={()=>setPreset(null)}><Suspense fallback={null}><PresetChooser preset={preset} onChoose={setPreset} preview={presetPreview} previewError={presetError} busy={busy} error={error} onCancel={()=>setPreset(null)} onApply={()=>void change(s=>applyDashboardPreset(s,preset),'Preset saved on this device.').then(()=>setPreset(null)).catch(()=>{})}/></Suspense></Modal>}
 </div>;
 return <HealthLinkContext.Provider value={healthLinkContext}><LayoutPage page="today" exit={false} unlocked={customize} onUnlockedChange={setCustomize} onReset={()=>apply(s=>resetDashboardPlacement(s),'Today is back to its default layout.')}>
  {layout({focus:null,main:null,end:null})}
  {forYouOn&&TodayForYou&&<LoadBoundary quiet><TodayForYou reviewOnToday={deviceCards.includes('review')} habits={habits.data} health={health.data} platform={platform.data} localGoals={legacy.goals} metadata={legacy.metadata?.goals??{}} quotes={market.quotes} now={now} today={today} financial={financial} showcase={showcase} render={parts=><>{focusPlace&&createPortal(parts.focus,focusPlace)}{mainPlace&&createPortal(parts.main,mainPlace)}{endPlace&&createPortal(parts.end,endPlace)}</>}/></LoadBoundary>}
 </LayoutPage></HealthLinkContext.Provider>;
}
