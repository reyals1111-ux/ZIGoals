// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {activateAccount,clearAccountSession} from './account-session';
const MANIFEST={version:1,vault:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',epoch:1,wrapped:{version:1,nonce:'A'.repeat(16),ciphertext:'A'.repeat(22)}};
const h=vi.hoisted(()=>({access:{} as any,journal:vi.fn(),synchronize:vi.fn(),local:{} as Record<string,string>,pending:[] as {domain:string}[],extras:vi.fn()}));
vi.mock('../components/account-access',()=>({AccountAccess:(p:any)=>{h.access=p;return null;}}));
vi.mock('../components/account-devices',()=>({AccountDevices:()=>null}));
vi.mock('../components/account-deletion',()=>({AccountDeletion:()=>null}));
vi.mock('../components/local-account-attach',()=>({LocalAccountAttach:()=>null}));
vi.mock('../components/domain-cloud-controls',()=>({DomainCloudControls:()=>null}));
vi.mock('./vault/crypto',async original=>({...await original<any>(),unlockVault:async()=>({})}));
vi.mock('./vault/account-transport',()=>({accountTransport:()=>({read:async()=>({manifest:MANIFEST})})}));
vi.mock('./vault/cloud-sync',async original=>({...await original<any>(),synchronize:(...args:any[])=>h.synchronize(...args),SyncJournal:class{read=()=>h.journal();write=async()=>{};}}));
vi.mock('./vault/account-data',async original=>({...await original<any>(),captureData:async()=>({...h.local}),applyData:async()=>{}}));
vi.mock('./vault/local',()=>({localDatabase:{pending:async()=>h.pending,acknowledge:async()=>{}}}));
// The extras' own sync (ADR-023) is not under test here: it answers with its outcomes at once.
vi.mock('./vault/extras-sync',()=>({readExtrasChoice:()=>({enabled:true,explained:true}),writeExtrasChoice:()=>{},indexedDbBases:()=>({}),extrasTransport:()=>({}),syncExtras:(...args:any[])=>h.extras(...args),ExtrasChangedDuringSync:class extends Error{},releaseHealthHold:async()=>{},forgetExtrasBases:async()=>{}}));
import {VaultSyncProvider} from '../components/vault-sync-controls';
import {NO_ACCOUNT_STATUS,VaultSyncControls} from '../components/vault-sync-panel';
import {HEALTH_STAYS_LOCAL,SECTION_TEXT} from './vault/section-status';

/**
 * Session AD item 11 (ADR-026): Settings → Sync lists each section with a plain status, from the provider's own sync and
 * this device's outbox. Fictional account and records; the cloud is the mocked synchronize().
 */
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';let root:Root,element:HTMLDivElement,online=true;
const EMPTY={version:1,base:{},revision:0,headRevision:0,headDigest:null,pending:null};
const settle=(ms=200)=>act(async()=>{for(let i=0;i<ms/20;i++)await new Promise(resolve=>setTimeout(resolve,20));});
const syncNow=()=>[...element.querySelectorAll('button')].find(b=>b.textContent==='Sync now')!;
const list=()=>element.querySelector('.sync-sections');
const row=(label:string)=>[...element.querySelectorAll('.ss-rows li')].find(li=>li.querySelector('strong')?.textContent===label);
const consent=()=>element.querySelector<HTMLInputElement>('input[type=checkbox][id$="health"]')!;
beforeEach(async()=>{
 online=true;vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.stubGlobal('navigator',{locks:{request:async(_key:string,work:()=>unknown)=>work()},get onLine(){return online;}});
 h.journal.mockReset().mockResolvedValue(EMPTY);h.pending=[];h.local={finance:'{"f":1}',habits:'{"h":1}'};
 // The cloud held another device's Habits change and a Today section this device did not have; Goals and Wealth unchanged.
 h.synchronize.mockReset().mockImplementation(async()=>({data:{finance:'{"f":1}',habits:'{"h":2}',settings:'{"s":1}'},commit:async()=>{}}));
 h.extras.mockReset().mockResolvedValue([{section:'goals',state:'unchanged'},{section:'life',state:'unchanged'}]);
 element=document.createElement('div');document.body.append(element);root=createRoot(element);await act(async()=>root.render(createElement(VaultSyncProvider,null,createElement(VaultSyncControls))));
});
afterEach(async()=>{await act(async()=>root.unmount());clearAccountSession();localStorage.clear();sessionStorage.clear();element.remove();vi.unstubAllGlobals();});
async function open(){await act(async()=>activateAccount(A));await act(async()=>h.access.onAuthenticated(A));await settle();const input=element.querySelector('input[type=password]')!;await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'fictional');input.dispatchEvent(new Event('input',{bubbles:true}));});await act(async()=>element.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await settle();}

test('without an account the panel says sync is off and lists no sections',async()=>{
 expect(element.querySelector('[role=status]')!.textContent).toBe(NO_ACCOUNT_STATUS);
 expect(NO_ACCOUNT_STATUS).toBe('Account sync is off. Your records stay on this device.');
 expect(list()).toBeNull();
});
test('signed in but locked: still no section list (nothing to report until the vault opens)',async()=>{
 await act(async()=>activateAccount(A));await act(async()=>h.access.onAuthenticated(A));await settle();
 expect(element.querySelector('input[type=password]')).not.toBeNull();expect(list()).toBeNull();
});
test('after a sync: each section up to date with its time, and the one another device changed says so',async()=>{
 await open();
 expect(list()!.getAttribute('role')).toBe('group');expect(list()!.querySelector('ul')!.getAttribute('role')).toBe('list');
 expect([...element.querySelectorAll('.ss-rows strong')].map(s=>s.textContent)).toEqual(['Goals & Wealth','Habits','Today','The extras','Portfolio']);
 for(const label of ['Goals & Wealth','Habits','Today','The extras'])expect(row(label)!.textContent).toMatch(/Up to date · \S/);
 expect(row('Goals & Wealth')!.textContent).not.toContain(SECTION_TEXT.merged);
 expect(row('Habits')!.textContent).toContain('Updated with changes from your other device.');
 expect(row('Today')!.textContent).toContain('Updated with changes from your other device.');
 expect(row('Portfolio')!.textContent).toContain('Off — your Portfolio stays on this device');
 // Health is not listed while its sync is off; a plain line says where it stays.
 expect(row('Health')).toBeUndefined();expect(list()!.textContent).toContain(HEALTH_STAYS_LOCAL);
 expect(list()!.textContent).toContain('Times are from this session on this device.');
 expect(element.querySelectorAll('[role=status]').length).toBe(1);
});
test('Health is listed once its sync is turned on, and synced with the others at the next sync',async()=>{
 await open();await act(async()=>consent().click());await settle();
 expect(row('Health')!.textContent).toContain('Not synced yet in this session');expect(list()!.textContent).not.toContain(HEALTH_STAYS_LOCAL);
 h.local={...h.local,health:'{"x":1}'};h.synchronize.mockImplementation(async()=>({data:{finance:'{"f":1}',habits:'{"h":2}',settings:'{"s":1}',health:'{"x":1}'},commit:async()=>{}}));
 await act(async()=>syncNow().click());await settle();
 expect(h.synchronize.mock.calls.at(-1)![7]).toEqual(['finance','habits','settings','health']);
 expect(row('Health')!.textContent).toMatch(/Up to date · \S/);expect(row('Health')!.textContent).not.toContain(SECTION_TEXT.merged);
});
test('changes made after the sync are counted as waiting, per section',async()=>{
 await open();
 h.pending=[{domain:'zigoals:habits:v1'},{domain:'zigoals:habits:v1'},{domain:'zigoals:platform:v1'}];
 await act(async()=>window.dispatchEvent(new CustomEvent('zigoals:private-change',{detail:'other'})));await settle(600);
 expect(row('Habits')!.textContent).toContain('2 changes waiting to sync');expect(row('Goals & Wealth')!.textContent).toContain('1 change waiting to sync');
 expect(row('Today')!.textContent).toMatch(/Up to date/);
});
test('a failed sync: each section says it could not sync, keeps the changes here, and "Try again" runs the sync once more',async()=>{
 h.synchronize.mockRejectedValueOnce(Error('Cloud changed. Local records were preserved. Retry to reconcile.'));await open();
 expect(row('Habits')!.textContent).toContain('Couldn’t sync. Your changes are kept on this device.');
 const retry=row('Habits')!.querySelector('button')!;
 expect(retry.textContent).toBe('Try again');expect(retry.getAttribute('aria-label')).toBe('Try again: Habits');expect(retry.disabled).toBe(false);
 const calls=h.synchronize.mock.calls.length;
 await act(async()=>retry.click());await settle();
 expect(h.synchronize.mock.calls.length).toBe(calls+1);
 expect(row('Habits')!.textContent).toMatch(/Up to date/);expect(row('Habits')!.querySelector('button')).toBeNull();
});
test('offline: the sections wait for the network, and say so again when it comes back',async()=>{
 await open();
 online=false;await act(async()=>window.dispatchEvent(new Event('offline')));await settle();
 expect(row('Habits')!.textContent).toContain('Offline — will sync when you’re back online');
 online=true;await act(async()=>window.dispatchEvent(new Event('online')));await settle();
 expect(row('Habits')!.textContent).toMatch(/Up to date/);
});
test('a section deleted from the cloud is shown as kept on this device',async()=>{
 h.journal.mockResolvedValue({...EMPTY,heldDomains:['finance']});await open();
 expect(row('Goals & Wealth')!.textContent).toContain('Kept on this device only, because its cloud copy was deleted');
});
test('the extras: updated from another device, or failed with their own message kept beside their switch',async()=>{
 h.extras.mockResolvedValueOnce([{section:'life',state:'pulled'}]);await open();
 expect(row('The extras')!.textContent).toContain('Updated with changes from your other device.');
 h.extras.mockRejectedValueOnce(Error('Extras sync was not confirmed. Your records on this device were preserved.'));
 await act(async()=>syncNow().click());await settle();
 expect(row('The extras')!.textContent).toContain(SECTION_TEXT.error);expect(row('The extras')!.querySelector('button')!.getAttribute('aria-label')).toBe('Try again: The extras');
 // The account's own sections still synced.
 expect(row('Habits')!.textContent).toMatch(/Up to date/);
});
