import {expect,it} from 'vitest';
import {publicMarketWorkKey,type PublicMarketWork} from './market-coordinator';
const work:PublicMarketWork={operation:'quote',pair:{marketRef:{provider:'coingecko',kind:'coin',id:'bitcoin'},currency:'USD'}};
it('normalizes only public work fields and separates currencies/ranges/kinds',()=>{
 expect(publicMarketWorkKey(work)).toBe('["quote","coingecko","coin","bitcoin","USD"]');
 expect(publicMarketWorkKey({...work,pair:{...work.pair,currency:'EUR'}})).not.toBe(publicMarketWorkKey(work));
 expect(()=>publicMarketWorkKey({...work,wallet:'private'} as PublicMarketWork)).toThrow();
 expect(()=>publicMarketWorkKey({...work,pair:{...work.pair,quantity:'private'}} as PublicMarketWork)).toThrow();
});
it('rejects private fields at compile time as well as runtime',()=>{
 // @ts-expect-error Wallet is not a public coordinator key.
 const privateWork:PublicMarketWork={...work,wallet:'private'};
 expect(()=>publicMarketWorkKey(privateWork)).toThrow();
});
it('one 250-key batch reserves and settles one charged attempt, publishes independently with fences',async()=>{
 const {createProviderAttempt,publishAttemptWork}=await import('./market-coordinator');
 const {emptyBudgetState,reserve,ownDispatch,markDispatched,settle}=await import('./market-budget-policy');
 const {acquireWork,emptyWorkState}=await import('./market-work-fence');
 const state=acquireWork(emptyWorkState<string>(),'owner',1,100,100)!;
 const works=Array.from({length:250},(_,i)=>({work:{operation:'quote' as const,pair:{marketRef:{provider:'coingecko' as const,kind:'coin' as const,id:'coin'+i},currency:'USD' as const}},lease:state.lease!}));
 const attempt=createProviderAttempt({id:'batch',cost:3,kind:'request',priority:'interactive'},works);
 const p={providerMinuteLimit:100,providerMonthlyLimit:10000,operating:{minute:90,monthly:9000},monitoringReserve:{minute:2,monthly:100},monitoringMaximum:{minute:2,monthly:100},optionalCeiling:{minute:70,monthly:7000},concurrent:2,queueLimit:10,reservationMs:100,ownershipMs:50};
 const periods={month:{id:'m',start:0,end:1000}};
 let budget=reserve(emptyBudgetState(),p,periods,attempt.reservation,1).state;
 expect(publishAttemptWork(attempt,budget,works[0]!.work,state,'valid',2,2).ok).toBe(false);
 budget=ownDispatch(budget,p,periods,'batch',2).state;budget=markDispatched(budget,p,periods,'batch',3).state;
 budget=settle(budget,'batch','success',4).state;
 expect(Object.values(budget.reservations)).toHaveLength(1);expect(budget.reservations.batch?.cost).toBe(3);
 expect(settle(budget,'batch','success',5).ok).toBe(false);
 expect(publishAttemptWork(attempt,budget,works[0]!.work,state,'coin0',4,5).state.evidence?.value).toBe('coin0');
 expect(publishAttemptWork(attempt,budget,works[1]!.work,state,'coin1',4,5).state.evidence?.value).toBe('coin1');
 const successor=acquireWork(state,'successor',100,200,200)!;
 expect(publishAttemptWork(attempt,budget,works[0]!.work,successor,'late',4,101).reason).toBe('FENCED');
 expect(publishAttemptWork(attempt,budget,work,state,'unassociated',4,5).ok).toBe(false);
 expect(()=>createProviderAttempt(attempt.reservation,[works[0]!,works[0]!])).toThrow();
});
