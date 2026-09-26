/** Client-only encryption. Authentication never supplies decryption material. */
import {z} from 'zod';
const MAX_BYTES=262_144;
const uuid=z.uuid();
export const epochSchema=z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const recordContextSchema=z.object({vault:uuid,domain:z.enum(['finance','habits','health','settings']),object:uuid,revision:z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),epoch:epochSchema}).strict();
export type RecordContext=z.infer<typeof recordContextSchema>;
const base64=z.string().regex(/^[A-Za-z0-9_-]+$/);
export const envelopeSchema=z.object({version:z.literal(1),nonce:base64.length(16),ciphertext:base64.min(22).max(350_000)}).strict();
export type EncryptedEnvelope=z.infer<typeof envelopeSchema>;
export const manifestSchema=z.object({version:z.literal(1),vault:uuid,epoch:epochSchema,wrapped:envelopeSchema}).strict();
export type VaultManifest=z.infer<typeof manifestSchema>;
function encode(bytes:Uint8Array):string{let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function decode(s:string):Uint8Array<ArrayBuffer>{if(!/^[A-Za-z0-9_-]+$/.test(s)||s.length>350_000)throw Error('Invalid encrypted data.');const b=atob(s.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(b,c=>c.charCodeAt(0));}
const bytes=(s:string)=>new TextEncoder().encode(s);
async function rootKey(raw:Uint8Array<ArrayBuffer>){return crypto.subtle.importKey('raw',raw,'HKDF',false,['deriveKey']);}
async function domainKey(root:CryptoKey,vault:string,domain:string,epoch:number){return crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:bytes(vault),info:bytes(`zigoals:vault:v1:${domain}:epoch${epoch}`)},root,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
async function encrypt(key:CryptoKey,plaintext:Uint8Array<ArrayBuffer>,aad:string):Promise<EncryptedEnvelope>{
 if(plaintext.byteLength>MAX_BYTES)throw Error('Encrypted record exceeds 256 KiB. Split the record before saving.');
 const nonce=crypto.getRandomValues(new Uint8Array(12));
 const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce,additionalData:bytes(aad),tagLength:128},key,plaintext);
 return {version:1,nonce:encode(nonce),ciphertext:encode(new Uint8Array(cipher))};
}
async function decrypt(key:CryptoKey,input:unknown,aad:string){
 const e=envelopeSchema.parse(input),cipher=decode(e.ciphertext);
 if(cipher.byteLength>MAX_BYTES+16)throw Error('Encrypted record exceeds capacity.');
 try{return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(e.nonce),additionalData:bytes(aad),tagLength:128},key,cipher));}
 catch{throw Error('Unlock or integrity check failed. Existing data was not changed.');}
}
async function wrappingKey(recovery:string){if(!/^[A-Za-z0-9_-]{43}$/.test(recovery))throw Error('Use the complete vault recovery secret. Email codes cannot unlock data.');const raw=decode(recovery);if(raw.length!==32)throw Error('Invalid recovery secret.');return crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},false,['encrypt','decrypt']);}
export async function createVault(vault=crypto.randomUUID(),epoch=1):Promise<{key:CryptoKey;recovery:string;manifest:VaultManifest}>{
 uuid.parse(vault);epochSchema.parse(epoch);const raw=crypto.getRandomValues(new Uint8Array(32)),recovery=encode(crypto.getRandomValues(new Uint8Array(32)));
 try{const wrapped=await encrypt(await wrappingKey(recovery),raw,`zigoals:root:v1:${vault}:epoch${epoch}`);return {key:await rootKey(raw),recovery,manifest:{version:1,vault,epoch,wrapped}};}finally{raw.fill(0);}
}
export async function unlockVault(input:unknown,recovery:string):Promise<CryptoKey>{
 const manifest=manifestSchema.parse(input);const raw=await decrypt(await wrappingKey(recovery),manifest.wrapped,`zigoals:root:v1:${manifest.vault}:epoch${manifest.epoch}`);
 try{if(raw.length!==32)throw Error('Invalid vault key.');return await rootKey(raw);}finally{raw.fill(0);}
}
function contextText(input:RecordContext){const c=recordContextSchema.parse(input);return JSON.stringify(['zigoals-record',1,c.vault,c.domain,c.object,c.revision,c.epoch]);}
export async function sealRecord(key:CryptoKey,context:RecordContext,value:unknown):Promise<EncryptedEnvelope>{
 const aad=contextText(context);return encrypt(await domainKey(key,context.vault,context.domain,context.epoch),bytes(JSON.stringify(value)),aad);
}
export async function openRecord(key:CryptoKey,context:RecordContext,envelope:unknown):Promise<unknown>{
 const aad=contextText(context),raw=await decrypt(await domainKey(key,context.vault,context.domain,context.epoch),envelope,aad);
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));}catch{throw Error('Decrypted record is not supported JSON. Data was preserved.');}
}
