// Detection maths: whether a guard actually sees the courier, and how awareness rises and falls.

import { TUNING } from './config.js';
import { angleSeparation, clamp, distance } from './geometry.js';
import { sampleLight, sightBlocked } from './cover.js';

// A cone is a soft threshold: close to a guard, a silhouette registers even off-axis.
export function visibilityOf(guard, player, level, alarm) {
  const d = distance(guard.x, guard.y, player.x, player.y);
  const range = guard.range * (1 + alarm * 0.06);
  const half = guard.halfAngle + alarm * 0.04;
  if (d > range) return { visible: false, factor: 0, light: 0, distance: d, reason: 'range' };
  const bearing = Math.atan2(player.y - guard.y, player.x - guard.x);
  const separation = angleSeparation(bearing, guard.facing);
  const allowed = d < TUNING.peekRange ? Math.max(half, TUNING.peekHalfAngle) : half;
  if (separation > allowed) return { visible: false, factor: 0, light: 0, distance: d, reason: 'angle' };
  if (sightBlocked(level, guard.x, guard.y, player.x, player.y)) {
    return { visible: false, factor: 0, light: 0, distance: d, reason: 'cover' };
  }

  const light = sampleLight(level, player.x, player.y);
  let factor = 0.42 + light * 0.72;
  if (player.crouching) factor *= 0.56;
  factor *= player.moving ? 1.12 : 0.8;
  if (d > range * 0.72) factor *= 0.78;
  factor *= 1 + alarm * 0.25;
  return { visible: true, factor, light, distance: d, reason: 'sight' };
}

// Near misses are armed once a guard gets a good look, then fire if the courier slips away.
export function applyAwareness(guard, visibility, dt, alarm) {
  const before = guard.awareness;
  if (visibility.visible) {
    guard.awareness += TUNING.awarenessRise * visibility.factor * dt;
  } else {
    guard.awareness -= TUNING.awarenessFall * dt * (guard.state === 'chase' ? 0.35 : 1) * (1 - alarm * 0.35);
  }
  guard.awareness = clamp(guard.awareness, 0, 1);
  if (visibility.visible && guard.awareness >= TUNING.nearMissLevel) guard.nearMissArmed = true;
  const spotted = before < 1 && guard.awareness >= 1;
  let nearMiss = false;
  if (guard.nearMissArmed && !visibility.visible && guard.awareness <= TUNING.nearMissClear && guard.state !== 'chase') {
    nearMiss = true;
    guard.nearMissArmed = false;
  }
  return { spotted, nearMiss, visible: visibility.visible, gain: guard.awareness - before };
}

export function alarmLevelAfterEvents(level, events) {
  let next = level;
  for (const event of events) {
    if (event === 'spotted') next = 1;
    else if (event === 'nearMiss') next = Math.max(next, 0.72);
  }
  return clamp(next, 0, 1);
}
