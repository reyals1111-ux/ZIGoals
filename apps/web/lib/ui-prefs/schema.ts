import * as z from 'zod';
import {UI_PREFS_KEY} from '../ab-design-keys';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AB-Design (ADR-024 D4): the one device-only record of the UI upgrade. Loose and versioned: a field this build
 * does not know is kept as it is; bytes that do not parse read as the defaults and are never rewritten by a read. Every
 * field is optional, so an older build's `{version: 1}` is a complete record.
 */
export const uiPrefsSchema = z.looseObject({
  version: z.literal(1),
  /** Today's welcome header and planet folded away (owner request 7). */
  heroCollapsed: z.boolean().optional(),
  /** The music button tucked into the screen's edge (owner request 6). */
  musicFolded: z.boolean().optional(),
  /** The theme (owner request 5): only "dark" exists today; any other stored word reads as dark until that theme ships. */
  themeMode: z.string().max(24).optional(),
  /**
   * Session AD (Part 3, ADR-026 F4): the theme in effect — "nebula" (today's look, the default), "light" or "dark" (both
   * previews). A new field beside `themeMode`, which older builds keep reading as their only look; any other word reads as
   * nebula. Kept in this device's own record (lib/ui-prefs/theme.ts), never synced.
   */
  theme: z.string().max(24).optional(),
  /** The currency Wealth's totals are shown in (owner request 24); other currencies stay separate and never convert. */
  baseCurrency: z.enum(['USD', 'EUR']).optional(),
  /** Notices the person closed (owner request 8): the compact Alpha notice at the top of every page. */
  dismissed: z.looseObject({alphaNotice: z.boolean().optional()}).optional(),
  /**
   * Session AB-Design Phase 2: Today's device-only cards. `lifeOverview: false` hides the Life overview (owner request 28;
   * shown by default); `gameWidgets` lists the progress cards added from the widget picker while Gamify is on (owner edit
   * to request 9), as plain ids so a newer build's kinds never make this record unreadable (unknown ids are skipped).
   */
  today: z.looseObject({lifeOverview: z.boolean().optional(), gameWidgets: z.array(z.string().max(24)).max(8).optional()}).optional(),
});
export type UiPrefs = z.infer<typeof uiPrefsSchema>;
export const emptyUiPrefs = (): UiPrefs => ({version: 1});
export const UI_PREFS: DeviceRecordSpec<UiPrefs> = {key: UI_PREFS_KEY, schema: uiPrefsSchema, empty: emptyUiPrefs};
/** The pre-Session AD theme mode: always today's look ("dark" in AB-Design's words; kept for older readers and tests). */
export const themeModeOf = (prefs: UiPrefs): 'dark' => (prefs.themeMode === 'dark' || prefs.themeMode === undefined ? 'dark' : 'dark');
/** Session AD: the three themes. Nebula is today's look and the default for everyone; Light and Dark are previews. */
export const THEMES = ['nebula', 'light', 'dark'] as const;
export type Theme = typeof THEMES[number];
/** The theme a record asks for; anything unknown (a later build's theme, a typo) reads as nebula. */
export const themeOf = (prefs: Pick<UiPrefs, 'theme'> | null | undefined): Theme => (THEMES as readonly string[]).includes(prefs?.theme ?? '') ? prefs!.theme as Theme : 'nebula';
/** The currency Wealth's totals are shown in: the person's choice, else the device's default (AB-Cloud's defaultCurrency(),
 * passed in by the hook; USD where none is given) — ADR-024 owner edit 5, wired at the second merger (Phase 2 Part 12). */
export const baseCurrencyOf = (prefs: UiPrefs, fallback: 'USD' | 'EUR' = 'USD'): 'USD' | 'EUR' => prefs.baseCurrency ?? fallback;
/** Today's Life overview shows unless the person hid it on this device. */
export const lifeOverviewShown = (prefs: UiPrefs): boolean => prefs.today?.lifeOverview !== false;
/** The game widgets this build knows, in the order the person added them (unknown ids from a newer build are skipped). */
export const GAME_WIDGETS = ['xp', 'quests'] as const;
export type GameWidget = typeof GAME_WIDGETS[number];
export const gameWidgetsOf = (prefs: UiPrefs): GameWidget[] => [...new Set((prefs.today?.gameWidgets ?? []).filter((id): id is GameWidget => (GAME_WIDGETS as readonly string[]).includes(id)))];
