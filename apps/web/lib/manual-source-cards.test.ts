// @vitest-environment jsdom
import {act,createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {ManualSourceCards} from '../components/platform/manual-source-cards';

(globalThis as typeof globalThis&{IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
afterEach(()=>{document.body.replaceChildren();vi.unstubAllGlobals();});

it('makes automatic versus manual valuation explicit while preserving the manual category flow',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({assets:[],error:null}),{status:200,headers:{'content-type':'application/json'}})));
 const container=document.createElement('div');document.body.append(container);const root=createRoot(container);
 await act(async()=>{root.render(createElement(ManualSourceCards,{update:async()=>{},onSaved:()=>{}}));});
 const buttons=[...container.querySelectorAll('button')];
 expect(buttons.map(button=>button.textContent)).toEqual(expect.arrayContaining([expect.stringContaining('Automatic prices'),expect.stringContaining('Manual value'),expect.stringContaining('Cash')]));
 const automatic=buttons.find(button=>button.textContent?.includes('Automatic prices'))!;
 await act(async()=>{automatic.click();await Promise.resolve();});
 expect(container.textContent).toContain('Choose the exact asset');
 expect(container.textContent).toContain('Only the public identity and quote currency are requested');
 await act(async()=>root.unmount());
});
