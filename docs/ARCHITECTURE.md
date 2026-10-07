# Architecture

Tuft is a static single-page PWA. All inference runs in the browser.

```
UI (React) ──▶ verifyPhoto ──▶ InferenceEngine ◀── SiglipEngine (Web Worker)
                   │                  ▲                   MockEngine (tests)
                   ▼                  │
              core/scoring     embeddings.json (precomputed label vectors)
```

## Data flow for one photo

1. The player taps **Take photo**; a native file input opens the camera and returns a `File`.
2. `verifyPhoto` builds the prompt list for the target (`core/prompts.ts`): target, its `contrast` labels, then fixed cheat scenes.
3. In parallel: the engine embeds the image; `resolveEmbeddings` returns label vectors from `embeddings.json`, asking the text encoder only for missing prompts.
4. `core/scoring.judge` returns `found`, `close` or `miss` from the softmax share and a sigmoid probability floor.
5. The UI speaks and shows the verdict. The photo and embedding are dropped.

## Boundaries

- `core/` has no imports from `inference/`, `platform/` or `ui/`. It is plain functions over typed data.
- Only `inference/siglip.ts` imports transformers.js. The UI sees `InferenceEngine`.
- Untrusted input (imported files, `localStorage`) passes through `validateHunt` / `restoreProgress`.
- Model work happens in a Web Worker; failures return typed `InferenceError`s with a `reason`.

## Offline

A Workbox service worker precaches the app shell, ONNX runtime (served from our own origin, not a CDN), hunts and embeddings. transformers.js caches model files in Cache Storage. Offline operation is verified by `tests/e2e/real-model.spec.ts`.

## Decisions

- **No backend**: the only server-side need would be photo verification, which is exactly what we want to avoid.
- **WASM default**: WebGPU was not reliably available in test environments; it is opt-in.
- **File input instead of `getUserMedia`**: opens the native camera app, which is simpler, more accessible and works on more browsers.
- **Softmax share plus probability floor**: SigLIP probabilities for everyday photos are tiny and not comparable across labels, so absolute thresholds alone failed on our sample. The floor still matters: without it, several wrong pairs reached a high share.
