"use client";
import {lazy, Suspense} from 'react';
import {LoadBoundary} from '../load-boundary';
import "./habits.css";
import "./habits-aa.css";
// Gate A (ADR-022 B41): Today's habits widget loads its body as its own chunk; the fallback keeps the panel's place.
const Body = lazy(() => import("./habits-today-body").then((m) => ({ default: m.HabitsTodayBody })));
export function HabitsToday() {
  return <LoadBoundary label="Today’s habits"><Suspense fallback={<section className="panel habits-today" aria-label="Habits" aria-busy="true"><div className="habit-section-heading"><div><p className="eyebrow">Your daily cadence</p><h2>Small steps, steady rhythm.</h2></div></div><p role="status">Loading habits…</p></section>}><Body /></Suspense></LoadBoundary>;
}
