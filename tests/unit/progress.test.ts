import {
  currentIndex,
  record,
  restoreProgress,
  startProgress,
  summarize,
} from '../../src/core/progress';
import type { Hunt } from '../../src/core/types';

const hunt: Hunt = {
  id: 'h',
  title: 'H',
  summary: 's',
  minutes: 5,
  targets: ['a', 'b', 'c'].map((id) => ({ id, clue: id, label: id, contrast: [] })),
};

describe('progress', () => {
  it('walks targets in order and finishes after the last one', () => {
    let p = startProgress(hunt, 0);
    expect(currentIndex(hunt, p)).toBe(0);
    p = record(hunt, p, 'found', 1_000);
    p = record(hunt, p, 'skipped', 2_000);
    expect(p.finishedAt).toBeNull();
    p = record(hunt, p, 'found', 180_000);
    expect(currentIndex(hunt, p)).toBe(3);
    expect(p.finishedAt).toBe(180_000);
    expect(summarize(hunt, p)).toEqual({ found: 2, skipped: 1, total: 3, minutes: 3 });
  });

  it('ignores records once the hunt is complete', () => {
    let p = startProgress(hunt, 0);
    for (let i = 0; i < 3; i++) p = record(hunt, p, 'found', 1);
    expect(record(hunt, p, 'skipped', 2)).toBe(p);
  });

  it('does not mutate the previous state', () => {
    const p = startProgress(hunt, 0);
    record(hunt, p, 'found', 1);
    expect(p.outcomes).toEqual({});
  });
});

describe('restoreProgress', () => {
  it('restores valid state and drops unknown targets or outcomes', () => {
    const restored = restoreProgress(hunt, {
      huntId: 'h',
      startedAt: 5,
      finishedAt: null,
      outcomes: { a: 'found', ghost: 'found', b: 'cheated' },
    });
    expect(restored?.outcomes).toEqual({ a: 'found' });
  });

  it.each([null, 'x', { huntId: 'other', startedAt: 1, outcomes: {} }, { huntId: 'h' }])(
    'rejects corrupt or foreign state %#',
    (raw) => {
      expect(restoreProgress(hunt, raw)).toBeNull();
    },
  );
});
