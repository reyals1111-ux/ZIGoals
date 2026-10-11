import {loadRuntimeBindings} from '../../../lib/server/runtime-bindings';
import {validClientId} from '../../../lib/music/spotify/oauth';
export const dynamic = 'force-dynamic';
/**
 * Session W Part 20: what the music player may offer on this deployment. Spotify's client id is public (Spotify's PKCE
 * flow has no secret); it comes from the Worker variable SPOTIFY_CLIENT_ID (or the process environment in local
 * development), so the owner turns Spotify on without a new build (docs/product/MUSIC_ACTIVATION.md). Unset or not a
 * Spotify client id: null, and the player offers Ambient and the "Open" links only.
 */
export async function GET(): Promise<Response> {
  const env = await loadRuntimeBindings<{SPOTIFY_CLIENT_ID?: string}>(), id = env.SPOTIFY_CLIENT_ID ?? process.env.SPOTIFY_CLIENT_ID;
  return Response.json({version: 1, spotify: {clientId: validClientId(id) ? id : null}}, {headers: {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer'}});
}
