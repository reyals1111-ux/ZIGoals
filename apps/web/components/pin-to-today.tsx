'use client';
import {useState,type ReactNode} from 'react';
import {CardOptions} from './card-options';
import {DASHBOARD_SETTINGS_KEY,dashboardSettingsSchema,emptyDashboardSettings,removeWidget,saveWidget,type WidgetKind} from '../lib/dashboard-settings';
import {showUndo} from './ui/undo-toast';
import {usePrivateStore} from './use-private-store';
import {AskZigiItem} from './ai/ask-zigi-item';
import {plainErrorMessage} from '../lib/plain-error';

export type PinChoice={kind:WidgetKind;metric:string;entity?:string;label:string;/** Session AH (GO8, D-210): the menu's short words ("progress"), when the card's name already says whose */menu?:string};
/** `askName` (Session V Part 9): the record's own name, so "Ask ZIGi about this" can name a goal; cards without one get no such item when the question needs it.
 *  `extra` (Session Z-Cloud Part 4.10): the card's own further items, such as a habit's "Ask ZIGi about this habit". */
/** `menuName` (Session AL, MO-153): the ⋯ menu's own name when the card is not "today" (a past journal day's meal), while
 *  `label` and the choices keep naming the Today widget, which always shows today. */
/** `askAs` (Session AL fifth pass, NB-175): what "Ask ZIGi" asks about when no Today card is offered (a completed goal). */
export function PinToToday({label,menuName,choices,askName,extra,askAs}:{label:string;menuName?:string;choices:readonly PinChoice[];askName?:string;extra?:ReactNode;askAs?:PinChoice}){
 const settings=usePrivateStore(DASHBOARD_SETTINGS_KEY,dashboardSettingsSchema,emptyDashboardSettings);
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 async function add(choice:PinChoice){setBusy(true);setMessage('');try{
  if(!settings.loaded||settings.error)throw Error('Today settings need recovery in Settings.');
  const id=crypto.randomUUID();
  await settings.update(latest=>saveWidget(latest,{id,kind:choice.kind,metric:choice.metric,...(choice.entity?{entity:choice.entity}:{}),title:'',size:'compact',hidden:false,revision:1}));
  setMessage(`${choice.label} added to Today.`);
  // Session AO (D-037): the app's one toast also offers the way to Today and an Undo that takes the new card off again.
  showUndo({message:`${choice.label} added to Today.`,undone:'Taken off Today.',link:{href:'/app',label:'Open Today'},restore:()=>settings.update(latest=>removeWidget(latest,id))});
 }catch(e){setMessage(plainErrorMessage(e, 'Could not add this card to Today.'));}finally{setBusy(false);}}
 return <div className="pin-to-today"><CardOptions label={menuName??label}>{choices.map(choice=><button key={`${choice.kind}:${choice.entity??''}:${choice.metric}`} type="button" disabled={busy||!settings.loaded||!!settings.error} onClick={()=>void add(choice)} aria-label={`Add ${choice.label} to Today`}>Add {choice.menu??choice.label} to Today</button>)}{(ask=>ask&&<AskZigiItem kind={ask.kind} metric={ask.metric} name={askName}/>)(choices[0]??askAs)}{extra}</CardOptions>{message&&<p role="status" className="pin-to-today-status">{message}</p>}</div>;
}
