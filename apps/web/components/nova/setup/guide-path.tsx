'use client';
import {useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode} from 'react';
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
 * Motion Off show every final state at once (the path's own sheets). On a phone the open guide stands after the path and
 * is brought into view, as on Earn. Its own chunk: the page loads it after its first paint.
 */
const PHONE_QUERY = '(max-width: 640px)';
const subscribePhone = (change: () => void) => { const m = window.matchMedia?.(PHONE_QUERY); m?.addEventListener('change', change); return () => m?.removeEventListener('change', change); };
const usePhone = () => useSyncExternalStore(subscribePhone, () => !!window.matchMedia?.(PHONE_QUERY).matches, () => false);
/** Only the end of the path stands on it, as on the Checklist and Earn. */
const endOnly = (model: PathModel): PathModel => ({...model, milestones: model.milestones.filter(m => m.at === 'end')});
export type GuidePathProps = {model: PathModel; ariaLabel: string; open: string | null; onOpen: (id: string | null) => void; panel: (id: string) => ReactNode; say: string; className?: string};
export default function GuidePath({model, ariaLabel, open, onOpen, panel, say, className}: GuidePathProps) {
  const drawn = useMemo(() => endOnly(model), [model]), phone = usePhone(), guide = useRef<HTMLDivElement>(null);
  useEffect(() => { if (phone && open) guide.current?.scrollIntoView({block: 'start', behavior: entranceAllowed() ? 'smooth' : 'auto'}); }, [phone, open]);
  return <>
    <Path model={drawn} ariaLabel={ariaLabel} layout="snake" className={`nova-guide-path ${className ?? ''}`.trim()} variant="orbit" follow={false}
      bannerTitle={section => section.label} zigi={{say}} panelFor={open} onStep={step => onOpen(open === step.id ? null : step.id)} jumpLabel="Jump to your next planet"
      renderPanel={phone ? undefined : step => panel(step.id)}/>
    {phone && open && <div ref={guide} className="nova-guide-phone">{panel(open)}</div>}
  </>;
}
