'use client';
import type {SoundLayer} from '../../lib/music/mix-store';
import {playingLabel} from '../../lib/audio/ambient-labels';
import './ambient.css';

/** The pill itself; the player is already loaded whenever a sound plays, so Stop imports it at once. */
export default function AmbientPillStop({sound, layers}: {sound: SoundLayer; layers?: SoundLayer[]}) {
  return <div className="ambient-pill" role="group" aria-label="Focus sound">
    <span aria-hidden="true">♪</span><span>{playingLabel({sound, layers})}</span>
    <button type="button" onClick={() => void import('../../lib/audio/ambient').then(m => m.stopAmbient())}>Stop</button>
  </div>;
}
