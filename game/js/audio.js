import { clamp, distance } from './geometry.js';
import { EVENT } from './events.js';
import { createRandom } from './rng.js';

export function createAudio() {
  const noiseRandom = createRandom(9182);
  let context = null;
  let muted = false;

  function unlock() {
    if (!context) {
      const Engine = window.AudioContext || window.webkitAudioContext;
      if (!Engine) return;
      context = new Engine();
    }
    if (context.state === 'suspended') context.resume();
  }

  function tone(frequency, duration, type, volume, slide, pan = 0, delay = 0) {
    if (!context || muted) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (slide) oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency + slide), start + duration);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    tail(oscillator, envelope, pan, start, duration);
  }

  function tail(oscillator, envelope, pan, start, duration) {
    if (context.createStereoPanner) {
      const panner = context.createStereoPanner();
      panner.pan.value = clamp(pan, -1, 1);
      oscillator.connect(envelope);
      envelope.connect(panner);
      panner.connect(context.destination);
    } else {
      oscillator.connect(envelope);
      envelope.connect(context.destination);
    }
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  function footstep(pan, volume) {
    if (!context || muted) return;
    const duration = 0.07;
    const frames = Math.floor(context.sampleRate * duration);
    const buffer = context.createBuffer(1, frames, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < frames; index += 1) {
      const fade = 1 - index / frames;
      data[index] = (noiseRandom.next() * 2 - 1) * fade * fade;
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    filter.type = 'lowpass';
    filter.frequency.value = 620;
    envelope.gain.value = 0.045 * volume;
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(envelope);
    const start = context.currentTime;
    if (context.createStereoPanner) {
      const panner = context.createStereoPanner();
      panner.pan.value = clamp(pan, -1, 1);
      envelope.connect(panner);
      panner.connect(context.destination);
    } else {
      envelope.connect(context.destination);
    }
    source.start(start);
    source.stop(start + duration);
  }

  function play(flags, world) {
    if (!context || muted) return;
    if (flags & EVENT.FOOTSTEP) {
      const step = world.lastFootstep;
      if (step) {
        const gap = distance(step.x, step.y, world.player.x, world.player.y);
        const pan = (step.x - world.player.x) / 380;
        footstep(pan, clamp(1 - gap / 520, 0.16, 1));
      }
    }
    if (flags & EVENT.LOOT) {
      tone(880, 0.12, 'sine', 0.07, 240, 0);
      tone(1320, 0.16, 'sine', 0.05, 120, 0, 0.09);
    }
    if (flags & EVENT.HEARD) tone(320, 0.1, 'triangle', 0.025, 60);
    if (flags & EVENT.THROW) tone(700, 0.08, 'triangle', 0.05, -360);
    if (flags & EVENT.NEAR_MISS) tone(560, 0.24, 'sawtooth', 0.05, -300);
    if (flags & EVENT.DETECTED) {
      tone(440, 0.2, 'square', 0.05, -120);
      tone(330, 0.3, 'square', 0.045, -100, 0, 0.14);
    }
    if (flags & EVENT.CAUGHT) tone(120, 0.55, 'sawtooth', 0.09, -60);
    if (flags & EVENT.LEVEL_CLEAR) {
      tone(523, 0.18, 'sine', 0.06, 0, 0, 0);
      tone(659, 0.18, 'sine', 0.06, 0, 0, 0.12);
      tone(784, 0.3, 'sine', 0.07, 0, 0, 0.24);
    }
    if (flags & EVENT.WIN) {
      [523, 659, 784, 1046].forEach((note, index) => tone(note, 0.35, 'triangle', 0.07, 0, 0, index * 0.14));
    }
  }

  function toggleMute() {
    muted = !muted;
    return muted;
  }

  return { unlock, play, toggleMute, get muted() { return muted; } };
}
