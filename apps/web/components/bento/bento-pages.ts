/** Session AP (owner decision 14 Nov): the pages that offer the Bento view (no imports, so the layout code stays light). */
export const BENTO_PAGES = ['today', 'goals', 'habits', 'health', 'wealth'] as const;
export type BentoPage = typeof BENTO_PAGES[number];
export const isBentoPage = (page: string): page is BentoPage => (BENTO_PAGES as readonly string[]).includes(page);
