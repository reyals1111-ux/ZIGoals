'use client';
import type {AmbientSound} from '../../lib/music/schema';
import {AMBIENT_LABELS} from '../../lib/audio/ambient-labels';
import './ambient.css';

/** The pill itself; the player is already loaded whenever a sound plays, so Stop imports it at once. */
export default function AmbientPillStop({sound}: {sound: AmbientSound}) {
  return <div className="ambient-pill" role="group" aria-label="Focus sound">
    <span aria-hidden="true">♪</span><span>{AMBIENT_LABELS[sound]}</span>
    <button type="button" onClick={() => void import('../../lib/audio/ambient').then(m => m.stopAmbient())}>Stop</button>
  </div>;
}
