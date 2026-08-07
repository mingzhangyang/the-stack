// The AudioContext is created lazily on the first sound rather than at import
// time: browsers refuse to start one before a user gesture, and constructing it
// eagerly breaks environments where the Web Audio API is unavailable.
let audioCtx: AudioContext | null = null;
let audioUnavailable = false;

function getAudioContext(): AudioContext | null {
  if (audioUnavailable) return null;

  if (!audioCtx) {
    const Ctor =
      typeof window === 'undefined'
        ? undefined
        : window.AudioContext ??
          (window as {webkitAudioContext?: typeof AudioContext})
            .webkitAudioContext;

    if (!Ctor) {
      audioUnavailable = true;
      return null;
    }

    try {
      audioCtx = new Ctor();
    } catch {
      audioUnavailable = true;
      return null;
    }
  }

  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }

  return audioCtx;
}

export const playWoodClick = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);

  gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.1);
};

export const playErrorSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(150, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.2);

  gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.3);
};

export const playWinSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const frequencies = [523.25, 659.25, 783.99, 1046.5]; // C Major chord arpeggio
  const startTime = ctx.currentTime;

  frequencies.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;

    gainNode.gain.setValueAtTime(0, startTime + index * 0.15);
    gainNode.gain.linearRampToValueAtTime(0.2, startTime + index * 0.15 + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + index * 0.15 + 1);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(startTime + index * 0.15);
    osc.stop(startTime + index * 0.15 + 1);
  });
};
