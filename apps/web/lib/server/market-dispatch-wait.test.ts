import {test,expect,vi} from 'vitest';
import {waitForMarketDispatch} from './market-dispatch-wait';
test('waiting owns no dispatch slot and retries only ownership using its original reservation',async()=>{
 const calls:string[]=[];let tries=0;
 const result=await waitForMarketDispatch(async c=>{calls.push(c.action);return c.action==='own'&&tries++<2?{ok:false,reason:tries===1?'CONCURRENT_LIMIT':'QUEUE_WAIT'}:{ok:true};},'fixed',{maxWaitMs:1000});
 expect(result).toEqual({ok:true});expect(calls).toEqual(['reserve','own','own','own','dispatch']);
});
test('deadline and caller cancellation terminate their waiter without provider dispatch',async()=>{
 vi.useFakeTimers();try{
 const calls:string[]=[];const command=async(c:{action:string})=>{calls.push(c.action);return c.action==='own'?{ok:false,reason:'CONCURRENT_LIMIT'}:{ok:true};};
 const pending=waitForMarketDispatch(command,'timeout',{maxWaitMs:50});await vi.advanceTimersByTimeAsync(51);expect(await pending).toEqual({ok:false,reason:'QUEUE_WAIT_EXPIRED'});expect(calls).not.toContain('dispatch');
 const abort=new AbortController();const cancelled=waitForMarketDispatch(command,'cancel',{signal:abort.signal});await vi.advanceTimersByTimeAsync(1);abort.abort();expect(await cancelled).toEqual({ok:false,reason:'WAITER_CANCELLED'});expect(calls).not.toContain('dispatch');
 }finally{vi.useRealTimers();}
});
