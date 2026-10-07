import type { Calibration } from '../core/scoring';

export interface LoadProgress {
  /** 0..1, or null while the size of the download is still unknown. */
  fraction: number | null;
  file: string;
}

/**
 * Boundary between the app and whichever open-weight model does the seeing. Anything that
 * maps images and short texts into one shared, L2-normalised vector space can implement it
 * (SigLIP today; CLIP or MobileCLIP variants are drop-in replacements).
 */
export interface InferenceEngine {
  /** Identifies the model; precomputed text embeddings are only valid for the same id. */
  readonly modelId: string;
  readonly calibration: Calibration;
  /** Fetches (first run) or restores (later runs, offline) the image encoder. */
  loadVision(onProgress: (p: LoadProgress) => void): Promise<void>;
  embedImage(image: Blob): Promise<Float32Array>;
  /** Loads the text encoder lazily; only needed for labels without a precomputed embedding. */
  embedTexts(texts: readonly string[]): Promise<Float32Array[]>;
}

export class InferenceError extends Error {
  constructor(
    message: string,
    readonly reason: 'load-failed' | 'bad-image' | 'inference-failed',
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'InferenceError';
  }
}
