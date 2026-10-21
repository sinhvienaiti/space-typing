import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Document, NodeIO } from '@gltf-transform/core';
import { blenderArguments, parseArguments, prepareShipModels, validateShipPreset } from '../scripts/models/prepare-ship-models.mjs';
import { findSources, prepareModels, validationProblems } from '../scripts/models/prepare-models.ts';

const roots = [];
const sockets = ['FX_ENGINE_L', 'FX_ENGINE_R', 'FX_MUZZLE', 'FX_CORE'];
const sha = (value) => createHash('sha256').update(value).digest('hex');
afterEach(async () => { vi.restoreAllMocks(); await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

async function put(root, path, value) {
  const target = join(root, path); await mkdir(dirname(target), { recursive: true });
  await writeFile(target, typeof value === 'string' || value instanceof Uint8Array ? value : JSON.stringify(value)); return target;
}
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'ship-model-pipeline-')); roots.push(root);
  await put(root, 'scripts/models/blender/space_typing_model_tools.py', 'fixture blender helper');
  await put(root, 'scripts/models/blender/render_ship_top.py', 'fixture projection helper');
  await put(root, 'scripts/models/prepare-models.ts', 'fixture packager');
  await put(root, 'src/render3d/model-contracts.ts', 'fixture contracts');
  const preset = { nose: '-Y', yaw: 5, triangles: 12000, autoEmissive: 0.08, sockets: null, reviewed: true };
  const presetFile = await put(root, 'scripts/models/presets/ships-meshy.json', { version: 1, ships: { razorwing: preset } });
  await put(root, 'art-src/3d/ships/ship-02-razorwing.glb', 'raw razorwing');
  return { root, preset, presetFile };
}
async function runtime(root, id) {
  const tiers = {};
  for (const tier of ['high', 'medium']) {
    const data = id + ' ' + tier;
    await put(root, `public/assets/space-typing/models/ships/${id}/${id}.${tier}.glb`, data);
    tiers[tier] = { url: `/assets/space-typing/models/ships/${id}/${id}.${tier}.glb?v=${sha(data).slice(0, 10)}`, bytes: data.length };
  }
  const entry = { id, kind: 'ships', tiers, sockets, clips: [], triangles: 3000, size: [1, 1, 1] };
  await put(root, 'public/assets/space-typing/models/manifest.json', { version: 1, generatedAt: '', models: { ['ships/' + id]: entry } });
  return entry;
}
const quiet = () => {};

describe('raw ship batch', () => {
  it('passes explicit per-model orientation and socket presets to the established Blender helper', () => {
    const args = blenderArguments({ root: '/game', source: { id: 'razorwing', path: '/raw/ship.glb' }, preset: { nose: '-X', yaw: 12, triangles: 12000, autoEmissive: 0.08, sockets: 'razorwing.json' }, presetFile: '/game/presets/ships.json', preview: true });
    expect(args).toContain('/game/scripts/models/blender/space_typing_model_tools.py');
    expect(args).toContain('--nose=-X'); expect(args).toContain('/game/presets/razorwing.json');
    expect(args).toContain('--python-exit-code'); expect(args).toContain('--preview');
    expect(parseArguments(['--only', 'razorwing', '--nose=-X', '--dry-run'])).toEqual({ only: 'razorwing', nose: '-X', dryRun: true });
    expect(() => validateShipPreset('razorwing', { nose: '+Z', reviewed: true })).toThrow(/nose/);
  });

  it('requires a reviewed axis, logs missing sources, and never applies a single override to the fleet', async () => {
    const { root, presetFile, preset } = await fixture();
    await put(root, 'scripts/models/presets/ships-meshy.json', { version: 1, ships: { razorwing: { ...preset, nose: null, reviewed: false } } });
    const execute = vi.fn();
    const report = await prepareShipModels({ root, presetFile, dryRun: true, log: quiet, execute });
    expect(report.results.find((result) => result.id === 'razorwing').status).toBe('review');
    expect(report.results.find((result) => result.id === 'eternal-sovereign').status).toBe('missing');
    expect(execute).not.toHaveBeenCalled();
    await expect(prepareShipModels({ root, nose: '-Y', log: quiet })).rejects.toThrow(/requires --only/);
    await expect(prepareShipModels({ root, only: 'unknown', log: quiet })).rejects.toThrow(/Unknown ship/);
  });

  it('skips unchanged artifacts, reruns when source contents change, and repairs missing tiers', async () => {
    const { root, presetFile } = await fixture();
    const execute = vi.fn(async (_command, args) => {
      if (args.includes('--output')) {
        await put(root, 'art-src/ships/rendered/razorwing-top.png', 'transparent topdown sprite');
        await put(root, 'art-src/ships/rendered/razorwing-top.json', { sockets: [] });
      }
      else if (args.includes('--python')) await put(root, 'art-src/models/ships/razorwing.glb', 'normalized');
      else await runtime(root, 'razorwing');
    });
    const options = { root, presetFile, only: 'razorwing', blender: process.execPath, execute, log: quiet };
    expect((await prepareShipModels(options)).results[0].status).toBe('pass');
    expect(execute).toHaveBeenCalledTimes(3);
    expect((await prepareShipModels(options)).results[0].status).toBe('cached');
    expect(execute).toHaveBeenCalledTimes(3);
    await put(root, 'art-src/3d/ships/ship-02-razorwing.glb', 'changed content');
    expect((await prepareShipModels(options)).results[0].status).toBe('pass');
    expect(execute).toHaveBeenCalledTimes(6);
    await rm(join(root, 'art-src/ships/rendered/razorwing-top.png'));
    expect((await prepareShipModels(options)).results[0].status).toBe('pass');
    expect(execute).toHaveBeenCalledTimes(7); // Only regenerate the missing projection.
    await rm(join(root, 'art-src/ships/rendered/razorwing-top.json'));
    expect((await prepareShipModels(options)).results[0].status).toBe('pass');
    expect(execute).toHaveBeenCalledTimes(8); // Sidecar is an equally required output.
    await rm(join(root, 'public/assets/space-typing/models/ships/razorwing/razorwing.medium.glb'));
    expect((await prepareShipModels(options)).results[0].status).toBe('pass');
    expect(execute).toHaveBeenCalledTimes(11);
  });

  it('keeps the reviewed original Vanguard binary and does not invoke Blender', async () => {
    const { root, presetFile, preset } = await fixture();
    const raw = 'original reviewed Vanguard';
    await put(root, 'art-src/3d/ships/ship-01-vanguard.glb', raw);
    await put(root, 'scripts/models/presets/ships-meshy.json', { version: 1, ships: { vanguard: { ...preset, nose: '-X', preserveRawSha256: sha(raw) } } });
    await runtime(root, 'vanguard');
    const execute = vi.fn();
    const result = await prepareShipModels({ root, presetFile, only: 'vanguard', execute, log: quiet });
    expect(result.results[0].status).toBe('preserved'); expect(execute).not.toHaveBeenCalled();
  });

  it('reports a failed model and continues to a later source', async () => {
    const { root, presetFile, preset } = await fixture();
    await put(root, 'art-src/3d/ships/ship-03-solar-lance.glb', 'raw');
    await put(root, 'scripts/models/presets/ships-meshy.json', { version: 1, ships: { razorwing: preset, 'solar-lance': { ...preset, nose: '+Y' } } });
    const execute = vi.fn(async (_command, args) => {
      const id = args[args.indexOf('--id') + 1];
      if (id === 'razorwing') throw new Error('bad raw GLB');
      await put(root, 'art-src/models/ships/' + id + '.glb', 'normalized');
    });
    const result = await prepareShipModels({ root, presetFile, blender: process.execPath, execute, noPackage: true, noProjection: true, log: quiet });
    expect(result.results.find((item) => item.id === 'razorwing').status).toBe('failed');
    expect(result.results.find((item) => item.id === 'solar-lance').status).toBe('pass');
  });
});

function modelFixture({ requiredSockets = true } = {}) {
  const doc = new Document(); const scene = doc.createScene(); const buffer = doc.createBuffer();
  const positions = [];
  for (let index = 0; index < 3000; index++) {
    const x = index % 60, z = Math.floor(index / 60);
    positions.push(x / 60, 0, z / 50, (x + 1) / 60, 0, z / 50, x / 60, 0, (z + 1) / 50);
  }
  const position = doc.createAccessor().setBuffer(buffer).setType('VEC3').setArray(new Float32Array(positions));
  scene.addChild(doc.createNode('Hull').setMesh(doc.createMesh().addPrimitive(doc.createPrimitive().setAttribute('POSITION', position))));
  if (requiredSockets) for (const name of sockets) scene.addChild(doc.createNode(name));
  return doc;
}

describe('existing GLB packager', () => {
  it('refuses to overwrite a corrupt existing manifest', async () => {
    const { root } = await fixture();
    const path = await put(root, 'public/assets/space-typing/models/manifest.json', '{broken existing manifest');
    await expect(prepareModels({ root })).rejects.toThrow(/Existing model manifest is invalid/);
    expect(await readFile(path, 'utf8')).toBe('{broken existing manifest');
  });

  it('validates required ship sockets instead of accepting an unprocessed raw mesh', () => {
    expect(validationProblems('ships', modelFixture())).toEqual([]);
    expect(validationProblems('ships', modelFixture({ requiredSockets: false }))).toEqual(sockets.map((name) => 'missing socket ' + name));
  });

  it('only discovers normalized sources, packages valid GLBs and preserves other manifest entries after one source fails', async () => {
    const { root } = await fixture();
    const old = await runtime(root, 'vanguard');
    await put(root, 'art-src/models/ships/razorwing.glb', 'broken GLB');
    const bytes = await new NodeIO().writeBinary(modelFixture());
    await put(root, 'art-src/models/ships/solar-lance.glb', bytes);
    expect((await findSources(root)).map((source) => source.id)).toEqual(['razorwing', 'solar-lance']);
    vi.spyOn(console, 'log').mockImplementation(quiet); vi.spyOn(console, 'error').mockImplementation(quiet);
    const { failures, manifest } = await prepareModels({ root });
    expect(failures).toBe(1);
    expect(manifest.models['ships/vanguard']).toEqual(old);
    const entry = manifest.models['ships/solar-lance'];
    expect(entry.sockets).toEqual(sockets); expect(entry.tiers.medium.url).toContain('?v=');
    expect(entry.tiers.high.bytes).toBeGreaterThan(0);
    const persisted = JSON.parse(await readFile(join(root, 'public/assets/space-typing/models/manifest.json'), 'utf8'));
    expect(persisted.models['ships/solar-lance']).toEqual(entry);
    expect(persisted.models['ships/razorwing']).toBeUndefined();
  });
});
