// shots.js — screenshot presets for ?shot=start|play|buy|end&seed=N.
// The grader photographs these URLs, so each one must land the game in a
// readable, deterministic state without any click: menu over the map
// vista, mid-round with bots in view, buy menu open, round-end banner.
// Returns the shot name, or null when no ?shot= param was given.
export function readShotParams() {
  const q = new URLSearchParams(window.location.search);
  const shot = q.get('shot');
  const seed = Number.parseInt(q.get('seed') || '1', 10);
  return { shot: ['start', 'play', 'buy', 'end'].includes(shot) ? shot : null, seed: Number.isFinite(seed) ? seed : 1 };
}

// Applies a shot preset after the world is built. `api` is the small
// control surface main.js exposes: {state, player, loadout, bots, map,
// startMatch(), beginRoundNow(), setCameraVista()}.
export function applyShot(shot, api) {
  if (!shot) return;
  const { state, player } = api;
  if (shot === 'start') {
    state.phase = 'menu';
    api.setCameraVista();
  } else if (shot === 'play') {
    api.startMatch();
    state.phase = 'round';
    state.roundTime = 62; // mid-round: enough clock left to read as live play
    // Park the player mid-lane, aiming down the container row where two
    // Harbour bots patrol, so the HUD + enemies are both in frame.
    // NOTE (screenshot worker): player was at (0,14) — the container at
    // (-4,10) (x -9..1, z 8.7..11.3) fully occluded both bots from there.
    // Moved to (0,6), north of that container, so both bots have clear LOS.
    player.x = 0; player.z = 6; player.yaw = 0.15; player.pitch = 0;
    const foes = api.bots.filter((b) => b.team === 'harbour');
    if (foes[0]) { foes[0].x = -6; foes[0].z = -2; foes[0].yaw = Math.PI; }
    if (foes[1]) { foes[1].x = 5; foes[1].z = -6; foes[1].yaw = Math.PI; }
    api.syncBotTransforms();
  } else if (shot === 'buy') {
    api.startMatch();
    state.phase = 'buy';
    state.buyTime = 12;
    state.money = 4500; // enough to show prices + owned items
    player.x = 0; player.z = 16; player.yaw = 0; player.pitch = 0;
  } else if (shot === 'end') {
    api.startMatch();
    state.phase = 'roundEnd';
    state.roundWinner = 'tide';
    state.roundEndReason = 'elimination';
    state.wins.tide = 1;
    state.banner = 'Semua Harbour Ward tumbang — Tidebreakers menang ronde';
    player.x = 0; player.z = 12; player.yaw = 0; player.pitch = 0;
    for (const b of api.bots) {
      if (b.team === 'harbour') { b.alive = false; b.group.visible = false; }
    }
  }
}
