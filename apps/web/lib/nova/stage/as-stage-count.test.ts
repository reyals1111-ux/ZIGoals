import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {StageHud} from '../../../components/nova/stage/command-centre';

// Session AS (Part 4; AR's own list: "STAGE 10 WIDGETS counts the band's widgets too"): the stage's read-out counts what
// stands on the stage; what rests on the band below it ("More on your orbit") is said apart.
const read = (widgets: number, band?: number) => renderToStaticMarkup(createElement(StageHud, {widgets, band, motion: 'full', layout: 'orbit', showcase: true})).match(/<span class="cc-read" data-at="tl"><b>Stage<\/b>([^<]*)<\/span>/)?.[1];
describe('the stage\'s own count', () => {
  it('counts the stage and names the band apart', () => {
    expect(read(7, 3)).toBe('7 widgets, 3 below');
    expect(read(1, 1)).toBe('1 widget, 1 below');
    expect(read(6)).toBe('6 widgets');
    expect(read(6, 0)).toBe('6 widgets');
    expect(read(0, 0)).toBe('Calm');
    expect(read(0, 2)).toBe('2 below');
  });
  it('the grid reports both numbers and the dashboard hands them to the read-out', () => {
    const here = join(process.cwd(), 'apps/web/components/nova'), grid = readFileSync(join(here, 'widget-grid.tsx'), 'utf8'), dash = readFileSync(join(here, 'nova-dashboard.tsx'), 'utf8');
    expect(grid).toContain('onPlaced?.(onStage, inBand)');
    expect(grid).toMatch(/const inBand = \[\.\.\.standing\.current\.side\.values\(\)\]\.filter\(side => side === 'band'\)\.length - \(composing \? composed\.filter\(c => c\.side === 'base'\)\.length : 0\), onStage = shown\.length - inBand;/);
    expect(dash).toContain('<StageHud widgets={placedCount ? placedCount.stage : stage.shown.length} band={placedCount?.band ?? 0}');
    expect(dash).toContain('onPlaced={onPlaced}');
  });
});
