import {expect,it} from 'vitest';
import {acquireWork,publishWork,followerResult,emptyWorkState} from './market-work-fence';
it.each([[9,true],[10,false],[11,false]])('publication at %s observes exclusive deadline', (now,ok)=>{
 const s=acquireWork(emptyWorkState<string>(),'owner',0,10,20)!;
 const p=publishWork(s,s.lease!,'valid',now,now,true);expect(p.ok).toBe(ok);
 if(!ok)expect(p.reason).toBe('TIMEOUT');
});
it('expired predecessor cannot overwrite successor even with earlier completion time',()=>{
 const first=acquireWork(emptyWorkState<string>(),'old',0,10,10)!;
 const next=acquireWork(first,'new',10,20,20)!;
 expect(next.lease?.fence).toBe(2);expect(next.lease?.generation).toBe(2);
 expect(publishWork(next,first.lease!,'old',9,11,true)).toMatchObject({ok:false,reason:'FENCED'});
 const good=publishWork(next,next.lease!,'new',11,11,true);expect(good.ok).toBe(true);
 expect(good.state.evidence?.value).toBe('new');
});
it('preserves committed partial evidence on later expiry and follower timeout',()=>{
 let s=acquireWork(emptyWorkState<string>(),'owner',0,10,20)!;
 s=publishWork(s,s.lease!,'bitcoin',5,5,false).state;
 expect(followerResult(s,8,7)).toMatchObject({status:'WAITING',evidence:{value:'bitcoin'}});
 expect(followerResult(s,8,8)).toMatchObject({status:'TIMEOUT',degraded:true,evidence:{value:'bitcoin'}});
 expect(publishWork(s,s.lease!,'late',11,11,true)).toMatchObject({ok:false,reason:'TIMEOUT'});
 expect(followerResult(s,20,11)).toMatchObject({status:'TIMEOUT',evidence:{value:'bitcoin'}});
});
it('rejects forged tokens, timestamps, reused owners and clock reversal',()=>{
 const s=acquireWork(emptyWorkState<string>(),'owner',5,10,20)!;
 expect(acquireWork(s,'other',6,10,20)).toBeNull();
 expect(acquireWork(s,'owner',20,30,30)).toBeNull();
 expect(publishWork(s,{...s.lease!,token:'other'},'bad',6,6,true).reason).toBe('FENCED');
 expect(publishWork(s,s.lease!,'bad',4,6,true).ok).toBe(false);
 expect(publishWork(s,s.lease!,'bad',7,6,true).ok).toBe(false);
 expect(publishWork(s,s.lease!,'bad',4,4,true).ok).toBe(false);
});
it('followers may consume evidence committed before expiry without relabeling a successor complete',()=>{
 let s=acquireWork(emptyWorkState<string>(),'a',0,10,10)!;
 s=publishWork(s,s.lease!,'good',5,5,true).state;
 expect(followerResult(s,20,11)).toMatchObject({status:'VERIFIED',degraded:false});
 const next=acquireWork(s,'b',11,20,20)!;
 expect(followerResult(next,20,12)).toMatchObject({status:'WAITING',degraded:true,evidence:{value:'good'}});
});
it('lease expiry can precede the work deadline and never permits late publication',()=>{
 const s=acquireWork(emptyWorkState<string>(),'owner',0,20,10)!;
 expect(publishWork(s,s.lease!,'late',10,10,true).reason).toBe('TIMEOUT');
 expect(acquireWork(s,'next',10,30,30)?.lease?.fence).toBe(2);
});
it.each([8,9])('publication at %s cannot erase an earlier follower deadline',publishedAt=>{
 let s=acquireWork(emptyWorkState<string>(),'owner',0,20,20)!;
 s=publishWork(s,s.lease!,'usable but late',publishedAt,publishedAt,true).state;
 expect(followerResult(s,8,publishedAt)).toMatchObject({status:'TIMEOUT',degraded:true,evidence:{value:'usable but late'}});
});
