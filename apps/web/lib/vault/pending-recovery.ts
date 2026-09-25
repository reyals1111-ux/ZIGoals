import {z} from 'zod';
import {encryptBackup,decryptBackup} from './backup';
import {syncStateSchema,type SyncState} from './cloud-sync';

const payloadSchema=z.object({format:z.literal('zigoals-pending-recovery-payload'),version:z.literal(1),account:z.uuid(),journal:syncStateSchema}).strict();
const fileSchema=z.object({format:z.literal('zigoals-pending-recovery'),version:z.literal(1),archive:z.unknown()}).strict();

/** An encrypted, separate recovery artifact. It never acknowledges, changes or sends the queue. */
export async function encryptPendingRecovery(account:string,state:SyncState){
 const journal=syncStateSchema.parse(state);
 if(!journal.pending)throw Error('No pending account work to export.');
 const payload=payloadSchema.parse({format:'zigoals-pending-recovery-payload',version:1,account,journal});
 const encrypted=await encryptBackup({settings:JSON.stringify(payload)});
 return {file:JSON.stringify({format:'zigoals-pending-recovery',version:1,archive:JSON.parse(encrypted.file)}),recovery:encrypted.recovery};
}

/** Read-only recovery inspection. A future forward-recovery flow must revalidate cloud state before any replay. */
export async function decryptPendingRecovery(raw:string,recovery:string){
 if(new TextEncoder().encode(raw).length>48_000_000)throw Error('Pending recovery file exceeds 48 MB.');
 const file=fileSchema.parse(JSON.parse(raw));
 const data=await decryptBackup(JSON.stringify(file.archive),recovery);
 const payload=payloadSchema.parse(JSON.parse(data.settings??'null'));
 if(!payload.journal.pending)throw Error('Pending recovery file contains no queued operation.');
 return payload;
}
