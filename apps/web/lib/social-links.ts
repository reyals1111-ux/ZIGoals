/**
 * Session AB-Design (owner request 2, owner edit 4): the footer's social links. Only real handles ever render; a disabled
 * entry renders nothing at all (no fake links). Both X handles were confirmed by the owner in Phase 2 (2026-10-14).
 */
export type SocialLink = {id: string; label: string; href: string; enabled: boolean};
export const SOCIAL_LINKS: readonly SocialLink[] = [
  {id: 'x-zigoals', label: 'ZIGoals on X', href: 'https://x.com/ZIGoals', enabled: true},
  {id: 'x-zigfluencer', label: 'ZIGFluencer on X', href: 'https://x.com/ZIGFluencer', enabled: true},
];
export const enabledSocialLinks = (): readonly SocialLink[] => SOCIAL_LINKS.filter(link => link.enabled);
