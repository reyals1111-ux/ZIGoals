import type { PrivateGoal } from './positions';
import {habitCalendarDay,createHabit,setHabitState,latestHabitRule,goalLinkMatches,type HabitInput,type HabitData,type Habit} from './habits';
import {earliestHabitChange,scheduleHabitEdit,scheduleHabitState} from './habit-actions';
import {effectiveContributionPlan} from './plan-revisions';
import { formatUnits as amount } from '@zigoals/chain-config';
export function contributionTemplate(goal:PrivateGoal,today:string):HabitInput|undefined {
 const plan=goal.plan;if(!plan||plan.cadence==='irregular')return;
 const numeric=Number(amount(plan.amount,plan.decimals));
 const purchase=goal.asset==='ZIG'&&['USD','EUR'].includes(plan.asset)&&numeric>0&&numeric<=1_000_000_000;
 const period=plan.cadence==='weekly'?'week':plan.cadence==='yearly'?'year':'month';
 return {title:purchase?'Buy ZIG':`Contribute ${amount(plan.amount,plan.decimals)} ${plan.asset} ${plan.cadence}`.slice(0,100),category:'Financial',description:`Supporting behavior for ${goal.name}. Once per calendar ${period}; plan date ${plan.nextDate}. Completion does not add financial progress.`.slice(0,500),notes:'',goalLink:{chainId:'private',owner:'local',goalId:goal.id},type:'build',measurement:purchase?{kind:'quantity',unit:plan.asset}:{kind:'boolean'},schedule:{kind:'frequency',times:1,period},target:purchase?numeric:1,targetPeriod:'day',endCondition:plan.endDate&&plan.endDate>=today?{kind:'date',date:plan.endDate}:{kind:'none'}};
}

export function contributionHabitEffectiveFrom(goal:PrivateGoal,habit:Habit,today:string){return [earliestHabitChange(habit,today),goal.planRevisions?.at(-1)?.effectiveFrom??today].sort().at(-1)!;}
export function reconcileContributionHabit(data:HabitData,goal:PrivateGoal,id:string,from:string,now=new Date(),expected?:string):HabitData{
 const current=data.habits.find(h=>h.id===id);
 if(!current||!goalLinkMatches(current.goalLink,{chainId:'private',owner:'local',goalId:goal.id}))throw Error('Contribution Habit no longer belongs to this linked Goal.');
 if(goal.status==='closed'||goal.locked)throw Error('Choose an unlocked, open Goal.');
 if(from<contributionHabitEffectiveFrom(goal,current,habitCalendarDay(data,now)))throw Error('Choose a future date on or after the contribution plan becomes effective.');
 const template=contributionTemplate(goal,from);if(!template)throw Error('This contribution plan needs separate Habit review.');
 const state=goal.plan?.active&&(!goal.plan.endDate||goal.plan.endDate>=from)?'active':'paused';
 const next=scheduleHabitEdit(data,id,{...template,notes:current.notes,timeOfDay:current.timeOfDay,stackAfterId:current.stackAfterId},from,now,expected);
 return latestHabitRule(next.habits.find(h=>h.id===id)!).state===state?next:scheduleHabitState(next,id,state,from,now);
}
export function createContributionHabit(data:HabitData,goal:PrivateGoal,id:string,now=new Date()):HabitData{
 const today=habitCalendarDay(data,now),currentPlan=effectiveContributionPlan(goal,today),template=contributionTemplate({...goal,plan:currentPlan??goal.plan},today);
 if(!template||goal.status==='closed'||goal.locked)throw Error('Contribution plan unavailable.');
 const active=currentPlan?.active&&(!currentPlan.endDate||currentPlan.endDate>=today);
 let next=setHabitState(createHabit(data,template,now,id),id,active?'active':'paused',now);
 const future=goal.planRevisions?.at(-1)?.effectiveFrom;
 if(future&&future>today)next=reconcileContributionHabit(next,goal,id,future,now);
 return next;
}
