import {expect,it} from 'vitest';
import {emptyPlatform,positionSchema,privateGoalSchema,platformSchema,goalProgress} from './positions';
const fixture=(quantity:string)=>({...emptyPlatform(),positions:[positionSchema.parse({id:'stake',providerId:'native-zig',sourceType:'NATIVE_STAKING',network:'zigchain-1',account:'fixture',asset:'ZIG',denom:'uzig',decimals:6,quantity,verification:'VERIFIED_READ_ONLY',sync:'CURRENT',observedAt:new Date().toISOString(),liquidity:'BONDED',provenance:'Test fixture'})],goals:[privateGoalSchema.parse({id:'1',name:'300K Goal',type:'QUANTITY',status:'completed',asset:'ZIG',denom:'azig',decimals:18,target:'300000000000000000000000',notes:'',createdAt:new Date().toISOString(),milestones:[]})],allocations:[{goalId:'1',positionId:'stake',quantity}]});
it.each([['263559957014','active'],['263000000','active'],['300000000000','completed']])('reconciles %s / 300K from counted integer units to %s',(quantity,status)=>{
 const original=fixture(quantity);const next=platformSchema.parse(original);
 expect(next.goals[0]!.status).toBe(status);expect(next.allocations).toEqual(original.allocations);expect(next.positions).toEqual(original.positions);
 expect(original.goals[0]!.status).toBe('completed');
});
it('completes at target and reopens when observations fall; plans do not count',()=>{
 const s=fixture('300000000000');s.goals[0]!.status='active';expect(platformSchema.parse(s).goals[0]!.status).toBe('completed');
 s.positions[0]!.quantity='263000000';s.goals[0]!.plan={amount:'300000000000000000000000',asset:'ZIG',decimals:18,cadence:'monthly',nextDate:'2027-01-01',active:true};
 expect(platformSchema.parse(s).goals[0]!.status).toBe('active');expect(goalProgress(s,'1').current).toBe('263000000000000000000');
});
it('keeps closed distinct and requires all Project milestones',()=>{
 const s=fixture('263000000');s.goals[0]!.status='closed';expect(platformSchema.parse(s).goals[0]!.status).toBe('closed');
 s.allocations=[];s.goals[0]={...s.goals[0]!,type:'PROJECT',status:'completed',milestones:[{id:'m',title:'Ship',done:false}]};
 expect(platformSchema.parse(s).goals[0]!.status).toBe('active');s.goals[0]!.milestones[0]!.done=true;expect(platformSchema.parse(s).goals[0]!.status).toBe('completed');
 s.goals[0]!.milestones=[];expect(platformSchema.parse(s).goals[0]!.status).toBe('active');
});
it.each(['VALUE','REWARD'] as const)('does not trust a saved completed flag for %s',type=>{
 const s=fixture('263000000');s.goals[0]!.type=type;expect(platformSchema.parse(s).goals[0]!.status).toBe('active');
});
