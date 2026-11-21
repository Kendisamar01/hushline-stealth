// Painting the world: tiled floor, lamp pools, cast shadows, readable cover, key and exit.

import { FIELD, PALETTE } from './config.js';
import { castShadowPolygons } from './cover.js';
import { makeRng } from './rng.js';

const sceneryCache = new WeakMap();

function sceneryFor(level) {
  let cached = sceneryCache.get(level);
  if (cached) return cached;
  const rng = makeRng(level.seed);
  const flecks = [];
  for (let i = 0; i < 190; i++) {
    flecks.push({
      x: FIELD.x + rng() * FIELD.width,
      y: FIELD.y + rng() * FIELD.height,
      size: rng() < 0.82 ? 1 : 2,
      alpha: 0.05 + rng() * 0.11,
    });
  }
  cached = { flecks, castShadows: castShadowPolygons(level) };
  sceneryCache.set(level, cached);
  return cached;
}

function polygon(ctx, points) {
  if (points.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
}

export function drawFloor(ctx, level, time) {
  const { x, y, w, h } = level.bounds;
  const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
  gradient.addColorStop(0, '#0b1224');
  gradient.addColorStop(0.5, PALETTE.floor);
  gradient.addColorStop(1, '#0a1020');
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w, h);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = PALETTE.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let col = 0; col <= FIELD.cols; col++) {
    ctx.moveTo(x + col * FIELD.tile + 0.5, y);
    ctx.lineTo(x + col * FIELD.tile + 0.5, y + h);
  }
  for (let row = 0; row <= FIELD.rows; row++) {
    ctx.moveTo(x, y + row * FIELD.tile + 0.5);
    ctx.lineTo(x + w, y + row * FIELD.tile + 0.5);
  }
  ctx.stroke();

  const scenery = sceneryFor(level);
  for (const fleck of scenery.flecks) {
    ctx.fillStyle = `rgba(150, 190, 255, ${fleck.alpha})`;
    ctx.fillRect(fleck.x, fleck.y, fleck.size, fleck.size);
  }

  for (const shadow of scenery.castShadows) {
    ctx.fillStyle = `rgba(4, 8, 20, ${shadow.alpha})`;
    polygon(ctx, shadow.points);
    ctx.fill();
  }

  for (const rect of level.shadows) {
    ctx.fillStyle = 'rgba(5, 9, 24, 0.58)';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = 'rgba(96, 164, 210, 0.20)';
    ctx.setLineDash([4, 8]);
    ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
    ctx.setLineDash([]);
  }

  for (const lamp of level.lamps) {
    const pulse = 1 + Math.sin(time * 1.3 + lamp.x * 0.01) * 0.015;
    const glow = ctx.createRadialGradient(lamp.x, lamp.y, 4, lamp.x, lamp.y, lamp.radius * pulse);
    glow.addColorStop(0, 'rgba(255, 216, 150, 0.34)');
    glow.addColorStop(0.45, 'rgba(255, 196, 122, 0.13)');
    glow.addColorStop(1, 'rgba(255, 190, 110, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, lamp.radius * pulse, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.strokeStyle = PALETTE.wall;
  ctx.lineWidth = 3;
  ctx.strokeRect(x - 1.5, y - 1.5, w + 3, h + 3);
  ctx.strokeStyle = 'rgba(125, 165, 235, 0.28)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 6.5, y - 6.5, w + 13, h + 13);
}

export function drawLampFixtures(ctx, level, time) {
  for (const lamp of level.lamps) {
    const flicker = 0.85 + Math.sin(time * 4.7 + lamp.y) * 0.1;
    ctx.fillStyle = `rgba(255, 224, 170, ${flicker})`;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 214, 140, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(lamp.x - 12, lamp.y);
    ctx.lineTo(lamp.x + 12, lamp.y);
    ctx.moveTo(lamp.x, lamp.y - 12);
    ctx.lineTo(lamp.x, lamp.y + 12);
    ctx.stroke();
  }
}

function drawCrate(ctx, rect) {
  ctx.fillStyle = PALETTE.wall;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = PALETTE.wallTop;
  ctx.fillRect(rect.x + 3, rect.y + 3, rect.w - 6, rect.h - 10);
  ctx.strokeStyle = PALETTE.wallEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
  ctx.strokeStyle = 'rgba(12, 20, 42, 0.72)';
  ctx.beginPath();
  ctx.moveTo(rect.x + 5, rect.y + 6);
  ctx.lineTo(rect.x + rect.w - 5, rect.y + rect.h - 12);
  ctx.moveTo(rect.x + rect.w - 5, rect.y + 6);
  ctx.lineTo(rect.x + 5, rect.y + rect.h - 12);
  ctx.stroke();
}

function drawScreen(ctx, rect) {
  ctx.fillStyle = '#222f50';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = PALETTE.wallTop;
  ctx.fillRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
  ctx.fillStyle = '#101a34';
  for (let x = rect.x + 6; x < rect.x + rect.w - 3; x += 9) ctx.fillRect(x, rect.y + 6, 3, rect.h - 12);
  ctx.strokeStyle = PALETTE.wallEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
}

function drawDesk(ctx, rect) {
  ctx.fillStyle = '#26345a';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = PALETTE.wallTop;
  ctx.fillRect(rect.x + 2, rect.y + 2, rect.w - 4, 10);
  ctx.strokeStyle = 'rgba(157, 179, 223, 0.65)';
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
  ctx.strokeStyle = 'rgba(10, 16, 36, 0.7)';
  for (let x = rect.x + 8; x < rect.x + rect.w - 8; x += 24) {
    ctx.strokeRect(x, rect.y + 17, 18, Math.max(8, rect.h - 24));
  }
}

function drawPillar(ctx, rect) {
  ctx.fillStyle = '#2a375d';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = PALETTE.wallTop;
  ctx.fillRect(rect.x + 4, rect.y + 4, rect.w - 8, rect.h - 8);
  ctx.fillStyle = '#101832';
  ctx.fillRect(rect.x + 10, rect.y + 10, rect.w - 20, rect.h - 20);
  ctx.strokeStyle = PALETTE.wallEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
}

export function drawCover(ctx, level) {
  for (const block of level.cover) {
    ctx.fillStyle = 'rgba(2, 5, 14, 0.55)';
    ctx.fillRect(block.x + 4, block.y + 6, block.w, block.h);
    if (block.style === 'screen') drawScreen(ctx, block);
    else if (block.style === 'desk') drawDesk(ctx, block);
    else if (block.style === 'pillar') drawPillar(ctx, block);
    else drawCrate(ctx, block);
  }
}

export function drawKey(ctx, level, time) {
  const key = level.key;
  if (!key || key.taken) return;
  const bob = Math.sin(time * 3) * 4;
  ctx.save();
  ctx.translate(key.x, key.y + bob);
  ctx.shadowColor = PALETTE.key;
  ctx.shadowBlur = 18;
  ctx.fillStyle = PALETTE.key;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(11, 0);
  ctx.lineTo(0, 12);
  ctx.lineTo(-11, 0);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#2a2410';
  ctx.fillRect(-2, -5, 4, 10);
  ctx.font = '700 11px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.key;
  ctx.fillText('KEY', 0, -22);
  ctx.restore();
}

export function drawExit(ctx, level, time, unlocked, playerNear) {
  const { x, y } = level.exit;
  const pulse = 1 + Math.sin(time * 3.4) * 0.07;
  const color = unlocked ? PALETTE.exit : '#b07f6a';
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = unlocked ? 1 : 0.72;
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = playerNear ? 42 : 22;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 34 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 44 * pulse, -0.5, 0.5);
  ctx.arc(0, 0, 44 * pulse, Math.PI - 0.5, Math.PI + 0.5);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = unlocked ? 'rgba(112, 255, 192, 0.22)' : 'rgba(176, 127, 106, 0.14)';
  ctx.fillRect(-16, -16, 32, 32);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(-16, -16, 32, 32);
  ctx.rotate(-Math.PI / 4);
  ctx.textAlign = 'center';
  ctx.font = '700 12px ui-monospace, monospace';
  ctx.fillStyle = color;
  ctx.fillText(unlocked ? 'EXIT' : 'LOCKED', 0, -54);
  if (!unlocked) {
    ctx.font = '700 14px ui-monospace, monospace';
    ctx.fillText('◇', 0, 5);
  }
  ctx.restore();
}
