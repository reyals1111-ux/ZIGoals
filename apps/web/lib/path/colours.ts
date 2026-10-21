/**
 * The path engine's palette (Session AF, ADR-028; owner request P7.4). Seven colours, each one of the app's own pillar or
 * brand tokens, so a dot keeps the colour of the page it comes from: Habits cyan, Goals purple, Health pink, Wealth gold,
 * water blue. Pure data, no React and no DOM, shared by the Checklist and the Earn lane's Start-here path and Academy.
 *
 * `token` is what the renderer paints with (a CSS custom property with the Nebula value as its fallback); `hex` is the same
 * Nebula value for SVG gradient stops, tests and the shortcut art. Tokens are accent tokens, which the Light and Dark theme
 * sheets leave exactly as they are, so a dot reads the same colour in every theme (P7.18).
 */
export const PATH_COLOUR_IDS = ['teal', 'blue', 'magenta', 'purple', 'gold', 'pink', 'cyan'] as const;
export type PathColour = (typeof PATH_COLOUR_IDS)[number];
export type PathColourSpec = {label: string; token: string; hex: string};
export const PATH_COLOURS: Readonly<Record<PathColour, PathColourSpec>> = {
  teal: {label: 'Teal', token: 'var(--ring-emerald, #26e8bd)', hex: '#26e8bd'},
  blue: {label: 'Blue', token: 'var(--brand-blue, #459dff)', hex: '#459dff'},
  magenta: {label: 'Magenta', token: 'var(--brand-magenta, #f06dff)', hex: '#f06dff'},
  purple: {label: 'Purple', token: 'var(--pillar-goals, #9273ff)', hex: '#9273ff'},
  gold: {label: 'Gold', token: 'var(--pillar-wealth, #ffd27a)', hex: '#ffd27a'},
  pink: {label: 'Pink', token: 'var(--pillar-health, #ff74be)', hex: '#ff74be'},
  cyan: {label: 'Cyan', token: 'var(--pillar-habits, #23eaff)', hex: '#23eaff'},
};
export const isPathColour = (value: unknown): value is PathColour => typeof value === 'string' && (PATH_COLOUR_IDS as readonly string[]).includes(value);
/** A stored colour id read back: an id this build does not know (a newer build's, or a typo) falls back, never throws. */
export const pathColour = (value: unknown, fallback: PathColour = 'cyan'): PathColour => isPathColour(value) ? value : fallback;

/** Each page's own colour, so a starred item keeps it on the path (P7.4). */
export const PAGE_PATH_COLOUR = {habits: 'cyan', goals: 'purple', health: 'pink', water: 'blue', wealth: 'gold', earn: 'gold', custom: 'gold'} as const satisfies Record<string, PathColour>;

/**
 * The neon flow line, the footer banner's main line (components/footer/footer-path.tsx): violet → cyan → pink → magenta
 * along the path, so the Checklist's lines read as the same family as the footer's.
 */
export const PATH_NEON_STOPS: readonly {offset: number; hex: string}[] = [{offset: 0, hex: '#9273ff'}, {offset: 0.45, hex: '#23eaff'}, {offset: 0.8, hex: '#ff74be'}, {offset: 1, hex: '#f06dff'}];
