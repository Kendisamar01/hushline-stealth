import { loadLevel, stepWorld } from './world.js';
import { createRandom } from './rng.js';
import { SCREEN } from './screens.js';

function stageCover(world) {
  loadLevel(world, 0);
  for (let index = 0; index < 70; index += 1) stepWorld(world, {});
  return SCREEN.TITLE;
}

function stagePatrol(world) {
  loadLevel(world, 0);
  world.player.x = 690;
  world.player.y = 610;
  for (let index = 0; index < 3; index += 1) stepWorld(world, {});
  world.player.x = 690;
  world.player.y = 500;
  world.player.angle = -0.2;
  for (let index = 0; index < 80; index += 1) stepWorld(world, {});
  return SCREEN.PLAY;
}

function stageAlarm(world) {
  loadLevel(world, 1);
  const guard = world.guards[1];
  world.player.x = guard.x + Math.cos(guard.angle) * 104;
  world.player.y = guard.y + Math.sin(guard.angle) * 104;
  guard.awareness = 0.96;
  for (let index = 0; index < 12; index += 1) stepWorld(world, {});
  world.alarm = Math.max(world.alarm, 0.62);
  return SCREEN.PLAY;
}

function stageVictory(world) {
  loadLevel(world, 2);
  for (const item of world.level.loot) item.taken = true;
  world.collected = world.totalLoot;
  world.exitUnlocked = true;
  world.player.x = world.level.exit.x + world.level.exit.w / 2;
  world.player.y = world.level.exit.y + world.level.exit.h + 12;
  for (let index = 0; index < 16 && world.status === 'playing'; index += 1) stepWorld(world, { dy: -1 });
  return SCREEN.WIN;
}

export function stageShot(name, world, seed = world.seed) {
  world.random = createRandom(seed);
  if (name === 'patrol') return stagePatrol(world);
  if (name === 'alarm') return stageAlarm(world);
  if (name === 'victory') return stageVictory(world);
  return stageCover(world);
}
