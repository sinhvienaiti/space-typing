export class CreditHudPresentation {
  private canonical = 0;
  private presented = 0;
  private pending = 0;
  private epoch = 0;
  private initialized = false;

  sync(canonicalBalance: number): number {
    const next = sanitize(canonicalBalance);
    this.canonical = next;
    this.presented = next;
    this.pending = 0;
    this.epoch += 1;
    this.initialized = true;
    return this.presented;
  }

  claimApplied(
    walletDeltaApplied: number,
    canonicalAfter: number,
  ): number {
    const after = sanitize(canonicalAfter);
    const delta = Math.max(0, Math.floor(walletDeltaApplied));
    if (!this.initialized) {
      this.canonical = Math.max(0, after - delta);
      this.presented = this.canonical;
      this.initialized = true;
    }

    const expectedAfter = this.canonical + delta;
    if (after !== expectedAfter) {
      // Another wallet change won the race. Sync rather than letting a stale
      // count-up overwrite the canonical balance later.
      return this.sync(after);
    }

    this.canonical = after;
    this.pending += delta;
    return this.presented;
  }

  present(
    walletDeltaApplied: number,
    canonicalNow: number,
  ): number {
    const current = sanitize(canonicalNow);
    if (!this.initialized || current !== this.canonical) {
      return this.sync(current);
    }

    const requested = Math.max(0, Math.floor(walletDeltaApplied));
    const applied = Math.min(requested, this.pending);
    this.pending -= applied;
    this.presented = Math.min(
      this.canonical,
      this.presented + applied,
    );
    if (this.pending <= 0) {
      this.pending = 0;
      this.presented = this.canonical;
    }
    return this.presented;
  }

  display(canonicalNow: number): number {
    const current = sanitize(canonicalNow);
    if (!this.initialized || current !== this.canonical) {
      return this.sync(current);
    }
    return this.presented;
  }

  pendingDelta(): number {
    return this.pending;
  }

  presentationEpoch(): number {
    return this.epoch;
  }
}

function sanitize(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
}
