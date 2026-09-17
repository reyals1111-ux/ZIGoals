import type { Platform } from './positions';
import { describe, expect, it } from 'vitest';
import { emptyPlatform, platformSchema, positionSchema, allocationBalance, allocate, closeGoal, goalProgress, stakingProjection, planScenario, saveManualPosition, scenarioHorizon, allocatedNativePrincipal } from './positions';
const p = () => positionSchema.parse({ id: 'p', providerId: 'manual', sourceType: 'MANUAL', network: 'manual', account: 'local', asset: 'ZIG', denom: 'azig', quantity: '100', decimals: 0, verification: 'MANUAL', observedAt: '2026-09-17T00:00:00Z', liquidity: 'LIQUID', provenance: 'User entry' });
const g = (id = '1') => ({ id, network:'zigchain-1' as const, name: 'Example', type: 'QUANTITY' as const, status: 'active' as const, asset: 'ZIG', denom: 'azig', decimals: 0, target: '100', notes: '', milestones: [], createdAt: '2026-09-17T00:00:00Z' });
const state = (): Platform => ({ ...emptyPlatform(), positions: [p()], goals: [g(), g('2')] });
describe('exact Position accounting', () => {
 it('rejects fractional, negative, oversized and numeric chain quantities', () => { for (const quantity of ['1.2','-1','1e10',1,'1'.repeat(100)]) expect(positionSchema.safeParse({...p(),quantity}).success).toBe(false); });
 it('fails closed on unknown versions, duplicate IDs and dangling allocations', () => {
  expect(platformSchema.safeParse({...emptyPlatform(),schemaVersion:2}).success).toBe(false);
  expect(platformSchema.safeParse({...state(),positions:[p(),p()]}).success).toBe(false);
  expect(platformSchema.safeParse({...state(),allocations:[{goalId:'404',positionId:'p',quantity:'1'}]}).success).toBe(false);
 });
 it('conserves units across allocation edits and multiple Goals (generated cases)', () => {
  for(let observed=1;observed<=100;observed++) for(let first=0;first<=observed;first+=7) {
   let s=state(); s.positions[0]!.quantity=String(observed);
   s=allocate(s,'1','p',String(first));s=allocate(s,'2','p',String(observed-first));
   const b=allocationBalance(s,'p'); expect(BigInt(b.allocated)+BigInt(b.unallocated)).toBe(BigInt(observed));
   expect(()=>allocate(s,'1','p',String(first+1))).toThrow();
   s=allocate(s,'1','p','0');expect(allocationBalance(s,'p').unallocated).toBe(String(first));
  }
 });
 it('releases closed Goal units and flags external deficits without rewriting intent', () => {
  const s=allocate(state(),'1','p','90');s.positions[0]!.quantity='70';
  expect(allocationBalance(s,'p')).toMatchObject({allocated:'90',unallocated:'0',deficit:'20'});
  expect(goalProgress(s,'1')).toMatchObject({current:'70',intended:'90',requiresReview:true});
  expect(allocationBalance(closeGoal(s,'1'),'p')).toMatchObject({allocated:'0',unallocated:'70'});
 });
 it('does not count the same observed units twice during deficits', () => {
  const s=allocate(allocate(state(),'1','p','50'),'2','p','50');s.positions[0]!.quantity='61';
  expect(BigInt(goalProgress(s,'1').current)+BigInt(goalProgress(s,'2').current)).toBeLessThanOrEqual(61n);
 });
 it('keeps manual and verified progress separate; ignores price for quantity Goals', () => {
  const s=allocate(state(),'1','p','80');s.positions[0]!.valuation={value:'80000',currency:'USD',decimals:2,source:'MANUAL',observedAt:'2026-09-17T00:00:00Z'};
  expect(goalProgress(s,'1')).toMatchObject({current:'80',manual:'80',verified:'0',progressPct:'80.00'});
 });
 it('calculates value pro rata and refuses missing currency valuations', () => {
  const s=allocate(state(),'1','p','50');s.goals[0]={...g(),type:'VALUE',asset:'USD',denom:'USD',decimals:2,target:'10000'} as typeof s.goals[0];
  expect(goalProgress(s,'1').requiresReview).toBe(true);
  s.positions[0]!.valuation={value:'16000',currency:'USD',decimals:2,source:'MANUAL',observedAt:'2026-09-17T00:00:00Z'};
  expect(goalProgress(s,'1').current).toBe('8000');
 });
 it('simple APR projects exact rewards and never changes principal', () => {
  expect(stakingProjection('100000000000000000000','10',365)).toBe('10000000000000000000');
  expect(stakingProjection('1000','10',7)).toBe('1');
  expect(()=>stakingProjection('1000','-1',30)).toThrow();
 });
 it('requires a fiat price assumption and clamps monthly dates without drift', () => {
  const plan={amount:'10000',asset:'USD',decimals:2,cadence:'monthly' as const,nextDate:'2026-01-31',active:true};
  expect(()=>planScenario(g(), '0',plan,'2026-03-31')).toThrow();
  expect(planScenario(g(),'0',{...plan,price:{value:'200',decimals:2,currency:'USD'}},'2026-03-31')).toMatchObject({contributions:'150',dates:['2026-01-31','2026-02-28','2026-03-31']});
 });
});
it('normalizes verified native uzig into a ZIG Goal without rounding away units',()=>{
 const s=state();s.positions[0]=positionSchema.parse({...p(),id:'mainnet',sourceType:'WALLET_LIQUID',verification:'VERIFIED_READ_ONLY',network:'zigchain-1',denom:'uzig',decimals:6,quantity:'1500000'});
 s.goals[0]={...g(),decimals:18,target:'2000000000000000000'};
 const next=allocate(s,'1','mainnet','1000000');expect(goalProgress(next,'1').current).toBe('1000000000000000000');
});
it('never mixes testnet observations into a mainnet Goal',()=>{
 const s=state();s.positions[0]={...p(),network:'zig-test-2',sourceType:'WALLET_LIQUID',verification:'VERIFIED_READ_ONLY'};
 expect(()=>allocate(s,'1','p','1')).toThrow(/network/i);
});
it('projections exclude missed planned dates and expose a completion date without altering facts',()=>{
 const plan={amount:'20',asset:'ZIG',decimals:0,cadence:'monthly' as const,nextDate:'2026-01-31',active:true};
 expect(planScenario(g(),'50',plan,'2026-05-31','2026-03-01')).toMatchObject({contributions:'60',dates:['2026-03-31','2026-04-30','2026-05-31'],completionDate:'2026-05-31'});
});

it('excludes research-only valuations from all observed and verified progress',()=>{
 const s=state();s.positions[0]={...p(),sourceType:'VAULT',verification:'RESEARCH_ONLY',valuation:{value:'10000',currency:'USD',decimals:2,source:'VERIFIED',observedAt:'2026-09-17T00:00:00Z'}};
 s.goals[0]={...g(),type:'VALUE',asset:'USD',denom:'USD',decimals:2};
 expect(goalProgress(allocate(s,'1','p','100'),'1')).toMatchObject({current:'0',verified:'0',requiresReview:true});
});
it('ages verified snapshots without changing historical quantities or allocation intent',()=>{
 const s=allocate(state(),'1','p','80');s.positions[0]={...p(),sourceType:'WALLET_LIQUID',verification:'VERIFIED_READ_ONLY',sync:'CURRENT'};
 expect(goalProgress(s,'1',Date.parse('2026-09-17T00:10:00Z'))).toMatchObject({current:'80',requiresReview:false});
 expect(goalProgress(s,'1',Date.parse('2026-09-17T00:16:00Z'))).toMatchObject({current:'80',requiresReview:true});
 expect(s.positions[0].quantity).toBe('100');expect(s.allocations[0]?.quantity).toBe('80');
});
it('ages verified valuations independently of the position observation',()=>{
 const s=allocate(state(),'1','p','100');s.goals[0]={...g(),type:'VALUE',asset:'USD',denom:'USD',decimals:2};
 s.positions[0]!.valuation={value:'10000',currency:'USD',decimals:2,source:'VERIFIED',observedAt:'2020-01-01T00:00:00Z'};
 expect(goalProgress(s,'1',Date.parse('2026-09-17T00:01:00Z'))).toMatchObject({current:'10000',requiresReview:true});
});
it('manual edits cannot reinterpret existing allocation or snapshot units',()=>{
 const s=allocate(state(),'1','p','80');s.snapshots=[{positionId:'p',quantity:'100',observedAt:p().observedAt}];
 for(const change of [{asset:'BTC'},{denom:'other'},{decimals:18}])expect(()=>saveManualPosition(s,{...p(),...change})).toThrow(/identity/i);
 const next=saveManualPosition(s,{...p(),quantity:'90',observedAt:'2026-09-18T00:00:00Z'});
 expect(next.allocations).toEqual(s.allocations);expect(next.snapshots[0]).toEqual(s.snapshots[0]);expect(next.positions[0]?.decimals).toBe(0);
});

it('uses one calendar-year horizon with leap-day clamping and honors explicit deadlines',()=>{
 expect(scenarioHorizon('2026-09-17')).toBe('2027-09-17');
 expect(scenarioHorizon('2028-02-29')).toBe('2029-02-28');
 expect(scenarioHorizon('2026-09-17','2030-01-31')).toBe('2030-01-31');
});
it('projects a complete thirty-year weekly plan instead of silently truncating it',()=>{
 const plan={amount:'10',asset:'ZIG',decimals:0,cadence:'weekly' as const,nextDate:'2026-09-17',active:true};
 const result=planScenario({...g(),target:'15000'},'0',plan,'2056-09-17','2026-09-17');
 expect(result.dates).toHaveLength(1566);expect(result).toMatchObject({contributions:'15660',fundingHealth:'ON_TRACK'});
 expect(()=>planScenario(g(),'0',plan,'9999-12-31','2026-09-17')).toThrow(/horizon/i);
});
it('staking scenarios exclude foreign-network and research-only evidence and preserve exact deficit shares',()=>{
 const s=state();s.goals[0]={...g(),decimals:18,target:'100000000000000000000'};
 s.positions[0]={...p(),network:'zigchain-1',sourceType:'NATIVE_STAKING',verification:'VERIFIED_READ_ONLY',denom:'uzig',decimals:6,quantity:'100000000'};
 const allocated=allocate(s,'1','p','80000000');expect(allocatedNativePrincipal(allocated,'1')).toBe('80000000000000000000');
 allocated.positions[0]!.network='zig-test-2';expect(allocatedNativePrincipal(allocated,'1')).toBe('0');
 allocated.positions[0]!.network='zigchain-1';allocated.positions[0]!.verification='RESEARCH_ONLY';expect(allocatedNativePrincipal(allocated,'1')).toBe('0');
 allocated.positions[0]!.verification='VERIFIED_READ_ONLY';allocated.positions[0]!.quantity='40000000';expect(allocatedNativePrincipal(allocated,'1')).toBe('40000000000000000000');
});

it('rejects validator commission above one without rounding decimal evidence',()=>{
 const validator={address:'validator',name:'Example',status:'bonded',votingTokens:'100',commission:'1.5'};
 expect(positionSchema.safeParse({...p(),validator}).success).toBe(false);
 expect(positionSchema.safeParse({...p(),validator:{...validator,commission:'1.000000000000000000'}}).success).toBe(true);
 expect(positionSchema.safeParse({...p(),validator:{...validator,commission:'0.999999999999999999'}}).success).toBe(true);
});
