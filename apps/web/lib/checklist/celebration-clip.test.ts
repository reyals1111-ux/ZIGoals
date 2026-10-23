import {existsSync, statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {CELEBRATION_CLIP, decideCelebration, type CelebrationEnvironment} from './celebration-clip';

const env = (o: Partial<CelebrationEnvironment> = {}): CelebrationEnvironment => ({reducedMotion: false, motionOff: false, saveData: false, autoplay: 'unknown', canPlay: () => true, ...o});
const file = (src: string) => fileURLToPath(new URL(`../../public${src}`, import.meta.url));
describe('the day\'s celebration clip (Session AG Polish 2, ADR-031 K13; owner Part 7)', () => {
  test('one constant: WebM first, then MP4; the first frame as poster, the last frame as the still; the words at 7.3 s', () => {
    expect(CELEBRATION_CLIP.sources.map(s => s.type.split(';')[0])).toEqual(['video/webm', 'video/mp4']);
    expect(CELEBRATION_CLIP.uiAt).toBeLessThan(CELEBRATION_CLIP.seconds);
    for (const src of [...CELEBRATION_CLIP.sources.map(s => s.src), CELEBRATION_CLIP.poster, CELEBRATION_CLIP.still]) expect(existsSync(file(src)), src).toBe(true);
    // (The owner's files as they are: about 1.4 and 1.6 MB, the stills under 100 kB.)
    for (const s of CELEBRATION_CLIP.sources) expect(statSync(file(s.src)).size).toBeLessThan(2_000_000);
    for (const src of [CELEBRATION_CLIP.poster, CELEBRATION_CLIP.still]) expect(statSync(file(src)).size).toBeLessThan(100_000);
  });
  test('plays only where motion is welcome, data is not being saved, autoplay is allowed and a source can play', () => {
    expect(decideCelebration(env())).toEqual({play: true});
    expect(decideCelebration(env({reducedMotion: true}))).toEqual({play: false, reason: 'reduced-motion'});
    expect(decideCelebration(env({motionOff: true}))).toEqual({play: false, reason: 'motion-off'});
    expect(decideCelebration(env({saveData: true}))).toEqual({play: false, reason: 'save-data'});
    expect(decideCelebration(env({autoplay: 'disallowed'}))).toEqual({play: false, reason: 'autoplay-blocked'});
    expect(decideCelebration(env({canPlay: () => false}))).toEqual({play: false, reason: 'unplayable'});
    expect(decideCelebration(env({canPlay: t => t.startsWith('video/mp4')}))).toEqual({play: true});
  });
});
