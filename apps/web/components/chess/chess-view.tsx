'use client';
import {removeWithUndo} from '../ui/remove-with-undo';
import {lazy, Suspense, useEffect, useState, type FormEvent} from 'react';
import Link from 'next/link';
import {NebulaFlow} from '../nebula-flow';
import {HeaderArtCorner, OrbitArt} from '../header-art/orbit-art';
import {ChessGlyph} from '../header-art/glyphs/chess';
import {CHESS_CONTROLS, CHESS_SITES, type ChessControl, type ChessGoal, type ChessSite} from '../../lib/skills/chess/schema';
import {CONTROL_NAME, SITE_NAME, currentRatings, goalProgress, ratingLine, removeChessGoal, results, saveChessGoal, setChessHabit, type Record3} from '../../lib/skills/chess/engine';
import {sitePausedFor} from '../../lib/skills/chess/api';
import {formatDate, formatDateTime, formatNumber} from '../../lib/visual-format';
import {useHabits} from '../habits/use-habits';
import {useChess} from './use-chess';
import {ChessUsernames} from './chess-usernames';
import {RatingChart} from './rating-chart';
import {ChessFrames, PlayLinks} from './chess-frames';
import {useChessCheckIn} from './use-chess-check-in';
import './chess.css';
import {Skeleton} from '../ui/skeleton';
import {ShowcaseTag} from '../ui/showcase-tag';
import type {HabitsStore} from '../habits/use-habits';
import {ArtNote} from '../illustrations/art-note';
import {FieldError, useFormErrors} from '../primitives/field-error';
import {currentStreak, longestWinStreak, openingStats, streakText} from '../../lib/chess/streak';
/** Today on this device, as the date field writes it (YYYY-MM-DD, local). */
const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// Session AK (ADR-036 Q8, lane C): Play (the in-app board, Lichess's Board API and the daily puzzle) is its own chunk,
// loaded only when the person opens it or comes back from connecting Lichess (/app/chess?lichess=callback).
const PlayPanel = lazy(() => import('./board/play-panel'));

/**
 * The Chess page (Session W Part 14; /app/chess, its own chunk): ratings and recent games from chess.com and Lichess by
 * the person's usernames, results by colour and time control, rating goals, the habit chess ticks off, and the sites'
 * own daily puzzle and TV, opened only on a tap. Numbers are the sites' own; nothing is estimated.
 */
const time = (iso: string) => formatDateTime(iso);
const record = (r: Record3) => `${r.win} won · ${r.draw} drawn · ${r.loss} lost`;
export function ChessView() {
  const state = useChess('page'), {cache, chess, busy, errors, refresh, showcase, settings} = state, habits = useHabits();
  useChessCheckIn(state, habits);
  const hasUser = !!chess?.chesscom || !!chess?.lichess, data = cache.loaded && !cache.unreadable ? cache.data : null;
  const ratings = data ? currentRatings(data) : [], games = data?.games ?? [], tally = results(games.slice(0, 100));
  const lines = data ? CHESS_SITES.flatMap(site => CHESS_CONTROLS.map(control => ({site, control, points: ratingLine(data, site, control)}))).filter(l => l.points.length >= 2) : [];
  const paused = CHESS_SITES.map(site => sitePausedFor(site)).some(ms => ms > 0), [wakes, wake] = useState(0);
  // Session X Part 14 (J187): draw again when a site's pause runs out, so Refresh comes back by itself.
  useEffect(() => { if (!paused) return; const timer = window.setTimeout(() => wake(n => n + 1), Math.max(...CHESS_SITES.map(sitePausedFor)) + 50); return () => window.clearTimeout(timer); }, [paused, wakes]);
  return <div className="chess-page">
    <div className="page-heading header-art-host"><div>
      <p className="eyebrow page-eyebrow"><NebulaFlow identity="chess-eyebrow">YOUR GAME</NebulaFlow></p>
      <h1><NebulaFlow identity="chess-title">Chess.</NebulaFlow></h1>
      <p className="page-lede">Your ratings and games from chess.com and Lichess, read with your username only. {showcase ? <><ShowcaseTag/>Fictional ratings and games.</> : ''}</p>
    </div><HeaderArtCorner><OrbitArt glyph={ChessGlyph} tone="journey" spin={-8}/></HeaderArtCorner></div>
    {!hasUser && !showcase && <section className="panel chess-setup" aria-labelledby="chess-setup-title"><h2 id="chess-setup-title">Follow your chess</h2><p>Add the username you play under. ZIGoals reads your public ratings and recent games from that site, one request at a time, only from this page, Today&apos;s chess card or Refresh.</p><ChessUsernames state={state} onSaved={() => void refresh()} /></section>}
    {(hasUser || showcase) && <section className="panel chess-ratings" aria-labelledby="chess-ratings-title">
      <div className="chess-head"><h2 id="chess-ratings-title">Ratings</h2>{!showcase && <button type="button" className="secondary" disabled={busy || paused} onClick={() => void refresh()}>{busy ? 'Refreshing…' : 'Refresh'}</button>}</div>
      {ratings.length ? <div className="chess-rating-grid">{ratings.map(r => <article key={`${r.site}:${r.control}`} className="chess-rating" aria-label={`${SITE_NAME[r.site]} ${CONTROL_NAME[r.control]} rating`}><small>{SITE_NAME[r.site]} · {CONTROL_NAME[r.control]}</small><strong>{formatNumber(r.rating)}</strong><small>as of {time(r.at)}</small></article>)}</div> : busy ? <p>Asking the sites…</p> : <ArtNote pillar="habits"><p>No ratings yet. A site shows a rating once you have played a rated game there.</p></ArtNote>}
      {(Object.entries(errors) as [ChessSite, string][]).map(([site, text]) => <p key={site} role="alert">{text}</p>)}
      {/* Session AL (D-012, D-126): two short lines, not one run-on sentence: when each site was read, then whose numbers. */}
      <p className="fine chess-updated">{CHESS_SITES.filter(site => data?.fetchedAt[site]).map(site => `${SITE_NAME[site]}: updated ${time(data!.fetchedAt[site]!)}.`).join(' ') || (showcase ? 'A fictional sample.' : 'Not updated yet: press Refresh.')}</p>
      <p className="fine">These are the sites&apos; own numbers. Chess.com updates its public data at most every few minutes.</p>
    </section>}
    {lines.length > 0 && <section className="panel chess-history" aria-labelledby="chess-history-title"><h2 id="chess-history-title">Ratings over time</h2>
      {lines.map(l => <RatingChart key={`${l.site}:${l.control}`} title={`${SITE_NAME[l.site]} · ${CONTROL_NAME[l.control]}`} points={l.points.slice(-90)} />)}
      <p className="fine">From Lichess&apos;s own history and the ratings each refresh keeps on this device; one point a day.</p>
    </section>}
    {games.length > 0 && <section className="panel chess-games" aria-labelledby="chess-games-title"><h2 id="chess-games-title">Recent games</h2>
      <dl className="chess-results"><div><dt>All recent games</dt><dd>{record(tally.total)}</dd></div><div><dt>With white</dt><dd>{record(tally.white)}</dd></div><div><dt>With black</dt><dd>{record(tally.black)}</dd></div>{tally.byControl.map(c => <div key={c.control}><dt>{CONTROL_NAME[c.control]}</dt><dd>{record(c.record)}</dd></div>)}{(() => { const streak = currentStreak(games); return streak ? <div><dt>Right now</dt><dd>{streakText(streak)}{longestWinStreak(games) > 1 ? ` · longest run of wins here: ${longestWinStreak(games)}` : ''}</dd></div> : null; })()}</dl>
      {/* Session AL (Part 15, P-BN-84/P-BN-85): the current run and the openings played, from these games only. */}
      {openingStats(games).length > 0 && <details className="chess-openings"><summary>Openings in these games</summary><ul>{openingStats(games).map(o => <li key={o.opening}><strong>{o.opening}</strong> · {o.games} {o.games === 1 ? 'game' : 'games'} · {record(o)}</li>)}</ul></details>}
      <ul className="chess-game-list">{games.slice(0, 20).map(g => <li key={`${g.site}:${g.id}`}><span className="chess-result" data-result={g.result}>{g.result === 'win' ? 'Won' : g.result === 'draw' ? 'Drew' : 'Lost'}</span><div><strong>{CONTROL_NAME[g.control]}{g.timeControl ? ` · ${g.timeControl}` : ''} · {g.color === 'white' ? 'White' : 'Black'}</strong><small>{g.opponentRating !== null ? `Opponent ${formatNumber(g.opponentRating)}` : 'Opponent unrated'}{g.opening ? ` · ${g.opening}` : ''} · <span className="nowrap">{time(g.endedAt)}</span>{g.rated ? '' : ' · casual'}</small></div><a className="text-link" href={g.url} target="_blank" rel="noopener noreferrer">Open on {SITE_NAME[g.site]}</a></li>)}</ul>
      <p className="fine">Results as each site recorded them, from the newest {Math.min(games.length, 100)} games fetched.</p>
    </section>}
    {(hasUser || showcase) && <ChessGoals state={state} />}
    {(hasUser || showcase) && settings.loaded && !settings.error && habits.loaded && !habits.error && <section className="panel chess-habit" aria-labelledby="chess-habit-title"><h2 id="chess-habit-title">A habit chess ticks off</h2>
      <label className="field">When you finish a game, tick off this habit (once a day)<select value={chess?.habit?.id ?? ''} disabled={showcase} onChange={e => void settings.update(s => setChessHabit(s, e.target.value || null, new Date().toISOString()))}><option value="">No habit</option>{habits.data.habits.filter(h => h.rules.at(-1)?.state === 'active').map(h => <option key={h.id} value={h.id}>{h.title}</option>)}</select></label>
      <p className="fine">Once a day, while that habit is still due; undo it on the habit like any check-in, and chess will not tick it off again that day.</p>
      {/* Session AL (P-PR-70, PR-110): why the choice is greyed out in the Showcase. P-DVR-65 (D-085): one number format for
          every rating (formatNumber, as the rating cards), and the habit choice said in plain words. */}
      {showcase && <p className="fine">Not changeable in the Showcase: its games are fictional, so they tick no habit. Return to your own data to choose one.</p>}
    </section>}
    <PlayHere state={state} habits={habits} />
    <ChessFrames />
    <PlayLinks />
    {(hasUser || showcase) && <details className="panel chess-settings"><summary>Change your usernames</summary><ChessUsernames state={state} onSaved={() => void refresh()} /></details>}
    <p className="fine chess-credit">Ratings, games and puzzles belong to chess.com and Lichess; this page links to them. <Link href="/app/settings#chess">Chess in Settings</Link></p>
  </div>;
}
function PlayHere({state, habits}: {state: ReturnType<typeof useChess>; habits: HabitsStore}) {
  const [open, setOpen] = useState(false);
  useEffect(() => { const q = new URLSearchParams(window.location.search); if (q.get('lichess') === 'callback' || window.location.hash === '#play') setOpen(true); }, []);
  return <section className="panel chess-play-here" id="play" aria-labelledby="chess-play-here-title">
    <div className="chess-head"><h2 id="chess-play-here-title">Play here</h2><button type="button" className="secondary" aria-expanded={open} aria-controls="chess-play-body" onClick={() => setOpen(o => !o)}>{open ? 'Close Play' : 'Open Play'}</button></div>
    {/* Session AL fourth pass (BN-182, D-228; COPY_AUDIT, deliberate): Play now starts with a game against the computer. */}
    <p>A practice game against a small computer on this device (no account), your Lichess games on a board in ZIGoals, and Lichess&apos;s daily puzzle. Nothing loads until you open it.</p>
    <div id="chess-play-body">{open && <Suspense fallback={<Skeleton label="Loading the board…" block lines={2}/>}><PlayPanel state={state} habits={habits} /></Suspense>}</div>
  </section>;
}
function ChessGoals({state}: {state: ReturnType<typeof useChess>}) {
  const {settings, cache, chess, showcase} = state, [message, setMessage] = useState<{text: string; failed?: boolean} | null>(null);
  const goals = chess?.goals.filter(g => g.status !== 'closed') ?? [], fields = useFormErrors(), today = localToday();
  // Session AL (BN-100; P-BN-26): each problem under its own field (aria-invalid, focus): the target's range, a date in the
  // past, and the same goal twice; a goal whose date has passed says so in the list.
  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMessage(null);
    const form = e.currentTarget, f = new FormData(form), raw = String(f.get('target') ?? '').trim(), target = Number(raw), at = new Date().toISOString();
    const site = f.get('site') as ChessSite, control = f.get('control') as ChessControl, by = String(f.get('by') ?? '');
    const problems = {
      target: !raw ? 'Type a target rating: a whole number from 100 to 4000.' : !/^\d+$/.test(raw) || target < 100 || target > 4000 ? 'A rating goal is a whole number from 100 to 4000.'
        : goals.some(g => g.site === site && g.control === control && g.target === target) ? `You already have this goal: ${SITE_NAME[site]} ${CONTROL_NAME[control]} ${formatNumber(target)}.` : null,
      by: by && by < today ? 'Choose today or a later date, or leave it empty.' : null,
    };
    if (fields.fail(problems)) return;
    const goal: ChessGoal = {id: crypto.randomUUID(), site, control, target, ...(by ? {by} : {}), status: 'active', createdAt: at, updatedAt: at};
    try { await settings.update(s => saveChessGoal(s, goal)); form.reset(); setMessage({text: `Goal added: ${SITE_NAME[goal.site]} ${CONTROL_NAME[goal.control]} ${formatNumber(goal.target)}.`}); }
    catch (error) { fields.failForm(error instanceof Error && error.message ? error.message : 'Could not save.'); }
  }
  return <section className="panel chess-goals" aria-labelledby="chess-goals-title"><h2 id="chess-goals-title">Rating goals</h2>
    {goals.length ? <ul className="chess-goal-list">{goals.map(g => { const p = cache.loaded && !cache.unreadable ? goalProgress(cache.data, g) : {rating: null, left: null, reached: false}; return <li key={g.id}><div><strong>{SITE_NAME[g.site]} · {CONTROL_NAME[g.control]} · {formatNumber(g.target)}</strong><small>{p.rating === null ? 'No rating yet on this site and time control.' : p.reached ? `Reached: ${formatNumber(p.rating)} now.` : `${formatNumber(p.rating)} now · ${formatNumber(p.left ?? 0)} to go`}{g.by ? ` · by ${formatDate(g.by)}` : ''}{g.by && g.by < today && !p.reached ? ' · its date has passed' : ''}</small></div>{!showcase && <button type="button" className="quiet" aria-label={`Remove the goal ${SITE_NAME[g.site]} ${CONTROL_NAME[g.control]} ${g.target}`} onClick={() => void removeWithUndo(settings.update, s => removeChessGoal(s, g.id), 'Chess goal removed.', 'The chess goal is back.').catch(() => undefined) /* Session AH Part 3 (DS5) */}>Remove</button>}</li>; })}</ul> : <ArtNote pillar="goals"><p>No rating goal yet.</p></ArtNote>}
    {!showcase && <form className="platform-form chess-goal-form" aria-label="Add a rating goal" onSubmit={e => void add(e)} noValidate>
      <label className="field">Site<select name="site" defaultValue={chess?.chesscom ? 'chesscom' : 'lichess'}>{CHESS_SITES.map(s => <option key={s} value={s}>{SITE_NAME[s]}</option>)}</select></label>
      <label className="field">Time control<select name="control" defaultValue="rapid">{CHESS_CONTROLS.map(c => <option key={c} value={c}>{CONTROL_NAME[c]}</option>)}</select></label>
      <label className="field">Target rating<input {...fields.field('target')} name="target" inputMode="numeric" maxLength={6} /></label>
      <FieldError {...fields.message('target')}/>
      <label className="field">By (optional)<input {...fields.field('by')} name="by" type="date" min={today} /></label>
      <FieldError {...fields.message('by')}/>
      <button className="secondary" type="submit">Add goal</button>
      {fields.formError && <p role="alert" className="field-error">{fields.formError}</p>}
    </form>}
    <p className="fine">Progress is the site&apos;s newest rating against your target; nothing is predicted.</p>
    {message && <p role={message.failed ? 'alert' : 'status'}>{message.text}</p>}
  </section>;
}
