#!/usr/bin/env node
// Real-browser lobby regression checks. Creates disposable guests on a LOCAL server.
// Usage: node scripts/visual/duel-lobby-check.mjs [https://space.typing-game.local/]
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

const url = process.argv[2] ?? "https://space.typing-game.local/";
if (!["space.typing-game.local", "localhost", "127.0.0.1"].includes(new URL(url).hostname)) {
  throw new Error("This test creates rooms/matches; only run against a local server.");
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const profile = await mkdtemp(join(tmpdir(), "duel-lobby-qa-"));
const browser = spawn(process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new", "--remote-debugging-port=0", "--ignore-gpu-blocklist", "--no-first-run",
  "--no-default-browser-check", "--hide-scrollbars", "--user-data-dir=" + profile, "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });
let socket;
const results = [];
const exceptions = [];
const warnings = [];
try {
  const endpoint = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Chrome startup timeout")), 15000);
    browser.once("error", reject);
    browser.stderr.on("data", chunk => {
      const found = String(chunk).match(/DevTools listening on (ws:\/\/\S+)/);
      if (found) { clearTimeout(timer); resolve(found[1]); }
    });
  });
  socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const item = pending.get(message.id);
      if (item) {
        clearTimeout(item.timer); pending.delete(message.id);
        if (message.error) item.reject(new Error(message.error.message)); else item.resolve(message.result);
      }
    } else if (message.method === "Runtime.exceptionThrown") {
      exceptions.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    } else if (message.method === "Runtime.consoleAPICalled" && ["warning", "error"].includes(message.params.type)) {
      warnings.push(message.params.args.map(arg => arg.value ?? arg.description).join(" ").slice(0, 400));
    }
  });
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(method + " timed out")); }, 20000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params, sessionId }));
  });
  const page = async (offline = false) => {
    const { browserContextId } = await send("Target.createBrowserContext");
    const { targetId } = await send("Target.createTarget", { url: "about:blank", browserContextId });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    const cdp = (method, params) => send(method, params, sessionId);
    await cdp("Runtime.enable"); await cdp("Page.enable");
    await cdp("Emulation.setDeviceMetricsOverride", { width: 1642, height: 799, deviceScaleFactor: 2, mobile: false });
    if (offline) {
      await cdp("Network.enable");
      await cdp("Network.setBlockedURLs", { urls: ["*/api/duel/session"] });
    }
    const evaluate = async expression => {
      const result = await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
      return result.result.value;
    };
    const wait = async expression => {
      for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await sleep(100); }
      throw new Error("Timed out: " + expression + " / " + await evaluate("document.querySelector('#duelRoomStatus')?.textContent"));
    };
    const click = async id => {
      const point = await evaluate(`(() => { const el = document.getElementById(${JSON.stringify(id)}); if (el.disabled) throw Error('Button disabled: ${id}'); el.scrollIntoView({block:'center'}); const r = el.getBoundingClientRect(); if (!r.width || !r.height) throw Error('Button hidden: ${id}'); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
      for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await cdp("Input.dispatchMouseEvent", { type, ...point, button: "left", clickCount: 1 });
    };
    const shot = async name => {
      const { data } = await cdp("Page.captureScreenshot", { format: "png" });
      await mkdir(".visual", { recursive: true });
      await writeFile(".visual/" + name + ".png", Buffer.from(data, "base64"));
    };
    await cdp("Page.navigate", { url });
    await wait("Boolean(document.querySelector('#duelModeButton'))");
    await sleep(1500);
    await click("duelModeButton");
    await wait(offline ? "document.querySelector('#duelConnectionStatus').textContent.includes('unavailable')" : "document.querySelector('#duelConnectionStatus').textContent.includes('online')");
    return { evaluate, wait, click, shot, close: () => send("Target.disposeBrowserContext", { browserContextId }) };
  };
  const visible = id => `!document.querySelector('#${id}').classList.contains('hidden')`;
  const a = await page();
  await a.click("duelPracticeButton"); await a.wait(visible("duelBattle"));
  // Avoid waiting through a whole match; exercise the existing return handler.
  await a.evaluate("document.querySelector('#duelBattleExit').click()");
  await a.wait("document.querySelector('#duelRoomDialog').open");
  assert(await a.evaluate(visible("duelStartMatchButton")));
  assert(await a.evaluate(visible("duelLeaveRoomButton")));
  await a.click("duelRemoveBotButton");
  assert(await a.evaluate("document.querySelector('#duelStartMatchButton').disabled"));
  await a.click("duelAddBotButton");
  assert(!await a.evaluate("document.querySelector('#duelStartMatchButton').disabled"));
  await a.shot("duel-lobby-local-actions");
  await a.click("duelStartMatchButton"); await a.wait(visible("duelBattle"));
  await a.evaluate("document.querySelector('#duelBattleExit').click()");
  await a.click("duelLeaveRoomButton");
  assert(!await a.evaluate(visible("duelLobbyPanel")));
  results.push("Local Practice: Start, Remove/Add Bot, Start again, Leave");
  await a.click("duelRankedQueueButton");
  await a.wait("document.querySelector('#duelRankedStatus').textContent.startsWith('Queued')");
  await a.click("duelRankedLeaveButton");
  await a.wait("document.querySelector('#duelRankedStatus').textContent.startsWith('Not queued')");
  results.push("Ranked: queue after leaving local room, cancel queue");
  await a.evaluate("document.querySelector('#duelVisibility').value='public'; document.querySelector('#duelVisibility').dispatchEvent(new Event('change'))");
  await a.click("duelCreateRoomButton"); await a.wait(visible("duelLobbyPanel"));
  const room = await a.evaluate("document.querySelector('#duelLobbyRoomCode').textContent");
  assert(!room.startsWith("LOCAL-"));
  await a.click("duelAddBotButton"); await a.wait("document.querySelector('#duelSlotTwo').textContent.includes('Bot')");
  await a.click("duelRemoveBotButton"); await a.wait("document.querySelector('#duelSlotTwo').textContent.includes('Open')");
  const b = await page();
  await b.click("duelJoinTab");
  await b.evaluate(`document.querySelector('#duelJoinCode').value=${JSON.stringify(room)}`);
  await b.click("duelJoinRoomButton"); await b.wait(visible("duelLobbyPanel"));
  await b.click("duelLeaveRoomButton"); await b.wait(`!(${visible("duelLobbyPanel")})`);
  await b.click("duelJoinRoomButton"); await b.wait(visible("duelLobbyPanel"));
  await a.click("duelReadyButton"); await b.click("duelReadyButton");
  await a.wait("!document.querySelector('#duelStartMatchButton').disabled");
  await a.shot("duel-lobby-two-players-ready");
  await a.click("duelStartMatchButton");
  await a.wait(visible("duelBattle")); await b.wait(visible("duelBattle"));
  results.push("Friend Room: Create, Add/Remove Bot, Join, Leave, Rejoin, both Ready, Start on both browsers");
  await a.close(); await b.close();
  const c = await page(); const d = await page();
  await c.click("duelRankedQueueButton"); await d.click("duelRankedQueueButton");
  await c.wait(visible("duelBattle")); await d.wait(visible("duelBattle"));
  results.push("Ranked: two independent guests matched and entered battlefield");
  await c.close(); await d.close();
  const offline = await page(true);
  await offline.shot("duel-lobby-service-unavailable");
  await offline.click("duelPracticeButton"); await offline.wait(visible("duelBattle"));
  results.push("Unavailable session API: error visible, offline Practice still works");
  await offline.close();
  assert.deepEqual(exceptions, []);
  console.log(JSON.stringify({ pass: true, results, exceptions, warnings }));
} finally {
  socket?.close();
  browser.kill("SIGTERM");
  if (browser.exitCode === null) await new Promise(resolve => {
    const timeout = setTimeout(() => { browser.kill("SIGKILL"); resolve(); }, 4000);
    browser.once("exit", () => { clearTimeout(timeout); resolve(); });
  });
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
}
