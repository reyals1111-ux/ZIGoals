'use client';
import {useEffect} from 'react';
import {registerTimelineSource} from '../../lib/timeline/sources';

/**
 * Session AV lane 2 (r5-body; LEDGER #370, Tiimo's moods on the day): puts the day's mood, energy and feeling-word
 * check-ins on the Day Timeline as small marks (lib/timeline/mood-source.ts), only while Health is shown. Renders nothing;
 * the source's code loads only when the timeline reads it.
 */
export function MoodTimelineSource() {
  useEffect(() => registerTimelineSource('moods', () => import('../../lib/timeline/mood-source').then(m => m.moodTimelineSource)), []);
  return null;
}
export default MoodTimelineSource;
