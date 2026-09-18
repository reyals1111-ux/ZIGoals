'use client';
import {GoalSummaryCard} from '../goal-card';
import {privateGoalSummary} from '../../lib/goal-summary';
import {needsMarketQuotes,type PrivateGoal,type Platform} from '../../lib/positions';
import {useMarketQuotes} from './use-market-quotes';
export function PrivateGoalCard({g,data}:{g:PrivateGoal;data:Platform}){const market=useMarketQuotes(needsMarketQuotes(data));return <GoalSummaryCard summary={privateGoalSummary(data,g,market.quotes,market.now)}/>;}
