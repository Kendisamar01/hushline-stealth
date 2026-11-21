// Vision cones and awareness cues. The cone is rebuilt every frame from the guard's
// current facing, so it swings with a turn and widens as suspicion grows.

import { PALETTE } from './config.js';
import { clamp } from './geometry.js';

function coneColor(heat, alpha) {
  if (heat === 0) return `rgba(255, 168, 58, ${alpha})`;
  if (heat === 1) return `rgba(255, 132, 92, ${alpha})`;
  return `rgba(255, 72, 104, ${alpha})`;
}

export function drawVisionCones(ctx, guards, time) {
  for (const guard of guards) {
    const heat = guard.heat;
    const start = guard.facing - guard.halfAngle;
    const end = guard.facing + guard.halfAngle;
    const breathe = 1 + Math.sin(time * 3.1 + guard.id) * 0.012;
    ctx.save();
    const gradient = ctx.createRadialGradient(guard.x, guard.y, 10, guard.x, guard.y, guard.range * breathe);
    gradient.addColorStop(0, coneColor(heat, heat === 0 ? 0.40 : 0.44));
    gradient.addColorStop(0.55, coneColor(heat, 0.24));
    gradient.addColorStop(1, coneColor(heat, 0.02));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.arc(guard.x, guard.y, guard.range * breathe, start, end);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = coneColor(heat, 0.58);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(start) * guard.range, guard.y + Math.sin(start) * guard.range);
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(end) * guard.range, guard.y + Math.sin(end) * guard.range);
    ctx.stroke();

    ctx.strokeStyle = coneColor(heat, 0.20);
    ctx.lineWidth = 1;
    for (const fraction of [0.35, 0.65, 0.9]) {
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, guard.range * fraction, start, end);
      ctx.stroke();
    }
    ctx.strokeStyle = coneColor(heat, 0.30);
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.facing) * guard.range, guard.y + Math.sin(guard.facing) * guard.range);
    ctx.stroke();
    ctx.restore();
  }
}

export function drawAwareness(ctx, guard) {
  const value = clamp(guard.awareness, 0, 1);
  const color = guard.heat === 2 ? PALETTE.alarm : guard.heat === 1 ? PALETTE.cone : PALETTE.inkDim;
  const cy = guard.y - 27;
  ctx.save();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(8, 14, 30, 0.85)';
  ctx.beginPath();
  ctx.arc(guard.x, cy, 10, 0, Math.PI * 2);
  ctx.stroke();
  if (value > 0.01) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(guard.x, cy, 10, -Math.PI / 2, -Math.PI / 2 + value * Math.PI * 2);
    ctx.stroke();
  }
  if (guard.heat > 0) {
    ctx.fillStyle = color;
    ctx.font = '700 13px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(guard.heat === 2 ? '!!' : '?', guard.x, cy + 4);
  }
  ctx.restore();
}

export function drawHearingRings(ctx, rings) {
  for (const ring of rings) {
    const radius = 12 + ring.progress * ring.radius;
    const alpha = (1 - ring.progress) * (ring.kind === 'pebble' ? 0.55 : 0.25);
    ctx.strokeStyle = ring.kind === 'pebble' ? `rgba(130, 235, 255, ${alpha})` : `rgba(190, 210, 255, ${alpha})`;
    ctx.lineWidth = ring.kind === 'pebble' ? 2.5 : 1.5;
    ctx.setLineDash(ring.kind === 'pebble' ? [7, 6] : [3, 5]);
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
