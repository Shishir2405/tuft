import { CLOSE_SHARE, FOUND_MIN_PROBABILITY, FOUND_SHARE } from './config';
import type { Judgement } from './types';

export interface Calibration {
  scale: number;
  bias: number;
}

export function normalize(v: Float32Array): Float32Array {
  let sum = 0;
  for (const x of v) sum += x * x;
  const norm = Math.sqrt(sum);
  if (norm === 0) throw new Error('Cannot normalise a zero vector');
  return v.map((x) => x / norm);
}

export function cosine(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(`Embedding size mismatch: ${a.length} vs ${b.length}`);
  }
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += (a[i] ?? 0) * (b[i] ?? 0);
  return dot;
}

/**
 * `prompts[0]` is the target; the rest are competitors.
 *
 * SigLIP's per-pair probabilities are tiny for everyday photos (a clear photo of a dog scores
 * well under 0.1), so they are only a floor against "nothing here matches". The decision
 * itself uses the target's share of the softmax over all prompts: how much better the target
 * describes the photo than every look-alike and every known cheat scene.
 */
export function judge(
  image: Float32Array,
  prompts: readonly string[],
  textEmbeddings: readonly Float32Array[],
  calibration: Calibration,
): Judgement {
  if (prompts.length === 0 || prompts.length !== textEmbeddings.length) {
    throw new Error('Prompts and embeddings must be the same non-zero length');
  }
  const logits = textEmbeddings.map((t) => calibration.scale * cosine(image, t));
  const top = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - top));
  const total = exps.reduce((a, b) => a + b, 0);
  const share = (exps[0] ?? 0) / total;
  const best = logits.indexOf(top);
  const probability = 1 / (1 + Math.exp(-((logits[0] ?? 0) + calibration.bias)));

  const targetWins = best === 0;
  const verdict =
    targetWins && share >= FOUND_SHARE && probability >= FOUND_MIN_PROBABILITY
      ? 'found'
      : targetWins && share >= CLOSE_SHARE
        ? 'close'
        : 'miss';
  return { verdict, share, probability, bestLabel: prompts[best] ?? prompts[0]! };
}
