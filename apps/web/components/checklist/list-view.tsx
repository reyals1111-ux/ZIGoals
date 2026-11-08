'use client';
import Link from 'next/link';
import {useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent} from 'react';
import {PATH_COLOURS} from '../../lib/path/colours';
import {checklistDisplayColours} from '../../lib/checklist/display-colours';
import {moveWithinSection, sectionsOf} from '../../lib/checklist/store';
import {orbitGlyph} from '../../lib/checklist/glyphs';
import {formatClock, formatDate, formatNumber, formatTime} from '../../lib/visual-format';
import {readReminders} from '../../lib/reminders/store';
import {getAppStorage} from '../../lib/showcase-storage';
import {nextHabitDay} from '../../lib/checklist/next-day';
import {habitStats} from '../../lib/habits';
import {useDeviceRecord} from '../ai/use-device-record';
import {HABIT_EXTRAS} from '../../lib/habits-extras/schema';
import {OrbitBanner, orbitTitle} from '../orbit-path/orbit-banner';
import {OrbitNodeFace} from '../orbit-path/orbit-node';
import {SwipeRow} from '../swipe/swipe-row';
import {showStatus} from '../ui/undo-toast';
import {useDotPress} from './path-view';
import type {DerivedDot} from '../../lib/checklist/derive';
import type {PathSection} from '../../lib/path/model';
// Session AG Polish 2 (owner Part 6a): the List's sections wear the path's own Habits banners, from the Habits page's sheet.
import '../habits/habits-aa.css';
import type {ChecklistState} from './use-checklist';
import {ChecklistTasksToday, ListRowTools} from './list-extras';

/**
 * The List view (P7.17). Session AG Polish (ADR-030 J14; owner Part 7): Todoist's calm, in our design. One section per
 * orbit, each under a banner in the orbit's own node colour (no planets here) with its count and a fold. Each row: the
 * path's own node as its checkbox (34 px; matte until done, lit once done, the nebula glyph, the ring's bloom on a tick),
 * the name, a second line with the real value, what it is (a habit, a goal, Health, your own) and the time it was done;
 * on the right a compact "+" for items that take more than one check-in (it logs the usual amount) and ⋯ for its
 * details and stepper. Session AG Polish 3 (owner Part 4): a done row stays where it is, in its orbit, in the done look
 * (no "Done · n" fold, nothing hidden); Undo stays in the toast. "+ Add to Morning Orbit" ends each section (Edit path's own item form, that orbit chosen). Keyboard: the arrow
 * keys move between rows, Space or Enter ticks, the context-menu key (or Shift+F10) opens ⋯. A phone swipes a row right
 * to tick it (the app's own swipe row). The same colours, glyphs and states as the path.
 */
const KIND_WORD: Record<string, string> = {habit: 'Habit', goal: 'Goal', 'goal-step': 'Goal step', custom: 'Your own', health: 'Health'};
const KEEP_MS = 900;

export function ListView({state, onAdd, arrive = null}: {state: ChecklistState; onAdd?: (section?: string) => void; arrive?: string | null}) {
  const {panel, setPanel, press, renderPanel, busy} = useDotPress(state);
  const colours = checklistDisplayColours(state.record.data, state.dots);
  // Session AL (C-DVG-76): a habit's own clock time (set on Habits) on its row while it is still to do: "at 07:30".
  const extras = useDeviceRecord(HABIT_EXTRAS), habitTimes = extras.loaded && !extras.unreadable ? extras.data.times ?? {} : {};
  // Session AL fourth pass (C-DVG-76): a reminder time set on Habits shows too ("reminder 07:30"), and a habit not due
  // today says its next day ("next Fri 6 Nov").
  const [reminderTimes, setReminderTimes] = useState<Record<string, {time: string}>>({});
  useEffect(() => { try { setReminderTimes(readReminders(getAppStorage()).data.habits); } catch { /* no reminders shown */ } }, []);
  const habitsData = state.stores.habits.data, habitsToday = state.stores.habits.today;
  const sections = useMemo(() => sectionsOf(state.record.data), [state.record.data]);
  const groups = sections.map(s => ({id: s.id, label: s.label, dots: state.dots.filter(d => d.section === s.id)})).filter(g => g.dots.length);
  const [folded, setFolded] = useState<Record<string, boolean>>({});
  // (A row just ticked blooms once.)
  const [recent, setRecent] = useState<ReadonlySet<string>>(() => new Set()), seenDone = useRef<Set<string> | null>(null);
  const doneKey = state.dots.filter(d => d.state === 'done').map(d => d.id).join('|');
  useEffect(() => {
    const now = new Set(doneKey ? doneKey.split('|') : []), before = seenDone.current; seenDone.current = now;
    if (!before) return;
    const fresh = [...now].filter(id => !before.has(id)); if (!fresh.length) return;
    setRecent(r => new Set([...r, ...fresh]));
    const t = window.setTimeout(() => setRecent(r => { const n = new Set(r); fresh.forEach(id => n.delete(id)); return n; }), KEEP_MS);
    return () => window.clearTimeout(t);
  }, [doneKey]);
  const list = useRef<HTMLDivElement>(null);
  // Session AG Polish 2 (owner Part 5): a row just added by quick add comes into view.
  const shown = useRef<string | null>(null);
  useEffect(() => {
    if (!arrive || shown.current === arrive) return;
    const el = list.current?.querySelector<HTMLElement>(`[data-step="${CSS.escape(arrive)}"]`); if (!el) return;
    shown.current = arrive;
    el.scrollIntoView({block: 'center', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.appMotion === 'off' ? 'auto' : 'smooth'});
  });
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const checks = [...(list.current?.querySelectorAll<HTMLElement>('.checklist-row-check') ?? [])].filter(el => el.offsetParent !== null), at = checks.indexOf(e.target as HTMLElement);
    if (at < 0) return;
    // Session AL fourth pass (LS-H23, C-LS-33): Alt+↑/↓ moves the row within its orbit (the row's More has Move up / down).
    if (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      const id = (e.target as HTMLElement).dataset.step, dot = state.dots.find(d => d.id === id); if (!id || !dot) return;
      const delta = e.key === 'ArrowUp' ? -1 : 1;
      let moved = false;
      try { state.record.update(r => { const next = moveWithinSection(r, id, delta); moved = next !== r; return next; }); } catch { return; }
      if (moved) showStatus(`${dot.label} moved ${delta < 0 ? 'up' : 'down'}.`);
      requestAnimationFrame(() => list.current?.querySelector<HTMLElement>(`.checklist-row-check[data-step="${CSS.escape(id)}"]`)?.focus());
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); checks[Math.max(0, Math.min(checks.length - 1, at + (e.key === 'ArrowDown' ? 1 : -1)))]?.focus(); return; }
    if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); checks[e.key === 'Home' ? 0 : checks.length - 1]?.focus(); return; }
    if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) { e.preventDefault(); const id = (e.target as HTMLElement).dataset.step; if (id) setPanel(p => p?.id === id ? null : {id, mode: 'details'}); }
  };
  const row = (dot: DerivedDot) => {
    const done = dot.state === 'done', colour = PATH_COLOURS[colours.get(dot.id) ?? dot.colour].token, just = recent.has(dot.id);
    const label = `${dot.label}${dot.note ? `: ${dot.note}` : ''}: ${done ? 'done' : dot.state === 'running' ? 'running' : dot.counted ? 'not done yet' : 'not counted today'}`;
    const kind = KIND_WORD[dot.kind] ?? '', time = done && dot.doneAt ? formatTime(dot.doneAt) : '';
    const habitId = dot.kind === 'habit' ? (dot.item.ref as {habitId?: string} | undefined)?.habitId : undefined, clock = !done && habitId ? habitTimes[habitId] : undefined;
    const remind = !done && !clock && habitId ? reminderTimes[habitId]?.time : undefined;
    const habit = habitId && !dot.counted ? habitsData.habits.find(h => h.id === habitId) : undefined, next = habit && habitsToday ? nextHabitDay(habit, habitsToday) : null;
    // Session AL fifth pass (LS-070, C-LS-34): a habit row carries the habit's own streak, as Habits counts it (its rest
    // and skip days kept), so ticking one planet every day shows, though the flame counts only days with every planet lit.
    const own = habitId && habitsToday ? habitsData.habits.find(h => h.id === habitId) : undefined, stats = own ? habitStats(own, habitsToday!) : null;
    const streakWords = stats && stats.currentStreak > 0 ? `${formatNumber(stats.currentStreak)} ${stats.streakUnit.slice(0, -1)} streak` : '';
    const sub = [dot.note, kind, streakWords, time, clock ? `at ${formatClock(clock)}` : '', remind ? `reminder ${formatClock(remind)}` : '', next ? `next ${formatDate(next, {weekday: true, year: false})}` : ''].filter(Boolean).join(' · ');
    // Session AG Polish 2 (owner Part 6b): the node is the path's own at the path's own size (80, 72 or 62 px), and the
    // button is the node.
    const face = <OrbitNodeFace glyph={orbitGlyph(dot)} just={just}/>, style = {'--node': colour} as CSSProperties;
    const check = dot.intent === 'open' && dot.href
      ? <Link className="checklist-row-check" data-lit={done ? '' : undefined} href={dot.href} aria-label={label} data-step={dot.id} style={style}><span className="checklist-row-node orbit-node" data-lit={done ? '' : undefined} data-just={just ? '' : undefined}>{face}</span></Link>
      : <button type="button" className="checklist-row-check" data-lit={done ? '' : undefined} aria-label={label} aria-pressed={done} aria-expanded={dot.intent === 'value' ? panel?.id === dot.id : undefined} aria-busy={busy === dot.id || undefined} data-state={dot.state} data-step={dot.id} style={style} onClick={() => void press(dot, dot.intent ?? 'tick')}><span className="checklist-row-node orbit-node" data-lit={done ? '' : undefined} data-just={just ? '' : undefined}>{face}</span></button>;
    // Session AL (P-LS-18, LS-007): the "+" logs the usual amount, so a weigh-in shows it only after a real weigh-in (with no
    // history it was "+70 kg", a weight nobody typed); otherwise ⋯ opens the stepper.
    const again = dot.intent === 'value' && dot.value && !done && !(dot.input === 'weight' && dot.value.current === null);
    const content = <>
      <div className="checklist-row-line">
        {check}
        {/* (The path's name tab, from the node's right-centre to the right, longer, like a step: dark with a coloured edge,
            filled in the node's colour with dark words once done.) */}
        <span className="checklist-row-text checklist-row-tab" data-lit={done ? '' : undefined} style={{'--node': colour} as CSSProperties}><span className="checklist-row-name" dir="auto" title={dot.label}>{dot.label}</span>{sub && <span className="checklist-row-sub">{sub}</span>}</span>
        {again && <button type="button" className="checklist-row-plus" aria-label={`Log ${dot.value!.suggested} ${dot.value!.unit} for ${dot.label}`} disabled={busy === dot.id} onClick={() => void state.tick(dot, 'value', dot.value!.suggested)}>+{dot.value!.suggested}<span className="checklist-row-unit"> {dot.value!.unit}</span></button>}
        <button type="button" className="checklist-row-more" aria-label={`More for ${dot.label}`} aria-expanded={panel?.id === dot.id} onClick={() => setPanel(p => p?.id === dot.id ? null : {id: dot.id, mode: dot.intent === 'value' && !done ? 'value' : 'details'})}><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><circle cx="5" cy="12" r="1.9" fill="currentColor"/><circle cx="12" cy="12" r="1.9" fill="currentColor"/><circle cx="19" cy="12" r="1.9" fill="currentColor"/></svg></button>
      </div>
      {panel?.id === dot.id && <div className="checklist-row-panel">{renderPanel(dot)}{panel.mode === 'details' && !dot.missing && <ListRowTools state={state} dot={dot}/>}</div>}
    </>;
    return done || dot.intent === 'open'
      ? <li key={dot.id} className="checklist-row" data-state={dot.state} data-counted={dot.counted ? undefined : 'no'}>{content}</li>
      : <SwipeRow key={dot.id} as="li" className="checklist-row" nameRow={false} label={dot.label} completeLabel="Done" onComplete={() => void press(dot, dot.intent === 'value' ? 'value' : 'tick')} attrs={{'data-state': dot.state, 'data-counted': dot.counted ? undefined : 'no'}}>{content}</SwipeRow>;
  };
  return <div ref={list} className="checklist-list-view" onKeyDown={onKeyDown}>
    {/* Session AL fifth pass (LS-033, LS-070): the flame's rule, said where the rows are; each habit row has its own streak. */}
    <p className="fine checklist-streak-rule">The flame counts the days every planet was lit; a day with nothing on the path rests. Each habit row shows that habit’s own streak.</p>
    {groups.map(g => {
      const counted = g.dots.filter(d => d.counted), doneN = counted.filter(d => d.state === 'done').length, first = g.dots[0]!, tone = PATH_COLOURS[colours.get(first.id) ?? first.colour].token;
      const banner: PathSection = {id: g.id, label: g.label, colour: colours.get(first.id) ?? first.colour, steps: []};
      const open = !folded[g.id], title = orbitTitle(g.label);
      return <section key={g.id} className="checklist-list-section" data-section={g.id} aria-labelledby={`list-${g.id}`} style={{'--orbit': tone} as CSSProperties}>
        {/* Session AG Polish 2 (owner Part 6a, D-list 1–4): the path's Habits banner — symbol, nebula title, count, the short fade — and the fold. */}
        <div className="checklist-list-banner">
          <OrbitBanner section={banner} done={doneN} total={counted.length} headingId={`list-${g.id}`} heading="h3"/>
          <button type="button" className="checklist-list-fold" aria-expanded={open} aria-label={`${open ? 'Fold' : 'Open'} ${title}`} onClick={() => setFolded(f => ({...f, [g.id]: open}))}><span aria-hidden="true">›</span></button>
        </div>
        {open && <>
          <ul className="checklist-list" aria-label={title}>{g.dots.map(row)}</ul>
          {onAdd && <button type="button" className="checklist-list-add" onClick={() => onAdd(g.id)}><span aria-hidden="true">+</span> Add to {title}</button>}
        </>}
      </section>;
    })}
    <ChecklistTasksToday/>
  </div>;
}
