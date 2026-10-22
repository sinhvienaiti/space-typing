// Typing Defense 1A.3 (docs/td/BUILD_NOW.md §6.2): "Đặt sẵn 4 ô" through the
// commands a player sends: the Bastion at level 4, a Tháp Pháo, a Tháp Cung and
// a Trại Lính by the merge, a Mỏ Vàng on N3 across the Silver Stream; Draconis
// to the cannon, Chấm to the archer, Phẩy to the barracks, Gạch to the mine.
// Gạch walks his A* path over a bridge (picture td-1a-route) while the words
// are typed for real at 70 WPM through CDP Input.dispatchKeyEvent; wave 1 is
// called once he is at the mine, wave 2 as soon as it may be, then all four
// buildings go to 1 s for 10 s. A tier-2 pair needs ≤ 5 free first letters,
// which four 1 s streams reach only at a peak (12 held, 5 resting), so unless
// a pair has shown already a last phase sets the sandbox E to 45 and types at
// 45 WPM, where peaks come about four times a minute (Node, 60 seeds: a pair
// within 60 s in all), until a pair is on screen, for at most 120 s: picture
// td-1a-tier2, both cards of the pair underlining two letters (TK 6.5). Every
// sample checks the cards: no two overlap, text ≥ 18 px, inside the screen's
// safe area and clear of the HUD chip, first letters never ambiguous. Picture
// td-1a-four-slots: words up at all four buildings. A Node replay of the run's
// log must reach the browser's hash (§7 gate 4).
//   URL=http://127.0.0.1:3110/ OUT_DIR=… node scripts/visual/cdp-run.mjs scripts/visual/scenarios/td-1a-slots.mjs --width=1280 --height=720
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEV_URL, gesture, out } from "./common.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const td = (code) => "(() => { const t = window.__td; if (!t) return null; " + code + " })()";
const WPM = Number(process.env.WPM ?? 70);
/** The last phase: the sandbox E and the typist's pace that bring tier-2 pairs (see above), and how long it may look for one. */
const TIER2 = { expected: 45, wpm: 45, maxMs: 120000 };
/** The preset: building, x, z, the agent sent there (0 Draconis, 1 Chấm, 2 Phẩy, 3 Gạch). */
const PRESET = [["cannon", 7, 12, 0], ["archer", -8, 12, 1], ["barracks", 3, 18, 2], ["gold-mine", -34, 8, 3]];
const STREAM = { x0: -25.5, x1: -22.5 };
const BRIDGES = [[-15.5, -12.5], [24.5, 27.5]];
const onBridge = (z) => BRIDGES.some(([z0, z1]) => z >= z0 - 1e-9 && z <= z1 + 1e-9);

async function press(page, letter) {
  const code = "Key" + letter.toUpperCase();
  const vk = letter.toUpperCase().charCodeAt(0);
  await page.send("Input.dispatchKeyEvent", { type: "keyDown", key: letter, code, text: letter, unmodifiedText: letter, windowsVirtualKeyCode: vk });
  await page.send("Input.dispatchKeyEvent", { type: "keyUp", key: letter, code, windowsVirtualKeyCode: vk });
}

/** Live words with one first letter each, or a tier-2 pair told apart by the second letter. */
function ambiguity(words) {
  const by = new Map();
  for (const word of words) by.set(word.text[0], [...(by.get(word.text[0]) ?? []), word.text]);
  return [...by.values()].filter((list) => list.length > 2 || (list.length === 2 && list[0][1] === list[1][1]));
}

/** Where a polyline (x, z, x, z…) crosses the stream's banks, the z there must be on a bridge. */
function crossesOnBridges(points) {
  for (let k = 2; k < points.length; k += 2) {
    const [x0, z0, x1, z1] = [points[k - 2], points[k - 1], points[k], points[k + 1]];
    for (const bank of [STREAM.x0, STREAM.x1]) {
      if ((x0 - bank) * (x1 - bank) > 0 || x0 === x1) continue;
      if (!onBridge(z0 + ((z1 - z0) * (bank - x0)) / (x1 - x0))) return false;
    }
  }
  return true;
}

/** One look at the page: live words, the cards showing them (rect, font size), the HUD chip, Gạch, the run. */
const LOOK = td(`
  const words = t.liveWords();
  const live = new Set(words.map((w) => w.text));
  const cards = [...document.querySelectorAll(".td-card")]
    .filter((el) => Number(el.style.opacity) > 0.05 && !el.classList.contains("is-ash") && live.has(el.children[1].textContent))
    .map((el) => { const r = el.getBoundingClientRect(); return { text: el.children[1].textContent, left: r.left, top: r.top, right: r.right, bottom: r.bottom, font: parseFloat(getComputedStyle(el).fontSize), underlined: el.children[1].querySelectorAll(".l").length }; });
  const chip = document.querySelector(".td-chip").getBoundingClientRect();
  const s = t.state();
  return { words, cards, chip: { left: chip.left, top: chip.top, right: chip.right, bottom: chip.bottom }, gach: s.agents[3], phase: s.phase, wave: s.wave, nextWaveAt: s.nextWaveAt, tick: s.tick,
    width: innerWidth, height: innerHeight };`);

export default async function (page) {
  const base = DEV_URL.replace(/\/$/, "");
  const size = page.width + "x" + page.height;
  await page.goto(base + "/td.html?sandbox=1", { settle: 300 });
  await gesture(page);
  let ready = false;
  for (let wait = 0; wait < 80 && !ready; wait += 1) {
    ready = (await page.eval(td("return t.ready();"))) === true;
    if (!ready) await page.sleep(250);
  }
  // "Đặt sẵn 4 ô": the builds land on the next tick; the orders need their ids.
  const placeable = await page.eval(td(`
    t.send({ t: "sandbox", op: { op: "keepLevel", value: 4 } });
    t.send({ t: "sandbox", op: { op: "gold", value: 1000 } });
    const defs = t.defs();
    const ok = ${JSON.stringify(PRESET)}.map(([id, x, z]) => t.canPlace(id, x, z).ok);
    for (const [id, x, z] of ${JSON.stringify(PRESET)}) t.send({ t: "build", def: defs.indexOf(id), qx: x * 4, qz: z * 4 });
    return ok;`));
  await page.sleep(200);
  const ids = await page.eval(td(`
    const built = t.state().buildings;
    const ids = ${JSON.stringify(PRESET)}.map(([id]) => built.find((b) => b.def === id)?.id ?? -1);
    ${JSON.stringify(PRESET)}.forEach(([, , , agent], k) => t.send({ t: "assignUnit", agent, building: ids[k] }));
    return ids;`));
  const mine = ids[3];

  const problems = [];
  const shots = [];
  let routeShot = null;
  let fourShot = null;
  let tier2Shot = null;
  let tier2Card = null;
  let routeOnBridges = null;
  let gachInWater = false;
  let gachArrivedAt = -1;
  let maxBuildings = 0;
  let tier2 = 0;
  let samples = 0;
  let minFont = Infinity;
  let keys = 0;
  let calls = 0;
  // "waves" until wave 2 ends, "dense" for 10 s at 1 s, "tier2" until a pair is on screen, then "done".
  let phase = "waves";
  let phaseUntil = 0;
  let wave2Ended = false;
  let keyMs = 60000 / (WPM * 5);
  const started = Date.now();
  while (phase !== "done" && Date.now() - started < 360000) {
    const tickAt = Date.now();
    const look = await page.eval(LOOK);
    if (look === null) break;
    const { words, cards, chip, gach } = look;
    samples += 1;
    // Gạch: on a bridge wherever he is over the stream; his path ahead crosses only on bridges.
    if (gach.x >= STREAM.x0 && gach.x <= STREAM.x1 && !onBridge(gach.z)) gachInWater = true;
    if (gach.mode === 1 && gach.path.length > 0 && routeOnBridges === null && gach.path.some((v, k) => k % 2 === 0 && v < STREAM.x0)) {
      routeOnBridges = crossesOnBridges([gach.x, gach.z, ...gach.path]);
    }
    if (routeShot === null && gach.mode === 1 && Date.now() - started > 2500) routeShot = await page.shot(out("td-1a-route-" + size + ".png"));
    if (gachArrivedAt < 0 && gach.at === mine) gachArrivedAt = look.tick;
    // The cards.
    const bad = ambiguity(words);
    if (bad.length > 0 && problems.length < 12) problems.push("ambiguous: " + JSON.stringify(bad));
    // A tier-2 pair with both cards up: the word dealt at tier 2 and the older one sharing its first letter.
    const cardOf = (text) => cards.find((c) => c.text === text);
    const paired = words.find((word) => word.tier === 2 && cardOf(word.text) && words.some((o) => o !== word && o.text[0] === word.text[0] && cardOf(o.text)));
    tier2 += paired !== undefined ? 1 : 0;
    if (paired !== undefined && tier2Shot === null) {
      const older = words.find((o) => o !== paired && o.text[0] === paired.text[0]);
      tier2Card = { words: [older.text, paired.text], underlined: [cardOf(older.text).underlined, cardOf(paired.text).underlined] };
      tier2Shot = await page.shot(out("td-1a-tier2-" + size + ".png"));
      if (phase === "tier2") phase = "done";
    }
    for (const card of cards) {
      minFont = Math.min(minFont, card.font);
      const inside = card.left >= 8 - 0.5 && card.right <= look.width - 8 + 0.5 && card.top >= 0 && card.bottom <= look.height - 8 + 0.5;
      const underChip = card.left < chip.right && card.right > chip.left && card.top < chip.bottom && card.bottom > chip.top;
      if ((!inside || underChip) && problems.length < 12) problems.push("outside the safe area: " + JSON.stringify(card));
    }
    for (let i = 0; i < cards.length; i += 1) {
      for (let j = i + 1; j < cards.length; j += 1) {
        const [a, b] = [cards[i], cards[j]];
        if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1 && problems.length < 12) problems.push("overlap: " + a.text + " / " + b.text);
      }
    }
    const buildings = new Set(words.map((word) => word.building)).size;
    maxBuildings = Math.max(maxBuildings, buildings);
    if (fourShot === null && buildings >= 4) fourShot = await page.shot(out("td-1a-four-slots-" + size + ".png"));
    // Waves: wave 1 once Gạch is at the mine, wave 2 as soon as the count starts.
    if (look.phase === "prep" && gachArrivedAt >= 0 && calls === 0) {
      await page.eval(td(`t.send({ t: "callWave" }); return true;`));
      calls += 1;
    } else if (look.wave === 1 && look.nextWaveAt >= 0 && calls === 1) {
      await page.eval(td(`t.send({ t: "callWave" }); return true;`));
      calls += 1;
    }
    if (phase === "waves" && (look.phase === "defeat" || (await page.eval(td("return t.events().some((e) => e.t === 'waveEnd' && e.wave === 2);"))))) {
      wave2Ended = look.phase !== "defeat";
      [phase, phaseUntil] = wave2Ended ? ["dense", Date.now() + 10000] : ["done", 0];
      await page.eval(td(`for (const id of ${JSON.stringify(ids)}) t.send({ t: "setTempo", building: id, idx: 6 }); return true;`));
    } else if (phase === "dense" && Date.now() >= phaseUntil) {
      [phase, phaseUntil, keyMs] = tier2Shot === null ? ["tier2", Date.now() + TIER2.maxMs, 60000 / (TIER2.wpm * 5)] : ["done", 0, keyMs];
      if (phase === "tier2") await page.eval(td(`t.send({ t: "sandbox", op: { op: "expected", value: ${TIER2.expected} } }); return true;`));
    } else if (phase === "tier2" && Date.now() >= phaseUntil) phase = "done";
    // The typist: the locked word first, else the most urgent; a tier-2 pair takes its second letter.
    const locked = words.find((word) => word.locked);
    const target = locked ?? words.slice().sort((a, b) => a.left - b.left)[0];
    if (target !== undefined) {
      const pair = !locked && words.some((word) => word !== target && word.text[0] === target.text[0]);
      await press(page, locked ? target.text[target.typed] : target.text[0]);
      keys += 1;
      if (pair) {
        await page.sleep(keyMs);
        await press(page, target.text[1]);
        keys += 1;
      }
    }
    await page.sleep(Math.max(0, keyMs - (Date.now() - tickAt)));
  }
  if (routeShot === null) routeShot = await page.shot(out("td-1a-route-" + size + ".png"));
  if (fourShot === null) fourShot = await page.shot(out("td-1a-four-slots-" + size + ".png"));
  shots.push(routeShot, fourShot, ...(tier2Shot === null ? [] : [tier2Shot]));

  const final = await page.eval(
    td("return { flags: t.flags(), state: t.state(), stats: t.stats(), typing: t.typing(), hash: t.hash(), log: t.log(), spawns: t.events().filter((e) => e.t === 'wordSpawn').map((e) => e.building), rejected: t.events().filter((e) => e.t === 'rejected') };"),
  );
  const replayFile = out("td-1a-slots-replay-" + size + ".json");
  writeFileSync(replayFile, JSON.stringify({ ...final?.flags, tick: final?.state?.tick, hash: final?.hash, log: final?.log ?? [] }));
  let replay = null;
  try {
    replay = JSON.parse(execFileSync(process.execPath, ["--import", "tsx", resolve(root, "scripts/td/replay.ts"), replayFile], { cwd: root, encoding: "utf8" }));
  } catch (error) {
    replay = { match: false, error: String(error.stdout || error.message).trim() };
  }
  const stats = final?.stats ?? {};
  const dealtBy = ids.map((id) => (final?.spawns ?? []).filter((building) => building === id).length);
  const checks = {
    ready,
    presetPlaceable: Array.isArray(placeable) && placeable.every(Boolean) && ids.every((id) => id >= 0),
    fourAgentsAssisting: final?.state?.agents?.every((agent, k) => agent.at === ids[k]) === true,
    gachReachedMine: gachArrivedAt >= 0,
    gachRouteOverBridge: routeOnBridges === true && !gachInWater,
    fourBuildingsDeal: dealtBy.every((n) => n > 0) && maxBuildings >= 4,
    twoWavesTyped: wave2Ended && final?.state?.phase !== "defeat",
    tier2PairOnScreen: tier2 > 0 && tier2Card?.underlined.every((n) => n === 2) === true,
    cardsNeverOverlapOrLeaveSafeArea: problems.filter((p) => !p.startsWith("ambiguous")).length === 0,
    cardText18px: minFont >= 18,
    firstLettersDistinct: problems.filter((p) => p.startsWith("ambiguous")).length === 0,
    realKeysReachedTheGame: (stats.keys ?? 0) >= keys * 0.95,
    noRejectedCommand: (final?.rejected ?? []).length === 0,
    nodeReplaysToBrowserHash: replay?.match === true,
    noConsoleErrors: page.logs.filter((line) => line.startsWith("error")).length === 0,
    noExceptions: page.exceptions.length === 0,
  };
  const pass = Object.values(checks).every(Boolean);
  if (!pass) process.exitCode = 1;
  return {
    pass,
    checks,
    wpm: WPM,
    keysSent: keys,
    samples,
    vocabulary: final?.flags?.vocabulary,
    gachArrivedAfterS: gachArrivedAt >= 0 ? +(gachArrivedAt / 60).toFixed(1) : null,
    dealtBy,
    maxBuildingsWithLiveWords: maxBuildings,
    samplesWithTier2: tier2,
    tier2Card,
    minCardFontPx: minFont,
    stats: { streamSpawned: stats.streamSpawned, streamDone: stats.streamDone, streamMissed: stats.streamMissed, keys: stats.keys, keyErrors: stats.keyErrors, wordShots: stats.wordShots, kills: stats.kills, damageHero: stats.damageHero, goldWord: stats.goldWord, wavesCleared: stats.wavesCleared },
    typing: final?.typing,
    lives: final?.state?.lives,
    problems,
    replay: { file: replayFile, ...replay },
    shots,
  };
}
