// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {activateAccount,clearAccountSession,isAccountLocked} from './account-session';
const MANIFEST={version:1,vault:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',epoch:1,wrapped:{version:1,nonce:'A'.repeat(16),ciphertext:'A'.repeat(22)}};
const h=vi.hoisted(()=>({access:{} as any,domain:{} as any,manifest:null as any,journal:vi.fn(),recover:vi.fn(),synchronize:vi.fn(),restore:vi.fn()}));
vi.mock('../components/account-access',()=>({AccountAccess:(p:any)=>{h.access=p;return null;}}));
vi.mock('../components/account-devices',()=>({AccountDevices:()=>null}));
vi.mock('../components/account-deletion',()=>({AccountDeletion:()=>null}));
vi.mock('../components/local-account-attach',()=>({LocalAccountAttach:()=>null}));
vi.mock('../components/domain-cloud-controls',()=>({DomainCloudControls:(p:any)=>{h.domain=p;return null;}}));
vi.mock('./vault/crypto',async original=>({...await original<any>(),unlockVault:async()=>({})}));
vi.mock('./vault/account-transport',()=>({accountTransport:()=>({read:async()=>({manifest:h.manifest})})}));
vi.mock('./vault/cloud-sync',async original=>({...await original<any>(),synchronize:(...args:any[])=>h.synchronize(...args),cloudSnapshot:async()=>({data:{}}),SyncJournal:class{read=()=>h.journal();write=async()=>{};recover=(...args:any[])=>h.recover(...args);}}));
vi.mock('./vault/account-data',async original=>({...await original<any>(),captureData:async()=>({}),applyData:async()=>{}}));
vi.mock('./vault/local',()=>({localDatabase:{pending:async()=>[],acknowledge:async()=>{}}}));
vi.mock('./vault/domain-lifecycle',()=>({prepareDomainReview:async(kind:string,domain:string)=>({kind,domain,local:{}}),deleteCloudDomain:async()=>{},acceptDomainRestore:(...args:any[])=>h.restore(...args)}));
import {HEALTH_RESTORE_ASK,VAULT_MISSING,VaultSyncProvider} from '../components/vault-sync-controls';
import {VaultSyncControls} from '../components/vault-sync-panel';

/**
 * Session Y Part 5 (ADR-018): the sync panel's side of the FIX_PLAN rules; none of them changes the person's records on
 * this device.
 * - B4: a Health restore asks before Health sync starts.
 * - B6: no vault in the cloud is never a fresh start while this device's journal shows one.
 */
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';let root:Root,element:HTMLDivElement;
const EMPTY={version:1,base:{},revision:0,headRevision:0,headDigest:null,pending:null};
const SYNCED={version:1,epoch:2,base:{settings:'{}'},revision:7,headRevision:3,headDigest:'a'.repeat(64),pending:null};
const settle=()=>act(async()=>{for(let i=0;i<10;i++)await new Promise(resolve=>setTimeout(resolve,20));});
const button=(name:string)=>[...element.querySelectorAll('button')].find(b=>b.textContent===name);
const consent=()=>element.querySelector<HTMLInputElement>('input[type=checkbox][id$="health"]')!;
beforeEach(async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.stubGlobal('navigator',{locks:{request:async(_key:string,work:()=>unknown)=>work()}});
 h.manifest=MANIFEST;h.journal.mockReset().mockResolvedValue(EMPTY);h.recover.mockReset().mockResolvedValue(undefined);h.restore.mockReset().mockResolvedValue(undefined);h.synchronize.mockReset().mockResolvedValue({data:{},commit:async()=>{}});
 element=document.createElement('div');document.body.append(element);root=createRoot(element);await act(async()=>root.render(createElement(VaultSyncProvider,null,createElement(VaultSyncControls))));
});
afterEach(async()=>{await act(async()=>root.unmount());clearAccountSession();localStorage.clear();sessionStorage.clear();element.remove();vi.unstubAllGlobals();});
async function signIn(){await act(async()=>activateAccount(A));await act(async()=>h.access.onAuthenticated(A));await settle();}
async function open(){await signIn();const input=element.querySelector('input[type=password]')!;await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'fictional');input.dispatchEvent(new Event('input',{bubbles:true}));});await act(async()=>element.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await settle();expect(isAccountLocked()).toBe(false);}

test('B4: a Health restore completes but leaves Health sync off; the consent box asks, with the reason, and takes the focus',async()=>{
 await open();const calls=h.synchronize.mock.calls.length;
 await act(async()=>h.domain.prepare('restore','health'));await act(async()=>h.domain.confirm());await settle();
 expect(h.restore).toHaveBeenCalledTimes(1);
 expect(consent().checked).toBe(false);expect(h.synchronize.mock.calls.length).toBe(calls);
 expect(element.textContent).toContain('Health section approved for a new cloud copy. Nothing was uploaded: Health sync is off until you turn it on.');
 const ask=[...element.querySelectorAll('p')].find(p=>p.textContent===HEALTH_RESTORE_ASK)!;
 expect(ask).toBeDefined();expect(consent().getAttribute('aria-describedby')?.split(' ')).toContain(ask.id);
 expect(document.activeElement).toBe(consent());
 // The person ticks it: Health sync starts through the existing consent path and the question goes away.
 await act(async()=>consent().click());await settle();
 expect(consent().checked).toBe(true);expect(element.textContent).not.toContain(HEALTH_RESTORE_ASK);
});
test('B4: restoring another section still syncs at once, as before',async()=>{
 await open();const calls=h.synchronize.mock.calls.length;
 await act(async()=>h.domain.prepare('restore','habits'));await act(async()=>h.domain.confirm());await settle();
 expect(h.synchronize.mock.calls.length).toBe(calls+1);expect(consent().checked).toBe(false);expect(element.textContent).not.toContain(HEALTH_RESTORE_ASK);
});
test('B6: no vault in the cloud while this device synced before: no fresh start is offered until the person confirms',async()=>{
 h.manifest=null;h.journal.mockResolvedValue(SYNCED);await signIn();
 expect(element.textContent).toContain(VAULT_MISSING);expect(button('Create encrypted account vault')).toBeUndefined();
 const start=button('Start a new encrypted vault')!;expect(start.disabled).toBe(true);
 const confirm=[...element.querySelectorAll<HTMLInputElement>('input[type=checkbox]')].find(i=>i.parentElement?.textContent==='I understand that this starts a new encrypted vault for my account.')!;
 await act(async()=>confirm.click());expect(start.disabled).toBe(false);
 await act(async()=>start.click());await settle();
 // The earlier journal goes to the recovery archive in one step, replaced by an empty one; then creating is offered.
 expect(h.recover).toHaveBeenCalledTimes(1);const [id,original,replacement]=h.recover.mock.calls[0]!;
 expect(id).toMatch(/^[0-9a-f-]{36}$/);expect(original).toEqual(SYNCED);expect(replacement).toEqual(EMPTY);
 expect(element.textContent).not.toContain(VAULT_MISSING);expect(button('Create encrypted account vault')).toBeDefined();
});
test('B6: a device that never synced (or a journal that cannot be read) is told apart: create at once, or the safe path',async()=>{
 h.manifest=null;await signIn();
 expect(button('Create encrypted account vault')).toBeDefined();expect(element.textContent).not.toContain(VAULT_MISSING);
 await act(async()=>root.unmount());clearAccountSession();root=createRoot(element);await act(async()=>root.render(createElement(VaultSyncProvider,null,createElement(VaultSyncControls))));
 h.journal.mockRejectedValue(Error('Sync journal unreadable.'));await signIn();
 expect(element.textContent).toContain(VAULT_MISSING);expect(button('Create encrypted account vault')).toBeUndefined();expect(h.recover).not.toHaveBeenCalled();
});
