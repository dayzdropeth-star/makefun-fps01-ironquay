// IRONQUAY — entry point for the make.fun threejs-fps-01 bounty.
// The playable game is the plain static folder game/ beside this file:
// ES modules, three.js vendored locally, no build step, no network.
// This script copies game/ and screenshots/ into the output directory
// (MAKEFUN_OUTPUT_DIR, default /output) and writes dossier.json there
// with the vendored make.fun library, exactly the way the starter does.
//
// Run it locally with:
//   mkdir -p /tmp/out && MAKEFUN_OUTPUT_DIR=/tmp/out node main.ts
// Serve the result with any static server, e.g. from the output dir:
//   python3 -m http.server 8080 --directory game

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-threejs.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail fast with a clear message if the game folder is missing or has no
// entry point, instead of producing an empty dossier the scorer rejects.
if (!existsSync(join(here, 'game', 'index.html'))) {
  throw new Error('IRONQUAY: game/index.html not found beside main.ts — nothing to package');
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// Scorer caps (reference/gate.json): only text_max_bytes shapes the bytes;
// the rest refuse an entry the scorer would refuse (more than 4 screenshots
// or one over 256 KiB; more than 993 files in game/ or 48 MiB of game files,
// counting beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, game_max_files: 993, game_max_bytes: 50331648 }),
);
