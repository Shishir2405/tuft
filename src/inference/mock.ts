import { normalize } from '../core/scoring';
import type { InferenceEngine } from './engine';
import { InferenceError } from './engine';
import { toPrompt } from '../core/prompts';

const DIM = 64;

function hashVector(text: string): Float32Array {
  const v = new Float32Array(DIM);
  let seed = 2166136261;
  for (let i = 0; i < text.length; i++) seed = Math.imul(seed ^ text.charCodeAt(i), 16777619);
  for (let i = 0; i < DIM; i++) {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822507) + i;
    v[i] = ((seed >>> 0) % 2000) / 1000 - 1;
  }
  return normalize(v);
}

/**
 * Deterministic stand-in for the model, used by tests and the end-to-end build only.
 * A fixture "photo" is a blob whose text is the scene it depicts ("moss"); its embedding is
 * the embedding of that scene's prompt, so the scoring path is exercised end to end.
 */
export class MockEngine implements InferenceEngine {
  readonly modelId = 'mock/hash-embedding';
  readonly calibration = { scale: 10, bias: -5 };
  loadCalls = 0;
  textCalls = 0;

  async loadVision(onProgress: (p: { fraction: number | null; file: string }) => void) {
    this.loadCalls++;
    onProgress({ fraction: 1, file: 'mock' });
  }

  async embedImage(image: Blob): Promise<Float32Array> {
    const scene = (await image.text()).trim();
    if (!scene.startsWith('scene:')) {
      throw new InferenceError('The photo could not be decoded', 'bad-image');
    }
    return hashVector(toPrompt(scene.slice('scene:'.length)));
  }

  async embedTexts(texts: readonly string[]): Promise<Float32Array[]> {
    this.textCalls++;
    return texts.map(hashVector);
  }
}
