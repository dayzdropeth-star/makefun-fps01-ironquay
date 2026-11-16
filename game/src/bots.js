// bots.js — the 9 bots: 4 Tidebreaker teammates who follow the player and
// 5 Harbour Ward defenders who hold sites, patrol, investigate noise and
// defuse a planted bomb. Each bot is a small three.js figure (body, head,
// legs) with named hit-zone meshes combat.js raycasts against.
import * as THREE from 'three';
import { segmentBlocked } from './map.js';

const FRIENDLY_NAMES = ['Marisol', 'Bram', 'Kaito', 'Yusuf'];
const ENEMY_NAMES = ['Harlan', 'Petra', 'Oskar', 'Nadia', 'Viktor'];
const BOT_SPEED = 3.4;
const BOT_HP = 100;

function bodyMaterial(team) {
  return new THREE.MeshStandardMaterial({
    color: team === 'tide' ? 0x2e6f8e : 0x8e3b2e, roughness: 0.8,
  });
}

export function createBot(id, team, spawn, index) {
  const group = new THREE.Group();
  const mat = bodyMaterial(team);
  const dark = new THREE.MeshStandardMaterial({ color: 0x1c222a, roughness: 0.85 });

  // Legs (zone 'legs'), torso ('body'), head ('head') — separate meshes so
  // a raycast hit can tell combat.js which zone was struck.
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.32), dark);
  legs.position.y = 0.4; legs.userData.zone = 'legs';
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.75, 0.36), mat);
  torso.position.y = 1.15; torso.userData.zone = 'body';
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.34, 0.38), mat);
  head.position.y = 1.72; head.userData.zone = 'head';
  // Visor stripe so teams read at a glance.
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.05),
    new THREE.MeshBasicMaterial({ color: team === 'tide' ? 0x7fd4ff : 0xffb37f }));
  visor.position.set(0, 1.74, 0.2);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.7), dark);
  gun.position.set(0.3, 1.25, 0.3);

  group.add(legs, torso, head, visor, gun);
  group.position.set(spawn.x, 0, spawn.z);
  const name = team === 'tide' ? FRIENDLY_NAMES[index % FRIENDLY_NAMES.length]
    : ENEMY_NAMES[index % ENEMY_NAMES.length];
  return {
    id, team, name, group, hitMeshes: [legs, torso, head],
    x: spawn.x, z: spawn.z, y: 0, yaw: team === 'tide' ? 0 : Math.PI,
    hp: BOT_HP, alive: true,
    // AI state: 'hold' | 'patrol' | 'investigate' | 'engage' | 'defuse' | 'follow'
    mode: team === 'tide' ? 'follow' : 'hold',
    target: null, // current waypoint {x,z}
    waypointIndex: index,
    reactAt: 0, // earliest time the bot may open fire on a seen target
    nextShotAt: 0, burstLeft: 0, burstUntil: 0,
    strafeDir: 1, strafeUntil: 0,
    investigate: null, // {x, z, until}
    defuseProgress: 0, plantGuard: null,
    seenAt: -10, lastKnown: null,
    walkPhase: 0,
  };
}

export function spawnBots(scene, map, rng) {
  const bots = [];
  map.spawns.tide.slice(1).forEach((s, i) => {
    const b = createBot(`tide-${i}`, 'tide', s, i);
    scene.add(b.group); bots.push(b);
  });
  map.spawns.harbour.forEach((s, i) => {
    const b = createBot(`harbour-${i}`, 'harbour', s, i);
    scene.add(b.group); bots.push(b);
  });
  return bots;
}

// Line of sight between two points at eye height, blocked by tall cover.
export function canSee(map, ax, az, bx, bz) {
  return !segmentBlocked(map.colliders, ax, az, bx, bz);
}

function nearestWaypoint(map, x, z) {
  let best = map.waypoints[0], bd = Infinity;
  for (const w of map.waypoints) {
    const d = (w.x - x) ** 2 + (w.z - z) ** 2;
    if (d < bd) { bd = d; best = w; }
  }
  return best;
}

function moveToward(bot, tx, tz, dt, speed) {
  const dx = tx - bot.x, dz = tz - bot.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.15) return true;
  const step = Math.min(d, speed * dt);
  bot.x += (dx / d) * step;
  bot.z += (dz / d) * step;
  bot.yaw = Math.atan2(dx, dz);
  bot.walkPhase += dt * 8;
  return d - step < 0.15;
}

// One AI tick. ctx: {map, state, player, bots, rng, time, onBotShoot,
// onBotDamage, hearNoise(x,z)} — callbacks live in main.js/combat.js so
// this module never touches the DOM or the audio context.
export function updateBot(bot, ctx, dt) {
  if (!bot.alive) { bot.group.visible = false; return; }
  const { map, state, player, rng, time } = ctx;
  const enemies = bot.team === 'tide'
    ? ctx.bots.filter((b) => b.team === 'harbour' && b.alive)
    : ctx.bots.filter((b) => b.team === 'tide' && b.alive);

  // --- Target acquisition: the player (if on the other team and alive)
  // is a candidate target, plus every live enemy bot.
  let target = null; let targetDist = Infinity;
  const candidates = [];
  if (player.alive && bot.team === 'harbour') candidates.push({ kind: 'player', x: player.x, z: player.z, y: 1.4 });
  if (bot.team === 'tide' && player.alive) candidates.push({ kind: 'player', x: player.x, z: player.z, y: 1.4, friendly: true });
  for (const e of enemies) candidates.push({ kind: 'bot', ref: e, x: e.x, z: e.z, y: 1.2 });
  for (const c of candidates) {
    if (c.friendly) continue;
    const d = Math.hypot(c.x - bot.x, c.z - bot.z);
    if (d < 42 && d < targetDist && canSee(map, bot.x, bot.z, c.x, c.z)) {
      target = c; targetDist = d;
    }
  }
  if (target) {
    bot.seenAt = time;
    bot.lastKnown = { x: target.x, z: target.z };
    if (bot.mode !== 'engage') { bot.mode = 'engage'; bot.reactAt = time + rng.range(0.35, 0.6); }
  } else if (bot.mode === 'engage' && time - bot.seenAt > 1.6) {
    // Lost the target: go look where it was last seen.
    bot.mode = 'investigate';
    bot.investigate = { x: bot.lastKnown.x, z: bot.lastKnown.z, until: time + 6 };
  }

  // --- Defuse duty: a Harbour bot near a planted bomb defuses it.
  if (bot.team === 'harbour' && state.bomb.status === 'planted' && state.bomb.site) {
    const site = map.sites[state.bomb.site];
    const dSite = Math.hypot(site.x - bot.x, site.z - bot.z);
    if (dSite < 3.5 && !target) {
      bot.mode = 'defuse';
      bot.defuseProgress += dt;
      if (bot.defuseProgress >= 5) ctx.onDefused(bot);
      bot.group.position.set(bot.x, bot.y, bot.z);
      bot.group.rotation.y = bot.yaw;
      return;
    }
    if (dSite < 14 && !target && bot.mode !== 'defuse') {
      bot.mode = 'investigate';
      bot.investigate = { x: site.x, z: site.z, until: time + 30 };
    }
  }

  // --- Behaviour by mode.
  if (bot.mode === 'engage' && target) {
    bot.yaw = Math.atan2(target.x - bot.x, target.z - bot.z);
    // Strafe sideways while firing, flipping direction every ~1s.
    if (time > bot.strafeUntil) { bot.strafeDir *= -1; bot.strafeUntil = time + rng.range(0.7, 1.4); }
    const strafe = bot.strafeDir * 1.4;
    const px = -Math.cos(bot.yaw) * strafe, pz = Math.sin(bot.yaw) * strafe;
    bot.x += px * dt * 0.5; bot.z += pz * dt * 0.5;
    // Burst fire once the reaction time has elapsed.
    if (time >= bot.reactAt && time >= bot.nextShotAt) {
      if (bot.burstLeft <= 0) { bot.burstLeft = rng.int(3, 5); bot.burstUntil = time + 0.9; }
      if (bot.burstLeft > 0) {
        bot.burstLeft -= 1;
        ctx.onBotShoot(bot, target, targetDist, rng);
        bot.nextShotAt = time + (bot.burstLeft > 0 ? 0.11 : rng.range(0.7, 1.2));
      }
    }
  } else if (bot.mode === 'investigate' && bot.investigate) {
    if (time > bot.investigate.until) { bot.mode = bot.team === 'tide' ? 'follow' : 'patrol'; bot.investigate = null; }
    else if (moveToward(bot, bot.investigate.x, bot.investigate.z, dt, BOT_SPEED)) {
      bot.mode = bot.team === 'tide' ? 'follow' : 'patrol';
      bot.investigate = null;
    }
  } else if (bot.mode === 'follow') {
    // Friendly bots trail the player at ~4 m, spreading out by index.
    const idx = bot.id.charCodeAt(bot.id.length - 1) - 48;
    const ox = (idx - 1.5) * 2.2, oz = 3.5 + (idx % 2) * 1.5;
    const tx = player.x + ox, tz = player.z + oz;
    if (Math.hypot(tx - bot.x, tz - bot.z) > 1.2) moveToward(bot, tx, tz, dt, BOT_SPEED + 0.6);
    else bot.yaw = player.yaw;
  } else if (bot.mode === 'hold') {
    // Defenders sit near their site; every ~8 s one rotates to a nearby lane.
    if (!bot.target) bot.target = nearestWaypoint(map, bot.x, bot.z);
    if (time % 9 < dt * 2 && rng.chance(0.3)) bot.target = rng.pick(map.waypoints);
    if (bot.target && Math.hypot(bot.target.x - bot.x, bot.target.z - bot.z) > 1) {
      moveToward(bot, bot.target.x, bot.target.z, dt, BOT_SPEED * 0.7);
    } else {
      bot.yaw += dt * 0.25; // slow scan
    }
  } else { // patrol
    if (!bot.target) bot.target = rng.pick(map.waypoints);
    if (moveToward(bot, bot.target.x, bot.target.z, dt, BOT_SPEED)) {
      bot.target = rng.pick(map.waypoints);
    }
  }

  // Clamp inside the arena and write the figure's transform.
  bot.x = Math.max(-30.5, Math.min(30.5, bot.x));
  bot.z = Math.max(-20.5, Math.min(20.5, bot.z));
  bot.group.position.set(bot.x, bot.y + Math.abs(Math.sin(bot.walkPhase)) * 0.03, bot.z);
  bot.group.rotation.y = bot.yaw;
}

// A loud event (shot, explosion, plant) pulls nearby defenders toward it.
export function hearNoise(bots, x, z, radius, time) {
  for (const b of bots) {
    if (!b.alive || b.team !== 'harbour' || b.mode === 'engage') continue;
    if (Math.hypot(b.x - x, b.z - z) < radius) {
      b.mode = 'investigate';
      b.investigate = { x, z, until: time + 5 };
    }
  }
}
