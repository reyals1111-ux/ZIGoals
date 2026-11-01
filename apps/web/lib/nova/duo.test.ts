import {describe, expect, it} from 'vitest';
import {duoLines} from '../../components/nova/chat/nova-duo';
import {DUO_IDLE, duoState, setDuo, subscribeDuo, type DuoState} from './bridge';

/** Session AK WA (N1): the Duo's words on NOVA's dashboard, and the state NOVA's chat writes for it. */
describe('the Duo view', () => {
  const at = (over: Partial<DuoState>): DuoState => ({...DUO_IDLE, active: true, area: 'health', task: 'water this week', ...over});
  it('names each step for NOVA and ZIGi, with the page and what ZIGi read', () => {
    expect(duoLines(at({step: 'handed'}), 'Atlas')).toEqual({nova: 'Handed to ZIGi: Health', zigi: 'Taking the task on Health'});
    expect(duoLines(at({step: 'reading', looked: ['Water', 'Sleep', 'Steps', 'Meals']}), 'Atlas').zigi).toBe('Read Water, Sleep, Steps');
    expect(duoLines(at({step: 'answering'}), 'Atlas')).toEqual({nova: 'Waiting for ZIGi', zigi: 'Answering'});
    expect(duoLines(at({step: 'reported'}), 'Atlas')).toEqual({nova: 'Atlas has ZIGi’s answer', zigi: 'Reported back'});
    expect(duoLines(at({step: 'stopped'}), 'Atlas').nova).toBe('The task stopped');
  });
  it('a task for the person\'s Hermes Agent says Hermes, never ZIGi', () => {
    const lines = duoLines(at({step: 'reading', agent: 'hermes'}), 'NOVA');
    expect(lines).toEqual({nova: 'Waiting for Hermes', zigi: 'Answering on your computer'});
    expect(JSON.stringify(duoLines(at({step: 'reported', agent: 'hermes'}), 'NOVA'))).not.toMatch(/ZIGi’s answer/);
  });
  it('the state is memory only: written, read and announced to the dashboard, then idle again', () => {
    let calls = 0; const off = subscribeDuo(() => { calls++; });
    setDuo(at({step: 'handed'})); expect(duoState().active).toBe(true);
    setDuo(DUO_IDLE); expect(duoState()).toBe(DUO_IDLE);
    off(); setDuo(at({step: 'reading'})); setDuo(DUO_IDLE);
    expect(calls).toBe(2);
  });
});
