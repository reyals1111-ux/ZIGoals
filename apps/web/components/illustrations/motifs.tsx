import type {ReactElement} from 'react';

/**
 * Session AK (F6): each pillar's mark on its planet (pillar-art.tsx), drawn in the planet's frame (centre 60, 50; radius
 * 24) above the ring, within about 15 of the centre. Shapes only: the strokes and dots take their colours from
 * pillar-art.css (`.pa-mark`, `.pa-dot`).
 */
export type ArtPillar = 'goals' | 'habits' | 'health' | 'wealth' | 'orbit';

/** Goals: a peak with a flag at its top. */
const goals = () => <>
  <path className="pa-mark" d="M45 58 56 42l6 9 4-5 8 12"/>
  <path className="pa-mark" d="M56 42v-9l7 2.6-7 2.6"/>
</>;
/** Habits: a tick inside a ring of days. */
const habits = () => <>
  <circle className="pa-mark pa-days" cx="60" cy="47" r="12"/>
  <path className="pa-mark" d="m54 47 4.5 4.5L67 43"/>
</>;
/** Health: one heartbeat across the planet. */
const health = () => <path className="pa-mark" d="M43 50h8l3-7 5 13 4-10 3 4h11"/>;
/** Wealth: three rising bars and the line above them. */
const wealth = () => <>
  <path className="pa-mark pa-bars" d="M51 58v-6m7 6V46m7 12V40"/>
  <path className="pa-mark" d="m47 45 9-7 5 3 8-7m-4 0h4v4"/>
</>;
/** Orbit (across the pillars): three points joined, one per step of the way. */
const orbit = () => <>
  <path className="pa-mark pa-link" d="m48 55 10-13 12 7"/>
  <circle className="pa-dot" cx="48" cy="55" r="3"/>
  <circle className="pa-dot" cx="58" cy="42" r="3.4"/>
  <circle className="pa-dot" cx="70" cy="49" r="2.6"/>
</>;

export const MOTIFS: Record<ArtPillar, () => ReactElement> = {goals, habits, health, wealth, orbit};
