// state.js — one plain object holding all match state. No DOM, no three.js
// here, so rounds.js / combat.js / main.js all read the same truth.
export const ROUND_TIME = 100; // seconds per round
export const BUY_TIME = 15; // seconds of buy phase between rounds
export const WIN_ROUNDS = 5; // first team to this many rounds wins the match
export const START_MONEY = 800;
export const ROUND_WIN_MONEY = 3250;
export const ROUND_LOSS_MONEY = 1900;
export const KILL_MONEY = 300;
export const PLANT_MONEY = 300;
export const PLANT_TIME = 2.5; // seconds holding E on a site
export const BOMB_FUSE = 40; // seconds from plant to detonation
export const DEFUSE_TIME = 5; // seconds holding E on a planted bomb

export function createState(seed = 1) {
  return {
    seed,
    // 'menu' | 'buy' | 'round' | 'roundEnd' | 'matchEnd'
    phase: 'menu',
    round: 1,
    wins: { tide: 0, harbour: 0 },
    money: START_MONEY,
    kills: 0,
    deaths: 0,
    plants: 0,
    roundTime: ROUND_TIME,
    buyTime: BUY_TIME,
    // Bomb: 'carried' (player holds it) | 'planted' | 'gone'
    bomb: { status: 'carried', site: null, fuse: 0, plantProgress: 0, defuseProgress: 0 },
    roundEndReason: '', // e.g. 'elimination' | 'detonation' | 'defused' | 'timeout'
    roundWinner: null, // 'tide' | 'harbour' | null
    matchWinner: null,
    banner: '', // short text the HUD shows on round end
    killfeed: [], // newest-first strings, capped by hud.js
    flash: 0, // 0..1 white-flash strength (Fog Flash grenade)
    muted: false,
    time: 0, // total seconds since the page loaded
  };
}

export function resetForRound(state) {
  state.roundTime = ROUND_TIME;
  state.bomb = { status: 'carried', site: null, fuse: 0, plantProgress: 0, defuseProgress: 0 };
  state.roundEndReason = '';
  state.roundWinner = null;
  state.banner = '';
  state.flash = 0;
}

export function addKillfeed(state, text) {
  state.killfeed.unshift(text);
  if (state.killfeed.length > 5) state.killfeed.length = 5;
}
