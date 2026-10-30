'use client';
import Link from 'next/link';
import {useId, useMemo} from 'react';
import {useUiPrefs} from '../../lib/ui-prefs/use-ui-prefs';
import {lifeScore} from '../../lib/life-score';
import {PILLAR_LABEL, type UniverseInput} from '../../lib/universe/model';

/**
 * Session AJ (item 29; owner decision D10): the Life Score on My Universe, off until the person turns it on
 * (zigoals:ui-prefs:v1 `lifeScore`). 0–100 from the last two weeks of their own records, a Why? per pillar, pillars without
 * records left out (never zero), kind words, nothing compared with anyone; not part of the game layer. On Today only as a
 * For-you card while it is on. Viewing writes nothing.
 */
export function LifeScorePanel({input}: {input: UniverseInput}) {
  const prefs = useUiPrefs(), id = useId(), score = useMemo(() => lifeScore(input), [input]);
  if (!prefs.loaded) return null;
  const set = (on: boolean) => { try { void prefs.update(r => ({...r, lifeScore: on})); } catch { /* unchanged */ } };
  if (prefs.data.lifeScore !== true) return <div className="life-score life-score-offer" role="group" aria-labelledby={`${id}-t`}>
    <p className="eyebrow">OPTIONAL</p><h3 id={`${id}-t`}>Life Score</h3>
    <p className="fine">One number from 0 to 100 for the last two weeks of your habits, Health, goals and money, from your own records only, with the reasons behind it. Off until you turn it on.</p>
    <button type="button" className="secondary" onClick={() => set(true)}>Turn on Life Score</button>
  </div>;
  return <div className="life-score" role="group" aria-labelledby={`${id}-t`}>
    <p className="eyebrow">LIFE SCORE · LAST 2 WEEKS</p>
    <h3 id={`${id}-t`}>{score ? <><span className="life-score-number">{score.score}</span> <span className="life-score-of">of 100</span></> : 'Not yet'}</h3>
    <p>{score ? score.words : 'It starts once you have a habit, a Health log, a goal or something in Wealth.'}</p>
    {score && <ul className="life-score-pillars">{score.pillars.map(p => <li key={p.pillar} data-pillar={p.pillar}><details><summary><strong>{PILLAR_LABEL[p.pillar]}</strong> {p.score}</summary><p className="fine">Why? {p.why}</p></details></li>)}</ul>}
    {score && score.left.length > 0 && <p className="fine">Left out, with no records yet: {score.left.map(p => PILLAR_LABEL[p]).join(', ')}. A pillar without records never counts as zero.</p>}
    <p className="fine">Your own records only; not a judgement and not compared with anyone. <button type="button" className="text-link" onClick={() => set(false)}>Turn off</button></p>
  </div>;
}
/** Today: the score in one line while it is on (a For-you card, ADR-035 P8). */
export function LifeScoreTodayCard({input}: {input: UniverseInput}) {
  const score = useMemo(() => lifeScore(input), [input]);
  if (!score) return null;
  return <article className="panel life-score-card" aria-labelledby="life-score-today">
    <p className="eyebrow">LIFE SCORE · LAST 2 WEEKS</p>
    <h3 id="life-score-today">{score.score} of 100</h3>
    <p>{score.words}</p>
    <Link className="text-link" href="/app/journey#universe">Why? On My Universe →</Link>
  </article>;
}
