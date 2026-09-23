/** Presentation only: every value resolves from the domain's canonical selector. */
import {formatUnits} from '@zigoals/chain-config';
import {allocationBalance,type Platform} from './positions';
import {wealthOverview} from './wealth';
import {formatGoalAmount,type GoalSummary} from './goal-summary';
import {habitDay,habitRuleOn,habitStats,measurementUnit,type HabitData} from './habits';
import {dailyHealthSummary,type HealthData} from './health';
import {dailyData,waterSummary} from './health-daily';
import type {MarketQuote} from './market-quotes';
import {formatExactNumber} from './visual-format';
import {WIDGET_CATALOG,type DashboardWidget} from './dashboard-settings';
export type DashboardSources={platform:Platform;goals:GoalSummary[];habits:HabitData;health:HealthData;quotes:readonly MarketQuote[];now:number;today:string;healthDate:string};
export type WidgetMetric={title:string;value:string;detail:string;href:string;warning?:string;missing?:boolean;percent?:string;complete?:boolean};
const labels:Record<string,string>={kcal:'Meals today',macros:'Macros today',water:'Water today',weight:'Latest weight',steps:'Steps today',activity:'Activity today',progress:'Goal progress','next-contribution':'Next contribution',today:'Habit today',streak:'Habit streak',quantity:'Quantity',value:'Current value',available:'Available quantity'};
export const widgetMetricLabel=(metric:string)=>labels[metric]??metric;
export function widgetMetric(widget:DashboardWidget,s:DashboardSources):WidgetMetric{
 const defaults={title:widget.title||WIDGET_CATALOG[widget.kind].label,value:'Unavailable',detail:'',href:'/app/settings'};
 const unavailable=(href:string,detail:string)=>({...defaults,value:'Record unavailable',detail,href,missing:true});
 if(widget.kind==='goals')return {...defaults,title:widget.title||'Your destinations',value:`${s.goals.filter(g=>g.status==='active').length} active Goals`,detail:`${s.goals.filter(g=>g.status==='completed').length} completed · recorded progress`,href:'/app/goals'};
 if(widget.kind==='goal'){
  const goal=s.goals.find(g=>g.key===widget.entity);if(!goal)return unavailable('/app/goals','This Goal may be archived or outside the current account. Choose another or remove this widget.');
  return {...defaults,title:widget.title||goal.name,value:widget.metric==='next-contribution'?goal.nextContributionDate??'Not scheduled':formatGoalAmount(goal.current,goal.currency),detail:widget.metric==='next-contribution'?goal.metadata.find(m=>m.label==='Contribution plan')?.value??'Open the Goal to set a plan.':`of ${goal.target?formatGoalAmount(goal.target,goal.currency):'no target'} · ${goal.source}`,href:goal.href,percent:widget.metric==='progress'&&!goal.requiresReview?goal.progressPct:undefined,complete:goal.status==='completed',warning:goal.status==='closed'?'Closed Goal · retained for your history':goal.requiresReview?goal.valuationLabel??'Progress needs review':undefined};
 }
 if(widget.kind==='habits'){
  const due=s.habits.habits.filter(h=>habitDay(h,s.today,s.today).scheduled),complete=due.filter(h=>habitDay(h,s.today,s.today).status==='complete');
  return {...defaults,value:due.length?`${complete.length} of ${due.length} complete`:'No Habits due today',detail:'Your natural schedule and current rules',href:'/app/habits'};
 }
 if(widget.kind==='habit'){
  const habit=s.habits.habits.find(h=>h.id===widget.entity);if(!habit)return unavailable('/app/habits','This Habit is unavailable. Choose another or remove this widget.');
  const day=habitDay(habit,s.today,s.today),rule=habitRuleOn(habit,s.today),stats=widget.metric==='streak'?habitStats(habit,s.today):undefined;
  return {...defaults,title:widget.title||habit.title,value:stats?`${stats.currentStreak} ${stats.streakUnit}`:`${day.count.toLocaleString()}${rule?` ${measurementUnit(rule)}`:''}`,detail:stats?'Current streak · natural periods':`${day.status.replaceAll('-',' ')} · target ${day.target.toLocaleString()}${rule?` ${measurementUnit(rule)}`:''}`,href:'/app/habits',warning:day.status==='archived'||day.status==='paused'?`Habit ${day.status}`:undefined};
 }
 if(widget.kind==='health'){
  const summary=dailyHealthSummary(s.health,s.healthDate),common={...defaults,title:widget.title||widgetMetricLabel(widget.metric),detail:`${s.healthDate} · manually logged`,href:'/app/health'};
  if(widget.metric==='kcal')return {...common,value:summary.entries?`${summary.nutrients.kcal.toLocaleString()} kcal`:'No meals recorded',detail:`${summary.entries} meals & snacks · ${s.healthDate}`};
  if(widget.metric==='macros')return {...common,value:summary.entries?`${(summary.nutrients.proteinMg/1000).toLocaleString()} g protein`:'No meals recorded',detail:summary.entries?`${(summary.nutrients.carbsMg/1000).toLocaleString()} g carbs · ${(summary.nutrients.fatMg/1000).toLocaleString()} g fat`:'Log a meal to start your day.'};
  if(widget.metric==='water'){const water=waterSummary(s.health,s.healthDate);return {...common,value:water.entries?`${water.millilitres.toLocaleString()} mL`:'No water recorded',detail:water.targetMl?`Personal target ${water.targetMl.toLocaleString()} mL · ${s.healthDate}`:`${s.healthDate} · no target set`};}
  if(widget.metric==='weight'){const latest=s.health.weights.filter(w=>w.date<=s.healthDate).sort((a,b)=>b.date.localeCompare(a.date))[0],unit=dailyData(s.health).preferences.weightUnit;return {...common,value:latest?`${(latest.grams/(unit==='lb'?453.59237:1000)).toLocaleString(undefined,{maximumFractionDigits:3})} ${unit}`:'No measurements yet',detail:latest?`${latest.date} · manual measurement`:'Record a measurement when you choose.'};}
  const recorded=s.health.activity.some(a=>a.date===s.healthDate);return {...common,value:recorded?widget.metric==='steps'?`${summary.steps.toLocaleString()} steps`:`${summary.minutes.toLocaleString()} minutes`:'No activity recorded'};
 }
 if(widget.kind==='wealth'){
  const wealth=wealthOverview(s.platform,s.now,s.quotes),subtotal=wealth.subtotals.find(t=>t.currency===widget.metric),missing=wealth.rows.some(r=>r.value===undefined),stale=wealth.rows.some(r=>r.currency===widget.metric&&r.stale);
  return {...defaults,title:widget.title||`Tracked Wealth · ${widget.metric}`,value:subtotal?formatGoalAmount(formatUnits(subtotal.value.toString(),2),widget.metric):'No recorded value',detail:'Known values only · currencies stay separate',href:'/app/wealth',warning:missing?'Valuation coverage is incomplete. Some assets have no value.':stale?'Includes stale evidence. Refresh or review values.':undefined};
 }
 if(widget.kind==='asset'){
  const position=s.platform.positions.find(p=>p.id===widget.entity);if(!position)return unavailable('/app/wealth','This asset or Position is unavailable. Choose another or remove this widget.');
  if(position.archivedAt)return {...unavailable(`/app/wealth/asset/${encodeURIComponent(position.id)}`,'This asset is archived. Restore it in Wealth to see current values.'),title:widget.title||position.providerId};
  const row=wealthOverview(s.platform,s.now,s.quotes).rows.find(r=>r.position.id===position.id)!;
  const value=widget.metric==='value'?row.value===undefined?'Value unavailable':formatGoalAmount(formatUnits(row.value.toString(),2),row.currency!):`${formatExactNumber(formatUnits(widget.metric==='available'?row.balance.unallocated:position.quantity,position.decimals))} ${position.asset}`;
  return {...defaults,title:widget.title||position.providerId,value,detail:`${widgetMetricLabel(widget.metric)} · ${position.verification==='MANUAL'?'manual':'read-only observation'} · ${position.asset}`,href:`/app/wealth/asset/${encodeURIComponent(position.id)}`,warning:row.balance.deficit!=='0'?'Allocation exceeds the current balance. Review before allocating.':row.stale?'Saved observation needs refresh':widget.metric==='value'&&row.value===undefined?'A price or manual valuation is required.':undefined};
 }
 return {...defaults,title:widget.title||'Explore the ecosystem',value:'Discover projects',detail:'Research and official links · no financial execution',href:'/app/ecosystem'};
}

export function dashboardIntegrityWarning(data:Platform){return data.positions.some(p=>allocationBalance(data,p.id).deficit!=='0')?'A saved allocation exceeds its current source balance. Review the source before allocating more.':undefined;}
