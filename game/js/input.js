// Browser input wiring: keyboard states and canvas-space mouse coordinates.

import { VIEW } from './config.js';

const HANDLED = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyR', 'KeyP', 'KeyM',
  'ShiftLeft', 'ShiftRight',
]);

function canvasPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * VIEW.width,
    y: ((event.clientY - rect.top) / rect.height) * VIEW.height,
  };
}

export function attachInput(game, canvas) {
  window.addEventListener('keydown', (event) => {
    if (!HANDLED.has(event.code)) return;
    event.preventDefault();
    if (event.repeat) return;
    game.onKeyDown(event.code);
  });

  window.addEventListener('keyup', (event) => {
    if (!HANDLED.has(event.code)) return;
    event.preventDefault();
    game.onKeyUp(event.code);
  });

  canvas.addEventListener('mousemove', (event) => {
    const point = canvasPoint(canvas, event);
    game.mouse.x = point.x;
    game.mouse.y = point.y;
    game.mouse.inside = true;
  });

  canvas.addEventListener('mouseleave', () => {
    game.mouse.inside = false;
  });

  canvas.addEventListener('mousedown', (event) => {
    event.preventDefault();
    const point = canvasPoint(canvas, event);
    if (event.button === 0) game.onMouseDown(point.x, point.y);
  });

  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  window.addEventListener('blur', () => {
    game.input.up = game.input.down = game.input.left = game.input.right = game.input.sneak = false;
  });
}
