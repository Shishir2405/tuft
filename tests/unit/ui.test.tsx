import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../src/ui/App';
import { MockEngine } from '../../src/inference/mock';
import { EngineProvider } from '../../src/ui/engineContext';

const renderApp = (engine = new MockEngine()) =>
  render(
    <EngineProvider engine={engine}>
      <App />
    </EngineProvider>,
  );

const photo = (scene: string) => new File([`scene:${scene}`], 'photo.jpg', { type: 'image/jpeg' });
const uploadPhoto = (scene: string) =>
  userEvent.upload(screen.getByLabelText('Take photo'), photo(scene));

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
});
afterEach(() => vi.unstubAllGlobals());

async function startNeighbourhood() {
  await userEvent.click(screen.getByRole('button', { name: /Neighbourhood Basics/ }));
  await waitFor(() => expect(screen.getByLabelText('Take photo')).not.toBeDisabled());
}

describe('Home', () => {
  it('lists the built-in hunts and shows a model download control', () => {
    renderApp();
    expect(screen.getByRole('button', { name: /Autumn Walk/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download model' })).toBeInTheDocument();
  });

  it('imports a valid hunt file and lists it', async () => {
    renderApp();
    const hunt = {
      id: 'red',
      title: 'Red things',
      summary: 'Find red things.',
      minutes: 5,
      targets: [{ id: 'door', clue: 'A red door.', label: 'a red door' }],
    };
    await userEvent.upload(
      screen.getByLabelText('Import a hunt file'),
      new File([JSON.stringify(hunt)], 'red.json', { type: 'application/json' }),
    );
    expect(await screen.findByRole('button', { name: /Red things/ })).toBeInTheDocument();
  });

  it('explains what is wrong with an invalid hunt file', async () => {
    renderApp();
    await userEvent.upload(
      screen.getByLabelText('Import a hunt file'),
      new File(['{"id": "BAD"}'], 'bad.json', { type: 'application/json' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(/id must be/);
  });
});

describe('hunt flow', () => {
  it('blocks the camera until the model is ready, then loads it automatically', async () => {
    const engine = new MockEngine();
    renderApp(engine);
    await startNeighbourhood();
    expect(engine.loadCalls).toBe(1);
  });

  it('tells the player to retry on a miss and stays on the same clue', async () => {
    renderApp();
    await startNeighbourhood();
    await uploadPhoto('a computer screen');
    expect(await screen.findByText(/does not look like it yet/)).toBeInTheDocument();
    expect(screen.getByText('Find 1 of 5')).toBeInTheDocument();
  });

  it('advances on a find and finishes the hunt with a summary', async () => {
    renderApp();
    await startNeighbourhood();
    const scenes = ['a tree trunk', 'a flower', 'a bird', 'clouds in the sky', 'a dog'];
    for (const scene of scenes) {
      await uploadPhoto(scene);
      await userEvent.click(await screen.findByRole('button', { name: 'Next clue' }));
    }
    expect(await screen.findByText(/You found 5 of 5/)).toBeInTheDocument();
  });

  it('lets the player skip a clue and counts it as not found', async () => {
    renderApp();
    await startNeighbourhood();
    for (let i = 0; i < 5; i++) await userEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(await screen.findByText(/You found 0 of 5/)).toBeInTheDocument();
  });

  it('resumes where the player left off after a reload', async () => {
    const first = renderApp();
    await startNeighbourhood();
    await uploadPhoto('a tree trunk');
    await userEvent.click(await screen.findByRole('button', { name: 'Next clue' }));
    first.unmount();

    renderApp();
    await startNeighbourhood();
    expect(screen.getByText('Find 2 of 5')).toBeInTheDocument();
  });

  it('shows a recoverable error for an unreadable photo', async () => {
    renderApp();
    await startNeighbourhood();
    await userEvent.upload(
      screen.getByLabelText('Take photo'),
      new File(['junk'], 'x.jpg', { type: 'image/jpeg' }),
    );
    expect(await screen.findByText(/could not be read/)).toBeInTheDocument();
    expect(screen.getByLabelText('Take photo')).not.toBeDisabled();
  });
});

describe('model load failure', () => {
  it('surfaces the failure and offers a retry', async () => {
    const engine = new MockEngine();
    engine.loadVision = () => Promise.reject(new Error('network down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderApp(engine);
    await userEvent.click(screen.getByRole('button', { name: 'Download model' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be loaded|offline/);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
