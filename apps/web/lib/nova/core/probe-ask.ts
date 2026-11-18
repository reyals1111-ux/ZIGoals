/**
 * Session AS (Part 4, ADR-041 D36): the star's first questions to the browser, with no import of their own, so the same
 * code runs on the page and in the star's small worker (probe-worker.ts).
 *
 * With graphics hardware the first ask succeeds. If only the second does, the browser draws WebGL in software. The
 * renderer's name is read where the browser gives it, and the context is given back at once.
 */
export type ProbeAnswer = {webgl: boolean; hard: boolean; renderer: string | null};
type Canvas = {getContext(type: string, options?: object): unknown};
type Gl = {getExtension(name: string): unknown; getParameter(name: number): unknown; RENDERER: number};
export function askWebgl(make: () => Canvas): ProbeAnswer {
  try {
    const hard = make().getContext('webgl', {failIfMajorPerformanceCaveat: true}) as Gl | null, other = make();
    const any = (hard ?? other.getContext('webgl') ?? other.getContext('experimental-webgl')) as Gl | null;
    let name: string | null = null;
    try { const ext = any?.getExtension('WEBGL_debug_renderer_info') as {UNMASKED_RENDERER_WEBGL: number} | null | undefined; name = any ? String(any.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : any.RENDERER) ?? '') || null : null; } catch { name = null; }
    try { (any?.getExtension('WEBGL_lose_context') as {loseContext(): void} | null | undefined)?.loseContext(); } catch { /* the probe is dropped with its canvas */ }
    return {webgl: !!any, hard: !!hard, renderer: name};
  } catch { return {webgl: false, hard: false, renderer: null}; }
}
