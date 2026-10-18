import { chatSocketUrl } from "./api";

/**
 * One live chat room over WebSocket (cloud/src/chat.ts). Reconnects with
 * back-off while open; close() stops it. Messages arrive in order; the
 * room sends the last 50 on every (re)connect.
 */
export type ChatMessage = {
  id: string;
  from: { id: string; name: string; code: string; look?: { avatar: string; frame: string; title: string } };
  text: string;
  at: number;
  system?: boolean;
};

export type ChatEvents = {
  hello(history: ChatMessage[], online: number, canSend: boolean, mutedUntil: number): void;
  message(message: ChatMessage, mine: boolean): void;
  remove(id: string): void;
  presence(online: number): void;
  problem(text: string, nonce?: string): void;
  notice(text: string): void;
  state(connected: boolean): void;
};

export class ChatConnection {
  private socket: WebSocket | null = null;
  private closed = false;
  private retry = 0;
  private retryTimer = 0;
  private pingTimer = 0;
  private nonce = 0;
  private readonly pending = new Set<string>();

  constructor(
    readonly channel: string,
    private readonly selfId: string,
    private readonly events: ChatEvents,
  ) {
    this.open();
  }

  private open(): void {
    if (this.closed) return;
    let socket: WebSocket;
    try {
      socket = new WebSocket(chatSocketUrl(this.channel));
    } catch {
      this.scheduleRetry();
      return;
    }
    this.socket = socket;
    socket.addEventListener("open", () => {
      this.retry = 0;
      this.events.state(true);
      window.clearInterval(this.pingTimer);
      // Keeps proxies from closing an idle connection.
      this.pingTimer = window.setInterval(() => this.raw({ type: "ping" }), 45_000);
    });
    socket.addEventListener("message", (event) => {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(String(event.data)) as Record<string, unknown>;
      } catch {
        return;
      }
      switch (data.type) {
        case "hello":
          this.events.hello((data.history as ChatMessage[]) ?? [], Number(data.online ?? 0), data.canSend === true, Number(data.mutedUntil ?? 0));
          break;
        case "message": {
          const message = data.message as ChatMessage;
          if (typeof data.nonce === "string") this.pending.delete(data.nonce);
          this.events.message(message, message.from.id === this.selfId);
          break;
        }
        case "delete":
          this.events.remove(String(data.id));
          break;
        case "presence":
        case "pong":
          this.events.presence(Number(data.online ?? 0));
          break;
        case "error":
          this.events.problem(String(data.message ?? "Message not sent."), typeof data.nonce === "string" ? data.nonce : undefined);
          break;
        case "notice":
          this.events.notice(String(data.message ?? ""));
          break;
        default:
          break;
      }
    });
    socket.addEventListener("close", (event) => {
      window.clearInterval(this.pingTimer);
      this.events.state(false);
      if (event.code === 4003) {
        this.events.problem("You were removed from this chat.");
        this.closed = true;
        return;
      }
      this.scheduleRetry();
    });
    socket.addEventListener("error", () => {
      /* "close" follows. */
    });
  }

  private scheduleRetry(): void {
    if (this.closed) return;
    const delay = Math.min(30_000, 1000 * 2 ** this.retry) + Math.random() * 500;
    this.retry += 1;
    window.clearTimeout(this.retryTimer);
    this.retryTimer = window.setTimeout(() => this.open(), delay);
  }

  private raw(payload: unknown): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify(payload));
    return true;
  }

  /** `look`: the sender's Style Shop ids; the server keeps only valid ones. */
  send(text: string, look?: { avatar: string; frame: string; title: string }): string | null {
    const nonce = "n" + ++this.nonce;
    if (!this.raw({ type: "send", text, nonce, ...(look === undefined ? {} : { look }) })) return null;
    this.pending.add(nonce);
    return nonce;
  }

  report(id: string, reason: string): void {
    this.raw({ type: "report", id, reason });
  }

  close(): void {
    this.closed = true;
    window.clearTimeout(this.retryTimer);
    window.clearInterval(this.pingTimer);
    try {
      this.socket?.close(1000, "bye");
    } catch {
      /* Already closed. */
    }
    this.socket = null;
  }
}
