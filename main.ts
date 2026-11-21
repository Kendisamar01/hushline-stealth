// Hushline hand-in program (Node 22, standard library only).
// It stages this repository's static game/ and screenshots/ into the output directory, then
// writes dossier.json with the kit's unchanged buildDossier library. No network, no build step.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repository = fileURLToPath(new URL('.', import.meta.url));
const output = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
const gameSource = join(repository, 'game');
const shotSource = join(repository, 'screenshots');

if (!existsSync(join(gameSource, 'index.html'))) {
  throw new Error('game/index.html is missing: the hand-in needs a playable static game');
}

mkdirSync(output, { recursive: true });
cpSync(gameSource, join(output, 'game'), { recursive: true });
mkdirSync(join(output, 'screenshots'), { recursive: true });
if (existsSync(shotSource)) {
  cpSync(shotSource, join(output, 'screenshots'), { recursive: true });
}

const dossier = buildDossier(output, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(output, 'dossier.json'), dossier);
process.stdout.write(`Hushline handed in to ${output}: ${dossier.byteLength} dossier bytes\n`);
