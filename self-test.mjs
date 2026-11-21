import { createRandom } from './game/js/rng.js';
import {
  castRay,
  distance,
  lineOfSightClear,
} from './game/js/geometry.js';
import { FIELD, LEVELS } from './game/js/levels.js';
import { createWorld, EVENT, loadLevel, resetWorld, stepWorld, throwPebble, worldSignature } from './game/js/world.js';
import { stageShot } from './game/js/shots.js';
import { SCREEN } from './game/js/screens.js';

let passed = 0;
let failed = 0;

function check(name, action) {
  try {
    action();
    passed += 1;
    console.log(`PASS  ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL  ${name}: ${error.message}`);
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function quietWorld() {
  const world = createWorld(1);
  world.level.walls = [];
  world.level.shadows = [];
  world.guards.forEach((guard, index) => {
    guard.x = index === 0 ? 200 : 10000;
    guard.y = index === 0 ? 300 : 10000;
    guard.route = [[guard.x, guard.y]];
    guard.waypoint = 0;
    guard.angle = 0;
    guard.awareness = 0;
    guard.state = 'patrol';
    guard.wait = 0;
  });
  return world;
}

function run(world, frames, control = {}) {
  let flags = EVENT.NONE;
  for (let index = 0; index < frames; index += 1) flags |= stepWorld(world, control);
  return flags;
}

check('three floors each have guards, loot and an exit', () => {
  expect(LEVELS.length === 3, 'expected three levels');
  for (const level of LEVELS) {
    expect(level.guards.length > 0, `${level.name} has no guards`);
    expect(level.loot.length > 0, `${level.name} has no loot`);
    expect(level.exit.x > FIELD.x && level.exit.x < FIELD.x + FIELD.w, 'exit off the floor');
  }
});

check('the seeded generator repeats and diverges by seed', () => {
  const first = createRandom(42);
  const second = createRandom(42);
  const third = createRandom(43);
  expect(first.next() === second.next(), 'same seed must repeat');
  expect(first.next() === second.next(), 'same seed must repeat across a sequence');
  expect(createRandom(42).next() !== third.next(), 'different seeds must differ');
});

check('a seeded game replays the same 180 frames', () => {
  const left = createWorld(4242);
  const right = createWorld(4242);
  for (let index = 0; index < 180; index += 1) {
    const control = { dx: index % 40 < 20 ? 1 : -1, dy: 0, sneak: index % 3 === 0 };
    stepWorld(left, control);
    stepWorld(right, control);
  }
  expect(worldSignature(left) === worldSignature(right), 'signatures differ for the same seed');
});

check('a guard walks its patrol route', () => {
  const world = createWorld(9);
  const guard = world.guards[0];
  const start = { x: guard.x, y: guard.y };
  run(world, 150);
  expect(distance(start.x, start.y, guard.x, guard.y) > 30, 'guard did not move');
  expect(guard.x >= FIELD.x && guard.x <= FIELD.x + FIELD.w, 'guard left the floor');
});

check('cover shortens a vision ray', () => {
  const walls = [{ x: 200, y: 80, w: 24, h: 40 }];
  const reach = castRay(100, 100, 0, 420, walls);
  expect(reach >= 98 && reach <= 102, `ray stopped at ${reach}`);
});

check('line of sight is blocked by cover', () => {
  const wall = { x: 200, y: 80, w: 24, h: 40 };
  expect(!lineOfSightClear([wall], 100, 100, 320, 100), 'cover did not block sight');
  expect(lineOfSightClear([], 100, 100, 320, 100), 'empty floor should be visible');
});

check('an uncovered thief inside a cone raises awareness', () => {
  const world = quietWorld();
  world.player.x = 300;
  world.player.y = 300;
  run(world, 20);
  expect(world.guards[0].awareness > 0.25, `awareness was ${world.guards[0].awareness}`);
  expect(world.guards[0].state !== 'patrol', 'guard did not become suspicious');
});

check('a thief outside the cone stays unseen', () => {
  const world = quietWorld();
  world.player.x = 300;
  world.player.y = 190;
  run(world, 30);
  expect(world.guards[0].awareness === 0, `awareness was ${world.guards[0].awareness}`);
});

check('shade hides a sneaking thief at range', () => {
  const world = quietWorld();
  world.level.shadows = [{ x: 320, y: 300, rx: 70, ry: 70 }];
  world.player.x = 320;
  world.player.y = 300;
  run(world, 30, { sneak: true });
  expect(world.guards[0].awareness === 0, `shade failed: ${world.guards[0].awareness}`);
});

check('running makes more noise than sneaking', () => {
  const loud = createWorld(12);
  const quiet = createWorld(12);
  run(loud, 90, { dx: 1, run: true });
  run(quiet, 90, { dx: 1, sneak: true });
  expect(loud.player.noise > quiet.player.noise + 0.2, `${loud.player.noise} vs ${quiet.player.noise}`);
});

check('a pebble lures a nearby guard and then fades', () => {
  const world = quietWorld();
  world.player.x = 90;
  world.player.y = 420;
  expect(throwPebble(world, 260, 300), 'throw was refused');
  stepWorld(world, {});
  const guard = world.guards[0];
  expect(guard.awareness > 0, 'guard did not hear the pebble');
  expect(guard.attention && Math.abs(guard.attention.x - 260) < 2, 'guard did not investigate the pebble');
  run(world, 180);
  expect(world.noisePulses.length === 0, 'noise pulses never faded');
});

check('detection raises the alarm and losing sight causes a near miss', () => {
  const world = quietWorld();
  world.player.x = 300;
  world.player.y = 300;
  const guard = world.guards[0];
  guard.awareness = 0.96;
  let spotted = EVENT.NONE;
  for (let index = 0; index < 10 && !(spotted & EVENT.DETECTED); index += 1) spotted |= stepWorld(world, {});
  expect(Boolean(spotted & EVENT.DETECTED), 'no detection event');
  expect(guard.state === 'chase', `state was ${guard.state}`);
  expect(world.alarm > 0.3, `alarm was ${world.alarm}`);
  world.player.x = 100;
  world.player.y = 600;
  let missed = EVENT.NONE;
  for (let index = 0; index < 150; index += 1) missed |= stepWorld(world, {});
  expect(Boolean(missed & EVENT.NEAR_MISS), 'no near-miss event');
});

check('a chasing guard catches the thief and world status changes', () => {
  const world = quietWorld();
  const guard = world.guards[0];
  guard.state = 'chase';
  guard.awareness = 1;
  world.player.x = guard.x + 26;
  world.player.y = guard.y;
  let flags = EVENT.NONE;
  for (let index = 0; index < 12 && !(flags & EVENT.CAUGHT); index += 1) flags |= stepWorld(world, {});
  expect(Boolean(flags & EVENT.CAUGHT), 'no caught event');
  expect(world.status === 'caught', `status was ${world.status}`);
});

check('collecting all loot opens the exit and clears each floor', () => {
  const world = createWorld(31);
  for (let index = 0; index < LEVELS.length; index += 1) {
    loadLevel(world, index);
    for (const item of world.level.loot) item.taken = true;
    world.collected = world.totalLoot;
    world.exitUnlocked = true;
    world.player.x = world.level.exit.x + world.level.exit.w / 2;
    world.player.y = world.level.exit.y + world.level.exit.h / 2;
    const flags = stepWorld(world, {});
    const expected = index === LEVELS.length - 1 ? EVENT.WIN : EVENT.LEVEL_CLEAR;
    expect(Boolean(flags & expected), `floor ${index + 1} did not finish`);
    expect(index === LEVELS.length - 1 ? world.status === 'win' : world.status === 'levelclear', 'wrong final status');
  }
});

check('retry restores the floor to its starting state', () => {
  const world = createWorld(55);
  world.collected = 2;
  world.alarm = 0.9;
  world.player.pebbles = 0;
  world.status = 'caught';
  resetWorld(world);
  expect(world.status === 'playing', 'status was not reset');
  expect(world.collected === 0 && world.alarm === 0 && world.player.pebbles === 3, 'counters were not reset');
});

check('all four shot states stage the intended screens', () => {
  const world = createWorld(7);
  expect(stageShot('cover', world, 7) === SCREEN.TITLE, 'cover is not the title');
  const playScreen = stageShot('patrol', world, 7);
  expect(playScreen === SCREEN.PLAY && world.collected >= 1, 'patrol scene is wrong');
  stageShot('alarm', world, 7);
  expect(world.guards.some((guard) => guard.state === 'chase') && world.alarm > 0.5, 'alarm scene is not chasing');
  const victoryScreen = stageShot('victory', world, 7);
  expect(victoryScreen === SCREEN.WIN && world.status === 'win', 'victory scene is not a win');
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
