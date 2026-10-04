# Yêu cầu ảnh: biểu tượng cổ vật (Relic) nền trong suốt

> **Trạng thái (04/10/2026): đã xong.** Đủ 12 ảnh ở `src/assets/expansion-v2/icons/`, bản 256 và 512 (`@2x`). Đã kiểm tra: có nền trong suốt thật, góc trong suốt, không còn điểm xanh sót viền. Thẻ phần thưởng cổ vật và màn Expedition tự dùng ảnh này.

> **Dành cho:** chủ dự án và AI tạo ảnh (Gemini, ChatGPT Images…) được giao làm ảnh.
>
> **Vì sao cần:** thẻ phần thưởng mới (kiểu thẻ ARAM, `src/ui/reward-card.ts`) có một ô biểu tượng lớn ở trên.
> - 6 cổ vật của chiến dịch **chưa có ảnh**, nên thẻ đang hiện ký hiệu ✧.
> - 6 cổ vật của Expedition **có ảnh**, nhưng ảnh bị **dính sẵn nền ô cờ xám trắng** (ảnh không có kênh trong suốt). Đặt lên thẻ sẽ lộ ô vuông ô cờ. Cần làm lại với nền tách được.
>
> Code đã sẵn tên file. Đặt đúng thư mục, đúng tên là lần build sau game tự nhận. Món nào chưa có ảnh thì vẫn hiện ✧, không lỗi.

## 1. Cách làm (cho AI tạo ảnh)

1. Tạo ảnh vuông **1024×1024** theo lời nhắc ở mục 3–4. Mỗi lời nhắc = **phần chung** (mục 2) + **phần riêng** của món đó.
2. **Nền phải là một màu xanh lá phẳng `#00FF00`**, không chuyển màu, không bóng đổ xuống nền. Không vẽ ô cờ giả trong suốt.
3. Lưu ảnh gốc vào `games/space-typing/art-src/relics/relic-<mã>.png` (chỉ để lưu trữ, game không đọc).
4. Tách nền và xuất 2 cỡ WebP có kênh trong suốt (chạy trong `games/space-typing`):

   ```bash
   # Tách nền xanh, khử viền xanh, xuất 512 px (@2x) và 256 px.
   node -e '
   const sharp = require("sharp");
   const [src, name] = process.argv.slice(1);
   (async () => {
     const { data, info } = await sharp(src).resize(1024, 1024).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
     for (let i = 0; i < data.length; i += 4) {
       const r = data[i], g = data[i + 1], b = data[i + 2];
       const spill = g - Math.max(r, b);
       if (spill > 90) data[i + 3] = 0;                                   // nền
       else if (spill > 20) { data[i + 3] = Math.round(255 * (1 - (spill - 20) / 70)); data[i + 1] = Math.max(r, b); } // viền
     }
     const keyed = sharp(data, { raw: info }).png();
     const buf = await keyed.toBuffer();
     const dir = "src/assets/expansion-v2/icons/";
     require("fs").mkdirSync(dir, { recursive: true });
     await sharp(buf).resize(512, 512).webp({ quality: 90, alphaQuality: 100 }).toFile(dir + name + "@2x.webp");
     await sharp(buf).resize(256, 256).webp({ quality: 88, alphaQuality: 100 }).toFile(dir + name + ".webp");
     console.log("ok", name);
   })();
   ' art-src/relics/relic-first-light-seed.png relic-first-light-seed
   ```

   Thư mục đích là **`src/assets/expansion-v2/icons/`** (đây là chỗ code `relicIconUrl` đọc). Thư mục `src/assets/expansion-v2/relics/` đang chứa bản ô cờ cũ: game không đọc, có thể giữ hoặc xóa tùy chủ dự án.
5. Kiểm tra bằng mắt trên nền tối: không còn viền xanh, không còn ô cờ.
6. Build lại: `pnpm build:space` (ở thư mục gốc `typing-game`), rồi mở một thẻ phần thưởng cổ vật.

**Quy tắc đặt tên:** `relic-<mã>.webp` và `relic-<mã>@2x.webp`, chữ thường và dấu gạch ngang, đúng từng ký tự như cột "Tên file".

## 2. Phần chung (dán trước mọi lời nhắc)

```
Square game icon, 1:1, a single ornate sci-fi relic artifact centred and filling about 72% of the
frame, painterly premium space-fantasy game art, crafted dark gunmetal and silver frame with fine
engraved detail, a glowing energy core in the accent colour given below, soft inner light and a
gentle outer glow that fades out before the edges, bold readable silhouette at 48 px, front view,
slight top-left key light, flat pure green #00FF00 background with no gradient and no shadow on the
background, no checkerboard, no text, no letters, no numbers, no frame, no border, no watermark.
```

Gợi ý theo cấp, để cả bộ đồng bộ với màu khung thẻ:
- **Silver:** kim loại bạc lạnh, lõi sáng vừa, ít đá quý.
- **Gold:** viền vàng chạm khắc, lõi sáng mạnh hơn, vài tia sáng nhỏ.
- **Diamond (Prismatic):** pha lê nhiều màu lấp lánh, lõi rất sáng, các mảnh sáng bay quanh.

## 3. Làm thử trước (2 ảnh)

Làm 2 ảnh này trước để chủ dự án duyệt phong cách và cách tách nền, rồi mới làm phần còn lại.

| Tên file | Cấp | Phần riêng của lời nhắc |
|---|---|---|
| `relic-first-light-seed` | Silver | `a small luminous seed of dawn light cradled in a silver leaf-shaped reliquary, warm sunrise glow, accent colour soft gold #ffd98a` |
| `relic-echo-core` | Diamond | `a prismatic crystal heart inside concentric rings of rippling sound waves, echoes of light pulsing outward, accent colour violet-cyan #9f8bff and #7ff5ff` |

## 4. Toàn bộ danh sách (12 ảnh)

### 4.1 Cổ vật chiến dịch (chưa có ảnh)

| Tên file | Cấp | Tác dụng trong game | Phần riêng của lời nhắc |
|---|---|---|---|
| `relic-first-light-seed` | Silver | Từ đầu tiên mỗi màn hồi 5 % Hull | (xem mục 3) |
| `relic-storm-script` | Silver | Từ gõ hoàn hảo phóng tia sét sang 3 quái gần | `an ancient scroll case of brushed silver with crackling lightning script spiralling out of it, accent colour electric blue #6fd8ff` |
| `relic-frost-rhythm` | Silver | Mỗi 20 phím đúng liền nhau làm đóng băng quái gần | `a silver metronome made of ice crystal, frost rings pulsing from its swinging arm, accent colour ice blue #bfefff` |
| `relic-giant-word-lens` | Gold | Từ của trùm dài 8+ chữ gây thêm 25 % sát thương | `a heavy golden magnifying lens with a thick ornate rim, a glowing glyph enlarged inside the glass, accent colour amber #ffb347` |
| `relic-mirror-vow` | Gold | Một lần mỗi màn, gõ sai được khiên đỡ thay cho mất chuỗi | `a golden hand mirror with a sworn-oath seal, its glass a calm reflective shield surface, accent colour pale gold #ffe7a3 with cyan reflections` |
| `relic-cosmic-conductor` | Diamond | Tia sét đi xa hơn và từ dài của trùm mạnh thêm | `a prismatic conductor's baton orbited by tiny planets linked by arcs of light, accent colour cosmic violet #c08bff and cyan #7ff5ff` |

### 4.2 Cổ vật Expedition (làm lại vì ảnh cũ dính nền ô cờ)

Giữ đúng ý tưởng của ảnh cũ trong `src/assets/expansion-v2/relics/` để người chơi vẫn nhận ra, chỉ đổi nền sang xanh `#00FF00` cho tách được.

| Tên file | Cấp | Tác dụng trong game | Phần riêng của lời nhắc |
|---|---|---|---|
| `relic-precision-lens` | Silver | Từ gõ hoàn hảo hồi tới 2 Energy | `a precise silver targeting lens with fine crosshair engravings, a pinpoint of light at its centre, accent colour cyan #7fe8ff` |
| `relic-perfect-capacitor` | Silver | Từ gõ hoàn hảo cộng tới 1,2 Power | `a compact silver energy capacitor cell with glowing coils and a charge gauge, accent colour violet #b48bff` |
| `relic-combo-coil` | Gold | Cứ 5 từ hoàn hảo phát một xung +6 Power | `a golden spring coil wound around a glowing core, five small lights along the coil, accent colour hot magenta #ff6fd8` |
| `relic-heavy-core` | Gold | Từ dài 8+ chữ hồi 4 Shield | `a dense golden reactor core in a heavy armoured cage, steady shield-blue glow, accent colour shield blue #5fb0ff` |
| `relic-syllable-forge` | Gold | Từ dài cộng thêm Power | `a small golden anvil forge with glowing letter-shaped sparks rising from it, accent colour forge orange #ff8a3c` |
| `relic-echo-core` | Diamond | Sau khi gõ sai, từ hoàn hảo kế tiếp hồi 5 Energy | (xem mục 3) |

## 5. Ghi chú cho người tích hợp

- Tên file các cổ vật chiến dịch đã có trong `src/expansion-v2/asset-map.ts` (`RELIC_FILES`). Không cần sửa code khi thêm ảnh.
- Thẻ phần thưởng đặt ảnh lên nền tối của thẻ, nên ảnh **phải có kênh trong suốt**. Ảnh có nền tối đặc thì vẫn dùng được nhưng sẽ hiện thành ô vuông.
- Ảnh không có chữ: tên và mô tả do thẻ tự hiện.
