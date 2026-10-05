// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import 'fake-indexeddb/auto';
import {afterEach,beforeEach,describe,expect,test,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {activateAccount,clearAccountSession,getAccountScope,isAccountLocked,lockAccount} from './account-session';
import {createDeviceKey,createVault,deviceCommitment,manifestDigest,sealDigest,unlockVaultForDevice} from './vault/crypto';
import {DEVICE_DATABASE,readDevices,rememberDevice} from './vault/device-unlock';
import {StaleDeviceError,noteAccessDenial} from './vault/stale-device';
const h=vi.hoisted(()=>({access:{} as any,manifest:null as any,session:'',signedIn:null as string|null,held:[] as string[],requests:[] as string[],synchronize:vi.fn()}));
vi.mock('../components/account-access',()=>({AccountAccess:(p:any)=>{h.access=p;return null;}}));
vi.mock('../components/account-devices',()=>({AccountDevices:()=>null}));
vi.mock('../components/account-deletion',()=>({AccountDeletion:()=>null}));
vi.mock('../components/local-account-attach',()=>({LocalAccountAttach:()=>null}));
vi.mock('../components/domain-cloud-controls',()=>({DomainCloudControls:()=>null}));
vi.mock('./vault/account-transport',()=>({accountTransport:()=>({read:async()=>({manifest:h.manifest}),write:async()=>({revision:1})})}));
vi.mock('./vault/cloud-sync',async original=>({...await original<any>(),synchronize:(...args:any[])=>h.synchronize(...args),cloudSnapshot:async()=>({data:{}}),SyncJournal:class{read=async()=>({base:{},heldDomains:h.held});write=async()=>{};}}));
vi.mock('./vault/account-data',async original=>({...await original<any>(),captureData:async()=>({}),applyData:async()=>{}}));
vi.mock('./vault/local',()=>({localDatabase:{pending:async()=>[],acknowledge:async()=>{}}}));
import {VaultSyncProvider,VaultSyncControls} from '../components/vault-sync-controls';

/**
 * Session M, Part B2 (ADR-008, owner decision M1): "Remember on this device". A remembered device opens the account
 * vault again without the recovery secret after a reload, in a new tab and after 15 idle minutes, until it is locked,
 * forgotten, signed out, or made stale (key rotation, a new sign-in, another account, a revoked or deleted account).
 */
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',S1='11111111-1111-4111-8111-111111111111',S2='22222222-2222-4222-8222-222222222222';
let root:Root,element:HTMLDivElement,vault:Awaited<ReturnType<typeof createVault>>;
const settle=()=>act(async()=>{for(let i=0;i<30;i++)await new Promise(resolve=>setTimeout(resolve,4));});
function server(){return vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{
 const url=String(input);h.requests.push(url);
 if(url.endsWith('?action=status'))return h.signedIn?Response.json({signedIn:true,accountId:h.signedIn}):Response.json({signedIn:false,error:'SIGN_IN_REQUIRED'},{status:401});
 if(url.endsWith('?action=sessions'))return Response.json({sessions:[{id:h.session,label:'This browser',createdAt:'2026-10-02T10:00:00.000Z',current:true}]});
 if(init?.method==='POST'&&String(init.body).includes('refresh'))return h.signedIn?Response.json({signedIn:true,accountId:h.signedIn}):Response.json({error:'SIGN_IN_REQUIRED'},{status:401});
 return Response.json({error:'UNEXPECTED'},{status:500});
});}
async function mount(settings=true){element=document.createElement('div');document.body.append(element);root=createRoot(element);await act(async()=>root.render(createElement(VaultSyncProvider,null,settings?createElement(VaultSyncControls):createElement('p',null,'Today'))));await settle();}
async function unmount(){await act(async()=>root.unmount());element.remove();}
/** A reload keeps this tab's account selection; everything in memory starts again, locked. */
async function reload(settings=true){await unmount();lockAccount();await mount(settings);}
/** A new tab has no selection at all. */
async function newTab(settings=true){await unmount();sessionStorage.clear();lockAccount();await mount(settings);}
/** Settings: AccountAccess verified the account (mocked here) and hands it to the vault panel. */
async function verified(account=A){if(getAccountScope()!==account)await act(async()=>activateAccount(account));await act(async()=>h.access.onAuthenticated(account));await settle();}
const rememberBox=()=>[...element.querySelectorAll<HTMLLabelElement>('label.checkbox')].find(label=>label.textContent?.startsWith('Remember on this device'))?.querySelector('input') as HTMLInputElement|undefined;
async function unlock(secret:string,remember:boolean){
 const form=element.querySelector('form')!,input=form.querySelector<HTMLInputElement>('input[type=password]')!,box=rememberBox()!;
 await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,secret);input.dispatchEvent(new Event('input',{bubbles:true}));});
 if(box.checked!==remember)await act(async()=>box.click());
 await act(async()=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await settle();
}
const button=(name:string)=>[...element.querySelectorAll('button')].find(b=>b.textContent===name);
const opened=()=>!isAccountLocked()&&!!button('Sync now');
const listed=async()=>(await indexedDB.databases()).some(db=>db.name===DEVICE_DATABASE);
async function remembered(){await mount();await verified();await unlock(vault.recovery,true);expect(opened()).toBe(true);expect(await readDevices()).toHaveLength(1);}

beforeEach(async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.stubGlobal('navigator',{locks:{request:async(_key:string,work:()=>unknown)=>work()}});vi.stubGlobal('fetch',server());
 vault=await createVault();h.manifest=vault.manifest;h.session=S1;h.signedIn=A;h.held=[];h.requests=[];h.synchronize.mockReset().mockResolvedValue({data:{},commit:async()=>{}});
});
afterEach(async()=>{await unmount();clearAccountSession();localStorage.clear();sessionStorage.clear();vi.unstubAllGlobals();vi.useRealTimers();await new Promise<void>(resolve=>{const r=indexedDB.deleteDatabase(DEVICE_DATABASE);r.onsuccess=r.onerror=r.onblocked=()=>resolve();});});

describe('the choice (M1 a, b)',()=>{
 test('in a browser tab it is unticked and shown with its warning; unlocking unticked remembers nothing and creates no database',async()=>{
  await mount();await verified();
  const box=rememberBox()!;expect(box.checked).toBe(false);expect(box.labels![0]!.textContent).toBe('Remember on this device — don’t use on shared computers');
  expect(document.getElementById(box.getAttribute('aria-describedby')!)!.textContent).toMatch(/anyone who can use this browser on this device can open them too.*locking also forgets it/);
  await unlock(vault.recovery,false);expect(opened()).toBe(true);
  expect(await listed()).toBe(false);expect(element.textContent).not.toContain('This device is remembered');
  await reload();await verified();expect(opened()).toBe(false);expect(element.querySelector('input[type=password]')).not.toBeNull();
 });
 test('in the installed app (display-mode standalone) it is ticked by default, still shown with its warning, and can be unticked',async()=>{
  vi.stubGlobal('matchMedia',(query:string)=>({matches:query==='(display-mode: standalone)'}));
  await mount();await verified();const box=rememberBox()!;
  expect(box.checked).toBe(true);expect(box.getAttribute('aria-describedby')).toBeTruthy();
  await act(async()=>box.click());expect(box.checked).toBe(false);
  await unlock(vault.recovery,false);expect(await listed()).toBe(false);
 });
 test('it is not offered while signed out or once the vault is open',async()=>{
  await mount();expect(rememberBox()).toBeUndefined();
  await verified();expect(rememberBox()).toBeDefined();
  await unlock(vault.recovery,true);expect(rememberBox()).toBeUndefined();
 });
});

describe('a remembered device opens without the secret',()=>{
 test('after a reload, in a new tab and on a page other than Settings',async()=>{
  await remembered();
  const [record]=await readDevices();expect(record).toMatchObject({account:A,vault:vault.manifest.vault,epoch:1,session:S1,health:false});
  expect(element.textContent).toContain('This device is remembered');
  await reload();await verified();expect(opened()).toBe(true);
  // A new tab on another page verifies the account itself (refreshing an expired token as Settings does) and opens.
  await newTab(false);expect(getAccountScope()).toBe(A);expect(isAccountLocked()).toBe(false);
  expect(h.requests.filter(url=>url.endsWith('?action=status'))).toHaveLength(1);
 });
 test('without a record, a page other than Settings makes no request at all',async()=>{
  await mount(false);expect(h.requests).toEqual([]);expect(isAccountLocked()).toBe(true);expect(await listed()).toBe(false);
 });
 test('15 minutes without interaction: a remembered device stays open, an unremembered one locks (M1 c)',async()=>{
  vi.useFakeTimers({toFake:['setInterval','clearInterval','Date']});
  await remembered();
  await act(async()=>{vi.advanceTimersByTime(16*60_000);});await settle();
  expect(opened()).toBe(true);
  await act(async()=>button('Forget this device')!.click());await settle();
  expect(await readDevices()).toEqual([]);expect(opened()).toBe(true);
  await act(async()=>{vi.advanceTimersByTime(16*60_000);});await settle();
  expect(isAccountLocked()).toBe(true);
 });
 test('the Health choice is remembered with the device, and not used while Health is held after deletion (M1 e)',async()=>{
  await mount();await verified();
  const health=element.querySelector<HTMLInputElement>('input[type=checkbox]')!;await act(async()=>health.click());await settle();expect(health.checked).toBe(true);
  await unlock(vault.recovery,true);expect((await readDevices())[0]!.health).toBe(true);
  await reload();await verified();expect(opened()).toBe(true);expect(element.querySelector<HTMLInputElement>('input[type=checkbox]')!.checked).toBe(true);
  h.held=['health'];await reload();await verified();expect(opened()).toBe(true);
  expect(element.querySelector<HTMLInputElement>('input[type=checkbox]')!.checked).toBe(false);
  await settle();expect((await readDevices())[0]!.health).toBe(false);
  // Turning Health off on a remembered device is remembered too.
  h.held=[];await act(async()=>element.querySelector<HTMLInputElement>('input[type=checkbox]')!.click());await settle();expect((await readDevices())[0]!.health).toBe(true);
  await act(async()=>element.querySelector<HTMLInputElement>('input[type=checkbox]')!.click());await settle();expect((await readDevices())[0]!.health).toBe(false);
 });
});

describe('what makes it ask for the secret again',()=>{
 test('Lock now locks and forgets this device (M1 d)',async()=>{
  await remembered();
  await act(async()=>button('Lock account vault')!.click());await settle();
  expect(isAccountLocked()).toBe(true);expect(await readDevices()).toEqual([]);
  await reload();await verified();expect(opened()).toBe(false);
 });
 test('Forget this device keeps this tab open; the next open asks for the secret (M1 f)',async()=>{
  await remembered();
  await act(async()=>button('Forget this device')!.click());await settle();
  expect(opened()).toBe(true);expect(await readDevices()).toEqual([]);expect(element.textContent).toContain('This device is no longer remembered.');
  await reload();await verified();expect(opened()).toBe(false);
 });
 test('sign-out forgets every remembered device',async()=>{
  await remembered();
  await act(async()=>{clearAccountSession();h.access.onSignout();});await settle();
  expect(await readDevices()).toEqual([]);
 });
 test('a key rotation elsewhere: the new manifest no longer matches, and the record is deleted',async()=>{
  await remembered();
  h.manifest=(await createVault(vault.manifest.vault,2)).manifest;
  await reload();await verified();expect(opened()).toBe(false);expect(await readDevices()).toEqual([]);
 });
 test('a new sign-in (another server session) needs the secret once',async()=>{
  await remembered();
  h.session=S2;await reload();await verified();expect(opened()).toBe(false);expect(await readDevices()).toEqual([]);
 });
 test('another account signed in on this browser forgets the first account\'s record',async()=>{
  await remembered();
  h.signedIn=B;await newTab(false);expect(isAccountLocked()).toBe(true);expect(await readDevices()).toEqual([]);
 });
 test('signed out elsewhere or unconfirmed: nothing opens, and the record stays for when the session is back',async()=>{
  await remembered();
  h.signedIn=null;await newTab(false);expect(isAccountLocked()).toBe(true);expect(await readDevices()).toHaveLength(1);
 });
 test('a routine token expiry keeps it and opens again at once; a revoked session deletes it',async()=>{
  await remembered();
  await act(async()=>{noteAccessDenial(A,'SIGN_IN_REQUIRED');lockAccount('access-changed');});await settle();
  expect(opened()).toBe(true);expect(await readDevices()).toHaveLength(1);
  await act(async()=>{noteAccessDenial(A,'SESSION_REVOKED');lockAccount('access-changed');});await settle();
  expect(isAccountLocked()).toBe(true);expect(await readDevices()).toEqual([]);
  expect(element.querySelector('[role=alert]')?.textContent).toBe('Account access changed. Sign in and unlock again.');
 });
 test('a stale device (vault changed, section or account deleted on another device) is forgotten; the tab keeps the error',async()=>{
  await remembered();
  h.synchronize.mockRejectedValueOnce(new StaleDeviceError('vault-changed','Account or vault changed. Lock and verify your account.'));
  await act(async()=>button('Sync now')!.click());await settle();
  expect(element.querySelector('[role=alert]')?.textContent).toBe('Account or vault changed. Lock and verify your account.');
  expect(await readDevices()).toEqual([]);expect(element.textContent).toContain('This device is no longer remembered because the account changed on another device.');
 });
 test('a sign-out while the vault is being unlocked leaves nothing remembered',async()=>{
  await mount();await verified();
  const form=element.querySelector('form')!,input=form.querySelector<HTMLInputElement>('input[type=password]')!;
  await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,vault.recovery);input.dispatchEvent(new Event('input',{bubbles:true}));});
  await act(async()=>rememberBox()!.click());
  await act(async()=>{form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));clearAccountSession();h.access.onSignout();});await settle();
  expect(await readDevices()).toEqual([]);expect(isAccountLocked()).toBe(true);
 });
});

// Session U Part 5 (B1, FINDINGS Q-SYNC-01): a new remember stores version 2 (the root key itself); a version 1 record
// from an earlier build opens once more and is migrated; a browser that cannot store the key object keeps version 1.
describe('version 2 records (B1)',()=>{
 const v1Record=async()=>{const deviceKey=await createDeviceKey(),{sealed}=await unlockVaultForDevice(vault.manifest,vault.recovery,A,deviceKey);return {version:1 as const,account:A,vault:vault.manifest.vault,epoch:vault.manifest.epoch,manifest:await manifestDigest(vault.manifest),session:S1,health:false,createdAt:'2026-10-02T10:00:00.000Z',sealed,key:deviceKey};};
 test('a new remember stores the root key itself, and it opens again after a reload',async()=>{
  await remembered();
  const [record]=await readDevices();expect(record!.version).toBe(2);if(record!.version!==2)throw Error('expected version 2');
  expect(record.root.extractable).toBe(false);expect([...record.root.usages]).toEqual(['deriveKey']);expect(record).not.toHaveProperty('sealed');expect(record).not.toHaveProperty('key');
  await reload();await verified();expect(opened()).toBe(true);expect((await readDevices())[0]!.version).toBe(2);
 });
 test('a version 1 record opens without the secret and is migrated to version 2, keeping its bindings',async()=>{
  const v1=await v1Record();expect(await rememberDevice(v1,0)).toBe(true);
  await mount();await verified();expect(opened()).toBe(true);
  const [record]=await readDevices();expect(record).toMatchObject({version:2,account:A,vault:v1.vault,epoch:v1.epoch,manifest:v1.manifest,session:S1,health:false,createdAt:v1.createdAt,migratedFrom:await sealDigest(v1.sealed)});
  await reload();await verified();expect(opened()).toBe(true);expect((await readDevices())[0]!.version).toBe(2);
  // Lock now still forgets it.
  await act(async()=>button('Lock account vault')!.click());await settle();expect(await readDevices()).toEqual([]);
 });
 test('a browser that cannot store the key object keeps version 1: it remembers, opens, and stays version 1',async()=>{
  const put=IDBObjectStore.prototype.put;
  const refuse=vi.spyOn(IDBObjectStore.prototype,'put').mockImplementation(function(this:IDBObjectStore,...args:Parameters<IDBObjectStore['put']>){if((args[0] as {version?:number})?.version===2)throw new DOMException('The object could not be cloned.','DataCloneError');return put.apply(this,args);});
  // Restored here: afterEach does not restore spies, and the next test stores a version 2 record.
  try{
   await remembered();expect((await readDevices())[0]!.version).toBe(1);
   await reload();await verified();expect(opened()).toBe(true);expect((await readDevices())[0]!.version).toBe(1);
  }finally{refuse.mockRestore();}
 });
 test('a version 2 record whose root no longer derives its commitment is deleted, and the secret is asked for',async()=>{
  const other=await createVault(),digest=await manifestDigest(vault.manifest);
  expect(await rememberDevice({version:2,id:crypto.randomUUID(),account:A,vault:vault.manifest.vault,epoch:vault.manifest.epoch,manifest:digest,session:S1,health:false,createdAt:'2026-10-02T10:00:00.000Z',commitment:await deviceCommitment(vault.key,A,digest),root:other.key},0)).toBe(true);
  await mount();await verified();expect(opened()).toBe(false);expect(await readDevices()).toEqual([]);
  expect(element.querySelector('input[type=password]')).not.toBeNull();
 });
});

// Session U Part 5 (B2, FINDINGS Q-SYNC-02): Lock in another tab of this browser arrives as a manual lock.
test('Lock in another tab of this browser is a manual lock here: the remembered device does not reopen this tab',async()=>{
 await remembered();await reload(false);expect(isAccountLocked()).toBe(false);
 // An older tab's plain lock: this tab reopens from the remembered device when it is used again, as before.
 await act(async()=>{lockAccount();});await settle();expect(isAccountLocked()).toBe(true);
 await act(async()=>{window.dispatchEvent(new Event('focus'));});await settle();expect(isAccountLocked()).toBe(false);
 // Lock in a tab of this build: manual here too, so focus does not reopen it.
 await act(async()=>{lockAccount('manual');});await settle();expect(isAccountLocked()).toBe(true);
 await act(async()=>{window.dispatchEvent(new Event('focus'));});await settle();expect(isAccountLocked()).toBe(true);
});

test('Showcase: no device database is read and no account request is made',async()=>{
 sessionStorage.setItem('zigoals:showcase:active:v1',JSON.stringify({version:1,generation:'fictional',day:'2026-10-02'}));
 const spy=vi.spyOn(indexedDB,'databases');
 await mount(false);expect(h.requests).toEqual([]);expect(spy).not.toHaveBeenCalled();
});
