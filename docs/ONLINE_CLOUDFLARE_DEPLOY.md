# Đưa Space Typing online lên Cloudflare (gói Free)

> **Dành cho:** chủ dự án khi đưa game lên mạng. Viết ngày 16/10/2026; cập nhật cấu hình, OAuth và kiểm tra giới hạn ngày 20/10/2026.
>
> Kiến trúc tài khoản, lưu đám mây, Daily Hub, chat, bạn bè, nhóm được thiết kế cho **gói Free**. Con số **600–850 người chơi mỗi ngày** là ước tính theo cách chơi bên dưới, chưa phải kết quả đo tải production. Cần theo dõi CPU, dòng đọc/ghi và dung lượng thật sau khi đưa lên.
>
> **Trạng thái repo:** `cloud/wrangler.jsonc` vẫn có `database_id` toàn số 0 và `PUBLIC_URL` local. D1 đang dùng khi phát triển là SQLite local của Wrangler/workerd; chưa có bằng chứng repo đã kết nối D1 production. Thiết lập Google/Facebook và thiết kế dữ liệu: [SOCIAL_LOGIN_AND_DATABASE_2026-10-20.md](./SOCIAL_LOGIN_AND_DATABASE_2026-10-20.md).

## 1. Cái gì chạy ở đâu

| Phần | Chạy trên | Trạng thái |
|---|---|---|
| Game (HTML, JS, ảnh, mô hình 3D, nhạc) | Cloudflare **Workers Static Assets** hoặc **Pages** (file tĩnh) | Cần build, chép thêm 2 thư mục từ vựng và kiểm tra giới hạn file (mục 4). |
| API tài khoản `/api/account/*`, chat WebSocket | Cloudflare **Worker** `space-typing-api` (`cloud/`) | Bộ kiểm tra đầu cuối hiện đạt 112/112 trên workerd (môi trường chạy của Cloudflare), chạy thẳng vào Worker. |
| Cơ sở dữ liệu | Cloudflare **D1** (SQLite) | Các migration trong `cloud/migrations/` hiện từ `0001` tới `0009_social_auth.sql`. Phải tạo D1 thật và áp dụng toàn bộ migration trước khi deploy. |
| Google / Facebook | OAuth code flow trong Worker; `auth_identities` + `oauth_attempts` trên D1 | Code dùng cấu hình OAuth riêng từng nhà cung cấp; cần client/app ID, secret và callback được đăng ký. Không có credentials thì nhà cung cấp chưa được bật. |
| Ví tiền và Warp trên máy chủ | Worker + D1 (`cloud/src/wallet.ts`) | Sẵn sàng, giai đoạn 3 (`WALLET_PHASE`). Thiết kế và con số: `docs/ONLINE_SERVER_WALLET_DESIGN_2026-10-16.md` mục 12–13. |
| Dọn dẹp hằng ngày | **Cron Trigger** của Worker (03:23 giờ VN) | Sẵn sàng. Xóa phiên hết hạn, link email hết hạn, bộ đếm chống spam đã hết giờ (`cloud/src/maintenance.ts`). |
| Phòng chat | **Durable Objects** dạng SQLite | Sẵn sàng (gói Free chỉ hỗ trợ dạng SQLite; code đã dùng đúng dạng này). |
| Trang Admin (Codex làm) | Máy riêng của chủ dự án (Node, `admin/server.mjs`) | Giữ ở máy riêng. Admin gọi Worker qua `/internal/admin` bằng `ADMIN_TOKEN`. |
| Duel 1v1 online (`/duel`, cổng 3014) | Đang là máy chủ Node | **Chưa** chuyển. Cần viết lại bằng Durable Objects (việc sau). Trước khi chuyển, Duel online chỉ chạy ở máy local; Practice với bot vẫn chạy. |
| Chính sách runtime của Admin (`/api/runtime/space-typing`, cổng 3199) | Máy chủ Node | **Chưa** chuyển. Cách đơn giản nhất: khi Admin bấm Publish, xuất ra file JSON tĩnh và đưa lên cùng game. |

## 2. Chuẩn bị (làm một lần)

1. Tạo tài khoản Cloudflare (miễn phí). Có tên miền riêng thì thêm vào Cloudflare. Chưa có thì dùng địa chỉ `*.workers.dev`.
2. Trong `games/space-typing`, chạy `pnpm wrangler login`.

**Chưa có tên miền riêng:** dùng một Worker cho cả game và API tại `https://space-typing-api.<ten-ban>.workers.dev`. Cách này giữ cookie và OAuth cùng origin, không cần mua domain hoặc cấu hình zone route. Chọn subdomain tài khoản ở **Workers & Pages → Your subdomain**; tên Worker hiện là `space-typing-api`. Làm mục 3 để tạo D1/secrets, rồi build/đóng gói và cấu hình Static Assets theo mục **4.1 trước khi deploy**. Không đưa game lên Pages riêng rồi gọi API ở `workers.dev` khác origin.

## 3. Đưa API lên

Mọi lệnh chạy trong `games/space-typing`.

```bash
# 1) Tạo cơ sở dữ liệu D1, rồi chép "database_id" in ra vào cloud/wrangler.jsonc
pnpm wrangler d1 create space-typing

# 2) Tạo bảng (chạy mọi bản cập nhật 0001, 0002, 0003… chưa chạy; chạy lại lệnh này mỗi khi có bản mới)
pnpm wrangler d1 migrations apply space-typing --remote -c cloud/wrangler.jsonc

# 3) Bí mật (mỗi lệnh hỏi giá trị). Tạo chuỗi ngẫu nhiên: openssl rand -base64 32
pnpm wrangler secret put PASSWORD_PEPPER -c cloud/wrangler.jsonc
pnpm wrangler secret put ADMIN_TOKEN -c cloud/wrangler.jsonc
# Tùy chọn: bật Google / Facebook; phải đăng ký callback theo tài liệu OAuth trước.
pnpm wrangler secret put OAUTH_GOOGLE_CLIENT_ID -c cloud/wrangler.jsonc
pnpm wrangler secret put OAUTH_GOOGLE_CLIENT_SECRET -c cloud/wrangler.jsonc
pnpm wrangler secret put OAUTH_FACEBOOK_APP_ID -c cloud/wrangler.jsonc
pnpm wrangler secret put OAUTH_FACEBOOK_APP_SECRET -c cloud/wrangler.jsonc
# Facebook còn cần vars.OAUTH_FACEBOOK_API_VERSION (phiên bản đang hỗ trợ trong Meta App Dashboard).
# Tùy chọn, để gửi email thật (đặt lại mật khẩu, xác minh email) qua Resend (gói free):
pnpm wrangler secret put RESEND_API_KEY -c cloud/wrangler.jsonc
pnpm wrangler secret put MAIL_FROM -c cloud/wrangler.jsonc   # ví dụ "Space Typing <noreply@ten-mien-cua-ban>"

# 4) Đưa lên sau khi sửa cấu hình và, nếu dùng workers.dev, hoàn tất mục 4.1
pnpm wrangler deploy -c cloud/wrangler.jsonc
```

**Cảnh báo về `PASSWORD_PEPPER`:** đặt một lần và **không bao giờ đổi**. Đổi giá trị này thì mọi người chơi không đăng nhập được nữa. Hãy lưu nó ở nơi an toàn, ví dụ trình quản lý mật khẩu.

**Thứ tự khi cập nhật bản mới:** chạy bước 2 (cập nhật bảng) **trước** bước 4 (đưa code lên). Code mới đọc các cột mới. Nếu đưa code lên trước, lưu đám mây báo lỗi ("Cloud save unavailable") cho tới khi bảng được cập nhật.

**Sửa `cloud/wrangler.jsonc` trước khi deploy:**
- `vars.PUBLIC_URL`: origin thật của game, ví dụ `https://space-typing-api.<ten-ban>.workers.dev` hoặc `https://play.ten-mien.com` (không thêm path). Dùng cho đường link trong email và callback OAuth. Đăng ký `<PUBLIC_URL>/api/account/oauth/google/callback` và `<PUBLIC_URL>/api/account/oauth/facebook/callback` tại từng nhà cung cấp. Google không chấp nhận `.local`; xem tài liệu OAuth để thử bằng localhost.
- `vars.SAVE_BACKUPS`: số bản sao lưu theo giờ giữ cho mỗi người chơi (1–24, mặc định 6). Xem cách tính dung lượng ở mục 6.
- `triggers.crons`: lịch dọn dẹp hằng ngày, đã đặt sẵn `"23 20 * * *"` (20:23 UTC = 03:23 giờ VN). Không cần sửa.
- `vars.WALLET_PHASE`: công tắc ví máy chủ. Đang đặt `"3"`. Có lỗi thì hạ xuống rồi deploy lại:
  - `0`: tắt, game dùng tiền ở bản lưu như cũ;
  - `1`: máy chủ chỉ ghi lại song song, không từ chối gì;
  - `2`: mua hàng, Warp, quà Daily Hub đi qua máy chủ;
  - `3`: thêm kiểm tra xuất kích và trần thu nhập ngày.

  Khi `wrangler dev` đang chạy, đổi biến này phải khởi động lại: `pnpm account:local:restart`.
- **Chỉ khi game ở tên miền riêng và API Worker riêng:** thêm `routes` để game và API cùng origin. Với cách gộp game + API ở mục 4.1, không thêm đoạn này:

```jsonc
"routes": [{ "pattern": "play.ten-mien.com/api/account/*", "zone_name": "ten-mien.com" }]
```

API **phải** cùng origin với game. Lý do:
- cookie phiên đăng nhập đặt `SameSite=Lax`;
- chống giả mạo yêu cầu (CSRF) dựa vào header `x-space-typing`.

Nếu khác origin, đăng nhập sẽ không hoạt động. Chat WebSocket đi cùng đường dẫn này nên không cần cấu hình thêm. Worker chỉ nhận kết nối chat từ trang có cùng tên miền (kiểm tra header `Origin`).

### 3.1 Chặn spam yêu cầu bằng WAF (miễn phí, nên làm)

Mục này chỉ áp dụng khi có tên miền/zone do chủ dự án quản lý trên Cloudflare. Với địa chỉ miễn phí `workers.dev`, bạn không có zone của `workers.dev` để thêm luật WAF bên dưới; API vẫn dùng các giới hạn ở tầng ứng dụng, nhưng chúng không ngăn mọi lượt gọi dùng hạn Worker.

Gói Free cho 100.000 yêu cầu chạy Worker mỗi ngày cho cả tài khoản Cloudflare. Các lượt chỉ trả file từ Workers Static Assets không chạy Worker là miễn phí và không giới hạn; tránh `run_worker_first` cho toàn bộ tài nguyên. Một máy gửi API liên tục khoảng 1,2 yêu cầu/giây có thể dùng hết hạn trong một ngày. Cloudflare gói Free có **1 luật giới hạn tốc độ** (rate limiting rule) miễn phí. Giới hạn của gói Free: chỉ đếm theo địa chỉ IP, chu kỳ đếm 10 giây, chặn trong 10 giây. Đặt như sau:

1. Bảng điều khiển Cloudflare → chọn tên miền → **Security → WAF → Rate limiting rules → Create rule**.
2. Tên: `space-typing-api`.
3. Điều kiện (If incoming requests match): **URI Path** – **starts with** – `/api/account/`.
4. Đếm theo: **IP** (mặc định).
5. Ngưỡng: **40 yêu cầu trong 10 giây**.
   - Người chơi thật dùng khoảng 1 yêu cầu/phút, mở Daily Hub thì vài yêu cầu liền nhau. 40 là dư.
   - Lớp học dùng chung một IP: 30 em mở game cùng lúc vẫn dưới ngưỡng.
6. Hành động: **Block**, thời gian chặn **10 giây**.
7. Lưu.

Yêu cầu bị luật này chặn không chạy Worker, nên không tốn vào hạn 100.000 yêu cầu/ngày.

## 4. Đưa game lên

```bash
# Ở thư mục gốc typing-game
pnpm build:space
# Gom thư mục cần đưa lên: bản build + 2 thư mục từ vựng mà nginx đang phục vụ
rm -rf .deploy/space && mkdir -p .deploy/space
cp -R games/space-typing/dist/. .deploy/space/
mkdir -p .deploy/space/shared
cp -R shared/vocabulary .deploy/space/vocabulary
cp -R shared/typing-texts .deploy/space/shared/typing-texts
```

### 4.1 Chưa có domain: gộp game + API trên cùng `workers.dev`

Sau khi `.deploy/space` đã có bản build và hai thư mục dùng chung, thêm các trường sau vào **cùng** `games/space-typing/cloud/wrangler.jsonc` đang khai báo `main`, D1, Durable Objects, vars và cron. Không thay toàn bộ file bằng đoạn rút gọn này:

```jsonc
"workers_dev": true,
"assets": {
  // Tương đối với cloud/wrangler.jsonc: trỏ về .deploy/space ở gốc typing-game.
  "directory": "../../../.deploy/space",
  "not_found_handling": "single-page-application",
  "run_worker_first": ["/api/*", "/internal/admin/*", "/healthz"]
}
```

Giữ `name: "space-typing-api"`, ID D1 thật và các bindings cũ. Đặt `vars.PUBLIC_URL = "https://space-typing-api.<ten-ban>.workers.dev"`. Bỏ qua `routes` và Pages ở mục 4.2. Không cần thêm `ASSETS` binding hoặc đổi code Worker: Cloudflare tự trả file tĩnh; các path đã chọn đi vào API hiện có. Danh sách `run_worker_first` giữ callback OAuth là yêu cầu API ngay cả khi nhà cung cấp điều hướng trình duyệt trở lại; không đặt `true` cho mọi URL vì sẽ tính lượt chạy Worker cả khi tải tài nguyên.

Từ `games/space-typing`, kiểm tra package ở mục dưới rồi chạy:

```bash
pnpm wrangler deploy --dry-run -c cloud/wrangler.jsonc
pnpm wrangler deploy -c cloud/wrangler.jsonc
```

Game là `/`; health là `/healthz` hoặc `/api/account/healthz`; API là `/api/account/*`; Admin vẫn là `/internal/admin/*` có token, tất cả trên **cùng** `https://space-typing-api.<ten-ban>.workers.dev`. Đăng ký hai callback ở origin đó trên Google/Meta và thử bằng người dùng trong danh sách test của app. Hoàn tất yêu cầu publish/verification của nhà cung cấp trước khi mở rộng người dùng. Bản config thêm `assets` cần package tồn tại cả khi chạy Wrangler local; chỉ thêm sau bước đóng gói, và tạo lại package nếu đã xóa `.deploy/space`.

Nguồn: [workers.dev URL](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/), [Selective Worker-first routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/#run-worker-first-for-selective-paths), [SPA routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/#advanced-routing-control).

### 4.2 Đã có domain riêng: tùy chọn host file riêng

Có thể dùng **Pages** (`pnpm wrangler pages deploy .deploy/space --project-name space-typing`) rồi gắn `play.ten-mien.com`, hoặc một Worker Static Assets riêng. Khi tách API Worker, bắt buộc cấu hình route `/api/account/*` ở mục 3 trên **cùng domain game**. Đổi `PUBLIC_URL` và callback theo domain đó. Không dùng hai origin độc lập cho game và API.

### 4.3 Kiểm tra giới hạn file và cache

Giới hạn gói Free: mỗi file tối đa **25 MiB** (26.214.400 byte), tối đa **20.000 file** mỗi lần đưa lên. Kiểm tra lại thư mục đóng gói sau mỗi đợt thêm tài nguyên; kích thước file gốc trong `art-src/` không phải kích thước file deploy.

Lần rà soát 20/10/2026: `dist/` có 1.372 file; cộng hai thư mục dùng chung thành 1.512 file, khoảng 315,59 MiB. File lớn nhất `assets/space-typing/bosses/3d/tyrant-g01.glb` khoảng 11,97 MiB; không có file quá 25 MiB. Cấu hình gộp ở mục 4.1 đã qua dry-run và kiểm tra HTML/API/callback/Admin trên workerd local; chưa deploy production. Đây là số đo của build lúc rà soát, không thay cho kiểm tra bản deploy mới. Có thể kiểm tra package mà không đưa lên:

```bash
# Chạy tại gốc typing-game, sau khi gom .deploy/space ở trên.
python3 - <<'PY'
from pathlib import Path
files = [p for p in Path('.deploy/space').rglob('*') if p.is_file()]
too_large = [p for p in files if p.stat().st_size > 25 * 1024 * 1024]
print(f'{len(files)} files; {sum(p.stat().st_size for p in files) / 1024**2:.2f} MiB')
for p in too_large:
    print('OVER 25 MiB:', p)
assert files and len(files) <= 20_000 and not too_large, 'Package exceeds Cloudflare Free asset limits'
PY
```

Bộ nhớ đệm (cache): `assets/*.js|css` có mã băm trong tên, nên đặt lưu lâu được. Các file `manifest.json` (mô hình 3D, đồ trang trí) **không** có mã băm. Với Pages, thêm file `_headers` trong `.deploy/space`:

```
/assets/space-typing/*/manifest.json
  Cache-Control: no-cache
/assets/*
  Cache-Control: public, max-age=2592000
```

## 5. Admin nói chuyện với Worker

Nếu dùng domain riêng và route ở mục 3, route chỉ đưa `/api/account/*` tới Worker, nên Admin gọi Worker qua địa chỉ `workers.dev` của nó. Nếu dùng cách gộp ở mục 4.1, đây cũng là địa chỉ game. Lệnh `wrangler deploy` in ra địa chỉ dạng `https://space-typing-api.<ten-ban>.workers.dev`; `/internal/admin/*` luôn cần token.

Trên máy chạy Admin (`admin/server.mjs`), đặt 2 biến môi trường:

```bash
ACCOUNT_SERVICE_URL=https://space-typing-api.<ten-ban>.workers.dev
ACCOUNT_ADMIN_TOKEN=<đúng giá trị ADMIN_TOKEN đã đặt ở mục 3>
```

Khi Admin quản lý Worker thật, **token đăng nhập Admin cũng phải mạnh**: đặt `TYPING_GAME_ADMIN_TOKEN` là chuỗi ngẫu nhiên 24 ký tự trở lên (`openssl rand -base64 32`). Nếu vẫn dùng token mặc định `local-dev` hoặc token ngắn, Admin từ chối mọi lệnh quản lý người chơi và nói rõ lý do. Với Worker chạy ở máy (`127.0.0.1`), không có giới hạn này.

`admin/account-bridge.mjs` gửi mọi lệnh quản trị kèm token này tới `/internal/admin/*`. Các tác vụ:
- tìm người chơi, khóa hoặc mở khóa, tắt tiếng chat;
- khôi phục bản lưu, gửi thư, tạo mã quà;
- xem và xóa tin nhắn chat.

Đường dẫn `/internal/admin/*` không mở cho người chơi: thiếu token hoặc sai token thì bị từ chối.

## 6. Gói Free có đủ không

Giới hạn gói Free, kiểm lại trên tài liệu chính thức của Cloudflare ngày 20/10/2026:

| Phần | Giới hạn gói Free |
|---|---|
| Worker | 100.000 yêu cầu/ngày; 10 ms CPU mỗi yêu cầu |
| D1 | 5 triệu dòng đọc/ngày; 100.000 dòng ghi/ngày; **500 MB mỗi cơ sở dữ liệu**; 5 GB cho cả tài khoản; tối đa 10 cơ sở dữ liệu |
| Durable Objects (chat) | 100.000 yêu cầu/ngày (tin WebSocket gửi lên: 20 tin tính 1 yêu cầu); 13.000 GB-s/ngày; 5 triệu dòng đọc, 100.000 dòng ghi SQLite/ngày; 5 GB lưu trữ tổng; chỉ dạng SQLite |
| Workers Static Assets / Pages | 20.000 file; 25 MiB/file; lượt chỉ phục vụ file tĩnh miễn phí |

Nguồn chính thức: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/), [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/), [Static Assets billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/), [Pages limits](https://developers.cloudflare.com/pages/platform/limits/).

- Hạn theo ngày đặt lại lúc 0:00 UTC (7:00 sáng giờ VN).
- Vượt hạn thì yêu cầu bị từ chối. Cloudflare không tự tính tiền.
- Mỗi chỉ mục (index) của bảng cũng tính thêm 1 dòng ghi.

### 6.0 Có ví máy chủ (từ 17/10/2026)

- Bảng 6.1–6.2 dưới đây là số trước khi có ví.
- Với ví (giai đoạn 3), mỗi người chơi 30 phút/ngày dùng khoảng **95–110 yêu cầu Worker** và **115–135 dòng ghi D1**:
  - mỗi lần nhận quà còn 2 dòng thay vì 5;
  - nhưng mỗi lần xuất kích thêm 2 yêu cầu (bắt đầu và kết thúc).
- Kết quả: khoảng **800 người chơi mỗi ngày** trên gói Free.
- Cách tính chi tiết: `docs/ONLINE_SERVER_WALLET_DESIGN_2026-10-16.md` mục 13.3.

### 6.1 Mỗi người chơi dùng bao nhiêu

Ước tính cho một người chơi 30 phút mỗi ngày:

| Việc | Yêu cầu Worker | Dòng ghi D1 |
|---|---|---|
| Mở game: kiểm tra đăng nhập, tải bản lưu, Daily Hub | 4 | 1–2 |
| Gửi tiến độ chơi: 1 lần/phút, thêm 1 lần khi xong màn | 30–40 | 30–40 |
| Lưu đám mây: tối đa 1 lần/phút khi có thay đổi | 15–20 | 15–20, thêm 2–4 mỗi giờ cho bản sao lưu |
| Nhận quà Daily Hub: 10–20 lần | 10–20 | 50–100 (mỗi lần: 1 dòng sổ thưởng + 3 chỉ mục + trạng thái) |
| Gia hạn phiên đăng nhập (10 phút một lần) | 0 | khoảng 9 |
| Mở Daily Hub, chat | 3–5 | 0–2 |
| **Cộng** | **khoảng 75** | **khoảng 120–170** |

Dòng đọc D1: khoảng 500 mỗi người mỗi ngày.

### 6.2 Bao nhiêu người chơi mỗi ngày

| Giới hạn | Số người chơi mỗi ngày (30 phút/người) |
|---|---|
| D1: 100.000 dòng ghi | **khoảng 600–850**, chạm trước tiên |
| Worker: 100.000 yêu cầu | khoảng 1.300 (nếu mỗi người chơi 60 phút: khoảng 750) |
| D1: 5 triệu dòng đọc | khoảng 10.000 |
| Chat: 100.000 dòng ghi Durable Objects | khoảng 28.000 tin chat/ngày cho cả game |

Trước đợt rà soát 2, game gửi tiến độ 20 giây/lần, lưu đám mây 15 giây/lần, và đọc lại toàn bộ thư mỗi lần gửi tiến độ. Khi đó chỉ đủ khoảng 500–750 người chơi mỗi ngày.

### 6.3 CPU (10 ms mỗi yêu cầu)

- Mật khẩu: phần băm nặng (PBKDF2) làm ở trình duyệt. Máy chủ chỉ làm một lần HMAC, mất vài micro giây.
- Lưu đám mây là việc nặng nhất: đọc JSON rồi nén gzip.
- Đo trên máy dev (Intel i7-12700H, Node, cùng thư viện nén zlib). Máy của Cloudflare có thể chậm hơn.

| Bản lưu (JSON) | Nén còn | Lưu lên (đọc + nén) | Tải về (giải nén) |
|---|---|---|---|
| 62 KB (bản lưu thật lớn nhất ở máy) | 7,3 KB (nhỏ đi 8,6 lần) | khoảng 1,6–4 ms | khoảng 0,2–1,8 ms |
| 200 KB | 16 KB | khoảng 10 ms | khoảng 6 ms |
| 500 KB | 32 KB | khoảng 24 ms | khoảng 13 ms |

- Bản lưu thật hiện nay 16–90 KB: nằm trong hạn 10 ms.
- Bản lưu trên khoảng 150 KB có thể vượt 10 ms. Cloudflare cho vượt thỉnh thoảng. Vượt thường xuyên thì yêu cầu bị dừng.
- Sau khi đưa lên, xem CPU thật ở bảng điều khiển: **Workers → space-typing-api → Metrics → CPU time**.
- Nếu bản lưu lớn dần: chuyển việc nén sang trình duyệt (`CompressionStream`); máy chủ chỉ cất.
- Tải bản lưu về (GET `/save`) không đọc lại JSON: máy chủ giải nén rồi gửi nguyên văn.

### 6.4 Dung lượng (500 MB mỗi cơ sở dữ liệu)

| Dữ liệu | Mỗi người chơi | Ghi chú |
|---|---|---|
| Bản lưu đang dùng | 3–8 KB | Nén gzip. Ví dụ bản lưu thật 21 KB còn 3,4 KB. |
| Bản sao lưu theo giờ (6 bản) | 20–50 KB | Đặt bằng `SAVE_BACKUPS`. 12 bản thì gấp đôi. |
| Daily Hub, tài khoản, phiên | khoảng 5 KB | Không tăng theo thời gian. |
| **Sổ thưởng (`reward_ledger`)** | **khoảng 3 KB mỗi ngày chơi** | Khoảng 10 lần nhận quà × 300 byte (gồm 3 chỉ mục). **Tăng mãi**: khoảng 1,1 MB mỗi người mỗi năm. |

Tính ra:
- Bản lưu và sao lưu: khoảng 30–60 KB mỗi người. 500 MB đủ cho khoảng **8.000–16.000 tài khoản**. Trước khi nén và còn giữ 12 bản sao lưu, chỉ đủ khoảng 400–2.500.
- Sổ thưởng đầy trước: 1.000 người chơi mỗi ngày × 3 KB = 3 MB/ngày. Khoảng **5 tháng** là đầy 500 MB.
- Cần làm trước mốc đó (chưa làm; xem `docs/ONLINE_SERVER_WALLET_DESIGN_2026-10-16.md`): gộp sổ thưởng thành 1 dòng mỗi người mỗi ngày. Xóa dòng cũ cũng được, nhưng xóa một dòng tốn dòng ghi như thêm một dòng, nên gộp tốt hơn.
- Gói Free cho tối đa 10 cơ sở dữ liệu (5 GB cả tài khoản). Có thể chia người chơi sang nhiều cơ sở dữ liệu, nhưng code chưa hỗ trợ.

### 6.5 Dọn dẹp hằng ngày

Cron Trigger chạy 03:23 giờ VN mỗi ngày (`cloud/src/maintenance.ts`):
- xóa phiên đăng nhập hết hạn, và phiên đã đăng xuất quá 7 ngày;
- xóa link email hết hạn, hoặc đã dùng quá 1 ngày;
- xóa bộ đếm chống spam đã hết giờ;
- xóa các lượt OAuth đã hết hạn;
- xóa email đã gửi (hoặc lỗi) quá 30 ngày; email chưa gửi quá 3 ngày thì xóa nội dung (link).

Mỗi lần chạy xóa tối đa 5.000 dòng mỗi loại, vì xóa cũng tính dòng ghi. Muốn chạy ngay (ví dụ để thử): gọi `POST /internal/admin/maintenance` kèm `x-account-admin-token`.

### 6.6 Khi nào cần gói 5 USD

Gói Workers Paid (5 USD/tháng) cần khi gặp một trong các điều sau:
- quá khoảng **600–850 người chơi mỗi ngày** (hết 100.000 dòng ghi D1);
- cơ sở dữ liệu gần 500 MB mà chưa gộp sổ thưởng;
- bản lưu thường xuyên lớn hơn 150 KB (CPU 10 ms);
- Duel online có rất nhiều trận cùng lúc.

Trước khi chạm ngưỡng, Cloudflare báo trong bảng điều khiển. Vượt ngưỡng thì yêu cầu bị từ chối, không tự tính tiền.

## 7. Kiểm tra sau khi đưa lên

Ngoài email/mật khẩu, thử Google và Facebook bằng credentials thật: đăng ký mới, từ chối quyền, đăng nhập lại, liên kết với tài khoản hiện tại, đăng xuất và tải lại trang. Đường callback phải đi qua origin của game. Chỉ báo OAuth đã chạy đầu cuối sau khi thực sự qua màn đồng ý của nhà cung cấp; test giả lập không xác nhận credentials hay cấu hình trên Google/Meta. Kiểm tra giao diện theo [VISUAL_TESTING.md](./VISUAL_TESTING.md).

```bash
# Ở games/space-typing: chạy bộ 112 phép kiểm tra đầu cuối thẳng vào bản thật.
# Tham số 1: địa chỉ game (đi qua route /api/account). Tham số 2: địa chỉ workers.dev (cho /internal/admin).
ACCOUNT_ADMIN_TOKEN=<token> node scripts/account-e2e.mjs https://play.ten-mien.com https://space-typing-api.<ten-ban>.workers.dev
```

Với cách gộp `workers.dev` ở mục 4.1, truyền **cùng một origin workers.dev cho cả hai tham số**; API người chơi và Admin ở cùng Worker.

Lưu ý khi chạy bộ kiểm tra trên bản thật:
- Cần đúng `ACCOUNT_ADMIN_TOKEN`, vì bộ kiểm tra đọc hộp thư mẫu qua `/internal/admin`.
- **Chạy tối đa khoảng 3 lần mỗi giờ.** Mỗi lần tạo 2 tài khoản; máy chủ chỉ cho 10 lần đăng ký mỗi giờ từ một địa chỉ IP. Ở máy local thì không bị giới hạn này: bộ kiểm tra tự dùng một địa chỉ IP giả mỗi lần chạy.
- Bộ kiểm tra tạo tài khoản thử có email `pilot-…@example.com` và `wing-…@example.com`. Tài khoản `pilot-…` bị xóa ở cuối bài. Tài khoản `wing-…` và vài tài khoản khách vẫn còn; xóa trong Admin (mục Players) nếu muốn.
- Không chạy lúc đông người chơi, vì nó gửi tin vào kênh chat thế giới.
- Ở máy local, bộ kiểm tra còn thử Cron Trigger qua `/cdn-cgi/local/scheduled` (đường này chỉ có trong `wrangler dev`).
