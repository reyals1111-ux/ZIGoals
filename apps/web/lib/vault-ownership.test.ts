// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import {afterEach,beforeEach,test,expect,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {activateAccount,clearAccountSession,getAccountScope,isAccountLocked} from './account-session';
const h=vi.hoisted(()=>({access:{} as any,attach:{} as any,domain:{} as any,deletion:{} as any,apply:vi.fn(),journalWrite:vi.fn(),restore:vi.fn()}));
vi.mock('../components/account-access',()=>({AccountAccess:(p:any)=>{h.access=p;return null;}}));
vi.mock('../components/account-devices',()=>({AccountDevices:()=>null}));
vi.mock('../components/account-deletion',()=>({AccountDeletion:(p:any)=>{h.deletion=p;return null;}}));
vi.mock('../components/local-account-attach',()=>({LocalAccountAttach:(p:any)=>{h.attach=p;return null;}}));
vi.mock('../components/domain-cloud-controls',()=>({DomainCloudControls:(p:any)=>{h.domain=p;return null;}}));
vi.mock('./vault/crypto',async original=>({...await original<any>(),unlockVault:async()=>({})}));
vi.mock('./vault/account-transport',()=>({accountTransport:()=>({read:async()=>({manifest:{version:1,vault:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',epoch:1,wrapped:{version:1,nonce:'A'.repeat(16),ciphertext:'A'.repeat(22)}}})})}));
vi.mock('./vault/cloud-sync',async original=>({...await original<any>(),synchronize:async()=>({data:{},commit:async()=>{}}),cloudSnapshot:async()=>({data:{}}),SyncJournal:class{read=async()=>({base:{},heldDomains:[]});write=h.journalWrite;}}));
vi.mock('./vault/account-data',async original=>({...await original<any>(),captureData:async()=>({}),applyData:(...args:any[])=>h.apply(...args)}));
vi.mock('./vault/local',()=>({localDatabase:{pending:async()=>[]}}));
vi.mock('./vault/local-attach',()=>({planLocalAttach:()=>({data:{},domains:['habits'],inventory:[]}),assertAttachSourceUnchanged:()=>{}}));
vi.mock('./vault/backup',()=>({encryptBackup:async()=>({file:'fictional ciphertext',recovery:'fictional secret'})}));
vi.mock('./vault/domain-lifecycle',()=>({prepareDomainReview:async(kind:string,domain:string)=>({kind,domain,local:{}}),deleteCloudDomain:async()=>{},acceptDomainRestore:(...args:any[])=>h.restore(...args)}));
import {VaultSyncProvider,VaultSyncControls} from '../components/vault-sync-controls';
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';let root:Root,element:HTMLDivElement;
function deferred<T>(){let resolve!:(v:T)=>void,reject!:(e:Error)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
beforeEach(async()=>{vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.stubGlobal('navigator',{locks:{request:async(_key:string,work:()=>unknown)=>work()}});h.restore.mockReset().mockResolvedValue(undefined);h.apply.mockReset().mockResolvedValue(undefined);h.journalWrite.mockReset().mockResolvedValue(undefined);element=document.createElement('div');document.body.append(element);root=createRoot(element);await act(async()=>root.render(createElement(VaultSyncProvider,null,createElement(VaultSyncControls))));});
afterEach(async()=>{await act(async()=>root.unmount());clearAccountSession();localStorage.clear();sessionStorage.clear();element.remove();vi.unstubAllGlobals();});
async function open(account:string){await act(async()=>activateAccount(account));await act(async()=>h.access.onAuthenticated(account));const input=element.querySelector('input[type=password]')!;await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'fictional');input.dispatchEvent(new Event('input',{bubbles:true}));});await act(async()=>element.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));expect(isAccountLocked()).toBe(false);}
test('A deletion acknowledgement body released after B unlock cannot lock B or report deletion in B',async()=>{
 await open(A);const body=deferred<string>(),entered=deferred<void>();vi.stubGlobal('fetch',async()=>({ok:true,text:()=>{entered.resolve();return body.promise;}}));let pending:Promise<any>;await act(async()=>{pending=h.deletion.erase(false);await entered.promise;});await open(B);await act(async()=>body.resolve('{"deleted":true}'));expect(await pending!).toBeNull();expect(getAccountScope()).toBe(B);expect(isAccountLocked()).toBe(false);expect(element.textContent).not.toContain('Needs attention');
});
test('A failed local copy after B prepares a new review cannot clear B review',async()=>{
 await open(A);await act(async()=>h.attach.prepare(['habits']));expect(h.attach.preview).not.toBeNull();const apply=deferred<void>(),entered=deferred<void>();h.apply.mockImplementationOnce(()=>{entered.resolve();return apply.promise;});let pending:Promise<void>;await act(async()=>{pending=h.attach.confirm();await entered.promise;});await open(B);await act(async()=>h.attach.prepare(['habits']));const bReview=h.attach.preview;expect(bReview).not.toBeNull();await act(async()=>apply.reject(Error('A selection changed')));await pending!;expect(h.attach.preview).toBe(bReview);expect(isAccountLocked()).toBe(false);
});
test('A domain journal acknowledgement after B consent cannot alter B Health permission',async()=>{
 await open(A);await act(async()=>h.domain.prepare('delete','health'));const write=deferred<void>(),entered=deferred<void>();h.journalWrite.mockImplementationOnce(()=>{entered.resolve();return write.promise;});let pending:Promise<void>;await act(async()=>{pending=h.domain.confirm();await entered.promise;});await open(B);const consent=element.querySelector<HTMLInputElement>('input[type=checkbox]')!;await act(async()=>consent.click());expect(consent.checked).toBe(true);await act(async()=>write.resolve());await pending!;expect(consent.checked).toBe(true);expect(isAccountLocked()).toBe(false);
});

test('A accepted domain restore released after B unlock cannot enable B Health permission',async()=>{
 await open(A);await act(async()=>h.domain.prepare('restore','health'));const restore=deferred<void>(),entered=deferred<void>();h.restore.mockImplementationOnce(()=>{entered.resolve();return restore.promise;});let pending:Promise<void>;await act(async()=>{pending=h.domain.confirm();await entered.promise;});await open(B);const consent=element.querySelector<HTMLInputElement>('input[type=checkbox]')!;expect(consent.checked).toBe(false);await act(async()=>restore.resolve());await pending!;expect(consent.checked).toBe(false);expect(isAccountLocked()).toBe(false);
});
