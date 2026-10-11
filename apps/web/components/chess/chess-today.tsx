'use client';
import {useHabits} from '../habits/use-habits';
import {useChess} from './use-chess';
import {useChessCheckIn} from './use-chess-check-in';

/**
 * Today's chess card's part that asks (Session W Part 14): while a Chess widget is on Today, the sites are asked again
 * when their last answer is older than six hours, and the chess habit is ticked off as on the Chess page. Loaded only
 * with that widget; renders nothing (the widget shows the cached ratings).
 */
export default function ChessTodayRefresh() {
  const state = useChess('today'), habits = useHabits();
  useChessCheckIn(state, habits);
  return null;
}
