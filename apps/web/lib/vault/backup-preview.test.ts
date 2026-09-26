import {test,expect} from 'vitest';
import {summarizeBackupModules} from './backup-preview';
import {createEmptyHealth} from '../health';
import {emptyPlatform,privateGoalSchema} from '../positions';
import {emptyDashboardSettings} from '../dashboard-settings';
test('validated preview counts exact records and UTC dates without copying names or values',()=>{
 const health={...createEmptyHealth(),weights:[{id:'health_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',date:'2025-12-31',grams:70000,createdAt:'2025-12-31T22:30:00Z',updatedAt:'2026-02-02T12:00:00Z'}]},data={health:JSON.stringify(health),settings:JSON.stringify(emptyDashboardSettings())},raw=JSON.stringify(data),rows=summarizeBackupModules(data);
 expect(rows.find(r=>r.domain==='health')).toMatchObject({label:'Health',version:1,counts:expect.arrayContaining([{label:'Weight records',count:1}]),from:'2025-12-31',through:'2026-02-02'});expect(rows.find(r=>r.domain==='settings')).toMatchObject({label:'Today preferences',from:null,through:null});expect(JSON.stringify(data)).toBe(raw);expect(JSON.stringify(rows)).not.toContain('70000');
});
test('unsupported versions refuse inventory and notes resembling dates never fabricate a range',()=>{
 expect(()=>summarizeBackupModules({health:JSON.stringify({...createEmptyHealth(),schemaVersion:999})})).toThrow();
 const goal=privateGoalSchema.parse({id:'811',name:'Do not expose title',type:'VALUE',status:'active',asset:'USD',denom:'USD',decimals:2,target:'100000',notes:'1990-01-01',createdAt:'2026-09-23T12:00:00Z',milestones:[]}),rows=summarizeBackupModules({finance:JSON.stringify({...emptyPlatform(),goals:[goal]})});
 expect(rows[0]).toMatchObject({from:'2026-09-23',through:'2026-09-23',counts:expect.arrayContaining([{label:'Goals',count:1}])});expect(JSON.stringify(rows)).not.toContain('Do not expose title');
});
