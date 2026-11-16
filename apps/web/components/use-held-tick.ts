'use client';
import {useCallback, useState} from 'react';
import {heldSave, type HeldTicks} from '../lib/held-tick';

/**
 * Session AR (6a): the tick shows at once on a checkbox whose stored value is saved asynchronously (lib/held-tick.ts says
 * why). `shown(key, stored)` is what the box shows: the person's tick while its save waits, else the stored value.
 * `tick(key, on, save)` holds the tick, starts the save in the same task and lets go once it settles; it returns the
 * save's own promise.
 */
export function useHeldTick() {
  const [held, setHeld] = useState<HeldTicks>({});
  const shown = useCallback((key: string, stored: boolean) => held[key] ?? stored, [held]);
  const tick = useCallback(<T,>(key: string, on: boolean, save: () => Promise<T> | T) => heldSave(setHeld, key, on, save), []);
  return {shown, tick};
}
