// main.js — IRONQUAY glue: renderer, input, fixed-step loop, and the wiring
// between player / bots / combat / rounds / HUD / audio. The game runs at
// a fixed 60 Hz simulation step; rendering interpolates nothing — the step
// itself is the frame when the display is 60 Hz, and it accumulates
// cleanly on faster displays.
import * as THREE from 'three';
import { RNG } from './rng.js';
import { createState, addKillfeed, PLANT_TIME } from './state.js';
import { buildMap } from './map.js';
import { WEAPONS, freshLoadout } from './weapons.js';
import { createPlayer, updatePlayer, eyeHeight } from './player.js';
import { spawnBots, updateBot, hearNoise, canSee } from './bots.js';
import { createCombat } from './combat.js';
import { startBuyPhase, startRound, tickRounds, endRound, nextRound, checkElimination, plantBomb, defuseBomb } from './rounds.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { createViewmodel } from './viewmodel.js';
import { readShotParams, applyShot } from './shots.js';

const { shot, seed } = readShotParams();
const rng = new RNG(seed);
const state = createState(seed);
const audio = createAudio();

// --- Renderer / scene / camera -------------------------------------------
const container = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
camera.rotation.order = 'YXZ';
scene.add(camera);

const map = buildMap(scene);
const combat = createCombat(scene);
const player = createPlayer(map.spawns.tide[0]);
const bots = spawnBots(scene, map, rng);
const loadout = freshLoadout();
const viewmodel = createViewmodel(camera);

let bombBeacon = null;
function setBombBeacon(siteId) {
  clearBombBeacon();
  const site = map.sites[siteId];
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xff5a2e }),
  );
  mesh.position.set(site.x, 1.2, site.z);
  const light = new THREE.PointLight(0xff5a2e, 30, 12, 1.8);
  light.position.set(site.x, 1.6, site.z);
  bombBeacon = new THREE.Group();
  bombBeacon.add(mesh, light);
  scene.add(bombBeacon);
}
function clearBombBeacon() {
  if (bombBeacon) { scene.remove(bombBeacon); bombBeacon = null; }
}

// --- HUD ------------------------------------------------------------------
const hud = createHud({
  buyWeapon(id) {
    if (state.phase !== 'buy') return;
    const w = WEAPONS[id];
    if (loadout.weapons[id]) { loadout.primary = id; return; }
    if (state.money < w.price) return;
    state.money -= w.price;
    loadout.weapons[id] = { mag: w.mag, reserve: w.reserveMax };
    loadout.primary = id;
    audio.buy();
  },
  buyGrenade(id) {
    if (state.phase !== 'buy') return;
    const price = id === 'frag' ? 300 : 200;
    if (state.money < price || loadout.grenades[id] >= 2) return;
    state.money -= price;
    loadout.grenades[id] += 1;
    audio.buy();
  },
});

// --- Input ----------------------------------------------------------------
const input = { forward: false, back: false, left: false, right: false, sprint: false, crouch: false, jump: false, ads: false, plant: false };
let firing = false;
let locked = false;
let stepAcc = 0;

const KEYMAP = { KeyW: 'forward', KeyS: 'back', KeyA: 'left', KeyD: 'right', ShiftLeft: 'sprint', ShiftRight: 'sprint', ControlLeft: 'crouch', KeyC: 'crouch', Space: 'jump', KeyE: 'plant' };
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM') { state.muted = !state.muted; audio.setMuted(state.muted); return; }
  if (e.code === 'KeyR') startReload();
  if (e.code === 'Digit3') combat.throwGrenade(grenadeCtx(), 'frag');
  if (e.code === 'Digit4') combat.throwGrenade(grenadeCtx(), 'flash');
  if (e.code === 'Digit1' || e.code === 'Digit2') cycleWeapon(e.code === 'Digit1' ? -1 : 1);
  const k = KEYMAP[e.code];
  if (k) { input[k] = true; if (e.code === 'Space') e.preventDefault(); }
});
window.addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) input[k] = false; });
document.addEventListener('mousemove', (e) => {
  if (!locked || !player.alive) return;
  player.yaw -= e.movementX * 0.0022;
  player.pitch -= e.movementY * 0.0022;
  player.pitch = Math.max(-1.5, Math.min(1.5, player.pitch));
});
document.addEventListener('mousedown', (e) => {
  if (!locked) return;
  if (e.button === 0) { firing = true; tryFire(); }
  if (e.button === 2) input.ads = true;
});
document.addEventListener('mouseup', (e) => {
  if (e.button === 0) firing = false;
  if (e.button === 2) input.ads = false;
});
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === renderer.domElement; });
renderer.domElement.addEventListener('click', () => {
  if (state.phase === 'round' || state.phase === 'buy') renderer.domElement.requestPointerLock();
});
document.getElementById('play').addEventListener('click', () => {
  audio.unlock();
  hud.showStart(false);
  startMatch();
  renderer.domElement.requestPointerLock();
});
document.getElementById('restart').addEventListener('click', () => {
  audio.unlock();
  hud.el.endOverlay.classList.remove('show');
  startMatch();
  renderer.domElement.requestPointerLock();
});
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function cycleWeapon(dir) {
  const owned = Object.keys(loadout.weapons);
  if (owned.length < 2) return;
  const i = owned.indexOf(loadout.primary);
  loadout.primary = owned[(i + dir + owned.length) % owned.length];
}

function startReload() {
  const w = WEAPONS[loadout.primary];
  const ammo = loadout.weapons[loadout.primary];
  if (player.reloading > 0 || ammo.mag === w.mag || ammo.reserve === 0) return;
  player.reloading = w.reloadMs / 1000;
  audio.reload();
}

function finishReload() {
  const w = WEAPONS[loadout.primary];
  const ammo = loadout.weapons[loadout.primary];
  const need = w.mag - ammo.mag;
  const take = Math.min(need, ammo.reserve);
  ammo.mag += take; ammo.reserve -= take;
}

function tryFire() {
  if (state.phase !== 'round' || !player.alive || player.reloading > 0) return;
  const w = WEAPONS[loadout.primary];
  if (state.time - player.lastShotAt < w.fireInterval) return;
  const result = combat.playerShoot(shootCtx());
  if (result === 'hit' || result === 'kill') hud.showHitmarker(result === 'kill');
  if (result === 'miss' || result === 'hit' || result === 'kill') {
    hearNoise(bots, player.x, player.z, 26, state.time);
  }
}

// --- Context objects handed to combat / bots -------------------------------
function shootCtx() {
  return {
    camera, player, loadout, bots, map, state, rng, audio,
    onBotHit: () => {},
    onKill: (bot) => checkElimination(state, bots, player.alive, roundHooks),
  };
}
function grenadeCtx() {
  return { ...shootCtx(), onPlayerHit: (dmg) => damagePlayer(dmg, null), onExplosion: (pos) => hearNoise(bots, pos.x, pos.z, 30, state.time) };
}
function damagePlayer(dmg, bot) {
  if (!player.alive || state.phase !== 'round') return;
  player.hp -= dmg;
  if (player.hp <= 0) {
    player.hp = 0; player.alive = false; state.deaths += 1;
    addKillfeed(state, bot ? `${bot.name} ▸ Kamu` : 'Kamu tumbang');
    checkElimination(state, bots, false, roundHooks);
  }
}

const roundHooks = {
  onRoundEnd: (s, winner) => { audio.stinger(winner === 'tide'); clearBombBeacon(); },
  onMatchEnd: () => {},
  onPlanted: (s, siteId) => { setBombBeacon(siteId); audio.plantBeep(true); hearNoise(bots, map.sites[siteId].x, map.sites[siteId].z, 40, state.time); },
};
const botCtx = {
  map, state, player, bots, rng,
  get time() { return state.time; },
  audio,
  onBotShoot: (bot, target, dist, r) => combat.botShoot(bot, target, dist, r, {
    player, state, audio,
    onPlayerHit: (dmg, b) => damagePlayer(dmg, b),
    onBotKilled: (dead) => checkElimination(state, bots, player.alive, roundHooks),
  }),
  onDefused: () => defuseBomb(state, roundHooks),
};

// --- Match / round setup ---------------------------------------------------
function resetPositions() {
  const spawn = map.spawns.tide[0];
  player.x = spawn.x; player.z = spawn.z; player.y = 0; player.vy = 0;
  player.yaw = 0; player.pitch = 0; player.hp = 100; player.alive = true;
  player.bloom = 0; player.reloading = 0;
  bots.forEach((b, i) => {
    const s = b.team === 'tide' ? map.spawns.tide[(i % 4) + 1] : map.spawns.harbour[i % 5];
    b.x = s.x; b.z = s.z; b.hp = 100; b.alive = true;
    b.group.visible = true;
    b.mode = b.team === 'tide' ? 'follow' : 'hold';
    b.target = null; b.investigate = null; b.defuseProgress = 0; b.burstLeft = 0;
  });
}

function startMatch() {
  state.round = 1;
  state.wins = { tide: 0, harbour: 0 };
  state.money = 800; state.kills = 0; state.deaths = 0; state.plants = 0;
  state.matchWinner = null;
  Object.assign(loadout, freshLoadout());
  resetPositions();
  clearBombBeacon();
  startBuyPhase(state);
}

function beginRoundNow() { resetPositions(); startRound(state); }

// --- Plant / defuse (player holds E) ---------------------------------------
function tickPlant(dt) {
  if (state.phase !== 'round' || !player.alive) { state.bomb.plantProgress = 0; return; }
  if (state.bomb.status !== 'carried') { state.bomb.plantProgress = 0; return; }
  const near = Object.entries(map.sites).find(([, s]) => Math.hypot(s.x - player.x, s.z - player.z) < s.r);
  if (near && input.plant) {
    state.bomb.plantProgress += dt;
    if (Math.floor(state.bomb.plantProgress * 2) !== Math.floor((state.bomb.plantProgress - dt) * 2)) audio.plantBeep();
    if (state.bomb.plantProgress >= PLANT_TIME) {
      plantBomb(state, near[0], roundHooks);
      state.bomb.plantProgress = 0;
    }
  } else {
    state.bomb.plantProgress = 0;
  }
}

function currentPrompt() {
  if (state.phase === 'buy') return 'Fase beli — klik senjata di menu, lalu ronde dimulai.';
  if (state.phase !== 'round') return '';
  if (state.bomb.status === 'planted') return `Bom terpasang di Site ${state.bomb.site} — fuse ${Math.ceil(state.bomb.fuse)} dtk!`;
  if (state.bomb.status === 'carried') {
    const near = Object.entries(map.sites).find(([, s]) => Math.hypot(s.x - player.x, s.z - player.z) < s.r);
    if (near) return `Di Site ${near[0]} (${near[1].name}) — tahan E untuk menanam bom`;
  }
  return 'Tidebreakers: eliminasi musuh atau tanam bom di Site A / B.';
}

// --- Fixed-step loop --------------------------------------------------------
const STEP = 1 / 60;
let acc = 0, last = performance.now(), roundEndAt = -1, vistaAngle = 0;

function simulate(dt) {
  state.time += dt;
  if (state.phase === 'menu') return;
  tickRounds(state, dt, roundHooks);
  if (state.phase === 'roundEnd' || state.phase === 'matchEnd') {
    if (roundEndAt < 0) roundEndAt = state.time;
    if (state.phase === 'roundEnd' && state.time - roundEndAt > 4) {
      roundEndAt = -1;
      nextRound(state);
      resetPositions();
    }
    return;
  }
  roundEndAt = -1;

  // Player.
  updatePlayer(player, input, dt, map.colliders);
  if (player.reloading > 0 && player.reloading - dt <= 0) finishReload();
  if (firing && player.alive) {
    const w = WEAPONS[loadout.primary];
    if (w.auto) tryFire();
  }
  // Footsteps.
  if (player.moving && player.onGround) {
    stepAcc += player.moveSpeed * dt;
    if (stepAcc > 2.2) { stepAcc = 0; audio.step(player.sprinting); }
  }
  tickPlant(dt);

  // Bots.
  for (const b of bots) updateBot(b, botCtx, dt);

  // Camera follows the player; ADS narrows the FOV.
  camera.position.set(player.x, eyeHeight(player), player.z);
  camera.rotation.set(player.pitch, player.yaw, 0);
  const targetFov = 75 - player.ads * 22;
  if (Math.abs(camera.fov - targetFov) > 0.1) {
    camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 10);
    camera.updateProjectionMatrix();
  }
  viewmodel.update(player, state.time, loadout.primary);
  combat.updateTracers(dt);
  state.flash = Math.max(0, state.flash - dt * 0.7);
}

function frame(now) {
  requestAnimationFrame(frame);
  const dtMs = Math.min(100, now - last);
  last = now;
  acc += dtMs / 1000;
  let steps = 0;
  while (acc >= STEP && steps < 5) { simulate(STEP); acc -= STEP; steps += 1; }
  if (steps === 5) acc = 0; // drop backlog rather than spiral

  // Menu vista: slow orbit over the quay while the start screen is up.
  if (state.phase === 'menu') {
    vistaAngle += 0.0004;
    camera.position.set(Math.sin(vistaAngle) * 26, 12, Math.cos(vistaAngle) * 20);
    camera.lookAt(0, 1, 0);
    camera.fov = 60; camera.updateProjectionMatrix();
  }
  hud.update(state, player, loadout);
  hud.setPrompt(currentPrompt());
  renderer.render(scene, camera);
}

// --- Screenshot presets + boot ---------------------------------------------
const api = {
  state, player, loadout, bots, map,
  startMatch,
  beginRoundNow,
  setCameraVista() { vistaAngle = 0.6; },
  syncBotTransforms() {
    for (const b of bots) {
      b.group.position.set(b.x, 0, b.z);
      b.group.rotation.y = b.yaw;
    }
  },
};
applyShot(shot, api);
if (shot === 'play' || shot === 'buy' || shot === 'end') hud.showStart(false);
requestAnimationFrame(frame);
