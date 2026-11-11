'use client';
import {useEffect, useRef, useState} from 'react';
import {showcaseDay} from '../../../lib/showcase-storage';
import {fetchWeather, shouldFetch, WeatherError} from '../../../lib/nova/world/met';
import {NOVA_WORLD, placeOf, readingOf, worldOn, type NovaWorld, type WorldPlace, type WorldReading} from '../../../lib/nova/world/record';
import {SHOWCASE_PLACE, showcaseReading} from '../../../lib/nova/world/showcase';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useShowcase} from '../../showcase-controls';

/**
 * Session AM (ADR-038 D13–D15, A2): the weather a widget on the stage shows. It asks MET Norway only when every rule
 * allows it (lib/nova/world/met.ts `shouldFetch`: the person's switch is on, a place is chosen, the page is visible, the
 * reading on this device has passed its Expires time, and the last ask was ten minutes ago or more) and only while a
 * weather widget is mounted — this hook is the only caller. One request at a time for the whole page. In the Showcase
 * nothing is ever asked: the widget shows the Showcase's example values, labelled as an example.
 */
export type WeatherState =
  | {kind: 'reading-record'} | {kind: 'unreadable'} | {kind: 'off'} | {kind: 'no-place'}
  | {kind: 'asking'; place: WorldPlace} | {kind: 'failed'; place: WorldPlace; words: string}
  | {kind: 'live'; place: WorldPlace; reading: WorldReading; example: boolean; stale: string | null};
let inFlight: Promise<NovaWorld> | null = null;
export function useWeather(): WeatherState {
  const world = useDeviceRecord(NOVA_WORLD), showcase = useShowcase(), [failed, setFailed] = useState<string | null>(null), [tick, setTick] = useState(0);
  const update = world.update, data = world.data, ready = world.loaded && !world.unreadable && !showcase, live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  useEffect(() => {
    if (!ready) return;
    const now = new Date(), hidden = document.visibilityState === 'hidden';
    let timer = 0;
    const again = (ms: number) => { timer = window.setTimeout(() => setTick(t => t + 1), Math.max(60_000, ms)); };
    const reading = readingOf(data);
    // Look again when the reading expires (or, with none yet, when the ten-minute rule allows another ask).
    if (worldOn(data) && placeOf(data)) again(reading ? Date.parse(reading.expires) - now.getTime() + 2000 : 10 * 60_000 + 2000);
    const visible = () => { if (document.visibilityState !== 'hidden') setTick(t => t + 1); };
    document.addEventListener('visibilitychange', visible);
    if (shouldFetch({world: data, now, hidden, wanted: true})) {
      const ask = inFlight ?? (inFlight = fetchWeather({world: data, now}).finally(() => { inFlight = null; }));
      ask.then(next => { try { update(() => next); } catch { /* storage refused: the reading shows until the page closes */ } if (live.current) setFailed(null); })
        .catch(e => {
          if (e instanceof WeatherError && e.world) { try { update(() => e.world!); } catch { /* the rule then counts from memory only */ } }
          if (live.current) setFailed(e instanceof Error ? e.message : 'The weather could not be read just now.');
        });
    }
    return () => { window.clearTimeout(timer); document.removeEventListener('visibilitychange', visible); };
  }, [ready, data, update, tick]);
  if (showcase) return {kind: 'live', place: SHOWCASE_PLACE, reading: showcaseReading(showcaseDay() ?? '2026-11-11'), example: true, stale: null};
  if (!world.loaded) return {kind: 'reading-record'};
  if (world.unreadable) return {kind: 'unreadable'};
  if (!worldOn(data)) return {kind: 'off'};
  const place = placeOf(data), reading = readingOf(data);
  if (!place) return {kind: 'no-place'};
  if (reading) return {kind: 'live', place, reading, example: false, stale: failed};
  return failed ? {kind: 'failed', place, words: failed} : {kind: 'asking', place};
}
