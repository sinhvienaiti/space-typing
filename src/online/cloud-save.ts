import { KEEPALIVE_MAX_BODY, onlineRequest, OnlineError } from "./api";
import type { OnlineSession } from "./session";

/**
 * Cloud copy of the save. Committed local saves are uploaded at most once a
 * minute (Workers Free plan budget), plus once when the tab is hidden or
 * closed (keepalive request, if the save is small enough), with the cloud
 * revision this device last saw. If another device saved in between, the
 * server answers 409 and the player chooses which copy to keep. A brand-new
 * device with no progress simply takes the cloud copy.
 *
 * Works on the whole PlayerSave object the account layer commits; restoring
 * goes through the same explicit-restore path as importing a backup file.
 */
export type CloudSummary = {
  highestUnlockedStage?: unknown;
  clearedStages?: unknown;
  credits?: unknown;
  updatedAt?: unknown;
};

export type CloudConflict = {
  cloud: CloudSummary & { revision: number; updatedAt: string | null };
  local: CloudSummary;
  /** Replace this device's progress with the cloud copy (reloads the game). */
  useCloud(): Promise<void>;
  /** Overwrite the cloud copy with this device (the old one is kept as a backup on the server). */
  useLocal(): Promise<void>;
};

export type CloudSaveHost = {
  /** The latest committed save object, or null before the account loaded. */
  currentSave(): { version: number; [key: string]: unknown } | null;
  /** Restores a save object as a new generation and reloads. */
  restore(save: unknown): Promise<void>;
  /** May uploads run now (not mid-sortie restore, not a read-only tab)? */
  canSync(): boolean;
  conflict(conflict: CloudConflict): void;
  status(text: string, tone: "good" | "warn" | "bad" | "info"): void;
};

const UPLOAD_EVERY_MS = 60_000;

/**
 * What this device knows about the cloud copy (localStorage, per account):
 * the revision it last confirmed, a fingerprint of the save it uploaded,
 * and an upload sent while the page was closing whose answer never came.
 */
type SyncState = { revision: number; uploaded?: string; pending?: { from: number; tag: string; uploaded: string } };

function stateKey(accountId: string): string {
  return "spaceTypingCloudSaveV1:" + accountId;
}

function readState(accountId: string): SyncState {
  try {
    const raw = JSON.parse(localStorage.getItem(stateKey(accountId)) ?? "{}") as Partial<SyncState>;
    const pending = raw.pending;
    return {
      revision: Number(raw.revision ?? 0) || 0,
      ...(typeof raw.uploaded === "string" ? { uploaded: raw.uploaded } : {}),
      ...(pending && typeof pending.tag === "string" && typeof pending.from === "number" && typeof pending.uploaded === "string" ? { pending } : {}),
    };
  } catch {
    return { revision: 0 };
  }
}

/** FNV-1a over the save's JSON: "has this exact save been uploaded already?" */
function fingerprint(save: unknown): string {
  const text = JSON.stringify(save) ?? "";
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return text.length + ":" + (hash >>> 0).toString(36);
}

function uploadTag(): string {
  return [...crypto.getRandomValues(new Uint8Array(12))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function summary(save: Record<string, unknown> | null): CloudSummary {
  const campaign = (save?.campaign ?? {}) as Record<string, unknown>;
  return {
    highestUnlockedStage: campaign.highestUnlockedStage,
    clearedStages: Array.isArray(campaign.clearedStages) ? campaign.clearedStages.length : 0,
    credits: save?.credits,
    updatedAt: save?.updatedAt,
  };
}

/** No campaign progress yet (a new player, or a device that never played). */
function isFreshSummary(value: CloudSummary): boolean {
  const cleared = Number(value.clearedStages ?? 0) || 0;
  const stage = Number(value.highestUnlockedStage ?? 1) || 1;
  return cleared === 0 && stage <= 1;
}

/**
 * Which copy to keep when this device and the cloud disagree. The player is
 * asked only when both copies have campaign progress; otherwise the one with
 * progress wins, and between two fresh copies the one with more Credits
 * (this device on a tie, so no reload).
 */
export function chooseCopy(local: CloudSummary, cloud: CloudSummary): "local" | "cloud" | "ask" {
  const localFresh = isFreshSummary(local);
  const cloudFresh = isFreshSummary(cloud);
  if (localFresh && cloudFresh) return (Number(cloud.credits ?? 0) || 0) > (Number(local.credits ?? 0) || 0) ? "cloud" : "local";
  if (localFresh) return "cloud";
  if (cloudFresh) return "local";
  return "ask";
}

export class CloudSave {
  private revision = 0;
  private accountId: string | null = null;
  private timer = 0;
  private dirty = false;
  private uploading = false;
  private blocked = false;
  private lastUploadAt = 0;
  /** Fingerprint of the save the cloud copy holds (as far as this device knows). */
  private uploaded: string | undefined;

  constructor(
    private readonly session: OnlineSession,
    private readonly host: CloudSaveHost,
  ) {
    session.onChange(() => void this.attach());
    // Leaving the tab or closing it: send what the minute-long wait still holds.
    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("pagehide", () => void this.upload(false, true));
    }
    if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") void this.upload(false, true);
      });
    }
  }

  private remember(pending?: SyncState["pending"]): void {
    if (this.accountId === null) return;
    const state: SyncState = { revision: this.revision, ...(this.uploaded !== undefined ? { uploaded: this.uploaded } : {}), ...(pending ? { pending } : {}) };
    try {
      localStorage.setItem(stateKey(this.accountId), JSON.stringify(state));
    } catch {
      /* Private mode: the next start asks the server again. */
    }
  }

  /** Called when the signed-in account changes: reconcile with the cloud copy. */
  private async attach(): Promise<void> {
    const account = this.session.account;
    if (!this.session.online || account === null) {
      this.accountId = null;
      return;
    }
    if (account.id === this.accountId) return;
    this.accountId = account.id;
    this.blocked = true;
    const known = readState(account.id);
    try {
      const cloud = await onlineRequest<{ revision: number; data: Record<string, unknown>; updatedAt: string; uploadId?: string | null }>("/save");
      const local = this.host.currentSave() as Record<string, unknown> | null;
      // Our page-close upload arrived, or it did not and nobody else saved since: this device wrote last.
      const ours = known.pending !== undefined && cloud.uploadId === known.pending.tag;
      const untouched = known.pending !== undefined ? cloud.revision === known.pending.from : cloud.revision === known.revision;
      if (ours || untouched) {
        this.revision = cloud.revision;
        this.uploaded = ours ? known.pending?.uploaded : known.uploaded;
        this.remember();
        this.blocked = false;
        // Upload only if this device changed the save since the cloud copy was made.
        this.dirty = local !== null && fingerprint(local) !== this.uploaded;
        if (this.dirty) this.schedule(0);
        return;
      }
      const choice = chooseCopy(summary(local), summary(cloud.data));
      if (choice === "cloud") {
        this.revision = cloud.revision;
        this.uploaded = undefined;
        this.remember();
        this.host.status("Loading your cloud save…", "info");
        await this.host.restore(cloud.data);
        return;
      }
      if (choice === "local") {
        // Nothing worth asking about (e.g. two fresh copies): this device's copy goes on top.
        this.revision = cloud.revision;
        this.uploaded = undefined;
        this.remember();
        this.blocked = false;
        this.dirty = true;
        this.schedule(0);
        return;
      }
      this.host.conflict({
        cloud: { ...summary(cloud.data), revision: cloud.revision, updatedAt: cloud.updatedAt },
        local: summary(local),
        useCloud: async () => {
          this.revision = cloud.revision;
          this.uploaded = undefined;
          this.remember();
          await this.host.restore(cloud.data);
        },
        useLocal: async () => {
          this.revision = cloud.revision;
          this.blocked = false;
          await this.upload(true);
        },
      });
    } catch (error) {
      if (error instanceof OnlineError && error.status === 404) {
        // No cloud copy yet: this device becomes it.
        this.revision = 0;
        this.blocked = false;
        this.dirty = true;
        this.schedule(0);
        return;
      }
      this.blocked = false;
      this.host.status("Cloud save unavailable · progress is saved on this device", "warn");
    }
  }

  /** The account layer committed a save. */
  noteCommitted(): void {
    if (this.accountId === null) return;
    this.dirty = true;
    this.schedule();
  }

  private schedule(delay = Math.max(0, UPLOAD_EVERY_MS - (Date.now() - this.lastUploadAt))): void {
    if (this.timer !== 0 || this.blocked) return;
    this.timer = window.setTimeout(() => {
      this.timer = 0;
      void this.upload(false);
    }, delay);
  }

  /**
   * Uploads the committed save. `pageClosing`: sent with keepalive so it can
   * outlive the page; the device notes it first (localStorage), so if the
   * answer never arrives the next start can still tell its own upload apart
   * from another device's.
   */
  async upload(force: boolean, pageClosing = false): Promise<void> {
    if (this.accountId === null || this.uploading || (this.blocked && !force) || (!this.dirty && !force)) return;
    if (!this.host.canSync()) {
      if (!pageClosing) this.schedule(5000);
      return;
    }
    const save = this.host.currentSave();
    if (save === null) return;
    this.uploading = true;
    this.dirty = false;
    window.clearTimeout(this.timer);
    this.timer = 0;
    const print = fingerprint(save);
    const tag = uploadTag();
    const body = { baseRevision: this.revision, saveVersion: save.version, data: save, device: navigator.userAgent.slice(0, 80), uploadId: tag, ...(force ? { force: true } : {}) };
    const keepalive = pageClosing && JSON.stringify(body).length <= KEEPALIVE_MAX_BODY;
    if (keepalive) this.remember({ from: this.revision, tag, uploaded: print });
    try {
      const result = await onlineRequest<{ revision: number }>("/save", { method: "PUT", body, timeoutMs: 30_000, keepalive });
      this.revision = result.revision;
      this.uploaded = print;
      this.lastUploadAt = Date.now();
      this.blocked = false;
      this.remember();
      if (force) this.host.status("✓ Cloud save updated from this device", "good");
    } catch (error) {
      this.dirty = true;
      if (error instanceof OnlineError && error.code === "client-outdated") {
        // An older copy of the game must not overwrite a newer save: stop until the page reloads.
        this.blocked = true;
        this.host.status("Cloud save paused · " + error.message, "bad");
      } else if (error instanceof OnlineError && error.code === "save-conflict") {
        const details = error.details as { revision?: number; summary?: CloudSummary | null; updatedAt?: string } | undefined;
        const choice = details?.summary ? chooseCopy(summary(save as Record<string, unknown>), details.summary) : null;
        if (choice === null) {
          // Two writes met ("at the same moment"): no summary to decide with. Retry on the same
          // base; the next answer is either a success or a conflict with the cloud summary.
          this.schedule(5000);
          return;
        }
        if (choice === "local") {
          this.revision = details?.revision ?? this.revision;
          this.schedule(0);
          return;
        }
        this.blocked = true;
        if (choice === "cloud") {
          try {
            this.host.status("Loading your cloud save…", "info");
            const cloud = await onlineRequest<{ revision: number; data: unknown }>("/save");
            this.revision = cloud.revision;
            this.uploaded = undefined;
            this.remember();
            await this.host.restore(cloud.data);
          } catch {
            this.blocked = false;
            this.host.status("Cloud save unavailable · progress is saved on this device", "warn");
          }
          return;
        }
        this.host.conflict({
          cloud: { ...(details?.summary ?? {}), revision: details?.revision ?? 0, updatedAt: details?.updatedAt ?? null },
          local: summary(save as Record<string, unknown>),
          useCloud: async () => {
            const cloud = await onlineRequest<{ revision: number; data: unknown }>("/save");
            this.revision = cloud.revision;
            this.uploaded = undefined;
            this.remember();
            await this.host.restore(cloud.data);
          },
          useLocal: async () => {
            this.revision = details?.revision ?? this.revision;
            this.blocked = false;
            await this.upload(true);
          },
        });
      } else if (!(error instanceof OnlineError && error.code === "offline")) {
        this.host.status("Cloud save failed · " + (error instanceof Error ? error.message : "try again later"), "warn");
      }
    } finally {
      this.uploading = false;
      if (this.dirty && !this.blocked && !pageClosing) this.schedule();
    }
  }
}
