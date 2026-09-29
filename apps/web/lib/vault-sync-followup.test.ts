// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import {afterEach,beforeEach,test,expect,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {activateAccount,clearAccountSession,isAccountLocked} from './account-session';
const h=vi.hoisted(()=>({access:{} as any,synchronize:vi.fn(),apply:vi.fn()}));
vi.mock('../components/account-access',()=>({AccountAccess:(p:any)=>{h.access=p;return null;}}));
vi.mock('../components/account-devices',()=>({AccountDevices:()=>null}));
vi.mock('../components/account-deletion',()=>({AccountDeletion:()=>null}));
vi.mock('../components/local-account-attach',()=>({LocalAccountAttach:()=>null}));
vi.mock('../components/domain-cloud-controls',()=>({DomainCloudControls:()=>null}));
vi.mock('./vault/crypto',async original=>({...await original<any>(),unlockVault:async()=>({})}));
vi.mock('./vault/account-transport',()=>({accountTransport:()=>({read:async()=>({manifest:{version:1,vault:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',epoch:1,wrapped:{version:1,nonce:'A'.repeat(16),ciphertext:'A'.repeat(22)}}})})}));
vi.mock('./vault/cloud-sync',async original=>({...await original<any>(),synchronize:(...args:any[])=>h.synchronize(...args),cloudSnapshot:async()=>({data:{}}),SyncJournal:class{read=async()=>({base:{},heldDomains:[]});write=async()=>{};}}));
vi.mock('./vault/account-data',async original=>({...await original<any>(),captureData:async()=>({}),applyData:(...args:any[])=>h.apply(...args)}));
vi.mock('./vault/local',()=>({localDatabase:{pending:async()=>[],acknowledge:async()=>{}}}));
import {announceSyncedChanges,LocalRecordsChangedDuringSync} from './vault/account-data';
import {VaultSyncProvider,VaultSyncControls} from '../components/vault-sync-controls';
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';let root:Root,element:HTMLDivElement;
function deferred(){let resolve!:()=>void;const promise=new Promise<void>(yes=>{resolve=yes;});return {promise,resolve};}
const settled=()=>({data:{},commit:async()=>{}});
// Automatic syncs are debounced by 1 s; wait past that and let the sync finish.
const afterDebounce=()=>act(async()=>{await new Promise(resolve=>setTimeout(resolve,1300));});
const edit=()=>act(async()=>{window.dispatchEvent(new CustomEvent('zigoals:private-change',{detail:'zigoals:platform:v1'}));});
beforeEach(async()=>{vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.stubGlobal('navigator',{locks:{request:async(_key:string,work:()=>unknown)=>work()}});h.synchronize.mockReset().mockImplementation(async()=>settled());h.apply.mockReset().mockResolvedValue(undefined);element=document.createElement('div');document.body.append(element);root=createRoot(element);await act(async()=>root.render(createElement(VaultSyncProvider,null,createElement(VaultSyncControls))));});
afterEach(async()=>{await act(async()=>root.unmount());clearAccountSession();localStorage.clear();sessionStorage.clear();element.remove();vi.unstubAllGlobals();});
async function open(account:string){await act(async()=>activateAccount(account));await act(async()=>h.access.onAuthenticated(account));const input=element.querySelector('input[type=password]')!;await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'fictional');input.dispatchEvent(new Event('input',{bubbles:true}));});await act(async()=>element.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));expect(isAccountLocked()).toBe(false);}
/** Starts a sync with "Sync now" and holds it inside synchronize() until released. */
async function holdSync(){const release=deferred(),entered=deferred();h.synchronize.mockImplementationOnce(async()=>{entered.resolve();await release.promise;return settled();});const sync=[...element.querySelectorAll('button')].find(b=>b.textContent==='Sync now')!;await act(async()=>{sync.click();await entered.promise;});return release;}

test('edits made while a sync runs schedule exactly one follow-up sync after it finishes',async()=>{
 await open(A);expect(h.synchronize).toHaveBeenCalledTimes(1);
 const release=await holdSync();expect(h.synchronize).toHaveBeenCalledTimes(2);
 await edit();await edit();await edit();
 await afterDebounce();expect(h.synchronize).toHaveBeenCalledTimes(2);
 await act(async()=>release.resolve());
 await afterDebounce();expect(h.synchronize).toHaveBeenCalledTimes(3);
 // The follow-up itself saw no edits, so nothing further runs: no loop.
 await afterDebounce();expect(h.synchronize).toHaveBeenCalledTimes(3);
});

test('records the sync applies itself do not count as edits made during the sync',async()=>{
 await open(A);
 h.apply.mockImplementation(async()=>{announceSyncedChanges(['zigoals:platform:v1','zigoals:habits:v1']);});
 const release=await holdSync();
 await act(async()=>release.resolve());
 await afterDebounce();await afterDebounce();expect(h.synchronize).toHaveBeenCalledTimes(2);
});

test('a sync without concurrent edits schedules nothing, and a failed sync never follows up',async()=>{
 await open(A);
 const quiet=await holdSync();await act(async()=>quiet.resolve());await afterDebounce();expect(h.synchronize).toHaveBeenCalledTimes(2);
 const release=deferred(),entered=deferred();h.synchronize.mockImplementationOnce(async()=>{entered.resolve();await release.promise;throw Error('Fictional cloud rejection');});
 const sync=[...element.querySelectorAll('button')].find(b=>b.textContent==='Sync now')!;await act(async()=>{sync.click();await entered.promise;});
 await edit();await act(async()=>release.resolve());await afterDebounce();
 expect(h.synchronize).toHaveBeenCalledTimes(3);expect(element.querySelector('[role=alert]')?.textContent).toBe('Fictional cloud rejection');
});

test('a local edit refused by apply is a normal outcome: no pause, one follow-up sync',async()=>{
 await open(A);h.apply.mockImplementationOnce(async()=>{throw new LocalRecordsChangedDuringSync();});
 const release=await holdSync();await act(async()=>release.resolve());
 expect(element.textContent).not.toContain('Needs attention');expect(element.querySelector('[role="alert"]')).toBeNull();
 await afterDebounce();expect(h.synchronize).toHaveBeenCalledTimes(3);expect(element.textContent).toContain('Account records synced and acknowledged');
 await afterDebounce();expect(h.synchronize).toHaveBeenCalledTimes(3);
});

test('any other apply failure still pauses automatic sync and runs no follow-up',async()=>{
 await open(A);h.apply.mockImplementationOnce(async()=>{throw Error('Accepted financial evidence is append-only. Both copies were preserved for review.');});
 const release=await holdSync();await act(async()=>release.resolve());
 expect(element.textContent).toContain('Needs attention. Automatic sync paused.');
 await afterDebounce();await afterDebounce();expect(h.synchronize).toHaveBeenCalledTimes(2);
});
