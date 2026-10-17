import type {Metadata} from 'next';
import Link from 'next/link';
import {PageHeader} from '../../../../components/page-header';
import {OrbitArt} from '../../../../components/header-art/orbit-art';
import {CalculatorGlyph} from '../../../../components/header-art/glyphs/calculator';
import {Calculator} from '../../../../components/calculator/calculator';
// Session AA-Cloud Part 3: the compound interest calculator, its own page under Wealth.
export const metadata: Metadata = {title: 'Compound interest calculator'};
export default function Page() {
  return <div className="dashboard calc-page">
    <PageHeader className="page-heading" eyebrow="Wealth · a planning tool" title="Compound interest calculator" lede="See how a starting amount and regular saving could grow over time, from the numbers you choose. Every result is an estimate; returns are not guaranteed." actions={<Link className="secondary" href="/app/wealth">← Wealth</Link>} art={<OrbitArt glyph={CalculatorGlyph} tone="wealth" spin={30}/>} />
    <Calculator />
  </div>;
}
