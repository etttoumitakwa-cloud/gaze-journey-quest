/**
 * Gaze tracking — WebGazer wrapper with safe fallback.
 * Provides a singleton API:
 *   - init() loads webgazer (camera) lazily
 *   - subscribe(cb) → unsubscribe
 *   - latest() → {x,y,t} or null
 *   - stop()
 *
 * If webgazer fails (no camera, denied), gaze falls back to mouse position
 * so the rest of the app still works. We surface readiness state.
 */
import type { GazeListener, GazeSample } from "./types";

type State = "idle" | "loading" | "ready" | "fallback" | "error";

class GazeService {
  private state: State = "idle";
  private listeners = new Set<GazeListener>();
  private last: GazeSample | null = null;
  private wg: any = null;
  private mouseHandler = (e: MouseEvent) => {
    const sample = { x: e.clientX, y: e.clientY, t: performance.now() };
    this.last = sample;
    this.listeners.forEach((l) => l(sample));
  };

  getState() {
    return this.state;
  }

  async init(): Promise<State> {
    if (this.state === "ready" || this.state === "fallback") return this.state;
    this.state = "loading";
    try {
      const mod: any = await import("webgazer");
      const webgazer = mod.default ?? mod;
      this.wg = webgazer;
      webgazer.params.showVideoPreview = false;
      webgazer.params.showFaceOverlay = false;
      webgazer.params.showFaceFeedbackBox = false;
      webgazer.params.showPredictionPoints = false;
      await webgazer
        .setRegression("ridge")
        .setGazeListener((data: { x: number; y: number } | null) => {
          if (!data) return;
          const sample = { x: data.x, y: data.y, t: performance.now() };
          this.last = sample;
          this.listeners.forEach((l) => l(sample));
        })
        .begin();
      this.state = "ready";
    } catch (err) {
      console.warn("[gaze] WebGazer failed, using mouse fallback", err);
      window.addEventListener("mousemove", this.mouseHandler);
      this.state = "fallback";
    }
    return this.state;
  }

  /** Force fallback (used when user skips calibration). */
  enableFallback() {
    if (this.state === "fallback") return;
    window.addEventListener("mousemove", this.mouseHandler);
    this.state = "fallback";
  }

  showVideo(show: boolean) {
    if (!this.wg) return;
    try {
      this.wg.params.showVideoPreview = show;
      this.wg.params.showFaceOverlay = show;
      this.wg.params.showFaceFeedbackBox = show;
    } catch {
      /* noop */
    }
  }

  /** Add a calibration sample at screen point (x,y). */
  recordCalibration(x: number, y: number) {
    if (!this.wg) return;
    try {
      // recordScreenPosition expects (x, y, eventType)
      this.wg.recordScreenPosition(x, y, "click");
    } catch {
      /* noop */
    }
  }

  subscribe(cb: GazeListener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  latest(): GazeSample | null {
    return this.last;
  }

  stop() {
    try {
      this.wg?.end?.();
    } catch {
      /* noop */
    }
    window.removeEventListener("mousemove", this.mouseHandler);
    this.listeners.clear();
    this.state = "idle";
  }

  pause() {
    try {
      this.wg?.pause?.();
    } catch {
      /* noop */
    }
  }

  resume() {
    try {
      this.wg?.resume?.();
    } catch {
      /* noop */
    }
  }
}

export const gaze = new GazeService();
