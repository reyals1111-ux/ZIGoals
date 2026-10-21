"use client";
import {Suspense,lazy,useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {LoadBoundary} from './load-boundary';
import Link from 'next/link';
import {AppIcon} from './app-icon';
const ACTIONS=[{name:'Goal',copy:'Give your next chapter a target.',href:'/app/goals/new',icon:'goals'},{name:'Asset',copy:'Add something to your wealth picture.',href:'/app/wealth?add=asset',icon:'wallet'},{name:'Contribution',copy:'Choose a Goal and record your next step.',href:'/app/goals?add=contribution',icon:'activity'},{name:'Habit',copy:'Build a rhythm that lasts.',href:'/app/habits?add=habit',icon:'habits'},{name:'Health entry',copy:'Log a meal, movement or weight.',href:'/app/health?add=entry',icon:'health'}];
// Session AA-Cloud weights: the sheet's heavier parts (the typed line with Health and Habits, the Goal choice) load
// once the page is idle and online (or at the first tap), never with the page's own scripts; offline, a failed load says
// so inside the sheet (LoadBoundary) and the page keeps working; the trigger and the dialog are here
// from the start.
const QuickAddSheet=lazy(()=>import('./quick-add-sheet'));
/** The trigger can sit anywhere (sidebar, Today hero); the dialog renders in <body> so its host's styles never reach it. */
export function QuickAdd({triggerClassName='secondary'}:{triggerClassName?:string}={}){
 const titleId=useId(),dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null),[contribution,setContribution]=useState(false),[host,setHost]=useState<HTMLElement|null>(null),[opened,setOpened]=useState(false);
 useEffect(()=>setHost(document.body),[]);
 // Ready before the first tap: the body loads once the page is idle (never with the page's own scripts).
 useEffect(()=>{const w=window as Window&{requestIdleCallback?:(f:()=>void,o?:{timeout:number})=>number;cancelIdleCallback?:(id:number)=>void};if(w.requestIdleCallback){const id=w.requestIdleCallback(()=>{if(navigator.onLine)setOpened(true);},{timeout:2500});return ()=>w.cancelIdleCallback?.(id);}const t=window.setTimeout(()=>{if(navigator.onLine)setOpened(true);},1200);return ()=>window.clearTimeout(t);},[]);
 const part=(which:'line'|'goals')=><LoadBoundary label="Quick add"><Suspense fallback={<div className="aa-skeleton" aria-hidden="true"><i/><i/><i/></div>}><QuickAddSheet part={which} close={()=>dialog.current?.close()}/></Suspense></LoadBoundary>;
 return <><button ref={trigger} className={`${triggerClassName} quick-add-trigger`} onPointerEnter={()=>void import('./quick-add-sheet').catch(()=>undefined)} onClick={()=>{setContribution(false);setOpened(true);dialog.current?.showModal();}}>+ Quick add</button>{host&&createPortal(<dialog ref={dialog} className="quick-add-dialog" aria-labelledby={titleId} onClose={()=>trigger.current?.focus()} onClick={e=>{if(e.target===dialog.current)dialog.current.close();}}><div><header className="section-heading"><div><p className="eyebrow">A SMALL STEP TODAY</p><h2 id={titleId}>{contribution?'Choose your Goal':'What would you like to add?'}</h2></div><button autoFocus className="quiet" aria-label="Close Quick add" onClick={()=>dialog.current?.close()}>×</button></header>{contribution?<><button className="quiet" onClick={()=>setContribution(false)}>← All actions</button>{part('goals')}</>:<>{opened&&part('line')}<nav aria-label="Quick add actions">{ACTIONS.map(a=>{const content=<><span className="icon-medallion"><AppIcon name={a.icon} luminous/></span><span><strong>{a.name}</strong><small>{a.copy}</small></span><span aria-hidden="true">↗</span></>;return a.name==='Contribution'?<button className="quick-action" key={a.name} onClick={()=>setContribution(true)}>{content}</button>:<Link key={a.name} href={a.href} onClick={()=>dialog.current?.close()}>{content}</Link>;})}</nav></>}</div></dialog>,host)}</>;
}
