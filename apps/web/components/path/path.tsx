'use client';
import {Fragment, useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode} from 'react';
import {milestoneState, nextStep, normalisePath, orbitOffset, pathSegments, pathSteps, sectionProgress, snakeOffset, stepIntent, zigiAnchor, type PathModel, type PathStep, type PlacedMilestone, type StepIntent} from '../../lib/path/model';
import {entranceAllowed} from '../use-entrance';
import {PathChest} from './path-milestone';
import {PathDot} from './path-dot';
import {PathLine} from './path-line';
import {PathBanner} from './path-section';
import {PathZigi, ZIGI_PATH_STATES} from './path-zigi';
import {usePathGeometry} from './use-path-geometry';
import './path.css';

/**
 * The shared path renderer (Session AF, ADR-028; P7.4–P7.11): any `PathModel` drawn as large glowing dots in their own
 * colours, joined by the footer's neon flow line, grouped in orbits with banners, with reward chests, ZIGi beside the next
 * dot and a "Jump to next" bubble. The Checklist, the Earn lane's Start-here path and the Academy's mini path draw with it
 * unchanged. It never decides a state: the caller derives every step from the real record and handles `onStep`.
 *
 * - `onStep(step, intent)`: pressing a dot; `intent` is tick, open (a link step, after navigation starts) or value.
 * - `panelFor` / `renderPanel`: the caller's inline panel (the value stepper, a done dot's details) under one step.
 * - `zigi`: false hides ZIGi; `state` overrides the mood's state (e.g. sleepy late at night); `say` is a short line.
 * Motion is one-time per occurrence: a dot that has just become done fills and bursts, its line lights along its length,
 * a chest that has just been reached opens, ZIGi cheers for a moment. Nothing loops. Reduced motion and Motion Off show
 * every final state at once (CSS). Keyboard: the dots are buttons in path order; Home/End and the arrow keys move
 * between them; the bubble scrolls the next dot into view and focuses it. The bubble takes no layout space and shows
 * only while the next dot is off screen and the bubble itself sits whole on the screen, inside the path, over no banner,
 * chest or open panel (critique round 2).
 *
 * Session AF (L3b): `variant="orbit"` is the Checklist's full-screen, learning-path look (its CSS is
 * components/path/path-orbit.css, which only the Checklist imports): the S winds every six dots, the next dot carries an
 * orbit ring, a gentle pulse and a START / NEXT bubble, a tick bursts into sparks and sends a comet along the line to the
 * next dot, an orbit's banner fills its own bar and celebrates once when the orbit is complete, chests sit on the path,
 * the day's end is a trophy planet, and ZIGi is a large figure beside the next dot. The owner allowed that motion inside
 * the Checklist only; reduced motion and Motion Off still show every final state at once. The default look (Earn's
 * Start-here path and Academy) is unchanged.
 */
export type PathProps = {
  model: PathModel;
  ariaLabel: string;
  layout?: 'snake' | 'straight';
  density?: 'full' | 'compact';
  onStep?: (step: PathStep, intent: StepIntent) => void;
  panelFor?: string | null;
  renderPanel?: (step: PathStep) => ReactNode;
  zigi?: false | {state?: string; say?: string};
  jumpLabel?: string;
  className?: string;
  /** 'orbit': the Checklist's full-screen path (see above). Default: the shared look. */
  variant?: 'default' | 'orbit';
};

const JUST_MS = 1100, CHEER_MS = 1600;
const sideOf = (offset: number): 'left' | 'right' => offset > 0 ? 'left' : 'right';
/** The orbit look's ZIGi stands in the open sky the path bends away from (where a learning path puts its characters): the
 *  side opposite the dot's swing, or, for a dot in the middle, opposite the dot before it (the one after it, for the first). */
const orbitZigiSide = (i: number, swing: (i: number) => number): 'left' | 'right' => { const o = swing(i) || (i > 0 ? swing(i - 1) : swing(i + 1)); return o > 0 ? 'left' : 'right'; };

/** Steps (and chests) that have just changed into done / reached since the last render, for their one-time motion. */
function useJust(ids: string[], key: string): Set<string> {
  const previous = useRef<Set<string> | null>(null), [just, setJust] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    const now = new Set(ids), before = previous.current; previous.current = now;
    if (!before) return;
    const fresh = ids.filter(id => !before.has(id));
    if (!fresh.length) return;
    setJust(new Set(fresh));
    const t = window.setTimeout(() => setJust(new Set()), JUST_MS);
    return () => window.clearTimeout(t);
    // `key` carries the ids' identity; the array itself is new on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return just;
}

export function Path({model: raw, ariaLabel, layout = 'snake', density = 'full', onStep, panelFor = null, renderPanel, zigi = {}, jumpLabel = 'Jump to next', className, variant = 'default'}: PathProps) {
  const orbit = variant === 'orbit', swingOf = orbit ? orbitOffset : snakeOffset;
  const model = useMemo(() => normalisePath(raw), [raw]);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, ''), stage = useRef<HTMLDivElement>(null);
  const steps = useMemo(() => pathSteps(model), [model]), segments = useMemo(() => pathSegments(model), [model]);
  const milestones = useMemo(() => milestoneState(model), [model]), next = nextStep(model), anchor = zigiAnchor(model);
  const doneIds = steps.filter(s => s.state === 'done').map(s => s.id), reachedIds = milestones.filter(m => m.reached).map(m => `m:${m.id}`);
  // The orbit look also celebrates an orbit the moment its last dot is done (once; `s:<id>`).
  const completeIds = orbit ? model.sections.filter(s => { const p = sectionProgress(s); return p.total > 0 && p.done === p.total; }).map(s => `s:${s.id}`) : [];
  const justIds = [...doneIds, ...reachedIds, ...completeIds];
  const just = useJust(justIds, justIds.join('|'));
  const geometryKey = `${layout}|${density}|${steps.map(s => s.id).join(',')}|${milestones.map(m => `${m.id}@${m.afterStepId}`).join(',')}|${panelFor ?? ''}`;
  const geo = usePathGeometry(stage, geometryKey);

  // ZIGi cheers for a moment after a dot is done here, then returns to the path's mood.
  const [cheer, setCheer] = useState(false);
  const ticked = steps.some(s => just.has(s.id));
  useEffect(() => { if (!ticked) return; setCheer(true); const t = window.setTimeout(() => setCheer(false), CHEER_MS); return () => window.clearTimeout(t); }, [ticked]);
  const zigiState = zigi === false ? null : zigi.state ?? (cheer && anchor.mood !== 'done' ? ZIGI_PATH_STATES.tick : ZIGI_PATH_STATES[anchor.mood]);

  // "Jump to next": wanted while the next dot is out of view (always, where the browser cannot tell).
  const [nextVisible, setNextVisible] = useState(true), [nextAbove, setNextAbove] = useState(false);
  const nextId = next?.id ?? null;
  useEffect(() => {
    const el = nextId ? stage.current?.querySelector<HTMLElement>(`[data-path-point="${CSS.escape(nextId)}"]`) : null;
    if (!el) { setNextVisible(true); return; }
    if (typeof IntersectionObserver === 'undefined') { setNextVisible(false); return; }
    const io = new IntersectionObserver(entries => { for (const e of entries) { setNextVisible(e.isIntersecting); setNextAbove(e.boundingClientRect.top < 0); } }, {threshold: .6});
    io.observe(el);
    return () => io.disconnect();
  }, [nextId, geometryKey]);
  // Critique round 2 (L5c): the bubble takes no room (it rides a zero-height sticky dock on a track laid over the stage) and
  // is shown only where it is whole on the screen, inside its own path, and over no orbit banner, chest, end or open
  // panel — so it never parks on the first banner's count, never hangs over the page around the path, and never leaves
  // an empty band at the path's end. Measured on scroll and resize, once a frame at most.
  const bubble = useRef<HTMLButtonElement>(null), [jumpClear, setJumpClear] = useState(false);
  const wantJump = !!next && !nextVisible;
  useEffect(() => {
    if (!wantJump) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const b = bubble.current, s = stage.current; if (!b || !s) return;
      const r = b.getBoundingClientRect(), box = s.getBoundingClientRect();
      const whole = r.height > 0 && r.top >= 0 && r.bottom <= window.innerHeight && r.top >= box.top && r.bottom <= box.bottom;
      const covers = [...s.querySelectorAll('.path-banner, .path-chest, .path-end, .path-panel')].some(el => { const o = el.getBoundingClientRect(); return o.left < r.right && o.right > r.left && o.top < r.bottom && o.bottom > r.top; });
      setJumpClear(whole && !covers);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    schedule();
    document.addEventListener('scroll', schedule, {passive: true, capture: true}); window.addEventListener('resize', schedule);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('scroll', schedule, {capture: true}); window.removeEventListener('resize', schedule); setJumpClear(false); };
  }, [wantJump, geometryKey]);
  const jump = useCallback(() => {
    const el = next ? stage.current?.querySelector<HTMLElement>(`[data-path-point="${CSS.escape(next.id)}"]`) : null; if (!el) return;
    el.scrollIntoView({block: 'center', behavior: entranceAllowed() ? 'smooth' : 'auto'});
    el.focus({preventScroll: true});
  }, [next]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const dots = [...(stage.current?.querySelectorAll<HTMLElement>('button.path-dot, a.path-dot') ?? [])], at = dots.indexOf(event.target as HTMLElement);
    if (at < 0) return;
    const to = event.key === 'Home' ? 0 : event.key === 'End' ? dots.length - 1 : event.key === 'ArrowDown' ? Math.min(dots.length - 1, at + 1) : event.key === 'ArrowUp' ? Math.max(0, at - 1) : -1;
    if (to < 0) return;
    event.preventDefault(); dots[to]?.focus();
  };

  const chestsAfter = new Map<string, PlacedMilestone[]>();
  for (const m of milestones) if (m.afterStepId) chestsAfter.set(m.afterStepId, [...(chestsAfter.get(m.afterStepId) ?? []), m]);
  const zigiAtEnd = zigiState && !next && steps.length > 0;
  // The orbit look: a comet runs along each line a tick has just lit, and from the dot just done on to the next one.
  const comets = orbit ? new Set(segments.filter(s => (just.has(s.from) && (s.lit || s.to === next?.id)) || (just.has(s.to) && s.lit)).map(s => s.id)) : undefined;
  const endTrophy = orbit && milestones.some(m => m.at === 'end' && m.afterStepId);
  let index = 0;
  return <div ref={stage} className={`path-stage${className ? ` ${className}` : ''}`} data-layout={layout} data-density={density} data-variant={orbit ? 'orbit' : undefined} role="group" aria-label={ariaLabel} onKeyDown={onKeyDown} data-path={model.id} data-measured={geo ? '' : undefined}>
    {geo && <PathLine geo={geo} segments={segments} comets={comets} rail={orbit}/>}
    {model.sections.map((section, si) => {
      const p = sectionProgress(section), heading = `path-${uid}-${si}`;
      return <section key={section.id} className="path-section" data-section={section.id} data-colour={section.colour} aria-labelledby={heading}>
        <PathBanner section={section} index={si} done={p.done} total={p.total} headingId={heading} meter={orbit} justComplete={just.has(`s:${section.id}`)}/>
        <ol className="path-steps">
          {section.steps.map(step => {
            const i = index++, offset = layout === 'snake' ? swingOf(i) : 0, side = sideOf(offset), intent = stepIntent(step), isNext = next?.id === step.id;
            const chests = chestsAfter.get(step.id) ?? [];
            return <Fragment key={step.id}>
              <li className="path-step" data-state={step.state} data-next={isNext ? '' : undefined} data-counted={step.counted === false ? 'no' : undefined} style={{'--offset': offset, ...(orbit ? {'--reach': Math.abs(offset)} : {})} as CSSProperties}>
                <div className="path-node">
                  <PathDot step={step} intent={intent} just={just.has(step.id)} expanded={panelFor === step.id} onPress={intended => onStep?.(step, intended)} {...(orbit ? {orbit: {next: isNext, cue: anchor.mood === 'start' ? 'Start' : 'Next'}} : {})}/>
                  <span className="path-label" data-side={side}><span className="path-label-text">{step.label}</span>{step.note && <span className="path-label-note">{step.note}</span>}{step.state === 'locked' && step.lockedReason && <span className="path-label-note">{step.lockedReason}</span>}</span>
                  {zigiState && isNext && <PathZigi state={zigiState} side={orbit ? orbitZigiSide(i, swingOf) : side === 'left' ? 'right' : 'left'} say={zigi === false || orbit ? undefined : zigi.say} alive={orbit} centred={orbit && offset === 0}/>}
                </div>
                {panelFor === step.id && renderPanel && <div className="path-panel">{renderPanel(step)}</div>}
              </li>
              {chests.map(m => {
                const after = layout === 'snake' ? swingOf(i + 1) : 0, around = offset + after;
                // The orbit look sets a chest on the path itself, half way between its two dots; the day's end is a trophy.
                const onPath = orbit ? {offset: m.at === 'end' ? 0 : Math.round((offset + after) / 2 * 100) / 100, trophy: m.at === 'end', zigi: m.at === 'end' && zigiAtEnd ? zigiState : null} : undefined;
                return <PathChest key={m.id} milestone={m} just={just.has(`m:${m.id}`)} side={around >= 0 ? 'left' : 'right'} uid={uid} onPath={onPath}/>;
              })}
            </Fragment>;
          })}
        </ol>
      </section>;
    })}
    {zigiAtEnd && !endTrophy && <div className="path-end"><PathZigi state={zigiState} side="left" say={zigi === false || orbit ? undefined : zigi.say} alive={orbit}/></div>}
    {next && wantJump && <div className="path-jump-track"><div className="path-jump-dock">
      <button ref={bubble} type="button" className="path-jump" data-clear={jumpClear || undefined} data-direction={nextAbove ? 'up' : 'down'} onClick={jump}><span>{jumpLabel}</span><span className="path-jump-arrow" aria-hidden="true">{nextAbove ? '↑' : '↓'}</span><span className="sr-only">: {next.label}</span></button>
    </div></div>}
  </div>;
}
