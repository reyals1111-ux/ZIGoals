'use client';
import {useState} from 'react';
import {FOOD_PLUS} from '../../../lib/food-plus/schema';
import {isPartialDay, setPartialDay} from '../../../lib/food-plus/checkin';
import {useDeviceRecord} from '../../ai/use-device-record';
import {formatDate} from '../../../lib/visual-format';
import {plainErrorMessage} from '../../../lib/plain-error';
import './food-plus.css';

/**
 * Session AV lane 2 (food, LEDGER #106; MacroFactor marks a day as incomplete): under the Diary's meals, "This day is only
 * partly logged": the maintenance estimate and the weekly coach then leave the day out (its food still counts
 * everywhere else). Shown once the day has an entry; kept on this device (`zigoals:food-plus:v1` `checkIn.partial`).
 */
export default function PartialDay({date, hasEntries}: {date: string; hasEntries: boolean}) {
  const record = useDeviceRecord(FOOD_PLUS), [note, setNote] = useState('');
  if (!record.loaded) return null;
  const on = isPartialDay(record.data, date);
  if (!hasEntries && !on) return null;
  return <div className="food-plus-partial">
    <label className="checkbox"><input type="checkbox" checked={on} onChange={e => { const want = e.target.checked; try { record.update(r => setPartialDay(r, date, want)); setNote(want ? `${formatDate(date)} is left out of the maintenance estimate.` : `${formatDate(date)} counts in the maintenance estimate again.`); } catch (err) { setNote(plainErrorMessage(err, 'Not kept on this device.')); } }}/> This day is only partly logged (leave it out of the maintenance estimate)</label>
    <p className="fine" role="status">{note}</p>
  </div>;
}
