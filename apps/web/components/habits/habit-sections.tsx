'use client';
import {type ReactNode, useEffect, useState} from 'react';
import {NebulaFlow} from '../nebula-flow';
import {SECTION_SYMBOLS, openSection, type HabitSection, type TimeSection} from '../../lib/habits-extras/sections';
import {setSectionFold} from '../../lib/habits-extras/store';
import type {HabitExtrasState} from './use-habit-extras';

/**
 * H1: the Habits page's four time-of-day sections (Morning, Afternoon, Evening, Anytime), each a collapsible heading in
 * the nebula language with today's progress; the clock's section opens first, and a fold the person makes is kept on
 * this device (`zigoals:habit-extras:v1` folds). Empty sections show a one-line invitation, never a blank.
 */
export function HabitSections({sections, extras, hour, render, compact = false, onNew}: {sections: readonly HabitSection[]; extras: HabitExtrasState | null; hour: number; render: (section: HabitSection) => ReactNode; compact?: boolean; onNew?: (section: TimeSection) => void}) {
  const first = openSection(sections, hour);
  const [touched, setTouched] = useState<Partial<Record<TimeSection, boolean>>>({});
  useEffect(() => { setTouched({}); }, [first]);
  const folds = extras?.loaded && !extras.unreadable ? extras.data.folds ?? {} : {};
  const isOpen = (id: TimeSection) => touched[id] ?? (folds[id] !== undefined ? !folds[id] : id === first);
  return <div className={`habit-sections${compact ? ' habit-sections-compact' : ''}`}>
    {sections.map(section => {
      const open = isOpen(section.id), empty = section.habits.length === 0;
      return <details key={section.id} className={`habit-section habit-section-${section.id}`} open={open} onToggle={e => { const next = e.currentTarget.open; setTouched(t => ({...t, [section.id]: next})); if (extras?.loaded && !extras.unreadable && !compact) { try { extras.update(r => setSectionFold(r, section.id, !next)); } catch { /* the fold is a convenience */ } } }}>
        <summary className="habit-section-summary"><span className="habit-section-mark" aria-hidden="true">{SECTION_SYMBOLS[section.id]}</span><h2 className="habit-section-title"><NebulaFlow identity={`habit-section:${section.id}${compact ? ':compact' : ''}`}>{section.label}</NebulaFlow></h2><span className="habit-section-count"><span aria-hidden="true">{section.due ? `${section.done} / ${section.due}` : empty ? 'empty' : 'none due'}</span><span className="sr-only">{section.due ? `${section.done} of ${section.due} due habits complete` : empty ? 'no habits here' : 'none due today'}</span></span><span className="habit-section-chevron" aria-hidden="true">›</span></summary>
        {empty ? <p className="habit-section-empty">{section.id === 'anytime' ? 'Nothing here yet.' : `No ${section.label.toLowerCase()} habit yet.`}{onNew && <> <button type="button" className="text-link" onClick={() => onNew(section.id)}>Add one</button></>}</p> : render(section)}
      </details>;
    })}
  </div>;
}
