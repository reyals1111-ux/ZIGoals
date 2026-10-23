'use client';
import {useEffect, useRef, useState} from 'react';

/**
 * Session AG Polish 2 (ADR-031 K8; owner Part 4, pointer D-path 12): the Checklist's sky comes alive, rarely and gently —
 * now and then a star sparkles somewhere, and every 25–45 s a shooting star crosses at its own angle and length, in the
 * palette's whites, cyans and violets (cyans and violets by day). Behind everything (it sits under the path, the bars and
 * every word), decorative and aria-hidden.
 *
 * The owner's one exception to the one-time motion rule, for this sky only: it never runs under reduced motion or Motion
 * Off (`data-ambient="off"`, nothing drawn), and it rests (`"paused"`) while the tab is hidden or the celebration, a sheet
 * or the menu is open. Cheap on a phone: a handful of timers and Web Animations on transform and opacity only — no frame
 * loop, no layout work (the sky's size is read once and on a resize).
 */
const NIGHT = ['#ffffff', '#dff9ff', '#8fe9ff', '#c9b8ff', '#a98bff'], DAY = ['#7d6bff', '#2bb8d9', '#9b7bff', '#5a8cff'];
const rand = (a: number, b: number) => a + Math.random() * (b - a);

function useMotionAllowed() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const read = () => setOk(!mq?.matches && document.documentElement.dataset.appMotion !== 'off');
    read();
    mq?.addEventListener('change', read);
    const watch = new MutationObserver(read); watch.observe(document.documentElement, {attributes: true, attributeFilter: ['data-app-motion']});
    return () => { mq?.removeEventListener('change', read); watch.disconnect(); };
  }, []);
  return ok;
}
function usePageHidden() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => { const read = () => setHidden(document.visibilityState === 'hidden'); read(); document.addEventListener('visibilitychange', read); return () => document.removeEventListener('visibilitychange', read); }, []);
  return hidden;
}

export function AmbientSky({paused = false}: {paused?: boolean}) {
  const allowed = useMotionAllowed(), hidden = usePageHidden(), running = allowed && !paused && !hidden, host = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = host.current; if (!running || !el || typeof el.animate !== 'function') return;
    const stars = [...el.querySelectorAll<HTMLElement>('[data-twinkle]')], comet = el.querySelector<HTMLElement>('[data-comet]');
    const timers = new Set<number>(), anims = new Set<Animation>();
    let size = {w: el.clientWidth, h: el.clientHeight}, next = 0;
    const onResize = () => { size = {w: el.clientWidth, h: el.clientHeight}; };
    window.addEventListener('resize', onResize);
    const later = (ms: number, run: () => void) => { const t = window.setTimeout(() => { timers.delete(t); run(); }, ms); timers.add(t); };
    const play = (node: HTMLElement, frames: Keyframe[], ms: number) => { const a = node.animate(frames, {duration: ms, easing: 'ease-in-out', fill: 'none'}); anims.add(a); a.onfinish = a.oncancel = () => anims.delete(a); };
    const hues = () => document.documentElement.dataset.theme === 'light' ? DAY : NIGHT;
    const twinkle = () => {
      const star = stars[next++ % stars.length];
      if (star) {
        const x = rand(.04, .96) * size.w, y = rand(.06, .9) * size.h, s = rand(.7, 1.35), list = hues();
        star.style.setProperty('--tw', list[Math.floor(Math.random() * list.length)]!);
        play(star, [{transform: `translate(${x}px, ${y}px) scale(.2) rotate(0deg)`, opacity: 0}, {transform: `translate(${x}px, ${y}px) scale(${s}) rotate(25deg)`, opacity: 1, offset: .4}, {transform: `translate(${x}px, ${y}px) scale(.25) rotate(45deg)`, opacity: 0}], rand(1100, 1800));
      }
      later(rand(2600, 7200), twinkle);
    };
    const shoot = () => {
      if (comet) {
        // (From the upper part of the sky, down and across at its own angle, for its own length.)
        const fromLeft = Math.random() < .5, a = rand(14, 38), length = rand(.28, .5) * Math.min(size.w, 900), rad = a * Math.PI / 180;
        const x0 = fromLeft ? rand(.05, .55) * size.w : rand(.45, .95) * size.w, y0 = rand(.04, .4) * size.h, dx = Math.cos(rad) * length * (fromLeft ? 1 : -1), dy = Math.sin(rad) * length;
        // (The streak points the way it flies: right and down at a, or left and down at 180 − a.)
        const turn = fromLeft ? a : 180 - a, list = hues();
        comet.style.setProperty('--tw', list[Math.floor(Math.random() * Math.min(3, list.length))]!);
        play(comet, [{transform: `translate(${x0}px, ${y0}px) rotate(${turn}deg) scaleX(.15)`, opacity: 0}, {transform: `translate(${x0 + dx * .3}px, ${y0 + dy * .3}px) rotate(${turn}deg) scaleX(1)`, opacity: 1, offset: .3}, {transform: `translate(${x0 + dx}px, ${y0 + dy}px) rotate(${turn}deg) scaleX(.4)`, opacity: 0}], rand(900, 1400));
      }
      later(rand(25000, 45000), shoot);
    };
    later(rand(1800, 4200), twinkle);
    later(rand(9000, 22000), shoot);
    return () => { timers.forEach(t => window.clearTimeout(t)); anims.forEach(a => a.cancel()); window.removeEventListener('resize', onResize); };
  }, [running]);
  return <span ref={host} className="checklist-ambient" aria-hidden="true" data-ambient={!allowed ? 'off' : running ? 'running' : 'paused'}>
    {allowed && <><i data-twinkle=""/><i data-twinkle=""/><i data-twinkle=""/><b data-comet=""/></>}
  </span>;
}
