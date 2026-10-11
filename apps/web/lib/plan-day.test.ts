import {expect,test} from 'vitest';
import {planDay,shiftPlanDay} from './plan-revisions';

// Timezone phase 2 (Session N): planDay and shiftPlanDay give exactly what the earlier expressions gave, over the
// whole range of instants and dates, error class and message included. Inside 1900-9999 they come from the time
// helpers; outside it they fall back to the earlier expressions.
const earlierDay=(now:number)=>new Date(now).toISOString().slice(0,10);
const earlierShift=(date:string,n:number)=>new Date(Date.parse(`${date}T00:00:00Z`)+n*86400000).toISOString().slice(0,10);
const outcome=(run:()=>string)=>{try{return run();}catch(error){return `${(error as Error).name}: ${(error as Error).message}`;}};
function random(seed:number){let a=seed>>>0;return()=>{a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}

test('planDay equals the earlier UTC slice for every kind of instant',()=>{
 const next=random(4242),instants:number[]=[Number.NaN,Infinity,-Infinity,8.64e15,8.64e15+1,-8.64e15,-8.64e15-1,-0,0,
  Date.UTC(1900,0,1)-1,Date.UTC(1900,0,1),Date.UTC(10000,0,1)-1,Date.UTC(10000,0,1)];
 // Across the whole representable range (years -271821 to 275760), and densely across 1900-9999.
 for(let i=0;i<5_000;i++)instants.push(Math.round((next()*2-1)*8.64e15));
 for(let i=0;i<10_000;i++)instants.push(Date.UTC(1900,0,1)+Math.floor(next()*(Date.UTC(10000,0,1)-Date.UTC(1900,0,1))));
 for(const now of instants)if(outcome(()=>planDay(now))!==outcome(()=>earlierDay(now)))throw Error(`differs at ${now}`);
 expect(instants.length).toBe(15_013);
});

test('shiftPlanDay equals the earlier calendar step, in and outside 1900-9999',()=>{
 const next=random(777),dates=['1850-01-01','0000-01-01','0001-01-01','1899-12-31','1900-01-01','1900-01-02','2026-10-15','2028-02-29','9999-12-30','9999-12-31','not-a-date','2026-02-30','+010000-01','','2026-1-01'];
 for(let i=0;i<2_000;i++)dates.push(earlierDay(Date.UTC(1,0,1)+Math.floor(next()*(Date.UTC(9999,11,31)-Date.UTC(1,0,1)))));
 let checked=0;
 for(const date of dates)for(const n of [-800000,-400,-31,-1,0,1,31,400,800000,0.5,Number.NaN]){
  if(outcome(()=>shiftPlanDay(date,n))!==outcome(()=>earlierShift(date,n)))throw Error(`differs at ${date} ${n}`);
  checked++;
 }
 expect(checked).toBe(dates.length*11);
});
