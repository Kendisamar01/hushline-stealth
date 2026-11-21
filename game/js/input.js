const CAPTURED = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Space', 'Enter', 'ShiftLeft', 'ShiftRight', 'KeyW', 'KeyA', 'KeyS',
  'KeyD', 'KeyF', 'KeyP', 'KeyR', 'KeyM', 'Escape',
]);

export function createInput(canvas, toLogical) {
  const held = new Set();
  const fresh = new Set();
  const pointer = { x: 640, y: 360, active: false };
  let click = null;

  window.addEventListener('keydown', (event) => {
    if (CAPTURED.has(event.code)) event.preventDefault();
    if (!event.repeat) fresh.add(event.code);
    held.add(event.code);
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  window.addEventListener('blur', () => {
    held.clear();
    fresh.clear();
  });
  canvas.addEventListener('pointermove', (event) => {
    const point = toLogical(event.clientX, event.clientY);
    pointer.x = point.x;
    pointer.y = point.y;
    pointer.active = true;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const point = toLogical(event.clientX, event.clientY);
    pointer.x = point.x;
    pointer.y = point.y;
    pointer.active = true;
    click = { x: point.x, y: point.y };
  });

  function pressed(code) {
    if (!fresh.has(code)) return false;
    fresh.delete(code);
    return true;
  }

  function takeClick() {
    const result = click;
    click = null;
    return result;
  }

  function readControl(player) {
    let dx = 0;
    let dy = 0;
    if (held.has('KeyD') || held.has('ArrowRight')) dx += 1;
    if (held.has('KeyA') || held.has('ArrowLeft')) dx -= 1;
    if (held.has('KeyS') || held.has('ArrowDown')) dy += 1;
    if (held.has('KeyW') || held.has('ArrowUp')) dy -= 1;
    const sneak = held.has('ShiftLeft') || held.has('ShiftRight');
    const run = held.has('KeyF');
    let throwAt = null;
    if (pressed('Space')) {
      throwAt = pointer.active
        ? { x: pointer.x, y: pointer.y }
        : { x: player.x + Math.cos(player.angle) * 260, y: player.y + Math.sin(player.angle) * 260 };
    }
    if (click) {
      const point = takeClick();
      if (point) throwAt = { x: point.x, y: point.y };
    }
    return { dx, dy, sneak, run, throw: throwAt };
  }

  function endFrame() {
    fresh.clear();
  }

  return { pressed, takeClick, readControl, endFrame, pointer };
}
