/**
 * H2: the optional end bell for a duration habit's timer. It uses the meditation bells (lib/meditation/bells.ts) and
 * holds back in the quiet hours (the reminders plan's hours from Part 4; the knock's 22:00–08:00 until then) and
 * whenever the device refuses audio (a muted or suspended context resolves false and nothing else happens).
 */
export function inQuietHours(now: Date, from = '22:00', to = '08:00'): boolean {
  const minutes = now.getHours() * 60 + now.getMinutes(), [fh, fm] = from.split(':').map(Number), [th, tm] = to.split(':').map(Number);
  const f = fh! * 60 + fm!, t = th! * 60 + tm!;
  return f <= t ? minutes >= f && minutes < t : minutes >= f || minutes < t;
}
export async function ringTimerBell(now = new Date(), quiet: {from: string; to: string} = {from: '22:00', to: '08:00'}): Promise<boolean> {
  if (inQuietHours(now, quiet.from, quiet.to)) return false;
  try { const {ring} = await import('../meditation/bells'); return await ring('bowl', 60); } catch { return false; }
}
