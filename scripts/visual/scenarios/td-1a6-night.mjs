// Typing Defense 1A.6 "Lời Gọi" (docs/td/BUILD_1A6.md §4.5, §5, §12 gate 8): a night with power calls.
// The sandbox preset (an archer and a cannon at the merge, the barracks, the Bastion at level 3), the hero
// between the two towers, Shift+Enter (a real key) calls the night early. A tower with an enemy in reach
// calls for power (1 word, 6 s); its words are typed with real CDP keys at 50 WPM: each one fires a Word
// Shot at once and gives the tower 2 power charges (the 5 dots under it), which its next shots spend. If
// the first night ends before two power words were typed, the sandbox's "Sinh đêm" brings another wave.
// Checks: a power word typed, charges seen on a tower and spent again, a Word Shot fired, the night over
// with lives left, and the page's log replayed on Node to its hash (the cards are measured and reported;
// td-1a6-attention gates them). Pictures
// td-1a6-night-power (a power card up) and td-1a6-night-charges (dots on a tower). Exits 1 on a failed check.
//   URL=http://127.0.0.1:3140/ OUT_DIR=… node scripts/visual/cdp-run.mjs scripts/visual/scenarios/td-1a6-night.mjs --width=1280 --height=720
import { KIND, Seen, boot, cardStats, cardSummary, cardsClean, consoleChecks, finish, key, look, out, replayOnNode, sandbox, send, sizeOf, state, td, typeFor } from "./td-1a6-common.mjs";

export default async function (page) {
  const size = sizeOf(page);
  const shots = [];
  const seen = new Seen();
  const cards = cardStats();
  const ready = await boot(page);
  await sandbox(page, "preset");
  await send(page, { t: "move", agent: 0, qx: 0, qz: 13 * 4 });
  await page.sleep(2500);
  await key(page, "Enter", { shift: true });
  const called = await page.eval(td("return t.state().phase;"));

  const charges = new Map();
  let maxCharges = 0;
  let spent = 0;
  let powerShot = false;
  let chargeShot = false;
  let nights = 1;
  let ended = false;
  const night0 = Date.now();
  while (Date.now() - night0 < 120000) {
    await typeFor(page, 500, { wpm: 50, kinds: [KIND.power], seen });
    const v = await look(page, cards);
    const s = await state(page);
    for (const b of s.buildings) {
      const before = charges.get(b.id) ?? 0;
      if (b.charges < before) spent += 1;
      charges.set(b.id, b.charges);
      maxCharges = Math.max(maxCharges, b.charges);
    }
    const powerIds = s.calls.filter((c) => c.kind === KIND.power && c.bright).map((c) => c.id);
    if (!powerShot && v.words.some((w) => powerIds.includes(w.call))) {
      powerShot = true;
      shots.push(await page.shot(out("td-1a6-night-power-" + size + ".png")));
    }
    if (!chargeShot && maxCharges >= 2 && s.buildings.some((b) => b.charges >= 2) && s.phase === "night") {
      chargeShot = true;
      shots.push(await page.shot(out("td-1a6-night-charges-" + size + ".png")));
    }
    if (s.phase !== "night" && Date.now() - night0 > 3000) {
      if (seen.hits(KIND.power).length >= 2 && spent > 0) {
        ended = true;
        break;
      }
      if (nights >= 3) break;
      nights += 1;
      await sandbox(page, "night");
      await page.sleep(300);
    }
  }
  if (!powerShot) shots.push(await page.shot(out("td-1a6-night-power-" + size + ".png")));
  if (!chargeShot) shots.push(await page.shot(out("td-1a6-night-charges-" + size + ".png")));
  await seen.poll(page);
  const end = await state(page);
  const stats = await page.eval(td("return t.stats();"));
  const replay = await replayOnNode(page, "td-1a6-night");
  const checks = {
    ready,
    nightByShiftEnter: called === "night" && seen.of("nightCalled").length >= 1,
    powerTyped: seen.hits(KIND.power).length >= 1,
    chargesSeen: maxCharges >= 2,
    chargesSpent: spent >= 1,
    wordShotFired: stats.wordShots >= 1,
    nightOver: ended && end.lives > 0,
    nodeReplaysToBrowserHash: replay.match === true,
    ...consoleChecks(page),
  };
  return finish(page, checks, {
    nights, powerWords: seen.hits(KIND.power).map((e) => e.grade), maxCharges, spent, charges: Object.fromEntries(charges),
    end: { phase: end.phase, day: end.day, wave: end.wave, lives: end.lives },
    stats: { wordShots: stats.wordShots, damageWordShot: stats.damageWordShot, fizzles: stats.fizzles, kills: stats.kills, callWords: stats.callWords },
    cards: { clean: cardsClean(cards), ...cardSummary(cards) }, replay, shots,
  });
}
