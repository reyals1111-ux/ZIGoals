import type {LinkIcon} from '../../lib/links/schema';

/**
 * ZIGoals' own glyphs for My links (Session W Part 19). No brand's logo, shape or colour is used: each network gets a
 * plain, generic picture of what it is for (a camera for photos, a play button for videos, a briefcase for work…), and
 * the person's own label always says which site it is. Anything else gets the label's first letter. Decorative only.
 */
const PATHS: Record<Exclude<LinkIcon, 'monogram'>, string[]> = {
  instagram: ['M4 8.5h3l1.6-2.5h6.8L17 8.5h3v10H4z', 'M12 16.2a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  tiktok: ['M10 17.5V5.5l7 2v3l-7-2', 'M10 17.5a2.5 2.2 0 1 1-5 0 2.5 2.2 0 0 1 5 0z'],
  youtube: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M10 8.5v7l6-3.5z'],
  x: ['M6 6l12 12', 'M18 6L6 18'],
  facebook: ['M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5', 'M16.5 10a2.5 2.5 0 1 0 0-5', 'M17.5 14.6c1.8.5 3 2.1 3.4 4.4'],
  linkedin: ['M4 8.5h16v10H4z', 'M9 8.5V6h6v2.5', 'M4 13h16'],
  reddit: ['M5 5.5h14v10h-8l-4 3.5v-3.5H5z', 'M8.5 9.5h7', 'M8.5 12.5h4.5'],
  discord: ['M7 8.5h10a4 4 0 0 1 4 4v1a3.5 3.5 0 0 1-6.4 2L14 15h-4l-.6 1A3.5 3.5 0 0 1 3 13.5v-1a4 4 0 0 1 4-4z', 'M8 11v3', 'M6.5 12.5h3', 'M15.5 11.5h.01', 'M17.5 13.5h.01'],
  twitch: ['M4 7.5h16v10H4z', 'M9 3.5l3 4 3-4', 'M9 20.5h6'],
  github: ['M8.5 7.5L4 12l4.5 4.5', 'M15.5 7.5L20 12l-4.5 4.5', 'M13.5 5.5l-3 13'],
  spotify: ['M4.5 15.5V13a7.5 7.5 0 0 1 15 0v2.5', 'M4.5 14.5h3v5h-3z', 'M16.5 14.5h3v5h-3z'],
  whatsapp: ['M5 5.5h14v10h-8l-4 3.5v-3.5H5z', 'M8.5 10.5h.01', 'M12 10.5h.01', 'M15.5 10.5h.01'],
  telegram: ['M3.5 6.5h17v11h-17z', 'M3.5 7l8.5 6.5L20.5 7'],
  strava: ['M4 18.5l4-6 4 3 4-8 4 5', 'M4 18.5h.01', 'M20 12.5h.01'],
  chesscom: ['M4.5 4.5h15v15h-15z', 'M4.5 12h15', 'M12 4.5v15', 'M4.5 4.5h7.5V12H4.5z', 'M12 12h7.5v7.5H12z'],
  lichess: ['M8 19.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z', 'M16.5 19.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z', 'M8 15V13', 'M8 10.5V8.5', 'M16.5 12.5V10.5', 'M6.5 8.5h3', 'M15 10.5h3'],
};
const FILLED: Partial<Record<LinkIcon, number[]>> = {chesscom: [3, 4]};
export function LinkGlyph({icon, label, size = 22}: {icon: LinkIcon; label: string; size?: number}) {
  if (icon === 'monogram') {
    // The letter is drawn by CSS (attr()), so it never becomes part of a link's text or name: the label says it once.
    const letter = [...label.trim()][0]?.toUpperCase() ?? '•';
    return <span className="link-glyph link-monogram" data-letter={letter} aria-hidden="true" {...(size !== 22 ? {style: {width: size, height: size}} : {})} />;
  }
  return <svg className="link-glyph" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {PATHS[icon].map((d, i) => <path key={i} d={d} {...(FILLED[icon]?.includes(i) ? {fill: 'currentColor', stroke: 'none', opacity: 0.55} : {})} />)}
  </svg>;
}
export const ICON_NAME: Record<LinkIcon, string> = {instagram: 'Photos (Instagram)', tiktok: 'Short videos (TikTok)', youtube: 'Videos (YouTube)', x: 'Posts (X)', facebook: 'Friends (Facebook)', linkedin: 'Work (LinkedIn)', reddit: 'Forums (Reddit)', discord: 'Gaming chat (Discord)', twitch: 'Live streams (Twitch)', github: 'Code (GitHub)', spotify: 'Music (Spotify)', whatsapp: 'Chats (WhatsApp)', telegram: 'Messages (Telegram)', strava: 'Routes (Strava)', chesscom: 'Chess (chess.com)', lichess: 'Chess (Lichess)', monogram: 'First letter of the name'};
