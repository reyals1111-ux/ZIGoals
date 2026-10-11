/**
 * "Open <app> side by side" (Session V Part 4): the app's own page in a window beside ZIGoals; the browser may make it a
 * tab. One window name for every ZIGi path, so a second click reuses it; the address carries nothing personal.
 */
export function openSideBySide(url: string) {
  const s = window.screen as Screen & {availLeft?: number; availTop?: number}, width = Math.max(420, Math.round(s.availWidth * 0.42)), height = s.availHeight;
  window.open(url, 'zigoals-ai-app', `noopener,popup,width=${width},height=${height},left=${(s.availLeft ?? 0) + s.availWidth - width},top=${s.availTop ?? 0}`);
}
