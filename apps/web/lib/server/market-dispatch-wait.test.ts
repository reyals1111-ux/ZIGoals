import {test,expect,vi} from 'vitest';
import {waitForAdmission,MARKET_POLL_MS} from './market-dispatch-wait';
// Session R1: the reserve → own → dispatch steps are one `admit` of the original attempt, polled at most every 250 ms.
test('waiting owns no dispatch slot and retries only its original attempt, at most every 250 ms',async()=>{
 vi.useFakeTimers();try{
 const calls:{action:string;id:string;at:number}[]=[],t0=Date.now();let tries=0;
 const pending=waitForAdmission(async c=>{calls.push({...c,at:Date.now()});return tries++<2?{ok:false,reason:tries===1?'CONCURRENT_LIMIT':'QUEUE_WAIT'}:{ok:true,state:'DISPATCHED'};},'fixed',{maxWaitMs:1000});
 await vi.advanceTimersByTimeAsync(1000);
 expect(await pending).toEqual({ok:true,state:'DISPATCHED'});expect(calls.map(c=>[c.action,c.id])).toEqual([['admit','fixed'],['admit','fixed'],['admit','fixed']]);
 expect(calls.map(c=>c.at-t0)).toEqual([MARKET_POLL_MS,2*MARKET_POLL_MS,3*MARKET_POLL_MS]);
 }finally{vi.useRealTimers();}
});
test('deadline and caller cancellation terminate their waiter without provider dispatch',async()=>{
 vi.useFakeTimers();try{
 const calls:string[]=[];const command=async(c:{action:string})=>{calls.push(c.action);return {ok:false,reason:'CONCURRENT_LIMIT'};};
 const pending=waitForAdmission(command,'timeout',{maxWaitMs:50});await vi.advanceTimersByTimeAsync(51);expect(await pending).toEqual({ok:false,reason:'QUEUE_WAIT_EXPIRED'});expect(calls).toEqual(['admit']);
 const abort=new AbortController();const cancelled=waitForAdmission(command,'cancel',{signal:abort.signal});await vi.advanceTimersByTimeAsync(1);abort.abort();expect(await cancelled).toEqual({ok:false,reason:'WAITER_CANCELLED'});expect(calls).toEqual(['admit']);
 // A refusal other than a busy slot ends the wait at once: the caller cancels the attempt.
 const refused=waitForAdmission(async()=>({ok:false,reason:'FENCED'}),'fenced');await vi.advanceTimersByTimeAsync(MARKET_POLL_MS);expect(await refused).toEqual({ok:false,reason:'FENCED'});
 }finally{vi.useRealTimers();}
});
