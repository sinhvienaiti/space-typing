#!/usr/bin/env node
// Local online API for dev.sh and play.sh: the Cloudflare Worker in cloud/
// run by wrangler dev (workerd) with local D1 and Durable Objects stored in
// .account-local/wrangler. Same code as production. Loopback only.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, open } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const stateDir = join(root, ".account-local");
const statePath = join(stateDir, "process.json");
const logPath = join(stateDir, "server.log");
const port = Number(process.env.ACCOUNT_PORT ?? 3016);
const command = process.argv[2] ?? "start";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function health() {
  try {
    const response = await fetch("http://127.0.0.1:" + port + "/healthz", { signal: AbortSignal.timeout(1000) });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

async function ownedService() {
  const current = await health();
  let state;
  try {
    state = JSON.parse(await readFile(statePath, "utf8"));
  } catch {
    /* First run. */
  }
  return {
    current,
    owned: current?.service === "space-typing-account" && typeof state?.instance === "string" &&
      current.localInstance === state.instance,
  };
}

async function main() {
  if (!["start", "stop", "status", "restart"].includes(command)) {
    throw new Error("Usage: node scripts/local-account.mjs [start|stop|status|restart]");
  }
  let { current, owned } = await ownedService();
  if (command === "status") {
    console.log(owned ? "Local account service ready on 127.0.0.1:" + port + "." : "No managed local account service. Run pnpm account:local.");
    return;
  }
  if (command === "stop" || command === "restart") {
    if (current && !owned) throw new Error("Port " + port + " belongs to an unmanaged service; nothing was stopped.");
    if (owned) {
      const state = JSON.parse(await readFile(statePath, "utf8"));
      try {
        process.kill(-state.pid, "SIGTERM");
      } catch {
        process.kill(state.pid, "SIGTERM");
      }
      for (let attempt = 0; attempt < 40 && (await health()); attempt++) await delay(250);
    }
    if (command === "stop") {
      console.log("Managed local account service stopped.");
      return;
    }
    current = null;
    owned = false;
  }
  if (owned) {
    console.log("Local account service already ready on 127.0.0.1:" + port + ".");
    return;
  }
  if (current) throw new Error("Port " + port + " is already in use by an unmanaged service; nothing was changed.");
  await mkdir(stateDir, { recursive: true, mode: 0o700 });
  const wrangler = join(root, "node_modules/wrangler/bin/wrangler.js");
  const devVars = join(root, "cloud/.dev.vars");
  if (!existsSync(devVars)) {
    writeFileSync(devVars, "LOCAL_DEV=1\nADMIN_TOKEN=local-account-admin\nPASSWORD_PEPPER=local-dev-pepper\n", { mode: 0o600 });
  }
  const persist = join(stateDir, "wrangler");
  const migrate = spawnSync(process.execPath, [wrangler, "d1", "migrations", "apply", "DB", "--local", "-c", "cloud/wrangler.jsonc", "--persist-to", persist], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, CI: "1" },
  });
  if (migrate.status !== 0) throw new Error("D1 migrations failed:\n" + (migrate.stderr || migrate.stdout));
  const log = await open(logPath, "a", 0o600);
  const instance = randomUUID();
  const child = spawn(
    process.execPath,
    [wrangler, "dev", "-c", "cloud/wrangler.jsonc", "--ip", "127.0.0.1", "--port", String(port), "--persist-to", persist, "--var", "LOCAL_INSTANCE:" + instance, "--show-interactive-dev-session=false"],
    {
      cwd: root,
      detached: true,
      stdio: ["ignore", log.fd, log.fd],
      env: { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" },
    },
  );
  await new Promise((resolve, reject) => {
    child.once("spawn", resolve);
    child.once("error", reject);
  });
  await log.close();
  child.unref();
  for (let attempt = 0; attempt < 160; attempt++) {
    const started = await health();
    if (started?.localInstance === instance) {
      await writeFile(statePath, JSON.stringify({ pid: child.pid, instance }), { mode: 0o600 });
      console.log("Local online API ready on 127.0.0.1:" + port + " (Cloudflare Worker, local D1 + Durable Objects).");
      console.log("Stop: pnpm account:local:stop. Log: " + logPath);
      return;
    }
    await delay(250);
  }
  try {
    child.kill("SIGTERM");
  } catch {
    /* Already exited. */
  }
  throw new Error("Local account service failed to start. Inspect " + logPath);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
