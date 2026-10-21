'use client';
import Link from 'next/link';
import {Fragment, useMemo, type CSSProperties} from 'react';
import {PATH_COLOURS, pathColour} from '../../lib/path/colours';
import {nebulaColour} from '../../lib/path/orbit-colours';
import {checklistDisplayColours} from '../../lib/checklist/display-colours';
import {sectionsOf} from '../../lib/checklist/store';
import {itemGlyph} from '../../lib/checklist/glyphs';
import {PathGlyph} from '../path/path-glyphs';
import {useDotPress} from './path-view';
import type {ChecklistState} from './use-checklist';

/**
 * The List view (P7.17): compact pills, Todoist-style, one 44 px row each: a round check, the label, the same presses as the
 * Path (a value opens the stepper under its row). Watch-sized by design: the base for future wearables
 * (docs/product/CHECKLIST.md).
 *
 * Session AF (L3b; the owner's Todoist Wear OS reference, critique round L3b-1): the chosen accent themes the list — a filled
 * accent "Add to your path" pill at its head (opens Edit path) and accent-tinted single-line rows — grouped under their
 * orbits' names; each check wears the item's own colour and mark (filled with a check once done). A row's note and state
 * are in its check's name.
 */
export function ListView({state, onAdd}: {state: ChecklistState; onAdd?: () => void}) {
  const {panel, press, renderPanel, busy} = useDotPress(state), accent = PATH_COLOURS[nebulaColour(pathColour(state.prefs.accent))].token;
  // Session AG: each item in the colour it wears on the path (ADR-029 I3).
  const colours = checklistDisplayColours(state.record.data, state.dots);
  const sections = useMemo(() => sectionsOf(state.record.data), [state.record.data]);
  const groups = sections.map(s => ({id: s.id, label: s.label, dots: state.dots.filter(d => d.section === s.id)})).filter(g => g.dots.length);
  return <div className="checklist-list-view" style={{'--accent': accent} as CSSProperties}>
    {onAdd && <button type="button" className="checklist-list-add" onClick={onAdd}><span aria-hidden="true">+</span>Add to your path</button>}
    <ul className="checklist-list" aria-label="Today's list">
      {groups.map(g => <Fragment key={g.id}>
        <li className="checklist-list-orbit"><h3>{g.label}</h3><span aria-hidden="true">{g.dots.filter(d => d.counted && d.state === 'done').length}/{g.dots.filter(d => d.counted).length}</span></li>
        {g.dots.map(dot => {
          const done = dot.state === 'done', label = `${dot.label}${dot.note ? `: ${dot.note}` : ''}: ${done ? 'done' : dot.state === 'running' ? 'running' : dot.counted ? 'not done yet' : 'not counted today'}`;
          const mark = <PathGlyph name={done ? 'check' : itemGlyph(dot)} size={20}/>, style = {'--item': PATH_COLOURS[colours.get(dot.id) ?? dot.colour].token} as CSSProperties;
          const check = dot.intent === 'open' && dot.href
            ? <Link className="checklist-pill-check" href={dot.href} aria-label={label} data-state={dot.state} style={style}>{mark}</Link>
            : <button type="button" className="checklist-pill-check" aria-label={label} aria-pressed={done} aria-expanded={dot.intent === 'value' ? panel?.id === dot.id : undefined} aria-busy={busy === dot.id || undefined} data-state={dot.state} data-step={dot.id} style={style} onClick={() => void press(dot, dot.intent ?? 'tick')}>{mark}</button>;
          return <li key={dot.id} className="checklist-pill" data-state={dot.state} data-counted={dot.counted ? undefined : 'no'}>
            <div className="checklist-pill-row">
              {check}
              <span className="checklist-pill-text"><span className="checklist-pill-label" title={dot.label}>{dot.label}</span></span>
            </div>
            {panel?.id === dot.id && <div className="checklist-pill-panel">{renderPanel(dot)}</div>}
          </li>;
        })}
      </Fragment>)}
    </ul>
  </div>;
}
