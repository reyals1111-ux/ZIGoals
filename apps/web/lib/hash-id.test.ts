import {describe, expect, it} from 'vitest';
import {hashId} from './hash-id';

describe('hashId', () => {
  it('names the element a fragment points at, decoded', () => {
    expect(hashId('#settings-help')).toBe('settings-help');
    expect(hashId('#project-%C3%A9t%C3%A9')).toBe('project-été');
  });
  it('is null for no fragment and for a fragment that is not valid percent-encoding, instead of throwing', () => {
    expect(hashId('')).toBeNull();
    expect(hashId('#')).toBeNull();
    expect(hashId('#%')).toBeNull();
    expect(hashId('#%E0%A4%A')).toBeNull();
  });
});
