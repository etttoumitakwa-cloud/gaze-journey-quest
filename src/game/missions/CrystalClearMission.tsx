import { useEffect, useRef } from "react";
import { MissionShell } from "../MissionShell";
import { useGaze, inRect } from "../useGaze";
import type { MissionResult } from "../types";
import crystalImg from "@/assets/item-crystal.png";
import stoneImg from "@/assets/item-stone.png";

interface Props {
  onComplete: (r: MissionResult) => void;
  onCancel: () => void;
}

/** 💎 Crystal Clear — geometry vs social preference (proxy: stones vs crystals). */
export function CrystalClearMission({ onComplete, onCancel }: Props) {
  const geometryRef = useRef<HTMLDivElement>(null);
  const socialRef = useRef<HTMLDivElement>(null);
  const dwell = useRef({ geo: 0, soc: 0, total: 0 });
  const lastT = useRef(performance.now());
  const { point } = useGaze(true);

  useEffect(() => {
    const now = performance.now();
    const dt = now - lastT.current;
    lastT.current = now;
    dwell.current.total += dt;
    if (inRect(point, geometryRef.current)) dwell.current.geo += dt;
    else if (inRect(point, socialRef.current)) dwell.current.soc += dt;
  }, [point]);

  return (
    <MissionShell
      id="crystal"
      durationMs={20000}
      onComplete={onComplete}
      onCancel={onCancel}
      computeMetrics={() => {
        const { geo, soc, total } = dwell.current;
        return {
          geometryDwellMs: Math.round(geo),
          socialDwellMs: Math.round(soc),
          ratio: soc > 0 ? Math.round((geo / soc) * 100) / 100 : geo > 0 ? 99 : 0,
          totalDwellMs: Math.round(total),
        };
      }}
    >
      {() => (
        <div className="flex h-full items-center justify-around px-12">
          <div ref={geometryRef} className="flex flex-col items-center gap-3 rounded-3xl bg-card/60 p-8 shadow-cozy">
            <img src={crystalImg} alt="" width={220} height={220} className="animate-float pixel-perfect drop-shadow-lg" />
            <p className="font-pixel text-xs text-muted-foreground">Crystals</p>
          </div>
          <div ref={socialRef} className="flex flex-col items-center gap-3 rounded-3xl bg-card/60 p-8 shadow-cozy">
            <img src={stoneImg} alt="" width={220} height={220} className="animate-float pixel-perfect drop-shadow-lg" style={{ animationDelay: "0.5s" }} />
            <p className="font-pixel text-xs text-muted-foreground">Patterned Stones</p>
          </div>
        </div>
      )}
    </MissionShell>
  );
}
