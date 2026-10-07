import { GLOBAL_DISTRACTORS } from '../../src/core/config';
import { promptsForTarget, toPrompt } from '../../src/core/prompts';

describe('promptsForTarget', () => {
  it('puts the target first, then contrasts, then the global cheat scenes', () => {
    const prompts = promptsForTarget({ id: 'a', clue: 'c', label: 'a dog', contrast: ['a cat'] });
    expect(prompts[0]).toBe('a photo of a dog');
    expect(prompts[1]).toBe('a photo of a cat');
    expect(prompts).toHaveLength(2 + GLOBAL_DISTRACTORS.length);
  });

  it('never lists the target twice, even if a contrast repeats it', () => {
    const prompts = promptsForTarget({
      id: 'a',
      clue: 'c',
      label: 'a dog',
      contrast: ['a dog', 'a dog'],
    });
    expect(prompts.filter((p) => p === toPrompt('a dog'))).toHaveLength(1);
  });
});
