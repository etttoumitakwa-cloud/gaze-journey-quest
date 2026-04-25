import { useEffect, useRef, useState } from "react";
import { MissionShell } from "../MissionShell";
import { useGaze } from "../useGaze";
import type { MissionResult, GazeSample } from "../types";
import echoBg from "@/assets/zone-echo.jpg";
import meadowBg from "@/assets/zone-meadow.jpg";
import forestBg from "@/assets/zone-forest.jpg";

interface Props {
  onComplete: (r: MissionResult) => void;
  onCancel: () => void;
}

const SCENES = [
  { bg: forestBg, line: "A small spark woke in the quiet glade…" },
  { bg: meadowBg, line: "It floated up the hill to find a friend." },
  { bg: echoBg, line: "Lanterns whispered names in the violet night." },
];

/** 🧠 Echo Trail — narrative scene shifts; PI divergence proxy. */
export function EchoTrailMission({ onComplete, onCancel }: Props) {
  const [scene, setScene] = useState(0);
  const samplesRef = useRef<GazeSample[]>([]);
  const sceneCountRef = useRef(0);
  const driftMs = useRef(0);
  const lastT = useRef(performance.now());
  const { point } = useGaze(true);

  useEffect(() => {
    const t = setInterval(() => {
      setScene((s) => (s + 1) % SCENES.length);
      sceneCountRef.current++;
    }, 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!point) return;
    samplesRef.current.push(point);
    const now = performance.now();
    const dt = now - lastT.current;
    lastT.current = now;
    // "drift" = gaze in outer 25% margin of screen
    const m = 0.25;
    if (
      point.x < window.innerWidth * m ||
      point.x > window.innerWidth * (1 - m) ||
      point.y < window.innerHeight * m ||
      point.y > window.innerHeight * (1 - m)
    ) {
      driftMs.current += dt;
    }
  }, [point]);

  // PI divergence proxy: ratio of samples on right half vs left across scene shifts
  const computePI = () => {
    const total = samplesRef.current.length || 1;
    const right = samplesRef.current.filter((s) => s.x > window.innerWidth / 2).length;
    return Math.round((Math.abs(right / total - 0.5) * 200) * 100) / 100;
  };

  return (
    <MissionShell
      id="echo"
      durationMs={20000}
      onComplete={onComplete}
      onCancel={onCancel}
      computeMetrics={() => ({
        piDivergence: computePI(),
        sceneShifts: sceneCountRef.current,
        attentionDriftMs: Math.round(driftMs.current),
      })}
    >
      {() => (
        <div className="relative h-full">
          {SCENES.map((s, i) => (
            <img
              key={i}
              src={s.bg}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 pixel-perfect"
              style={{ opacity: scene === i ? 1 : 0 }}
            />
          ))}
          <div className="absolute bottom-12 left-1/2 max-w-xl -translate-x-1/2 rounded-2xl bg-card/85 px-6 py-4 text-center text-base shadow-cozy">
            <p className="font-pixel text-sm leading-relaxed">{SCENES[scene].line}</p>
          </div>
        </div>
      )}
    </MissionShell>
  );
}
