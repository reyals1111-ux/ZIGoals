/**
 * Session AB-Design: the four pillars' fold marks as small inline glyphs (lotus, butterfly, heart, bull), drawn with one
 * nebula stroke so they sit in text, chips and the footer's constellation line at any size without an image request.
 */
import {useId} from 'react';
type Props = {size?: number; className?: string};
/** A gradient id unique to this instance: the glyph appears many times on a page (header, chips, search, footer) and ids must not repeat. */
const useGradientId = (name: string) => `${name}-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
const stroke = (id: string) => <defs><linearGradient id={id} x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="var(--brand-cyan, #23eaff)"/><stop offset=".55" stopColor="var(--brand-violet, #9273ff)"/><stop offset="1" stopColor="var(--brand-magenta, #f06dff)"/></linearGradient></defs>;
const common = {fill: 'none', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round'} as const;
export function LotusGlyph({size = 24, className}: Props) {
  const gid = useGradientId('pg-lotus');
  return <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true" focusable="false">{stroke(gid)}
    <g stroke={`url(#${gid})`} {...common}><path d="M12 4.5c2.2 2.3 3 4.8 3 7.3S13.6 16.8 12 18c-1.6-1.2-3-3.7-3-6.2s.8-5 3-7.3z"/><path d="M6.2 8.3c2.6.9 4.3 2.9 5 5.4M17.8 8.3c-2.6.9-4.3 2.9-5 5.4"/><path d="M3.2 13.2c1.6 3.7 4.8 5.9 8.8 5.9s7.2-2.2 8.8-5.9c-2.2.4-4 1.4-5.4 2.6M3.2 13.2c2.2.4 4 1.4 5.4 2.6"/></g></svg>;
}
export function ButterflyGlyph({size = 24, className}: Props) {
  const gid = useGradientId('pg-butterfly');
  return <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true" focusable="false">{stroke(gid)}
    <g stroke={`url(#${gid})`} {...common}><path d="M12 7.5v11"/><path d="M12 9.2C10.4 5.9 7.3 4.3 4.6 5.6c-2.5 1.2-2 5.1.6 6.9-2.3 1-2.8 4.2-.6 5.5 2.4 1.4 5.6-.3 7.4-3.4"/><path d="M12 9.2c1.6-3.3 4.7-4.9 7.4-3.6 2.5 1.2 2 5.1-.6 6.9 2.3 1 2.8 4.2.6 5.5-2.4 1.4-5.6-.3-7.4-3.4"/><path d="M10.4 5.2 12 7.5l1.6-2.3"/></g></svg>;
}
export function HeartGlyph({size = 24, className}: Props) {
  const gid = useGradientId('pg-heart');
  return <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true" focusable="false">{stroke(gid)}
    <g stroke={`url(#${gid})`} {...common}><path d="M12 20.2 4.9 13.3C2.9 11.4 2.9 8.3 4.9 6.4c1.9-1.9 5-1.9 6.9 0l.2.2.2-.2c1.9-1.9 5-1.9 6.9 0 2 1.9 2 5 0 6.9z"/><path d="M8.3 9.1 10 12.4l2-4.2 1.8 3.6 1.2-2"/></g></svg>;
}
export function BullGlyph({size = 24, className}: Props) {
  const gid = useGradientId('pg-bull');
  return <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true" focusable="false">{stroke(gid)}
    <g stroke={`url(#${gid})`} {...common}><path d="M8.2 9.3c-1.6-.5-3.3-1.7-4.1-3.6 2.2.1 3.8 1.1 4.9 2.6M15.8 9.3c1.6-.5 3.3-1.7 4.1-3.6-2.2.1-3.8 1.1-4.9 2.6"/><path d="M8.2 9.3c.8-1.4 2.2-2.2 3.8-2.2s3 .8 3.8 2.2c.8 1.5.9 3.3.3 5.1-.7 2.1-2.3 3.6-4.1 3.9-1.8-.3-3.4-1.8-4.1-3.9-.6-1.8-.5-3.6.3-5.1z"/><path d="M10.1 12.1h.1M13.8 12.1h.1"/><path d="M10.3 15.4c.5.5 1.1.8 1.7.8s1.2-.3 1.7-.8"/></g></svg>;
}
