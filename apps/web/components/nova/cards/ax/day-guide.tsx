'use client';
import {WholeRows} from '../whole-rows';
import {axIndex} from './kit';
import './day.css';

/**
 * Session AS (ADR-042 Part 2, family: NOVA's guide): what NOVA answers, as rows — a group's name and one or two example
 * questions in plain words. The rows that fit show, then how many kinds more (cards/whole-rows.tsx).
 * Arrives: the questions appear one after another, as if asked. Alive: a caret blinks after the first one.
 * The same words stand in the widget's table for assistive technology.
 */
export function AxdGuide({groups, both}: {groups: readonly {key: string; label: string; asks: readonly string[]}[]; both: boolean}) {
  return <WholeRows as="ul" inline className="axd-inst axd-guide" aria-hidden min={1} more={hidden => `+${hidden} more ${hidden === 1 ? 'kind' : 'kinds'} of question`}>
    {groups.map((g, i) => <li key={g.key} className="axd-guide-row">
      <span className="axd-guide-name">{g.label}</span>
      <span className="axd-guide-asks">{g.asks.slice(0, both ? 2 : 1).map((ask, k) => <span key={ask} className="axd-guide-ask" style={axIndex(i * (both ? 2 : 1) + k)}>“{ask}”{i === 0 && k === 0 ? <i className="axd-guide-caret"/> : null}</span>)}</span>
    </li>)}
  </WholeRows>;
}
