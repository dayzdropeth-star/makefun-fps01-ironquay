// rounds.js — round lifecycle: buy phase -> round -> round end -> next
// round or match end. Win conditions: elimination, bomb detonation,
// defusal, or timeout (defenders win a timeout with no plant).
import { ROUND_TIME, BUY_TIME, WIN_ROUNDS, ROUND_WIN_MONEY, ROUND_LOSS_MONEY, PLANT_MONEY, resetForRound } from './state.js';

export function startBuyPhase(state) {
  state.phase = 'buy';
  state.buyTime = BUY_TIME;
  resetForRound(state);
}

export function startRound(state) {
  state.phase = 'round';
  state.roundTime = ROUND_TIME;
  state.bomb.status = 'carried';
  state.bomb.site = null;
  state.bomb.fuse = 0;
}

// Called every fixed tick while phase is 'buy' or 'round'.
export function tickRounds(state, dt, hooks) {
  if (state.phase === 'buy') {
    state.buyTime -= dt;
    if (state.buyTime <= 0) startRound(state);
    return;
  }
  if (state.phase !== 'round') return;
  state.roundTime -= dt;

  // Bomb fuse counts down once planted.
  if (state.bomb.status === 'planted') {
    state.bomb.fuse -= dt;
    if (state.bomb.fuse <= 0) {
      endRound(state, 'tide', 'detonation', 'BOM MELEDAK — Tidebreakers menang ronde', hooks);
      return;
    }
  }
  if (state.roundTime <= 0) {
    // No plant in time: the defenders hold the quay.
    endRound(state, 'harbour', 'timeout', 'Waktu habis — Harbour Ward bertahan', hooks);
  }
}

export function endRound(state, winner, reason, banner, hooks) {
  if (state.phase === 'roundEnd' || state.phase === 'matchEnd') return;
  state.phase = 'roundEnd';
  state.roundWinner = winner;
  state.roundEndReason = reason;
  state.banner = banner;
  if (winner === 'tide') state.wins.tide += 1; else state.wins.harbour += 1;
  // Economy: winners +$3250, losers +$1900 (on the player's side).
  state.money += winner === 'tide' ? ROUND_WIN_MONEY : ROUND_LOSS_MONEY;
  hooks?.onRoundEnd?.(state, winner, reason);
  if (state.wins.tide >= WIN_ROUNDS || state.wins.harbour >= WIN_ROUNDS) {
    state.phase = 'matchEnd';
    state.matchWinner = state.wins.tide >= WIN_ROUNDS ? 'tide' : 'harbour';
    state.banner = state.matchWinner === 'tide'
      ? 'TIDEBREAKERS MENANG MATCH 5 RONDE'
      : 'HARBOUR WARD MENANG MATCH';
    hooks?.onMatchEnd?.(state);
  }
}

// Next round after the end banner has been shown for a few seconds.
export function nextRound(state) {
  state.round += 1;
  startBuyPhase(state);
}

// Elimination check, called whenever a bot or the player dies.
export function checkElimination(state, bots, playerAlive, hooks) {
  if (state.phase !== 'round') return;
  const harbourAlive = bots.some((b) => b.team === 'harbour' && b.alive);
  const tideAlive = bots.some((b) => b.team === 'tide' && b.alive) || playerAlive;
  if (!harbourAlive) {
    endRound(state, 'tide', 'elimination', 'Semua Harbour Ward tumbang — Tidebreakers menang ronde', hooks);
  } else if (!tideAlive) {
    endRound(state, 'harbour', 'elimination', 'Tim Tidebreakers habis — Harbour Ward menang ronde', hooks);
  }
}

export function plantBomb(state, siteId, hooks) {
  state.bomb.status = 'planted';
  state.bomb.site = siteId;
  state.bomb.fuse = 40;
  state.money += PLANT_MONEY;
  state.plants += 1;
  hooks?.onPlanted?.(state, siteId);
}

export function defuseBomb(state, hooks) {
  state.bomb.status = 'gone';
  endRound(state, 'harbour', 'defused', 'Bom dijinakkan — Harbour Ward menang ronde', hooks);
}
