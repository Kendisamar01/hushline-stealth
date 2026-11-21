import { FIELD } from './geometry.js';

export { FIELD };
export const VIEW = { width: 1280, height: 720 };

function wall(x, y, w, h, type) {
  return { x, y, w, h, type };
}

function shadow(x, y, rx, ry) {
  return { x, y, rx, ry };
}

function loot(x, y, name) {
  return { x, y, name, taken: false };
}

function guard(route, speed, range, fov, phase) {
  return { route, speed, range, fov, phase };
}

export const LEVELS = [
  {
    name: 'THE GLASS ATRIUM',
    tag: 'FLOOR 01 / INTAKE',
    brief: 'Two patrollers. Read the gaps, then use the crates.',
    seed: 101,
    accent: '#66e3d0',
    start: { x: 112, y: 630 },
    exit: { x: 1158, y: 146, w: 56, h: 56 },
    walls: [
      wall(230, 248, 230, 44, 'crate'),
      wall(230, 432, 230, 44, 'crate'),
      wall(540, 170, 48, 190, 'cabinet'),
      wall(540, 452, 48, 180, 'cabinet'),
      wall(660, 340, 120, 44, 'crate'),
      wall(1000, 230, 64, 64, 'pillar'),
      wall(1000, 520, 64, 64, 'pillar'),
    ],
    shadows: [
      shadow(168, 420, 96, 62),
      shadow(530, 622, 120, 54),
      shadow(900, 214, 96, 58),
      shadow(1132, 592, 92, 58),
    ],
    loot: [loot(360, 192, 'ledger'), loot(690, 610, 'cipher'), loot(1090, 396, 'seal')],
    guards: [
      guard([[500, 170], [500, 600]], 74, 250, 0.82, 0.15),
      guard([[830, 200], [1160, 200], [1160, 620], [830, 620]], 80, 265, 0.86, 0.55),
    ],
  },
  {
    name: 'THE LANTERN QUAY',
    tag: 'FLOOR 02 / DOCKS',
    brief: 'Three overlapping beats. A pebble buys you one doorway.',
    seed: 202,
    accent: '#7fb7ff',
    start: { x: 104, y: 622 },
    exit: { x: 1152, y: 620, w: 56, h: 56 },
    walls: [
      wall(210, 180, 240, 46, 'crate'),
      wall(210, 380, 240, 46, 'crate'),
      wall(210, 560, 240, 46, 'crate'),
      wall(550, 120, 50, 200, 'cabinet'),
      wall(550, 400, 50, 210, 'cabinet'),
      wall(620, 260, 110, 50, 'crate'),
      wall(980, 170, 64, 64, 'pillar'),
      wall(980, 470, 64, 64, 'pillar'),
    ],
    shadows: [
      shadow(500, 330, 96, 60),
      shadow(700, 610, 110, 50),
      shadow(910, 150, 90, 55),
      shadow(1110, 370, 80, 70),
    ],
    loot: [loot(340, 110, 'manifest'), loot(820, 590, 'tokens'), loot(1120, 250, 'relay'), loot(650, 350, 'chart')],
    guards: [
      guard([[480, 150], [480, 630]], 86, 270, 0.84, 0.1),
      guard([[670, 200], [670, 600]], 92, 250, 0.9, 0.6),
      guard([[850, 140], [1150, 140], [1150, 640], [850, 640]], 96, 280, 0.9, 0.3),
    ],
  },
  {
    name: 'THE VELVET VAULT',
    tag: 'FLOOR 03 / CORE',
    brief: 'Four eyes on the core. Move only when the cones turn away.',
    seed: 303,
    accent: '#f2b26b',
    start: { x: 94, y: 636 },
    exit: { x: 620, y: 128, w: 60, h: 60 },
    walls: [
      wall(180, 270, 250, 46, 'crate'),
      wall(180, 470, 250, 46, 'crate'),
      wall(500, 190, 46, 180, 'cabinet'),
      wall(500, 440, 46, 200, 'cabinet'),
      wall(560, 320, 110, 50, 'crate'),
      wall(950, 230, 60, 60, 'pillar'),
      wall(950, 440, 60, 60, 'pillar'),
      wall(1090, 300, 46, 220, 'cabinet'),
    ],
    shadows: [
      shadow(420, 600, 100, 52),
      shadow(420, 180, 90, 55),
      shadow(830, 620, 120, 52),
      shadow(1170, 170, 70, 60),
    ],
    loot: [loot(300, 170, 'ingot'), loot(760, 600, 'crown'), loot(1050, 560, 'key'), loot(1190, 230, 'core')],
    guards: [
      guard([[460, 150], [460, 640]], 90, 280, 0.9, 0.05),
      guard([[620, 220], [620, 650]], 96, 260, 0.9, 0.4),
      guard([[740, 180], [1160, 180], [1160, 620], [740, 620]], 100, 290, 0.95, 0.2),
      guard([[900, 260], [900, 560]], 88, 270, 0.88, 0.7),
    ],
  },
];

export function copyLevel(index) {
  const source = LEVELS[index];
  return {
    ...source,
    start: { ...source.start },
    exit: { ...source.exit },
    walls: source.walls.map((item) => ({ ...item })),
    shadows: source.shadows.map((item) => ({ ...item })),
    loot: source.loot.map((item) => ({ ...item, taken: false })),
    guards: source.guards.map((item) => ({ ...item, route: item.route.map((point) => [...point]) })),
  };
}
