'use client';
import {useState} from 'react';
import {linkedGoalHabitAction} from '../../lib/habit-linked-policy';
import {habitEditFingerprint} from '../../lib/habit-actions';
import type {Habit} from '../../lib/habits';
import type {PrivateGoal} from '../../lib/positions';
import type {HabitsStore} from './use-habits';
export function LinkedGoalReview({habit,goal,store}:{habit:Habit;goal:PrivateGoal;store:HabitsStore}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');const action=linkedGoalHabitAction(goal,habit,store.today);
 if(!action)return null;
 return <section className="notice" aria-label="Linked Goal habit review"><p>{action.reason}</p><p>Review {action.state==='paused'?'pausing':'resuming'} this Habit from {action.from}. This is your decision; Goal changes never stop or restart it automatically.</p><button className="secondary" type="button" disabled={busy} onClick={async()=>{setBusy(true);setMessage('');try{await store.setState(habit.id,action.state,action.from,habitEditFingerprint(habit));setMessage('Habit change scheduled. Earlier rules and entries stay unchanged.');}catch(e){setMessage(e instanceof Error?e.message:'Could not save the Habit change.');}finally{setBusy(false);}}}>{action.state==='paused'?'Schedule linked Habit pause':'Schedule linked Habit resume'}</button>{message&&<p role="status">{message}</p>}</section>;
}
