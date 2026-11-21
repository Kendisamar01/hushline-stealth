// Heads-up display and menu overlays, including every mouse button's hit box.

import { PALETTE, VIEW } from './config.js';
import { clamp } from './geometry.js';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

function text(ctx, value, x, y, size, color, align = 'left', weight = 500) {
  ctx.font = `${weight} ${size}px ${MONO}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
}

function panel(ctx, x, y, w, h, alpha = 0.82) {
  ctx.fillStyle = `rgba(7, 12, 26, ${alpha})`;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(105, 145, 215, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

export const BUTTONS = Object.freeze({
  begin: { id: 'begin', x: 505, y: 528, w: 270, h: 54, label: 'BEGIN THE RUN' },
  resume: { id: 'resume', x: 470, y: 510, w: 160, h: 50, label: 'RESUME' },
  retryPause: { id: 'retry', x: 650, y: 510, w: 160, h: 50, label: 'RETRY' },
  retryCaught: { id: 'retry', x: 540, y: 518, w: 200, h: 52, label: 'RETRY ROUTE' },
  next: { id: 'next', x: 540, y: 518, w: 200, h: 52, label: 'NEXT ROUTE' },
  finish: { id: 'finish', x: 540, y: 518, w: 200, h: 52, label: 'SEE RESULTS' },
  again: { id: 'again', x: 540, y: 518, w: 200, h: 52, label: 'RUN AGAIN' },
});

export function buttonsFor(game) {
  if (game.phase === 'title') return [BUTTONS.begin];
  if (game.phase === 'paused') return [BUTTONS.resume, BUTTONS.retryPause];
  if (game.phase === 'caught') return [BUTTONS.retryCaught];
  if (game.phase === 'complete') return [game.levelIndex >= game.levelTotal - 1 ? BUTTONS.finish : BUTTONS.next];
  if (game.phase === 'allClear') return [BUTTONS.again];
  return [];
}

function drawButton(ctx, button, mouse) {
  const hover = mouse.inside && mouse.x >= button.x && mouse.x <= button.x + button.w && mouse.y >= button.y && mouse.y <= button.y + button.h;
  panel(ctx, button.x, button.y, button.w, button.h, hover ? 0.98 : 0.8);
  ctx.fillStyle = hover ? 'rgba(112, 255, 192, 0.22)' : 'rgba(112, 255, 192, 0.10)';
  ctx.fillRect(button.x + 2, button.y + 2, button.w - 4, button.h - 4);
  ctx.strokeStyle = hover ? PALETTE.exit : 'rgba(112, 255, 192, 0.55)';
  ctx.lineWidth = hover ? 2 : 1;
  ctx.strokeRect(button.x + 1.5, button.y + 1.5, button.w - 3, button.h - 3);
  text(ctx, button.label, button.x + button.w / 2, button.y + button.h / 2 + 6, 16, hover ? '#ffffff' : PALETTE.exit, 'center', 700);
}

export function drawHud(ctx, game) {
  panel(ctx, 0, 0, VIEW.width, 80, 0.94);
  text(ctx, 'HUSHLINE', 26, 36, 22, PALETTE.player, 'left', 700);
  text(ctx, 'a quiet run', 26, 58, 12, PALETTE.inkDim);

  const code = `${String(game.levelIndex + 1).padStart(2, '0')} / ${String(game.levelTotal).padStart(2, '0')}`;
  text(ctx, code, 198, 34, 18, PALETTE.exit, 'left', 700);
  text(ctx, game.level.name, 198, 58, 14, PALETTE.ink, 'left', 600);

  const objective = game.level.exit.requiresKey && !game.player.hasKey ? 'FIND THE KEY' : 'REACH THE EXIT UNSEEN';
  text(ctx, objective, 640, 35, 17, PALETTE.ink, 'center', 700);
  text(ctx, game.level.brief, 640, 58, 12, PALETTE.inkDim, 'center');

  const alarm = clamp(game.alarm, 0, 1);
  text(ctx, 'ALARM', 1000, 27, 11, alarm > 0.35 ? PALETTE.alarm : PALETTE.inkDim, 'left', 700);
  ctx.fillStyle = 'rgba(30, 42, 70, 0.9)';
  ctx.fillRect(1000, 34, 150, 10);
  ctx.fillStyle = alarm > 0.5 ? PALETTE.alarm : '#ffbe7a';
  ctx.fillRect(1000, 34, 150 * alarm, 10);
  ctx.strokeStyle = 'rgba(150, 180, 230, 0.4)';
  ctx.strokeRect(1000.5, 34.5, 149, 9);

  text(ctx, `PEBBLES  ${game.pebblesLeft}`, 1000, 68, 14, PALETTE.player, 'left', 600);
  text(ctx, game.level.exit.requiresKey ? (game.player.hasKey ? 'KEY  ✓' : 'KEY  —') : 'KEY  N/A', 1160, 68, 14, game.player.hasKey ? PALETTE.key : PALETTE.inkDim, 'left', 600);
  text(ctx, game.muted ? 'MUTED (M)' : 'SOUND ON (M)', 1244, 27, 11, PALETTE.inkDim, 'right');
  text(ctx, `${Math.floor(game.elapsed / 60)}:${String(Math.floor(game.elapsed % 60)).padStart(2, '0')}`, 1244, 68, 14, PALETTE.inkDim, 'right');

  text(ctx, 'WASD / ARROWS MOVE   ·   SHIFT SNEAK   ·   SPACE PEBBLE   ·   R RETRY   ·   P PAUSE', 640, 714, 12, 'rgba(143, 166, 216, 0.8)', 'center');
}

export function drawNotices(ctx, game) {
  if (game.notice && game.notice.age < game.notice.life) {
    const alpha = clamp((game.notice.life - game.notice.age) / 0.7, 0, 1);
    const chasing = game.guards.some((guard) => guard.state === 'chase');
    const color = chasing ? PALETTE.alarm : game.notice.kind === 'good' ? PALETTE.exit : '#ffd08a';
    ctx.globalAlpha = alpha;
    panel(ctx, 400, 100, 480, 46, 0.88);
    text(ctx, game.notice.text, 640, 129, 17, color, 'center', 700);
    ctx.globalAlpha = 1;
  }
}

function dim(ctx, alpha) {
  ctx.fillStyle = `rgba(4, 7, 18, ${alpha})`;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function overlayTitle(ctx, game) {
  dim(ctx, 0.82);
  text(ctx, 'HUSHLINE', 640, 226, 74, PALETTE.player, 'center', 700);
  text(ctx, 'A QUIET RUN THROUGH THE NIGHT RELAY', 640, 264, 16, PALETTE.exit, 'center', 600);
  panel(ctx, 340, 300, 600, 176, 0.72);
  text(ctx, 'You are the courier. The relay is watched.', 640, 334, 16, PALETTE.ink, 'center');
  text(ctx, 'Keepers turn on fixed rounds. Read the cones.', 640, 364, 15, PALETTE.inkDim, 'center');
  text(ctx, 'Hide behind crates, creep through blue shadow,', 640, 392, 15, PALETTE.inkDim, 'center');
  text(ctx, 'throw a pebble to pull a keeper away, reach the exit.', 640, 420, 15, PALETTE.inkDim, 'center');
  text(ctx, 'SPACE or click to begin  ·  three routes  ·  no second chances once caught', 640, 490, 13, PALETTE.inkDim, 'center');
}

function overlayPaused(ctx) {
  dim(ctx, 0.72);
  text(ctx, 'PAUSED', 640, 330, 56, PALETTE.player, 'center', 700);
  text(ctx, 'The keepers are waiting.', 640, 372, 15, PALETTE.inkDim, 'center');
}

function overlayCaught(ctx, game) {
  dim(ctx, 0.8);
  text(ctx, 'CAUGHT', 640, 320, 68, PALETTE.alarm, 'center', 700);
  text(ctx, `A keeper held your trail on ${game.level.name}.`, 640, 364, 16, PALETTE.ink, 'center');
  text(ctx, 'Learn the round. Try the dark lanes.', 640, 396, 14, PALETTE.inkDim, 'center');
  text(ctx, 'R to retry instantly', 640, 448, 13, PALETTE.inkDim, 'center');
}

function overlayComplete(ctx, game) {
  dim(ctx, 0.56);
  text(ctx, 'ROUTE CLEAR', 640, 310, 60, PALETTE.exit, 'center', 700);
  text(ctx, `${game.level.name} slipped without a sound.`, 640, 352, 16, PALETTE.ink, 'center');
  const stats = `${Math.floor(game.elapsed / 60)}:${String(Math.floor(game.elapsed % 60)).padStart(2, '0')}   ·   spotted ${game.spotted}   ·   near misses ${game.nearMisses}`;
  text(ctx, stats, 640, 392, 15, PALETTE.inkDim, 'center');
  text(ctx, game.levelIndex >= game.levelTotal - 1 ? 'The last gate is open.' : 'The next relay is already awake.', 640, 446, 13, PALETTE.inkDim, 'center');
}

function overlayAllClear(ctx, game) {
  dim(ctx, 0.84);
  text(ctx, 'ALL ROUTES CLEAR', 640, 288, 54, PALETTE.exit, 'center', 700);
  text(ctx, 'The night relay never knew you were there.', 640, 330, 16, PALETTE.ink, 'center');
  const stats = `${game.totalTime.toFixed(1)}s total   ·   ${game.totalSpotted} sightings   ·   ${game.totalNearMisses} near misses`;
  text(ctx, stats, 640, 374, 15, PALETTE.inkDim, 'center');
  text(ctx, 'Original art, sound and code · Hushline', 640, 438, 13, PALETTE.inkDim, 'center');
}

export function drawOverlay(ctx, game) {
  if (game.phase === 'playing') return;
  if (game.phase === 'title') overlayTitle(ctx, game);
  else if (game.phase === 'paused') overlayPaused(ctx);
  else if (game.phase === 'caught') overlayCaught(ctx, game);
  else if (game.phase === 'complete') overlayComplete(ctx, game);
  else if (game.phase === 'allClear') overlayAllClear(ctx, game);
  for (const button of buttonsFor(game)) drawButton(ctx, button, game.mouse);
}
