#!/usr/bin/env node
// Shared, loopback-only backend for dev.sh and play.sh. No secret in client files.
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, open } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const stateDir = join(root, ".duel-local");
const statePath = join(stateDir, "process.json");
const logPath = join(stateDir, "server.log");
const command = process.argv[2] ?? "start";
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function health() {
  try {
    const response = await fetch("http://127.0.0.1:3014/healthz", { signal: AbortSignal.timeout(1000) });
    return response.ok ? await response.json() : null;
  } catch { return null; }
}
async function ownedService() {
  const current = await health();
  let state;
  try { state = JSON.parse(await readFile(statePath, "utf8")); } catch { /* First run. */ }
  return { current, owned: current?.service === "space-typing-duel" && current.localSessions === true &&
    typeof state?.instance === "string" && current.localInstance === state.instance && current.pid === state.pid };
}

async function main() {
  if (!["start", "stop", "status", "restart"].includes(command)) throw new Error("Usage: node scripts/local-duel.mjs [start|stop|status|restart]");
  let { current, owned } = await ownedService();
  if (command === "status") {
    console.log(owned ? "Local Duel server ready on 127.0.0.1:3014." : "No managed local Duel server. Run pnpm duel:local.");
    return;
  }
  if (command === "stop" || command === "restart") {
    if (current && !owned) throw new Error("Port 3014 belongs to an unmanaged service; nothing was stopped.");
    if (owned) {
      process.kill(current.pid, "SIGTERM");
      for (let attempt = 0; attempt < 40 && await health(); attempt++) await delay(250);
      if (await health()) throw new Error("Duel server has not stopped; retry after current connections close.");
    }
    if (command === "stop") { console.log("Managed local Duel server stopped."); return; }
    current = null;
    owned = false;
  }
  if (owned) { console.log("Local Duel server already ready on 127.0.0.1:3014."); return; }
  if (current) throw new Error("Port 3014 is already in use by an unmanaged service; nothing was changed.");
  await mkdir(stateDir, { recursive: true, mode: 0o700 });
  const log = await open(logPath, "a", 0o600);
  const instance = randomUUID();
  const child = spawn(process.execPath, ["--import", "tsx", "server/duel/ws-server.ts"], {
    cwd: root, detached: true, stdio: ["ignore", log.fd, log.fd],
    env: {
      ...process.env, NODE_ENV: "development", DUEL_HOST: "127.0.0.1", DUEL_PORT: "3014",
      DUEL_WS_PATH: "/duel", DUEL_LOCAL_SESSIONS: "1", DUEL_LOCAL_INSTANCE: instance,
      DUEL_AUTH_SECRET: randomBytes(48).toString("base64url"),
      DUEL_ALLOWED_ORIGINS: "https://space.typing-game.local,https://typing-game.local,http://localhost:3004,http://127.0.0.1:3004",
      DUEL_ALLOW_NO_ORIGIN: "0", DUEL_TLS_KEY_PATH: undefined, DUEL_TLS_CERT_PATH: undefined,
      DUEL_RANKED_DATA_PATH: undefined,
    },
  });
  await new Promise((resolve, reject) => { child.once("spawn", resolve); child.once("error", reject); });
  await log.close();
  child.unref();
  for (let attempt = 0; attempt < 40; attempt++) {
    const started = await health();
    if (started?.localInstance === instance && started.pid === child.pid) {
      await writeFile(statePath, JSON.stringify({ pid: child.pid, instance }), { mode: 0o600 });
      console.log("Local Duel server ready on 127.0.0.1:3014 (guest sessions, local Ranked only).");
      console.log("Stop when finished: pnpm duel:local:stop. Log: " + logPath);
      return;
    }
    await delay(250);
  }
  // Stop only this just-spawned child, never an unrelated process on the port.
  try { child.kill("SIGTERM"); } catch { /* Already exited. */ }
  throw new Error("Local Duel startup failed. Inspect " + logPath);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
