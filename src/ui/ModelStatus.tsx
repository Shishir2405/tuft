import { useEngine } from './engineContext';

export function ModelStatus() {
  const { state, load } = useEngine();

  if (state.status === 'ready') {
    return <p className="status ok">Vision model ready. Photos are checked on this device.</p>;
  }
  if (state.status === 'loading') {
    const pct = state.fraction === null ? null : Math.round(state.fraction * 100);
    return (
      <div className="status" role="status">
        <p>Preparing the vision model{pct === null ? '…' : `… ${pct}%`}</p>
        <progress max={100} value={pct ?? undefined} aria-label="Model download progress" />
      </div>
    );
  }
  return (
    <div className="status">
      {state.status === 'error' && <p role="alert">{state.message}</p>}
      <p>One-time download of about 100&nbsp;MB. After that Tuft works without a connection.</p>
      <button type="button" className="secondary" onClick={load}>
        {state.status === 'error' ? 'Try again' : 'Download model'}
      </button>
    </div>
  );
}
