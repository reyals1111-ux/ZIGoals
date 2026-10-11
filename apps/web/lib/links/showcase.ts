import {linksSchema, type Links} from './schema';

/**
 * The Showcase's links (Session W Part 19): four fictional links to reserved example addresses (example.com, .org, .net),
 * so My links shows on Settings and Today without pointing at anyone's real profile.
 */
export function showcaseLinks(day: string): Links {
  const at = `${day}T08:00:00.000Z`;
  const items = [
    ['95000000-0000-4000-8000-000000000001', 'Running club', 'https://www.example.com/running-club', 'strava'],
    ['95000000-0000-4000-8000-000000000002', 'Book club chat', 'https://www.example.org/book-club', 'whatsapp'],
    ['95000000-0000-4000-8000-000000000003', 'My photos', 'https://photos.example.net/me', 'instagram'],
    ['95000000-0000-4000-8000-000000000004', 'Chess games', 'https://www.example.com/chess', 'chesscom'],
  ] as const;
  return linksSchema.parse({version: 1, items: items.map(([id, label, url, icon], order) => ({id, label, url, icon, order, createdAt: at, updatedAt: at}))});
}
