import {describe, expect, test} from 'vitest';
import {itemGlyph} from './glyphs';

describe('a planet\'s mark from its own words (L3b)', () => {
  test('the owner\'s items get their own marks', () => {
    const marks = ['Take vitamins and creatine', 'Do 100 push-ups', 'Take all supplements', 'Read 5 pages', 'Play piano 15 minutes', 'Meditate & breathwork 15 minutes']
      .map(label => itemGlyph({glyph: 'habits', label}));
    expect(marks).toEqual(['pill', 'dumbbell', 'pill', 'book', 'note', 'lotus']);
  });
  test('a specific mark from the page stays; unknown words keep the generic one', () => {
    expect(itemGlyph({glyph: 'drop', label: 'Read the water bill'})).toBe('drop');
    expect(itemGlyph({glyph: 'flag', label: 'Move €200 to savings'})).toBe('flag');
    expect(itemGlyph({glyph: 'sparkle', label: 'Call grandma'})).toBe('sparkle');
    expect(itemGlyph({glyph: 'focus', label: 'Deep work'})).toBe('focus');
  });
});

describe('a node\'s glyph on the orbit path (Session AG)', () => {
  test('words first, then the page\'s mark, then the kind\'s; a custom item without telling words is a star', async () => {
    const {orbitGlyph} = await import('./glyphs');
    expect(orbitGlyph({glyph: 'habits', label: 'Walk 8,000 steps'})).toBe('footsteps');
    expect(orbitGlyph({glyph: 'focus', label: 'Deep work block'})).toBe('target');
    expect(orbitGlyph({glyph: 'flag', label: 'Move €200 to savings'})).toBe('savings-jar');
    expect(orbitGlyph({glyph: 'habits', label: 'Read 5 pages'})).toBe('book');
    expect(orbitGlyph({glyph: 'drop', label: 'Water'})).toBe('drop');
    expect(orbitGlyph({glyph: 'sparkle', label: 'Call grandma'})).toBe('star');
    expect(orbitGlyph({glyph: 'habits', label: 'Tidy the desk'})).toBe('orbit');
    expect(orbitGlyph({glyph: 'flag', label: 'Launch the website'})).toBe('target');
    expect(orbitGlyph({glyph: 'focus', label: 'Practise'})).toBe('clock');
  });
  test('every glyph it can give is drawn by the path\'s own glyph table (no icon library)', async () => {
    const {PATH_GLYPH_NAMES} = await import('../../components/path/glyph-paths');
    for (const name of ['star', 'target', 'footsteps', 'coin', 'apple', 'orbit', 'clock', 'heart', 'book', 'lotus', 'moon', 'hourglass', 'dumbbell', 'scale', 'meal', 'pill', 'pen', 'note', 'drop']) expect(PATH_GLYPH_NAMES, name).toContain(name);
  });
});

describe('the orbit path\'s fuller glyph table (Session AG, owner "1b MORE GLYPHS")', () => {
  test('the owner\'s examples get their own marks', async () => {
    const {orbitGlyph} = await import('./glyphs');
    const mark = (label: string, glyph = 'habits') => orbitGlyph({glyph, label});
    expect(mark('Play Piano')).toBe('piano');
    expect(mark('Vitamins & Creatine')).toBe('pill');
    expect(mark('Read ten pages')).toBe('book');
    expect(mark('Morning pages')).toBe('journal');
    expect(mark('10 pages a day')).toBe('pages');
    expect(mark('Drink 4 glasses of water')).toBe('glass');
    expect(mark('Drink 2 L water')).toBe('drop');
    expect(mark('Walk 8,000 steps')).toBe('footsteps');
    expect(mark('Brush teeth')).toBe('tooth');
    expect(mark('Floss')).toBe('tooth');
    expect(mark('Paint', 'sparkle')).toBe('brush');
    expect(mark('Learn Spanish')).toBe('language');
    expect(mark('Save €10', 'flag')).toBe('savings-jar');
    expect(mark('Stake ZIG', 'flag')).toBe('stake');
    expect(mark('Invest €50 in the index fund', 'flag')).toBe('chart');
    expect(mark('Pay the water bill', 'sparkle')).toBe('bill');
    expect(mark('Monthly budget review', 'sparkle')).toBe('budget');
    expect(mark('Contribute €25', 'flag')).toBe('coin');
    expect(mark('Heart rate check')).toBe('heart-rate');
    expect(mark('Cardio 20 minutes')).toBe('heart');
    expect(mark('No coffee after 2pm')).toBe('no-coffee');
    expect(mark('No sugar')).toBe('no-sugar');
    expect(mark('No phone in bed')).toBe('phone-off');
    expect(mark('In bed by 22:30')).toBe('bed');
    expect(mark('Sleep 8 hours')).toBe('moon');
    expect(mark('Cold shower')).toBe('shower');
    expect(mark('Gratitude journal')).toBe('gratitude');
    expect(mark('Journal')).toBe('journal');
    expect(mark('Guitar practice')).toBe('guitar');
    expect(mark('Sing 10 minutes')).toBe('note');
    expect(mark('Coding 1 hour')).toBe('code');
    expect(mark('Chess puzzle')).toBe('chess');
    expect(mark('Yoga flow')).toBe('yoga');
    expect(mark('Stretch 10 minutes')).toBe('stretch');
    expect(mark('Swim 20 laps')).toBe('swim');
    expect(mark('Cycle to work')).toBe('bike');
    expect(mark('Run 5k')).toBe('run');
    expect(mark('Do 100 push-ups')).toBe('dumbbell');
    expect(mark('Weigh in')).toBe('scale');
    expect(mark('Eat a salad')).toBe('salad');
    expect(mark('Eat an apple')).toBe('apple');
    expect(mark('Healthy eating')).toBe('meal');
    expect(mark('16:8 fasting')).toBe('hourglass');
    expect(mark('Morning sunlight')).toBe('sun');
    expect(mark('Meditate & breathwork 15 minutes')).toBe('lotus');
    expect(mark('Wandelen')).toBe('footsteps');
    expect(mark('Lezen')).toBe('book');
    expect(mark('Sporten')).toBe('dumbbell');
    expect(mark('Slapen')).toBe('moon');
  });
  test('word edges keep a word from catching its neighbours', async () => {
    const {orbitGlyph} = await import('./glyphs');
    const mark = (label: string) => orbitGlyph({glyph: 'sparkle', label});
    expect(mark('Breakfast')).not.toBe('hourglass');
    expect(mark('Breakfast')).toBe('meal');
    expect(mark('Brunch with friends')).not.toBe('run');
    expect(mark('Start the day early')).not.toBe('brush');
    expect(mark('Party planning')).not.toBe('brush');
    expect(mark('Fix the embedded build')).not.toBe('bed');
    expect(mark('Sunday reset')).not.toBe('sun');
    expect(mark('Update the stepper')).not.toBe('footsteps');
    expect(mark('Get ready early')).not.toBe('book');
    expect(mark('Recycle the boxes')).not.toBe('bike');
    expect(mark('No drinking')).not.toBe('drop');
  });
  test('a Health input, then a goal\'s kind, when its words tell nothing', async () => {
    const {orbitGlyph} = await import('./glyphs');
    expect(orbitGlyph({glyph: 'drop', label: 'Log it', kind: 'health', input: 'water'})).toBe('drop');
    expect(orbitGlyph({glyph: 'moon', label: 'Lights out', kind: 'health', input: 'sleep'})).toBe('moon');
    expect(orbitGlyph({glyph: 'lotus', label: 'Sit', kind: 'health', input: 'meditation'})).toBe('lotus');
    expect(orbitGlyph({glyph: 'hourglass', label: 'Hold', kind: 'health', input: 'fast'})).toBe('hourglass');
    expect(orbitGlyph({glyph: 'scale', label: 'Morning log', kind: 'health', input: 'weight'})).toBe('scale');
    expect(orbitGlyph({glyph: 'leaf', label: 'Oatmeal', kind: 'health', input: 'diary'})).toBe('meal');
    expect(orbitGlyph({glyph: 'meal', label: 'Log a snack', kind: 'health', input: 'meal'})).toBe('meal');
    expect(orbitGlyph({glyph: 'flag', label: 'Launch the website', kind: 'goal'})).toBe('target');
    expect(orbitGlyph({glyph: 'flag', label: 'Ship v2', kind: 'goal-step'})).toBe('target');
    expect(orbitGlyph({glyph: 'sparkle', label: 'Call grandma', kind: 'custom'})).toBe('star');
    expect(orbitGlyph({glyph: 'sparkle', label: 'Xyzzy', kind: 'custom'})).toBe('star');
    expect(orbitGlyph({glyph: 'not-a-glyph', label: 'Xyzzy', kind: 'custom'})).toBe('star');
  });
  test('every mark it gives, for a long list of everyday items, is drawn by the path\'s glyph table', async () => {
    const {orbitGlyph} = await import('./glyphs');
    const {GLYPHS} = await import('../../components/path/glyph-paths');
    const labels = ['Drink water', 'Drink 8 glasses', 'Hydrate', 'Read 20 minutes', 'Read a book', 'Study for the exam', 'Walk the dog', 'Hike on Saturday', 'Go for a jog', 'Run 10k', 'Bike to work',
      'Swim', 'Gym', 'Workout', 'Lift weights', 'Exercise 30 min', 'Plank 2 minutes', 'Yoga', 'Mobility routine', 'Meditate', 'Breathwork', 'Mindful minute', 'Sleep by 11', 'Bedtime routine', 'Nap',
      'Intermittent fasting', 'Deep work', 'Pomodoro x4', 'Focus block', 'Take meds', 'Take vitamin D', 'Magnesium', 'Omega 3', 'Fruit', 'Veggies with every meal', 'Greens smoothie', 'No caffeine',
      'Sugar-free day', 'No sweets', 'Weigh myself', 'Track weight', 'Heart health check', 'HRV reading', 'Pulse', 'Floss teeth', 'Dentist', 'Cold shower', 'Ice bath', 'Sunscreen', 'Go outside',
      'Screen time under 2h', 'No social media', 'Diary', 'Write 500 words', 'Grateful for 3 things', 'Thankful list', 'Duolingo', 'French lesson', 'Learn 10 words', 'Piano scales', 'Ukulele',
      'Violin', 'Drum practice', 'Music theory', 'Sketch daily', 'Draw', 'Watercolour', 'Art class', 'LeetCode', 'Programming', 'Chess.com', 'Savings', 'Emergency fund', 'Portfolio review',
      'Check the chart', 'No-spend day', 'Wallet', 'Staking rewards', 'ZIG', 'Pay rent', 'Invoice clients', 'Budget', 'Money', 'DCA $50', 'Earn €5', 'Tidy the desk', 'Call mum', 'Practise',
      'Launch the website', 'Clean the kitchen', 'Water the plants', 'Breakfast', 'Lunch', 'Dinner', 'Cook at home', 'Protein shake', 'Stretch', 'Fietsen', 'Zwemmen', 'Hardlopen', 'Mediteren', 'Sparen', ''];
    for (const label of labels) for (const glyph of ['habits', 'sparkle', 'focus', 'flag', 'heart', 'drop', 'leaf', 'pill']) {
      const g = orbitGlyph({glyph, label});
      expect(Object.hasOwn(GLYPHS, g), `${label} (${glyph}) → ${g}`).toBe(true);
    }
  });
  test('every new glyph is plain path data that stays on the 24-unit grid', async () => {
    const {GLYPHS, PATH_GLYPH_NAMES} = await import('../../components/path/glyph-paths');
    expect(PATH_GLYPH_NAMES).toEqual(Object.keys(GLYPHS));
    const NEW = ['glass', 'pages', 'bike', 'swim', 'yoga', 'stretch', 'bed', 'pill-bottle', 'salad', 'no-coffee', 'no-sugar', 'heart-rate', 'tooth', 'shower', 'phone-off', 'journal', 'gratitude',
      'language', 'piano', 'guitar', 'brush', 'code', 'chess', 'savings-jar', 'chart', 'wallet', 'stake', 'bill', 'budget'];
    const ARGS: Record<string, number> = {M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0};
    for (const name of NEW) {
      const d = GLYPHS[name];
      expect(d, name).toBeTypeOf('string');
      expect(d, name).toMatch(/^[MLHVCSQTAZmlhvcsqtaz0-9.\s,-]+$/);
      expect(d!.trim()[0], name).toMatch(/[Mm]/);
      const tokens = d!.match(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)/g) ?? [];
      let x = 0, y = 0, sx = 0, sy = 0, cmd = '', i = 0;
      const num = () => { const t = tokens[i++]; expect(t !== undefined && /^-?[\d.]/.test(t), `${name}: number expected`).toBe(true); return Number(t); };
      const inGrid = (px: number, py: number) => {
        expect(px, `${name} x`).toBeGreaterThanOrEqual(0); expect(px, `${name} x`).toBeLessThanOrEqual(24);
        expect(py, `${name} y`).toBeGreaterThanOrEqual(0); expect(py, `${name} y`).toBeLessThanOrEqual(24);
      };
      while (i < tokens.length) {
        if (/[A-Za-z]/.test(tokens[i]!)) cmd = tokens[i++]!;
        const up = cmd.toUpperCase(), rel = cmd !== up;
        expect(up in ARGS, `${name}: command ${cmd}`).toBe(true);
        if (up === 'Z') { x = sx; y = sy; continue; }
        const a = Array.from({length: ARGS[up]!}, num);
        const ox = rel ? x : 0, oy = rel ? y : 0;
        if (up === 'H') x = ox + a[0]!;
        else if (up === 'V') y = oy + a[0]!;
        else {
          // a curve's control points stay on the grid too (an arc's radii and flags are not points)
          for (let k = up === 'A' ? 5 : 0; k + 1 < a.length; k += 2) inGrid(ox + a[k]!, oy + a[k + 1]!);
          x = ox + a[a.length - 2]!; y = oy + a[a.length - 1]!;
        }
        inGrid(x, y);
        if (up === 'M') { sx = x; sy = y; cmd = rel ? 'l' : 'L'; }
      }
    }
  });
  test('every glyph, old and new, uses only plain path commands', async () => {
    const {GLYPHS} = await import('../../components/path/glyph-paths');
    for (const [name, d] of Object.entries(GLYPHS)) expect(d, name).toMatch(/^[Mm][MLHVCSQTAZmlhvcsqtaz0-9.\s,-]*$/);
  });
});
