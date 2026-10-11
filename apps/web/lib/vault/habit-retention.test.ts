import {test,expect} from 'vitest';
import {createHabit,emptyHabitData} from '../habits';
import {scheduleHabitState} from '../habit-actions';
import {validateData} from './account-data';
test('sync retains every accepted Habit rule revision; later rules cannot rewrite originals',()=>{
 const now=new Date('2026-09-26T10:00:00.000Z'),initial=createHabit(emptyHabitData(),{title:'Read',category:'Personal',description:'',notes:'',type:'build',measurement:{kind:'boolean'},target:1,targetPeriod:'day',schedule:{kind:'daily'},timeOfDay:'anytime',endCondition:{kind:'none'}},now),id=initial.habits[0]!.id,paused=scheduleHabitState(initial,id,'paused','2026-09-28',now),raw={habits:JSON.stringify(paused)};
 expect(()=>validateData(raw,{habits:JSON.stringify(initial)})).not.toThrow();const lost=structuredClone(paused);lost.habits[0]!.ruleRevisions=[];expect(()=>validateData({habits:JSON.stringify(lost)},raw)).toThrow('append-only');const rewritten=structuredClone(paused);rewritten.habits[0]!.ruleRevisions![0]!.recordedAt='2026-09-26T11:00:00.000Z';expect(()=>validateData({habits:JSON.stringify(rewritten)},raw)).toThrow('append-only');
});
