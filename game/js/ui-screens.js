import { VIEW } from './levels.js';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const DISPLAY = 'Trebuchet MS, Arial, sans-serif';

function label(ctx, content, x, y, size, color, weight, align, family = MONO) {
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(content, x, y);
}

function panel(ctx, x, y, width, height, border) {
  ctx.fillStyle = 'rgba(5, 13, 22, 0.93)';
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 14);
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 2;
  ctx.stroke();
}

export function drawTitleScreen(ctx, time) {
  ctx.fillStyle = 'rgba(3, 9, 16, 0.62)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  panel(ctx, 208, 148, 864, 436, 'rgba(102, 227, 208, 0.65)');
  label(ctx, 'HUSHLINE', VIEW.width / 2, 226, 64, '#eafff8', '800', 'center', DISPLAY);
  label(ctx, 'N I G H T S', VIEW.width / 2, 288, 24, '#66e3d0', '700', 'center', DISPLAY);
  ctx.strokeStyle = 'rgba(102, 227, 208, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(360, 318);
  ctx.lineTo(920, 318);
  ctx.stroke();
  label(ctx, 'STEAL THE SEALS. CROSS THE FLOORS. LEAVE UNSEEN.', VIEW.width / 2, 346, 15, '#cfe6e6', '600', 'center');
  const pulse = 0.6 + 0.4 * Math.sin(time * 3);
  label(ctx, 'PRESS ENTER OR CLICK TO SLIP IN', VIEW.width / 2, 404, 20, `rgba(255, 221, 150, ${pulse})`, '800', 'center', DISPLAY);
  label(ctx, 'WASD / ARROWS  MOVE      SHIFT  SNEAK      F  SPRINT', VIEW.width / 2, 474, 13, 'rgba(183, 208, 217, 0.9)', '600', 'center');
  label(ctx, 'SPACE / CLICK  THROW PEBBLE      P  PAUSE      R  RETRY      M  MUTE', VIEW.width / 2, 502, 13, 'rgba(183, 208, 217, 0.9)', '600', 'center');
  label(ctx, 'STAY OUT OF THE CONES. SHADE HIDES A QUIET THIEF.', VIEW.width / 2, 548, 13, '#8fe6d6', '700', 'center');
}

export function drawCaughtScreen(ctx, world) {
  ctx.fillStyle = 'rgba(60, 4, 12, 0.5)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  panel(ctx, 340, 206, 600, 308, 'rgba(255, 88, 98, 0.8)');
  label(ctx, 'CAUGHT', VIEW.width / 2, 286, 66, '#ff737c', '800', 'center', DISPLAY);
  label(ctx, 'A guard held you in the light.', VIEW.width / 2, 348, 16, '#f5d9da', '600', 'center');
  label(ctx, `${world.level.name}  //  ${world.collected}/${world.totalLoot} seals`, VIEW.width / 2, 390, 13, 'rgba(245, 217, 218, 0.8)', '600', 'center');
  label(ctx, 'R OR CLICK TO TRY AGAIN', VIEW.width / 2, 452, 20, '#ffd0a0', '800', 'center', DISPLAY);
}

export function drawClearScreen(ctx, world) {
  panel(ctx, 340, 216, 600, 288, 'rgba(102, 227, 208, 0.8)');
  label(ctx, 'FLOOR CLEAR', VIEW.width / 2, 294, 54, '#a9f7e6', '800', 'center', DISPLAY);
  label(ctx, `${world.level.name}  ·  ${world.collected} seals recovered`, VIEW.width / 2, 356, 16, '#d7efeb', '600', 'center');
  label(ctx, `ALARM LEFT BEHIND  ${Math.round(world.alarm * 100)}%`, VIEW.width / 2, 392, 13, 'rgba(190, 226, 220, 0.8)', '600', 'center');
  label(ctx, 'ENTER OR CLICK TO DESCEND', VIEW.width / 2, 456, 19, '#ffd99b', '800', 'center', DISPLAY);
}

export function drawWinScreen(ctx, world) {
  ctx.fillStyle = 'rgba(4, 12, 18, 0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  panel(ctx, 280, 160, 720, 412, 'rgba(255, 211, 105, 0.8)');
  label(ctx, 'THE NIGHT IS YOURS', VIEW.width / 2, 240, 48, '#ffdf94', '800', 'center', DISPLAY);
  label(ctx, 'THREE FLOORS. EVERY SEAL. NO ALARM THAT MATTERED.', VIEW.width / 2, 304, 15, '#f4e8cc', '600', 'center');
  label(ctx, '3 FLOORS CLEARED', VIEW.width / 2, 360, 18, '#ffe8b5', '700', 'center');
  label(ctx, `CLOSEST CALL  ${Math.round(world.closestCall * 100)}%   ·   FINAL ALARM  ${Math.round(world.alarm * 100)}%`, VIEW.width / 2, 400, 13, 'rgba(244, 232, 204, 0.82)', '600', 'center');
  label(ctx, 'ENTER OR CLICK TO PLAY AGAIN', VIEW.width / 2, 488, 19, '#ffd99b', '800', 'center', DISPLAY);
}

export function drawPausedScreen(ctx) {
  ctx.fillStyle = 'rgba(3, 10, 17, 0.68)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  panel(ctx, 440, 280, 400, 160, 'rgba(159, 245, 224, 0.7)');
  label(ctx, 'PAUSED', VIEW.width / 2, 336, 44, '#bdf5e7', '800', 'center', DISPLAY);
  label(ctx, 'P OR CLICK TO RESUME', VIEW.width / 2, 398, 15, '#ffd99b', '700', 'center');
}
