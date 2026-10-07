/**
 * The page's one Web Audio context (Session W Parts 5–6), shared by the meditation bells and the ambient sounds. Made on
 * the first tap that needs it (browsers allow sound only after a gesture); null where the browser has no Web Audio.
 * Nothing here fetches anything: every sound is made on the device.
 */
type Param = {value?: number; setValueAtTime(v: number, t: number): unknown; linearRampToValueAtTime(v: number, t: number): unknown; exponentialRampToValueAtTime(v: number, t: number): unknown; cancelScheduledValues?(t: number): unknown; setTargetAtTime?(v: number, t: number, c: number): unknown};
type Node = {connect(to: unknown): unknown; disconnect?(): void};
type Source = Node & {start(t: number): void; stop(t: number): void};
export type AudioLike = {
  currentTime: number; destination: unknown; state?: string; sampleRate?: number; resume?: () => Promise<void>;
  createOscillator(): Source & {type: string; frequency: Param; detune?: Param};
  createGain(): Node & {gain: Param};
  createBiquadFilter?(): Node & {type: string; frequency: Param; Q: Param};
  createBuffer?(channels: number, length: number, rate: number): {getChannelData(channel: number): Float32Array};
  createBufferSource?(): Source & {buffer: unknown; loop: boolean};
};
let shared: AudioLike | null = null;
export function audioContext(): AudioLike | null {
  if (shared) return shared;
  const scope = globalThis as unknown as {AudioContext?: new () => AudioLike; webkitAudioContext?: new () => AudioLike};
  const Ctor = scope.AudioContext ?? scope.webkitAudioContext;
  if (!Ctor) return null;
  try { shared = new Ctor(); } catch { return null; }
  return shared;
}
/** Whether the page's audio can sound now (made, and not waiting for a tap after a reload). */
export function audioReady(): boolean {
  const ctx = shared;
  return !!ctx && ctx.state !== 'suspended' && ctx.state !== 'closed';
}
/** Wakes the page's audio on a tap without a sound. */
export async function wakeAudio(): Promise<boolean> {
  const ctx = audioContext();
  if (!ctx) return false;
  try { if (ctx.state === 'suspended') await ctx.resume?.(); return true; } catch { return false; }
}
/** Tests only. */
export function resetAudioForTests(): void { shared = null; }
