import {modules,validateData} from './account-data';
import {DOMAINS,type Domain,type PrivateData} from './cloud-sync';
export type AttachPlan={data:PrivateData;domains:Domain[];inventory:{domain:Domain;bytes:number;collections:Record<string,number>}[]};
function empty(domain:Domain,raw:string|undefined){if(raw===undefined)return true;const m=modules[domain];return JSON.stringify(m.schema.parse(JSON.parse(raw)))===JSON.stringify(m.schema.parse(m.empty()));}
/** Copy only explicitly selected local sections into empty account sections. Never replace or guess a merge. */
export function planLocalAttach(source:PrivateData,account:PrivateData,remote:PrivateData,selected:readonly Domain[],healthConsent:boolean):AttachPlan{
 if(!selected.length||new Set(selected).size!==selected.length||selected.some(d=>!DOMAINS.includes(d)))throw Error('Choose one or more different sections to copy.');
 if(selected.includes('health')&&!healthConsent)throw Error('Enable separate Health sync permission before including Health.');
 const data:PrivateData={},inventory:AttachPlan['inventory']=[];
 for(const domain of selected){
  if(!empty(domain,account[domain])||!empty(domain,remote[domain]))throw Error(`${domain} already contains account records. Export both copies and review them; this copy cannot replace them.`);
  const raw=source[domain];if(raw===undefined)continue;
  validateData({[domain]:raw});data[domain]=raw;
  const collections:Record<string,number>={};
  const inspect=(value:unknown,path:string)=>{if(Array.isArray(value)){if(value.length===0||value.every(v=>v!==null&&typeof v==='object')){collections[path]=(collections[path]??0)+value.length;for(const row of value)inspect(row,path);}}else if(value&&typeof value==='object'){for(const [k,v]of Object.entries(value))inspect(v,path?`${path}.${k}`:k);}};
  inspect(JSON.parse(raw),'');inventory.push({domain,bytes:new TextEncoder().encode(raw).length,collections});
 }
 if(!inventory.length)throw Error('No saved local records exist in those sections. Keep using your account or choose another section.');
 return {data,domains:inventory.map(v=>v.domain),inventory};
}
export function assertAttachSourceUnchanged(plan:AttachPlan,current:PrivateData){for(const domain of plan.domains)if(current[domain]!==plan.data[domain])throw Error('Local records changed after review. Prepare a new protected copy; nothing was replaced.');}
