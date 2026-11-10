'use client';
import {formatMeasureValue, measureSource, measureValue} from '../../lib/habit-health-links/engine';
import type {AppliedCheckInV4 as AppliedCheckIn, HabitHealthLinkV4 as HabitHealthLink} from '../../lib/habit-health-links/schema';
import {isShowcase} from '../../lib/showcase-storage';
import {useHealthLinkContext} from './health-link-context';
import {useAutoCheckInNotice} from './use-auto-checkins';

const liveValue = (health: Parameters<typeof measureValue>[0], day: string, link: HabitHealthLink) => { try { return measureValue(health, day, link); } catch { return null; } };
/** Under a habit's completion row: how the day was ticked off from Health, its undo, or why it could not be. */
export function AutoCheckInBadge({habitId, marker, link}: {habitId: string; marker: AppliedCheckIn | undefined; link: HabitHealthLink | undefined}) {
  const context = useHealthLinkContext(), notice = useAutoCheckInNotice(habitId);
  if (notice && !marker) return <p className="habit-auto-badge habit-inline-error" role="status">{notice}</p>;
  if (!marker) return null;
  if (marker.undone) return <p className="habit-auto-badge" role="status" aria-live="polite">Undone · it won’t be ticked off again today.</p>;
  const source = measureSource({measure: marker.measure, exerciseId: link?.exerciseId}, context?.counters ?? []);
  // Session AL fourth pass (N-056, N-086, D-220, B-163, NB-200): the note reads the journal's value now (2,250 mL once more
  // water is logged, 8,800 steps as Health says), not the value at the moment of the tick; the tick's own value is the
  // fallback while Health is not read.
  const live = context?.health && link ? liveValue(context.health, marker.healthDate, link) : null;
  return <p className="habit-auto-badge" role="status">Done automatically · from {source} · {formatMeasureValue(marker.measure, live ?? marker.value, context?.waterUnit)}{/* Session AH (TR12, D-084): only the Showcase's own example habits say so, never one you made. */}{isShowcase() && habitId.startsWith('92000000-') ? ' · Showcase example' : ''}</p>;
}
