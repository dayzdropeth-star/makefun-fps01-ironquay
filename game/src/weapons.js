// weapons.js — the IRONQUAY arsenal. All numbers are balance data; the
// firing itself lives in combat.js, the viewmodel in viewmodel.js.
export const WEAPONS = {
  gull: {
    id: 'gull', name: 'P9 "Gull"', price: 0, damage: 26, headMult: 4,
    fireInterval: 0.16, mag: 12, reserveMax: 48, reloadMs: 1100,
    auto: false, pellets: 1, spread: 0.011, moveSpread: 0.02,
    adsSpreadMult: 0.45, range: 45, falloffStart: 18, falloffEnd: 45, falloffMin: 0.55,
    kick: 0.011, tracer: 0xd8dee6,
  },
  breakwater: {
    id: 'breakwater', name: 'Breakwater-12', price: 1200, damage: 13, headMult: 2,
    fireInterval: 0.85, mag: 5, reserveMax: 20, reloadMs: 2400,
    auto: false, pellets: 8, spread: 0.055, moveSpread: 0.07,
    adsSpreadMult: 0.7, range: 22, falloffStart: 8, falloffEnd: 22, falloffMin: 0.3,
    kick: 0.05, tracer: 0xffc46b,
  },
  riptide: {
    id: 'riptide', name: 'Riptide-9', price: 1500, damage: 24, headMult: 4,
    fireInterval: 0.085, mag: 28, reserveMax: 84, reloadMs: 1500,
    auto: true, pellets: 1, spread: 0.02, moveSpread: 0.032,
    adsSpreadMult: 0.5, range: 35, falloffStart: 14, falloffEnd: 35, falloffMin: 0.5,
    kick: 0.014, tracer: 0xd8dee6,
  },
  kestrel: {
    id: 'kestrel', name: 'KR-41 Kestrel', price: 2700, damage: 34, headMult: 4,
    fireInterval: 0.105, mag: 25, reserveMax: 75, reloadMs: 1900,
    auto: true, pellets: 1, spread: 0.014, moveSpread: 0.026,
    adsSpreadMult: 0.4, range: 60, falloffStart: 25, falloffEnd: 60, falloffMin: 0.6,
    kick: 0.02, tracer: 0xffd27a,
  },
  longshoreman: {
    id: 'longshoreman', name: 'Longshoreman-50', price: 4750, damage: 95, headMult: 4,
    fireInterval: 1.25, mag: 5, reserveMax: 15, reloadMs: 2800,
    auto: false, pellets: 1, spread: 0.004, moveSpread: 0.045,
    adsSpreadMult: 0.25, range: 90, falloffStart: 40, falloffEnd: 90, falloffMin: 0.75,
    kick: 0.075, tracer: 0x9fd8ff,
  },
};

export const WEAPON_ORDER = ['gull', 'breakwater', 'riptide', 'kestrel', 'longshoreman'];

export const GRENADES = {
  frag: { id: 'frag', name: 'Squall Frag', price: 300, radius: 7, damage: 120, key: '3' },
  flash: { id: 'flash', name: 'Fog Flash', price: 200, radius: 14, key: '4' },
};

// Damage multiplier by distance: full up to falloffStart, then linear down
// to falloffMin at falloffEnd, flat after that.
export function damageAtRange(weapon, dist) {
  if (dist <= weapon.falloffStart) return 1;
  if (dist >= weapon.falloffEnd) return weapon.falloffMin;
  const t = (dist - weapon.falloffStart) / (weapon.falloffEnd - weapon.falloffStart);
  return 1 - t * (1 - weapon.falloffMin);
}

// Zone multiplier: head x4 (weapon headMult), body x1, legs x0.75.
export function zoneMultiplier(weapon, zone) {
  if (zone === 'head') return weapon.headMult;
  if (zone === 'legs') return 0.75;
  return 1;
}

export function freshLoadout() {
  const w = WEAPONS.gull;
  return {
    primary: 'gull',
    weapons: { gull: { mag: w.mag, reserve: w.reserveMax } },
    grenades: { frag: 0, flash: 0 },
  };
}
