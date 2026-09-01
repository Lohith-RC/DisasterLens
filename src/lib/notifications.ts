let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio not available
  }
}

export function playNewSignalSound() {
  playTone(800, 0.15, 'sine', 0.4);
  setTimeout(() => playTone(1000, 0.15, 'sine', 0.4), 150);
  setTimeout(() => playTone(1200, 0.3, 'sine', 0.4), 300);
}

export function playDispatchSound() {
  playTone(523, 0.1, 'square', 0.2);
  setTimeout(() => playTone(659, 0.1, 'square', 0.2), 100);
  setTimeout(() => playTone(784, 0.2, 'square', 0.2), 200);
}

export function playResolveSound() {
  playTone(784, 0.1, 'sine', 0.3);
  setTimeout(() => playTone(659, 0.1, 'sine', 0.3), 100);
  setTimeout(() => playTone(523, 0.15, 'sine', 0.3), 200);
}

export function playMessageSound() {
  playTone(600, 0.08, 'sine', 0.15);
  setTimeout(() => playTone(800, 0.08, 'sine', 0.15), 80);
}

export function playSOSSound() {
  playTone(440, 0.2, 'square', 0.5);
  setTimeout(() => playTone(440, 0.2, 'square', 0.5), 300);
  setTimeout(() => playTone(440, 0.2, 'square', 0.5), 600);
  setTimeout(() => playTone(523, 0.4, 'square', 0.5), 900);
}
