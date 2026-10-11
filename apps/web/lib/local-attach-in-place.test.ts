// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import {afterEach,beforeEach,describe,expect,test,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {activateAccount,clearAccountSession} from './account-session';
const h=vi.hoisted(()=>({access:{} as any,encryptBackup:vi.fn(),local:{} as Record<string,string>}));
vi.mock('../components/account-access',()=>({AccountAccess:(p:any)=>{h.access=p;return null;}}));
vi.mock('../components/account-devices',()=>({AccountDevices:()=>null}));
vi.mock('../components/account-deletion',()=>({AccountDeletion:()=>null}));
vi.mock('./vault/crypto',async original=>({...await original<any>(),unlockVault:async()=>({})}));
vi.mock('./vault/backup',async original=>({...await original<any>(),encryptBackup:(...args:any[])=>h.encryptBackup(...args)}));
vi.mock('./vault/account-transport',()=>({accountTransport:()=>({read:async()=>({manifest:{version:1,vault:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',epoch:1,wrapped:{version:1,nonce:'A'.repeat(16),ciphertext:'A'.repeat(22)}}})})}));
vi.mock('./vault/cloud-sync',async original=>({...await original<any>(),synchronize:async()=>({data:{},commit:async()=>{}}),cloudSnapshot:async()=>({data:{}}),SyncJournal:class{read=async()=>({base:{},heldDomains:[]});write=async()=>{};}}));
vi.mock('./vault/account-data',async original=>({...await original<any>(),captureData:async(storage:Storage,domains:string[])=>storage===window.localStorage?Object.fromEntries(domains.map(d=>[d,h.local[d]]).filter(([,v])=>v!==undefined)):{},applyData:async()=>{}}));
vi.mock('./vault/local',()=>({localDatabase:{pending:async()=>[],acknowledge:async()=>{}}}));
import {LocalAccountAttach} from '../components/local-account-attach';
import {VaultSyncProvider} from '../components/vault-sync-controls';
import {VaultSyncControls} from '../components/vault-sync-panel';
import {presetSettings} from './dashboard-settings';

/**
 * Session M, Part B3 (owner decision M2): earlier records are copied into the account in place, with no file. The panel
 * shows what will be copied and asks for one explicit approval; the originals stay on this device. Nothing is downloaded,
 * no backup secret is shown, and the provider no longer builds an encrypted backup for the copy.
 */
let root:Root,element:HTMLDivElement;
const APPROVE='Copy these records into this account. The originals stay on this device.';
const plan={data:{settings:'{}'},domains:['settings' as const],inventory:[{domain:'settings' as const,bytes:2,collections:{widgets:4}}]};
const labelled=(text:string)=>[...element.querySelectorAll('label')].find(label=>label.textContent===text)?.querySelector('input') as HTMLInputElement|undefined;
const button=(name:string)=>[...element.querySelectorAll('button')].find(b=>b.textContent===name);
beforeEach(()=>{vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.stubGlobal('navigator',{locks:{request:async(_key:string,work:()=>unknown)=>work()}});element=document.createElement('div');document.body.append(element);root=createRoot(element);h.encryptBackup.mockReset().mockResolvedValue({file:'{"fictional":true}',recovery:'fictional-secret'});h.local={settings:JSON.stringify(presetSettings('health'))};});
afterEach(async()=>{await act(async()=>root.unmount());clearAccountSession();localStorage.clear();sessionStorage.clear();element.remove();vi.unstubAllGlobals();});

describe('the copy panel',()=>{
 test('reviews what will be copied, asks for one explicit approval, and offers no file or secret',async()=>{
  const confirm=vi.fn(async()=>{});
  await act(async()=>root.render(createElement(LocalAccountAttach,{busy:false,health:false,preview:{plan},prepare:async()=>{},confirm,cancel:()=>{}})));
  expect(element.textContent).toContain('Today preferences');expect(element.textContent).toContain('widgets: 4');
  expect(element.textContent).toContain('no file to save');
  expect(labelled('Local copy backup secret')).toBeUndefined();expect(button('Download protected local copy')).toBeUndefined();
  const approve=labelled(APPROVE)!;expect(approve.disabled).toBe(false);expect(approve.checked).toBe(false);
  expect(approve.id&&element.querySelector(`label[for="${approve.id}"]`)).toBeTruthy();
  expect(button('Copy selected records and sync')!.disabled).toBe(true);
  await act(async()=>approve.click());expect(button('Copy selected records and sync')!.disabled).toBe(false);
  await act(async()=>button('Copy selected records and sync')!.click());expect(confirm).toHaveBeenCalledTimes(1);
  expect(button('Keep records local')).toBeDefined();
 });
});

test('preparing the copy builds no encrypted backup file',async()=>{
 const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 await act(async()=>root.render(createElement(VaultSyncProvider,null,createElement(VaultSyncControls))));
 await act(async()=>activateAccount(A));await act(async()=>h.access.onAuthenticated(A));
 const input=element.querySelector<HTMLInputElement>('input[type=password]')!;
 await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'fictional');input.dispatchEvent(new Event('input',{bubbles:true}));});
 await act(async()=>element.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 const box=[...element.querySelectorAll<HTMLLabelElement>('section[aria-label="Copy local records to account"] label')].find(label=>label.textContent==='Today preferences')!.querySelector('input')!;
 await act(async()=>box.click());
 await act(async()=>button('Review selected local records')!.click());
 // Session X Part 5b loads the attach planner when the review starts (lib/vault/local-attach on demand, ADR-016 X15), so
 // the preview arrives once that import resolves: wait for it (up to 5 s) instead of a fixed 50 ms. Same checks.
 for(const started=Date.now();!element.textContent?.includes('widgets: 4')&&Date.now()-started<5000;)await act(async()=>{await new Promise(resolve=>setTimeout(resolve,10));});
 expect(element.textContent).toContain('widgets: 4');
 expect(h.encryptBackup).not.toHaveBeenCalled();
 expect(labelled('Local copy backup secret')).toBeUndefined();
 expect(labelled(APPROVE)).toBeDefined();
});
