// rng.js — seeded RNG (mulberry32) so ?seed= replays deterministically.
// Every random choice in the game (bot aim error, patrol picks, spread
// jitter) goes through one of these instances, never Math.random.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RNG {
  constructor(seed = 1) {
    this.seed = seed >>> 0;
    this.nextFn = mulberry32(this.seed);
  }
  // Float in [0, 1).
  next() { return this.nextFn(); }
  // Float in [min, max).
  range(min, max) { return min + (max - min) * this.nextFn(); }
  // Integer in [min, max] inclusive.
  int(min, max) { return Math.floor(this.range(min, max + 1)); }
  // True with probability p.
  chance(p) { return this.nextFn() < p; }
  // Random element of a non-empty array.
  pick(arr) { return arr[Math.floor(this.nextFn() * arr.length)]; }
  // Fisher-Yates shuffle, returns a new array.
  shuffle(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.nextFn() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
}
