/**
 * Browser half of "server relief" password hashing (cloud/src/crypto.ts):
 * PBKDF2-SHA256, 310,000 rounds, salted with the account email. Only this
 * 32-byte key leaves the device; the server adds its own salt and secret.
 * The cost sits on the player's device (~0.2–0.5 s once per sign-in), which
 * keeps every server request inside the Workers Free plan CPU limit.
 */
export const PASSWORD_KEY_ROUNDS = 310_000;

export function passwordProblem(password: string): string | null {
  if (password.length < 8) return "Password must have at least 8 characters.";
  if (password.length > 128) return "Password is too long.";
  if (/^\d+$/.test(password)) return "Password cannot be only numbers.";
  return null;
}

export async function derivePasswordKey(email: string, password: string, rounds = PASSWORD_KEY_ROUNDS): Promise<string> {
  const encoder = new TextEncoder();
  const material = await crypto.subtle.importKey("raw", encoder.encode(password.normalize("NFKC")), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: encoder.encode("space-typing:v1:" + email.trim().toLowerCase()), iterations: rounds },
    material,
    256,
  );
  let text = "";
  for (const byte of new Uint8Array(bits)) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
