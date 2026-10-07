import { useId, useState } from 'react';
import { parseHuntJson } from '../core/hunt';
import type { Hunt } from '../core/types';
import { ModelStatus } from './ModelStatus';

interface Props {
  hunts: Hunt[];
  onStart: (hunt: Hunt) => void;
  onImport: (hunt: Hunt) => void;
}

export function Home({ hunts, onStart, onImport }: Props) {
  const [errors, setErrors] = useState<string[]>([]);
  const fileId = useId();

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    const result = parseHuntJson(await file.text());
    if (result.ok) {
      setErrors([]);
      onImport(result.hunt);
    } else {
      setErrors(result.errors);
    }
  };

  return (
    <main className="page">
      <header>
        <h1>Tuft</h1>
        <p className="lede">
          Pick a hunt, put your phone in your pocket, and listen for the clues. Your camera only
          comes out to prove you found something.
        </p>
      </header>

      <ModelStatus />

      <section aria-labelledby="hunts-heading">
        <h2 id="hunts-heading">Hunts</h2>
        <ul className="hunt-list">
          {hunts.map((h) => (
            <li key={h.id}>
              <button type="button" className="hunt" onClick={() => onStart(h)}>
                <span className="hunt-title">{h.title}</span>
                <span className="hunt-meta">
                  {h.targets.length} finds · about {h.minutes} min
                </span>
                <span>{h.summary}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="import-heading">
        <h2 id="import-heading">Make your own</h2>
        <p>
          Hunts are small JSON files and the model understands any description, so you can ask for
          “a red door” or “something with moss on it”. See the README for the format.
        </p>
        <label htmlFor={fileId} className="secondary file-button">
          Import a hunt file
        </label>
        <input
          id={fileId}
          className="visually-hidden"
          type="file"
          accept="application/json,.json"
          onChange={(e) => {
            void importFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {errors.length > 0 && (
          <ul className="errors" role="alert">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
      </section>

      <footer>
        <p>Photos are processed in memory on this device and are never uploaded or saved.</p>
      </footer>
    </main>
  );
}
