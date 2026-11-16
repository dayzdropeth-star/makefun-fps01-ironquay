// map.js — "Iron Quay": a night container port, 64 x 44 m.
// Steel blue-grey, sodium-orange lamps, thin fog. Builds the three.js
// scene, the AABB colliders the player/bots collide with, the waypoint
// graph the bots walk, spawn points and the two bomb sites.
import * as THREE from 'three';
import { concreteTexture, floorTexture, containerTexture, crateTexture, hazardTexture, wallTexture } from './textures.js';

const CONTAINER_COLORS = [
  ['#33506b', '#24394e'], // harbour blue
  ['#7a4a22', '#5d3718'], // rust orange
  ['#4a5d3a', '#36452c'], // faded green
  ['#5d3a4a', '#452a37'], // dull mauve
];

// Each entry: [centerX, centerZ, width, depth, height, colourIndex]
const CONTAINERS = [
  [-14, -8, 12, 2.6, 2.6, 0], [-14, 2, 12, 2.6, 2.6, 1],
  [2, -14, 2.6, 12, 2.6, 2], [10, -6, 8, 2.6, 2.6, 0],
  [14, 6, 2.6, 10, 2.6, 3], [-4, 10, 10, 2.6, 2.6, 1],
  [-24, 4, 2.6, 8, 2.6, 2], [24, -10, 2.6, 8, 2.6, 0],
  [-8, -16, 6, 2.6, 2.6, 3], [20, 14, 6, 2.6, 2.6, 1],
  [-14, -8, 12, 2.6, 2.6, 0], // stacked twin on the first row (y offset below)
];
const CRATES = [
  [-20, -14, 1.4], [-18.4, -14, 1.0], [6, 12, 1.4], [8, -2, 1.2],
  [26, 2, 1.4], [-26, 12, 1.2], [0, -4, 1.4], [-2, -4, 1.0],
];

export function buildMap(scene) {
  const colliders = []; // {x0,z0,x1,z1,y1} — y0 is always the ground
  const meshes = []; // solid meshes the raycaster treats as walls
  const addCollider = (x0, z0, x1, z1, y1) => colliders.push({ x0, z0, x1, z1, y1 });

  scene.fog = new THREE.FogExp2(0x0d1420, 0.016);
  scene.background = new THREE.Color(0x0d1420);

  // Ground.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(64, 44),
    new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 0.9, metalness: 0.15 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Perimeter walls (also colliders, so nobody walks out of the quay).
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTexture(), roughness: 0.85 });
  const wall = (x, z, w, d) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 5, d), wallMat);
    m.position.set(x, 2.5, z);
    scene.add(m); meshes.push(m);
    addCollider(x - w / 2, z - d / 2, x + w / 2, z + d / 2, 5);
  };
  wall(0, -22, 64, 1); wall(0, 22, 64, 1);
  wall(-32, 0, 1, 44); wall(32, 0, 1, 44);

  // Containers — stacked pairs read as tall cover; the duplicate entry in
  // CONTAINERS is drawn one level up so the row reads as a two-high stack.
  CONTAINERS.forEach(([cx, cz, w, d, h, ci], i) => {
    const [base, rib] = CONTAINER_COLORS[ci % CONTAINER_COLORS.length];
    const mat = new THREE.MeshStandardMaterial({ map: containerTexture(base, rib), roughness: 0.7, metalness: 0.35 });
    const stacked = i === CONTAINERS.length - 1;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(cx, (stacked ? h * 1.5 : h / 2), cz);
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m); meshes.push(m);
    if (!stacked) addCollider(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2, h);
  });

  // Crates.
  const crateMat = new THREE.MeshStandardMaterial({ map: crateTexture(), roughness: 0.9 });
  for (const [cx, cz, s] of CRATES) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), crateMat);
    m.position.set(cx, s / 2, cz);
    m.castShadow = true;
    scene.add(m); meshes.push(m);
    addCollider(cx - s / 2, cz - s / 2, cx + s / 2, cz + s / 2, s);
  }

  // Drydock crane silhouette over Site A — pure scenery, no collider.
  const craneMat = new THREE.MeshStandardMaterial({ color: 0x2a3440, roughness: 0.6, metalness: 0.6 });
  const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 14, 0.8), craneMat);
  leg1.position.set(-26, 7, -14); scene.add(leg1);
  const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 14, 0.8), craneMat);
  leg2.position.set(-18, 7, -14); scene.add(leg2);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(12, 1, 1), craneMat);
  beam.position.set(-22, 14, -14); scene.add(beam);

  // Site markers: hazard-striped pads on the ground.
  const hazardMat = new THREE.MeshStandardMaterial({ map: hazardTexture(), roughness: 0.8 });
  const sitePad = (x, z) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), hazardMat);
    p.rotation.x = -Math.PI / 2; p.position.set(x, 0.02, z);
    scene.add(p);
  };
  sitePad(-22, -12); sitePad(22, 12);

  // Lighting: dim blue moonlight + warm sodium lamps on posts.
  scene.add(new THREE.AmbientLight(0x334455, 0.9));
  const moon = new THREE.DirectionalLight(0x8fb4d8, 0.7);
  moon.position.set(-20, 30, 10); scene.add(moon);
  const lampPositions = [[-28, -18], [-8, 0], [12, -16], [28, 8], [0, 18], [-22, 14]];
  for (const [lx, lz] of lampPositions) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 8),
      new THREE.MeshStandardMaterial({ color: 0x222a33 }));
    post.position.set(lx, 3, lz); scene.add(post);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffa63d }));
    bulb.position.set(lx, 6.1, lz); scene.add(bulb);
    const light = new THREE.PointLight(0xff9a2e, 60, 22, 1.8);
    light.position.set(lx, 5.8, lz); scene.add(light);
  }

  // Waypoint graph: lane nodes the bots patrol / path through.
  const waypoints = [
    { x: 0, z: 18 }, { x: -12, z: 14 }, { x: 12, z: 14 }, { x: -24, z: 8 },
    { x: 24, z: -2 }, { x: 0, z: 6 }, { x: -8, z: -2 }, { x: 8, z: -4 },
    { x: -22, z: -12 }, { x: 22, z: 12 }, { x: -16, z: -16 }, { x: 16, z: -14 },
    { x: -28, z: -4 }, { x: 28, z: 16 }, { x: 0, z: -10 }, { x: -6, z: 16 },
    { x: 18, z: 2 }, { x: -20, z: -18 }, { x: 26, z: -16 }, { x: 6, z: 18 },
  ];

  return {
    colliders,
    meshes,
    waypoints,
    spawns: {
      tide: [{ x: -6, z: 19 }, { x: 0, z: 19 }, { x: 6, z: 19 }, { x: -2, z: 17 }, { x: 3, z: 17 }],
      harbour: [{ x: -6, z: -19 }, { x: 0, z: -19 }, { x: 6, z: -19 }, { x: -2, z: -17 }, { x: 3, z: -17 }],
    },
    sites: {
      A: { name: 'Drydock', x: -22, z: -12, r: 4.5 },
      B: { name: 'Warehouse', x: 22, z: 12, r: 4.5 },
    },
  };
}

// True if segment (ax,az)->(bx,bz) crosses any collider (2D, for LOS checks
// the bots do before deciding they can see a target).
export function segmentBlocked(colliders, ax, az, bx, bz) {
  for (const c of colliders) {
    if (c.y1 < 1.2) continue; // low crates do not block sight
    if (segmentsIntersect(ax, az, bx, bz, c.x0, c.z0, c.x1, c.z0)) return true;
    if (segmentsIntersect(ax, az, bx, bz, c.x1, c.z0, c.x1, c.z1)) return true;
    if (segmentsIntersect(ax, az, bx, bz, c.x1, c.z1, c.x0, c.z1)) return true;
    if (segmentsIntersect(ax, az, bx, bz, c.x0, c.z1, c.x0, c.z0)) return true;
    if (ax > c.x0 && ax < c.x1 && az > c.z0 && az < c.z1) return true;
    if (bx > c.x0 && bx < c.x1 && bz > c.z0 && bz < c.z1) return true;
  }
  return false;
}

function segmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  if (d === 0) return false;
  const t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / d;
  const u = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}
