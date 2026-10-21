/**
 * Campaign 3D and Defense enemies, bosses, ship projectiles and props (items)
 * from generated (Meshy/Tripo) GLBs: the Blender authoring helper normalizes each raw source with its preset
 * orientation and budget, then the GLB packager adds it to the model manifest.
 *
 * Sources: art-src/3d/<preset source> (local, not in Git). art-src/3d mirrors
 * the 2D art: the model made from art-src/enemies/rainbow-scout.png is
 * art-src/3d/enemies/rainbow-scout.glb (art-src/3d/README.md). An entry whose
 * own model is not made yet names a `placeholder` (the nearest existing
 * model); it builds from that until its own file appears. Then the entry
 * waits for review (its rotate was tuned for the stand-in) until the
 * placeholder is dropped from the preset.
 * Presets: scripts/models/presets/campaign3d-models.json.
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findBlender, PROJECT_ROOT, runCommand } from './prepare-ship-models.mjs';
import { MODEL_CONTRACTS } from '../../src/render3d/model-contracts.ts';

export const SOURCE_ROOT = 'art-src/3d';
const KINDS = ['enemies', 'bosses', 'skills', 'items'];
const NOSES = ['+X', '-X', '+Y', '-Y'];
const sha = (value) => createHash('sha256').update(value).digest('hex');
const fileHash = async (path) => sha(await readFile(path));

export function validatePreset(key, value) {
  const [kind, id] = key.split('/');
  if (!KINDS.includes(kind) || !/^[a-z0-9][a-z0-9-]*$/.test(id ?? '')) throw new Error(key + ': key must be <enemies|bosses|skills|items>/<id>');
  const safe = (path) => typeof path === 'string' && path.endsWith('.glb') && !path.includes('..') && !path.startsWith('/');
  if (!safe(value?.source)) throw new Error(key + ': source must be a .glb path under ' + SOURCE_ROOT);
  if (value.placeholder != null && (!safe(value.placeholder) || value.placeholder === value.source)) throw new Error(key + ': placeholder must be another .glb path under ' + SOURCE_ROOT);
  if (value.rotate != null && (!Array.isArray(value.rotate) || value.rotate.length !== 9 || !value.rotate.every(Number.isFinite))) throw new Error(key + ': rotate must be nine numbers');
  if (value.nose != null && !NOSES.includes(value.nose)) throw new Error(key + ': nose must be one of ' + NOSES.join(', '));
  if (value.facing != null && !['+Y', '-Y'].includes(value.facing)) throw new Error(key + ': facing must be +Y or -Y');
  const { min, max } = MODEL_CONTRACTS[kind].triangles;
  if (!Number.isInteger(value.triangles) || value.triangles < min || value.triangles > max) throw new Error(key + ': triangles must be an integer in ' + min + '–' + max);
  if (!Number.isFinite(value.autoEmissive ?? 0) || (value.autoEmissive ?? 0) < 0 || (value.autoEmissive ?? 0) > 1) throw new Error(key + ': autoEmissive must be in [0, 1]');
  if (typeof value.reviewed !== 'boolean') throw new Error(key + ': reviewed must be true or false');
  return { kind, id, ...value, nose: value.nose ?? '+Y', facing: value.facing ?? '+Y', autoEmissive: value.autoEmissive ?? 0 };
}

/** The file an entry builds from: its own model, else its placeholder while that is missing (null: neither exists). */
export function resolveSource(root, entry) {
  const own = join(root, SOURCE_ROOT, entry.source);
  if (existsSync(own)) return { path: own, placeholder: false };
  const stand = entry.placeholder ? join(root, SOURCE_ROOT, entry.placeholder) : null;
  return stand !== null && existsSync(stand) ? { path: stand, placeholder: true } : null;
}

/**
 * What a build depends on: the source's content (not its path, so moving or
 * renaming a file costs no rebuild), the preset numbers and the tools.
 */
export function cacheSignature(value, sourceHash, shared, packaged) {
  const { source, placeholder, note, ...numbers } = value;
  return sha(JSON.stringify({ version: 2, source: sourceHash, entry: numbers, ...shared, package: packaged }));
}

export function blenderArguments(root, entry, input = join(root, SOURCE_ROOT, entry.source)) {
  const args = ['--background', '--factory-startup', '--python-exit-code', '1', '--python', join(root, 'scripts/models/blender/space_typing_model_tools.py'), '--',
    '--input', input, '--kind', entry.kind, '--id', entry.id, '--project', root,
    '--nose=' + entry.nose, '--facing=' + entry.facing, '--tris', String(entry.triangles), '--auto-emissive', String(entry.autoEmissive)];
  // Inline form: a leading "-1" would otherwise parse as an option.
  if (entry.rotate) args.push('--rotate=' + entry.rotate.join(','));
  return args;
}

function runtimePaths(root, kind, id) {
  return ['high', 'medium'].map((tier) => join(root, 'public/assets/space-typing/models', kind, id, id + '.' + tier + '.glb'));
}

async function readJson(path, fallback = null) {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}

async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = path + '.tmp-' + process.pid;
  await writeFile(temporary, JSON.stringify(value, null, 2) + '\n');
  await rename(temporary, path);
}

async function validRuntimeEntry(root, kind, id) {
  const entry = (await readJson(join(root, 'public/assets/space-typing/models/manifest.json')))?.models?.[kind + '/' + id];
  if (!entry || MODEL_CONTRACTS[kind].requiredSockets.some((socket) => !entry.sockets?.includes(socket))) return false;
  return ['high', 'medium'].every((tier) => entry.tiers?.[tier]?.url?.split('?')[0] === '/assets/space-typing/models/' + kind + '/' + id + '/' + id + '.' + tier + '.glb')
    && runtimePaths(root, kind, id).every(existsSync);
}

/** Injectable command runner and root keep the workflow testable without Blender. */
export async function prepareCampaign3DModels(options = {}) {
  const root = resolve(options.root ?? PROJECT_ROOT);
  const log = options.log ?? console.log;
  const execute = options.runCommand ?? runCommand;
  const presetFile = resolve(root, options.presetFile ?? 'scripts/models/presets/campaign3d-models.json');
  const preset = await readJson(presetFile);
  if (preset?.version !== 1 || !preset.models || typeof preset.models !== 'object') throw new Error('Invalid preset file: ' + presetFile);
  const only = options.only ? new Set(options.only.split(',')) : null;
  const keys = Object.keys(preset.models).filter((key) => (!only || only.has(key)) && (!options.kind || key.startsWith(options.kind + '/')));
  if (only) for (const key of only) if (!preset.models[key]) throw new Error('Unknown preset key: ' + key);
  const shared = {
    helperHash: await fileHash(join(root, 'scripts/models/blender/space_typing_model_tools.py')),
    packagerHash: await fileHash(join(root, 'scripts/models/prepare-models.ts')),
    contractsHash: await fileHash(join(root, 'src/render3d/model-contracts.ts')),
    dependencyHash: existsSync(join(root, 'pnpm-lock.yaml')) ? await fileHash(join(root, 'pnpm-lock.yaml')) : null,
  };
  const results = [];
  let blender = null;
  for (const key of keys) {
    try {
      const entry = validatePreset(key, preset.models[key]);
      const source = resolveSource(root, entry);
      if (source === null) { results.push({ key, status: 'missing' }); log('MISSING ' + key + ': ' + join(root, SOURCE_ROOT, entry.source)); continue; }
      const cacheFile = join(root, 'art-src/models/.campaign3d-model-cache', entry.kind + '__' + entry.id + '.json');
      const cache = await readJson(cacheFile);
      if (source.placeholder && !options.force && typeof cache?.source === 'string' && cache.source.endsWith(join(SOURCE_ROOT, entry.source))) {
        // The real model was built and its file is gone: keep that build rather than overwrite it with the stand-in.
        results.push({ key, status: 'missing' }); log('MISSING ' + key + ': its own model ' + entry.source + ' was built before and is gone; the built model is kept (--force builds the placeholder)'); continue;
      }
      if (!source.placeholder && entry.placeholder && !options.force) {
        // The preset's rotate was tuned for the stand-in: look at the new model before it replaces the runtime one.
        results.push({ key, status: 'review' }); log('REVIEW ' + key + ': its own model ' + entry.source + ' is in; check its orientation (rotate, facing), then drop "placeholder" from ' + presetFile + ' (or rerun with --force)'); continue;
      }
      if (source.placeholder) log('NOTE ' + key + ': its own model ' + entry.source + ' is not made yet; building from the placeholder ' + entry.placeholder);
      if (!entry.reviewed) log('NOTE ' + key + ': orientation not yet marked reviewed in ' + presetFile);
      const processed = join(root, 'art-src/models', entry.kind, entry.id + '.glb');
      const outputs = [processed, ...(!options.noPackage ? runtimePaths(root, entry.kind, entry.id) : [])];
      const signature = cacheSignature(preset.models[key], await fileHash(source.path), shared, !options.noPackage);
      let cached = !options.force && cache?.signature === signature && (options.noPackage || await validRuntimeEntry(root, entry.kind, entry.id));
      if (cached) for (const path of outputs) {
        if (!existsSync(path) || await fileHash(path) !== cache.outputs?.[path]) { cached = false; break; }
      }
      if (cached) { results.push({ key, status: 'cached' }); log('CACHED ' + key); continue; }
      const args = blenderArguments(root, entry, source.path);
      if (options.dryRun) { results.push({ key, status: 'planned', args }); log('PLAN ' + key + ': ' + entry.triangles + ' triangles, nose ' + entry.nose + ', facing ' + entry.facing); continue; }
      blender ??= await findBlender(options.blender);
      await execute(blender, args, { cwd: root });
      if (!existsSync(processed)) throw new Error('Blender did not write ' + processed);
      if (!options.noPackage) {
        await execute(process.execPath, ['--import', 'tsx', join(root, 'scripts/models/prepare-models.ts'), '--only', key], { cwd: root });
        if (!await validRuntimeEntry(root, entry.kind, entry.id)) throw new Error('Packager did not produce a complete model manifest entry');
      }
      const hashes = {};
      for (const path of outputs) hashes[path] = await fileHash(path);
      await writeJsonAtomic(cacheFile, { version: 2, signature, source: source.path, outputs: hashes });
      results.push({ key, status: 'pass' }); log('PASS ' + key);
    } catch (error) {
      results.push({ key, status: 'failed', detail: error.message }); log('FAIL ' + key + ': ' + error.message);
    }
  }
  const failures = results.filter((result) => ['failed', 'missing', 'review'].includes(result.status)).length;
  const counts = results.reduce((all, result) => ({ ...all, [result.status]: (all[result.status] ?? 0) + 1 }), {});
  log('Campaign 3D models: ' + Object.entries(counts).map(([status, count]) => status + ' ' + count).join(', '));
  return { results, failures };
}

export function parseArguments(args) {
  const options = {};
  const values = { '--only': 'only', '--kind': 'kind', '--blender': 'blender', '--preset': 'presetFile' };
  const flags = { '--dry-run': 'dryRun', '--force': 'force', '--no-package': 'noPackage' };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (flags[arg]) { options[flags[arg]] = true; continue; }
    const [name, inline] = arg.split(/=(.*)/s);
    if (!values[name]) throw new Error('Unknown option: ' + arg);
    const value = inline ?? args[++index];
    if (!value || value.startsWith('--')) throw new Error('Missing value for ' + name);
    options[values[name]] = value;
  }
  if (options.kind && !KINDS.includes(options.kind)) throw new Error('--kind must be one of ' + KINDS.join(', '));
  return options;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  prepareCampaign3DModels(parseArguments(process.argv.slice(2))).then(({ failures }) => { if (failures) process.exitCode = 1; }).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
