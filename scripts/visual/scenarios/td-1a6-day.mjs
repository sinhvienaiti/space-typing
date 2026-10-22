// Typing Defense 1A.6 "Lời Gọi" (docs/td/BUILD_1A6.md §4, §5, §12 gate 8): a day of the economy, typed.
// The sandbox preset (a farm with a ripe plot and an empty one, 5 villagers, the 8 trees nearest the
// Bastion marked, the Bastion at level 3 with 3 builders), then real CDP keys at 45 WPM:
//   1. the hero flies to the farm; the farmer's harvest call is typed: the plot is reaped (food), and the
//      farmer sows the empty plots (seeds go down, the farm card's "Lớn" count goes up);
//   2. the hero flies to the south-east trees; a chop call is typed until a tree falls (wood);
//   3. an archer is put down by the hero; the builder's build call is typed until it stands.
// Each job must be finished by a typed word (its callEnd has finished: true, so the words pushed the work,
// not the worker alone). The page's command log is replayed on Node to the page's hash. The cards are
// measured and reported (td-1a6-attention gates them). Pictures
// td-1a6-day-{harvest,chop,build}. Exits 1 when a check fails.
//   URL=http://127.0.0.1:3140/ OUT_DIR=… node scripts/visual/cdp-run.mjs scripts/visual/scenarios/td-1a6-day.mjs --width=1280 --height=720
import { KIND, Seen, boot, cardStats, cardSummary, cardsClean, click, consoleChecks, finish, look, out, replayOnNode, sandbox, send, sizeOf, state, td, typeFor } from "./td-1a6-common.mjs";

const q = (m) => Math.round(m * 4);
const FARM_X = -17;
const FARM_Z = 40;

/** The farm card's plot line, as numbers: { ripe, growing, empty } (null when the card is not up). */
async function plots(page) {
  const text = await page.eval(`document.querySelector(".td-dock")?.textContent ?? ""`);
  const m = /Chín\s*(\d+)\s*·\s*Lớn\s*(\d+)\s*·\s*Trống\s*(\d+)/.exec(text ?? "");
  return m ? { ripe: Number(m[1]), growing: Number(m[2]), empty: Number(m[3]) } : null;
}

export default async function (page) {
  const size = sizeOf(page);
  const shots = [];
  const seen = new Seen();
  const cards = cardStats();
  const ready = await boot(page);
  await sandbox(page, "preset");
  await sandbox(page, "gold", 800);
  await sandbox(page, "wood", 300);
  await page.sleep(300);
  const start = await state(page);
  // The farm's card stays up (a click on its rim, off the plots and the farmer): its plot line is read all along.
  await click(page, FARM_X + 2.3, FARM_Z);
  const plotsBefore = await plots(page);

  // 1. Harvest: the hero by the farm; only harvest words are typed.
  await send(page, { t: "move", agent: 0, qx: q(FARM_X + 4), qz: q(FARM_Z - 3) });
  let maxGrowing = plotsBefore?.growing ?? 0;
  let harvestShot = false;
  const harvest0 = Date.now();
  while (Date.now() - harvest0 < 45000) {
    await typeFor(page, 600, { wpm: 45, kinds: [KIND.harvest], seen });
    const v = await look(page, cards);
    const p = await plots(page);
    if (p !== null) maxGrowing = Math.max(maxGrowing, p.growing);
    if (!harvestShot && v.cards.some((card) => card.text.includes("🌾") || card.cls.includes("is-locked"))) {
      harvestShot = true;
      shots.push(await page.shot(out("td-1a6-day-harvest-" + size + ".png")));
    }
    const s = await state(page);
    const reaped = seen.of("callEnd").some((e) => e.kind === KIND.harvest && e.finished);
    if (reaped && s.seeds < start.seeds && maxGrowing > (plotsBefore?.growing ?? 0)) break;
  }
  const afterHarvest = await state(page);
  if (!harvestShot) shots.push(await page.shot(out("td-1a6-day-harvest-" + size + ".png")));

  // 2. Chop: the hero by the south-east trees the villagers are chopping; only chop words are typed.
  await send(page, { t: "move", agent: 0, qx: q(15), qz: q(36) });
  let chopShot = false;
  const chop0 = Date.now();
  while (Date.now() - chop0 < 50000) {
    await typeFor(page, 600, { wpm: 45, kinds: [KIND.chop], seen });
    const v = await look(page, cards);
    if (!chopShot && v.words.length > 0 && seen.hits(KIND.chop).length >= 1) {
      chopShot = true;
      shots.push(await page.shot(out("td-1a6-day-chop-" + size + ".png")));
    }
    if (seen.of("callEnd").some((e) => e.kind === KIND.chop && e.finished) && seen.of("felled").length > 0) break;
  }
  const afterChop = await state(page);
  if (!chopShot) shots.push(await page.shot(out("td-1a6-day-chop-" + size + ".png")));

  // 3. Build: an archer a few metres from the hero; the builders walk over; only build words are typed.
  const site = await page.eval(td(`
    const spots = [];
    for (let x = 4; x <= 14; x += 0.5) for (let z = 26; z <= 34; z += 0.5) if (t.canPlace("archer", x, z).ok) spots.push([x, z]);
    spots.sort((a, b) => (a[0] - 10) ** 2 + (a[1] - 31) ** 2 - (b[0] - 10) ** 2 - (b[1] - 31) ** 2);
    return spots[0] ?? null;`));
  if (site !== null) {
    await send(page, { t: "build", def: (await page.eval(td("return t.defs();"))).indexOf("archer"), qx: q(site[0]), qz: q(site[1]) }, { t: "move", agent: 0, qx: q(site[0] + 2), qz: q(site[1] + 3) });
  }
  let buildShot = false;
  const build0 = Date.now();
  let archer = null;
  while (Date.now() - build0 < 45000) {
    await typeFor(page, 600, { wpm: 45, kinds: [KIND.build], seen });
    const v = await look(page, cards);
    if (!buildShot && v.words.length > 0 && seen.hits(KIND.build).length >= 1) {
      buildShot = true;
      shots.push(await page.shot(out("td-1a6-day-build-" + size + ".png")));
    }
    const s = await state(page);
    archer = s.buildings.find((b) => b.def === "archer" && site !== null && Math.abs(b.x - site[0]) < 0.3 && Math.abs(b.z - site[1]) < 0.3) ?? null;
    if (archer?.ready && seen.of("callEnd").some((e) => e.kind === KIND.build && e.finished)) break;
  }
  if (!buildShot) shots.push(await page.shot(out("td-1a6-day-build-" + size + ".png")));
  await seen.poll(page);
  const end = await state(page);
  const stats = await page.eval(td("return t.stats();"));
  const replay = await replayOnNode(page, "td-1a6-day");
  const finishedBy = (kind) => seen.of("callEnd").some((e) => e.kind === kind && e.finished);
  const typed = { harvest: seen.hits(KIND.harvest).length, chop: seen.hits(KIND.chop).length, build: seen.hits(KIND.build).length };
  const checks = {
    ready,
    // Live cards never overlap, sit clear of the HUD panels, ≥ 18 px, on screen (the locked card's ×1.2 included, review R3).
    cardsClean: cardsClean(cards),
    farmCardShown: plotsBefore !== null,
    harvestTyped: typed.harvest >= 1,
    harvestFinishedByTyping: finishedBy(KIND.harvest),
    reaped: seen.of("harvested").length >= 1 && afterHarvest.food > start.food,
    sowed: afterHarvest.seeds < start.seeds && maxGrowing > (plotsBefore?.growing ?? 0),
    chopTyped: typed.chop >= 1,
    chopFinishedByTyping: finishedBy(KIND.chop),
    treeFelled: seen.of("felled").length >= 1 && afterChop.wood > afterHarvest.wood,
    siteFound: site !== null,
    buildTyped: typed.build >= 1,
    buildFinishedByTyping: finishedBy(KIND.build),
    archerStands: archer?.ready === true,
    wordsCounted: stats.callWords >= typed.harvest + typed.chop + typed.build,
    nodeReplaysToBrowserHash: replay.match === true,
    ...consoleChecks(page),
  };
  return finish(page, checks, {
    typed, plotsBefore, maxGrowing, site,
    resources: { start: [start.gold, start.wood, start.food, start.seeds], harvest: [afterHarvest.food, afterHarvest.seeds], chop: afterChop.wood, end: [end.gold, end.wood, end.food, end.seeds] },
    callEnds: seen.of("callEnd").map((e) => [e.kind, e.finished, e.perfect]),
    stats: { callWords: stats.callWords, callsPerfect: stats.callsPerfect, keys: stats.keys, keyErrors: stats.keyErrors },
    cards: { clean: cardsClean(cards), ...cardSummary(cards) }, replay, shots,
  });
}
