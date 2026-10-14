'use client';
import {useState, type CSSProperties} from 'react';
import Link from 'next/link';
import {NebulaFlow} from '../nebula-flow';
import {PillarHero} from '../pillar-hero';
import {PillarMark, pillarOfHref} from '../pillars';
import {GlassBar, GlassRing} from '../progress/glass-progress';
import {LayoutLockButton, LayoutPage} from '../layout-edit';
import {useGame} from './use-game';
import {CelebrationHost} from './celebration';
import {GameSetting} from './game-setting';
import {applyFreeze} from '../../lib/game/freeze';
import {formatDate} from '../../lib/visual-format';
import {storageMessageOr} from '../../lib/storage-error-copy';
import './game.css';

/**
 * /app/journey (H7): the level ring, XP this week, today's quests, the weekly challenges against yourself, the badge
 * cabinet, the path of milestones (a vertical nebula path) and the next unlock; streak repair with an earned freeze.
 * Everything is derived from the journals (lib/game); only the switch and what was seen live on the device.
 */
export function JourneyPage() {
  const game = useGame(), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const d = game.derived;
  async function repair(habitId: string, date: string) {
    setBusy(true); setMessage('');
    try { await game.habits.update(data => applyFreeze(data, habitId, date, game.today)); setMessage(`Freeze used: ${formatDate(`${date}T12:00:00`, {month: 'long', day: 'numeric'})} now counts as a rest day.`); }
    catch (e) { setMessage(storageMessageOr(e, 'The freeze was not used.')); } finally { setBusy(false); }
  }
  return <LayoutPage page="journey"><div className="journey-page">
    {/* Session AB-Design Phase 2 (ADR-024 P5): the shared pillar header, with the Gamify rocket as its mark. */}
    <PillarHero pillar="journey" titleId="journey-title" className="journey-hero" eyebrow="Your journey" title="Small steps, counted kindly." lede="Levels, quests and badges grow from the check-ins and logs you already make. Nothing is ever taken away."
      mark={<span className="pillar-mark" data-pillar="journey" aria-hidden="true"><span className="pillar-mark-disc"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15c-1.5 1.5-3.5 2-5 2 0-1.5.5-3.5 2-5M9 12l3-3c2.5-2.5 6-4 9-4 0 3-1.5 6.5-4 9l-3 3M9 12l3 3"/><circle cx="15.5" cy="8.5" r="1.4"/></svg></span></span>}><LayoutLockButton /></PillarHero>
    {!game.loaded ? <p role="status">Loading your journey…</p> : !game.enabled ? <section className="panel journey-off"><p className="eyebrow">Optional</p><h2><NebulaFlow identity="journey-off">The game layer is off.</NebulaFlow></h2><p>Turn it on to see your level, three quests a day and the badge cabinet, all from your own records. Off again whenever you like; nothing is stored but the switch.</p><GameSetting /></section> : d && <>
      <section className="panel journey-level" aria-labelledby="journey-level-title"><div className="journey-orb" aria-hidden="true"/>
        <GlassRing identity="journey-ring" className="journey-ring" arcs={[{key: 'level', end: d.xp.level.share * 100}]} role="img" aria-label={`Level ${d.xp.level.level}, ${d.xp.level.name}: ${d.xp.level.into} of ${d.xp.level.span} XP to level ${d.xp.level.level + 1}`}><strong>{d.xp.level.level}</strong><small>level</small></GlassRing>
        <div className="journey-level-copy"><p className="eyebrow">Level {d.xp.level.level}</p><h2 id="journey-level-title"><NebulaFlow identity="journey-level-name">{d.xp.level.name}</NebulaFlow></h2><p className="journey-level-line">{d.xp.level.into} of {d.xp.level.span} XP to level {d.xp.level.level + 1} · {d.xp.total} XP all told</p>
          <GlassBar identity="journey-xp" className="journey-xp-bar" role="progressbar" aria-label={`XP to level ${d.xp.level.level + 1}`} aria-valuenow={d.xp.level.into} aria-valuemin={0} aria-valuemax={d.xp.level.span} value={d.xp.level.share}/>
          <dl className="journey-stats"><div><dt>This week</dt><dd>{d.xp.thisWeek} XP</dd></div><div><dt>Last week</dt><dd>{d.xp.lastWeek} XP</dd></div><div><dt>Today</dt><dd>{d.xp.today} XP</dd></div><div><dt>Freezes</dt><dd>{d.freezes}</dd></div></dl></div>
      </section>
      <div className="journey-grid">
        <section className="panel journey-quests" aria-labelledby="journey-quests-title"><p className="eyebrow">Today</p><h2 id="journey-quests-title"><NebulaFlow identity="journey-quests">Quests</NebulaFlow></h2>
          {d.quests.length ? <ul className="journey-quest-list">{d.quests.map(q => <li key={q.id} data-done={q.complete || undefined}><span className={`game-quest-mark${q.complete ? ' game-quest-done' : ''}`} aria-hidden="true">{q.complete ? '✓' : '○'}</span><div><strong>{pillarOfHref(`/app/${q.page}`) && <PillarMark pillar={pillarOfHref(`/app/${q.page}`)!} size={14} className="journey-quest-pillar"/>}{q.title}</strong><small>{q.done} of {q.target} {q.unit}</small></div><GlassBar identity={`quest:${q.id}`} className="journey-quest-bar" aria-label={`${q.done} of ${q.target}`} role="progressbar" aria-valuenow={q.done} aria-valuemin={0} aria-valuemax={q.target} value={q.done / q.target} /></li>)}</ul> : <p className="journey-empty">No quest today: add a habit or show a page, and three will be picked from it. <Link className="text-link" href="/app/habits">Habits →</Link></p>}
          <p className="fine">Three a day, picked from your own pages. An unmet quest simply rests.</p></section>
        <section className="panel journey-challenges" aria-labelledby="journey-challenges-title"><p className="eyebrow">This week, against yourself</p><h2 id="journey-challenges-title"><NebulaFlow identity="journey-challenges">Challenges</NebulaFlow></h2>
          <ul className="journey-challenge-list">{d.challenges.map(c => <li key={c.id}><div><strong>{c.title}</strong><small>{c.thisWeek} this week · {c.lastWeek} last week</small></div><span className={`journey-challenge-mark${c.thisWeek >= c.target ? ' game-quest-done' : ''}`}>{c.thisWeek >= c.target ? '✓' : `${c.thisWeek} / ${c.target}`}</span></li>)}</ul>
          <p className="fine">No ranking and no other people: one more than last week is the whole game.</p></section>
      </div>
      <section className="panel journey-badges" aria-labelledby="journey-badges-title"><p className="eyebrow">Earned from your records</p><h2 id="journey-badges-title"><NebulaFlow identity="journey-badges">Badge cabinet</NebulaFlow></h2>
        <ul className="journey-badge-grid">{d.badges.map(b => <li key={b.id} data-earned={b.earned || undefined} aria-label={`${b.title}: ${b.earned ? 'earned' : 'not yet'}`}><span className="journey-badge-symbol" aria-hidden="true">{b.symbol}</span><strong>{b.title}</strong><small>{b.blurb}</small></li>)}</ul></section>
      <section className="panel journey-path-panel" aria-labelledby="journey-path-title"><p className="eyebrow">The path</p><h2 id="journey-path-title"><NebulaFlow identity="journey-path">Milestones</NebulaFlow></h2>
        <ol className="journey-path">{d.path.map(stop => <li key={stop.level} data-reached={stop.reached || undefined} data-current={stop.current || undefined} style={{'--planet-hue': `${(stop.level * 47) % 360}deg`} as CSSProperties}><span className="journey-path-node" aria-hidden="true">{stop.reached ? '✓' : stop.level}</span><div><strong>Level {stop.level} · {stop.name}</strong><small>{stop.reached ? stop.current ? 'You are here' : 'Reached' : `${stop.xp - d.xp.total} XP to go`}</small>{stop.badges.length > 0 && <small className="journey-path-badge">{stop.badges.map(b => `${b.symbol} ${b.title}`).join(' · ')}</small>}</div></li>)}</ol>
        <p className="journey-next"><span className="eyebrow">Next unlock</span>{(() => { const next = d.badges.find(b => !b.earned); const stop = d.path.find(s => !s.reached); return <strong>{next ? `${next.symbol} ${next.title}: ${next.blurb}` : stop ? `Level ${stop.level} · ${stop.name}` : 'Everything on the path, reached.'}</strong>; })()}</p></section>
      <section className="panel journey-freeze" aria-labelledby="journey-freeze-title"><p className="eyebrow">Streak repair</p><h2 id="journey-freeze-title"><NebulaFlow identity="journey-freeze">Freezes</NebulaFlow></h2>
        <p>{d.freezes > 0 ? `You have ${d.freezes} ${d.freezes === 1 ? 'freeze' : 'freezes'}: each turns one missed day of the last week into a rest day.` : 'A seven-day streak on any habit earns a freeze, which repairs one missed day of the last week.'}</p>
        {d.freezes > 0 && d.repairable.length > 0 && <ul className="journey-repair-list">{d.repairable.slice(0, 6).map(r => <li key={`${r.habitId}:${r.date}`}><span>{r.title} · {formatDate(`${r.date}T12:00:00`, {weekday: 'short', month: 'short', day: 'numeric'})}</span><button type="button" className="secondary" disabled={busy} onClick={() => void repair(r.habitId, r.date)}>Use a freeze</button></li>)}</ul>}
        {d.freezes > 0 && d.repairable.length === 0 && <p className="fine">Nothing to repair this week.</p>}
        {message && <p role="status" className="fine">{message}</p>}</section>
      <section className="panel journey-settings"><GameSetting /></section>
      <CelebrationHost game={game} />
    </>}
  </div></LayoutPage>;
}
