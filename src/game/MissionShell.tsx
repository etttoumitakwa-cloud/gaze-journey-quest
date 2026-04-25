import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { MissionId, MissionResult } from "./types";
import { missionById } from "./missions";

interface Props {
  id: MissionId;
  durationMs?: number;
  children: (api: { elapsedMs: number; done: boolean }) => ReactNode;
  computeMetrics: () => Record<string, number>;
  onComplete: (result: MissionResult) => void;
  onCancel: () => void;
}

export function MissionShell({
  id,
  durationMs = 20000,
  children,
  computeMetrics,
  onComplete,
  onCancel,
}: Props) {
  const meta = missionById(id);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const startedAt = useRef(Date.now());
  const completedRef = useRef(false);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const e = Date.now() - startedAt.current;
      setElapsed(e);
      if (e >= durationMs && !completedRef.current) {
        completedRef.current = true;
        setDone(true);
        const metrics = computeMetrics();
        const result: MissionResult = {
          id,
          startedAt: startedAt.current,
          durationMs: e,
          metrics,
        };
        setTimeout(() => onComplete(result), 1200);
      } else if (!completedRef.current) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = Math.min(100, (elapsed / durationMs) * 100);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-soft-gradient">
      <div className="flex items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{meta.emoji}</span>
          <div>
            <h2 className="font-pixel text-base">{meta.title}</h2>
            <p className="text-xs text-muted-foreground">{meta.goal}</p>
          </div>
        </div>
        <div className="flex flex-1 items-center gap-3 max-w-md">
          <Progress value={pct} className="h-2" />
          <span className="font-mono text-xs text-muted-foreground">
            {Math.ceil((durationMs - elapsed) / 1000)}s
          </span>
        </div>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Exit
        </Button>
      </div>
      <div className="relative flex-1 overflow-hidden">
        {children({ elapsedMs: elapsed, done })}
        {done && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <div className="rounded-3xl bg-card px-10 py-8 text-center shadow-glow">
              <div className="text-5xl">✨</div>
              <p className="mt-2 font-pixel text-lg">Nice!</p>
              <p className="text-sm text-muted-foreground">Mission complete</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
