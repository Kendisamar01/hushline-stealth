import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { createRenderer } from './renderer.js';
import { SCREEN } from './screens.js';
import { stageShot } from './shots.js';
import { advanceLevel, createWorld, EVENT, loadLevel, resetWorld, stepWorld } from './world.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.2;
const params = new URLSearchParams(window.location.search);
const seedValue = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedValue) ? seedValue : 20261121;
const shotName = params.get('shot');

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(seed);
const renderer = createRenderer(canvas);
const audio = createAudio();
const input = createInput(canvas, (x, y) => renderer.toLogical(x, y));
let screen = SCREEN.TITLE;
let accumulator = 0;
let lastFrame = 0;

function announce(message) {
  status.textContent = message;
}

function unlockAudio() {
  audio.unlock();
}

function startFloor(index) {
  loadLevel(world, index);
  screen = SCREEN.PLAY;
  accumulator = 0;
  unlockAudio();
  announce(`${world.level.name}. Find ${world.totalLoot} seals, then reach the exit unseen.`);
}

function retryFloor() {
  resetWorld(world);
  screen = SCREEN.PLAY;
  accumulator = 0;
  announce('Floor restarted.');
}

function handleEvents(flags) {
  audio.play(flags, world);
  if (flags & EVENT.LOOT) announce(`Seal recovered. ${world.collected} of ${world.totalLoot}.`);
  if (flags & EVENT.NEAR_MISS) announce('Near miss. The guards are alert.');
  if (flags & EVENT.DETECTED) announce('Spotted. Break line of sight.');
  if (flags & EVENT.CAUGHT) {
    screen = SCREEN.CAUGHT;
    announce('Caught. Press R to retry.');
  } else if (flags & EVENT.LEVEL_CLEAR) {
    screen = SCREEN.CLEAR;
    announce('Floor clear. Press Enter to descend.');
  } else if (flags & EVENT.WIN) {
    screen = SCREEN.WIN;
    announce('All floors cleared. The night is yours.');
  }
}

function handleMenu() {
  if (input.pressed('KeyM')) {
    const muted = audio.toggleMute();
    announce(muted ? 'Sound muted.' : 'Sound on.');
  }
  if (screen === SCREEN.TITLE && (input.pressed('Enter') || input.pressed('Space') || input.takeClick())) {
    startFloor(0);
    return;
  }
  if (screen === SCREEN.CAUGHT && (input.pressed('Enter') || input.pressed('KeyR') || input.takeClick())) {
    retryFloor();
    return;
  }
  if (screen === SCREEN.CLEAR && (input.pressed('Enter') || input.takeClick())) {
    startFloor(world.levelIndex + 1);
    return;
  }
  if (screen === SCREEN.WIN && (input.pressed('Enter') || input.takeClick())) {
    startFloor(0);
    return;
  }
  if (screen === SCREEN.PAUSED && (input.pressed('KeyP') || input.pressed('Escape') || input.takeClick())) {
    screen = SCREEN.PLAY;
    announce('Back in the shadows.');
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const elapsed = lastFrame ? Math.min((now - lastFrame) / 1000, MAX_FRAME) : 0;
  lastFrame = now;
  handleMenu();
  if (input.pressed('KeyM') && screen === SCREEN.PLAY) audio.toggleMute();
  if (screen === SCREEN.PLAY) {
    if (input.pressed('KeyR')) {
      retryFloor();
    } else if (input.pressed('KeyP') || input.pressed('Escape')) {
      screen = SCREEN.PAUSED;
      announce('Paused.');
    } else {
      accumulator += elapsed;
      while (accumulator >= STEP && screen === SCREEN.PLAY) {
        const control = input.readControl(world.player);
        const flags = stepWorld(world, control, STEP);
        if (flags) handleEvents(flags);
        accumulator -= STEP;
      }
    }
  } else {
    accumulator = 0;
    input.takeClick();
  }
  input.endFrame();
  renderer.draw(world, screen);
}

document.addEventListener('pointerdown', unlockAudio, { once: true });
document.addEventListener('keydown', unlockAudio, { once: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && screen === SCREEN.PLAY) {
    screen = SCREEN.PAUSED;
    announce('Paused.');
  }
});

if (shotName) {
  const stagedScreen = stageShot(shotName, world, seed);
  renderer.draw(world, stagedScreen);
  requestAnimationFrame(() => {
    renderer.draw(world, stagedScreen);
    window.__shotReady = true;
  });
  window.__shotReady = true;
} else {
  announce('Hushline Nights. Press Enter or click to slip in.');
  requestAnimationFrame(frame);
}
