import { useEffect, useMemo, useRef, useState } from "react";
import { MissionShell } from "../MissionShell";
import { useGaze, inRect } from "../useGaze";
import type { MissionResult } from "../types";
import shadowImg from "@/assets/shadow-sprite.png";

interface Props {
  onComplete: (r: MissionResult) => void;
  onCancel: () => void;
}

/* ------------------------------------------------------------------ */
/* Hex grid (odd-r offset, like Catch the Cat)                        */
/* ------------------------------------------------------------------ */
const ROWS = 9;
const COLS = 9;
const DWELL_MS = 900; // gaze hold time to block a tile

type Cell = { r: number; c: number };
const key = (r: number, c: number) => `${r},${c}`;

function neighbors({ r, c }: Cell): Cell[] {
  // odd-r offset hex neighbors
  const odd = r % 2 === 1;
  const deltas = odd
    ? [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]]
    : [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]];
  return deltas
    .map(([dr, dc]) => ({ r: r + dr, c: c + dc }))
    .filter((n) => n.r >= 0 && n.r < ROWS && n.c >= 0 && n.c < COLS);
}

const isEdge = (cell: Cell) =>
  cell.r === 0 || cell.r === ROWS - 1 || cell.c === 0 || cell.c === COLS - 1;

/** BFS: shortest distance from `start` to ANY edge, with the first step taken. */
function distanceToEdge(start: Cell, blocked: Set<string>): { dist: number; next: Cell | null } {
  if (blocked.has(key(start.r, start.c))) return { dist: Infinity, next: null };
  if (isEdge(start)) return { dist: 0, next: null };
  // Each queue entry carries the first-step neighbor it descended from.
  const seen = new Set<string>([key(start.r, start.c)]);
  const q: { cell: Cell; depth: number; first: Cell }[] = [];
  for (const n of neighbors(start)) {
    const k = key(n.r, n.c);
    if (blocked.has(k)) continue;
    seen.add(k);
    if (isEdge(n)) return { dist: 1, next: n };
    q.push({ cell: n, depth: 1, first: n });
  }
  while (q.length) {
    const { cell, depth, first } = q.shift()!;
    for (const n of neighbors(cell)) {
      const k = key(n.r, n.c);
      if (seen.has(k) || blocked.has(k)) continue;
      seen.add(k);
      if (isEdge(n)) return { dist: depth + 1, next: first };
      q.push({ cell: n, depth: depth + 1, first });
    }
  }
  return { dist: Infinity, next: null };
}

/** Pick the shadow's next move: neighbor with smallest distance to edge. */
function chooseShadowMove(pos: Cell, blocked: Set<string>): Cell | null {
  const opts = neighbors(pos).filter((n) => !blocked.has(key(n.r, n.c)));
  if (opts.length === 0) return null;
  let best: Cell = opts[0];
  let bestDist = Infinity;
  for (const o of opts) {
    const { dist } = distanceToEdge(o, blocked);
    if (dist < bestDist) {
      bestDist = dist;
      best = o;
    }
  }
  return bestDist === Infinity ? null : best;
}

/* ------------------------------------------------------------------ */
/* Mission component                                                   */
/* ------------------------------------------------------------------ */
export function TrapShadowMission({ onComplete, onCancel }: Props) {
  const { point } = useGaze(true);
  const boardRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const initialBlocked = useMemo(() => {
    const s = new Set<string>();
    // Sprinkle a few starter blocks (deterministic) so it's not trivial
    const seeds: [number, number][] = [
      [1, 2], [2, 6], [3, 1], [4, 7], [5, 3], [6, 5], [7, 2],
    ];
    seeds.forEach(([r, c]) => s.add(key(r, c)));
    return s;
  }, []);

  const [blocked, setBlocked] = useState<Set<string>>(initialBlocked);
  const [shadow, setShadow] = useState<Cell>({ r: 4, c: 4 });
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [tilesBlocked, setTilesBlocked] = useState(0);
  const [moves, setMoves] = useState(0);

  // Per-tile dwell tracking
  const dwellRef = useRef<{ tile: string | null; t: number }>({ tile: null, t: 0 });
  const [dwellTile, setDwellTile] = useState<string | null>(null);
  const [dwellPct, setDwellPct] = useState(0);
  const lastT = useRef(performance.now());

  // Block a tile + advance the shadow's turn
  const handleBlock = (r: number, c: number) => {
    if (status !== "playing") return;
    const k = key(r, c);
    if (blocked.has(k)) return;
    if (shadow.r === r && shadow.c === c) return;

    const nextBlocked = new Set(blocked);
    nextBlocked.add(k);
    setBlocked(nextBlocked);
    setTilesBlocked((n) => n + 1);

    const move = chooseShadowMove(shadow, nextBlocked);
    if (!move) {
      setStatus("won");
      return;
    }
    setShadow(move);
    setMoves((n) => n + 1);
    if (isEdge(move)) setStatus("lost");
  };

  // Gaze dwell loop
  useEffect(() => {
    if (status !== "playing") return;
    const now = performance.now();
    const dt = now - lastT.current;
    lastT.current = now;

    let hit: string | null = null;
    for (const [k, el] of tileRefs.current) {
      if (inRect(point, el)) {
        hit = k;
        break;
      }
    }

    if (hit && hit === dwellRef.current.tile) {
      dwellRef.current.t += dt;
    } else {
      dwellRef.current = { tile: hit, t: 0 };
    }
    setDwellTile(dwellRef.current.tile);
    setDwellPct(Math.min(100, (dwellRef.current.t / DWELL_MS) * 100));

    if (dwellRef.current.tile && dwellRef.current.t >= DWELL_MS) {
      const [r, c] = dwellRef.current.tile.split(",").map(Number);
      dwellRef.current = { tile: null, t: 0 };
      setDwellPct(0);
      handleBlock(r, c);
    }
  }, [point, status, blocked, shadow]);

  const finishedAt = useRef<number | null>(null);
  useEffect(() => {
    if (status !== "playing" && finishedAt.current === null) {
      finishedAt.current = performance.now();
    }
  }, [status]);

  // Hex tile geometry (for layout only — visuals use CSS clip-path)
  const TILE = 64;
  const ROW_H = 56; // overlapping row height for hex packing
  const colOffset = (r: number) => (r % 2 === 1 ? TILE / 2 : 0);

  return (
    <MissionShell
      id="crystal" /* reuse meta only for shell — overridden below */
      durationMs={45000}
      onComplete={onComplete}
      onCancel={onCancel}
      computeMetrics={() => ({
        tilesBlocked,
        shadowMoves: moves,
        outcome: status === "won" ? 1 : 0,
      })}
    >
      {() => (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
          <div className="text-center">
            <h3 className="font-pixel text-base">Trap the Shadow</h3>
            <p className="text-xs text-muted-foreground">
              Look at a tile to fog it. Don't let the shadow reach the edge.
            </p>
          </div>

          <div
            ref={boardRef}
            className="relative rounded-2xl bg-card/70 p-4 shadow-cozy"
            style={{
              width: COLS * TILE + TILE / 2 + 32,
              height: ROWS * ROW_H + 32,
            }}
          >
            {Array.from({ length: ROWS }).map((_, r) =>
              Array.from({ length: COLS }).map((__, c) => {
                const k = key(r, c);
                const isBlocked = blocked.has(k);
                const isShadow = shadow.r === r && shadow.c === c;
                const isDwelling = dwellTile === k && !isBlocked && !isShadow;
                return (
                  <div
                    key={k}
                    ref={(el) => {
                      if (el) tileRefs.current.set(k, el);
                      else tileRefs.current.delete(k);
                    }}
                    onClick={() => handleBlock(r, c)}
                    className="absolute flex items-center justify-center transition-colors"
                    style={{
                      left: c * TILE + colOffset(r) + 16,
                      top: r * ROW_H + 16,
                      width: TILE,
                      height: TILE,
                      clipPath:
                        "polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)",
                      background: isBlocked
                        ? "color-mix(in oklab, var(--primary) 60%, transparent)"
                        : "color-mix(in oklab, var(--muted) 70%, transparent)",
                      cursor: isBlocked || isShadow ? "default" : "pointer",
                    }}
                  >
                    {isDwelling && (
                      <div
                        className="absolute inset-0 rounded-md ring-2 ring-primary"
                        style={{
                          clipPath:
                            "polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)",
                          background: `color-mix(in oklab, var(--primary) ${Math.round(dwellPct * 0.5)}%, transparent)`,
                        }}
                      />
                    )}
                  </div>
                );
              }),
            )}

            {/* Shadow sprite — tweens between cells via CSS transition */}
            <div
              className="pointer-events-none absolute flex items-center justify-center"
              style={{
                width: TILE,
                height: TILE,
                left: 16,
                top: 16,
                transform: `translate(${shadow.c * TILE + colOffset(shadow.r)}px, ${shadow.r * ROW_H}px)`,
                transition: "transform 280ms cubic-bezier(0.34, 1.3, 0.64, 1)",
              }}
            >
              <img
                src={shadowImg}
                alt=""
                width={48}
                height={48}
                className="pixel-perfect animate-float"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Fogged tiles: <b className="text-foreground">{tilesBlocked}</b></span>
            <span>Shadow moves: <b className="text-foreground">{moves}</b></span>
            {status === "won" && <span className="font-pixel text-secondary-foreground">Trapped! 🎉</span>}
            {status === "lost" && <span className="font-pixel text-destructive">Escaped — try again</span>}
          </div>
        </div>
      )}
    </MissionShell>
  );
}
