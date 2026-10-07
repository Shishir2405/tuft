import type { InferenceEngine } from './engine';

/** Text embeddings computed ahead of time so most hunts never need the text encoder. */
export interface EmbeddingBundle {
  model: string;
  dim: number;
  /** prompt -> base64 of little-endian float32 values */
  entries: Record<string, string>;
}

export function encodeVector(v: Float32Array): string {
  const bytes = new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function decodeVector(b64: string): Float32Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Float32Array(bytes.buffer);
}

/**
 * Returns an embedding for every prompt, in order. Prompts missing from the bundle (custom
 * hunts) are computed on-device; a bundle built for another model is ignored entirely.
 */
export async function resolveEmbeddings(
  prompts: readonly string[],
  bundle: EmbeddingBundle | null,
  engine: InferenceEngine,
): Promise<Float32Array[]> {
  const usable = bundle && bundle.model === engine.modelId ? bundle.entries : {};
  const missing = prompts.filter((p) => !(p in usable));
  const computed = new Map<string, Float32Array>();
  if (missing.length > 0) {
    const vectors = await engine.embedTexts(missing);
    missing.forEach((p, i) => computed.set(p, vectors[i]!));
  }
  return prompts.map((p) => {
    const stored = usable[p];
    return stored !== undefined ? decodeVector(stored) : computed.get(p)!;
  });
}
