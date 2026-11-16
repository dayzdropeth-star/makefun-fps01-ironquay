// player.js — first-person movement: WASD + mouse look, acceleration and
// deceleration (no instant stops), Shift sprint, Ctrl/C crouch, Space jump,
// gravity, and axis-separated AABB collision against map colliders.
export const EYE_STAND = 1.62;
export const EYE_CROUCH = 1.08;
export const PLAYER_RADIUS = 0.38;
export const WALK_SPEED = 4.6;
export const SPRINT_SPEED = 6.8;
export const CROUCH_SPEED = 2.4;
export const JUMP_SPEED = 5.2;
export const GRAVITY = 14;

export function createPlayer(spawn) {
  return {
    x: spawn.x, z: spawn.z, y: 0, vy: 0,
    yaw: 0, pitch: 0, // yaw 0 faces -Z (toward the Harbour spawn)
    hp: 100, maxHp: 100,
    crouched: false, sprinting: false, onGround: true,
    moving: false, moveSpeed: 0,
    // Gun state: bloom 0..1 (spread + recoil), ADS 0..1, reload timer.
    bloom: 0, ads: 0, reloading: 0,
    lastShotAt: -10, alive: true,
  };
}

function collideAxis(p, colliders, nx, nz) {
  // Returns true if the circle (nx, nz, PLAYER_RADIUS) at the player's
  // current height overlaps a collider tall enough to block.
  for (const c of colliders) {
    if (p.y + 1.7 < 0.1) continue;
    const top = c.y1;
    if (top < 0.4 && p.y > top) continue; // step over low crates when jumping
    if (nx + PLAYER_RADIUS > c.x0 && nx - PLAYER_RADIUS < c.x1 &&
        nz + PLAYER_RADIUS > c.z0 && nz - PLAYER_RADIUS < c.z1) {
      return true;
    }
  }
  // Arena bounds.
  if (nx < -31 || nx > 31 || nz < -21 || nz > 21) return true;
  return false;
}

export function updatePlayer(p, input, dt, colliders) {
  if (!p.alive) return;
  p.crouched = !!(input.crouch);
  p.sprinting = !!(input.sprint && !p.crouched && input.forward);

  const targetSpeed = p.crouched ? CROUCH_SPEED : p.sprinting ? SPRINT_SPEED : WALK_SPEED;
  const sin = Math.sin(p.yaw), cos = Math.cos(p.yaw);
  // Forward is -Z rotated by yaw; right is +X rotated by yaw.
  let fx = -sin, fz = -cos;
  let rx = cos, rz = -sin;
  let mx = 0, mz = 0;
  if (input.forward) { mx += fx; mz += fz; }
  if (input.back) { mx -= fx; mz -= fz; }
  if (input.left) { mx -= rx; mz -= rz; }
  if (input.right) { mx += rx; mz += rz; }
  const len = Math.hypot(mx, mz);
  p.moving = len > 0;
  if (len > 0) { mx /= len; mz /= len; }

  // Accelerate toward the target velocity, decelerate when no input.
  // Exponential approach: smooth, framerate-independent, no instant stops.
  const vx = mx * targetSpeed, vz = mz * targetSpeed;
  p.vx = approach(p.vx ?? 0, vx, (len > 0 ? 26 : 22) * dt);
  p.vz = approach(p.vz ?? 0, vz, (len > 0 ? 26 : 22) * dt);
  p.moveSpeed = Math.hypot(p.vx, p.vz);

  // Axis-separated movement so the player slides along walls.
  const nx = p.x + p.vx * dt;
  if (!collideAxis(p, colliders, nx, p.z)) p.x = nx; else p.vx = 0;
  const nz = p.z + p.vz * dt;
  if (!collideAxis(p, colliders, p.x, nz)) p.z = nz; else p.vz = 0;

  // Jump + gravity.
  if (input.jump && p.onGround) { p.vy = JUMP_SPEED; p.onGround = false; }
  p.vy -= GRAVITY * dt;
  p.y += p.vy * dt;
  if (p.y <= 0) { p.y = 0; p.vy = 0; p.onGround = true; }

  // Bloom: grows per shot (combat.js adds), decays when not firing.
  p.bloom = Math.max(0, p.bloom - dt * 1.6);
  // ADS blends toward 1 while right mouse is held.
  const adsTarget = input.ads ? 1 : 0;
  p.ads += (adsTarget - p.ads) * Math.min(1, dt * 10);
  // Reload timer counts down in main.js via combat; keep the field here.
  if (p.reloading > 0) p.reloading -= dt;
}

function approach(v, target, step) {
  if (v < target) return Math.min(target, v + step);
  if (v > target) return Math.max(target, v - step);
  return v;
}

export function eyeHeight(p) {
  return p.y + (p.crouched ? EYE_CROUCH : EYE_STAND);
}

// Current spread (radians) for the given weapon: base + bloom + movement,
// crouching/still is more accurate, ADS tightens it.
export function currentSpread(p, weapon) {
  let s = weapon.spread + p.bloom * 0.05;
  if (p.moving) s += weapon.moveSpread * (p.sprinting ? 1.6 : 1);
  if (p.crouched) s *= 0.7;
  if (!p.onGround) s *= 1.8;
  s *= 1 - p.ads * (1 - weapon.adsSpreadMult);
  return s;
}
