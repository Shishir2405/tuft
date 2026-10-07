import { cosine, judge, normalize } from '../../src/core/scoring';

const calibration = { scale: 10, bias: -5 };
const unit = (...v: number[]) => normalize(Float32Array.from(v));

describe('normalize / cosine', () => {
  it('produces unit vectors', () => {
    expect(cosine(unit(3, 4), unit(3, 4))).toBeCloseTo(1);
  });
  it('refuses a zero vector instead of returning NaN', () => {
    expect(() => normalize(new Float32Array(3))).toThrow(/zero vector/);
  });
  it('refuses mismatched dimensions, which means two different models were mixed', () => {
    expect(() => cosine(unit(1, 0), unit(1, 0, 0))).toThrow(/mismatch/);
  });
});

describe('judge', () => {
  const prompts = ['target', 'lookalike', 'cheat scene'];
  const texts = [unit(1, 0, 0), unit(0, 1, 0), unit(0, 0, 1)];

  it('finds the target when it clearly beats every competitor', () => {
    const j = judge(unit(1, 0.1, 0), prompts, texts, calibration);
    expect(j.verdict).toBe('found');
    expect(j.bestLabel).toBe('target');
  });

  it('misses and names the winner when a look-alike is closer', () => {
    const j = judge(unit(0.2, 1, 0), prompts, texts, calibration);
    expect(j.verdict).toBe('miss');
    expect(j.bestLabel).toBe('lookalike');
  });

  it('asks the player to retry when the target barely wins', () => {
    // Three nearly tied candidates: the target is top-1 but holds well under half the share.
    const j = judge(unit(1, 0.98, 0.9), prompts, texts, calibration);
    expect(j.bestLabel).toBe('target');
    expect(j.verdict).toBe('close');
  });

  it('rejects a high share when the absolute probability is negligible', () => {
    // Everything is orthogonal-ish: the target "wins" only because nothing matches.
    const j = judge(unit(1, 0, 0), prompts, texts, { scale: 10, bias: -30 });
    expect(j.share).toBeGreaterThan(0.5);
    expect(j.verdict).not.toBe('found');
  });

  it('validates its inputs', () => {
    expect(() => judge(unit(1, 0, 0), [], [], calibration)).toThrow();
    expect(() => judge(unit(1, 0, 0), prompts, texts.slice(1), calibration)).toThrow();
  });
});
