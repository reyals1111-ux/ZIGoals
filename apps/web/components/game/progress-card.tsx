'use client';
import {useState} from 'react';
import Link from 'next/link';
import {GlassBar} from '../progress/glass-progress';
import {usePhoneActive} from '../phone/use-phone-layout';
import {useGame} from './use-game';
import {CelebrationHost} from './celebration';
import type {ProgressPage} from './slot-local';
import './game.css';

const PAGE_QUEST: Record<ProgressPage, string[]> = {today: ['today', 'habits', 'health', 'goals'], goals: ['goals'], habits: ['habits'], health: ['health'], wealth: ['wealth', 'goals'], markets: ['wealth', 'goals'], portfolio: ['wealth', 'goals'], activity: ['habits', 'health', 'goals']};
/**
 * H7: the compact quest/XP card for a page's progress slot: the level, XP this week, the page's quest and its progress.
 * Phones get a slim strip that expands on tap. Renders nothing while the game layer is off (the setting decides).
 * The celebration host rides with it, so a celebration can show on every page that has a slot.
 */
export function ProgressCard({page}: {page: ProgressPage}) {
  const game = useGame(), phone = usePhoneActive(), [open, setOpen] = useState(false);
  if (!game.enabled || !game.derived) return null;
  const {xp, quests} = game.derived;
  const mine = quests.find(q => PAGE_QUEST[page].includes(q.page)) ?? quests[0];
  const done = quests.filter(q => q.complete).length;
  const body = <div className="game-card-body">
    <div className="game-card-level"><span className="game-level-pill">Lv {xp.level.level}</span><div><strong>{xp.level.name}</strong><small>{xp.thisWeek} XP this week · {xp.level.into} of {xp.level.span} to level {xp.level.level + 1}</small></div></div>
    <GlassBar identity={`game-card:${page}`} className="game-card-bar" aria-label={`${xp.level.into} of ${xp.level.span} XP to the next level`} role="progressbar" aria-valuenow={xp.level.into} aria-valuemin={0} aria-valuemax={xp.level.span} value={xp.level.share} />
    {mine ? <p className="game-card-quest"><span className={`game-quest-mark${mine.complete ? ' game-quest-done' : ''}`} aria-hidden="true">{mine.complete ? '✓' : '○'}</span><span>{mine.title}</span><small>{mine.done} / {mine.target}</small></p> : <p className="game-card-quest"><span>Quests today: {done} of {quests.length} done</span></p>}
    <Link className="text-link" href="/app/journey">Open your Journey →</Link>
  </div>;
  return <>
    <section className={`panel game-card${phone ? ' game-card-strip' : ''}`} aria-label="Your progress" data-open={open || undefined}>
      {phone ? <><button type="button" className="game-strip-toggle" aria-expanded={open} onClick={() => setOpen(o => !o)}><span className="game-level-pill">Lv {xp.level.level}</span><span className="game-strip-text">{mine ? `${mine.complete ? '✓ ' : ''}${mine.title}` : `${done} of ${quests.length} quests`}</span><span className="game-strip-xp">{xp.thisWeek} XP</span><span className="habit-section-chevron" aria-hidden="true">›</span></button>{open && body}</> : <><p className="eyebrow">Your progress</p>{body}</>}
    </section>
    <CelebrationHost game={game} />
  </>;
}
export const TodayGameCard = () => <ProgressCard page="today" />;
export const GoalsGameCard = () => <ProgressCard page="goals" />;
export const HabitsGameCard = () => <ProgressCard page="habits" />;
export const HealthGameCard = () => <ProgressCard page="health" />;
export const WealthGameCard = () => <ProgressCard page="wealth" />;
export const MarketsGameCard = () => <ProgressCard page="markets" />;
export const PortfolioGameCard = () => <ProgressCard page="portfolio" />;
export const ActivityGameCard = () => <ProgressCard page="activity" />;
