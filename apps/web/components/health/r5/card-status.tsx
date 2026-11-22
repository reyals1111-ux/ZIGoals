'use client';
import {formatDate} from '../../../lib/visual-format';
import {localDate} from '../../../lib/local-date';
import {PLANNED_WORKOUTS} from '../../../lib/workouts/planned';
import {currentStatus} from '../../../lib/workouts/status';
import {useDeviceRecord} from '../../ai/use-device-record';

/**
 * Session AV lane 2, round 5 (gym; LEDGER #374): the Health page's Workouts card says a status is set, in neutral words
 * (the reason is shown only in Workouts itself). Its own small chunk, so Health's first chunk gains one lazy line.
 */
export default function CardStatus() {
  const rec = useDeviceRecord(PLANNED_WORKOUTS);
  const open = rec.loaded && !rec.unreadable ? currentStatus(rec.data, localDate()) : null;
  if (!open) return null;
  return <p className="fine workouts-card-status">Paused since {formatDate(open.from, {weekday: true, year: false})}: planned workouts are set aside until you clear your status in Workouts.</p>;
}
