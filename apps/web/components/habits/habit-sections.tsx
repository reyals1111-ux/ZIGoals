'use client';
import {type ReactNode, useEffect, useId, useState} from 'react';
import {HabitSectionBannerParts} from './habit-section-banner';
import {SECTION_SYMBOLS, openSection, sectionCountText, type HabitSection, type TimeSection} from '../../lib/habits-extras/sections';
import {setSectionFold} from '../../lib/habits-extras/store';
import type {HabitExtrasState} from './use-habit-extras';

/**
 * H1: the Habits page's four time-of-day sections (Morning, Afternoon, Evening, Anytime), each a collapsible heading in
 * the nebula language with today's progress; the clock's section opens first, and a fold the person makes is kept on
 * this device (`zigoals:habit-extras:v1` folds). Empty sections never stand as groups: they fold into one "Add a habit"
 * line after the others (Session AW, FR-TJ-7), never a blank.
 */
export function HabitSections({sections, extras, hour, render, compact = false, onNew}: {sections: readonly HabitSection[]; extras: HabitExtrasState | null; hour: number; render: (section: HabitSection) => ReactNode; compact?: boolean; onNew?: (section: TimeSection) => void}) {
  const first = openSection(sections, hour), uid = useId();
  const [touched, setTouched] = useState<Partial<Record<TimeSection, boolean>>>({});
  useEffect(() => { setTouched({}); }, [first]);
  const folds = extras?.loaded && !extras.unreadable ? extras.data.folds ?? {} : {};
  // ADR-022 B49: every section is open until the person folds it (a fold is kept on this device); the clock's section is marked `data-now`, never the only one open.
  const isOpen = (id: TimeSection) => touched[id] ?? (folds[id] !== undefined ? !folds[id] : true);
  // Session AV lane 2 (fr-layout, FR-TJ-7): once any section holds a habit, the empty ones stay away on the page too (as in
  // Today's widget): with one Anytime habit, three "No … habit yet" groups put its Complete button at y 1,680–2,004 on a
  // phone.
  const anyHabit = sections.some(section => section.habits.length > 0);
  // Session AW (habits-tj7; owner decision 1e, FR-TJ-7): the empty Morning, Afternoon and Evening groups fold into one
  // "Add a habit" line after the groups that hold habits, so today's cards and their Complete buttons come first. With no
  // habit in any group that one teaching line stands alone (it was four invitations, one per group).
  if (!compact && !anyHabit) return <div className="habit-sections"><p className="habit-section-empty habit-sections-room">No habits yet: start with one small action you want to return to.{onNew && <> <button type="button" className="text-link" onClick={() => onNew('anytime')}>Add a habit</button></>}</p></div>;
  const room = compact ? null : foldedRoom(sections);
  return <div className={`habit-sections${compact ? ' habit-sections-compact' : ''}`}>
    {sections.map(section => {
      const open = isOpen(section.id), empty = section.habits.length === 0, counted = sectionCountText(section); // FU (TR6): one wording for both views
      if (compact) { // Today's widget: a flat grouped list with slim labels, no folding (B49); empty groups stay away
        if (empty) return null;
        return <section key={section.id} className={`habit-section habit-section-compact habit-section-${section.id}`} data-now={section.id === first || undefined} aria-labelledby={`${uid}-${section.id}`}>
          <div className="habit-section-label"><span className="habit-section-mark" aria-hidden="true">{SECTION_SYMBOLS[section.id]}</span><h3 id={`${uid}-${section.id}`}>{section.label}</h3><span className="habit-section-count"><span aria-hidden="true">{counted.count}</span><span className="sr-only">{counted.spoken}</span></span></div>
          {render(section)}
        </section>;
      }
      if (empty && anyHabit) return null;
      return <details key={section.id} className={`habit-section habit-section-${section.id}`} data-now={section.id === first || undefined} open={open} onToggle={e => { const next = e.currentTarget.open; setTouched(t => ({...t, [section.id]: next})); if (extras?.loaded && !extras.unreadable && !compact) { try { extras.update(r => setSectionFold(r, section.id, !next)); } catch { /* the fold is a convenience */ } } }}>
        <summary className="habit-section-summary"><HabitSectionBannerParts symbol={SECTION_SYMBOLS[section.id]} title={section.label} identity={`habit-section:${section.id}${compact ? ':compact' : ''}`} count={counted.count} spoken={counted.spoken}/></summary>
        {render(section)}
      </details>;
    })}
    {onNew && room && <p className="habit-section-empty habit-sections-room">{room.words} <button type="button" className="text-link" onClick={() => onNew(room.first)}>Add a habit</button></p>}
  </div>;
}

/**
 * Session AW (habits-tj7, FR-TJ-7): the one line the empty Morning, Afternoon and Evening groups fold into once some group
 * holds a habit ("Room for a morning or evening habit."), or null when none of the three is empty. Anytime is never named:
 * it is the catch-all, not a time to fill. Pure.
 */
export function foldedRoom(sections: readonly Pick<HabitSection, 'id' | 'habits'>[]): {words: string; first: TimeSection} | null {
  if (!sections.some(section => section.habits.length > 0)) return null;
  const empty = sections.filter(section => section.id !== 'anytime' && section.habits.length === 0).map(section => section.id);
  if (!empty.length) return null;
  const list = empty.length === 1 ? empty[0]! : `${empty.slice(0, -1).join(', ')} or ${empty.at(-1)}`;
  return {words: `Room for ${empty[0] === 'morning' ? 'a' : 'an'} ${list} habit.`, first: empty[0]!};
}
