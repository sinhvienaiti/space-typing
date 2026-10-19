/** Raw ship models use the existing Blender authoring helper and GLB packager. */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { discoverShipSources, SHIP_VISUAL_CATALOG } from '../ships/ship-sources.mjs';

export const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const AXES = ['+X', '-X', '+Y', '-Y'];
const sha = (value) => createHash('sha256').update(value).digest('hex');
const fileHash = async (path) => sha(await readFile(path));

export function validateShipPreset(id, value) {
  if (!value || typeof value !== 'object') throw new Error(id + ': missing per-ship preset');
  if (value.nose !== null && !AXES.includes(value.nose)) throw new Error(id + ': nose must be one of ' + AXES.join(', ') + ', or null pending review');
  if (!Number.isFinite(value.yaw ?? 0)) throw new Error(id + ': yaw must be finite');
  if (!Number.isInteger(value.triangles ?? 12000) || (value.triangles ?? 12000) < 3000) throw new Error(id + ': triangles must be an integer >= 3000');
  if (!Number.isFinite(value.autoEmissive ?? 0.08) || (value.autoEmissive ?? 0.08) < 0 || (value.autoEmissive ?? 0.08) > 1) throw new Error(id + ': autoEmissive must be in [0, 1]');
  if (value.sockets != null && typeof value.sockets !== 'string') throw new Error(id + ': sockets must be a JSON filename');
  if (typeof value.reviewed !== 'boolean') throw new Error(id + ': reviewed must be true or false');
  return { ...value, yaw: value.yaw ?? 0, triangles: value.triangles ?? 12000, autoEmissive: value.autoEmissive ?? 0.08 };
}

export function blenderArguments({ root, source, preset, presetFile, preview = false, saveBlend = false }) {
  const args = ['--background', '--factory-startup', '--python-exit-code', '1', '--python', join(root, 'scripts/models/blender/space_typing_model_tools.py'), '--',
    '--input', source.path, '--kind', 'ships', '--id', source.id, '--project', root,
    '--nose=' + preset.nose, '--yaw', String(preset.yaw), '--tris', String(preset.triangles), '--auto-emissive', String(preset.autoEmissive)];
  if (preset.sockets) args.push('--sockets-json', resolve(dirname(presetFile), preset.sockets));
  if (preview) args.push('--preview', join(root, '.visual/ship-models', source.id));
  if (saveBlend) args.push('--save-blend', join(root, 'art-src/models/blend/ships', source.id + '.blend'));
  return args;
}

export async function findBlender(explicit, env = process.env) {
  const candidates = [explicit, env.BLENDER_BIN,
    '/Applications/Blender.app/Contents/MacOS/Blender',
    ...(env.PATH ?? '').split(':').filter(Boolean).map((dir) => join(dir, process.platform === 'win32' ? 'blender.exe' : 'blender'))].filter(Boolean);
  for (const candidate of candidates) {
    try { await access(candidate, constants.X_OK); return candidate; } catch { /* Try next installation. */ }
  }
  throw new Error('Blender CLI not found. Set BLENDER_BIN or pass --blender /path/to/blender; raw sources and existing game models were kept.');
}

export function runCommand(command, args, options = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { cwd: options.cwd, stdio: 'inherit', shell: false });
    child.on('error', reject);
    child.on('close', (code, signal) => code === 0 ? resolveRun() : reject(new Error(command + ' exited ' + (signal ?? code))));
  });
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

function runtimePaths(root, id) {
  return ['high', 'medium'].map((tier) => join(root, 'public/assets/space-typing/models/ships', id, id + '.' + tier + '.glb'));
}

async function validRuntimeEntry(root, id) {
  const manifest = await readJson(join(root, 'public/assets/space-typing/models/manifest.json'));
  const entry = manifest?.models?.['ships/' + id];
  const required = ['FX_ENGINE_L', 'FX_ENGINE_R', 'FX_MUZZLE', 'FX_CORE'];
  if (!entry || required.some((socket) => !entry.sockets?.includes(socket))) return false;
  return ['high', 'medium'].every((tier) => entry.tiers?.[tier]?.url?.split('?')[0] === '/assets/space-typing/models/ships/' + id + '/' + id + '.' + tier + '.glb')
    && runtimePaths(root, id).every(existsSync);
}

/** Injectable command runner and root keep the production workflow testable without Blender. */
export async function prepareShipModels(options = {}) {
  const root = resolve(options.root ?? PROJECT_ROOT);
  const log = options.log ?? console.log;
  const execute = options.execute ?? runCommand;
  const presetFile = resolve(options.presetFile ?? join(root, 'scripts/models/presets/ships-meshy.json'));
  const catalogIds = SHIP_VISUAL_CATALOG.map((visual) => visual.id);
  const ids = options.only ? [options.only.replace(/^ships\//, '')] : catalogIds;
  for (const id of ids) if (!catalogIds.includes(id)) throw new Error('Unknown ship visual id: ' + id);
  if (options.nose && ids.length !== 1) throw new Error('--nose requires --only so an axis is never applied to every ship');
  const config = await readJson(presetFile);
  if (config?.version !== 1 || !config.ships) throw new Error('Invalid ship preset file: ' + presetFile);
  const { sources, missing, warnings } = await discoverShipSources(root, { kind: 'rawModel', ids });
  warnings.forEach((warning) => log('WARN ' + warning));
  const results = missing.map((id) => ({ id, status: 'missing', detail: 'raw source absent; existing model/fallback kept' }));
  results.forEach((result) => log('MISSING ' + result.id + ': ' + result.detail));
  let blender;
  for (const source of sources) {
    try {
      const preset = validateShipPreset(source.id, config.ships[source.id]);
      if (options.nose) {
        if (!AXES.includes(options.nose)) throw new Error('--nose must be one of ' + AXES.join(', '));
        preset.nose = options.nose;
        preset.reviewed = true;
        log('WARN ' + source.id + ': explicit draft orientation override; review the preview and store the accepted preset');
      }
      const processed = join(root, 'art-src/models/ships', source.id + '.glb');
      const cacheFile = join(root, 'art-src/models/.ship-model-cache', source.id + '.json');
      const rawHash = await fileHash(source.path);
      const runtimeValid = await validRuntimeEntry(root, source.id);
      if (!options.force && !existsSync(processed) && preset.preserveRawSha256?.toLowerCase() === rawHash && runtimeValid) {
        const result = { id: source.id, status: 'preserved', detail: 'reviewed original already packaged; --force rebuilds it' };
        results.push(result); log('PRESERVED ' + source.id + ': ' + result.detail); continue;
      }
      if (!preset.nose || !preset.reviewed) {
        const result = { id: source.id, status: 'review', detail: 'set this model\'s reviewed nose axis in ' + presetFile };
        results.push(result); log('REVIEW ' + source.id + ': ' + result.detail); continue;
      }
      const socketPath = preset.sockets ? resolve(dirname(presetFile), preset.sockets) : null;
      // Hash actual content: mtime-only checks miss source replacements copied with preserved dates.
      const modelSignature = sha(JSON.stringify({ version: 1, rawHash, preset,
        helperHash: await fileHash(join(root, 'scripts/models/blender/space_typing_model_tools.py')),
        packagerHash: await fileHash(join(root, 'scripts/models/prepare-models.ts')),
        contractsHash: await fileHash(join(root, 'src/render3d/model-contracts.ts')),
        dependencyHash: existsSync(join(root, 'pnpm-lock.yaml')) ? await fileHash(join(root, 'pnpm-lock.yaml')) : null,
        socketHash: socketPath ? await fileHash(socketPath) : null, package: !options.noPackage,
        preview: Boolean(options.preview), saveBlend: Boolean(options.saveBlend) }));
      const projectionScript = join(root, 'scripts/models/blender/render_ship_top.py');
      const projection = join(root, 'art-src/ships/rendered', source.id + '-top.png');
      const projectionMetadata = join(root, 'art-src/ships/rendered', source.id + '-top.json');
      const signature = sha(JSON.stringify({ modelSignature, projectionHash: options.noProjection ? null : await fileHash(projectionScript) }));
      const modelFiles = [processed, ...(!options.noPackage ? runtimePaths(root, source.id) : []),
        ...(options.saveBlend ? [join(root, 'art-src/models/blend/ships', source.id + '.blend')] : [])];
      const outputFiles = [...modelFiles, ...(!options.noProjection ? [projection, projectionMetadata] : [])];
      const cache = await readJson(cacheFile);
      let cached = !options.force && cache?.signature === signature && (options.noPackage || runtimeValid);
      if (cached) for (const path of outputFiles) {
        if (!existsSync(path) || await fileHash(path) !== cache.outputs?.[path]) { cached = false; break; }
      }
      if (cached) { results.push({ id: source.id, status: 'cached' }); log('CACHED ' + source.id); continue; }
      let modelsCached = !options.force && cache?.modelSignature === modelSignature && (options.noPackage || runtimeValid);
      if (modelsCached) for (const path of modelFiles) {
        if (!existsSync(path) || await fileHash(path) !== cache.outputs?.[path]) { modelsCached = false; break; }
      }
      const args = blenderArguments({ root, source, preset, presetFile, preview: options.preview, saveBlend: options.saveBlend });
      if (options.dryRun) {
        results.push({ id: source.id, status: 'planned', args }); log('PLAN ' + source.id + ': nose ' + preset.nose + ', ' + preset.triangles + ' triangles; ' + (preset.sockets ? 'authored sockets' : 'geometry sockets need visual review')); continue;
      }
      blender ??= await findBlender(options.blender);
      if (!modelsCached) {
        await execute(blender, args, { cwd: root });
        if (!existsSync(processed)) throw new Error('Blender did not write ' + processed);
      }
      if (!options.noProjection) {
        await execute(blender, ['--background', '--factory-startup', '--python-exit-code', '1', '--python', projectionScript,
          '--', '--input', processed, '--output', projection], { cwd: root });
        if (!existsSync(projection)) throw new Error('Projection renderer did not write ' + projection);
        if (!existsSync(projectionMetadata)) throw new Error('Projection renderer did not write ' + projectionMetadata);
      }
      if (!modelsCached && !options.noPackage) {
        await execute(process.execPath, ['--import', 'tsx', join(root, 'scripts/models/prepare-models.ts'), '--only', 'ships/' + source.id], { cwd: root });
        if (!await validRuntimeEntry(root, source.id)) throw new Error('Packager did not produce a complete model manifest entry');
      }
      const outputs = {};
      for (const path of outputFiles) outputs[path] = await fileHash(path);
      await writeJsonAtomic(cacheFile, { version: 1, signature, modelSignature, source: source.path, outputs });
      results.push({ id: source.id, status: 'pass' }); log('PASS ' + source.id);
    } catch (error) {
      results.push({ id: source.id, status: 'failed', detail: error.message }); log('FAIL ' + source.id + ': ' + error.message);
    }
  }
  const failures = results.filter((result) => result.status === 'failed' || result.status === 'review').length;
  log('Ship models: ' + results.map((result) => result.id + '=' + result.status).join(', '));
  return { results, failures };
}

export function parseArguments(args) {
  const options = {};
  const values = { '--only': 'only', '--blender': 'blender', '--preset': 'presetFile', '--nose': 'nose' };
  const flags = { '--dry-run': 'dryRun', '--force': 'force', '--preview': 'preview', '--save-blend': 'saveBlend', '--no-package': 'noPackage', '--no-projection': 'noProjection' };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (flags[arg]) { options[flags[arg]] = true; continue; }
    const [name, inline] = arg.split(/=(.*)/s);
    if (!values[name]) throw new Error('Unknown option: ' + arg);
    const value = inline ?? args[++index];
    if (!value || (value.startsWith('--') && name !== '--nose')) throw new Error('Missing value for ' + name);
    options[values[name]] = value;
  }
  return options;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  prepareShipModels(parseArguments(process.argv.slice(2))).then(({ failures }) => { if (failures) process.exitCode = 1; }).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
