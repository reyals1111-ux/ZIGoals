import {z} from 'zod';
import {createVault,unlockVault,sealRecord,openRecord,manifestSchema,envelopeSchema,type RecordContext} from './crypto';
const dataSchema=z.object({finance:z.string().min(1).optional(),habits:z.string().min(1).optional(),health:z.string().min(1).optional(),settings:z.string().min(1).optional()}).strict().refine(v=>Object.keys(v).length>0);
const domainSchema=z.enum(['finance','habits','health','settings']);
const chunkSchema=z.object({id:z.uuid(),domain:domainSchema,envelope:envelopeSchema}).strict();
const backupSchema=z.object({format:z.literal('zigoals-encrypted-backup'),version:z.literal(1),manifest:manifestSchema,index:chunkSchema,chunks:z.array(chunkSchema).min(1).max(700)}).strict();
const inventorySchema=z.object({parts:z.array(z.object({id:z.uuid(),domain:domainSchema}).strict()).min(1).max(700),bytes:z.number().int().min(1).max(32_000_000)}).strict();
const context=(vault:string,object:string,domain:RecordContext['domain']='settings'):RecordContext=>({vault,object,domain,epoch:1,revision:1});
export async function encryptBackup(input:unknown){
 const data=dataSchema.parse(input),raw=JSON.stringify(data),length=new TextEncoder().encode(raw).length;if(length>32_000_000)throw Error('Backup exceeds 32 MB.');
 const vault=await createVault(),chunks:z.infer<typeof chunkSchema>[]=[];
 for(const [domain,source] of Object.entries(data)){
  for(let i=0;i<source.length;i+=48000){const id=crypto.randomUUID(),d=domainSchema.parse(domain);chunks.push({id,domain:d,envelope:await sealRecord(vault.key,context(vault.manifest.vault,id,d),source.slice(i,i+48000))});}
 }
 const id=crypto.randomUUID(),index={id,domain:'settings',envelope:await sealRecord(vault.key,context(vault.manifest.vault,id),{parts:chunks.map(c=>({id:c.id,domain:c.domain})),bytes:length})};
 return {file:JSON.stringify({format:'zigoals-encrypted-backup',version:1,manifest:vault.manifest,index,chunks}),recovery:vault.recovery};
}
export async function decryptBackup(raw:string,recovery:string):Promise<z.infer<typeof dataSchema>>{
 if(new TextEncoder().encode(raw).length>48_000_000)throw Error('Encrypted backup exceeds 48 MB.');
 const file=backupSchema.parse(JSON.parse(raw)),key=await unlockVault(file.manifest,recovery),inventory=inventorySchema.parse(await openRecord(key,context(file.manifest.vault,file.index.id),file.index.envelope));
 if(new Set(inventory.parts.map(p=>p.id)).size!==inventory.parts.length||new Set(file.chunks.map(c=>c.id)).size!==file.chunks.length||file.chunks.length!==inventory.parts.length)throw Error('Backup inventory is incomplete.');
 const data:Record<string,string>={};for(const {id,domain} of inventory.parts){const chunk=file.chunks.find(c=>c.id===id&&c.domain===domain);if(!chunk)throw Error('Backup part is missing.');const value=await openRecord(key,context(file.manifest.vault,id,domain),chunk.envelope);if(typeof value!=='string'||value.length>48000)throw Error('Invalid backup part.');data[domain]=(data[domain]??'')+value;}
 const parsed=dataSchema.parse(data);if(new TextEncoder().encode(JSON.stringify(parsed)).length!==inventory.bytes)throw Error('Backup size differs from authenticated inventory.');return parsed;
}
