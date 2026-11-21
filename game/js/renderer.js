import { conePolygon, FIELD } from './geometry.js';
import { VIEW } from './levels.js';
import { SCREEN } from './screens.js';
import { drawHud } from './hud.js';
import {
  drawCaughtScreen,
  drawClearScreen,
  drawPausedScreen,
  drawTitleScreen,
  drawWinScreen,
} from './ui-screens.js';

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

function drawFloor(ctx, world) {
  const field = FIELD;
  const gradient = ctx.createLinearGradient(field.x, field.y, field.x + field.w, field.y + field.h);
  gradient.addColorStop(0, '#122330');
  gradient.addColorStop(0.55, '#0d1a25');
  gradient.addColorStop(1, '#101e2a');
  ctx.fillStyle = gradient;
  ctx.fillRect(field.x, field.y, field.w, field.h);
  ctx.strokeStyle = 'rgba(126, 194, 204, 0.055)';
  ctx.lineWidth = 1;
  for (let x = field.x; x <= field.x + field.w; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, field.y);
    ctx.lineTo(x, field.y + field.h);
    ctx.stroke();
  }
  for (let y = field.y; y <= field.y + field.h; y += 48) {
    ctx.beginPath();
    ctx.moveTo(field.x, y);
    ctx.lineTo(field.x + field.w, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(120, 220, 210, 0.22)';
  ctx.lineWidth = 2;
  ctx.strokeRect(field.x + 1, field.y + 1, field.w - 2, field.h - 2);
  label(ctx, `${world.level.tag}  //  ${world.level.name}`, field.x + 16, field.y + 18, 12, 'rgba(148, 190, 199, 0.35)');
  label(ctx, 'HUSHLINE SECURITY GRID', field.x + field.w - 16, field.y + field.h - 14, 11, 'rgba(148, 190, 199, 0.22)', '500', 'right');
}

function drawShadows(ctx, world) {
  for (const area of world.level.shadows) {
    const glow = ctx.createRadialGradient(area.x, area.y, 4, area.x, area.y, Math.max(area.rx, area.ry));
    glow.addColorStop(0, 'rgba(1, 6, 12, 0.92)');
    glow.addColorStop(0.68, 'rgba(2, 9, 16, 0.72)');
    glow.addColorStop(1, 'rgba(3, 12, 20, 0)');
    ctx.save();
    ctx.translate(area.x, area.y);
    ctx.scale(area.rx, area.ry);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.setLineDash([7, 8]);
    ctx.strokeStyle = 'rgba(92, 211, 197, 0.32)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(area.x, area.y, area.rx * 0.94, area.ry * 0.9, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    label(ctx, 'SHADE', area.x, area.y - area.ry * 0.62, 9, 'rgba(112, 222, 209, 0.5)', '600', 'center');
  }
}

function drawWall(ctx, wall) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
  rounded(ctx, wall.x + 5, wall.y + 7, wall.w, wall.h, 6);
  ctx.fill();
  if (wall.type === 'crate') {
    const wood = ctx.createLinearGradient(wall.x, wall.y, wall.x, wall.y + wall.h);
    wood.addColorStop(0, '#987046');
    wood.addColorStop(0.5, '#73512f');
    wood.addColorStop(1, '#4e381f');
    ctx.fillStyle = wood;
    rounded(ctx, wall.x, wall.y, wall.w, wall.h, 5);
    ctx.fill();
    ctx.strokeStyle = '#c49a61';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(31, 20, 10, 0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(wall.x + 8, wall.y + wall.h * 0.5);
    ctx.lineTo(wall.x + wall.w - 8, wall.y + wall.h * 0.5);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 220, 160, 0.55)';
    for (const corner of [[wall.x + 8, wall.y + 8], [wall.x + wall.w - 8, wall.y + 8], [wall.x + 8, wall.y + wall.h - 8], [wall.x + wall.w - 8, wall.y + wall.h - 8]]) {
      ctx.beginPath();
      ctx.arc(corner[0], corner[1], 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (wall.type === 'cabinet') {
    ctx.fillStyle = '#263b4e';
    rounded(ctx, wall.x, wall.y, wall.w, wall.h, 5);
    ctx.fill();
    ctx.strokeStyle = '#74a7bb';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#38556a';
    ctx.fillRect(wall.x + 5, wall.y + 5, wall.w - 10, wall.h - 10);
    ctx.fillStyle = '#9adcd2';
    ctx.fillRect(wall.x + 5, wall.y + 5, wall.w - 10, 3);
    ctx.fillStyle = 'rgba(8, 17, 25, 0.85)';
    for (let slot = 18; slot < wall.h - 12; slot += 28) ctx.fillRect(wall.x + 9, wall.y + slot, wall.w - 18, 4);
  } else {
    ctx.fillStyle = '#354556';
    rounded(ctx, wall.x, wall.y, wall.w, wall.h, 8);
    ctx.fill();
    ctx.strokeStyle = '#8fa6b8';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#5a7082';
    ctx.beginPath();
    ctx.ellipse(wall.x + wall.w / 2, wall.y + wall.h / 2, wall.w * 0.34, wall.h * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(16, 27, 37, 0.7)';
    ctx.lineWidth = 2;
    for (let offset = -wall.w / 2; offset < wall.w / 2; offset += 14) {
      ctx.beginPath();
      ctx.moveTo(wall.x + wall.w / 2 + offset, wall.y + 8);
      ctx.lineTo(wall.x + wall.w / 2 + offset - 10, wall.y + wall.h - 8);
      ctx.stroke();
    }
  }
}

function drawExit(ctx, world, time) {
  const exit = world.level.exit;
  const unlocked = world.exitUnlocked;
  const pulse = 0.5 + 0.5 * Math.sin(time * 3.2);
  const hue = unlocked ? '102, 240, 209' : '224, 92, 92';
  const glow = ctx.createRadialGradient(exit.x + exit.w / 2, exit.y + exit.h / 2, 4, exit.x + exit.w / 2, exit.y + exit.h / 2, 74);
  glow.addColorStop(0, `rgba(${hue}, ${unlocked ? 0.34 + pulse * 0.18 : 0.16})`);
  glow.addColorStop(1, `rgba(${hue}, 0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(exit.x - 80, exit.y - 80, exit.w + 160, exit.h + 160);
  ctx.fillStyle = unlocked ? '#123d3d' : '#3a2027';
  rounded(ctx, exit.x, exit.y, exit.w, exit.h, 8);
  ctx.fill();
  ctx.strokeStyle = `rgb(${hue})`;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.save();
  ctx.globalAlpha = unlocked ? 0.55 + pulse * 0.4 : 0.45;
  ctx.strokeStyle = `rgb(${hue})`;
  ctx.lineWidth = 3;
  const midX = exit.x + exit.w / 2;
  for (let index = 0; index < 3; index += 1) {
    const y = exit.y + 19 + index * 12;
    ctx.beginPath();
    ctx.moveTo(midX - 11, y + 7);
    ctx.lineTo(midX, y);
    ctx.lineTo(midX + 11, y + 7);
    ctx.stroke();
  }
  ctx.restore();
  label(ctx, unlocked ? 'EXIT OPEN' : 'SEALED', midX, exit.y + exit.h + 15, 10, `rgb(${hue})`, '700', 'center');
}

function drawLoot(ctx, world, time) {
  for (const item of world.level.loot) {
    if (item.taken) continue;
    const bob = Math.sin(time * 2.6 + item.x * 0.01) * 3;
    const x = item.x;
    const y = item.y + bob;
    const halo = ctx.createRadialGradient(x, y, 1, x, y, 32);
    halo.addColorStop(0, 'rgba(255, 211, 105, 0.45)');
    halo.addColorStop(1, 'rgba(255, 211, 105, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(x - 32, y - 32, 64, 64);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(time * 1.5 + item.y * 0.02) * 0.18);
    ctx.fillStyle = '#ffd369';
    ctx.strokeStyle = '#fff2c2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(10, 0);
    ctx.lineTo(0, 11);
    ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    label(ctx, item.name.toUpperCase(), x, y + 23, 9, 'rgba(255, 219, 140, 0.72)', '600', 'center');
  }
}

function drawPulses(ctx, world) {
  for (const pulse of world.noisePulses) {
    const progress = 1 - pulse.life / pulse.maxLife;
    const radius = 12 + progress * (pulse.source === 'pebble' ? 165 : 95);
    const alpha = (1 - progress) * (pulse.source === 'pebble' ? 0.75 : 0.35);
    ctx.strokeStyle = `rgba(255, 188, 92, ${alpha})`;
    ctx.lineWidth = pulse.source === 'pebble' ? 3 : 2;
    ctx.beginPath();
    ctx.arc(pulse.x, pulse.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    if (pulse.source === 'pebble') {
      ctx.fillStyle = `rgba(255, 233, 178, ${alpha})`;
      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function coneColor(guard) {
  if (guard.state === 'chase') return [255, 72, 82];
  if (guard.state === 'suspicious' || guard.state === 'search') return [255, 154, 66];
  return [255, 196, 96];
}

function drawCones(ctx, world) {
  for (const guard of world.guards) {
    const points = conePolygon(guard, world.level.walls);
    const [r, g, b] = coneColor(guard);
    const radius = guard.range * (1 + guard.awareness * 0.12);
    const fill = ctx.createRadialGradient(guard.x, guard.y, 8, guard.x, guard.y, radius);
    fill.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.34)`);
    fill.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.18)`);
    fill.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.02)`);
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let index = 1; index < points.length; index += 1) ctx.lineTo(points[index][0], points[index][1]);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawGuards(ctx, world) {
  for (const guard of world.guards) {
    const chasing = guard.state === 'chase';
    const [r, g, b] = coneColor(guard);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(guard.x + 3, guard.y + 5, 15, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#182634';
    ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.translate(guard.x, guard.y);
    ctx.rotate(guard.angle);
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.beginPath();
    ctx.moveTo(19, 0);
    ctx.lineTo(7, -6);
    ctx.lineTo(7, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f6f2e7';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (guard.awareness > 0.02) {
      ctx.strokeStyle = chasing ? '#ff515c' : '#ffc45c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, 19, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * guard.awareness);
      ctx.stroke();
    }
    const mark = chasing ? '!' : guard.state === 'patrol' ? '' : '?';
    if (mark) label(ctx, mark, guard.x, guard.y - 31, 20, chasing ? '#ff6670' : '#ffc45c', '800', 'center', DISPLAY);
  }
}

function drawPlayer(ctx, world, time) {
  const player = world.player;
  const glow = ctx.createRadialGradient(player.x, player.y, 2, player.x, player.y, 40);
  glow.addColorStop(0, 'rgba(130, 245, 224, 0.32)');
  glow.addColorStop(1, 'rgba(130, 245, 224, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(player.x - 40, player.y - 40, 80, 80);
  if (player.noise > 0.05) {
    ctx.strokeStyle = `rgba(255, 196, 96, ${player.noise * 0.5})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 18 + player.noise * 20, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle + Math.PI / 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(3, 5, 13, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = player.sneaking ? '#5bb9ae' : '#9ff5e0';
  ctx.strokeStyle = '#e8fff8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -15);
  ctx.lineTo(11, 11);
  ctx.lineTo(0, 6);
  ctx.lineTo(-11, 11);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f5fffb';
  ctx.beginPath();
  ctx.arc(0, -3, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (player.hidden) {
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(123, 245, 224, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, 'HIDDEN', player.x, player.y - 35, 10, '#9ff5e0', '700', 'center');
  }
  if (player.sneaking && Math.sin(time * 8) > 0.7) {
    label(ctx, 'sneak', player.x, player.y + 30, 9, 'rgba(159, 245, 224, 0.8)', '600', 'center');
  }
}

function drawProjectiles(ctx, world) {
  for (const shot of world.projectiles) {
    const progress = shot.age / shot.duration;
    const x = shot.x + (shot.tx - shot.x) * progress;
    const y = shot.y + (shot.ty - shot.y) * progress - Math.sin(progress * Math.PI) * 26;
    ctx.fillStyle = '#ffedc2';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, left: 0, top: 0, ratio: 1 };
  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, canvas.clientWidth || window.innerWidth);
    const height = Math.max(1, canvas.clientHeight || window.innerHeight);
    const pixelWidth = Math.round(width * ratio);
    const pixelHeight = Math.round(height * ratio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    const scale = Math.min(pixelWidth / VIEW.width, pixelHeight / VIEW.height);
    view.scale = scale;
    view.left = (pixelWidth - VIEW.width * scale) / 2;
    view.top = (pixelHeight - VIEW.height * scale) / 2;
    view.ratio = ratio;
  }
  function begin() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#050a11';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.left, view.top);
    ctx.textBaseline = 'middle';
  }
  function vignette() {
    const shade = ctx.createRadialGradient(VIEW.width / 2, VIEW.height / 2, 260, VIEW.width / 2, VIEW.height / 2, 780);
    shade.addColorStop(0, 'rgba(0, 0, 0, 0)');
    shade.addColorStop(1, 'rgba(0, 0, 0, 0.44)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 104, VIEW.width, VIEW.height - 104);
  }
  function draw(world, screen) {
    resize();
    begin();
    drawFloor(ctx, world);
    drawShadows(ctx, world);
    drawExit(ctx, world, world.time);
    drawLoot(ctx, world, world.time);
    drawPulses(ctx, world);
    drawCones(ctx, world);
    for (const wall of world.level.walls) drawWall(ctx, wall);
    drawProjectiles(ctx, world);
    drawGuards(ctx, world);
    drawPlayer(ctx, world, world.time);
    vignette();
    drawHud(ctx, world, screen);
    if (screen === SCREEN.TITLE) drawTitleScreen(ctx, world.time);
    else if (screen === SCREEN.CAUGHT) drawCaughtScreen(ctx, world);
    else if (screen === SCREEN.CLEAR) drawClearScreen(ctx, world);
    else if (screen === SCREEN.WIN) drawWinScreen(ctx, world);
    else if (screen === SCREEN.PAUSED) drawPausedScreen(ctx);
  }
  function toLogical(clientX, clientY) {
    const bounds = canvas.getBoundingClientRect();
    const pixelX = (clientX - bounds.left) * view.ratio;
    const pixelY = (clientY - bounds.top) * view.ratio;
    return { x: (pixelX - view.left) / view.scale, y: (pixelY - view.top) / view.scale };
  }
  return { draw, resize, toLogical };
}
