import { useState } from 'react';
import type { Hunt } from '../core/types';
import { BUILT_IN_HUNTS } from '../hunts';
import { loadCustomHunts, saveCustomHunts } from '../platform/storage';
import { HuntScreen } from './HuntScreen';
import { Home } from './Home';

export function App() {
  const [active, setActive] = useState<Hunt | null>(null);
  const [custom, setCustom] = useState<Hunt[]>(loadCustomHunts);

  const addCustom = (hunt: Hunt) => {
    const next = [...custom.filter((h) => h.id !== hunt.id), hunt];
    setCustom(next);
    saveCustomHunts(next);
  };

  return active ? (
    <HuntScreen key={active.id} hunt={active} onExit={() => setActive(null)} />
  ) : (
    <Home hunts={[...BUILT_IN_HUNTS, ...custom]} onStart={setActive} onImport={addCustom} />
  );
}
