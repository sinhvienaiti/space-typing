export type AudioFocusReason = "pronunciation" | "announcer" | "warning";

export type AudioFocusToken = Readonly<{
  tokenId: string;
  reason: AudioFocusReason;
  owner: string;
  generation: number;
}>;

export type AudioFocusSnapshot = Readonly<{
  revision: number;
  reasons: readonly AudioFocusReason[];
  tokens: readonly AudioFocusToken[];
}>;

type FocusListener = (snapshot: AudioFocusSnapshot) => void;

type WindowLike = Pick<Window, "addEventListener" | "removeEventListener" | "setTimeout" | "clearTimeout" | "dispatchEvent"> & {
  parent?: Window;
  location?: Location;
};

const EMPTY_SNAPSHOT: AudioFocusSnapshot = Object.freeze({
  revision: 0,
  reasons: Object.freeze([]) as readonly AudioFocusReason[],
  tokens: Object.freeze([]) as readonly AudioFocusToken[],
});

function eventDetail(event: Event): Record<string, unknown> {
  return ((event as CustomEvent<Record<string, unknown>>).detail ?? {}) as Record<string, unknown>;
}

function finiteGeneration(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : fallback;
}

/**
 * Single runtime owner for transient audio focus. Producers may still emit the
 * legacy DOM signals during migration; only this manager translates them into
 * owner/generation tokens. Consumers subscribe here instead of independently
 * ducking the same signal.
 */
export class AudioFocusManager {
  private readonly tokens = new Map<string, AudioFocusToken>();
  private readonly listeners = new Set<FocusListener>();
  private readonly ownerGeneration = new Map<string, number>();
  private readonly timedReleases = new Map<string, number>();
  private sequence = 0;
  private revision = 0;
  private snapshotValue: AudioFocusSnapshot = EMPTY_SNAPSHOT;
  private bridgeWindow: WindowLike | null = null;
  private portalGeneration = 0;
  private readonly portalSessionId = `space-typing-${Math.random().toString(36).slice(2)}`;

  private readonly onPronunciation = (event: Event): void => {
    const detail = eventDetail(event);
    const owner = typeof detail.owner === "string" ? detail.owner : "speech";
    const suppliedGeneration =
      typeof detail.generation === "number" && Number.isFinite(detail.generation)
        ? finiteGeneration(detail.generation, 0)
        : undefined;
    if (detail.active === true) {
      this.replace(owner, "pronunciation", suppliedGeneration);
    } else {
      this.releaseOwnerReason(
        owner,
        "pronunciation",
        suppliedGeneration ?? this.currentGeneration(owner),
      );
    }
  };

  private readonly onAnnouncer = (event: Event): void => {
    const detail = eventDetail(event);
    const owner = typeof detail.owner === "string" ? detail.owner : "announcer";
    const suppliedGeneration =
      typeof detail.generation === "number" && Number.isFinite(detail.generation)
        ? finiteGeneration(detail.generation, 0)
        : undefined;
    if (detail.active === true) {
      this.replace(owner, "announcer", suppliedGeneration);
    } else {
      this.releaseOwnerReason(
        owner,
        "announcer",
        suppliedGeneration ?? this.currentGeneration(owner),
      );
    }
  };

  private readonly onWarning = (event: Event): void => {
    const detail = eventDetail(event);
    const durationMs = typeof detail.durationMs === "number" && Number.isFinite(detail.durationMs)
      ? Math.max(0, detail.durationMs)
      : 350;
    const owner = typeof detail.owner === "string" ? detail.owner : "warning";
    this.acquireTimed("warning", owner, durationMs);
  };

  private readonly onPageHide = (): void => {
    this.clearAll();
  };

  subscribe(listener: FocusListener): () => void {
    this.ensureBrowserBridge();
    this.listeners.add(listener);
    listener(this.snapshotValue);
    return () => {
      this.listeners.delete(listener);
    };
  }

  snapshot(): AudioFocusSnapshot {
    this.ensureBrowserBridge();
    return this.snapshotValue;
  }

  isActive(reason: AudioFocusReason): boolean {
    return this.snapshot().reasons.includes(reason);
  }

  acquire(reason: AudioFocusReason, owner: string, generation?: number): AudioFocusToken {
    this.ensureBrowserBridge();
    const safeOwner = owner.trim() || "anonymous";
    const safeGeneration = generation ?? this.currentGeneration(safeOwner) + 1;
    const token: AudioFocusToken = Object.freeze({
      tokenId: `${safeOwner}:${reason}:${safeGeneration}:${++this.sequence}`,
      reason,
      owner: safeOwner,
      generation: safeGeneration,
    });
    this.tokens.set(token.tokenId, token);
    this.ownerGeneration.set(safeOwner, Math.max(this.currentGeneration(safeOwner), safeGeneration));
    this.publish();
    return token;
  }

  replace(
    owner: string,
    reason: AudioFocusReason,
    generation?: number,
  ): AudioFocusToken | null {
    const safeOwner = owner.trim() || "anonymous";
    const current = this.currentGeneration(safeOwner);
    const safeGeneration = generation ?? current + 1;
    const existing = [...this.tokens.values()].find(
      (token) =>
        token.owner === safeOwner &&
        token.reason === reason &&
        token.generation === safeGeneration,
    );
    if (safeGeneration <= current) {
      // Duplicate activation is idempotent while its token is alive. Once a
      // generation has released, neither that generation nor an older one may
      // resurrect focus after newer state has already been observed.
      return existing ?? null;
    }
    this.releaseOwnerReason(safeOwner, reason, safeGeneration, true);
    return this.acquire(reason, safeOwner, safeGeneration);
  }

  acquireTimed(reason: AudioFocusReason, owner: string, durationMs: number): AudioFocusToken {
    const safeOwner = owner.trim() || "anonymous";
    const generation = this.currentGeneration(safeOwner) + 1;
    const token = this.replace(safeOwner, reason, generation);
    if (token === null) {
      throw new Error("Audio focus generation failed to advance");
    }
    const bridge = this.currentWindow();
    if (bridge !== null) {
      const timer = bridge.setTimeout(() => {
        this.timedReleases.delete(token.tokenId);
        this.release(token);
      }, Math.max(0, durationMs));
      this.timedReleases.set(token.tokenId, timer);
    }
    return token;
  }

  release(token: AudioFocusToken | string | null): boolean {
    if (token === null) return false;
    const tokenId = typeof token === "string" ? token : token.tokenId;
    const existing = this.tokens.get(tokenId);
    if (existing === undefined) return false;
    this.tokens.delete(tokenId);
    this.cancelTimer(tokenId);
    this.publish();
    return true;
  }

  clearOwner(owner: string): void {
    let changed = false;
    for (const token of [...this.tokens.values()]) {
      if (token.owner !== owner) continue;
      this.tokens.delete(token.tokenId);
      this.cancelTimer(token.tokenId);
      changed = true;
    }
    if (changed) this.publish();
  }

  clearAll(): void {
    if (this.tokens.size === 0 && this.timedReleases.size === 0) return;
    for (const tokenId of this.timedReleases.keys()) this.cancelTimer(tokenId);
    this.tokens.clear();
    this.publish();
  }

  private releaseOwnerReason(
    owner: string,
    reason: AudioFocusReason,
    generation: number,
    replacing = false,
  ): void {
    const safeOwner = owner.trim() || "anonymous";
    const current = this.currentGeneration(safeOwner);
    if (!replacing && generation < current) return;
    let changed = false;
    for (const token of [...this.tokens.values()]) {
      if (token.owner !== safeOwner || token.reason !== reason) continue;
      if (!replacing && token.generation > generation) continue;
      this.tokens.delete(token.tokenId);
      this.cancelTimer(token.tokenId);
      changed = true;
    }
    if (generation >= current) this.ownerGeneration.set(safeOwner, generation);
    if (changed) this.publish();
  }

  private currentGeneration(owner: string): number {
    const safeOwner = owner.trim() || "anonymous";
    return this.ownerGeneration.get(safeOwner) ?? 0;
  }

  private cancelTimer(tokenId: string): void {
    const timer = this.timedReleases.get(tokenId);
    if (timer === undefined) return;
    this.timedReleases.delete(tokenId);
    this.bridgeWindow?.clearTimeout(timer);
  }

  private publish(): void {
    const previousPronunciation = this.snapshotValue.reasons.includes("pronunciation");
    const tokens = [...this.tokens.values()].sort((a, b) => a.tokenId.localeCompare(b.tokenId));
    const reasons = [...new Set(tokens.map((token) => token.reason))].sort() as AudioFocusReason[];
    this.snapshotValue = Object.freeze({
      revision: ++this.revision,
      reasons: Object.freeze(reasons),
      tokens: Object.freeze(tokens),
    });
    for (const listener of [...this.listeners]) listener(this.snapshotValue);

    const pronunciation = reasons.includes("pronunciation");
    if (pronunciation !== previousPronunciation) this.postPortalPronunciation(pronunciation);
  }

  private currentWindow(): WindowLike | null {
    return typeof window === "undefined" ? null : window;
  }

  private ensureBrowserBridge(): void {
    const candidate = this.currentWindow();
    if (candidate === this.bridgeWindow) return;
    if (this.bridgeWindow !== null) this.detachBridge(this.bridgeWindow);
    this.bridgeWindow = candidate;
    if (candidate === null) return;
    candidate.addEventListener("space-typing:pronunciation", this.onPronunciation);
    candidate.addEventListener("space-typing:announcer", this.onAnnouncer);
    candidate.addEventListener("space-typing:warning", this.onWarning);
    candidate.addEventListener("pagehide", this.onPageHide);
  }

  private detachBridge(target: WindowLike): void {
    target.removeEventListener("space-typing:pronunciation", this.onPronunciation);
    target.removeEventListener("space-typing:announcer", this.onAnnouncer);
    target.removeEventListener("space-typing:warning", this.onWarning);
    target.removeEventListener("pagehide", this.onPageHide);
  }

  private postPortalPronunciation(active: boolean): void {
    const target = this.bridgeWindow;
    if (target === null || target.parent === undefined || target.parent === target) return;
    const origin = target.location?.origin;
    if (typeof origin !== "string" || origin === "null" || origin === "") return;
    try {
      target.parent.postMessage(
        {
          type: "typing-game:audio-focus",
          gameId: "space-typing",
          sessionId: this.portalSessionId,
          generation: ++this.portalGeneration,
          focus: "pronunciation",
          active,
        },
        origin,
      );
    } catch {
      // Parent integration is optional; local focus must never fail because of it.
    }
  }
}

export const sharedAudioFocus = new AudioFocusManager();
