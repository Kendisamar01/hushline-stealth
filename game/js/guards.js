import { angleTo, circleHitsRect, clamp, distance, FIELD, turnToward } from './geometry.js';
import { guardSeesPlayer, suspicionGain } from './detection.js';
import { EVENT } from './events.js';

const BODY_RADIUS = 12;

export function createGuard(definition, index, random) {
  const route = definition.route.map((point) => [point[0], point[1]]);
  const anchor = Math.floor(definition.phase * route.length) % route.length;
  const start = route[anchor];
  const next = route[(anchor + 1) % route.length];
  return {
    id: index,
    x: start[0],
    y: start[1],
    angle: angleTo(start[0], start[1], next[0], next[1]),
    route,
    waypoint: (anchor + 1) % route.length,
    wait: 0,
    speed: definition.speed,
    range: definition.range,
    fov: definition.fov,
    awareness: 0,
    state: 'patrol',
    lastSeen: null,
    attention: null,
    searchTime: 0,
    stuckTime: 0,
    sweep: random.chance(0.5) ? 1 : -1,
    footTimer: random.range(0.1, 0.5),
    heard: [],
    nearMissCooldown: 0,
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

function stepToward(world, guard, targetX, targetY, speed, delta, turnRate) {
  const dx = targetX - guard.x;
  const dy = targetY - guard.y;
  const length = Math.hypot(dx, dy);
  if (length < 0.001) return true;
  const travel = Math.min(speed * delta, length);
  const oldX = guard.x;
  const oldY = guard.y;
  const nextX = guard.x + (dx / length) * travel;
  const nextY = guard.y + (dy / length) * travel;
  if (!blocked(world, nextX, guard.y)) guard.x = nextX;
  if (!blocked(world, guard.x, nextY)) guard.y = nextY;
  guard.angle = turnToward(guard.angle, Math.atan2(dy, dx), turnRate * delta);
  if (distance(oldX, oldY, guard.x, guard.y) < travel * 0.3) guard.stuckTime += delta;
  else guard.stuckTime = 0;
  return distance(guard.x, guard.y, targetX, targetY) < 14;
}

function advanceWaypoint(guard) {
  guard.waypoint = (guard.waypoint + 1) % guard.route.length;
  guard.wait = 0.55;
  guard.stuckTime = 0;
}

function hearPulses(world, guard, flags) {
  for (const pulse of world.noisePulses) {
    if (guard.heard.includes(pulse.id)) continue;
    const reach = 180 + pulse.strength * 420;
    if (distance(guard.x, guard.y, pulse.x, pulse.y) > reach) continue;
    guard.heard.push(pulse.id);
    if (guard.heard.length > 10) guard.heard.shift();
    guard.attention = { x: pulse.x, y: pulse.y, life: 2.6 };
    guard.awareness = clamp(guard.awareness + pulse.strength * 0.3, 0, 1);
    if (guard.state === 'patrol') guard.state = 'suspicious';
    flags |= EVENT.HEARD;
  }
  return flags;
}

function updateAwareness(world, guard, sees, flags) {
  const before = guard.awareness;
  if (sees) {
    guard.awareness = clamp(guard.awareness + suspicionGain(world, guard, world.player) * world.delta, 0, 1);
    guard.lastSeen = { x: world.player.x, y: world.player.y, age: 0 };
    guard.lostFor = 0;
    guard.attention = null;
    if (before < 1 && guard.awareness >= 1) {
      flags |= EVENT.DETECTED;
      world.alarm = clamp(world.alarm + 0.4, 0, 1);
      world.alarmHold = 2.2;
    }
    guard.state = guard.awareness >= 1 ? 'chase' : guard.awareness > 0.32 ? 'suspicious' : 'patrol';
    return flags;
  }
  guard.lostFor = (guard.lostFor ?? 0) + world.delta;
  if (guard.lastSeen) guard.lastSeen.age += world.delta;
  const decay = guard.state === 'chase' ? 0.3 : 0.44;
  guard.awareness = clamp(guard.awareness - decay * world.delta, 0, 1);
  if (before > 0.6 && guard.awareness <= 0.6 && guard.nearMissCooldown <= 0) {
    flags |= EVENT.NEAR_MISS;
    guard.nearMissCooldown = 3.5;
    world.nearMissFlash = 1.5;
    world.alarm = clamp(world.alarm + 0.16, 0, 1);
  }
  if (guard.state === 'chase' && guard.awareness < 0.72) {
    guard.state = 'search';
    guard.searchTime = 3;
  }
  if (guard.awareness <= 0.02) {
    guard.state = 'patrol';
    guard.lastSeen = null;
    guard.attention = null;
    guard.searchTime = 0;
  }
  return flags;
}

function moveByState(world, guard) {
  const delta = world.delta;
  if (guard.attention) {
    guard.attention.life -= delta;
    if (guard.attention.life <= 0) guard.attention = null;
  }
  guard.nearMissCooldown = Math.max(0, guard.nearMissCooldown - delta);
  if (guard.state === 'patrol') {
    if (guard.wait > 0) {
      guard.wait -= delta;
      const point = guard.route[guard.waypoint];
      guard.angle = turnToward(guard.angle, angleTo(guard.x, guard.y, point[0], point[1]), 2.5 * delta);
      return;
    }
    const point = guard.route[guard.waypoint];
    const arrived = stepToward(world, guard, point[0], point[1], guard.speed, delta, 3);
    if (arrived || guard.stuckTime > 0.55) advanceWaypoint(guard);
    return;
  }
  if (guard.state === 'chase') {
    const target = guard.lastSeen ?? world.player;
    const arrived = stepToward(world, guard, target.x, target.y, guard.speed * 1.5, delta, 6);
    if (arrived && !guard.lastSeen) guard.state = 'search';
    return;
  }
  if (guard.state === 'search') {
    guard.searchTime -= delta;
    const target = guard.lastSeen ?? guard.attention;
    if (target && !stepToward(world, guard, target.x, target.y, guard.speed * 0.78, delta, 3.5)) return;
    guard.angle += guard.sweep * 1.5 * delta;
    if (guard.searchTime <= 0) {
      guard.state = 'patrol';
      guard.lastSeen = null;
      guard.attention = null;
    }
    return;
  }
  const target = guard.lastSeen ?? guard.attention;
  if (!target) {
    guard.state = 'patrol';
    return;
  }
  if (!stepToward(world, guard, target.x, target.y, guard.speed * 0.6, delta, 3.2)) return;
  guard.angle += guard.sweep * 1.7 * delta;
  if (guard.awareness < 0.08) guard.state = 'patrol';
}

export function updateGuard(world, guard) {
  let flags = hearPulses(world, guard, EVENT.NONE);
  const sees = guardSeesPlayer(world, guard, world.player);
  flags = updateAwareness(world, guard, sees, flags);
  moveByState(world, guard);
  guard.footTimer -= world.delta * (guard.state === 'chase' ? 1.9 : 1);
  if (guard.footTimer <= 0) {
    guard.footTimer += 0.46;
    flags |= EVENT.FOOTSTEP;
    world.lastFootstep = { x: guard.x, y: guard.y };
  }
  if (guard.state === 'chase' && distance(guard.x, guard.y, world.player.x, world.player.y) < 23) {
    flags |= EVENT.CAUGHT;
  }
  return flags;
}
