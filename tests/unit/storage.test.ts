import {
  loadCustomHunts,
  loadProgressRaw,
  saveCustomHunts,
  saveProgress,
} from '../../src/platform/storage';

beforeEach(() => localStorage.clear());

describe('storage', () => {
  it('survives corrupt JSON', () => {
    localStorage.setItem('tuft:progress:h', '{broken');
    expect(loadProgressRaw('h')).toBeNull();
    localStorage.setItem('tuft:custom-hunts', '{broken');
    expect(loadCustomHunts()).toEqual([]);
  });

  it('drops stored custom hunts that no longer validate', () => {
    localStorage.setItem('tuft:custom-hunts', JSON.stringify([{ id: 'BAD' }]));
    expect(loadCustomHunts()).toEqual([]);
  });

  it('round-trips valid data', () => {
    const hunt = {
      id: 'x',
      title: 'X',
      summary: 's',
      minutes: 1,
      targets: [{ id: 'a', clue: 'c', label: 'l', contrast: [] }],
    };
    saveCustomHunts([hunt]);
    expect(loadCustomHunts()).toEqual([hunt]);
    saveProgress('x', { a: 1 });
    expect(loadProgressRaw('x')).toEqual({ a: 1 });
  });

  it('does not throw when storage is unavailable', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    expect(() => saveProgress('x', {})).not.toThrow();
    spy.mockRestore();
  });
});
