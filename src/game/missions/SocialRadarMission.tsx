import { useEffect, useRef, useState } from "react";
import { MissionShell } from "../MissionShell";
import { useGaze, inRect } from "../useGaze";
import type { MissionResult } from "../types";

interface Props {
  onComplete: (r: MissionResult) => void;
  onCancel: () => void;
}

const ANIMALS = ["🦊", "🐰", "🦔", "🐻", "🦉", "🐿️"];

interface Critter {
  id: number;
  emoji: string;
  x: number;
  y: number;
  highlighted: boolean;
}

/** 🌟 Social Radar — multiple animal AOIs, highlighted in turn. */
export function SocialRadarMission({ onComplete, onCancel }: Props) {
  const [critters, setCritters] = useState<Critter[]>([]);
  const refs = useRef<Record<number, HTMLDivElement | null>>({});
  const dwell = useRef<Record<number, number>>({});
  const fixations = useRef<{ id: number; ms: number }[]>([]);
  const lastT = useRef(performance.now());
  const lastIn = useRef<number | null>(null);
  const lastInStart = useRef(performance.now());
  const { point } = useGaze(true);

  useEffect(() => {
    const list: Critter[] = ANIMALS.map((emoji, i) => ({
      id: i,
      emoji,
      x: 8 + (i % 3) * 30 + Math.random() * 8,
      y: 18 + Math.floor(i / 3) * 38 + Math.random() * 8,
      highlighted: false,
    }));
    setCritters(list);

    const cycle = setInterval(() => {
      setCritters((prev) =>
        prev.map((c, i, arr) => ({
          ...c,
          highlighted: i === Math.floor((Date.now() / 1500) % arr.length),
        })),
      );
    }, 250);
    return () => clearInterval(cycle);
  }, []);

  useEffect(() => {
    const now = performance.now();
    const dt = now - lastT.current;
    lastT.current = now;
    let inside: number | null = null;
    for (const c of critters) {
      if (inRect(point, refs.current[c.id])) {
        inside = c.id;
        dwell.current[c.id] = (dwell.current[c.id] ?? 0) + dt;
        break;
      }
    }
    if (inside !== lastIn.current) {
      if (lastIn.current !== null) {
        fixations.current.push({
          id: lastIn.current,
          ms: now - lastInStart.current,
        });
      }
      lastIn.current = inside;
      lastInStart.current = now;
    }
  }, [point, critters]);

  return (
    <MissionShell
      id="social"
      durationMs={22000}
      onComplete={onComplete}
      onCancel={onCancel}
      computeMetrics={() => {
        const totals = Object.values(dwell.current);
        const sum = totals.reduce((a, b) => a + b, 0);
        const unique = totals.filter((v) => v > 200).length;
        const avgFix =
          fixations.current.length > 0
            ? fixations.current.reduce((a, b) => a + b.ms, 0) /
              fixations.current.length
            : 0;
        return {
          socialAOIMs: Math.round(sum),
          uniqueAOIs: unique,
          avgFixationMs: Math.round(avgFix),
        };
      }}
    >
      {() => (
        <div className="relative h-full bg-gradient-to-b from-[#fff3c4] to-[#ffd6e0]">
          {critters.map((c) => (
            <div
              key={c.id}
              ref={(el) => {
                refs.current[c.id] = el;
              }}
              className={`absolute flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-card/80 text-6xl shadow-cozy transition-all ${
                c.highlighted ? "animate-pulse-glow scale-110" : ""
              }`}
              style={{ left: `${c.x}%`, top: `${c.y}%` }}
            >
              {c.emoji}
            </div>
          ))}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-card/80 px-5 py-2 text-sm shadow-cozy">
            Look around — say hello to the woodland friends ✨
          </div>
        </div>
      )}
    </MissionShell>
  );
}
