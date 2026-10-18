/**
 * Calls to the online API (cloud/, same origin under /api/account/).
 * Every write sends "x-space-typing: 1" (required by the Worker against
 * cross-site requests). Network failures become OnlineError("offline").
 */
export class OnlineError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export const ONLINE_BASE = "/api/account";

/** Browsers allow at most 64 KB of keepalive request bodies in flight; stay under it. */
export const KEEPALIVE_MAX_BODY = 60_000;

/**
 * `keepalive`: the request may outlive the page (pagehide). Bodies over
 * KEEPALIVE_MAX_BODY are sent as a normal request instead.
 */
export async function onlineRequest<T>(path: string, options: { method?: string; body?: unknown; timeoutMs?: number; keepalive?: boolean } = {}): Promise<T> {
  const method = options.method ?? (options.body === undefined ? "GET" : "POST");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 12_000);
  const body = options.body === undefined ? undefined : JSON.stringify(options.body);
  let response: Response;
  try {
    response = await fetch(ONLINE_BASE + path, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: { "content-type": "application/json", ...(method === "GET" ? {} : { "x-space-typing": "1" }) },
      body,
      signal: controller.signal,
      keepalive: options.keepalive === true && (body?.length ?? 0) <= KEEPALIVE_MAX_BODY,
    });
  } catch {
    throw new OnlineError(0, "offline", "You are offline or the server is unreachable.");
  } finally {
    clearTimeout(timer);
  }
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("json")) {
    // A static host without the API answers with HTML.
    throw new OnlineError(response.status === 200 ? 503 : response.status, "offline", "Online features are not available here.");
  }
  const payload = (await response.json()) as { error?: string; message?: string; details?: unknown };
  if (!response.ok) {
    throw new OnlineError(response.status, payload.error ?? "error", payload.message ?? "Request failed.", payload.details);
  }
  return payload as T;
}

export function chatSocketUrl(channel: string): string {
  const scheme = location.protocol === "https:" ? "wss:" : "ws:";
  return scheme + "//" + location.host + ONLINE_BASE + "/chat/connect?channel=" + encodeURIComponent(channel);
}
