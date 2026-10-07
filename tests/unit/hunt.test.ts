import { HUNT_LIMITS } from '../../src/core/config';
import { parseHuntJson, validateHunt } from '../../src/core/hunt';
import { BUILT_IN_HUNTS } from '../../src/hunts';

const valid = () => ({
  id: 'red-things',
  title: 'Red things',
  summary: 'Find red things.',
  minutes: 5,
  targets: [
    { id: 'door', clue: 'Find a red door.', label: 'a red door', contrast: ['a blue door'] },
  ],
});

describe('validateHunt', () => {
  it('accepts a well-formed hunt and trims text', () => {
    const result = validateHunt({ ...valid(), title: '  Red things  ' });
    expect(result.ok && result.hunt.title).toBe('Red things');
  });

  it('defaults contrast to an empty list', () => {
    const hunt = valid();
    delete (hunt.targets[0] as { contrast?: string[] }).contrast;
    const result = validateHunt(hunt);
    expect(result.ok && result.hunt.targets[0]?.contrast).toEqual([]);
  });

  it.each([
    ['non-object', 'nope', 'JSON object'],
    ['bad id', { ...valid(), id: 'Has Spaces' }, 'id must'],
    ['empty title', { ...valid(), title: ' ' }, 'title'],
    ['fractional minutes', { ...valid(), minutes: 2.5 }, 'minutes'],
    ['no targets', { ...valid(), targets: [] }, 'targets'],
    [
      'too many targets',
      { ...valid(), targets: Array(HUNT_LIMITS.maxTargets + 1).fill(valid().targets[0]) },
      'targets',
    ],
    [
      'long label',
      { ...valid(), targets: [{ ...valid().targets[0], label: 'x'.repeat(200) }] },
      'label',
    ],
    [
      'non-string contrast',
      { ...valid(), targets: [{ ...valid().targets[0], contrast: [3] }] },
      'contrast',
    ],
  ])('rejects %s', (_name, input, message) => {
    const result = validateHunt(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toContain(message);
  });

  it('rejects duplicate target ids', () => {
    const hunt = valid();
    hunt.targets.push({ ...hunt.targets[0]! });
    const result = validateHunt(hunt);
    expect(!result.ok && result.errors).toContain('target ids must be unique');
  });

  it('reports every problem at once', () => {
    const result = validateHunt({ id: '!', title: '', summary: '', minutes: 0, targets: [] });
    expect(!result.ok && result.errors.length).toBeGreaterThanOrEqual(5);
  });
});

describe('parseHuntJson', () => {
  it('rejects malformed JSON without throwing', () => {
    expect(parseHuntJson('{oops')).toEqual({ ok: false, errors: ['File is not valid JSON'] });
  });

  it('rejects oversized files before parsing', () => {
    const big = JSON.stringify({ ...valid(), summary: 'x'.repeat(HUNT_LIMITS.maxFileBytes) });
    const result = parseHuntJson(big);
    expect(!result.ok && result.errors[0]).toMatch(/larger than/);
  });
});

describe('built-in hunts', () => {
  it('are valid, uniquely identified, and non-empty', () => {
    expect(BUILT_IN_HUNTS.length).toBeGreaterThan(0);
    const ids = BUILT_IN_HUNTS.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
