'use client';
import {lazy, Suspense, type ReactNode} from 'react';
import {MOOD_WORDS, moodOn, setMood} from '../../lib/wrap-up/engine';
import {emptyMoods, moodsSchema} from '../../lib/moods/schema';
import {healthGroupIn, withHealthGroup} from '../../lib/vault/w-homes';
import type {HealthData} from '../../lib/health';
import {formatDate} from '../../lib/visual-format';
import {showStatus, showUndo} from '../ui/undo-toast';
import {useHealth} from './use-health';
import {PhoneFold} from '../phone/phone-fold';
const MoodTags = lazy(() => import('./plus/mood-tags')); // Session AP (feature 1): once the day has a mood

/** Puts a day's mood back as it was (or removes it when there was none), in the latest Health record. */
function restoreMood(health: HealthData, day: string, before: ReturnType<typeof moodOn>): HealthData {
  const current = healthGroupIn(health, 'moods') ?? emptyMoods(), days = {...current.days};
  if (before) days[day] = before; else delete days[day];
  return withHealthGroup(health, 'moods', moodsSchema.parse({...current, days}), false);
}
/**
 * Session AL third pass (P-DV-119, DV-141): how the day feels, one tap, on Health: the same mood the evening wrap-up and
 * the Journal read (Health v4 `moods`, one per day, the newer answer wins, a note stays). A word, never a score.
 */
export function MoodChip({date, today, children}: {date: string; today: string; children?: ReactNode}) {
  const store = useHealth(), day = date > today ? today : date, current = store.loaded ? moodOn(store.data, day) : undefined;
  async function choose(mood: number) {
    const before = current;
    if (before?.mood === mood) return;
    try {
      await store.update(latest => setMood(latest, day, mood, new Date().toISOString()));
      showUndo({message: `${day === today ? 'Today' : formatDate(day)} feels ${MOOD_WORDS[mood - 1]!.toLowerCase()}.`, undone: 'Mood put back.', restore: () => store.update(latest => restoreMood(latest, day, before))});
    } catch { showStatus('Your mood was not saved. Nothing was changed.', {tone: 'error'}); }
  }
  const title = day === today ? 'How does today feel?' : `How did ${formatDate(day)} feel?`;
  // Session AL (CI2, pillar-phone-length): on a phone the card is one row, as Sleep and Workouts are, with the day's
  // answer on the row; it opens in place. Desktop and tablet are unchanged.
  return <PhoneFold label={title} detail={current ? MOOD_WORDS[current.mood - 1] : 'Not answered yet'}><section className="panel health-mood" aria-labelledby="health-mood-title">
    <h2 id="health-mood-title">{title}</h2>
    <div className="health-mood-chips" role="group" aria-label="Mood">{MOOD_WORDS.map((word, i) => <button type="button" key={word} className="secondary" aria-pressed={current?.mood === i + 1} disabled={!store.loaded} onClick={() => void choose(i + 1)}>{word}</button>)}</div>
    <p className="fine">The same answer as the evening wrap-up and your Journal; it stays with your Health records. A word for the day, never a score.</p>
    {current && <Suspense fallback={null}><MoodTags day={day}/></Suspense>}
    {children}
  </section></PhoneFold>;
}
