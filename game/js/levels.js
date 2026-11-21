// Hand-authored level layouts for Hushline. Coordinates are grid cells; buildLevel turns them
// into the pixel geometry used by movement, vision and rendering.

import { FIELD, gridRect, gridX, gridY } from './config.js';

const LAYOUTS = [
  {
    name: 'GLASSHOUSE',
    brief: 'Two keepers, one lit aisle. Slip through the blue.',
    seed: 10427,
    spawn: [2, 12],
    exit: [27, 2, 2, 2],
    key: null,
    pebbles: 4,
    cover: [
      [6, 10, 2, 1, 'crate'],
      [11, 6, 1, 3, 'screen'],
      [16, 11, 2, 2, 'crate'],
      [21, 5, 3, 1, 'desk'],
      [24, 9, 1, 2, 'pillar'],
      [8, 1, 2, 1, 'desk'],
      [18, 1, 2, 1, 'crate'],
    ],
    lamps: [[5, 3, 164, 1.0], [14, 10, 182, 1.05], [23, 4, 170, 1.0]],
    shadows: [[1, 6, 3, 4], [17, 1, 3, 3], [9, 11, 4, 2]],
    guards: [
      { route: [[4, 9], [4, 4], [12, 4], [12, 9]], speed: 86, pause: 0.8, phase: 0.0, scan: 0.55 },
      { route: [[16, 3], [24, 3], [24, 8], [16, 8]], speed: 92, pause: 0.7, phase: 0.42, scan: 0.5 },
    ],
  },
  {
    name: 'LANTERN YARD',
    brief: 'A locked gate, three keepers. Cross between the lamps.',
    seed: 21881,
    spawn: [2, 2],
    exit: [27, 12, 2, 2],
    key: [15, 7],
    pebbles: 4,
    cover: [
      [4, 4, 2, 2, 'crate'],
      [4, 10, 2, 2, 'crate'],
      [9, 7, 1, 4, 'screen'],
      [13, 2, 3, 1, 'desk'],
      [13, 12, 3, 1, 'desk'],
      [18, 5, 2, 2, 'crate'],
      [23, 9, 2, 1, 'screen'],
      [25, 3, 1, 3, 'pillar'],
    ],
    lamps: [[7, 3, 160, 1.0], [15, 8, 150, 1.05], [24, 11, 172, 1.05], [20, 2, 140, 0.9]],
    shadows: [[2, 7, 2, 3], [17, 1, 3, 3], [11, 10, 3, 2], [26, 5, 2, 3]],
    guards: [
      { route: [[3, 6], [3, 12], [10, 12], [10, 6]], speed: 90, pause: 0.7, phase: 0.0, scan: 0.6 },
      { route: [[12, 4], [21, 4], [21, 8], [12, 8]], speed: 96, pause: 0.5, phase: 0.33, scan: 0.5 },
      { route: [[27, 2], [27, 12], [22, 12], [22, 2]], speed: 88, pause: 0.9, phase: 0.66, scan: 0.45 },
    ],
  },
  {
    name: 'CLOCKWORK VAULT',
    brief: 'Four keepers, a key and a short fuse. Spend the pebbles well.',
    seed: 33019,
    spawn: [2, 7],
    exit: [27, 2, 2, 2],
    key: [18, 12],
    pebbles: 3,
    cover: [
      [4, 2, 2, 2, 'crate'],
      [4, 10, 2, 2, 'crate'],
      [7, 6, 2, 1, 'screen'],
      [12, 5, 1, 3, 'pillar'],
      [12, 11, 1, 3, 'pillar'],
      [16, 5, 2, 2, 'crate'],
      [21, 9, 3, 1, 'screen'],
      [22, 4, 2, 2, 'crate'],
      [26, 10, 2, 2, 'crate'],
    ],
    lamps: [[6, 12, 160, 1.0], [14, 7, 150, 1.05], [22, 3, 150, 1.0], [27, 12, 140, 1.0]],
    shadows: [[2, 1, 3, 3], [10, 9, 3, 2], [18, 1, 3, 3], [24, 6, 2, 2]],
    guards: [
      { route: [[3, 4], [3, 12], [9, 12], [9, 4]], speed: 100, pause: 0.5, phase: 0.0, scan: 0.6 },
      { route: [[11, 3], [20, 3], [20, 8], [11, 8]], speed: 96, pause: 0.6, phase: 0.25, scan: 0.5 },
      { route: [[25, 2], [28, 2], [28, 7], [25, 7]], speed: 104, pause: 0.4, phase: 0.5, scan: 0.55 },
      { route: [[14, 13], [22, 13], [22, 10], [14, 10]], speed: 90, pause: 0.8, phase: 0.75, scan: 0.5 },
    ],
  },
];

export function levelCount() {
  return LAYOUTS.length;
}

export function buildLevel(index) {
  const layout = LAYOUTS[Math.max(0, Math.min(LAYOUTS.length - 1, index))];
  const exitRect = gridRect(...layout.exit);
  return {
    index,
    name: layout.name,
    brief: layout.brief,
    seed: layout.seed + index * 7919,
    bounds: { x: FIELD.x, y: FIELD.y, w: FIELD.width, h: FIELD.height },
    spawn: { x: gridX(layout.spawn[0]), y: gridY(layout.spawn[1]) },
    exit: {
      rect: exitRect,
      x: exitRect.x + exitRect.w / 2,
      y: exitRect.y + exitRect.h / 2,
      requiresKey: layout.key !== null,
    },
    key: layout.key ? { x: gridX(layout.key[0]), y: gridY(layout.key[1]), taken: false } : null,
    pebbles: layout.pebbles,
    cover: layout.cover.map(([gx, gy, gw, gh, style]) => ({ ...gridRect(gx, gy, gw, gh), style })),
    lamps: layout.lamps.map(([gx, gy, radius, power]) => ({ x: gridX(gx), y: gridY(gy), radius, power })),
    shadows: layout.shadows.map(([gx, gy, gw, gh]) => gridRect(gx, gy, gw, gh)),
    guards: layout.guards.map((guard, id) => ({
      ...guard,
      id,
      route: guard.route.map(([gx, gy]) => ({ x: gridX(gx), y: gridY(gy) })),
    })),
  };
}

// Used by the self-test: a patrol leg must not run through a solid cover block.
export function validatePatrols(level) {
  const problems = [];
  for (const guard of level.guards) {
    for (let i = 0; i < guard.route.length; i++) {
      const from = guard.route[i];
      const to = guard.route[(i + 1) % guard.route.length];
      for (const block of level.cover) {
        const inside = (p) => p.x > block.x && p.x < block.x + block.w && p.y > block.y && p.y < block.y + block.h;
        if (inside(from) || inside(to)) problems.push(`guard ${guard.id} waypoint ${i} inside cover`);
        const steps = 40;
        for (let s = 1; s < steps; s++) {
          const t = s / steps;
          const p = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
          if (inside(p)) problems.push(`guard ${guard.id} leg ${i} crosses cover`);
        }
      }
    }
  }
  return problems;
}
