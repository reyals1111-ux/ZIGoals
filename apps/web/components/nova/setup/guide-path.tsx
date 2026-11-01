'use client';
import {useEffect, useMemo, useRef, type ReactNode} from 'react';
import type {PathModel} from '../../../lib/path/model';
import {Path} from '../../path/path';
import {entranceAllowed} from '../../use-entrance';
// The orbit look and its one-time motion, from the path's own sheets, exactly as Earn's Start-here path wears them
// (components/earn/start-here-path.tsx): every rule there is keyed on the orbit look's own classes.
import '../../path/path-orbit.css';
import '../../habits/habits-aa.css';

/**
 * Session AK, owner follow-up 2 (N3, lane NC): NOVA's planet guides ("Build your own NOVA", "Connect your Hermes Agent")
 * on the shared path engine in the orbit look Earn's Start-here path wears (`variant="orbit"`, `follow={false}`: the
 * guide never moves the page by itself), with its one-time motion: a planet just checked lights, a light travels to the
 * next, an orbit just completed wakes its planet, and the end of the path, the finale, is "NOVA online". Reduced motion and
 * Motion Off show every final state at once (the path's own sheets). The open guide stands after the path and is brought
 * into view (on a phone as on Earn; on a computer too since P3, as one wide panel). Its own chunk: the page loads it after its first paint.
 */
/** Only the end of the path stands on it, as on the Checklist and Earn. */
const endOnly = (model: PathModel): PathModel => ({...model, milestones: model.milestones.filter(m => m.at === 'end')});
export type GuidePathProps = {model: PathModel; ariaLabel: string; open: string | null; onOpen: (id: string | null) => void; panel: (id: string) => ReactNode; say: string; className?: string};
export default function GuidePath({model, ariaLabel, open, onOpen, panel, say, className}: GuidePathProps) {
  const drawn = useMemo(() => endOnly(model), [model]), guide = useRef<HTMLDivElement>(null);
  // Session AK P3 (NOVA_DESIGN_REVIEW.md ND-8): on every width the open planet's guide stands after the path as one wide
  // panel (up to 760 px), brought into view: beside a planet on a computer it was a 420 px column whose commands were cut
  // mid-token. The planet stays marked open on the path (`panelFor`).
  useEffect(() => { if (open) guide.current?.scrollIntoView({block: 'start', behavior: entranceAllowed() ? 'smooth' : 'auto'}); }, [open]);
  return <>
    <Path model={drawn} ariaLabel={ariaLabel} layout="snake" className={`nova-guide-path ${className ?? ''}`.trim()} variant="orbit" follow={false}
      bannerTitle={section => section.label} zigi={{say}} panelFor={open} onStep={step => onOpen(open === step.id ? null : step.id)} jumpLabel="Jump to your next planet"/>
    {open && <div ref={guide} className="nova-guide-phone nova-guide-open">{panel(open)}</div>}
  </>;
}
