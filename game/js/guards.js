// Guard patrols, live vision cones and the suspicion / chase / search state machine.

import { TUNING } from './config.js';
import { angleSeparation, distance, stepToward, turnToward } from './geometry.js';
import { moveActor } from './cover.js';
import { applyAwareness, visibilityOf } from './detection.js';
import { makeRng } from './rng.js';

function routeLength(route) {
  let total = 0;
  for (let i = 0; i < route.length; i++) {
    const a = route[i];
    const b = route[(i + 1) % route.length];
    total += distance(a.x, a.y, b.x, b.y);
  }
  return total;
}

function placeOnRoute(guard, phase) {
  const total = routeLength(guard.route);
  let travelled = total * phase;
  for (let i = 0; i < guard.route.length; i++) {
    const from = guard.route[i];
    const to = guard.route[(i + 1) % guard.route.length];
    const leg = distance(from.x, from.y, to.x, to.y);
    if (travelled <= leg || i === guard.route.length - 1) {
      const t = leg === 0 ? 0 : travelled / leg;
      guard.x = from.x + (to.x - from.x) * t;
      guard.y = from.y + (to.y - from.y) * t;
      guard.waypointIndex = (i + 1) % guard.route.length;
      guard.facing = Math.atan2(to.y - from.y, to.x - from.x);
      return;
    }
    travelled -= leg;
  }
}

export class Guard {
  constructor(def, level) {
    this.id = def.id;
    this.route = def.route;
    this.speed = def.speed;
    this.pauseDuration = def.pause;
    this.scanAmplitude = def.scan;
    this.rng = makeRng(level.seed + def.id * 104729);
    this.scanClock = def.phase * 19;
    this.x = 0;
    this.y = 0;
    this.facing = 0;
    this.waypointIndex = 0;
    this.pauseTimer = 0;
    this.awareness = 0;
    this.alarm = 0;
    this.state = 'patrol';
    this.interest = null;
    this.lastSeen = null;
    this.lostTimer = 0;
    this.searchTimer = 0;
    this.nearMissArmed = false;
    this.stepClock = 0;
    this.moving = false;
    placeOnRoute(this, def.phase);
  }

  get halfAngle() {
    const heat = Math.max(this.awareness, this.alarm * 0.5);
    return TUNING.guardHalfAngle + TUNING.guardHalfAngleAlert * heat + (this.state === 'chase' ? 0.07 : 0);
  }

  get range() {
    const heat = Math.max(this.awareness, this.alarm * 0.5);
    return TUNING.guardSight + TUNING.guardSightAlert * heat;
  }

  get heat() {
    return this.state === 'chase' ? 2 : this.awareness > TUNING.suspicionLevel || this.state !== 'patrol' ? 1 : 0;
  }

  hear(point, radius) {
    if (this.state === 'chase') return false;
    if (distance(this.x, this.y, point.x, point.y) > radius) return false;
    this.interest = { x: point.x, y: point.y };
    this.state = 'investigate';
    this.awareness = Math.max(this.awareness, 0.3);
    this.nearMissArmed = false;
    return true;
  }

  enterPatrol() {
    this.state = 'patrol';
    this.awareness = Math.min(this.awareness, 0.12);
    this.interest = null;
    this.lastSeen = null;
    this.lostTimer = 0;
  }

  enterSearch() {
    this.state = 'search';
    this.searchTimer = TUNING.searchTime;
    this.interest = this.lastSeen ? { ...this.lastSeen } : { x: this.x, y: this.y };
    this.awareness = 0.55;
  }

  enterChase(player) {
    this.state = 'chase';
    this.lastSeen = { x: player.x, y: player.y };
    this.interest = null;
    this.lostTimer = 0;
    this.awareness = 1;
  }

  update(dt, context) {
    const { level, player, alarm } = context;
    this.alarm = alarm;
    this.scanClock += dt;
    const visibility = visibilityOf(this, player, level, alarm);
    const change = applyAwareness(this, visibility, dt, alarm);

    if (change.spotted) this.enterChase(player);
    else if (this.state === 'chase') {
      if (visibility.visible) {
        this.lastSeen = { x: player.x, y: player.y };
        this.lostTimer = 0;
      } else {
        this.lostTimer += dt;
        if (this.lostTimer > TUNING.chaseLoseTime) this.enterSearch();
      }
    } else if (this.state === 'search') {
      this.searchTimer -= dt;
      if (this.searchTimer <= 0) this.enterPatrol();
    } else if (this.state === 'investigate') {
      if (this.interest && distance(this.x, this.y, this.interest.x, this.interest.y) < 26) {
        this.state = 'suspicious';
        this.pauseTimer = 1.8;
      }
    } else if (this.state === 'suspicious') {
      this.pauseTimer -= dt;
      if (this.pauseTimer <= 0 && this.awareness < TUNING.suspicionLevel * 0.6) this.enterPatrol();
    } else if (this.awareness > TUNING.suspicionLevel) {
      this.state = 'suspicious';
      this.pauseTimer = 1.4;
    }

    let desiredAngle = null;
    let speed = 0;
    let target = null;

    if (this.state === 'patrol') {
      const waypoint = this.route[this.waypointIndex];
      if (this.pauseTimer > 0) {
        this.pauseTimer -= dt;
        desiredAngle = Math.atan2(waypoint.y - this.y, waypoint.x - this.x) + Math.sin(this.scanClock * 1.5) * this.scanAmplitude;
      } else {
        target = waypoint;
        speed = this.speed;
      }
    } else if (this.state === 'chase') {
      target = visibility.visible ? { x: player.x, y: player.y } : this.lastSeen;
      speed = this.speed * 1.42;
    } else if (this.state === 'search') {
      target = distance(this.x, this.y, this.interest.x, this.interest.y) > 30 ? this.interest : null;
      if (!target) desiredAngle = this.facing + Math.sin(this.scanClock * 2.2) * 0.85;
      speed = this.speed * 0.72;
    } else if (this.state === 'investigate') {
      target = this.interest;
      speed = this.speed * 0.84;
    } else if (this.state === 'suspicious') {
      desiredAngle = this.interest ? Math.atan2(this.interest.y - this.y, this.interest.x - this.x) : this.facing + Math.sin(this.scanClock * 1.9) * 0.7;
    }

    if (target) {
      desiredAngle = Math.atan2(target.y - this.y, target.x - this.x);
      const advance = stepToward(this.x, this.y, target.x, target.y, speed * dt);
      const next = moveActor(level, this.x, this.y, advance.x - this.x, advance.y - this.y, 13);
      const travelled = distance(this.x, this.y, next.x, next.y);
      this.x = next.x;
      this.y = next.y;
      this.moving = travelled > 0.2;
      this.stepClock += travelled;
      if (this.state === 'patrol' && advance.arrived) {
        this.waypointIndex = (this.waypointIndex + 1) % this.route.length;
        this.pauseTimer = this.pauseDuration;
      }
    } else {
      this.moving = false;
    }

    if (desiredAngle !== null) this.facing = turnToward(this.facing, desiredAngle, TUNING.guardTurnSpeed * dt * (this.state === 'chase' ? 1.7 : 1));

    const stepped = this.stepClock >= 27;
    if (stepped) this.stepClock -= 27;
    return { stepped, moving: this.moving, nearMiss: change.nearMiss, spotted: change.spotted, visibility };
  }
}

// Used by the self-test and the screenshot poses: how strongly a guard currently sees a point.
export function coneCoversPoint(guard, x, y) {
  return angleSeparation(Math.atan2(y - guard.y, x - guard.x), guard.facing) <= guard.halfAngle && distance(guard.x, guard.y, x, y) <= guard.range;
}
