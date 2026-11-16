// textures.js — all art is procedural: small canvases painted in code and
// used as repeating textures. No external images, no network.
import * as THREE from 'three';

function canvasTexture(w, h, draw, repeatX = 1, repeatY = 1) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function speckle(ctx, w, h, rng, count, color, size) {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = 0.08 + rng() * 0.22;
    ctx.fillRect(rng() * w, rng() * h, 1 + rng() * size, 1 + rng() * size);
  }
  ctx.globalAlpha = 1;
}

// Deterministic speckles: a tiny LCG so textures look the same every load.
function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

export function concreteTexture() {
  const rng = lcg(11);
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#3a4148'; ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, rng, 900, '#23282e', 3);
    speckle(ctx, w, h, rng, 500, '#565e66', 2);
    ctx.strokeStyle = 'rgba(20,24,28,0.55)'; ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, w, h);
    ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
  }, 12, 8);
}

export function floorTexture() {
  const rng = lcg(23);
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#2b3138'; ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, rng, 700, '#1d2126', 4);
    speckle(ctx, w, h, rng, 300, '#4a525a', 2);
    ctx.strokeStyle = 'rgba(240,168,48,0.35)'; ctx.lineWidth = 3;
    ctx.setLineDash([18, 12]);
    ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(w, 8); ctx.stroke();
    ctx.setLineDash([]);
  }, 10, 7);
}

// Ribbed steel container side. `base` is the container paint colour.
export function containerTexture(base, rib) {
  const rng = lcg(37);
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) {
      ctx.fillStyle = rib;
      ctx.fillRect(x, 0, 5, h);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(x + 5, 0, 2, h);
    }
    speckle(ctx, w, h, rng, 260, '#10141a', 4); // rust + grime
    speckle(ctx, w, h, rng, 120, '#c96a1e', 3);
    ctx.fillStyle = 'rgba(233,230,223,0.75)';
    ctx.font = 'bold 34px monospace';
    ctx.fillText('IRONQUAY', 18, 52);
    ctx.font = '20px monospace';
    ctx.fillText('TIDE-07', 18, 82);
  }, 1, 1);
}

export function crateTexture() {
  const rng = lcg(51);
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#6b5232'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#4a3820'; ctx.lineWidth = 6;
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath(); ctx.moveTo(0, i * 64); ctx.lineTo(w, i * 64); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i * 64, 0); ctx.lineTo(i * 64, h); ctx.stroke();
    }
    speckle(ctx, w, h, rng, 300, '#2e2113', 3);
    ctx.strokeStyle = '#3a2c18'; ctx.lineWidth = 10; ctx.strokeRect(4, 4, w - 8, h - 8);
  }, 1, 1);
}

export function hazardTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#e8a020'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#15181c';
    for (let x = -h; x < w + h; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, h); ctx.lineTo(x + 16, 0); ctx.lineTo(x + 32, 0); ctx.lineTo(x + 16, h);
      ctx.closePath(); ctx.fill();
    }
  }, 4, 1);
}

export function wallTexture() {
  const rng = lcg(77);
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#39424c'; ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, rng, 600, '#232a31', 3);
    ctx.fillStyle = 'rgba(240,168,48,0.5)';
    ctx.fillRect(0, h - 14, w, 14); // sodium-lit base strip
  }, 8, 1);
}
