'use client';
import {formatMeasureValue, measureSource} from '../../lib/habit-health-links/engine';
import type {AppliedCheckIn, HabitHealthLink} from '../../lib/habit-health-links/schema';
import {isShowcase} from '../../lib/showcase-storage';
import {useHealthLinkContext} from './health-link-context';
import {useAutoCheckInNotice} from './use-auto-checkins';

/** Under a habit's completion row: how the day was ticked off from Health, its undo, or why it could not be. */
export function AutoCheckInBadge({habitId, marker, link}: {habitId: string; marker: AppliedCheckIn | undefined; link: HabitHealthLink | undefined}) {
  const context = useHealthLinkContext(), notice = useAutoCheckInNotice(habitId);
  if (notice && !marker) return <p className="habit-auto-badge habit-inline-error" role="status">{notice}</p>;
  if (!marker) return null;
  if (marker.undone) return <p className="habit-auto-badge" role="status" aria-live="polite">Undone · it won’t be ticked off again today.</p>;
  const source = measureSource({measure: marker.measure, exerciseId: link?.exerciseId}, context?.counters ?? []);
  return <p className="habit-auto-badge" role="status">Done automatically · from {source} · {formatMeasureValue(marker.measure, marker.value, context?.waterUnit)}{isShowcase() ? ' · Showcase example' : ''}</p>;
}
