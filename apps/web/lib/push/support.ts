/**
 * Feature detection for push reminders (ADR-010), nothing more: no permission is asked and nothing is registered here.
 * On an iPhone or iPad, Web Push exists only in a web app saved to the Home Screen (Safari 16.4 release notes), so a
 * browser tab there reads "needs-install".
 */
export type PushSupport = 'unsupported' | 'needs-install' | 'available';
type Probe = {navigator?: {userAgent?: string; standalone?: boolean; serviceWorker?: unknown; maxTouchPoints?: number; platform?: string}; PushManager?: unknown; Notification?: unknown; matchMedia?: (query: string) => {matches: boolean}};
export function pushSupport(w: Probe | undefined = typeof window === 'undefined' ? undefined : (window as unknown as Probe)): PushSupport {
  if (!w?.navigator) return 'unsupported';
  const agent = w.navigator.userAgent ?? '';
  const apple = /iPhone|iPad|iPod/.test(agent) || (w.navigator.platform === 'MacIntel' && (w.navigator.maxTouchPoints ?? 0) > 1);
  const standalone = w.navigator.standalone === true || (typeof w.matchMedia === 'function' && w.matchMedia('(display-mode: standalone)').matches);
  if (apple && !standalone) return 'needs-install';
  return 'serviceWorker' in w.navigator && !!w.navigator.serviceWorker && !!w.PushManager && !!w.Notification ? 'available' : 'unsupported';
}
/** The device's IANA zone, or UTC when the runtime does not say. */
export function deviceZone(): string {
  try { const zone = Intl.DateTimeFormat().resolvedOptions().timeZone; return zone && /^[A-Za-z0-9_+\-/]+$/.test(zone) ? zone : 'UTC'; } catch { return 'UTC'; }
}
