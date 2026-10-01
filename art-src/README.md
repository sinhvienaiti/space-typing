# art-src — ảnh gốc cho hình nền (không đưa lên Git)

Thư mục này chứa **ảnh gốc** do chủ dự án tạo bằng Gemini hoặc ChatGPT Images.

Game không đọc các ảnh này. Chỉ lệnh `pnpm bg:prepare` đọc chúng, rồi tạo bộ ảnh chạy trong game ở `public/assets/space-typing/backgrounds/<kit>/`. Bộ ảnh chạy trong game **có** trong Git.

Git bỏ qua mọi thứ ở đây, trừ file README này. Lý do:
- ảnh gốc nặng, khoảng 22 MB cho mỗi Galaxy;
- Git giữ mọi phiên bản cũ, nên mỗi lần tạo lại ảnh repo lại nặng thêm.

**Hãy tự sao lưu thư mục này**, ví dụ lên ổ ngoài, iCloud hoặc Google Drive.

Ảnh gốc không đặt trong `public/`, vì Vite chép toàn bộ `public/` vào bản build. Đặt ở đó thì mỗi bản build sẽ kèm cả chục MB ảnh không dùng tới.

## Sang máy khác

1. Clone repo như bình thường. Game vẫn chạy đủ, vì bộ ảnh đã xử lý có sẵn trong Git.
2. Chép thư mục ảnh gốc đã sao lưu vào đây, giữ nguyên tên file. Ví dụ: `art-src/g01/g01-plate.png`.
3. Chỉ cần chạy `pnpm bg:prepare g01-celestial` khi thêm hoặc thay ảnh. Sau đó chạy `pnpm build:space` nếu chơi bằng `./play.sh`.

## Cấu trúc

| Thư mục | Kit | File cần có (đuôi `.png`, `.webp` hoặc `.jpg`) |
|---|---|---|
| `g01/` | `g01-celestial` | `g01-plate`, `g01-plate-b` (không bắt buộc), `g01-glow-a`, `g01-glow-b`, `g01-dust`, `g01-hero-w01` … `g01-hero-w05`, `g01-atlas-rocks`, `g01-atlas-life` |
| `g02/` | `g02-infernal` | `g02-plate`, `g02-glow-a`, `g02-glow-b`, `g02-dust`, `g02-hero-w06` … `g02-hero-w10`, `g02-atlas-rocks`, `g02-atlas-life` |
| `gNN/_out/` | — | Script tự tạo: ảnh xem trước atlas có đánh số, `report.json`. Không cần sao lưu. |
| `fx/vanguard/` | hiệu ứng đạn Vanguard (`pnpm fx:prepare vanguard`) | `vanguard-bolt` (2:1), `vanguard-impact` (1:1), `vanguard-finisher` (2:1), `vanguard-muzzle` (2:1). Tất cả nền đen tuyệt đối `#000000`. |
| `pickups/credits/` | Credit Crystal (`pnpm pickups:prepare`) | `common`, `refined`, `high`, `elite`, `elite-golden`, `mini-boss`, `boss`, `major-boss`. Nền trong suốt thật. |
| `puzzle/` | Puzzle reward art (`pnpm puzzle:prepare`) | `puzzle-carrier`, `puzzle-chest-closed`, `puzzle-chest-open`. Nền trong suốt thật. |

Thêm Galaxy mới: tạo thư mục `gNN/`, rồi khai báo trong `KITS` của `scripts/bg-art/prepare-kit.mjs` cùng dải `heroWorlds`. G02 còn kiểm tra đúng 12 object ở atlas rocks và 11 object ở atlas life để bắt lỗi tách vật thể trước khi build runtime kit.

Chi tiết về tỉ lệ, loại nền và prompt: [G01_CHATGPT_PROMPT_PACK.md](../docs/background-reboot/G01_CHATGPT_PROMPT_PACK.md), bộ G02 tương ứng trong `docs/background-reboot/G02_CHATGPT_PROMPT_PACK.md`, và [BACKGROUND_VISUAL_REBOOT_HANDOFF.md](../docs/BACKGROUND_VISUAL_REBOOT_HANDOFF.md) (mục 6).


## Tự động refresh art khi chạy local

Từ 2026-10-01, không cần nhớ từng lệnh `bg:prepare`, `sprites:prepare`,
`fx:prepare`, `pickups:prepare` hay `puzzle:prepare` cho workflow thường ngày.

Parent `typing-game/play.sh` và `typing-game/dev.sh` gọi:

```bash
pnpm --dir games/space-typing art:prepare
```

Lệnh này chỉ chạy pipeline nào có source art mới hơn runtime output. Vì vậy có thể
chép ảnh mới vào đúng `art-src/...`, rồi chạy `./play.sh` hoặc
`./dev.sh space`. Các lệnh prepare riêng vẫn được giữ cho debug/QA.
