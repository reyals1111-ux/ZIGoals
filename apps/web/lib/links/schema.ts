import {z} from 'zod';

/**
 * My links (Session W Part 19; synced home settings v3 `links`): the person's own socials, apps and sites, shown as
 * buttons on Today. Only https addresses with a host, no credentials; ZIGoals adds nothing to them and never fetches
 * them (no favicons). Icons come from ZIGoals' own simple glyphs, or the label's first letter.
 */
export const LINK_ICONS = ['instagram', 'tiktok', 'youtube', 'x', 'facebook', 'linkedin', 'reddit', 'discord', 'twitch', 'github', 'spotify', 'whatsapp', 'telegram', 'strava', 'chesscom', 'lichess', 'monogram'] as const;
export type LinkIcon = typeof LINK_ICONS[number];
export const MAX_LINKS = 24;
/** An https address with a host, no user name or password, at most 500 characters. */
export function linkUrlIssue(raw: string): string | null {
  let url: URL;
  try { url = new URL(raw); } catch { return 'Enter a full address that starts with https://'; }
  if (url.protocol !== 'https:') return 'Only https:// addresses can be added.';
  if (!url.hostname || !url.hostname.includes('.')) return 'Enter a full address, such as https://example.com';
  if (url.username || url.password) return 'An address with a user name or password cannot be added.';
  if (raw.length > 500) return 'That address is too long.';
  return null;
}
const instant = z.iso.datetime();
export const linkSchema = z.strictObject({
  id: z.uuid(), label: z.string().trim().min(1).max(40), url: z.string().max(500).refine(u => linkUrlIssue(u) === null, 'Only full https:// addresses.'),
  icon: z.enum(LINK_ICONS), order: z.number().int().min(0).max(10_000), createdAt: instant, updatedAt: instant,
});
export type PersonalLink = z.infer<typeof linkSchema>;
export const linksSchema = z.strictObject({version: z.literal(1), items: z.array(linkSchema).max(MAX_LINKS)})
  .refine(group => new Set(group.items.map(i => i.id)).size === group.items.length, 'Duplicate link.');
export type Links = z.infer<typeof linksSchema>;
export const emptyLinks = (): Links => ({version: 1, items: []});
