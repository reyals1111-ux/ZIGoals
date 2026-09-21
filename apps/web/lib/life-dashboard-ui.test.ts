import { expect, test } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NutritionDashboard } from '../components/health/nutrition-dashboard';
import { HabitConsistency } from '../components/habits/habit-consistency';
import { buildShowcase } from './showcase-data';
import { HEALTH_STORAGE_KEY, healthSchema } from './health';
import { HABITS_KEY, habitDataSchema } from './habits';

const fixture = buildShowcase('2026-09-21');
test('nutrition dashboard renders every meal and an exact accessible 30-day table', () => {
  const data = healthSchema.parse(JSON.parse(fixture.records[HEALTH_STORAGE_KEY]!));
  const html = renderToStaticMarkup(createElement(NutritionDashboard, { data, date: fixture.day }));
  expect(html).toContain('Breakfast');
  expect(html).toContain('Lunch');
  expect(html).toContain('Dinner');
  expect(html).toContain('Snacks');
  expect(html).toContain('View nutrition history table');
  expect(html).toContain('1970');
  expect(html.match(/scope="row"/g)).toHaveLength(30);
  expect(html).toContain('Blank dates have no diary entries');
  expect(html).not.toMatch(/sync complete|wearable connected|recommended intake/i);
});
test('habit dashboard distinguishes recorded check-ins from target success and supplies exact dates', () => {
  const data = habitDataSchema.parse(JSON.parse(fixture.records[HABITS_KEY]!));
  const html = renderToStaticMarkup(createElement(HabitConsistency, { habits: data.habits, today: fixture.day }));
  expect(html).toContain('Your last 30 days.');
  expect(html).toContain('recorded check-ins');
  expect(html).toContain('partial progress');
  expect(html).toContain('2026-08-23');
  expect(html).toContain('2026-09-21');
  expect(html.match(/scope="row"/g)).toHaveLength(30);
});
