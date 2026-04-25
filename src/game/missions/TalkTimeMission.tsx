import { useEffect, useRef } from "react";
import { MissionShell } from "../MissionShell";
import { useGaze, inRect } from "../useGaze";
import type { MissionResult } from "../types";
import owl from "@/assets/owl-face.png";

interface Props {
  onComplete: (r: MissionResult) => void;
  onCancel: () => void;
}

/** 🦉 Talk-Time — eye vs mouth scanning ratio. */
export function TalkTimeMission({ onComplete, onCancel }: Props) {
  const eyeRef = useRef<HTMLDivElement>(null);
  const mouthRef = useRef<HTMLDivElement>(null);
  const dwell = useRef({ eye: 0, mouth: 0 });
  const lastT = useRef(performance.now());
  const { point } = useGaze(true);

  useEffect(() => {
    const now = performance.now();
    const dt = now - lastT.current;
    lastT.current = now;
    if (inRect(point, eyeRef.current)) dwell.current.eye += dt;
    else if (inRect(point, mouthRef.current)) dwell.current.mouth += dt;
  }, [point]);

  return (
    <MissionShell
      id="owl"
      durationMs={20000}
      onComplete={onComplete}
      onCancel={onCancel}
      computeMetrics={() => {
        const { eye, mouth } = dwell.current;
        return {
          eyeDwellMs: Math.round(eye),
          mouthDwellMs: Math.round(mouth),
          mouthEyeRatio: eye > 0 ? Math.round((mouth / eye) * 100) / 100 : mouth > 0 ? 99 : 0,
        };
      }}
    >
      {() => (
        <div className="flex h-full items-center justify-center">
          <div className="relative">
            <img
              src={owl}
              alt="Owl friend"
              width={520}
              height={520}
              className="pixel-perfect animate-float drop-shadow-2xl"
            />
            {/* AOIs — invisible boxes over eyes & mouth */}
            <div
              ref={eyeRef}
              className="absolute"
              style={{ left: "16%", top: "32%", width: "68%", height: "20%" }}
              aria-label="eyes AOI"
            />
            <div
              ref={mouthRef}
              className="absolute"
              style={{ left: "38%", top: "55%", width: "24%", height: "12%" }}
              aria-label="mouth AOI"
            />
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-card/85 px-5 py-2 text-sm shadow-cozy">
              "Listen close, little one… I have a story for you."
            </div>
          </div>
        </div>
      )}
    </MissionShell>
  );
}
