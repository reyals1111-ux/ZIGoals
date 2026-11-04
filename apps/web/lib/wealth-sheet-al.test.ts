// @vitest-environment jsdom
// Session AL (Tokyo TK-209, TK-216): the Wealth sheet stayed closed after a file was chosen in Import from a CSV file.
import {act,createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {Sheet} from '../components/platform/financial-ui';
(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
it('TK-216: a file input’s bubbling "cancel" never closes the sheet; the dialog’s own cancel (Escape) still does',async()=>{
 const proto=HTMLDialogElement.prototype as unknown as {showModal?:()=>void;close?:()=>void};
 proto.showModal??=function(this:HTMLDialogElement){this.setAttribute('open','');};proto.close??=function(this:HTMLDialogElement){this.removeAttribute('open');};
 const onClose=vi.fn(),host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 // eslint-disable-next-line react/no-children-prop -- Sheet's props type requires children
 await act(async()=>root.render(createElement(Sheet,{title:'Import holdings',onClose,children:createElement('input',{type:'file','aria-label':'CSV file'})})));
 const input=host.querySelector('input[type=file]')!,dialog=host.querySelector('dialog')!;
 await act(async()=>{input.dispatchEvent(new Event('cancel',{bubbles:true}));});
 expect(onClose).not.toHaveBeenCalled();
 await act(async()=>{dialog.dispatchEvent(new Event('cancel',{cancelable:true}));});
 expect(onClose).toHaveBeenCalledTimes(1);
 await act(async()=>root.unmount());host.remove();
});
