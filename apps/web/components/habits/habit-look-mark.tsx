'use client';
import {lookOf} from '../../lib/habit-look';
import './habit-look.css';

/**
 * Session AV (q4 #26; Streaks): a habit's own symbol in its colour, beside its name wherever the name is listed — the
 * card, the week grid, the compact list, Today, the Checklist and the year view. Decoration only (hidden from a screen
 * reader): the name beside it always says what the habit is. Nothing when the habit has no look.
 */
export function HabitLookMark({extras, habitId}: {extras: unknown; habitId: string}) {
  const look = lookOf(extras, habitId);
  return look ? <span className="habit-look" data-look-colour={look.colour} aria-hidden="true">{look.glyph} </span> : null;
}
