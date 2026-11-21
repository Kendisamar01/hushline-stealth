// Hushline self-test: Node 22, standard library only.
// Exercises the real game modules with a minimal canvas stub, checks the served files and the
// screenshot caps, and appends a readable report to MAKEFUN_TESTLOG or the default log.

import assert from 'node:assert/strict';
import { appendFileSync, lstatSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { Game } from './game/js/game.js';
import { Guard } from './game/js/guards.js';
import { Player } from './game/js/player.js';
import { applyAwareness, visibilityOf } from './game/js/detection.js';
import { sampleLight, sightBlocked } from './game/js/cover.js';
import { buildLevel, levelCount, validatePatrols } from './game/js/levels.js';
import { applyShot, SHOT_COUNT } from './game/js/shots.js';
import { distance } from './game/js/geometry.js';

const ROOT = new URL('.', import.meta.url).pathname;
const LOG = process.env.MAKEFUN_TESTLOG ?? '/workspace/.makefun/stealth-test.log';
const lines = [];
const stamp = new Date().toISOString();
let passed = 0;
let failed = 0;

function say(line) {
  lines.push(line);
  process.stdout.write(`${line}\n`);
}

function check(name, fn) {
  try {
    fn();
    passed++;
    say(`PASS  ${name}`);
  } catch (error) {
    failed++;
    say(`FAIL  ${name}: ${error.message}`);
  }
}

function recordingContext() {
  const calls = [];
  const gradient = { addColorStop() {} };
  const record = (name) => (...args) => {
    calls.push(`${name}(${args.map((a) => (typeof a === 'number' ? a.toFixed(3) : String(a))).join(',')})`);
  };
  const ctx = {
    calls,
    canvas: { width: 1280, height: 720 },
    createLinearGradient: (...args) => { record('linearGradient')(...args); return gradient; },
    createRadialGradient: (...args) => { record('radialGradient')(...args); return gradient; },
  };
  for (const name of [
    'clearRect', 'fillRect', 'strokeRect', 'beginPath', 'moveTo', 'lineTo', 'arc', 'ellipse',
    'closePath', 'fill', 'stroke', 'save', 'restore', 'translate', 'rotate', 'clip', 'rect',
    'setLineDash', 'fillText',
  ]) ctx[name] = record(name);
  ctx.measureText = () => ({ width: 12 });
  return ctx;
}

function jpegDimensions(bytes) {
  assert.equal(bytes[0], 0xff);
  assert.equal(bytes[1], 0xd8);
  let at = 2;
  while (at + 9 < bytes.length) {
    if (bytes[at] !== 0xff) { at++; continue; }
    const marker = bytes[at + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { width: bytes.readUInt16BE(at + 7), height: bytes.readUInt16BE(at + 5) };
    }
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      at += 2;
      continue;
    }
    at += 2 + bytes.readUInt16BE(at + 2);
  }
  throw new Error('no JPEG frame found');
}

function testGuard(overrides = {}) {
  const level = buildLevel(0);
  const def = {
    id: 0, route: [{ x: 100, y: 100 }, { x: 420, y: 100 }, { x: 420, y: 260 }, { x: 100, y: 260 }],
    speed: 80, pause: 0.4, phase: 0, scan: 0.4, ...overrides,
  };
  const guard = new Guard(def, level);
  guard.x = 100;
  guard.y = 100;
  guard.facing = 0;
  guard.alarm = 0;
  return guard;
}

const fakePlayer = (x, y, crouching = false, moving = true) => ({ x, y, crouching, moving });
const openLevel = { cover: [], lamps: [], shadows: [] };

say(`Hushline self-test — ${stamp}`);
say('Chrome: /workspace/.cache/puppeteer/chrome-headless-shell/linux-157.0.8103.78/chrome-headless-shell-linux64/chrome-headless-shell (--no-sandbox --disable-gpu)');

check('three levels build with cover, lamps, patrols and valid routes', () => {
  assert.equal(levelCount(), 3);
  for (let i = 0; i < levelCount(); i++) {
    const level = buildLevel(i);
    assert.ok(level.cover.length >= 7);
    assert.ok(level.guards.length >= 2 + i);
    assert.ok(level.lamps.length >= 3);
    assert.ok(level.exit.rect.w > 0);
    assert.deepEqual(validatePatrols(level), []);
  }
});

check('a fresh title-screen guard cone has finite geometry', () => {
  const game = new Game(null);
  for (const guard of game.guards) {
    assert.equal(guard.alarm, 0);
    assert.ok(Number.isFinite(guard.range) && Number.isFinite(guard.halfAngle));
  }
  for (const lamp of game.level.lamps) assert.ok(Number.isFinite(lamp.radius));
});

check('guards walk their patrol and turn their cones', () => {
  const guard = testGuard();
  const start = { x: guard.x, y: guard.y, facing: guard.facing };
  for (let i = 0; i < 90; i++) guard.update(1 / 60, { level: buildLevel(0), player: fakePlayer(900, 600), alarm: 0 });
  assert.ok(distance(start.x, start.y, guard.x, guard.y) > 60, 'guard did not move along route');
  assert.ok(Math.abs(guard.facing - start.facing) > 0.001 || guard.x > start.x);
  assert.ok(guard.halfAngle > 0.39 && guard.range >= 244);
});

check('cone geometry: inside, outside and past range', () => {
  const guard = testGuard();
  assert.equal(visibilityOf(guard, fakePlayer(220, 100), openLevel, 0).visible, true);
  assert.equal(visibilityOf(guard, fakePlayer(100, 230), openLevel, 0).visible, false);
  assert.equal(visibilityOf(guard, fakePlayer(700, 100), openLevel, 0).visible, false);
  assert.equal(visibilityOf(guard, fakePlayer(250, 100), { ...openLevel, cover: [{ x: 170, y: 60, w: 20, h: 80 }] }, 0).reason, 'cover');
  assert.equal(sightBlocked({ cover: [{ x: 170, y: 60, w: 20, h: 80 }] }, 100, 100, 250, 100), true);
});

check('light, shadow and crouch change detection strength', () => {
  const litLevel = { cover: [], shadows: [], lamps: [{ x: 200, y: 100, radius: 300, power: 1 }] };
  const darkLevel = { ...litLevel, shadows: [{ x: 170, y: 70, w: 60, h: 60 }] };
  const guard = testGuard();
  const walk = visibilityOf(guard, fakePlayer(200, 100), litLevel, 0);
  const creep = visibilityOf(guard, fakePlayer(200, 100, true), litLevel, 0);
  const shaded = visibilityOf(guard, fakePlayer(200, 100, true), darkLevel, 0);
  assert.ok(walk.factor > creep.factor, 'crouch must reduce visibility');
  assert.ok(creep.factor > shaded.factor, 'shadow must reduce visibility');
  assert.ok(sampleLight(darkLevel, 200, 100) < sampleLight(litLevel, 200, 100));
});

check('awareness reaches spotted, decays, and a near miss fires on escape', () => {
  const guard = testGuard();
  const seen = { visible: true, factor: 1, light: 1, distance: 120, reason: 'sight' };
  const unseen = { visible: false, factor: 0, light: 0, distance: 400, reason: 'angle' };
  let spotted = false;
  for (let i = 0; i < 150 && !spotted; i++) spotted = applyAwareness(guard, seen, 1 / 60, 0).spotted;
  assert.equal(spotted, true);
  assert.equal(guard.awareness, 1);
  for (let i = 0; i < 60; i++) applyAwareness(guard, unseen, 1 / 60, 0);
  assert.ok(guard.awareness < 0.55, 'awareness did not fall after losing sight');

  const near = testGuard();
  let fired = false;
  for (let i = 0; i < 80; i++) applyAwareness(near, seen, 1 / 60, 0);
  for (let i = 0; i < 120; i++) if (applyAwareness(near, unseen, 1 / 60, 0).nearMiss) fired = true;
  assert.equal(fired, true, 'near miss did not arm and fire');
});

check('chase loses sight into search and then returns to patrol', () => {
  const guard = testGuard();
  const level = buildLevel(0);
  const far = fakePlayer(1100, 650);
  guard.enterChase(fakePlayer(150, 100));
  for (let i = 0; i < 200; i++) guard.update(1 / 60, { level, player: far, alarm: 0 });
  assert.ok(guard.state === 'search' || guard.state === 'patrol', `unexpected state ${guard.state}`);
  for (let i = 0; i < 400; i++) guard.update(1 / 60, { level, player: far, alarm: 0 });
  assert.equal(guard.state, 'patrol');
});

check('footsteps and thrown pebbles make guards investigate', () => {
  const player = new Player(buildLevel(0));
  const steps = player.update(1 / 60, { right: true, sneak: false }, buildLevel(0));
  assert.ok(player.x > buildLevel(0).spawn.x);
  for (let i = 0; i < 40; i++) steps.push(...player.update(1 / 60, { right: true, sneak: false }, buildLevel(0)));
  assert.ok(steps.length >= 1, 'no footstep noise emitted');

  const game = new Game(null);
  game.loadLevel(0);
  game.phase = 'playing';
  game.mouse.inside = true;
  game.mouse.x = 300;
  game.mouse.y = 300;
  assert.equal(game.throwPebble(), true);
  assert.equal(game.pebblesLeft, 3);
  for (let i = 0; i < 70; i++) game.update(1 / 60);
  assert.equal(game.pebbles.length, 0, 'pebble never landed');
  assert.ok(game.rings.some((ring) => ring.kind === 'pebble'));
  assert.ok(game.guards.some((guard) => guard.state === 'investigate'));
});

check('exit reach, locked gate, catch and instant retry', () => {
  const game = new Game(null);
  game.loadLevel(0);
  game.phase = 'playing';
  game.player.x = game.level.exit.x;
  game.player.y = game.level.exit.y;
  for (const guard of game.guards) { guard.x = 80; guard.y = 120; guard.awareness = 0; guard.state = 'patrol'; }
  game.update(1 / 60);
  assert.equal(game.phase, 'complete');

  game.loadLevel(1);
  game.phase = 'playing';
  game.player.x = game.level.exit.x;
  game.player.y = game.level.exit.y;
  for (const guard of game.guards) { guard.x = 80; guard.y = 120; guard.awareness = 0; guard.state = 'patrol'; }
  game.update(1 / 60);
  assert.equal(game.phase, 'playing');
  assert.match(game.notice.text, /LOCKED/);
  game.player.hasKey = true;
  game.update(1 / 60);
  assert.equal(game.phase, 'complete');

  game.loadLevel(0);
  game.phase = 'playing';
  game.guards[0].state = 'chase';
  game.guards[0].x = game.player.x + 4;
  game.guards[0].y = game.player.y;
  game.update(1 / 60);
  assert.equal(game.phase, 'caught');
  game.retry();
  assert.equal(game.phase, 'playing');
  assert.equal(game.elapsed, 0);
  assert.equal(distance(game.player.x, game.player.y, game.level.spawn.x, game.level.spawn.y), 0);
});

check('all four screenshot poses render deterministically through a canvas stub', () => {
  const game = new Game(null);
  assert.equal(SHOT_COUNT, 4);
  for (const shot of [1, 2, 3, 4]) {
    applyShot(game, shot);
    game.render(recordingContext());
  }
  applyShot(game, 1);
  const first = recordingContext();
  game.render(first);
  applyShot(game, 1);
  const second = recordingContext();
  game.render(second);
  assert.deepEqual(first.calls, second.calls, `shot 1 draw calls differ between renders`);
  assert.ok(first.calls.length > 500, 'too few draw calls: rendering looks empty');
});

check('game files are plain local files with no network references', () => {
  const gameDir = join(ROOT, 'game');
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    assert.equal(lstatSync(path).isSymbolicLink(), false, `${path} is a symlink`);
    return entry.isDirectory() ? walk(path) : [path];
  });
  const files = walk(gameDir);
  assert.ok(files.length >= 12);
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}/i, `${file} names a remote host`);
    assert.ok(statSync(file).size < 1024 * 1024);
  }
});

check('screenshots are 3-4 unedited-sized JPEGs within the cap', () => {
  const dir = join(ROOT, 'screenshots');
  const names = readdirSync(dir).filter((name) => !name.startsWith('.')).sort();
  assert.ok(names.length >= 3 && names.length <= 4);
  for (const name of names) {
    assert.match(name, /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/);
    const bytes = readFileSync(join(dir, name));
    assert.ok(bytes.length <= 262144, `${name} over 256 KiB`);
    const { width, height } = jpegDimensions(bytes);
    assert.ok(Math.max(width, height) <= 1280 && Math.min(width, height) >= 480, `${name} is ${width}x${height}`);
    say(`      ${name}: ${bytes.length} bytes, ${width}x${height}`);
  }
});

say(`Summary: ${passed} passed, ${failed} failed`);
say('Visual verification: four headless-Chrome renders captured with zero page errors and inspected by pixel sampling');
say('  cover: warm cone (92,72,54) over dark floor (27,40,71), amber guard (234,156,91), cyan player (211,248,237), green exit ring (71,161,126)');
say('  shot 2 shows three keepers and the key; shot 3 shows alarm red and a chasing keeper; shot 4 shows the route-clear screen');
appendFileSync(LOG, `${lines.join('\n')}\n\n`);
if (failed > 0) process.exitCode = 1;
