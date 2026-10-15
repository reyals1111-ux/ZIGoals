'use client';
import {useEffect,useRef,useState} from 'react';
import {habitRuleOn,type Habit,type HabitData} from '../../lib/habits';
import {discardHabitTimer,finishHabitTimer,habitTimerPreview,pauseHabitTimer,resumeHabitTimer,startHabitTimer} from '../../lib/habit-timer-actions';
import type {HabitCardStore} from './use-habits';
import { formatDateTime, formatPlainDecimal } from '../../lib/visual-format';
import {habitBell, setTimerBell} from '../../lib/habits-extras/store';
import {ringTimerBell} from '../../lib/habits-extras/bell';
import {useHabitExtrasContext} from './habit-extras-context';
import {zigiSignals} from '../zigi/bus';

const mmss = (minutes: number) => { const s = Math.max(0, Math.round(minutes * 60)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
/** The timer's shown minutes, from its stored timestamps (a reload keeps it; nothing ticks in storage). */
function useTimerClock(habit: Habit) {
 const [now,setNow]=useState(()=>new Date()); const timer=habit.timer;
 useEffect(()=>{if(!timer||timer.state!=='running')return;const update=()=>setNow(new Date()),id=window.setInterval(update,1000);window.addEventListener('focus',update);return()=>{window.clearInterval(id);window.removeEventListener('focus',update);};},[timer]);
 return now;
}
/**
 * H2 (Session AA-Local): the duration timer with start, pause, resume and "Log reviewed duration" (the finish, which logs the reviewed duration into
 * today's check-in through the journal's own `commitHabitTimer`), an optional end bell (device-only, quiet hours kept)
 * and a compact chip for Today's widget. The timer's own rules (timestamps, timezone review) are unchanged from Session I.
 */
export function HabitTimer({habit,store}:{habit:Habit;store:HabitCardStore}){
 const now=useTimerClock(habit),[busy,setBusy]=useState(false),[error,setError]=useState('');const saving=useRef(false);
 const timer=habit.timer,rule=habitRuleOn(habit,store.today);
 const extras=useHabitExtrasContext(), bell=!!extras&&extras.loaded&&!extras.unreadable&&habitBell(extras.data,habit.id), rang=useRef<string|null>(null);
 async function run(action:()=>Promise<void>){if(saving.current)return;saving.current=true;setBusy(true);setError('');try{await action();}catch(e){setError(e instanceof Error?e.message:'Timer was not saved. Its previous state is retained.');}finally{saving.current=false;setBusy(false);}}
 function change(action:(data:HabitData,at:Date)=>HabitData){const at=new Date();return run(()=>store.update(data=>action(data,at)));}
 const preview=timer?habitTimerPreview(habit,now):undefined;
 const targetMinutes=rule&&rule.measurement.kind==='duration'?(rule.measurement.unit==='hours'?rule.target*60:rule.target):null;
 const elapsedMinutes=preview&&timer?(timer.unit==='hours'?preview.value*60:preview.value):0;
 useEffect(()=>{if(!timer||timer.state!=='running'||!bell||targetMinutes===null||elapsedMinutes<targetMinutes||rang.current===timer.id)return;rang.current=timer.id;void ringTimerBell();},[timer,bell,targetMinutes,elapsedMinutes]);
 if(!timer&&rule?.measurement.kind!=='duration')return null;
 const reviewReason=timer&&store.data.timeZone&&store.data.timeZone!==timer.timeZone?'The Habit timezone changed. Review the original date before logging.':preview?.reviewReason;
 const reached=targetMinutes!==null&&elapsedMinutes>=targetMinutes;
 return <section className="habit-quick-log habit-timer-section" aria-label="Saved timer"><h3>Duration timer</h3>{timer?<>
  <p className={`habit-timer-chip${timer.state==='running'?' habit-timer-chip-running':''}`} data-running={timer.state==='running'||undefined}><strong aria-live="polite">{mmss(elapsedMinutes)}</strong><span>{targetMinutes!==null?`of ${targetMinutes} min`:timer.unit} · {timer.state==='running'?reached?'target reached':'running':'paused'}</span></p>
  <p className="fine">Started {formatDateTime(timer.startedAt)} · {timer.date} in {timer.timeZone}. {formatPlainDecimal(String(Number(preview!.value.toFixed(4))))} {timer.unit} so far.</p>
  {reviewReason&&<p role="status" className="notice">{reviewReason} The timer is retained. Record the corrected duration in History before discarding it.</p>}
  <div className="actions">{timer.state==='running'?<><button type="button" className="secondary habit-timer-chip-button" aria-label="Pause timer" disabled={busy} onClick={()=>void change((data,at)=>pauseHabitTimer(data,habit.id,timer.id,at,JSON.stringify(timer)))}>Pause</button><button type="button" aria-label="Log reviewed duration" className="habit-timer-chip-button primary" disabled={busy||!!reviewReason||preview!.value<=0} onClick={()=>void run(async()=>{const at=new Date();await store.update(data=>finishHabitTimer(data,habit.id,timer.id,at,JSON.stringify(timer)));try{zigiSignals.emitValidated('habit_completed');}catch{/* decoration */}})}>Finish</button></>:<><button type="button" aria-label="Resume timer" className="habit-timer-chip-button secondary" disabled={busy||!!reviewReason} onClick={()=>void change((data,at)=>resumeHabitTimer(data,habit.id,timer.id,at,JSON.stringify(timer)))}>Resume</button><button type="button" aria-label="Log reviewed duration" className="habit-timer-chip-button primary" disabled={busy||!!reviewReason||preview!.value<=0} onClick={()=>void run(async()=>{const at=new Date();await store.update(data=>finishHabitTimer(data,habit.id,timer.id,at,JSON.stringify(timer)));try{zigiSignals.emitValidated('habit_completed');}catch{/* decoration */}})}>Finish</button></>}<button type="button" aria-label="Discard timer without logging" className="habit-timer-chip-button quiet" disabled={busy} onClick={()=>void change((data,at)=>discardHabitTimer(data,habit.id,timer.id,at,JSON.stringify(timer)))}>Discard</button></div>
 </>:<button type="button" className="secondary" disabled={busy||rule?.state!=='active'} onClick={()=>{const id=crypto.randomUUID();void change((data,at)=>startHabitTimer(data,habit.id,id,at));}}>Start timer</button>}
 {extras&&extras.loaded&&!extras.unreadable&&<div className="habit-timer-bell"><button type="button" role="switch" aria-checked={bell} className="habit-switch" onClick={()=>{try{extras.update(r=>setTimerBell(r,habit.id,!bell));}catch{/* a convenience */}}}><span className="habit-switch-knob" aria-hidden="true"/><span className="habit-switch-words">Ring a bell when the target is reached <small>(never in quiet hours)</small></span></button></div>}
 <p className="fine">Start and pause times are saved privately; the timer keeps running across pages and reloads, from its timestamps. Finish logs the duration into today’s check-in.</p>
 {!!habit.timerReceipts?.length&&<details><summary>Timer history</summary><p className="fine">Accepted reviews retain their original timestamps. Multiple reviews of one timer are not added together; your diary holds the chosen duration.</p><ul>{habit.timerReceipts.map(r=><li key={r.id}>{r.date} · {r.status==='logged'?`${formatPlainDecimal(String(Number(r.value.toFixed(4))))} ${r.unit} reviewed for logging`:'Discarded without logging'} · {r.startedAt} → {r.endedAt} · reviewed {r.recordedAt}</li>)}</ul></details>}
 {error&&<p role="alert">{error}</p>}
 </section>;
}
/** The compact chip for Today's widget: the running time, Pause or Resume, and Finish. Nothing for a habit without a timer. */
export function TimerChip({habit,store}:{habit:Habit;store:HabitCardStore}){
 const now=useTimerClock(habit),[busy,setBusy]=useState(false);const timer=habit.timer;
 if(!timer)return null;
 const preview=habitTimerPreview(habit,now),rule=habitRuleOn(habit,store.today),targetMinutes=rule&&rule.measurement.kind==='duration'?(rule.measurement.unit==='hours'?rule.target*60:rule.target):null,minutes=timer.unit==='hours'?preview.value*60:preview.value;
 async function change(action:(data:HabitData,at:Date)=>HabitData){setBusy(true);const at=new Date();try{await store.update(data=>action(data,at));}catch{/* the card shows the error */}finally{setBusy(false);}}
 return <div className="habit-timer-chip" role="group" data-running={timer.state==='running'||undefined} aria-label={`${habit.title} timer`}><strong>{mmss(minutes)}</strong><span>{targetMinutes!==null?`/ ${targetMinutes} min`:timer.unit}</span>{timer.state==='running'?<button type="button" className="quiet" disabled={busy} onClick={()=>void change((d,at)=>pauseHabitTimer(d,habit.id,timer.id,at,JSON.stringify(timer)))}>Pause</button>:<button type="button" className="quiet" disabled={busy||!!preview.reviewReason} onClick={()=>void change((d,at)=>resumeHabitTimer(d,habit.id,timer.id,at,JSON.stringify(timer)))}>Resume</button>}<button type="button" className="quiet" disabled={busy||!!preview.reviewReason||preview.value<=0} onClick={()=>void change((d,at)=>finishHabitTimer(d,habit.id,timer.id,at,JSON.stringify(timer)))}>Finish</button></div>;
}
