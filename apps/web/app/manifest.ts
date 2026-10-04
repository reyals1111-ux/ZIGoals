import type {MetadataRoute} from 'next';

/**
 * The installed ZIGoals app (Session L): Next serves this at /manifest.webmanifest and links it from every page. It
 * only describes the Home Screen or desktop app: name, icons, colours, start page and standalone display. No service
 * worker and no offline caching come with it; storage and data handling are unchanged. The icons are the origami Z on
 * the deep-navy app background (--cosmic-dark), generated from public/brand/figures/zigoals-z-2x.webp. Safari asks for
 * an opaque full-bleed maskable icon at 1024 px (Safari 17.2 release notes); the iPhone Home Screen uses
 * /apple-touch-icon.png from the root layout.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/app',
    name: 'ZIGoals',
    short_name: 'ZIGoals',
    description: 'Plan, fund and track goals in a clearly labelled local demo or ZIGChain Testnet. Independent, unaudited alpha.',
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    background_color: '#020918',
    theme_color: '#020918',
    icons: [
      {src: '/icons/zigoals-192.png', sizes: '192x192', type: 'image/png', purpose: 'any'},
      {src: '/icons/zigoals-512.png', sizes: '512x512', type: 'image/png', purpose: 'any'},
      {src: '/icons/zigoals-maskable-1024.png', sizes: '1024x1024', type: 'image/png', purpose: 'maskable'},
    ],
  };
}
