// Original WebAudio soundscape: synthesized footsteps, alarms and a quiet room tone.
// No audio files, no network, and nothing is created until the player interacts.

import { clamp } from './geometry.js';
import { makeRng } from './rng.js';

export class Soundscape {
  constructor() {
    this.context = null;
    this.master = null;
    this.noise = null;
    this.muted = false;
    this.ambientNodes = [];
    this.heartClock = 0;
  }

  unlock() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume();
      return;
    }
    const AudioCtor = typeof window === 'undefined' ? null : window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    this.context = new AudioCtor();
    this.master = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : 0.75;
    this.master.connect(this.context.destination);
    const length = Math.floor(this.context.sampleRate * 0.2);
    this.noise = this.context.createBuffer(1, length, this.context.sampleRate);
    const samples = this.noise.getChannelData(0);
    const rng = makeRng(90210);
    for (let i = 0; i < length; i++) samples[i] = (rng() * 2 - 1) * (1 - i / length);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.75;
    return this.muted;
  }

  setAmbient(on) {
    if (!this.context) return;
    if (on && this.ambientNodes.length === 0) {
      const filter = this.context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 260;
      const gain = this.context.createGain();
      gain.gain.value = 0.035;
      filter.connect(gain).connect(this.master);
      for (const frequency of [55, 82.5]) {
        const osc = this.context.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = frequency;
        osc.connect(filter);
        osc.start();
        this.ambientNodes.push(osc);
      }
    } else if (!on && this.ambientNodes.length > 0) {
      for (const osc of this.ambientNodes) osc.stop();
      this.ambientNodes = [];
    }
  }

  step(kind, pan, volume) {
    if (!this.context || !this.noise) return;
    const now = this.context.currentTime;
    const source = this.context.createBufferSource();
    source.buffer = this.noise;
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = kind === 'guard' ? 310 : kind === 'creep' ? 690 : 500;
    filter.Q.value = 1.1;
    const envelope = this.context.createGain();
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(clamp(volume, 0.01, 0.9), now + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    const panner = this.context.createStereoPanner();
    panner.pan.value = clamp(pan, -1, 1);
    source.connect(filter).connect(envelope).connect(panner).connect(this.master);
    source.start(now);
    source.stop(now + 0.16);
  }

  tone(frequency, duration, type, volume, delay = 0) {
    if (!this.context) return;
    const now = this.context.currentTime + delay;
    const osc = this.context.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
    return osc;
  }

  alarm() {
    const rising = this.tone(420, 0.28, 'sawtooth', 0.075);
    if (rising) rising.frequency.exponentialRampToValueAtTime(880, this.context.currentTime + 0.26);
    this.tone(660, 0.2, 'triangle', 0.06, 0.22);
  }

  pickup() {
    this.tone(660, 0.11, 'triangle', 0.08);
    this.tone(990, 0.16, 'triangle', 0.07, 0.1);
  }

  pebble() {
    this.tone(880, 0.07, 'sine', 0.045);
    this.tone(1320, 0.09, 'sine', 0.025, 0.05);
  }

  caught() {
    const falling = this.tone(340, 0.55, 'sawtooth', 0.1);
    if (falling) falling.frequency.exponentialRampToValueAtTime(90, this.context.currentTime + 0.5);
  }

  complete() {
    [523, 659, 784, 1046].forEach((note, i) => this.tone(note, 0.32, 'triangle', 0.07, i * 0.12));
  }

  heartbeat(intensity, dt) {
    if (!this.context || intensity <= 0.02) return;
    this.heartClock -= dt;
    if (this.heartClock > 0) return;
    this.heartClock = 1.05 - intensity * 0.42;
    this.tone(74, 0.16, 'sine', 0.06 + intensity * 0.09);
    this.tone(62, 0.13, 'sine', 0.045 + intensity * 0.05, 0.17);
  }
}
