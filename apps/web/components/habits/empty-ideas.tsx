'use client';
import {useState} from 'react';
import type {HabitInput} from '../../lib/habits';
import {habitTemplate, habitTemplateInputOf} from '../../lib/templates/habits';

/**
 * Session AK RB (RELEASE_REVIEW_2 R2-25): three one-tap ideas in Habits' empty card (COMPETITORS.md §(c): "a short template
 * list rather than a blank form"). The same templates Habit ideas offers, added the same way; each can be changed after.
 * Loaded with the empty card only (the templates stay out of the page's first chunk).
 */
const STARTERS = ['water', 'walk', 'read'] as const;
export default function EmptyHabitIdeas({onAdd}: {onAdd: (input: HabitInput, words: string) => Promise<void>}) {
  const [busy, setBusy] = useState(false);
  const starters = STARTERS.flatMap(id => { const t = habitTemplate(id); return t ? [t] : []; });
  return <div className="habit-empty-ideas" role="group" aria-label="Start with an idea">
    {starters.map(t => <button key={t.id} type="button" className="secondary" disabled={busy} aria-label={`Add ${t.title}: ${t.note}`} onClick={async () => { setBusy(true); try { await onAdd(habitTemplateInputOf(t), `${t.title} added. Change anything about it from its card.`); } finally { setBusy(false); } }}>
      <span>+ {t.title}</span><small>{t.note}</small>
    </button>)}
  </div>;
}
