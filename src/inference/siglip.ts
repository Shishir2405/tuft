import {
  AutoProcessor,
  AutoTokenizer,
  RawImage,
  SiglipTextModel,
  SiglipVisionModel,
  type PreTrainedModel,
  type PreTrainedTokenizer,
  type Processor,
} from '@huggingface/transformers';
import { normalize } from '../core/scoring';
import { InferenceError, type InferenceEngine, type LoadProgress } from './engine';
import { MODEL } from './model';

type Device = 'webgpu' | 'wasm' | 'cpu';

/** Runs the model with transformers.js. Used by the web worker and by the Node scripts. */
export class SiglipEngine implements InferenceEngine {
  readonly modelId = MODEL.id;
  readonly calibration = MODEL.calibration;

  private vision?: { model: PreTrainedModel; processor: Processor };
  private text?: { model: PreTrainedModel; tokenizer: PreTrainedTokenizer };

  constructor(private readonly device: Device) {}

  async loadVision(onProgress: (p: LoadProgress) => void): Promise<void> {
    if (this.vision) return;
    try {
      const progress_callback = (e: { status: string; file?: string; progress?: number }) => {
        if (e.status === 'progress' && e.file) {
          onProgress({ file: e.file, fraction: (e.progress ?? 0) / 100 });
        }
      };
      const [model, processor] = await Promise.all([
        SiglipVisionModel.from_pretrained(MODEL.id, {
          dtype: MODEL.dtype,
          device: this.device,
          progress_callback,
        }),
        AutoProcessor.from_pretrained(MODEL.id),
      ]);
      this.vision = { model, processor };
    } catch (cause) {
      throw new InferenceError('Could not load the vision model', 'load-failed', { cause });
    }
  }

  async embedImage(image: Blob): Promise<Float32Array> {
    if (!this.vision) throw new InferenceError('Vision model is not loaded', 'load-failed');
    let raw: RawImage;
    try {
      raw = await RawImage.fromBlob(image);
    } catch (cause) {
      throw new InferenceError('The photo could not be decoded', 'bad-image', { cause });
    }
    try {
      const inputs = await this.vision.processor(raw);
      const out = await this.vision.model(inputs);
      return normalize(Float32Array.from(out.pooler_output.data as Float32Array));
    } catch (cause) {
      throw new InferenceError('Image inference failed', 'inference-failed', { cause });
    }
  }

  async embedTexts(texts: readonly string[]): Promise<Float32Array[]> {
    try {
      if (!this.text) {
        const [model, tokenizer] = await Promise.all([
          SiglipTextModel.from_pretrained(MODEL.id, { dtype: MODEL.dtype, device: this.device }),
          AutoTokenizer.from_pretrained(MODEL.id),
        ]);
        this.text = { model, tokenizer };
      }
      // SigLIP was trained on text padded to a fixed length; shorter padding changes scores.
      const inputs = this.text.tokenizer([...texts], {
        padding: 'max_length',
        truncation: true,
        max_length: MODEL.maxTextTokens,
      });
      const out = await this.text.model(inputs);
      const data = out.pooler_output.data as Float32Array;
      const dim = data.length / texts.length;
      return texts.map((_, i) => normalize(data.slice(i * dim, (i + 1) * dim)));
    } catch (cause) {
      throw new InferenceError('Text inference failed', 'inference-failed', { cause });
    }
  }
}
