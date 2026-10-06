'use client';
import {useState} from 'react';
import {CardOptions} from './card-options';
import {DASHBOARD_SETTINGS_KEY,dashboardSettingsSchema,emptyDashboardSettings,saveWidget,type WidgetKind} from '../lib/dashboard-settings';
import {usePrivateStore} from './use-private-store';
import {AskZigiItem} from './ai/ask-zigi-item';

export type PinChoice={kind:WidgetKind;metric:string;entity?:string;label:string};
/** `askName` (Session V Part 9): the record's own name, so "Ask ZIGi about this" can name a goal; cards without one get no such item when the question needs it. */
export function PinToToday({label,choices,askName}:{label:string;choices:readonly PinChoice[];askName?:string}){
 const settings=usePrivateStore(DASHBOARD_SETTINGS_KEY,dashboardSettingsSchema,emptyDashboardSettings);
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 async function add(choice:PinChoice){setBusy(true);setMessage('');try{
  if(!settings.loaded||settings.error)throw Error('Today settings need recovery in Settings.');
  await settings.update(latest=>saveWidget(latest,{id:crypto.randomUUID(),kind:choice.kind,metric:choice.metric,...(choice.entity?{entity:choice.entity}:{}),title:'',size:'compact',hidden:false,revision:1}));
  setMessage(`${choice.label} added to Today.`);
 }catch(e){setMessage(e instanceof Error?e.message:'Could not add this card to Today.');}finally{setBusy(false);}}
 return <div className="pin-to-today"><CardOptions label={label}>{choices.map(choice=><button key={`${choice.kind}:${choice.entity??''}:${choice.metric}`} type="button" disabled={busy||!settings.loaded||!!settings.error} onClick={()=>void add(choice)}>Add {choice.label} to Today</button>)}{choices[0]&&<AskZigiItem kind={choices[0].kind} metric={choices[0].metric} name={askName}/>}</CardOptions>{message&&<p role="status" className="pin-to-today-status">{message}</p>}</div>;
}
