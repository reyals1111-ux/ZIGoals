import {expect,test} from 'vitest';
import {eligibleWidgetSources,selectableWidgetKinds} from './dashboard-widget-registry';
import {emptyPlatform,positionSchema} from './positions';
import {emptyHabitData} from './habits';
import {createEmptyHealth} from './health';
import type {DashboardSources} from './dashboard-metrics';

const source=():DashboardSources=>({platform:emptyPlatform(),habits:emptyHabitData(),health:createEmptyHealth(),goals:[],quotes:[],now:Date.parse('2026-09-23T12:00:00Z'),today:'2026-09-23',healthDate:'2026-09-23'});
test('entity-dependent source choices require an eligible saved source, not a disabled Save',()=>{
 const s=source(),ready=()=>true;
 expect(selectableWidgetKinds(s,ready)).not.toContain('staking');
 expect(selectableWidgetKinds(s,ready)).toContain('wealth');
 s.platform.positions=[positionSchema.parse({id:'manual',providerId:'Fictional stake label',sourceType:'MANUAL',network:'manual',account:'local',asset:'ZIG',denom:'azig',decimals:18,quantity:'1',verification:'MANUAL',sync:'MANUAL',observedAt:'2026-09-23T12:00:00Z',liquidity:'LIQUID',provenance:'Fictional fixture'})];
 expect(eligibleWidgetSources('staking',s)).toEqual([]);
 s.platform.positions.push(positionSchema.parse({...s.platform.positions[0],id:'verified',providerId:'Verified fixture',sourceType:'NATIVE_STAKING',network:'zigchain-1',verification:'VERIFIED_READ_ONLY'}));
 expect(eligibleWidgetSources('staking',s).map(p=>p.id)).toEqual(['verified']);
});
