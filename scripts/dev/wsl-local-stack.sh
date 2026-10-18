#!/usr/bin/env bash
# Windows + WSL: starts the local stack and KEEPS THE WSL SESSION OPEN (the
# launchers spawn detached children that die when the session ends).
#   wsl -e bash /mnt/d/typing-game/games/space-typing/scripts/dev/wsl-local-stack.sh
# Run it as a background task / in its own terminal; stop with Ctrl+C, then
# `pnpm account:local:stop` and `pnpm duel:local:stop` if needed.
#   3016 account/online Worker (wrangler dev)   3014 Duel   3199 Admin runtime
#   3097 Vite, no HMR (screenshots)              3098 Vite with HMR
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh" >/dev/null 2>&1
GAME="$(cd "$(dirname "$0")/../.." && pwd)"
ROOT="$(cd "$GAME/../.." && pwd)"
mkdir -p "$ROOT/.local/admin" "$GAME/.visual"
listening() { ss -ltn | grep -q "127.0.0.1:$1 "; }

cd "$ROOT"
node "$GAME/scripts/local-account.mjs" start
node "$GAME/scripts/local-duel.mjs" start
if ! listening 3199; then
  nohup node admin/server.mjs > .local/admin/wsl-stack-admin.log 2>&1 &
fi
cd "$GAME"
if ! listening 3097; then
  nohup pnpm exec vite --config scripts/dev/vite.stable.config.ts --host 127.0.0.1 --port 3097 --strictPort > .visual/vite-3097.log 2>&1 &
fi
if ! listening 3098; then
  nohup pnpm exec vite --config scripts/dev/vite.poll.config.ts --host 127.0.0.1 --port 3098 --strictPort > .visual/vite-3098.log 2>&1 &
fi
for _ in $(seq 1 60); do
  listening 3097 && listening 3098 && listening 3199 && break
  sleep 1
done
ss -ltn | grep -E ':(3016|3014|3199|3097|3098) '
echo "Local stack up. Keep this session open."
sleep infinity
