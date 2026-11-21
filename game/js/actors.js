// Actors on the floor: keepers, the courier, pebbles in flight and the aiming reticle.

import { PALETTE, TUNING } from './config.js';

export function drawGuards(ctx, guards, time) {
  for (const guard of guards) {
    ctx.save();
    ctx.translate(guard.x, guard.y);
    ctx.fillStyle = 'rgba(2, 5, 14, 0.5)';
    ctx.beginPath();
    ctx.ellipse(2, 7, 15, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(guard.facing);
    const body = guard.heat === 2 ? '#ff7d84' : guard.heat === 1 ? '#ffb26f' : PALETTE.guard;
    ctx.fillStyle = PALETTE.guardDark;
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2b1c1a';
    ctx.beginPath();
    ctx.moveTo(5, -7);
    ctx.lineTo(16, 0);
    ctx.lineTo(5, 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffe9c2';
    ctx.beginPath();
    ctx.arc(12, 0, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 235, 200, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 12, -0.8, 0.8);
    ctx.stroke();
    ctx.restore();

    if (guard.moving) {
      const sway = Math.sin(time * 11 + guard.id) * 2;
      ctx.strokeStyle = 'rgba(255, 186, 120, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(guard.x - 9 + sway, guard.y + 11);
      ctx.lineTo(guard.x - 13 + sway, guard.y + 15);
      ctx.moveTo(guard.x + 5 - sway, guard.y + 11);
      ctx.lineTo(guard.x + 9 - sway, guard.y + 15);
      ctx.stroke();
    }
  }
}

export function drawPlayer(ctx, player, time) {
  const scale = player.crouching ? 0.78 : 1;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.fillStyle = 'rgba(2, 5, 14, 0.55)';
  ctx.beginPath();
  ctx.ellipse(2, 7, 14 * scale, 7 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  if (player.crouching) {
    ctx.strokeStyle = 'rgba(110, 230, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.rotate(player.facing);
  ctx.fillStyle = PALETTE.playerDark;
  ctx.beginPath();
  ctx.moveTo(-13 * scale, -8 * scale);
  ctx.lineTo(3 * scale, -11 * scale);
  ctx.lineTo(12 * scale, 0);
  ctx.lineTo(3 * scale, 11 * scale);
  ctx.lineTo(-13 * scale, 8 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(1 * scale, 0, 8 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0d2c39';
  ctx.beginPath();
  ctx.arc(6 * scale, 0, 2.6 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(216, 255, 246, 0.65)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, 15 * scale, -0.7, 0.7);
  ctx.stroke();
  ctx.restore();

  const pulse = 0.3 + Math.sin(time * 4) * 0.1;
  ctx.strokeStyle = `rgba(150, 255, 235, ${pulse})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(player.x, player.y, TUNING.playerRadius + 5, 0, Math.PI * 2);
  ctx.stroke();
}

export function drawPebbles(ctx, pebbles) {
  for (const pebble of pebbles) {
    if (pebble.landed) continue;
    ctx.fillStyle = 'rgba(160, 240, 255, 0.28)';
    ctx.beginPath();
    ctx.arc(pebble.x, pebble.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d8fbff';
    ctx.beginPath();
    ctx.arc(pebble.x, pebble.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawAim(ctx, player, mouse, pebblesLeft, active) {
  if (!active || pebblesLeft <= 0 || !mouse.inside) return;
  const dx = mouse.x - player.x;
  const dy = mouse.y - player.y;
  const d = Math.hypot(dx, dy) || 1;
  const range = Math.min(d, TUNING.pebbleRange);
  ctx.strokeStyle = 'rgba(150, 235, 255, 0.34)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 8]);
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(player.x + (dx / d) * range, player.y + (dy / d) * range);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(190, 245, 255, 0.75)';
  ctx.beginPath();
  ctx.arc(mouse.x, mouse.y, 8, 0, Math.PI * 2);
  ctx.moveTo(mouse.x - 13, mouse.y);
  ctx.lineTo(mouse.x - 10, mouse.y);
  ctx.moveTo(mouse.x + 10, mouse.y);
  ctx.lineTo(mouse.x + 13, mouse.y);
  ctx.moveTo(mouse.x, mouse.y - 13);
  ctx.lineTo(mouse.x, mouse.y - 10);
  ctx.moveTo(mouse.x, mouse.y + 10);
  ctx.lineTo(mouse.x, mouse.y + 13);
  ctx.stroke();
}
