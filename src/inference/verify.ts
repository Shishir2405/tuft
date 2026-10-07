import { judge } from '../core/scoring';
import { promptsForTarget } from '../core/prompts';
import type { HuntTarget, Judgement } from '../core/types';
import type { InferenceEngine } from './engine';
import { resolveEmbeddings, type EmbeddingBundle } from './embeddings';

export interface Verification extends Judgement {
  /** Wall-clock time spent on the photo, for the on-screen "checked on this device" line. */
  ms: number;
}

export async function verifyPhoto(
  engine: InferenceEngine,
  bundle: EmbeddingBundle | null,
  target: HuntTarget,
  photo: Blob,
): Promise<Verification> {
  const started = performance.now();
  const prompts = promptsForTarget(target);
  const [image, texts] = await Promise.all([
    engine.embedImage(photo),
    resolveEmbeddings(prompts, bundle, engine),
  ]);
  const judgement = judge(image, prompts, texts, engine.calibration);
  return { ...judgement, ms: Math.round(performance.now() - started) };
}
