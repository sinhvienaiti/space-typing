export class AssetPreviewResourceScope {
  private readonly controller = new AbortController();
  private frame: { id: number; cancel: (id: number) => void } | null = null;
  private readonly disposers = new Set<() => void>();
  private disposed = false;

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  setAnimationFrame(id: number, cancel: (id: number) => void = cancelAnimationFrame): void {
    if (this.disposed) {
      cancel(id);
      return;
    }
    this.frame = { id, cancel };
  }

  addDisposer(dispose: () => void): () => void {
    if (this.disposed) {
      dispose();
      return () => undefined;
    }
    this.disposers.add(dispose);
    return () => this.disposers.delete(dispose);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.controller.abort();
    if (this.frame !== null) {
      this.frame.cancel(this.frame.id);
      this.frame = null;
    }
    for (const dispose of this.disposers) dispose();
    this.disposers.clear();
  }
}
