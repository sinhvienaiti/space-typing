import { consumePhoenixCore } from "./death-protection";
import { canSelectCampaignStage } from "../campaign/expansion-state";
import {
  gameDay,
  reconcileWarp,
  spendWarp,
  refuelWarp,
  refuelQuote,
  WarpClock,
  type RefuelQuote,
} from "../economy/warp-charge";
import {
  isValidAccountState,
  isValidSortieContext,
  newIdentity,
  type AccountIntent,
  type AccountState,
  type SortieContext,
  type WriteTicket,
  type SessionCapability,
} from "./account-state";
import {
  loadPlayerSave,
  readCanonicalPlayerSave,
  validateAccountAuxiliary,
  playerSaveTransaction,
  savePlayerRecoveryMirrorSync,
  PLAYER_SAVE_VERSION,
  UnsupportedPlayerSaveVersionError,
  type LoadedPlayerSave,
  type PlayerSave,
} from "./player-save";

export type AccountView = Omit<PlayerSave, "account">;
export type AttemptTransition = "cleared" | "defeat-pending";
/** One canonical writer per origin, plus transaction fencing if a suspended tab wakes later. */
export class AccountTransactions {
  private state: AccountState | null = null;
  private clock: WarpClock | null = null;
  private releaseLock: (() => void) | null = null;
  private writable = false;
  private sequence = 0;
  private intentSequence = 0;
  private pending = 0;
  private chain: Promise<unknown> = Promise.resolve();
  private channel: BroadcastChannel | null = null;
  private refreshing = false;
  private refreshAgain = false;
  readonly writerId = newIdentity();
  constructor(
    private committed: (save: PlayerSave) => void = () => {},
    private locks: LockManager | undefined = globalThis.navigator?.locks,
  ) {}
  canWrite(): boolean {
    return this.writable;
  }
  busy(): boolean {
    return this.pending > 0;
  }
  account(): AccountState | null {
    return this.state && structuredClone(this.state);
  }
  now(): number {
    return this.clock?.now() ?? Date.now();
  }
  private publish(save: PlayerSave): void {
    this.state = structuredClone(save.account);
    if (!this.writable)
      this.clock = new WarpClock(save.account.warp.watermarkMs);
    try {
      savePlayerRecoveryMirrorSync(save);
    } catch {
      /* Mirror failure never refunds a canonical commit. */
    }
    try {
      this.committed(save);
    } catch (error) {
      console.error(
        "Account committed, but the view could not refresh.",
        error,
      );
    }
    if (this.writable) {
      try {
        this.channel?.postMessage({
          revision: save.account.revision,
          generation: save.account.generation,
        });
      } catch {
        /* Notification is advisory; IDB fencing remains authoritative. */
      }
    }
  }
  async initialize(): Promise<LoadedPlayerSave> {
    const loaded = await loadPlayerSave();
    this.state = structuredClone(loaded.save.account);
    this.clock = new WarpClock(this.state.warp.watermarkMs);
    this.writable = loaded.source === "indexeddb" && (await this.acquire());
    this.subscribe();
    if (!this.writable) {
      this.committed(loaded.save);
      return loaded;
    }
    let interrupted = false;
    let save: PlayerSave;
    try {
      save = await playerSaveTransaction((stored) => {
        const s = readCanonicalPlayerSave(stored),
          a = s.account;
        a.owner = this.writerId;
        a.fence++;
        a.barrier++;
        a.writeSequence = a.intentSequence = 0;
        a.warp = reconcileWarp(a.warp, this.now());
        if (a.attempt && a.attempt.phase !== "prepared") {
          interrupted = true;
          a.attempt = null;
        }
        a.revision++;
        return s;
      });
    } catch (error) {
      this.close();
      throw error;
    }
    this.publish(save);
    return {
      ...loaded,
      save,
      recoveryMode: "none",
      interrupted,
    } as LoadedPlayerSave & { interrupted: boolean };
  }
  private async acquire(): Promise<boolean> {
    if (!this.locks) return false;
    return new Promise((resolve) => {
      void this.locks!.request(
        "space-typing-account-writer",
        { ifAvailable: true },
        async (lock) => {
          resolve(!!lock);
          if (lock)
            await new Promise<void>((release) => {
              this.releaseLock = release;
            });
        },
      ).catch(() => resolve(false));
    });
  }
  private subscribe(): void {
    if (this.channel || typeof window.BroadcastChannel !== "function") return;
    try {
      const channel = (this.channel = new window.BroadcastChannel(
        "space-typing-account-committed",
      ));
      channel.onmessage = () => {
        if (this.writable) return;
        this.refreshAgain = true;
        if (this.refreshing) return;
        this.refreshing = true;
        void (async () => {
          do {
            this.refreshAgain = false;
            const loaded = await loadPlayerSave();
            if (this.channel === channel && loaded.source === "indexeddb")
              this.publish(loaded.save);
          } while (this.refreshAgain && this.channel === channel);
        })()
          .catch(() => {
            /* A failed refresh cannot replace the last committed view. */
          })
          .finally(() => {
            this.refreshing = false;
          });
      };
    } catch {
      /* BroadcastChannel may be unavailable in private browsing. */
    }
  }
  close(): void {
    this.writable = false;
    this.releaseLock?.();
    this.releaseLock = null;
    this.channel?.close();
    this.channel = null;
  }
  ticket(capability: SessionCapability = "account"): WriteTicket {
    if (!this.state) throw new Error("Account not initialized");
    return {
      generation: this.state.generation,
      fence: this.state.fence,
      barrier: this.state.barrier,
      sequence: ++this.sequence,
      capability,
    };
  }
  intent(): AccountIntent {
    if (!this.state) throw new Error("Account not initialized");
    return {
      id: newIdentity(),
      generation: this.state.generation,
      fence: this.state.fence,
      sequence: ++this.intentSequence,
    };
  }
  private check(s: PlayerSave, generation: string, fence: number): void {
    if (
      !this.writable ||
      s.account.generation !== generation ||
      s.account.owner !== this.writerId ||
      s.account.fence !== fence
    )
      throw new Error(
        "Account changed in another tab. Reload; Practice remains free.",
      );
  }
  private enqueue(run: () => Promise<PlayerSave>): Promise<PlayerSave> {
    this.pending++;
    const task = this.chain
      .catch(() => {})
      .then(run)
      .then((save) => {
        this.publish(save);
        return save;
      });
    this.chain = task;
    return task.finally(() => {
      this.pending--;
    });
  }
  private transaction(
    intent: AccountIntent,
    kind: string,
    payload: unknown,
    mutate: (save: PlayerSave) => void,
  ): Promise<PlayerSave> {
    // Snapshot caller-owned identity before the queue/digest yields.
    intent = structuredClone(intent);
    const serialized = new TextEncoder().encode(
      JSON.stringify({ kind, payload }),
    );
    return this.enqueue(async () => {
      const digest = await crypto.subtle.digest("SHA-256", serialized);
      const fingerprint = [...new Uint8Array(digest)]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
      return playerSaveTransaction((stored) => {
        const s = readCanonicalPlayerSave(stored);
        this.check(s, intent.generation, intent.fence);
        const a = s.account,
          prior = a.receipts.find((r) => r.id === intent.id);
        if (prior) {
          if (prior.fingerprint !== fingerprint)
            throw new Error("Request ID reused for a different operation");
          return s;
        }
        if (
          !Number.isSafeInteger(intent.sequence) ||
          intent.sequence <= a.intentSequence
        )
          throw new Error("Expired account request");
        if (kind !== "clock-recovery")
          a.warp = reconcileWarp(a.warp, this.now());
        mutate(s);
        a.intentSequence = intent.sequence;
        a.barrier++;
        a.revision++;
        a.receipts.push({
          id: intent.id,
          fingerprint,
          kind,
          revision: a.revision,
        });
        a.receipts = a.receipts.slice(-64);
        s.updatedAt = new Date().toISOString();
        if (!isValidAccountState(a))
          throw new Error("Account invariant failed");
        return s;
      });
    });
  }
  save(
    view: AccountView,
    ticket: WriteTicket,
    attemptId: string | null,
    transition?: AttemptTransition,
    grants: string[] = [],
  ): Promise<PlayerSave> {
    const frozen = structuredClone(view);
    return this.enqueue(() =>
      playerSaveTransaction((stored) => {
        const s = readCanonicalPlayerSave(stored);
        this.check(s, ticket.generation, ticket.fence);
        const a = s.account;
        if (!["account", "rewarded"].includes(ticket.capability))
          throw new Error("This session can save learning only");
        validateAccountAuxiliary(frozen.auxiliary);
        if (
          ticket.barrier !== a.barrier ||
          ticket.sequence <= a.writeSequence ||
          (a.attempt?.id ?? null) !== attemptId
        )
          throw new Error("Stale autosave rejected");
        if (
          transition &&
          a.attempt?.phase !== "active" &&
          !(
            transition === "defeat-pending" &&
            a.attempt?.phase === "defeat-pending"
          )
        )
          throw new Error("Attempt already settled");
        if (a.attempt?.phase === "prepared")
          throw new Error(
            "Activate the prepared sortie before saving encounter mutations",
          );
        a.warp = reconcileWarp(a.warp, this.now());
        a.writeSequence = ticket.sequence;
        a.revision++;
        if (transition === "cleared") {
          a.receipts.push({
            id: `${attemptId}:clear`,
            fingerprint: "cleared",
            kind: "clear",
            revision: a.revision,
          });
          a.receipts = a.receipts.slice(-64);
          a.attempt = null;
          a.barrier++;
        } else if (transition === "defeat-pending" && a.attempt)
          a.attempt.phase = "defeat-pending";
        for (const key of grants) {
          if (a.milestoneGrants.includes(key))
            throw new Error("Milestone reward already committed");
          a.milestoneGrants.push(key);
        }
        const next = { ...frozen, version: s.version, account: a };
        if (!isValidAccountState(a))
          throw new Error("Account invariant failed");
        return next;
      }),
    );
  }
  admit(context: SortieContext, intent = this.intent()): Promise<PlayerSave> {
    context = structuredClone(context);
    return this.transaction(intent, "admit", context, (s) => {
      if (!isValidSortieContext(context))
        throw new Error("Invalid sortie context");
      const a = s.account;
      if (a.attempt) {
        if (
          a.attempt.phase === "prepared" &&
          JSON.stringify(a.attempt.context) === JSON.stringify(context)
        )
          return;
        throw new Error("Finish or abandon the current sortie first");
      }
      if (
        context.tier !== s.ascension.selectedTier ||
        context.stage > s.campaign.highestUnlockedStage ||
        (context.tier > 0 &&
          context.stage >
            (s.ascension.frontierByTier[String(context.tier)] ?? 1)) ||
        (context.activity === "campaign" &&
          !canSelectCampaignStage(
            s.campaign,
            s.campaignExpansion,
            context.stage,
          ))
      )
        throw new Error("Stage is not unlocked");
      if (context.activity === "hidden" && !s.hiddenDiscovery.encounter?.active)
        throw new Error("Hidden route is no longer active");
      const cost = spendWarp(a.warp, this.now());
      a.warp = cost.warp;
      a.attempt = {
        id: intent.id,
        context: structuredClone(context),
        phase: "prepared",
        activeCost: cost.active,
        reserveCost: cost.reserve,
        reviveSequence: 0,
      };
    });
  }
  activate(
    id: string,
    context: SortieContext,
    intent = this.intent(),
  ): Promise<PlayerSave> {
    context = structuredClone(context);
    return this.transaction(intent, "activate", { id, context }, (s) => {
      const a = s.account.attempt;
      if (
        !a ||
        a.id !== id ||
        a.phase !== "prepared" ||
        JSON.stringify(a.context) !== JSON.stringify(context)
      )
        throw new Error("Prepared sortie context changed");
      a.phase = "active";
    });
  }
  finish(
    kind: "failed" | "abandoned",
    id: string,
    intent = this.intent(),
  ): Promise<PlayerSave> {
    return this.transaction(intent, kind, { id }, (s) => {
      if (s.account.attempt?.id !== id)
        throw new Error("Sortie already closed");
      s.account.attempt = null;
    });
  }
  revive(id: string, intent = this.intent()): Promise<PlayerSave> {
    return this.transaction(intent, "phoenix", { id }, (s) => {
      if (
        s.account.attempt?.id !== id ||
        s.account.attempt.phase !== "defeat-pending"
      )
        throw new Error("Phoenix needs the current defeated encounter");
      const result = consumePhoenixCore(s);
      if (!result.applied) throw new Error("No Phoenix Core available");
      s.inventory = result.state.inventory;
      s.account.attempt.phase = "active";
      s.account.attempt.reviveSequence++;
    });
  }
  quote(): RefuelQuote {
    if (!this.state) throw new Error("Account not initialized");
    return refuelQuote(this.state.warp, this.now());
  }
  refuel(quote: RefuelQuote, intent = this.intent()): Promise<PlayerSave> {
    quote = { ...quote };
    return this.transaction(intent, "refuel", quote, (s) => {
      if (s.account.attempt)
        throw new Error("Refuel is available after the sortie ends");
      const result = refuelWarp(
        s.account.warp,
        this.now(),
        s.expansionCurrencies.starCrystal,
        quote,
      );
      s.account.warp = result.warp;
      s.expansionCurrencies.starCrystal = result.crystals;
    });
  }
  reserveConsent(
    consent: boolean,
    intent = this.intent(),
  ): Promise<PlayerSave> {
    return this.transaction(intent, "reserve-consent", consent, (s) => {
      if (s.account.attempt)
        throw new Error("Change Reserve consent between sorties");
      s.account.warp.reserveConsent = consent;
    });
  }
  updateAuxiliary(
    auxiliary: PlayerSave["auxiliary"],
    intent = this.intent(),
  ): Promise<PlayerSave> {
    const frozen = structuredClone(auxiliary);
    validateAccountAuxiliary(frozen);
    return this.transaction(intent, "expedition-profile", frozen, (s) => {
      if (s.account.attempt)
        throw new Error(
          "End the Campaign sortie before Expedition progression",
        );
      s.auxiliary = { ...s.auxiliary, ...frozen };
    });
  }
  reanchor(intent = this.intent()): Promise<PlayerSave> {
    return this.transaction(intent, "clock-recovery", {}, (s) => {
      if (s.account.attempt)
        throw new Error("Clock recovery is available between sorties");
      const wall = Date.now();
      s.account.warp.watermarkMs = wall;
      s.account.warp.day = gameDay(wall); // Keep today's used quota; recovery never grants fuel.
    }).then((s) => {
      this.clock = new WarpClock(s.account.warp.watermarkMs);
      return s;
    });
  }
  restore(
    imported: PlayerSave,
    legacy = false,
    intent = this.intent(),
  ): Promise<PlayerSave> {
    const frozen = structuredClone(imported);
    return this.transaction(
      intent,
      "explicit-backup-restore",
      { imported: frozen, legacy },
      (s) => {
        if (s.account.attempt)
          throw new Error("End the sortie before restoring a backup");
        const account = s.account,
          oldAccount = structuredClone(frozen.account);
        oldAccount.receipts = [];
        oldAccount.writeSequence = 0;
        oldAccount.intentSequence = 0;
        if (legacy) oldAccount.warp = structuredClone(account.warp); // An old backup cannot repeat the migration grant.
        Object.assign(s, frozen);
        // A user-confirmed whole-profile rollback starts a new generation; it is never a fuel transfer.
        Object.assign(account, oldAccount, {
          generation: newIdentity(),
          owner: this.writerId,
          fence: account.fence,
          barrier: account.barrier,
          revision: account.revision,
          attempt: null,
        });
        s.account = account;
      },
    ).then((s) => {
      this.sequence = s.account.writeSequence;
      this.intentSequence = s.account.intentSequence;
      this.clock = new WarpClock(s.account.warp.watermarkMs);
      return s;
    });
  }
  /** An explicit recovery UI is required; this path never replaces a valid canonical account. */
  async recover(imported: PlayerSave, legacy = false): Promise<PlayerSave> {
    if (legacy)
      throw new Error(
        "Recover with a current-version backup. Legacy backups cannot restore Warp balances.",
      );
    if (!(await this.acquire()))
      throw new Error(
        "Close the account's other tab before recovery. Web Locks are required.",
      );
    this.writable = true;
    this.subscribe();
    try {
      const save = await playerSaveTransaction((stored) => {
        const raw = stored as Partial<PlayerSave> | undefined;
        if (raw?.version && raw.version > PLAYER_SAVE_VERSION)
          throw new UnsupportedPlayerSaveVersionError(raw.version);
        if (
          raw?.version === PLAYER_SAVE_VERSION &&
          isValidAccountState(raw.account)
        )
          throw new Error(
            "A valid canonical account exists. Reload before restoring it.",
          );
        const next = structuredClone(imported),
          a = next.account;
        a.generation = newIdentity();
        a.owner = this.writerId;
        a.fence++;
        a.barrier++;
        a.revision++;
        a.attempt = null;
        a.receipts = [];
        a.writeSequence = a.intentSequence = 0;
        if (!isValidAccountState(a))
          throw new Error("Recovery backup has invalid account data");
        return next;
      });
      this.clock = new WarpClock(save.account.warp.watermarkMs);
      this.sequence = this.intentSequence = 0;
      this.publish(save);
      return save;
    } catch (error) {
      this.close();
      throw error;
    }
  }
}
