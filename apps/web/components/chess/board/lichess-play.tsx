'use client';
import {useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent} from 'react';
import {beginLichess, exchangeLichessCode, isLichessCallback, readLichessCallback} from '../../../lib/chess/oauth';
import {forgetLichess, lichessStorageAvailable, readLichessConnection, saveLichessConnection, type LichessConnection} from '../../../lib/chess/token-store';
import {answerChallenge, challengeAi, challengeUser, CLOCKS, gameUrl, getAccount, getPlaying, LICHESS, LichessError, readEvent, seek, type IncomingChallenge, type NowPlaying, type SeekColor} from '../../../lib/chess/lichess';
import {followNdjson} from '../../../lib/chess/ndjson';
import {GameView} from './game-view';

/**
 * Session AK (ADR-036 Q8, lane C): "Play on Lichess inside ZIGoals". Connecting is Lichess's own OAuth page (PKCE, no
 * ZIGoals server); the token stays on this device (IndexedDB `zigoals-lichess-v1`) and goes only to lichess.org.
 * Connected, the page follows Lichess's event stream while Play is open, lists the ongoing games, and offers a seek
 * (rapid or classical: Lichess's Board API does not pair bullet or blitz seeks), a challenge to a friend, a game against
 * the Lichess AI, and the challenges sent to the person. On phones (a narrow screen or a touch-first pointer) the games
 * are listed with "Continue on Lichess" instead of the board.
 */
const COMPACT = '(max-width: 760px), (pointer: coarse)';
const subscribeCompact = (change: () => void) => { const q = window.matchMedia?.(COMPACT); q?.addEventListener('change', change); return () => q?.removeEventListener('change', change); };
const compactNow = () => !!window.matchMedia?.(COMPACT).matches;
type Message = {text: string; failed?: boolean} | null;
type Connection = {status: 'loading'} | {status: 'none'} | {status: 'unavailable'} | {status: 'connecting'} | {status: 'connected'; conn: LichessConnection & {account: NonNullable<LichessConnection['account']>}};
const plain = (e: unknown, fallback: string) => e instanceof Error && e.message ? e.message : fallback;
const SPEED: Record<string, string> = {rapid: 'Rapid', classical: 'Classical', correspondence: 'Correspondence', blitz: 'Blitz', bullet: 'Bullet', ultraBullet: 'UltraBullet'};

export function LichessPlay({showcase}: {showcase: boolean}) {
  const [connection, setConnection] = useState<Connection>({status: 'loading'}), [message, setMessage] = useState<Message>(null);
  const [games, setGames] = useState<NowPlaying[]>([]), [challenges, setChallenges] = useState<IncomingChallenge[]>([]), [active, setActive] = useState<string | null>(null);
  const [seeking, setSeeking] = useState<AbortController | null>(null), [streamDown, setStreamDown] = useState(false);
  const compact = useSyncExternalStore(subscribeCompact, compactNow, () => false), started = useRef(false), activeRef = useRef<string | null>(null);
  activeRef.current = active;
  const token = connection.status === 'connected' ? connection.conn.accessToken : null, me = connection.status === 'connected' ? connection.conn.account.id : null;

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!lichessStorageAvailable()) { setConnection({status: 'unavailable'}); return; }
    void (async () => {
      if (isLichessCallback(window.location.search)) {
        const answer = readLichessCallback(window.location.search);
        window.history.replaceState(window.history.state, '', `/app/chess${window.location.hash}`);
        if (answer.kind === 'code') {
          setConnection({status: 'connecting'});
          try {
            const grant = await exchangeLichessCode({origin: window.location.origin, code: answer.code, verifier: answer.verifier});
            const account = await getAccount(grant.accessToken);
            const conn = {version: 1 as const, accessToken: grant.accessToken, expiresAt: grant.expiresAt, connectedAt: new Date().toISOString(), account};
            await saveLichessConnection(conn);
            setConnection({status: 'connected', conn}); setMessage({text: `Connected to Lichess as ${account.username}. The connection stays on this device.`});
          } catch (e) { setConnection({status: 'none'}); setMessage({text: plain(e, 'Lichess could not be connected. Nothing was kept.'), failed: true}); }
          return;
        }
        if (answer.kind === 'denied') setMessage({text: 'You did not allow ZIGoals on Lichess. Nothing was kept.'});
        if (answer.kind === 'refused') setMessage({text: answer.message, failed: true});
      }
      const kept = await readLichessConnection();
      if (kept?.account) setConnection({status: 'connected', conn: {...kept, account: kept.account}});
      else setConnection({status: 'none'});
    })();
  }, []);

  const lost = useCallback(() => {
    void forgetLichess(); setActive(null); setGames([]); setChallenges([]);
    setConnection({status: 'none'}); setMessage({text: 'Lichess no longer accepts this connection, so this device forgot it. Connect again to play.', failed: true});
  }, []);
  const refreshGames = useCallback(async () => {
    if (!token) return;
    try { setGames(await getPlaying(token)); }
    catch (e) { if (e instanceof LichessError && e.kind === 'unauthorized') lost(); else setMessage({text: plain(e, 'Your games could not be listed.'), failed: true}); }
  }, [token, lost]);
  useEffect(() => { if (token) void refreshGames(); }, [token, refreshGames]);
  // The event stream (one per account, as Lichess allows): games starting and ending, and challenges, while Play is open.
  useEffect(() => {
    if (!token || !me) return;
    const controller = new AbortController();
    void followNdjson({
      url: `${LICHESS}/api/stream/event`, token, signal: controller.signal, idleMs: 25_000,
      onStatus: s => { if (s.state !== 'connecting') setStreamDown(s.state === 'waiting' && s.retryInMs >= 2000); if (s.state === 'unauthorized') lost(); },
      onValue: v => {
        const event = readEvent(v, me);
        if (event.type === 'gameStart') { void refreshGames(); if (!activeRef.current && !compactNow()) setActive(event.gameId); }
        else if (event.type === 'gameFinish') void refreshGames();
        else if (event.type === 'challenge' && event.challenge) { const c = event.challenge; setChallenges(list => [...list.filter(x => x.id !== c.id), c].slice(-10)); }
        else if (event.type === 'challengeGone') setChallenges(list => list.filter(x => x.id !== event.id));
      },
    });
    return () => controller.abort();
  }, [token, me, refreshGames, lost]);
  useEffect(() => () => seeking?.abort(), [seeking]);

  async function connect() {
    setMessage(null);
    try { window.location.assign(await beginLichess(window.location.origin)); }
    catch (e) { setMessage({text: plain(e, 'Connecting could not start.'), failed: true}); }
  }
  async function disconnect() {
    seeking?.abort(); setSeeking(null); setActive(null);
    const result = await forgetLichess();
    setConnection({status: 'none'}); setGames([]); setChallenges([]);
    setMessage({text: result.revoked ? 'Disconnected. This device forgot the connection and Lichess revoked it.' : 'Disconnected. This device forgot the connection; Lichess could not be reached to revoke it, so you can revoke it in your Lichess security settings.'});
  }
  async function run(work: () => Promise<string | void>) {
    setMessage(null);
    try { const said = await work(); if (said) setMessage({text: said}); }
    catch (e) { if (e instanceof LichessError && e.kind === 'unauthorized') lost(); else if (!(e instanceof DOMException && e.name === 'AbortError')) setMessage({text: plain(e, 'Lichess did not take that.'), failed: true}); }
  }
  function startSeek(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token || seeking) return;
    const f = new FormData(e.currentTarget), controller = new AbortController();
    setSeeking(controller);
    void run(async () => {
      try { await seek(token, {clock: String(f.get('clock')), rated: f.get('rated') === 'on'}, controller.signal); return 'Lichess found an opponent; the game opens here.'; }
      finally { setSeeking(null); }
    });
  }
  function sendChallenge(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    const form = e.currentTarget, f = new FormData(form), username = String(f.get('username') ?? '').trim();
    void run(async () => { const c = await challengeUser(token, username, {clock: String(f.get('clock')), rated: f.get('rated') === 'on', color: String(f.get('color')) as SeekColor}); form.reset(); return `Challenge sent to ${username} (${gameUrl(c.id)}). The game opens here when they accept.`; });
  }
  function playAi(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    const f = new FormData(e.currentTarget);
    void run(async () => { const g = await challengeAi(token, {level: Number(f.get('level')), clock: String(f.get('clock')), color: String(f.get('color')) as SeekColor}); if (!compactNow()) setActive(g.id); await refreshGames(); });
  }

  const note = message && <p role={message.failed ? 'alert' : 'status'} className="chess-play-message">{message.text}</p>;
  if (connection.status === 'loading' || connection.status === 'connecting') return <section className="chess-block" aria-labelledby="chess-lichess-title"><h3 id="chess-lichess-title">Lichess</h3><p role="status">{connection.status === 'connecting' ? 'Connecting to Lichess…' : 'Checking for a Lichess connection…'}</p></section>;
  if (connection.status === 'unavailable') return <section className="chess-block" aria-labelledby="chess-lichess-title"><h3 id="chess-lichess-title">Lichess</h3><p>This browser cannot keep a Lichess connection (no IndexedDB), so play on <a className="text-link" href={LICHESS} target="_blank" rel="noopener noreferrer">lichess.org</a>.</p></section>;
  if (connection.status === 'none') return <section className="chess-block" aria-labelledby="chess-lichess-title"><h3 id="chess-lichess-title">Play on Lichess here</h3>
    <p>Connect your Lichess account to play your Lichess games on this page. You sign in on Lichess itself; ZIGoals never sees your password.</p>
    <div className="chess-actions-row"><button type="button" className="primary" disabled={showcase} onClick={() => void connect()}>Connect Lichess</button></div>
    <p className="fine">{showcase ? 'The Showcase connects to nothing.' : 'ZIGoals asks only to play games for you ("board:play"). The connection is kept on this device only and sent only to lichess.org; Disconnect forgets it and revokes it. Lichess forbids engine help during games; this page gives none.'}</p>
    {note}
  </section>;

  const {conn} = connection;
  return <section className="chess-block" aria-labelledby="chess-lichess-title">
    <div className="chess-head">
      <h3 id="chess-lichess-title">Lichess · {conn.account.username}</h3>
      <button type="button" className="quiet" onClick={() => void disconnect()}>Disconnect Lichess</button>
    </div>
    {streamDown && <p className="fine" role="status">Reconnecting to Lichess…</p>}
    {note}
    {active && token && me && !compact ? <GameView key={active} token={token} gameId={active} me={me} onUnauthorized={lost} onClose={() => { setActive(null); void refreshGames(); }} /> : <>
      {challenges.length > 0 && <div><h4>Challenges to you</h4><ul className="chess-game-list-live" aria-label="Challenges to you">{challenges.map(c => <li key={c.id}><div><strong>{c.from}{c.rating ? ` (${c.rating})` : ''}</strong><small>{c.clock || 'No clock'} · {c.rated ? 'Rated' : 'Casual'}{c.variant !== 'standard' ? ` · ${c.variant}` : ''}</small></div>
        <button type="button" className="secondary" aria-label={`Accept the challenge from ${c.from}`} onClick={() => void run(async () => { await answerChallenge(token!, c.id, true); setChallenges(l => l.filter(x => x.id !== c.id)); })}>Accept</button>
        <button type="button" className="quiet" aria-label={`Decline the challenge from ${c.from}`} onClick={() => void run(async () => { await answerChallenge(token!, c.id, false); setChallenges(l => l.filter(x => x.id !== c.id)); })}>Decline</button></li>)}</ul></div>}
      <div><h4>Your games on Lichess</h4>
        {games.length ? <ul className="chess-game-list-live" aria-label="Your ongoing Lichess games">{games.map(g => <li key={g.gameId}><div><strong>{g.opponent}{g.opponentRating ? ` (${g.opponentRating})` : ''}</strong><small>{SPEED[g.speed] ?? g.speed} · you play {g.color} · {g.myTurn ? 'your move' : 'their move'}{g.rated ? ' · rated' : ''}</small></div>
          {!compact && (g.variant === 'standard' || g.variant === 'fromPosition') && <button type="button" className="secondary" aria-label={`Open the game against ${g.opponent}`} onClick={() => setActive(g.gameId)}>Open</button>}
          <a className="text-link chess-cta" href={gameUrl(g.gameId)} target="_blank" rel="noopener noreferrer" aria-label={`Continue the game against ${g.opponent} on Lichess`}>Continue on Lichess</a></li>)}</ul>
          : <p className="fine">No game in progress.</p>}
        <button type="button" className="quiet" onClick={() => void refreshGames()}>Refresh the list</button>
      </div>
      {compact ? <p className="fine">The board is made for a computer. On this device, continue each game on Lichess; your games stay listed here.</p> : <div>
        <h4>New game</h4>
        <div className="chess-play-forms">
          <form aria-label="Find an opponent" onSubmit={startSeek}>
            <label className="field">Clock<select name="clock" defaultValue="10+5">{CLOCKS.map(c => <option key={c.id} value={c.id}>{c.id} · {c.speed}</option>)}</select></label>
            <label className="chess-check-label"><input type="checkbox" name="rated" />Rated</label>
            {seeking ? <button type="button" className="secondary" onClick={() => { seeking.abort(); setSeeking(null); setMessage({text: 'Stopped looking for an opponent.'}); }}>Stop looking</button> : <button type="submit" className="secondary">Find an opponent</button>}
            {seeking && <p role="status" className="fine">Looking for an opponent on Lichess…</p>}
            <p className="fine">Lichess pairs Board API seeks for rapid, classical and correspondence games only, not bullet or blitz; this page offers rapid and classical.</p>
          </form>
          <form aria-label="Challenge a friend" onSubmit={sendChallenge}>
            <label className="field">Their Lichess username<input name="username" required maxLength={30} pattern="[A-Za-z0-9_\-]{2,30}" autoCapitalize="none" autoCorrect="off" spellCheck={false} /></label>
            <label className="field">Clock<select name="clock" defaultValue="10+5">{CLOCKS.map(c => <option key={c.id} value={c.id}>{c.id} · {c.speed}</option>)}</select></label>
            <label className="field">Your colour<select name="color" defaultValue="random"><option value="random">Random</option><option value="white">White</option><option value="black">Black</option></select></label>
            <label className="chess-check-label"><input type="checkbox" name="rated" />Rated</label>
            <button type="submit" className="secondary">Send challenge</button>
          </form>
          <form aria-label="Play the Lichess AI" onSubmit={playAi}>
            <label className="field">Level<select name="level" defaultValue="2">{[1, 2, 3, 4, 5, 6, 7, 8].map(l => <option key={l} value={l}>{l}</option>)}</select></label>
            <label className="field">Clock<select name="clock" defaultValue="10+5">{CLOCKS.map(c => <option key={c.id} value={c.id}>{c.id} · {c.speed}</option>)}</select></label>
            <label className="field">Your colour<select name="color" defaultValue="random"><option value="random">Random</option><option value="white">White</option><option value="black">Black</option></select></label>
            <button type="submit" className="secondary">Play the AI</button>
          </form>
        </div>
      </div>}
    </>}
  </section>;
}
