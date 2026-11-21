// Entry point: create the game, wire input, then either run a fixed-step loop or draw one
// deterministic screenshot pose when ?shot=N is present.

import { VIEW } from './config.js';
import { Game } from './game.js';
import { attachInput } from './input.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('stage');
canvas.width = VIEW.width;
canvas.height = VIEW.height;
const fallback = document.getElementById('fallback');
if (fallback) fallback.remove();

const game = new Game(canvas);
attachInput(game, canvas);
window.__hushline = game;

const shotValue = new URLSearchParams(window.location.search).get('shot');
const drawReady = () => game.render();

if (shotValue !== null) {
  applyShot(game, Number(shotValue));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawReady);
  else drawReady();
} else {
  const STEP = 1 / 60;
  let previous = performance.now();
  let accumulator = 0;
  const frame = (now) => {
    accumulator += Math.min(0.1, (now - previous) / 1000);
    previous = now;
    while (accumulator >= STEP) {
      game.update(STEP);
      accumulator -= STEP;
    }
    game.render();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
