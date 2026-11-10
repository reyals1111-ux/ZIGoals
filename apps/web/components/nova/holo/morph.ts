'use client';
import {currentMotionLevel} from '../../../lib/motion/level';
import {WIDGET_MORPH_NAME, widgetMorphPlan} from '../../../lib/motion/goal-morph';

/**
 * Session AL Part 11 (lane L8): open a widget's page with the widget → page morph (lib/motion/goal-morph.ts
 * widgetMorphPlan says how). The tapped panel takes the shared name for this one navigation; its picture grows to the
 * window (Full) or fades in place (Calm) while the page arrives (holo.css). Off, reduced motion or a browser without view
 * transitions: no name, a plain navigation. The name and the plan's variables are removed once the page has arrived.
 */
let clear = 0;
export function openWithMorph(panel: HTMLElement | null, href: string, push: (href: string) => void): void {
  const root = document.documentElement, level = currentMotionLevel();
  const plan = panel && typeof (document as Document & {startViewTransition?: unknown}).startViewTransition === 'function'
    ? widgetMorphPlan(panel.getBoundingClientRect(), {width: window.innerWidth, height: window.innerHeight}, level) : null;
  if (panel && plan) {
    panel.style.viewTransitionName = WIDGET_MORPH_NAME;
    root.dataset.hudMorph = plan.mode;
    root.style.setProperty('--zg-hud-dx', `${plan.dx}px`); root.style.setProperty('--zg-hud-dy', `${plan.dy}px`); root.style.setProperty('--zg-hud-scale', String(plan.scale));
    window.clearTimeout(clear);
    clear = window.setTimeout(() => { delete root.dataset.hudMorph; for (const v of ['--zg-hud-dx', '--zg-hud-dy', '--zg-hud-scale']) root.style.removeProperty(v); if (panel.isConnected) panel.style.viewTransitionName = ''; }, 1500);
  }
  push(href);
}
