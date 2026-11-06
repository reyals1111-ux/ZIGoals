import {currentMotionLevel} from './level';

/**
 * Session AK M1 (owner follow-up 2, the shared-element morph): a goal card's title becomes the goal page's heading.
 *
 * Why a hand-off: React pairs a shared element only when both ends are in the navigation's own commit (the new state is
 * captured before effects run). The goal page reads its records after mounting (components/use-private-store.ts), so its
 * first commit has no heading of its own. The card therefore notes, at the tap, which goal opened and the name it showed;
 * the goal page's first frame draws that heading in its usual place (components/platform/tracked-detail.tsx) and the
 * same element then carries the loaded page. Module memory for this tab only, for a few seconds, never stored; on a
 * server render (no window) there is none, so a page opened by its address renders exactly as before.
 */
export const GOAL_MORPH_MS = 5000;
let opened: {id: string; name: string; at: number} | null = null;

/** The goal card's tap (its title or "Open Goal"). */
export function noteGoalOpen(id: string, name: string, now = Date.now()): void { opened = {id, name: name.slice(0, 200), at: now}; }
/** The name the card showed for this goal, when it was tapped a moment ago; else null. Read-only (a render may run twice). */
export function openedGoal(id: string, now = Date.now()): {name: string} | null {
  if (typeof window === 'undefined' || !opened || opened.id !== id || now - opened.at > GOAL_MORPH_MS) return null;
  return {name: opened.name};
}
/** Tests only. */
export function clearGoalOpen(): void { opened = null; }

/** The shared name of one goal's title (a view-transition name: letters, digits, "-" and "_" only). */
export function goalMorphName(id: string): string { return `zg-goal-${id.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80)}`; }

/**
 * The morph's class, or "none". Full motion only: Calm, Off and the device's reduced motion never morph (Off and reduced
 * motion start no view transition at all: lib/motion/view-transition-gate.ts). With "none" React gives the pair no name,
 * so nothing is captured apart from the page.
 */
export function goalMorphClass(level = typeof window === 'undefined' ? 'off' : currentMotionLevel()): 'zg-morph' | 'none' {
  return level === 'full' ? 'zg-morph' : 'none';
}

/**
 * Session AL Part 11 (lane L8): NOVA's widget → page morph (the one AK recorded as unbuilt). The panel that was tapped is
 * named `zg-hud-morph` for the navigation's view transition; the page it opens has no element of that name, so the
 * panel's picture grows from where it was to fill the window as it fades and the page arrives under it (components/nova/
 * holo/holo.css). Full: it grows and fades (`zoom`); Calm: it only fades where it is (`fade`); Off and reduced motion: no
 * name and no transition at all (the view-transition gate), a plain navigation. Pure: the caller measures the panel.
 */
export const WIDGET_MORPH_NAME = 'zg-hud-morph';
export type WidgetMorphPlan = {mode: 'zoom' | 'fade'; dx: number; dy: number; scale: number};
export function widgetMorphPlan(box: {x: number; y: number; width: number; height: number}, viewport: {width: number; height: number}, level: 'full' | 'calm' | 'off'): WidgetMorphPlan | null {
  if (level === 'off' || !(box.width > 0) || !(box.height > 0) || !(viewport.width > 0) || !(viewport.height > 0)) return null;
  if (level === 'calm') return {mode: 'fade', dx: 0, dy: 0, scale: 1};
  const r = (n: number) => Math.round(n * 100) / 100;
  // Move the panel's centre to the window's centre and grow it until it covers the window's larger side.
  const scale = Math.min(8, Math.max(1, Math.max(viewport.width / box.width, viewport.height / box.height)));
  return {mode: 'zoom', dx: r(viewport.width / 2 - (box.x + box.width / 2)), dy: r(viewport.height / 2 - (box.y + box.height / 2)), scale: r(scale)};
}
