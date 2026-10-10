/**
 * The four voice languages and how a setting becomes one (Session Z-Cloud Part 3, ADR-019), with no import, so ZIGi's
 * launcher can resolve the language for push-to-talk without shipping a schema. English and Dutch only; French and every
 * other language are out of scope for the Alpha.
 */
export const VOICE_LANGUAGES = ['en-GB', 'en-US', 'nl-BE', 'nl-NL'] as const;
export type VoiceLanguage = (typeof VOICE_LANGUAGES)[number];
export const isVoiceLanguage = (value: unknown): value is VoiceLanguage => typeof value === 'string' && (VOICE_LANGUAGES as readonly string[]).includes(value);
/**
 * The device's own language as one of the four: Dutch in Belgium → nl-BE, other Dutch → nl-NL, English in the United States
 * → en-US, anything else (other English, and every language the Alpha does not offer) → en-GB.
 */
export function deviceVoiceLanguage(navigatorLanguage: string | null | undefined): VoiceLanguage {
  const [lang = '', region = ''] = (navigatorLanguage ?? '').trim().split(/[-_]/).map(part => part.toLowerCase());
  if (lang === 'nl') return region === 'be' ? 'nl-BE' : 'nl-NL';
  if (lang === 'en' && region === 'us') return 'en-US';
  return 'en-GB';
}
/** The language to listen and speak in: the person's choice when it is one of the four, else the device default. */
export const resolveVoiceLanguage = (setting: string | null | undefined, navigatorLanguage: string | null | undefined): VoiceLanguage => isVoiceLanguage(setting) ? setting : deviceVoiceLanguage(navigatorLanguage);
