'use client';
import {useEffect,useRef,useState} from 'react';
import {habitRuleOn,type Habit,type HabitData} from '../../lib/habits';
import {commitHabitTimer,discardHabitTimer,habitTimerPreview,pauseHabitTimer,resumeHabitTimer,startHabitTimer} from '../../lib/habit-actions';
import type {HabitsStore} from './use-habits';
export function HabitTimer({habit,store}:{habit:Habit;store:HabitsStore}){
 const [now,setNow]=useState(()=>new Date()),[busy,setBusy]=useState(false),[error,setError]=useState('');const saving=useRef(false);
 const timer=habit.timer,rule=habitRuleOn(habit,store.today);
 useEffect(()=>{if(!timer||timer.state!=='running')return;const update=()=>setNow(new Date()),id=window.setInterval(update,1000);window.addEventListener('focus',update);return()=>{window.clearInterval(id);window.removeEventListener('focus',update);};},[timer]);
 async function run(action:()=>Promise<void>){if(saving.current)return;saving.current=true;setBusy(true);setError('');try{await action();setNow(new Date());}catch(e){setError(e instanceof Error?e.message:'Timer was not saved. Its previous state is retained.');}finally{saving.current=false;setBusy(false);}}
 function change(action:(data:HabitData,at:Date)=>HabitData){const at=new Date();return run(()=>store.update(data=>action(data,at)));}
 if(!timer&&rule?.measurement.kind!=='duration')return null;
 const preview=timer?habitTimerPreview(habit,now):undefined;
 return <section className="habit-quick-log" aria-label="Saved timer"><h3>Duration timer</h3>{timer?<>
  <p><strong>{Number(preview!.value.toFixed(4))} {timer.unit}</strong> · {timer.state==='running'?'Running':'Paused for review'}</p>
  <p className="fine">Started {new Date(timer.startedAt).toLocaleString()} · {timer.date} in {timer.timeZone}. Original unit: {timer.unit}.</p>
  {preview!.reviewReason&&<p role="status" className="notice">{preview!.reviewReason} The timer is retained. Record the corrected duration in History before discarding it.</p>}
  <div className="actions">{timer.state==='running'?<button type="button" className="secondary" disabled={busy} onClick={()=>void change((data,at)=>pauseHabitTimer(data,habit.id,timer.id,at,JSON.stringify(timer)))}>Pause timer</button>:<><button type="button" className="secondary" disabled={busy||!!preview!.reviewReason} onClick={()=>void change((data,at)=>resumeHabitTimer(data,habit.id,timer.id,at,JSON.stringify(timer)))}>Resume timer</button><button type="button" className="primary" disabled={busy||!!preview!.reviewReason||preview!.value<=0} onClick={()=>void change((data,at)=>commitHabitTimer(data,habit.id,timer.id,at,JSON.stringify(timer)))}>Log reviewed duration</button></>}<button type="button" className="quiet" disabled={busy} onClick={()=>void change((data,at)=>discardHabitTimer(data,habit.id,timer.id,at,JSON.stringify(timer)))}>Discard timer without logging</button></div>
 </>:<button type="button" className="secondary" disabled={busy||rule?.state!=='active'} onClick={()=>{const id=crypto.randomUUID();void change((data,at)=>startHabitTimer(data,habit.id,id,at));}}>Start timer</button>}
 <p className="fine">Start and pause times are saved privately. Reloading keeps the timer; elapsed duration comes from timestamps, including time away. Nothing is logged until you review it. No background alarm is promised.</p>
 {!!habit.timerReceipts?.length&&<details><summary>Timer history</summary><ul>{habit.timerReceipts.map(r=><li key={r.id}>{r.date} · {r.status==='logged'?`${Number(r.value.toFixed(4))} ${r.unit} logged`:'Discarded without logging'} · {r.startedAt} → {r.endedAt}</li>)}</ul></details>}
 {error&&<p role="alert">{error}</p>}
 </section>;
}
