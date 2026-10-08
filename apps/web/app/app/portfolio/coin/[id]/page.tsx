import {PortfolioCoinView} from '../../../../../components/portfolio/portfolio-coin-view';
import type {Metadata} from 'next';
// Session X Part 12 (WCAG 2.4.2): each page has its own title, "<page> · ZIGoals Alpha" (app/layout.tsx).
export const metadata: Metadata = {title: 'Coin'};
// Session W Part 15: a coin's page in Portfolio (its market, your position and transactions); `?portfolio=` picks one.
export default async function Page({params, searchParams}: {params: Promise<{id: string}>; searchParams: Promise<{portfolio?: string | string[]}>}) {
  const {id} = await params, {portfolio} = await searchParams;
  return <PortfolioCoinView id={decodeURIComponent(id)} portfolioId={typeof portfolio === 'string' ? portfolio : undefined} />;
}
