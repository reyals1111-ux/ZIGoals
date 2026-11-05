import * as z from 'zod';
import {createVault,unlockVault,sealRecord,openRecord,manifestSchema,envelopeSchema,type RecordContext} from './crypto';
// Format 2 adds one optional section, `simulation` (legacy Local simulation Goals). Files without it stay
// format 1, byte-compatible with older apps; older apps refuse a format 2 file before restoring anything.
// Session AL (P-LS-36; TIER 3 (stored format), additive): format 3 adds two optional sections, `tasks` and `checklist`
// (lib/vault/backup-lists.ts). A file holds them only when this device has Tasks or a Checklist; without them it stays
// format 1 or 2, byte-compatible as before. Older apps refuse a format 3 file ("a newer app version made it") before
// restoring anything.
// Session AL (third pass, INT; TIER 3 (stored format), additive): format 4 adds four optional sections of the person's
// other device records (lib/vault/backup-records.ts: accounts, the journal, the money log, notes, workouts, …). A file
// holds them only when this device has such records; without them it stays format 1, 2 or 3 as before. Older apps
// refuse a format 4 file with the same "newer app version" message before restoring anything.
const dataSchema=z.object({finance:z.string().min(1).optional(),habits:z.string().min(1).optional(),health:z.string().min(1).optional(),settings:z.string().min(1).optional(),simulation:z.string().min(1).optional(),tasks:z.string().min(1).optional(),checklist:z.string().min(1).optional(),wealthRecords:z.string().min(1).optional(),habitRecords:z.string().min(1).optional(),lifeRecords:z.string().min(1).optional(),healthRecords:z.string().min(1).optional()}).strict().refine(v=>Object.keys(v).length>0);
const domainSchema=z.enum(['finance','habits','health','settings','simulation','tasks','checklist','wealthRecords','habitRecords','lifeRecords','healthRecords']);
/** The format a set of sections is written in, and must be read in: 4 with other device records, 3 with Tasks or the Checklist, 2 with simulation, else 1. */
export function backupFormatVersion(sections:Iterable<string>):1|2|3|4{const s=new Set(sections);return ['wealthRecords','habitRecords','lifeRecords','healthRecords'].some(k=>s.has(k))?4:s.has('tasks')||s.has('checklist')?3:s.has('simulation')?2:1;}
const chunkSchema=z.object({id:z.uuid(),domain:domainSchema,envelope:envelopeSchema}).strict();
const backupSchema=z.object({format:z.literal('zigoals-encrypted-backup'),version:z.union([z.literal(1),z.literal(2),z.literal(3),z.literal(4)]),manifest:manifestSchema,index:chunkSchema,chunks:z.array(chunkSchema).min(1).max(700)}).strict();
const inventorySchema=z.object({parts:z.array(z.object({id:z.uuid(),domain:domainSchema}).strict()).min(1).max(700),bytes:z.number().int().min(1).max(32_000_000)}).strict();
// Simulation parts are sealed under the finance record context, Tasks, Checklist and device-record parts under the extras
// one (Health's device records under health); the authenticated inventory binds each part's section.
const sealedAs=(domain:z.infer<typeof domainSchema>):RecordContext['domain']=>domain==='simulation'?'finance':domain==='healthRecords'?'health':domain==='tasks'||domain==='checklist'||domain==='wealthRecords'||domain==='habitRecords'||domain==='lifeRecords'?'extras':domain;
const context=(vault:string,object:string,domain:z.infer<typeof domainSchema>='settings'):RecordContext=>({vault,object,domain:sealedAs(domain),epoch:1,revision:1});
export async function encryptBackup(input:unknown){
 const data=dataSchema.parse(input),raw=JSON.stringify(data),length=new TextEncoder().encode(raw).length;if(length>32_000_000)throw Error('Backup exceeds 32 MB.');
 const vault=await createVault(),chunks:z.infer<typeof chunkSchema>[]=[];
 for(const [domain,source] of Object.entries(data)){
  for(let i=0;i<source.length;i+=48000){const id=crypto.randomUUID(),d=domainSchema.parse(domain);chunks.push({id,domain:d,envelope:await sealRecord(vault.key,context(vault.manifest.vault,id,d),source.slice(i,i+48000))});}
 }
 const id=crypto.randomUUID(),index={id,domain:'settings',envelope:await sealRecord(vault.key,context(vault.manifest.vault,id),{parts:chunks.map(c=>({id:c.id,domain:c.domain})),bytes:length})};
 return {file:JSON.stringify({format:'zigoals-encrypted-backup',version:backupFormatVersion(Object.keys(data)),manifest:vault.manifest,index,chunks}),recovery:vault.recovery};
}
export async function decryptBackup(raw:string,recovery:string):Promise<z.infer<typeof dataSchema>>{
 if(new TextEncoder().encode(raw).length>48_000_000)throw Error('Encrypted backup exceeds 48 MB.');
 let file:z.infer<typeof backupSchema>;
 // Settings shows this message as is: a truncated download or another file gets a plain reason.
 try{file=backupSchema.parse(JSON.parse(raw));}catch{throw Error('This file is not a complete ZIGoals encrypted backup, or a newer app version made it. Existing data was not changed.');}
 const key=await unlockVault(file.manifest,recovery),inventory=inventorySchema.parse(await openRecord(key,context(file.manifest.vault,file.index.id),file.index.envelope));
 if(file.version!==backupFormatVersion(inventory.parts.map(p=>p.domain)))throw Error('Backup format version does not match its sections.');
 if(new Set(inventory.parts.map(p=>p.id)).size!==inventory.parts.length||new Set(file.chunks.map(c=>c.id)).size!==file.chunks.length||file.chunks.length!==inventory.parts.length)throw Error('Backup inventory is incomplete.');
 const data:Record<string,string>={};for(const {id,domain} of inventory.parts){const chunk=file.chunks.find(c=>c.id===id&&c.domain===domain);if(!chunk)throw Error('Backup part is missing.');const value=await openRecord(key,context(file.manifest.vault,id,domain),chunk.envelope);if(typeof value!=='string'||value.length>48000)throw Error('Invalid backup part.');data[domain]=(data[domain]??'')+value;}
 const parsed=dataSchema.parse(data);if(new TextEncoder().encode(JSON.stringify(parsed)).length!==inventory.bytes)throw Error('Backup size differs from authenticated inventory.');return parsed;
}
