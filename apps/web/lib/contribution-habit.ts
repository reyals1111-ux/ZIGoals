import type { PrivateGoal } from './positions';
import type { HabitInput } from './habits';
import { formatUnits as amount } from '@zigoals/chain-config';
export function contributionTemplate(goal:PrivateGoal,today:string):HabitInput|undefined {
 const plan=goal.plan;if(!plan||plan.cadence==='irregular')return;
 const numeric=Number(amount(plan.amount,plan.decimals));
 const purchase=goal.asset==='ZIG'&&['USD','EUR'].includes(plan.asset)&&numeric>0&&numeric<=1_000_000_000;
 const period=plan.cadence==='weekly'?'week':plan.cadence==='yearly'?'year':'month';
 return {title:purchase?'Buy ZIG':`Contribute ${amount(plan.amount,plan.decimals)} ${plan.asset} ${plan.cadence}`.slice(0,100),category:'Financial',description:`Supporting behavior for ${goal.name}. Once per calendar ${period}; plan date ${plan.nextDate}. Completion does not add financial progress.`.slice(0,500),notes:'',goalLink:{chainId:'private',owner:'local',goalId:goal.id},type:'build',measurement:purchase?{kind:'quantity',unit:plan.asset}:{kind:'boolean'},schedule:{kind:'frequency',times:1,period},target:purchase?numeric:1,targetPeriod:'day',endCondition:plan.endDate&&plan.endDate>=today?{kind:'date',date:plan.endDate}:{kind:'none'}};
}
