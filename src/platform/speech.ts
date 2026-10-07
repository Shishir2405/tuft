/** Spoken clues are the primary interface; the screen only mirrors them. */
export const speechSupported = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window;

export function speak(text: string): void {
  if (!speechSupported()) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

export function stopSpeaking(): void {
  if (speechSupported()) window.speechSynthesis.cancel();
}

export const buzz = (pattern: number | number[]): void => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
};

export interface WakeLockHandle {
  release(): Promise<void>;
}

/** Best effort: keeps the screen from dimming mid-hunt where the browser allows it. */
export async function keepAwake(): Promise<WakeLockHandle | null> {
  try {
    if ('wakeLock' in navigator) return await navigator.wakeLock.request('screen');
  } catch {
    // Denied (low battery, background tab): the hunt works fine without it.
  }
  return null;
}
