'use client';
import Link from 'next/link';
import {NebulaFlow} from '../nebula-flow';
import {PillarMark, pillarOfHref} from '../pillars';
import {GlassBar, GlassRing} from '../progress/glass-progress';
import {PhoneFold} from '../phone/phone-fold';
import {useUiPrefs} from '../../lib/ui-prefs/use-ui-prefs';
import {gameWidgetsOf} from '../../lib/ui-prefs/schema';
import {useGame} from './use-game';
import './game.css';

/**
 * Session AB-Design Phase 2, Part 8 (owner request 9, owner edit 1): the Journey widgets a person adds to Today through the
 * widget picker — "Level & XP" and "Today's quests" — kept on this device (`zigoals:ui-prefs:v1` today.gameWidgets) and
 * shown only while Gamify is on. The same figures as the Journey page (lib/game), nothing new is counted. Loaded after the
 * page; folded on phones like Today's other widgets.
 */
export default function TodayGameCards() {
  const prefs = useUiPrefs(), game = useGame(), chosen = prefs.loaded ? gameWidgetsOf(prefs.data) : [];
  const d = game.derived;
  if (!game.loaded || !game.enabled || !d || !chosen.length) return null;
  return <section className="today-game-cards" aria-label="Your Journey on Today">
    {chosen.map(id => id === 'xp'
      ? <PhoneFold key={id} label="Level & XP"><section className="panel today-game-card today-game-xp" aria-labelledby="today-game-xp-title">
          <GlassRing identity="today-game-ring" className="today-game-ring" arcs={[{key: 'level', end: d.xp.level.share * 100}]} role="img" aria-label={`Level ${d.xp.level.level}: ${d.xp.level.into} of ${d.xp.level.span} XP to level ${d.xp.level.level + 1}`}><strong>{d.xp.level.level}</strong><small>level</small></GlassRing>
          <div><p className="eyebrow">Level {d.xp.level.level} · Journey</p><h2 id="today-game-xp-title"><NebulaFlow identity="today-game-xp">{d.xp.level.name}</NebulaFlow></h2>
            <GlassBar identity="today-game-xp-bar" className="today-game-bar" role="progressbar" aria-label={`XP to level ${d.xp.level.level + 1}`} aria-valuenow={d.xp.level.into} aria-valuemin={0} aria-valuemax={d.xp.level.span} value={d.xp.level.share}/>
            <p className="fine">{d.xp.level.into} of {d.xp.level.span} XP to level {d.xp.level.level + 1} · {d.xp.today} XP today · {d.xp.thisWeek} this week</p>
            <Link className="text-link" href="/app/journey">Open your Journey →</Link></div>
        </section></PhoneFold>
      : <PhoneFold key={id} label="Today's quests"><section className="panel today-game-card today-game-quests" aria-labelledby="today-game-quests-title">
          <p className="eyebrow">Today · Journey</p><h2 id="today-game-quests-title"><NebulaFlow identity="today-game-quests">Today’s quests</NebulaFlow></h2>
          {d.quests.length ? <ul className="journey-quest-list">{d.quests.map(q => { const pillar = pillarOfHref(`/app/${q.page}`); return <li key={q.id} data-done={q.complete || undefined}><span className={`game-quest-mark${q.complete ? ' game-quest-done' : ''}`} aria-hidden="true">{q.complete ? '✓' : '○'}</span><div><strong>{pillar && <PillarMark pillar={pillar} size={14} className="journey-quest-pillar"/>}{q.title}</strong><small>{q.done} of {q.target} {q.unit}</small></div><GlassBar identity={`today-quest:${q.id}`} className="journey-quest-bar" aria-label={`${q.done} of ${q.target} ${q.unit}`} role="progressbar" aria-valuenow={q.done} aria-valuemin={0} aria-valuemax={q.target} value={q.target ? Math.min(1, q.done / q.target) : 0}/></li>; })}</ul>
            : <p className="fine">No quest today yet; they come from the pages you use.</p>}
          <Link className="text-link" href="/app/journey">All quests and badges →</Link>
        </section></PhoneFold>)}
  </section>;
}
