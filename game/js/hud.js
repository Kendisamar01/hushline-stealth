import { VIEW } from './levels.js';
import { SCREEN } from './screens.js';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const DISPLAY = 'Trebuchet MS, Arial, sans-serif';

function rounded(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function label(ctx, content, x, y, size, color, weight = '500', align = 'left', family = MONO) {
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(content, x, y);
}

function meter(ctx, x, y, width, height, value, color, caption) {
  label(ctx, caption, x, y - 10, 10, 'rgba(183, 208, 217, 0.8)', '700');
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  rounded(ctx, x, y, width, height, height / 2);
  ctx.fill();
  ctx.fillStyle = color;
  rounded(ctx, x, y, Math.max(2, width * value), height, height / 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 1;
  rounded(ctx, x, y, width, height, height / 2);
  ctx.stroke();
}

export function drawHud(ctx, world, screen) {
  ctx.fillStyle = 'rgba(5, 12, 20, 0.94)';
  ctx.fillRect(0, 0, VIEW.width, 104);
  ctx.fillStyle = world.level.accent;
  ctx.fillRect(0, 102, VIEW.width, 2);
  label(ctx, 'HUSHLINE', 30, 30, 22, '#eafff8', '800', 'left', DISPLAY);
  label(ctx, 'NIGHTS', 30, 56, 15, world.level.accent, '700', 'left', DISPLAY);
  label(ctx, world.level.tag, 28, 82, 10, 'rgba(170, 202, 211, 0.7)', '700');
  label(ctx, world.level.name, 190, 31, 17, '#e8f4f5', '700', 'left', DISPLAY);
  label(ctx, world.level.brief, 190, 55, 11, 'rgba(176, 203, 211, 0.75)');
  for (let index = 0; index < world.totalLoot; index += 1) {
    const x = 192 + index * 20;
    ctx.fillStyle = index < world.collected ? '#ffd369' : 'rgba(255, 211, 105, 0.18)';
    ctx.beginPath();
    ctx.moveTo(x, 78);
    ctx.lineTo(x + 6, 84);
    ctx.lineTo(x, 90);
    ctx.lineTo(x - 6, 84);
    ctx.closePath();
    ctx.fill();
  }
  label(ctx, world.exitUnlocked ? 'EXIT OPEN' : 'EXIT SEALED', 340, 84, 11, world.exitUnlocked ? '#78f0d0' : '#e07f7f', '800');
  meter(ctx, 500, 48, 170, 10, world.player.noise, '#f0c070', 'FOOTPRINT NOISE');
  meter(ctx, 500, 88, 170, 10, world.alarm, world.alarm > 0.6 ? '#ff5f68' : '#f0a05c', 'ALARM');
  label(ctx, 'PEBBLES', 748, 42, 10, 'rgba(183, 208, 217, 0.8)', '700');
  for (let index = 0; index < 3; index += 1) {
    const x = 748 + index * 24;
    ctx.strokeStyle = index < world.player.pebbles ? '#ffde9b' : 'rgba(255, 222, 155, 0.22)';
    ctx.fillStyle = index < world.player.pebbles ? '#ffde9b' : 'rgba(255, 222, 155, 0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, 72, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  label(ctx, 'WASD move   SHIFT sneak   F sprint   SPACE/CLICK throw   P pause   R retry   M mute', 840, 30, 10, 'rgba(183, 208, 217, 0.7)');
  label(ctx, `FLOOR ${world.levelIndex + 1}/3`, 1236, 72, 16, '#e8f4f5', '800', 'right', DISPLAY);
  if (world.alarm > 0.05) {
    ctx.fillStyle = `rgba(255, 60, 70, ${world.alarm * 0.055})`;
    ctx.fillRect(0, 104, VIEW.width, VIEW.height - 104);
  }
  if (world.nearMissFlash > 0) {
    label(ctx, 'NEAR MISS', VIEW.width / 2, 132, 24, `rgba(255, 190, 96, ${Math.min(1, world.nearMissFlash)})`, '800', 'center', DISPLAY);
  }
  if (screen === SCREEN.PLAY && world.exitUnlocked) {
    label(ctx, 'TAKE THE EXIT →', VIEW.width / 2, 682, 13, 'rgba(120, 240, 208, 0.9)', '800', 'center');
  }
}
