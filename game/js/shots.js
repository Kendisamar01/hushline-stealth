// Fixed, reproducible poses for the four screenshots. Only the ?shot=N parameter uses these;
// the game plays normally without it.

import { gridX, gridY } from './config.js';
import { HearingRing } from './noise.js';

function poseGuard(guard, column, row, facing, awareness, state, alarm) {
  guard.x = gridX(column);
  guard.y = gridY(row);
  guard.facing = facing;
  guard.awareness = awareness;
  guard.state = state;
  guard.alarm = alarm;
  guard.interest = state === 'investigate' ? { x: guard.x, y: guard.y } : null;
  guard.lastSeen = state === 'chase' ? { x: guard.x - 100, y: guard.y } : null;
  guard.moving = state === 'patrol';
  guard.nearMissArmed = false;
  return guard;
}

export const SHOT_COUNT = 4;

export function applyShot(game, number) {
  const shot = Math.max(1, Math.min(SHOT_COUNT, number | 0));
  game.frozen = true;
  game.mouse.inside = false;
  game.input.up = game.input.down = game.input.left = game.input.right = game.input.sneak = false;
  game.phase = 'playing';
  game.loadLevel(shot <= 1 ? 0 : shot <= 2 ? 1 : 2);

  if (shot === 1) {
    game.player.x = gridX(9);
    game.player.y = gridY(11);
    game.player.facing = -0.72;
    game.player.moving = true;
    game.time = 8.4;
    poseGuard(game.guards[0], 7, 5, 0.84, 0.12, 'patrol', 0);
    poseGuard(game.guards[1], 20, 6, 2.65, 0.06, 'patrol', 0);
  } else if (shot === 2) {
    game.player.x = gridX(15);
    game.player.y = gridY(8);
    game.player.facing = 0.35;
    game.player.crouching = true;
    game.alarm = 0.22;
    game.time = 14.2;
    poseGuard(game.guards[0], 8, 9, 0.05, 0.38, 'suspicious', 0.22);
    poseGuard(game.guards[1], 17, 4, 1.55, 0.14, 'patrol', 0.22);
    poseGuard(game.guards[2], 25, 10, -1.45, 0.08, 'patrol', 0.22);
  } else if (shot === 3) {
    game.player.x = gridX(16);
    game.player.y = gridY(8);
    game.player.facing = -1.1;
    game.player.moving = true;
    game.alarm = 1;
    game.time = 22.6;
    poseGuard(game.guards[0], 8, 10, 0.32, 0.44, 'suspicious', 1);
    poseGuard(game.guards[1], 19, 8, Math.PI, 1, 'chase', 1);
    poseGuard(game.guards[2], 26, 4, 2.18, 0.18, 'patrol', 1);
    poseGuard(game.guards[3], 18, 12, -1.5, 0.3, 'investigate', 1);
    const ring = new HearingRing(game.player.x, game.player.y, 220, 'pebble');
    ring.age = 0.32;
    game.rings.push(ring);
    game.pebblesLeft = 2;
    game.showNotice('SPOTTED — BREAK LINE OF SIGHT', 'warn', 3.2);
    game.notice.age = 0.25;
  } else {
    game.player.x = game.level.exit.x;
    game.player.y = game.level.exit.y;
    game.player.hasKey = true;
    game.level.key.taken = true;
    game.phase = 'complete';
    game.time = 30.4;
    game.elapsed = 74.3;
    game.spotted = 0;
    game.nearMisses = 2;
    poseGuard(game.guards[0], 7, 7, 0.5, 0.08, 'patrol', 0);
    poseGuard(game.guards[1], 17, 5, 1.4, 0.12, 'patrol', 0);
    poseGuard(game.guards[2], 26, 6, -1.2, 0.06, 'patrol', 0);
    poseGuard(game.guards[3], 19, 12, 0.2, 0.1, 'patrol', 0);
  }
  return game;
}
