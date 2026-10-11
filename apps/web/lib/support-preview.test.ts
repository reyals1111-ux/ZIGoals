// @vitest-environment jsdom
import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
const state=vi.hoisted(()=>({account:'private-account-sentinel',opened:false,busy:false,error:'private-error-sentinel',last:'private-last-sentinel',message:'private-message-sentinel'}));
vi.mock('../components/vault-sync-controls',()=>({useVaultStatus:()=>state}));
import {ConnectionDiagnostics} from '../components/connection-diagnostics';
let root:Root,container:HTMLDivElement;const clipboard=vi.fn();
beforeEach(()=>{vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:clipboard.mockReset().mockResolvedValue(undefined)}});container=document.createElement('div');document.body.append(container);root=createRoot(container);});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();vi.unstubAllGlobals();});
test('support report is reviewed before clipboard access and copies exactly its safe preview',async()=>{
 await act(async()=>root.render(createElement(ConnectionDiagnostics,{chain:'local',owner:'private-wallet-sentinel',balance:'999999999999999999'})));
 const preview=[...container.querySelectorAll('button')].find(button=>button.textContent==='Preview safe diagnostics');expect(preview).toBeDefined();expect(clipboard).not.toHaveBeenCalled();
 await act(async()=>preview!.click());const field=container.querySelector('textarea')!;expect(field).not.toBeNull();expect(field.value).not.toMatch(/private-|999999/);expect(field.value).toContain('Vault: needs attention');expect(field.value).toContain('Connectivity: online');expect(field.value).toContain('Market provider: not checked');expect(clipboard).not.toHaveBeenCalled();
 const text=field.value;await act(async()=>[...container.querySelectorAll('button')].find(button=>button.textContent==='Copy reviewed diagnostics')!.click());expect(clipboard).toHaveBeenCalledExactlyOnceWith(text);
});
test('account change closes the reviewed snapshot before it can be copied',async()=>{
 await act(async()=>root.render(createElement(ConnectionDiagnostics,{chain:'local',owner:'private-wallet-sentinel',balance:'999999999999999999'})));
 await act(async()=>[...container.querySelectorAll('button')].find(button=>button.textContent==='Preview safe diagnostics')!.click());expect(container.querySelector('textarea')).not.toBeNull();
 await act(async()=>window.dispatchEvent(new Event('zigoals:account-change')));expect(container.querySelector('textarea')).toBeNull();expect(clipboard).not.toHaveBeenCalled();
});
