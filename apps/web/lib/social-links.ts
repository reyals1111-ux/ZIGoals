/**
 * Session AB-Design (owner request 2, owner edit 4): the footer's social links. Only real handles ever render; each entry
 * stays `enabled: false` until the owner confirms the handle, and a disabled entry renders nothing at all (no fake links).
 */
export type SocialLink = {id: string; label: string; href: string; enabled: boolean};
export const SOCIAL_LINKS: readonly SocialLink[] = [
  {id: 'x-zigoals', label: 'ZIGoals on X', href: 'https://x.com/ZIGoals', enabled: false},
  {id: 'x-zigfluencer', label: 'ZIGFluencer on X', href: 'https://x.com/ZIGFluencer', enabled: false},
];
export const enabledSocialLinks = (): readonly SocialLink[] => SOCIAL_LINKS.filter(link => link.enabled);
