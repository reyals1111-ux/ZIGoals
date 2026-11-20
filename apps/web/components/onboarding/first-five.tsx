'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect, useId, useState, type MouseEvent} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {usePagesView} from '../pages/use-pages-view';
import {MONEY_LOG} from '../../lib/money-log/schema';
import {MEAL_WORDS} from '../../lib/meal-words/schema';
import {isShown, PAGE_LABEL, withChoice} from '../../lib/pages/visibility';
import type {PageId} from '../../lib/pages/schema';
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
  // Session AU (ADR-044 F-MEAL): a meal logged in words alone ticks "Log a meal" too (its own device record).
  const id = useId(), money = useDeviceRecord(MONEY_LOG), mealWords = useDeviceRecord(MEAL_WORDS), [hidden, setHidden] = useState(true), view = usePagesView(), router = useRouter();
  useEffect(() => { setHidden(closed()); }, []);
  const steps: {done: boolean; label: string; detail: string; href: string | null; page?: PageId}[] = [
    {done: true, label: 'Open Today', detail: 'You are here: your day at a glance.', href: null},
    {done: goals > 0, label: 'Set a goal', detail: 'A destination: savings, a skill, a habit streak.', href: '/app/goals/new', page: 'goals'},
    {done: habits > 0, label: 'Add a habit', detail: 'One small step you repeat.', href: '/app/habits?add=habit', page: 'habits'},
    {done: meals > 0 || (mealWords.loaded && mealWords.data.entries.length > 0), label: 'Log a meal', detail: 'What you ate, in your own words or by barcode.', href: '/app/health#health-entry-action', page: 'health'},
    {done: money.loaded && money.data.entries.length > 0, label: 'Record some money', detail: 'An expense or an income, kept on this device.', href: '/app/wealth#spending', page: 'wealth'},
  ];
  // Session AU (ADR-044 F-1, the rehearsal's Sanne and Max): the setup leaves out of the menu the pages of areas not
  // picked, so a step could open a page that greets the person with "This page is hidden". A step whose page is not in
  // the menu says so, and the tap that opens it adds the page back first (the same stamped choice as the banner's
  // "show it again"); a write that fails still opens the page, where the banner offers the same.
  const outOfMenu = (page?: PageId) => !!page && !isShown(view, page);
  const openAdding = (event: MouseEvent<HTMLAnchorElement>, page: PageId, href: string) => {
    event.preventDefault();
    import('../../lib/w-homes-store').then(({updateSettingsGroup}) => updateSettingsGroup('pages', pages => withChoice(pages, page, true, new Date().toISOString())))
      .catch(() => undefined).finally(() => router.push(href));
  };
  const left = steps.filter(s => !s.done).length;
  if (hidden || !money.loaded || !mealWords.loaded || left === 0) return null;
  const close = () => { try { window.localStorage.setItem(FIRST_FIVE_KEY, JSON.stringify({version: 1, closed: true})); } catch { /* storage refused: hidden until reload */ } setHidden(true); };
  return <section className="panel first-five" aria-labelledby={`${id}-title`}>
    <p className="eyebrow">YOUR FIRST FIVE</p>
    <h2 id={`${id}-title`}>Five small steps, about two minutes.</h2>
    <p className="fine">{5 - left} of 5 done. Each step ticks itself from what you add; nothing here is sent anywhere.</p>
    <ol className="first-five-steps">
      {steps.map(s => <li key={s.label} data-done={s.done || undefined}>
        <span className="first-five-mark" aria-hidden="true">{s.done ? '✓' : ''}</span>
        <span><strong>{s.done || !s.href ? s.label : <Link className="text-link" href={s.href} onClick={s.page && outOfMenu(s.page) ? event => openAdding(event, s.page!, s.href!) : undefined}>{s.label}</Link>}</strong><small>{s.done ? 'Done.' : outOfMenu(s.page) ? `${s.detail} Adds ${PAGE_LABEL[s.page!]} to your menu.` : s.detail}</small></span>
      </li>)}
    </ol>
    <button type="button" className="quiet first-five-close" onClick={close}>Not now, hide this</button>
  </section>;
}
