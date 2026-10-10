#!/usr/bin/env node
import { closeSync, existsSync, mkdirSync, openSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const visualDir = resolve(root, ".visual");
const viteEntry = resolve(root, "node_modules/vite/bin/vite.js");
const shotEntry = resolve(root, "scripts/visual/shot.mjs");
const evalFile = resolve(root, "scripts/visual/evals/r01-campaign-map.js");
const setupEvalFile = resolve(root, "scripts/visual/evals/r01-open-campaign-map.js");
const port = 3098;
const url = `http://127.0.0.1:${port}/`;

if (!existsSync(viteEntry)) {
  console.error("Vite is not installed. Run pnpm install before pnpm visual:r01-qa.");
  process.exit(2);
}
if (!existsSync(shotEntry) || !existsSync(evalFile) || !existsSync(setupEvalFile)) {
  console.error("R01 visual QA files are missing from scripts/visual.");
  process.exit(2);
}

mkdirSync(visualDir, { recursive: true });
const viteLogPath = resolve(visualDir, "r01-vite.log");
const viteLog = openSync(viteLogPath, "w");
const vite = spawn(
  process.execPath,
  [viteEntry, "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  {
    cwd: root,
    stdio: ["ignore", viteLog, viteLog],
  },
);

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (vite.exitCode !== null) {
      throw new Error(`Vite exited before QA started. See ${viteLogPath}.`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${url}. See ${viteLogPath}.`);
}

function runShot(name, width, height) {
  const out = resolve(visualDir, `r01-${name}.png`);
  const args = [
    shotEntry,
    url,
    out,
    "--wait=750",
    `--width=${width}`,
    `--height=${height}`,
    "--dpr=2",
    `--setup-eval-file=${setupEvalFile}`,
    `--eval-file=${evalFile}`,
  ];

  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", rejectRun);
    child.on("close", (code) => {
      if (code !== 0) {
        rejectRun(
          new Error(
            `R01 ${name} capture failed with exit ${String(code)}${stderr.trim() === "" ? "" : `: ${stderr.trim()}`}`,
          ),
        );
        return;
      }

      const line = stdout
        .trim()
        .split(/\r?\n/)
        .filter(Boolean)
        .at(-1);
      if (line === undefined) {
        rejectRun(new Error(`R01 ${name} capture produced no diagnostics.`));
        return;
      }

      let payload;
      try {
        payload = JSON.parse(line);
      } catch {
        rejectRun(new Error(`R01 ${name} diagnostics are not valid JSON: ${line}`));
        return;
      }

      const probe = payload.eval;
      const failures = [
        ...(probe?.failures ?? []),
        ...(payload.exceptions ?? []).map((value) => `page exception: ${value}`),
        ...(payload.logs ?? [])
          .filter((value) => String(value).startsWith("error:"))
          .map((value) => `console ${value}`),
      ];
      if (probe?.pass !== true || failures.length > 0) {
        rejectRun(
          new Error(
            `R01 ${name} browser QA failed:\n- ${failures.length > 0 ? failures.join("\n- ") : "probe did not report pass=true"}\nScreenshot: ${out}`,
          ),
        );
        return;
      }

      resolveRun({
        name,
        screenshot: out,
        probe,
        warnings: (payload.logs ?? []).filter((value) =>
          String(value).startsWith("warning:"),
        ),
      });
    });
  });
}

try {
  await waitForServer();
  const desktop = await runShot("desktop", 1642, 799);
  const mobile = await runShot("mobile", 390, 844);
  console.log(
    JSON.stringify(
      {
        pass: true,
        server: url,
        captures: [desktop, mobile],
        note: "Structural browser checks passed. Open both PNGs for the final human/AI visual hierarchy review.",
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (vite.exitCode === null) vite.kill();
  closeSync(viteLog);
}
