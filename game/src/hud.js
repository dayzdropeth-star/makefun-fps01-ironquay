// hud.js — DOM overlay: health, ammo, timer, score, money, killfeed,
// crosshair spread, buy menu, banners. All reads come from state;
// all clicks call back into main.js through the handlers object.
import { WEAPONS, WEAPON_ORDER, GRENADES } from './weapons.js';

export function createHud(handlers) {
  const el = (id) => document.getElementById(id);
  const hud = {
    hp: el('hp'), hpBar: el('hp-bar'), ammoMag: el('ammo-mag'), ammoReserve: el('ammo-reserve'),
    weaponName: el('weapon-name'), timer: el('timer'), score: el('score'),
    money: el('money'), kills: el('kills'), crosshair: el('crosshair'),
    hitmarker: el('hitmarker'), killfeed: el('killfeed'), banner: el('banner'),
    bannerText: el('banner-text'), bannerSub: el('banner-sub'),
    buyMenu: el('buy-menu'), buyList: el('buy-list'), buyMoney: el('buy-money'),
    plantBar: el('plant-bar'), plantFill: el('plant-fill'), plantLabel: el('plant-label'),
    flash: el('flash'), startOverlay: el('start-overlay'), endOverlay: el('end-overlay'),
    endTitle: el('end-title'), endSub: el('end-sub'), prompt: el('prompt'),
  };

  // Build the buy menu once: one row per weapon + one per grenade.
  for (const id of WEAPON_ORDER) {
    const w = WEAPONS[id];
    const row = document.createElement('button');
    row.className = 'buy-row'; row.type = 'button';
    row.innerHTML = `<span class="buy-name">${w.name}</span><span class="buy-meta">${w.damage} dmg · ${w.mag} peluru</span><span class="buy-price">$${w.price}</span>`;
    row.addEventListener('click', () => handlers.buyWeapon(id));
    hud.buyList.appendChild(row);
  }
  for (const g of Object.values(GRENADES)) {
    const row = document.createElement('button');
    row.className = 'buy-row'; row.type = 'button';
    row.innerHTML = `<span class="buy-name">${g.name}</span><span class="buy-meta">Granat · tekan ${g.key}</span><span class="buy-price">$${g.price}</span>`;
    row.addEventListener('click', () => handlers.buyGrenade(g.id));
    hud.buyList.appendChild(row);
  }

  function fmtTime(s) {
    const t = Math.max(0, Math.ceil(s));
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  }

  return {
    el: hud,
    update(state, player, loadout) {
      const w = WEAPONS[loadout.primary];
      const ammo = loadout.weapons[loadout.primary];
      hud.hp.textContent = Math.max(0, Math.ceil(player.hp));
      hud.hpBar.style.width = `${Math.max(0, player.hp)}%`;
      hud.hpBar.style.background = player.hp > 50 ? '#7fd4a0' : player.hp > 25 ? '#f0a830' : '#e05252';
      hud.ammoMag.textContent = ammo.mag;
      hud.ammoReserve.textContent = `/ ${ammo.reserve}`;
      hud.ammoMag.parentElement.classList.toggle('empty', ammo.mag === 0);
      hud.weaponName.textContent = w.name;
      hud.timer.textContent = state.phase === 'buy' ? `BELI ${fmtTime(state.buyTime)}` : fmtTime(state.roundTime);
      hud.timer.style.color = state.roundTime < 15 && state.phase === 'round' ? '#e05252' : '';
      hud.score.textContent = `${state.wins.tide} — ${state.wins.harbour}`;
      hud.money.textContent = `$${state.money}`;
      hud.kills.textContent = `Kill ${state.kills} · Ronde ${state.round}`;
      // Crosshair gap grows with bloom + movement spread.
      const gap = 4 + player.bloom * 14 + (player.moving ? 4 : 0) - player.ads * 3;
      hud.crosshair.style.setProperty('--gap', `${Math.max(2, gap)}px`);
      hud.crosshair.classList.toggle('ads', player.ads > 0.5);
      // Killfeed.
      hud.killfeed.innerHTML = state.killfeed.map((k) => `<div>${k}</div>`).join('');
      // Plant/defuse progress bar.
      const planting = state.bomb.plantProgress > 0;
      const defusing = state.bomb.defuseProgress > 0;
      hud.plantBar.style.display = planting || defusing ? 'block' : 'none';
      if (planting) {
        hud.plantLabel.textContent = 'MENANAM BOM…';
        hud.plantFill.style.width = `${state.bomb.plantProgress / 2.5 * 100}%`;
      } else if (defusing) {
        hud.plantLabel.textContent = 'MENJINAKKAN BOM…';
        hud.plantFill.style.width = `${state.bomb.defuseProgress / 5 * 100}%`;
      }
      // Flash overlay.
      hud.flash.style.opacity = String(Math.max(0, state.flash));
      // Buy menu only during the buy phase.
      const showBuy = state.phase === 'buy';
      hud.buyMenu.classList.toggle('open', showBuy);
      if (showBuy) hud.buyMoney.textContent = `$${state.money}`;
      // Round-end / match-end banner.
      const showBanner = state.phase === 'roundEnd' || state.phase === 'matchEnd';
      hud.banner.classList.toggle('show', showBanner);
      if (showBanner) {
        hud.bannerText.textContent = state.banner;
        hud.bannerSub.textContent = state.phase === 'matchEnd'
          ? `Skor akhir ${state.wins.tide} — ${state.wins.harbour}. Klik untuk main lagi.`
          : `Skor ${state.wins.tide} — ${state.wins.harbour} · ronde berikutnya segera…`;
      }
      hud.endOverlay.classList.toggle('show', state.phase === 'matchEnd');
      if (state.phase === 'matchEnd') {
        hud.endTitle.textContent = state.matchWinner === 'tide' ? 'TIDEBREAKERS MENANG' : 'HARBOUR WARD MENANG';
        hud.endSub.textContent = `Skor akhir ${state.wins.tide} — ${state.wins.harbour} · ${state.kills} kill`;
      }
    },
    showHitmarker(kill) {
      hud.hitmarker.classList.add('on');
      if (kill) hud.hitmarker.classList.add('kill');
      setTimeout(() => hud.hitmarker.classList.remove('on', 'kill'), 120);
    },
    setPrompt(text) { hud.prompt.textContent = text || ''; },
    showStart(show) { hud.startOverlay.classList.toggle('hidden', !show); },
  };
}
