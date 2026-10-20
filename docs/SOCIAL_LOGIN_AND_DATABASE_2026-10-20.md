# Database, Cloudflare Free và đăng nhập Google / Facebook

Ngày rà soát: **20/10/2026**. Tài liệu nền của Claude: [CLAUDE_PROCESS_2026-10-17.md](./CLAUDE_PROCESS_2026-10-17.md), mục quy tắc máy chủ online; hướng dẫn triển khai: [ONLINE_CLOUDFLARE_DEPLOY.md](./ONLINE_CLOUDFLARE_DEPLOY.md).

## 1. Database đã chốt và trạng thái hiện tại

Database máy chủ là **Cloudflare D1, dùng SQLite**. API chạy trên **Cloudflare Workers**; phòng chat dùng **Durable Objects với SQLite và WebSocket Hibernation**. Đây là quyết định đã ghi trong Claude Process để phù hợp gói Free. Những đề xuất PostgreSQL ở tài liệu cũ không phải cấu hình đang triển khai.

| Nơi lưu | Vai trò | Trạng thái trong repo |
|---|---|---|
| IndexedDB trong trình duyệt (`space-typing`, store `player`) | Bản lưu trên thiết bị để chơi và phục hồi cục bộ | Đang dùng; độc lập với cơ sở dữ liệu online |
| D1 local do Wrangler/workerd quản lý | Tài khoản, phiên, bản lưu đám mây local, ví và tính năng cộng đồng khi phát triển | `pnpm account:local`; dữ liệu bền trong `.account-local/wrangler/` |
| D1 trên Cloudflare | Cùng schema cho người chơi production | `cloud/wrangler.jsonc` còn `database_id` toàn số 0; cần tạo/bind D1 thật, chưa xác nhận đã deploy từ trạng thái repo |
| Durable Objects SQLite | Phòng chat và tin nhắn | Dùng binding `CHAT`, khai báo `new_sqlite_classes` đúng dạng hỗ trợ Free |
| Static Assets / Pages | HTML, JS, CSS, WebP, GLB, âm thanh và từ vựng | Đưa bản build và thư mục dùng chung lên CDN; không lưu tài nguyên này vào D1 |

**Nếu chưa có domain riêng**, dùng một Worker cho cả file game và API ở `https://space-typing-api.<ten-ban>.workers.dev`; Cloudflare cấp subdomain này. Cấu hình cụ thể ở [hướng dẫn triển khai mục 4.1](./ONLINE_CLOUDFLARE_DEPLOY.md#41-chưa-có-domain-gộp-game--api-trên-cùng-workersdev): đóng gói build trước, rồi thêm Static Assets vào cùng config API với `run_worker_first` chỉ cho API/Admin/health. Cách này giữ cookie và callback cùng origin, không phải mua domain hay dựng thêm máy chủ. Không tách game ở `pages.dev` và API ở `workers.dev` khác origin.

Các bảng chính: `accounts`, `auth_identities`, `sessions`, `one_time_tokens`, `player_saves`, `player_save_backups`, `liveops_states`, ví/sổ thưởng, thư/quà, bạn bè/nhóm và phản hồi. Bản lưu lớn được nén gzip theo migration `0003`; chỉ mục giảm lượt quét; Cron dọn dữ liệu hết hạn.

Migration là nguồn schema chính thức trong `cloud/migrations/`: `0001`–`0008` có sẵn; `0009_social_auth.sql` bổ sung cờ đăng nhập mật khẩu và các lượt OAuth. Tài khoản, save và ví tiếp tục dùng cùng `account_id`, không phải chuyển sang database khác để thêm social login. `auth_identities(provider, subject)` đã tồn tại từ `0001` để tách tài khoản game khỏi danh tính đăng nhập.

## 2. Phù hợp Cloudflare Free tới đâu

Đã kiểm lại tài liệu chính thức ngày 20/10/2026:

| Thành phần | Hạn Free cần theo dõi |
|---|---|
| Workers | 100.000 lượt chạy Worker/ngày; 10 ms CPU/lượt |
| D1 | 5 triệu dòng đọc/ngày; 100.000 dòng ghi/ngày; 500 MB/database; 5 GB/tài khoản; tối đa 10 database |
| D1 backup Time Travel | Phục hồi trong 7 ngày trên Free |
| Durable Objects SQLite | 100.000 request/ngày; 13.000 GB-s/ngày; 5 triệu dòng đọc/ngày; 100.000 dòng ghi/ngày; 5 GB tổng |
| Workers Static Assets / Pages | 20.000 file; tối đa 25 MiB/file |

Nguồn: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/), [Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/), [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/), [Pages limits](https://developers.cloudflare.com/pages/platform/limits/).

Các lượt chỉ lấy static asset không chạy Worker là miễn phí và không giới hạn. Không đưa toàn bộ ảnh/GLB qua API hoặc `run_worker_first`; phần API mới tiêu hạn Workers. Vượt hạn Free thì dịch vụ tương ứng từ chối thao tác; không có ý nghĩa game được phục vụ vô hạn vì dùng CDN. [Static Assets billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)

Claude ước tính khoảng **600–850 người chơi/ngày**, dựa trên 30 phút/người/ngày và cách gọi API lúc viết tài liệu. Đây là mô hình ước tính, không phải ngưỡng bảo đảm. OAuth thêm một ít đọc/ghi khi đăng nhập, cần theo dõi số liệu sau deploy. Theo dõi `rows_read`, `rows_written`, CPU và dung lượng, đồng thời chuẩn bị gộp sổ thưởng khi dữ liệu tăng. Xóa dữ liệu và ghi chỉ mục cũng tốn lượt ghi.

Build lúc rà soát cộng hai thư mục dùng chung có **1.512 file, khoảng 315,59 MiB**; file lớn nhất là boss GLB **11,97 MiB**, không có file vượt 25 MiB. Cần chạy lại preflight trong tài liệu triển khai sau mỗi lần build. Duel Node và API runtime của Admin còn là các phần phải xử lý riêng khi đưa toàn bộ game online; social login không tự chuyển các dịch vụ đó lên Cloudflare.

## 3. Vì sao trước đây chưa có Google / Facebook

Luồng tài khoản cũ mới có khách, email/mật khẩu, xác minh email và đặt lại mật khẩu. Có bảng `auth_identities` không đồng nghĩa đã có OAuth: trước đợt này chưa có route bắt đầu/callback cho Google/Facebook và chưa có nút tương ứng trên màn đăng ký/đăng nhập.

Đợt bổ sung này dùng luồng **authorization code** ở Worker. Google chỉ xin `openid email profile`; Facebook xin `public_profile,email`, không xin quyền đọc Gmail, đăng bài hay bạn bè. Các khóa client/app secret chỉ ở Worker hoặc `.dev.vars`; trình duyệt không nhận secret hay giữ access token nhà cung cấp.

API:

- `GET /api/account/oauth/providers`: trạng thái bật/tắt từng nhà cung cấp, không trả secret.
- `POST /api/account/oauth/google/start` và `/facebook/start`: bắt đầu với ý định đăng nhập, đăng ký hoặc liên kết.
- `GET /api/account/oauth/google/callback` và `/facebook/callback`: nhận code, kiểm tra state rồi tạo phiên game.

State dùng một lần, hết hạn sau 10 phút và ràng buộc với cookie của trình duyệt; Google có PKCE. Callback dùng **`PUBLIC_URL` cố định**, không lấy origin do client tùy ý gửi. Phiên cuối cùng vẫn là cookie `st_session` HttpOnly/SameSite=Lax như tài khoản thường. Khi game nằm trong Portal, mở luồng đăng nhập ở cửa sổ riêng để màn nhà cung cấp không bị nhúng trong iframe.

Các nguyên tắc giữ tài khoản:

- Đăng ký social vẫn cần đồng ý điều khoản/chính sách và dùng quy tắc năm sinh hiện có. Khách nâng cấp tài khoản giữ cùng ID để giữ save/ví.
- Danh tính đăng nhập là `(provider, subject)`; không tự gộp hai tài khoản chỉ vì trùng email. Tài khoản cũ trùng email cần đăng nhập trước, rồi liên kết Google/Facebook trong phần tài khoản.
- Với Google, tài khoản mới cần `email_verified=true`. Game chỉ xác minh email ngay khi Google có thẩm quyền với địa chỉ đó (Gmail/Googlemail hoặc Google Workspace có `hd`); email thuộc bên thứ ba vẫn qua thư xác nhận của game. Facebook cũng dùng thư xác nhận riêng của game, không suy ra email đã xác minh từ lần đăng nhập Facebook.
- Tài khoản chỉ dùng social chưa có mật khẩu do người chơi đặt. Không cho đăng nhập bằng chuỗi mật khẩu giả; luồng đặt lại mật khẩu qua email có thể thiết lập mật khẩu thật sau.
- Facebook có thể không trả email khi người chơi không cấp quyền hoặc hồ sơ không có email. Đăng ký tài khoản mới cần email vì schema/luồng khôi phục hiện tại; trường hợp thiếu email sẽ báo rõ, không tạo email giả. Danh tính đã liên kết vẫn dùng subject để đăng nhập.

Quy tắc thẩm quyền email của Google: [Verify Google ID token — email authority](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token). Subject Facebook được ghép với App ID để hai Meta app không dùng chung danh tính một cách ngầm định.

## 4. Thiết lập Google

1. Trong Google Cloud Console, tạo/chọn project và cấu hình Google Auth Platform: tên ứng dụng, email hỗ trợ, audience. Khi còn Testing, thêm tài khoản thử vào danh sách test users.
2. Tạo OAuth client loại **Web application**. Điền authorized redirect URI đúng origin và đường callback, ví dụ:

   ```text
   https://play.ten-mien.com/api/account/oauth/google/callback
   ```

   Chưa có domain thì dùng `https://space-typing-api.<ten-ban>.workers.dev/api/account/oauth/google/callback`; `PUBLIC_URL` phải là đúng origin `workers.dev` đó. Khi còn Testing, tài khoản thử phải được khai báo trong Google Auth Platform.

3. Lưu client ID và client secret ở Worker bằng secret hoặc file local ở mục 6. Chỉ cần scope `openid email profile` cho đăng nhập. Tên và cấu hình được trình bày trong consent screen; hoàn tất các yêu cầu publish/verification mà Console hiển thị trước khi mở cho mọi người.

Google yêu cầu host thuộc public suffix và HTTPS, có ngoại lệ cho localhost. Vì vậy **`space.typing-game.local` không dùng làm Google redirect URI thật được**. Để thử local, dùng origin `http://localhost:3004`, đặt `PUBLIC_URL` giống hệt, đăng ký callback `http://localhost:3004/api/account/oauth/google/callback`, restart account service rồi mở game trực tiếp tại localhost. Vite đã proxy `/api/account` tới Worker local. Đổi origin trình duyệt tạo vùng IndexedDB/cookie khác; đừng xóa hoặc ghi đè save ở origin `.local` để thử.

Nguồn: [Google Web Server OAuth — redirect URI validation](https://developers.google.com/identity/protocols/oauth2/web-server#uri-validation), [OpenID Connect setup](https://developers.google.com/identity/openid-connect/openid-connect#settingup).

## 5. Thiết lập Facebook

1. Tạo Meta developer app phù hợp Facebook Login trên web; bật Facebook Login và Web OAuth Login theo giao diện Dashboard hiện hành.
2. Khai báo domain/Website URL và **Valid OAuth Redirect URIs** chính xác, ví dụ:

   ```text
   https://play.ten-mien.com/api/account/oauth/facebook/callback
   ```

   Với cách gộp không cần domain, đổi thành `https://space-typing-api.<ten-ban>.workers.dev/api/account/oauth/facebook/callback`, trùng origin game và `PUBLIC_URL`.

3. Điền Privacy Policy URL, quy trình/URL xóa dữ liệu và thông tin ứng dụng theo yêu cầu Dashboard. Dùng tài khoản có vai trò thử nghiệm khi app còn Development; hoàn tất những yêu cầu Live/App Review Dashboard yêu cầu trước khi mở cho người chơi ngoài nhóm thử.
4. Đặt App ID, App Secret và `OAUTH_FACEBOOK_API_VERSION` đúng phiên bản còn được Meta app hỗ trợ (ví dụ cấu hình `v26.0`; xác nhận lại trong Dashboard/changelog khi tạo app).

Để thử đầy đủ cả Google và Facebook, nên dùng **staging HTTPS công khai cùng origin cho game và API**. Google Firebase có hướng dẫn chính thức về Facebook Login: Facebook yêu cầu HTTPS, còn localhost HTTP phụ thuộc Development mode và tài khoản thử. Không mặc định `.local` với chứng chỉ nội bộ được Meta chấp nhận. [Google Firebase Facebook Login](https://firebase.google.com/docs/auth/web/facebook-login)

Tham chiếu chính thức Meta: [Manual Login Flow](https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow/), [Security](https://developers.facebook.com/docs/facebook-login/security/), [Graph API changelog](https://developers.facebook.com/docs/graph-api/changelog/). Trong lần rà soát này các trang Meta trả 429/không truy cập được qua công cụ, nên chưa xác nhận trực tiếp phiên bản mới nhất hay quy tắc Dashboard dành riêng cho app của chủ dự án.

## 6. Đặt cấu hình an toàn

Local: xem [`cloud/.dev.vars.example`](../cloud/.dev.vars.example). Script `account:local` tự tạo `.dev.vars` nếu chưa có; nếu file đã tồn tại thì **chỉ thêm cấu hình OAuth**, không chép đè `PASSWORD_PEPPER` hay các secret hiện có. File thật đã được Git bỏ qua. Không gửi secret vào chat và không dùng `VITE_*` cho secret.

```dotenv
# Thêm vào cloud/.dev.vars; ví dụ origin khi thử Google local.
PUBLIC_URL=http://localhost:3004
OAUTH_GOOGLE_CLIENT_ID=<client ID của bạn>
OAUTH_GOOGLE_CLIENT_SECRET=<client secret của bạn>
# Facebook: dùng staging HTTPS nếu localhost không được Meta app chấp nhận.
OAUTH_FACEBOOK_APP_ID=<app ID của bạn>
OAUTH_FACEBOOK_APP_SECRET=<app secret của bạn>
OAUTH_FACEBOOK_API_VERSION=v26.0
```

Sau khi chỉnh chạy `pnpm account:local:restart`. Nếu đổi `PUBLIC_URL` sang staging hay production, phải mở game ở đúng origin đó và dùng callback tương ứng; không trộn callback localhost với cookie ở `.local`.

Production, chạy trong `games/space-typing`:

```bash
pnpm wrangler secret put OAUTH_GOOGLE_CLIENT_ID -c cloud/wrangler.jsonc
pnpm wrangler secret put OAUTH_GOOGLE_CLIENT_SECRET -c cloud/wrangler.jsonc
pnpm wrangler secret put OAUTH_FACEBOOK_APP_ID -c cloud/wrangler.jsonc
pnpm wrangler secret put OAUTH_FACEBOOK_APP_SECRET -c cloud/wrangler.jsonc
```

Đặt `vars.PUBLIC_URL` bằng origin công khai, và `vars.OAUTH_FACEBOOK_API_VERSION` trong `wrangler.jsonc`. Thiếu cấu hình thì nhà cung cấp tương ứng chưa được bật; các kiểm tra tự động không thể thay cho việc tạo app thật trên Google/Meta.

## 7. Thứ tự đưa lên và nghiệm thu

1. Chọn origin production/staging. Chưa có domain thì chọn subdomain Cloudflare và dùng **game + API cùng Worker** ở `https://space-typing-api.<ten-ban>.workers.dev`; không cần mua domain. Có domain riêng thì dùng route API cùng domain game. Cấu hình cụ thể trong [hướng dẫn triển khai](./ONLINE_CLOUDFLARE_DEPLOY.md).
2. Tạo D1 bằng `pnpm wrangler d1 create space-typing`; cập nhật ID thật vào cấu hình. Chạy toàn bộ migration với `--remote` **trước khi** deploy Worker mới, bao gồm `0009_social_auth.sql`.
3. Đặt `PASSWORD_PEPPER`, `ADMIN_TOKEN` production, email delivery khi cần, OAuth credentials và `PUBLIC_URL`. Không dùng secret local cho production. Cấu hình callback trong Google/Meta.
4. Build game, đóng gói từ vựng, kiểm tra 20.000 file/25 MiB. Với `workers.dev`, sau khi package tồn tại mới thêm `assets` vào cùng config API và chạy `wrangler deploy --dry-run`, rồi deploy Worker chứa game + API; không thêm zone route. Với domain riêng và Pages/API riêng, gắn route cùng origin. Giữ ảnh/GLB được CDN phục vụ trực tiếp.
5. Chạy account E2E theo tài liệu deploy; kiểm tra UI đăng nhập/đăng ký và popup khi mở trong Portal theo [VISUAL_TESTING.md](./VISUAL_TESTING.md).
6. Thử bằng nhà cung cấp thật: đăng ký mới, hủy consent, đăng nhập lại, trùng email, liên kết tài khoản cũ, logout/reload và phục hồi save. Kiểm tra email thiếu của Facebook được báo rõ, callback sai/state hết hạn bị từ chối.
7. Theo dõi D1 reads/writes/storage, Worker CPU, Durable Objects duration và lỗi quota trong Dashboard. Free không tự bảo đảm số người chơi; đo lại theo phiên bản game hiện tại.

Chỉ đánh dấu **OAuth chạy đầu cuối** sau khi qua màn đồng ý thật của Google/Meta với credentials của dự án. Repo có implementation, migration và ví dụ cấu hình; bước cấp credentials, xác nhận callback, publish provider app và deploy production phụ thuộc tài khoản của chủ dự án.

## 8. Kết quả kiểm tra bản bổ sung

Ngày 20/10/2026, chưa có domain/OAuth app; chủ dự án chọn chuẩn bị code và hướng dẫn cấu hình:

- `pnpm test`: **366 file / 2.263 test đạt**, bao gồm 22 test OAuth với SQLite thật và phản hồi Google/Facebook giả lập. Có kiểm tra PKCE/state hết hạn/dùng lại, quyền sở hữu danh tính, trùng email, liên kết, nâng cấp khách, logout giữa callback và đặt mật khẩu sau đăng ký social.
- `pnpm account:check`, `pnpm build:space`: đạt. Migration `0009` đã áp dụng vào **D1 local**, không chạy migration remote.
- `node scripts/account-e2e.mjs`: **112/112** trên workerd + D1 + Durable Objects local. Route OAuth thiếu cấu hình trả trạng thái chưa bật, callback chuyển về origin cấu hình và xóa cookie state.
- Cấu hình Worker + Static Assets ở mục 4.1 của tài liệu triển khai đã qua `wrangler deploy --dry-run` và chạy local trên cổng tạm. HTML, API health, provider status, callback, API 404 và Admin cần token đều đúng; chưa deploy lên Cloudflare.
- Theo `VISUAL_TESTING.md`: chụp bản **Play** ở 1642×799, DPR 2; mở xem hai tab và phần cuối form đăng ký, phóng to ba vùng, rồi vào trận hơn 20 giây. Không tràn ngang; nút tạo tài khoản truy cập được khi cuộn; `logs` và `exceptions` rỗng. Ảnh/JSON tạm ở `.visual/account-oauth-*`.

Chưa kiểm tra màn consent thật, gửi email thật, popup với nhà cung cấp thật hoặc tải production. Các bước này cần OAuth credentials, origin được nhà cung cấp chấp nhận và cấu hình email/Cloudflare của chủ dự án.
