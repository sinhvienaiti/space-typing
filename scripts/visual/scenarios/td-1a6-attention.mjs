// Typing Defense 1A.6 "Lời Gọi" (docs/td/BUILD_1A6.md §5.3, §9, §12 gates 6 and 8): many calls at once.
// The sandbox preset at Bastion level 4 (4 builders, 4 agents), four extra sites round the Bastion, the
// villagers on the marked trees south-east of it, the farm's harvest; the hero in the middle of the
// village, Chấm by the farm, Phẩy by the trees, Gạch by the sites. Then, sampling the page every ~250 ms:
//   1. "Thử thách" (cap 4) and "Thư giãn" (cap 2), each on a fresh page with the mode set before any call
//      lights (the sandbox's mode op does not dim calls already bright), 8 s with no key;
//   2. "Cân bằng" (cap 3): no key for 10 s: the bright calls fill the cap while others wait (queued, or
//      open in a help ring but dim); then 20 s of typing at 45 WPM: answered calls make room and a waiting
//      call lights.
// Every sample: bright ≤ the cap of the mode then, no two live word cards overlap (> 1 px²), none touches a
// HUD panel (zoom 1), text ≥ 18 px, all on screen. Pictures td-1a6-attention-cap, td-1a6-attention-typing.
// Exits 1 when a check fails.
//   URL=http://127.0.0.1:3140/ OUT_DIR=… node scripts/visual/cdp-run.mjs scripts/visual/scenarios/td-1a6-attention.mjs --width=1280 --height=720
import { CAP, boot, cardStats, cardSummary, cardsClean, consoleChecks, finish, look, out, sandbox, send, sizeOf, state, td, typeFor } from "./td-1a6-common.mjs";

const q = (m) => Math.round(m * 4);

export default async function (page) {
  const size = sizeOf(page);
  const shots = [];
  const cards = cardStats();
  const maxBright = { relax: 0, balanced: 0, challenge: 0, learn: 0 };
  const overCap = [];
  let atCapWaiting = 0;
  const waited = new Set();
  const litAfterWait = new Set();
  const sample = async () => {
    const v = await look(page, cards);
    if (v === null) return null;
    maxBright[v.mode] = Math.max(maxBright[v.mode], v.bright);
    if (v.bright > CAP[v.mode]) overCap.push(v.mode + " " + v.bright + " at tick " + v.tick);
    if (v.mode === "balanced" && v.bright === CAP.balanced && v.waiting.length > 0) atCapWaiting += 1;
    for (const id of v.brightIds) if (waited.has(id)) litAfterWait.add(id);
    for (const id of v.waiting) waited.add(id);
    return v;
  };

  /** A fresh page in `mode`: the busy village, before any call lights. */
  const setup = async (mode) => {
    const ready = await boot(page);
    if (mode !== "balanced") await sandbox(page, "mode", mode);
    await sandbox(page, "preset");
    await sandbox(page, "keepLevel", 4);
    await sandbox(page, "gold", 3000);
    await sandbox(page, "wood", 1000);
    await page.sleep(300);
    // Four sites round the Bastion, apart from each other: each takes one of the four builders.
    const sites = await page.eval(td(`
      const picked = [];
      for (const [cx, cz] of [[-8, 30], [8, 28], [-6, 22], [6, 21]]) {
        let best = null;
        for (let x = cx - 5; x <= cx + 5; x += 0.5) for (let z = cz - 5; z <= cz + 5; z += 0.5) {
          if (!t.canPlace("archer", x, z).ok || picked.some(([px, pz]) => (px - x) ** 2 + (pz - z) ** 2 < 36)) continue;
          if (best === null || (x - cx) ** 2 + (z - cz) ** 2 < (best[0] - cx) ** 2 + (best[1] - cz) ** 2) best = [x, z];
        }
        if (best !== null) picked.push(best);
      }
      return picked;`));
    const archer = (await page.eval(td("return t.defs();"))).indexOf("archer");
    for (const [x, z] of sites) await send(page, { t: "build", def: archer, qx: q(x), qz: q(z) });
    const farm = (await state(page)).buildings.find((b) => b.def === "farm");
    await send(page,
      { t: "move", agent: 0, qx: q(2), qz: q(30) },
      { t: "assignUnit", agent: 1, building: farm.id },
      { t: "move", agent: 2, qx: q(17), qz: q(37) },
      { t: "move", agent: 3, qx: q(-4), qz: q(26) });
    await page.sleep(2000);
    return { ready, sites };
  };

  // 1. The other caps, no key.
  const runs = {};
  for (const mode of ["challenge", "relax"]) {
    runs[mode] = await setup(mode);
    const t0 = Date.now();
    while (Date.now() - t0 < 8000) {
      await sample();
      await page.sleep(250);
    }
  }

  // 2. Balanced: no key, the cap fills and others wait; then typing frees room and a waiting call lights.
  runs.balanced = await setup("balanced");
  let capShot = false;
  const idle0 = Date.now();
  while (Date.now() - idle0 < 10000) {
    const v = await sample();
    if (!capShot && v !== null && v.bright === CAP.balanced && v.waiting.length > 0 && v.cards.length >= CAP.balanced) {
      capShot = true;
      shots.push(await page.shot(out("td-1a6-attention-cap-" + size + ".png")));
    }
    await page.sleep(250);
  }
  const waitedBeforeTyping = waited.size;
  let typingShot = false;
  let typed = 0;
  const type0 = Date.now();
  while (Date.now() - type0 < 20000) {
    typed += (await typeFor(page, 400, { wpm: 45 })).finished;
    const v = await sample();
    if (!typingShot && v !== null && v.words.some((w) => w.locked && w.typed >= 2) && v.cards.length >= 2) {
      typingShot = true;
      shots.push(await page.shot(out("td-1a6-attention-typing-" + size + ".png")));
    }
  }
  if (!capShot) shots.push(await page.shot(out("td-1a6-attention-cap-" + size + ".png")));
  if (!typingShot) shots.push(await page.shot(out("td-1a6-attention-typing-" + size + ".png")));
  const stats = await page.eval(td("return t.stats();"));
  const end = await state(page);
  const checks = {
    ready: Object.values(runs).every((run) => run.ready),
    fourSites: Object.values(runs).every((run) => run.sites.length === 4),
    neverOverCap: overCap.length === 0 && cards.samples >= 80,
    capFilledWithWaiting: atCapWaiting >= 1,
    waitingCallLit: litAfterWait.size >= 1,
    typedSome: typed >= 3,
    challengeWithinFour: maxBright.challenge >= 1 && maxBright.challenge <= CAP.challenge,
    relaxWithinTwo: maxBright.relax >= 1 && maxBright.relax <= CAP.relax,
    cardsClean: cardsClean(cards),
    ...consoleChecks(page),
  };
  return finish(page, checks, {
    sites: runs.balanced.sites, maxBright, atCapWaiting, waitedBeforeTyping, waited: waited.size, litAfterWait: litAfterWait.size, typed, overCap: overCap.slice(0, 5),
    calls: { made: stats.calls, words: stats.callWords, jams: stats.jams }, phase: end.phase,
    cards: cardSummary(cards), shots,
  });
}
