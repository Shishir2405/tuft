/** The one place the model is chosen. Changing it means re-running `npm run embed`. */
export const MODEL = {
  id: 'Xenova/siglip-base-patch16-224',
  upstream: 'google/siglip-base-patch16-224',
  license: 'Apache-2.0',
  /** 8-bit quantised ONNX weights, picked to keep the first download near 100 MB. */
  dtype: 'q8',
  /**
   * Read from the upstream checkpoint: exp(logit_scale) and logit_bias. They are applied
   * outside the ONNX graphs because the encoders are split to load the text side lazily.
   */
  calibration: { scale: Math.exp(4.7649970054626465), bias: -12.9324369430542 },
  maxTextTokens: 64,
} as const;
