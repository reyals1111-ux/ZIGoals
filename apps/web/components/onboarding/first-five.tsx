'use client';
import Link from 'next/link';
import {useEffect, useId, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {MONEY_LOG} from '../../lib/money-log/schema';
import './first-five.css';

/**
 * Session AP (friends Alpha, ADR-040): after the first-run setup, a calm "Your first five" on Today for a device that is
 * still nearly empty: Today (here), a goal, a habit, a meal, a money record. Each step opens the app's own form and ticks
 * itself from the real records (nothing is stored for the ticks); the card leaves once all five are done or when the person
 * closes it (`zigoals:first-five:v1`, localStorage: a display convenience in erase's NOT_RECORDS). Its own chunk.
 */
export const FIRST_FIVE_KEY = 'zigoals:first-five:v1';
const closed = () => { try { return window.localStorage.getItem(FIRST_FIVE_KEY) !== null; } catch { return false; } };

export default function FirstFive({goals, habits, meals}: {goals: number; habits: number; meals: number}) {
  const id = useId(), money = useDeviceRecord(MONEY_LOG), [hidden, setHidden] = useState(true);
  useEffect(() => { setHidden(closed()); }, []);
  const steps = [
    {done: true, label: 'Open Today', detail: 'You are here: your day at a glance.', href: null},
    {done: goals > 0, label: 'Set a goal', detail: 'A destination: savings, a skill, a habit streak.', href: '/app/goals/new'},
    {done: habits > 0, label: 'Add a habit', detail: 'One small step you repeat.', href: '/app/habits?add=habit'},
    {done: meals > 0, label: 'Log a meal', detail: 'What you ate, in your own words or by barcode.', href: '/app/health#health-entry-action'},
    {done: money.loaded && money.data.entries.length > 0, label: 'Record some money', detail: 'An expense or an income, kept on this device.', href: '/app/wealth#spending'},
  ];
  const left = steps.filter(s => !s.done).length;
  if (hidden || !money.loaded || left === 0) return null;
  const close = () => { try { window.localStorage.setItem(FIRST_FIVE_KEY, JSON.stringify({version: 1, closed: true})); } catch { /* storage refused: hidden until reload */ } setHidden(true); };
  return <section className="panel first-five" aria-labelledby={`${id}-title`}>
    <p className="eyebrow">YOUR FIRST FIVE</p>
    <h2 id={`${id}-title`}>Five small steps, about two minutes.</h2>
    <p className="fine">{5 - left} of 5 done. Each step ticks itself from what you add; nothing here is sent anywhere.</p>
    <ol className="first-five-steps">
      {steps.map(s => <li key={s.label} data-done={s.done || undefined}>
        <span className="first-five-mark" aria-hidden="true">{s.done ? '✓' : ''}</span>
        <span><strong>{s.done || !s.href ? s.label : <Link className="text-link" href={s.href}>{s.label}</Link>}</strong><small>{s.done ? 'Done.' : s.detail}</small></span>
      </li>)}
    </ol>
    <button type="button" className="quiet first-five-close" onClick={close}>Not now, hide this</button>
  </section>;
}
