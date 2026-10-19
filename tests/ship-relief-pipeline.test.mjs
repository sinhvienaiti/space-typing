import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadRgba, prepare, prepareSource } from "../scripts/bg-art/prepare-ship-3d.mjs";

const folders = [];
const temp = () => {
  const dir = mkdtempSync(join(tmpdir(), "space-typing-relief-"));
  folders.push(dir);
  return dir;
};
afterEach(() => { for (const dir of folders.splice(0)) rmSync(dir, { recursive: true, force: true }); });

describe("ship relief image preparation", () => {
  it("rejects an opaque studio background rather than baking a rectangular hull", async () => {
    const file = join(temp(), "studio.png");
    await sharp({ create: { width: 32, height: 32, channels: 3, background: "#bdbdbd" } }).png().toFile(file);
    await expect(loadRgba(file)).rejects.toThrow(/opaque background.*true transparency/);
  });

  it("continues to key the documented magenta background", async () => {
    const file = join(temp(), "magenta.png");
    await sharp({ create: { width: 32, height: 32, channels: 3, background: "#ff00ff" } })
      .composite([{ input: { create: { width: 12, height: 20, channels: 3, background: "#305060" } }, left: 10, top: 6 }])
      .png().toFile(file);
    const rgba = await loadRgba(file);
    expect(rgba.data[3]).toBe(0);
    expect(rgba.data[(10 * 32 + 15) * 4 + 3]).toBe(255);
  });

  it("rejects empty art before creating output files", async () => {
    const dir = temp();
    await expect(prepare("empty", { data: Buffer.alloc(32 * 32 * 4), width: 32, height: 32 }, join(dir, "out")))
      .rejects.toThrow("no visible hull pixels");
    expect(readdirSync(dir)).toEqual([]);
  });

  it("uses fresh GLB projection sockets and input hashes without a legacy sheet cell", async () => {
    const dir = temp();
    const width = 96, height = 128;
    const data = Buffer.alloc(width * height * 4);
    for (let y = 8; y < 118; y += 1) {
      const radius = Math.max(3, Math.min(34, y * 0.45));
      for (let x = Math.ceil(width / 2 - radius); x <= width / 2 + radius; x += 1) {
        const i = (y * width + x) * 4;
        data[i] = 30; data[i + 1] = 65; data[i + 2] = 90; data[i + 3] = 255;
      }
    }
    for (let y = 60; y < 67; y += 1) for (let x = 2; x < 94; x += 1) {
      const i = (y * width + x) * 4;
      data[i] = 30; data[i + 1] = 65; data[i + 2] = 90; data[i + 3] = 255;
    }
    for (const cx of [34, 62]) for (let y = 104; y < 117; y += 1) for (let x = cx - 5; x <= cx + 5; x += 1) {
      const i = (y * width + x) * 4;
      data[i] = 250; data[i + 1] = 120; data[i + 2] = 20;
    }
    const studio = join(dir, "studio.png"), projection = join(dir, "top.png");
    await sharp({ create: { width: 32, height: 32, channels: 3, background: "#bdbdbd" } }).png().toFile(studio);
    await sharp(data, { raw: { width, height, channels: 4 } }).png().toFile(projection);
    const log = { warn: vi.fn(), log: vi.fn() };
    const source = { id: "eternal-sovereign", path: studio, renderedImagePath: projection, legacyCharacterId: null };
    const options = { outRoot: dir, root: dir, log };
    await expect(prepareSource(source, options)).rejects.toThrow("top projection metadata missing");
    const normalizedDir = join(dir, "art-src/models/ships");
    mkdirSync(normalizedDir, { recursive: true });
    const normalized = join(normalizedDir, "eternal-sovereign.glb");
    writeFileSync(normalized, "normalized-model-fixture");
    const modelHash = createHash("sha256").update(readFileSync(normalized)).digest("hex");
    writeFileSync(join(dir, "top.json"), JSON.stringify({
      version: 1, modelSha256: modelHash, projection: "orthographic-top",
      nozzles: [[0.35, 0.88, 0.03], [0.65, 0.88, 0.03]],
      anchors: { nose: [0.5, 0.07], canopy: [0.5, 0.3], guns: [[0.3, 0.4], [0.7, 0.4]], wingtips: [[0.15, 0.6], [0.85, 0.6]] },
    }));
    const { model } = await prepareSource(source, options);
    const out = join(dir, "eternal-sovereign");
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining("source image unsuitable"));
    expect(log.log).toHaveBeenCalledWith(expect.stringContaining("2 authored GLB engine sockets"));
    expect(model.source.image).toBe("studio.png");
    expect(model.source.renderedImage).toBe("top.png");
    expect(model.source.imageSha256).toBe(createHash("sha256").update(readFileSync(studio)).digest("hex"));
    expect(model.source.renderedImageSha256).toBe(createHash("sha256").update(readFileSync(projection)).digest("hex"));
    expect(model.source.normalizedModelSha256).toBe(modelHash);
    expect(model.nozzles).toHaveLength(2);
    expect(model.nozzles[0][1]).toBeGreaterThan(0.5);
    expect(model.nozzles[0][2]).toBeGreaterThan(0);
    const plume = model.colors.plume.match(/^#(..)(..)(..)$/).slice(1).map((channel) => Number.parseInt(channel, 16));
    // Orange engine rims keep a warm plume even against a blue painted hull.
    expect(plume[0]).toBeGreaterThan(plume[1]);
    expect(plume[1]).toBeGreaterThan(plume[2]);
    expect(model.anchors.guns).toHaveLength(2);
    expect(model.heightScale).toBeGreaterThan(0);
    expect(readFileSync(join(out, "height.bin"))).toHaveLength(model.heightGrid[0] * model.heightGrid[1]);
    const { data: color, info } = await sharp(join(out, "color.webp")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(color.filter((_, i) => i % 4 === 3 && color[i] === 0).length).toBeGreaterThan(info.width);
    writeFileSync(normalized, "changed-normalized-model-fixture");
    await expect(prepareSource(source, options)).rejects.toThrow("top projection is stale");
    expect(JSON.parse(readFileSync(join(out, "model.json"), "utf8")).source.normalizedModelSha256).toBe(modelHash);
  });

  it("warns and derives rear-hull nozzles when transparent painted art has no flames", async () => {
    const width = 80, height = 100;
    const data = Buffer.alloc(width * height * 4);
    for (let y = 5; y < 90; y += 1) for (let x = 30; x < 50; x += 1) {
      const i = (y * width + x) * 4;
      data[i] = 20; data[i + 1] = 40; data[i + 2] = 60; data[i + 3] = 255;
    }
    // Broad wings keep the crop representative of a spacecraft and avoid
    // expanding a narrow rectangular fuselage to a very tall height grid.
    for (let y = 48; y < 56; y += 1) for (let x = 5; x < 75; x += 1) {
      const i = (y * width + x) * 4;
      data[i] = 20; data[i + 1] = 40; data[i + 2] = 60; data[i + 3] = 255;
    }
    const log = { warn: vi.fn(), log: vi.fn() };
    const { model } = await prepare("painted", { data, width, height }, temp(), null, { log });
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining("no painted flames detected"));
    expect(model.nozzles).toHaveLength(1);
    expect(model.nozzles[0][1]).toBeGreaterThan(0.9);
  });
});
