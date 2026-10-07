import { InferenceError } from '../../src/inference/engine';
import { MockEngine } from '../../src/inference/mock';
import { verifyPhoto } from '../../src/inference/verify';

const target = {
  id: 'moss',
  clue: 'Find moss.',
  label: 'moss on a tree',
  contrast: ['green paint'],
};
const photo = (scene: string) => new Blob([`scene:${scene}`]);

describe('verifyPhoto', () => {
  it('accepts a photo of the target', async () => {
    const r = await verifyPhoto(new MockEngine(), null, target, photo('moss on a tree'));
    expect(r.verdict).toBe('found');
  });

  it('rejects a look-alike the hunt author listed', async () => {
    const r = await verifyPhoto(new MockEngine(), null, target, photo('green paint'));
    expect(r.verdict).toBe('miss');
    expect(r.bestLabel).toBe('a photo of green paint');
  });

  it('rejects the built-in cheat scenes such as a photo of a screen', async () => {
    const r = await verifyPhoto(new MockEngine(), null, target, photo('a computer screen'));
    expect(r.verdict).toBe('miss');
  });

  it('surfaces undecodable photos as a typed error', async () => {
    await expect(
      verifyPhoto(new MockEngine(), null, target, new Blob(['garbage'])),
    ).rejects.toMatchObject({
      name: 'InferenceError',
      reason: 'bad-image',
    });
    await expect(
      verifyPhoto(new MockEngine(), null, target, new Blob(['x'])),
    ).rejects.toBeInstanceOf(InferenceError);
  });

  it('propagates engine failures instead of guessing a verdict', async () => {
    const engine = new MockEngine();
    engine.embedImage = () => Promise.reject(new InferenceError('boom', 'inference-failed'));
    await expect(verifyPhoto(engine, null, target, photo('x'))).rejects.toThrow('boom');
  });
});
