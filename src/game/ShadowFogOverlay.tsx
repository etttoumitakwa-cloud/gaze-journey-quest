import { useEffect, useRef } from "react";
import { useGaze } from "./useGaze";

interface Props {
  active: boolean;
  /** 0..1 — overall fog density. Lowers as more missions are completed. */
  density?: number;
}

/**
 * Shadow Fog: a soft cool-toned veil over the world that clears wherever
 * the child looks. Implemented as a canvas; the gaze point punches a soft
 * "hole" into the fog (destination-out compositing), and the hole slowly
 * fades back so the child is gently encouraged to keep looking around.
 *
 * Calm, low-arousal colors only.
 */
export function ShadowFogOverlay({ active, density = 0.55 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { point } = useGaze(active);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const ctx = canvas.getContext("2d")!;

    const draw = () => {
      const { width: w, height: h } = canvas;

      // Cleared areas stay cleared — no re-fogging.
      // Just punch a soft hole around the current gaze point.
      const p = lastPoint.current;
      if (p) {
        const radius = 170;
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
        grd.addColorStop(0, "rgba(0,0,0,1)");
        grd.addColorStop(0.6, "rgba(0,0,0,0.5)");
        grd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";
      rafRef.current = requestAnimationFrame(draw);
    };

    // initial fill
    ctx.fillStyle = `rgba(190, 205, 220, ${density})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, density]);

  // keep latest gaze point for the RAF loop
  useEffect(() => {
    if (point) lastPoint.current = { x: point.x, y: point.y };
  }, [point]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[40]"
      aria-hidden
    />
  );
}
