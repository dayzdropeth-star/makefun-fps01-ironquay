// viewmodel.js — the gun the player sees: boxes assembled per weapon
// (barrel, body, grip, sight), with walk bob, recoil kick and ADS
// positioning. Attached to the camera so it never clips the world.
import * as THREE from 'three';
import { WEAPONS } from './weapons.js';

const VIEWMODEL_COLORS = {
  gull: 0x2a2f36, breakwater: 0x4a2f1e, riptide: 0x2e4a3a,
  kestrel: 0x3a3f4a, longshoreman: 0x1e2a3a,
};

export function createViewmodel(camera) {
  const group = new THREE.Group();
  const parts = [];
  const mat = new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.5, metalness: 0.6 });
  const accent = new THREE.MeshStandardMaterial({ color: 0xf0a830, roughness: 0.4, metalness: 0.5 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.5), mat);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 8), mat);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.02, -0.42);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.1), mat);
  grip.position.set(0, -0.16, 0.12); grip.rotation.x = 0.3;
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.07, 0.03), accent);
  sight.position.set(0, 0.1, -0.05);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.18, 0.12), mat);
  mag.position.set(0, -0.14, -0.02);
  parts.push(body, barrel, grip, sight, mag);
  for (const p of parts) group.add(p);

  group.position.set(0.28, -0.26, -0.55);
  camera.add(group);
  return {
    group,
    // Called every frame: bob while walking, kick after a shot, slide to
    // the centre of the screen while aiming down sights.
    update(player, time, weaponId) {
      const w = WEAPONS[weaponId];
      const sinceShot = time - player.lastShotAt;
      const kick = Math.max(0, 1 - sinceShot * 6) * (w.kick * 2.2);
      const bobAmp = player.moving && player.onGround ? 0.012 : 0.004;
      const bobSpeed = player.sprinting ? 11 : 8;
      const bobY = Math.sin(time * bobSpeed) * bobAmp;
      const bobX = Math.cos(time * bobSpeed * 0.5) * bobAmp * 0.6;
      const ads = player.ads;
      group.position.set(
        0.28 * (1 - ads) + bobX,
        -0.26 + bobY * (1 - ads) - 0.02 * ads,
        -0.55 + kick,
      );
      group.rotation.x = kick * 1.4;
      // Colour the body per weapon so a bought rifle reads differently.
      mat.color.setHex(VIEWMODEL_COLORS[weaponId] || 0x2a2f36);
      // Sniper gets a longer barrel silhouette.
      barrel.scale.z = weaponId === 'longshoreman' ? 1.5 : weaponId === 'breakwater' ? 0.8 : 1;
    },
  };
}
