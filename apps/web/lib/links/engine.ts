import {settingsGroupIn, withSettingsGroup} from '../vault/w-homes';
import type {DashboardSettings} from '../dashboard-settings';
import {LINK_ICONS, MAX_LINKS, emptyLinks, linkUrlIssue, linksSchema, type LinkIcon, type Links, type PersonalLink} from './schema';

/**
 * My links (Session W Part 19): the person's own socials, apps and sites in settings v3 `links` (synced with Today's
 * settings). Every change stamps the links it touches (`updatedAt`), so two devices settle on the newer edit; ZIGoals
 * adds nothing to an address and never fetches it. A label is the person's own words; the glyph is ZIGoals' own.
 */
export const linksOf = (settings: DashboardSettings): Links => settingsGroupIn(settings, 'links') ?? emptyLinks();
export const sortedLinks = (links: Links): PersonalLink[] => [...links.items].sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
const save = (settings: DashboardSettings, items: PersonalLink[]) => { const next = linksSchema.parse({version: 1, items}); return withSettingsGroup(settings, 'links', next, !next.items.length && !settingsGroupIn(settings, 'links')); };

export type LinkInput = {label: string; url: string; icon: LinkIcon};
/** The words for what is wrong with an input, or null. */
export function linkInputIssue(input: LinkInput): string | null {
  const label = input.label.trim();
  if (!label) return 'Give the link a name.';
  if (label.length > 40) return 'A name has at most 40 characters.';
  if (!LINK_ICONS.includes(input.icon)) return 'Choose an icon.';
  return linkUrlIssue(input.url.trim());
}
function checked(input: LinkInput): LinkInput {
  const issue = linkInputIssue(input);
  if (issue) throw Error(issue);
  return {label: input.label.trim(), url: input.url.trim(), icon: input.icon};
}
export function addLink(settings: DashboardSettings, input: LinkInput, id: string, at: string): DashboardSettings {
  const items = sortedLinks(linksOf(settings));
  if (items.length >= MAX_LINKS) throw Error(`You can keep up to ${MAX_LINKS} links.`);
  const clean = checked(input);
  return save(settings, [...items, {id, ...clean, order: items.length ? Math.max(...items.map(i => i.order)) + 1 : 0, createdAt: at, updatedAt: at}]);
}
export function editLink(settings: DashboardSettings, id: string, input: LinkInput, at: string): DashboardSettings {
  const items = sortedLinks(linksOf(settings)), current = items.find(i => i.id === id);
  if (!current) throw Error('That link is no longer here.');
  const clean = checked(input);
  if (clean.label === current.label && clean.url === current.url && clean.icon === current.icon) return settings;
  return save(settings, items.map(i => i.id === id ? {...i, ...clean, updatedAt: at} : i));
}
export function removeLink(settings: DashboardSettings, id: string): DashboardSettings {
  const items = sortedLinks(linksOf(settings));
  if (!items.some(i => i.id === id)) return settings;
  return save(settings, items.filter(i => i.id !== id));
}
/** One place up or down; the two links that change places carry the new moment. */
export function moveLink(settings: DashboardSettings, id: string, step: -1 | 1, at: string): DashboardSettings {
  const items = sortedLinks(linksOf(settings)), index = items.findIndex(i => i.id === id), other = index + step;
  if (index < 0 || other < 0 || other >= items.length) return settings;
  const a = items[index]!, b = items[other]!;
  return save(settings, items.map(i => i.id === a.id ? {...a, order: b.order, updatedAt: at} : i.id === b.id ? {...b, order: a.order, updatedAt: at} : i));
}

/** The icon an address suggests (the person can change it); unknown sites get the label's first letter. */
const HOSTS: readonly [RegExp, LinkIcon][] = [
  [/(^|\.)instagram\.com$/, 'instagram'], [/(^|\.)tiktok\.com$/, 'tiktok'], [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube'], [/(^|\.)(x\.com|twitter\.com)$/, 'x'],
  [/(^|\.)(facebook\.com|fb\.com)$/, 'facebook'], [/(^|\.)linkedin\.com$/, 'linkedin'], [/(^|\.)reddit\.com$/, 'reddit'], [/(^|\.)(discord\.com|discord\.gg)$/, 'discord'],
  [/(^|\.)twitch\.tv$/, 'twitch'], [/(^|\.)github\.com$/, 'github'], [/(^|\.)spotify\.com$/, 'spotify'], [/(^|\.)(whatsapp\.com|wa\.me)$/, 'whatsapp'],
  [/(^|\.)(t\.me|telegram\.me|telegram\.org)$/, 'telegram'], [/(^|\.)strava\.com$/, 'strava'], [/(^|\.)chess\.com$/, 'chesscom'], [/(^|\.)lichess\.org$/, 'lichess'],
];
export function suggestedIcon(url: string): LinkIcon {
  try { const host = new URL(url.trim()).hostname.toLowerCase(); return HOSTS.find(([pattern]) => pattern.test(host))?.[1] ?? 'monogram'; } catch { return 'monogram'; }
}
/** What a link shows under its name: the site's address without "www." (nothing is fetched to say more). */
export function linkHost(url: string): string { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } }
