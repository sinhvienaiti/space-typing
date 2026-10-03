# Bàn giao: trùm Depth View, kỹ năng có thể né và phản đòn (04/10/2026)

> **Dành cho:** chủ dự án và AI làm tiếp (Claude, ChatGPT, Codex).
> **Đề xuất gốc và các demo đã duyệt:** `docs/BOSS_AND_REWARD_CARDS_PROPOSAL_2026-10-04.md` (phương án A, như PvP).
> **Chủ dự án duyệt:** "boss làm theo hướng A như PVP là đẹp", kèm yêu cầu: trong lúc trùm tích chiêu, gõ nhanh để né hoặc phản đòn; khoảng cách phải thấy rất xa nhưng ảnh vẫn rõ, không cần quá to; thêm nhiều kỹ năng hơn.

## 0. Tóm tắt

- Ở chế độ chiến dịch (không áp dụng cho Recall), trùm nằm **xa cuối hành lang**, dựng thành **khối 3D có ánh sáng** từ chính ảnh vẽ của nó, giống tàu đối thủ trong PvP.
- Trùm có **6 kỹ năng**. 4 kỹ năng có **chữ phản đòn** hiện lên lúc trùm tích chiêu: gõ kịp thì đỡ được, né được hoặc dội ngược. Tuyệt chiêu có **thiên thạch mang chữ**, gõ chữ nào thì bắn hạ thiên thạch đó.
- Chế độ Recall giữ nguyên bố cục và cách đánh cũ.
- Mức Low dùng ảnh phẳng thay cho khối 3D (vẫn có đủ kỹ năng).

## 1. Bố cục Depth View (`src/Game.ts`)

- **Vị trí:** giữa màn, cao khoảng 25 % chiều cao (giới hạn 140–250 px). Trùm trôi ngang chậm, biên độ tối đa 6 % chiều rộng (≤ 96 px), chu kỳ khoảng 16 giây.
- **Kích thước khung:** 30 % chiều cao với Galaxy Tyrant, 28 % với World Boss, 25 % với Mini Boss. Giới hạn 150–330 px, và **không quá một nửa chiều rộng** (để trên điện thoại vẫn thấy xa).
- **Xuất hiện:** bay ra từ điểm tụ trong 1,3 giây (nhỏ dần thành to).
- **Tử trận:** khối 3D lộn nhào, nhỏ lại và mờ dần trong 1,8 giây sau vụ nổ.
- **Vệt sao** chạy về phía trùm (điểm tụ đặt tại trùm), và giữ ở đó tới hết màn.
- **Đạn chữ của trùm** vẽ đè lên trùm. Đạn nhỏ khi ở xa (0,6 lần), to dần khi tới gần tàu (1,05 lần). Chữ trên đạn giữ nguyên cỡ để dễ đọc.
- **Vòng trạng thái** quanh trùm: cảnh báo sắp ra đòn (đỏ), khiên (xanh), dấu đánh dấu (hồng), choáng (vàng), **hở sườn ×1,5** (vàng đậm, có chữ "EXPOSED ×1.5").
- Từ của trùm hiện ngay dưới trùm như cũ.

## 2. Khối 3D của trùm (`src/boss/boss-relief.ts`)

- three.js chỉ tải khi vào màn trùm. Khối 3D được dựng sẵn từ đầu màn (`prepareBossDepth`), nên lúc trùm ra là có ngay.
- **Cách dựng:** lưới 160×160 điểm. Độ cao lấy từ viền ảnh (làm mờ, mũ 0,7, nhân 0,34), cộng một chút chi tiết theo độ sáng. Vật liệu MeshStandard, ảnh vừa là màu vừa là phần tự phát sáng. Có đèn chính, hai đèn viền theo hai màu của trùm, và một đèn chớp.
- **Độ nét:** dựng đúng bằng cỡ hiện trên màn × mật độ điểm ảnh. Mật độ tối đa: Medium 1, High 1,6, Ultra 2; cạnh tối đa 1100 px. Vì không phóng to ảnh nhỏ nên trùm ở xa vẫn sắc nét.
- **Chuyển động:** xoay nhẹ, nghiêng về phía giữa hành lang khi trôi, "thở" (phồng độ sâu). Khi tích chiêu thì phồng thêm và tự phát sáng. Chớp trắng khi trúng đòn, rung khi choáng, ngả ra sau rồi lao tới khi dùng chiêu Rush.
- **Ánh sáng được giữ thấp có chủ ý** (tự phát sáng tối đa +0,14, đèn chớp ×1,8). Bản thử đầu sáng hơn làm trùm bị lóa trắng.
- **Quầng sáng khi tích chiêu** (`drawBossCharge`) vẽ **sau lưng** trùm, không đè lên mặt trùm.
- **Dự phòng:** mức Low, máy không có WebGL, mất ngữ cảnh WebGL hoặc khối 3D chưa tải xong thì vẽ ảnh phẳng trong cùng khung. Thiếu cả ảnh vẽ thì dùng hình vẽ bằng code.

## 3. Bộ kỹ năng (`src/boss/skills.ts`, chỉ có logic, không vẽ)

Mỗi kỹ năng có 3 giai đoạn: **tích chiêu → ra đòn → hồi**. Trùm chỉ dùng kỹ năng tiếp theo sau khi kỹ năng trước kết thúc. Mỗi lần tới lượt hành động, trùm bốc ngẫu nhiên có trọng số (dùng hạt giống theo màn, nên cùng một màn luôn ra cùng một chuỗi). Trùm bỏ qua kỹ năng đang hồi và không dùng cùng một kỹ năng đặc biệt hai lần liền.

| Kỹ năng | Ví dụ tên theo họ | Cách phản | Tích chiêu (gốc) | Nếu không phản | Hồi chiêu | Khi phản thành công |
|---|---|---|---|---|---|---|
| Glyph Volley | Glyph Volley | gõ chữ trên đạn (như cũ) | như cũ | 42 mỗi viên (như cũ) | – | như cũ |
| Lance (tia tích lực) | Spectrum Lance, Hellfire Lance | gõ chữ **PARRY** trước khi tia bắn | 2,7 s | 64; gõ được một phần thì giảm tới 60 % | 7 s | tia dội ngược vào trùm: mất 4,5 % (Tyrant), 5,5 % (World), 7 % (Mini) máu tối đa, choáng 1,1 s |
| Quake (sóng theo làn) | Rainbow Quake, Void Rift | gõ chữ **DODGE**: tàu lướt sang làn an toàn | 2,4 s | 56 | 9 s | không trúng đòn |
| Rush (lao tới) | Prismatic Rush, Comet Rush | gõ chữ **BRACE** | 1,9 s | 52 | 10 s | không mất máu; trùm **hở sườn** 3,5 s (nhận ×1,5 sát thương), choáng 0,8 s |
| Siphon (xích hút máu, mới) | Ribbon Siphon, Soul Chain | gõ chữ **BREAK**, **gõ được cả khi xích đang hút** | 1,4 s, rồi hút 4 s | 8 mỗi 0,5 s (tối đa 64); mỗi nhịp trùm hồi 0,6 % máu | 12 s | xích đứt ngay; trùm mất 3 % máu, choáng 1,3 s |
| Cataclysm (tuyệt chiêu) | Prism Cataclysm, Starfall | gõ chữ trên từng thiên thạch **khi nó đang rơi** | 1,7 s, rồi rơi 3,4 s | 26 mỗi thiên thạch rơi xuống | 1 lần mỗi trận | bắn hạ hết thì hiện **FLAWLESS!**: trùm mất 4 %, choáng 1,6 s |

**Ghi chú:**
- **Thời gian tích chiêu** nhân theo nhịp của màn: hệ số = `attackIntervalFactor / bossPressure`, kẹp trong khoảng 0,65–1,2. Không bao giờ dưới 1,6 giây, để chữ phản luôn gõ kịp. Ví dụ ở màn 100, Lance còn khoảng 1,75 giây.
- **Chữ phản** là động từ tiếng Anh ngắn, dễ nhớ. Pha 1 tối đa 5 chữ cái, pha 2 tối đa 6, pha 3 tối đa 7. Danh sách:
  - parry: parry, guard, block, ward, shield, deflect, repel;
  - dodge: dash, dodge, evade, shift, slide, veer, drift;
  - brace: brace, hold, stand, anchor, steady, endure;
  - break: break, snap, sever, cut, unbind, free, release.
- **Làn an toàn của Quake** luôn là làn trái hoặc phải, không bao giờ là làn giữa (tàu đang ở giữa, nên né là phải di chuyển). Làn an toàn có chữ "SAFE" kèm mũi tên.
- **Phản HOÀN HẢO (PERFECT):** gõ xong khi còn ít nhất 40 % thời gian tích chiêu. Lance dội ngược mạnh ×1,5 và choáng 1,6 s; Rush hở sườn 5 s; Siphon choáng 1,8 s (khi bẻ xích trước lúc nó bám vào).
- **Thưởng mỗi lần phản:** Rage +6, cộng thêm 3 cho mỗi lần phản liên tiếp (tối đa +12), cộng 6 nếu hoàn hảo. Điểm 160 (hoàn hảo 260) × hệ số nhân. Một lần phản trượt thì chuỗi về 0.
- **Khiên và giáp:** khi trùm đang bật khiên hoặc đang có bộ phận giáp, đòn phản không gây sát thương nhưng vẫn làm trùm choáng (theo đúng luật của sát thương do gõ).
- **Trùm bị choáng** trong lúc tích chiêu thì giữ nguyên tiến độ tích chiêu, người chơi có thêm thời gian gõ. Đòn đã bắn ra thì vẫn trúng.

**Ai dùng kỹ năng nào:**

| Trùm | Pha 1 | Từ pha 2 | Tuyệt chiêu |
|---|---|---|---|
| Mini Boss | Volley, Lance | thêm Siphon | không có |
| World Boss | Volley, Lance, Quake | thêm Rush, Siphon | khi vào pha 2 |
| Galaxy Tyrant | Volley, Lance, Quake, Rush | thêm Siphon | khi vào pha 3 |

Tuyệt chiêu chỉ dùng **một lần mỗi trận**. Nếu một đòn lớn làm trùm nhảy qua pha thì tuyệt chiêu vẫn được dùng.

## 4. Thứ tự nhận phím (`typeBossSkillKey`, đầu `handleKey`)

1. **Chữ phản đòn** (khi đang mở) hoặc **chữ trên thiên thạch đang rơi** được ưu tiên trước mọi mục tiêu khác.
2. **Ngoại lệ:** nếu chữ phản chưa gõ chữ cái nào, mà phím đó đúng là chữ tiếp theo của một từ đang gõ dở (quái đang khóa, hoặc từ của trùm đã gõ được vài chữ), thì phím vẫn thuộc về từ đang gõ dở. Nhờ vậy người chơi không bị cướp phím rồi bị tính gõ sai.
3. Thiên thạch chỉ nhận phím khi đã bay ra và **đã thấy chữ**. Thiên thạch còn nằm ở trùm thì chưa nhận phím.
4. Phím phản và phím bắn thiên thạch được tính là **gõ đúng**: tăng chuỗi, tăng độ chính xác.
5. Các phím còn lại đi theo thứ tự cũ.

## 5. Phần vẽ (`src/boss/depth-view.ts`)

- **Lance:** đường ngắm nét đứt đỏ từ trùm tới tàu, tia lóe khi bắn. Nếu phản thì tia cyan dội ngược lên trùm.
- **Quake:** ba làn hình thang từ trùm xuống (2 làn đỏ, 1 làn xanh có viền), các vòng sóng xung kích lăn xuống theo phối cảnh.
- **Rush:** viền màn hình đỏ nhấp nháy, vệt tốc độ hút vào trùm; trùm to lên rồi lùi ra, vòng va chạm ở tàu.
- **Siphon:** mắt xích phát sáng từ trùm tới tàu, các đốm đỏ (máu bị hút) chạy ngược lên trùm. Khi đứt thì mắt xích văng ra.
- **Cataclysm:** dải đen điện ảnh và màn tối nhẹ (vẽ dưới lớp chiến đấu, nên chữ vẫn sáng); băng chữ "ULTIMATE · …" chạy vào; vòng mục tiêu đỏ; thiên thạch mang chữ bay ra từ khắp thân trùm.
- **Thẻ chữ phản:** nhãn "PARRY · TYPE" và các loại tương tự, chữ đã gõ đổi màu, thanh thời gian (đỏ khi còn dưới 30 %). Trên thẻ có tên kỹ năng và một dòng hướng dẫn.
- **Chữ bật lên ở tàu:** PARRY!, DODGE!, BRACED!, CHAIN BROKEN!, FLAWLESS! (thêm "PERFECT" khi phản hoàn hảo).

## 6. Âm thanh (`src/audio/Sfx.ts`, khối "Boss skills")

Theo hướng **hỏa lực phim chiến tranh**, không có tiếng chuông cao "tinh tinh". Dùng lại các mẫu âm của Duel và có tiếng tổng hợp dự phòng:

| Âm | Nội dung |
|---|---|
| `bossSkillCharge` | tiếng ầm trầm khi tích chiêu, tiếng khóa mục tiêu cho Lance |
| `bossSkillRelease` | heavy launch, bomb impact, thruster, EMP |
| `bossSkillHit` | va chạm năng lượng, động năng hoặc bom |
| `bossCounter` | tiếng khiên đỡ (parry), tiếng gió vụt (dodge), tiếng nện trầm (brace), tiếng vỡ khiên (break); thêm "precision" khi phản hoàn hảo |
| `bossCounterKey` | tiếng tách khô cho mỗi chữ cái phản |

Chưa đo độ to bằng phép đo ngoại tuyến như các âm khác. Nên đo lần tới nếu chủ dự án thấy âm nào lệch.

## 7. Kiểm tra

- **Logic:** `tests/boss-skills.test.ts` (13 bài): bộ kỹ năng theo pha, hồi chiêu, phản và trượt, gõ một phần, thời gian tối thiểu, chạy đúng một lần, xích hút, phản hoàn hảo, thiên thạch.
- **Trong game:** `tests/boss-depth-runtime.test.ts` (5 bài):
  - phản Lance thì trùm mất máu và choáng, tàu không mất máu;
  - không phản thì tàu mất máu;
  - phím đang gõ dở vẫn thuộc về từ của trùm;
  - đỡ Rush thì trùm hở sườn;
  - tuyệt chiêu được xếp lượt khi vào pha 3.
- **Cả bộ:** 1492/1493 bài đạt. Bài lỗi duy nhất là `combat-vfx-sprites`, lỗi có từ trước (ảnh VFX trong thư mục `public`), không liên quan.
- **Trong trình duyệt** (máy chủ dev cổng 3004):
  - ép kỹ năng: `__spaceTypingGame.testLabForceBossSkill("lance" | "quake" | "surge" | "tether" | "cataclysm")`;
  - chụp ảnh:

    ```bash
    node scripts/visual/shot.mjs "http://127.0.0.1:3004/#stage=100&skill=lance&at=1500" .visual/boss/lance.png \
      --wait=4000 --width=1600 --height=900 --dpr=1 --eval-file=scripts/visual/evals/boss-skill.js
    # thêm &type=counter&typeAt=900 để tự gõ chữ phản; &quality=low để xem ảnh phẳng
    ```

  - đo hiệu năng: `scripts/visual/evals/boss-perf-ab.js` (luân phiên 3D và ảnh phẳng trong cùng một trang);
  - quay video từng khung hình cố định: `.visual/boss/record-game.mjs` (chỉ có trên máy này, thư mục `.visual` không đưa lên Git).
- **Ảnh và video demo** (trên máy này):
  - `.visual/boss/game-boss-ultra.mp4`: 26 giây gồm xuất hiện, phản Lance, né Quake, bẻ xích Siphon, đỡ trượt Rush, tuyệt chiêu;
  - bảng khung hình `.visual/boss/video-sheet-a.jpg` và `video-sheet-b.jpg`;
  - mức Low và điện thoại: `.visual/boss/sheet-2.jpg`, `game-mobile-lance.png`.

## 8. Hiệu năng (đo 04/10/2026)

Đo bằng Chrome chạy ẩn, GPU AMD Radeon Pro 560X, khung 1600×900 ở mật độ 2 (vùng vẽ thật 3200×1800). Trong trận trùm, luân phiên 3D và ảnh phẳng mỗi 1,5 giây trong cùng một trang.

| Phép đo | Ảnh phẳng (như cách vẽ cũ) | Khối 3D | Chênh |
|---|---|---|---|
| Thời gian CPU để vẽ một khung, Ultra (trung vị) | 0,8–1,0 ms | 1,0–1,2 ms | +0,2 ms |
| Cả khung hình, Ultra (trung vị) | 23,9 ms | 27,3 ms | +3,4 ms |
| Cả khung hình, Medium (trung vị) | 22,5 ms | 24,6 ms | +2,1 ms |
| Low | không dùng 3D | – | 0 |

- Phần CPU gần như không đổi. Phần tăng thêm nằm ở GPU, do mỗi khung phải dựng một lượt WebGL.
- Riêng việc chép ảnh 3D sang khung vẽ thì gần như không tốn (đã đo riêng: 23,0 so với 22,8 ms).
- Cách đo này **rất nhiễu**: cùng một chế độ, giữa các lượt đo chênh 3–5 ms; có lượt cả hai chế độ đều bị đứng hơn 9 giây.
- Cách dựng giống tàu 3D của PvP (cùng tùy chọn WebGL).
- Đã thử các cách giảm:
  - vật liệu Lambert: rẻ hơn khoảng 1 ms, nhưng mất độ bóng kim loại;
  - dựng lại cách một khung hình: không thấy cải thiện rõ trong phép đo nhiễu.
- **Nếu chủ dự án thấy giật ở màn trùm**, các bước theo thứ tự:
  1. dựng 3D ở 30 lần/giây và giữ khung cũ ở khung xen kẽ;
  2. tắt khử răng cưa (MSAA) khi mật độ điểm ảnh ≥ 1,5;
  3. đổi sang vật liệu Lambert.

## 9. Chưa làm, gợi ý tiếp

- **Tàu của người chơi dùng mô hình 3D của PvP trong màn trùm** (có trong kế hoạch, chưa làm):
  - lý do hoãn: cần thêm một ngữ cảnh WebGL nữa, nên tốn thêm GPU, trong khi ảnh tàu chiến dịch vốn đã vẽ từ phía sau và hợp với góc nhìn Depth View;
  - nếu chủ dự án muốn, dùng `DuelShip3D.load(characterId, "self")` và `src/duel/afterburner.ts` như PvP.
- **Cân bằng** (thời gian tích chiêu, sát thương, hồi chiêu, lượng Rage) cần chủ dự án chơi thử qua portal để chỉnh.
- **Đo độ to** của các âm kỹ năng mới bằng phép đo ngoại tuyến.
- **Màn ngang trên desktop:** không làm, theo khuyến nghị đã được chấp nhận ở đề xuất §7.2.
- **Biểu tượng cổ vật có nền trong suốt** cho thẻ phần thưởng: `docs/art-requests/RELIC_ICONS_2026-10-04.md`.

## 10. Các file chính

- `src/boss/skills.ts`: logic kỹ năng.
- `src/boss/depth-view.ts`: vẽ kỹ năng, thẻ chữ phản, tuyệt chiêu, chữ bật lên.
- `src/boss/boss-relief.ts`: khối 3D.
- `src/Game.ts`, các khối:
  - "Boss Depth View: skills and counters";
  - `drawBossDepth`, `drawBossWreck`, `drawBossSkillLayer`;
  - `bossPosition`, `updateBossPresentation`;
  - `bossShotDepthScale`, `testLabForceBossSkill`.
- `src/enemies/painted-sprites.ts` (`paintedBossArtUrl`), `src/audio/Sfx.ts`.
- Kiểm thử: `tests/boss-skills.test.ts`, `tests/boss-depth-runtime.test.ts`.
- Công cụ: `scripts/visual/evals/boss-skill.js`, `scripts/visual/evals/boss-perf-ab.js`.
