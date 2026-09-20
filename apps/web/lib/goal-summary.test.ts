import {describe,it,expect} from 'vitest';
import {applyLocal,initialLedger} from './local-ledger';
import {emptyPlatform,privateGoalSchema} from './positions';
import {unifiedGoalSummaries} from './goal-summary';
const goals=()=>['QUANTITY','VALUE','PROJECT'].map((type,i)=>privateGoalSchema.parse({id:String(i+20),name:`Destination ${i}`,type,status:'completed',asset:type==='VALUE'?'USD':'ZIG',denom:'azig',decimals:type==='VALUE'?2:18,target:'100',notes:'',createdAt:'2026-09-18T00:00:00.000Z',milestones:[]}));
describe('canonical Goal collection',()=>{
 it('exposes all four active destinations across separate stores with stable routes',()=>{
  const ledger=applyLocal(initialLedger(),{kind:'create'},'2026-09-17T00:00:00.000Z');
  const rows=unifiedGoalSummaries(ledger.goals,{}, {...emptyPlatform(),goals:goals()});
  expect(rows).toHaveLength(4);expect(rows.every(g=>g.status==='active')).toBe(true);
  expect(rows.map(g=>g.href)).toEqual(['/app/goals/1','/app/goals/tracked/20','/app/goals/tracked/21','/app/goals/tracked/22']);
  expect(new Set(rows.map(g=>g.key)).size).toBe(4);
 });
 it('keeps closed distinct, reconciles stale completed flags, and does not mutate stores',()=>{
  const data={...emptyPlatform(),goals:goals()};data.goals[1]!.status='closed';const before=JSON.stringify(data);
  const rows=unifiedGoalSummaries([],{},data);expect(rows.map(g=>g.status)).toEqual(['active','closed','active']);expect(JSON.stringify(data)).toBe(before);
 });
 it('never describes a legacy demo valuation as verified market wealth',()=>{
  const ledger=applyLocal(initialLedger(),{kind:'create'},'2026-09-17T00:00:00.000Z');
  const rows=unifiedGoalSummaries(ledger.goals,{},emptyPlatform());
  expect(rows[0]!.source).toBe('Local simulation');expect(rows[0]!.current).toBe('0');
 });
});

it('uses the same exact Value Goal summary regardless of its presentation destination',()=>{
 const now=Date.parse('2026-09-18T00:00:00.000Z');
 const data=emptyPlatform();
 data.positions.push({id:'stake',providerId:'native-zig',sourceType:'NATIVE_STAKING',network:'zigchain-1',account:'fictional',asset:'ZIG',denom:'uzig',decimals:6,quantity:'263000000000',verification:'VERIFIED_READ_ONLY',sync:'CURRENT',liquidity:'BONDED',observedAt:new Date(now).toISOString(),provenance:'Fixture',notes:'',risk:'',executionAuthority:'NONE'});
 data.goals.push(privateGoalSchema.parse({id:'1',name:'Value',type:'VALUE',status:'active',asset:'USD',denom:'USD',decimals:2,target:'50000000',notes:'',createdAt:new Date(now).toISOString(),milestones:[]}));
 data.allocations.push({goalId:'1',positionId:'stake',quantity:'263000000000'});
 const q={base:{network:'zigchain-1',denom:'uzig',decimals:6},currency:'USD',price:'43',priceDecimals:3,source:'CoinGecko',providerAssetId:'zignaly',observedAt:new Date(now).toISOString(),verification:'VERIFIED' as const};
 const summary=unifiedGoalSummaries([],{},data,[q],now)[0]!;
 expect(summary).toMatchObject({current:'11309',target:'500000',progressPct:'2.26',remaining:'488691',status:'active',requiresReview:false});
 expect(unifiedGoalSummaries([],{},data,[{...q,price:'2000'}],now)[0]!.status).toBe('completed');
 expect(data.goals[0]!.status).toBe('active');
});

it('never promotes stale valuation to completed in collection or Today',()=>{
 const now=Date.parse('2026-09-20T12:00:00Z'),data=emptyPlatform();
 data.positions.push({id:'p',providerId:'native-zig',sourceType:'WALLET_LIQUID',network:'zigchain-1',account:'fixture',asset:'ZIG',denom:'uzig',decimals:6,quantity:'1000000000',verification:'VERIFIED_READ_ONLY',sync:'CURRENT',liquidity:'LIQUID',observedAt:new Date(now).toISOString(),provenance:'fixture',notes:'',risk:'',executionAuthority:'NONE'});
 data.goals.push(privateGoalSchema.parse({id:'1',name:'Target',type:'VALUE',status:'active',asset:'USD',denom:'USD',decimals:2,target:'10000',notes:'',createdAt:'2026-09-01T00:00:00Z',milestones:[]}));data.allocations.push({goalId:'1',positionId:'p',quantity:'1000000000'});
 const quote={base:{network:'zigchain-1',denom:'uzig',decimals:6},currency:'USD',price:'1',priceDecimals:0,source:'CoinGecko',providerAssetId:'zignaly',observedAt:'2026-09-19T12:00:00Z',verification:'VERIFIED' as const};
 expect(unifiedGoalSummaries([],{},data,[quote],now)[0]).toMatchObject({status:'active',requiresReview:true,current:'1000'});
});
