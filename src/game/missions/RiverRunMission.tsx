import { useEffect, useRef, useState } from "react";
import { MissionShell } from "../MissionShell";
import { useGaze, avgVelocity, saccadeCount } from "../useGaze";
import type { MissionResult, GazeSample } from "../types";
import leafImg from "@/assets/item-leaf.png";

interface Props {
  onComplete: (r: MissionResult) => void;
  onCancel: () => void;
}

interface Leaf {
  id: number;
  x: number;
  y: number;
  vx: number;
}

/** 🌊 River Run — saccade + smooth pursuit. */
export function RiverRunMission({ onComplete, onCancel }: Props) {
  const [leaves, setLeaves] = useState<Leaf[]>([]);
  const samplesRef = useRef<GazeSample[]>([]);
  const pursuitMs = useRef(0);
  const lastT = useRef(performance.now());
  const { point } = useGaze(true);

  useEffect(() => {
    samplesRef.current = [];
    let id = 0;
    const spawn = setInterval(() => {
      setLeaves((prev) => [
        ...prev.filter((l) => l.x < window.innerWidth + 100),
        {
          id: id++,
          x: -80,
          y: Math.random() * (window.innerHeight - 240) + 140,
          vx: 60 + Math.random() * 50,
        },
      ]);
    }, 700);

    let raf = 0;
    let lastFrame = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = (now - lastFrame) / 1000;
      lastFrame = now;
      setLeaves((prev) =>
        prev.map((l) => ({ ...l, x: l.x + l.vx * dt })),
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      clearInterval(spawn);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (!point) return;
    samplesRef.current.push(point);
    const now = performance.now();
    const dt = now - lastT.current;
    lastT.current = now;
    // Smooth pursuit ≈ tracking a leaf within ~80px while moving
    const near = leaves.find(
      (l) => Math.hypot(l.x + 30 - point.x, l.y + 30 - point.y) < 80,
    );
    if (near) pursuitMs.current += dt;
  }, [point, leaves]);

  return (
    <MissionShell
      id="river"
      durationMs={22000}
      onComplete={onComplete}
      onCancel={onCancel}
      computeMetrics={() => ({
        saccadeCount: saccadeCount(samplesRef.current),
        avgVelocity: avgVelocity(samplesRef.current),
        smoothPursuitMs: Math.round(pursuitMs.current),
      })}
    >
      {() => (
        <div className="relative h-full bg-gradient-to-b from-[#bce4f0] to-[#8dd1e6]">
          {leaves.map((l) => (
            <img
              key={l.id}
              src={leafImg}
              alt=""
              width={60}
              height={60}
              className="pointer-events-none absolute pixel-perfect drop-shadow-md"
              style={{ left: l.x, top: l.y, transform: `rotate(${l.x / 6}deg)` }}
            />
          ))}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-card/80 px-5 py-2 text-sm shadow-cozy">
            Follow the drifting leaves with your eyes 🌸
          </div>
        </div>
      )}
    </MissionShell>
  );
}
