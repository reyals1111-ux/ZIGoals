import {describe, expect, it, vi} from 'vitest';
import {completionHaptic, COMPLETION_PULSE_MS, hapticAllowed} from './haptics';

describe('the completion haptic', () => {
  const ok = {level: 'full' as const, hapticsOn: true, coarse: true};
  it('vibrates once, briefly, where the device can, the switch is on and motion is not Off', () => {
    const vibrate = vi.fn(() => true);
    expect(completionHaptic({...ok, vibrate})).toBe(true);
    expect(vibrate).toHaveBeenCalledWith(COMPLETION_PULSE_MS);
    expect(COMPLETION_PULSE_MS).toBeLessThanOrEqual(15);
    expect(hapticAllowed({...ok, level: 'calm', vibrate})).toBe(true);
  });
  it('stays still under Motion Off or reduced motion (level off), the switch off, no motor or no touch screen', () => {
    const vibrate = vi.fn(() => true);
    for (const s of [{...ok, level: 'off' as const}, {...ok, hapticsOn: false}, {...ok, coarse: false}]) expect(completionHaptic({...s, vibrate})).toBe(false);
    expect(completionHaptic({...ok, vibrate: null})).toBe(false);
    expect(vibrate).not.toHaveBeenCalled();
  });
  it('never throws', () => {
    expect(completionHaptic({...ok, vibrate: () => { throw new Error('blocked'); }})).toBe(false);
    expect(completionHaptic({...ok, vibrate: () => false})).toBe(false);
  });
});
