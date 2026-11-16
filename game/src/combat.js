// combat.js — hitscan shooting, damage, tracers, grenades and plant/defuse.
// The player fires a ray from the camera; bots fire hit-chance shots.
// Everything here is pure game logic except the tracer meshes it spawns.
import * as THREE from 'three';
import { damageAtRange, zoneMultiplier, WEAPONS } from './weapons.js';
import { currentSpread, eyeHeight } from './player.js';
import { addKillfeed } from './state.js';

export function createCombat(scene) {
  const raycaster = new THREE.Raycaster();
  raycaster.far = 120;
  const tracers = [];
  const tracerMat = new THREE.LineBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.9 });

  function spawnTracer(from, to, color) {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const line = new THREE.Line(geo, tracerMat.clone());
    line.material.color.setHex(color);
    scene.add(line);
    tracers.push({ line, life: 0.07 });
  }

  function updateTracers(dt) {
    for (let i = tracers.length - 1; i >= 0; i--) {
      tracers[i].life -= dt;
      if (tracers[i].life <= 0) {
        scene.remove(tracers[i].line);
        tracers[i].line.geometry.dispose();
        tracers.splice(i, 1);
      }
    }
  }

  // Fire one trigger pull from the player. Returns 'hit' | 'kill' | 'miss' |
  // 'empty' | 'reloading'. ctx: {player, loadout, bots, map, state, rng,
  // audio, onKill, onPlayerHit}.
  function playerShoot(ctx) {
    const { player, loadout, state, rng, audio } = ctx;
    const weapon = WEAPONS[loadout.primary];
    const ammo = loadout.weapons[loadout.primary];
    if (player.reloading > 0) return 'reloading';
    if (ammo.mag <= 0) { audio.dryFire(); return 'empty'; }
    ammo.mag -= 1;
    player.lastShotAt = state.time;
    player.bloom = Math.min(1, player.bloom + weapon.kick * 2.2);
    player.pitch += weapon.kick * 0.35; // recoil kick
    audio.shot(weapon.id);

    const cam = ctx.camera;
    const origin = new THREE.Vector3(player.x, eyeHeight(player), player.z);
    let anyHit = false, anyKill = false;
    for (let p = 0; p < weapon.pellets; p++) {
      const spread = currentSpread(player, weapon);
      const dir = new THREE.Vector3();
      cam.getWorldDirection(dir);
      dir.x += (rng.next() - 0.5) * 2 * spread;
      dir.y += (rng.next() - 0.5) * 2 * spread;
      dir.z += (rng.next() - 0.5) * 2 * spread;
      dir.normalize();
      raycaster.set(origin, dir);

      // Nearest bot hitbox vs nearest wall — the closer one wins.
      const botMeshes = [];
      for (const b of ctx.bots) if (b.alive) botMeshes.push(...b.hitMeshes);
      const botHits = raycaster.intersectObjects(botMeshes, false);
      const wallHits = raycaster.intersectObjects(ctx.map.meshes, false);
      const wallDist = wallHits.length ? wallHits[0].distance : Infinity;
      if (botHits.length && botHits[0].distance < wallDist && botHits[0].distance < weapon.range) {
        const hit = botHits[0];
        const bot = ctx.bots.find((b) => b.hitMeshes.includes(hit.object));
        const zone = hit.object.userData.zone || 'body';
        const dmg = Math.round(weapon.damage * zoneMultiplier(weapon, zone) * damageAtRange(weapon, hit.distance));
        bot.hp -= dmg;
        anyHit = true;
        audio.hitTick();
        spawnTracer(origin, hit.point, weapon.tracer);
        ctx.onBotHit?.(bot, zone, dmg);
        if (bot.hp <= 0 && bot.alive) {
          bot.alive = false;
          bot.group.visible = false;
          anyKill = true;
          state.kills += 1;
          state.money += 300;
          addKillfeed(state, `Kamu ▸ ${bot.name} (${zone === 'head' ? 'headshot' : weapon.name})`);
          audio.killChime();
          ctx.onKill?.(bot);
        }
      } else {
        const end = wallHits.length && wallHits[0].distance < weapon.range
          ? wallHits[0].point
          : origin.clone().add(dir.clone().multiplyScalar(weapon.range));
        spawnTracer(origin, end, weapon.tracer);
      }
    }
    return anyKill ? 'kill' : anyHit ? 'hit' : 'miss';
  }

  // A bot fires one burst round at a target ({kind:'player'|'bot', ...}).
  // Hit chance falls with distance and with the target moving; damage is
  // the bot rifle's flat 11 (headshots are a player-only fantasy here).
  function botShoot(bot, target, dist, rng, ctx) {
    const from = new THREE.Vector3(bot.x, 1.35, bot.z);
    const aimErr = 0.02 + dist * 0.0016;
    const to = new THREE.Vector3(
      target.x + (rng.next() - 0.5) * 2 * aimErr * dist,
      target.y + (rng.next() - 0.5) * 2 * aimErr * dist,
      target.z + (rng.next() - 0.5) * 2 * aimErr * dist,
    );
    spawnTracer(from, to, 0xff9a5e);
    ctx.audio.shot('riptide');
    const moving = target.kind === 'player' ? ctx.player.moveSpeed > 1 : true;
    const hitChance = Math.max(0.08, 0.42 - dist * 0.006 - (moving ? 0.08 : 0) - (ctx.player.crouched ? 0.05 : 0));
    if (rng.next() > hitChance) return;
    const dmg = rng.int(8, 14);
    if (target.kind === 'player') {
      ctx.onPlayerHit(dmg, bot);
    } else if (target.ref) {
      const b = target.ref;
      b.hp -= dmg;
      if (b.hp <= 0 && b.alive) {
        b.alive = false; b.group.visible = false;
        addKillfeed(ctx.state, `${bot.name} ▸ ${b.name}`);
        ctx.onBotKilled?.(b, bot);
      }
    }
  }

  // Grenade: a short arc, then an explosion (frag) or a blinding flash.
  function throwGrenade(ctx, kind) {
    const { player, loadout, state, audio } = ctx;
    if ((loadout.grenades[kind] ?? 0) <= 0) return false;
    loadout.grenades[kind] -= 1;
    const dir = new THREE.Vector3();
    ctx.camera.getWorldDirection(dir);
    const start = new THREE.Vector3(player.x, eyeHeight(player), player.z);
    const land = start.clone().add(dir.clone().multiplyScalar(9));
    land.y = 0;
    if (kind === 'frag') {
      audio.explosion();
      ctx.onExplosion?.(land);
      for (const b of ctx.bots) {
        if (!b.alive) continue;
        const d = Math.hypot(b.x - land.x, b.z - land.z);
        if (d < 7) {
          const dmg = Math.round(120 * (1 - d / 7) + 10);
          b.hp -= dmg;
          if (b.hp <= 0) {
            b.alive = false; b.group.visible = false;
            state.kills += 1; state.money += 300;
            addKillfeed(state, `Kamu ▸ ${b.name} (Squall Frag)`);
            audio.killChime();
            ctx.onKill?.(b);
          }
        }
      }
      const pd = Math.hypot(player.x - land.x, player.z - land.z);
      if (pd < 5) ctx.onPlayerHit(Math.round(60 * (1 - pd / 5)), null);
    } else {
      audio.flash();
      const pd = Math.hypot(player.x - land.x, player.z - land.z);
      state.flash = pd < 14 ? 1 : 0.4;
    }
    return true;
  }

  return { playerShoot, botShoot, throwGrenade, updateTracers };
}
