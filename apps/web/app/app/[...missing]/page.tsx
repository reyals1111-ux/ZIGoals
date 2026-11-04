import {notFound, redirect} from 'next/navigation';
import type {Metadata} from 'next';

// The tab names the page (WCAG 2.4.2); the not-found file's own metadata is not applied to a segment's 404.
export const metadata: Metadata = {title: 'Page not found'};

/** Session AL Part 12 (Moscow MO-044): the addresses people try for prices open the placeholder Plans page. */
const PLAN_ADDRESSES = new Set(['pricing', 'prices', 'premium', 'upgrade', 'plan', 'billing']);

/** Session X Part 14 (J254): an address under /app that matches no page gets the app's own "not found" (./not-found.tsx
 *  one level up) inside the app, with its navigation, instead of the framework's bare 404. */
export default async function MissingPage({params}: {params: Promise<{missing: string[]}>}): Promise<never> {
  const {missing} = await params;
  if (missing.length === 1 && PLAN_ADDRESSES.has(missing[0]!.toLowerCase())) redirect('/app/plans');
  notFound();
}
