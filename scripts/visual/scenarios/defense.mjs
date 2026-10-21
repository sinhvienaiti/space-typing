// Rift Defense V4: the map select, a build phase (tower cards and fit stars
// on a chosen pad), a fight with every tower striking, a tower burning and a
// fallen one, the inspector, the branch and boon cards (the game's reward
// cards), the boss, and the island of each map.
//   URL=http://127.0.0.1:3098/ node scripts/visual/cdp-run.mjs scripts/visual/scenarios/defense.mjs
// Q=medium for the Medium tier; MAPS=rainbow-reach,frost-veil (ids) for the islands; ISLANDS=0 skips them.
import { DEV_URL, gesture, out } from "./common.mjs";

const d = (code) => "(() => { const d = window.__defense; if (!d) return null; " + code + " })()";

export default async function (page) {
  const base = DEV_URL.replace(/\/$/, "");
  const quality = process.env.Q === "medium" ? "medium" : "high";
  const result = { quality, shots: [], notes: {} };
  const shot = async (name) => result.shots.push(await page.shot(out("defense-" + name + ".jpg")));
  const ready = async () => {
    for (let wait = 0; wait < 480; wait += 1) {
      if (await page.eval(d("return d.ready();"))) return;
      await page.sleep(250);
    }
  };
  await page.goto(base + "/defense.html", { settle: 300 });
  await page.eval("localStorage.setItem('spaceTypingDefenseQualityV1', '" + quality + "'), localStorage.setItem('spaceTypingDefenseMapV1', 'halo-garden'), true");
  await page.goto(base + "/defense.html", { settle: 1200 });
  await gesture(page);
  await ready();
  await page.sleep(4500);
  await shot("1-maps");

  // Map 2 (two roads that meet): build on the merge pad and around it.
  await page.eval(d("return d.start('halo-garden');"), { await: true });
  await page.sleep(1500);
  await page.eval(d("d.select(4); return true;"));
  await page.sleep(700);
  await shot("2-build-cards");
  result.notes.build = await page.eval(d("return [d.build(4, 'gravity', 1), d.build(5, 'frost', 2), d.build(6, 'arc', 1), d.build(8, 'siphon', 0), d.build(2, 'frost', 0)];"));
  await page.eval(d("d.select(5); return true;"));
  await page.sleep(900);
  await shot("3-towers-inspector");

  // A fight on wave 6: every tower striking, a Saboteur on the towers.
  await page.eval(d("d.select(-1); return d.wave(6);"));
  await page.sleep(11000);
  await shot("4-fight");
  await page.eval(d("d.camera(0.6, 42, 46); return true;"));
  await page.sleep(1600);
  await shot("5-fight-close");
  // Damage: one tower burning, one fallen.
  await page.eval(d("d.damage(5, 0.25); d.damage(6, 0); return true;"));
  await page.sleep(2600);
  await shot("6-burning");
  result.notes.fight = await page.eval(d("const e = d.engine; return { alive: e.alive, wave: e.wave, lives: e.lives, towers: e.towers.map((t) => t && [t.type, Math.round(t.hp), t.down]) };"));

  // The branch cards (map 5 opens branches: shown here from the dev handle).
  await page.eval(d("return d.start('prism-spire');"), { await: true });
  await page.sleep(1500);
  await page.eval(d("d.build(0, 'arc', 2); d.select(0); d.branches(0); return true;"));
  await page.sleep(1800);
  await shot("7-branch-cards");
  await page.key("Escape");
  await page.eval(d("return d.boon();"));
  await page.sleep(1800);
  await shot("8-boon-cards");
  await page.key("1");
  await page.sleep(600);

  // The boss of map 1.
  await page.eval(d("return d.start('rainbow-reach');"), { await: true });
  await page.sleep(1200);
  await page.eval(d("d.build(2, 'frost', 2); d.build(4, 'arc', 2); d.build(5, 'siphon', 1); return d.wave(10);"));
  await page.sleep(12000);
  await shot("9-boss");
  result.notes.perf = await page.eval(d("return d.measure(3);"), { await: true });

  if (process.env.ISLANDS !== "0") {
    const maps = (process.env.MAPS || "rainbow-reach,halo-garden,ember-hollow,frost-veil,prism-spire,verdant-wild,shadow-rift,cosmic-throne").split(",");
    for (const id of maps) {
      await page.eval(d("return d.start('" + id + "');"), { await: true });
      await page.sleep(2600);
      await page.eval(d("d.camera(0, 62, 86); return true;"));
      await page.sleep(1400);
      await shot("island-" + id);
    }
  }
  return result;
}
