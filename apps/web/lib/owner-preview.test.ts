import {expect,it} from 'vitest';
import {emptyPlatform,positionSchema,privateGoalSchema,allocationBalance,goalProgress,platformSchema} from './positions';
import {quickAllocateStake,saveAprAssumption,readAprAssumption,watchScope} from './owner-preview';
function fixture(){return {...emptyPlatform(),positions:['b','a'].map(id=>positionSchema.parse({id,providerId:'native-zig',sourceType:'NATIVE_STAKING',network:'zigchain-1',account:'account-a',asset:'ZIG',denom:'uzig',decimals:6,quantity:'200000000000',verification:'VERIFIED_READ_ONLY',sync:'CURRENT',observedAt:new Date().toISOString(),liquidity:'BONDED',provenance:'Fictional test data'})),goals:['1','2'].map(id=>privateGoalSchema.parse({id,name:'300K Goal',network:'zigchain-1',type:'QUANTITY',status:'active',asset:'ZIG',denom:'azig',decimals:18,target:'300000000000000000000000',notes:'',createdAt:new Date().toISOString(),milestones:[]}))};}
it('distributes available stake deterministically, conserves units and is idempotent',()=>{
 const s=fixture();s.allocations=[{goalId:'2',positionId:'a',quantity:'50000000000'}];
 const next=quickAllocateStake(s,'1');
 expect(next.allocations.filter(a=>a.goalId==='1')).toEqual([{goalId:'1',positionId:'a',quantity:'150000000000'},{goalId:'1',positionId:'b',quantity:'150000000000'}]);
 expect(goalProgress(next,'1').progressPct).toBe('100.00');
 expect(quickAllocateStake(next,'1')).toEqual(next);
 expect(next.positions).toEqual(s.positions);expect(next.snapshots).toEqual(s.snapshots);
 for(const p of next.positions){const b=allocationBalance(next,p.id);expect(BigInt(b.allocated)+BigInt(b.unallocated)).toBe(BigInt(p.quantity));}
});
it('caps at available stake and rejects wrong networks, stale stake and reward goals',()=>{
 const s=fixture();s.positions[0]!.quantity='63559957014';s.positions[1]!.quantity='200000000000';
 expect(goalProgress(quickAllocateStake(s,'1'),'1').current).toBe('263559957014000000000000');
 s.positions[0]!.network='zig-test-2';s.positions[1]!.sync='STALE';expect(quickAllocateStake(s,'1').allocations).toEqual([]);
 s.goals[0]!.type='REWARD';expect(()=>quickAllocateStake(s,'1')).toThrow();
});
it('rounds down to source units and never exceeds the remaining target',()=>{
 const s=fixture();s.goals[0]!.target='1000000000001';const next=quickAllocateStake(s,'1');
 expect(next.allocations).toEqual([{goalId:'1',positionId:'a',quantity:'1'}]);expect(goalProgress(next,'1').remaining).toBe('1');
});
it('persists optional APR per network and account, clears it and rejects invalid assumptions',()=>{
 const s=saveAprAssumption(fixture(),'zigchain-1','account-a','7.25');
 const restored=platformSchema.parse(JSON.parse(JSON.stringify(s)));
 expect(readAprAssumption(restored,'zigchain-1','account-a')).toBe('7.25');
 expect(readAprAssumption(restored,'zig-test-2','account-a')).toBe('');expect(readAprAssumption(restored,'zigchain-1','account-b')).toBe('');
 expect(readAprAssumption(saveAprAssumption(restored,'zigchain-1','account-a',''),'zigchain-1','account-a')).toBe('');
 for(const value of ['-1','101','NaN'])expect(()=>saveAprAssumption(s,'zigchain-1','account-a',value)).toThrow();
 expect(()=>saveAprAssumption(s,'zigchain-1','account-b','9')).toThrow();
});
it('never applies a stale scope to another account or network',()=>{
 const s=fixture();expect(watchScope(s,'zigchain-1')).toEqual({network:'zigchain-1',account:'account-a'});
 expect(watchScope({...s,watchScope:{network:'zigchain-1',account:'missing'}},'zigchain-1')).toBeUndefined();
 expect(watchScope(s,'zig-test-2')).toBeUndefined();
 s.positions[0]!.account='account-b';expect(watchScope(s,'zigchain-1')).toBeUndefined();
});
it('subtracts existing higher-precision allocations before rounding remaining source units',()=>{
 const s=fixture();s.goals[0]={...s.goals[0]!,denom:'uzig',decimals:6,target:'1'};
 s.positions=s.positions.map(p=>({...p,denom:'azig',decimals:18,quantity:'2000000000000'}));
 s.allocations=[{goalId:'1',positionId:'a',quantity:'500000000000'}];
 const next=quickAllocateStake(s,'1');expect(next.allocations).toEqual([{goalId:'1',positionId:'a',quantity:'1000000000000'}]);
});
