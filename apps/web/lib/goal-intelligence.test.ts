import {describe,it,expect} from 'vitest';
import {emptyPlatform,platformSchema,privateGoalSchema,positionSchema,derivedGoalStatus,assertGoalEditsUnlocked} from './positions';
import * as intelligence from './goal-intelligence';
const now=Date.parse('2026-09-20T12:00:00Z');
const at=new Date(now).toISOString();
const goal=()=>privateGoalSchema.parse({id:'1',name:'Reserve',type:'VALUE',status:'active',asset:'USD',denom:'USD',decimals:2,target:'100000',targetDate:'2026-10-20',notes:'',createdAt:'2026-09-01T00:00:00Z',milestones:[],plan:{amount:'10000',asset:'USD',decimals:2,cadence:'weekly',nextDate:'2026-09-01',active:true}});
const state=()=>({...emptyPlatform(),goals:[goal()],positions:[positionSchema.parse({id:'p',providerId:'manual',sourceType:'MANUAL',network:'manual',account:'local',asset:'BTC',denom:'btc',quantity:'2',decimals:0,verification:'MANUAL',observedAt:at,liquidity:'LIQUID',provenance:'User entry',valuation:{value:'80000',currency:'USD',decimals:2,source:'MANUAL',observedAt:at}})],allocations:[{goalId:'1',positionId:'p',quantity:'2'}]});
const event=(id='e')=>({id,goalId:'1',goalScope:'private' as const,direction:'IN' as const,quantity:'10000',asset:'USD',decimals:2,occurredAt:'2026-09-02T12:00:00Z',provenance:'MANUAL_ATTRIBUTION' as const});
describe('Run 9 accounting',()=>{
 it('migrates v1 deterministically, rejects missing v2 arrays and future versions',()=>{
  const old={schemaVersion:1,kind:'zigoals-platform',positions:[],goals:[],allocations:[],snapshots:[]};
  expect(platformSchema.parse(old)).toMatchObject({schemaVersion:3,contributions:[],valuationSnapshots:[],goalHistory:[]});
  expect(old.schemaVersion).toBe(1);
  expect(platformSchema.safeParse({...old,schemaVersion:2}).success).toBe(false);
  expect(platformSchema.safeParse({...old,schemaVersion:3}).success).toBe(false);
 });
 it('separates market value, observed units, income and explicit contribution facts',()=>{
  const s=intelligence.appendContribution(state(),event());
  const income=intelligence.appendContribution(s,{...event('income'),quantity:'2000',provenance:'REWARD_INCOME'});
  expect(intelligence.contributionTotals(income,'1',now)).toMatchObject({net:'10000',rewardIncome:'2000'});
  expect(intelligence.fundingHealth(income,'1',now)).toMatchObject({current:'80000',actual:'10000',plannedThroughToday:'30000',variance:'-20000',remaining:'20000'});
  expect(income.positions).toEqual(s.positions);
 });
 it('reverses exactly, preserves facts, rejects double/nested reversal and deduplicates transactions',()=>{
  const input={...event(),transactionRef:'local:tx1'};
  const s=intelligence.appendContribution(state(),input);
  expect(intelligence.appendContribution(s,{...input,id:'duplicate'})).toBe(s);
  expect(()=>intelligence.appendContribution(s,{...input,id:'different',quantity:'20000'})).toThrow(/conflict/i);
  const corrected=intelligence.reverseContribution(s,'e','reverse',at);
  expect(corrected.contributions[0]).toEqual(s.contributions[0]);
  expect(intelligence.contributionTotals(corrected,'1',now).net).toBe('0');
  expect(()=>intelligence.reverseContribution(corrected,'e','again',at)).toThrow();
  expect(()=>intelligence.reverseContribution(corrected,'reverse','nested',at)).toThrow();
 });
 it('isolates Local Demo goal references from colliding private goal ids',()=>{
  const s=intelligence.appendContribution(state(),{...event(),goalScope:'local'});
  expect(intelligence.contributionTotals(s,'1',now).net).toBe('0');
  expect(s.contributions[0]?.goalScope).toBe('local');
 });
 it('guards locked goals in both mutation helpers and stale store writes',()=>{
  const s=state();s.goals[0]!.locked=true;
  expect(()=>intelligence.appendContribution(s,event())).toThrow(/Unlock/);
  expect(()=>assertGoalEditsUnlocked(s,{...s,contributions:[{...event()}]})).toThrow(/Unlock/);
 });
 it('rejects forged reversal accounting on import',()=>{
  const s=intelligence.appendContribution(state(),event());
  expect(platformSchema.safeParse({...s,contributions:[...s.contributions,{...event('bad'),direction:'OUT',quantity:'1',reversesId:'e'}]}).success).toBe(false);
 });
 it('does not infer historical payment matching from increasing value',()=>{
  const h=intelligence.fundingHealth(state(),'1',now);
  expect(h).toMatchObject({actual:'0',overdue:true,nextDate:'2026-09-22',requiredRecurring:'4000'});
 });
 it('captures evidenced history once per day without render/cache-hit writes',()=>{
  const s=state(),next=intelligence.captureValuations(s,[],now);
  expect(next.valuationSnapshots).toHaveLength(1);
  expect(next.goalHistory).toHaveLength(1);
  expect(next.goalHistory[0]).toMatchObject({kind:'valuation',current:'80000',actualContributed:'0'});
  expect(intelligence.captureValuations(next,[],now+1000)).toBe(next);
  expect(next.contributions).toEqual([]);
  expect(intelligence.goalTimeline(next,'1').filter(e=>e.kind==='valuation')).toHaveLength(1);
 });
 it('retains more than the old 240 observations and all financial events',()=>{
  let s=intelligence.appendContribution(state(),event());
  for(let day=0;day<400;day++) {s.positions[0]!.valuation!.value=String(80000+day);s=intelligence.captureValuations(s,[],now+day*86400000);}
  expect(s.valuationSnapshots).toHaveLength(400);
  expect(s.goalHistory).toHaveLength(400);
  expect(s.contributions).toHaveLength(1);
  expect(new TextEncoder().encode(JSON.stringify(s)).byteLength).toBeLessThan(1000000);
 });
 it('does not newly complete Goals from stale verified evidence',()=>{
  const s=state();s.positions[0]!.valuation={...s.positions[0]!.valuation!,value:'200000',source:'VERIFIED',observedAt:'2020-01-01T00:00:00Z'};
  expect(derivedGoalStatus(s,'1',now)).toBe('active');
 });
});
it('retains embedded quote/value evidence when standalone snapshots compact away',()=>{
 const s=intelligence.captureValuations(state(),[],now);
 const h=s.goalHistory.find(h=>h.kind==='valuation');
 expect(h?.kind==='valuation'&&h.evidence[0]?.valuation).toMatchObject({value:'80000',currency:'USD',source:'MANUAL'});
});
it('retains broad portfolio history above the old pruning budget',()=>{
 let s=intelligence.appendContribution(state(),event());
 s.positions=Array.from({length:100},(_,i)=>({...s.positions[0]!,id:`p${i}`}));
 s.goals=Array.from({length:20},(_,i)=>({...s.goals[0]!,id:String(i+1)}));
 s.allocations=s.goals.flatMap(g=>s.positions.map(p=>({goalId:g.id,positionId:p.id,quantity:'1'})));
 for(let day=0;day<3;day++){s.positions[0]!.valuation!.value=String(80000+day);s=intelligence.captureValuations(s,[],now+day*86400000);}
 expect(new TextEncoder().encode(JSON.stringify({v:s.valuationSnapshots,g:s.goalHistory})).byteLength).toBeGreaterThan(700000);
 expect(s.valuationSnapshots).toHaveLength(300);expect(s.goalHistory).toHaveLength(60);
 expect(s.contributions).toHaveLength(1);
}, 15_000);
it('rejects direct rewriting/removing immutable contribution facts',()=>{
 const s=intelligence.appendContribution(state(),event());
 expect(()=>assertGoalEditsUnlocked(s,{...s,contributions:[]})).toThrow(/append-only/);
});
it('locks colliding Local Demo events independently',()=>{
 const s={...state(),legacyGoalUi:{'1':{locked:true}}};
 expect(()=>assertGoalEditsUnlocked(s,{...s,contributions:[{...event(),goalScope:'local'}]})).toThrow(/Unlock/);
});
it('derives exact contemporaneous currency contribution values beyond safe Number precision',()=>{
 const e={...event(),asset:'BTC',quantity:'9007199254740993',decimals:0,valueAtEvent:{value:'123456789012345678901',decimals:2,currency:'USD',source:'MANUAL' as const}};
 const s=intelligence.appendContribution(state(),e);
 expect(intelligence.contributionTotals(s,'1',now).net).toBe('123456789012345678901');
});
it('keeps overdue actual pace visible despite forecast wealth reaching target',()=>{
 expect(intelligence.fundingHealth(state(),'1',now).status).toBe('BEHIND');
 const s=intelligence.appendContribution(state(),{...event(),quantity:'40000'});
 expect(intelligence.fundingHealth(s,'1',now).status).toBe('AHEAD');
});
it('shows a payment scheduled today without guessing it is paid',()=>{
 const s=state();s.goals[0]!.plan!.nextDate='2026-09-20';
 expect(intelligence.fundingHealth(s,'1',now).nextDate).toBe('2026-09-20');
});
it('can total Local Demo ZIG events without joining private goal ids',()=>{
 const s=intelligence.appendContribution(state(),{...event(),goalScope:'local',asset:'ZIG',decimals:18,quantity:'1000000000000000000'});
 expect(intelligence.contributionTotals(s,'1',now,'local').net).toBe('1000000000000000000');
});
it('does not record missing valuation as an evidenced zero history',()=>{
 const s=state();s.positions[0]!.valuation=undefined;
 expect(intelligence.captureValuations(s,[],now)).toBe(s);
});
it('uses manual same-currency decimal evidence without requiring matching display precision',()=>{
 const s=state();s.positions[0]!.valuation={value:'800000000',currency:'USD',decimals:6,source:'MANUAL',observedAt:at};
 expect(intelligence.fundingHealth(s,'1',now).current).toBe('80000');
});
it('writes Goal currency quote evidence rather than a different position display currency',()=>{
 const s=state();s.positions[0]!.valuation=undefined;s.positions[0]!.marketRef={provider:'coingecko',kind:'coin',id:'bitcoin'};s.positions[0]!.quoteCurrency='USD';
 s.goals[0]!.asset='EUR';s.goals[0]!.denom='EUR';
 const quotes=[{base:{network:'manual',denom:'btc',decimals:0},marketRef:{provider:'coingecko' as const,kind:'coin' as const,id:'bitcoin'},currency:'EUR',price:'50000',priceDecimals:2,source:'CoinGecko',providerAssetId:'bitcoin',observedAt:at,fetchedAt:at,verification:'VERIFIED' as const}];
 const h=intelligence.captureValuations(s,quotes,now).goalHistory.find(h=>h.kind==='valuation');
 expect(h?.kind==='valuation'&&h.evidence[0]?.valuation).toMatchObject({currency:'EUR',price:'50000'});
});
it('does not duplicate unchanged quote/quantity evidence on a later day',()=>{
 const s=intelligence.captureValuations(state(),[],now);
 expect(intelligence.captureValuations(s,[],now+86400000)).toBe(s);
});
it('derives plan/allocation/milestone changes once at the mutation boundary',()=>{
 const before=state(),after={...before,goals:[{...before.goals[0]!,plan:{...before.goals[0]!.plan!,active:false}}]};
 const recorded=intelligence.recordGoalChanges(before,after,now);
 expect(intelligence.goalTimeline(recorded,'1').filter(e=>e.kind==='plan')).toMatchObject([{label:'Contribution plan paused',provenance:'LOCAL_EDIT'}]);
 expect(intelligence.recordGoalChanges(recorded,recorded,now)).toBe(recorded);
});
it('accepts same-instant reversal timestamps with equivalent fractional formatting',()=>{
 const s=intelligence.appendContribution(state(),event());
 expect(()=>intelligence.reverseContribution(s,'e','same','2026-09-02T12:00:00.000Z')).not.toThrow();
});
it('retains canonical native asset identity in snapshots from legacy verified quotes',()=>{
 const s=state();s.positions[0]={...s.positions[0]!,network:'zigchain-1',asset:'ZIG',denom:'uzig',decimals:6,quantity:'1000000',valuation:undefined};
 s.allocations[0]!.quantity='1000000';
 const q={base:{network:'zigchain-1',denom:'uzig',decimals:6},currency:'USD',price:'1',priceDecimals:2,source:'CoinGecko',providerAssetId:'zignaly',observedAt:at,verification:'VERIFIED' as const};
 expect(intelligence.captureValuations(s,[q],now).valuationSnapshots[0]?.marketRef).toMatchObject({provider:'coingecko',kind:'coin',id:'zignaly'});
});
it('honors the actual scoped Local Demo lock key while admitting already-confirmed receipt evidence',()=>{
 const s={...state(),legacyGoalUi:{'local-simulation:local-demo-user:1':{locked:true}}};
 const manual={...event(),goalScope:'local' as const};
 expect(()=>intelligence.appendContribution(s,manual)).toThrow(/Unlock/);
 expect(()=>assertGoalEditsUnlocked(s,{...s,contributions:[manual]})).toThrow(/Unlock/);
 const confirmed={...manual,provenance:'LOCAL_CONFIRMED' as const,transactionRef:'local:receipt:1'};
 const after=intelligence.appendContribution(s,confirmed);
 expect(()=>assertGoalEditsUnlocked(s,after)).not.toThrow();
});
it('does not move already-completed Goal projection to tomorrow',()=>{
 const s=state();s.positions[0]!.valuation!.value='100000';
 expect(intelligence.fundingHealth(s,'1',now)).toMatchObject({status:'COMPLETED',completionDate:'2026-09-20'});
});

it('refuses a full history append without deleting any accepted observation',()=>{
 const source=state();source.goalHistory=Array.from({length:50000},(_,i)=>({id:`retained-${i}`,goalId:'1',kind:'plan' as const,capturedAt:at,label:'Retained',provenance:'LOCAL_EDIT' as const}));
 const changed={...source,goals:source.goals.map(g=>({...g,plan:{...g.plan!,amount:'20000'}}))};
 expect(()=>intelligence.recordGoalChanges(source,changed,now+1000)).toThrow(/capacity|export/i);expect(source.goalHistory).toHaveLength(50000);expect(source.goalHistory[0]!.id).toBe('retained-0');
});

it('retained timeline pages all events in actual instant order with UTC date and kind filters',()=>{
 const rows=Array.from({length:35},(_,i)=>({id:String(i),goalId:'1',at:new Date(Date.UTC(2026,8,1+i)).toISOString(),kind:i%2?'contribution':'valuation',label:'Evidence',provenance:'MANUAL'}));
 expect(intelligence.pageGoalTimeline(rows,{page:2}).events.map(e=>e.id)).toEqual(['10','9','8','7','6','5','4','3','2','1','0']);
 expect(intelligence.pageGoalTimeline(rows,{page:99,kind:'contribution',from:'2026-09-10',to:'2026-09-20'})).toMatchObject({page:0,total:6});
 const offsets=[{...rows[0]!,id:'later',at:'2026-09-01T01:30:00+02:00'},{...rows[0]!,id:'earlier',at:'2026-08-31T22:30:00Z'}];
 expect(intelligence.pageGoalTimeline(offsets,{page:0}).events.map(e=>e.id)).toEqual(['later','earlier']);
});
it('cumulative contribution evidence aggregates once with exact integers and excludes future or incompatible facts',()=>{
 const s={...state(),contributions:[event('a'),{...event('b'),direction:'OUT' as const,quantity:'500'},{...event('income'),provenance:'REWARD_INCOME' as const,quantity:'200'},{...event('future'),occurredAt:'2027-01-01T00:00:00Z'}]};
 expect(intelligence.contributionEvidenceSeries(s,'1',now)).toEqual({actual:[{at:'2026-09-02T12:00:00.000Z',value:'9500'}],income:[{at:'2026-09-02T12:00:00.000Z',value:'200'}]});
});
