// Small geometry toolkit: cones, line of sight, solid obstacles and sliding movement.
// Kept free of browser globals so the logic can be exercised directly in Node.

export function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

export function normalizeAngle(angle) {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function turnToward(from, to, maxStep) {
  const delta = normalizeAngle(to - from);
  return from + clamp(delta, -maxStep, maxStep);
}

export function angleSeparation(a, b) {
  return Math.abs(normalizeAngle(a - b));
}

export function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

export function rectContainsCircle(rect, x, y, radius) {
  const nearestX = clamp(x, rect.x, rect.x + rect.w);
  const nearestY = clamp(y, rect.y, rect.y + rect.h);
  return (x - nearestX) ** 2 + (y - nearestY) ** 2 < radius * radius;
}

export function circleHitsRect(x, y, radius, rects) {
  return rects.some((rect) => rectContainsCircle(rect, x, y, radius));
}

// Liang-Barsky clipping: true when the segment touches the axis-aligned rectangle.
export function segmentHitsRect(x1, y1, x2, y2, rect) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let low = 0;
  let high = 1;
  const edges = [
    [-dx, x1 - rect.x],
    [dx, rect.x + rect.w - x1],
    [-dy, y1 - rect.y],
    [dy, rect.y + rect.h - y1],
  ];
  for (const [slope, offset] of edges) {
    if (slope === 0) {
      if (offset < 0) return false;
      continue;
    }
    const t = offset / slope;
    if (slope < 0) {
      if (t > high) return false;
      if (t > low) low = t;
    } else {
      if (t < low) return false;
      if (t < high) high = t;
    }
  }
  return high >= low;
}

export function hasLineOfSight(x1, y1, x2, y2, obstacles) {
  return !obstacles.some((rect) => segmentHitsRect(x1, y1, x2, y2, rect));
}

export function pointInCone(originX, originY, facing, halfAngle, range, x, y) {
  const d = distance(originX, originY, x, y);
  if (d > range) return false;
  if (d < 1) return true;
  const bearing = Math.atan2(y - originY, x - originX);
  return angleSeparation(bearing, facing) <= halfAngle;
}

// Axis-separated sliding keeps actors from tunnelling through scenery on a frame spike.
export function slideAgainstRects(x, y, dx, dy, radius, obstacles, bounds) {
  let nextX = clamp(x + dx, bounds.x + radius, bounds.x + bounds.w - radius);
  if (circleHitsRect(nextX, y, radius, obstacles)) nextX = x;
  let nextY = clamp(y + dy, bounds.y + radius, bounds.y + bounds.h - radius);
  if (circleHitsRect(nextX, nextY, radius, obstacles)) nextY = y;
  return { x: nextX, y: nextY };
}

export function stepToward(x, y, targetX, targetY, step) {
  const d = distance(x, y, targetX, targetY);
  if (d <= step || d === 0) return { x: targetX, y: targetY, arrived: true };
  return { x: x + ((targetX - x) / d) * step, y: y + ((targetY - y) / d) * step, arrived: false };
}
