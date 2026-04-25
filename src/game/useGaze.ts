import { useEffect, useRef, useState } from "react";
import { gaze } from "./gaze";
import type { GazeSample } from "./types";

/** Hook that gives a live gaze sample (smoothed) and exposes a buffer. */
export function useGaze(active: boolean) {
  const [point, setPoint] = useState<GazeSample | null>(null);
  const bufferRef = useRef<GazeSample[]>([]);

  useEffect(() => {
    if (!active) return;
    const unsub = gaze.subscribe((s) => {
      bufferRef.current.push(s);
      if (bufferRef.current.length > 600) bufferRef.current.shift();
      // Light smoothing
      const last = bufferRef.current.slice(-5);
      const avg = last.reduce(
        (a, b) => ({ x: a.x + b.x, y: a.y + b.y, t: b.t }),
        { x: 0, y: 0, t: 0 },
      );
      setPoint({ x: avg.x / last.length, y: avg.y / last.length, t: avg.t });
    });
    return () => {
      unsub();
    };
  }, [active]);

  return { point, buffer: bufferRef };
}

/** Determine if a gaze point lies inside a DOM element's bounding rect. */
export function inRect(p: GazeSample | null, el: Element | null): boolean {
  if (!p || !el) return false;
  const r = (el as HTMLElement).getBoundingClientRect();
  return p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;
}

/** Shannon entropy of gaze grid distribution (8x8). */
export function gazeEntropy(samples: GazeSample[]): number {
  if (samples.length === 0) return 0;
  const grid = new Map<string, number>();
  const W = window.innerWidth;
  const H = window.innerHeight;
  for (const s of samples) {
    const gx = Math.min(7, Math.floor((s.x / W) * 8));
    const gy = Math.min(7, Math.floor((s.y / H) * 8));
    const key = `${gx},${gy}`;
    grid.set(key, (grid.get(key) ?? 0) + 1);
  }
  const total = samples.length;
  let h = 0;
  for (const c of grid.values()) {
    const p = c / total;
    h -= p * Math.log2(p);
  }
  return Math.round(h * 100) / 100;
}

export function dispersion(samples: GazeSample[]): number {
  if (samples.length === 0) return 0;
  const mx = samples.reduce((s, p) => s + p.x, 0) / samples.length;
  const my = samples.reduce((s, p) => s + p.y, 0) / samples.length;
  const v =
    samples.reduce((s, p) => s + (p.x - mx) ** 2 + (p.y - my) ** 2, 0) /
    samples.length;
  return Math.round(Math.sqrt(v));
}

export function pathLength(samples: GazeSample[]): number {
  let total = 0;
  for (let i = 1; i < samples.length; i++) {
    total += Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y);
  }
  return Math.round(total);
}

export function avgVelocity(samples: GazeSample[]): number {
  if (samples.length < 2) return 0;
  let v = 0,
    n = 0;
  for (let i = 1; i < samples.length; i++) {
    const dt = (samples[i].t - samples[i - 1].t) / 1000;
    if (dt <= 0) continue;
    v += Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y) / dt;
    n++;
  }
  return n ? Math.round(v / n) : 0;
}

export function saccadeCount(samples: GazeSample[], thresholdPx = 60): number {
  let c = 0;
  for (let i = 1; i < samples.length; i++) {
    if (Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y) > thresholdPx) c++;
  }
  return c;
}
