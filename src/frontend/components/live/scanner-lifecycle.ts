export type CameraPhase = "idle" | "starting" | "active" | "stopping";
export type CameraEngine = { isScanning: boolean; stop(): Promise<unknown> };

/** Serialize camera ownership across permission prompts, scan callbacks and unmount. */
export class CameraLifecycle {
  private phase: CameraPhase = "idle";
  private engine: CameraEngine | undefined;
  private starting: Promise<void> | undefined;
  private stopping: Promise<void> | undefined;
  private stopRequested = false;
  disposed = false;
  constructor(private readonly onPhase: (phase: CameraPhase) => void) {}
  private setPhase(phase: CameraPhase): void { this.phase = phase; if (!this.disposed) this.onPhase(phase); }
  async start(createAndStart: () => Promise<CameraEngine>): Promise<boolean> {
    if (this.disposed || this.phase !== "idle") return false;
    this.stopRequested = false;
    this.setPhase("starting");
    this.starting = (async () => {
      try {
        this.engine = await createAndStart();
        if (!this.disposed && !this.stopRequested) this.setPhase("active");
      } catch (error) {
        if (!this.disposed && !this.stopRequested) this.setPhase("idle");
        throw error;
      }
    })();
    await this.starting;
    return !this.disposed && !this.stopRequested;
  }
  stop(): Promise<void> {
    if (this.stopping) return this.stopping;
    this.stopRequested = true;
    this.setPhase("stopping");
    this.stopping = (async () => {
      await this.starting?.catch(() => {});
      try { if (this.engine?.isScanning) await this.engine.stop(); }
      finally {
        this.starting = undefined;
        if (!this.engine?.isScanning) this.engine = undefined;
        this.setPhase(this.engine ? "active" : "idle");
      }
    })().finally(() => { this.stopping = undefined; });
    return this.stopping;
  }
  dispose(): void { this.disposed = true; void this.stop().catch(() => {}); }
}

/** Keep repeated camera frames and repeated manual submits from creating duplicate actions. */
export class ScanDelivery {
  private readonly accepted = new Set<string>();
  deliver(token: string, callback: (token: string) => void): boolean {
    if (this.accepted.has(token)) return false;
    this.accepted.add(token);
    try { callback(token); }
    catch (error) { this.accepted.delete(token); throw error; }
    return true;
  }
}
