'use client';
import {useMemo, useRef, useState} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import type {MoneyEntry} from '../../../lib/money-log/schema';
import {MONEY_MORE} from '../../../lib/money-more/schema';
import {lookedDays, moneyStreak, sayLooked, setStreakOn, streakWords} from '../../../lib/money-log/money-streak';
import './money-r6.css';

/**
 * Session AV lane 2, round 6 (money; EveryDollar's streaks, LEDGER #427): the money streak's quiet line on Spending (only
 * when the person turned it on) with "I looked at my money today", and its switch (in Yesterday's money). Never a money
 * figure, never a lost-streak warning; one day off is fine. Its own chunk.
 */
export default function MoneyStreakLine({entries, today}: {entries: readonly MoneyEntry[]; today: string}) {
  const more = useDeviceRecord(MONEY_MORE), [said, setSaid] = useState(''), line = useRef<HTMLParagraphElement>(null);
  const streak = useMemo(() => moneyStreak(lookedDays(entries, more.data.streak?.looked), today), [entries, more.data.streak?.looked, today]);
  if (!more.loaded || more.unreadable || !more.data.streak?.on) return null;
  const look = () => { try { more.update(m => sayLooked(m, today)); setSaid('Kept: you looked at your money today.'); requestAnimationFrame(() => line.current?.focus()); } catch { setSaid('This could not be saved on this device.'); } };
  return <p ref={line} tabIndex={-1} className="money-streak money-r6">{streakWords(streak)}{!streak.today && <> <button type="button" className="text-link" onClick={look}>I looked at my money today</button></>}<span className="visually-hidden" aria-live="polite">{said}</span></p>;
}
/** The switch, off by default. */
export function MoneyStreakChoice({disabled = false}: {disabled?: boolean}) {
  const more = useDeviceRecord(MONEY_MORE), [said, setSaid] = useState(''), on = more.loaded && more.data.streak?.on === true;
  const set = (value: boolean) => { try { more.update(m => setStreakOn(m, value)); setSaid(value ? 'Spending shows how many days in a row you looked at your money.' : 'The money streak is off.'); } catch { setSaid('This could not be saved on this device. Nothing was changed.'); } };
  return <>
    <label className="money-search-check"><input type="checkbox" checked={on} disabled={disabled || !more.loaded || more.unreadable} onChange={e => set(e.target.checked)}/><span>Days in a row you looked at your money, on Spending <span className="fine">(an entry logged, a bank file read, or “I looked at my money today”; never an amount; a day off is fine)</span></span></label>
    <span className="visually-hidden" aria-live="polite">{said}</span>
  </>;
}
