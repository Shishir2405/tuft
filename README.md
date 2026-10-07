# Tuft

**A scavenger hunt that talks to you, checks your photos on your phone, and works with no signal.**

You pick a hunt, pocket the phone, and listen. Each clue is spoken ("Find a tree. Put your hand on the bark…"). When you find the thing, you take one photo; an open-weight vision model running **on the device** decides whether it really is that thing. No account, no server, no photo ever uploaded.

The screen is the shortest part of the walk: a clue is a sentence you hear, a photo is a few seconds, and the rest is outdoors.

> Built for the Hacktober Open-Source AI Challenge, Week 1: "Touch Grass".

## Why it exists

"Go outside" is easy advice and hard to follow. A scavenger hunt gives a walk a purpose, but the usual app versions either trust you (no fun, nothing checked) or send every photo to a cloud service (photos of your street, your kids, your dog). Tuft verifies finds **locally**, so the game can be honest without being invasive.

## How the AI works

- **Model:** SigLIP base (`google/siglip-base-patch16-224`), 8-bit ONNX export, **Apache-2.0**. Details in [docs/MODEL.md](docs/MODEL.md).
- **Runtime:** transformers.js + ONNX Runtime Web (WASM) in a Web Worker.
- **Zero-shot:** a hunt target is a sentence ("a mushroom"). The photo is embedded and compared with the target and with look-alikes and "cheat" scenes (a screen, a room, a hand). A find requires the target to be the best description _and_ to hold most of the probability mass.
- **Lazy text encoder:** label embeddings for built-in hunts are precomputed (`public/embeddings.json`), so a player only downloads the ~100 MB vision tower. The ~112 MB text tower is fetched only if you import a hunt with new labels.

### Why open weights matter here (and only what we've shown)

| Claim                         | Evidence in this repo                                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Photos never leave the device | The only network requests are the app files and the one-time model download. The end-to-end test records that no CDN is hit for the runtime. No upload code exists. |
| Works offline                 | `npm run test:e2e:real` downloads the model, goes offline, reloads, and verifies a real photo. It passed on the author's machine (headless Chromium).               |
| Open vocabulary               | Players can import a hunt with any labels. A closed classifier with a fixed label set can't do that; a hosted vision API could, but would receive every photo.      |
| Swappable model               | Everything goes through the `InferenceEngine` interface; the model id is tagged on precomputed embeddings.                                                          |
| No per-use cost               | There is no server to pay for.                                                                                                                                      |

Not claimed: fine-tuning, fairness audits, or that it beats hosted models in accuracy. It almost certainly doesn't.

## Measured behaviour

From `npm run eval` on 19 Wikipedia lead images (15 positives for the built-in targets, 4 unrelated), run on an Apple M1 with onnxruntime-node (CPU):

- 13 of 15 true photos counted as a find; the other 2 returned "close, try again".
- 0 of 175 wrong photo/target pairs counted as a find.
- Image embedding median 143 to 240 ms across two runs, excluding model load.
- In headless Chromium with the WASM backend the first verification took about 3.1 s (`test:e2e:real`, one run).

These are small, encyclopedic images, and the thresholds were tuned on the same set, so **real phone photos will do worse**. Treat it as a smoke test, not a benchmark. No phone or outdoor field test has been done yet.

## Run it

```bash
npm ci
npm run dev          # http://localhost:5173
```

Open it on a phone on the same network (the camera input works over HTTPS or localhost; use the deployed build or a tunnel for a phone). The first visit downloads the model; after that it works offline as an installed PWA.

| Command                 | What it does                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| `npm run validate`      | typecheck, lint, format check, unit tests, build                                             |
| `npm test`              | unit and component tests (deterministic mock engine)                                         |
| `npm run test:e2e`      | browser tests against the mock engine (what CI runs)                                         |
| `npm run test:e2e:real` | real model, goes offline (needs network once, run `npm run eval` first for the sample photo) |
| `npm run eval`          | real-model smoke evaluation on sample photos                                                 |
| `npm run embed`         | rebuild `public/embeddings.json` after editing hunts                                         |

CI never loads the real model, so it stays fast and deterministic. The mock engine (`src/inference/mock.ts`) is compiled in only with `--mode e2e`.

## Make a hunt

```json
{
  "id": "red-things",
  "title": "Red things",
  "summary": "Ten minutes, one colour.",
  "minutes": 10,
  "targets": [
    {
      "id": "door",
      "clue": "Find a red door and photograph it.",
      "label": "a red door",
      "contrast": ["a blue door"]
    }
  ]
}
```

Import the file from the home screen. Limits and validation: [src/core/hunt.ts](src/core/hunt.ts).

## Architecture

```
src/core/       pure logic: hunt validation, prompts, scoring, progress (no DOM, no model)
src/inference/  InferenceEngine interface, SigLIP engine, worker proxy, mock, embeddings
src/platform/   speech, haptics, wake lock, localStorage
src/ui/         React screens
src/hunts/      hunt packs (JSON)
scripts/        embed and eval, run with the real model in Node
```

More in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). There is deliberately no backend.

## Deploy

`npm run build` produces a static site in `dist/`. `.github/workflows/pages.yml` publishes it to GitHub Pages. Any static host works; set `TUFT_BASE` if serving from a sub-path. Model files come from huggingface.co unless `VITE_MODEL_HOST` points to a mirror.

## Privacy

Photos are decoded in memory, embedded, and discarded. Only hunt progress and imported hunts are stored, in `localStorage`. No analytics, no cookies.

## Limitations

- Recognises scenes and things, not species.
- A printed picture of the target will pass. It's a game.
- Spoken clues use the browser's speech synthesis; quality varies by device. Voice input is not implemented.
- Not yet tested on real phones outdoors or on WebGPU (opt-in via `VITE_USE_WEBGPU=1`).
- Offline behaviour was tested in Chromium only. Safari and Firefox are untested.
- First load is large (about 100 MB model plus a 27 MB runtime).

## Troubleshooting

- **"The vision model could not be loaded"**: you were offline during the first download, or huggingface.co is blocked. Reconnect and press Try again, or set `VITE_MODEL_HOST`.
- **Camera button does nothing on a phone**: browsers only offer the camera on HTTPS or localhost.
- **A good photo says "close"**: fill the frame with the subject and avoid backlight.
- **Unit test about `embeddings.json` fails**: run `npm run embed`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Hunt packs are the easiest way in.

## License

Apache-2.0 for the code. The model is Apache-2.0 (Google). Sample images used by `npm run eval` come from Wikipedia under their own licenses and are downloaded, not redistributed.
