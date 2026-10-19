'use client';
import Link from 'next/link';
import {useMemo, type CSSProperties} from 'react';
import {PATH_COLOURS, pathColour} from '../../lib/path/colours';
import {sectionsOf} from '../../lib/checklist/store';
import {PathGlyph} from '../path/path-glyphs';
import {itemGlyph} from '../../lib/checklist/glyphs';
import {useDotPress} from './path-view';
import type {ChecklistState} from './use-checklist';

/**
 * The List view (P7.17): compact pills, Todoist-style, one 44 px row each: a round check in the chosen accent colour, the
 * label with its note, its orbit as a small tag, the value at the end. The same presses as the Path (a value opens the
 * stepper under its row). Watch-sized by design: the base for future wearables (docs/product/CHECKLIST.md).
 */
export function ListView({state}: {state: ChecklistState}) {
  const {panel, press, renderPanel, busy} = useDotPress(state), accent = PATH_COLOURS[pathColour(state.prefs.accent)].token;
  const orbit = useMemo(() => new Map(sectionsOf(state.record.data).map(s => [s.id, s.label])), [state.record.data]);
  return <ul className="checklist-list" aria-label="Today's list" style={{'--accent': accent} as CSSProperties}>
    {state.dots.map(dot => {
      const done = dot.state === 'done', label = `${dot.label}${dot.note ? `: ${dot.note}` : ''}: ${done ? 'done' : dot.state === 'running' ? 'running' : dot.counted ? 'not done yet' : 'not counted today'}`;
      const check = dot.intent === 'open' && dot.href
        ? <Link className="checklist-pill-check" href={dot.href} aria-label={label} data-state={dot.state}><PathGlyph name={itemGlyph(dot)} size={18}/></Link>
        : <button type="button" className="checklist-pill-check" aria-label={label} aria-pressed={done} aria-expanded={dot.intent === 'value' ? panel?.id === dot.id : undefined} aria-busy={busy === dot.id || undefined} data-state={dot.state} data-step={dot.id} onClick={() => void press(dot, dot.intent ?? 'tick')}>{done ? <PathGlyph name="check" size={18}/> : dot.state === 'running' ? <PathGlyph name={itemGlyph(dot)} size={18}/> : null}</button>;
      return <li key={dot.id} className="checklist-pill" data-state={dot.state} data-counted={dot.counted ? undefined : 'no'}>
        <div className="checklist-pill-row">
          {check}
          <span className="checklist-pill-text"><span className="checklist-pill-label">{dot.label}</span>{dot.note && <span className="checklist-pill-note">{dot.note}</span>}</span>
          <span className="checklist-pill-tag" style={{'--tag': PATH_COLOURS[dot.colour].token} as CSSProperties}>{orbit.get(dot.section) ?? dot.section}</span>
        </div>
        {panel?.id === dot.id && <div className="checklist-pill-panel">{renderPanel(dot)}</div>}
      </li>;
    })}
  </ul>;
}
