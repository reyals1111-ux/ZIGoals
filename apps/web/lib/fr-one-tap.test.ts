import {afterEach, describe, expect, test} from 'vitest';
import {createOneTap, SAME_TAP_NOTE} from '../components/health/one-tap';
import {hideToast, showUndo, shownToasts} from '../components/ui/undo-toast';

// FR-S-11: a second tap within 350 ms still counts once, and the counted tap's toast says so (its Undo kept).
afterEach(() => { while (shownToasts().length) hideToast(); });
const undo = () => undefined;
describe('the same tap again', () => {
  test('after the toast shows: the toast gains the note once and keeps its Undo', () => {
    const one = createOneTap();
    expect(one.tap(1000)).toBe(true);
    one.shown(showUndo({message: 'Water logged: 250 mL.', restore: undo}));
    expect(one.tap(1250)).toBe(false);
    expect(one.tap(1300)).toBe(false);
    const [t] = shownToasts();
    expect(t!.message).toBe(`Water logged: 250 mL. ${SAME_TAP_NOTE}`);
    expect(t!.undo).toBe(undo);
    // A tap 350 ms after the counted one counts again, with a fresh toast of its own.
    expect(one.tap(1350)).toBe(true);
    one.shown(showUndo({message: 'Water logged: 250 mL.', restore: undo}));
    expect(shownToasts()[0]!.message).toBe('Water logged: 250 mL.');
  });
  test('before the toast shows: the note joins it as it shows', () => {
    const one = createOneTap();
    expect(one.tap(0)).toBe(true);
    expect(one.tap(200)).toBe(false);
    one.shown(showUndo({message: 'Fictional tea logged: 250 mL.', restore: undo}));
    expect(shownToasts()[0]!.message).toBe(`Fictional tea logged: 250 mL. ${SAME_TAP_NOTE}`);
  });
  test('an older toast is never changed by a later tap', () => {
    const one = createOneTap();
    showUndo({message: 'Day saved.', restore: undo});
    expect(one.tap(5000)).toBe(true);
    expect(one.tap(5100)).toBe(false);
    expect(shownToasts()[0]!.message).toBe('Day saved.');
  });
});
