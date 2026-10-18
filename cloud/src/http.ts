/** Errors, JSON responses, cookies and request helpers for the Worker. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });
}

/** A JSON body that is already text (no parse and re-serialise). */
export function jsonText(text: string, status = 200): Response {
  return new Response(text, {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" },
  });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return json({ error: error.code, message: error.message, ...(error.details !== undefined ? { details: error.details } : {}) }, error.status);
  }
  console.error("space-typing-api error", error);
  return json({ error: "server", message: "Server error. Try again shortly." }, 500);
}

export async function readJson(request: Request, maxBytes = 64 * 1024): Promise<Record<string, unknown>> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxBytes) throw new ApiError(413, "too-large", "Request is too large.");
  const text = await request.text();
  if (text.length > maxBytes) throw new ApiError(413, "too-large", "Request is too large.");
  if (text === "") return {};
  try {
    const value = JSON.parse(text) as unknown;
    if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("not an object");
    return value as Record<string, unknown>;
  } catch {
    throw new ApiError(400, "bad-json", "Request body must be a JSON object.");
  }
}

export const SESSION_COOKIE = "st_session";

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (header === null) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export function isHttps(request: Request): boolean {
  return new URL(request.url).protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
}

export function sessionCookie(request: Request, token: string | null, maxAgeSeconds: number): string {
  const parts = [
    SESSION_COOKIE + "=" + (token ?? ""),
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=" + (token === null ? 0 : maxAgeSeconds),
  ];
  if (isHttps(request)) parts.push("Secure");
  return parts.join("; ");
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local"
  );
}

export function nowIso(now = Date.now()): string {
  return new Date(now).toISOString();
}
