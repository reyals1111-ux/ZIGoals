// @vitest-environment jsdom
import {afterEach, describe, expect, it, vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {askWebgl} from './probe-ask';
import {PROBE_WAIT_MS, probeOf, probeStar, type StarProbe} from './probe';

// Session AS (Part 4, ADR-041 D36): the star's first ask for WebGL runs in a same-origin worker; the page answers
// wherever the worker cannot.
const gl = (renderer: string) => ({RENDERER: 1, getExtension: (name: string) => name === 'WEBGL_debug_renderer_info' ? {UNMASKED_RENDERER_WEBGL: 2} : name === 'WEBGL_lose_context' ? {loseContext: () => undefined} : null, getParameter: (n: number) => n === 2 ? renderer : 'plain'});
const canvases = (hard: object | null, soft: object | null) => { const asked: object[] = []; return {asked, make: () => ({getContext: (_type: string, options?: object) => { asked.push(options ?? {}); return options && 'failIfMajorPerformanceCaveat' in options ? hard : soft; }})}; };
type FakeWorker = {onmessage: ((e: {data: unknown}) => void) | null; onerror: ((e: {preventDefault(): void}) => void) | null; postMessage: (m: unknown) => void; terminate: () => void; sent: unknown[]; ended: number};
const fakeWorker = (): FakeWorker => { const w: FakeWorker = {onmessage: null, onerror: null, sent: [], ended: 0, postMessage: m => { w.sent.push(m); }, terminate: () => { w.ended += 1; }}; return w; };
const pageCanvas = (context: object | null) => vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => context) as never);
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('the asks (page and worker run the same code)', () => {
  it('hardware: the first ask succeeds and nothing else is asked for', () => {
    const c = canvases(gl('ANGLE (Apple, Apple M2, OpenGL 4.1)'), null);
    expect(askWebgl(c.make)).toEqual({webgl: true, hard: true, renderer: 'ANGLE (Apple, Apple M2, OpenGL 4.1)'});
    expect(c.asked).toEqual([{failIfMajorPerformanceCaveat: true}]);
  });
  it('software: only the second ask succeeds', () => {
    expect(askWebgl(canvases(null, gl('Google SwiftShader')).make)).toEqual({webgl: true, hard: false, renderer: 'Google SwiftShader'});
  });
  it('no WebGL, and a browser that throws: no WebGL', () => {
    expect(askWebgl(canvases(null, null).make)).toEqual({webgl: false, hard: false, renderer: null});
    expect(askWebgl(() => { throw Error('no canvas'); })).toEqual({webgl: false, hard: false, renderer: null});
  });
});
describe('the probe', () => {
  it('software is said for a failed hardware ask and for a software renderer by name', () => {
    expect(probeOf({webgl: true, hard: true, renderer: 'ANGLE (NVIDIA)'})).toEqual({webgl: true, software: false, renderer: 'ANGLE (NVIDIA)'});
    expect(probeOf({webgl: true, hard: false, renderer: null}).software).toBe(true);
    expect(probeOf({webgl: true, hard: true, renderer: 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device))'}).software).toBe(true);
    expect(probeOf({webgl: false, hard: false, renderer: null})).toEqual({webgl: false, software: false, renderer: null});
  });
  it('the worker is asked once, its answer is the probe, and it is ended', () => {
    const page = pageCanvas(null), w = fakeWorker(), got: StarProbe[] = [];
    probeStar(p => got.push(p), () => w as unknown as Worker);
    expect(w.sent).toEqual([{type: 'probe'}]);
    expect(got).toEqual([]); // nothing is asked on the page while the worker works
    w.onmessage!({data: {type: 'probed', answer: {webgl: true, hard: false, renderer: 'Google SwiftShader'}}});
    w.onmessage?.({data: {type: 'probed', answer: {webgl: true, hard: true, renderer: 'second'}}});
    expect(got).toEqual([{webgl: true, software: true, renderer: 'Google SwiftShader'}]);
    expect(w.ended).toBe(1);
    expect(page).not.toHaveBeenCalled();
  });
  it('the page answers when there is no worker, when it fails, when it finds no WebGL and when it says nothing in time', () => {
    const page = pageCanvas(gl('ANGLE (Intel)')), want = [{webgl: true, software: false, renderer: 'ANGLE (Intel)'}];
    let got: StarProbe[] = [];
    probeStar(p => got.push(p), () => null);
    expect(got).toEqual(want);
    got = []; probeStar(p => got.push(p), () => { throw Error('blocked'); });
    expect(got).toEqual(want);
    got = []; const failing = fakeWorker(); probeStar(p => got.push(p), () => failing as unknown as Worker); failing.onerror!({preventDefault: () => undefined});
    expect(got).toEqual(want); expect(failing.ended).toBe(1);
    got = []; const none = fakeWorker(); probeStar(p => got.push(p), () => none as unknown as Worker); none.onmessage!({data: {type: 'probed', answer: {webgl: false, hard: false, renderer: null}}});
    expect(got).toEqual(want);
    vi.useFakeTimers();
    got = []; const silent = fakeWorker(); probeStar(p => got.push(p), () => silent as unknown as Worker);
    vi.advanceTimersByTime(PROBE_WAIT_MS - 1); expect(got).toEqual([]);
    vi.advanceTimersByTime(1); expect(got).toEqual(want); expect(silent.ended).toBe(1);
    expect(page).toHaveBeenCalled();
  });
  it('a star taken away gets no answer', () => {
    pageCanvas(null); const w = fakeWorker(), got: StarProbe[] = [];
    probeStar(p => got.push(p), () => w as unknown as Worker)();
    w.onmessage?.({data: {type: 'probed', answer: {webgl: true, hard: true, renderer: 'late'}}});
    expect(got).toEqual([]); expect(w.ended).toBe(1);
  });
  it('the worker is the app\'s own file and asks for nothing but the probe', () => {
    const here = join(process.cwd(), 'apps/web/lib/nova/core'), probe = readFileSync(join(here, 'probe.ts'), 'utf8'), worker = readFileSync(join(here, 'probe-worker.ts'), 'utf8'), ask = readFileSync(join(here, 'probe-ask.ts'), 'utf8');
    expect(probe).toContain("new Worker(new URL('./probe-worker.ts', import.meta.url), {type: 'module', name: 'zigoals-nova-star'})");
    for (const source of [worker, ask]) expect(source).not.toMatch(/fetch\(|XMLHttpRequest|importScripts|indexedDB|localStorage|WebSocket/);
    expect(ask).not.toMatch(/^import /m);
    expect(readFileSync(join(here, '../../../components/nova/core/star-system.tsx'), 'utf8')).not.toContain('failIfMajorPerformanceCaveat');
  });
});
