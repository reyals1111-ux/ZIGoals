import {expect,test} from 'vitest';
import {createVault,unlockVault,sealRecord,openRecord} from './crypto';
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
 await expect(openRecord(a.key,context,{...envelope,version:2})).rejects.toThrow();
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
