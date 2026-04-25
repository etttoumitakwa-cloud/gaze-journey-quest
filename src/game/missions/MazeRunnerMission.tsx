import { useEffect, useRef, useState } from "react";
import { MissionShell } from "../MissionShell";
import { useGaze, gazeEntropy, dispersion, pathLength } from "../useGaze";
import type { MissionResult, GazeSample } from "../types";

interface Props {
  onComplete: (r: MissionResult) => void;
  onCancel: () => void;
}

// Simple grid maze — 1 = wall, 0 = path, 2 = goal
const MAZE = [
  [0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  [1, 0, 1, 0, 1, 1, 1, 1, 1, 0],
  [1, 0, 0, 0, 0, 0, 0, 0, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 0, 1, 0],
  [0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
  [0, 1, 1, 1, 1, 0, 1, 1, 1, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
  [1, 1, 1, 0, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 1, 1, 1, 2],
];

/** 🧩 Maze Runner — eye-controlled token through maze. */
export function MazeRunnerMission({ onComplete, onCancel }: Props) {
  const samplesRef = useRef<GazeSample[]>([]);
  const [pos, setPos] = useState({ r: 0, c: 0 });
  const [reached, setReached] = useState(false);
  const lastMove = useRef(0);
  const { point } = useGaze(true);

  useEffect(() => {
    if (!point) return;
    samplesRef.current.push(point);
    const now = performance.now();
    if (now - lastMove.current < 350) return;

    // Determine which cell the gaze is in (within central maze area)
    const w = window.innerWidth;
    const h = window.innerHeight - 80;
    const size = Math.min(w * 0.7, h * 0.85);
    const left = (w - size) / 2;
    const top = (h - size) / 2 + 40;
    const cell = size / MAZE.length;
    const c = Math.floor((point.x - left) / cell);
    const r = Math.floor((point.y - top) / cell);
    if (r < 0 || r >= MAZE.length || c < 0 || c >= MAZE[0].length) return;

    // Only step to neighboring cells, not walls
    const dr = r - pos.r;
    const dc = c - pos.c;
    if (Math.abs(dr) + Math.abs(dc) === 1 && MAZE[r][c] !== 1) {
      setPos({ r, c });
      lastMove.current = now;
      if (MAZE[r][c] === 2) setReached(true);
    }
  }, [point, pos]);

  return (
    <MissionShell
      id="maze"
      durationMs={25000}
      onComplete={onComplete}
      onCancel={onCancel}
      computeMetrics={() => ({
        entropy: gazeEntropy(samplesRef.current),
        dispersionPx: dispersion(samplesRef.current),
        pathLengthPx: pathLength(samplesRef.current),
      })}
    >
      {() => {
        const w = typeof window !== "undefined" ? window.innerWidth : 1024;
        const h = typeof window !== "undefined" ? window.innerHeight - 80 : 600;
        const size = Math.min(w * 0.7, h * 0.85);
        const cell = size / MAZE.length;
        return (
          <div className="relative flex h-full items-center justify-center">
            <div
              className="relative rounded-2xl bg-card/80 shadow-cozy"
              style={{ width: size, height: size }}
            >
              {MAZE.map((row, r) =>
                row.map((v, c) => (
                  <div
                    key={`${r}-${c}`}
                    className={
                      v === 1
                        ? "absolute rounded-md bg-secondary"
                        : v === 2
                          ? "absolute rounded-md bg-accent shadow-glow"
                          : "absolute"
                    }
                    style={{
                      left: c * cell,
                      top: r * cell,
                      width: cell,
                      height: cell,
                    }}
                  />
                )),
              )}
              {/* Mascot token */}
              <div
                className="absolute flex items-center justify-center rounded-full bg-primary text-2xl shadow-glow transition-all duration-300"
                style={{
                  left: pos.c * cell + cell * 0.15,
                  top: pos.r * cell + cell * 0.15,
                  width: cell * 0.7,
                  height: cell * 0.7,
                }}
              >
                ✨
              </div>
              {reached && (
                <div className="absolute inset-0 flex items-center justify-center text-5xl">
                  🎉
                </div>
              )}
            </div>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-card/80 px-5 py-2 text-sm shadow-cozy">
              Look at the next cell to step there
            </div>
          </div>
        );
      }}
    </MissionShell>
  );
}
