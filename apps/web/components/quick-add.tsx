"use client";
import {Suspense,lazy,startTransition,useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {LoadBoundary} from './load-boundary';
import Link from 'next/link';
import {AppIcon} from './app-icon';
import {useBackCloses} from './use-back-closes';
import {pushToastLayer} from './ui/undo-toast';
import {usePagesView} from './pages/use-pages-view';
import {isShown} from '../lib/pages/visibility';
// Session AL (P-LS-04, C-LS-27): a Task row opens Tasks with the add field ready.
// Session AK G2 (RELEASE_REVIEW_2 R2-13): the most frequent first, as MacroFactor's and Daylio's "+" do — the daily logs (a
// Health entry, a habit), a note, a contribution, then the rarer creations (a goal, an asset). Note is one of these rows.
const ACTIONS=[{name:'Health entry',copy:'Log a meal, movement or weight.',href:'/app/health?add=entry',icon:'health'},{name:'Habit',copy:'Build a rhythm that lasts.',href:'/app/habits?add=habit',icon:'habits'},{name:'Note',copy:'Capture a thought, a photo or your voice; file it later.',href:'',icon:'notes'},{name:'Task',copy:'A to-do with a day, a repeat or a project.',href:'/app/tasks?add=1',icon:'tasks'},{name:'Contribution',copy:'Choose a Goal and record your next step.',href:'/app/goals?add=contribution',icon:'activity'},{name:'Goal',copy:'Give your next chapter a target.',href:'/app/goals/new',icon:'goals'},{name:'Asset',copy:'Add something to your wealth picture.',href:'/app/wealth?add=asset',icon:'wallet'}];
// Session AA-Cloud weights: the sheet's heavier parts (the typed line with Health and Habits, the Goal choice) load
// once the page is idle and online (or at the first tap), never with the page's own scripts; offline, a failed load says
// so inside the sheet (LoadBoundary) and the page keeps working; the trigger and the dialog are here
// from the start.
const QuickAddSheet=lazy(()=>import('./quick-add-sheet'));
// Session AK (B1; lane B mount): "Note" — capture to the notes inbox in place. Session AK G2 (R2-13): its row is one of the
// sheet's own (same look and alignment, in frequency order); the capture box's code loads at the tap.
const QuickCapture=lazy(()=>import('./notes/quick-capture'));
// Session AK (F8, release review R15): the sheet's chunk starts loading on a touch (pointerdown), a hover or keyboard focus of
// "+", not only on a mouse hover, so a phone's tap no longer waits for it before the sheet can show.
const preload=()=>void import('./quick-add-sheet').catch(()=>undefined);
const preloadNote=()=>void import('./notes/quick-capture').catch(()=>undefined);
/** The trigger can sit anywhere (sidebar, Today hero); the dialog renders in <body> so its host's styles never reach it. */
export function QuickAdd({triggerClassName='secondary'}:{triggerClassName?:string}={}){
 const healthShown=isShown(usePagesView(),'health');
 const titleId=useId(),dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null),[contribution,setContribution]=useState(false),[note,setNote]=useState(false),[host,setHost]=useState<HTMLElement|null>(null),[opened,setOpened]=useState(false),[openWhenReady,setOpenWhenReady]=useState(false),[showing,setShowing]=useState(false);
 // Session AH Part 3 (DS9): Back closes the sheet first.
 useBackCloses(showing,()=>dialog.current?.close());
 // Session AL (P-LS-48, P-LS-04): while the sheet is open (a modal leaves the page inert), the app's toast sits inside it,
 // so the Undo of a save made here can be pressed.
 useEffect(()=>{if(!showing||!dialog.current)return;return pushToastLayer(dialog.current);},[showing]);
 useEffect(()=>setHost(document.body),[]);
 // Session AH Part 2: a tap that lands after hydration but before the dialog is in the page (it mounts into <body> one
 // effect later) opens it as soon as it is there, instead of calling showModal on nothing (run9-2-product:30, phones).
 useEffect(()=>{if(openWhenReady&&host&&dialog.current){if(!dialog.current.open)dialog.current.showModal();setOpenWhenReady(false);}},[openWhenReady,host]);
 // Ready before the first tap: the body loads once the page is idle (never with the page's own scripts).
 useEffect(()=>{const w=window as Window&{requestIdleCallback?:(f:()=>void,o?:{timeout:number})=>number;cancelIdleCallback?:(id:number)=>void};if(w.requestIdleCallback){const id=w.requestIdleCallback(()=>{if(navigator.onLine)setOpened(true);},{timeout:2500});return ()=>w.cancelIdleCallback?.(id);}const t=window.setTimeout(()=>{if(navigator.onLine)setOpened(true);},1200);return ()=>window.clearTimeout(t);},[]);
 const part=(which:'line'|'goals')=><LoadBoundary label="Quick add"><Suspense fallback={<div className="aa-skeleton" aria-hidden="true"><i/><i/><i/></div>}><QuickAddSheet part={which} close={()=>dialog.current?.close()}/></Suspense></LoadBoundary>;
 return <><button ref={trigger} className={`${triggerClassName} quick-add-trigger`} onPointerEnter={preload} onPointerDown={preload} onFocus={preload} onClick={()=>{setContribution(false);setOpened(true);/* Session AK (F8, R15): the re-render that arms Back-closes runs as a transition, after the sheet paints (it re-rendered the whole sheet inside the tap: 207 ms of the 368 ms tap at 4× CPU). */startTransition(()=>setShowing(true));if(dialog.current)dialog.current.showModal();else setOpenWhenReady(true);}}>+ Quick add</button>{host&&createPortal(<dialog ref={dialog} className="quick-add-dialog" aria-labelledby={titleId} onClose={()=>{setShowing(false);setNote(false);trigger.current?.focus();}} onClick={e=>{if(e.target===dialog.current)dialog.current.close();}}><div><header className="section-heading"><div><p className="eyebrow">A SMALL STEP TODAY</p><h2 id={titleId}>{contribution?'Choose your Goal':'What would you like to add?'}</h2></div><button autoFocus className="quiet" aria-label="Close Quick add" onClick={()=>dialog.current?.close()}>×</button></header>{contribution?<><button className="quiet" onClick={()=>setContribution(false)}>← All actions</button>{part('goals')}</>:<>{opened&&part('line')}<nav aria-label="Quick add actions">{ACTIONS.map(a=>{const content=<><span className="icon-medallion"><AppIcon name={a.icon} luminous/></span><span><strong>{a.name}{/* Session AL (NB-240, P-NB-67; GO3: hidden pages stay reachable) */a.name==='Health entry'&&!healthShown?' (a hidden page)':''}</strong><small>{a.name==='Health entry'&&!healthShown?'Health is hidden from your pages; this opens it anyway.':a.copy}</small></span><span aria-hidden="true">{a.name==='Note'?'＋':'↗'}</span></>;if(a.name==='Note')return note?<LoadBoundary key={a.name} label="Capture a note"><Suspense fallback={<p className="fine">Opening…</p>}><QuickCapture onClose={()=>{setNote(false);requestAnimationFrame(()=>dialog.current?.querySelector<HTMLElement>('[data-note-row]')?.focus());}}/></Suspense></LoadBoundary>:<button type="button" className="quick-action" key={a.name} data-note-row="" aria-expanded={false} onPointerEnter={preloadNote} onFocus={preloadNote} onClick={()=>setNote(true)}>{content}</button>;return a.name==='Contribution'?<button className="quick-action" key={a.name} onClick={()=>setContribution(true)}>{content}</button>:<Link key={a.name} href={a.href} onClick={()=>dialog.current?.close()}>{content}</Link>;})}</nav></>}</div></dialog>,host)}</>;
}
