# Model card (as used by Tuft)

|              |                                                                                                      |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| Model        | SigLIP base, patch 16, 224 px (`google/siglip-base-patch16-224`)                                     |
| Weights used | ONNX export `Xenova/siglip-base-patch16-224`, 8-bit quantised (`q8`)                                 |
| License      | Apache-2.0 (upstream model and ONNX export)                                                          |
| Runtime      | transformers.js with ONNX Runtime Web (WASM) in a Web Worker                                         |
| Download     | vision encoder about 100 MB (first run only, then cached)                                            |
| Text encoder | about 112 MB, downloaded **only** when a custom hunt contains labels not in `public/embeddings.json` |

## Why SigLIP

Zero-shot image-text matching means a hunt target is just a sentence, so anyone can write new hunts with no training. SigLIP was chosen over CLIP-style softmax models because each image/text pair gets an independent score, which gives a usable "nothing here matches" signal (see the probability floor in `src/core/scoring.ts`). It is Apache-2.0 and has a maintained browser runtime.

## Split encoders

The image and text towers run as separate ONNX graphs. Label embeddings for built-in hunts are computed at build time by `npm run embed`, so a normal player downloads only the vision tower. The scale and bias that SigLIP applies after the towers are read from the upstream checkpoint and live in `src/inference/model.ts`.

## Input and output

- Input: one photo (any size). Resized to 224x224 and normalised by the model's processor; the photo is never stored.
- Output: a 768-dimension L2-normalised embedding, compared with the embeddings of `"a photo of <label>"` for the target, its `contrast` labels, and a fixed list of cheat scenes (screen, room, person, hand, blur, wall, street).
- Decision (`src/core/scoring.ts`): the target must be the best match, hold at least half of the softmax share, and have a sigmoid probability above a small floor. Between a quarter and a half it asks the player to retry.

## Replacing the model

Implement `InferenceEngine` and change `src/inference/model.ts`, then run `npm run embed` and `npm run eval`. Embeddings are tagged with the model id, so a mismatched bundle is ignored rather than mixed.

## Limits

- It recognises scenes and objects, not species. "A bird" works; "a European robin" is unreliable.
- Thresholds were tuned on a very small sample (see README). Expect false rejections in poor light and with partial views.
- It can be fooled by a printed photo of the target. Tuft is a game, not an attendance system.
- Quantisation to 8 bits was not compared against full precision.
