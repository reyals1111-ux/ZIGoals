import {expect,test} from 'vitest';
import {manualSourcePosition} from './manual-source';
import {emptyPlatform,privateGoalSchema,positionSchema,type Position} from './positions';
import {createAllocatedGoal} from './wealth';
import {fundingHealth} from './goal-intelligence';

// Manual stocks, property and custom assets have UNKNOWN liquidity. Honesty rule: unknown is
// never reported as a fact, so they must not trigger "not liquid"; bonded or locked wealth must.
const now=Date.parse('2026-10-01T12:00:00.000Z'),observed='2026-10-01T10:00:00.000Z';
const goal=privateGoalSchema.parse({id:'71',name:'Fictional house deposit',type:'VALUE',status:'active',asset:'EUR',denom:'EUR',decimals:2,target:'4000000',notes:'Fictional',createdAt:observed,milestones:[]});
const cash=manualSourcePosition({category:'Cash',name:'Fictional savings',quantity:'5000',currency:'EUR'},'cash',observed);
const etf=manualSourcePosition({category:'Stocks',name:'Fictional world ETF',symbol:'ETF',quantity:'10',currency:'EUR',value:'11400'},'etf',observed);
const warnings=(positions:Position[])=>fundingHealth(createAllocatedGoal({...emptyPlatform(),positions},goal,positions.map(p=>({positionId:p.id,quantity:p.quantity}))),goal.id,now).warnings;

test('cash only: no liquidity warning',()=>{
 expect(warnings([cash]).join(' ')).not.toMatch(/liquid/i);
});
test('a manual stock of unknown liquidity is reported as unknown, not as "not liquid"',()=>{
 expect(etf.liquidity).toBe('UNKNOWN');
 const w=warnings([cash,etf]);
 expect(w).not.toContain('Some allocated wealth is not liquid.');
 expect(w).toContain('The liquidity of some allocated wealth is unknown.');
});
test('bonded wealth is still reported as not liquid',()=>{
 const bonded=positionSchema.parse({...cash,id:'bonded',providerId:'Fictional bonded',liquidity:'BONDED'});
 expect(warnings([cash,bonded])).toContain('Some allocated wealth is not liquid.');
});
