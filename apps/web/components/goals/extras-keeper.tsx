'use client';
import {useEffect, useMemo, useRef} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {GOAL_EXTRAS, reconcileGoalExtras} from '../../lib/goal-extras/store';
import {averageKey} from '../../lib/average-goals/store';
import {deleteImages, listImages} from '../../lib/vision/store';
import {getAppStorage, isShowcase} from '../../lib/showcase-storage';
import {referencedPhotoIds} from '../../lib/goal-extras/photo-references';
import {useAverageGoals, visionScope} from './use-goal-extras';

/** Keeps the goal extras in step with the goals that exist (G2–G7, owner edit 3); renders nothing. Loaded after Goals. */
export function ExtrasKeeper({liveKeys, ready}: {liveKeys: readonly string[]; ready: boolean}) {
  useGoalExtrasConsistency(liveKeys, ready);
  return null;
}

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
    // Session AF Part 11 A10: never a photo another goal-extras version still points at; nothing when unreadable.
    const refs = referencedPhotoIds(getAppStorage());
    const orphans = refs.unreadable ? [] : result.orphanImages.filter(id => !refs.ids.has(id));
    if (orphans.length && !isShowcase()) void deleteImages(visionScope(), orphans).catch(() => undefined);
  }, [ready, signature, extras, averages.loaded, averages.unreadable, keys]);
  // Photos no goal points at any more (replaced or removed earlier; kept until now so Undo could bring them back).
  const tidied = useRef(false);
  useEffect(() => {
    // Never in the Showcase: its goal extras live in the tab and say nothing about the photos this device keeps.
    if (!ready || tidied.current || !extras.loaded || extras.unreadable || isShowcase()) return;
    tidied.current = true;
    // Session AF Part 11 A10: the references of every goal-extras version count (v1 and a future v2, by bytes);
    // when either record cannot be read, nothing is deleted.
    const refs = referencedPhotoIds(getAppStorage());
    if (refs.unreadable) return;
    const used = new Set([...Object.values(extras.data.goals), ...Object.values(extras.data.dormant ?? {})].flatMap(e => e.vision?.kind === 'photo' ? [e.vision.imageId] : []));
    for (const id of refs.ids) used.add(id);
    void listImages(visionScope()).then(images => deleteImages(visionScope(), images.filter(i => !used.has(i.id)).map(i => i.id))).catch(() => undefined);
  }, [ready, extras.loaded, extras.unreadable, extras.data]);
}
