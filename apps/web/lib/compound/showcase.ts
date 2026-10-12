import {calculatorSchema, type CalculatorRecord} from './store';

/**
 * Showcase (Session AA-Cloud Part 8): two fictional calculator scenarios and the inputs last shown, so the calculator
 * opens with something to compare. Inputs only: every result is worked out again on the page, an estimate as always.
 */
export function showcaseCalculator(day: string): CalculatorRecord {
  const savedAt = (offset: number) => `${new Date(Date.parse(`${day}T12:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10)}T19:00:00.000Z`;
  const home = {start: '15000', contribution: '600', frequency: 'monthly', ratePercent: 5, years: 8, compounding: 'monthly', timing: 'end', increasePercent: 3, inflationPercent: 2.5, currency: 'USD'} as const;
  const retire = {start: '25000', contribution: '450', frequency: 'monthly', ratePercent: 6, years: 30, compounding: 'monthly', timing: 'end', increasePercent: 2, inflationPercent: 2, currency: 'EUR'} as const;
  return calculatorSchema.parse({version: 1, last: home, scenarios: [
    {id: 'showcase-home', name: 'Home deposit, 8 years (Showcase)', input: home, savedAt: savedAt(-3)},
    {id: 'showcase-retire', name: 'Retirement pot, 30 years (Showcase)', input: retire, savedAt: savedAt(-9)},
  ]});
}
