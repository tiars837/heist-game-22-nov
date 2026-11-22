// audio.js — every sound is a small WebAudio oscillator: no sound files,
// nothing fetched, nothing but beeps the code itself synthesises. The
// audio context starts on the first key or click, as browsers require.

window.Heist = window.Heist || {};

/** The sound board: one lazy AudioContext, one mute flag. */
Heist.makeAudio = function makeAudio() {
  return { ctx: null, muted: false, alarmLastBeep: 0 };
};

/** Create (or reuse) the AudioContext after a user gesture. */
Heist.audioUnlock = function audioUnlock(audio) {
  if (audio.ctx !== null) {
    if (audio.ctx.state === 'suspended') audio.ctx.resume();
    return;
  }
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    audio.ctx = new Ctor();
  } catch (err) {
    audio.ctx = null;
  }
};

/** One short tone: frequency, seconds, wave shape, and loudness. */
Heist.audioTone = function audioTone(audio, freq, seconds, type, gainValue) {
  if (audio.ctx === null || audio.muted) return;
  try {
    const osc = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainValue || 0.08, audio.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.ctx.currentTime + seconds);
    osc.connect(gain);
    gain.connect(audio.ctx.destination);
    osc.start();
    osc.stop(audio.ctx.currentTime + seconds);
  } catch (err) {
    // A sound that cannot play is never worth stopping the game for.
  }
};

/** Two rising notes when loot is pocketed. */
Heist.audioPickup = function audioPickup(audio) {
  Heist.audioTone(audio, 880, 0.12, 'sine', 0.1);
  setTimeout(() => Heist.audioTone(audio, 1318, 0.18, 'sine', 0.1), 90);
};

/** A low buzz when a guard or camera first spots the thief. */
Heist.audioSpotted = function audioSpotted(audio) {
  Heist.audioTone(audio, 196, 0.25, 'square', 0.07);
};

/** A soft pop when the EMP fires. */
Heist.audioEmp = function audioEmp(audio) {
  Heist.audioTone(audio, 320, 0.2, 'sawtooth', 0.06);
  setTimeout(() => Heist.audioTone(audio, 160, 0.25, 'sawtooth', 0.05), 80);
};

/** A hush of filtered noise is too much for beeps; a low puff instead. */
Heist.audioSmoke = function audioSmoke(audio) {
  Heist.audioTone(audio, 140, 0.3, 'triangle', 0.08);
};

/** A short rising arpeggio for the clean getaway. */
Heist.audioWin = function audioWin(audio) {
  const notes = [523, 659, 784, 1046];
  notes.forEach((freq, i) => {
    setTimeout(() => Heist.audioTone(audio, freq, 0.22, 'sine', 0.1), i * 110);
  });
};

/** A falling tone for getting caught. */
Heist.audioCaught = function audioCaught(audio) {
  Heist.audioTone(audio, 220, 0.5, 'sawtooth', 0.08);
  setTimeout(() => Heist.audioTone(audio, 110, 0.7, 'sawtooth', 0.08), 200);
};

/** A ticking beep while the alarm is high, at most once a second. */
Heist.audioAlarmTick = function audioAlarmTick(audio, nowSeconds) {
  if (nowSeconds - audio.alarmLastBeep < 1) return;
  audio.alarmLastBeep = nowSeconds;
  Heist.audioTone(audio, 980, 0.07, 'square', 0.045);
};
