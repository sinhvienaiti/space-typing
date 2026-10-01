# DUEL VISUAL / AUDIO FINAL V2 — IMPLEMENTATION STATUS

Ngày: 2026-10-01  
Branch: `feat/bgv-integration-current`  
Source design:
- `DUEL_COMBAT_TYPING_VISUAL_AUDIO_FINAL_V2_2026-10-01.md`
- `DUEL_VISUAL_AUDIO_ROOT_CAUSE_AND_PRODUCTION_PLAN_2026-10-01.md`

Tài liệu này ghi trạng thái **code đã triển khai** so với hai tài liệu trên. Không dùng file này để thay thế source design.

## 1. Đã triển khai — random typing production path

- `DuelActionOffer` có `typingPrompt` riêng theo offer instance.
- `DUEL_CONTENT_VERSION` lên `duel-final-v4`; protocol lên v4.
- Lexicon local đóng phiên bản: `src/duel/word-lexicon.ts`.
- 8 bucket độ dài 4–11, mỗi bucket 72 token => 576 token snapshot.
- Nguồn snapshot: shared vocabulary của parent, levels 001–020.
- Word RNG tách khỏi action RNG.
- Có shuffle bag, global recent history 20, bucket history 16.
- Không đổi token sau khi offer được cấp.
- Tránh duplicate/full-prefix conflict với offer đang hiện.
- Refill tránh token match acquisition prefix đang gõ.
- Có diagnostic `antiRepeatRelaxed` và `hardExhaustion`.
- Engine, network prediction, bot, UI, local match và authority đều đọc token từ offer prompt.
- Map action vẫn giữ action/effect/cost/cooldown; chỉ typed prompt thay đổi.
- Owner nhận prompt; opponent chỉ nhận privacy-safe typing telegraph.
- Reconnect giữ nguyên prompt identity/state.

## 2. Đã triển khai — target DOM / presentation

- Không còn rebuild toàn bộ private target field mỗi lần render.
- Target node reconcile theo `offer.instanceId`.
- Layout assignment ổn định theo instance; offer còn sống không nhảy vị trí vì slot khác refill.
- Random word hiển thị là chữ chính; action label là nhận diện phụ.
- Bỏ forced synchronous `offsetWidth` ở typing micro-feedback.
- Transient arena FX dùng chung `MAX_FX_NODES` gate thay vì map blast tự append ngoài budget.
- Projectile impact có presentation timer riêng; không phụ thuộc hoàn toàn vào `animationend`.
- Visual và audio dùng chung hàm `duelProjectileTravelMs()`.

## 3. Đã triển khai — compositing / alpha

### Combat VFX

`scripts/bg-art/prepare-combat-vfx.mjs`:
- bảo toàn source alpha nếu có;
- legacy near-black source chỉ đi qua keyed-alpha fallback có ghi metadata;
- không còn `.removeAlpha()`;
- manifest có frameCount/FPS/pivot/alphaConvention/blendMode/loop/lifetime/estimated decoded bytes;
- runtime await image decode trước khi đánh dấu sprite usable;
- decode fail bị loại khỏi manifest runtime thay vì báo loaded giả.

CSS:
- fire/glow dùng emissive screen;
- smoke dùng normal/source-over, không screen toàn bộ damage group;
- map-specific background override cuối file giảm dark overlay và chỉ giữ tint nhẹ.

### Duel target art

Pipeline mới:
- source: `art-src/duel-targets/`
- command: `pnpm duel-targets:prepare`
- runtime: `public/assets/space-typing/duel-targets/`
- manifest: `targets.json`
- bắt buộc transparent alpha thật;
- opaque matte bị reject;
- runtime await decode;
- thiếu/failed sprite dùng CSS fallback, không làm hỏng trận.

18 target IDs được khóa đúng với 18 Duel action IDs.

## 4. Đã triển khai — audio routing

- Combat event đi qua `DuelCombatAudioRouter`.
- Dedup theo round/serverSequence/cue index.
- Delayed impact timer bị cancel khi reset/round lifecycle.
- Mapping đã có: typing miss, laser, missile, heavy, bomb, support, bank, warning, intercept, precision, cataclysm và round result.
- Failed counter / `threat-resolved` phát attack presentation sound.
- Precision activation và precision-fired có cue riêng.
- Reuse cùng `Game.sfx`/sample bank; không mở audio bank riêng cho Duel.
- SFX volume vẫn theo settings chung.
- Music map/phase routing hiện có được giữ.

## 5. Art workflow đã chuẩn bị

Prompt pack 18 target:
`docs/art-requests/DUEL_TARGETS_GEMINI_PROMPT_PACK_2026-10-01.md`

Tên source:
`laser.png`, `missile.png`, `railgun.png`, `bomb.png`,
`siege-lance.png`, `shield.png`, `reflect.png`, `barrier.png`,
`repair.png`, `energy.png`, `amplify.png`, `drone.png`,
`lock-on.png`, `gravity.png`, `disrupt.png`, `scan.png`,
`fate-crystal.png`, `black-hole.png`.

`art:prepare` đã auto-detect Duel target/VFX source bị thiếu output hoặc stale; không chỉ dựa vào timestamp manifest.

Parent `typing-game/play.sh` và `dev.sh` hiện gọi:
`pnpm --dir games/space-typing art:prepare`.

## 6. Tests đã thêm / cập nhật

- lexicon validity + quota;
- deterministic action + word separation;
- random word variation cùng action;
- acquisition-prefix safety;
- prompt immutability;
- multi-map refill stress;
- owner/private prompt privacy;
- reconnect prompt stability;
- target-art manifest/action-ID parity;
- combat VFX manifest;
- audio cue mapping;
- audio dedup/reset;
- shared projectile timing;
- DOM contract sau khi chuyển sang stable target nodes.

CI full test + build đã PASS tại run `36885839178` trên commit `2040c78` sau các thay đổi code/test chính (random prompt, stable target DOM, alpha/target pipeline, shared presentation timing, audio routing và authority privacy/reconnect tests). HEAD sau đó chỉ thêm/cập nhật tài liệu trạng thái; vẫn phải dùng **CI của HEAD mới nhất** làm gate cuối trước khi merge.

## 7. Chưa được phép báo hoàn thành production

Các mục sau vẫn cần làm:

1. Tạo đủ 18 source target PNG RGBA thật bằng prompt pack và đặt vào `art-src/duel-targets/`.
2. Chạy pipeline để tạo runtime target WebP + manifest và commit runtime output.
3. Audit/replace 13 combat VFX source cũ bằng true-alpha source cho smoke/debris/fire nếu source hiện tại vẫn là matte cũ.
4. Visual QA thật ở viewport mục tiêu, High/Ultra và reduced motion.
5. Video QA typing / refill / missile / bomb / low-Hull / round-end.
6. Nghe thật trên loa Mac + tai nghe; chỉnh mix nếu launch/impact/body/tail chưa đủ lực.
7. Thu performance p95/p99, input-paint, live FX count và memory trên scene stress.
8. Chỉ khi HEAD CI + visual/audio/performance gates đều đạt mới đánh dấu FINAL V2 production complete.

## 8. Lệnh local sau khi pull

Từ root `typing-game`:

```bash
git -C games/space-typing checkout feat/bgv-integration-current
git -C games/space-typing pull --ff-only
./play.sh
```

Không cần chạy thủ công `sprites:prepare`, `combat-vfx:prepare` hoặc `duel-targets:prepare` cho workflow thường ngày; `art:prepare` được gọi tự động.
