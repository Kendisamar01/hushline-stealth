import { circleHitsRect, clamp, distance, FIELD } from './geometry.js';
import { createRandom } from './rng.js';
import { copyLevel, LEVELS } from './levels.js';
import { createGuard, updateGuard } from './guards.js';
import { createPlayer, emitNoise, updatePlayer } from './player.js';
import { insideShade } from './detection.js';
import { EVENT } from './events.js';

export { EVENT };

export function createWorld(seed, levelIndex = 0) {
  const world = {
    seed: seed >>> 0,
    random: createRandom(seed),
    levelIndex: 0,
    level: null,
    player: null,
    guards: [],
    delta: 1 / 60,
  };
  loadLevel(world, levelIndex);
  return world;
}

export function loadLevel(world, index) {
  world.levelIndex = clamp(index, 0, LEVELS.length - 1);
  world.level = copyLevel(world.levelIndex);
  world.player = createPlayer(world.level.start);
  world.guards = world.level.guards.map((definition, id) => createGuard(definition, id, world.random));
  world.noisePulses = [];
  world.projectiles = [];
  world.nextPulseId = 1;
  world.alarm = 0;
  world.alarmHold = 0;
  world.nearMissFlash = 0;
  world.lootFlash = 0;
  world.lastFootstep = null;
  world.collected = 0;
  world.totalLoot = world.level.loot.length;
  world.exitUnlocked = false;
  world.status = 'playing';
  world.time = 0;
  world.delta = 1 / 60;
  world.lootTakenThisLevel = 0;
  world.secondsThisLevel = 0;
  world.closestCall = 0;
}

export function resetWorld(world) {
  loadLevel(world, world.levelIndex);
}

export function advanceLevel(world) {
  if (world.levelIndex + 1 >= LEVELS.length) return false;
  loadLevel(world, world.levelIndex + 1);
  return true;
}

export function throwPebble(world, targetX, targetY) {
  const player = world.player;
  if (player.pebbles <= 0 || world.status !== 'playing') return false;
  let x = clamp(targetX, FIELD.x, FIELD.x + FIELD.w);
  let y = clamp(targetY, FIELD.y, FIELD.y + FIELD.h);
  const dx = x - player.x;
  const dy = y - player.y;
  const span = Math.hypot(dx, dy);
  if (span > 340) {
    x = player.x + (dx / span) * 340;
    y = player.y + (dy / span) * 340;
  }
  player.pebbles -= 1;
  emitNoise(world, x, y, 0.95, 1.7, 'pebble');
  world.projectiles.push({
    x: player.x,
    y: player.y,
    tx: x,
    ty: y,
    age: 0,
    duration: 0.26,
  });
  return true;
}

function collectLoot(world) {
  let flags = EVENT.NONE;
  for (const item of world.level.loot) {
    if (item.taken) continue;
    if (distance(world.player.x, world.player.y, item.x, item.y) > 25) continue;
    item.taken = true;
    world.collected += 1;
    world.lootTakenThisLevel += 1;
    world.lootFlash = 0.7;
    flags |= EVENT.LOOT;
  }
  if (!world.exitUnlocked && world.collected >= world.totalLoot) world.exitUnlocked = true;
  return flags;
}

function updateAlarm(world) {
  const chasing = world.guards.some((guard) => guard.state === 'chase');
  if (chasing || world.alarmHold > 0) {
    world.alarm = clamp(world.alarm + 0.48 * world.delta, 0, 1);
  } else {
    world.alarm = clamp(world.alarm - 0.24 * world.delta, 0, 1);
  }
  world.alarmHold = Math.max(0, world.alarmHold - world.delta);
  world.nearMissFlash = Math.max(0, world.nearMissFlash - world.delta);
  world.lootFlash = Math.max(0, world.lootFlash - world.delta);
}

export function stepWorld(world, control = {}, delta = 1 / 60) {
  if (world.status !== 'playing') return EVENT.NONE;
  world.delta = delta;
  world.time += delta;
  world.secondsThisLevel += delta;
  let flags = EVENT.NONE;
  if (control.throw) {
    if (throwPebble(world, control.throw.x, control.throw.y)) flags |= EVENT.THROW;
  }
  flags |= updatePlayer(world, control);
  for (const pulse of world.noisePulses) {
    pulse.life -= delta;
    pulse.strength = pulse.originStrength * clamp(pulse.life / pulse.maxLife, 0, 1);
  }
  world.noisePulses = world.noisePulses.filter((pulse) => pulse.life > 0);
  for (const projectile of world.projectiles) projectile.age += delta;
  world.projectiles = world.projectiles.filter((projectile) => projectile.age < projectile.duration);
  for (const guard of world.guards) {
    flags |= updateGuard(world, guard);
    const gap = distance(guard.x, guard.y, world.player.x, world.player.y);
    if (guard.awareness > 0.45 && gap < 130) world.closestCall = Math.max(world.closestCall, 1 - gap / 130);
  }
  flags |= collectLoot(world);
  updateAlarm(world);
  world.player.hidden = insideShade(world, world.player.x, world.player.y)
    && (world.player.sneaking || world.player.speed < 30);
  if (flags & EVENT.CAUGHT) {
    world.status = 'caught';
    return flags;
  }
  if (world.exitUnlocked && circleHitsRect(world.player.x, world.player.y, 18, world.level.exit)) {
    if (world.levelIndex === LEVELS.length - 1) {
      world.status = 'win';
      flags |= EVENT.WIN;
    } else {
      world.status = 'levelclear';
      flags |= EVENT.LEVEL_CLEAR;
    }
  }
  return flags;
}

export function worldSignature(world) {
  const round = (value) => Math.round(value * 1000) / 1000;
  return JSON.stringify({
    status: world.status,
    level: world.levelIndex,
    time: round(world.time),
    alarm: round(world.alarm),
    collected: world.collected,
    player: [round(world.player.x), round(world.player.y), round(world.player.noise)],
    guards: world.guards.map((guard) => [
      round(guard.x),
      round(guard.y),
      round(guard.angle),
      round(guard.awareness),
      guard.state,
    ]),
  });
}
