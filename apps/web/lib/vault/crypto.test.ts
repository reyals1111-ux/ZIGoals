import {expect,test,vi} from 'vitest';
import {createVault,unlockVault,sealRecord,openRecord,envelopeSchema} from './crypto';
const context={vault:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',domain:'health' as const,object:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',revision:1,epoch:1 as const};
test('random recovery unlocks on an independent device; ciphertext reveals no private marker',async()=>{
 const a=await createVault(context.vault); const b=await unlockVault(a.manifest,a.recovery);
 const envelope=await sealRecord(a.key,context,{meal:'FICTIONAL_PRIVATE_MEAL',quantity:'234.567'});
 expect(JSON.stringify(envelope)).not.toContain('FICTIONAL');
 expect(await openRecord(b,context,envelope)).toEqual({meal:'FICTIONAL_PRIVATE_MEAL',quantity:'234.567'});
 const second=await sealRecord(a.key,context,{meal:'FICTIONAL_PRIVATE_MEAL'});expect(second.nonce).not.toBe(envelope.nonce);
});
test('wrong recovery, tampering, context substitution and future envelope fail closed',async()=>{
 const a=await createVault(context.vault), other=await createVault(context.vault);
 await expect(unlockVault(a.manifest,other.recovery)).rejects.toThrow();
 const envelope=await sealRecord(a.key,context,{secret:'fictional'});
 for(const changed of [{...context,domain:'finance' as const},{...context,revision:2},{...context,object:crypto.randomUUID()}])await expect(openRecord(a.key,changed,envelope)).rejects.toThrow();
 await expect(openRecord(a.key,context,{...envelope,ciphertext:envelope.ciphertext.slice(0,-3)+'AAA'})).rejects.toThrow();
 await expect(openRecord(a.key,context,{...envelope,version:3})).rejects.toThrow();
});
test('keys are nonextractable and bounded input rejects without replacement',async()=>{
 const a=await createVault(context.vault);expect(a.key.extractable).toBe(false);
 await expect(crypto.subtle.exportKey('raw',a.key)).rejects.toThrow();
 await expect(sealRecord(a.key,context,{large:'a'.repeat(300_000)})).rejects.toThrow();
 await expect(unlockVault(a.manifest,'email@example.com')).rejects.toThrow();
});
test('new epochs authenticate wrapping, derivation and records while legacy epoch one still opens',async()=>{
 const legacy=await createVault(context.vault),next=await createVault(context.vault,2);
 expect(next.manifest.epoch).toBe(2);
 const key=await unlockVault(next.manifest,next.recovery),ctx={...context,epoch:2};
 const sealed=await sealRecord(key,ctx,{exact:'20000.000000000000000001'});
 expect(await openRecord(key,ctx,sealed)).toEqual({exact:'20000.000000000000000001'});
 await expect(openRecord(key,{...ctx,epoch:1},sealed)).rejects.toThrow();
 await expect(unlockVault({...next.manifest,epoch:3},next.recovery)).rejects.toThrow();
 await expect(openRecord(legacy.key,ctx,sealed)).rejects.toThrow();
 expect(await unlockVault(legacy.manifest,legacy.recovery)).toBeDefined();
 for(const epoch of [0,-1,1.5,Number.MAX_SAFE_INTEGER+1])await expect(createVault(context.vault,epoch)).rejects.toThrow();
});

test('frozen v1 record remains decryptable but all new records use independent v2 keys',async()=>{
 const manifest={version:1,vault:context.vault,epoch:1,wrapped:{version:1,nonce:'BwcHBwcHBwcHBwcH',ciphertext:'RreZSCEez8qkK9TkrOVtpE5ZYEM83Lqre5Ru9F-RBhobMswnW7PXzh6SLRCIi_T1'}};
 const key=await unlockVault(manifest,'ISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISE');
 expect(await openRecord(key,context,{version:1,nonce:'BwcHBwcHBwcHBwcH',ciphertext:'GgKEyyLJN-BI6752vMl_2_Sl1jYiOe4rW7C7xmfe7PQyMheqYhMJ8B5YfkUNKRCFfxLrDIo9mqJ6BxsEGk2JwxOf6MULnXatpA'})).toEqual({legacy:'preserved exact value 123.456789012345678901'});
 const first=await sealRecord(key,context,{value:'same'}),second=await sealRecord(key,context,{value:'same'});
 expect(first.version).toBe(2);expect(second.version).toBe(2);
 if(first.version!==2||second.version!==2)throw Error('Expected v2');
 expect(JSON.stringify(envelopeSchema.parse(first))).toBe(JSON.stringify(first));
 expect(first.salt).toMatch(/^[A-Za-z0-9_-]{43}$/);expect(second.salt).not.toBe(first.salt);
 expect(await openRecord(key,context,first)).toEqual({value:'same'});expect(await openRecord(key,context,second)).toEqual({value:'same'});
});
test('v2 salt and every context field bind the key; malformed or substituted envelopes fail closed',async()=>{
 const vault=await createVault(context.vault),sealed=await sealRecord(vault.key,context,{value:'fictional'});
 expect(sealed.version).toBe(2);if(sealed.version!==2)throw Error('Expected v2');
 for(const changed of [{vault:crypto.randomUUID()},{domain:'finance' as const},{object:crypto.randomUUID()},{revision:2},{epoch:2}])await expect(openRecord(vault.key,{...context,...changed},sealed)).rejects.toThrow();
 for(const salt of ['A'.repeat(42),'A'.repeat(44),'!'.repeat(43),'A'.repeat(42)+'B','A'.repeat(43)])await expect(openRecord(vault.key,context,{...sealed,salt})).rejects.toThrow();
 await expect(openRecord(vault.key,context,{...sealed,version:1})).rejects.toThrow();
 await expect(openRecord(vault.key,context,{version:sealed.version,nonce:sealed.nonce,ciphertext:sealed.ciphertext})).rejects.toThrow();
});
test('a repeated nonce is safe across distinct single-use derived keys, independently verified with WebCrypto',async()=>{
 const vault=await createVault(context.vault),random=crypto.getRandomValues.bind(crypto);
 const spy=vi.spyOn(crypto,'getRandomValues').mockImplementation(array=>array?.byteLength===12?(array as Uint8Array).fill(7):random(array));
 try{
  const first=await sealRecord(vault.key,context,{value:'same'}),second=await sealRecord(vault.key,context,{value:'same'});
  expect(first.version).toBe(2);if(first.version!==2||second.version!==2)throw Error('Expected v2');
  expect(first.nonce).toBe(second.nonce);expect(first.salt).not.toBe(second.salt);expect(first.ciphertext).not.toBe(second.ciphertext);
  const aad=new TextEncoder().encode(JSON.stringify(['zigoals-record',2,context.vault,context.domain,context.object,context.revision,context.epoch]));
  const key=await crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:Uint8Array.from(atob(first.salt.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)),info:aad},vault.key,{name:'AES-GCM',length:256},false,['decrypt']);
  expect(key.extractable).toBe(false);await expect(crypto.subtle.exportKey('raw',key)).rejects.toThrow();
  const decode=(s:string)=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
  expect(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(first.nonce),additionalData:aad,tagLength:128},key,decode(first.ciphertext)))).toBe('{"value":"same"}');
  await expect(crypto.subtle.decrypt({name:'AES-GCM',iv:decode(second.nonce),additionalData:aad,tagLength:128},key,decode(second.ciphertext))).rejects.toThrow();
 }finally{spy.mockRestore();}
});
// Session U Part 5 (item 8): the `portfolio` label for Part 9's records; the four existing labels are unchanged.
test('a portfolio record seals and opens under its own label, which no other label opens; existing labels keep their bytes',async()=>{
 const {key,manifest}=await createVault(),object=crypto.randomUUID(),at=(domain:'portfolio'|'finance')=>({vault:manifest.vault,domain,object,revision:1,epoch:manifest.epoch});
 const sealed=await sealRecord(key,at('portfolio'),{fictional:'portfolio'});
 expect(await openRecord(key,at('portfolio'),sealed)).toEqual({fictional:'portfolio'});
 await expect(openRecord(key,at('finance'),sealed)).rejects.toThrow();
 await expect(openRecord(key,at('portfolio'),await sealRecord(key,at('finance'),{fictional:'finance'}))).rejects.toThrow();
 // A finance record opens under its own label as before.
 const legacy=await sealRecord(key,at('finance'),{fictional:'unchanged'});expect(await openRecord(key,at('finance'),legacy)).toEqual({fictional:'unchanged'});
 await expect(sealRecord(key,{...at('finance'),domain:'wealth' as 'finance'},{})).rejects.toThrow();
});
