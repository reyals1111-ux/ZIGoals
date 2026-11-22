'use client';
import {HEALTH_NUMBERS} from '../../../lib/health-numbers/store';
import {mealReadings, type MealName} from '../../../lib/health-numbers/meals';
import {formatNumber} from '../../../lib/visual-format';
import {useDeviceRecord} from '../../ai/use-device-record';
import './health-r3.css';

/**
 * Session AV lane 2 (health r3; LEDGER #284, Carb Manager): beside a meal on the food day, the readings of "Your numbers"
 * marked before or after it (glucose, ketones, anything you track), as typed, with their unit and time. The readings only:
 * no range, no verdict, no index. Nothing shows for a meal without one.
 */
export default function MealReadings({date, meal}: {date: string; meal: MealName}) {
  const rec = useDeviceRecord(HEALTH_NUMBERS);
  if (!rec.loaded || rec.unreadable) return null;
  const list = mealReadings(rec.data, date, meal);
  if (!list.length) return null;
  return <p className="fine r3-meal-readings" data-body-figure=""><strong>Your readings</strong>: {list.map(r => `${r.name} ${formatNumber(r.value, {maximumFractionDigits: 3})}${r.unit ? ` ${r.unit}` : ''} ${r.when}${r.time ? ` (${r.time})` : ''}`).join(' · ')}. As you typed them in Your numbers.</p>;
}
