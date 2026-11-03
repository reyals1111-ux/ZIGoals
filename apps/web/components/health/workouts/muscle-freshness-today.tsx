'use client';
import {useMemo} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {categoryLookup} from '../../../lib/workouts/depth';
import type {LibraryExercise} from '../../../lib/workouts/library';
import type {Workouts} from '../../../lib/workouts/schema';
import {MUSCLE_RECOVERY, freshTodayLine, freshnessWithRecovery} from '../../../lib/muscle-freshness/model';

/**
 * Session AK (item 8): one line on the workout start sheet, "Fresh today: legs, back (an estimate)", from the same
 * freshness as the muscle-groups view (the person's own recovery days included). Nothing when no group is fresh or the
 * log has no strength sets yet. Loaded with the start sheet as its own small chunk.
 */
export default function MuscleFreshToday({w, library, today}: {w: Workouts; library: LibraryExercise[]; today: string}) {
  const record = useDeviceRecord(MUSCLE_RECOVERY), recovery = record.loaded && !record.unreadable ? record.data : null;
  const line = useMemo(() => freshTodayLine(freshnessWithRecovery(w, categoryLookup(library), new Date(), today, recovery)), [w, library, today, recovery]);
  return line ? <p className="fine muscle-fresh-today">{line} <span>(an estimate from your sets)</span>.</p> : null;
}
