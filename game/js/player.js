import { angleTo, circleHitsRect, clamp, FIELD } from './geometry.js';
import { EVENT } from './events.js';

const BODY_RADIUS = 12;

export function createPlayer(start) {
  return {
    x: start.x,
    y: start.y,
    radius: BODY_RADIUS,
    angle: -Math.PI / 2,
    speed: 0,
    moving: false,
    sneaking: false,
    running: false,
    noise: 0,
    pebbles: 3,
    stepClock: 0,
    hidden: false,
  };
}

function blocked(world, x, y) {
  if (x - BODY_RADIUS < FIELD.x || x + BODY_RADIUS > FIELD.x + FIELD.w) return true;
  if (y - BODY_RADIUS < FIELD.y || y + BODY_RADIUS > FIELD.y + FIELD.h) return true;
  for (const wall of world.level.walls) {
    if (circleHitsRect(x, y, BODY_RADIUS, wall)) return true;
  }
  return false;
}

export function emitNoise(world, x, y, strength, life, source) {
  const pulse = {
    id: world.nextPulseId++,
    x,
    y,
    strength,
    originStrength: strength,
    life,
    maxLife: life,
    source,
  };
  world.noisePulses.push(pulse);
  return pulse;
}

export function updatePlayer(world, control) {
  const player = world.player;
  const delta = world.delta;
  let dx = clamp(control.dx ?? 0, -1, 1);
  let dy = clamp(control.dy ?? 0, -1, 1);
  const magnitude = Math.hypot(dx, dy);
  if (magnitude > 1) {
    dx /= magnitude;
    dy /= magnitude;
  }
  player.sneaking = Boolean(control.sneak);
  player.running = Boolean(control.run) && !player.sneaking;
  const fullSpeed = player.sneaking ? 78 : player.running ? 205 : 146;
  player.speed = magnitude > 0.01 ? fullSpeed : 0;
  player.moving = magnitude > 0.01;
  let flags = EVENT.NONE;
  if (player.moving) {
    player.angle = angleTo(0, 0, dx, dy);
    const nextX = player.x + dx * fullSpeed * delta;
    const nextY = player.y + dy * fullSpeed * delta;
    if (!blocked(world, nextX, player.y)) player.x = nextX;
    if (!blocked(world, player.x, nextY)) player.y = nextY;
    player.stepClock += delta;
    const interval = player.sneaking ? 0.72 : player.running ? 0.28 : 0.46;
    if (player.stepClock >= interval) {
      player.stepClock -= interval;
      const strength = player.sneaking ? 0.08 : player.running ? 0.34 : 0.18;
      emitNoise(world, player.x, player.y, strength, 0.9, 'step');
      world.lastFootstep = { x: player.x, y: player.y };
      flags |= EVENT.FOOTSTEP;
    }
    player.noise = clamp(player.noise + (player.sneaking ? 0.04 : player.running ? 0.55 : 0.24) * delta, 0, 1);
  } else {
    player.noise = clamp(player.noise - 0.4 * delta, 0, 1);
  }
  if (!player.moving) player.stepClock = 0.36;
  return flags;
}
