# makefun-fps01-ironquay

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/dayzdropeth-star/makefun-fps01-ironquay/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/dayzdropeth-star/makefun-fps01-ironquay/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

IRONQUAY is a round-based tactical FPS built with three.js: Tidebreakers (you + 4 bots) attack Harbour Ward (5 bots) in the Iron Quay, a night container port lit by sodium lamps. Win a round by eliminating the enemy team or by planting the bomb at Site A (Drydock) or Site B (Warehouse) and holding it through the 40-second fuse. First to 5 rounds wins the match. Money earned from kills, plants and round wins buys rifles, an SMG, a shotgun, a sniper and grenades between rounds. Gunplay rewards stopping to aim — spread and recoil punish firing on the move, crouching and ADS tighten it. Single-player against bots, procedural art only, no network needed.

## Run it

```sh
python3 -m http.server 8080 --directory game
```

Open http://localhost:8080, click to play. Deterministic replays: add `?seed=1` to the URL.

## Controls

- WASD move · mouse look · left click fire · right click ADS
- R reload · Shift sprint · Ctrl/C crouch · Space jump
- E (hold) plant the bomb on a site · 3 Squall Frag · 4 Fog Flash
- 1/2 switch weapon · M mute · buy menu opens automatically during buy phase — click a row to buy

## Screenshot URLs

- `game/index.html?shot=start&seed=1` — menu over the map vista
- `game/index.html?shot=play&seed=1` — mid-round, HUD + bots in view
- `game/index.html?shot=buy&seed=1` — buy menu open
- `game/index.html?shot=end&seed=1` — round-end banner

---

<sub>Entered on [make.fun](https://make.fun/?ref=&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
