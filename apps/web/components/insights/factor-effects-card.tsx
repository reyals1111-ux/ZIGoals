'use client';
import {useMemo} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import type {HabitData} from '../../lib/habits';
import type {HealthData} from '../../lib/health';
import {ENERGY} from '../../lib/energy/schema';
import {WORKOUTS} from '../../lib/workouts/schema';
import {MOOD_TAGS} from '../../lib/mood-tags/schema';
import {JOURNAL} from '../../lib/journal/schema';
import {SYMPTOMS} from '../../lib/symptoms/schema';
import {SUPPLEMENTS} from '../../lib/supplements/schema';
import {CROSS_MIN_PER_SIDE, LABEL_WORDS} from '../../lib/insights/cross-pillar';
import {factorEffects, type Outcome} from '../../lib/insights/factor-effects';
import {SectionHeading} from '../ui/section-heading';
import './factor-effects.css';

/**
 * Session AV (owner follow-up 1, F-FACTORS; Bearable): "What goes with your mood, sleep and energy" in the Life review —
 * every factor the person keeps, each set against mood, energy and that night's sleep, the clearest first, with the same
 * labels as "On the same days" and the line that it is a pairing, not a cause. Counts only; nothing stored. Its own chunk.
 * Session AV (q3 #8): symptoms and supplements are factors too, and mood and energy are also read the next day.
 */
const OUTCOME_LABEL: Record<Outcome, string> = {mood: 'Mood', energy: 'Energy', sleep: 'Sleep'};
export default function FactorEffectsCard({habits, health, today}: {habits: HabitData; health: HealthData; today: string}) {
  const energy = useDeviceRecord(ENERGY), workouts = useDeviceRecord(WORKOUTS), moodTags = useDeviceRecord(MOOD_TAGS), journal = useDeviceRecord(JOURNAL), symptoms = useDeviceRecord(SYMPTOMS), supplements = useDeviceRecord(SUPPLEMENTS);
  const ok = <T,>(r: {loaded: boolean; unreadable?: boolean; data: T}) => r.loaded && !r.unreadable ? r.data : null;
  const result = useMemo(() => factorEffects({habits, health, today, energy: ok(energy), workouts: ok(workouts), moodTags: ok(moodTags), journal: ok(journal), symptoms: ok(symptoms), supplements: ok(supplements)}), [habits, health, today, energy, workouts, moodTags, journal, symptoms, supplements]);
  return <section className="panel cross-insights factor-effects" aria-labelledby="factor-effects-title">
    <SectionHeading id="factor-effects-title" eyebrow="Every factor · last 90 days" title="What goes with your mood, sleep and energy" level={2}/>
    <p className="fine">Each habit, mood tag, journal tag, symptom, supplement, workout and meditation, set against your mood and energy that day and the next, and your sleep that night. It shows what went together on the same days, not what causes what.</p>
    {result.ready.length ? <ol className="cross-list factor-list">{result.ready.map(f => <li key={f.id}>
      {/* Session AV (q3 #8): the factor and what it is set against on one line, the label beside them at 14 px. */}
      <p className="factor-head"><strong>{f.factor}</strong><span className="factor-outcome"> · {OUTCOME_LABEL[f.outcome]}{f.lag ? ', next day' : ''}</span> <span className={`cross-label is-${f.label}`}>{LABEL_WORDS[f.label].label}</span></p>
      <p>{f.sentence}</p>
      <small>{f.withA.days} and {f.withoutA.days} days compared.</small>
    </li>)}</ol> : <p className="cross-empty">{result.factors ? `Nothing clear yet. A factor shows once it has ${CROSS_MIN_PER_SIDE} days with it and ${CROSS_MIN_PER_SIDE} without, beside a mood, an energy rating or a night's sleep.` : 'Keep a habit, tag a mood or a journal entry, rate a symptom, log a supplement or a workout, and this card compares them with your mood, energy and sleep.'}</p>}
    {(result.collecting > 0 || result.unclear > 0) && <p className="fine">{result.collecting ? `${result.collecting} still collecting days` : ''}{result.collecting && result.unclear ? ' · ' : ''}{result.unclear ? `${result.unclear} with no clear difference so far` : ''}.</p>}
  </section>;
}
