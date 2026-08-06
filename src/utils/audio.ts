const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

export const playWoodClick = () => {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(300, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.05);

  gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
};

export const playErrorSound = () => {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(150, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.2);

  gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
};

export const playWinSound = () => {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C Major chord arpeggio
  const startTime = audioCtx.currentTime;

  frequencies.forEach((freq, index) => {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;

    gainNode.gain.setValueAtTime(0, startTime + index * 0.15);
    gainNode.gain.linearRampToValueAtTime(0.2, startTime + index * 0.15 + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + index * 0.15 + 1);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start(startTime + index * 0.15);
    osc.stop(startTime + index * 0.15 + 1);
  });
};
