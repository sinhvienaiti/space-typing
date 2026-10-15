export class AssetPreviewSupersededError extends Error {
  constructor(message = "Asset preview command was superseded by newer input.") {
    super(message);
    this.name = "AssetPreviewSupersededError";
  }
}

/**
 * Serializes stateful preview mutations without letting a rejected mutation
 * poison the lane. Callers own supersession through their generation token so
 * RESET/new LOAD commands can invalidate in-flight work without resurrecting it.
 */
export class AssetPreviewMutationQueue {
  private tail: Promise<void> = Promise.resolve();

  run<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.tail.then(operation, operation);
    this.tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}
