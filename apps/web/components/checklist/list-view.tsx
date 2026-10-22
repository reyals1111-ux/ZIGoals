'use client';
import Link from 'next/link';
import {useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent} from 'react';
import {PATH_COLOURS} from '../../lib/path/colours';
import {checklistDisplayColours} from '../../lib/checklist/display-colours';
import {sectionsOf} from '../../lib/checklist/store';
import {orbitGlyph} from '../../lib/checklist/glyphs';
import {formatTime} from '../../lib/visual-format';
import {orbitTitle} from '../orbit-path/orbit-banner';
import {OrbitNodeFace} from '../orbit-path/orbit-node';
import {SwipeRow} from '../swipe/swipe-row';
import {useDotPress} from './path-view';
import type {DerivedDot} from '../../lib/checklist/derive';
import type {ChecklistState} from './use-checklist';

/**
 * The List view (P7.17). Session AG Polish (ADR-030 J14; owner Part 7): Todoist's calm, in our design. One section per
 * orbit, each under a banner in the orbit's own node colour (no planets here) with its count and a fold. Each row: the
 * path's own node as its checkbox (34 px; matte until done, lit once done, the nebula glyph, the ring's bloom on a tick),
 * the name, a second line with the real value, what it is (a habit, a goal, Health, your own) and the time it was done;
 * on the right a compact "+" for items that take more than one check-in (it logs the usual amount) and ⋯ for its
 * details and stepper. A done row moves, a moment after its bloom, into the section's "Done · n" fold; Undo stays in the
 * toast. "+ Add to Morning Orbit" ends each section (Edit path's own item form, that orbit chosen). Keyboard: the arrow
 * keys move between rows, Space or Enter ticks, the context-menu key (or Shift+F10) opens ⋯. A phone swipes a row right
 * to tick it (the app's own swipe row). The same colours, glyphs and states as the path.
 */
const KIND_WORD: Record<string, string> = {habit: 'Habit', goal: 'Goal', 'goal-step': 'Goal step', custom: 'Your own', health: 'Health'};
const KEEP_MS = 900;

export function ListView({state, onAdd}: {state: ChecklistState; onAdd?: (section?: string) => void}) {
  const {panel, setPanel, press, renderPanel, busy} = useDotPress(state);
  const colours = checklistDisplayColours(state.record.data, state.dots);
  const sections = useMemo(() => sectionsOf(state.record.data), [state.record.data]);
  const groups = sections.map(s => ({id: s.id, label: s.label, dots: state.dots.filter(d => d.section === s.id)})).filter(g => g.dots.length);
  const [folded, setFolded] = useState<Record<string, boolean>>({}), [doneOpen, setDoneOpen] = useState<Record<string, boolean>>({});
  // (A row just ticked stays in place for its bloom, then moves into the fold.)
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
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const checks = [...(list.current?.querySelectorAll<HTMLElement>('.checklist-row-check') ?? [])].filter(el => el.offsetParent !== null), at = checks.indexOf(e.target as HTMLElement);
    if (at < 0) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); checks[Math.max(0, Math.min(checks.length - 1, at + (e.key === 'ArrowDown' ? 1 : -1)))]?.focus(); return; }
    if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); checks[e.key === 'Home' ? 0 : checks.length - 1]?.focus(); return; }
    if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) { e.preventDefault(); const id = (e.target as HTMLElement).dataset.step; if (id) setPanel(p => p?.id === id ? null : {id, mode: 'details'}); }
  };
  const row = (dot: DerivedDot) => {
    const done = dot.state === 'done', colour = PATH_COLOURS[colours.get(dot.id) ?? dot.colour].token, just = recent.has(dot.id);
    const label = `${dot.label}${dot.note ? `: ${dot.note}` : ''}: ${done ? 'done' : dot.state === 'running' ? 'running' : dot.counted ? 'not done yet' : 'not counted today'}`;
    const kind = KIND_WORD[dot.kind] ?? '', time = done && dot.doneAt ? formatTime(dot.doneAt) : '';
    const sub = [dot.note, kind, time].filter(Boolean).join(' · ');
    // (The node is the path's own, 34 px; its button is a 44 px touch target around it.)
    const face = <OrbitNodeFace glyph={orbitGlyph(dot)} just={just}/>, style = {'--node': colour, '--node-size': '34px'} as CSSProperties;
    const check = dot.intent === 'open' && dot.href
      ? <Link className="checklist-row-check" data-lit={done ? '' : undefined} href={dot.href} aria-label={label} data-step={dot.id} style={style}><span className="checklist-row-node orbit-node" data-lit={done ? '' : undefined} data-just={just ? '' : undefined}>{face}</span></Link>
      : <button type="button" className="checklist-row-check" data-lit={done ? '' : undefined} aria-label={label} aria-pressed={done} aria-expanded={dot.intent === 'value' ? panel?.id === dot.id : undefined} aria-busy={busy === dot.id || undefined} data-state={dot.state} data-step={dot.id} style={style} onClick={() => void press(dot, dot.intent ?? 'tick')}><span className="checklist-row-node orbit-node" data-lit={done ? '' : undefined} data-just={just ? '' : undefined}>{face}</span></button>;
    const again = dot.intent === 'value' && dot.value && !done;
    const content = <>
      <div className="checklist-row-line">
        {check}
        <span className="checklist-row-text"><span className="checklist-row-name" title={dot.label}>{dot.label}</span>{sub && <span className="checklist-row-sub">{sub}</span>}</span>
        {again && <button type="button" className="checklist-row-plus" aria-label={`Log ${dot.value!.suggested} ${dot.value!.unit} for ${dot.label}`} disabled={busy === dot.id} onClick={() => void state.tick(dot, 'value', dot.value!.suggested)}>+{dot.value!.suggested}<span className="checklist-row-unit"> {dot.value!.unit}</span></button>}
        <button type="button" className="checklist-row-more" aria-label={`More for ${dot.label}`} aria-expanded={panel?.id === dot.id} onClick={() => setPanel(p => p?.id === dot.id ? null : {id: dot.id, mode: dot.intent === 'value' && !done ? 'value' : 'details'})}><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><circle cx="5" cy="12" r="1.9" fill="currentColor"/><circle cx="12" cy="12" r="1.9" fill="currentColor"/><circle cx="19" cy="12" r="1.9" fill="currentColor"/></svg></button>
      </div>
      {panel?.id === dot.id && <div className="checklist-row-panel">{renderPanel(dot)}</div>}
    </>;
    return done || dot.intent === 'open'
      ? <li key={dot.id} className="checklist-row" data-state={dot.state} data-counted={dot.counted ? undefined : 'no'}>{content}</li>
      : <SwipeRow key={dot.id} as="li" className="checklist-row" nameRow={false} label={dot.label} completeLabel="Done" onComplete={() => void press(dot, dot.intent === 'value' ? 'value' : 'tick')} attrs={{'data-state': dot.state, 'data-counted': dot.counted ? undefined : 'no'}}>{content}</SwipeRow>;
  };
  return <div ref={list} className="checklist-list-view" onKeyDown={onKeyDown}>
    {groups.map(g => {
      const counted = g.dots.filter(d => d.counted), doneN = counted.filter(d => d.state === 'done').length, first = g.dots[0]!, tone = PATH_COLOURS[colours.get(first.id) ?? first.colour].token;
      const open = !folded[g.id], waiting = g.dots.filter(d => d.state !== 'done' || recent.has(d.id)), finished = g.dots.filter(d => d.state === 'done' && !recent.has(d.id)), title = orbitTitle(g.label);
      return <section key={g.id} className="checklist-list-section" data-section={g.id} aria-labelledby={`list-${g.id}`} style={{'--orbit': tone} as CSSProperties}>
        <div className="checklist-list-banner">
          <h3 id={`list-${g.id}`}>{title}</h3>
          <span className="checklist-list-count"><span aria-hidden="true">{doneN}/{counted.length}</span><span className="sr-only">{doneN} of {counted.length} done</span></span>
          <button type="button" className="checklist-list-fold" aria-expanded={open} aria-label={`${open ? 'Fold' : 'Open'} ${title}`} onClick={() => setFolded(f => ({...f, [g.id]: open}))}><span aria-hidden="true">›</span></button>
        </div>
        {open && <>
          <ul className="checklist-list" aria-label={title}>{waiting.map(row)}</ul>
          {finished.length > 0 && <details className="checklist-list-done" open={!!doneOpen[g.id]} onToggle={e => { const o = (e.currentTarget as HTMLDetailsElement).open; setDoneOpen(d => ({...d, [g.id]: o})); }}>
            <summary>Done · {finished.length}</summary>
            <ul className="checklist-list" aria-label={`${title}, done`}>{finished.map(row)}</ul>
          </details>}
          {onAdd && <button type="button" className="checklist-list-add" onClick={() => onAdd(g.id)}><span aria-hidden="true">+</span> Add to {title}</button>}
        </>}
      </section>;
    })}
  </div>;
}
