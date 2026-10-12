'use client';
import {useEffect, useMemo, useRef} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {GOAL_EXTRAS, reconcileGoalExtras, type GoalExtra, type GoalExtras} from '../../lib/goal-extras/store';
import {AVERAGE_GOALS, averageKey} from '../../lib/average-goals/store';
import {deleteImages, listImages} from '../../lib/vision/store';
import {getAccountScope} from '../../lib/account-session';
import {isShowcase} from '../../lib/showcase-storage';
import {showToast} from '../ui/undo-toast';

/** This device's goal extras (Session AA-Cloud Part 2). Edits are refused while the record cannot be read, so an unreadable record is never overwritten. */
export function useGoalExtras() {
  const record = useDeviceRecord(GOAL_EXTRAS);
  const writable = record.loaded && !record.unreadable;
  /** Applies a pure change and offers Undo, which puts back only that goal's extras as they were. */
  function change(goalKey: string, next: (current: GoalExtras) => GoalExtras, message: string) {
    if (!writable) { showToast({message: 'Your goal details on this device could not be read, so nothing was changed.'}); return; }
    const before: GoalExtra | undefined = record.data.goals[goalKey];
    try {
      record.update(next);
      showToast({message, undo: () => record.update(current => restoreGoal(current, goalKey, before)), undone: 'Change undone.'});
    } catch (e) {
      showToast({message: e instanceof Error && e.message ? e.message : 'That change could not be saved on this device.'});
    }
  }
  return {...record, writable, change};
}
/** Puts one goal's extras back as they were (or removes them when there were none). */
export function restoreGoal(current: GoalExtras, goalKey: string, before: GoalExtra | undefined): GoalExtras {
  const goals = {...current.goals};
  if (before) goals[goalKey] = before; else delete goals[goalKey];
  return {...current, goals};
}
export function useAverageGoals() {
  return useDeviceRecord(AVERAGE_GOALS);
}

/** The scope a vision photo is kept under: the signed-in account, or "local". */
export const visionScope = () => getAccountScope() ?? 'local';

/**
 * Keeps the extras consistent with the goals this device shows (owner plan edit 3): once every goal store has read
 * cleanly, extras of goals that are gone go dormant (and come back with the goal); dormant extras older than 90 days
 * are dropped with their photos. Never runs while any store is loading or unreadable, or in the Showcase twice per load.
 */
export function useGoalExtrasConsistency(liveKeys: readonly string[], ready: boolean) {
  const extras = useDeviceRecord(GOAL_EXTRAS), averages = useAverageGoals();
  const keys = useMemo(() => new Set([...liveKeys, ...(averages.loaded && !averages.unreadable ? averages.data.goals.map(g => averageKey(g.id)) : [])]), [liveKeys, averages.loaded, averages.unreadable, averages.data]);
  const signature = [...keys].sort().join('|'), done = useRef('');
  useEffect(() => {
    if (!ready || !extras.loaded || extras.unreadable || !averages.loaded || averages.unreadable || done.current === signature) return;
    done.current = signature;
    const today = new Date().toISOString().slice(0, 10);
    const result = reconcileGoalExtras(extras.data, keys, today);
    if (!result.changed) return;
    try { extras.update(current => reconcileGoalExtras(current, keys, today).extras); } catch { return; }
    if (result.orphanImages.length && !isShowcase()) void deleteImages(visionScope(), result.orphanImages).catch(() => undefined);
  }, [ready, signature, extras, averages.loaded, averages.unreadable, keys]);
  // Photos no goal points at any more (replaced or removed earlier; kept until now so Undo could bring them back).
  const tidied = useRef(false);
  useEffect(() => {
    // Never in the Showcase: its goal extras live in the tab and say nothing about the photos this device keeps.
    if (!ready || tidied.current || !extras.loaded || extras.unreadable || isShowcase()) return;
    tidied.current = true;
    const used = new Set([...Object.values(extras.data.goals), ...Object.values(extras.data.dormant ?? {})].flatMap(e => e.vision?.kind === 'photo' ? [e.vision.imageId] : []));
    void listImages(visionScope()).then(images => deleteImages(visionScope(), images.filter(i => !used.has(i.id)).map(i => i.id))).catch(() => undefined);
  }, [ready, extras.loaded, extras.unreadable, extras.data]);
}
