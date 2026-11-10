'use client';
import type {HabitsStore} from '../../habits/use-habits';
import type {useChess} from '../use-chess';
import {LichessPlay} from './lichess-play';
import {DailyPuzzle} from './daily-puzzle';
import {ComputerPlay} from './computer-play';
import './board.css';

/**
 * Session AK (ADR-036 Q8, lane C): Play, its own chunk (React.lazy from chess-view.tsx), loaded only when the person
 * opens it or comes back from connecting Lichess: Lichess games on the in-app board and Lichess's daily puzzle.
 */
export default function PlayPanel({state, habits}: {state: ReturnType<typeof useChess>; habits: Pick<HabitsStore, 'data' | 'loaded' | 'error' | 'update'>}) {
  return <div className="chess-play-panel">
    {/* Session AL fourth pass (BN-182, D-228, C-BN-24): a game with no sign-in, against a small computer on this device. */}
    <ComputerPlay />
    <LichessPlay showcase={state.showcase} />
    <DailyPuzzle state={state} habits={habits} />
  </div>;
}
