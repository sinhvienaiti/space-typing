import { signDuelSessionToken } from "./auth";

const [accountId, displayName, ttlRaw] = process.argv.slice(2);
const secret = process.env.DUEL_AUTH_SECRET ?? "";

if (
  accountId === undefined ||
  accountId.trim() === "" ||
  displayName === undefined ||
  displayName.trim() === ""
) {
  process.stderr.write(
    "Usage: pnpm duel:token <account-id> <display-name> [ttl-seconds]\n",
  );
  process.exit(1);
}

const ttlSeconds = Math.max(
  60,
  Math.min(
    86_400,
    Number.isFinite(Number(ttlRaw))
      ? Math.floor(Number(ttlRaw))
      : 3600,
  ),
);

const token = signDuelSessionToken(
  {
    sub: accountId.trim(),
    name: displayName.trim().slice(0, 32),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  },
  secret,
);

process.stdout.write(token + "\n");
