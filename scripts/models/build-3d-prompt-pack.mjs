#!/usr/bin/env node
/**
 * Builds docs/art-requests/3D_TRIPO_MESHY_PROMPTS_2026-10-16.md: one copy-ready
 * Tripo3D / Meshy prompt per game object, made from the descriptions the 2D art
 * already used (ENEMIES_BOSSES.md, SKILLS_EQUIPMENT_ICONS.md,
 * UI_ROUND2_ART_AND_AUDIO_2026-10-04.md) plus the ship table below, so the 3D
 * models keep the same designs. Re-run after editing those tables:
 *
 *   node scripts/models/build-3d-prompt-pack.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..", "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const OUT = "docs/art-requests/3D_TRIPO_MESHY_PROMPTS_2026-10-16.md";

/** `| \`id\` | … | \`text\` |` rows of a markdown file, grouped by "## " section number. */
function tableRows(markdown) {
  const rows = [];
  let section = "";
  for (const line of markdown.split("\n")) {
    const heading = /^##\s+([0-9A-Z.]+)/.exec(line);
    if (heading) section = heading[1];
    const sub = /^###\s+(.*)/.exec(line);
    if (sub) section = section.split("/")[0] + "/" + sub[1].trim();
    const match = /^\|\s*`([a-z0-9-]+)`\s*\|(.*)\|\s*$/.exec(line);
    if (!match) continue;
    const cells = match[2].split("|").map((cell) => cell.trim());
    const quoted = cells.map((cell) => /`([^`]+)`/.exec(cell)?.[1] ?? null).filter(Boolean);
    rows.push({ id: match[1], section, cells, text: quoted.at(-1) ?? null, name: cells[0]?.replace(/\*|`/g, "") ?? "" });
  }
  return rows;
}

// Fire, lightning and smoke are drawn by the game; on the model they are painted glow, not loose geometry.
const TAIL =
  "Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, " +
  "glowing emissive energy parts, single object centred, no base, no ground, no text, " +
  "any fire, lightning or smoke painted as glow on the surface, not as separate shapes.";
const COUNT = ["no", "one", "two", "three", "four"];
const title = (id) => id.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");

const SHIPS = [
  ["vanguard", "Vanguard", 2, "a sleek spear-shaped starter interceptor: long pointed nose, a glowing cyan crystal spine along the top centre, swept-back wings with small upturned tips, pearl-white ceramic armour with royal blue panels and thin glowing cyan lines, dark blue glass canopy, twin small cannons under the nose"],
  ["aegis", "Aegis", 3, "a heavy defensive frigate shaped like a flying fortress: broad armoured hull, layered shield plates on both flanks, mint and teal armour with a warm gold core"],
  ["volt", "Volt", 2, "an energy caster ship with curved arc-shaped wings holding tesla coils, crackling yellow-white core, cyan and indigo armour"],
  ["wraith", "Wraith", 2, "a stealth phantom ship with thin blade-like wings and a narrow body, smoky violet armour, cyan glowing slits"],
  ["fortune", "Fortune", 2, "a lucky treasure-hunter ship with a crown-shaped bow, gold and bronze plating, mint gem core"],
  ["arsenal", "Arsenal", 3, "a weapon platform ship with blade wings carrying many gun pods, coral orange and wine red armour"],
  ["oracle", "Oracle", 1, "a precision seer ship with a large lens eye at the nose and a crown crest, orchid and violet armour"],
  ["bastion", "Bastion", 3, "a shield support carrier with four floating shield emitters around a square fortress hull, seafoam armour"],
  ["reaper", "Reaper", 2, "an aggressive raider with scythe-shaped wings and a sharp hooked nose, crimson-pink and dark plum armour"],
  ["celestial", "Celestial", 2, "a late-game hybrid ship with halo-like arc wings and star motifs, periwinkle and indigo armour, pale gold star core"],
  ["zenith", "Zenith", 3, "the apex flagship: long spear hull with prism fins, white-cyan and violet armour, radiant gold core"],
];

const SKILL_OBJECTS = [
  ["micro-missile", "Missile Swarm", "a compact homing micro-missile: slim white body with orange warning bands, a dark sensor tip, four small swept tail fins, a glowing orange exhaust nozzle at the rear, a tiny blue status light on the side"],
  ["railgun-slug", "Railgun", "a glowing magnetic railgun slug: elongated tungsten dart with blue-white plasma rings around it"],
  ["orbital-lance", "Orbital Strike", "a long orbital strike lance: white-gold spear-shaped kinetic rod with glowing runes and stabiliser fins"],
  ["sentinel-drone", "Sentinel Drones", "a small round escort drone with a single cyan lens eye, two side thrusters and a tiny shield emitter"],
  ["gravity-core", "Singularity", "a fist-sized gravity bomb: dark metal cage holding a swirling black sphere with a violet accretion ring"],
];

/** Bosses that stand like people (A-pose → Meshy can rig them); the rest float as one body. */
const HUMANOID = new Set([
  "tyrant-g01", "tyrant-g02", "tyrant-g03", "tyrant-g05", "tyrant-g06", "tyrant-g08", "tyrant-g09", "tyrant-g10",
  "warden-angel", "warden-devil", "warden-frost", "warden-prism", "warden-nature", "warden-cosmic", "warden-rainbow",
  "lieutenant-rainbow", "lieutenant-angel", "lieutenant-devil", "lieutenant-frost", "lieutenant-shadow", "lieutenant-cosmic",
]);

const BUDGET = { ships: 15000, enemies: 5000, bosses: 40000, skills: 1500, items: 5000 };
const BOSS_BUDGET = (id) => (id.startsWith("tyrant") ? 40000 : id.startsWith("warden") ? 30000 : 20000);

const enemiesBosses = tableRows(read("docs/art-requests/ENEMIES_BOSSES.md"));
const icons = tableRows(read("docs/art-requests/SKILLS_EQUIPMENT_ICONS.md"));
const round2 = tableRows(read("docs/art-requests/UI_ROUND2_ART_AND_AUDIO_2026-10-04.md"));

const kinds = enemiesBosses.filter((row) => row.section.startsWith("5"));
const bosses = enemiesBosses.filter((row) => row.section.startsWith("6"));
const families = enemiesBosses.filter((row) => row.section.startsWith("4"));
const pilotIcons = new Map(icons.filter((row) => row.section.startsWith("3")).map((row) => [row.id, row.text]));
// Section 5 of SKILLS_EQUIPMENT_ICONS.md; two rows point back to the pilot rows of section 3.
const equipment = icons
  .filter((row) => row.section.startsWith("5") && /-mk\d$/.test(row.id))
  .map((row) => ({ ...row, text: row.text ?? pilotIcons.get(row.id) }));
const items = round2.filter((row) => row.text && !/-mk\d$/.test(row.id));

/** Meshy takes about 600 characters: long prompts swap in the short tail. */
const SHORT_TAIL =
  "Stylized sci-fi game asset, PBR textures, glowing emissive parts, single object, no base, no text, fire or smoke only as painted glow.";
const MAX_PROMPT = 600;

function block(kind, id, name, image, budget, full, note = "") {
  const prompt = full.length <= MAX_PROMPT ? full : full.replace(TAIL, SHORT_TAIL);
  if (prompt.length > MAX_PROMPT) throw new Error(kind + "/" + id + ": prompt too long (" + prompt.length + ")");
  return [
    "#### `" + kind + "/" + id + "` — " + name,
    "- Ảnh tải lên: `" + image + "` · Số mặt: **" + budget.toLocaleString("en-US") + "**" + (note ? " · " + note : ""),
    "- Lưu về: `art-src/models/raw/" + kind + "/" + id + ".tripo.glb` hoặc `" + id + ".meshy.glb`",
    "",
    "```text",
    prompt,
    "```",
    "",
  ].join("\n");
}

const sections = [];

sections.push("### 4.1 Phi thuyền (11) — `ships/<id>`\n");
for (const [id, name, engines, text] of SHIPS) {
  const prompt =
    name + ", " + text + ". Player starfighter for a top-down space shooter, nose pointing forward, symmetrical, " +
    (engines === 1 ? "one large engine nozzle" : COUNT[engines] + " engine nozzles") +
    " at the rear with glowing rims and no exhaust flame. " + TAIL;
  sections.push(block("ships", id, name, "art-src/ships/" + id + "-top-hd.png", BUDGET.ships, prompt));
}

sections.push("### 4.2 Quái (14 khung chung, chất liệu trung tính) — `enemies/<loại>`\n");
sections.push(
  "Một mô hình cho mỗi loại, dùng cho cả 8 họ: game tô màu họ bằng đèn viền. Ảnh tải lên chỉ để lấy **dáng**; " +
    "màu cầu vồng trên ảnh sẽ được tôi đổi sang trắng gốm trong Blender.\n",
);
for (const row of kinds) {
  const prompt =
    row.text.charAt(0).toUpperCase() + row.text.slice(1) +
    ". Small alien enemy for a space shooter, seen mostly from above, chunky readable shape, symmetrical. " +
    "Neutral materials so the game can recolour it: pearl-white ceramic shell, light silver metal joints, " +
    "the core and edge lights glowing pure white. " + TAIL;
  sections.push(block("enemies", row.id, title(row.id) + " (" + row.name + ")", "src/assets/enemies/rainbow-" + row.id + "@2x.webp", BUDGET.enemies, prompt));
}

sections.push("### 4.3 Boss (25; G01 đã có mô hình) — `bosses/<id>`\n");
for (const row of bosses) {
  if (row.id === "tyrant-g01") continue;
  const humanoid = HUMANOID.has(row.id);
  const prompt =
    row.text.charAt(0).toUpperCase() + row.text.slice(1) +
    ". Giant boss for a space shooter, full body facing the viewer, " +
    (humanoid ? "standing in a relaxed A-pose with the arms slightly away from the body, " : "floating as one solid body, ") +
    (/wing/i.test(row.text) ? "wings spread wide, " : "") +
    "a wide dramatic silhouette, symmetrical. " + TAIL;
  sections.push(block(
    "bosses", row.id, row.name || row.id, "src/assets/bosses/" + row.id + "@2x.webp", BOSS_BUDGET(row.id), prompt,
    humanoid ? "Meshy: **Pose A-pose**, rồi Auto-Rig" : "không cần khung xương",
  ));
}

sections.push("### 4.4 Vật thể của kỹ năng (5) — `skills/<id>`\n");
sections.push("Chỉ những kỹ năng có vật thể (tên lửa, đạn, drone). Khiên, sóng EMP, vùng làm chậm là hiệu ứng ánh sáng do game vẽ, không cần mô hình.\n");
for (const [id, name, text] of SKILL_OBJECTS) {
  const prompt = text.charAt(0).toUpperCase() + text.slice(1) + ", pointing forward along its length, symmetrical. " + TAIL;
  sections.push(block("skills", id, name, "(không có ảnh: dùng Text to 3D)", BUDGET.skills, prompt));
}

sections.push("### 4.5 Trang bị (" + equipment.length + ") — `items/<id>`\n");
for (const row of equipment) {
  const text = (row.text ?? "").replace(/^Mk\.(I{1,3})\s+/i, "");
  const prompt =
    row.name + ": " + text + ". A compact spaceship equipment module shown as a floating game item, " +
    "three-quarter view friendly, clean mechanical detail. " + TAIL;
  sections.push(block("items", row.id, row.name, "src/assets/icons/equipment/" + row.id + ".webp", BUDGET.items, prompt));
}

sections.push("### 4.6 Vật phẩm dùng một lần (" + items.length + ") — `items/<id>`\n");
for (const row of items) {
  const text = row.text.replace(/, accent colou?r .*$/i, "");
  const prompt = row.name + ": " + text + ". A consumable game item, small and iconic, three-quarter view friendly. " + TAIL;
  sections.push(block("items", row.id, row.name, "src/assets/icons/items/" + row.id + ".webp", 4000, prompt));
}

const familyLines = families
  .map((row) => "| `" + row.id + "` | `" + row.text + "` |")
  .join("\n");

const doc = `# Prompt 3D cho Tripo3D và Meshy: tàu, quái, boss, kỹ năng, trang bị, vật phẩm (16/10/2026)

> **Dành cho:** chủ dự án (tạo mô hình trên Tripo3D / Meshy) và AI làm tiếp (chỉnh trong Blender, đưa vào game).
> **Cách chia việc** (chủ dự án chốt ngày 16/10/2026):
> 1. Chủ dự án dán prompt dưới đây vào Tripo3D hoặc Meshy, tải về **GLB**.
> 2. AI chỉnh trong Blender bằng script \`scripts/models/blender/space_typing_model_tools.py\` (chạy tự động): dọn hình, giảm tam giác, đặt điểm gắn hiệu ứng, tạo vùng phát sáng, làm hoạt ảnh, xuất file game, nối vào code.
> **Tài liệu này được tạo tự động** bởi \`node scripts/models/build-3d-prompt-pack.mjs\` từ các bảng mô tả của tranh 2D, nên mô hình 3D giữ đúng thiết kế đang có. Muốn sửa mô tả: sửa bảng gốc rồi chạy lại lệnh.
> **Thay cho phần "ảnh khái niệm ChatGPT" và "tự chỉnh Blender"** trong \`docs/art-requests/3D_MODELS_PROMPT_PACK_2026-10-16.md\`. Quy chuẩn mô hình (hướng, điểm gắn, tên hoạt ảnh) vẫn theo tài liệu đó, mục 2.

## 1. Làm theo thứ tự

**Đợt 1, làm thử 6 món** (để duyệt phong cách trước khi làm hàng loạt):

| Món | Mục | Vì sao |
|---|---|---|
| \`ships/vanguard\` | 4.1 | Tàu khởi đầu, thấy nhiều nhất |
| \`enemies/scout\` | 4.2 | Quái đông nhất |
| \`bosses/tyrant-g02\` | 4.3 | Thử quy trình boss có khung xương (G01 đã có) |
| \`skills/micro-missile\` | 4.4 | Đã nối sẵn trong code |
| \`items/pulse-laser-mk1\` | 4.5 | Trang bị đầu tiên |
| \`items/repair-kit\` | 4.6 | Vật phẩm shop |

Gửi 6 file cho AI. AI chỉnh, đưa vào game, chụp so sánh với bản 2D. Duyệt xong mới làm phần còn lại.

**Boss G01 (Auriel) đã xong phần Blender:** thêm 3 hoạt ảnh bằng xương (\`Boss_Hit\`, \`Boss_Death\`, \`Boss_Intro\`) và bản đồ phát sáng cho cánh pha lê. Không cần tạo lại.

## 2. Thiết lập trên Tripo3D và Meshy

Tên nút có thể đổi theo phiên bản. Giá trị dưới đây lấy từ hướng dẫn của bên thứ ba (Scenario, ComfyUI) cho Tripo P2 / 3.1 và Meshy 7, tra cứu ngày 16/10/2026, nên cần đối chiếu với giao diện thật. Prompt tối đa 600 ký tự (giới hạn của Meshy).

| Mục | Tripo3D | Meshy |
|---|---|---|
| Chế độ | **Image to 3D** với ảnh ở mục 4; không có ảnh thì **Text to 3D** với prompt | **Image to 3D** (hoặc Multi-image nếu có thêm góc); không có ảnh thì **Text to 3D** |
| Prompt | Ô mô tả của Text to 3D | Ô prompt (Text to 3D) hoặc ô **Texture prompt** nếu dùng Image to 3D |
| Texture | **HD**, **PBR bật** | **PBR bật** (mặc định đang tắt), texture 2K |
| Số mặt | **Face limit** = số ở mục 4, dạng **tam giác** (Quad tắt), Smart Low Poly tắt | **Remesh bật**, Topology **Triangle**, **Target polycount** = số ở mục 4 |
| Đối xứng | — | **Symmetry: On** (tàu, quái, trang bị); Auto với boss |
| Ánh sáng | — | **Remove lighting: On** (bỏ bóng sáng vẽ sẵn trong ảnh) |
| Tư thế | — | Boss dạng người: **Pose: A-pose**; còn lại: None |
| Khung xương | Auto-rig **tắt** (AI làm hoạt ảnh) | Boss dạng người: **Rigging/Auto-Rig** sau khi tạo; còn lại tắt |
| Tải về | **GLB** | **GLB** |

**Mẹo:**
- Ảnh tải lên là tranh 2D hiện có của game. Nếu ảnh có lửa động cơ hay tia sáng, mô hình có thể có một khối "lửa": **không sao, AI cắt bỏ trong Blender**.
- Có thể tạo **cả hai** (Tripo và Meshy) cho cùng một món, lưu \`<id>.tripo.glb\` và \`<id>.meshy.glb\`: AI chọn bản đẹp hơn.
- Nếu bản tạo ra sai dáng, chạy lại (Tripo: Regenerate; Meshy: Retry) hoặc thử Text to 3D với cùng prompt.

## 3. Sau khi tải về (AI làm)

1. Đặt file vào \`games/space-typing/art-src/models/raw/<loại>/\` (ví dụ \`art-src/models/raw/ships/vanguard.tripo.glb\`), báo AI.
2. AI chạy Blender không giao diện, ví dụ:
   \`\`\`
   blender -b --factory-startup -P scripts/models/blender/space_typing_model_tools.py -- \\
     --input art-src/models/raw/ships/vanguard.tripo.glb --kind ships --id vanguard \\
     --project . --auto-emissive 0.08 --preview .visual/models/vanguard
   \`\`\`
   Script tự làm:
   - nạp file;
   - gộp các phần, quay mũi về +Y, căn tâm, đặt cạnh dài nhất 2 m;
   - giảm tam giác theo ngân sách;
   - tạo bản đồ phát sáng từ những vùng sáng và đậm màu nhất (Tripo/Meshy không xuất bản đồ này);
   - đặt điểm gắn \`FX_*\` theo hình học (miệng động cơ, mũi súng, lõi, đầu cánh);
   - tạo hoạt ảnh: \`Ship_Idle\`, \`Enemy_Idle\`, \`Item_Idle\`; với boss có xương thì tạo \`Boss_Hit\`, \`Boss_Death\`, \`Boss_Intro\` bằng xương;
   - render ảnh xem trước để AI tự soi;
   - xuất \`art-src/models/<loại>/<id>.glb\`.
   Quái thêm \`--neutralize\` (màu gốc thành trắng gốm, vùng phát sáng thành trắng). Boss có xương thêm \`--boss-clips\`. Trên máy chủ dự án, Blender ở \`D:\\Blender\\blender.exe\`.
3. AI soi ảnh, chỉnh tay khi cần:
   - cắt khối lửa;
   - kéo điểm gắn cho đúng.
4. AI chạy \`pnpm models:prepare --only <loại>/<id>\` (nén, tạo bản High/Medium, cập nhật manifest), nối code nếu cần (boss khác G01 cần thêm hợp đồng), build, chụp so sánh trong game.

## 4. Prompt từng món

Bảng chất liệu theo họ, dùng khi muốn **bản riêng cho một họ** (\`enemies/<họ>-<loại>\`, làm sau cùng): thay câu "Neutral materials…" trong prompt quái bằng câu của họ.

| Họ | Câu chất liệu |
|---|---|
${familyLines}

${sections.join("\n")}
`;

writeFileSync(resolve(root, OUT), doc);
console.log("wrote " + OUT + ": " + (SHIPS.length + kinds.length + bosses.length - 1 + SKILL_OBJECTS.length + equipment.length + items.length) + " prompts");
