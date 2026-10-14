'use client';
import type {LayoutAttrs} from '../layout-edit';
import Link from 'next/link';
import {SectionHeading} from '../ui/section-heading';
import './calculator.css';

/**
 * The calculator's card on Wealth and Today's teaser (Session AA-Cloud Parts 3 and 8): a door to the full page, with
 * its own nebula and a drawn growth curve. It computes nothing itself, so Wealth and Today stay as light as they were.
 */
export function CalculatorCard({compact = false, ...layout}: LayoutAttrs & {compact?: boolean}) {
  return <section className="panel calc-card" aria-labelledby={compact ? 'calc-teaser-title' : 'calc-card-title'} {...layout}>
    <svg className="calc-card-curve" viewBox="0 0 220 110" aria-hidden="true">
      <defs><linearGradient id="calc-card-fill" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor="#58c7e0" stopOpacity=".5" /><stop offset="1" stopColor="#f08bd6" stopOpacity=".7" /></linearGradient></defs>
      <path d="M0 104 C70 100 120 86 160 58 S205 12 220 4 L220 110 L0 110 Z" fill="url(#calc-card-fill)" />
      <path d="M0 104 C70 100 120 86 160 58 S205 12 220 4" fill="none" stroke="#e9f3ff" strokeWidth="2" />
    </svg>
    <SectionHeading id={compact ? 'calc-teaser-title' : 'calc-card-title'} pillar="wealth" eyebrow="A planning tool" title="Compound interest calculator" level={compact ? 3 : 2} />
    <p>How could a starting amount and steady saving grow? Try your own numbers, compare returns and turn a result into a goal. An estimate; returns are not guaranteed.</p>
    <div className="calc-card-actions"><Link className="primary" href="/app/wealth/calculator">Open the calculator</Link></div>
  </section>;
}
