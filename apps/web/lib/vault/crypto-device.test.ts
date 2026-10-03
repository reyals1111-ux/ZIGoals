import {describe,expect,it} from 'vitest';
import {createDeviceKey,createVault,manifestDigest,openDeviceRoot,openRecord,sealRecord,unlockVault,unlockVaultForDevice,type VaultManifest} from './crypto';

// Session M, Part B2 (ADR-008, remember this device): a non-extractable device key seals the vault root once, while the
// recovery secret opens it; later the root is unwrapped straight into a key, bound to the account and the live manifest.
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const context=(manifest:VaultManifest)=>({vault:manifest.vault,domain:'habits' as const,object:crypto.randomUUID(),revision:1,epoch:manifest.epoch});
const REFUSED='This device could not open the vault.';

describe('remember this device: the sealed root',()=>{
 it('opens the same vault as the recovery secret, for the same account and manifest',async()=>{
  const vault=await createVault(),deviceKey=await createDeviceKey();
  const {key,sealed}=await unlockVaultForDevice(vault.manifest,vault.recovery,A,deviceKey);
  const reopened=await openDeviceRoot(deviceKey,sealed,A,vault.manifest),record=context(vault.manifest);
  // Records sealed with the key the secret gave open with the remembered one, and the other way round.
  expect(await openRecord(reopened,record,await sealRecord(key,record,{fictional:'remembered'}))).toEqual({fictional:'remembered'});
  expect(await openRecord(await unlockVault(vault.manifest,vault.recovery),record,await sealRecord(reopened,record,{fictional:'both ways'}))).toEqual({fictional:'both ways'});
  expect(sealed.iv).toHaveLength(16);expect(sealed.ciphertext).toHaveLength(64);
 });
 it('refuses another account, another vault, a newer epoch and a re-created manifest',async()=>{
  const vault=await createVault(),deviceKey=await createDeviceKey(),{sealed}=await unlockVaultForDevice(vault.manifest,vault.recovery,A,deviceKey);
  await expect(openDeviceRoot(deviceKey,sealed,B,vault.manifest)).rejects.toThrow(REFUSED);
  await expect(openDeviceRoot(deviceKey,sealed,A,(await createVault()).manifest)).rejects.toThrow(REFUSED);
  // Key rotation: the same vault at the next epoch has a new random root and a new manifest.
  const rotated=await createVault(vault.manifest.vault,vault.manifest.epoch+1);
  await expect(openDeviceRoot(deviceKey,sealed,A,rotated.manifest)).rejects.toThrow(REFUSED);
  // Even a manifest that claims the same vault and epoch, with another wrapped root, is refused.
  const recreated=await createVault(vault.manifest.vault,vault.manifest.epoch);
  await expect(openDeviceRoot(deviceKey,sealed,A,recreated.manifest)).rejects.toThrow(REFUSED);
  // And another device's key cannot open this device's seal.
  await expect(openDeviceRoot(await createDeviceKey(),sealed,A,vault.manifest)).rejects.toThrow(REFUSED);
 });
 it('an old epoch\'s material can never open the newer epoch, even with the newer manifest\'s numbers',async()=>{
  const vault=await createVault(),deviceKey=await createDeviceKey(),{sealed}=await unlockVaultForDevice(vault.manifest,vault.recovery,A,deviceKey);
  const rotated=await createVault(vault.manifest.vault,vault.manifest.epoch+1),{sealed:newer}=await unlockVaultForDevice(rotated.manifest,rotated.recovery,A,deviceKey);
  await expect(openDeviceRoot(deviceKey,sealed,A,rotated.manifest)).rejects.toThrow(REFUSED);
  // The newer seal opens the newer vault only; the old secret does not open the newer manifest.
  const record=context(rotated.manifest),opened=await openDeviceRoot(deviceKey,newer,A,rotated.manifest);
  expect(await openRecord(opened,record,await sealRecord(rotated.key,record,{epoch:2}))).toEqual({epoch:2});
  await expect(unlockVault(rotated.manifest,vault.recovery)).rejects.toThrow('Unlock or integrity check failed');
  await expect(unlockVaultForDevice(rotated.manifest,vault.recovery,A,deviceKey)).rejects.toThrow('Unlock or integrity check failed');
 });
 it('keeps every key non-extractable, and the device key cannot decrypt the seal back into bytes',async()=>{
  const vault=await createVault(),deviceKey=await createDeviceKey(),{key,sealed}=await unlockVaultForDevice(vault.manifest,vault.recovery,A,deviceKey);
  expect(deviceKey.extractable).toBe(false);expect([...deviceKey.usages].sort()).toEqual(['encrypt','unwrapKey']);
  await expect(crypto.subtle.exportKey('raw',deviceKey)).rejects.toThrow();
  const iv=Uint8Array.from(atob(sealed.iv.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)),data=Uint8Array.from(atob(sealed.ciphertext.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
  await expect(crypto.subtle.decrypt({name:'AES-GCM',iv},deviceKey,data)).rejects.toThrow();
  const reopened=await openDeviceRoot(deviceKey,sealed,A,vault.manifest);
  for(const root of [key,reopened]){expect(root.extractable).toBe(false);expect(root.algorithm.name).toBe('HKDF');await expect(crypto.subtle.exportKey('raw',root)).rejects.toThrow();}
 });
 it('refuses a seal of the wrong length or a changed one before or while unwrapping',async()=>{
  const vault=await createVault(),deviceKey=await createDeviceKey(),{sealed}=await unlockVaultForDevice(vault.manifest,vault.recovery,A,deviceKey);
  // A short or empty payload would otherwise import as a valid HKDF key.
  await expect(openDeviceRoot(deviceKey,{...sealed,ciphertext:sealed.ciphertext.slice(0,43)},A,vault.manifest)).rejects.toThrow();
  await expect(openDeviceRoot(deviceKey,{...sealed,ciphertext:''},A,vault.manifest)).rejects.toThrow();
  await expect(openDeviceRoot(deviceKey,{...sealed,iv:sealed.iv.slice(0,11)},A,vault.manifest)).rejects.toThrow();
  const flipped=sealed.ciphertext.slice(0,10)+(sealed.ciphertext[10]==='A'?'B':'A')+sealed.ciphertext.slice(11);
  await expect(openDeviceRoot(deviceKey,{...sealed,ciphertext:flipped},A,vault.manifest)).rejects.toThrow(REFUSED);
  await expect(openDeviceRoot(deviceKey,{...sealed,extra:1},A,vault.manifest)).rejects.toThrow();
 });
 it('a wrong recovery secret seals nothing',async()=>{
  const vault=await createVault(),other=await createVault();
  await expect(unlockVaultForDevice(vault.manifest,other.recovery,A,await createDeviceKey())).rejects.toThrow('Unlock or integrity check failed');
 });
 it('binds to the manifest\'s values, whatever order its fields arrive in',async()=>{
  const {manifest}=await createVault(),reordered={wrapped:{ciphertext:manifest.wrapped.ciphertext,nonce:manifest.wrapped.nonce,version:1},epoch:manifest.epoch,vault:manifest.vault,version:1};
  expect(await manifestDigest(reordered)).toBe(await manifestDigest(manifest));
  expect(await manifestDigest(manifest)).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(await manifestDigest({...manifest,epoch:manifest.epoch+1})).not.toBe(await manifestDigest(manifest));
 });
});
