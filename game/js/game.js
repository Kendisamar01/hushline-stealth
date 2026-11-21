// Game orchestration: rules, state transitions, input actions and the frame's draw order.

import { PALETTE, TUNING, VIEW } from './config.js';
import { clamp, distance } from './geometry.js';
import { levelCount, buildLevel } from './levels.js';
import { Guard } from './guards.js';
import { Player } from './player.js';
import { Pebble, HearingRing } from './noise.js';
import { Soundscape } from './audio.js';
import { drawFloor, drawLampFixtures, drawCover, drawKey, drawExit } from './scenery.js';
import { drawVisionCones, drawAwareness, drawHearingRings } from './vision.js';
import { drawGuards, drawPlayer, drawPebbles, drawAim } from './actors.js';
import { drawHud, drawNotices, drawOverlay, buttonsFor } from './hud.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.audio = new Soundscape();
    this.levelTotal = levelCount();
    this.levelIndex = 0;
    this.phase = 'title';
    this.time = 0;
    this.elapsed = 0;
    this.alarm = 0;
    this.notice = null;
    this.pebblesLeft = 0;
    this.pebbles = [];
    this.rings = [];
    this.spotted = 0;
    this.nearMisses = 0;
    this.totalTime = 0;
    this.totalSpotted = 0;
    this.totalNearMisses = 0;
    this.frozen = false;
    this.input = { up: false, down: false, left: false, right: false, sneak: false };
    this.mouse = { x: 0, y: 0, inside: false };
    this.loadLevel(0);
  }

  loadLevel(index) {
    this.levelIndex = clamp(index, 0, this.levelTotal - 1);
    this.level = buildLevel(this.levelIndex);
    this.player = new Player(this.level);
    this.guards = this.level.guards.map((def) => new Guard(def, this.level));
    this.pebblesLeft = this.level.pebbles;
    this.pebbles = [];
    this.rings = [];
    this.alarm = 0;
    this.elapsed = 0;
    this.spotted = 0;
    this.nearMisses = 0;
    this.notice = null;
  }

  startRun() {
    this.totalTime = 0;
    this.totalSpotted = 0;
    this.totalNearMisses = 0;
    this.loadLevel(0);
    this.phase = 'playing';
    this.audio.unlock();
    this.audio.setAmbient(true);
  }

  retry() {
    this.loadLevel(this.levelIndex);
    this.phase = 'playing';
  }

  nextLevel() {
    this.totalTime += this.elapsed;
    this.totalSpotted += this.spotted;
    this.totalNearMisses += this.nearMisses;
    if (this.levelIndex >= this.levelTotal - 1) {
      this.phase = 'allClear';
      return;
    }
    this.loadLevel(this.levelIndex + 1);
    this.phase = 'playing';
  }

  restartAll() {
    this.phase = 'allClear';
    this.startRun();
  }

  togglePause() {
    if (this.phase === 'playing') this.phase = 'paused';
    else if (this.phase === 'paused') this.phase = 'playing';
  }

  showNotice(text, kind = 'warn', life = 2.6) {
    this.notice = { text, kind, age: 0, life };
  }

  throwPebble() {
    if (this.phase !== 'playing' || this.pebblesLeft <= 0) return false;
    const target = this.mouse.inside
      ? { x: this.mouse.x, y: this.mouse.y }
      : { x: this.player.x + Math.cos(this.player.facing) * 220, y: this.player.y + Math.sin(this.player.facing) * 220 };
    this.pebbles.push(new Pebble(this.player.x, this.player.y, target.x, target.y));
    this.pebblesLeft--;
    this.audio.pebble();
    return true;
  }

  pressButton(id) {
    if (id === 'begin' || id === 'again') this.startRun();
    else if (id === 'retry') this.retry();
    else if (id === 'resume') this.togglePause();
    else if (id === 'next' || id === 'finish') this.nextLevel();
  }

  onKeyDown(code) {
    if (code === 'ArrowUp' || code === 'KeyW') this.input.up = true;
    if (code === 'ArrowDown' || code === 'KeyS') this.input.down = true;
    if (code === 'ArrowLeft' || code === 'KeyA') this.input.left = true;
    if (code === 'ArrowRight' || code === 'KeyD') this.input.right = true;
    if (code === 'ShiftLeft' || code === 'ShiftRight') this.input.sneak = true;
    if (code === 'KeyM') this.audio.toggleMute();
    if (code === 'KeyR' && this.phase !== 'title') this.retry();
    if (code === 'KeyP') this.togglePause();
    if (code === 'Space') {
      if (this.phase === 'playing') this.throwPebble();
      else if (this.phase === 'title' || this.phase === 'allClear') this.startRun();
      else if (this.phase === 'caught') this.retry();
      else if (this.phase === 'complete') this.nextLevel();
      else if (this.phase === 'paused') this.togglePause();
    }
  }

  onKeyUp(code) {
    if (code === 'ArrowUp' || code === 'KeyW') this.input.up = false;
    if (code === 'ArrowDown' || code === 'KeyS') this.input.down = false;
    if (code === 'ArrowLeft' || code === 'KeyA') this.input.left = false;
    if (code === 'ArrowRight' || code === 'KeyD') this.input.right = false;
    if (code === 'ShiftLeft' || code === 'ShiftRight') this.input.sneak = false;
  }

  onMouseDown(x, y) {
    this.audio.unlock();
    this.mouse.x = x;
    this.mouse.y = y;
    this.mouse.inside = true;
    if (this.phase !== 'playing') {
      for (const button of buttonsFor(this)) {
        if (x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h) {
          this.pressButton(button.id);
          return;
        }
      }
      return;
    }
    this.throwPebble();
  }

  emitFootsteps(steps) {
    for (const step of steps) {
      this.rings.push(new HearingRing(step.x, step.y, step.radius, 'step'));
      const pan = (step.x / VIEW.width) * 2 - 1;
      this.audio.step(step.kind === 'creep' ? 'creep' : 'player', pan, step.kind === 'creep' ? 0.035 : 0.07);
      for (const guard of this.guards) guard.hear(step, step.radius);
    }
  }

  update(dt) {
    this.time += dt;
    if (this.notice) this.notice.age += dt;
    if (this.phase !== 'playing' || this.frozen) return;

    this.elapsed += dt;
    this.alarm = Math.max(0, this.alarm - dt / TUNING.alarmSeconds);
    const footsteps = this.player.update(dt, this.input, this.level);
    this.emitFootsteps(footsteps);

    let spottedNow = false;
    let nearMissNow = false;
    for (const guard of this.guards) {
      const events = guard.update(dt, { level: this.level, player: this.player, alarm: this.alarm });
      if (events.spotted) spottedNow = true;
      if (events.nearMiss) nearMissNow = true;
      if (events.stepped) {
        const pan = (guard.x / VIEW.width) * 2 - 1;
        const proximity = clamp(1 - distance(guard.x, guard.y, this.player.x, this.player.y) / 620, 0.08, 1);
        this.audio.step('guard', pan, 0.075 * proximity);
      }
    }

    if (spottedNow) {
      this.spotted++;
      this.alarm = 1;
      this.showNotice('SPOTTED — BREAK LINE OF SIGHT');
      this.audio.alarm();
    } else if (nearMissNow) {
      this.nearMisses++;
      this.alarm = Math.max(this.alarm, 0.72);
      this.showNotice('NEAR MISS — ALARM RAISED');
      this.audio.alarm();
    }

    for (const pebble of this.pebbles) {
      const landing = pebble.update(dt);
      if (landing) {
        this.rings.push(new HearingRing(landing.x, landing.y, landing.radius, 'pebble'));
        for (const guard of this.guards) guard.hear(landing, landing.radius);
      }
    }
    this.pebbles = this.pebbles.filter((pebble) => !pebble.landed);
    this.rings = this.rings.filter((ring) => ring.update(dt));

    const key = this.level.key;
    if (key && !key.taken && distance(this.player.x, this.player.y, key.x, key.y) < 25) {
      key.taken = true;
      this.player.hasKey = true;
      this.audio.pickup();
      this.showNotice('KEY TAKEN — FIND THE GATE', 'good');
    }

    const chasing = this.guards.some((guard) => guard.state === 'chase');
    const hot = this.guards.some((guard) => guard.awareness > 0.94);
    if (chasing && this.guards.some((guard) => guard.state === 'chase' && distance(guard.x, guard.y, this.player.x, this.player.y) < TUNING.catchDistance)) {
      this.phase = 'caught';
      this.audio.caught();
      this.showNotice('CAUGHT', 'warn', 1.2);
      return;
    }

    const exitDistance = distance(this.player.x, this.player.y, this.level.exit.x, this.level.exit.y);
    if (exitDistance < 32) {
      if (this.level.exit.requiresKey && !this.player.hasKey) {
        if (!this.notice || this.notice.age > 1.8) this.showNotice('THE GATE IS LOCKED — FIND THE KEY');
      } else if (!chasing && !hot) {
        this.phase = 'complete';
        this.audio.complete();
        this.showNotice('ROUTE CLEAR', 'good', 1.6);
      } else {
        if (!this.notice || this.notice.age > 1.8) this.showNotice('BREAK THEIR SIGHT LINE FIRST');
      }
    }

    const nearest = Math.min(...this.guards.map((guard) => distance(guard.x, guard.y, this.player.x, this.player.y)));
    const tension = Math.max(this.alarm, Math.max(...this.guards.map((guard) => guard.awareness)) * 0.85, clamp(1 - nearest / 190, 0, 0.55));
    this.audio.heartbeat(tension, dt);
  }

  render(ctx = this.ctx) {
    if (!ctx) return;
    ctx.clearRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = PALETTE.void;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    drawFloor(ctx, this.level, this.time);
    drawVisionCones(ctx, this.guards, this.time);
    drawCover(ctx, this.level);
    drawHearingRings(ctx, this.rings);
    const nearExit = distance(this.player.x, this.player.y, this.level.exit.x, this.level.exit.y) < 130;
    const unlocked = !this.level.exit.requiresKey || this.player.hasKey;
    drawExit(ctx, this.level, this.time, unlocked, nearExit);
    drawKey(ctx, this.level, this.time);
    drawPebbles(ctx, this.pebbles);
    drawGuards(ctx, this.guards, this.time);
    drawPlayer(ctx, this.player, this.time);
    for (const guard of this.guards) drawAwareness(ctx, guard);
    drawAim(ctx, this.player, this.mouse, this.pebblesLeft, this.phase === 'playing');

    const vignette = ctx.createRadialGradient(VIEW.width / 2, VIEW.height / 2, 260, VIEW.width / 2, VIEW.height / 2, 820);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    drawHud(ctx, this);
    drawNotices(ctx, this);
    drawOverlay(ctx, this);
  }
}
