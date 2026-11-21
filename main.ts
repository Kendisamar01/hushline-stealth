import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repository = fileURLToPath(new URL('.', import.meta.url));
const output = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameDirectory = join(repository, 'game');
const pictureDirectory = join(repository, 'screenshots');

for (const directory of [gameDirectory, pictureDirectory]) {
  if (!existsSync(directory)) throw new Error(`Missing hand-in folder: ${directory}`);
}

mkdirSync(output, { recursive: true });
for (const folder of ['game', 'screenshots', 'dossier.json']) {
  rmSync(join(output, folder), { recursive: true, force: true });
}
cpSync(gameDirectory, join(output, 'game'), { recursive: true });
cpSync(pictureDirectory, join(output, 'screenshots'), { recursive: true });

const dossier = buildDossier(output, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(output, 'dossier.json'), dossier);

console.log(`Hushline Nights handed in to ${output}`);
console.log(`dossier.json: ${dossier.byteLength} bytes`);
