import {notFound} from 'next/navigation';
import type {Metadata} from 'next';

// The tab names the page (WCAG 2.4.2); the not-found file's own metadata is not applied to a segment's 404.
export const metadata: Metadata = {title: 'Page not found'};

/** Session X Part 14 (J254): an address under /app that matches no page gets the app's own "not found" (./not-found.tsx
 *  one level up) inside the app, with its navigation, instead of the framework's bare 404. */
export default function MissingPage(): never {
  notFound();
}
