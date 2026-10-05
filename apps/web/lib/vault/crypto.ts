/** Client-only encryption. Authentication never supplies decryption material. */
import {z} from 'zod';
const MAX_BYTES=262_144;
const uuid=z.uuid();
export const epochSchema=z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
// Session U Part 5 (item 8): `portfolio` labels the records of the opt-in Portfolio sync (Session U Part 9, ADR-013). One
// enum entry: every existing record's context, and so its key and additional data, is unchanged.
export const recordContextSchema=z.object({vault:uuid,domain:z.enum(['finance','habits','health','settings','portfolio']),object:uuid,revision:z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),epoch:epochSchema}).strict();
export type RecordContext=z.infer<typeof recordContextSchema>;
const base64=z.string().regex(/^[A-Za-z0-9_-]+$/);
const legacyEnvelopeSchema=z.object({version:z.literal(1),nonce:base64.length(16),ciphertext:base64.min(22).max(350_000)}).strict();
// A canonical 32-byte public HKDF salt; unused base64 bits must be zero.
const recordEnvelopeSchema=z.object({version:z.literal(2),salt:z.string().regex(/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/),nonce:base64.length(16),ciphertext:base64.min(22).max(350_000)}).strict();
export const envelopeSchema=z.discriminatedUnion('version',[legacyEnvelopeSchema,recordEnvelopeSchema]);
export type EncryptedEnvelope=z.infer<typeof envelopeSchema>;
export const manifestSchema=z.object({version:z.literal(1),vault:uuid,epoch:epochSchema,wrapped:legacyEnvelopeSchema}).strict();
export type VaultManifest=z.infer<typeof manifestSchema>;
function encode(bytes:Uint8Array):string{let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function decode(s:string):Uint8Array<ArrayBuffer>{if(!/^[A-Za-z0-9_-]+$/.test(s)||s.length>350_000)throw Error('Invalid encrypted data.');const b=atob(s.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(b,c=>c.charCodeAt(0));}
const bytes=(s:string)=>new TextEncoder().encode(s);
async function rootKey(raw:Uint8Array<ArrayBuffer>){return crypto.subtle.importKey('raw',raw,'HKDF',false,['deriveKey']);}
async function domainKey(root:CryptoKey,vault:string,domain:string,epoch:number){return crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:bytes(vault),info:bytes(`zigoals:vault:v1:${domain}:epoch${epoch}`)},root,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
async function encrypt(key:CryptoKey,plaintext:Uint8Array<ArrayBuffer>,aad:string):Promise<z.infer<typeof legacyEnvelopeSchema>>{
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
// Remember this device (ADR-008), version 1 records. A non-extractable device key seals the 32 root bytes once, while a
// recovery secret is opening the vault; a later open unwraps them into a non-extractable HKDF key. Bound by additional
// data to the verified account and the exact live manifest (vault, epoch and wrapped root), so a record cannot open
// another account, another vault or a newer epoch. Session U Part 5 (B1, FINDINGS Q-SYNC-01): unwrapKey lets its caller
// choose the result's algorithm and extractability, so script in this origin could unwrap the seal as an extractable AES
// or HMAC key and export the root's bytes. Version 1 records are no longer written: an open migrates one to version 2
// (deviceCommitment below), which stores the root key itself and no key that can unwrap anything.
export const sealedRootSchema=z.object({iv:base64.length(16),ciphertext:base64.length(64)}).strict();
export type SealedRoot=z.infer<typeof sealedRootSchema>;
/** The SHA-256 of the manifest's fields, in a fixed order: what a remembered device is bound to. */
export async function manifestDigest(input:unknown):Promise<string>{
 const m=manifestSchema.parse(input);
 return encode(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes(JSON.stringify([m.version,m.vault,m.epoch,m.wrapped.version,m.wrapped.nonce,m.wrapped.ciphertext])))));
}
async function deviceContext(account:string,manifest:unknown){uuid.parse(account);return bytes(JSON.stringify(['zigoals-device-root',1,account.toLowerCase(),await manifestDigest(manifest)]));}
export function createDeviceKey():Promise<CryptoKey>{return crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','unwrapKey']);}
/** unlockVault, and before the root bytes are wiped, one seal of them under the device key. */
export async function unlockVaultForDevice(input:unknown,recovery:string,account:string,deviceKey:CryptoKey):Promise<{key:CryptoKey;sealed:SealedRoot}>{
 const manifest=manifestSchema.parse(input),aad=await deviceContext(account,manifest);
 const raw=await decrypt(await wrappingKey(recovery),manifest.wrapped,`zigoals:root:v1:${manifest.vault}:epoch${manifest.epoch}`);
 try{
  if(raw.length!==32)throw Error('Invalid vault key.');
  const iv=crypto.getRandomValues(new Uint8Array(12)),ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad,tagLength:128},deviceKey,raw));
  return {key:await rootKey(raw),sealed:{iv:encode(iv),ciphertext:encode(ciphertext)}};
 }finally{raw.fill(0);}
}
/** Opens a remembered root for exactly this account and manifest; the bytes go from ciphertext into a key, never to script. */
export async function openDeviceRoot(deviceKey:CryptoKey,input:unknown,account:string,manifest:unknown):Promise<CryptoKey>{
 const sealed=sealedRootSchema.parse(input),iv=decode(sealed.iv),ciphertext=decode(sealed.ciphertext),aad=await deviceContext(account,manifest);
 // unwrapKey would import a short or empty payload as a valid HKDF key: only a sealed 32-byte root is accepted.
 if(iv.byteLength!==12||ciphertext.byteLength!==48)throw Error('This device could not open the vault.');
 try{return await crypto.subtle.unwrapKey('raw',ciphertext,deviceKey,{name:'AES-GCM',iv,additionalData:aad,tagLength:128},'HKDF',false,['deriveKey']);}
 catch{throw Error('This device could not open the vault.');}
}
// Session U Part 5 (B1): a version 2 record stores the root itself, the non-extractable HKDF key that opening the vault
// made (deriveKey only). Script running in this origin can still use it while the app runs (derive record keys, and
// export those derived keys), but no call returns the root's bytes. The commitment, an HMAC under a key derived from that
// root over the account and the manifest digest, is checked before the stored key opens anything: a record stays bound
// to one account and one manifest, as the version 1 seal's additional data bound it.
const commitmentText=(account:string,manifest:string)=>bytes(JSON.stringify(['zigoals-device-root',2,account.toLowerCase(),manifest]));
async function commitmentKey(root:CryptoKey){return crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:bytes('zigoals-device-commitment'),info:bytes('zigoals:device:v2:commitment')},root,{name:'HMAC',hash:'SHA-256',length:256},false,['sign','verify']);}
/** The commitment a version 2 record stores for its root, the account and the manifest digest (manifestDigest). */
export async function deviceCommitment(root:CryptoKey,account:string,manifest:string):Promise<string>{
 uuid.parse(account);if(!/^[A-Za-z0-9_-]{43}$/.test(manifest))throw Error('Invalid manifest digest.');
 return encode(new Uint8Array(await crypto.subtle.sign('HMAC',await commitmentKey(root),commitmentText(account,manifest))));
}
/** Whether a stored root still derives its record's commitment; false for anything unusable, never an error. */
export async function deviceCommitmentMatches(root:CryptoKey,account:string,manifest:string,commitment:string):Promise<boolean>{
 try{uuid.parse(account);const tag=decode(commitment);return tag.byteLength===32&&await crypto.subtle.verify('HMAC',await commitmentKey(root),tag,commitmentText(account,manifest));}catch{return false;}
}
/** A version 1 seal's digest. The version 2 record migrated from it keeps it, so a tab that opened with the version 1
 * record still recognises the record it opened with (its binding holds the seal, not the new record's id). */
export async function sealDigest(input:unknown):Promise<string>{
 const s=sealedRootSchema.parse(input);
 return encode(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes(JSON.stringify(['zigoals-device-seal',1,s.iv,s.ciphertext])))));
}
function contextText(input:RecordContext,version:1|2){const c=recordContextSchema.parse(input);return JSON.stringify(['zigoals-record',version,c.vault,c.domain,c.object,c.revision,c.epoch]);}
// Each seal derives one nonextractable AES key, encrypts once, then drops it.
// Salt + the full authenticated context separate concurrent devices and retries.
async function recordKey(root:CryptoKey,salt:Uint8Array<ArrayBuffer>,aad:string){
 return crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt,info:bytes(aad)},root,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function sealRecord(key:CryptoKey,context:RecordContext,value:unknown):Promise<EncryptedEnvelope>{
 const aad=contextText(context,2),salt=crypto.getRandomValues(new Uint8Array(32));
 const encrypted=await encrypt(await recordKey(key,salt,aad),bytes(JSON.stringify(value)),aad);
 return {version:2,salt:encode(salt),nonce:encrypted.nonce,ciphertext:encrypted.ciphertext};
}
export async function openRecord(key:CryptoKey,context:RecordContext,envelope:unknown):Promise<unknown>{
 const e=envelopeSchema.parse(envelope),aad=contextText(context,e.version);
 const derived=e.version===1?await domainKey(key,context.vault,context.domain,context.epoch):await recordKey(key,decode(e.salt),aad);
 const raw=await decrypt(derived,e,aad);
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));}catch{throw Error('Decrypted record is not supported JSON. Data was preserved.');}
}
