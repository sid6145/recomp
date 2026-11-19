/**
 * Micro-Sound Engine (src/utils/soundEngine.ts)
 *
 * Synthesizes ultra-quiet, zero-external-asset Web Audio API micro-sounds:
 * 1. playLogTick(): Crisp low-frequency mechanical tick on primary logs.
 * 2. playProteinGoalChime(): Warm two-tone harmonic chime when hitting 100% daily protein in Overdrive.
 *
 * Fails completely silently when AudioContext is unavailable or disabled.
 */

const STORAGE_KEY = 'kalTrack_sound_effects';

let memorySoundEnabled = false;
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  try {
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!AudioCtxClass) return null;

    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtxClass();
    }

    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }

    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Checks if sound effects are enabled in user preferences.
 * Defaults to false (opt-in / user controlled).
 */
export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return memorySoundEnabled;
  }
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === null) return memorySoundEnabled;
    return val === 'true';
  } catch {
    return memorySoundEnabled;
  }
}

/**
 * Updates the user's sound effects preference.
 */
export function setSoundEnabled(enabled: boolean): void {
  memorySoundEnabled = enabled;
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
    } catch {
      // Ignore storage quota/permission errors
    }
  }
}

/**
 * Toggles sound effects preference and returns the new value.
 */
export function toggleSound(): boolean {
  const current = isSoundEnabled();
  const next = !current;
  setSoundEnabled(next);
  return next;
}

/**
 * 1. Crisp low-frequency mechanical tick on primary logs.
 * Synthesized using an ultra-short damped sine wave at 160Hz -> 80Hz.
 */
export function playLogTick(): void {
  if (!isSoundEnabled()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.04);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  } catch {
    // Fails silently if AudioContext throws
  }
}

/**
 * 2. Warm two-tone harmonic chime when hitting 100% daily protein in Overdrive.
 * Synthesized using two warm sine waves in pure harmonic major third (587.33Hz D5 -> 739.99Hz F#5).
 */
export function playProteinGoalChime(): void {
  if (!isSoundEnabled()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Tone 1: Root Note
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5

    gain1.gain.setValueAtTime(0.06, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.4);

    // Tone 2: Harmonic Major Third, slight delay
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(739.99, now + 0.09); // F#5

    gain2.gain.setValueAtTime(0.07, now + 0.09);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.09);
    osc2.stop(now + 0.6);
  } catch {
    // Fails silently if AudioContext throws
  }
}
