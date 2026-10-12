"use client";
import {Suspense,lazy,useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
// Session AA-Cloud weights: the sheet's body (the typed line with Health and Habits, the actions, the Goal choice) loads
// once the page is idle (or at the first tap), never with the page's own scripts; the trigger and the dialog are here
// from the start.
const QuickAddSheet=lazy(()=>import('./quick-add-sheet'));
/** The trigger can sit anywhere (sidebar, Today hero); the dialog renders in <body> so its host's styles never reach it. */
export function QuickAdd({triggerClassName='secondary'}:{triggerClassName?:string}={}){
 const titleId=useId(),dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null),[contribution,setContribution]=useState(false),[host,setHost]=useState<HTMLElement|null>(null),[opened,setOpened]=useState(false);
 useEffect(()=>setHost(document.body),[]);
 // Ready before the first tap: the body loads once the page is idle (never with the page's own scripts).
 useEffect(()=>{const w=window as Window&{requestIdleCallback?:(f:()=>void,o?:{timeout:number})=>number;cancelIdleCallback?:(id:number)=>void};if(w.requestIdleCallback){const id=w.requestIdleCallback(()=>setOpened(true),{timeout:2500});return ()=>w.cancelIdleCallback?.(id);}const t=window.setTimeout(()=>setOpened(true),1200);return ()=>window.clearTimeout(t);},[]);
 return <><button ref={trigger} className={`${triggerClassName} quick-add-trigger`} onPointerEnter={()=>void import('./quick-add-sheet')} onClick={()=>{setContribution(false);setOpened(true);dialog.current?.showModal();}}>+ Quick add</button>{host&&createPortal(<dialog ref={dialog} className="quick-add-dialog" aria-labelledby={titleId} onClose={()=>trigger.current?.focus()} onClick={e=>{if(e.target===dialog.current)dialog.current.close();}}><div><header className="section-heading"><div><p className="eyebrow">A SMALL STEP TODAY</p><h2 id={titleId}>{contribution?'Choose your Goal':'What would you like to add?'}</h2></div><button autoFocus className="quiet" aria-label="Close Quick add" onClick={()=>dialog.current?.close()}>×</button></header>{opened&&<Suspense fallback={<div className="aa-skeleton" aria-hidden="true"><i/><i/><i/></div>}><QuickAddSheet contribution={contribution} setContribution={setContribution} close={()=>dialog.current?.close()}/></Suspense>}</div></dialog>,host)}</>;
}
