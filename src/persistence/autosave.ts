export type AutosaveWriter<T, R> = (
  value: T,
  reason: string,
) => Promise<R>;

type PendingSave<T> = {
  value: T;
  reason: string;
};

export class AutosaveQueue<T, R> {
  private pending: PendingSave<T> | null = null;
  private chain: Promise<R | null> = Promise.resolve(null);

  constructor(
    private readonly writer: AutosaveWriter<T, R>,
  ) {}

  schedule(value: T, reason: string): void {
    this.pending = { value, reason };
  }

  hasPending(): boolean {
    return this.pending !== null;
  }

  flush(reasonOverride?: string): Promise<R | null> {
    const pending = this.pending;
    if (pending === null) return this.chain;

    this.pending = null;
    const reason = reasonOverride ?? pending.reason;

    this.chain = this.chain
      .catch(() => null)
      .then(() => this.writer(pending.value, reason));

    return this.chain;
  }
}
