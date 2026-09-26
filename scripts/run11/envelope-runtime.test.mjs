import {test,expect} from 'vitest';
import {createVault,sealRecord,openRecord} from '../../apps/web/lib/vault/crypto.ts';
import {privateRuntime} from './private-runtime.mjs';
test('SQLite Worker accepts v2, refuses malformed salt without mutation, and preserves legacy v1 ciphertext',async()=>{
 const runtime=await privateRuntime();try{
  const call=runtime.call;await call('/v1/sessions',{action:'register',label:'Encryption fixture'});
  const vault=await createVault(),id=crypto.randomUUID(),context={vault:vault.manifest.vault,domain:'health',object:id,revision:1,epoch:1};
  const envelope=await sealRecord(vault.key,context,{exact:'123.456789012345678901'});expect(envelope.version).toBe(2);
  const row={id,domain:'health',revision:1,epoch:1,deleted:false,envelope};
  const write={protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:0,manifest:vault.manifest,changes:[row]};
  expect((await call('/v1/vault',write)).status).toBe(200);
  const before=await(await call('/v1/vault')).json();
  for(const changed of [{...envelope,salt:'A'.repeat(42)},{...envelope,salt:'A'.repeat(44)},{...envelope,salt:'A'.repeat(42)+'B'},{...envelope,version:3},{...envelope,extra:1}]){
   expect((await call('/v1/vault',{...write,manifest:undefined,operation:crypto.randomUUID(),base:1,changes:[{...row,revision:2,envelope:changed}]})).status).toBe(400);
   expect(await(await call('/v1/vault')).json()).toEqual(before);
  }
  expect(await openRecord(vault.key,context,before.records[0].envelope)).toEqual({exact:'123.456789012345678901'});
  // Workers store opaque v1 envelopes unchanged; old read compatibility is separately verified by a frozen cryptographic fixture.
  const legacy={version:1,nonce:'BwcHBwcHBwcHBwcH',ciphertext:'GgKEyyLJN-BI6752vMl_2_Sl1jYiOe4rW7C7xmfe7PQyMheqYhMJ8B5YfkUNKRCFfxLrDIo9mqJ6BxsEGk2JwxOf6MULnXatpA'};
  expect((await call('/v1/vault',{...write,manifest:undefined,operation:crypto.randomUUID(),base:1,changes:[{...row,revision:2,envelope:legacy}]})).status).toBe(200);
  expect((await(await call('/v1/vault')).json()).records[0].envelope).toEqual(legacy);
 }finally{await runtime.mf.dispose();}
},30000);
