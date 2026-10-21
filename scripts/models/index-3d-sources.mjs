#!/usr/bin/env node
/**
 * Rewrites art-src/3d/SOURCES.json from the files on disk: each owner GLB's
 * md5 and size, the 2D image it mirrors, the build entries that read it, and
 * the 2D images whose own model is not made yet (built from a placeholder).
 * The recorded history and the list of originals missing from this machine
 * are kept. Run after adding, renaming or replacing a model:
 *
 *   node scripts/models/index-3d-sources.mjs
 *
 * Rule (art-src/3d/README.md): art-src/<path>/<name>.png -> art-src/3d/<path>/<name>.glb.
 * Ships: art-src/ships/ship-NN-<id>-2d.png -> art-src/3d/ships/ship-NN-<id>.glb
 * (Vanguard's image is art-src/ships/vanguard-top-hd.png). skills/ and items/
 * hold Text to 3D models that have no 2D image.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHIP_VISUAL_CATALOG } from '../ships/ship-sources.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const TREE = 'art-src/3d';
const TEXT_TO_3D = ['skills/', 'items/'];

/** The 2D image a model under art-src/3d mirrors (null for Text to 3D models). */
export function mirrorImage(file) {
  if (TEXT_TO_3D.some((folder) => file.startsWith(folder))) return null;
  if (file === 'ships/ship-01-vanguard.glb') return 'art-src/ships/vanguard-top-hd.png';
  if (file.startsWith('ships/')) return 'art-src/' + file.replace(/\.glb$/, '-2d.png');
  return 'art-src/' + file.replace(/\.glb$/, '.png');
}

/** Build entries that read each file: the Campaign 3D preset, the ship catalog and the G01 packagers. */
export function readers(preset) {
  const used = {};
  const add = (file, who) => (used[file] ??= []).push(who);
  for (const [key, value] of Object.entries(preset.models)) {
    add(value.source, key);
    if (value.placeholder) add(value.placeholder, key + ' (placeholder)');
  }
  for (const visual of SHIP_VISUAL_CATALOG) {
    const numbered = visual.rawModelSources.find((name) => /^ship-\d\d-/.test(name));
    if (numbered) add('ships/' + numbered, 'ships/' + visual.id);
  }
  for (const who of ['bosses/tyrant-g01', 'bosses/3d/tyrant-g01 (prepare-boss-3d)', 'bosses/auriel-hero (--hero-clips)']) add('bosses/tyrant-g01.glb', who);
  return used;
}

export function indexSources(root = ROOT) {
  const tree = join(root, TREE);
  const preset = JSON.parse(readFileSync(join(root, 'scripts/models/presets/campaign3d-models.json'), 'utf8'));
  const previous = existsSync(join(tree, 'SOURCES.json')) ? JSON.parse(readFileSync(join(tree, 'SOURCES.json'), 'utf8')) : {};
  const used = readers(preset);
  const glbs = readdirSync(tree, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.glb'))
    .map((entry) => relative(tree, join(entry.parentPath ?? entry.path, entry.name)).split(sep).join('/')).sort();
  const files = {};
  const noImage = [];
  for (const file of glbs) {
    const bytes = readFileSync(join(tree, file));
    const image = mirrorImage(file);
    if (image !== null && !existsSync(join(root, image))) noImage.push(file);
    files[file] = {
      md5: createHash('md5').update(bytes).digest('hex'),
      bytes: statSync(join(tree, file)).size,
      image: image !== null && existsSync(join(root, image)) ? image : null,
      usedBy: used[file] ?? [],
      ...(previous.files?.[file]?.downloadedAs ? { downloadedAs: previous.files[file].downloadedAs } : {}),
    };
  }
  const notMadeYet = {};
  for (const [file, value] of Object.entries(previous.notMadeYet ?? {})) if (!files[file]) notMadeYet[file] = value;
  for (const [key, value] of Object.entries(preset.models)) {
    if (!value.placeholder || files[value.source]) continue;
    notMadeYet[value.source] = { image: mirrorImage(value.source), standIn: value.placeholder, usedBy: used[value.source] ?? [key] };
  }
  const out = {
    version: 1,
    rule: 'art-src/<path>/<name>.png -> art-src/3d/<path>/<name>.glb (ships: art-src/ships/ship-NN-<id>-2d.png -> art-src/3d/ships/ship-NN-<id>.glb; skills/ and items/ hold Text to 3D models with no 2D image). Owner originals from Tripo/Meshy, never edited; pipelines read them and write processed copies elsewhere. Regenerate: node scripts/models/index-3d-sources.mjs',
    files,
    notMadeYet: Object.fromEntries(Object.entries(notMadeYet).sort(([a], [b]) => a.localeCompare(b))),
    noOriginalOnThisMachine: previous.noOriginalOnThisMachine ?? {},
    history: previous.history ?? {},
  };
  return { out, noImage };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { out, noImage } = indexSources();
  writeFileSync(join(ROOT, TREE, 'SOURCES.json'), JSON.stringify(out, null, 1) + '\n');
  const unused = Object.entries(out.files).filter(([, value]) => value.usedBy.length === 0).length;
  console.log(TREE + '/SOURCES.json: ' + Object.keys(out.files).length + ' models, ' + Object.keys(out.notMadeYet).length + ' not made yet, ' + unused + ' read by no build');
  for (const file of noImage) console.log('WARN ' + TREE + '/' + file + ': no 2D image at ' + mirrorImage(file) + ' (name it after its 2D art)');
  if (noImage.length) process.exitCode = 1;
}
