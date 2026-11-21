// Thrown pebbles and the expanding hearing rings they leave behind.

import { TUNING } from './config.js';
import { distance } from './geometry.js';

export class Pebble {
  constructor(x, y, targetX, targetY) {
    const d = distance(x, y, targetX, targetY);
    const ratio = d > TUNING.pebbleRange ? TUNING.pebbleRange / d : 1;
    this.x = x;
    this.y = y;
    this.startX = x;
    this.startY = y;
    this.targetX = x + (targetX - x) * ratio;
    this.targetY = y + (targetY - y) * ratio;
    this.duration = Math.max(0.12, distance(x, y, this.targetX, this.targetY) / TUNING.pebbleSpeed);
    this.age = 0;
    this.landed = false;
  }

  update(dt) {
    if (this.landed) return null;
    this.age += dt;
    const t = Math.min(1, this.age / this.duration);
    this.x = this.startX + (this.targetX - this.startX) * t;
    this.y = this.startY + (this.targetY - this.startY) * t;
    if (t >= 1) {
      this.landed = true;
      return { x: this.x, y: this.y, radius: TUNING.pebbleNoise, kind: 'pebble' };
    }
    return null;
  }
}

export class HearingRing {
  constructor(x, y, radius, kind) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.kind = kind;
    this.age = 0;
    this.life = kind === 'pebble' ? 1.1 : 0.55;
  }

  update(dt) {
    this.age += dt;
    return this.age < this.life;
  }

  get progress() {
    return Math.min(1, this.age / this.life);
  }
}
