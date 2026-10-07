'use client';
import {useState, type FormEvent} from 'react';
import Link from 'next/link';
import {CHESS_CONTROLS, CHESS_SITES, type ChessControl, type ChessGoal, type ChessSite} from '../../lib/skills/chess/schema';
import {CONTROL_NAME, SITE_NAME, currentRatings, goalProgress, ratingLine, removeChessGoal, results, saveChessGoal, setChessHabit, type Record3} from '../../lib/skills/chess/engine';
import {sitePausedFor} from '../../lib/skills/chess/api';
import {formatNumber} from '../../lib/visual-format';
import {useHabits} from '../habits/use-habits';
import {useChess} from './use-chess';
import {ChessUsernames} from './chess-usernames';
import {RatingChart} from './rating-chart';
import {ChessFrames, PlayLinks} from './chess-frames';
import {useChessCheckIn} from './use-chess-check-in';
import './chess.css';

/**
 * The Chess page (Session W Part 14; /app/chess, its own chunk): ratings and recent games from chess.com and Lichess by
 * the person's usernames, results by colour and time control, rating goals, the habit chess ticks off, and the sites'
 * own daily puzzle and TV, opened only on a tap. Numbers are the sites' own; nothing is estimated.
 */
const time = (iso: string) => new Date(iso).toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'short'});
const record = (r: Record3) => `${r.win} won · ${r.draw} drawn · ${r.loss} lost`;
export function ChessView() {
  const state = useChess('page'), {cache, chess, busy, errors, refresh, showcase, settings} = state, habits = useHabits();
  useChessCheckIn(state, habits);
  const hasUser = !!chess?.chesscom || !!chess?.lichess, data = cache.loaded && !cache.unreadable ? cache.data : null;
  const ratings = data ? currentRatings(data) : [], games = data?.games ?? [], tally = results(games.slice(0, 100));
  const lines = data ? CHESS_SITES.flatMap(site => CHESS_CONTROLS.map(control => ({site, control, points: ratingLine(data, site, control)}))).filter(l => l.points.length >= 2) : [];
  const paused = CHESS_SITES.map(site => sitePausedFor(site)).some(ms => ms > 0);
  return <div className="chess-page">
    <div className="page-heading"><div>
      <p className="eyebrow page-eyebrow">YOUR GAME</p>
      <h1>Chess.</h1>
      <p className="page-lede">Your ratings and games from chess.com and Lichess, read with your username only. {showcase ? 'SHOWCASE DATA · fictional ratings and games.' : ''}</p>
    </div></div>
    {!hasUser && !showcase && <section className="panel chess-setup" aria-labelledby="chess-setup-title"><h2 id="chess-setup-title">Follow your chess</h2><p>Add the username you play under. ZIGoals reads your public ratings and recent games from that site, one request at a time, only from this page, Today&apos;s chess card or Refresh.</p><ChessUsernames state={state} onSaved={() => void refresh()} /></section>}
    {(hasUser || showcase) && <section className="panel chess-ratings" aria-labelledby="chess-ratings-title">
      <div className="chess-head"><h2 id="chess-ratings-title">Ratings</h2>{!showcase && <button type="button" className="secondary" disabled={busy || paused} onClick={() => void refresh()}>{busy ? 'Refreshing…' : 'Refresh'}</button>}</div>
      {ratings.length ? <div className="chess-rating-grid">{ratings.map(r => <article key={`${r.site}:${r.control}`} className="chess-rating" aria-label={`${SITE_NAME[r.site]} ${CONTROL_NAME[r.control]} rating`}><small>{SITE_NAME[r.site]} · {CONTROL_NAME[r.control]}</small><strong>{formatNumber(r.rating)}</strong><small>as of {time(r.at)}</small></article>)}</div> : <p>{busy ? 'Asking the sites…' : 'No ratings yet. A site shows a rating once you have played a rated game there.'}</p>}
      {(Object.entries(errors) as [ChessSite, string][]).map(([site, text]) => <p key={site} role="alert">{text}</p>)}
      <p className="fine">{CHESS_SITES.filter(site => data?.fetchedAt[site]).map(site => `${SITE_NAME[site]} updated ${time(data!.fetchedAt[site]!)}`).join(' · ') || (showcase ? 'Fictional sample.' : 'Not updated yet.')} The sites&apos; own numbers; chess.com refreshes its public data at most every few minutes.</p>
    </section>}
    {lines.length > 0 && <section className="panel chess-history" aria-labelledby="chess-history-title"><h2 id="chess-history-title">Ratings over time</h2>
      {lines.map(l => <RatingChart key={`${l.site}:${l.control}`} title={`${SITE_NAME[l.site]} · ${CONTROL_NAME[l.control]}`} points={l.points.slice(-90)} />)}
      <p className="fine">From Lichess&apos;s own history and the ratings each refresh keeps on this device; one point a day.</p>
    </section>}
    {games.length > 0 && <section className="panel chess-games" aria-labelledby="chess-games-title"><h2 id="chess-games-title">Recent games</h2>
      <dl className="chess-results"><div><dt>All recent games</dt><dd>{record(tally.total)}</dd></div><div><dt>With white</dt><dd>{record(tally.white)}</dd></div><div><dt>With black</dt><dd>{record(tally.black)}</dd></div>{tally.byControl.map(c => <div key={c.control}><dt>{CONTROL_NAME[c.control]}</dt><dd>{record(c.record)}</dd></div>)}</dl>
      <ul className="chess-game-list">{games.slice(0, 20).map(g => <li key={`${g.site}:${g.id}`}><span className="chess-result" data-result={g.result}>{g.result === 'win' ? 'Won' : g.result === 'draw' ? 'Drew' : 'Lost'}</span><div><strong>{CONTROL_NAME[g.control]}{g.timeControl ? ` · ${g.timeControl}` : ''} · {g.color === 'white' ? 'White' : 'Black'}</strong><small>{g.opponentRating !== null ? `Opponent ${g.opponentRating}` : 'Opponent unrated'}{g.opening ? ` · ${g.opening}` : ''} · {time(g.endedAt)}{g.rated ? '' : ' · casual'}</small></div><a className="text-link" href={g.url} target="_blank" rel="noopener noreferrer">Open on {SITE_NAME[g.site]}</a></li>)}</ul>
      <p className="fine">Results as each site recorded them, from the newest {Math.min(games.length, 100)} games fetched.</p>
    </section>}
    {(hasUser || showcase) && <ChessGoals state={state} />}
    {(hasUser || showcase) && settings.loaded && !settings.error && habits.loaded && !habits.error && <section className="panel chess-habit" aria-labelledby="chess-habit-title"><h2 id="chess-habit-title">A habit chess ticks off</h2>
      <label className="field">On a day you finish a game, tick off<select value={chess?.habit?.id ?? ''} disabled={showcase} onChange={e => void settings.update(s => setChessHabit(s, e.target.value || null, new Date().toISOString()))}><option value="">No habit</option>{habits.data.habits.filter(h => h.rules.at(-1)?.state === 'active').map(h => <option key={h.id} value={h.id}>{h.title}</option>)}</select></label>
      <p className="fine">Once a day, while that habit is still due; undo it on the habit like any check-in, and chess will not tick it off again that day.</p>
    </section>}
    <ChessFrames />
    <PlayLinks />
    {(hasUser || showcase) && <details className="panel chess-settings"><summary>Your usernames</summary><ChessUsernames state={state} onSaved={() => void refresh()} /></details>}
    <p className="fine chess-credit">Ratings, games and puzzles belong to chess.com and Lichess; this page links to them. <Link href="/app/settings#chess">Chess in Settings</Link></p>
  </div>;
}
function ChessGoals({state}: {state: ReturnType<typeof useChess>}) {
  const {settings, cache, chess, showcase} = state, [message, setMessage] = useState<{text: string; failed?: boolean} | null>(null);
  const goals = chess?.goals.filter(g => g.status !== 'closed') ?? [];
  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget, f = new FormData(form), target = Number(f.get('target')), at = new Date().toISOString();
    if (!Number.isInteger(target) || target < 100 || target > 4000) { setMessage({text: 'A rating goal is a whole number from 100 to 4000.', failed: true}); return; }
    const goal: ChessGoal = {id: crypto.randomUUID(), site: f.get('site') as ChessSite, control: f.get('control') as ChessControl, target, ...(f.get('by') ? {by: String(f.get('by'))} : {}), status: 'active', createdAt: at, updatedAt: at};
    try { await settings.update(s => saveChessGoal(s, goal)); form.reset(); setMessage({text: `Goal added: ${SITE_NAME[goal.site]} ${CONTROL_NAME[goal.control]} ${goal.target}.`}); }
    catch (error) { setMessage({text: error instanceof Error && error.message ? error.message : 'Could not save.', failed: true}); }
  }
  return <section className="panel chess-goals" aria-labelledby="chess-goals-title"><h2 id="chess-goals-title">Rating goals</h2>
    {goals.length ? <ul className="chess-goal-list">{goals.map(g => { const p = cache.loaded && !cache.unreadable ? goalProgress(cache.data, g) : {rating: null, left: null, reached: false}; return <li key={g.id}><div><strong>{SITE_NAME[g.site]} · {CONTROL_NAME[g.control]} · {g.target}</strong><small>{p.rating === null ? 'No rating yet on this site and time control.' : p.reached ? `Reached: ${p.rating} now.` : `${p.rating} now · ${p.left} to go`}{g.by ? ` · by ${g.by}` : ''}</small></div>{!showcase && <button type="button" className="quiet" aria-label={`Remove the goal ${SITE_NAME[g.site]} ${CONTROL_NAME[g.control]} ${g.target}`} onClick={() => void settings.update(s => removeChessGoal(s, g.id))}>Remove</button>}</li>; })}</ul> : <p>No rating goal yet.</p>}
    {!showcase && <form className="platform-form chess-goal-form" aria-label="Add a rating goal" onSubmit={e => void add(e)}>
      <label className="field">Site<select name="site" defaultValue={chess?.chesscom ? 'chesscom' : 'lichess'}>{CHESS_SITES.map(s => <option key={s} value={s}>{SITE_NAME[s]}</option>)}</select></label>
      <label className="field">Time control<select name="control" defaultValue="rapid">{CHESS_CONTROLS.map(c => <option key={c} value={c}>{CONTROL_NAME[c]}</option>)}</select></label>
      <label className="field">Target rating<input name="target" inputMode="numeric" required /></label>
      <label className="field">By (optional)<input name="by" type="date" /></label>
      <button className="secondary" type="submit">Add goal</button>
    </form>}
    <p className="fine">Progress is the site&apos;s newest rating against your target; nothing is predicted.</p>
    {message && <p role={message.failed ? 'alert' : 'status'}>{message.text}</p>}
  </section>;
}
