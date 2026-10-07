import {z} from 'zod';
import {SpotifyReconnect} from './tokens';

/**
 * Spotify's player endpoints from the browser (Session W Part 20; Web API reference pages read 2026-10-07): the playback
 * state, devices, play/pause, next/previous, seek, volume, shuffle, repeat and transfer, each with the documented
 * answers: 200/204, 401 (connect again; one silent refresh first), 403 ("re-authenticating won't help": Premium is
 * needed to control playback, and in development mode only allowlisted accounts can use the app), 429 (wait: the
 * `Retry-After` seconds when the browser may read them, else 30 s, Spotify's rolling window). A 404 is not documented
 * here; it is read as "no active device". Nothing about the music is kept; nothing is retried by itself.
 */
export const SPOTIFY_API = 'https://api.spotify.com/v1';
export type SpotifyProblem = 'premium' | 'no-device' | 'rate' | 'unavailable';
export class SpotifyError extends Error { constructor(readonly kind: SpotifyProblem, message: string) { super(message); this.name = 'SpotifyError'; } }
const MESSAGES: Record<SpotifyProblem, string> = {
  premium: 'Spotify refused this. Controlling playback needs Spotify Premium, and while ZIGoals is in Spotify’s development mode only accounts the owner listed can use it.',
  'no-device': 'No Spotify device is playing. Open Spotify on a phone, computer or speaker, or choose a device under More controls.',
  rate: 'Spotify asked ZIGoals to wait a moment. Try again shortly.',
  unavailable: 'Spotify is not answering right now. Try again in a moment.',
};
const image = z.object({url: z.string(), width: z.number().nullable().optional(), height: z.number().nullable().optional()});
const item = z.object({name: z.string().max(500), duration_ms: z.number().nonnegative(), artists: z.array(z.object({name: z.string().max(300)})).optional(), album: z.object({name: z.string().max(500), images: z.array(image)}).optional(), images: z.array(image).optional(), show: z.object({name: z.string().max(500)}).optional(), external_urls: z.object({spotify: z.string().optional()}).optional()});
const device = z.object({id: z.string().nullable(), name: z.string().max(200), type: z.string().max(60), is_active: z.boolean(), volume_percent: z.number().nullable().optional(), supports_volume: z.boolean().optional()});
const state = z.object({device: device.nullable().optional(), is_playing: z.boolean(), progress_ms: z.number().nullable().optional(), shuffle_state: z.boolean().optional(), repeat_state: z.enum(['off', 'track', 'context']).optional(), item: item.nullable().optional()});
export type SpotifyDevice = {id: string; name: string; type: string; active: boolean; volume: number | null};
export type Playback = {playing: boolean; progressMs: number; durationMs: number; title: string; subtitle: string; artwork: {url: string; size: number} | null; link: string; device: SpotifyDevice | null; shuffle: boolean; repeat: 'off' | 'track' | 'context'};
/** Artwork only from Spotify's image host (the one the reference shows); anything else gets the placeholder. */
export const artworkAllowed = (url: string) => /^https:\/\/i\.scdn\.co\/image\/[A-Za-z0-9]+$/.test(url);
/** A link back to Spotify (its design rules ask for one with every item shown); only open.spotify.com addresses. */
export const spotifyLink = (url: string | undefined) => url && /^https:\/\/open\.spotify\.com\/[A-Za-z0-9/_-]+$/.test(url) ? url : 'https://open.spotify.com/';
const toDevice = (d: z.infer<typeof device>): SpotifyDevice | null => d.id ? {id: d.id, name: d.name, type: d.type, active: d.is_active, volume: d.supports_volume === false ? null : d.volume_percent ?? null} : null;
export function readPlayback(raw: unknown): Playback | null {
  if (raw === null) return null;
  const s = state.parse(raw), it = s.item;
  if (!it) return null;
  const images = [...(it.album?.images ?? it.images ?? [])].filter(i => artworkAllowed(i.url)).sort((a, b) => Math.abs((a.width ?? 300) - 300) - Math.abs((b.width ?? 300) - 300));
  return {playing: s.is_playing, progressMs: Math.max(0, s.progress_ms ?? 0), durationMs: it.duration_ms, title: it.name, subtitle: it.artists?.map(a => a.name).join(', ') || it.show?.name || it.album?.name || '', artwork: images[0] ? {url: images[0].url, size: images[0].width ?? 300} : null, link: spotifyLink(it.external_urls?.spotify), device: s.device ? toDevice(s.device) : null, shuffle: s.shuffle_state ?? false, repeat: s.repeat_state ?? 'off'};
}
export function createSpotifyPlayer({token, refresh, fetcher = fetch, clock = Date.now}: {token: () => Promise<string>; refresh: () => Promise<string>; fetcher?: typeof fetch; clock?: () => number}) {
  let pausedUntil = 0;
  async function call(method: 'GET' | 'PUT' | 'POST', path: string, query?: Record<string, string | number | boolean>, body?: unknown): Promise<unknown> {
    if (clock() < pausedUntil) throw new SpotifyError('rate', MESSAGES.rate);
    let access = await token();
    for (let attempt = 0; ; attempt++) {
      const url = new URL(SPOTIFY_API + path);
      for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, String(value));
      let response: Response;
      try { response = await fetcher(url.href, {method, headers: {Authorization: `Bearer ${access}`, ...(body === undefined ? {} : {'Content-Type': 'application/json'})}, ...(body === undefined ? {} : {body: JSON.stringify(body)}), credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', signal: AbortSignal.timeout(15000)}); }
      catch { throw new SpotifyError('unavailable', MESSAGES.unavailable); }
      if (response.status === 401 && attempt === 0) { access = await refresh(); continue; }
      if (response.status === 204) return null;
      if (response.ok) { const text = await response.text(); try { return text ? JSON.parse(text) : null; } catch { throw new SpotifyError('unavailable', MESSAGES.unavailable); } }
      if (response.status === 429) { const wait = Number(response.headers.get('Retry-After')); pausedUntil = clock() + (Number.isFinite(wait) && wait > 0 ? Math.min(wait, 600) : 30) * 1000; throw new SpotifyError('rate', MESSAGES.rate); }
      if (response.status === 401) throw new SpotifyReconnect();
      if (response.status === 403) throw new SpotifyError('premium', MESSAGES.premium);
      if (response.status === 404) throw new SpotifyError('no-device', MESSAGES['no-device']);
      throw new SpotifyError('unavailable', MESSAGES.unavailable);
    }
  }
  return {
    playback: async () => readPlayback(await call('GET', '/me/player')),
    devices: async () => { const raw = z.object({devices: z.array(device)}).parse(await call('GET', '/me/player/devices') ?? {devices: []}); return raw.devices.flatMap(d => toDevice(d) ?? []); },
    play: (deviceId?: string) => call('PUT', '/me/player/play', deviceId ? {device_id: deviceId} : undefined),
    pause: () => call('PUT', '/me/player/pause'),
    next: () => call('POST', '/me/player/next'),
    previous: () => call('POST', '/me/player/previous'),
    seek: (ms: number) => call('PUT', '/me/player/seek', {position_ms: Math.max(0, Math.round(ms))}),
    volume: (percent: number) => call('PUT', '/me/player/volume', {volume_percent: Math.min(100, Math.max(0, Math.round(percent)))}),
    shuffle: (on: boolean) => call('PUT', '/me/player/shuffle', {state: on}),
    repeat: (mode: 'off' | 'track' | 'context') => call('PUT', '/me/player/repeat', {state: mode}),
    transfer: (deviceId: string, play: boolean) => call('PUT', '/me/player', undefined, {device_ids: [deviceId], play}),
  };
}
export type SpotifyPlayer = ReturnType<typeof createSpotifyPlayer>;
