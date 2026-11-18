'use client';
import type {StreakView} from '../../../../lib/nova/cards/ax/day-streaks';
import type {WidgetSize} from '../../../../lib/nova/store';
import {formatDate} from '../../../../lib/visual-format';
import {HoloTable} from '../../holo/parts';
import {CardFoot, Fact} from '../kit';
import {AxdFlames} from './day-flames';
import {AxdKey} from './day-key';
import {AxBody, AxHead} from './kit';

/**
 * Session AS (ADR-042 Part 2, family: flames): the body the journal's and the focus sessions' streak widgets share — the
 * days in a row now as one flame beside the longest run of the last year as another, on one scale. Today still open does
 * not break a run and is said as such. Compact: the figure. A hero adds the last fourteen days and the longest run's end.
 */
export function StreakBody({kind, size, view, did, what, source, today}: {kind: string; size: WidgetSize; view: StreakView; /** "written", "with a focus session". */ did: string; /** "an entry", "a focus session". */ what: string; source: string; today: string}) {
  const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`, top = Math.max(1, view.best);
  const ended = view.bestEnded ? formatDate(view.bestEnded, {year: view.bestEnded.slice(0, 4) !== today.slice(0, 4)}) : null;
  const state = view.todayDone ? `Today counts: ${what} is in` : view.current ? `Today is still open: ${what} today keeps it going` : 'No run going right now';
  return <AxBody kind={kind} size={size}>
    <AxHead figure={String(view.current)} unit={view.current === 1 ? 'day' : 'days'} label={`in a row ${did}`} note={`${state} · longest ${days(view.best)}`}/>
    {size !== 'S' && <AxdFlames flames={[
      {key: 'now', label: 'Now', figure: String(view.current), share: view.current / top, title: `${days(view.current)} in a row now`},
      {key: 'best', label: 'Longest', figure: String(view.best), share: view.best / top, title: `Longest run: ${days(view.best)}`},
    ]}/>}
    {size === 'L' && <div className="nc-facts axd-facts">
      <Fact label="Last 14 days" value={`${days(view.recent)} ${did}`}/>
      {ended && <Fact label="Longest run ended" value={ended}/>}
    </div>}
    {size === 'L' && <AxdKey items={[['lit', 'A run of days'], ['none', 'No run going']]}/>}
    <CardFoot source={source} asOf="today"/>
    <HoloTable caption={`Days in a row ${did}`} rows={[
      [`Days in a row ${did} now`, view.current ? days(view.current) : 'No run going'],
      ['Longest run in the last year', view.best ? `${days(view.best)}${ended ? `, ended ${ended}` : ''}` : 'None yet'],
      [`Days ${did} in the last 14`, days(view.recent)],
      ['Today', view.todayDone ? `Counts: ${what} is in` : 'Still open'],
    ]}/>
  </AxBody>;
}
