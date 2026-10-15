# Đề xuất: thẻ bài cho màn chọn thưởng và làm lại trùm (2026-10-04)

Người viết: Claude. Trạng thái: **vòng 2 có demo mới (mục 7), chờ chủ dự án chọn.** Chưa sửa gì trong game.

## 1. Yêu cầu

Chủ dự án (2026-10-03):
- Màn chọn thưởng đang là các ô vuông thô. Muốn đổi sang **thẻ bài**, có kèm ảnh tham khảo kiểu lá tarot. Thiết kế phải hợp với chủ đề game.
- **Trùm chán:** đứng im, vài chữ cái bay ra là hết. Trùm phải có hành động riêng khi gây sát thương và khi tung chiêu, đẹp và hoành tráng hơn.
  - Nếu được thì trùm cử động dạng 3D.
  - Chiêu đánh một mục tiêu và chiêu diện rộng phải đẹp hơn.
  - Trùm nên được hiển thị giống cách làm ở PvP.
- Phân tích và gửi demo **3 phương án**.

## 2. Hiện trạng (đã kiểm tra mã)

### Trùm
- 26 trùm: 10 Galaxy Tyrant, 8 World Boss (Warden), 8 Mini Boss (Lieutenant). Ảnh vẽ rất đẹp: chính diện, đối xứng, 1024 px, nền trong suốt (`src/assets/bosses/<id>@2x.webp`).
- **Hoàn toàn đứng yên.** Vị trí cố định ở giữa trên (`bossPosition`), kích thước cố định. Chỉ nhích lên 8 px khi trúng đạn, và có vòng hào quang quay.
- **Đạn chữ sinh ra từ bên trong ảnh trùm** (y = trùm + 18) và **được vẽ trước trùm**. Vì vậy chữ trông như rơi ra từ sau lưng trùm. Không có hiệu ứng nòng hay lúc gồng chiêu, chỉ có một vòng đỏ nét đứt trong 1,1 s.
- **Không có hệ thống chiêu.** Chỉ có 6 kiểu bắn (thẳng, quạt, đôi, vòng, mưa, dòng), tất cả nhắm thẳng vào tàu. Không có chiêu diện rộng, không có tia, không có gồng chiêu.
- Tia lửa khi trúng đòn, ánh sáng khi đổi giai đoạn và cột sáng khi trùm xuất hiện đều bị vẽ **dưới** ảnh trùm (ảnh đục), nên gần như không thấy.
- **Khi trùm chết, ảnh biến mất ngay**, chuỗi nổ diễn ra trên khoảng trống.
- Đổi giai đoạn chỉ làm hào quang mạnh hơn.
- Bảng tên trùm nằm ở 54 % chiều cao màn hình, đè lên chân trùm.

Ảnh chụp hiện tại: `.visual/boss/now-sheet.jpg`.

### Màn chọn thưởng
- `#rewardChoiceDialog`, nội dung do `renderBossRewardChoiceOptions` (main.ts) điền.
- **Ô trang bị gần như trống** vì 2 lỗi:
  1. Mã gọi `createLocalIcon`, chỉ hiện ký tự (ví dụ "⌁"), không dùng ảnh vẽ. Cả 42 trang bị đều có ảnh vẽ trong `src/assets/icons/equipment/`.
  2. Quy tắc `.reward-choice-option span` thắng `.local-item-icon`, làm ký tự nhỏ lại còn khoảng 9 px.
- **Ảnh trang bị** chỉ có bản 256 px với nền tối đặc. **Ảnh di vật** (`src/assets/expansion-v2/relics/`) dính sẵn **nền ô caro trắng**, tức là nền giả trong suốt, nên cần vẽ lại.
- **Lỗi đang mở R09:** bấm Esc khi màn chọn thưởng đang mở thì trận đấu chạy tiếp phía sau.

## 3. Thẻ bài: 3 phương án

Demo (trang `.visual/ui-mock/cards.html?design=1|2|3`): **`.visual/ui/demo-cards-123.jpg`**.

| | Mô tả |
|---|---|
| **1 · Holo Tarot** | Khung kính góc vát, đúng phong cách giao diện A vừa làm. Ô tròn kiểu cửa sổ tàu chứa ảnh vật phẩm; viên đá quý góc phải theo độ hiếm; dòng chỉ số ở chân thẻ. |
| **2 · Prism Shard** | Thẻ hình tinh thể nhiều mặt có vệt sáng chéo. Ảnh vật phẩm nằm trong viên kim cương. |
| **3 · Starfarer Arcana** | Viền vàng, 4 viên đá ở cạnh, hoa văn sao 8 cánh và trăng lưỡi liềm. Gần ảnh mẫu tarot nhất, nhưng dùng màu không gian. |

Cả 3 phương án đều có:
- **Chia bài úp:** mặt sau in biểu tượng Space Type (sao la bàn và trăng). Thẻ lật lần lượt từng lá.
- Rê chuột thì thẻ nhô lên và phát sáng.
- Bấm phím 1, 2, 3 để chọn.
- Màu theo độ hiếm: Aluminum, Copper, Silver, Gold, Diamond.

**Khuyến nghị: 1**, vì liền mạch với giao diện A. Chọn 3 nếu muốn giống ảnh mẫu hơn.

## 4. Trùm: 3 phương án

Video 9,6 giây mỗi phương án, dùng cùng trùm Auriel và cùng kịch bản: đứng chờ → bị bắn 4 phát → gồng và tung chiêu đơn → tung chiêu diện rộng.
- `.visual/boss/boss-a.mp4`, `boss-b.mp4`, `boss-c.mp4`
- Bảng khung hình: **`.visual/boss/demo-boss-ABC.jpg`**
- Trang thử: `.visual/boss-lab/index.html?opt=a|b|c`; ghi lại bằng `node .visual/boss-lab/record.mjs <a|b|c>` (cần `pnpm dev` ở cổng 3004).

### A · Depth Titan (3D nổi khối, sân đấu phối cảnh như PvP)
- **Hình trùm:** ảnh trùm được dựng nổi khối 3D bằng three.js, giống cách làm tàu ở PvP. Độ cao lấy từ hình dáng ảnh; có ánh sáng chính, viền sáng hồng và xanh, đèn chớp theo đòn.
- **Chuyển động:**
  - Trùm lắc người, thở, xoay nhẹ.
  - Khi trúng đòn thì giật ngửa ra sau và sáng lên.
  - Khi gồng chiêu thì ngả người ra sau và bay lên; khi tung chiêu diện rộng thì đập người về phía trước.
- **Không gian:** sàn lưới phối cảnh hội tụ về phía trùm. Trùm ở xa, tàu ở gần, như Depth View của PvP.
- **Chiêu đơn "Glyph Volley":**
  - đường ngắm đỏ chạy tới tàu;
  - 5 quả cầu chữ bay ra hai bên rồi lao vào tàu, to dần khi tới gần (phối cảnh thật);
  - tàu bật khiên khi trúng.
- **Chiêu diện rộng "Prism Quake":**
  - vòng cảnh báo đỏ hiện trên sàn;
  - trùm đập xuống, sóng xung kích lan trên sàn về phía người chơi;
  - 7 cột sáng phụt lên tại các vòng cảnh báo.
- **Ưu:** đúng mong muốn "3D" và "giống PvP", dùng lại hệ thống đạn phối cảnh của PvP.
- **Nhược:**
  - Tốn thêm một ngữ cảnh WebGL. Máy của chủ dự án dùng Intel UHD 630 / Radeon 560X, nên Low và Medium cần chuyển về B.
  - Ảnh vẽ chính diện dựng nổi khối chỉ xoay đẹp trong khoảng nhỏ, khoảng ±15°.

### B · Living Puppet (ảnh trùm cử động 2.5D)
- **Hình trùm:** ảnh được chia thành 48 dải dọc, mỗi dải chuyển động riêng.
  - Cánh và tay ở xa tâm đập lên xuống.
  - Thân thở.
  - Khi trúng đòn: giật lùi, bẹp nhẹ, chớp trắng, rung màn hình.
- **Khi gồng:** trùm bay lên, cánh dang rộng, hào quang và các vòng sáng lớn dần, mắt và lõi phát sáng.
- **Chiêu đơn "Core Lance":** lõi tụ sáng có các hạt hút vào, đường ngắm đỏ, rồi một tia lớn bắn vào khiên tàu.
- **Chiêu diện rộng "Nova Bloom":** sóng tròn lan ra toàn màn hình, 10 quả cầu chữ bung thành vòng tròn rồi lần lượt lao về tàu.
- **Ưu:** rẻ (vẽ 2D), chạy tốt ở mọi mức đồ họa, không cần ảnh mới, cảm giác "trùm sống".
- **Nhược:** không phải 3D thật.

### C · Cinematic Arena (vũ đạo và tuyệt chiêu kiểu phim)
- **Hình trùm:** ảnh 2D nhưng **di chuyển khắp sân**: lượn qua lại, dịch chuyển tức thời kèm chớp sáng, lao chéo về phía người chơi để lại bóng mờ.
  - Khi trúng đòn: hình dừng lại một nhịp ngắn (hit-stop), rung màn hình, chớp trắng.
- **Chiêu đơn "Phantom Dash":** trùm biến mất rồi hiện ở góc trái, lao chéo, chém ra một nhát sóng lưỡi liềm vào tàu, rồi quay về.
- **Chiêu diện rộng (tuyệt chiêu) "Prism Cataclysm":**
  - 2 dải đen điện ảnh trượt vào, màn hình tối lại, camera phóng to, chữ "ULTIMATE" chạy ngang;
  - 8 vòng mục tiêu đỏ nhấp nháy trên sân, rồi thiên thạch lửa rơi lần lượt vào từng vòng kèm vụ nổ.
- **Ưu:** hoành tráng và dễ đọc. Mỗi trùm có thể có một bộ tuyệt chiêu riêng.
- **Nhược:** bản thân trùm vẫn là ảnh phẳng; di chuyển nhiều có thể làm khó gõ chữ trên trùm.

### Khuyến nghị
**Chọn A làm nền và lấy tuyệt chiêu kiểu C cho trùm lớn.**
- A đúng ý "3D" và "như PvP".
- Ở Low và Medium (hoặc máy yếu), tự chuyển sang B, vì B không cần WebGL.
- Tuyệt chiêu kiểu C (dải đen, vòng mục tiêu, thiên thạch) dùng cho World Boss và Galaxy Tyrant ở giai đoạn cuối.

Nếu muốn nhẹ và an toàn nhất: chọn **B + C**.

## 5. Phần làm chung, dù chọn phương án nào

- **Hệ thống chiêu cho trùm:** đơn và diện rộng, mỗi chiêu có thời gian gồng, cảnh báo và tác động.
  - Chiêu diện rộng tạo vùng nguy hiểm. Người chơi gõ chữ trên các quả cầu hoặc gõ từ chặn để phá chiêu (giống Siege Lance ở PvP).
  - Mỗi họ trùm (angel, devil, frost, nature, shadow, cosmic, prism, rainbow) có màu và chiêu riêng.
- **Đạn chữ** thành quả cầu rune phát sáng, có vệt sáng, **vẽ trên trùm** và bay ra từ "miệng" hoặc lõi của trùm.
- **Hiệu ứng trúng đòn trên trùm** vẽ phía trên ảnh: tia lửa, chớp, chữ sát thương. Tách khỏi vòng hào quang.
- **Trùm chết:** ảnh ở lại, nứt, chớp, nổ dây chuyền rồi tan, dùng lại chuỗi K.O. của PvP.
- **Trùm xuất hiện:** bay vào sân từ trên xuống, thay cho việc hiện ra tại chỗ.
- **Bảng tên** chuyển lên thanh trên. Thanh máu có vạch chia giai đoạn.
- **Âm thanh:** gồng chiêu, tung chiêu, chiêu diện rộng, trùm chết. Theo hướng "hỏa lực chiến tranh", không dùng tiếng "tinh tinh".
- **Hiệu năng:** đo và giữ trong ngưỡng Batch F (p95 tăng không quá 1 ms).
- **Màn thưởng:**
  - dùng ảnh vẽ thật cho trang bị;
  - sửa quy tắc CSS làm nhỏ biểu tượng;
  - sửa lỗi R09 (Esc chạy tiếp trận);
  - thêm phím 1, 2, 3;
  - dùng chung thẻ cho Expedition draft.

## 6. Cần ảnh (sẽ viết tệp yêu cầu ảnh sau khi chọn)

- **Ảnh di vật vẽ lại có nền trong suốt thật.** Ảnh hiện tại dính ô caro trắng.
- **Không bắt buộc:** ảnh trang bị bản 512 px nền trong suốt cho thẻ nét hơn. Hiện demo dùng cách hòa nền.
- Phương án A và B **không cần ảnh trùm mới**.
- Nếu sau này muốn A xoay được góc lớn hơn, có thể nhờ AI vẽ thêm bản nhìn 3/4 cho từng trùm.

## 7. Vòng 2 (2026-10-04): theo góp ý của chủ dự án

**Góp ý:**
- Không thích cả 3 mẫu thẻ. Muốn làm **giống thẻ lõi nâng cấp của LoL ARAM Hỗn Loạn**, cấp bậc chia theo màu thẻ.
- Trùm phải hiển thị **3D như PvP: ở xa, ta tấn công nó**, không che hết màn hình như demo A.
- Hỏi: có nên làm **màn ngang cho desktop** để trùm có nhiều không gian thi triển hơn (mobile và tablet giữ như cũ) không?

### 7.1 Thẻ kiểu ARAM: `.visual/ui/cards-aram.png`
Trang demo: `.visual/ui-mock/cards-aram.html`.

- **Khung dày phát sáng** đổi màu theo cấp:
  - **Bạc** (thường): aluminum, copper, silver;
  - **Vàng** (hiếm): gold;
  - **Lăng kính** (huyền thoại): diamond và di vật mạnh.
- **Bên trong:** nền tối với viền đôi vát góc.
- **Nội dung:**
  - biểu tượng lớn ở trên;
  - tên thẻ bằng phông có chân **Spectral** (có tiếng Việt, gần phông tiêu đề của LoL);
  - nhãn loại thẻ và cấp;
  - mô tả có **từ khóa tô màu**: số liệu vàng, hồi máu xanh lá, hiệu ứng tím hoặc xanh.
- Dưới mỗi thẻ có ô phím **1 / 2 / 3** (ARAM dùng ô này cho nút đổi thẻ). Thẻ đang chọn nhô lên và sáng hơn; các thẻ còn lại tối đi.
- **Có thể thêm sau:** nút đổi thẻ (reroll) giống ARAM, giới hạn số lần mỗi trận.

### 7.2 Trùm: Depth View (như PvP) hay màn ngang?
Video 11,4 giây mỗi phương án, kịch bản: đứng chờ → bị bắn → chiêu đơn → chiêu diện rộng phải né → tuyệt chiêu. Bảng khung hình: **`.visual/boss/demo-boss-layout.jpg`**.

- **1 · Depth View như PvP** (`.visual/boss/boss-depth.mp4`):
  - **Tàu của mình là đúng tàu 3D của PvP**, có lửa động cơ.
  - **Trùm 3D ở xa cuối hành lang**, cao khoảng 300 px (chưa tới 40 % chiều cao màn hình), có vòng khiên giống đối thủ PvP. Vệt sao bay về phía người chơi.
  - Trùm lượn ngang ở xa.
  - Đạn của mình nhỏ dần khi bay xa; quả cầu chữ của trùm to dần khi lao tới.
  - **Chiêu diện rộng:** 3 làn sáng lên, 2 làn đỏ và 1 làn xanh an toàn. Sóng xung kích lao xuống 2 làn đỏ, tàu né sang làn xanh.
  - **Tuyệt chiêu:** trùm áp sát lại gần (to lên) rồi lùi ra; dải đen điện ảnh, chữ ULTIMATE, thiên thạch rơi vào các vòng mục tiêu quanh tàu.
- **2 · Màn ngang cho desktop** (`.visual/boss/boss-side.mp4`):
  - Tàu bên trái (xoay ngang), trùm bên phải to hơn, lượn lên xuống. Sao bay ngang.
  - **Chiêu diện rộng:** 3 hàng tia ngang, né lên hàng trên.
  - **Tuyệt chiêu:** tia khổng lồ quét kèm một khe hở phải bay theo.

**Khuyến nghị: giữ Depth View (1) cho mọi thiết bị.** Lý do:
- Trùm ở xa nên **không che màn hình**, mà vẫn có không gian thi triển: chiều sâu của hành lang, các làn né, việc trùm áp sát rồi lùi ra.
- **Giống hệt PvP:** dùng chung tàu 3D, vệt sao, đạn phối cảnh. Không phải làm và bảo trì hai bố cục.
- Ở PvP, chủ dự án từng thấy **bố cục ngang xấu** và đã chọn Depth View.
- Ảnh tàu vẽ từ trên xuống, ảnh trùm vẽ chính diện. Khi xoay ngang thì tàu nhìn như bay nghiêng, không tự nhiên.
- Mobile và tablet dùng chung một bố cục, nên chỉ cần một bộ chiêu và một bộ cân bằng.

Nếu chủ dự án vẫn muốn màn ngang trên desktop, có thể làm như một lựa chọn trong Settings. Khi đó mỗi chiêu cần thiết kế cho cả hai hướng.

## 8. Trạng thái (04/10/2026): đã làm

Chủ dự án duyệt thẻ kiểu ARAM và trùm theo phương án A (Depth View như PvP).

- **Thẻ phần thưởng kiểu ARAM** đã có trong game:
  - `src/ui/reward-card.ts` và `src/ui/reward-cards.css`;
  - màu khung theo cấp Bạc, Vàng, Lăng kính;
  - chia bài úp rồi lật từng lá, phím 1–3 để chọn;
  - dùng cho phần thưởng thường và phần thưởng sau trùm.
- **Trùm Depth View:**
  - khối 3D ở xa, rõ nét;
  - 6 kỹ năng, gồm Siphon mới và tuyệt chiêu;
  - gõ chữ để phản đòn, né, đỡ, bẻ xích; phản hoàn hảo; chuỗi phản.
  - Bàn giao chi tiết: `docs/BOSS_DEPTH_VIEW_HANDOFF_2026-10-04.md`.
- **Biểu tượng cổ vật có nền trong suốt** cho thẻ: đã viết yêu cầu vẽ tại `docs/art-requests/RELIC_ICONS_2026-10-04.md`.
