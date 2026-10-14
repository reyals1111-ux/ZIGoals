'use client';
import {useState} from 'react';
import Link from 'next/link';
import {GlassBar} from '../progress/glass-progress';
import {usePhoneActive} from '../phone/use-phone-layout';
import {useGame} from './use-game';
import {CelebrationHost} from './celebration';
import type {ProgressPage} from './slot-local';
import './game.css';

const PAGE_NAME: Record<ProgressPage, string> = {today: 'Today', goals: 'Goals', habits: 'Habits', health: 'Health', wealth: 'Wealth', markets: 'Markets', portfolio: 'Portfolio', activity: 'Activity'};
const PAGE_QUEST: Record<ProgressPage, string[]> = {today: ['today', 'habits', 'health', 'goals'], goals: ['goals'], habits: ['habits'], health: ['health'], wealth: ['wealth', 'goals'], markets: ['wealth', 'goals'], portfolio: ['wealth', 'goals'], activity: ['habits', 'health', 'goals']};
/**
 * H7: the compact quest/XP card for a page's progress slot: the level, XP this week, the page's quest and its progress.
 * Phones get a slim strip that expands on tap. Renders nothing while the game layer is off (the setting decides).
 * The celebration host rides with it, so a celebration can show on every page that has a slot.
 */
export function ProgressCard({page}: {page: ProgressPage}) {
  // ADR-022 B53 made it the slim strip on every width because a 350 px card in the highlight area pushed pinned content out
  // of view. Session AB-Design moved every game card to the page's bottom (owner request 9), so Phase 2, Part 8 (owner
  // request 31) brings back a compact Journey card on computers and tablets (about 120 px, two columns); phones keep the strip.
  const game = useGame(), phone = usePhoneActive(), [open, setOpen] = useState(false);
  if (!game.enabled || !game.derived) return null;
  const {xp, quests} = game.derived;
  // Owner request 23: the quest shown is the one that fits the page; with none from this page today, the card says so
  // (and how the day's quests stand) instead of showing an unrelated one.
  const mine = quests.find(q => PAGE_QUEST[page].includes(q.page));
  const done = quests.filter(q => q.complete).length;
  const body = <div className="game-card-body">
    <div className="game-card-level"><span className="game-level-pill">Lv {xp.level.level}</span><div><strong>{xp.level.name}</strong><small>{xp.thisWeek} XP this week · {xp.level.into} of {xp.level.span} to level {xp.level.level + 1}</small></div></div>
    <GlassBar identity={`game-card:${page}`} className="game-card-bar" aria-label={`${xp.level.into} of ${xp.level.span} XP to the next level`} role="progressbar" aria-valuenow={xp.level.into} aria-valuemin={0} aria-valuemax={xp.level.span} value={xp.level.share} />
    {mine ? <p className="game-card-quest"><span className={`game-quest-mark${mine.complete ? ' game-quest-done' : ''}`} aria-hidden="true">{mine.complete ? '✓' : '○'}</span><span>{mine.title}</span><small>{mine.done} / {mine.target}</small></p> : <p className="game-card-quest"><span>{quests.length ? `No ${PAGE_NAME[page]} quest today · ${done} of ${quests.length} quests done` : 'No quest today yet'}</span></p>}
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
