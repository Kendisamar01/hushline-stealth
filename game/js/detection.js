import { angleGap, angleTo, distance, lineOfSightClear } from './geometry.js';

export const SHADE_RADIUS = 54;

export function insideShade(world, x, y) {
  for (const area of world.level.shadows) {
    const dx = (x - area.x) / area.rx;
    const dy = (y - area.y) / area.ry;
    if (dx * dx + dy * dy <= 1) return true;
  }
  return false;
}

export function playerIsHidden(world, guard, player) {
  if (!insideShade(world, player.x, player.y)) return false;
  if (distance(guard.x, guard.y, player.x, player.y) < SHADE_RADIUS) return false;
  return player.sneaking || player.speed < 30;
}

export function guardSeesPlayer(world, guard, player) {
  const gap = distance(guard.x, guard.y, player.x, player.y);
  if (gap > guard.range * (1 + guard.awareness * 0.12)) return false;
  const spread = guard.fov * (1 + guard.awareness * 0.14);
  if (angleGap(guard.angle, angleTo(guard.x, guard.y, player.x, player.y)) > spread / 2) return false;
  if (!lineOfSightClear(world.level.walls, guard.x, guard.y, player.x, player.y)) return false;
  if (playerIsHidden(world, guard, player)) return false;
  return true;
}

export function suspicionGain(world, guard, player) {
  const gap = distance(guard.x, guard.y, player.x, player.y);
  const closeness = 1 - gap / guard.range;
  let gain = 0.5 + closeness * 1.05;
  if (player.sneaking) gain *= 0.42;
  if (player.running) gain *= 1.35;
  if (insideShade(world, player.x, player.y)) gain *= 0.65;
  return gain;
}
