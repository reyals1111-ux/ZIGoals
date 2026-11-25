'use client';
import {useEffect, useRef} from 'react';
import {GOAL_REPEAT, turnRepeats} from '../../lib/goals/repeat';
import {useDeviceRecord} from '../ai/use-device-record';
import {usePlatform} from '../platform/use-platform';
import {useLocalToday} from '../use-local-today';

/**
 * Session AW (X4, LEDGER #447): at a new week, month or year each repeating goal starts again (lib/goals/repeat.ts
 * `turnRepeats`). Mounted, as its own chunk, on Goals and on a goal's page; it renders nothing. With no repeating goal it
 * reads only the small repeat record and never opens the finance record. The repeat record is written first, so a
 * project's result is kept before its milestones are unticked; if the finance write fails, the repeat record is put back
 * and the turn is tried again on the next visit (never in a loop).
 */
export default function GoalRepeatTurn() {
  const record = useDeviceRecord(GOAL_REPEAT);
  if (!record.loaded || record.unreadable || !Object.keys(record.data.goals).length) return null;
  return <Turn />;
}
function Turn() {
  const record = useDeviceRecord(GOAL_REPEAT), platform = usePlatform(), today = useLocalToday(), done = useRef('');
  const {loaded, error, data, update} = platform;
  useEffect(() => {
    if (!record.loaded || record.unreadable || !loaded || error || done.current === today) return;
    const before = record.data, turned = turnRepeats(data, before, today);
    done.current = today;
    if (!turned.turned.length) return;
    try { record.update(() => turned.record); } catch { return; }
    void Promise.resolve(update(s => turnRepeats(s, before, today).platform)).catch(() => { try { record.update(() => before); } catch { /* tried again on the next visit */ } });
  }, [record, loaded, error, data, update, today]);
  return null;
}
