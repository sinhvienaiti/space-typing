import {
  abandonExpeditionRun,
  beginExpeditionEncounter,
  confirmExpeditionDraft,
  defeatExpeditionRun,
  markExpeditionRestBoundary,
  openExpeditionDraft,
  replayExpeditionBoundary,
  resolveExpeditionRest,
  settleExpeditionEncounter,
  type ExpeditionResources,
  type ExpeditionRestChoice,
  type ExpeditionRun,
} from "./core";
import {
  shouldDraftBeforeEncounter,
  shouldRestAfterEncounter,
} from "../expansion-v2/expedition-plan";
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

function setupBoundary(run: ExpeditionRun): ExpeditionRun {
  return {
    ...run,
    phase: "setup",
    draftOffer: null,
  };
}

function prepareAfterSettlement(
  run: ExpeditionRun,
  eligibleRelicIds: readonly string[],
): ExpeditionRun {
  if (run.terminal !== null || run.phase !== "settlement") return run;

  const clearedEncounterIndex = Math.max(0, run.currentEncounterIndex - 1);
  if (shouldRestAfterEncounter(clearedEncounterIndex)) {
    return markExpeditionRestBoundary(run);
  }
  if (shouldDraftBeforeEncounter(run.currentEncounterIndex)) {
    return openExpeditionDraft(run, eligibleRelicIds);
  }
  return setupBoundary(run);
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
    const run = shouldDraftBeforeEncounter(runInput.currentEncounterIndex)
      ? openExpeditionDraft(runInput, this.eligibleRelicIds)
      : setupBoundary(runInput);
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
      run = replayExpeditionBoundary(run);
      envelope = writeExpeditionEnvelope(this.storage, {
        writerId: this.writerId,
        expectedRevision: envelope.revision,
        run,
      });
    } else if (run.phase === "settlement") {
      run = prepareAfterSettlement(run, this.eligibleRelicIds);
      envelope = writeExpeditionEnvelope(this.storage, {
        writerId: this.writerId,
        expectedRevision: envelope.revision,
        run,
      });
    }

    this.envelope = envelope;
    return envelope.run;
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

  continueEncounter(): ExpeditionRun | null {
    const envelope = this.envelope;
    if (
      envelope === null ||
      envelope.run.terminal !== null ||
      envelope.run.phase !== "setup"
    ) {
      return null;
    }
    const started = beginExpeditionEncounter(envelope.run);
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
    activeSeconds?: number;
  }): ExpeditionRun | null {
    const envelope = this.envelope;
    if (envelope === null || envelope.run.phase !== "encounter") {
      return null;
    }

    let run = settleExpeditionEncounter(envelope.run, input);
    run = prepareAfterSettlement(run, this.eligibleRelicIds);

    this.envelope = writeExpeditionEnvelope(this.storage, {
      writerId: this.writerId,
      expectedRevision: envelope.revision,
      run,
    });
    return this.envelope.run;
  }

  resolveRest(choice: ExpeditionRestChoice): ExpeditionRun | null {
    const envelope = this.envelope;
    if (
      envelope === null ||
      envelope.run.terminal !== null ||
      envelope.run.phase !== "rest"
    ) {
      return null;
    }

    let run = resolveExpeditionRest(envelope.run, choice);
    if (run.phase === "rest") return null;
    run = prepareAfterSettlement(run, this.eligibleRelicIds);

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

  testForcePhase(
    phase: "draft" | "rest" | "encounter" | "defeat",
    eligibleRelicIds: readonly string[] = this.eligibleRelicIds,
  ): ExpeditionRun | null {
    const envelope = this.envelope;
    if (envelope === null || envelope.run.terminal !== null) return null;

    this.eligibleRelicIds = [...eligibleRelicIds];
    let run = envelope.run;

    if (phase === "draft") {
      const boundary: ExpeditionRun = {
        ...run,
        phase: run.completedEncounters === 0 ? "setup" : "settlement",
        draftOffer: null,
        terminal: null,
      };
      run = openExpeditionDraft(boundary, this.eligibleRelicIds);
    } else if (phase === "rest") {
      const boundary: ExpeditionRun = {
        ...run,
        phase: "settlement",
        draftOffer: null,
        terminal: null,
      };
      run = markExpeditionRestBoundary(boundary);
    } else if (phase === "encounter") {
      if (run.phase !== "encounter") {
        let boundary = setupBoundary({
          ...run,
          terminal: null,
        });
        if (shouldDraftBeforeEncounter(boundary.currentEncounterIndex)) {
          const draft = openExpeditionDraft(
            boundary,
            this.eligibleRelicIds,
          );
          const choice = draft.draftOffer?.choices[0];
          if (choice === undefined) return null;
          const replacementRelicId =
            draft.relics.equipped.length >= draft.relics.maxEquipped
              ? draft.relics.equipped[0] ?? null
              : null;
          const confirmed = confirmExpeditionDraft(
            draft,
            choice.id,
            replacementRelicId,
          );
          if (!confirmed.ok) return null;
          boundary = confirmed.run;
        }
        run = beginExpeditionEncounter(boundary);
      }
    } else {
      run = defeatExpeditionRun({
        ...run,
        phase: "encounter",
        draftOffer: null,
        terminal: null,
      });
    }

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
