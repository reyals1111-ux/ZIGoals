import {WIDGET_CATALOG,type WidgetKind} from './dashboard-settings';
import type {Position} from './positions';
import {habitRuleOn} from './habits';
import {directoryEntries} from '@zigoals/ecosystem-registry/providers';
import {stakingWidgetSource,type DashboardSources} from './dashboard-metrics';

/** Only canonical, safe selectors can become Today widgets. */
export const WIDGET_GROUPS=[
 {id:'goals',label:'Goals',icon:'goals',kinds:['goals','goal']},
 {id:'habits',label:'Habits',icon:'habits',kinds:['habits','habit']},
 {id:'health',label:'Health',icon:'health',kinds:['health']},
 {id:'wealth',label:'Wealth & Positions',icon:'wallet',kinds:['wealth','asset','staking','allocation']},
 {id:'ecosystem',label:'Ecosystem',icon:'ecosystem',kinds:['ecosystem']},
] as const satisfies readonly {id:string;label:string;icon:string;kinds:readonly WidgetKind[]}[];

export const WIDGET_DESCRIPTIONS:Record<WidgetKind,string>={
 goals:'Your active destinations and completed steps',goal:'Progress or next contribution for one Goal',
 habits:'The daily rhythm across your Habits',habit:'Today or streak for one saved Habit',
 health:'Meals, water, activity and measurements',wealth:'Known value in one currency',
 asset:'Quantity, value or availability for one asset',staking:'Verified read-only stake or rewards',
 allocation:'Allocated and unallocated amounts for one Position',ecosystem:'Official research directory shortcut',
};

export function eligibleWidgetSources(kind:WidgetKind,s:DashboardSources):{id:string;label:string}[]{
 if(kind==='goal')return s.goals.filter(g=>g.status!=='closed').map(g=>({id:g.key,label:`${g.name} · ${g.source}`}));
 if(kind==='habit')return s.habits.habits.filter(h=>habitRuleOn(h,s.today)?.state!=='archived').map(h=>({id:h.id,label:h.title}));
 if(kind==='asset'||kind==='allocation'||kind==='staking')return s.platform.positions.filter((p:Position)=>!p.archivedAt&&(kind!=='staking'||stakingWidgetSource(p))).map(p=>({id:p.id,label:`${p.providerId} · ${p.asset} · ${p.network}`}));
 if(kind==='ecosystem')return directoryEntries.map(entry=>({id:entry.id,label:entry.name}));
 return [];
}

export function widgetNeedsSource(kind:WidgetKind){return ['goal','habit','asset','staking','allocation'].includes(kind);}
export function selectableWidgetKinds(s:DashboardSources,ready:(domain:string)=>boolean){
 return (Object.keys(WIDGET_CATALOG) as WidgetKind[]).filter(kind=>!widgetNeedsSource(kind)||!ready(WIDGET_CATALOG[kind].domain)||eligibleWidgetSources(kind,s).length>0);
}
