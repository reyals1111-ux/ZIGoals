// @vitest-environment jsdom
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {emptyPlatform,privateGoalSchema,type Platform} from '../positions';
import {ContributionFlow} from '../../components/platform/contribution-flow';

// Session AO (DV-010c, NB-253): "I saved 200" in Fund Goal is two screens: the Cash form (the amount, asked once) with
// "Preview contribution", then the preview with "Confirm & fund Goal". Nothing is written before Confirm; the Cash form's
// refusals stay; Back opens the details form (note, plan match, another amount); other kinds keep their details step.
const now=Date.parse('2026-11-13T12:00:00Z');
vi.mock('../../components/platform/use-market-quotes',()=>({useMarketQuotes:()=>({quotes:[],now,loading:false,error:null,refresh:async()=>{}})}));
vi.mock('../../components/platform/use-market-insights',()=>({useMarketInsights:()=>({entries:[],results:{},now,loading:false,error:null})}));
vi.mock('../../components/platform/use-evidence-now',()=>({useEvidenceNow:()=>now}));
const goal=privateGoalSchema.parse({id:'91',name:'Fictional fund',type:'VALUE',status:'active',asset:'USD',denom:'USD',decimals:2,target:'100000',notes:'',createdAt:'2026-11-01T09:00:00.000Z',milestones:[]});
let container:HTMLDivElement,root:Root,data:Platform,writes:Platform[];
beforeEach(()=>{vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};data={...emptyPlatform(),goals:[goal]};writes=[];container=document.createElement('div');document.body.append(container);root=createRoot(container);});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();vi.unstubAllGlobals();});
const update=async(fn:(s:Platform)=>Platform)=>{data=fn(data);writes.push(data);};
const render=()=>act(async()=>root.render(createElement(ContributionFlow,{data,goal,quotes:[],update,onClose:()=>{},onSaved:()=>{}})));
const button=(name:string)=>[...container.querySelectorAll('button')].find(b=>b.textContent?.trim()===name);
const click=(name:string)=>act(async()=>{button(name)!.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
async function submitCash(amount:string){
 const form=container.querySelector<HTMLFormElement>('.asset-picker form')!;form.querySelector<HTMLInputElement>('input[name="quantity"]')!.value=amount;
 await act(async()=>{form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
}

it('Cash: the amount, then "Preview contribution" opens the preview; Confirm writes one contribution of that amount', async () => {
 await render();
 expect(container.querySelector('[aria-label="Asset categories"] [aria-pressed="true"]')?.textContent).toBe('Cash');
 expect(button('Preview contribution')).toBeDefined();expect(button('Continue with this asset')).toBeUndefined();
 await submitCash('200');
 expect(container.querySelector('.funding-preview')?.textContent).toContain('REVIEW YOUR CONTRIBUTION');
 expect(container.querySelector('.funding-preview .picker-selected h3')?.textContent).toMatch(/^200(\.00)? USD$/);
 expect(writes).toEqual([]);
 await click('Confirm & fund Goal');
 expect(writes).toHaveLength(1);
 expect(data.contributions).toHaveLength(1);
 const [entry]=data.contributions;expect(entry).toMatchObject({goalId:'91',direction:'IN'});expect(entry!.note).toBeUndefined();
 expect(data.positions).toHaveLength(1);expect(data.positions[0]).toMatchObject({assetClass:'Cash',asset:'USD'});
});

it('Cash: a refused amount stays on the Cash form, under its field, and nothing is previewed or written', async () => {
 await render();
 await submitCash('0');
 expect(container.querySelector('.funding-preview')).toBeNull();
 expect(container.textContent).toContain('Enter an amount above 0.');
 expect(container.querySelector('input[name="quantity"]')?.getAttribute('aria-invalid')).toBe('true');
 expect(writes).toEqual([]);
});

it('Back from the cash preview opens the details form, with the amount once, a note and Preview contribution', async () => {
 await render();
 await submitCash('200');
 await click('Back');
 expect(container.querySelector('.funding-preview')).toBeNull();
 expect(container.textContent).toContain('the amount you entered for this asset');
 expect(container.querySelector('input[name="note"]')).not.toBeNull();
 expect(button('Preview contribution')).toBeDefined();
 expect(writes).toEqual([]);
});

it('other kinds keep their details step: Property continues with the asset, not to the preview', async () => {
 await render();
 await click('Property');
 expect(button('Continue with this asset')).toBeDefined();expect(button('Preview contribution')).toBeUndefined();
});
