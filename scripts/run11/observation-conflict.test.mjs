import 'fake-indexeddb/auto';
import {test,expect} from 'vitest';
import {privateRuntime} from './private-runtime.mjs';
import {createVault} from '../../apps/web/lib/vault/crypto';
import {synchronize,cloudSnapshot,SyncJournal} from '../../apps/web/lib/vault/cloud-sync';
import {validateData} from '../../apps/web/lib/vault/account-data';
import {createEmptyHealth,healthSchema} from '../../apps/web/lib/health';
import {importObservations} from '../../apps/web/lib/observation-import';
import {measurementHistory,measurementGroupFingerprint,saveMeasurement,exportMeasurementsCsv} from '../../apps/web/lib/body-measurements';
const at='2026-09-26T10:00:00.000Z',value={kind:'weight',quantityMilli:80000,unit:'kg',observedAt:at,timezone:'UTC',sourceLabel:'Fictional independent scale'},file={format:'zigoals-observations',version:1,provider:'Fictional export',observations:[{...value,sourceId:'stable-1'}]},wrap=data=>({health:JSON.stringify(data)});
for(const order of ['a-first','b-first'])test(`encrypted independent imports merge to one visible reading with all originals, then correction resyncs (${order})`,async()=>{
 const r=await privateRuntime();try{
  expect((await r.call('/v1/sessions',{action:'register',label:'Observation fixture'})).status).toBe(200);const vault=await createVault();expect((await r.call('/v1/vault',{protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:0,changes:[],manifest:vault.manifest})).status).toBe(200);
  const transport={read:async()=>(await r.call('/v1/vault')).json(),write:async op=>{const response=await r.call('/v1/vault',op);expect(response.status).toBe(200);return response.json();}},a=new SyncJournal(crypto.randomUUID()),b=new SyncJournal(crypto.randomUUID()),empty=createEmptyHealth();
  const sync=async(journal,data)=>{const result=await synchronize(transport,journal,vault.key,vault.manifest,wrap(data),validateData,()=>{});await result.commit();return healthSchema.parse(JSON.parse(result.data.health));};
  await sync(a,empty);await b.write(await a.read());
  const left=importObservations(empty,file,at).data,right=importObservations(empty,file,'2026-09-26T11:00:00.000Z').data;
  const clients={a:{journal:a,data:left},b:{journal:b,data:right}};
  for(const key of order==='a-first'?['a','b']:['b','a'])clients[key].data=await sync(clients[key].journal,clients[key].data);
  const merged=await sync(a,clients.a.data);expect(merged.measurements).toHaveLength(2);expect(measurementHistory(merged,'weight').readings).toHaveLength(1);expect(importObservations(merged,file,at).duplicates).toBe(1);
  const bMerged=await sync(b,clients.b.data);expect(bMerged).toEqual(merged);const group=measurementHistory(merged,'weight').groups[0];
  const corrected=saveMeasurement(merged,{...value,id:group.id,quantityMilli:79000},'2026-09-26T12:00:00.000Z',measurementGroupFingerprint(group));await sync(a,corrected);const result=await sync(b,bMerged);
  expect(measurementHistory(result,'weight').readings.map(r=>r.quantityMilli)).toEqual([79000]);expect(result.measurements).toHaveLength(2);
  for(const original of [...left.measurements,...right.measurements]){const retained=result.measurements.find(r=>r.id===original.id);expect(retained.observationSources).toEqual(original.observationSources);expect(retained.corrections).toContainEqual(expect.objectContaining({recordedAt:original.recordedAt,quantityMilli:80000}));expect(exportMeasurementsCsv(result)).toContain(original.id);}
  expect(healthSchema.parse(JSON.parse((await cloudSnapshot(transport,vault.key,vault.manifest)).data.health))).toEqual(result);const raw=await(await r.call('/v1/vault')).text();expect(raw).not.toContain('Fictional independent scale');expect(raw).not.toContain('stable-1');
 }finally{await r.mf.dispose();}
},30000);
