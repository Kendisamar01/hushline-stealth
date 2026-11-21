export const TAU = Math.PI * 2;
export const FIELD = { x: 52, y: 118, w: 1176, h: 570 };

export function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

export function lerp(from, to, amount) {
  return from + (to - from) * amount;
}

export function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

export function normalizeAngle(angle) {
  let result = angle % TAU;
  if (result > Math.PI) result -= TAU;
  if (result < -Math.PI) result += TAU;
  return result;
}

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

export function angleGap(first, second) {
  return Math.abs(normalizeAngle(first - second));
}

export function turnToward(current, target, maxStep) {
  const difference = normalizeAngle(target - current);
  return current + clamp(difference, -maxStep, maxStep);
}

export function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

export function circleHitsRect(x, y, radius, rect) {
  const nearestX = clamp(x, rect.x, rect.x + rect.w);
  const nearestY = clamp(y, rect.y, rect.y + rect.h);
  return distance(x, y, nearestX, nearestY) < radius;
}

export function segmentHitsRect(x1, y1, x2, y2, rect) {
  let enter = 0;
  let leave = 1;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const bounds = [
    [-dx, x1 - rect.x],
    [dx, rect.x + rect.w - x1],
    [-dy, y1 - rect.y],
    [dy, rect.y + rect.h - y1],
  ];
  for (const [slope, offset] of bounds) {
    if (slope === 0) {
      if (offset < 0) return false;
      continue;
    }
    const crossing = offset / slope;
    if (slope < 0) {
      if (crossing > leave) return false;
      if (crossing > enter) enter = crossing;
    } else {
      if (crossing < enter) return false;
      if (crossing < leave) leave = crossing;
    }
  }
  return true;
}

export function lineOfSightClear(walls, x1, y1, x2, y2) {
  for (const wall of walls) {
    if (segmentHitsRect(x1, y1, x2, y2, wall)) return false;
  }
  return true;
}

export function rayDistanceToRect(ox, oy, dx, dy, rect) {
  if (pointInRect(ox, oy, rect)) return 0;
  let nearest = Infinity;
  if (dx > 0) {
    const time = (rect.x - ox) / dx;
    const y = oy + dy * time;
    if (time > 0 && y >= rect.y && y <= rect.y + rect.h) nearest = Math.min(nearest, time);
  } else if (dx < 0) {
    const time = (rect.x + rect.w - ox) / dx;
    const y = oy + dy * time;
    if (time > 0 && y >= rect.y && y <= rect.y + rect.h) nearest = Math.min(nearest, time);
  }
  if (dy > 0) {
    const time = (rect.y - oy) / dy;
    const x = ox + dx * time;
    if (time > 0 && x >= rect.x && x <= rect.x + rect.w) nearest = Math.min(nearest, time);
  } else if (dy < 0) {
    const time = (rect.y + rect.h - oy) / dy;
    const x = ox + dx * time;
    if (time > 0 && x >= rect.x && x <= rect.x + rect.w) nearest = Math.min(nearest, time);
  }
  return nearest;
}

export function castRay(ox, oy, angle, range, walls) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let hit = range;
  for (const wall of walls) {
    const time = rayDistanceToRect(ox, oy, dx, dy, wall);
    if (time > 0 && time < hit) hit = time;
  }
  return hit;
}

export function conePolygon(guard, walls, rayCount = 28) {
  const spread = guard.fov * (1 + guard.awareness * 0.14);
  const range = guard.range * (1 + guard.awareness * 0.12);
  const points = [[guard.x, guard.y]];
  for (let index = 0; index <= rayCount; index += 1) {
    const angle = guard.angle - spread / 2 + (spread * index) / rayCount;
    const reach = Math.max(0, castRay(guard.x, guard.y, angle, range, walls) - 2);
    points.push([guard.x + Math.cos(angle) * reach, guard.y + Math.sin(angle) * reach]);
  }
  return points;
}
