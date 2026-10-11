import {goalLinkMatches,habitDay,latestHabitRule,type Habit,type HabitData} from './habits';
import {earliestHabitChange} from './habit-actions';
import type {PrivateGoal} from './positions';
/** Read-only suggestions. Goal observations never write Habit rules or funding. */
export function linkedGoalHabitAction(goal:PrivateGoal,habit:Habit,today:string){
 if(!goalLinkMatches(habit.goalLink,{chainId:'private',owner:'local',goalId:goal.id}))return null;
 const rule=latestHabitRule(habit);if(rule.state==='archived')return null;
 const cycle=goal.lifecycle?.at(-1)?.cycle??0,completed=goal.lifecycle?.some(e=>e.cycle===cycle&&e.kind==='completed');
 const reopened=goal.lifecycle?.some(e=>e.cycle===cycle&&(e.kind==='reopened'||e.kind==='target_changed'));
 if((goal.status==='closed'||completed)&&rule.state==='active')return {state:'paused' as const,from:earliestHabitChange(habit,today),reason:goal.status==='closed'?'This linked Goal is closed.':'This linked Goal has a recorded completion in its current target cycle.'};
 if(goal.status==='active'&&!completed&&reopened&&rule.state==='paused')return {state:'active' as const,from:earliestHabitChange(habit,today),reason:'This linked Goal was reopened or its target revised. Your Habit remains paused until you choose to resume.'};
 return null;
}
export function habitStackSuggestions(data:HabitData,id:string,today:string){
 const previous=data.habits.find(h=>h.id===id);if(!previous||habitDay(previous,today,today).status!=='complete')return [];
 return data.habits.filter(h=>h.stackAfterId===id&&habitDay(h,today,today).scheduled&&['due','partial'].includes(habitDay(h,today,today).status));
}
