'use client';
import {useEffect, useId, useState, type RefObject} from 'react';
import {holdGaze, type GazeHold} from './gaze';

/**
 * Session AL Part 14 (D13): a part of the chat says ZIGi waits on the person (gaze.ts) while `active` and while `box` is on
 * screen: cards in a closed panel or scrolled away wait for nobody's eyes, so ZIGi does not stare at them. Released on
 * unmount.
 */
export function useGazeHold(hold: GazeHold, active: boolean, box: RefObject<Element | null>): void {
  const id = useId(), [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!active || !el || typeof IntersectionObserver === 'undefined') { setSeen(false); return; }
    const observer = new IntersectionObserver(([entry]) => setSeen(!!entry?.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, [active, box]);
  useEffect(() => { holdGaze(id, active && seen ? hold : null); }, [active, hold, id, seen]);
  useEffect(() => () => holdGaze(id, null), [id]);
}
