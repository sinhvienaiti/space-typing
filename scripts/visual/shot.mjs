#!/usr/bin/env node
/**
 * Visual check: opens a page in headless Chrome through the Chrome DevTools
 * Protocol, optionally clicks a button, waits, evaluates a JS expression and
 * saves a PNG screenshot for an AI agent (or a person) to look at.
 * Guide: docs/VISUAL_TESTING.md.
 *
 *   pnpm visual:shot <url> <out.png> [--wait=6000] [--width=1642] [--height=799]
 *     [--dpr=2] [--click=#startButton] [--click-delay=4000]
 *     [--eval="<js expression>"] [--eval-file=scripts/visual/evals/<name>.js]
 *
 * Prints one JSON line: the eval result, console warnings/errors and page
 * exceptions. Needs Chrome (CHROME_PATH overrides the default path) and
 * Node 22+ (built-in WebSocket).
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createServer } from "node:net";

const DEFAULT_CHROME = {
  darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  linux: "/usr/bin/google-chrome",
  win32: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
};

function flag(name, fallback) {
  const prefix = "--" + name + "=";
  const match = process.argv.find((argument) => argument.startsWith(prefix));
  return match === undefined ? fallback : match.slice(prefix.length);
}

const [url, out] = process.argv.slice(2).filter((argument) => !argument.startsWith("--"));
if (url === undefined || out === undefined) {
  console.error(
    "Usage: pnpm visual:shot <url> <out.png> [--wait=ms] [--width=px] [--height=px] [--dpr=n]\n" +
      "       [--click=<css selector>] [--click-delay=ms] [--eval=<js>] [--eval-file=<path>]",
  );
  process.exit(2);
}
if (typeof WebSocket === "undefined") {
  console.error("Node 22+ is required (built-in WebSocket).");
  process.exit(2);
}

const chrome = process.env.CHROME_PATH ?? DEFAULT_CHROME[process.platform];
if (chrome === undefined || !existsSync(chrome)) {
  console.error("Chrome not found at " + chrome + "; set CHROME_PATH.");
  process.exit(2);
}

const width = Number(flag("width", "1642"));
const height = Number(flag("height", "799"));
const dpr = Number(flag("dpr", "2"));
const waitMs = Number(flag("wait", "6000"));
const clickSelector = flag("click", null);
const clickDelay = Number(flag("click-delay", "4000"));
const evalFile = flag("eval-file", null);
const evalOrigin = flag("eval-origin", null);
const setupEvalFile = flag("setup-eval-file", null);
// Opt-in synthetic capture for Voice startup checks; never opens the user's mic.
const fakeMic = flag("fake-mic", "0") === "1";
const fakeMicFile = flag("fake-mic-file", null);
const audioFixture = flag("audio-fixture", null);
const expression = evalFile !== null ? readFileSync(resolve(evalFile), "utf8") : flag("eval", "null");

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
// Ask the OS for a free port. Random ports could attach two simultaneous
// screenshots to the same Chrome, mixing their temporary profiles and evals.
const portProbe = createServer();
await new Promise((done, fail) => {
  portProbe.once("error", fail);
  portProbe.listen(0, "127.0.0.1", done);
});
const port = portProbe.address().port;
await new Promise((done) => portProbe.close(done));
const profile = mkdtempSync(join(tmpdir(), "space-typing-shot-"));
const browser = spawn(
  chrome,
  [
    "--headless=new",
    "--remote-debugging-port=" + port,
    "--window-size=" + width + "," + height,
    "--hide-scrollbars",
    // Real GPU (WebGL2 backgrounds); headless otherwise may fall back to software.
    "--ignore-gpu-blocklist",
    "--no-first-run",
    "--no-default-browser-check",
    // SHOT_INSECURE=1: accept a local self-signed certificate (a temporary nginx on a spare port).
    ...(process.env.SHOT_INSECURE === "1" ? ["--ignore-certificate-errors"] : []),
    ...(fakeMic ? ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] : []),
    ...(fakeMic && fakeMicFile ? ["--use-file-for-fake-audio-capture=" + resolve(fakeMicFile)] : []),
    "--user-data-dir=" + profile,
    "about:blank",
  ],
  { stdio: "ignore" },
);

async function cleanup() {
  try {
    browser.kill("SIGKILL");
  } catch {
    // already gone
  }
  // Windows keeps profile files open briefly while Chrome's child processes exit.
  // This path is the exact directory returned by mkdtempSync above.
  await sleep(500);
  try {
    rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  } catch (error) {
    console.warn("Temporary Chrome profile could not be removed: " + profile + " (" + error.code + ")");
  }
}

async function main() {
  let pages = [];
  for (let attempt = 0; attempt < 80 && pages.length === 0; attempt += 1) {
    try {
      pages = (await (await fetch("http://127.0.0.1:" + port + "/json/list")).json()).filter(
        (page) => page.type === "page",
      );
    } catch {
      // Chrome still starting
    }
    if (pages.length === 0) await sleep(250);
  }
  if (pages.length === 0) throw new Error("Chrome DevTools endpoint did not come up.");

  const socket = new WebSocket(pages[0].webSocketDebuggerUrl);
  await new Promise((done, fail) => {
    socket.addEventListener("open", done, { once: true });
    socket.addEventListener("error", fail, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  const logs = [];
  const exceptions = [];
  let loaded = false;
  const contexts = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id !== undefined && pending.has(message.id)) {
      const call = pending.get(message.id);
      clearTimeout(call.timer);
      call.done(message);
      pending.delete(message.id);
      return;
    }
    if (message.method === "Page.loadEventFired") loaded = true;
    if (message.method === "Runtime.executionContextCreated") {
      const context = message.params.context;
      if (context.auxData?.isDefault) contexts.set(context.id, context.origin);
    }
    if (message.method === "Runtime.executionContextDestroyed") contexts.delete(message.params.executionContextId);
    if (message.method === "Runtime.executionContextsCleared") contexts.clear();
    if (message.method === "Runtime.consoleAPICalled" && ["warning", "error"].includes(message.params.type)) {
      logs.push(
        message.params.type + ": " +
          message.params.args.map((arg) => arg.value ?? arg.description ?? "").join(" ").slice(0, 300),
      );
    }
    if (message.method === "Runtime.exceptionThrown") {
      const details = message.params.exceptionDetails;
      exceptions.push((details.exception?.description ?? details.text ?? "").slice(0, 400));
    }
  });
  socket.addEventListener("close", () => {
    for (const call of pending.values()) {
      clearTimeout(call.timer);
      call.fail(new Error("Chrome connection closed before the capture finished."));
    }
    pending.clear();
  });
  const send = (method, params = {}) =>
    new Promise((done, fail) => {
      const id = ++nextId;
      const timer = setTimeout(() => {
        pending.delete(id);
        fail(new Error("Chrome command timed out: " + method));
      }, Number(flag("protocol-timeout", "120000")));
      pending.set(id, { done, fail, timer });
      socket.send(JSON.stringify({ id, method, params }));
    });

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: dpr,
    mobile: false,
  });
  await send("Page.navigate", { url });
  for (let waited = 0; !loaded && waited < 20000; waited += 100) await sleep(100);

  const readyExpression = flag("ready", null);
  if (readyExpression !== null) {
    let ready = false;
    const timeout = Number(flag("ready-timeout", "120000"));
    for (let waited = 0; waited < timeout; waited += 500) {
      const state = await send("Runtime.evaluate", { expression: readyExpression, returnByValue: true });
      if (state.result?.result?.value === true) { ready = true; break; }
      await sleep(500);
    }
    if (!ready) throw new Error("Page readiness timed out: " + readyExpression);
  }

  if (clickSelector !== null) {
    await sleep(clickDelay);
    // A real mouse click through the DevTools input domain: it counts as a
    // user gesture, so audio may start (autoplay policy) and first-gesture
    // listeners fire. Falls back to el.click() when the target is not visible.
    const located = await send("Runtime.evaluate", {
      expression:
        "(() => { const el = document.querySelector(" + JSON.stringify(clickSelector) +
        "); if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect();" +
        " return r.width > 0 && r.height > 0 ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { hidden: true }; })()",
      returnByValue: true,
    });
    const point = located.result?.result?.value ?? null;
    if (point === null) {
      logs.push("warning: click target not found: " + clickSelector);
    } else if (point.hidden === true) {
      await send("Runtime.evaluate", {
        expression: "document.querySelector(" + JSON.stringify(clickSelector) + ").click()",
      });
    } else {
      for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) {
        await send("Input.dispatchMouseEvent", { type, x: point.x, y: point.y, button: "left", clickCount: 1 });
      }
    }
  }
  await sleep(waitMs);
  if (audioFixture !== null && setupEvalFile !== null) {
    if (!fakeMic) throw new Error("Audio fixture setup requires --fake-mic=1");
    await send("Runtime.evaluate", {
      expression: "window.__voiceFixtureBase64=" + JSON.stringify(readFileSync(resolve(audioFixture)).toString("base64")),
    });
  }
  if (setupEvalFile !== null) {
    const setup = await send("Runtime.evaluate", {
      expression: readFileSync(resolve(setupEvalFile), "utf8"), awaitPromise: true, returnByValue: true, userGesture: true,
    });
    if (setup.result?.exceptionDetails) throw new Error(setup.result.exceptionDetails.exception?.description ?? "Setup failed");
  }

  const contextId = evalOrigin === null ? undefined : [...contexts].find(([, origin]) => origin === evalOrigin)?.[0];
  if (evalOrigin !== null && contextId === undefined) throw new Error("Frame context not found: " + evalOrigin);
  if (audioFixture !== null) {
    await send("Runtime.evaluate", {
      expression: "window.__voiceFixtureBase64=" + JSON.stringify(readFileSync(resolve(audioFixture)).toString("base64")),
      ...(contextId === undefined ? {} : { contextId }),
    });
  }

  const evaluated = await send("Runtime.evaluate", {
    expression,
    ...(contextId === undefined ? {} : { contextId }),
    userGesture: true,
    returnByValue: true,
    awaitPromise: true,
  });
  const result =
    evaluated.result?.exceptionDetails !== undefined
      ? { evalError: evaluated.result.exceptionDetails.exception?.description ?? evaluated.result.exceptionDetails.text }
      : evaluated.result?.result?.value ?? null;
  const diagnostics = setupEvalFile === null ? null : (await send("Runtime.evaluate", {
    expression: "window.__voiceDiagnostics?.() ?? null", returnByValue: true,
  })).result?.result?.value;

  const shot = await send("Page.captureScreenshot", { format: "png" });
  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeFileSync(resolve(out), Buffer.from(shot.result.data, "base64"));
  socket.close();
  console.log(
    JSON.stringify({
      out,
      viewport: width + "x" + height + "@" + dpr,
      png: width * dpr + "x" + height * dpr,
      eval: result,
      ...(diagnostics ? { diagnostics } : {}),
      logs,
      exceptions,
    }),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(cleanup);
