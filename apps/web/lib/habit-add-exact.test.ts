import {expect,test} from 'vitest';
import {createHabit,emptyHabitData,logHabitValue,habitDay} from './habits';

// "Add" sums a new value into the day (the + button and saved timers). Binary floating point
// must not turn 0.7 + 0.1 into 0.7999999999999999 and leave a 0.8 target unmet.
const id='00000000-0000-4000-8000-00000000a0d1',morning=new Date('2026-10-01T08:00:00Z');
function habit(target:number,measurement:{kind:'quantity';unit:string}|{kind:'duration';unit:'minutes'}){
 return createHabit(emptyHabitData(),{title:'Fictional habit',category:'Health',description:'',notes:'',schedule:{kind:'daily'},target,measurement} as Parameters<typeof createHabit>[1],morning,id);
}
test.each([
 [0.8,{kind:'quantity',unit:'L'},[0.7,0.1],0.8],
 [0.3,{kind:'quantity',unit:'km'},[0.1,0.2],0.3],
 [30,{kind:'duration',unit:'minutes'},[12.345,17.655],30],
 [2.5,{kind:'quantity',unit:'L'},[1.1,1.4],2.5],
] as const)('target %s (%j): adding %j records exactly %s and completes the day',(target,measurement,adds,total)=>{
 let data=habit(target,measurement);
 for(const [i,value] of adds.entries())data=logHabitValue(data,id,'2026-10-01',value,{mode:'add'},new Date(+morning+(i+1)*3_600_000));
 const h=data.habits[0]!;
 expect(h.entries[0]!.count).toBe(total);
 expect(habitDay(h,'2026-10-01','2026-10-01').status).toBe('complete');
});
test('whole-number adds are unchanged',()=>{
 let data=habit(3,{kind:'quantity',unit:'glasses'});
 for(const hour of [1,2,3])data=logHabitValue(data,id,'2026-10-01',1,{mode:'add'},new Date(+morning+hour*3_600_000));
 expect(data.habits[0]!.entries[0]!.count).toBe(3);
});
