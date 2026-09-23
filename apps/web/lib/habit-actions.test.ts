import {describe,it,expect} from 'vitest';
import {createHabit,emptyHabitData,habitDataSchema,habitDay,habitRuleOn,habitStats,logHabitValue,type HabitInput} from './habits';
import {scheduleHabitEdit,scheduleHabitState,habitEditFingerprint,startHabitTimer,pauseHabitTimer,resumeHabitTimer,habitTimerPreview,commitHabitTimer,discardHabitTimer} from './habit-actions';
const id='59a35604-3696-4a78-b455-4015acb66885',timerId='ff829326-f352-4a26-80d0-eb8c31cde62e';
const at=(date:string)=>new Date(`${date}T12:00:00`);
const input:HabitInput={title:'Fictional reading',category:'Learning',description:'',notes:'',schedule:{kind:'daily'},measurement:{kind:'duration',unit:'minutes'},target:30};
const make=()=>createHabit(emptyHabitData(),input,at('2026-09-20'),id);
describe('future Habit rules and saved timers',()=>{
 it('retains old rules and logged units while applying a chosen future rule only from its day',()=>{
  const s=logHabitValue(make(),id,'2026-09-20',30,{},at('2026-09-20')),old=s.habits[0]!;
  const next=scheduleHabitEdit(s,id,{...input,target:1,measurement:{kind:'duration',unit:'hours'}},'2026-09-22',at('2026-09-20'),habitEditFingerprint(old));
  expect(next.habits[0]!.rules[0]).toEqual(old.rules[0]);expect(next.habits[0]!.entries).toEqual(old.entries);
  expect(habitDay(next.habits[0]!,'2026-09-20','2026-09-20')).toMatchObject({target:30,status:'complete'});
  expect(habitRuleOn(next.habits[0]!,'2026-09-22')?.measurement).toEqual({kind:'duration',unit:'hours'});
  expect(next.habits[0]!.ruleRevisions?.at(-1)).toMatchObject({rule:{from:'2026-09-22',target:1}});
 });
 it('rejects a historical effective day and stale edits, and preserves superseded future terms',()=>{
  const s=make(),fp=habitEditFingerprint(s.habits[0]!);
  expect(()=>scheduleHabitEdit(s,id,input,'2026-09-20',at('2026-09-20'),fp)).toThrow(/future/i);
  const next=scheduleHabitEdit(s,id,{...input,target:40},'2026-09-21',at('2026-09-20'),fp);
  expect(()=>scheduleHabitEdit(next,id,{...input,target:50},'2026-09-21',at('2026-09-20'),fp)).toThrow(/changed/i);
  const replacement=scheduleHabitEdit(next,id,{...input,target:50},'2026-09-21',at('2026-09-20'),habitEditFingerprint(next.habits[0]!));
  expect(replacement.habits[0]!.ruleRevisions?.some(r=>r.rule.target===40)).toBe(true);
  expect(habitRuleOn(replacement.habits[0]!,'2026-09-21')?.target).toBe(50);
 });
 it('keeps future pauses out of today and preserves current streak units before a future period change',()=>{
  const s=scheduleHabitState(make(),id,'paused','2026-09-22',at('2026-09-20'));
  expect(habitDay(s.habits[0]!,'2026-09-20','2026-09-20').status).toBe('due');
  expect(habitDay(s.habits[0]!,'2026-09-22','2026-09-22').status).toBe('paused');
  const changed=scheduleHabitEdit(make(),id,{...input,targetPeriod:'month'},'2026-09-22',at('2026-09-20'));
  expect(habitStats(changed.habits[0]!,'2026-09-20').streakUnit).toBe('days');
 });
 it('round-trips a running timer, pauses/resumes exact elapsed time, and commits only once',()=>{
  const start=at('2026-09-20'),s=startHabitTimer(make(),id,timerId,start,'Europe/Brussels');
  const restored=habitDataSchema.parse(JSON.parse(JSON.stringify(s)));
  const paused=pauseHabitTimer(restored,id,timerId,new Date(+start+30_000));
  expect(habitTimerPreview(paused.habits[0]!,new Date(+start+60_000)).value).toBe(.5);
  const resumed=resumeHabitTimer(paused,id,timerId,new Date(+start+90_000));
  const stopped=pauseHabitTimer(resumed,id,timerId,new Date(+start+150_000));
  expect(habitTimerPreview(stopped.habits[0]!,new Date(+start+150_000)).value).toBe(1.5);
  const committed=commitHabitTimer(stopped,id,timerId,new Date(+start+150_000));
  expect(committed.habits[0]!.entries[0]?.count).toBe(1.5);expect(committed.habits[0]!.timer).toBeUndefined();
  expect(commitHabitTimer(committed,id,timerId,new Date(+start+160_000))).toBe(committed);
  expect(committed.habits[0]!.timerReceipts?.[0]).toMatchObject({id:timerId,value:1.5,date:'2026-09-20'});
 });
 it('does not invent a minimum minute or restart/reuse a timer identity',()=>{
  const start=at('2026-09-20'),s=startHabitTimer(make(),id,timerId,start,'Europe/Brussels');
  expect(startHabitTimer(s,id,timerId,start,'Europe/Brussels')).toBe(s);
  const stopped=pauseHabitTimer(s,id,timerId,new Date(+start+1000));
  expect(habitTimerPreview(stopped.habits[0]!,new Date(+start+1000)).value).toBeCloseTo(1/60);
  const discarded=discardHabitTimer(stopped,id,timerId,new Date(+start+1000));
  expect(()=>startHabitTimer(discarded,id,timerId,start,'Europe/Brussels')).toThrow(/used/i);
  expect(discarded.habits[0]!.entries).toEqual([]);
  const long=discardHabitTimer(s,id,timerId,new Date(+start+8*86400000));
  expect(long.habits[0]!.timerReceipts?.[0]?.elapsedMs).toBe(8*86400000);
 });
 it('retains cross-midnight evidence for review and rejects clock reversal without changing saved state',()=>{
  const start=new Date('2026-09-20T21:59:00Z'),s=startHabitTimer(make(),id,timerId,start,'Europe/Brussels');
  expect(()=>pauseHabitTimer(s,id,timerId,new Date(+start-1000))).toThrow(/clock/i);
  const stopped=pauseHabitTimer(s,id,timerId,new Date('2026-09-20T22:01:00Z'));
  expect(habitTimerPreview(stopped.habits[0]!,new Date('2026-09-20T22:01:00Z')).reviewReason).toMatch(/calendar day/i);
  expect(()=>commitHabitTimer(stopped,id,timerId,new Date('2026-09-20T22:01:00Z'))).toThrow(/review/i);
  expect(stopped.habits[0]!.timer?.date).toBe('2026-09-20');expect(stopped.habits[0]!.entries).toEqual([]);
 });
 it('uses actual timestamps through a daylight-saving jump and never sums elapsed ticks',()=>{
  const start=new Date('2026-03-29T00:59:00Z');const initial=createHabit(emptyHabitData(),input,new Date('2026-03-28T12:00:00Z'),id);
  const s=startHabitTimer(initial,id,timerId,start,'Europe/Brussels'),end=new Date('2026-03-29T01:01:00Z');
  expect(habitTimerPreview(pauseHabitTimer(s,id,timerId,end).habits[0]!,end)).toMatchObject({value:2,reviewReason:null});
 });
 it('fails closed on malformed timer ordering and paused records without an end timestamp',()=>{
  const s=startHabitTimer(make(),id,timerId,at('2026-09-20'),'Europe/Brussels'),h=s.habits[0]!;
  for(const timer of [{...h.timer!,state:'paused'},{...h.timer!,segmentStartedAt:'2020-01-01T00:00:00Z'}])expect(habitDataSchema.safeParse({...s,habits:[{...h,timer}]}).success).toBe(false);
 });
 it('rejects a stale timer review after another control changes the measured segments',()=>{
  const start=at('2026-09-20'),running=startHabitTimer(make(),id,timerId,start,'Europe/Brussels'),paused=pauseHabitTimer(running,id,timerId,new Date(+start+30_000)),expected=JSON.stringify(paused.habits[0]!.timer);
  const changed=pauseHabitTimer(resumeHabitTimer(paused,id,timerId,new Date(+start+60_000)),id,timerId,new Date(+start+90_000));
  expect(()=>commitHabitTimer(changed,id,timerId,new Date(+start+90_000),expected)).toThrow(/changed/i);
  expect(()=>discardHabitTimer(changed,id,timerId,new Date(+start+90_000),expected)).toThrow(/changed/i);
 });
});
