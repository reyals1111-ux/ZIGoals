import {latestWeightObservation} from './body-measurements';
/** Presentation only: every value resolves from the domain's canonical selector. */
import {formatUnits} from '@zigoals/chain-config';
import {allocationBalance,positionSync,type Position,type Platform} from './positions';
import {wealthOverview} from './wealth';
import {formatGoalAmount,progressText,type GoalSummary} from './goal-summary';
import {habitCalendarDay,habitDay,habitRuleOn,habitStats,measurementUnit,type HabitData} from './habits';
import {HEALTH_MEALS,scaleNutrition,summarizeNutrition,nutritionSummaryText,dailyHealthSummary,type HealthData} from './health';
import {dailyData,waterSummary} from './health-daily';
import type {MarketQuote} from './market-quotes';
import {formatExactNumber,formatNumber} from './visual-format';
import {plural,unitFor} from './plural';
import {WIDGET_CATALOG,type DashboardWidget} from './dashboard-settings';
import {directoryEntries} from '@zigoals/ecosystem-registry/providers';
import {nutritionDashboard,habitConsistency} from './life-intelligence';
import {countOn,exerciseData} from './health-counters';
import {splitWealthTotals} from './wealth-total';
export type DashboardSources={platform:Platform;goals:GoalSummary[];habits:HabitData;health:HealthData;quotes:readonly MarketQuote[];now:number;today:string;healthDate:string};
export type WidgetMetric={title:string;value:string;detail:string;href:string;warning?:string;missing?:boolean;percent?:string;complete?:boolean;facts?:{label:string;value:string}[]};
const labels:Record<string,string>={kcal:'Meals today',macros:'Macros today',water:'Water today',weight:'Latest weight',steps:'Steps today',activity:'Activity today',history:'30-day nutrition rhythm','history-USD':'Recorded USD wealth','history-EUR':'Recorded EUR wealth',progress:'Goal progress','next-contribution':'Next contribution',today:'Habit today',streak:'Habit streak',quantity:'Quantity',value:'Current value',available:'Available quantity',allocation:'Allocation summary',next:'Next milestone',best:'Best current streak',week:'Last 7 days',top:'Largest holding',counts:'Counts today','macros-ring':'Calories and macros'};
export const widgetMetricLabel=(metric:string)=>labels[metric]??metric;
export function stakingWidgetSource(p:Position){return ['NATIVE_STAKING','NATIVE_REWARDS','NATIVE_UNBONDING'].includes(p.sourceType)&&p.verification==='VERIFIED_READ_ONLY';}
export function widgetMetric(widget:DashboardWidget,s:DashboardSources):WidgetMetric{
 const habitToday=s.habits.timeZone?habitCalendarDay(s.habits,new Date(s.now)):s.today;
 const defaults={title:widget.title||WIDGET_CATALOG[widget.kind].label,value:'Unavailable',detail:'',href:'/app/settings'};
 const unavailable=(href:string,detail:string)=>({...defaults,value:'Record unavailable',detail,href,missing:true});
 // UI design pass widgets: real records only; units and currencies stay separate; no entry is never zero.
 if(widget.kind==='milestone'){
  const next=s.goals.filter(g=>g.status==='active'&&g.targetDate&&g.targetDate>=s.today).sort((a,b)=>a.targetDate!.localeCompare(b.targetDate!)||a.name.localeCompare(b.name))[0];
  if(!next)return {...defaults,title:widget.title||'Next Goal milestone',value:'No upcoming target date',detail:'Save a target date on a Goal to see it here.',href:'/app/goals'};
  const days=Math.round((Date.parse(`${next.targetDate}T00:00:00Z`)-Date.parse(`${s.today}T00:00:00Z`))/86400000);
  // QA-37/38 (Session I, Part 10): progress that is a lower bound or unknown is said so, never drawn as exact.
  const remaining=next.heldAsset||next.progressBound==='unavailable'?'Unknown':next.remaining!==undefined?`${next.progressBound==='at-least'?'At most ':''}${formatGoalAmount(next.remaining,next.currency)}`:'Not available';
  return {...defaults,title:widget.title||'Next Goal milestone',value:next.name,detail:`Target date ${next.targetDate} · saved in your plan`,href:next.href,percent:next.progressBound?undefined:next.progressPct,complete:false,facts:[{label:'Days to the target date',value:formatNumber(days)},...(next.progressBound?[{label:'Progress',value:progressText(next.progressPct,next.progressBound)}]:[]),{label:next.currency==='milestones'?'Milestones left':'Remaining',value:remaining}]};
 }
 if(widget.kind==='streak'||widget.kind==='checkins'){
  const active=s.habits.habits.filter(h=>habitRuleOn(h,habitToday)?.state!=='archived');
  if(!active.length)return {...defaults,title:widget.title||WIDGET_CATALOG[widget.kind].label,value:'No Habits yet',detail:'Create a Habit to start a pattern.',href:'/app/habits'};
  if(widget.kind==='checkins'){
   const week=habitConsistency(active,habitToday).week,total=week.reduce((n,d)=>n+d.checkins,0),days=week.filter(d=>d.checkins>0).length;
   return {...defaults,title:widget.title||'This week’s check-ins',value:`${formatNumber(total)} check-in${total===1?'':'s'}`,detail:`Last 7 days · ${days} of 7 days with a check-in`,href:'/app/habits'};
  }
  const ranked=active.map(h=>({habit:h,stats:habitStats(h,habitToday)})).sort((a,b)=>b.stats.currentStreak-a.stats.currentStreak||a.habit.title.localeCompare(b.habit.title));
  const top=ranked[0]!;
  if(!top.stats.currentStreak)return {...defaults,title:widget.title||'Best current streak',value:'No current streak',detail:'Your next completed check-in starts one.',href:'/app/habits'};
  return {...defaults,title:widget.title||'Best current streak',value:`${top.stats.currentStreak} ${top.stats.currentStreak===1?top.stats.streakUnit.replace(/s$/,''):top.stats.streakUnit}`,detail:`${top.habit.title} · current streak in natural periods`,href:'/app/habits',facts:[{label:'Best streak for this Habit',value:`${top.stats.bestStreak} ${top.stats.streakUnit}`}]};
 }
 if(widget.kind==='holding-share'){
  const wealth=wealthOverview(s.platform,s.now,s.quotes),{primary}=splitWealthTotals(wealth.subtotals);
  if(!primary||primary.value<=0n)return {...defaults,title:widget.title||'Top holding share',value:wealth.rows.length?'Needs valuation':'No valued assets yet',detail:'Shares use known values in one currency only.',href:'/app/wealth',missing:!!wealth.rows.length};
  const rows=wealth.rows.filter(r=>r.currency===primary.currency&&r.value!==undefined).sort((a,b)=>a.value!>b.value!?-1:a.value!<b.value!?1:0),top=rows[0]!;
  const pct=Number(top.value!*10000n/primary.value)/100,incomplete=wealth.rows.some(r=>r.value===undefined);
  return {...defaults,title:widget.title||'Top holding share',value:`${formatNumber(pct, {maximumFractionDigits:1})}%`,detail:`${top.position.providerId} · of known ${primary.currency} value · other currencies not included`,href:`/app/wealth/asset/${encodeURIComponent(top.position.id)}`,percent:String(pct),complete:false,warning:incomplete?'Valuation coverage is incomplete. Assets without a value are left out.':undefined};
 }
 if(widget.kind==='exercise'){
  const counters=exerciseData(s.health).counters,counts=counters.map(c=>({c,n:countOn(s.health,c.id,s.healthDate)})),logged=counts.filter(x=>x.n!==null).length;
  return {...defaults,title:widget.title||'Exercise counters today',value:counters.length?`${logged} of ${counters.length} counted`:'No counters',detail:`${s.healthDate} · each exercise counted on its own`,href:'/app/health',facts:counts.map(({c,n})=>({label:c.name,value:n===null?'No entry':formatNumber(n)}))};
 }
 if(widget.kind==='goals')return {...defaults,title:widget.title||'Your destinations',value:`${s.goals.filter(g=>g.status==='active').length} active Goals`,detail:`${s.goals.filter(g=>g.status==='completed').length} completed · recorded progress`,href:'/app/goals'};
 if(widget.kind==='goal'){
  const goal=s.goals.find(g=>g.key===widget.entity);if(!goal)return unavailable('/app/goals','This Goal may be archived or outside the current account. Choose another or remove this widget.');
  return {...defaults,title:widget.title||goal.name,value:widget.metric==='next-contribution'?goal.nextContributionDate??'Not scheduled':goal.progressBound==='unavailable'&&!goal.heldAsset?'Value unavailable':`${goal.progressBound==='at-least'?'At least ':''}${formatGoalAmount(goal.current,goal.heldAsset??goal.currency)}`,detail:widget.metric==='next-contribution'?goal.metadata.find(m=>m.label==='Contribution plan')?.value??'Open the Goal to set a plan.':`of ${goal.target?formatGoalAmount(goal.target,goal.currency):'no target'} · ${goal.source}`,href:goal.href,percent:widget.metric==='progress'&&!goal.requiresReview&&!goal.progressBound?goal.progressPct:undefined,complete:goal.status==='completed',warning:goal.status==='closed'?'Closed Goal · retained for your history':goal.requiresReview||goal.heldAsset?goal.valuationLabel??'Progress needs review':undefined};
 }
 if(widget.kind==='habits'){
  const due=s.habits.habits.filter(h=>habitDay(h,habitToday,habitToday).scheduled),complete=due.filter(h=>habitDay(h,habitToday,habitToday).status==='complete');
  return {...defaults,value:due.length?`${complete.length} of ${due.length} complete`:'No Habits due today',detail:'Your natural schedule and current rules',href:'/app/habits'};
 }
 if(widget.kind==='habit'){
  const habit=s.habits.habits.find(h=>h.id===widget.entity);if(!habit)return unavailable('/app/habits','This Habit is unavailable. Choose another or remove this widget.');
  const day=habitDay(habit,habitToday,habitToday),rule=habitRuleOn(habit,habitToday),stats=widget.metric==='streak'?habitStats(habit,habitToday):undefined;
  return {...defaults,title:widget.title||habit.title,value:stats?`${stats.currentStreak} ${unitFor(stats.currentStreak,stats.streakUnit)}`:`${formatNumber(day.count)}${rule?` ${unitFor(day.count,measurementUnit(rule))}`:''}`,detail:stats?'Current streak · natural periods':`${day.status.replaceAll('-',' ')} · target ${formatNumber(day.target)}${rule?` ${unitFor(day.target,measurementUnit(rule))}`:''}`,href:'/app/habits',warning:day.status==='archived'||day.status==='paused'?`Habit ${day.status}`:undefined};
 }
 if(widget.kind==='food-entry'||widget.kind==='meal'){
  const entry=widget.kind==='food-entry'?s.health.diary.find(row=>row.id===widget.entity):undefined;
  if(widget.kind==='food-entry'&&!entry)return unavailable('/app/health','This diary entry was removed or is unavailable for this account. Choose another entry or remove this widget.');
  if(widget.kind==='meal'&&!(HEALTH_MEALS as readonly string[]).includes(widget.entity??''))return unavailable('/app/health','Choose a supported meal.');
  const meal=entry?.meal??widget.entity!,date=entry?.date??s.healthDate;
  const summary=dailyHealthSummary({...s.health,diary:s.health.diary.filter(row=>row.meal===meal)},date),nutrients=entry?scaleNutrition(entry.snapshot.nutrients,entry.quantityMilli):summary.nutrients,count=entry?1:summary.entries,nutrition=entry?summarizeNutrition([nutrients]):summary;
  return {...defaults,title:widget.title||(entry?entry.snapshot.name:`${meal} today`),value:count?widget.metric==='macros'?nutritionSummaryText(nutrition,"proteinMg","g protein",1000):nutritionSummaryText(nutrition,"kcal","kcal"):'No meals recorded',
   detail:`${date} · ${meal} · ${entry?`${entry.quantityMilli/1000} ${plural(entry.quantityMilli/1000,'serving')} · saved diary entry`:`${count} ${plural(count,'entry','entries')} · current Health day`}${count&&widget.metric==='macros'?` · ${nutritionSummaryText(nutrition,"carbsMg","g carbs",1000)} · ${nutritionSummaryText(nutrition,"fatMg","g fat",1000)}`:''}`,
   href:`/app/health?date=${date}#${entry?`entry-${entry.id}`:`diary-${meal.toLowerCase()}`}`};
 }
 if(widget.kind==='health'){
  const summary=dailyHealthSummary(s.health,s.healthDate),common={...defaults,title:widget.title||widgetMetricLabel(widget.metric),detail:`${s.healthDate} · manually logged`,href:'/app/health'};
  if(widget.metric==='macros-ring'){const target=s.health.targets.kcal,kcal=summary.nutrients.kcal;if(!summary.entries)return {...common,value:'No meals recorded',detail:'Log a meal to start your day.'};return {...common,value:nutritionSummaryText(summary,'kcal','kcal'),detail:target?`Personal target ${formatNumber(target)} kcal · ${s.healthDate}`:`${s.healthDate} · no calorie target set`,...(target&&kcal!==null?{percent:String(Math.min(100,kcal/target*100)),complete:false}:{}),facts:[{label:'Protein',value:nutritionSummaryText(summary,'proteinMg','g',1000)},{label:'Carbs',value:nutritionSummaryText(summary,'carbsMg','g',1000)},{label:'Fat',value:nutritionSummaryText(summary,'fatMg','g',1000)}]};}
  if(widget.metric==='kcal')return {...common,value:summary.entries?nutritionSummaryText(summary,"kcal","kcal"):'No meals recorded',detail:`${summary.entries} meals & snacks · ${s.healthDate}`};
  if(widget.metric==='macros')return {...common,value:summary.entries?nutritionSummaryText(summary,"proteinMg","g protein",1000):'No meals recorded',detail:summary.entries?`${nutritionSummaryText(summary,"carbsMg","g carbs",1000)} · ${nutritionSummaryText(summary,"fatMg","g fat",1000)}`:'Log a meal to start your day.'};
  if(widget.metric==='water'){const water=waterSummary(s.health,s.healthDate);return {...common,value:water.entries?`${formatNumber(water.millilitres)} mL`:'No water recorded',detail:water.targetMl?`Personal target ${formatNumber(water.targetMl)} mL · ${s.healthDate}`:`${s.healthDate} · no target set`};}
  if(widget.metric==='weight'){const latest=latestWeightObservation(s.health,s.healthDate),unit=dailyData(s.health).preferences.weightUnit;return {...common,value:latest?`${formatNumber((latest.grams/(unit==='lb'?453.59237:1000)), {maximumFractionDigits:3})} ${unit}`:'No measurements yet',detail:latest?latest.detail:'Record a measurement when you choose.'};}
  if(widget.metric==='history'){const rhythm=nutritionDashboard(s.health,s.healthDate);return {...common,title:widget.title||'Your nutrition rhythm',value:rhythm.averageKcal===null?'No logged days':`${formatNumber(rhythm.averageKcal)} kcal`,detail:`${rhythm.loggedDays} of 30 days with entries · average per complete calorie day`,href:'/app/health#nutrition-history'};}
  const recorded=s.health.activity.some(a=>a.date===s.healthDate);return {...common,value:recorded?widget.metric==='steps'?`${formatNumber(summary.steps)} steps`:`${formatNumber(summary.minutes)} minutes`:'No activity recorded'};
 }
 if(widget.kind==='wealth'){
  const wealth=wealthOverview(s.platform,s.now,s.quotes),subtotal=wealth.subtotals.find(t=>t.currency===widget.metric),missing=wealth.rows.some(r=>r.value===undefined),stale=wealth.rows.some(r=>r.currency===widget.metric&&r.stale);
  if(widget.metric.startsWith('history-')){const currency=widget.metric.slice('history-'.length),history=wealth.history.find(h=>h.currency===currency),latest=history?.points.at(-1);return {...defaults,title:widget.title||`Recorded ${currency} wealth`,value:latest?formatGoalAmount(formatUnits(latest.value,2),currency):'No complete history',detail:latest?`${history!.points.length} complete dated observations · latest ${latest.at.slice(0,10)}`:'Earlier values are not inferred from current holdings.',href:'/app/wealth#wealth-history'};}
  return {...defaults,title:widget.title||`Tracked Wealth · ${widget.metric}`,value:subtotal?formatGoalAmount(formatUnits(subtotal.value.toString(),2),widget.metric):'No recorded value',detail:'Known values only · currencies stay separate',href:'/app/wealth',warning:missing?'Valuation coverage is incomplete. Some assets have no value.':stale?'Includes stale evidence. Refresh or review values.':undefined};
 }
 if(widget.kind==='staking'||widget.kind==='allocation'){
  const position=s.platform.positions.find(p=>p.id===widget.entity),href=widget.kind==='staking'?'/app/staking':'/app/wealth';
  if(!position||widget.kind==='staking'&&!stakingWidgetSource(position))return unavailable(href,'The selected Position is unavailable or no longer matches this widget. Choose another record.');
  if(position.archivedAt)return {...unavailable(href,'This Position is archived. Restore it or choose another record.'),title:widget.title||position.providerId};
  const balance=allocationBalance(s.platform,position.id),amount=(raw:string)=>`${formatExactNumber(formatUnits(raw,position.decimals))} ${position.asset}`,sync=positionSync(position,s.now);
  const source=position.sourceType==='NATIVE_STAKING'?'Staked principal':position.sourceType==='NATIVE_REWARDS'?'Unclaimed rewards':position.sourceType==='NATIVE_UNBONDING'?'Unbonding':'Recorded balance';
  const warnings=[balance.deficit!=='0'?'Allocation exceeds this source balance. Review the deficit.':'',sync==='ERROR'?'Last refresh failed. Showing the saved observation.':sync==='STALE'?'Saved observation is stale. Refresh it on Staking.':''];
  return {...defaults,title:widget.title||`${widget.kind==='staking'?source:'Allocations'} · ${position.validator?.name??position.providerId}`,value:amount(position.quantity),href:`/app/wealth/asset/${encodeURIComponent(position.id)}`,
   detail:`Selected Position only · ${source} · ${position.network} · ${position.verification==='MANUAL'?'manual record':'read-only observation'} · ${position.observedAt}${widget.kind==='staking'?` · ${position.liquidity.toLowerCase()} · recorded rewards are not future yield`:'. Unallocated is an accounting amount, not a guarantee of spendable funds.'}`,
   warning:warnings.filter(Boolean).join(' ')||undefined,
   ...(widget.kind==='allocation'?{facts:[{label:'Allocated to Goals',value:amount(balance.allocated)},{label:'Unallocated',value:amount(balance.unallocated)},{label:'Allocation deficit',value:amount(balance.deficit)}]}:{})};
 }
 if(widget.kind==='asset'){
  const position=s.platform.positions.find(p=>p.id===widget.entity);if(!position)return unavailable('/app/wealth','This asset or Position is unavailable. Choose another or remove this widget.');
  if(position.archivedAt)return {...unavailable(`/app/wealth/asset/${encodeURIComponent(position.id)}`,'This asset is archived. Restore it in Wealth to see current values.'),title:widget.title||position.providerId};
  const row=wealthOverview(s.platform,s.now,s.quotes).rows.find(r=>r.position.id===position.id)!;
  const value=widget.metric==='value'?row.value===undefined?'Value unavailable':formatGoalAmount(formatUnits(row.value.toString(),2),row.currency!):`${formatExactNumber(formatUnits(widget.metric==='available'?row.balance.unallocated:position.quantity,position.decimals))} ${position.asset}`;
  return {...defaults,title:widget.title||position.providerId,value,detail:`${widgetMetricLabel(widget.metric)} · ${position.verification==='MANUAL'?'manual':'read-only observation'} · ${position.asset}`,href:`/app/wealth/asset/${encodeURIComponent(position.id)}`,warning:row.balance.deficit!=='0'?'Allocation exceeds the current balance. Review before allocating.':row.stale?'Saved observation needs refresh':widget.metric==='value'&&row.value===undefined?'A price or manual valuation is required.':undefined};
 }
 if(widget.entity){const entry=directoryEntries.find(item=>item.id===widget.entity);if(!entry)return unavailable('/app/ecosystem','This ecosystem research record is unavailable. Choose another official directory entry.');return {...defaults,title:widget.title||entry.name,value:entry.category,detail:'Dated source research · no financial execution',href:`/app/ecosystem#project-${encodeURIComponent(entry.id)}`};}
 return {...defaults,title:widget.title||'Explore the ecosystem',value:'Discover projects',detail:'Research and official links · no financial execution',href:'/app/ecosystem'};
}

export function dashboardIntegrityWarning(data:Platform){return data.positions.some(p=>allocationBalance(data,p.id).deficit!=='0')?'A saved allocation exceeds its current source balance. Review the source before allocating more.':undefined;}
