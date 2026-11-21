// Shared dimensions, palette and tuning values for Hushline.
// All coordinates are logical canvas pixels; the world grid maps straight onto the canvas.

export const VIEW = Object.freeze({ width: 1280, height: 720 });

export const FIELD = Object.freeze({
  x: 40,
  y: 96,
  cols: 30,
  rows: 15,
  tile: 40,
  width: 1200,
  height: 600,
});

export const PALETTE = Object.freeze({
  void: '#05070f',
  floor: '#0c1325',
  floorLight: '#141d35',
  grid: '#1b2847',
  gridBright: '#2a3a63',
  wall: '#3d4f7d',
  wallTop: '#647cae',
  wallEdge: '#9db3df',
  shadow: '#060a18',
  lamp: '#ffd79a',
  cone: '#ffc46e',
  coneAlert: '#ff6d86',
  guard: '#f2a25e',
  guardDark: '#7b452c',
  player: '#d9fff4',
  playerDark: '#3ba7a0',
  exit: '#70ffc0',
  exitDark: '#165c49',
  key: '#ffe08a',
  alarm: '#ff5470',
  ink: '#e7f0ff',
  inkDim: '#8fa6d8',
});

export const TUNING = Object.freeze({
  playerWalk: 168,
  playerSneak: 78,
  playerRadius: 11,
  guardRadius: 12,
  guardSight: 244,
  guardSightAlert: 78,
  guardHalfAngle: 0.40,
  guardHalfAngleAlert: 0.30,
  guardTurnSpeed: 2.5,
  awarenessRise: 0.66,
  awarenessFall: 0.46,
  suspicionLevel: 0.26,
  nearMissLevel: 0.52,
  nearMissClear: 0.14,
  peekRange: 34,
  peekHalfAngle: 1.20,
  hearWalk: 132,
  hearSneak: 52,
  pebbleSpeed: 560,
  pebbleRange: 380,
  pebbleNoise: 268,
  catchDistance: 22,
  chaseLoseTime: 2.6,
  searchTime: 4.2,
  alarmSeconds: 5.0,
});

export function gridX(column) {
  return FIELD.x + column * FIELD.tile + FIELD.tile / 2;
}

export function gridY(row) {
  return FIELD.y + row * FIELD.tile + FIELD.tile / 2;
}

export function gridRect(column, row, columns, rows) {
  return {
    x: FIELD.x + column * FIELD.tile,
    y: FIELD.y + row * FIELD.tile,
    w: columns * FIELD.tile,
    h: rows * FIELD.tile,
  };
}
