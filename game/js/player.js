// The courier: movement, sneaking, and the footstep noise that guards can hear.

import { TUNING } from './config.js';
import { clamp, distance } from './geometry.js';
import { moveActor } from './cover.js';

export class Player {
  constructor(level) {
    this.x = level.spawn.x;
    this.y = level.spawn.y;
    this.facing = -0.35;
    this.crouching = false;
    this.moving = false;
    this.stepAccumulator = 0;
    this.hasKey = false;
    this.footsteps = [];
  }

  reset(level) {
    this.x = level.spawn.x;
    this.y = level.spawn.y;
    this.facing = -0.35;
    this.crouching = false;
    this.moving = false;
    this.stepAccumulator = 0;
    this.hasKey = false;
    this.footsteps = [];
  }

  update(dt, input, level) {
    let dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    const length = Math.hypot(dx, dy);
    if (length > 0) {
      dx /= length;
      dy /= length;
    }
    this.crouching = Boolean(input.sneak);
    const speed = this.crouching ? TUNING.playerSneak : TUNING.playerWalk;
    const next = moveActor(level, this.x, this.y, dx * speed * dt, dy * speed * dt, TUNING.playerRadius);
    const travelled = distance(this.x, this.y, next.x, next.y);
    this.x = next.x;
    this.y = next.y;
    this.moving = travelled > 0.05;
    if (this.moving) this.facing = Math.atan2(dy, dx);

    this.footsteps = [];
    if (this.moving) {
      this.stepAccumulator += travelled;
      const stride = this.crouching ? 38 : 28;
      if (this.stepAccumulator >= stride) {
        this.stepAccumulator -= stride;
        this.footsteps.push({
          x: this.x,
          y: this.y,
          radius: this.crouching ? TUNING.hearSneak : TUNING.hearWalk,
          kind: this.crouching ? 'creep' : 'step',
        });
      }
    } else {
      this.stepAccumulator = Math.min(this.stepAccumulator, 12);
    }
    return this.footsteps;
  }
}

// How loud the courier is right now, for the HUD's noise readout.
export function noiseLevel(player) {
  if (!player.moving) return 0;
  return clamp(player.crouching ? 0.22 : 0.62, 0, 1);
}
