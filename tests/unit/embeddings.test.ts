import { readFileSync } from 'node:fs';
import { promptsForTarget } from '../../src/core/prompts';
import {
  decodeVector,
  encodeVector,
  resolveEmbeddings,
  type EmbeddingBundle,
} from '../../src/inference/embeddings';
import { MODEL } from '../../src/inference/model';
import { MockEngine } from '../../src/inference/mock';
import { BUILT_IN_HUNTS } from '../../src/hunts';

describe('vector encoding', () => {
  it('round-trips float32 values exactly', () => {
    const v = Float32Array.from([0.25, -1.5, 3.14159, 1e-7]);
    expect(Array.from(decodeVector(encodeVector(v)))).toEqual(Array.from(v));
  });
});

describe('resolveEmbeddings', () => {
  const stored = Float32Array.from([1, 0]);
  const bundle = (model: string): EmbeddingBundle => ({
    model,
    dim: 2,
    entries: { known: encodeVector(stored) },
  });

  it('uses stored vectors and only asks the engine for the rest', async () => {
    const engine = new MockEngine();
    const out = await resolveEmbeddings(['known', 'custom'], bundle(engine.modelId), engine);
    expect(Array.from(out[0]!)).toEqual([1, 0]);
    expect(out[1]).toHaveLength(64);
    expect(engine.textCalls).toBe(1);
  });

  it('skips the text encoder entirely when everything is precomputed', async () => {
    const engine = new MockEngine();
    await resolveEmbeddings(['known'], bundle(engine.modelId), engine);
    expect(engine.textCalls).toBe(0);
  });

  it('ignores a bundle built for a different model', async () => {
    const engine = new MockEngine();
    const out = await resolveEmbeddings(['known'], bundle('another/model'), engine);
    expect(out[0]).toHaveLength(64);
    expect(engine.textCalls).toBe(1);
  });

  it('works without any bundle', async () => {
    const engine = new MockEngine();
    expect(await resolveEmbeddings(['x', 'y'], null, engine)).toHaveLength(2);
  });
});

describe('shipped embeddings.json', () => {
  it('covers every prompt of every built-in hunt (run `npm run embed` if this fails)', () => {
    const shipped = JSON.parse(readFileSync('public/embeddings.json', 'utf8')) as EmbeddingBundle;
    expect(shipped.model).toBe(MODEL.id);
    const needed = BUILT_IN_HUNTS.flatMap((h) => h.targets.flatMap(promptsForTarget));
    expect(needed.filter((p) => !(p in shipped.entries))).toEqual([]);
    for (const b64 of Object.values(shipped.entries))
      expect(decodeVector(b64)).toHaveLength(shipped.dim);
  });
});
