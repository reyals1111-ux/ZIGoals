'use client';
import {useEffect, useRef, useState} from 'react';

/**
 * The sites' own puzzles and TV (Session W Part 14), loaded only when the person taps one: a frame in an overlay with
 * the site's credit link, "Pop out" and a plain link if the frame stays empty (a site may refuse to be framed without a
 * referrer, which ZIGoals never sends). Frames get no permissions and cannot navigate this page; chess.com's play pages
 * refuse framing, so "Play" opens the site in a window of its own. Allowed only for these exact addresses (frame-src).
 */
export const CHESS_FRAMES = [
  {id: 'chesscom-puzzle', label: 'Daily puzzle', site: 'chess.com', src: 'https://www.chess.com/daily_puzzle', credit: 'Daily puzzle by chess.com', creditHref: 'https://www.chess.com/daily_puzzle'},
  {id: 'lichess-puzzle', label: 'Lichess puzzle', site: 'Lichess', src: 'https://lichess.org/training/frame?theme=blue&bg=dark', credit: 'Puzzle by Lichess', creditHref: 'https://lichess.org/training'},
  {id: 'lichess-tv', label: 'Lichess TV', site: 'Lichess', src: 'https://lichess.org/tv/frame?theme=blue&bg=dark', credit: 'Lichess TV', creditHref: 'https://lichess.org/tv'},
] as const;
export const CHESS_PLAY = [{label: 'Play on chess.com', href: 'https://www.chess.com/play/online'}, {label: 'Play on Lichess', href: 'https://lichess.org/'}] as const;
const popUp = (href: string) => { window.open(href, '_blank', 'popup,width=1100,height=820,noopener,noreferrer'); };
export function ChessFrames() {
  const [open, setOpen] = useState<typeof CHESS_FRAMES[number] | null>(null), dialog = useRef<HTMLDialogElement>(null), opener = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { const d = dialog.current; if (open && d && !d.open) d.showModal(); }, [open]);
  const close = () => { dialog.current?.close(); setOpen(null); opener.current?.focus(); };
  return <section className="panel chess-frames" aria-labelledby="chess-frames-title"><h2 id="chess-frames-title">Puzzles and TV</h2>
    <p>From the sites themselves, opened only when you choose one.</p>
    <div className="actions">{CHESS_FRAMES.map(f => <button key={f.id} type="button" className="secondary" onClick={e => { opener.current = e.currentTarget; setOpen(f); }}>{f.label}</button>)}</div>
    {open && <dialog ref={dialog} className="chess-frame-dialog" aria-label={open.label} onCancel={e => { e.preventDefault(); close(); }}>
      <header><h3>{open.label}</h3><button type="button" className="secondary icon-button" aria-label="Close" onClick={close}>×</button></header>
      <iframe src={open.src} title={`${open.label} from ${open.site}`} sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" allow="" referrerPolicy="no-referrer" loading="lazy" />
      <div className="actions"><a className="text-link" href={open.creditHref} target="_blank" rel="noopener noreferrer">{open.credit}</a><button type="button" className="quiet" onClick={() => popUp(open.src)}>Pop out</button></div>
      <p className="fine">Empty? <a href={open.creditHref} target="_blank" rel="noopener noreferrer">Open it on {open.site}</a>.</p>
    </dialog>}
  </section>;
}
export function PlayLinks() {
  return <section className="panel chess-play" aria-labelledby="chess-play-title"><h2 id="chess-play-title">Play</h2>
    <div className="actions">{CHESS_PLAY.map(p => <button key={p.href} type="button" className="secondary" onClick={() => popUp(p.href)}>{p.label}</button>)}</div>
    <p className="fine">Opens the site in its own window; ZIGoals sees nothing of the game until the site lists it.</p>
  </section>;
}
