// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import {afterEach,beforeEach,test,expect,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {activateAccount,clearAccountSession,isAccountLocked,lockAccount} from './account-session';
const h=vi.hoisted(()=>({access:{} as any,domain:{} as any,synchronize:vi.fn(),apply:vi.fn(),prepareDomain:vi.fn()}));
vi.mock('../components/account-access',()=>({AccountAccess:(p:any)=>{h.access=p;return null;}}));
vi.mock('../components/account-devices',()=>({AccountDevices:()=>null}));
vi.mock('../components/account-deletion',()=>({AccountDeletion:()=>null}));
vi.mock('../components/local-account-attach',()=>({LocalAccountAttach:()=>null}));
vi.mock('../components/domain-cloud-controls',()=>({DomainCloudControls:(p:any)=>{h.domain=p;return null;}}));
vi.mock('./vault/crypto',async original=>({...await original<any>(),unlockVault:async()=>({})}));
vi.mock('./vault/account-transport',()=>({accountTransport:()=>({read:async()=>({manifest:{version:1,vault:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',epoch:1,wrapped:{version:1,nonce:'A'.repeat(16),ciphertext:'A'.repeat(22)}}})})}));
vi.mock('./vault/cloud-sync',async original=>({...await original<any>(),synchronize:(...args:any[])=>h.synchronize(...args),cloudSnapshot:async()=>({data:{}}),SyncJournal:class{read=async()=>({base:{},heldDomains:[]});write=async()=>{};}}));
vi.mock('./vault/account-data',async original=>({...await original<any>(),captureData:async()=>({}),applyData:(...args:any[])=>h.apply(...args)}));
vi.mock('./vault/local',()=>({localDatabase:{pending:async()=>[],acknowledge:async()=>{}}}));
vi.mock('./vault/domain-lifecycle',()=>({prepareDomainReview:(kind:string,domain:string)=>h.prepareDomain(kind,domain),deleteCloudDomain:async()=>{},acceptDomainRestore:async()=>{}}));
import {VaultSyncProvider} from '../components/vault-sync-controls';
import {VaultSyncControls} from '../components/vault-sync-panel';

/**
 * Session K (account-browser b-first): the sync panel's actions and its automatic sync share one "running" flag. An
 * automatic sync takes it the moment its 1 s debounce fires, but the panel only shows itself busy on the next render,
 * so a person can still press a button that looks enabled. That press used to vanish without a word.
 */
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';let root:Root,element:HTMLDivElement;
function deferred(){let resolve!:()=>void;const promise=new Promise<void>(yes=>{resolve=yes;});return {promise,resolve};}
const settled=()=>({data:{},commit:async()=>{}});
const review=(kind:string,domain:string)=>({kind,domain,local:{},revision:1,generation:0,operation:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',file:'{}',recovery:'fictional'});
const afterDebounce=()=>act(async()=>{await new Promise(resolve=>setTimeout(resolve,1300));});
const edit=()=>act(async()=>{window.dispatchEvent(new CustomEvent('zigoals:private-change',{detail:'zigoals:platform:v1'}));});
beforeEach(async()=>{vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.stubGlobal('navigator',{locks:{request:async(_key:string,work:()=>unknown)=>work()}});h.synchronize.mockReset().mockImplementation(async()=>settled());h.apply.mockReset().mockResolvedValue(undefined);h.prepareDomain.mockReset().mockImplementation(async(kind:string,domain:string)=>review(kind,domain));element=document.createElement('div');document.body.append(element);root=createRoot(element);await act(async()=>root.render(createElement(VaultSyncProvider,null,createElement(VaultSyncControls))));});
afterEach(async()=>{await act(async()=>root.unmount());clearAccountSession();localStorage.clear();sessionStorage.clear();element.remove();vi.unstubAllGlobals();});
async function open(account:string){await act(async()=>activateAccount(account));await act(async()=>h.access.onAuthenticated(account));const input=element.querySelector('input[type=password]')!;await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'fictional');input.dispatchEvent(new Event('input',{bubbles:true}));});await act(async()=>element.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));expect(isAccountLocked()).toBe(false);}
/** An edit schedules an automatic sync; it starts after the 1 s debounce and is held inside synchronize() until released. */
async function holdAutomaticSync(){const release=deferred(),entered=deferred();h.synchronize.mockImplementationOnce(async()=>{entered.resolve();await release.promise;return settled();});await edit();await act(async()=>{await new Promise(resolve=>setTimeout(resolve,1100));await entered.promise;});return release;}

test('a review asked for while an automatic sync runs is not dropped: it opens as soon as that sync ends',async()=>{
 await open(A);expect(h.synchronize).toHaveBeenCalledTimes(1);
 const release=await holdAutomaticSync();expect(h.synchronize).toHaveBeenCalledTimes(2);
 let asked!:Promise<void>;await act(async()=>{asked=h.domain.prepare('delete','health');});
 // It waits while the sync runs, and never overlaps it.
 expect(h.prepareDomain).not.toHaveBeenCalled();
 await act(async()=>{release.resolve();await asked;});
 expect(h.prepareDomain).toHaveBeenCalledTimes(1);
 expect(h.domain.review).toMatchObject({kind:'delete',domain:'health'});
 expect(element.querySelector('[role=alert]')).toBeNull();
});

test('an automatic sync already scheduled when a review begins does not run during the review',async()=>{
 await open(A);expect(h.synchronize).toHaveBeenCalledTimes(1);
 // The edit arms the 1 s debounce; the review starts before it fires and pauses automatic sync.
 await edit();
 await act(async()=>{await h.domain.prepare('delete','health');});
 expect(h.domain.review).toMatchObject({kind:'delete'});
 await afterDebounce();
 expect(h.synchronize).toHaveBeenCalledTimes(1);
 // Closing the review resumes automatic sync, and the next edit syncs again.
 await act(async()=>h.domain.cancel());await edit();await afterDebounce();
 expect(h.synchronize).toHaveBeenCalledTimes(2);
});

test('two of the person\'s own actions still never overlap: a second one while the first runs is ignored',async()=>{
 await open(A);
 const gate=deferred(),entered=deferred();h.prepareDomain.mockImplementationOnce(async(kind:string,domain:string)=>{entered.resolve();await gate.promise;return review(kind,domain);});
 let first!:Promise<void>;await act(async()=>{first=h.domain.prepare('delete','health');await entered.promise;});
 await act(async()=>{await h.domain.prepare('restore','health');});
 expect(h.prepareDomain).toHaveBeenCalledTimes(1);
 await act(async()=>{gate.resolve();await first;});
 expect(h.domain.review).toMatchObject({kind:'delete'});
});

test('an action waiting for an automatic sync is dropped when the account locks meanwhile',async()=>{
 await open(A);
 const release=await holdAutomaticSync();
 let asked!:Promise<void>;await act(async()=>{asked=h.domain.prepare('delete','health');});
 await act(async()=>lockAccount());
 await act(async()=>{release.resolve();await asked;});
 expect(h.prepareDomain).not.toHaveBeenCalled();
});
