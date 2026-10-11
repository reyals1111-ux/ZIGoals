'use client';
/** Quick exercise counters at the top of Health: today's count per counter on the Health journal's day. */
import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {CardOptions} from '../card-options';
import {LayoutRegion} from '../layout-edit';
import {entityLayoutId} from '../../lib/page-layout';
import {dailyData,healthDay} from '../../lib/health-daily';
import {EXERCISE_ICONS,EXERCISE_ICON_LABELS,MAX_COUNTERS,addCounter,changeCount,countOn,deleteCounter,editCounter,exerciseData,type ExerciseCounter,type ExerciseIcon} from '../../lib/health-counters';
import type {HealthData} from '../../lib/health';
import './exercise-counters.css';
import {updateRefusalMessage} from '../../lib/storage-error-copy';

type Update=(updater:(h:HealthData)=>HealthData)=>Promise<void>;
const PATHS:Record<ExerciseIcon,ReactNode>={
 pushup:<><circle cx="19.2" cy="8.8" r="2"/><path d="M17.2 11 5 15.2M14.6 11.9V18M3 18.6h18"/></>,
 pullup:<><path d="M4 3.6h16"/><circle cx="12" cy="9" r="2"/><path d="M12 11v6m0 0-2 4m2-4 2 4M11 12.2 8.2 3.6M13 12.2l2.8-8.6"/></>,
 squat:<><circle cx="9.6" cy="4.8" r="2"/><path d="m9.8 7 2.4 6.2 5 .9-.9 6.2M11 9.4h6.4M5.5 21h14"/></>,
 run:<><circle cx="14.4" cy="4.4" r="2"/><path d="m13.4 6.8-2.2 6.4 3.9 2.9-1 4.2m-2.9-7.1L8.1 17H4.8M12.6 9l3.8 2.1M12.6 9 8.4 10.2"/></>,
 jump:<><circle cx="12" cy="4" r="2"/><path d="M12 6.2v6.8m0-4.6L7.4 4.4m4.6 4 4.6-4M12 13l-2.9 4.6M12 13l2.9 4.6"/><path d="M6 21h12" strokeDasharray="2 2.4"/></>,
 stretch:<><circle cx="7" cy="5" r="2"/><path d="m8 7.2 4.8 7m-3.6-5.2 10.6-4M12.8 14.2l6 5.8m-6-5.8L8 20.4"/></>,
 core:<><circle cx="19.8" cy="10.6" r="2"/><path d="m17.7 12.1-12.9 2.3M17 12.5v4.8h3.4M3 19.6h18"/></>,
 bike:<><circle cx="6" cy="16.6" r="3.4"/><circle cx="18" cy="16.6" r="3.4"/><path d="m6 16.6 3.8-6.8h5.4L18 16.6M9.8 9.8l2.4 6.8h-6M8.2 7.8h3.4m3.6 2-.8-3h2.6"/></>,
};
/** Original line icons drawn with the nebula gradient (defined once per counter row). */
export function ExerciseIconGlyph({icon,gradient,size=30}:{icon:ExerciseIcon;gradient:string;size?:number}){
 return <svg className="exercise-icon" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false" fill="none" stroke={`url(#${gradient})`} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{PATHS[icon]}</svg>;
}
function Dialog({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null,dialog=ref.current;dialog?.showModal();return()=>{dialog?.close();previous?.focus();};},[]);
 return <dialog ref={ref} className="dashboard-dialog exercise-dialog" aria-label={title} onCancel={event=>{event.preventDefault();onClose();}}><header><h2>{title}</h2><button className="secondary" type="button" onClick={onClose}>Close</button></header>{children}</dialog>;
}
function CounterEditor({initial,gradient,onSave,onClose}:{initial?:ExerciseCounter;gradient:string;onSave:(name:string,icon:ExerciseIcon)=>Promise<void>;onClose:()=>void}){
 const [name,setName]=useState(initial?.name??''),[icon,setIcon]=useState<ExerciseIcon>(initial?.icon??'run'),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 return <Dialog title={initial?`Edit ${initial.name}`:'Add a counter'} onClose={onClose}><form className="exercise-editor" onSubmit={async event=>{event.preventDefault();setBusy(true);setError('');try{await onSave(name,icon);onClose();}catch(e){setError(e instanceof Error?e.message:'Could not save this counter.');}finally{setBusy(false);}}}>
  <label className="field"><span>Counter name</span><input value={name} maxLength={40} required onChange={event=>setName(event.target.value)} placeholder="Planks, burpees, lunges…"/></label>
  <fieldset className="exercise-icon-choices"><legend>Icon</legend>{EXERCISE_ICONS.map(choice=><label key={choice} className="exercise-icon-choice"><input type="radio" name="exercise-icon" value={choice} checked={icon===choice} onChange={()=>setIcon(choice)}/><span><ExerciseIconGlyph icon={choice} gradient={gradient} size={28}/><small>{EXERCISE_ICON_LABELS[choice]}</small></span></label>)}</fieldset>
  {error&&<p role="alert">{error}</p>}
  <div className="dashboard-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={busy}>{busy?'Saving…':initial?'Save counter':'Add counter'}</button></div>
 </form></Dialog>;
}

export function ExerciseCounters({data,update}:{data:HealthData;update:Update}){
 const gradient=`exercise-gradient-${useId().replace(/[^a-zA-Z0-9-]/g,'')}`;
 const today=healthDay(dailyData(data).preferences.timezone);
 const exercise=exerciseData(data);
 const [editor,setEditor]=useState<ExerciseCounter|'new'|null>(null),[removing,setRemoving]=useState<ExerciseCounter|null>(null),[status,setStatus]=useState(''),[error,setError]=useState('');
 // Taps are applied one after another, each to the latest saved Health data.
 const queue=useRef(Promise.resolve());
 function run(updater:(h:HealthData)=>HealthData,done?:string){
  const step=queue.current.then(()=>update(updater)).then(()=>{setError('');if(done)setStatus(done);});
  queue.current=step.catch(()=>{});
  return step.catch(e=>{setError(updateRefusalMessage(e,e instanceof Error&&e.message.length<160?e.message:'Could not save this count. Check available browser storage, then try again.'));throw e;});
 }
 const tap=(c:ExerciseCounter,delta:number)=>{void run(h=>changeCount(h,c.id,today,delta)).catch(()=>{});};
 const card=(c:ExerciseCounter)=>{
  const count=countOn(data,c.id,today);
  // A bar: icon and name on the left, − / count / + and the options on the right (Session I: no visible subtitle; the
  // section heading already says "Today in your Health journal"). "Today" stays in what is announced with the name.
  return <article className="exercise-counter" aria-label={c.name}>
   <span className="exercise-medallion"><ExerciseIconGlyph icon={c.icon} gradient={gradient}/></span>
   <div className="exercise-counter-name"><h3 title={c.name}>{c.name}</h3><p className="exercise-counter-caption sr-only">{count===null?'No entry today':'Today'}</p></div>
   <div className="exercise-counter-controls">
    <button type="button" className="exercise-step" aria-label={`Decrease ${c.name}`} disabled={!count} onClick={()=>tap(c,-1)}>−</button>
    <output className="exercise-count" aria-live="polite" aria-label={`${c.name} today`} data-empty={count===null||undefined}>{count===null?<><span aria-hidden="true">—</span><span className="sr-only">No entry today</span></>:count}</output>
    <button type="button" className="exercise-step" aria-label={`Increase ${c.name}`} onClick={()=>tap(c,1)}>+</button>
   </div>
   <CardOptions label={c.name}><button type="button" onClick={()=>setEditor(c)}>Rename or change icon</button><button type="button" onClick={()=>setRemoving(c)}>Delete counter</button></CardOptions>
  </article>;
 };
 return <section className="exercise-counters" aria-labelledby="exercise-counters-title">
  <svg width="0" height="0" aria-hidden="true" focusable="false" style={{position:'absolute'}}><defs><linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5fe6f5"/><stop offset=".55" stopColor="#9d8cff"/><stop offset="1" stopColor="#f07fd8"/></linearGradient></defs></svg>
  <div className="exercise-counters-heading"><div><p className="eyebrow">QUICK COUNTERS</p><h2 id="exercise-counters-title">Every repetition counts.</h2><p className="exercise-counters-day">Today in your Health journal · <time dateTime={today}>{today}</time></p></div>
   <button type="button" className="secondary" disabled={exercise.counters.length>=MAX_COUNTERS} onClick={()=>setEditor('new')}>+ Add counter</button></div>
  <div className="exercise-counter-grid"><LayoutRegion region="counters" grid items={exercise.counters.map(c=>({id:entityLayoutId(c.id),label:c.name,node:card(c)}))}/></div>
  {exercise.counters.length>=MAX_COUNTERS&&<p className="fine">You have {MAX_COUNTERS} counters, the most this row keeps. Delete one to add another.</p>}
  <p className="exercise-counters-status" role="status">{status}</p>{error&&<p role="alert">{error}</p>}
  {editor&&<CounterEditor key={editor==='new'?'new':editor.id} gradient={gradient} initial={editor==='new'?undefined:editor} onClose={()=>setEditor(null)} onSave={(name,icon)=>run(h=>editor==='new'?addCounter(h,name,icon,`health_counter-${crypto.randomUUID()}`):editCounter(h,editor.id,{name,icon}),editor==='new'?`${name.trim()} counter added.`:'Counter saved.')}/>}
  {removing&&<Dialog title={`Delete ${removing.name}?`} onClose={()=>setRemoving(null)}><p>This removes the {removing.name} counter and its daily history from your Health journal. Other Health records are not changed.</p><div className="dashboard-actions"><button type="button" className="secondary" autoFocus onClick={()=>setRemoving(null)}>Keep counter</button><button type="button" className="primary" onClick={()=>{const target=removing;setRemoving(null);void run(h=>deleteCounter(h,target.id),`${target.name} counter deleted.`).catch(()=>{});}}>Delete counter</button></div></Dialog>}
 </section>;
}
