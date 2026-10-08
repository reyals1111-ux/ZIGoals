import {WIDGET_CATALOG,type WidgetKind} from './dashboard-settings';
import type {Position} from './positions';
import {HEALTH_MEALS} from './health';
import {habitRuleOn} from './habits';
import {DIRECTORY_NAMES} from '@zigoals/ecosystem-registry/directory-names';
import {stakingWidgetSource,type DashboardSources} from './dashboard-metrics';
import {plural} from './plural';

/** Only canonical, safe selectors can become Today widgets. */
export const WIDGET_GROUPS=[
 {id:'goals',label:'Goals',icon:'goals',kinds:['goals','goal','milestone']},
 {id:'habits',label:'Habits',icon:'habits',kinds:['habits','habit','streak','checkins']},
 {id:'health',label:'Health',icon:'health',kinds:['health','meal','food-entry','exercise','sleep','meditation']},
 {id:'wealth',label:'Wealth & Positions',icon:'wallet',kinds:['wealth','asset','staking','allocation','holding-share']},
 {id:'ecosystem',label:'Ecosystem',icon:'ecosystem',kinds:['ecosystem']},
 // Session W Part 14: skills ZIGoals follows from a public source; Chess first.
 {id:'skills',label:'Skills',icon:'chess',kinds:['chess']},
 // Session W Part 20: the music player's widget.
 {id:'music',label:'Music',icon:'music',kinds:['music']},
] as const satisfies readonly {id:string;label:string;icon:string;kinds:readonly WidgetKind[]}[];

export const WIDGET_DESCRIPTIONS:Record<WidgetKind,string>={
 goals:'Your active destinations and completed steps',goal:'Progress or next contribution for one Goal',
 habits:'The daily rhythm across your Habits',habit:'Today or streak for one saved Habit',
 'food-entry':'One saved diary entry, including its original date and serving',meal:'Breakfast, lunch, dinner or snacks for the current Health day',
 health:'Meals, water, activity and measurements',wealth:'Known value in one currency',
 asset:'Quantity, value or availability for one asset',staking:'Verified read-only stake or rewards',
 allocation:'Allocated and unallocated amounts for one Position',ecosystem:'Official research directory shortcut',
 milestone:'The nearest saved target date across active Goals',streak:'Your longest current streak across Habits',
 checkins:'Recorded check-ins over the last 7 days','holding-share':'Your largest holding within its own currency',
 exercise:'Today’s quick exercise counters, each in its own count',
 // Session W kinds (settings v3 only); each joins WIDGET_GROUPS in the part that builds its card.
 sleep:'Last night’s sleep or your week of nights',meditation:'Mindful minutes today or this week',
 chess:'Your chess.com and Lichess ratings',links:'Your own links as buttons',music:'Your soundtrack: ambient sounds or your music app',
};

export function eligibleWidgetSources(kind:WidgetKind,s:DashboardSources):{id:string;label:string}[]{
 if(kind==='food-entry')return [...s.health.diary].sort((a,b)=>b.date.localeCompare(a.date)||a.createdAt.localeCompare(b.createdAt)).map(entry=>({id:entry.id,label:`${entry.snapshot.name} · ${entry.date} · ${entry.meal} · ${entry.quantityMilli/1000} ${plural(entry.quantityMilli/1000,'serving')}`}));
 if(kind==='meal')return HEALTH_MEALS.map(meal=>({id:meal,label:`${meal} today`}));
 if(kind==='goal')return s.goals.filter(g=>g.status!=='closed').map(g=>({id:g.key,label:`${g.name} · ${g.source}`}));
 if(kind==='habit')return s.habits.habits.filter(h=>habitRuleOn(h,s.today)?.state!=='archived').map(h=>({id:h.id,label:h.title}));
 if(kind==='asset'||kind==='allocation'||kind==='staking')return s.platform.positions.filter((p:Position)=>!p.archivedAt&&(kind!=='staking'||stakingWidgetSource(p))).map(p=>({id:p.id,label:`${p.providerId} · ${p.asset} · ${p.network}`}));
 if(kind==='ecosystem')return Object.entries(DIRECTORY_NAMES).map(([id,entry])=>({id,label:entry.name}));
 return [];
}

export function widgetNeedsSource(kind:WidgetKind){return ['goal','habit','asset','staking','allocation','food-entry','meal'].includes(kind);}
export function selectableWidgetKinds(s:DashboardSources,ready:(domain:string)=>boolean){
 return (Object.keys(WIDGET_CATALOG) as WidgetKind[]).filter(kind=>!widgetNeedsSource(kind)||!ready(WIDGET_CATALOG[kind].domain)||eligibleWidgetSources(kind,s).length>0);
}
