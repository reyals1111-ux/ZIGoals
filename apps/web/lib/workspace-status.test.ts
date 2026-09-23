// @vitest-environment jsdom
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,expect,test,vi} from 'vitest';
import {WorkspaceStatus} from '../components/workspace-status';
import {activateAccount,clearAccountSession,unlockAccount} from './account-session';
const {status}=vi.hoisted(()=>({status:{opened:false,busy:false,message:'',error:'',last:'',account:null as string|null}}));
vi.mock('../components/vault-sync-controls',()=>({useVaultStatus:()=>status}));
(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
let root:Root|undefined;
afterEach(async()=>{await act(async()=>root?.unmount());root=undefined;clearAccountSession();Object.assign(status,{opened:false,busy:false,message:'',error:'',last:'',account:null});vi.unstubAllGlobals();});
test('shell status follows local, locked, syncing, acknowledged, offline and error states without exposing identity',async()=>{
 const element=document.createElement('div');root=createRoot(element);const render=()=>act(async()=>root!.render(createElement(WorkspaceStatus)));
 await render();expect(element.textContent).toContain('This device only');
 const account='10000000-0000-4000-8000-000000000001';await act(async()=>activateAccount(account));expect(element.textContent).toContain('Account locked');expect(element.textContent).not.toContain(account);
 await act(async()=>unlockAccount());Object.assign(status,{opened:true,account,busy:true});await render();expect(element.textContent).toContain('Syncing');
 Object.assign(status,{busy:false,last:'12:34'});await render();expect(element.textContent).toContain('12:34');
 await act(async()=>window.dispatchEvent(new Event('zigoals:private-change')));expect(element.textContent).toContain('Changes saved on this device');
 vi.spyOn(navigator,'onLine','get').mockReturnValue(false);await act(async()=>window.dispatchEvent(new Event('offline')));expect(element.textContent).toContain('Offline');
 Object.assign(status,{error:'private internal detail'});await render();expect(element.textContent).toContain('Sync needs attention');expect(element.textContent).not.toContain('private internal detail');expect(element.querySelector('a')?.getAttribute('href')).toBe('/app/settings#encrypted-sync');
});
test('an unreadable account selector stays locked and does not crash the shell status',async()=>{
 sessionStorage.setItem('zigoals:account:selector:v1','broken');const element=document.createElement('div');root=createRoot(element);await act(async()=>root!.render(createElement(WorkspaceStatus)));expect(element.textContent).toContain('Account selection needs attention');expect(element.textContent).not.toContain('This device only');
});
