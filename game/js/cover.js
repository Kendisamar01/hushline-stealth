// Cover, lamps and shadow: what blocks a sight line and what makes the floor safe to cross.

import { clamp, hasLineOfSight, pointInRect, slideAgainstRects } from './geometry.js';

const AMBIENT_LIGHT = 0.34;

export function isInShadow(level, x, y) {
  return level.shadows.some((rect) => pointInRect(x, y, rect));
}

// Lamp falloff is squared so pools have a bright core and a soft edge. Shaded floor dims hard.
export function sampleLight(level, x, y) {
  let light = AMBIENT_LIGHT;
  for (const lamp of level.lamps) {
    const d = Math.hypot(x - lamp.x, y - lamp.y);
    if (d >= lamp.radius) continue;
    const falloff = 1 - d / lamp.radius;
    light += lamp.power * falloff * falloff * 0.95;
  }
  if (isInShadow(level, x, y)) light *= 0.38;
  return clamp(light, 0.08, 1.25);
}

export function sightBlocked(level, x1, y1, x2, y2) {
  return !hasLineOfSight(x1, y1, x2, y2, level.cover);
}

export function moveActor(level, x, y, dx, dy, radius) {
  return slideAgainstRects(x, y, dx, dy, radius, level.cover, level.bounds);
}

function convexHull(points) {
  const sorted = [...points].sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

// Each block throws a long, soft shadow away from its nearest lamp, giving readable dark lanes.
export function castShadowPolygons(level) {
  return level.cover.map((block) => {
    const cx = block.x + block.w / 2;
    const cy = block.y + block.h / 2;
    let lamp = level.lamps[0];
    let best = Infinity;
    for (const candidate of level.lamps) {
      const d = Math.hypot(cx - candidate.x, cy - candidate.y);
      if (d < best) {
        best = d;
        lamp = candidate;
      }
    }
    if (!lamp) return { points: [], alpha: 0 };
    const length = 108 + Math.min(90, best * 0.28);
    const dx = cx - lamp.x;
    const dy = cy - lamp.y;
    const size = Math.hypot(dx, dy) || 1;
    const ux = dx / size;
    const uy = dy / size;
    const corners = [
      { x: block.x, y: block.y },
      { x: block.x + block.w, y: block.y },
      { x: block.x + block.w, y: block.y + block.h },
      { x: block.x, y: block.y + block.h },
    ];
    const pushed = corners.map((p) => ({ x: p.x + ux * length, y: p.y + uy * length }));
    return { points: convexHull([...corners, ...pushed]), alpha: 0.34 };
  });
}
