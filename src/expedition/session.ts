import {
  abandonExpeditionRun,
  beginExpeditionEncounter,
  confirmExpeditionDraft,
  defeatExpeditionRun,
  openExpeditionDraft,
  replayExpeditionBoundary,
  settleExpeditionEncounter,
  type ExpeditionResources,
  type ExpeditionRun,
} from "./core";
import {
  claimExpeditionEnvelope,
  loadExpeditionEnvelope,
  startExpeditionEnvelope,
  writeExpeditionEnvelope,
  type ExpeditionEnvelope,
  type ExpeditionStorage,
} from "./store";

export class ExpeditionStorageAdapter implements ExpeditionStorage {
  private failNextWrite = false;

  constructor(private readonly storage: Storage) {}

  getItem(key: string): string | null {
    return this.storage.getItem(key);
  }

  setItem(key: string, value: string): void {
    if (this.failNextWrite) {
      this.failNextWrite = false;
      throw new Error("Expedition QA storage failure.");
    }
    this.storage.setItem(key, value);
  }

  injectFailureOnce(): void {
    this.failNextWrite = true;
  }
}

export class ExpeditionSession {
  private envelope: ExpeditionEnvelope | null = null;
  private eligibleRelicIds: readonly string[] = [];

  constructor(
    private readonly storage: ExpeditionStorage,
    private readonly writerId: string,
  ) {}

  currentRun(): ExpeditionRun | null {
    return this.envelope?.run ?? null;
  }

  currentRevision(): number | null {
    return this.envelope?.revision ?? null;
  }

  ownsCampaignPersistence(): boolean {
    return this.envelope !== null;
  }

  hasResumableRun(): boolean {
    const loaded = loadExpeditionEnvelope(this.storage);
    return (
      loaded.status === "supported" &&
      loaded.envelope.run.terminal === null
    );
  }

  start(
    runInput: ExpeditionRun,
    eligibleRelicIds: readonly string[],
  ): ExpeditionRun {
    this.eligibleRelicIds = [...eligibleRelicIds];
    const run = openExpeditionDraft(runInput, this.eligibleRelicIds);
    this.envelope = startExpeditionEnvelope(
      this.storage,
      this.writerId,
      run,
    );
    return this.envelope.run;
  }

  resume(
    eligibleRelicIds: readonly string[],
  ): ExpeditionRun | null {
    const loaded = loadExpeditionEnvelope(this.storage);
    if (
      loaded.status !== "supported" ||
      loaded.envelope.run.terminal !== null
    ) {
      return null;
    }

    this.eligibleRelicIds = [...eligibleRelicIds];
    let envelope = claimExpeditionEnvelope(
      this.storage,
      this.writerId,
      loaded.envelope.revision,
    );
    let run = envelope.run;

    if (run.phase === "encounter") {
      const replay = replayExpeditionBoundary(run);
      envelope = writeExpeditionEnvelope(this.storage, {
        writerId: this.writerId,
        expectedRevision: envelope.revision,
        run: replay,
      });
      run = envelope.run;
    } else if (run.phase === "settlement") {
      const draft = openExpeditionDraft(run, this.eligibleRelicIds);
      envelope = writeExpeditionEnvelope(this.storage, {
        writerId: this.writerId,
        expectedRevision: envelope.revision,
        run: draft,
      });
      run = envelope.run;
    } else if (run.phase === "setup") {
      if (
        run.draftOffer !== null &&
        run.draftOffer.confirmedChoiceId !== null
      ) {
        const started = beginExpeditionEncounter(run);
        envelope = writeExpeditionEnvelope(this.storage, {
          writerId: this.writerId,
          expectedRevision: envelope.revision,
          run: started,
        });
      } else {
        const draft = openExpeditionDraft(run, this.eligibleRelicIds);
        envelope = writeExpeditionEnvelope(this.storage, {
          writerId: this.writerId,
          expectedRevision: envelope.revision,
          run: draft,
        });
      }
      run = envelope.run;
    }

    this.envelope = envelope;
    return run;
  }

  confirmDraft(
    choiceId: string,
    replacementRelicId: string | null = null,
  ): ExpeditionRun | null {
    const envelope = this.envelope;
    if (envelope === null) return null;

    const confirmed = confirmExpeditionDraft(
      envelope.run,
      choiceId,
      replacementRelicId,
    );
    if (!confirmed.ok) return null;

    const started = beginExpeditionEncounter(confirmed.run);
    if (started.phase !== "encounter") return null;

    this.envelope = writeExpeditionEnvelope(this.storage, {
      writerId: this.writerId,
      expectedRevision: envelope.revision,
      run: started,
    });
    return this.envelope.run;
  }

  settle(input: {
    score: number;
    accuracy: number;
    resources: ExpeditionResources;
  }): ExpeditionRun | null {
    const envelope = this.envelope;
    if (envelope === null || envelope.run.phase !== "encounter") {
      return null;
    }

    let run = settleExpeditionEncounter(envelope.run, input);
    if (run.phase === "settlement") {
      run = openExpeditionDraft(run, this.eligibleRelicIds);
    }

    this.envelope = writeExpeditionEnvelope(this.storage, {
      writerId: this.writerId,
      expectedRevision: envelope.revision,
      run,
    });
    return this.envelope.run;
  }

  defeat(): ExpeditionRun | null {
    const envelope = this.envelope;
    if (envelope === null || envelope.run.terminal !== null) return null;
    const run = defeatExpeditionRun(envelope.run);
    this.envelope = writeExpeditionEnvelope(this.storage, {
      writerId: this.writerId,
      expectedRevision: envelope.revision,
      run,
    });
    return this.envelope.run;
  }

  abandon(): ExpeditionRun | null {
    const envelope = this.envelope;
    if (envelope === null || envelope.run.terminal !== null) return null;
    const run = abandonExpeditionRun(envelope.run);
    this.envelope = writeExpeditionEnvelope(this.storage, {
      writerId: this.writerId,
      expectedRevision: envelope.revision,
      run,
    });
    return this.envelope.run;
  }

  release(): void {
    this.envelope = null;
    this.eligibleRelicIds = [];
  }
}
