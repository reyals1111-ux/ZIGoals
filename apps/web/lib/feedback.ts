/**
 * "Send feedback" (Session X Part 11; owner decision L1: feedback goes to contact@zigoals.app). The email is written in
 * the person's own mail app: ZIGoals sends nothing. Device details are added only when the person ticks the box, are
 * shown in full and can be edited or deleted before the email opens. They are coarse on purpose: the browser and system
 * by name and major version, the window size, the motion settings, whether ZIGoals runs installed, and the time zone.
 * No account, device or wallet id, no record and no address.
 */
import {currentInstallContext} from './install/platform';

export const FEEDBACK_ADDRESS = 'contact@zigoals.app', SECURITY_ADDRESS = 'hello@zigoals.app';
/** The build the person runs, as Settings shows it; "unknown" when the build did not record it. */
export const APP_VERSION_LABEL = [process.env.NEXT_PUBLIC_APP_VERSION, process.env.NEXT_PUBLIC_APP_COMMIT?.slice(0, 7)].filter(v => v && v !== 'Unknown').join(' · ') || 'unknown';
/** The longest details block the email carries (a mail link has no fixed limit, but some mail apps cut long ones). */
export const DETAILS_MAX = 600;

export type FeedbackEnvironment = {
  userAgent: string;
  /** navigator.userAgentData.brands where the browser offers it (Chromium browsers). */
  brands?: readonly {brand: string; version: string}[];
  platform?: string;
  width: number;
  height: number;
  pixelRatio: number;
  reducedMotion: boolean;
  motionOff: boolean;
  installed: boolean;
  timeZone?: string;
};

const major = (v: string | undefined) => v?.match(/^\d+/)?.[0];
/** The browser's name and major version, from its own brand list first, else its user agent; "unknown" when neither says. */
export function browserName(userAgent: string, brands?: FeedbackEnvironment['brands']): string {
  const named = brands?.filter(b => !/not.?a.?brand/i.test(b.brand)) ?? [];
  const brand = named.find(b => !/^chromium$/i.test(b.brand)) ?? named[0];
  if (brand && major(brand.version)) return `${brand.brand.replace(/^Google /, '')} ${major(brand.version)}`;
  const rules: [RegExp, string][] = [[/Edg(?:A|iOS)?\/(\d+)/, 'Edge'], [/OPR\/(\d+)/, 'Opera'], [/SamsungBrowser\/(\d+)/, 'Samsung Internet'], [/(?:Firefox|FxiOS)\/(\d+)/, 'Firefox'], [/CriOS\/(\d+)/, 'Chrome'], [/Chrome\/(\d+)/, 'Chrome'], [/Version\/(\d+)[^ ]* (?:Mobile\/\S+ )?Safari\//, 'Safari']];
  for (const [rule, name] of rules) { const m = rule.exec(userAgent); if (m) return `${name} ${m[1]}`; }
  return 'unknown';
}
/** The system family only (never its build), or "unknown". */
export function systemName(userAgent: string, platform?: string): string {
  const text = `${platform ?? ''} ${userAgent}`;
  if (/iPhone|iPad|iPod/.test(text)) return 'iOS or iPadOS';
  if (/Android/i.test(text)) return 'Android';
  if (/CrOS|Chrome OS/i.test(text)) return 'ChromeOS';
  if (/Mac/i.test(text)) return 'macOS';
  if (/Win/i.test(text)) return 'Windows';
  if (/Linux/i.test(text)) return 'Linux';
  return 'unknown';
}
/** The block the person sees, edits and may add to the email. */
export function deviceDetails(env: FeedbackEnvironment): string {
  return [
    `Browser: ${browserName(env.userAgent, env.brands)}`,
    `System: ${systemName(env.userAgent, env.platform)}`,
    `Window: ${Math.round(env.width)} × ${Math.round(env.height)} px, pixel ratio ${Math.round(env.pixelRatio * 100) / 100}`,
    `Motion: ${env.motionOff ? 'Off in ZIGoals' : 'follows the device'}; the device asks for reduced motion: ${env.reducedMotion ? 'yes' : 'no'}`,
    `Installed app: ${env.installed ? 'yes' : 'no, in a browser tab'}`,
    `Time zone: ${env.timeZone || 'unknown'}`,
  ].join('\n');
}
/** This browser's environment, read once when the person asks for the details. Reads only, never writes. */
export function readFeedbackEnvironment(motionOff: boolean): FeedbackEnvironment {
  const nav = window.navigator as Navigator & {userAgentData?: {brands?: {brand: string; version: string}[]; platform?: string}};
  let reducedMotion = false, timeZone: string | undefined;
  try { reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { /* no media queries */ }
  try { timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* no Intl time zones */ }
  return {userAgent: nav.userAgent, brands: nav.userAgentData?.brands, platform: nav.userAgentData?.platform, width: window.innerWidth, height: window.innerHeight, pixelRatio: window.devicePixelRatio || 1, reducedMotion, motionOff, installed: currentInstallContext() === 'installed', timeZone};
}
/** The mail link: a short template, the build, and the person's own details block when they chose to add it. */
export function feedbackHref(version: string, details: string | null): string {
  const device = details?.trim() ? details.trim().slice(0, DETAILS_MAX) : '';
  const body = `What happened:\n\nWhat you expected:\n\nDevice and browser:\n${device ? `${device}\n` : ''}\nApp version: ${version}\n\n(Please leave out codes, your recovery secret, and personal money or health details.)`;
  return `mailto:${FEEDBACK_ADDRESS}?subject=${encodeURIComponent('ZIGoals Alpha feedback')}&body=${encodeURIComponent(body)}`;
}
